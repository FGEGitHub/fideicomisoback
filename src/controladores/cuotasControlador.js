const pool = require('../database')
const agregaricc = require('../routes/funciones/agregaricc')



////////////cuotas de un lote, react
const cuotasdeunlote = async (req, res) => {
    const id = req.params.id
    const cuotas = await pool.query('SELECT * FROM  cuotas where id_lote = ? and parcialidad ="Final"', [id])


    res.json(cuotas)

}





//ampliar





const compensar = async (req, res) => {
  try {
    const { id_compensada, id_dedonde } = req.body;

    if (!id_compensada || !id_dedonde) {
      return res.status(400).json("Datos incompletos");
    }

    await pool.query(
      "UPDATE cuotas SET compensada = ? WHERE id = ?",
      [id_compensada, id_dedonde]
    );

    res.json("Cuota compensada correctamente");
  } catch (error) {
    console.error(error);
    res.status(500).json("Error al compensar cuota");
  }
};


const compensaric3 = async (req, res) => {
  try {
    const { id_compensada, id_dedonde } = req.body;

    if (!id_compensada || !id_dedonde) {
      return res.status(400).json("Datos incompletos");
    }

    await pool.query(
      "UPDATE cuotas_ic3 SET compensada = ? WHERE id = ?",
      [id_compensada, id_dedonde]
    );

    res.json("Cuota compensada correctamente");
  } catch (error) {
    console.error(error);
    res.status(500).json("Error al compensar cuota");
  }
};



const borrarpago = async (req, res) => {
    const { id_cuota } = req.body;
    try {

        const cuota = await pool.query(`select * from cuotas where id =?`, [id_cuota])

        const newLink = {
            pago: 0,
            Saldo_real: cuota[0]['saldo_inicial']

        };
        await pool.query('UPDATE cuotas set ? WHERE id= ?', [newLink, id_cuota])
        await pool.query('DELETE FROM pagos WHERE id_cuota = ?', [id_cuota])
        res.json('Realizado')
    } catch (error) {
        //  console.log(error)
        res.json('No realizado')
    }


}

const postadd = async (req, res) => {
    const { saldo_inicial, saldo_cierre, cuil_cuit } = req.body;
    const newLink = {
        saldo_inicial,
        saldo_cierre,
        cuil_cuit
    };

    await pool.query('INSERT INTO cuotas SET ?', [newLink]);

    req.flash('success', 'Guardado correctamente')
    res.redirect('/cuotas');

}







const postaddaut2 = async (req, res) => {
    let { id, porcentaje, cantidad_cuotas, mes, anio, zona, manzana, fraccion, lote, parcela, valordellote, anticipodefinido } = req.body;




    if (cantidad_cuotas == undefined) {
        cantidad_cuotas = 60
    }
    id_lote = id

    const lot = await pool.query('SELECT * from lotes where id= ?', [id])
    cuil_cuit = lot[0]['cuil_cuit']
    lote = lot[0]['lote']
    zona = lot[0]['zona']
    manzana = lot[0]['manzana']
    fraccion = lot[0]['fraccion']
    parcela = lot[0]['parcela']
    superficie = lot[0]['superficie']


    let aux = '%' + cuil_cuit + '%'

    const row = await pool.query('SELECT * from clientes where cuil_cuit like ?', [aux])
    //llega
    try {
        monto_total = 0
        if (valordellote === undefined) {

            if (zona == 'PIT') {
                valormetro = await pool.query('select * from nivel3 where valormetroparque = "PIT" order by id')
            } else {
                valormetro = await pool.query('select * from nivel3 where valormetroparque = "IC3" order by id')
            }

            valor = valormetro[(valormetro.length - 1)]['valormetrocuadrado']


            monto_total = (valor * superficie).toFixed(2)
        } else {
            monto_total = valordellote
        }
        if (porcentaje === undefined) {
            porcentaje = 20
        }



        porcentaje = porcentaje / 100
        anticipo = monto_total * porcentaje



        monto_total = monto_total * (1 - porcentaje)
        anticipolote = {
            anticipo
        }

        if (anticipodefinido != undefined) {
            monto_total = parseFloat(anticipodefinido)
        }

        //llega
        const Amortizacion = (monto_total / cantidad_cuotas);

        let toleranciadec = row[0]['toleranciadec'] + Amortizacion
        let tolerancia = row[0]['ingresos'] * 0.3

        if (tolerancia < toleranciadec) {



            ///////[cuil_cuit,'Error, el cliente no tiene ingresos declarados ']
            rtaa = [cuil_cuit, 'Error, la amortizacion del valor de la cuota  es mayor al 30% de los ingresos declarados']
            res.send(rtaa)


        } else {

            let nro_cuota = 1

            let saldo_inicial = monto_total


            if (row.length > 0) {

                var saldo_cierre = (saldo_inicial - Amortizacion).toFixed(2)

                if (nro_cuota == 1) {
                    Saldo_real = monto_total
                } else {
                    Saldo_real = saldo_inicial
                }

                const id_cliente = row[0].id

                try {

                    let actualizar = {
                        toleranciadec
                    }
                    await pool.query('UPDATE clientes set ? WHERE cuil_cuit like ?', [actualizar, aux])

                    for (let i = 1; i <= cantidad_cuotas; i++) {
                        nro_cuota = i

                        const newLink = {
                            //fecha,
                            mes,
                            anio,
                            nro_cuota,
                            Amortizacion,
                            saldo_inicial,
                            saldo_cierre,
                            cuil_cuit,
                            id_cliente,
                            zona,
                            manzana,
                            fraccion,
                            lote,
                            Saldo_real,
                            parcela,
                            anticipo,
                            id_lote,
                            pago: 0

                        };

                        mes++

                        if (mes > 12) {

                            anio++
                            mes -= 12
                        }

                        await pool.query('INSERT INTO cuotas SET ?', [newLink]);





                        saldo_cierre = (saldo_inicial - Amortizacion).toFixed(2)
                    }

                } catch (error) {
                    // console.log(error)
                    res.send([cuil_cuit, 'Error, algo sucedio'])
                }


                await pool.query('UPDATE lotes set ? WHERE id = ?', [anticipolote, id])

                /////////////////////////////   inicio pruebas

                todass = await pool.query('select * from cuotas where id_lote =? ', [id])
                for (i = 0; i < todass.length; i++) {
                    mess = todass[i]['mes']
                    anioo = todass[i]['anio']
                    exisste = await pool.query('select * from icc_historial where mes = ? and anio = ? and zona =?', [mess, anioo, todass[i]['zona']])
                    if (exisste.length > 0) {
                        ICC = exisste[0]['ICC']


                        await agregaricc.calcularicc(todass[i], ICC)

                    }

                }

                //////////////////////////


                res.send([cuil_cuit, 'Cuotas agregadas con exito'])

            }


            else {
                //    console.log(error)
                res.send([cuil_cuit, 'Error, algo sucedio'])

            }

        }





    } catch (error) {
        //  console.log(error)
        res.send([cuil_cuit, 'Erro, algo sucedio'])

    }



}


