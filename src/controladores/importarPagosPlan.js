// =========================================================================
// IMPORTAR PAGOS DESDE EXCEL — planificador (función pura, sin base de datos)
//
// Recibe las cuotas de un lote, lo ya pagado y las filas leídas del Excel, y
// devuelve QUÉ pagos se guardarían (a qué cuota, por cuánto y con qué fecha).
// Se usa tanto para la vista previa como para la confirmación: el backend
// siempre recalcula el plan, nunca confía en el que arma el navegador.
//
// Reglas:
//  1. Cada fila del Excel (mes + cobranza) paga SU cuota. Si el monto entra en
//     lo que falta pagar de esa cuota (con 1% de tolerancia), va directo.
//  2. Si el monto la excede (p. ej. un cheque que cubre varias cuotas pero está
//     anotado en una sola fila), se reparte de la cuota más vieja impaga a la
//     más nueva. Lo que sobre al final queda como pago a cuenta en la cuota de
//     la fila.
//  3. Las filas se procesan en orden de fecha de cobro. Sin fecha, se asume el
//     último día del mes de la cuota (y queda marcado como "fecha asumida").
//  4. Solo reciben pagos las cuotas ya calculadas (con ICC aplicado).
// =========================================================================

const TOLERANCIA_PESOS = 1
const TOLERANCIA_PORCENTAJE = 0.01

const redondear = (n) => Math.round(n * 100) / 100
const claveMes = (anio, mes) => anio * 12 + (mes - 1)

const fechaValida = (texto) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || '').trim())
    if (!m) return null
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null
    return m[0]
}

const finDeMes = (anio, mes) => {
    const d = new Date(Date.UTC(anio, mes, 0)) // día 0 del mes siguiente = último día de este mes
    return d.toISOString().slice(0, 10)
}

// Huella de una fila del Excel: sirve para no importar dos veces la misma fila.
const huellaDeFila = (f) => `${f.anio}-${String(f.mes).padStart(2, '0')}|${redondear(f.monto)}|${f.fecha || 'sf'}`

/**
 * @param {Object}   p
 * @param {Array}    p.cuotas      [{ id, mes, anio, nro_cuota, valor, calculada }]
 * @param {Object}   p.yaPagado    { [id_cuota]: monto ya pagado en el sistema }
 * @param {Array}    p.filas       [{ fila, mes, anio, nro, cuotaExcel, monto, fecha }]
 * @param {Object}   p.opciones    { distribuirExcedente: true }
 * @param {Set}      p.huellasYaImportadas  huellas de filas ya importadas antes
 */
