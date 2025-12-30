const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isLoggedInn, isLoggedInn2, isLoggedInn3 } = require('../lib/auth') //proteger profile
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const XLSX = require('xlsx')
const pagodecuota = require('./funciones/pagoDeCuota')
const ponerguion = require('../public/apps/transformarcuit')
const sacarguion = require('../public/apps/transformarcuit')
const enviodemail = require('./Emails/Enviodemail')
const { Console } = require('console')
const s3Controller = require('./configAWS/s3-controller');
const traerriesgo =  require('./funciones/riesgo')
const diskstorage = multer.diskStorage({
    destination: path.join(__dirname, '../Excel'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-estr-' + file.originalname)


    }
}) //para que almacene temporalmente la imagen
const fileUpload = multer({
    storage: diskstorage,

}).single('image')



router.post('/extractoid', isLoggedInn2, async (req, res) => {
    const { id } = req.body

    const estract = await pool.query('select * from extracto where id = ? ', [id])
    const nombree = estract[0]['ubicacion']
console.log('nombre ',nombree)
    let mandar = []
    // const workbook = XLSX.readFile(`./src/Excel/${nombree}`)

    // const workbook = XLSX.readFile('./src/Excel/1665706467397-estr-cuentas_PosicionConsolidada.xls')

    try {
        const workbook = XLSX.readFile(path.join(__dirname, '../Excel/' + nombree))
        const workbooksheets = workbook.SheetNames
        const sheet = workbooksheets[0]

        const dataExcel = XLSX.utils.sheet_to_json(workbook.Sheets[sheet])
        //console.log(dataExcel)

        let regex = /(\d+)/g;
  
        for (const property in dataExcel) {
  
            /*  if ((dataExcel[property]['Descripción']).includes(cuil_cuit)) {
                 estado = 'A'
                 // tipo de pago normal 
             } */






            try {


                descripcion = (dataExcel[property]['DESCRIPCION']).match(regex)

                if (descripcion != null) {

                    try {

                        descripcion = descripcion.toString();

                        if (descripcion.length > 7) {
                            descripcion = ponerguion.ponerguion(descripcion)

                            desc = (dataExcel[property]['DESCRIPCION'])
                            let arr = desc.split('-');

                            nombre = arr[3]
                            fecha = dataExcel[property]['']
                            referencia = dataExcel[property]['REFERENCIA']
                            debitos = dataExcel[property]['DEBITO EN $']
                            creditos = dataExcel[property]['CREDITO EN $']
                            nuevo = {
                                fecha,
                                descripcion,
                                referencia,
                                debitos,
                                creditos,
                                nombre

                            }
                            console.log('nuevo',nuevo)


                            mandar.push(nuevo);
                        }

                    } catch (error) {
                        console.log(error)
                        nuevo = {
                            fecha: 'no se encontro archivo',
                            descripcion: 'no se encontro archivo',
                            referencia: 'no se encontro archivo',
                            debitos: 'no se encontro archivo',
                            creditos: 'no se encontro archivo',
                            nombre: 'no se encontro archivo',

                        }

                        mandar = [nuevo]

                    }
                } else { }


            } catch (error) {

            }





        }

    } catch (error) {

    }

    res.json(mandar)


})









////// traer todos los estractos cagados
router.get('/todoslosextractos', isLoggedInn2, async (req, res,) => {
    cuil_cuit = req.params.cuil_cuit

    try {
        estr = await pool.query('select * from extracto ')
        res.json(estr)
    } catch (error) {
        res.send('algo salio mal')
    }


})

