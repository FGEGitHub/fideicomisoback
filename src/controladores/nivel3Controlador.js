const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isLoggedInn3 } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const passport = require('passport')
const agregaricc = require('../routes/funciones/agregaricc')

function limpiarNumero(valor) {
    if (!valor) return 0;

    const limpio = valor
        .toString()
        .trim()
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const num = Number(limpio);

    return Number.isFinite(num) ? num : 0;
}
function extraerCuitYNombre(texto) {

    let cuit = null;
    let razon = null;

    if (!texto) return { cuit, razon };

    // 🔥 NORMALIZAR TEXTO (CLAVE)
    texto = texto
        .toString()
        .normalize("NFKD")
        .replace(/[\u00A0]/g, " ") // espacios raros
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

    // 🔥 BUSCAR CUIT (más flexible)
    const match = texto.match(/(\d{11})/);

    if (!match) {
        return { cuit: null, razon: null };
    }

    cuit = match[1];

    // 🔥 EXTRAER TODO LO QUE VIENE DESPUÉS DEL CUIT
    let index = texto.indexOf(cuit);
    let resto = texto.substring(index + cuit.length);

    // 🔥 LIMPIEZA FUERTE
    resto = resto
        .replace(/^\s*[\|\-:]?\s*/, "") // quita | - :
        .replace(/\s+/g, " ")
        .trim();

    // 🔥 CORTAR SI HAY OTRA COSA RARA
    // (ej: si después aparece otro código)
    const corte = resto.match(/^[A-Z0-9\s\/\.,]+/);
    if (corte) {
        razon = corte[0].trim();
    }

    // evitar basura
    if (!razon || razon.length < 3) razon = null;

    return { cuit, razon };


}

