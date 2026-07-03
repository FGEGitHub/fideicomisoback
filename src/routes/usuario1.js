const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn,isLoggedInn, isLoggedInn2  } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const ponerguion = require('../public/apps/transformarcuit')
const sacarguion = require('../public/apps/transformarcuit')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const passport = require('passport')
const s3Controller = require('./configAWS/s3-controller');
////////
const enviodemail = require('./Emails/Enviodemail')
const {derivarpagoic3,cancelarlote,cancelarloteic3, enviarconsulta, constanciadelpago, cliente, usuario1acredingresos, cantidadbalances, cantidadiibb, cbus, borrarunlegajo, constancias, cbuscliente, realizarr, modificarcli, lotescliente, lote2, ief, noticliente, notiid, completolegajos, cliente2, modificarcli2, lotescliente2, constanciass } = require('../controladores/usuario1controlador')


// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../documentos');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
    
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });


  
  const upload = multer({ storage });
  
// Ruta para ver el archivo PDF

//////////////// MODIFICAR CONTRASENIA


router.get('/traerpdfonstanciacbu/:id',async (req, res) => {
    const { id } = req.params;
    console.log("cosnt",id)
    const query = await pool.query('SELECT * FROM cbus WHERE id = ?',[id]);
  console.log(query)
  
      const filePath = path.join(__dirname, '../documentos', query[0].ubicacion);
      res.sendFile(filePath);
    ;
  });

router.get('/traerpdfconstancia/:id',async (req, res) => {
    const { id } = req.params;
    
    const query = await pool.query('SELECT * FROM constancias WHERE id = ?',[id]);
 const filePath = path.join(__dirname, '../documentos', query[0].ubicacion);
console.log("__dirname:", __dirname);
console.log("ubicacion:", query[0].ubicacion);
console.log("Ruta final:", filePath);
  
     
      res.sendFile(filePath);
    ;
  });
  
  router.get('/traerPdfConstanciadepagoinusual/:id',async (req, res) => {
    const { id } = req.params;
    console.log(id)
    const query = await pool.query('SELECT * FROM historial_pagosi WHERE id = ?',[id]);
  console.log(query)
  
      const filePath = path.join(__dirname, '../documentos', query[0].ubicacion);
      res.sendFile(filePath);
    ;
  });
  router.get('/traerPdfConstanciadepagoinusual2/:id',async (req, res) => {
    const { id } = req.params;
    console.log(id)
    const query = await pool.query('SELECT * FROM historial_pagosi WHERE id = ?',[id]);
  console.log(query)
  
      const filePath = path.join(__dirname, '../documentos', query[0].ubicacion2);
      res.sendFile(filePath);
    ;
  });
router.post('/modificarpass', passport.authenticate('local.modificarpass', {

    successRedirect: '/exitorecupero',
    failureRedirect: '/noexitorecupero',
    failureFlash: true

}))

/////

router.post('/upload-to-s3', s3Controller.s3Upload);
router.get('/all-files', s3Controller.s3Get);
router.get('/get-object-url/:key', isLoggedInn, s3Controller.getSignedUrl);
router.get('/get-object-url2/:key', isLoggedInn, s3Controller.getSignedUrl2);


router.post('/pagarrapidoic3', upload.single('file'),s3Controller.pagarrapidoic3);
//////PDFSS
router.post('/subirlegajo', upload.single('file'),s3Controller.subirlegajo);

/// determinar pdf
///Rutas: detalleclietnteingresos   determinar pepe
router.post('/determinarPep', upload.single('file'), s3Controller.determinarPep);

router.post("/actualizarpago",  upload.single('file'), s3Controller.actualizarpago)

router.post("/actualizarpagoic3",  upload.single('file'), s3Controller.actualizarpagoic3)

router.post('/derivarpagoic3', upload.single('file'),s3Controller.derivarpagoic3);



router.post('/subirlegajo1', isLoggedInn,s3Controller.subirlegajo1);
//// REACT  
router.post('/cargarcbu',isLoggedInn, s3Controller.cargarcbu)

/// DETERMINAR INGRESO, LIMITAR A NIVEL 2
router.post('/determinaringreso', upload.single('file') ,s3Controller.determinaringreso);


router.post('/pagarnivel1', upload.single('file'), s3Controller.pagarniv1);

