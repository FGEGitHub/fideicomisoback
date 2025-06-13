const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedInn2, isLoggedInn } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const { loteCliente, loteCliente2, listadeTodos, listadeLotes, nuevolote, lista2, traerlotesleg, nuevamanzana, traermanzanas, modificarlote } = require('../controladores/lotesControlador')

function geoJsonToWKT(coords) {
  // Si es POLYGON
  if (
    Array.isArray(coords) &&
    Array.isArray(coords[0]) &&
    Array.isArray(coords[0][0]) &&
    typeof coords[0][0][0] === 'number'
  ) {
    const rings = coords
      .map(
        ring => `(${ring.map(pair => pair.join(' ')).join(', ')})`
      )
      .join(', ');
    return `POLYGON(${rings})`;
  }

  // Si es MULTIPOLYGON
  if (
    Array.isArray(coords) &&
    Array.isArray(coords[0]) &&
    Array.isArray(coords[0][0]) &&
    Array.isArray(coords[0][0][0])
  ) {
    const polygons = coords
      .map(
        polygon =>
          `(${polygon
            .map(ring => `(${ring.map(pair => pair.join(' ')).join(', ')})`)
            .join(', ')})`
      )
      .join(', ');
    return `MULTIPOLYGON(${polygons})`;
  }

  throw new Error('Formato de coordenadas no válido para WKT');
}



router.get('/lotescliente/:cuil_cuit', /* isLoggedInn2, */ loteCliente)


router.post('/desasignarlote/:id', isLoggedInn2,)


///////

router.get('/lotescliente2/:cuil_cuit', isLoggedInn2, loteCliente2)


//////


//LISTA DE LOTES 
router.get('/listadetodos', isLoggedInn2, listadeTodos)


////
router.get('/listausur', isLoggedInn2, async (req, res) => {
    
    const lotes = await pool.query('select * from lotes_gral')
    
    res.json([lotes])

  

})


///lista de legales
router.get('/lista2', isLoggedInn2, lista2)




//filtro solo lotes
router.get('/listadelotes', isLoggedInn2, listadeLotes)

router.post('/nuevamanzana', isLoggedInn, nuevamanzana)

router.post('/nuevolote', isLoggedInn, nuevolote)

router.post('/modificarlote', isLoggedInn, modificarlote)



router.get('/traerlotesleg', isLoggedInn2, traerlotesleg)

router.get('/traermanzanas', isLoggedInn2, traermanzanas)

router.get('/desasignarlote', isLoggedInn2,)




router.post('/determinarposecion', async (req, res) => {
    const { posecion_lote, mapa1 } = req.body
    const asignar = { posecion_lote }
    try {
        await pool.query('UPDATE lotes set ? WHERE mapa1=?', [asignar, mapa1])

    } catch (error) {
        //console.log(error)
        res.json('error ')
    }
    res.json('Actualizado')
})
router.post('/determinarmapa1', async (req, res) => {
    const { manzana, lote, mapa1 } = req.body
    const asignar = { mapa1 }
    try {
        await pool.query('UPDATE lotes set ? WHERE zona ="IC3" and manzana=? and lote=?', [asignar, manzana, lote])

    } catch (error) {
       /// console.log(error)
        res.json('error ')
    }
    res.json('Actualizado')
})
router.post('/determinarmapa2', async (req, res) => {
    const { manzana, parcela, mapa1 } = req.body

    const asignar = { mapa2: mapa1 }
    try {
        await pool.query('UPDATE lotes set ? WHERE zona ="PIT" and manzana=? and parcela=?', [asignar, manzana, parcela])

    } catch (error) {
       // console.log(error)
        res.json('error ')
    }
    res.json('Actualizado')
})