// =========================
// 🔧 ANALISIS COMPLETO
// =========================
function analizarDescripcion(texto, debito = 0, credito = 0) {

    let cuit = null;
    let razon_social = null;
    let concepto = "Otros";
    let tipo_operacion = null;

    let categoria_general = "Otros";
    let subcategoria = "Otros";
    let proyecto = "General";
    let tipo_gasto = null;

    if (!texto) {
        return { cuit, razon_social, concepto, tipo_operacion, categoria_general, subcategoria, proyecto, tipo_gasto };
    }

    texto = texto.toUpperCase();

    // =========================
    // CUIT + NOMBRE
    // =========================
    const datos = extraerCuitYNombre(texto);
    cuit = datos.cuit;
    razon_social = datos.razon || "";

    // =========================
    // TIPO OPERACION
    // =========================
    if (credito > 0) tipo_operacion = "Crédito";
    else if (debito > 0) tipo_operacion = "Débito";

    // =========================
    // PROYECTO
    // =========================
    if (texto.includes("IC3")) proyecto = "IC3";
    else if (texto.includes("IC4")) proyecto = "IC4";
    else if (texto.includes("IB5")) proyecto = "IB5";
    else if (texto.includes("PARQUE")) proyecto = "Parque Industrial";

    // =========================================================
    // 🧠 MOTOR DE REGLAS (ORDEN IMPORTA)
    // =========================================================

    const reglas = [

        // ================= CREDITOS =================
        {
            test: () => tipo_operacion === "Crédito" && texto.includes("TRANSFERENCIA"),
            result: () => ({
                concepto: "Transferencia de fondos",
                categoria_general: "Ingresos",
                subcategoria: "Transferencias"
            })
        },

        {
            test: () => tipo_operacion === "Crédito",
            result: () => ({
                concepto: "Otros Ingresos",
                categoria_general: "Ingresos",
                subcategoria: "Otros"
            })
        },

        // ================= IMPUESTOS =================
        {
            test: () => texto.includes("RETENCION ING. BRUTOS"),
            result: () => ({
                concepto: "Impuestos- DGR",
                categoria_general: "Impuestos",
                subcategoria: "DGR"
            })
        },

        {
            test: () => texto.includes("25413") || texto.includes("IVA"),
            result: () => ({
                concepto: "Impuestos - AFIP",
                categoria_general: "Impuestos",
                subcategoria: "AFIP"
            })
        },

        // ================= BANCARIO =================
        {
            test: () => texto.includes("COMISION"),
            result: () => ({
                concepto: "Gastos y Comisiones Bancarias",
                categoria_general: "Bancarios",
                subcategoria: "Comisiones"
            })
        },

        // ================= TRANSFERENCIAS =================
        {
            test: () => texto.includes("TRF") || texto.includes("TRANSFERENCIA"),
            result: () => ({
                concepto: "Transferencias",
                categoria_general: "Transferencias",
                subcategoria: "Bancarias"
            })
        },

        // ================= HONORARIOS (🔥 NUEVO) =================
        {
            test: () =>
                razon_social.match(/(ABOG|ESTUDIO|CONTADOR|ASESOR|CONSULT|ARQ|ING)/),
            result: () => ({
                concepto: "Honorarios Profesionales",
                categoria_general: "Legales",
                subcategoria: "Honorarios"
            })
        },

        // ================= SEGURIDAD =================
        {
            test: () => razon_social.includes("POLICIA"),
            result: () => ({
                concepto: "Servicio de Seguridad - Adicional de Policias",
                categoria_general: "Seguridad",
                subcategoria: "Policial"
            })
        },

        {
            test: () => razon_social.includes("SEGUR"),
            result: () => ({
                concepto: "Servicios de Seguridad",
                categoria_general: "Seguridad",
                subcategoria: "Privada"
            })
        },

        // ================= COMBUSTIBLE =================
        {
            test: () => texto.includes("COMBUSTIBLE"),
            result: () => ({
                concepto: "Combustibles",
                categoria_general: "Operativos",
                subcategoria: "Combustible"
            })
        },

        // ================= RODADOS =================
        {
            test: () => razon_social.match(/(AUTO|MOTOR|VEHIC|RODAD)/),
            result: () => ({
                concepto: "Reparación y mantenimiento Rodados",
                categoria_general: "Operativos",
                subcategoria: "Vehículos"
            })
        },

        // ================= DEFAULT =================
        {
            test: () => true,
            result: () => ({
                concepto: "Otros Egresos",
                categoria_general: "Otros",
                subcategoria: "Otros"
            })
        }
    ];

    // =========================
    // EJECUTAR REGLAS
    // =========================
    for (const regla of reglas) {
        if (regla.test()) {
            const res = regla.result();

            concepto = res.concepto;
            categoria_general = res.categoria_general;
            subcategoria = res.subcategoria;
            tipo_gasto = tipo_operacion === "Débito" ? "Variable" : null;

            break;
        }
    }

    return {
        cuit,
        razon_social,
        concepto,
        tipo_operacion,
        categoria_general,
        subcategoria,
        proyecto,
        tipo_gasto
    };
}

function parseFecha(fecha) {
    if (!fecha) return null;

    fecha = String(fecha).trim();

    // 📌 Excel número (string o number)
    if (!isNaN(fecha)) {
        const num = Number(fecha);

        if (num > 20000) { // validación básica
            const fechaJS = new Date((num - 25569) * 86400 * 1000);

            const anio = fechaJS.getUTCFullYear();
            const mes = String(fechaJS.getUTCMonth() + 1).padStart(2, "0");
            const dia = String(fechaJS.getUTCDate()).padStart(2, "0");

            return `${anio}-${mes}-${dia}`;
        }
    }

    // 📌 DD/MM/YYYY
    if (fecha.includes("/")) {
        const partes = fecha.split("/");

        if (partes.length === 3) {
            let [dia, mes, anio] = partes;

            // arregla año corto
            if (anio.length === 2) {
                anio = "20" + anio;
            }

            return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        }
    }

    // 📌 YYYY-MM-DD
    if (fecha.includes("-")) {
        const partes = fecha.split("-");

        if (partes[0].length === 4) return fecha;
    }

    return null;
}




