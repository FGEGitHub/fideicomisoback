const pool = require('../database')

// =========================================================================
// DEUDORES DEL PARQUE (nivel2) — un registro por CLIENTE (CUIT), solo clientes
// del Parque (zona PIT) HABILITADOS con cuotas VIGENTES.
//
// Misma base de cálculo que el flujo de fondos de deudores (nivel6):
//   - cuotas vigentes (cuota_cancelada = 'No') con el ICC ya aplicado
//     (parcialidad = 'Final'); las compensadas no se excluyen.
//   - pagos aprobados (estado NULL o 'A') de esas cuotas, más los pagos viejos
//     que solo actualizaron cuotas.pago y no dejaron fila en `pagos`.
//   - todo medido en plata y por cliente: los pagos de un cliente se aplican a
//     sus cuotas de la más vieja a la más nueva (sin importar en qué cuadro o
//     cuota los cargó el operador). Un cliente con varios cuadros se netea.
//
// Se considera DEUDOR al cliente que debe 4 o más cuotas COMPLETAS: 3 vencidas
// + la del mes en curso (UMBRAL_CUOTAS_DEUDOR).
//   - La unidad es la cuota del MES: si el cliente tiene varios cuadros (lotes)
//     que se pagan juntos, las cuotas de un mismo mes se suman y cuentan como
//     UNA sola cuota (dos cuadros con agosto impago = 1 cuota, no 2).
//   - Se cuentan solo cuotas completamente adeudadas, de la más nueva a la más
//     vieja, hasta agotar la deuda en plata (con 1% de tolerancia por redondeos).
//     La parte restante que no alcanza para una cuota entera no suma (se
//     informa como cuotaParcial).
//   - Como los pagos se aplican de la más vieja a la más nueva, deber la cuota
//     actual implica deber las anteriores que figuren impagas.
// Los clientes con deuda pero por debajo del umbral no entran al listado; se
// informan aparte en el resumen como "en seguimiento".
//
//   Deuda total   = MAX(0, devengado - pagado)
//   Deuda vencida = MAX(0, devengado de meses anteriores al actual - pagado)
//   Mes en curso  = Deuda total - Deuda vencida (cuota del mes aún no vencida)
// =========================================================================

const parsearFecha = (valor) => {
    if (!valor) return null
    const texto = String(valor).trim()

    let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
        const anio = parseInt(m[1], 10)
        const mes = parseInt(m[2], 10)
        if (anio > 1900 && mes >= 1 && mes <= 12) return { anio, mes, dia: parseInt(m[3], 10) }
        return null
    }

    m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) {
        const anio = parseInt(m[3], 10)
        const mes = parseInt(m[2], 10)
        if (anio > 1900 && mes >= 1 && mes <= 12) return { anio, mes, dia: parseInt(m[1], 10) }
        return null
    }

    return null
}

// Cantidad de cuotas adeudadas a partir de la cual el cliente es deudor.
const UMBRAL_CUOTAS_DEUDOR = 4

const indiceMes = (anio, mes) => anio * 12 + (mes - 1)
const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '')

// Datos de contacto con texto de relleno ("Completar", "no posee") se muestran vacíos.
const limpiarContacto = (v) => {
    const t = String(v ?? '').trim()
    return /^(completar|no posee|sin determinar|-|0)$/i.test(t) ? '' : t
}

const montoNominal = (cuota) => {
    const ajustado = parseFloat(cuota.cuota_con_ajuste) || 0
    if (ajustado > 0) return ajustado
    return parseFloat(cuota.Amortizacion) || 0
}

