const pool = require('../database')

// =========================================================================
// DAR DE BAJA UN CUADRO DE CUOTAS (nivel2)
//
// No borra nada: marca todas las cuotas VIGENTES de UN lote con
// cuota_cancelada = 'Archivada'. Todas las pantallas de deuda (Deudores,
// Flujo de Fondos PIT, Deudores Parque y flujo de deudores de nivel 6) ya
// ignoran las cuotas cuyo cuota_cancelada sea distinto de 'No', así que el
// cuadro deja de contar como deuda y las cuotas quedan como historial.
//
// - No crea ningún pago.
// - No toca las cuotas ya canceladas por "cancelar lote" (solo las 'No').
// - Es reversible con restaurarCuadro.
// - Deja constancia en registro_operaciones (quién, cuándo, qué lote).
// =========================================================================

const MARCA_BAJA = 'Archivada'

const fechaHoy = () => new Date().toLocaleDateString()

const registrar = async (cuilAdmin, lote, adicional) => {
    try {
        await pool.query('INSERT INTO registro_operaciones SET ?', {
            cuil_cuit: cuilAdmin || '',
            tabla_referencia: 'cuotas',
            id_referencia: String(lote.id),
            cuil_cuit_referencia: lote.cuil_cuit,
            fecha: fechaHoy(),
            adicional,
        })
    } catch (error) {
        // El registro de auditoría no debe impedir la operación principal.
        console.log('No se pudo registrar la operación:', error.message)
    }
}

const bajaCuadro = async (req, res) => {
    try {
        const { id_lote, cuil_cuit_administrador } = req.body

        const lote = (await pool.query('SELECT id, cuil_cuit, fraccion, manzana, parcela FROM lotes WHERE id = ?', [id_lote]))[0]
        if (!lote) return res.json({ ok: false, mensaje: 'El lote no existe.' })

        const resultado = await pool.query(
            "UPDATE cuotas SET cuota_cancelada = ? WHERE id_lote = ? AND cuota_cancelada = 'No'",
            [MARCA_BAJA, id_lote]
        )
        const cuotas = resultado.affectedRows || 0

        if (cuotas === 0) {
            return res.json({ ok: false, mensaje: 'El cuadro no tiene cuotas vigentes para dar de baja.' })
        }

        await registrar(
            cuil_cuit_administrador,
            lote,
            `Baja de cuadro de cuotas - lote ${id_lote} (Fr ${lote.fraccion} Mz ${lote.manzana} Pc ${lote.parcela}) - ${cuotas} cuotas`
        )

        res.json({ ok: true, cuotas, mensaje: `Cuadro dado de baja (${cuotas} cuotas).` })
    } catch (error) {
        console.error('Error en bajaCuadro:', error)
        res.status(500).json({ ok: false, mensaje: 'No se pudo dar de baja el cuadro.' })
    }
}

const restaurarCuadro = async (req, res) => {
    try {
        const { id_lote, cuil_cuit_administrador } = req.body

        const lote = (await pool.query('SELECT id, cuil_cuit, fraccion, manzana, parcela FROM lotes WHERE id = ?', [id_lote]))[0]
        if (!lote) return res.json({ ok: false, mensaje: 'El lote no existe.' })

        const resultado = await pool.query(
            "UPDATE cuotas SET cuota_cancelada = 'No' WHERE id_lote = ? AND cuota_cancelada = ?",
            [id_lote, MARCA_BAJA]
        )
        const cuotas = resultado.affectedRows || 0

        if (cuotas === 0) {
            return res.json({ ok: false, mensaje: 'El cuadro no tiene cuotas dadas de baja.' })
        }

        await registrar(
            cuil_cuit_administrador,
            lote,
            `Restauracion de cuadro de cuotas - lote ${id_lote} (Fr ${lote.fraccion} Mz ${lote.manzana} Pc ${lote.parcela}) - ${cuotas} cuotas`
        )

        res.json({ ok: true, cuotas, mensaje: `Cuadro restaurado (${cuotas} cuotas).` })
    } catch (error) {
        console.error('Error en restaurarCuadro:', error)
        res.status(500).json({ ok: false, mensaje: 'No se pudo restaurar el cuadro.' })
    }
}

module.exports = { bajaCuadro, restaurarCuadro }