router.post('/pagonivel2', upload.single('file'), s3Controller.pagonivel2);


router.post('/cancelarlote', upload.single('file'), s3Controller.cancelarlote);


router.post('/cancelarloteic3', upload.single('file'), s3Controller.cancelarloteic3);

router.post('/pagarnivel2ic3', upload.single('file'), s3Controller.pagarnivel2ic3);


router.post('/pagarnivel1cuota', upload.single('file'), s3Controller.pagarnivel1cuota);

router.post('/pagarnivel2varios', isLoggedInn2, s3Controller.pagarnivel2varios);



router.post('/justificacion', isLoggedInn, s3Controller.justificar);



router.post('/enviarconsulta',isLoggedInn, enviarconsulta)




router.get('/leerimagen ', )

////////constancias de un pago 

router.get('/constanciasdelpago/:id', constanciadelpago)


router.get('/cliente/:cuil_cuit', isLoggedInn, cliente)

router.get('/cliente2/:cuil_cuit',  cliente2)



router.get('/usuario1acredingresos/:cuil_cuit', isLoggedInn,usuario1acredingresos)

router.get('/cantidadbalances/:cuil_cuit', isLoggedInn,cantidadbalances)

router.get('/cantidaddjiva/:cuil_cuit', isLoggedInn,)

router.get('/cantidadiibb/:cuil_cuit', isLoggedInn, cantidadiibb)

router.get('/cbus/:cuil_cuit', isLoggedInn, cbus)

router.get('/borrarunlegajo/:id',borrarunlegajo)

router.get('/constancias/:cuil_cuit', isLoggedInn, constanciass)
router.get('/cbuscliente/:cuil_cuit', isLoggedInn, cbuscliente)

////pago react nivel 1
router.post('/realizarr', isLoggedInn, realizarr)
////////modificar daos
router.post('/modificarcli',isLoggedInn,modificarcli)

///modificar 2
router.post('/modificarcli2',isLoggedInn,modificarcli2)

////


//////////////////////checklegajos
router.post("/completolegajos", isLoggedInn, completolegajos)
///lotes del cliente
router.get('/lotescliente/:cuil_cuit', isLoggedInn, lotescliente)

router.get('/lotesCliente2/:cuil_cuit', isLoggedInn, lotescliente2)


///cuotasdeunlote
router.get("/lote2/:id",  isLoggedInn, lote2)


///////////////////-------------prueba
router.get('/', isLoggedIn, async (req, res) => {
    let cuil_cuit = req.user.cuil_cuit

    let cliente = await pool.query('select * from users where cuil_cuit = ? ', [cuil_cuit])

    res.render('usuario1/menu', { cliente })

})

/////////////////////INFORME ESTADO FINANCIERO

router.get('/ief/:id', isLoggedInn, ief)



////notificaciones de un cliente, react
router.get("/noticliente/:cuil_cuit", isLoggedInn,noticliente)
///una notificacion

router.get("/notiid/:id", isLoggedInn, notiid)

// -------------------------------------NOTIFICACIONES 

// LISTADO DE NOTIFICACIONES
router.get("/notificaciones", async (req, res) => {

    const notificaciones = await pool.query('SELECT * FROM notificaciones WHERE cuil_cuit = ?', [req.user.cuil_cuit])

    res.render('usuario1/notificaciones', { notificaciones })

})


// LEER NOTIFICACIONES 
router.get('/leer/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params


    const noti = await pool.query('SELECT * FROM notificaciones where id = ?', [id])





    if (noti[0] != "Si") {
        await pool.query('UPDATE notificaciones SET leida="Si"  where id = ?', [id])

    }

    res.render('usuario1/leer', { noti })
})

// ------------------------------------- FIN   NOTIFICACIONES 



//----------------------------LISTA DE CUOTAS

//LISTAR CUOTAS 
router.get("/cuotas", async (req, res) => {
    const { cuil_cuit } = req.params
   


    const cuotas = await pool.query('SELECT * FROM cuotas WHERE cuil_cuit = ? and parcialidad != "Final" ', [cuil_cuit])
  


 
    res.json(cuotas )

})






//----------------------------FIN LISTA DE CUOTAS---------------------------------------------------

// LISTADO DE PAGOS 

