const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const router = express.Router();
const pool = require('../../database');
const path = require('path')

const actividadRiesgo = JSON.parse(fs.readFileSync(path.join(__dirname, './actividad_riesgo.json')));

const cpriesgo = JSON.parse(fs.readFileSync(path.join(__dirname, './codigop.json')));

const nacionalidadriesgo = JSON.parse(fs.readFileSync(path.join(__dirname, './nacionalidad.json')));
// Función para calcular la edad
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
}

const riesgoPorTipo = {
    "Consorcios de Propietarios": 3,
    "Sociedad Anónima": 3,
    "Sociedad de Hecho": 3,
    "Sociedad de Responsabilidad Limitada": 3,
    "Sociedad en comandita por acciones": 3,
    "Sociedad en comandita Simple": 3,
    "Sociedad Irregular": 3,
    "Sociedad Unipersonal": 3,
    "Sociedades cooperativas de trabajo": 3,
    "Sociedades de garantía recíproca (SGR)": 3,
    "Asociaciones Civiles": 5,
    "Cooperativas": 5,
    "Embajadas": 5,
    "Entidades sindicales": 5,
    "Fideicomisos": 5,
    "Fundación": 5,
    "Mutuales": 5,
    "Organizaciones sin fines de lucro - Otros": 5,
    "Sociedad Anónima Simplificada": 5,
    "Entes Autarquicos": 5,
    "La Iglesia Católica": 5,
    "SAPEM (participación estatal mayoritaria)": 5,
    "Sector Público Nacional, Provincial o Municipal": 5
};

const riesgoAntiguedad = {
    "Mayor a 21 años": 1,
    "Entre 11 y 20 años": 2,
    "Entre 6 y 10 años": 3,
    "Entre 2 y 5 años": 4,
    "Menor o igual a 1 años": 5
};

// Función principal: matriz de riesgo
async function matriz(cliente) {
    const svm = await pool.query("SELECT * FROM salariovital ORDER BY id DESC LIMIT 1");
    const salariominimo = svm[0]['valor']
    let riesgo = 0;

    if (cliente['pep_extranjero'] === 'Si' || cliente['categoria_especial'] === 'Si') {
        return 100; // Devuelve un riesgo de 100 si es PEP o categoría especial
    }
   
    if (cliente['razon'] === 'Persona') {
        // Persona Física

        // Tipo de cliente
        if (cliente['tipoCliente'] === 'Persona Humana con Actividad Comercial') {
            riesgo += 6;
        } else {
            riesgo += 2;
        }

        // Edad del cliente
        const edad = calcularEdad(cliente['fechaNacimiento']);

        if (edad >= 18 && edad <= 25) {
            riesgo += 6;
        } else if (edad >= 26 && edad <= 55) {
            riesgo += 3;
        } else if (edad >= 56 && edad <= 75) {
            riesgo += 9;
        } else if (edad >= 76) {
            riesgo += 15;
        }

        // Volumen transaccional persona
        try {
            const volumen = cliente['volumenTransaccional'];

            if (volumen >= 0 && volumen <= 15 * salariominimo) {


                riesgo += 4;
            } else if (volumen > 15 * salariominimo && volumen <= 30 * salariominimo) {

                riesgo += 8;
            } else if (volumen > 30 * salariominimo && volumen <= 45 * salariominimo) {

                riesgo += 12;
            } else if (volumen > 45 * salariominimo && volumen <= 60 * salariominimo) {

                riesgo += 16;
            } else if (volumen > 60 * salariominimo) {

                riesgo += 20;
            }
        } catch (error) {
            console.error(error);
        }
    } else {
        // Persona Jurídica
        if (riesgoPorTipo.hasOwnProperty(cliente['tipoClienteEmpresa'])) {
            riesgo += riesgoPorTipo[cliente['tipoClienteEmpresa']] * 2;
        } else {
            riesgo += 2; // Valor por defecto si no está en la lista
        }

        // Riesgo por antigüedad
        if (riesgoAntiguedad[cliente['antiguedad']] !== undefined) {
            riesgo += riesgoAntiguedad[cliente['antiguedad']] * 3;
        }

        // Volumen transaccional jurídica
        try {
            const volumen = cliente['volumenTransaccional'];

            if (volumen >= 0 && volumen <= 150 * salariominimo) {

                riesgo += 4;
            } else if (volumen > 150 * salariominimo && volumen <= 300 * salariominimo) {

                riesgo += 8;
            } else if (volumen > 300 * salariominimo && volumen <= 450 * salariominimo) {

                riesgo += 12;
            } else if (volumen > 450 * salariominimo && volumen <= 600 * salariominimo) {

                riesgo += 16;
            } else if (volumen > 600 * salariominimo) {

                riesgo += 20;
            }

        } catch (error) {
            console.error(error);
        }
    }

    // Persona expuesta políticamente (PEP)
    if (cliente['expuesta'] === 'SI') {
        riesgo += 10;
    } else {
        riesgo += 2;
    }

    // Actividad económica
    const actividad = cliente['actividadEconomica'];
    const nivelRiesgo = actividadRiesgo.find(item => item['Unnamed: 0'] === actividad);

    if (!nivelRiesgo) {
        return 0; // Si no se encuentra la actividad económica, el riesgo es 0
    }

    const riesgoActividad = parseInt(nivelRiesgo['Unnamed: 1']) * 4;
    riesgo += riesgoActividad;

    // Código postal (CP)
    const cp = cliente['cp'];
    const riesgoCP = cpriesgo.find(item => item['codigo'] === cp);
    if (riesgoCP) {
        riesgo += parseInt(riesgoCP['riesgo']) * 2;
    } else {
        riesgo += 2; // Valor por defecto si no se encuentra el CP
    }

    // Riesgo por nacionalidad
    const nacionariesgo = cliente['nacionalidad'];
    const riesgoNAC = nacionalidadriesgo.find(item => item['NACIONALIDAD'] === nacionariesgo);

    if (riesgoNAC) {
        riesgo += parseInt(riesgoNAC['NIVEL DE RIESGO']) * 3;
    } else {
        riesgo += 3; // Valor por defecto si no se encuentra la nacionalidad
    }

    return riesgo;
}



async function montomaximodelicliente(cliente) {

    const criterios = await pool.query("SELECT * FROM criterios_riesgo ORDER BY id DESC LIMIT 1")
    const porcentaje = await matriz(cliente);

    const svm = await pool.query("SELECT * FROM salariovital ORDER BY id DESC LIMIT 1");
    montomax = 0
    if (porcentaje < 59) {



        if (cliente.razon == "Empresa") {

            montomax = svm[0]['valor'] * criterios[0]['bajoempresa']


        } else {

            montomax = svm[0]['valor'] * criterios[0]['bajopersona']

        }



    } else {
        if (porcentaje < 71) {


            if (cliente.razon == "Empresa") {

                montomax = svm[0]['valor'] * criterios[0]['medioempresa']



            } else {

                montomax = svm[0]['valor'] * criterios[0]['mediopersona']

            }



        } else {

            if (cliente.razon == "Empresa") {

                montomax = svm[0]['valor'] * criterios[0]['altoempresa']


            } else {

                montomax = svm[0]['valor'] * criterios[0]['altopersona']

            }


        }
    }
    return montomax
}


module.exports = { matriz, montomaximodelicliente };