///Agregar varias


const addautvarias = async (req, res) => {
    let { cant, porcentaje, cantidad_cuotas, mes, anio, zona, manzana, fraccion, lote, parcela, seleccion } = req.body;

    monto_total = 0


    const lot = await pool.query('SELECT * from lotes where id= ?', [seleccion[0][0]])
    cuil_cuit = lot[0]['cuil_cuit']
    lote = lot[0]['lote']
    zona = lot[0]['zona']
    manzana = lot[0]['manzana']
    fraccion = lot[0]['fraccion']
    parcela = lot[0]['parcela']
    superficie = lot[0]['superficie']

    let aux = '%' + cuil_cuit + '%'
    const row = await pool.query('SELECT * from clientes where cuil_cuit like ?', [aux])

    const id = seleccion[0][0]
    for (i = 0; i < cant; i++) {



        const lot = await pool.query('SELECT * from lotes where id= ?', [seleccion[0][i]])
        superficie = parseFloat(lot[0]['superficie'])
        zona = lot[0]['zona']

        if (zona == 'PIT') {
            valormetro = await pool.query('select * from nivel3 where valormetroparque = "PIT" order by id')
        } else {
            valormetro = await pool.query('select * from nivel3 where valormetroparque = "IC3" order by id')
        }

        valor = parseFloat(valormetro[(valormetro.length - 1)]['valormetrocuadrado'])


        monto_total = (monto_total + parseFloat((valor * superficie)))





    }

    if (cantidad_cuotas == undefined) {
        cantidad_cuotas = 60
    }

    if (porcentaje === undefined) {
        porcentaje = 20
    }

    porcentaje = porcentaje / 100
    anticipo = monto_total * porcentaje

    monto_total = monto_total * (1 - porcentaje)
    anticipolote = {
        anticipo
    }


    //llega
    const Amortizacion = (monto_total / cantidad_cuotas).toFixed(2);

    let toleranciadec = row[0]['toleranciadec'] + Amortizacion
    let tolerancia = row[0]['ingresos'] * 0.3

    if (tolerancia < toleranciadec) {


        ///////[cuil_cuit,'Error, el cliente no tiene ingresos declarados ']
        rtaa = [cuil_cuit, 'Error, la amortizacion del valor de la cuota  es mayor al 30% de los ingresos declarados']
        res.send([cuil_cuit, rtaa])


    }
    let nro_cuota = 1

    let saldo_inicial = monto_total


    if (row.length > 0) {

        var saldo_cierre = (saldo_inicial - Amortizacion).toFixed(2)

        if (nro_cuota == 1) {
            Saldo_real = monto_total
        } else {
            Saldo_real = saldo_inicial
        }

        const id_cliente = row[0].id

        try {

            let actualizar = {
                toleranciadec
            }
            await pool.query('UPDATE clientes set ? WHERE cuil_cuit like ?', [actualizar, aux])

            for (let i = 1; i <= cantidad_cuotas; i++) {
                nro_cuota = i

                const newLink = {
                    //fecha,
                    mes,
                    anio,
                    nro_cuota,
                    Amortizacion,
                    saldo_inicial,
                    saldo_cierre,
                    cuil_cuit,
                    id_cliente,
                    zona,
                    manzana,
                    fraccion,
                    lote,
                    Saldo_real,
                    parcela,
                    anticipo,
                    id_lote: id,
                    pago: 0

                };

                mes++

                if (mes > 12) {

                    anio++
                    mes -= 12
                }

                await pool.query('INSERT INTO cuotas SET ?', [newLink]);





                saldo_cierre = (saldo_inicial - Amortizacion).toFixed(2)
            }

        } catch (error) {
            //  console.log(error)
            rtaa = 'Error, algo sucedio'
            res.send([cuil_cuit, rtaa])
        }


        await pool.query('UPDATE lotes set ? WHERE id = ?', [anticipolote, id])

        /////////////////////////////   inicio pruebas

        todass = await pool.query('select * from cuotas where id_lote =? ', [id])
        for (i = 0; i < todass.length; i++) {
            mess = todass[i]['mes']
            anioo = todass[i]['anio']
            exisste = await pool.query('select * from icc_historial where mes = ? and anio = ? ', [mess, anioo])
            if (exisste.length > 0) {
                ICC = exisste[0]['ICC']


                await agregaricc.calcularicc(todass[i], ICC)

            }

        }

        //////////////////////////


        res.send([cuil_cuit, 'Cuotas agregadas con exito'])

    }


    else {
        //console.log(error)
        res.send([cuil_cuit, 'Error, algo sucedio'])

    }










}





