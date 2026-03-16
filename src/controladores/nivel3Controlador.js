const express = require('express')
const router = express.Router()
const pool = require('../database')
const ponerguion = require('../public/apps/transformarcuit')
const { isLoggedIn, isLoggedInn3 } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const passport = require('passport')
const agregaricc = require('../routes/funciones/agregaricc')


const historialIcc = async (req, res) => {

    const historial = await pool.query('select * from icc_historial')

    res.json(historial)

}

const pagoSi = async (req, res) => {

    const historial = await pool.query('select * from historial_pagosi')

    res.json(historial)

}

const borrarHistorial = async (req, res) => {

    try {
        await pool.query('DELETE FROM icc_historial ')
        res.send('Borrados correctamente')
    } catch (error) {
        //  console.log(error)
        res.send('Error algo sucedió')
    }

}

const asignarClave = async (req, res) => {
    const { cuil_cuit, clave_alta } = req.body;
    try {


        const aux = '%' + cuil_cuit + '%'
        const existe = await pool.query('select * from clientes WHERE cuil_cuit like  ?', [aux])
        if (existe.length > 0) {
            const asignar = {
                clave_alta: clave_alta
            }
            await pool.query('UPDATE clientes set ? WHERE cuil_cuit like  ?', [asignar, aux])
            res.send('Clave asignada')
        } else {
            res.send('Error cliente no existe')
        }




    } catch (error) {

        res.send('Error algo sucedió')
    }

}

const asignarvalormetroc = async (req, res) => {
    const { valor, zona } = req.body;
    try {

        fecha = (new Date(Date.now())).toLocaleDateString()

        val = {
            valormetrocuadrado: valor,
            valormetroparque: zona,
            fecha
        }


        await pool.query('insert into nivel3 set ?', val)
        res.send('Borrados correctamente')

    } catch (error) {
        // console.log(error)
        res.send('Error algo sucedió')
    }

}

const consultarIcc = async (req, res,) => {
    let { ICC, mes, anio, zona } = req.body;
    let rta = {}
    try {
        const existe = await pool.query('select * from icc_historial where mes=? and anio=? and zona =?', [mes, anio, zona])
        if (existe.length > 0) {

            const valor = existe[0]['ICC']

            rta = {
                resp: 'El mes y año ya tiene un ICC asignado y es ' + valor

            }
        } else {

            rta = {
                resp: 'El mes y año no tienen un ICC asignado'

            }


        }

        res.json(rta)
    } catch (error) {

    }


}

const agregarIccgral = async (req, res,) => {
    let { ICC, mes, anio, zona } = req.body;

    let datoss = {
        ICC,
        mes,
        anio,
        zona

    }

    //////////////try


    try {

        exis = await pool.query("select * from icc_historial where mes =? and anio =? and zona=?", [mes, anio, zona])
        if (exis.length > 0) {
            await pool.query('UPDATE icc_historial set ? WHERE id = ?', [datoss, exis[0]["id"]])
        } else {

            await pool.query('insert into icc_historial set?', datoss)
        }
    } catch (error) {
        // console.log(error)
    }



    const todas = await pool.query("select * from cuotas where mes =? and anio =? and zona =?", [mes, anio, zona])

    for (var i = 0; i < todas.length; i++) {

        await agregaricc.calcularicc(todas[i], ICC)
    }

    res.send('Icc asignado con éxito');
}




const enviarmovimiento = async (req, res) => {

let { tipo, categoria, monto, medio_pago, detalle, fecha } = req.body;

let debito = null;
let credito = null;

if (tipo === "egreso") {
    debito = monto;
}

if (tipo === "ingreso") {
    credito = monto;
}

let datoss = {
    fecha: fecha ? fecha : new Date(),
    concepto: categoria || null,
    debito: debito,
    credito: credito,
    descripcion: detalle || null
}

try {

    await pool.query('insert into movimientos set ?', datoss)

    res.send("Movimiento guardado con éxito")

} catch (error) {

    console.log(error)
    res.status(500).send("Error al guardar movimiento")

}

}



const agregarIccGral2 = async (req, res,) => {
    let { ICC, mes, anio, zona } = req.body;



    let datoss = {
        ICC,
        mes,
        anio,
        zona

    }

    //////////////try
    //

    if (zona == 'PIT') {
        console.log('PIT')
        const todasssss = await pool.query("select * from cuotas where mes =? and anio =? and zona =? ", [mes, anio, zona])

        let mensaje = "Estimado/a Cliente:\nLe informamos que ";

        for (let i = 0; i < todasssss.length; i++) {
            let cuiotacon = await agregaricc.calcularicc(todasssss[i], ICC);
            let nroCuota = todasssss[i]['nro_cuota'];
            let mes = todasssss[i]['mes'];
            let anio = todasssss[i]['anio'];
            let monto = cuiotacon.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
        
            // Agregar información de cada cuota al mensaje
            mensaje += `el importe de su cuota N°${nroCuota}, correspondiente al mes de ${mes}/${anio} asciende a ${monto}. `;
        }
        
        // Agregar información final sobre vencimiento (puedes modificar la fecha si es diferente)
        mensaje += "Así mismo, el vencimiento de las mismas es el 10/03/2025.";
        
        console.log(mensaje);

  /////enviodemail.enviarmail.enviarmailsospechoso(email, asunto, encabezado, mensaje, ubicacion);
        
    } else {
       
        const todaxi = await pool.query("select * from cuotas_ic3 where mes =? and anio =?  ", [mes, anio])
        ICC = ICC / 100;
        ICC = parseFloat(ICC.toFixed(3)); // 0.108
        console.log(ICC);
        
        for (let indic = 0; indic < todaxi.length; indic++) {


            try {
              //  ICC = ICC / 100

                if (todaxi[indic]['cuota'] > 1) {

            
                    anteriorr = await pool.query('Select * from cuotas_ic3 where cuota = ? and id_cliente = ?', [todaxi[indic]["cuota"] - 1, todaxi[indic]["id_cliente"]])
                    base_calculoooo = anteriorr[0]['cuota_con_ajuste']


                   // diferencia = - cuota_con_ajuste
                    //console.log(diferencia)
                    console.log(ICC)
                    cuotaparaactualizar = {
                        base_calculo: anteriorr[0]['cuota_con_ajuste'],
                        ajuste: anteriorr[0]['cuota_con_ajuste'] * ICC,////ajuste anteiror* /
                        ajuste_icc: ICC,/// 0.4 
                        cuota_con_ajuste : (parseFloat(anteriorr[0]['cuota_con_ajuste']) * parseFloat(ICC)) + parseFloat(anteriorr[0]['cuota_con_ajuste'])



                    }
                 
                    await pool.query('UPDATE cuotas_ic3 set ? WHERE id = ?', [cuotaparaactualizar, todaxi[indic]["id"]])
                    
                

                }



            } catch (error) {
                console.log(error)


            }



        }
    }
    /////fin act cupta

    try {

        exis = await pool.query("select * from icc_historial where mes =? and anio =? and zona=?", [mes, anio, zona])
        if (exis.length > 0) {
            await pool.query('UPDATE icc_historial set ? WHERE id = ?', [datoss, exis[0]["id"]])
        } else {

            await pool.query('insert into icc_historial set?', datoss)
        }
    } catch (error) {
        // console.log(error)
    }
    res.send('Icc asignado con éxito');
}
module.exports = {
    historialIcc,
    pagoSi,
    borrarHistorial,
    asignarClave,
    asignarvalormetroc,
    consultarIcc,
    agregarIccgral,
    agregarIccGral2,
    enviarmovimiento


}