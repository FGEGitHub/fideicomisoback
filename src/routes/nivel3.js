const express = require('express')
const router = express.Router()
const pool = require('../database')
const ponerguion = require('../public/apps/transformarcuit')

const { isLoggedIn, isLoggedInn3 } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const passport= require('passport')
const agregaricc = require('./funciones/agregaricc')
const {subirexceldemovimientos , enviarmovimiento,historialIcc, pagoSi, borrarHistorial, asignarClave, asignarvalormetroc, consultarIcc, agregarIccGral2 } = require('../controladores/nivel3Controlador')
const multer = require("multer");
router.post('/signupp', isLoggedInn3, passport.authenticate('local.signupnivel3', {
    successRedirect: '/exitosignup',
    failureRedirect:'/noexito',
    failureFlash:true

}))
const upload = multer({ storage: multer.memoryStorage() });
//REACT GET HISTORIAL
router.get('/historialicc', isLoggedInn3, historialIcc)


//// PAGOS INUSUALES
router.get('/pagosi', pagoSi)



router.get('/borrarhistorial', isLoggedInn3, borrarHistorial)

/// ASIGNAR CLAVE PARA REGISTRO DE CLIENTES
router.post('/asignarclave',isLoggedInn3,asignarClave )



router.post('/asignarvalormetroc',isLoggedInn3, asignarvalormetroc)


//// Controla si ya eciste un ICC asignado
router.post('/consultaricc',isLoggedInn3, consultarIcc)

///// REACT ii gral
router.post('/agregariccgral2', isLoggedInn3,agregarIccGral2 )
//////

///// AGREGA a ICC al IC3
router.post('/agregariccgral22', isLoggedInn3,agregarIccGral2)

//ACCESO A MENU DE USUARIO NIVEL 2
// AGREGAR USUARIO 


router.post('/enviarmovimiento', enviarmovimiento)

router.post("/subirexceldemovimientos", upload.single("file"), subirexceldemovimientos);




router.post('/agregarunusuario', async (req, res,) => {
    const { cuil_cuit, nombre, mail, nivel } = req.body;
 
const nuevo={
    cuil_cuit,
     nombre,
      mail,
       nivel 
}



})

///nivel 3 smvm
router.post('/enviardatosnuevosalario', async (req, res,) => {
    const { valor, fecha } = req.body;
 

newInu ={
    valor,
     fecha 
}
try {
   await pool.query('INSERT INTO salariovital SET ?', [newInu]);
   res.json('realizado')
} catch (error) {
    console.log(error)
    res.json('error algo sucedio')
}


})

////////lista de usuarios
router.get('/traerusuarios',isLoggedInn3, async (req, res) => {

    const usuarios = await pool.query(" Select * from users  ")

res.json(usuarios)
    
    }

)



////menuoruncipal 
router.get('/traerdatosdetarjetas', isLoggedInn3, async (req, res) => {
    // Obtener la fecha actual del sistema
    const fechaActual = new Date();
    const anio = fechaActual.getFullYear(); // Obtiene el año actual
    let mes = fechaActual.getMonth() + 1; // Obtiene el mes actual (de 0 a 11, por eso +1)

    // Convertir a número entero para asegurarnos de eliminar el 0 adelante (ejemplo: 09 -> 9)
    mes = parseInt(mes, 10);

    // Consulta para el salario vital
    const svm = await pool.query("SELECT * FROM salariovital ORDER BY id DESC LIMIT 1");

    // Consulta para el ICC con el mes y año actual
    const icc = await pool.query("SELECT * FROM icc_historial WHERE anio = ? AND mes = ?", [anio, mes]);

    const criterios = await pool.query("SELECT * FROM criterios_riesgo ORDER BY id DESC LIMIT 1")

    const criteriosData = [{tipo:'Persona Riesgo bajo','valor':criterios[0].bajopersona},{tipo:'Persona Riesgo medio','valor':criterios[0].mediopersona},{tipo:'Persona Riesgo alto','valor':criterios[0].altopersona},{tipo:'Empresa Riesgo bajo','valor':criterios[0].bajoempresa},{tipo:'Empresa Riesgo medio','valor':criterios[0].medioempresa},{tipo:'Empresa Riesgo alto','valor':criterios[0].altoempresa} ]


    // Responder con ambos resultados
    res.json([svm, icc,criteriosData]); 
});


///historial valor metro cuadrado 
router.get('/historialvalormetro',isLoggedInn3, async (req, res) => {

    const valores = await pool.query(" Select * from nivel3  ")

res.json(valores)
    
    }

)

//Habilitar usuario para pagar
router.get("/habilitarusuario/:cuil_cuit", isLoggedIn, async (req, res) => {
    let { cuil_cuit } = req.params
    habilitado = 'SI'
    aux = {
        habilitado
    }
    await pool.query('UPDATE users set ? WHERE cuil_cuit = ?', [aux, cuil_cuit])
    cuil_cuit = ponerguion.ponerguion(cuil_cuit)
    res.redirect("/links/detallecliente/"+cuil_cuit)
})
//Habilitar usuario para pagar
router.get("/deshabilitarusuario/:cuil_cuit", isLoggedIn, async (req, res) => {
    let { cuil_cuit } = req.params
    habilitado = 'NO'
    aux = {
        habilitado
    }
    await pool.query('UPDATE users set ? WHERE cuil_cuit = ?', [aux, cuil_cuit])
    cuil_cuit = ponerguion.ponerguion(cuil_cuit)

    res.redirect("/links/detallecliente/"+cuil_cuit)
})

//ACCION DE  AGREGAR ICC GENERAL
router.post('/agregariccgral', async (req, res,) => {
    const { ICC, mes, anio, zona } = req.body;
    const todas = await pool.query("select * from cuotas where mes =? and anio =? and zona = ?", [mes, anio,zona])
    const parcialidad = "Final"
    for (var i = 0; i < todas.length; i++) {
        nro_cuota = todas[i]["nro_cuota"]
        cuil_cuit = todas[i]["cuil_cuit"]
       
        if (nro_cuota == 1) {
        
            saldo_inicial = todas[i]["saldo_inicial"]
            const Ajuste_ICC = 0
            const Base_calculo = todas[i]["Amortizacion"]
            const cuota_con_ajuste = todas[i]["Amortizacion"]
            const Saldo_real = todas[i]["Amortizacion"]
            var cuota = {
                ICC,
                Ajuste_ICC,
                Base_calculo,
                cuota_con_ajuste,
                Saldo_real,
                parcialidad
    
            }

        } else {
            const anterior = await pool.query('Select * from cuotas where nro_cuota = ? and cuil_cuit = ?', [nro_cuota - 1, cuil_cuit])
            var Saldo_real_anterior = anterior[0]["Saldo_real"]
            
            const cuota_con_ajuste_anterior = anterior[0]["cuota_con_ajuste"]
            
            const Base_calculo = cuota_con_ajuste_anterior
            const Ajuste_ICC = cuota_con_ajuste_anterior * ICC
    
            const cuota_con_ajuste = cuota_con_ajuste_anterior + Ajuste_ICC
            Saldo_real_anterior += cuota_con_ajuste
            const Saldo_real = Saldo_real_anterior

            var cuota = {
                ICC,
                Ajuste_ICC,
                Base_calculo,
                cuota_con_ajuste,
                Saldo_real,
                parcialidad
    
            }
        }
    
        try {
            await pool.query('UPDATE cuotas set ? WHERE id = ?', [cuota, todas[i]["id"]])

        } catch (error) {
           // console.log(error)
            res.redirect(`/cuotas`);

        }



    }

    res.redirect(`/profile`);
})






module.exports = router