const vercuotas4 = async (req, res) => {
    const id = req.params.id



    let cuotas = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [id])


    res.json(cuotas)
}


const vercuotas2 = async (req, res) => {

    try {
        const id = req.params.id
        const lot = await pool.query('SELECT * FROM lotes WHERE id =  ?', [id])


        let cuotas = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [id])

        if (cuotas.length === 0) {

            cuotas = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [lot[0]['idcuotas']])
        }


        if (cuotas.length > 0) {
            /////////////////
            cuotasss = []
            Amortizacion = parseFloat(cuotas[0]['saldo_inicial']) / cuotas.length
            AmortizacionReal = Amortizacion
            pago = await pool.query('select SUM(monto) from pagos where id_cuota = ?', [cuotas[0]['id']])
            try {
                if (pago[0]['SUM(monto)'] === null) {
                    pag = 0
                } else {
                    pag = parseFloat(pago[0]['SUM(monto)'])
                }

            } catch (error) {
                // console.log(error)
                pag = 0
            }


            diferencia = parseFloat(- parseFloat(Amortizacion.toFixed(2)) + pag)
            saldoinicial = cuotas[0]['saldo_inicial']

            pago = await pool.query('select SUM(monto) from pagos where id_cuota = ?', [cuotas[0]['id']])
            saldo_cierre = parseFloat(cuotas[0]['saldo_inicial']) - parseFloat((Amortizacion).toFixed(2))
            Saldo_real = parseFloat(cuotas[0]['saldo_inicial']) - pag,

                cuota_con_ajuste = parseFloat(Amortizacion)
            nuev = {
                id: cuotas[0]['id'],
                saldo_inicial: cuotas[0]['saldo_inicial'],
                mes: cuotas[0]['mes'],
                anio: cuotas[0]['anio'],
                Amortizacion: (Amortizacion).toFixed(2),
                ICC: cuotas[0]['ICC'],
                Ajuste_ICC: cuotas[0]['Ajuste_ICC'],
                cuota_con_ajuste: (Amortizacion).toFixed(2),
                pago: pago[0]['SUM(monto)'],
                Saldo_real: Saldo_real,
                saldo_cierre: saldo_cierre.toFixed(2),
                parcialidad: cuotas[0]['parcialidad'],
                diferencia: -(Amortizacion).toFixed(2) + pag,

            }

            ///////ACTUALIZACION
            let nuevAct = {

                saldo_inicial: cuotas[0]['saldo_inicial'],
                mes: cuotas[0]['mes'],
                anio: cuotas[0]['anio'],
                Amortizacion: (Amortizacion).toFixed(2),
                ICC: cuotas[0]['ICC'],
                Ajuste_ICC: cuotas[0]['Ajuste_ICC'],
                cuota_con_ajuste: (Amortizacion).toFixed(2),
                pago: pago[0]['SUM(monto)'],
                Saldo_real: Saldo_real,
                saldo_cierre: saldo_cierre.toFixed(2),
                parcialidad: cuotas[0]['parcialidad'],
                diferencia: -(Amortizacion).toFixed(2) + pag,

            }
            //// 
            await pool.query('UPDATE cuotas set ? WHERE id = ?', [nuevAct, cuotas[0]['id']])
            ////
            cuotasss.push(nuev)
            for (i = 1; i < cuotas.length; i++) {
                if (cuotas[i]['parcialidad'] === 'Final') {/////////////////////////////////recorrrido

                    Ajuste_ICC = (cuota_con_ajuste * parseFloat(cuotas[i]['ICC'])).toFixed(2)
                    //////////////
                    cuota_con_ajuste += (cuota_con_ajuste * parseFloat(cuotas[i]['ICC']))
                    ////////                    cuota_con_ajuste += parseFloat(Ajuste_ICC)

                    pago = await pool.query('select SUM(monto) from pagos where id_cuota = ?', [cuotas[i]['id']])
                    try {
                        if (pago[0]['SUM(monto)'] === null) {
                            console.log('entra al try')
                            pag = 0
                        } else {
                            pag = parseFloat(pago[0]['SUM(monto)'])
                        }

                    } catch (error) {
                        //   console.log(error)
                        pag = 0
                    }

                    Saldo_real -= +pag - Ajuste_ICC,


                        saldo_inicial = saldo_cierre.toFixed(2)
                    saldo_cierre -= AmortizacionReal

                    dif = - parseFloat(cuota_con_ajuste) + parseFloat(pag)

                    nuev = {
                        id: cuotas[i]['id'],
                        saldo_inicial: saldo_inicial,
                        mes: cuotas[i]['mes'],//////////realizado
                        anio: cuotas[i]['anio'],//////////realizado
                        Amortizacion: (Amortizacion).toFixed(2),
                        ICC: cuotas[i]['ICC'],///////////realizado
                        Ajuste_ICC: (Ajuste_ICC), ///////////realizado
                        cuota_con_ajuste: cuota_con_ajuste.toFixed(2),///////////realizado
                        pago: pago[0]['SUM(monto)'],//////////realizado
                        Saldo_real: Saldo_real, ////////realizado
                        saldo_cierre: saldo_cierre.toFixed(2),////////realizado
                        parcialidad: cuotas[i]['parcialidad'],
                        diferencia: dif.toFixed(2),/////realizado


                    }
                    nuevAct = {



                        Amortizacion: (Amortizacion).toFixed(2),
                        ICC: cuotas[i]['ICC'],///////////realizado
                        Ajuste_ICC: (Ajuste_ICC), ///////////realizado
                        cuota_con_ajuste: cuota_con_ajuste.toFixed(2),///////////realizado
                        pago: pago[0]['SUM(monto)'],//////////realizado
                        Saldo_real: Saldo_real, ////////realizado
                        saldo_cierre: saldo_cierre.toFixed(2),////////realizado
                        parcialidad: cuotas[i]['parcialidad'],
                        diferencia: dif.toFixed(2),/////realizado


                    }

                    await pool.query('UPDATE cuotas set ? WHERE id = ?', [nuevAct, cuotas[i]['id']])
                } else {
                    nuev = {
                        id: cuotas[i]['id'],
                        saldo_inicial: saldo_cierre,
                        mes: cuotas[i]['mes'],//////////realizado
                        anio: cuotas[i]['anio'],//////////realizado
                        Amortizacion: Amortizacion,//////////realizado
                        ICC: 0,///////////realizado
                        Ajuste_ICC: 0, ///////////realizado
                        cuota_con_ajuste: 0,///////////realizado
                        pago: 0,
                        Saldo_real: 0, ////////realizado
                        saldo_cierre: saldo_cierre,////////realizado
                        parcialidad: cuotas[i]['parcialidad'],
                        diferencia: 0,/////realizado
                    }
                }


                cuotasss.push(nuev)
            }

            res.json(cuotasss)


            //////////////////
            /*  try {
 
 
                 for (i = 0; i < cuotas.length; i++) {
                     diferencia = cuotas[i].pago - cuotas[i].cuota_con_ajuste
                     act = { diferencia }
 
 
                     await pool.query('UPDATE cuotas set ? WHERE id = ?', [act, cuotas[i].id])
                 }
             } catch (error) {
                 console.log(error)
             }
 
 
             let cuotass = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [id])
 
             if (cuotass.length === 0) {
                 cuotass = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [lot[0]['idcuotas']])
             }
             res.json(cuotass) */
            //////////////////

            //res.render('cuotas/listavacia', { auxiliar })

        } else {/* res.render('cuotas/lista', { cuotas })*/ res.json('') }

    } catch (error) {
        console.log(error)
    }

}