router.get("/pagos", async (req, res) => {


    const pagos = await pool.query('SELECT * FROM pagos WHERE cuil_cuit = ? ', [req.user.cuil_cuit])



    res.render('usuario1/pagos', { pagos })

})



// PAGINA DE ESTADO DE CUOTAS Y PAGOS

router.get("/estado", async (req, res) => {

    const cuotas = await pool.query('SELECT * FROM cuotas WHERE cuil_cuit = ? ', [req.user.cuil_cuit])
    var devengado = 0
    var pagado = 0

    for (var i = 0; i < cuotas.length; i++) {
        if (cuotas[i]['parcialidad'] = 'Final') {
            devengado += cuotas[i]['cuota_con_ajuste']
        }
        ;
    }
    const pagos = await pool.query('SELECT * FROM pagos WHERE cuil_cuit = ? ', [req.user.cuil_cuit])

    for (var i = 0; i < pagos.length; i++) {

        pagado += pagos[i]['monto']

            ;
    }
    const total = {
        pagado,
        devengado

    }

    cuotas.push(total)


    res.render('usuario1/estado', { cuotas })

})


//------------------------------------------INFORMAR PAGO -------------------------------------------------

// PAGINA DE INFO DE TRANSFERENCIA 
router.get("/subirelegir", isLoggedIn, async (req, res) => {
    let aux = req.user.cuil_cuit
    try {
        let aux = req.user.cuil_cuit
        aux = ponerguion.ponerguion(aux)

        aux = '%' + aux + '%'

        const lote = await pool.query('SELECT * FROM lotes WHERE cuil_cuit like ?', [aux])
        res.render('usuario1/subirelegir', { lote })
    } catch (error) {
       // console.log(error)
        res.redirect('/usuario1')
    }





})

router.post('/subirprueba', async (req, res, done) => {
    const { id } = req.body;
 })

 
 router.post("/modificarcbu", isLoggedInn, async (req, res) => {
    try {
        const { id, descripcion } = req.body;
        console.log("Modificando CBU", id, descripcion);

        const result = await pool.query("UPDATE cbus SET descripcion = ? WHERE id = ?", [descripcion, id]);

        if (result.affectedRows > 0) {
            res.json("CBU actualizado correctamente");
        } else {
            res.status(404).json({ success: false, message: "No se encontró el CBU" });
        }
    } catch (error) {
        console.error("Error al modificar CBU:", error);
        res.status(500).json("Error en el servidor");
    }
});

router.post("/modificarconstancianormal", isLoggedInn, async (req, res) => {
    try {
        const { id, descripcion } = req.body;
        console.log("Modificando constancia normal", id, descripcion);

        const result = await pool.query("UPDATE constancias SET descripcion = ? WHERE id = ?", [descripcion, id]);

        if (result.affectedRows > 0) {
            res.json("Constancia actualizada correctamente");
        } else {
            res.status(404).json({ success: false, message: "No se encontró la constancia" });
        }
    } catch (error) {
        console.error("Error al modificar constancia normal:", error);
        res.status(500).json("Error en el servidor");
    }
});

router.post("/subir", isLoggedIn, async (req, res) => {
    const { id } = req.body;

    try {
        lote = await pool.query('select * from lotes where id = ?', id)



        let aux = req.user.cuil_cuit
        aux = (aux).slice(0, 2) + "-" + (aux).slice(2);
        aux = (aux).slice(0, 11) + "-" + (aux).slice(11);


        if (lote[0]['cuil_cuit'] === aux) {
            aux = '%' + aux + '%'

            // cliente = await pool.query('select * from clientes where cuil_cuit like ?', aux)

            cbus = await pool.query('select * from cbus  where cuil_cuit like ? and estado ="A" ', aux)

        } else {

            req.flash('message', 'Error, ACCESO DENEGADO ')
            res.redirect('/usuario1')
        }

    } catch (error) {
       // console.log(error)
        res.redirect('/usuario1')
    }


    if (req.user.habilitado == 'SI') {
        res.render('usuario1/subir', { cbus })
    } else { res.render('usuario1/subirno', { cuotas }) }



})



