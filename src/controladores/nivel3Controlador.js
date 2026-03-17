const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isLoggedInn3 } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const passport = require('passport')
const agregaricc = require('../routes/funciones/agregaricc')
function analizarDescripcion(texto){

let cuit = null;
let razon_social = null;
let concepto = null;

if(!texto) return {cuit,razon_social,concepto};

// detectar CUIT (11 números)
const cuitMatch = texto.match(/\b\d{11}\b/);

if(cuitMatch){

cuit = cuitMatch[0];

// separar lo que viene después del CUIT
const partes = texto.split(cuit);

if(partes[1]){
razon_social = partes[1].trim();
}

}

// detectar concepto
if(texto.includes("RECIBISTE UNA TRANSFERENCIA"))
concepto = "Transferencia recibida";

else if(texto.includes("TRANSF CASH OUT"))
concepto = "Transferencia recibida";

else if(texto.includes("DB TRF TERCEROS"))
concepto = "Pago a proveedor";

else if(texto.includes("RETENCION ING. BRUTOS"))
concepto = "Impuestos - DGR";

else if(texto.includes("25413"))
concepto = "Impuestos - AFIP";

else if(texto.includes("COMISION TRANSFERENCIA"))
concepto = "Comisiones bancarias";

else if(texto.includes("DEBITO FISCAL IVA"))
concepto = "Impuestos IVA";

else
concepto = "Otros movimientos";

return {cuit,razon_social,concepto};

}

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

const traermovimientos = async (req, res) => {
  try {

    const movimientos = await pool.query(
      `SELECT 
        id,
        fecha,
        debito,
        credito,
        descripcion,
        cuil_cuit,
        nombre_razon,
        concepto
      FROM movimientos
      ORDER BY fecha ASC`
    );

    res.json(movimientos);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al traer movimientos"
    });
  }
};

const subirexceldemovimientos = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No se envió archivo" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log("Cantidad de filas:", data.length);

    let insertados = 0;
    let duplicados = 0;

    const filasError = [];
    const filasDuplicadas = [];
    const filasIgnoradas = [];

    for (const fila of data) {
      try {

        // =========================
        // 📝 DESCRIPCIÓN (primero así lo usamos en todo)
        // =========================
        const descripcion = fila["DESCRIPCION"] || "Sin descripción";
        const descripcionCorta = descripcion.slice(0, 100);

        // =========================
        // 📅 PROCESAR FECHA
        // =========================
        let fecha = fila["FECHA"];

        if (!fecha) {
          filasIgnoradas.push({
            motivo: "Fecha vacía",
            descripcion: descripcionCorta,
            fila
          });
          continue;
        }

        if (typeof fecha === "number") {
          const fechaJS = new Date((fecha - 25569) * 86400 * 1000);
          fecha = fechaJS.toISOString().split("T")[0];
        } else if (typeof fecha === "string") {
          fecha = fecha.trim();
        } else {
          filasIgnoradas.push({
            motivo: "Formato fecha inválido",
            descripcion: descripcionCorta,
            fila
          });
          continue;
        }

        // =========================
        // 🔍 ANALISIS
        // =========================
        const { cuit, razon_social, concepto } = analizarDescripcion(descripcion);

        // =========================
        // 💰 MONTOS
        // =========================
        let debito = fila["DEBITO EN $"] || 0;
        let credito = fila["CREDITO EN $"] || 0;

        debito = debito.toString().replace(/\./g, "").replace(",", ".");
        credito = credito.toString().replace(/\./g, "").replace(",", ".");

        debito = parseFloat(debito) || 0;
        credito = parseFloat(credito) || 0;

        if (debito === 0 && credito === 0) {
          filasIgnoradas.push({
            motivo: "Sin monto",
            descripcion: descripcionCorta,
            fila
          });
          continue;
        }

        // =========================
        // 🔁 DUPLICADOS
        // =========================
        const existe = await pool.query(
          `SELECT id FROM movimientos 
           WHERE fecha = ? AND debito = ? AND credito = ?
           LIMIT 1`,
          [fecha, debito, credito]
        );

        if (existe.length > 0) {
          duplicados++;
          filasDuplicadas.push({
            descripcion: descripcionCorta,
            fila
          });
          continue;
        }

        // =========================
        // 💾 INSERTAR
        // =========================
        await pool.query(
          `INSERT INTO movimientos
           (fecha, debito, credito, descripcion, cuil_cuit, nombre_razon, concepto)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [fecha, debito, credito, descripcion, cuit, razon_social, concepto]
        );

        insertados++;

      } catch (errFila) {
        filasError.push({
          error: errFila.message,
          descripcion: (fila["DESCRIPCION"] || "Sin descripción").slice(0, 100),
          fila
        });
      }
    }

    res.json({
      mensaje: "Importación finalizada",
      filas: data.length,
      insertados,
      duplicados,
      errores: filasError.length,
      ignoradas: filasIgnoradas.length,
      detalle: {
        errores: filasError,
        duplicadas: filasDuplicadas,
        ignoradas: filasIgnoradas
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando Excel" });
  }
};


module.exports = {
    subirexceldemovimientos,
    historialIcc,
    pagoSi,
    borrarHistorial,
    asignarClave,
    asignarvalormetroc,
    consultarIcc,
    agregarIccgral,
    agregarIccGral2,
    enviarmovimiento,
traermovimientos

}