const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isLoggedInn, isLoggedInn2 } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const fs = require('fs')
const multer = require('multer')
const path = require('path')
const sacarguion = require('../public/apps/transformarcuit')
const nodemailer = require("nodemailer");
const enviodemail = require('../routes/Emails/Enviodemail')
const traerriesgo =  require('../routes/funciones/riesgo')
const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
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
// Función para buscar en la página
const buscarEnPagina = async (nombreCompleto) => {
  try {
    const url = 'https://repet.jus.gob.ar/';
    
    // ⚠️ Esta parte ignora problemas de SSL (solo para pruebas o sitios no confiables)
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const response = await axios.get(url, { httpsAgent });
    const html = response.data;
    const $ = cheerio.load(html);

    const pageText = $('body').text();
    const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const palabras = nombreCompleto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quita tildes
      .split(/[\s\-’‘'"]+/)
      .filter(word => word.length > 0);

    const totalPalabras = palabras.length;
    const palabrasNecesarias = totalPalabras > 3 ? totalPalabras - 1 : totalPalabras;

    let coincidencias = [];

    for (const line of lines) {
      const lineaNormalizada = line.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const palabrasExactas = palabras.filter(palabra =>
        lineaNormalizada.includes(palabra)
      );

      const palabrasSospechosas = palabras.filter(palabra =>
        !palabrasExactas.includes(palabra) &&
        lineaNormalizada.split(' ').some(palabraLinea => diferenciaLetras(palabra, palabraLinea) <= 1)
      );

      if (palabrasExactas.length + palabrasSospechosas.length >= palabrasNecesarias) {
        coincidencias.push({ linea: line, palabrasExactas, palabrasSospechosas });
      }
    }

    return coincidencias.length > 0 ? coincidencias : null;

  } catch (error) {
    console.error('Error al buscar en la página:', error.message);
    return null;
  }
};
  
  // Función para calcular la diferencia de letras entre dos palabras
  const diferenciaLetras = (str1, str2) => {
    if (Math.abs(str1.length - str2.length) > 1) {
      return Infinity; // Si las longitudes difieren en más de una letra, no son similares
    }
  
    let diferencias = 0;
    let i = 0, j = 0;
  
    while (i < str1.length && j < str2.length) {
      if (str1[i] !== str2[j]) {
        diferencias++;
        if (diferencias > 1) return diferencias;
  
        if (str1.length > str2.length) i++; // Salto en str1
        else if (str1.length < str2.length) j++; // Salto en str2
        else {
          i++;
          j++;
        }
      } else {
        i++;
        j++;
      }
    }
  
    // Contar diferencias restantes si una palabra es más larga
    diferencias += Math.abs((str1.length - i) - (str2.length - j));
  
    return diferencias;
  };
  
  
  // Función para calcular la similitud de Levenshtein
  const similarity = (str1, str2) => {
    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - distance) / maxLength;
  };
  
  // Función de distancia de Levenshtein
  const levenshteinDistance = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // Inserción
          matrix[i][j - 1] + 1, // Eliminación
          matrix[i - 1][j - 1] + cost // Sustitución
        );
      }
    }
  
    return matrix[a.length][b.length];
  };

// Configurar transporte de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sistemasfideicomiso@gmail.com',
    pass: 'mfqh gznx yezv wszc'
  }
});