// GUARDADO DE TRANSFERENCIA 
router.post('/realizar', async (req, res, done) => {
    const { monto, comprobante, mes, anio } = req.body;
    var estado = 'P'

    let cuil_cuit = req.user.cuil_cuit

    cuil_cuit = (cuil_cuit).slice(0, 2) + "-" + (cuil_cuit).slice(2);


    cuil_cuit = (cuil_cuit).slice(0, 11) + "-" + (cuil_cuit).slice(11);
    aux = '%' + cuil_cuit + '%'
    /*  const workbook = XLSX.readFile('./src/Excel/cuentas_PosicionConsolidada.xls')
     const workbooksheets = workbook.SheetNames
     const sheet = workbooksheets[0]
 
     const dataExcel = XLSX.utils.sheet_to_json(workbook.Sheets[sheet])
     //console.log(dataExcel)
 

 
     for (const property in dataExcel) {
         if ((dataExcel[property]['Descripción']).includes(cuil_cuit)) {
             estado = 'A'
         }
     }
  */
    aux = '%' + cuil_cuit + '%'

    const existe = await pool.query('Select * from cuotas where cuil_cuit like ? and mes = ? and anio =?  and parcialidad = "Final"', [aux, mes, anio])

    if (existe.length > 0) {
        let montomaxx = await pool.query('Select * from clientes where cuil_cuit like ? ', [aux])

        try {
            montomax = montomaxx[0]['ingresos']



        } catch (error) {
          //  console.log(error)
        }



        const id_cuota = existe[0]["id"]
        const newLink = {
            id_cuota,
            monto,
            cuil_cuit,
            estado,
            comprobante,
            mes,
            anio
        };
        await pool.query('INSERT INTO pagos SET ?', [newLink]);

        if (montomax < monto) {

            req.flash('message', 'Atencion pago inusual, sera notificado como tal')


        } else {
            req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        }
        res.redirect(`/usuario1`);
    } else {
        req.flash('message', 'Error la cuota no existe')
        res.redirect(`/usuario1`)

    }

})


/////////////   SUBIR INUSUAL

router.get("/subirinusual", isLoggedIn, async (req, res) => {

    try {
        let aux = req.user.cuil_cuit
        aux = (aux).slice(0, 2) + "-" + (aux).slice(2);

        aux = (aux).slice(0, 11) + "-" + (aux).slice(11);
        aux = '%' + aux + '%'

        cliente = await pool.query('select * from clientes where cuil_cuit like ?', aux)


    } catch (error) {
       // console.log(error)
    }

    res.render('usuario1/subirinusual')


})

//------------------------------------------FIN  INFORMAR PAGO -------------------------------------------------

//------------------------------------------ASOCIAR CBU  -------------------------------------------------
// ASOCIAR CBU 
router.get("/cbu", (req, res) => {
    res.render('usuario1/cbu')

})



router.post('/addcbu', async (req, res) => {

    const { lazo, dc, numero, descripcion } = req.body;
    let aux = req.user.cuil_cuit
    aux = (aux).slice(0, 2) + "-" + (aux).slice(2);

    aux = (aux).slice(0, 11) + "-" + (aux).slice(11);

    const cuil_cuit = aux
    const estado = "P"
    const newcbu = {
        cuil_cuit,
        lazo,
        numero,
        descripcion,
        dc,
        estado
    }

    try {
        await pool.query('INSERT INTO cbus SET ?', [newcbu])
        req.flash('message', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
    } catch (error) {
        req.flash('message', 'Error algo paso ')
      
    }



    res.redirect(`/usuario1`);
})




//------------------------------------------FIN ASOCIAR CBU  -------------------------------------------------
















// INICIO DE LEGAJOS 

// PAGINA  LEGAJO  DATOS PERSONALES/EMPRESA ------------------------

router.get("/legajo", async (req, res) => {
    const razon = await pool.query('Select razon from users where cuil_cuit = ?', [req.user.cuil_cuit])
    if (razon[0]['razon'] == 'Empresa') {
        res.render('usuario1/datossociedad')
    } else { res.render('usuario1/datospers') }
})

// comprobante dni 

router.post('/edit_comp_dni', async (req, res) => {
    const { comprobante } = req.body;
    if (comprobante.length > 0) {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Dni"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1/legajo`);



    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }

})

// constancia de la AFIP

router.post('/edit_comp_afip', async (req, res) => {
    const { comprobante } = req.body;

    if (comprobante.length > 0) {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "ConstAFIP"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);

    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }


})

