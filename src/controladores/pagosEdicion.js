// =========================================================================
// EDICIÓN Y CANCELACIÓN DE PAGOS (tabla `pagos`, cartera general/PIT)
//
// Principios (para que la base quede consistente y se pueda reportar):
//   1. `pagos` es la fuente de verdad. La cuota (`cuotas.pago`,
//      `cuotas.diferencia`, `cuotas.Saldo_real`) es DERIVADA de los pagos:
//      cada edición/cancelación la deja recalculada en la MISMA transacción,
//      así ni el cuadro de cuotas ni el Flujo de Fondos PIT (que también lee
//      `cuotas.pago`) quedan con plata fantasma.
//   2. Todo pasa en una transacción: o se aplica completo o no se aplica nada.
//   3. Cada cambio deja una fila en `pagos_auditoria` (quién, cuándo, qué
//      valor había antes/después, motivo). Cancelar borra la fila de `pagos`
//      pero conserva un snapshot completo en la auditoría.
// =========================================================================
const jwt = require('jsonwebtoken')
const pool = require('../database')
const { hashf } = require('../keys')
const traerriesgo = require('../routes/funciones/riesgo')

const redondear2 = (n) => Math.round(n * 100) / 100

// ---------- infraestructura: conexión con transacción ----------
const obtenerConexion = () =>
    new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => (err ? reject(err) : resolve(conn)))
    })

const envolver = (conn) => ({
    query: (sql, params) =>
        new Promise((resolve, reject) => {
            conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
        }),
    begin: () => new Promise((resolve, reject) => conn.beginTransaction((e) => (e ? reject(e) : resolve()))),
    commit: () => new Promise((resolve, reject) => conn.commit((e) => (e ? reject(e) : resolve()))),
    rollback: () => new Promise((resolve) => conn.rollback(() => resolve())),
    release: () => conn.release(),
})

// ---------- tabla de auditoría (se crea sola si no existe) ----------
let auditoriaLista = null
const asegurarTablaAuditoria = () => {
    if (!auditoriaLista) {
        auditoriaLista = pool
            .query(
                `CREATE TABLE IF NOT EXISTS pagos_auditoria (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_pago INT NOT NULL,
                    id_cuota INT NULL,
                    accion VARCHAR(20) NOT NULL,
                    monto_anterior DOUBLE NULL,
                    monto_nuevo DOUBLE NULL,
                    fecha_anterior VARCHAR(15) NULL,
                    fecha_nueva VARCHAR(15) NULL,
                    motivo VARCHAR(255) NULL,
                    cuil_usuario VARCHAR(45) NULL,
                    snapshot TEXT NULL,
                    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_pagos_aud_pago (id_pago),
                    INDEX idx_pagos_aud_cuota (id_cuota)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3`
            )
            .catch((err) => {
                auditoriaLista = null // reintentar la próxima vez
                throw err
            })
    }
    return auditoriaLista
}

// ---------- helpers de validación ----------
const cuilDelToken = (req) => {
    try {
        const authorization = req.get('authorization') || ''
        const token = authorization.startsWith('Bearer ') ? authorization.substring(7) : null
        if (!token) return null
        const decoded = jwt.verify(token, hashf.key)
        return decoded.cuil_cuit || null
    } catch (e) {
        return null
    }
}