router.post('/determinarmapatodos', async (req, res) => {
    let { mapa, categoria1, categoria2, superficie, perimetro, parcela, mensura } = req.body
    console.log( mapa, categoria1, categoria2, superficie, perimetro, parcela, mensura   )
 
try {
    const existe = await pool.query("select * from lotes_gral where mapa=?",[mapa])

    if(existe.length>0){
        if(categoria1==undefined){
            categoria1=existe[0]["categoria1"]
        }
        if(categoria2==undefined){
            categoria2=existe[0]["categoria2"]
        }
        if(superficie==undefined){
            console.log("nosuperficie")
            superficie=existe[0]["area"]
        }
        if(perimetro==undefined){
            perimetro=existe[0]["perimetro"]
        }
        if(parcela==undefined){
            parcela=existe[0]["parcela"]
        }
        if(mensura==undefined){
            mensura=existe[0]["mensura"]
        }
        const asignar ={  categoria1, categoria2, superficie, perimetro, parcela, mensura}
        await pool.query('UPDATE lotes_gral set ? WHERE mapa=?', [asignar, mapa])

    }else{
        if(categoria1==undefined){
            categoria1="Sin determinar"
        }
        if(categoria2==undefined){
            categoria2="Sin determinar"
        }
        if(superficie==undefined){
            superficie="Sin determinar"
        }
        if(perimetro==undefined){
            perimetro="Sin determinar"
        }
        if(parcela==undefined){
            parcela="Sin determinar"
        }
        if(mensura==undefined){
            mensura="Sin determinar"
        }
        
        await pool.query('insert into lotes_gral set mapa=?, categoria1=?, categoria2=?, superficie=?, perimetro=?, parcela=?, mensura=?', [mapa, categoria1, categoria2, superficie, perimetro, parcela, mensura])

    }
    res.json("sad")
} catch (error) {
    console.log(error)
}
})
router.post('/traersegunmapa1', async (req, res) => {
    const { mapa1 } = req.body


    try {
        datos = await pool.query('select * from lotes where mapa1=?', [mapa1])

        let nombrec = "Sin asignar"
        let cuotas = "Sin asignar"
        let cuotasliq = "Sin asignar"
        respuesta = [[0], [0]]
        enviar = {
            nombrec: "Sin asignar",
            cuotas: "Sin asignar",
            cuotasliq: "Sin asignar",
        }
        try {

            cliente = await pool.query('select * from clientes where cuil_cuit=?', [datos[0]['cuil_cuit']])
            nombrec = cliente[0]['Nombre']
            cuotass = await pool.query('select * from cuotas where id_lote=?', [datos[0]['id']])
            cuotasss = await pool.query('select * from cuotas where id_lote=? and parcialidad="Final"', [datos[0]['id']])
            cuotas = cuotass.length
            cuotasliq = cuotasss.length
            enviar = {
                nombrec,
                cuil_cuit:datos[0]['cuil_cuit'],
                cuotas,
                cuotasliq,
            }
            /////////////

            let lote = await pool.query('select * from lotes where id = ? ', [datos[0]['id']])
            let cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [datos[0]['id']]))[0]['count(*)']
            // console.log(cantidad)    cantidad de liquidadas y vencidas
            if (cantidad === 0) {
                idaux = lote[0]['idcuotas']
                cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [datos[0]['id']]))[0]['count(*)']
            }


            let devengado = ((await pool.query('select * from cuotas where id_lote = ?', [datos[0]['id']]))[0]['saldo_inicial'])
          
            let abonado = (await pool.query('select sum(pagos.monto)  from cuotas join pagos on cuotas.id = pagos.id_cuota and pagos.estado = "A" where id_lote = ? and parcialidad = "final"', [datos[0]['id']]))[0]['sum(pagos.monto)']

          
            exigible = (devengado - abonado).toFixed(2)
            if (cantidad === 0) {
                const dato1 = {
                    'datoa': 'Cantidad de cuotas liquidadas y vencidas',
                    'datob': "No hay cuotas Calculadas"
                }
                const dato2 = {
                    'datoa': 'Monto devengado hasta la cuota',
                    'datob': "No hay cuotas Calculadas"
                }
                const dato3 = {
                    'datoa': 'Monto abonado hasta la cuota',
                    'datob': "No hay cuotas Calculadas"
                }
                const dato4 = {
                    'datoa': 'Deuda Exigible',
                    'datob': "No hay cuotas Calculadas"
                }
                const deuda_exigible = [dato1, dato2, dato3, dato4]
                const dato5 = {
                    'datoa': 'Cantidad de cuotas sin pago',
                    'datob': 'no calculado'
                }
                const dato6 = {
                    'datoa': 'Monto cuota pura',
                    'datob': 'no calculado'
                }
                const dato7 = {
                    'datoa': 'Saldo de capital a vencer',
                    'datob': 'no calculado'
                }

                const cuotas_pendientes = [dato5, dato6, dato7]
                respuesta = [deuda_exigible, cuotas_pendientes]



            } else {
                devengado.toFixed(2)
                //////SI HAY CUOTAS 

                try {
                    devengado = devengado.toFixed(2)
                } catch (error) {
                 //   console.log(error)
                }
                try {
                    abonado = abonado.toFixed(2)
                } catch (error) {
                  //  console.log(error)
                }

                const dato1 = {
                    'datoa': 'Cantidad de cuotas liquidadas y vencidas',
                    'datob': cantidad
                }
                const dato2 = {
                    'datoa': 'Monto devengado hasta la cuota',
                    'datob': devengado
                }
                const dato3 = {
                    'datoa': 'Monto abonado hasta la cuota',
                    'datob': abonado
                }
                const dato4 = {
                    'datoa': 'Deuda Exigible',
                    'datob': exigible
                }
                const deuda_exigible = [dato1, dato2, dato3, dato4]
                try {
                    const cantidad2 = (await pool.query('select count(*) from cuotas where id_lote = ? and pago = 0', [datos[0]['id']]))[0]['count(*)']

                    const Amortizacion = (await pool.query('select * from cuotas where id_lote = ? ', [datos[0]['id']]))[0]['Amortizacion']

                    let capital = (await pool.query('select sum(Amortizacion ) from cuotas where id_lote = ? and pago = 0', [datos[0]['id']]))[0]['sum(Amortizacion )']



                    try {
                        capital = capital.toFixed(2)
                    } catch (error) {
                        //console.log(error)
                    }

                    const dato5 = {
                        'datoa': 'Cantidad de cuotas a Vencer',
                        'datob': cantidad2
                    }
                    const dato6 = {
                        'datoa': 'Monto cuota pura',
                        'datob': Amortizacion
                    }
                    const dato7 = {
                        'datoa': 'Saldo de capital a vencer',
                        'datob': capital
                    }
                    const cuotas_pendientes = [dato5, dato6, dato7]
                    respuesta = [deuda_exigible, cuotas_pendientes]



                } catch (error) {
                  //  console.log(error)
                }

            }



            //////////

        } catch (error) {
          //  console.log(error)
        }


        enviar = {
            cuil_cuit:datos[0]['cuil_cuit'],
            nombrec,
            adrema: datos[0]['adrema'],
            fraccion: datos[0]['fraccion'],
            manzana: datos[0]['manzana'],
            parcela: datos[0]['parcela'],
            adrema: datos[0]['adrema'],
            cant_cuotas: cuotas,
            cuotasliq,

        }




    } catch (error) {
       // console.log(error)

    }
    res.json([enviar, respuesta])
})