//ESTATUTO SOCIAL
router.post('/edit_comp_estatuto', async (req, res) => {
    const { comprobante } = req.body;

    if (comprobante.length > 0) {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Estatuto"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);

    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }


})




//  ACTA DE ORGANO
router.post('/edit_comp_acta', async (req, res) => {
    const { comprobante, mes, anio } = req.body;


    if (comprobante.length > 0) {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Actaorgano"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            mes,
            anio,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        try {
            await pool.query('INSERT INTO constancias SET ?', [newr])
            req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
            res.redirect(`/usuario1`);
        } catch (error) {
          //  console.log(error)
            req.flash('message', 'Error, algo sucedio inesperadamente ')
            res.redirect('/usuario1/legajo')
        }



    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }



})

//  ACTA DE ORGANOACREDITACION DOMICILIO  

router.post('/edit_comp_domicilio', async (req, res) => {
    const { comprobante, descripcion } = req.body;

    if (comprobante.length > 0 || descripcion.length > 0) {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Domicilio"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            descripcion,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }



})
















// ------------------FIN PAGINA  LEGAJO  DATOS PERSONALES/EMPRESA ------------------------






// PAGINA  LEGAJO  INGRESOS DECLARADOS  PERSONALES/EMPRESA ------------------------------
router.get("/ingresos", async (req, res) => {
    const razon = await pool.query('Select razon from users where cuil_cuit = ?', [req.user.cuil_cuit])
    if (razon[0]['razon'] == 'Empresa') {
        res.render('usuario1/ingresose')
    } else { res.render('usuario1/ingresosp') }
})
//  GUARDADO DE BALANCE 
router.post('/edit_comp_balance', async (req, res) => {
    const { comprobante, comprobante2 } = req.body;

    if ((comprobante.length == 0) || (comprobante2.length == 0)) {
        req.flash('message', 'Error, se deben subir 2 ')
        res.redirect(`/usuario1/ingresos`)
    } else {

        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Balance"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            comprobante2,
            estado,
            tipo
        }

        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);
    }
})
//  GUARDADO DE BALANCE DJ IVA
router.post('/edit_comp_djiva', async (req, res) => {
    const { comprobante, comprobante2, comprobante3 } = req.body;

    if ((comprobante.length == 0) || (comprobante2.length == 0) || (comprobante3.length == 0)) {
        req.flash('message', 'Error, se deben subir 3 ')
        res.redirect(`/usuario1/ingresos`)
    } else {

        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "DjIVA"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            comprobante2,
            comprobante3,
            estado,
            tipo,
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1/`);
    }
})

//  GUARDADO DE DATOS PROV 
router.post('/edit_comp_djpagosprov', async (req, res) => {
    const { comprobante, comprobante2, comprobante3 } = req.body;

    if ((comprobante.length == 0) || (comprobante2.length == 0) || (comprobante3.length == 0)) {
        req.flash('message', 'Error, se deben subir 3 ')
        res.redirect(`/usuario1`)
    } else {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Djprovision"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            comprobante2,
            comprobante3,
            estado,
            tipo,
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);
    }
})


// ---------------------------------------Fin PAGINA  LEGAJO  INGRESOS DECLARADOS  PERSONALES/EMPRESA ------------------------------






// PAGINA  LEGAJO  INGRESOS DECLARADOS INFO CBU   PERSONALES/EMPRESA 
router.get("/infocbu", async (req, res) => {
    const razon = await pool.query('Select razon from users where cuil_cuit = ?', [req.user.cuil_cuit])
    const cbu = await pool.query('select * from cbus where cuil_cuit=?', [req.user.cuil_cuit])
    if (razon[0]['razon'] == 'Empresa') {
        res.render('usuario1/infocbu', { cbu })
    } else { res.render('usuario1/infocbup') }
})





//-----------------FIN    PAGINA  LEGAJO  INGRESOS DECLARADOS INFO CBU   PERSONALES/EMPRESA -----------

// PAGINA  LEGAJO DECLARACIONS JURADAS----------------------------------------------
router.get("/djs", async (req, res) => {
    const razon = await pool.query('Select razon from users where cuil_cuit = ?', [req.user.cuil_cuit])
    if (razon[0]['razon'] == 'Empresa') {
        res.render('usuario1/djse')
    } else { res.render('usuario1/djsp') }
})
// GUARDADO DJ  DATOS PERSONALES
router.post('/edit_comp_djdatospers', async (req, res) => {
    const { comprobante } = req.body;

    if (comprobante.length > 0) {
        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "djdatospers"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }


})



// GUARDADO DJ  CALIDAD PERSONA
router.post('/edit_comp_djcalidadpers', async (req, res) => {
    const { comprobante } = req.body;


    if (comprobante.length > 0) {


        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "djcalidadpers"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }



})
// GUARDADO DJ  DATOS PERSONALES ORIGEN DE FONDOS 

router.post('/edit_comp_jdorigen', async (req, res) => {
    const { comprobante } = req.body;


    if (comprobante.length > 0) {

        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "djorigen"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }


})
//---------------FIN  PAGINA  LEGAJO DECLARACIONS JURADAS----------------------------------------------

//---------------------INGRESOS DECLARADOS CONTACTO-------------------------------------
// PAGINA  LEGAJO  DE CONTACTO
router.get("/contacto", async (req, res) => {
    const razon = await pool.query('Select razon from users where cuil_cuit = ?', [req.user.cuil_cuit])
    if (razon[0]['razon'] == 'Empresa') {
        res.render('usuario1/contacto')
    } else { res.render('usuario1/contactop') }
})
//METODO DE GUARDADO DE TELEFONO 
router.post('/edit_tel', async (req, res) => {
    const { tel } = req.body;
    const newLink = {
        tel
    }
    const id = req.user.id
    await pool.query("UPDATE users SET ? WHERE id = ?", [newLink, id])
    req.flash('success', 'Guardado correctamente')
    res.redirect(`/usuario1`)
})
//METODO DE GUARDADO DE MAIL
router.post('/edit_correo', async (req, res) => {
    const { correo } = req.body;


    if (comprobante.length > 0) {

        const newLink = {
            correo
        }
        const id = req.user.id

        await pool.query('UPDATE users set ? WHERE id = ?', [newLink, id])
        req.flash('success', 'Guardado correctamente')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que ingresar un mail ')
        res.redirect('/usuario1/legajo')
    }



})
//---------------------FIN INGRESOS DECLARADOS CONTACTO-------------------------------------



// COMPROBANTE RECIBO
router.post('/edit_comp_recibo', async (req, res) => {
    const { comprobante } = req.body;

    if (comprobante.length > 0) {

        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "Recibo_sueldo"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }


})





// 
router.post('/edit_const_cuil', async (req, res) => {
    const { comprobante } = req.body;


    if (comprobante.length > 0) {

        const cuil_cuit = req.user.cuil_cuit
        const estado = "P"
        const tipo = "const_cuil"
        const id_cliente = req.user.id
        const newr = {
            id_cliente,
            cuil_cuit,
            comprobante,
            estado,
            tipo
        }
        await pool.query('INSERT INTO constancias SET ?', [newr])
        req.flash('success', 'Guardado correctamente, tu solicitud sera procesada y se notificará al confirmarse')
        res.redirect(`/usuario1`);


    } else {
        req.flash('message', 'Error, Tienes que subir un comprobante ')
        res.redirect('/usuario1/legajo')
    }



})




// CHAT







router.post('/chatenviar', async (req, res) => {
    const { mensaje_cliente } = req.body;


    let cuil_cuit = req.user.cuil_cuit
    cuil_cuit = (cuil_cuit).slice(0, 2) + "-" + (cuil_cuit).slice(2);

    cuil_cuit = (cuil_cuit).slice(0, 11) + "-" + (cuil_cuit).slice(11);
    const newr = {
        mensaje_cliente,
        cuil_cuit

    }
    await pool.query('INSERT INTO chats SET ?', [newr])

    res.redirect(`/usuario1/chat`);



})

router.get("/chat", async (req, res) => {
    let cuil_cuit = req.user.cuil_cuit
    cuil_cuit = (cuil_cuit).slice(0, 2) + "-" + (cuil_cuit).slice(2);


    cuil_cuit = (cuil_cuit).slice(0, 11) + "-" + (cuil_cuit).slice(11);
    const aux = '%' + cuil_cuit + '%'
    const chat = await pool.query('select * from chats where cuil_cuit like ?', [aux])
    res.render('usuario1/chat', { chat })

})





router.get("/menu2", async (req, res) => {



    res.render('usuario1/menu2/index')

})









module.exports = router