/// VER COINCIDENCIAS
router.get('/vercoincidencias/:id', isLoggedInn2, async (req, res,) => {
    id = req.params.id

    try {

        pago = await pool.query('select * from pagos  join cbus on pagos.id_cbu = cbus.id where pagos.id = ? ', [id])
        cuil_cuit = pago[0]['cuil_cuit']
        cuil_cuit_lazo = pago[0]['cuil_cuit_lazo']
        monto = Math.trunc(parseFloat(pago[0]['monto']))
        monto = String(monto)
        let regex = /(\d+)/g;
        let extracto = await pool.query('Select * from extracto ')
        cantidad = extracto.length
        let mandar = []
        //////// COMPARACION CON EL EXTRACTO

        try {


            cuil_cuit_lazo = sacarguion.sacarguion(cuil_cuit_lazo)

            for (let i = 0; i < extracto.length; i++) {
                ///el while sale si se encuentra monto y cuil o si recorre todos los estractos

                try {
                    const workbook = XLSX.readFile(path.join(__dirname, '../Excel/' + extracto[i]['ubicacion']))

                    const workbooksheets = workbook.SheetNames
                    const sheet = workbooksheets[0]


                    const dataExcel = XLSX.utils.sheet_to_json(workbook.Sheets[sheet])


                    console.log(dataExcel[1]['DESCRIPCION'].includes(cuil_cuit_lazo))///IMPORTANTE EL CONSOLE LOG PARA NO LEER EXTRACTOS INVALIDOS
                    for (const property in dataExcel) {////////////recorrido del extracto





                        if (((dataExcel[property]['DESCRIPCION']).includes(cuil_cuit_lazo)) || ((dataExcel[property]['Descripción']).includes(cuil_cuit))) {

                            // tipo de pago normal 
                            descripcion = (dataExcel[property]['DESCRIPCION']).match(regex)
                            descripcion = ponerguion.ponerguion(descripcion)
                            desc = (dataExcel[property]['DESCRIPCION'])
                            let arr = desc.split('-');
                            nombre = arr[3]
                            fecha = dataExcel[property]['FECHA']
                            referencia = dataExcel[property]['REFERENCIA']
                            debitos = dataExcel[property]['DEBITO EN $']
                            creditos = dataExcel[property]['CREDITO EN $']
                            ///////agregar detaññes
                            nuevo = {
                                fecha,
                                descripcion,
                                referencia,
                                debitos,
                                creditos,
                                nombre

                            }


                            mandar.push(nuevo);

                        } else {
                            try {
                                creditoString = String(dataExcel[property]['CREDITO EN $'])
                                if (creditoString.includes(monto)) {
                                    descripcion = (dataExcel[property]['DESCRIPCION']).match(regex)
                                    descripcion = ponerguion.ponerguion(descripcion)
                                    desc = (dataExcel[property]['DESCRIPCION'])
                                    let arr = desc.split('-');
                                    nombre = arr[3]
                                    fecha = dataExcel[property]['FECHA']
                                    referencia = dataExcel[property]['REFERENCIA']
                                    debitos = dataExcel[property]['DEBITO EN $']
                                    creditos = dataExcel[property]['CREDITO EN $']
                                                                 ///////agregar detaññes
                                    nuevo = {
                                        fecha,
                                        descripcion,
                                        referencia,
                                        debitos,
                                        creditos,
                                        nombre

                                    }

                                    mandar.push(nuevo);
                                }
                            } catch (error) {

                            }
                        }



                    }
                } catch (error) {
                   // console.log(error)
                }

            } //// fin comparacion de estractos
   
            res.json(mandar)
        } catch (error) {
          
         //   console.log(error)
        }







    } catch (error) {
       // console.log(error)
        res.send('algo salio mal')
    }


})

///////////////// REALIZAR PAGO MANUAL NIVEL 2 

router.post('/pagonivel2', isLoggedInn2, async (req, res) => { // pagot es el objeto pago
    let { id, tipo, cuil_cuit, monto } = req.body

    ///// cuil_cuit es del usuario que esta ene l sistema

    //var pagot = await pool.query('select * from pagos where id = ?', [id]) PAGO QUE HAY QUE CREAR

    //


    const cuota = await pool.query('select * from cuotas where id = ?', [id]) //objeto cuota

    let saldo_realc = cuota[0]["Saldo_real"]
    let nro_cuota = (cuota[0]["nro_cuota"])
    let id_lote = cuota[0]["id_lote"]
    //// hasta aca se trae la cuota

    try {


        Saldo_real = parseFloat(saldo_realc) - monto
        let pago = parseFloat(monto) + parseFloat(cuota[0]["pago"])



        const nuevo = {
            //  Saldo_real,
            monto,
            cuil_cuit_administrador: cuil_cuit,
            tipo,
            id_cuota: id



        }

        const update = {
            Saldo_real,
            pago,

        }
   

        await pool.query('UPDATE cuotas set  ? WHERE id = ?', [update, id])

        await pool.query('INSERT INTO pagos set ?', [nuevo]);


        cant_finales = await pool.query('select * from cuotas  WHERE id_lote = ? and parcialidad = "Final"', [id_lote])


        if (nro_cuota < cant_finales.length) {/// aca esta el errror



            for (var i = (nro_cuota + 1); i <= cant_finales.length; i++) {

                try {//

                    aux = await pool.query('select *from cuotas WHERE id_lote = ? and nro_cuota=?', [id_lote, i])
                    saldo_realc = parseFloat(aux[0]["Saldo_real"])
                    idaux = aux[0]["id"]
              

                    Saldo_real = saldo_realc - monto
                
                    const update = {
                        Saldo_real,



                    }
                    await pool.query('UPDATE cuotas set  ? WHERE id = ?', [update, idaux])
                } catch (error) {//

                }

            }
        }


        res.send([cuota[0]['cuil_cuit'], 'Pago Realizado'])



    } catch (error) {
        res.send([cuota[0]['cuil_cuit'], 'Pago Realizado'])
    }

})