function armarPlan({ cuotas, yaPagado = {}, filas, opciones = {}, huellasYaImportadas = new Set() }) {
    const distribuirExcedente = opciones.distribuirExcedente !== false

    const errores = []
    const advertencias = []
    const pagos = []
    const filasSaltadas = []

    const porMes = {}
    for (const c of cuotas) porMes[claveMes(c.anio, c.mes)] = c

    const calculadas = cuotas.filter((c) => c.calculada).sort((a, b) => claveMes(a.anio, a.mes) - claveMes(b.anio, b.mes))

    const falta = {}
    for (const c of calculadas) falta[c.id] = Math.max(0, redondear(c.valor - (yaPagado[c.id] || 0)))

    // --- Normalización de filas ---
    const normalizadas = []
    for (const f of filas || []) {
        const monto = Number(f.monto)
        if (!Number.isFinite(monto) || monto <= 0) continue // sin cobranza: no hay pago
        const mes = parseInt(f.mes, 10)
        const anio = parseInt(f.anio, 10)
        if (!(mes >= 1 && mes <= 12) || !(anio > 1990)) {
            errores.push({ fila: f.fila, mensaje: 'La fila ' + f.fila + ' no tiene un mes válido.' })
            continue
        }
        const fechaReal = fechaValida(f.fecha)
        normalizadas.push({
            fila: f.fila,
            mes,
            anio,
            nro: f.nro,
            cuotaExcel: Number(f.cuotaExcel) || 0,
            monto: redondear(monto),
            fecha: fechaReal || finDeMes(anio, mes),
            fechaAsumida: !fechaReal,
        })
    }

    normalizadas.sort((a, b) =>
        a.fecha.localeCompare(b.fecha) || claveMes(a.anio, a.mes) - claveMes(b.anio, b.mes) || a.fila - b.fila
    )

    const mostrar = (c) => String(c.mes).padStart(2, '0') + '/' + c.anio

    // --- Reparto ---
    for (const f of normalizadas) {
        const huella = huellaDeFila(f)
        if (huellasYaImportadas.has(huella)) {
            filasSaltadas.push({ fila: f.fila, mes: f.mes, anio: f.anio, monto: f.monto, motivo: 'Esta fila ya fue importada antes.' })
            continue
        }

        const objetivo = porMes[claveMes(f.anio, f.mes)]
        if (!objetivo) {
            errores.push({ fila: f.fila, mensaje: 'La cuota ' + String(f.mes).padStart(2, '0') + '/' + f.anio + ' (fila ' + f.fila + ') no existe en el sistema.' })
            continue
        }
        if (!objetivo.calculada) {
            errores.push({ fila: f.fila, mensaje: 'La cuota ' + mostrar(objetivo) + ' (fila ' + f.fila + ') todavía no está calculada (falta cargar el ICC).' })
            continue
        }

        // Valor del Excel contra el del sistema: avisa si el cuadro no es el mismo.
        if (f.cuotaExcel > 0 && Math.abs(f.cuotaExcel - objetivo.valor) > Math.max(TOLERANCIA_PESOS, objetivo.valor * TOLERANCIA_PORCENTAJE)) {
            advertencias.push({
                tipo: 'valor',
                fila: f.fila,
                mensaje: 'La cuota ' + mostrar(objetivo) + ' vale $' + redondear(objetivo.valor) + ' en el sistema y $' + redondear(f.cuotaExcel) + ' en el Excel.',
            })
        }

        const registrar = (cuota, monto, tipo, nota) => {
            pagos.push({
                id_cuota: cuota.id,
                mes: cuota.mes,
                anio: cuota.anio,
                nro_cuota: cuota.nro_cuota,
                monto: redondear(monto),
                fecha: f.fecha,
                fechaAsumida: f.fechaAsumida,
                fila: f.fila,
                huella,
                tipo,
                nota,
            })
            falta[cuota.id] = Math.max(0, redondear(falta[cuota.id] - monto))
        }

        const entraEnLaCuota = f.monto <= falta[objetivo.id] + Math.max(TOLERANCIA_PESOS, objetivo.valor * TOLERANCIA_PORCENTAJE)

        if (entraEnLaCuota) {
            registrar(objetivo, f.monto, 'directo', '')
            continue
        }

        // El monto excede lo que falta en su cuota.
        if (!distribuirExcedente) {
            registrar(objetivo, f.monto, 'a cuenta', 'Excede la cuota (sin repartir)')
            continue
        }

        let resto = f.monto
        for (const c of calculadas) {
            if (resto <= 0.005) break
            if (falta[c.id] <= 0.005) continue
            const aplicar = Math.min(resto, falta[c.id])
            registrar(c, aplicar, 'repartido', 'Repartido de la fila ' + f.fila + ' (' + mostrar(objetivo) + ')')
            resto = redondear(resto - aplicar)
        }
        if (resto > 0.005) {
            registrar(objetivo, resto, 'a cuenta', 'Excedente sobre todas las cuotas impagas')
        }
    }

    const sinFechaReal = pagos.filter((p) => p.fechaAsumida).length
    if (sinFechaReal > 0) {
        advertencias.push({
            tipo: 'fecha',
            mensaje: sinFechaReal + ' pago(s) no traen fecha de cobro: se asumió el último día del mes de la cuota.',
        })
    }

    const totalPlan = redondear(pagos.reduce((a, p) => a + p.monto, 0))
    const totalExcel = redondear(normalizadas.reduce((a, f) => a + f.monto, 0))
    const deudaRestante = redondear(calculadas.reduce((a, c) => a + falta[c.id], 0))
    const cuotasImpagas = calculadas.filter((c) => falta[c.id] > Math.max(TOLERANCIA_PESOS, c.valor * TOLERANCIA_PORCENTAJE))

    return {
        pagos,
        errores,
        advertencias,
        filasSaltadas,
        resumen: {
            filasLeidas: normalizadas.length,
            pagosAGuardar: pagos.length,
            totalExcel,
            totalAImportar: totalPlan,
            deudaRestante,
            cuotasImpagasRestantes: cuotasImpagas.length,
            cuotasCalculadas: calculadas.length,
        },
    }
}

module.exports = { armarPlan, huellaDeFila, finDeMes, fechaValida, redondear }
