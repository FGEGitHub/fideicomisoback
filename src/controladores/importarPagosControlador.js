const pool = require('../database')
const { armarPlan } = require('./importarPagosPlan')

// =========================================================================
// IMPORTAR PAGOS DESDE EXCEL (nivel2)
//
//  POST /cuotas/importarpagos/vista      -> arma el plan y lo devuelve (NO guarda)
//  POST /cuotas/importarpagos/confirmar  -> recalcula el plan y guarda los pagos
//  POST /cuotas/importarpagos/deshacer   -> borra los pagos de UNA importación
//
// El navegador lee el Excel y manda las filas (mes, cuota, cobranza, fecha).
// El backend NO confía en el plan del navegador: siempre lo vuelve a calcular
// contra las cuotas reales del lote. Los pagos se guardan en la misma tabla y
// con el mismo formato que el pago de una cuota, uno por cada cuota; sin
// comprobante. Quedan marcados con [IMP-<lote de importación>] para poder
// deshacerlos y para no importar dos veces la misma fila.
// =========================================================================

const MARCA = 'Importado desde Excel'
const MAX_FILAS = 300

const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '')

const ahoraComoLote = () => {
    const d = new Date()
    const p = (n, l = 2) => String(n).padStart(l, '0')
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds())
}

const limpiarFilas = (filas) => {
    if (!Array.isArray(filas)) return null
    if (filas.length > MAX_FILAS) return null
    return filas.map((f) => ({
        fila: parseInt(f && f.fila, 10) || 0,
        mes: parseInt(f && f.mes, 10),
        anio: parseInt(f && f.anio, 10),
        nro: parseInt(f && f.nro, 10) || null,
        cuotaExcel: Number(f && f.cuotaExcel) || 0,
        monto: Number(f && f.monto),
        fecha: f && f.fecha ? String(f.fecha).slice(0, 10) : null,
    }))
}

// Cuotas del lote, lo ya pagado y las filas que ya se importaron antes.
const cargarContexto = async (id_lote) => {
    const lote = (await pool.query('SELECT id, cuil_cuit FROM lotes WHERE id = ?', [id_lote]))[0]
    if (!lote) return null

    const filasCuotas = await pool.query(
        "SELECT id, mes, anio, nro_cuota, cuota_con_ajuste, parcialidad, cuil_cuit FROM cuotas WHERE id_lote = ? AND cuota_cancelada = 'No'",
        [id_lote]
    )
    const cuotas = filasCuotas.map((c) => ({
        id: c.id,
        mes: c.mes,
        anio: c.anio,
        nro_cuota: c.nro_cuota,
        valor: parseFloat(c.cuota_con_ajuste) || 0,
        calculada: String(c.parcialidad).toLowerCase() === 'final' && parseFloat(c.cuota_con_ajuste) > 0,
        cuil_cuit: c.cuil_cuit,
    }))

    const yaPagado = {}
    const huellasYaImportadas = new Set()
    let pagosPrevios = 0

    if (cuotas.length > 0) {
        const ids = cuotas.map((c) => c.id)
        const sumas = await pool.query(
            "SELECT id_cuota, SUM(monto) AS total FROM pagos WHERE id_cuota IN (?) AND (estado IS NULL OR estado = 'A') GROUP BY id_cuota",
            [ids]
        )
        for (const s of sumas) yaPagado[s.id_cuota] = parseFloat(s.total) || 0

        const previos = await pool.query(
            "SELECT observaciones FROM pagos WHERE id_cuota IN (?) AND observaciones LIKE ?",
            [ids, MARCA + '%']
        )
        for (const p of previos) {
            pagosPrevios += 1
            const m = /\{([^}]+)\}/.exec(p.observaciones || '')
            if (m) huellasYaImportadas.add(m[1])
        }
    }

    return { lote, cuotas, yaPagado, huellasYaImportadas, pagosPrevios }
}

const planDe = (contexto, filas, opciones) =>
    armarPlan({
        cuotas: contexto.cuotas,
        yaPagado: contexto.yaPagado,
        filas,
        opciones: { distribuirExcedente: !(opciones && opciones.distribuirExcedente === false) },
        huellasYaImportadas: contexto.huellasYaImportadas,
    })

const vista = async (req, res) => {
    try {
        const { id_lote, opciones } = req.body
        const filas = limpiarFilas(req.body.filas)
        if (!filas) return res.status(400).json({ ok: false, mensaje: 'No se pudieron leer las filas del Excel (máximo ' + MAX_FILAS + ').' })

        const contexto = await cargarContexto(id_lote)
        if (!contexto) return res.status(404).json({ ok: false, mensaje: 'El lote no existe.' })
        if (contexto.cuotas.length === 0) return res.json({ ok: false, mensaje: 'El lote no tiene un cuadro de cuotas cargado.' })

        const plan = planDe(contexto, filas, opciones)

        res.json({
            ok: true,
            plan,
            yaPagadoTotal: Object.values(contexto.yaPagado).reduce((a, v) => a + v, 0),
            pagosImportadosAntes: contexto.pagosPrevios,
        })
    } catch (error) {
        console.error('Error en importarPagos.vista:', error)
        res.status(500).json({ ok: false, mensaje: 'No se pudo armar la vista previa.', detalle: error.message })
    }
}