//// para react
const lotefuncion2 = async (req, res) => {
    try {
        const id = req.params.id
        const lot = await pool.query('SELECT * FROM lotes WHERE id =  ?', [id])


        let cuotas = await pool.query('SELECT * FROM cuotas left join (select mes as mesi, anio as anioi, alicuota from intereses) as sel on cuotas.mes=sel.mesi and cuotas.anio=sel.anioi WHERE id_lote =  ?', [id])
        ///////////ver si innecesario     
        if (cuotas.length === 0) {

            cuotas = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [lot[0]['id_lote_cuota']])

        }


        if (cuotas.length > 0) {
            /////////////////
            cuotasss = []

            Amortizacion = parseFloat(cuotas[0]['saldo_inicial']) / cuotas.length
            AmortizacionReal = Amortizacion

            if (lot[0]['cuil_cuit'] == '20-22486722-1') {////canavesio
                Amortizacion == 141817.75
            }

            pago = await pool.query('select SUM(monto) from pagos where id_cuota = ?', [cuotas[0]['id']])
            try {
                if (pago[0]['SUM(monto)'] === null) {

                    pag = 0
                } else {
                    pag = parseFloat(pago[0]['SUM(monto)'])
                }

            } catch (error) {
                console.log(error)
                pag = 0
            }

            /////pago = 0 si no tiene   = cantidd si tiene 
            diferencia = parseFloat(- parseFloat(Amortizacion.toFixed(2)) + pag)
            saldoinicial = cuotas[0]['saldo_inicial']

            pago = await pool.query('select SUM(monto) from pagos where id_cuota = ?', [cuotas[0]['id']])
            let comprobante = 'Con comprobante';

            ////verificacion de comporbante
            pagostodos= await pool.query('select * from pagos where id_cuota = ?', [cuotas[0]['id']])
            try {
                for (const pagotd of pagostodos) {
                    if (pagotd.ubicacion == 'sin comprobante') {
                        comprobante = 'Sin comprobante';
                        break; // Ya encontramos uno, no hace falta seguir
                    }
                }
            } catch (error) {

            }
  ////sin verificacion de comporbante
            saldo_cierre = parseFloat(cuotas[0]['saldo_inicial']) - parseFloat((Amortizacion).toFixed(2))
            Saldo_real = parseFloat(cuotas[0]['saldo_inicial']) - pag

            cuota_con_ajuste = parseFloat(Amortizacion)


            ///////ACTUALIZACION
    /*    */     if (cuotas[0].cuil_cuit == "27-04990966-2" || cuotas[0].cuil_cuit == "30-71004175-6") {
                try {
                    console.log('es')
                    let iccmientras = await pool.query('SELECT * FROM icc_historial WHERE mes =  ? and anio=? and zona="PIT"', [cuotas[0]['mes'], cuotas[0]['anio']])
                    Ajuste_ICC = (Amortizacion * parseFloat(iccmientras[0]['ICC'] * 0.01))
                    console.log(Ajuste_ICC)
                    //////////////

                    cuota_con_ajuste += (Amortizacion * parseFloat(iccmientras[0]['ICC'] * 0.01))
                    console.log(cuota_con_ajuste)
                } catch (error) {
                    console.log(error)
                }



            } interes = 0
            /////se comprueba si no pago en completitud y  ya existe un valor en el interes
            if ((pago < cuota_con_ajuste) && (cuotas[0]['alicuota'] != null)) {
                interes = (((parseFloat(cuotas[i]['alicuota']) * 1.5) / 100) * cuota_con_ajuste).toFixed(2)
            }
            nuev = {
                id: cuotas[0]['id'],
                saldo_inicial: cuotas[0]['saldo_inicial'],
                mes: cuotas[0]['mes'],
                anio: cuotas[0]['anio'],
                Amortizacion,
                ICC: cuotas[0]['ICC'],
                Ajuste_ICC: cuotas[0]['Ajuste_ICC'],
                cuota_con_ajuste,
                pago: pago[0]['SUM(monto)'],
                Saldo_real: Saldo_real,
                saldo_cierre: saldo_cierre.toFixed(2),
                parcialidad: cuotas[0]['parcialidad'],
                diferencia: -(Amortizacion).toFixed(2) + pag,
                interes,
                pago_interes: cuotas[0]['pago_interes'],
                cuota_cancelada: cuotas[0]['cuota_cancelada'],
                   compensada: cuotas[0]['compensada'],
                comprobante,

            }
            let nuevAct = {

                saldo_inicial: cuotas[0]['saldo_inicial'],
                mes: cuotas[0]['mes'],
                anio: cuotas[0]['anio'],
                Amortizacion: (Amortizacion).toFixed(2),
                ICC: cuotas[0]['ICC'],
                Ajuste_ICC: cuotas[0]['Ajuste_ICC'],
                cuota_con_ajuste: (Amortizacion).toFixed(2),
                pago: pago[0]['SUM(monto)'],
                Saldo_real: Saldo_real,
                saldo_cierre: saldo_cierre.toFixed(2),
                parcialidad: cuotas[0]['parcialidad'],
                diferencia: -(Amortizacion).toFixed(2) + pag,
                interes,


            }
            //// 
            await pool.query('UPDATE cuotas set ? WHERE id = ?', [nuevAct, cuotas[0]['id']])
            ////
            cuotasss.push(nuev)
            ////// esto si comienza de 0 o no a aplicr el icc  30-71004175-6 promacon  
            // let iniciosies = cuotas[0].cuil_cuit  == "27-04990966-2" || "30-71004175-6"  ? 0 : 1;
            //let finalsies = condicion ? 0 : 1;
            for (i = 1; i < cuotas.length; i++) {

                if (cuotas[i]['parcialidad'] === 'Final') {/////////////////////////////////recorrrido
                    /// si es cuota fija  30-71625099-3
                    if (cuotas[i]['zona'] == "PIT" && cuotas[i]['manzana'] == "10" && cuotas[i]['parcela'] == "4") {

                        if ([2, 13, 25, 37, 49].includes(cuotas[i]['nro_cuota'])) {
                            Ajuste_ICC = (cuota_con_ajuste * 0.025).toFixed(2)
                            console.log(Ajuste_ICC)
                            console.log(cuota_con_ajuste)
                            console.log(cuota_con_ajuste + parseFloat(Ajuste_ICC))


                        } else {
                            Ajuste_ICC = 0
                        }

                        //////////////
                        cuota_con_ajuste += parseFloat(Ajuste_ICC)
                    } else {
                        ////////analizar cuil 30-71119137-9 manzana 8 parcela 5  fuotas fijas
                        if (cuotas[i]['zona'] == "PIT" && cuotas[i]['manzana'] == "8" && cuotas[i]['parcela'] == "5") {
                            Ajuste_ICC = 0
                            cuota_con_ajuste += parseFloat(Ajuste_ICC)

                        } else {///// analizar a gailiard que no se aplico 
                            if (cuotas[i]['cuil_cuit'] == "20-93938615-8" && cuotas[i]['mes'] == "2" && cuotas[i]['anio'] == "2023") {
                                Ajuste_ICC = (parseFloat(125215.62) * parseFloat(cuotas[i]['ICC'])).toFixed(5)
                                //125215,62 base de calculo
                                console.log('Ajuste_ICC', Ajuste_ICC)
                                //////////////
                                cuota_con_ajuste = parseFloat(125215.62) + parseFloat(Ajuste_ICC)
                                console.log('cuota_con_ajuste', cuota_con_ajuste)
                            } else {
                                ///resto de cuotas
                                Ajuste_ICC = (cuota_con_ajuste * parseFloat(cuotas[i]['ICC'])).toFixed(2)
                                //////////////
                                cuota_con_ajuste += (cuota_con_ajuste * parseFloat(cuotas[i]['ICC']))
                            }
                        }

                    }
                    ////

                    ////////                    cuota_con_ajuste += parseFloat(Ajuste_ICC)

                    pago = await pool.query('select SUM(monto) from pagos where id_cuota = ?', [cuotas[i]['id']])

                    try {
                        if (pago[0]['SUM(monto)'] === null) {
                            pag = 0
                        } else {
                            pag = parseFloat(pago[0]['SUM(monto)'])
                        }

                    } catch (error) {
                        console.log(error)
                        pag = 0
                    }
comprobante = 'Con comprobante';
pagostodos= await pool.query('select * from pagos where id_cuota = ?', [cuotas[i]['id']])
            try {
                for (const pagotd of pagostodos) {
                    if (pagotd.ubicacion == 'sin comprobante') {
                        comprobante = 'Sin comprobante';
                        break; // Ya encontramos uno, no hace falta seguir
                    }
                }
            } catch (error) {

            }
                    //   Saldo_real -= +pag - Ajuste_ICC,
                    Saldo_real = parseFloat(cuotas[i - 1]['Saldo_real']) - pag + parseFloat(cuotas[i]['cuota_con_ajuste']) - parseFloat(cuotas[i]['Amortizacion']),


                        saldo_inicial = saldo_cierre.toFixed(2)
                    saldo_cierre -= Amortizacion

                    dif = - parseFloat(cuota_con_ajuste) + parseFloat(pag)

                    interes = 0

                    /////se comprueba si no pago en completitud y  ya existe un valor en el interes
                    if (((pago[0]['SUM(monto)'] + 0.01) < cuota_con_ajuste) && (cuotas[i]['alicuota'] != null)) {
                        interes = (((parseFloat(cuotas[i]['alicuota']) * 1.5) / 100) * cuota_con_ajuste).toFixed(2)
                    }

                    nuev = {
                        id: cuotas[i]['id'],
                        saldo_inicial: saldo_inicial,
                        mes: cuotas[i]['mes'],//////////realizado
                        anio: cuotas[i]['anio'],//////////realizado
                        Amortizacion: (Amortizacion).toFixed(2),
                        ICC: cuotas[i]['ICC'],///////////realizado
                        Ajuste_ICC: (Ajuste_ICC), ///////////realizado
                        cuota_con_ajuste: cuota_con_ajuste.toFixed(2),///////////realizado
                        pago: pago[0]['SUM(monto)'],//////////realizado
                        Saldo_real: Saldo_real, ////////realizado
                        saldo_cierre: saldo_cierre.toFixed(2),////////realizado
                        parcialidad: cuotas[i]['parcialidad'],
                        diferencia: dif.toFixed(2),/////realizado
                        interes,
                        pago_interes: cuotas[i]['pago_interes'],
                        cuota_cancelada: cuotas[i]['cuota_cancelada'],
                         compensada: cuotas[i]['compensada'],
                        comprobante
                    }
                    nuevAct = {



                        Amortizacion: (Amortizacion).toFixed(2),
                        ICC: cuotas[i]['ICC'],///////////realizado
                        Ajuste_ICC: (Ajuste_ICC), ///////////realizado
                        cuota_con_ajuste: cuota_con_ajuste.toFixed(2),///////////realizado
                        pago: pago[0]['SUM(monto)'],//////////realizado
                        Saldo_real: Saldo_real, ////////realizado
                        saldo_cierre: saldo_cierre.toFixed(2),////////realizado
                        parcialidad: cuotas[i]['parcialidad'],
                        diferencia: dif.toFixed(2),/////realizado
                        interes,




                    }


                    //   console.log('si',cuotas[i]['nro_cuota'])
                    await pool.query('UPDATE cuotas set ? WHERE id = ?', [nuevAct, cuotas[i]['id']])

                } else {
                    //  console.log('no',cuotas[i]['nro_cuota'])
                    nuev = {
                        id: cuotas[i]['id'],
                        saldo_inicial: saldo_cierre,
                        mes: cuotas[i]['mes'],//////////realizado
                        anio: cuotas[i]['anio'],//////////realizado
                        Amortizacion: Amortizacion,//////////realizado
                        ICC: 0,///////////realizado
                        Ajuste_ICC: 0, ///////////realizado
                        cuota_con_ajuste: 0,///////////realizado
                        pago: 0,
                        Saldo_real: 0, ////////realizado
                        saldo_cierre: saldo_cierre,////////realizado
                        parcialidad: cuotas[i]['parcialidad'],
                        diferencia: 0,/////realizado,
                        cuota_cancelada: cuotas[i]['cuota_cancelada'],
                        pago_interes: cuotas[i]['pago_interes'],
                         compensada: cuotas[i]['compensada'],
                    }
                }
                cuotasss.push(nuev)


            }

            res.json(cuotasss)


            //////////////////
            /*  try {
 
 
                 for (i = 0; i < cuotas.length; i++) {
                     diferencia = cuotas[i].pago - cuotas[i].cuota_con_ajuste
                     act = { diferencia }
 
 
                     await pool.query('UPDATE cuotas set ? WHERE id = ?', [act, cuotas[i].id])
                 }
             } catch (error) {
                 console.log(error)
             }
 
 
             let cuotass = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [id])
 
             if (cuotass.length === 0) {
                 cuotass = await pool.query('SELECT * FROM cuotas WHERE id_lote =  ?', [lot[0]['idcuotas']])
             }
             res.json(cuotass) */
            //////////////////

            //res.render('cuotas/listavacia', { auxiliar })

        } else {/* res.render('cuotas/lista', { cuotas })*/ res.json('') }

    } catch (error) {
        console.log(error)
    }

}