// Función para enviar correo
const enviarCorreo = async (asunto, mensaje) => {
  const mailOptions = {
    from: 'sistemasfideicomiso@gmail.com',
    to: ['fernandog.enrique.dev@gmail.com', 'jantusaf@gmail.com'],
    subject: asunto,
    text: mensaje
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado correctamente');
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};


const determinarEmpresa = async (req, res) => {
    const { razon, cuil_cuit } = req.body

    const newLink = {
        razon
    }
    try {

        await pool.query('UPDATE clientes set ? WHERE cuil_cuit = ?', [newLink, cuil_cuit])

        try {
            await pool.query('UPDATE users set ? WHERE cuil_cuit = ?', [newLink, cuil_cuit])
        } catch {
            // console.log(error)
        }

        res.send('Exito')
    } catch (error) {
        //  console.log(error)
        res.send('Sin exito')
    }


}




const habilitar = async (req, res) => {
    const { cuil_cuit, cuil_cuit_admin } = req.body
    newLink = {
        habilitado: 'Si'
    }
    newLink2 = {
        cuil_cuit: cuil_cuit_admin,
        tabla_referencia: 'clientes',
        cuil_cuit_referencia: cuil_cuit,
        fecha: (new Date(Date.now())).toLocaleDateString(),
        adicional: 'Habilitado'
    }
    try {
        await pool.query('UPDATE clientes set ? WHERE cuil_cuit = ?', [newLink, cuil_cuit])
        await pool.query('insert registro_operaciones  set ?', newLink2)


    } catch (error) {
        // console.log(error)

    }



    res.send('exito')


}

////////// una letra informa lo que falta, 2 letras numero que suma para porcentaje. 3 letras cetificacion de intgresos 
//////commponents/nivel2/legajocliente/estadisticas
const estadisticasLegajos = async (req, res) => {
    const { cuil_cuit } = req.body

    const legajos = await pool.query('SELECT * FROM constancias where  cuil_cuit =?', [cuil_cuit])
    const legajosAprobados = await pool.query('SELECT * FROM constancias where  cuil_cuit =? and (estado="Aprobada" or tipo="Documentacion PEP")', [cuil_cuit])
    const cui = '%' + cuil_cuit + '%'
    const client = await pool.query('select * from clientes where cuil_cuit = ? ', [cuil_cuit])
    razonn = client[0]['razon']

    a = "Dni frente, "
    a2 = "Dni dorso, "
    b = "Constancia de Afip, "
    c = "Estatuto Social, "
    d = "Acta del organo decisorio, "
    e = "Acreditacion Domicilio, "
    f = "Ultimos balances CPCE, "
    g = "Dj Iva, "
    h = "Pagos Previsionales, "
    aux = "Dj Datos personales, "
    j = "Documentacion PEP, "
    k = "Dj Origen de Fondos, "
 t = "Constancia RePET, "
    m = "Referencias comerciales, "
    n = 0
    o = "Recibo de sueldo, "
    p = "Pago Monotributo, "
    q = "Pago autonomo, "
    r = "Constancia RePET, "
s="Recibo de sueldo"
u="Constancia CUIL/CUIT"
v="Acreditacion de ingresos"

    aa = 0
    aa2 = 0
    bb = 0
    cc = 0
    dd = 0
    ee = 0
    ff = 0
    gg = 0
    hh = 0
    auxaux = 0
    jj = 0
    kk = 0
    ll = 0
    mm = 0
    nn = 0
    ss= 0
    tt = 0   ////Constancia RePET
    uu=0
    ////   porccompleto = (aa + aa2 + bb + cc + dd + ee + auxaux + jj + kk)
    ////////sumatoria de acreditacion de empresas
    ggg = 0  ///dj iva
    rrr = 0/// ibb
    fff = 0 //cpe
    hhh = 0 /// "Pagos Previsionales "
    mmm = 0// "Referencias comerciales"
    lll = 0 //// constancia rpet 
    sss= s
    ////  sumatoria de acreditacion ingresos de personas
    ooo = 0 /// "Recibo de sueldo"
    ppp = 0 ///  "Pago Monotributo"
    qqq = 0 ///  "Pago autonomo"
    ttt= 0 /// Constancia RePET
    vvv=0 ///acreditacion de ingresos



    let acreditacion_i = "No tiene constancias de acreditacion de ingresos"

    for (let i = 0; i < legajosAprobados.length; i++) {
        console.log(legajosAprobados[i]['tipo'])
        if (razonn == 'Empresa') {
            switch (legajosAprobados[i]['tipo']) {
                case "Dni":
                    a = ""
                    aa = 1
                    break;
                case "Dni dorso":
                    a2 = ""
                    aa2 = 1
                    break;
                case "Constancia de Afip":
                    b = ""
                    bb = 1
                    break;
                case "Estatuto Social":
                    c = ""
                    cc = 1

                    break;
                case "Acta del organo decisorio":
                    d = ""
                    dd = 1
                    break;
                case "Acreditacion Domicilio":
                    e = ""
                    ee = 1
                    break;

                    case "Constancia RePET":
                        t = ""
                         tt = 1
                        
                         break;

                case "Dj Datospers":
                    aux = ""
                    auxaux = 1
                    break;
                case "Dj CalidadPerso":
                    j = ""
                    jj = 1
                    break;
                    case "Documentacion PEP":
                        console.log("Documentacion PEP")
                        j = ""
                        jj = 1
                        break;
                    
                case "Dj OrigenFondos":

                    k = ""
                    kk = 1
                    break;
                case "DDJJ IIBB":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1
                    rrr += 1/// ibb

                    break;
                case "DjIva":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1
                    ggg += 1  ///dj iva

                    break;
                case "Pagos Previsionales":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1

                    hhh += 1 /// "Pagos Previsionales "

                    break;
                case "Referencias comerciales":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1

                    mmm += 1// "Referencias comerciales"
                    break;
                case "Ultimos balances CPCE":
                    console.log('entro')
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    f = ""
                    ff = 1
                    g = ""
                    gg = 1
                    h = ""
                    hh = 1
                    fff += 1 //cpe

                    break;



                default:
                    break;

            }
        } else {
            switch (legajosAprobados[i]['tipo']) {
                case "Dni":
                    a = ""
                    aa = 1
                    break;
                    case "Dni dorso":
                    a2 = ""
                    aa2 = 1
                    break;
                    
                    case "Constancia CUIL/CUIT":
                        u = ""
                       uu = 1
                        break;
                case "Constancia de Afip":
                    b = ""
                    bb = 1
                    break;

                case "Acreditacion Domicilio":
                    e = ""
                    ee = 1
                    break;

                case "Dj Datospers":
                    aux = ""
                    auxaux = 1
                    break;
                case "Dj CalidadPerso":
                    j = ""
                    jj = 1
                    break;
                    case "Documentacion PEP":
                        j = ""
                        jj = 1
                        break;
                case "Dj OrigenFondos":
                    k = ""
                    kk = 1
                    break;
                case "Constancia RePET":
                   t = ""
                    tt = 1
                   
                    break;

                case "DDJJ IIBB":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1
                    rrr += 1
                    break;
                case "Recibo de sueldo":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1
                    ooo += 1
                    break;
                    
                    case "Acreditacion de ingresos":
                        acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                        l = ""
                        ll = 1
                      vvv += 1
                        break;
                case "Pago Monotributo":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1
                    ppp += 1
                    break;
                case "Pago autonomo":
                    acreditacion_i = "Cliente tiene como acreditacion de ingresos "
                    l = ""
                    ll = 1
                    qqq += 1
                    break;

                default:
                    break;
            }


        }

    }

    if (razonn == 'Empresa') {
       
        Faltan = 'Aun falta completar ' + a + a2 + b + c + d + e + aux + j + k  +t
        porccompleto = (aa + aa2 + bb + cc + dd + ee + auxaux + jj + kk + tt)

        porccompleto = porccompleto / 10
    

        porccompleto = (porccompleto * 100).toFixed(2)
        ///
        //  ggg=0  ///dj iva
        //   rrr = 0/// ibb
        //  fff = 0 //cpe
        //  hhh = 0 /// "Pagos Previsionales "
        ////////mmm = 0// "Referencias comerciales"
        console.log(acreditacion_i)
        if (acreditacion_i != "No tiene constancias de acreditacion de ingresos") {

            if (ggg != 0) {
                acreditacion_i = acreditacion_i + " " + ggg + " DjIva"
            }
            if (rrr != 0) {
                acreditacion_i = acreditacion_i + " " + rrr + " IIBB"
            }
            if (hhh != 0) {
                acreditacion_i = acreditacion_i + " " + hhh + " Pagos Previsionales"
            }
            if (mmm != 0) {
                acreditacion_i = acreditacion_i + " " + mmm + " Referencias comerciales"
            }
            if (fff != 0) {
                acreditacion_i = acreditacion_i + " " + fff + " Ultimos Balances CPCE"
            }


        }


    } else {
       
        Faltan = 'Aun falta completar ' + a + a2 +u + b + e + aux + j + k  + s + t 
       
        porccompleto = (aa + aa2+uu + bb + ee + auxaux + jj + kk + ll+ tt)
///a dni  b constancia afil  c estaturo d acta organi   e domicilio auxDj calidad opersia j  Datospers
// k origen de fondo t repet    ll Pago Monotributo
        porccompleto = porccompleto / 10

        porccompleto = (porccompleto * 100).toFixed(2)

        //////////////////////
        ///  ooo = 0 /// "Recibo de sueldo"
        ///// ppp = 0 ///  "Pago Monotributo"
        //////  qqq = 0 ///  "Pago autonomo"
        if (acreditacion_i != "No tiene constancias de acreditacion de ingresos") {
            
            if (vvv != 0) {
                acreditacion_i = acreditacion_i + " " + vvv + " Acreditacion de ingresos"
            }
            if (ooo != 0) {
                acreditacion_i = acreditacion_i + " " + ggg + " Recibo de sueldo"
            }
            if (ppp != 0) {
                acreditacion_i = acreditacion_i + " " + rrr + " Pago Monotributo"
            }
            if (qqq != 0) {
                acreditacion_i = acreditacion_i + " " + hhh + " Pago autonomo"
            }

            if (rrr != 0) {
                acreditacion_i = acreditacion_i + " " + rrr + " IIBB"
            }
            if ( sss != 0) {
                acreditacion_i = acreditacion_i + " " + rrr + " Recibo(s) de sueldo"
            }
           


        }


    }


    let pendientes = 0
    let aprobadas = 0
    let rechazadas = 0


    for (var i = 0; i < legajos.length; i++) {


        switch (legajos[i]['estado']) {
            case "Pendiente":
                pendientes = pendientes + 1

                break;
            case "Aprobada":
                aprobadas = aprobadas + 1
                break;
            case "Rechazada":
                rechazadas = rechazadas + 1
                break;
            default:
                break;
        }



    }
    if (0 < legajos.length) {
        porcP = (pendientes / legajos.length * 100).toFixed(2)

        porcA = (aprobadas / legajos.length * 100).toFixed(2)
        porcR = (rechazadas / legajos.length * 100).toFixed(2)
    } else {
        porcP = 0
        porcA = 0
        porcR = 0
    }



    const status = {
        "total": legajos.length,

        "Pendientes": pendientes,
        "porcPendientes": porcP,

        "Aprobadas": aprobadas,
        "porcAprobadas": porcA,

        "Rechazadas": rechazadas,
        "porcRechazadas": porcR,
        porccompleto: isNaN(porccompleto) ? 0 : porccompleto,
        Faltan,
        acreditacion_i

    }

    /*  unoo = {
         rango: "0-4",
         cantidad: uno,
     }
     doss={
         rango: "4-8",
         cantidad: uno, 
     }
     tress={
         rango: "8-12",
         cantidad: tres,
      }
     
      const rangoo =[unoo,doss,tress] */

    // const rta =[status,rangoo,datos]
    const rta = [status]

    res.json(rta)


}

const deshabilitar = async (req, res) => {
    const { cuil_cuit, cuil_cuit_admin } = req.body
    newLink = {
        habilitado: 'No'
    }
    newLink2 = {
        cuil_cuit: cuil_cuit_admin,
        tabla_referencia: 'clientes',
        cuil_cuit_referencia: cuil_cuit,
        fecha: (new Date(Date.now())).toLocaleDateString(),
        adicional: 'Deshabilitado'
    }
    try {
        await pool.query('UPDATE clientes set ? WHERE cuil_cuit = ?', [newLink, cuil_cuit])
        await pool.query('insert registro_operaciones  set ?', newLink2)
    } catch (error) {
        //  console.log(error)

    }



    res.send('exito')


}

const borrarCbu = async (req, res) => {
    let { id } = req.params

    try {
        await pool.query('DELETE  FROM cbus WHERE id = ?', [id])
        res.json('Borrado')

    } catch (error) {
        // console.log(error)
        res.json('Error algo sucedio ')

    }


}
/* const cantidadInfo = async (req, res) => {
    try {

        const clientes = await pool.query(`
            SELECT 
                c.*,

                CASE 
                    WHEN (
                        CASE 
                            WHEN c.zona = 'IC3' THEN uc_ic3.ultima_cuota_num
                            ELSE uc.ultima_cuota_num
                        END
                    ) IS NOT NULL 
                    THEN 1 
                    ELSE 0 
                END AS tiene_cuota,

                -- Año última cuota
                FLOOR(
                    (
                        CASE 
                            WHEN c.zona = 'IC3' THEN uc_ic3.ultima_cuota_num
                            ELSE uc.ultima_cuota_num
                        END
                    ) / 100
                ) AS ultima_cuota_anio,

                -- Mes última cuota
                MOD(
                    (
                        CASE 
                            WHEN c.zona = 'IC3' THEN uc_ic3.ultima_cuota_num
                            ELSE uc.ultima_cuota_num
                        END
                    ),
                    100
                ) AS ultima_cuota_mes

            FROM clientes c

            -- Cuotas normales (por cuil_cuit)
            LEFT JOIN (
                SELECT 
                    q.cuil_cuit,
                    MAX(q.anio * 100 + q.mes) AS ultima_cuota_num
                FROM cuotas q
                GROUP BY q.cuil_cuit
            ) uc ON uc.cuil_cuit = c.cuil_cuit

            -- Cuotas IC3 (por id_cliente)
            LEFT JOIN (
                SELECT 
                    q.id_cliente,
                    MAX(q.anio * 100 + q.mes) AS ultima_cuota_num
                FROM cuotas_ic3 q
                GROUP BY q.id_cliente
            ) uc_ic3 ON uc_ic3.id_cliente = c.id

            ORDER BY tiene_cuota DESC
        `);

        const clientesConPorcentaje = await Promise.all(
            clientes.map(async (cliente) => {
                const porcentaje = await traerriesgo.matriz(cliente);

                return {
                    ...cliente,
                    porcentaje,
                    ultimaCuota: cliente.ultima_cuota_anio
                        ? `${String(cliente.ultima_cuota_mes).padStart(2, '0')}/${cliente.ultima_cuota_anio}`
                        : null
                };
            })
        );

        clientesConPorcentaje.sort((a, b) => b.porcentaje - a.porcentaje);

        res.json(clientesConPorcentaje);

    } catch (error) {
        console.error("Error al obtener clientes:", error);
        res.status(500).json({ error: "Ocurrió un error al obtener los clientes" });
    }
};
 */
const cantidadInfo = async (req, res) => {
    try {

        const clientes = await pool.query(`
            SELECT 
                c.*,

                CASE 
                    WHEN (
                        CASE 
                            WHEN c.zona = 'IC3' THEN uc_ic3.ultima_cuota_num
                            ELSE uc.ultima_cuota_num
                        END
                    ) IS NOT NULL 
                    THEN 1 
                    ELSE 0 
                END AS tiene_cuota,

                FLOOR(
                    (
                        CASE 
                            WHEN c.zona = 'IC3' THEN uc_ic3.ultima_cuota_num
                            ELSE uc.ultima_cuota_num
                        END
                    ) / 100
                ) AS ultima_cuota_anio,

                MOD(
                    (
                        CASE 
                            WHEN c.zona = 'IC3' THEN uc_ic3.ultima_cuota_num
                            ELSE uc.ultima_cuota_num
                        END
                    ),
                    100
                ) AS ultima_cuota_mes

            FROM clientes c

            LEFT JOIN (
                SELECT 
                    q.cuil_cuit,
                    MAX(q.anio * 100 + q.mes) AS ultima_cuota_num
                FROM cuotas q
                GROUP BY q.cuil_cuit
            ) uc ON uc.cuil_cuit = c.cuil_cuit

            LEFT JOIN (
                SELECT 
                    q.id_cliente,
                    MAX(q.anio * 100 + q.mes) AS ultima_cuota_num
                FROM cuotas_ic3 q
                GROUP BY q.id_cliente
            ) uc_ic3 ON uc_ic3.id_cliente = c.id

            WHERE c.zona IS NULL 

            ORDER BY tiene_cuota DESC
        `);

        const clientesConPorcentaje = await Promise.all(
            clientes.map(async (cliente) => {
                const porcentaje = await traerriesgo.matriz(cliente);

                return {
                    ...cliente,
                    porcentaje,
                    ultimaCuota: cliente.ultima_cuota_anio
                        ? `${String(cliente.ultima_cuota_mes).padStart(2, '0')}/${cliente.ultima_cuota_anio}`
                        : null
                };
            })
        );

        clientesConPorcentaje.sort((a, b) => b.porcentaje - a.porcentaje);

        res.json(clientesConPorcentaje);

    } catch (error) {
        console.error("Error al obtener clientes:", error);
        res.status(500).json({ error: "Ocurrió un error al obtener los clientes" });
    }
};

const lista2 = async (req, res) => {

    const clientes = await pool.query('select * from clientes where cod_zona="Legales" ')
    fecha = (new Date(Date.now())).toLocaleDateString()
    const fech = fecha.split("/");
    const mesact = parseInt(fech[0])
    const anoac = parseInt(fech[2])

    let env = []
    let tot = []
    let pagadas = []
    for (cli in clientes) {

        pagadas = []
        tot = []
        let bandmesconcurr = false
        let lotes = await pool.query('select * from lotes  where cuil_cuit=? ', [clientes[cli]['cuil_cuit']])
        let quelote = ""
        let cantidad_falt = 0
        let cantidad_venc = 0

        for (lot in lotes) {
            quelote = quelote + lotes[lot]['manzana'] + " - " + lotes[lot]['parcela']
            let cuotaact = await pool.query('select * from cuotas left join (select id_cuota from pagos )as sele on cuotas.id=sele.id_cuota where id_cuota is null and id_lote=?', [lotes[lot]['id']])
            let cuotavenc = await pool.query('select * from cuotas where mes=? and anio=? and id_lote=? and pago>0 ', [mesact, anoac, lotes[lot]['id']])
            tot = await pool.query('select * from cuotas where id_lote=?', [lotes[lot]['id']])
            pagadas = await pool.query('select * from cuotas  join (select id_cuota from pagos )as sele on cuotas.id=sele.id_cuota where  id_lote=?', [lotes[lot]['id']])


            if (cuotavenc.length > 0) {
                bandmesconcurr = true
            }
            cantidad_falt += cuotaact.length
            for (actt in cuotaact) {
                if (cuotaact[actt]['anio'] < anoac) {

                    cantidad_venc += 1
                } else {
                    if (cuotaact[actt]['anio'] == anoac) {

                        if (cuotaact[actt]['mes'] < mesact) {

                            cantidad_venc = cantidad_venc + 1

                        }
                    }
                }
            }
        }


        let nuevo = {
            cuil_cuit: clientes[cli]['cuil_cuit'],
            Nombre: clientes[cli]['Nombre'],
            cantidad_falt,
            bandmesconcurr,
            cantidad_venc,
            quelote,
            pagadas: pagadas.length,
            totales: tot.length

        }
        env.push(nuevo)
    }

    res.json(env)


}


const cbusPendientes = async (req, res) => {



    const cbus = await pool.query('select * from cbus where estado="P"',)

    res.json(cbus)


}

const legajosCuil = async (req, res) => {
    const cuil_cuit = req.params.cuil_cuit
    //  fs.writeFileSync(path.join(__dirname,'../dbimages/'))


    const legajos = await pool.query('select * from constancias where cuil_cuit =?', [cuil_cuit])
    const array2 = await pool.query('select id, lazo as tipo, descripcion, cuil_cuit, estado,ubicacion  from cbus where cuil_cuit =?', [cuil_cuit])
    const result = legajos.concat(array2);
    const cl = await pool.query('select * from clientes where cuil_cuit =?', [cuil_cuit])
    /*  legajos.map(img => {
          fs.writeFileSync(path.join(__dirname, '../dbimages/' + img.id + '--.png'), img.comprobante)
  
      })
      const imagedir = fs.readdirSync(path.join(__dirname, '../dbimages/'))*/
      console.log(result)
      console.log('result')
    res.json([result, cl])


}
const ventalotee = async (req, res) => {
    let { zona, manzana, fraccion, parcela, cuil_cuit, lote, estado } = req.body


    switch (zona) {
        case 'PIT':

            lote = '0'
            break;
        case 'IC3':
            parcela = '0'
            //  fraccion = fraccion.toUpperCase()
            break;


    }


    venta = {
        cuil_cuit,
        estado

    }

    try {
        if (zona = 'PIT') {
            // fraccion=?, manzana =?, parcela =?, lote=? 


            const existe = await pool.query('select * from lotes where zona=? and fraccion =? and manzana =? and parcela=? and lote =?', [zona, fraccion, manzana, parcela, lote])
            if (existe.length > 0) {
                await pool.query('UPDATE lotes set ? WHERE id = ?', [venta, existe[0]['id']])
                mensaje = 'Lote asignado'
                res.json([mensaje, cuil_cuit])
            } else {
                mensaje = 'Lote no existe'
                res.json([mensaje, cuil_cuit])
            }




        } else {
            const existe = await pool.query('select * from lotes where zona=? and fraccion =? and manzana =? and  lote =?', [zona, fraccion, manzana, parcela, lote])

            if (existe.length > 0) {
                await pool.query('UPDATE lotes set ? WHERE id = ?', [venta, existe[0]['id']])
                mensaje = 'Lote asignado'
                res.json([mensaje, cuil_cuit])
            } else {
                mensaje = 'Lote no existe'
                res.json([mensaje, cuil_cuit])
            }


        }

    } catch (error) {
        // console.log(error)
        res.send('algo salio mal')
    }
}
///agregar cliente
const add2 = async (req, res) => {
    const { Nombre,  domicilio, cuil_cuit, razon, telefono, observaciones } = req.body;
    const newLink = { Nombre,  razon, telefono, domicilio, observaciones, cuil_cuit };
  
    try {
      // Verificar si el cliente ya existe
      const row = await pool.query('SELECT * FROM clientes WHERE cuil_cuit = ?', [cuil_cuit]);
      if (row.length > 0) {
        res.send('Error: el cuil_cuit ya existe.');
        return;
      }
  
      // Buscar en la página
      const resultadosBusqueda = await buscarEnPagina(Nombre);
  
      // Enviar correo según los resultados
      if (resultadosBusqueda) {
        const mensaje = `Se encontraron coincidencias para el cliente ${Nombre}:\n\n` +
          resultadosBusqueda.map(result => 
            `- Línea: ${result.linea}\n  Palabras exactas: ${result.palabrasExactas.join(', ')}\n  Palabras sospechosas: ${result.palabrasSospechosas.join(', ')}`
          ).join('\n\n');
        await enviarCorreo('Resultados encontrados para cliente', mensaje);
        await pool.query('INSERT INTO clientes SET ?', [newLink]);
        console.log(resultadosBusqueda)
        res.json('Cliente guardado correctamente y analizado. Resultado:'+mensaje);
      } else {
        const mensaje = `No se encontraron coincidencias para el cliente ${Nombre}.`;
        await enviarCorreo('Sin coincidencias para cliente', mensaje);
        await pool.query('INSERT INTO clientes SET ?', [newLink]);
        console.log(resultadosBusqueda)
        res.json('Cliente guardado correctamente y analizado. No hubo coincidencias');
      }
 
      // Insertar cliente en la base de datos
     
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      res.status(500).send('Error al procesar la solicitud.');
    }
  };




const add3 = async (req, res) => {
    const { Nombre, tipo_dni, domicilio, cuil_cuit, razon, telefono, observaciones } = req.body;
    const newLink = {
        Nombre,
        tipo_dni,
        razon,
        telefono,
        domicilio,
        observaciones,
        cuil_cuit,
        habilitado: "Si",
        cod_zona: "Legales"
        //user_id: req.user.id
    };



    try {
        const row = await pool.query('Select * from clientes where cuil_cuit = ?', [req.body.cuil_cuit]);
        if (row.length > 0) {   // SI YA EXISTE EL CLIENTE
            res.send('Error cuil_cuit ya existe')

        }
        else {
            await pool.query('INSERT INTO clientes set ?', [newLink]);
            res.send('Guardado correctamente')

        }

    } catch (error) {
        // console.log(error)
        res.send('message', 'Error algo salio mal')


    }
}
const modificarCuil = async (req, res) => {
    const { cuil_cuit, id } = req.body;




    try {
        const row = await pool.query('Select * from clientes where id = ?', [id]);
        if (row.length > 0) {   // SI YA EXISTE EL CLIENTE
            cuil_cuit_ant = row[0]["cuil_cuit"]
            nuevo = {
                cuil_cuit: cuil_cuit
            }

            try {
                await pool.query('UPDATE users set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                // console.log(error)
            }
            try {
                await pool.query('UPDATE clientes set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                //console.log(error)
            }
            try {
                await pool.query('UPDATE cuotas set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                //  console.log(error)
            }
            try {
                await pool.query('UPDATE pagos set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                //  console.log(error)
            }
            try {
                await pool.query('UPDATE constancias set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                //  console.log(error)
            }
            try {
                await pool.query('UPDATE lotes set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                //   console.log(error)
            }
            try {
                await pool.query('UPDATE notificaciones set ? WHERE cuil_cuit = ?', [nuevo, cuil_cuit_ant])
            } catch (error) {
                // console.log(error)
            }
        }
        else {
            // await pool.query('INSERT INTO clientes set ?', [newLink]);
            res.send('Guardado correctamente')

        }

    } catch (error) {
        // console.log(error)
        res.send('message', 'Error algo salio mal')


    }





}


const ventaLoteleg = async (req, res) => {
    const { fraccion, parcela, manzana, cuil_cuit } = req.body;


    try {
        const lote = await pool.query('Select * from lotes where zona=?  and  parcela=? and manzana=?', ["Legales", parcela, manzana]);

        if (lote.length > 0) {
            const newLink = {
                cuil_cuit,
                estado: "Ocupado"
            }
            await pool.query('UPDATE lotes set ? WHERE id = ?', [newLink, lote[0]['id']])
            res.json('Lote asignado')
        } else {
            res.json('Lote no existe')
        }

    } catch (error) {
        //  console.log(error)
        res.send('message', 'Error algo salio mal')


    }





}

const AgregarIngreso = async (req, res) => {
    const { ingresos, cuil_cuit } = req.body

    const newLink = {
        ingresos
    }
    try {
        await pool.query('UPDATE clientes set ? WHERE cuil_cuit = ?', [newLink, cuil_cuit])

    } catch (error) {
        console.log(error)

    }



    res.send('exito')


}
const detalleCuil = async (req, res) => {
    try {
        const { cuil_cuit } = req.params;

        // Consulta para obtener los datos del cliente
        const links = await pool.query('SELECT * FROM clientes WHERE cuil_cuit= ?', [cuil_cuit]);

        if (links.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Asume que solo obtendrás un cliente con este cuil/cuit (En el registro se filtra esta condicion)
        const cliente = links[0];

        // Calcula la edad del cliente
        const edad = calcularEdad(cliente.fechaNacimiento);

        // Calcula el riesgo del cliente  const porcentaje = await traerriesgo.matriz(cliente);
        const riesgo = await traerriesgo.matriz(cliente);

        // Agrega la edad y el riesgo al cliente
        const clienteConDetalles = {
            ...cliente,
            edad,
            riesgo
        };

        // Devuelve los datos del cliente con los detalles calculados
        res.json([clienteConDetalles]);
    } catch (error) {
        console.error('Error en detalleCuil:', error);
        res.status(500).json({ message: 'Error al procesar la solicitud' });
    }
};
module.exports = {
    ventaLoteleg,
    add3,
    lista2,
    determinarEmpresa,
    habilitar,
    estadisticasLegajos,
    deshabilitar,
    borrarCbu,
    cantidadInfo,
    cbusPendientes,
    legajosCuil,
    ventalotee,
    add2,
    modificarCuil,
    AgregarIngreso,
    detalleCuil

}


