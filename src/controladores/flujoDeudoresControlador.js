const pool = require('../database')

// =========================================================================
// FLUJO DE FONDOS DE DEUDORES (nivel6) — cobranzas del Parque medidas en
// PLATA, por cliente, sin importar a qué cuota imputó cada pago el operador.
//
// Universo:
//   - clientes zona PIT con habilitado = 'Si' (activos hoy)
//   - cuotas VIGENTES (cuota_cancelada = 'No') con el ICC ya aplicado
//     (parcialidad = 'Final'). Las cuotas se devengan mes a mes, a medida que
//     se carga el ICC del mes: no se contemplan cuotas futuras ni "Original".
//   - las cuotas compensadas NO se excluyen: compensar solo mueve un marcador
//     entre cuotas del mismo cliente y no cambia la plata devengada ni la
//     ingresada.
//
// Método — cada año es de su año (los acumulados arrancan en enero) y lo que
// se arrastra de años anteriores se muestra aparte como saldo inicial.
// Por cliente, con D(M) = devengado acumulado histórico y P = total pagado a hoy:
//
//  VERDE (por mes de la CUOTA, estado actual): los pagos del cliente se aplican
//  de la cuota más vieja a la más nueva, con tope en el valor de cada cuota.
//    Cobrado acumulado histórico  = MIN(P, D(M))   -> el excedente NO cuenta
//    Cobrado del mes              = su variación mensual
//    No cobrado del mes           = devengado del mes - cobrado del mes
//    Deuda inicial del año        = D(dic anterior) - MIN(P, D(dic anterior))
//    No cobrado acumulado         = deuda inicial + no cobrado del año hasta M
//  Así lo cobrado de una cuota de 2025 queda en 2025 aunque se pague en 2026.
//
//  NARANJA (por FECHA DE PAGO): I(M) = ingresado acumulado histórico a la fecha M
//    Ingresado del mes            = pagos con fecha en ese mes
//    Pagos a cuenta (saldo)       = MAX(0, I(M) - D(M))   (excedente real a esa fecha)
//    Neto a cobrar al cierre      = neto inicial + devengado acum. - ingresado acum.
//
// Se suman todos los clientes. Los acumulados del año arrancan en cero en enero.
//
// Los pagos se toman solo si pertenecen a una cuota incluida en el universo
// (si no, un pago de un lote cancelado figuraría como excedente falso).
// =========================================================================

// La columna `fecha` de `pagos` es texto con formatos mezclados.
const parsearFecha = (valor) => {
    if (!valor) return null
    const texto = String(valor).trim()

    let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
        const anio = parseInt(m[1], 10)
        const mes = parseInt(m[2], 10)
        if (anio > 1900 && mes >= 1 && mes <= 12) return { anio, mes }
        return null
    }

    m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) {
        const anio = parseInt(m[3], 10)
        const mes = parseInt(m[2], 10)
        if (anio > 1900 && mes >= 1 && mes <= 12) return { anio, mes }
        return null
    }

    return null
}

const indiceMes = (anio, mes) => anio * 12 + (mes - 1)

const montoNominal = (cuota) => {
    const ajustado = parseFloat(cuota.cuota_con_ajuste) || 0
    if (ajustado > 0) return ajustado
    return parseFloat(cuota.Amortizacion) || 0
}

const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '')