/// fin para react





////  agregar icc de un lote 
const post_agregaricc = async (req, res,) => {
    let { ICC, id } = req.body;

    const todas = await pool.query("select * from cuotas where id = ?", [id])






    await agregaricc.calcularicc(todas[0], ICC)


    res.send('Icc asignado con éxito');








}


const asignarloteacuotas = async (req, res, next) => {
    const { id, id_origen } = req.body



    datos = { id_lote_cuota: id }
    await pool.query('UPDATE lotes set ? WHERE id = ?', [datos, id_origen])


}


const modificarmontototal = async (req, res, next) => {
    const { montonuevo, id_lote } = req.body

    try {
        await pool.query('UPDATE cuotas set saldo_inicial = ? WHERE id_lote = ? and nro_cuota= 1', [montonuevo, id_lote])
        res.json('realizado')
    } catch (error) {
        // console.log(error)
        res.json('No realizado')
    }


}


const traercuotaselcliente = async (req, res) => {
    const { id } = req.params
    lote = await pool.query('select * from lotes where id = ?', [id])

    todos = await pool.query('select DISTINCT id_lote, zona, manzana, parcela  from cuotas where cuil_cuit = ?', [lote[0]['cuil_cuit']])
    res.json(todos)

}

const listavarios = async (req, res) => {
    const { cuil_cuit } = req.params
    try {

        lotess = await pool.query('select * from lotes where cuil_cuit = ? ', [cuil_cuit])
        let valor = {}
        try {
            valormetro = await pool.query('select * from nivel3 where valormetroparque = "PIT" order by id')
            valorparque = valormetro[(valormetro.length - 1)]['valormetrocuadrado']
            valormetro = await pool.query('select * from nivel3 where valormetroparque = "IC3" order by id')
            valorotro = valormetro[(valormetro.length - 1)]['valormetrocuadrado']

            valor = {
                valorparque,
                valorotro
            }
        } catch (error) {

        }


        res.json([lotess, valor])
    } catch (error) {
        res.send('Error algo sucedio')
    }




}