const confirmar = async (req, res) => {
    const insertados = []
    try {
        const { id_lote, opciones, forzar, cuil_cuit_administrador, archivo } = req.body
        const filas = limpiarFilas(req.body.filas)
        if (!filas) return res.status(400).json({ ok: false, mensaje: 'No se pudieron leer las filas del Excel.' })

        const contexto = await cargarContexto(id_lote)
        if (!contexto) return res.status(404).json({ ok: false, mensaje: 'El lote no existe.' })

        const plan = planDe(contexto, filas, opciones)

        if (plan.errores.length > 0) {
            return res.status(400).json({ ok: false, mensaje: 'Hay filas con errores. Corregí el Excel y volvé a intentar.', errores: plan.errores })
        }
        if (plan.advertencias.some((a) => a.tipo === 'valor') && !forzar) {
            return res.status(409).json({
                ok: false,
                requiereConfirmacion: true,
                mensaje: 'Los valores de las cuotas del Excel no coinciden con los del sistema. Confirmá expresamente para importar igual.',
            })
        }
        if (plan.pagos.length === 0) {
            return res.status(400).json({ ok: false, mensaje: 'No hay pagos nuevos para importar.' })
        }

        const cuotaPorId = {}
        for (const c of contexto.cuotas) cuotaPorId[c.id] = c

        const lote = ahoraComoLote()
        const nombre = String(archivo || '').replace(/[{}[\]]/g, '').slice(0, 40)

        for (const p of plan.pagos) {
            const cuota = cuotaPorId[p.id_cuota]
            const observaciones = (MARCA + ' [IMP-' + lote + '] {' + p.huella + '}' + (nombre ? ' ' + nombre : '')).slice(0, 190)

            const result = await pool.query('INSERT INTO pagos SET ?', [{
                id_cuota: p.id_cuota,
                monto: p.monto,
                fecha: p.fecha,
                cuil_cuit: soloDigitos(cuota.cuil_cuit),
                mes: cuota.mes,
                anio: cuota.anio,
                estado: 'A',
                cuil_cuit_administrador,
                cuil_cuit_distinto: 'No',
                // Pagos históricos: no se comparan con movimientos ni generan alertas de monto inusual.
                monto_distinto: 'No',
                monto_inusual: 'No',
                id_cbu: 0,
                ubicacion: 'sin comprobante',
                observaciones,
            }])
            insertados.push(result.insertId)
        }

        try {
            await pool.query('INSERT INTO registro_operaciones SET ?', {
                cuil_cuit: cuil_cuit_administrador || '',
                tabla_referencia: 'pagos',
                id_referencia: String(id_lote),
                cuil_cuit_referencia: contexto.lote.cuil_cuit,
                fecha: new Date().toLocaleDateString(),
                adicional: ('Importacion de pagos desde Excel [IMP-' + lote + '] lote ' + id_lote + ' - ' + plan.pagos.length + ' pagos').slice(0, 140),
            })
        } catch (e) {
            console.log('No se pudo registrar la operación:', e.message)
        }

        res.json({
            ok: true,
            importacion: lote,
            pagos: plan.pagos.length,
            total: plan.resumen.totalAImportar,
            deudaRestante: plan.resumen.deudaRestante,
            mensaje: 'Se importaron ' + plan.pagos.length + ' pagos.',
        })
    } catch (error) {
        console.error('Error en importarPagos.confirmar:', error)
        if (insertados.length) {
            try {
                await pool.query('DELETE FROM pagos WHERE id IN (?)', [insertados])
            } catch (e) {
                console.error('No se pudieron deshacer los pagos parciales:', e)
            }
        }
        res.status(500).json({ ok: false, mensaje: 'No se pudo importar. No se guardó ningún pago.', detalle: error.message })
    }
}

const deshacer = async (req, res) => {
    try {
        const { id_lote, importacion, cuil_cuit_administrador } = req.body
        if (!/^\d{14}$/.test(String(importacion || ''))) {
            return res.status(400).json({ ok: false, mensaje: 'Identificador de importación inválido.' })
        }

        const lote = (await pool.query('SELECT id, cuil_cuit FROM lotes WHERE id = ?', [id_lote]))[0]
        if (!lote) return res.status(404).json({ ok: false, mensaje: 'El lote no existe.' })

        const cuotas = await pool.query('SELECT id FROM cuotas WHERE id_lote = ?', [id_lote])
        if (cuotas.length === 0) return res.json({ ok: false, mensaje: 'El lote no tiene cuotas.' })

        const resultado = await pool.query(
            'DELETE FROM pagos WHERE id_cuota IN (?) AND observaciones LIKE ?',
            [cuotas.map((c) => c.id), '%[IMP-' + importacion + ']%']
        )
        const borrados = resultado.affectedRows || 0

        if (borrados > 0) {
            try {
                await pool.query('INSERT INTO registro_operaciones SET ?', {
                    cuil_cuit: cuil_cuit_administrador || '',
                    tabla_referencia: 'pagos',
                    id_referencia: String(id_lote),
                    cuil_cuit_referencia: lote.cuil_cuit,
                    fecha: new Date().toLocaleDateString(),
                    adicional: ('Deshacer importacion de pagos [IMP-' + importacion + '] lote ' + id_lote + ' - ' + borrados + ' pagos').slice(0, 140),
                })
            } catch (e) {
                console.log('No se pudo registrar la operación:', e.message)
            }
        }

        res.json({ ok: borrados > 0, borrados, mensaje: borrados > 0 ? 'Se deshizo la importación (' + borrados + ' pagos).' : 'No se encontraron pagos de esa importación.' })
    } catch (error) {
        console.error('Error en importarPagos.deshacer:', error)
        res.status(500).json({ ok: false, mensaje: 'No se pudo deshacer la importación.', detalle: error.message })
    }
}

module.exports = { vista, confirmar, deshacer }