const flujoDeudores = async (req, res) => {
    try {
        const anio = parseInt(req.params.anio, 10) || new Date().getFullYear()

        // Cuotas vigentes con ICC aplicado, de clientes PIT habilitados.
        const cuotas = await pool.query(
            `SELECT cu.id, cu.mes, cu.anio, cu.cuota_con_ajuste, cu.Amortizacion, cu.pago, l.cuil_cuit
             FROM cuotas cu
             INNER JOIN lotes l ON l.id = cu.id_lote
             WHERE cu.zona = 'PIT'
               AND cu.parcialidad = 'Final'
               AND cu.cuota_cancelada = 'No'
               AND l.cuil_cuit IN (
                   SELECT cuil_cuit FROM clientes WHERE zona = 'PIT' AND habilitado = 'Si'
               )`
        )

        if (cuotas.length === 0) {
            return res.json({ anio, ultimoMes: null, meses: [] })
        }

        // Último mes con ICC aplicado (hasta ahí se devenga).
        let ultimoIdx = 0
        for (const c of cuotas) {
            ultimoIdx = Math.max(ultimoIdx, indiceMes(c.anio, c.mes))
        }

        const cuotaPorId = {}
        for (const c of cuotas) cuotaPorId[c.id] = c

        const pagos = await pool.query(
            `SELECT id_cuota, monto, fecha, mes, anio
             FROM pagos
             WHERE id_cuota IN (?) AND (estado IS NULL OR estado = 'A')`,
            [cuotas.map((c) => c.id)]
        )

        // devengado[cuil][idx] y ingresado[cuil][idx] (plata del mes, no acumulada)
        const devengado = {}
        const ingresado = {}
        const sumar = (mapa, cuil, idx, monto) => {
            if (!mapa[cuil]) mapa[cuil] = {}
            mapa[cuil][idx] = (mapa[cuil][idx] || 0) + monto
        }

        for (const c of cuotas) {
            sumar(devengado, soloDigitos(c.cuil_cuit), indiceMes(c.anio, c.mes), montoNominal(c))
        }

        const sumaPagosPorCuota = {}
        for (const p of pagos) {
            const cuota = cuotaPorId[p.id_cuota]
            if (!cuota) continue
            const monto = parseFloat(p.monto) || 0
            sumaPagosPorCuota[p.id_cuota] = (sumaPagosPorCuota[p.id_cuota] || 0) + monto

            // Fecha del pago; si no se puede interpretar, mes/año del registro
            // y, en último caso, el mes de la propia cuota.
            let f = parsearFecha(p.fecha)
            if (!f && parseInt(p.anio, 10) > 1900 && parseInt(p.mes, 10) >= 1 && parseInt(p.mes, 10) <= 12) {
                f = { anio: parseInt(p.anio, 10), mes: parseInt(p.mes, 10) }
            }
            if (!f) f = { anio: cuota.anio, mes: cuota.mes }

            sumar(ingresado, soloDigitos(cuota.cuil_cuit), indiceMes(f.anio, f.mes), monto)
        }

        // Pagos viejos (pago rápido) que solo actualizaron cuotas.pago y no
        // dejaron fila en `pagos`: se imputan al mes propio de la cuota.
        for (const c of cuotas) {
            const residual = (parseFloat(c.pago) || 0) - (sumaPagosPorCuota[c.id] || 0)
            if (residual > 0.5) {
                sumar(ingresado, soloDigitos(c.cuil_cuit), indiceMes(c.anio, c.mes), residual)
            }
        }

        // Recorrido por cliente, mes a mes sobre toda la historia.
        let primerIdx = ultimoIdx
        for (const mapa of [devengado, ingresado]) {
            for (const cuil of Object.keys(mapa)) {
                for (const k of Object.keys(mapa[cuil])) primerIdx = Math.min(primerIdx, parseInt(k, 10))
            }
        }

        const largo = ultimoIdx - primerIdx + 1
        const nuevo = () => new Array(largo).fill(0)
        const tot = {
            dev: nuevo(),    // devengado del mes
            cob: nuevo(),    // cobrado del mes (FIFO por cuota)
            ing: nuevo(),    // ingresado del mes (por fecha de pago)
            D: nuevo(),      // devengado acumulado histórico
            C: nuevo(),      // cobrado acumulado histórico  = MIN(P, D)
            I: nuevo(),      // ingresado acumulado histórico
            A: nuevo(),      // saldo de pagos a cuenta = MAX(0, I - D)
        }

        const cuils = new Set([...Object.keys(devengado), ...Object.keys(ingresado)])
        for (const cuil of cuils) {
            const dMap = devengado[cuil] || {}
            const iMap = ingresado[cuil] || {}
            // Total pagado a hoy (incluye pagos posteriores al último mes devengado).
            const P = Object.values(iMap).reduce((a, v) => a + v, 0)

            let D = 0
            let I = 0
            let Cprev = 0
            for (let i = 0; i < largo; i++) {
                const idx = primerIdx + i
                const dM = dMap[idx] || 0
                const iM = iMap[idx] || 0
                D += dM
                I += iM
                const C = Math.min(P, D)

                tot.dev[i] += dM
                tot.cob[i] += C - Cprev
                tot.ing[i] += iM
                tot.D[i] += D
                tot.C[i] += C
                tot.I[i] += I
                tot.A[i] += Math.max(0, I - D)
                Cprev = C
            }
        }

        const valorEn = (arr, idx) => {
            const i = idx - primerIdx
            if (i < 0) return 0
            return arr[Math.min(i, largo - 1)]
        }
        const delMes = (arr, idx) => {
            const i = idx - primerIdx
            return i >= 0 && i < largo ? arr[i] : 0
        }

        // Saldos al cierre del año anterior (lo que se arrastra a este año).
        const idxPrevio = indiceMes(anio, 1) - 1
        const Dprev = valorEn(tot.D, idxPrevio)
        const Cprev = valorEn(tot.C, idxPrevio)
        const Iprev = valorEn(tot.I, idxPrevio)
        const deudaInicial = Dprev - Cprev
        const netoInicial = Dprev - Iprev

        const meses = []
        for (let mes = 1; mes <= 12; mes++) {
            const idx = indiceMes(anio, mes)

            // Mes sin ICC aplicado todavía: no se devenga ni se muestra.
            if (idx > ultimoIdx) {
                meses.push({ mes, disponible: false })
                continue
            }

            const devengadoMes = delMes(tot.dev, idx)
            const cobradoMes = delMes(tot.cob, idx)
            const ingresadoMes = delMes(tot.ing, idx)

            // Acumulados DEL AÑO (arrancan en enero).
            const devAcum = valorEn(tot.D, idx) - Dprev
            const cobAcum = valorEn(tot.C, idx) - Cprev
            const ingAcum = valorEn(tot.I, idx) - Iprev

            const noCobradoMes = devengadoMes - cobradoMes
            const noCobradoAcum = deudaInicial + (devAcum - cobAcum)
            const pagosACuentaSaldo = valorEn(tot.A, idx)
            const pagosACuentaMes = pagosACuentaSaldo - valorEn(tot.A, idx - 1)
            const netoACobrar = netoInicial + devAcum - ingAcum

            // Las tasas acumuladas se miden contra todo lo devengado desde el inicio.
            const devHistorico = valorEn(tot.D, idx)

            meses.push({
                mes,
                disponible: true,
                deudaInicial,
                devengado: devengadoMes,
                devengadoAcumulado: devAcum,
                cobradoCuotas: cobradoMes,
                cobradoAcumulado: cobAcum,
                noCobrado: noCobradoMes,
                noCobradoAcumulado: noCobradoAcum,
                incobrabilidadMes: devengadoMes > 0 ? noCobradoMes / devengadoMes : null,
                incobrabilidadAcumulada: devHistorico > 0 ? noCobradoAcum / devHistorico : null,
                netoInicial,
                totalIngresado: ingresadoMes,
                totalIngresadoAcumulado: ingAcum,
                pagosACuenta: pagosACuentaMes,
                pagosACuentaAcumulados: pagosACuentaSaldo,
                netoACobrar,
                incobrabilidadNeta: devHistorico > 0 ? netoACobrar / devHistorico : null,
            })
        }

        res.json({
            anio,
            ultimoMes: { anio: Math.floor(ultimoIdx / 12), mes: (ultimoIdx % 12) + 1 },
            meses,
        })
    } catch (error) {
        console.error('Error en flujoDeudores:', error)
        res.status(500).json({ error: 'Error al calcular el flujo de fondos de deudores' })
    }
}

module.exports = { flujoDeudores }