router.post('/registrarInteres/', isLoggedInn2, async (req, res) => { // pagot es el objeto pago
    const { id_interes, id_pago ,tipo_operacion} = req.body
  
try {
    if(tipo_operacion=="pago interes"){
        await pool.query('UPDATE cuotas set pago_interes=? WHERE id = ?', [id_pago, id_interes])
    }else{
        await pool.query('UPDATE cuotas set pago_interes=? WHERE id = ?', [tipo_operacion, id_interes])
    }
    res.json("Realizado")  
} catch (error) {
    res.json("No Realizado")  

}


})



/// aprobar pago nivel 2
router.post('/aprobarr/', isLoggedInn2, async (req, res) => { // pagot es el objeto pago
    const { id, tipo } = req.body
    try {


        // pagot es el objeto pago
        let pagot = await pool.query('select * from pagos where id = ?', [id])
        let id_cuota = pagot[0]["id_cuota"]
        let monto = pagot[0]["monto"]


        ///////////
        const cuota = await pool.query('select * from cuotas where id = ?', [id_cuota]) //objeto cuota
        let cuota_con_ajuste = cuota[0]["cuota_con_ajuste"]
        let saldo_realc = cuota[0]["Saldo_real"]
        let nro_cuota = cuota[0]["nro_cuota"]
        let id_lote = cuota[0]["id_lote"]
        let Amortizacion = cuota[0]["Amortizacion"]

        /////////////////////comparacion 



        try {
            ////compara si ya supero el 


            await pagodecuota.pagodecuota(id_cuota, monto)
            updatepago = {
                estado: "A"
            }
            if (tipo === "Sospechoso") {

                updatepago = {
                    estado: "A",
                    tipo
                }
            }


            await pool.query('UPDATE pagos set  ? WHERE id = ?', [updatepago, id])


        } catch (error) {
          //  console.log(error)
        }
        res.send('Aprobado')
    } catch (error) {
        res.send(error)
    }

})


router.get("/traerpagosdeuncliente/:cuil_cuit", async (req, res) => {
    const { cuil_cuit } = req.params

    const detalles = await pool.query('SELECT * FROM pagos where cuil_cuit = ?', [cuil_cuit])

    res.json(detalles)

})
///// Detalles del pago 
router.get("/detallespago/:id", async (req, res) => {
    const { id } = req.body

    const detalles = await pool.query('SELECT * FROM pagos where id_cuota = ?', [id])

    res.json(detalles)
    //*  res.json(cantidad[0]["count(*)"])
})



router.get("/cantidadpendientesadmin", isLoggedInn2, async (req, res) => {
    try {
        const detalles = await pool.query('SELECT count(*) FROM historial_pagosi where proceso="averificarnivel3" ')
        const rta = detalles[0]['count(*)']

        res.json([rta])
    } catch (error) {
console.log(error)
    }


})

router.get("/cantidadpendientes", isLoggedInn2, async (req, res) => {
    try {
        const detalles = await pool.query('SELECT count(*) FROM pagos where estado="p" or estado="justificacionp" ')
        const rta = detalles[0]['count(*)']

        const legajos = await pool.query('SELECT count(*) FROM constancias where estado= "Pendiente"  ')
        const cantlegajos = legajos[0]['count(*)']

        const cbus = await pool.query('SELECT count(*) FROM cbus where estado= "P"  ')
        const cantcbus = cbus[0]['count(*)']

        res.json([rta, cantlegajos, cantcbus])
    } catch (error) {

    }


})



/////detalles de todos los pagos de una cuota
router.post("/detallespagos", isLoggedInn2, async (req, res) => {
    const { id } = req.body
    const pagos = await pool.query('SELECT * FROM pagos where id_cuota = ?', [id])




    res.json(pagos)
})


router.post("/detallesPagoic3", isLoggedInn2, async (req, res) => {
    const { id } = req.body
    const pagos = await pool.query('SELECT * FROM pagos_ic3 where id_cuota = ?', [id])




    res.json(pagos)
})
router.post("/detallesPagocli", isLoggedInn2, async (req, res) => {
    const { id } = req.body
    console.log(id)
    const pagos = await pool.query(`
        SELECT 
          pagos_ic3.*, 
          sel.cuo,
          sel.idic3,
          sel.aniooo,
          sel.messs, 
     
          CONCAT(SUBSTRING(sel.mes, 6, 2), '-', SUBSTRING(sel.mes, 1, 4)) AS mes_anyo
        FROM 
          pagos_ic3 
        JOIN 
          (SELECT id AS idic3, mes, id_cliente AS idcli, cuota as cuo, mes as messs, anio as aniooo FROM cuotas_ic3) AS sel 
        ON 
          pagos_ic3.id_cuota = sel.idic3 
        WHERE 
          idcli = ?
      `, [id]);


    res.json(pagos)
})



