const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedInn } = require('../lib/auth')



router.get('/leer/:id',isLoggedInn, async (req, res) => {
    id = req.params.id
   const { config} = req.body
      try {
        const noti = await pool.query('select * from notificaciones where id = ?', [id]);
 

        const update={
            leida:'Si'
        }
        await pool.query('UPDATE notificaciones set ? WHERE id = ?', [update, id])
        res.json(noti[0])

    } catch (error) {
        res.json(error)
    }
    

})

router.get('/cantidad/:cuil_cuit',isLoggedInn, async (req, res) => {
    cuil_cuit = req.params.cuil_cuit
const aux = '%'+cuil_cuit+'%'
    try {
        const noti = await pool.query('select * from notificaciones where leida="No" and cuil_cuit like ?', [aux]);
       const nom = await pool.query('select * from clientes where cuil_cuit like ?',aux)
      
        const arr = nom[0]['Nombre'].split(' ')
   
     
   
        res.json([noti,arr[0]])

    } catch (error) {
     //   console.log(error)
        res.json(error)
    }
  

    

})





router.get('/enviar', async (req, res) => {

})
module.exports = router