const esFechaISOValida = (texto) => {
    if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
    const [a, m, d] = texto.split('-').map(Number)
    const fecha = new Date(Date.UTC(a, m - 1, d))
    return a >= 2000 && fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

class ErrorDeNegocio extends Error {
    constructor(status, mensaje) {
        super(mensaje)
        this.status = status
    }
}

// ---------- recalcular la cuota a partir de sus pagos ----------
// Misma lógica que usa el cuadro de cuotas al cargarse (vercuotas2):
//   pago       = SUM(pagos.monto)
//   diferencia = pago - cuota_con_ajuste
//   Saldo_real de la cuota y de las siguientes del lote = Saldo_real - (cambio en pago)
// (el cuadro igualmente vuelve a recalcular todo al abrirse).
const recalcularCuota = async (db, idCuota) => {
    const cuotas = await db.query('SELECT * FROM cuotas WHERE id = ? FOR UPDATE', [idCuota])
    const cuota = cuotas[0]
    if (!cuota) return null

    const sumas = await db.query('SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE id_cuota = ?', [idCuota])
    const total = redondear2(parseFloat(sumas[0].total) || 0)

    const pagoAnterior = parseFloat(cuota.pago) || 0
    const delta = total - pagoAnterior
    const cuotaConAjuste = parseFloat(cuota.cuota_con_ajuste) || 0
    const diferencia = redondear2(total - cuotaConAjuste)

    await db.query('UPDATE cuotas SET pago = ?, diferencia = ? WHERE id = ?', [total, diferencia, idCuota])

    if (Math.abs(delta) > 0.004 && cuota.id_lote !== null && cuota.id_lote !== undefined) {
        await db.query(
            `UPDATE cuotas SET Saldo_real = Saldo_real - ?
             WHERE id_lote = ? AND nro_cuota >= ? AND parcialidad = 'Final'`,
            [delta, cuota.id_lote, cuota.nro_cuota]
        )
    }

    return { pago: total, diferencia }
}

// ---------- flags de control (mismo criterio que al cargar el pago) ----------
const calcularFlags = async (cuota, monto, previos) => {
    let monto_distinto = 'Si'
    try {
        const cuit = String(cuota.cuil_cuit).replace(/\D/g, '')
        const movimientos = await pool.query(
            'SELECT credito FROM movimientos WHERE cuil_cuit = ? AND credito > 0',
            [cuit]
        )
        if (movimientos.some((m) => Math.abs(parseFloat(m.credito) - monto) < 0.005)) {
            monto_distinto = 'No'
        }
    } catch (e) {
        monto_distinto = previos.monto_distinto || 'Si'
    }

    let monto_inusual = previos.monto_inusual || 'No'
    try {
        const clientes = await pool.query('SELECT * FROM clientes WHERE id = ?', [cuota.id_cliente])
        if (clientes[0]) {
            const maximo = await traerriesgo.montomaximodelicliente(clientes[0])
            monto_inusual = monto > maximo ? 'Si' : 'No'
        }
    } catch (e) {
        // si no se puede evaluar el riesgo, se conserva el valor anterior
    }

    return { monto_distinto, monto_inusual }
}

const registrarAuditoria = (db, datos) =>
    db.query('INSERT INTO pagos_auditoria SET ?', [datos])

// =========================================================================
// POST /pagos/editarpago   { id, monto, fecha, motivo? }
// =========================================================================
const editarPago = async (req, res) => {
    const id = parseInt(req.body.id, 10)
    const monto = redondear2(Number(req.body.monto))
    const fecha = req.body.fecha
    const motivo = (req.body.motivo || '').toString().trim().slice(0, 255) || null

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Pago inválido' })
    if (!Number.isFinite(monto) || monto <= 0 || monto > 1e11) {
        return res.status(400).json({ error: 'El monto debe ser un número mayor a 0' })
    }
    if (!esFechaISOValida(fecha)) {
        return res.status(400).json({ error: 'La fecha de pago no es válida (formato AAAA-MM-DD)' })
    }

    let conn = null
    let db = null
    try {
        await asegurarTablaAuditoria()
        conn = await obtenerConexion()
        db = envolver(conn)
        await db.begin()

        const pagos = await db.query('SELECT * FROM pagos WHERE id = ? FOR UPDATE', [id])
        const pago = pagos[0]
        if (!pago) throw new ErrorDeNegocio(404, 'El pago no existe (puede que ya haya sido cancelado)')

        const cuotas = await db.query('SELECT * FROM cuotas WHERE id = ?', [pago.id_cuota])
        const cuota = cuotas[0]
        if (!cuota) throw new ErrorDeNegocio(404, 'La cuota asociada al pago no existe')

        const flags = await calcularFlags(cuota, monto, pago)

        await db.query(
            'UPDATE pagos SET monto = ?, fecha = ?, monto_distinto = ?, monto_inusual = ? WHERE id = ?',
            [monto, fecha, flags.monto_distinto, flags.monto_inusual, id]
        )

        // Alerta de "monto inusual" pendiente de revisión (nivel 3): que refleje el monto nuevo
        const pendientes = await db.query(
            "SELECT id FROM historial_pagosi WHERE id_pago = ? AND proceso = 'averificarnivel3'",
            [String(id)]
        )
        if (flags.monto_inusual === 'Si') {
            if (pendientes.length > 0) {
                await db.query(
                    "UPDATE historial_pagosi SET monto = ?, fecha = ? WHERE id_pago = ? AND proceso = 'averificarnivel3'",
                    [String(monto), fecha, String(id)]
                )
            } else if (pago.monto_inusual !== 'Si') {
                await db.query('INSERT INTO historial_pagosi SET ?', [{
                    id_cuota: pago.id_cuota,
                    monto,
                    cuil_cuit: pago.cuil_cuit,
                    mes: pago.mes,
                    id_pago: id,
                    estado: pago.estado,
                    anio: pago.anio,
                    zona: 'Otra',
                    proceso: 'averificarnivel3',
                    tipologia: 'Pago monto inusual',
                    cuil_cuit_administrador: pago.cuil_cuit_administrador,
                    ubicacion: pago.ubicacion,
                    fecha,
                }])
            }
        } else if (pendientes.length > 0) {
            await db.query(
                "DELETE FROM historial_pagosi WHERE id_pago = ? AND proceso = 'averificarnivel3'",
                [String(id)]
            )
        }

        const cuotaActualizada = await recalcularCuota(db, pago.id_cuota)

        await registrarAuditoria(db, {
            id_pago: id,
            id_cuota: pago.id_cuota,
            accion: 'EDITAR',
            monto_anterior: pago.monto,
            monto_nuevo: monto,
            fecha_anterior: pago.fecha,
            fecha_nueva: fecha,
            motivo,
            cuil_usuario: cuilDelToken(req),
            snapshot: JSON.stringify(pago),
        })

        await db.commit()

        const actualizado = await pool.query('SELECT * FROM pagos WHERE id = ?', [id])
        res.json({ ok: true, mensaje: 'Pago actualizado', pago: actualizado[0], cuota: cuotaActualizada })
    } catch (error) {
        if (db) await db.rollback()
        const status = error instanceof ErrorDeNegocio ? error.status : 500
        if (status === 500) console.error('❌ ERROR EN editarPago:', error)
        res.status(status).json({ error: status === 500 ? 'Error al actualizar el pago' : error.message })
    } finally {
        if (db) db.release()
    }
}

// =========================================================================
// POST /pagos/cancelarpago   { id, motivo? }
// =========================================================================
const cancelarPago = async (req, res) => {
    const id = parseInt(req.body.id, 10)
    const motivo = (req.body.motivo || '').toString().trim().slice(0, 255) || null

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Pago inválido' })

    let conn = null
    let db = null
    try {
        await asegurarTablaAuditoria()
        conn = await obtenerConexion()
        db = envolver(conn)
        await db.begin()

        const pagos = await db.query('SELECT * FROM pagos WHERE id = ? FOR UPDATE', [id])
        const pago = pagos[0]
        if (!pago) throw new ErrorDeNegocio(404, 'El pago no existe (puede que ya haya sido cancelado)')

        // Alertas de revisión pendientes de ese pago dejan de tener sentido
        await db.query(
            "DELETE FROM historial_pagosi WHERE id_pago = ? AND proceso = 'averificarnivel3'",
            [String(id)]
        )

        await db.query('DELETE FROM pagos WHERE id = ?', [id])

        const cuotaActualizada = await recalcularCuota(db, pago.id_cuota)

        await registrarAuditoria(db, {
            id_pago: id,
            id_cuota: pago.id_cuota,
            accion: 'CANCELAR',
            monto_anterior: pago.monto,
            monto_nuevo: null,
            fecha_anterior: pago.fecha,
            fecha_nueva: null,
            motivo,
            cuil_usuario: cuilDelToken(req),
            snapshot: JSON.stringify(pago),
        })

        await db.commit()

        res.json({ ok: true, mensaje: 'Pago cancelado', cuota: cuotaActualizada })
    } catch (error) {
        if (db) await db.rollback()
        const status = error instanceof ErrorDeNegocio ? error.status : 500
        if (status === 500) console.error('❌ ERROR EN cancelarPago:', error)
        res.status(status).json({ error: status === 500 ? 'Error al cancelar el pago' : error.message })
    } finally {
        if (db) db.release()
    }
}

module.exports = { editarPago, cancelarPago, recalcularCuota, asegurarTablaAuditoria }