router.post('/traersegunmapa2', async (req, res) => {
    const { mapa2 } = req.body


    try {
        datos = await pool.query('select * from lotes where mapa2=?', [mapa2])

        let nombrec = "Sin asignar"
        let cuotas = "Sin asignar"
        let cuotasliq = "Sin asignar"
        respuesta = [[0], [0]]
        enviar = {
            cuil_cuit:datos[0]['cuil_cuit'],
            nombrec: "Sin asignar",
            cuotas: "Sin asignar",
            cuotasliq: "Sin asignar",
        }
        try {
            cliente = await pool.query('select * from clientes where cuil_cuit=?', [datos[0]['cuil_cuit']])

            nombrec = cliente[0]['Nombre']
            cuotass = await pool.query('select * from cuotas where id_lote=?', [datos[0]['id']])
            cuotasss = await pool.query('select * from cuotas where id_lote=? and parcialidad="Final"', [datos[0]['id']])
            cuotas = cuotass.length
            cuotasliq = cuotasss.length
            enviar = {
                nombrec,
                cuotas,
                cuotasliq,
            }
            /////////////


            let lote = await pool.query('select * from lotes where id = ? ', [datos[0]['id']])
            let cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [datos[0]['id']]))[0]['count(*)']
            // console.log(cantidad)    cantidad de liquidadas y vencidas
            if (cantidad === 0) {

                idaux = lote[0]['idcuotas']
                cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [datos[0]['id']]))[0]['count(*)']
            }


            let devengado = ((await pool.query('select * from cuotas where id_lote = ?', [datos[0]['id']]))[0]['saldo_inicial'])
       
            let abonado = (await pool.query('select sum(pagos.monto)  from cuotas join pagos on cuotas.id = pagos.id_cuota and pagos.estado = "A" where id_lote = ? and parcialidad = "final"', [datos[0]['id']]))[0]['sum(pagos.monto)']

          
            exigible = (devengado - abonado).toFixed(2)
            if (cantidad === 0) {
                const dato1 = {
                    'datoa': 'Cantidad de cuotas liquidadas y vencidas',
                    'datob': "No hay cuotas Calculadas"
                }
                const dato2 = {
                    'datoa': 'Monto devengado hasta la cuota',
                    'datob': "No hay cuotas Calculadas"
                }
                const dato3 = {
                    'datoa': 'Monto abonado hasta la cuota',
                    'datob': "No hay cuotas Calculadas"
                }
                const dato4 = {
                    'datoa': 'Deuda Exigible',
                    'datob': "No hay cuotas Calculadas"
                }
                const deuda_exigible = [dato1, dato2, dato3, dato4]
                const dato5 = {
                    'datoa': 'Cantidad de cuotas sin pago',
                    'datob': 'no calculado'
                }
                const dato6 = {
                    'datoa': 'Monto cuota pura',
                    'datob': 'no calculado'
                }
                const dato7 = {
                    'datoa': 'Saldo de capital a vencer',
                    'datob': 'no calculado'
                }

                const cuotas_pendientes = [dato5, dato6, dato7]
                respuesta = [deuda_exigible, cuotas_pendientes]



            } else {
                devengado.toFixed(2)
                //////SI HAY CUOTAS 

                try {
                    devengado = devengado.toFixed(2)
                } catch (error) {
                   // console.log(error)
                }
                try {
                    abonado = abonado.toFixed(2)
                } catch (error) {
                  //  console.log(error)
                }

                const dato1 = {
                    'datoa': 'Cantidad de cuotas liquidadas y vencidas',
                    'datob': cantidad
                }
                const dato2 = {
                    'datoa': 'Monto devengado hasta la cuota',
                    'datob': devengado
                }
                const dato3 = {
                    'datoa': 'Monto abonado hasta la cuota',
                    'datob': abonado
                }
                const dato4 = {
                    'datoa': 'Deuda Exigible',
                    'datob': exigible
                }
                const deuda_exigible = [dato1, dato2, dato3, dato4]
                try {
                    const cantidad2 = (await pool.query('select count(*) from cuotas where id_lote = ? and pago = 0', [datos[0]['id']]))[0]['count(*)']

                    const Amortizacion = (await pool.query('select * from cuotas where id_lote = ? ', [datos[0]['id']]))[0]['Amortizacion']

                    let capital = (await pool.query('select sum(Amortizacion ) from cuotas where id_lote = ? and pago = 0', [datos[0]['id']]))[0]['sum(Amortizacion )']



                    try {
                        capital = capital.toFixed(2)
                    } catch (error) {
                      //  console.log(error)
                    }

                    const dato5 = {
                        'datoa': 'Cantidad de cuotas a Vencer',
                        'datob': cantidad2
                    }
                    const dato6 = {
                        'datoa': 'Monto cuota pura',
                        'datob': Amortizacion
                    }
                    const dato7 = {
                        'datoa': 'Saldo de capital a vencer',
                        'datob': capital
                    }
                    const cuotas_pendientes = [dato5, dato6, dato7]
                    respuesta = [deuda_exigible, cuotas_pendientes]



                } catch (error) {
                 //   console.log(error)
                }

            }



            //////////

        } catch (error) {
          //  console.log(error)
        }


        enviar = {
            cuil_cuit:datos[0]['cuil_cuit'],
            nombrec,
            adrema: datos[0]['adrema'],
            fraccion: datos[0]['fraccion'],
            manzana: datos[0]['manzana'],
            parcela: datos[0]['parcela'],
            adrema: datos[0]['adrema'],
            cant_cuotas: cuotas,
            cuotasliq,

        }




    } catch (error) {
     //   console.log(error)
        enviar = {
            cuil_cuit:"Sin datos cargados",
            nombrec:"Sin datos cargados",
            adrema: "Sin datos cargados",
            fraccion: "Sin datos cargados",
            manzana: "Sin datos cargados",
            parcela: "Sin datos cargados",
            adrema: "Sin datos cargados",
            cant_cuotas: "Sin datos cargados",
            cuotasliq:"Sin datos cargados",

        }

    }

    res.json([enviar, respuesta])
})