function obtenerFechaArgentina() {
    const ahora = new Date();

    // ajustar a UTC-3 manual
    const offsetMs = -3 * 60 * 60 * 1000;
    const fechaArg = new Date(ahora.getTime() + offsetMs);

    const anio = fechaArg.getUTCFullYear();
    const mes = String(fechaArg.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(fechaArg.getUTCDate()).padStart(2, "0");

    const horas = String(fechaArg.getUTCHours()).padStart(2, "0");
    const minutos = String(fechaArg.getUTCMinutes()).padStart(2, "0");
    const segundos = String(fechaArg.getUTCSeconds()).padStart(2, "0");

    return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}


const subirexceldemovimientos = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({ error: "No se envió archivo" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false   // 🔥 ESTO ES CLAVE
        });

        let insertados = 0;
        let duplicados = 0;

        for (const fila of data) {

            const descripcion = fila["DESCRIPCION"] || "";

            if (!descripcion || descripcion.toLowerCase().trim() === "ver") continue;

            /* ---------------- FECHA FIX ---------------- */

            const fechaRaw = String(fila["FECHA"] || "");
            const debitoRaw = String(fila["DEBITO EN $"] || "");
            const creditoRaw = String(fila["CREDITO EN $"] || "");
            const debito = limpiarNumero(debitoRaw);
            const credito = limpiarNumero(creditoRaw);
            const fecha = parseFecha(fechaRaw);
            if (!fecha) continue;

            const fechaCarga = obtenerFechaArgentina();

            /* ---------------- MONTOS ---------------- */


            if (debito === 0 && credito === 0) continue;

            /* ---------------- ANALISIS ---------------- */

            const analisis = analizarDescripcion(descripcion, debito, credito);

            /* ---------------- DUPLICADOS ---------------- */

            const existe = await pool.query(
                `SELECT id FROM movimientos 
                 WHERE fecha = ? AND debito = ? AND credito = ? AND descripcion = ?
                 LIMIT 1`,
                [fecha, debito, credito, descripcion]
            );

            if (existe.length > 0) {
                duplicados++;
                continue;
            }

            /* ---------------- INSERT ---------------- */

            await pool.query(
                `INSERT INTO movimientos
                (fecha, fechacarga, debito, credito, descripcion, cuil_cuit, nombre_razon, concepto, tipo_operacion, categoria_general, subcategoria, proyecto, tipo_gasto)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    fecha,
                    fechaCarga,
                    debito,
                    credito,
                    descripcion,
                    analisis.cuit,
                    analisis.razon_social,
                    analisis.concepto,
                    analisis.tipo_operacion,
                    analisis.categoria_general,
                    analisis.subcategoria,
                    analisis.proyecto,
                    analisis.tipo_gasto
                ]
            );

            insertados++;
        }

        res.json({
            mensaje: "Importación finalizada",
            total: data.length,
            insertados,
            duplicados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error procesando Excel" });
    }
};


const mofificarmconcepto = async (req, res) => {
    try {
        const { id, concepto } = req.body;
        console.log(id, concepto)
        // 🔴 Validaciones básicas
        if (!id) {
            return res.status(400).json({ error: "Falta el ID" });
        }

        if (!concepto) {
            return res.status(400).json({ error: "Falta el concepto" });
        }

        // 🔍 Verificar que exista
        const existe = await pool.query(
            "SELECT id FROM movimientos WHERE id = ? LIMIT 1",
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({ error: "Movimiento no encontrado" });
        }

        // 💾 Update
        await pool.query(
            "UPDATE movimientos SET concepto = ? WHERE id = ?",
            [concepto, id]
        );

        res.json({
            ok: true,
            mensaje: "Concepto actualizado correctamente"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al actualizar concepto"
        });
    }
};



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
                        cuota_con_ajuste: (parseFloat(anteriorr[0]['cuota_con_ajuste']) * parseFloat(ICC)) + parseFloat(anteriorr[0]['cuota_con_ajuste'])



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
        fechacarga,
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
    traermovimientos,
    mofificarmconcepto

}