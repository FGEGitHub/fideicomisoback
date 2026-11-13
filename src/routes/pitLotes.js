const express = require('express')
const router = express.Router()
const { isLoggedInn, nivelesPermitidos } = require('../lib/auth')
const { listar, actualizar, historial } = require('../controladores/pitLotesControlador')

// Nivel 8 = visor PIT: es el único que edita. Todos los usuarios logueados leen.
const NIVEL_EDITOR_PIT = 8

router.get('/lotes', isLoggedInn, listar)
router.post('/lotes/:id_mapa', nivelesPermitidos(NIVEL_EDITOR_PIT), actualizar)
router.get('/lotes/:id_mapa/historial', nivelesPermitidos(NIVEL_EDITOR_PIT), historial)

module.exports = router
