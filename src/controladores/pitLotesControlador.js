const pool = require('../database')

// =========================================================================
// LOTES DEL PIT EDITABLES (mapa, visor nivel 8)
//
// Los pins del mapa salen de los .geojson del front (pitdisponible /
// pitnodisponible / pitreservado). Esos archivos NO se modifican: los datos
// editables viven en `pit_lotes_info` (una fila por pin, clave = id del pin) y
// cada cambio deja una fila en `pit_lotes_historial` (quién, cuándo, antes/después).
//
// Tablas y carga inicial: database/pit_lotes.sql
//   GET  /pit/lotes                      cualquier usuario logueado (todos ven los datos)
//   POST /pit/lotes/:id_mapa             solo nivel 8 (edita)
//   GET  /pit/lotes/:id_mapa/historial   solo nivel 8
// =========================================================================

const ESTADOS = ['DISPONIBLE', 'NO DISPONIBLE', 'RESERVADO']
const TIPOS_EMPRESA = ['Boleto', 'Usufructo']

// campo -> largo máximo (columnas de texto)
const TEXTOS = {
    manzana: 20,
    lote: 40,
    medidas: 120,
    superficie: 60,
    empresa: 200,
    observaciones: 2000,
}

const FLAGS = [
    'acceso_sin', 'acceso_tierra', 'acceso_ripio', 'acceso_pavimento',
    'agua', 'cloacas', 'sumidero', 'cuneta_tierra',
    'energia_mt_bt', 'energia_alum_publ', 'fibra_optica', 'pasto_alto',
]

const CAMPOS_PUBLICOS = [
    'id_mapa', 'estado', ...Object.keys(TEXTOS).filter((c) => c !== 'observaciones'), 'empresa_tipo',
    ...FLAGS, 'observaciones', 'actualizado_por', 'actualizado_en',
].join(', ')

const ID_VALIDO = /^[A-Za-z0-9_-]{1,60}$/
// Ids de los pins del mapa (los de los .geojson): pitdisponible-1, pitnodisponible-30, pitreservado-2...
const ID_PIN_PIT = /^pit(disponible|nodisponible|reservado)-\d{1,4}$/

const listar = async (req, res) => {
    try {
        const filas = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM pit_lotes_info`)
        res.json(filas)
    } catch (error) {
        console.error('Error en pit listar:', error)
        res.status(500).json({ error: 'No se pudieron traer los lotes' })
    }
}

// Normaliza el cuerpo del pedido a { campo: valor } con SOLO los campos permitidos
// que vinieron. Devuelve { datos } o { error }.
const validar = (body) => {
    const datos = {}
    if (body.estado !== undefined) {
        const estado = String(body.estado).trim().toUpperCase()
        if (!ESTADOS.includes(estado)) return { error: 'Estado inválido' }
        datos.estado = estado
    }
    for (const [campo, max] of Object.entries(TEXTOS)) {
        if (body[campo] === undefined) continue
        const v = body[campo] === null ? '' : String(body[campo]).trim()
        if (v.length > max) return { error: `"${campo}" supera ${max} caracteres` }
        datos[campo] = v === '' ? null : v
    }
    if (body.empresa_tipo !== undefined) {
        const v = body.empresa_tipo === null ? '' : String(body.empresa_tipo).trim()
        if (v !== '' && !TIPOS_EMPRESA.includes(v)) return { error: 'Tipo de empresa inválido' }
        datos.empresa_tipo = v === '' ? null : v
    }
    for (const flag of FLAGS) {
        if (body[flag] === undefined) continue
        datos[flag] = body[flag] === true || body[flag] === 1 || body[flag] === '1' || body[flag] === 'true' ? 1 : 0
    }
    return { datos }
}

const actualizar = async (req, res) => {
    const { id_mapa } = req.params
    if (!ID_VALIDO.test(id_mapa)) return res.status(400).json({ error: 'Identificador inválido' })

    const { datos, error } = validar(req.body || {})
    if (error) return res.status(400).json({ error })

    try {
        const usuario = (req.usuarioToken && (req.usuarioToken.cuil_cuit || String(req.usuarioToken.id))) || null
        const actual = await pool.query('SELECT * FROM pit_lotes_info WHERE id_mapa = ?', [id_mapa])

        // Un pin que todavía no está en la tabla se crea al guardarlo por primera vez
        // (solo para ids de pins reales del mapa, no para cualquier texto).
        if (actual.length === 0) {
            if (!ID_PIN_PIT.test(id_mapa)) return res.status(404).json({ error: 'Lote no encontrado' })
            if (!datos.estado) return res.status(400).json({ error: 'Falta el estado del lote' })

            const nuevoDatos = { id_mapa, ...datos, actualizado_por: usuario }
            const cambiosAlta = {}
            for (const [campo, valor] of Object.entries(datos)) {
                if (valor !== null && valor !== 0) cambiosAlta[campo] = { antes: null, despues: valor }
            }
            await pool.query('INSERT INTO pit_lotes_info SET ?, actualizado_en = NOW()', [nuevoDatos])
            await pool.query('INSERT INTO pit_lotes_historial SET ?', [
                { id_mapa, usuario, cambios: JSON.stringify({ ...cambiosAlta, alta: { antes: null, despues: 'primer guardado del lote' } }) },
            ])
            const [creada] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM pit_lotes_info WHERE id_mapa = ?`, [id_mapa])
            return res.json(creada)
        }

        // Solo cuenta lo que realmente cambió.
        const cambios = {}
        for (const [campo, nuevo] of Object.entries(datos)) {
            const antes = actual[0][campo] === undefined ? null : actual[0][campo]
            if (String(antes ?? '') !== String(nuevo ?? '')) cambios[campo] = { antes, despues: nuevo }
        }

        const [fila] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM pit_lotes_info WHERE id_mapa = ?`, [id_mapa])
        if (Object.keys(cambios).length === 0) return res.json({ ...fila, sinCambios: true })

        const cambiosDb = {}
        for (const campo of Object.keys(cambios)) cambiosDb[campo] = cambios[campo].despues

        await pool.query(
            'UPDATE pit_lotes_info SET ?, actualizado_por = ?, actualizado_en = NOW() WHERE id_mapa = ?',
            [cambiosDb, usuario, id_mapa]
        )
        await pool.query('INSERT INTO pit_lotes_historial SET ?', [
            { id_mapa, usuario, cambios: JSON.stringify(cambios) },
        ])

        const [nueva] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM pit_lotes_info WHERE id_mapa = ?`, [id_mapa])
        res.json(nueva)
    } catch (err) {
        console.error('Error en pit actualizar:', err)
        res.status(500).json({ error: 'No se pudo guardar el lote' })
    }
}

const historial = async (req, res) => {
    const { id_mapa } = req.params
    if (!ID_VALIDO.test(id_mapa)) return res.status(400).json({ error: 'Identificador inválido' })
    try {
        const filas = await pool.query(
            'SELECT id, usuario, cambios, creado_en FROM pit_lotes_historial WHERE id_mapa = ? ORDER BY id DESC LIMIT 50',
            [id_mapa]
        )
        res.json(filas.map((f) => ({ ...f, cambios: JSON.parse(f.cambios) })))
    } catch (error) {
        console.error('Error en pit historial:', error)
        res.status(500).json({ error: 'No se pudo traer el historial' })
    }
}

module.exports = { listar, actualizar, historial }