const deletes = async (req, res) => {
    const { id } = req.params
    try {

        await pool.query('DELETE FROM cuotas WHERE id = ?', [id])
        res.send('Cuota eliminada')
    } catch (error) {
        res.send('Error algo sucedio')
    }




}

const postcuotas = async (req, res, next) => {
    const { id } = req.body
    const rows = await pool.query('SELECT * FROM cuotas WHERE id_cliente = ?', [id])
    cartodas
    if (rows.length > 0) {
        res.redirect(`../cuotas/${id}`)


    } else { res.redirect('clientes') }

}





const cancelarlote = async (req, res, next) => {
    const { mes, anio, id_lote } = req.body
    console.log(mes, anio, id_lote)
    try {
        const cuotaacancelar = await pool.query('select * from cuotas where mes=? and  anio=? and id_lote=? ', [mes, anio, id_lote])

        if (cuotaacancelar.length > 0) {
            await pool.query('update cuotas  set cuota_cancelada=? where id_lote=? ', [cuotaacancelar[0]['id'], id_lote])



            if (monto_inusual == 'Si') {

                const newLink2 = {
                    id_cuota,
                    monto,
                    cuil_cuit,
                    mes,
                    id_pago: result.insertId,
                    estado: estado,
                    anio,
                    zona: "Otra",
                    proceso: "averificarnivel3",
                    cuil_cuit_administrador,
                    ubicacion: filename,///////////aca ver el problema
                    fecha

                };
                await pool.query('INSERT INTO historial_pagosi SET ?', [newLink2]);

            }
            res.json('Realizado')
        } else {
            res.json('Cuota noe xiste ')
        }
    } catch (error) {
        console.log(error)
        res.json('No realizado')
    }

    // cuota_cancelada



}