const deudoresParque = async (req, res) => {
    try {
        const hoy = new Date()
        const mesActualIdx = indiceMes(hoy.getFullYear(), hoy.getMonth() + 1)

        // Clientes habilitados del Parque (un registro por CUIT).
        const clientes = await pool.query(
            `SELECT cuil_cuit, Nombre, razon, telefono, movil, email
             FROM clientes
             WHERE zona = 'PIT' AND habilitado = 'Si'`
        )
        const datosCliente = {}
        for (const c of clientes) {
            const k = soloDigitos(c.cuil_cuit)
            if (!k || datosCliente[k]) continue
            datosCliente[k] = c
        }

        const cuotas = await pool.query(
            `SELECT cu.id, cu.id_lote, cu.mes, cu.anio, cu.cuota_con_ajuste, cu.Amortizacion, cu.pago, l.cuil_cuit
             FROM cuotas cu
             INNER JOIN lotes l ON l.id = cu.id_lote
             WHERE cu.zona = 'PIT'
               AND cu.parcialidad = 'Final'
               AND cu.cuota_cancelada = 'No'
               AND l.cuil_cuit IN (
                   SELECT cuil_cuit FROM clientes WHERE zona = 'PIT' AND habilitado = 'Si'
               )`
        )

        const resumenVacio = {
            mesActual: { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 },
            clientesVigentes: 0,
            umbralCuotas: UMBRAL_CUOTAS_DEUDOR,
            clientesDeudores: 0,
            clientesEnSeguimiento: 0,
            deudaEnSeguimiento: 0,
            clientesSaldoAFavor: 0,
            deudaTotal: 0,
            deudaVencida: 0,
            deudaMesEnCurso: 0,
            devengadoTotal: 0,
            pagadoTotal: 0,
        }
        if (cuotas.length === 0) return res.json({ resumen: resumenVacio, clientes: [] })

        const pagos = await pool.query(
            `SELECT id_cuota, monto, fecha, mes, anio
             FROM pagos
             WHERE id_cuota IN (?) AND (estado IS NULL OR estado = 'A')`,
            [cuotas.map((c) => c.id)]
        )

        const cuotaPorId = {}
        for (const c of cuotas) cuotaPorId[c.id] = c

        // Por cliente: cuotas, total pagado, último pago.
        const porCliente = {}
        const cliente = (k) => (porCliente[k] ||= { cuotas: [], pagado: 0, ultimoPago: null, lotes: new Set() })

        for (const c of cuotas) {
            const k = soloDigitos(c.cuil_cuit)
            const reg = cliente(k)
            reg.cuotas.push({ idx: indiceMes(c.anio, c.mes), mes: c.mes, anio: c.anio, monto: montoNominal(c) })
            reg.lotes.add(c.id_lote)
        }

        const sumaPagosPorCuota = {}
        for (const p of pagos) {
            const cuota = cuotaPorId[p.id_cuota]
            if (!cuota) continue
            const monto = parseFloat(p.monto) || 0
            sumaPagosPorCuota[p.id_cuota] = (sumaPagosPorCuota[p.id_cuota] || 0) + monto

            const reg = cliente(soloDigitos(cuota.cuil_cuit))
            reg.pagado += monto

            let f = parsearFecha(p.fecha)
            if (!f && parseInt(p.anio, 10) > 1900 && parseInt(p.mes, 10) >= 1 && parseInt(p.mes, 10) <= 12) {
                f = { anio: parseInt(p.anio, 10), mes: parseInt(p.mes, 10), dia: 1 }
            }
            if (f) {
                const clave = f.anio * 10000 + f.mes * 100 + (f.dia || 1)
                if (!reg.ultimoPago || clave > reg.ultimoPago.clave) reg.ultimoPago = { ...f, clave }
            }
        }

        // Pagos viejos (pago rápido) que solo actualizaron cuotas.pago.
        for (const c of cuotas) {
            const residual = (parseFloat(c.pago) || 0) - (sumaPagosPorCuota[c.id] || 0)
            if (residual > 0.5) cliente(soloDigitos(c.cuil_cuit)).pagado += residual
        }

        const lista = []
        const resumen = { ...resumenVacio }

        for (const [k, reg] of Object.entries(porCliente)) {
            resumen.clientesVigentes += 1

            const devengado = reg.cuotas.reduce((a, c) => a + c.monto, 0)
            const devengadoVencido = reg.cuotas
                .filter((c) => c.idx < mesActualIdx)
                .reduce((a, c) => a + c.monto, 0)

            const deudaTotal = Math.max(0, devengado - reg.pagado)
            const deudaVencida = Math.min(deudaTotal, Math.max(0, devengadoVencido - reg.pagado))
            const deudaMesEnCurso = deudaTotal - deudaVencida

            resumen.devengadoTotal += devengado
            resumen.pagadoTotal += reg.pagado

            if (deudaTotal <= 1) {
                if (reg.pagado - devengado > 1) resumen.clientesSaldoAFavor += 1
                continue
            }

            // Cuotas completas adeudadas, por MES (los cuadros de un mismo mes se suman),
            // de la más nueva a la más vieja hasta agotar la deuda.
            const porMes = {}
            for (const c of reg.cuotas) {
                const m = (porMes[c.idx] ||= { idx: c.idx, mes: c.mes, anio: c.anio, monto: 0 })
                m.monto += c.monto
            }
            const meses = Object.values(porMes).sort((a, b) => b.idx - a.idx)

            let resto = deudaTotal
            let cuotasAdeudadas = 0
            let cuotaParcial = 0
            let impagaDesde = null
            for (const m of meses) {
                if (resto <= 1) break
                // Tolerancia del 1%: diferencias de unos pesos por redondeo no
                // dejan una cuota "a medias".
                if (resto >= m.monto * 0.99) {
                    cuotasAdeudadas += 1
                    resto = Math.max(0, resto - m.monto)
                    impagaDesde = { mes: m.mes, anio: m.anio }
                } else {
                    cuotaParcial = m.monto > 0 ? resto / m.monto : 0
                    break
                }
            }

            // Con deuda pero por debajo del umbral: todavía no es deudor.
            if (cuotasAdeudadas < UMBRAL_CUOTAS_DEUDOR) {
                resumen.clientesEnSeguimiento += 1
                resumen.deudaEnSeguimiento += deudaTotal
                continue
            }

            const datos = datosCliente[k] || {}
            lista.push({
                cuil_cuit: datos.cuil_cuit || k,
                nombre: datos.Nombre || '',
                tipo: datos.razon || '',
                telefono: limpiarContacto(datos.movil) || limpiarContacto(datos.telefono),
                email: limpiarContacto(datos.email),
                cuadros: reg.lotes.size,
                cuotasAdeudadas,
                cuotaParcial: Math.round(cuotaParcial * 100) / 100,
                impagaDesde,
                devengado,
                pagado: reg.pagado,
                deudaVencida,
                deudaMesEnCurso,
                deudaTotal,
                ultimoPago: reg.ultimoPago ? { anio: reg.ultimoPago.anio, mes: reg.ultimoPago.mes, dia: reg.ultimoPago.dia } : null,
            })

            resumen.clientesDeudores += 1
            resumen.deudaTotal += deudaTotal
            resumen.deudaVencida += deudaVencida
            resumen.deudaMesEnCurso += deudaMesEnCurso
        }

        lista.sort((a, b) => b.deudaTotal - a.deudaTotal)

        res.json({ resumen, clientes: lista })
    } catch (error) {
        console.error('Error en deudoresParque:', error)
        res.status(500).json({ error: 'Error al calcular los deudores del Parque' })
    }
}

module.exports = { deudoresParque }