router.get("/todoslospagos", isLoggedInn2, async (req, res) => {
  try {
    const pagos = await pool.query(`
      
      SELECT
        p.id            AS id_pago,
        p.monto,
        p.cuil_cuit,
        sel.mes,
        sel.anio,
        c.id            AS id_cliente,
        c.nombre,
      
        'normal'        AS origen
      FROM pagos p
      LEFT JOIN cuotas sel ON p.id_cuota = sel.id
      LEFT JOIN clientes c ON sel.cuil_cuit = c.cuil_cuit
      WHERE c.zona <> 'IC3'

      UNION ALL

      SELECT
        pi.id           AS id_pago,
        pi.monto,
        c2.cuil_cuit,
        q.mes,
        q.anio,
        c2.id           AS id_cliente,
        
        c2.nombre,
        'ic3'           AS origen
      FROM pagos_ic3 pi
      JOIN cuotas_ic3 q ON pi.id_cuota = q.id
      JOIN clientes c2 ON q.id_cliente = c2.id
      WHERE c2.zona = 'IC3'

      ORDER BY anio DESC, mes DESC;
    `);
    res.json(pagos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los pagos" });
  }
});



///////// Cantidad inusuales 
router.get("/cantidadinusuales", isLoggedInn3, async (req, res) => {
    const cantidad = await pool.query('SELECT count(*) FROM historial_pagosi where estado = "Pendiente"')
    res.json(cantidad)
    //*  res.json(cantidad[0]["count(*)"])
})

///////// reaxct
router.get("/listainusual", isLoggedInn2, async (req, res) => {
    const pagos1 = await pool.query(`
        SELECT historial_pagosi.*, sel.idcuota, sel.mesc, sel.anioc, sel2.cuil_cuitc, sel3.idcli, sel3.Nombre 
        FROM historial_pagosi 
        LEFT JOIN (SELECT id AS idp, id_cuota AS idcuota, mes AS mesc, anio AS anioc FROM pagos) AS sel 
            ON historial_pagosi.id_pago = sel.idp 
        LEFT JOIN (SELECT id AS idc, cuil_cuit AS cuil_cuitc FROM cuotas) AS sel2 
            ON sel.idcuota = sel2.idc 
        LEFT JOIN (SELECT id AS idcli, cuil_cuit AS cuil_cuitcl, Nombre FROM clientes) AS sel3 
            ON sel2.cuil_cuitc = sel3.cuil_cuitcl 
        WHERE proceso = "averificarnivel3" AND (zona IS NULL OR zona != "IC3")
    `);

    const pagos2 = await pool.query(`
        SELECT historial_pagosi.*, sel.idcuota, sel.mesc, sel.anioc, sel2.id_clientec, sel3.idcli, sel3.cuil_cuitc, sel3.Nombre 
        FROM historial_pagosi 
        LEFT JOIN (SELECT id AS idp, id_cuota AS idcuota, mes AS mesc, anio AS anioc FROM pagos_ic3) AS sel 
            ON historial_pagosi.id_pago = sel.idp 
        LEFT JOIN (SELECT id AS idc, id_cliente AS id_clientec FROM cuotas_ic3) AS sel2 
            ON sel.idcuota = sel2.idc 
        LEFT JOIN (SELECT id AS idcli, cuil_cuit as cuil_cuitc, Nombre FROM clientes) AS sel3 
            ON sel2.id_clientec = sel3.idcli 
        WHERE proceso = "averificarnivel3" AND zona = "IC3"
    `);

    const pagosUnidos = [...pagos1, ...pagos2];
console.log(pagosUnidos)
    // Para cada pago, agrecgar el riesgo
    const pagosConRiesgo = await Promise.all(
        pagosUnidos.map(async (pago) => {
            const paggg = await pool.query('SELECT * FROM cuotas WHERE id = ?', [pago.id_cuota]);
            console.log(pago.id_cuota)
             clienteObj =[]
try {
     cliente = await pool.query('SELECT * FROM clientes WHERE cuil_cuit = ?', [paggg[0].cuil_cuit]);
     clienteObj = cliente[0];
} catch (error) {
    
}
           
            let riesgo = null;
          
            console.log(  pago.cuil_cuitc)

            if (clienteObj) {
                riesgo = await traerriesgo.matriz(clienteObj);
            }
            console.log()
            return { ...pago, riesgo };
        })
    );

    res.json(pagosConRiesgo);
});

router.get("/pagosinusuales2", isLoggedInn2, async (req, res) => {
    const pagos1 = await pool.query(`
        SELECT historial_pagosi.*, sel.idcuota, sel.mesc, sel.anioc, sel2.cuil_cuitc, sel3.idcli, sel3.Nombre 
        FROM historial_pagosi 
        LEFT JOIN (SELECT id AS idp, id_cuota AS idcuota, mes AS mesc, anio AS anioc FROM pagos) AS sel 
            ON historial_pagosi.id_pago = sel.idp 
        LEFT JOIN (SELECT id AS idc, cuil_cuit AS cuil_cuitc FROM cuotas) AS sel2 
            ON sel.idcuota = sel2.idc 
        LEFT JOIN (SELECT id AS idcli, cuil_cuit AS cuil_cuitcl, Nombre FROM clientes) AS sel3 
            ON sel2.cuil_cuitc = sel3.cuil_cuitcl 
        WHERE (proceso = "averificarnivel2" or proceso= "averificarnivel3") AND (zona IS NULL OR zona != "IC3")
    `);

    const pagos2 = await pool.query(`
        SELECT historial_pagosi.*, sel.idcuota, sel.mesc, sel.anioc, sel2.id_clientec, sel3.idcli, sel3.cuil_cuitc, sel3.Nombre 
        FROM historial_pagosi 
        LEFT JOIN (SELECT id AS idp, id_cuota AS idcuota, mes AS mesc, anio AS anioc FROM pagos_ic3) AS sel 
            ON historial_pagosi.id_pago = sel.idp 
        LEFT JOIN (SELECT id AS idc, id_cliente AS id_clientec FROM cuotas_ic3) AS sel2 
            ON sel.idcuota = sel2.idc 
        LEFT JOIN (SELECT id AS idcli, cuil_cuit as cuil_cuitc, Nombre FROM clientes) AS sel3 
            ON sel2.id_clientec = sel3.idcli 
        WHERE proceso = "averificarnivel2" AND zona = "IC3"
    `);

    const pagosUnidos = [...pagos1, ...pagos2];
console.log(pagosUnidos)
    // Para cada pago, agrecgar el riesgo
    const pagosConRiesgo = await Promise.all(
        pagosUnidos.map(async (pago) => {
            const paggg = await pool.query('SELECT * FROM cuotas WHERE id = ?', [pago.id_cuota]);
            console.log(pago.id_cuota)
             clienteObj =[]
try {
     cliente = await pool.query('SELECT * FROM clientes WHERE cuil_cuit = ?', [paggg[0].cuil_cuit]);
     clienteObj = cliente[0];
} catch (error) {
    
}
           
            let riesgo = null;
          
            console.log(  pago.cuil_cuitc)
console.log(cliente)
            if (clienteObj) {
                riesgo = await traerriesgo.matriz(clienteObj);
            }
            console.log()
            return { ...pago, riesgo };
        })
    );

    res.json(pagosConRiesgo);
});
//react pendientes
router.get('/pendientess', isLoggedInn2, async (req, res) => {
    // const pendientes = await pool.query("Select * from pagos join estado_pago on pagos.estado=estado_pago.id_estado_pago where estado = 'P' or estado = 'ajustificar' ")
    const pendientes = await pool.query("Select * from pagos join estado_pago on pagos.estado=estado_pago.id_estado_pago where estado = 'P'  or estado='justificacionp' ")


    res.json(pendientes)




})

///// aprobar react


///// inusuales mensuales react
router.post("/mensualesinusuales", isLoggedInn3, async (req, res) => { 
    let { mes, anio } = req.body;
    
    // Convertimos el mes a dos dígitos (si viene sin el cero adelante)
    const mesConCero = mes < 10 ? `0${mes}` : `${mes}`;

    try {
        const pagos1 = await pool.query(`
            SELECT * FROM historial_pagosi 
             JOIN (
                SELECT id AS idp,cuil_cuit_administrador, id_cuota AS idcuota, SUBSTRING(fecha, 6, 2) AS mesc, SUBSTRING(fecha, 1, 4) AS anioc 
                FROM pagos
            ) AS sel ON historial_pagosi.id_pago = sel.idp 
             JOIN (
                SELECT id AS idc, cuil_cuit AS cuil_cuitc 
                FROM cuotas
            ) AS sel2 ON sel.idcuota = sel2.idc   
             JOIN (
                SELECT id AS idcli, cuil_cuit AS cuil_cuitcl, Nombre  
                FROM clientes 
            ) AS sel3 ON sel2.cuil_cuitc = sel3.cuil_cuitcl  

   JOIN (
                SELECT cuil_cuit AS cuil_cuitadmin, nombre as nombreadmin
                FROM users 
            ) AS sel4 ON sel.cuil_cuit_administrador = sel4.cuil_cuitadmin    


            AND (zona IS NULL OR zona != "IC3")
            AND sel.anioc = ? 
            AND sel.mesc = ?
        `, [anio, mesConCero]);

        const pagos2 = await pool.query(`
            SELECT * FROM historial_pagosi 
             JOIN (
                SELECT id AS idp, cuil_cuit_administrador,id_cuota AS idcuota, SUBSTRING(fecha, 6, 2) AS mesc, SUBSTRING(fecha, 1, 4) AS anioc 
                FROM pagos_ic3
            ) AS sel ON historial_pagosi.id_pago = sel.idp   
             JOIN (
                SELECT id AS idc, id_cliente AS id_clientec 
                FROM cuotas_ic3
            ) AS sel2 ON sel.idcuota = sel2.idc 
             JOIN (
                SELECT id AS idcli, cuil_cuit AS cuil_cuitc, Nombre 
                FROM clientes
            ) AS sel3 ON sel2.id_clientec = sel3.idcli  
            JOIN (
                SELECT cuil_cuit AS cuil_cuitadmin, nombre as nombreadmin 
                FROM users 
            ) AS sel4 ON sel.cuil_cuit_administrador = sel4.cuil_cuitadmin    
            AND zona = "IC3"
            AND sel.anioc = ? 
            AND sel.mesc = ?
        `, [anio, mesConCero]);

        const pagosUnidos = [...pagos1, ...pagos2];


        res.json(pagosUnidos);
    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});



////////rechazar 
router.post("/rechazarr", isLoggedInn2, async (req, res) => {
    const { id, detalle, accion } = req.body

    auxi = await pool.query('select *  from pagos where id=?', [id]);
    cuil_cuit = auxi[0]['cuil_cuit']


    switch (accion) {
        case 'rechazar':
            estado = 'averificarnivel3'
            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1



            break;
        case 'solicitar_doc':
            estado = 'ajustificar'
            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor2
            const update2 = {
                leida: "No",
                cuil_cuit: cuil_cuit,
                id_referencia: id,
                descripcion: detalle,
                asunto: 'Solicitud de documentacion'
            }



            await pool.query('INSERT INTO notificaciones set ?', [update2]);
            break

        case 'rechazardefinitivo':

            estado = 'Rechazado'
            //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor2
            const update3 = {
                leida: "No",
                cuil_cuit: cuil_cuit,
                id_referencia: id,
                descripcion: detalle,
                asunto: 'Pago Rechazado'
            }



            await pool.query('INSERT INTO notificaciones set ?', [update3]);
            break
    }


    const update = {
        estado

    }

    try {
        await pool.query('UPDATE pagos set  ? WHERE id = ?', [update, id])
        const aux = await pool.query('select * from  pagos  WHERE id = ?', [id])
        cuil_cuit = aux[0]['cuil_cuit']

    } catch (error) {
       // console.log(error)
        res.send('algo salio mal')
    }

    res.send('Todo en orden')


})

////Rechazar niv 3
router.post("/rechazararpagoniv3", isLoggedInn2, async (req, res) => {
    const { id, detalle, tipo } = req.body;

    let auxi;
    try {
        auxi = await pool.query('SELECT * FROM historial_pagosi WHERE id = ?', [id]);
    } catch (error) {
        console.error("Error fetching data: ", error);
        return res.status(500).send('Error fetching data');
    }

    const cuil_cuit = auxi[0]['cuil_cuit'];

    switch (tipo) {
        case 'Inusual':
            proceso = 'Inusual';
            break;
        case 'Sospechoso':
            proceso = 'declaradosospechoso';

            const update2 = {
                leida: "No",
                cuil_cuit: cuil_cuit,
                id_referencia: id,
                descripcion: 'El pago ha sido rechazado',
                asunto: 'Pago'
            };
            try {
                await pool.query('INSERT INTO notificaciones SET ?', [update2]);
            } catch (error) {
                console.error("Error inserting notification: ", error);
            }

            const email = 'pipao.pipo@gmail.com';
            const asunto = 'Pago Sospechoso';
            const encabezado = 'Pago Sospechoso al fideicomiso';
            const mensaje = `Recibimos un pago del cuil: ${cuil_cuit} de un monto de ${auxi[0]['monto']} Pesos<br/> Detalle: ${detalle}`;

            const ubicacion = auxi[0]['ubicacion'];
            //const traerub = await s3Controller.traerImagen(ubicacion);

            const descargaraqui = `<a href="${ubicacion}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">Descargar aquí el comprobante</a>`;

            enviodemail.enviarmail.enviarmailsospechoso(email, asunto, encabezado, mensaje, ubicacion);
            break;
    }

    const update = {
        proceso: tipo,
        detalle: detalle
    };

    try {
        await pool.query('UPDATE historial_pagosi SET ? WHERE id = ?', [update, id]);
    } catch (error) {
        console.error("Error updating data: ", error);
        return res.status(500).send('Error updating data');
    }

    res.json('Clasificado');
});




///////


router.post("/pagarnivel4lote", async (req, res) => {
    const { cantidad, fecha, id, cuil_cuit } = req.body
    try {


        auxiliarfecha = fecha.split("-");
        fechapago = auxiliarfecha[2] + "-" + auxiliarfecha[1] + "-" + auxiliarfecha[0]
        fechapago = fechapago.replace('-', '/')
        fechapago = fechapago.replace('-', '/')
        mes = parseInt(fecha.substring(5, 7))
        anio = parseInt(fecha.substring(0, 4))
    


        let au = await pool.query('select * from lotes where id = ? ', [id]) //objeto cuota

        let cuota = await pool.query('select * from cuotas where id_lote = ?  and pago =0', [id]) //objeto cuota
        if (cuota.length==0){
            cuota = await pool.query('select * from cuotas where id_lote = ?  and pago is null', [id]) //objeto cuota
        }
        const id_lote = id
        let nr = parseInt(cuota[0]['nro_cuota'])
        cuota = await pool.query('select * from cuotas where id_lote = ? and nro_cuota=?', [id_lote, nr])

        const cantidades_disponibles = await pool.query('select * from cuotas where id_lote = ? ', [id_lote]) //objeto cuota
  
        if (nr+parseInt(cantidad) >cantidades_disponibles.length){
            res.json(['No realizado,la cantidad elegida supera la cantidad disponibles', au[0]['cuil_cuit']])
        }else{
        for (let i = 1; i <= cantidad; i++) {

            cuota = await pool.query('select * from cuotas where id_lote = ? and nro_cuota=?', [id_lote, nr]) //objeto cuota

            /// sumar pagp-- incompleto aun
            const newLink = {
                id_cuota:cuota[0]['id'],
                monto:cuota[0]['Amortizacion'],
                cuil_cuit:cuota[0]['cuil_cuit'],
                mes,
                estado: 'A',
                anio,
                cuil_cuit_administrador: cuil_cuit,
                cuil_cuit_distinto:'No',
                monto_distinto:'No',
                monto_inusual:'No',
                fecha:fechapago


            };

            await pool.query('INSERT INTO pagos SET ?', [newLink]);


            /// recorrer las cuotas y asignar el pago a la amortizacion y saldo real asignar saldo final 

            update = {
                Saldo_real:cuota[0]['saldo_cierre'],
                pago:cuota[0]['Amortizacion'],
               
            }
            await pool.query('UPDATE cuotas set  ? WHERE id = ?', [update, au[0]['cuil_cuit']])





            nr += 1
        }
        res.json(['Realizado', au[0]['cuil_cuit']])

}



    } catch (ex) {
       // console.log(ex)
        res.json(['No realizado', au[0]['cuil_cuit']])
    }
 
})


router.post("/pagarnivel4", async (req, res) => {
    const { cantidad, fecha, id, cuil_cuit } = req.body
    try {
 

        auxiliarfecha = fecha.split("-");
        fechapago = auxiliarfecha[2] + "-" + auxiliarfecha[1] + "-" + auxiliarfecha[0]
        fechapago = fechapago.replace('-', '/')
        fechapago = fechapago.replace('-', '/')
        mes = parseInt(fecha.substring(5, 7))
        anio = parseInt(fecha.substring(0, 4))


        let cuota = await pool.query('select * from cuotas where id = ?', [id]) //objeto cuota
        const id_lote = cuota[0]['id_lote']
        let nr = parseInt(cuota[0]['nro_cuota'])

        const cantidades_disponibles = await pool.query('select * from cuotas where id_lote = ? ', [cuota[0]['id_lote']]) //objeto cuota
 
        if (nr+parseInt(cantidad) >cantidades_disponibles.length){
            res.json(['No realizado,la cantidad elegida supera la cantidad disponibles', cuota[0]['cuil_cuit']])
        }else{
        for (let i = 1; i <= cantidad; i++) {

            cuota = await pool.query('select * from cuotas where id_lote = ? and nro_cuota=?', [id_lote, nr]) //objeto cuota

            /// sumar pagp-- incompleto aun
            const newLink = {
                id_cuota:cuota[0]['id'],
                monto:cuota[0]['Amortizacion'],
                cuil_cuit:cuota[0]['cuil_cuit'],
                mes,
                estado: 'A',
                anio,
                cuil_cuit_administrador: cuil_cuit,
                cuil_cuit_distinto:'No',
                monto_distinto:'No',
                monto_inusual:'No',
                fecha:fechapago


            };

            await pool.query('INSERT INTO pagos SET ?', [newLink]);


            /// recorrer las cuotas y asignar el pago a la amortizacion y saldo real asignar saldo final 

            update = {
                Saldo_real:cuota[0]['saldo_cierre'],
                pago:cuota[0]['Amortizacion'],
               
            }
            await pool.query('UPDATE cuotas set  ? WHERE id = ?', [update, cuota[0]['id']])





            nr += 1
        }
        res.json(['Realizado', cuota[0]['cuil_cuit']])

}



    } catch (ex) {
       // console.log(ex)
        res.json(['No realizado', cuota[0]['cuil_cuit']])
    }
 
})




router.get("/", async (req, res) => {
    const pagos = await pool.query('SELECT * FROM pagos ')
    res.render('pagos/listap', { pagos })
})

router.get('/aprobar/:id', isLoggedIn, async (req, res) => { // pagot es el objeto pago
    const { id } = req.params

    var pagot = await pool.query('select * from pagos where id = ?', [id])

    let auxiliar = pagot[0]["id_cuota"]

    const cuota = await pool.query('select * from cuotas where id = ?', [auxiliar]) //objeto cuota
   


    try {
        if (cuota[0]["nro_cuota"] === 1) {
            var saldo_realc = cuota[0]["Saldo_real"]

        } else {
            const cuotaant = await pool.query("Select * from cuotas where cuil_cuit=? and nro_cuota= ?", [cuota[0]["cuil_cuit"], (cuota[0]["nro_cuota"]) - 1])
       
            saldo_realc = cuotaant[0]["Saldo_real"] + cuota[0]["cuota_con_ajuste"]
            saldo_inicial = cuotaant[0]["Saldo_real"]

        }

    } catch (error) {
       // console.log(error)
        res.redirect('/profile')


    }

    let pago = cuota[0]["pago"] + pagot[0]["monto"]


    // Saldo_real = cuota[0]["saldo_inicial"] -saldo_realc  - pago 
    Saldo_real = saldo_realc - pago


    const update = {
        Saldo_real,
        pago,
        saldo_inicial,

    }

    await pool.query('UPDATE cuotas set  ? WHERE id = ?', [update, cuota[0]["id"]])




    await pool.query('UPDATE pagos set estado = ? WHERE id = ?', ["A", id])
    req.flash('success', 'Guardado correctamente')



    res.redirect('/profile')
})




router.get('/traerpago/:id', isLoggedInn, async (req, res) => {
    const id = req.params.id // requiere el parametro id 
    try {
            const cuota = await pool.query('SELECT *,id_lote FROM pagos join (select cuil_cuit as cuil_cuitcli, nombre as nombrecli from clientes) as selec1 on pagos.cuil_cuit=selec1.cuil_cuitcli join (select id as idcuota, nro_cuota, id_lote from cuotas) as selec2 on pagos.id_cuota=selec2.idcuota WHERE id= ?', [id])

const total = await pool.query('SELECT * FROM cuotas where id_lote=?',[cuota[0]['id_lote']])
  
    res.json([cuota,total.length])

    } catch (error) {
       // console.log(error)
        res.json([])
    }

})

router.get('/traerpagodecuota/:id', isLoggedInn, async (req, res) => {
    const id = req.params.id // requiere el parametro id 
    try {
            const cuota = await pool.query('SELECT * FROM cuotas WHERE id= ?', [id])
         
    const pago = await pool.query('SELECT * FROM pagos WHERE id_cuota= ?', [cuota[0]['id']])
   
    res.json(pago)

    } catch (error) {
       // console.log(error)
        res.json([])
    }

})


router.get('/realizara/:id', isLoggedIn, async (req, res) => {
    const id = req.params.id // requiere el parametro id  c 
    const cuota = await pool.query('SELECT * FROM cuotas WHERE id= ?', [id])

    res.render('pagos/realizara', { cuota })

})
router.get('/realizar', isLoggedIn, async (req, res) => {

    res.render('pagos/realizar')

})

router.get('/pendientes', isLoggedIn, async (req, res) => {
    const pendientes = await pool.query("Select * from pagos where estado = 'P'")
    res.render('pagos/pendientes', { pendientes })

})



router.post('/realizar', async (req, res) => {
    let { monto, id } = req.body;
    const estado = 'A'
    cuota = await pool.query('select * from cuotas WHERE id = ?'[id])
    monto += cuota[0]['monto']

    const newLink = {
        monto,

        estado,


    };
    await pool.query('UPDATE cuotas set ? WHERE id = ?'[newLink, id])


    req.flash('success', 'Guardado correctamente')
    res.redirect(`../links/clientes`);





})









module.exports = router