const actualizarcuota = async (req, res, next) => {
    const { saldo_inicial, cuota_con_ajuste, Saldo_real, Ajuste_ICC, id } = req.body

    const act = {
        cuota_con_ajuste,
        Ajuste_ICC
    }
    await pool.query('UPDATE cuotas set ? WHERE id = ?', [act, id])


}
const borrartodas = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM cuotas WHERE id_lote = ?', [id])
        lote = await pool.query('select * FROM lotes WHERE id = ?', [id])

        cuil_cuit = lote[0]['cuil_cuit']
        link = {
            toleranciadec: 0
        }

        await pool.query('UPDATE clientes set ? WHERE cuil_cuit = ?', [link, cuil_cuit])

        res.send('Borradas correctamente')
    } catch (error) {
        //console.log(error)
        res.send('Error algo sucedió')
    }



}

const ief = async (req, res) => {
    const id = req.params
    idaux = id.id


    let lote = await pool.query('select * from lotes where id = ? ', [idaux])

    let cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [idaux]))[0]['count(*)']
    // console.log(cantidad)    cantidad de liquidadas y vencidas
    if (cantidad === 0) {
        console.log(lote)
        idaux = lote[0]['idcuotas']
        cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [idaux]))[0]['count(*)']
    }


    let devengado = ((await pool.query('select sum(cuota_con_ajuste) from cuotas where id_lote = ? and parcialidad = "final"', [idaux]))[0]['sum(cuota_con_ajuste)'])
    // console.log(devengado)

    let abonado = (await pool.query('select sum(pagos.monto)  from cuotas join pagos on cuotas.id = pagos.id_cuota and pagos.estado = "A" where id_lote = ? and parcialidad = "final"', [idaux]))[0]['sum(pagos.monto)']


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
            'datoa': 'Cantidad de cuotas a Vencer',
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
        const respuesta = [deuda_exigible, cuotas_pendientes]


        res.json(respuesta)
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
            //    console.log(error)
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
            const cantidad2 = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "Original"', [idaux]))[0]['count(*)']

            const Amortizacion = (await pool.query('select * from cuotas where id_lote = ? ', [idaux]))[0]['Amortizacion']

            let capital = (await pool.query('select sum(Amortizacion ) from cuotas where id_lote = ? and parcialidad = "Original"', [idaux]))[0]['sum(Amortizacion )']



            try {
                capital = capital.toFixed(2)
            } catch (error) {

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
            const respuesta = [deuda_exigible, cuotas_pendientes]


            res.json(respuesta)

        } catch (error) {

        }




    }



}


const ief2 = async (req, res) => {
    const id = req.params
    idaux = id.id


    let lote = await pool.query('select * from lotes where id = ? ', [idaux])
    let cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [idaux]))[0]['count(*)']
    // console.log(cantidad)    cantidad de liquidadas y vencidas
    if (cantidad === 0) {
        console.log(lote)
        idaux = lote[0]['idcuotas']
        cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [idaux]))[0]['count(*)']
    }


    let devengado = ((await pool.query('select * from cuotas where id_lote = ?', [idaux]))[0]['saldo_inicial'])

    let abonado = (await pool.query('select sum(pagos.monto)  from cuotas join pagos on cuotas.id = pagos.id_cuota and pagos.estado = "A" where id_lote = ? and parcialidad = "final"', [idaux]))[0]['sum(pagos.monto)']


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
        const respuesta = [deuda_exigible, cuotas_pendientes]


        res.json(respuesta)
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
            //   console.log(error)
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
            const cantidad2 = (await pool.query('select count(*) from cuotas where id_lote = ? and pago = 0', [idaux]))[0]['count(*)']

            const Amortizacion = (await pool.query('select * from cuotas where id_lote = ? ', [idaux]))[0]['Amortizacion']

            let capital = (await pool.query('select sum(Amortizacion ) from cuotas where id_lote = ? and pago = 0', [idaux]))[0]['sum(Amortizacion )']



            try {
                capital = capital.toFixed(2)
            } catch (error) {

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
            const respuesta = [deuda_exigible, cuotas_pendientes]


            res.json(respuesta)

        } catch (error) {

        }




    }



}