router.post('/calcularvalor', async (req, res) => {
    const { zona, manzana, parcela, cuil_cuit, lote } = req.body

    if (zona === 'PIT') {
        valormetro = await pool.query('select * from nivel3 where valormetroparque = "PIT" order by id')
        lotee = await pool.query('select * from lotes where zona = ? and manzana =? and  parcela =? ', [zona, manzana, parcela])
    } else {
        valormetro = await pool.query('select * from nivel3 where valormetroparque != "PIT" order by id')
        lotee = await pool.query('select * from lotes where zona = ? and manzana =? and  lote =? ', [zona, manzana, lote])
    }




    try {
        valor = valormetro[(valormetro.length - 1)]['valormetrocuadrado']

    } catch (error) {

    }

    if (valor != undefined) {

        try {


            let final = lotee[0]['superficie'] * valor
            const anticipo = final * 0.2
            const estado = lotee[0]['estado']

            const nombre = 'Zona: ' + lotee[0]['zona'] + ' Manzana: ' + lotee[0]['manzana'] + ' Parcela: ' + lotee[0]['parcela']
            finalSant = final * 0.8
            const cuotas60 = finalSant / 60

            let puede = true
            let cuotamuygrande = ""


            let lotetieneasignado = ""
            if ((estado != "DISPONIBLE" && "Disponible")) {
                lotetieneasignado = 'El lote no se encuentra disponible'
                puede = false
            }

            const detalle = {
                precio: final.toFixed(2),
                anticipo,
                finalSant,
                superficie: lotee[0]['superficie'],
                nombre: nombre,
                cuotas60: cuotas60.toFixed(2),
                estado: estado,
                cuotamuygrande,
                lotetieneasignado,
                puede,
                valor
            }

            res.json(detalle)
        } catch (error) {
          //  console.log(error)
            res.send('Algo salio mal ')
        }
    } else { res.send('Algo salio mal ') }

})


router.post('/guardarpoligono', async (req, res) => {
  try {
    const { dato1, capa, id_mapa } = req.body;
    console.log(dato1, capa, id_mapa);



    // Consultar si ya existe
    const rows = await pool.query(
      `SELECT * FROM poligonos WHERE capa = ? AND id_mapa = ?`,
      [capa, id_mapa]
    );

    if (rows.length > 0) {
      // Ya existe: actualizar
      await pool.query(
        `UPDATE poligonos SET dato1 = ? WHERE capa = ? AND id_mapa = ?`,
        [dato1, capa, id_mapa]
      );
      res.json({ mensaje: 'Polígono actualizado correctamente' });
    } else {
      // No existe: insertar
      await pool.query(
        `INSERT INTO poligonos (dato1, capa, id_mapa) VALUES (?, ?, ?)`,
        [dato1, capa, id_mapa]
      );
      res.json({ mensaje: 'Polígono guardado correctamente' });
    }
  } catch (error) {
    console.error('Error al guardar polígono:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


router.get('/poligonosguardados', async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM poligonos');
console.log(rows)
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener polígonos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


module.exports = router