const iefgralleg = async (req, res) => {
    const id = req.params
    idaux = id.id

    ///selecciona el lote correspondiente 
    ////// cambiar a todos los lotes con ref legales

    let lote = await pool.query('select * from lotes where zona="Legales" ')
    let cantidad = 0
    let devengado = 0
    let abonado = 0
    let cantidad2 = 0
    let capital = 0
    let pagada = 0
    for (l in lote) {
        try {


            let cantida = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [lote[l]['id']]))[0]['count(*)']

            let devengad = ((await pool.query('select * from cuotas where id_lote = ?', [lote[l]['id']]))[0]['saldo_inicial'])
            let abonad = (await pool.query('select sum(pago)  from cuotas where id_lote = ? ', [lote[l]['id']]))[0]['sum(pago)']

            cantida2 = (await pool.query('select count(*) from cuotas where id_lote = ? and (pago = 0 or pago is null)', [lote[l]['id']]))[0]['count(*)']
            capita = (await pool.query('select sum(Amortizacion ) from cuotas where id_lote = ? and pago = 0', [lote[l]['id']]))[0]['sum(Amortizacion )']

            pagad = (await pool.query('select count(*) from cuotas where id_lote = ? and pago != 0 and pago is not null', [lote[l]['id']]))[0]['count(*)']
            pagada += pagad
            devengado += devengad
            abonado += abonad
            cantidad += cantida


            cantidad2 += cantida2
            capital += capita
        } catch (error) {
            //console.log(error)
        }

    }


    if (cantidad === 0) {

        idaux = lote[0]['idcuotas']
        cantidad = (await pool.query('select count(*) from cuotas where id_lote = ? and parcialidad = "final"', [idaux]))[0]['count(*)']
    }

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
        const respuesta = [deuda_exigible, cuotas_pendientes]


        res.json(respuesta)
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
            'datoa': 'Cantidad de cuotas a pagar',
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





            const Amortizacion = 0 //(await pool.query('select * from cuotas where id_lote = ? ', [idaux]))[0]['Amortizacion']





            try {
                capital = capital.toFixed(2)
            } catch (error) {

            }

            const dato5 = {
                'datoa': 'Cantidad de cuotas por cobrar',
                'datob': cantidad2
            }
            const dato6 = {
                'datoa': 'Cantidad pagadas',
                'datob': pagada
            }
            const dato7 = {
                'datoa': 'Saldo de capital a vencer',
                'datob': capital
            }
            const cuotas_pendientes = [dato5, dato6, dato7]
            const respuesta = [deuda_exigible, cuotas_pendientes]

            // console.log('Respuesta'+respuesta)
            res.json(respuesta)

        } catch (error) {
            //console.log(error)
        }




    }



}


const traercuota = async (req, res) => {
    const { id } = req.params;

    try {
        cuota = await pool.query('select * from cuotas where id = ?', [id])


        res.json(cuota)
    } catch (error) {
        //  console.log(error)
    }
}


const traercuotasdisponiblesporlote = async (req, res) => {
    const { id } = req.params;


    try {



        todas = await pool.query('select * from cuotas where id_lote = ? ', [id])

        res.json(todas)
    } catch (error) {
        //console.log(error)
        res.json([{ Amortizacion: 0 }])
    }

}

const traercuotasfinales = async (req, res) => {
    const { id } = req.params;

    try {
        cuota = await pool.query('select * from cuotas where id = ?', [id])

        todas = await pool.query('select * from cuotas where id_lote = ? and parcialidad = "final"', [cuota[0]['id_lote']])
        res.json(todas)
    } catch (error) {
        //console.log(error)
        res.json([{ Amortizacion: 0 }])
    }
}


const agregarcuotasleg = async (req, res) => {
    var { id, monto_total, cantidad_cuotas, mes, anio, Amortizacion, cambiarmonto } = req.body;
    const lot = await pool.query('SELECT * from lotes where id= ?', [id])
    cuil_cuit = lot[0]['cuil_cuit']

    let aux = '%' + cuil_cuit + '%'

    const row = await pool.query('SELECT * from clientes where cuil_cuit like ?', [aux])
    //llega
    try {
        //llega

        if (!cambiarmonto) {
            Amortizacion = parseFloat(monto_total) / parseFloat(cantidad_cuotas);
        }


        let nro_cuota = 1
        let saldo_inicial = parseFloat(monto_total)

        let saldo_cierre = parseFloat(saldo_inicial) - Amortizacion
        Saldo_real = saldo_inicial
        cuota_con_ajuste = Amortizacion
        //  const Saldo_real = saldo_inicial
        const id_cliente = row[0].id

        try {


            for (let i = 1; i <= cantidad_cuotas; i++) {
                nro_cuota = i
                const newLink = {
                    //fecha,
                    mes,
                    anio,
                    nro_cuota,
                    Amortizacion,
                    saldo_inicial,
                    saldo_cierre,
                    cuil_cuit,
                    Saldo_real,
                    cuota_con_ajuste,
                    id_cliente,
                    zona: "Legales",
                    id_lote: id,
                    parcialidad: "Final"

                };
                mes++

                if (mes > 12) {

                    anio++
                    mes -= 12
                }
                await pool.query('INSERT INTO cuotas SET ?', [newLink]);



                saldo_inicial -= Amortizacion
                saldo_cierre = saldo_inicial - Amortizacion
            }

        } catch (error) {
            //console.log(error)
        }

        res.json([cuil_cuit, 'Guardado correctamente'])










    } catch (error) {
        //   console.log(error)
        res.json([cuil_cuit, 'Error, algo sucedio'])

    }


}



module.exports = {
    vercuotas2,
    agregarcuotasleg,
    traercuotasfinales,
    traercuota,
    ief,
    borrartodas,
    actualizarcuota,
    postcuotas,
    deletes,
    listavarios,
    traercuotaselcliente,
    modificarmontototal,
    asignarloteacuotas,

    postadd,
    postaddaut2,
    cancelarlote,
    post_agregaricc,
    lotefuncion2,
    cuotasdeunlote,
    addautvarias,
    vercuotas4,
    ief2,
    borrarpago,
    traercuotasdisponiblesporlote,
    iefgralleg,
    compensar,
    compensaric3

}