const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn,isLoggedInn, isLoggedInn2, isLoggedInn4} = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const fs = require('fs')
const multer = require('multer')
const path = require('path')
const enviodemail = require('./Emails/Enviodemail')
const { determinarEmpresa, habilitar, estadisticasLegajos, deshabilitar, borrarCbu, cbusPendientes, legajosCuil, ventalotee, add2,add3, modificarCuil, AgregarIngreso, detalleCuil, cantidadInfo, lista2, ventaLoteleg } = require('../controladores/linksControlador')
//const { busquedarenapet } = require('./funciones/buscarrenapet');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cron = require('node-cron');
const https = require('https');
/////////aws
const cheerio = require('cheerio');

const diskstorage = multer.diskStorage({
    destination: path.join(__dirname, '../../pdfs'),
    filename: (req, file, cb) => {

        cb(null, Date.now() + '-legajo-' + file.originalname)


    }
}) //para que almacene temporalmente la imagen
const fileUpload = multer({
    storage: diskstorage,

}).single('image')


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sistemasfideicomiso@gmail.com', // Tu correo
    pass: 'mfqh gznx yezv wszc', // Contraseña o token de aplicación
  },
});

router.post('/determinarempresa', isLoggedInn2, determinarEmpresa)

router.post('/habilitar',isLoggedInn2, habilitar)

//////commponents/nivel2/legajocliente/estadisticas
router.post("/estadisticaslegajos", isLoggedInn2, estadisticasLegajos)



router.post('/deshabilitar',isLoggedInn2, deshabilitar)


/// borrar CBU, cualquier nivel

router.get('/borrarcbu/:id',isLoggedInn,  borrarCbu)


///// Funcion devuelve cantidad de clientes /// agregar 

router.get('/infocantidad',cantidadInfo )

router.get('/completarobservaciones',async (req, res) => {
    try {
        const todos = await pool.query('select * from clientes')
for (x in todos ){
  if (todos[x]['cuil_cuit'] !=0){
    lotes = await pool.query('select * from lotes where cuil_cuit=?',[todos[x]['cuil_cuit']])
    lot= '' 
       try {
        for (y in lotes){
        
                if (lotes[y]['zona']=="IC3"){
                    lot=lot +lotes[y]['zona']+' -Fr: '+lotes[y]['fraccion']+' -Mz: '+lotes[y]['manzana']+' -Lote: '+lotes[y]['lote']+' // '
                } else{
                    lot=lot +lotes[y]['zona']+' -Fr: '+lotes[y]['fraccion']+' -Mz: '+lotes[y]['manzana']+' -Parc: '+lotes[y]['parcela']+' // '
    
    
                }
           
           
           



        }
    await pool.query('UPDATE clientes set  observaciones=? WHERE id = ?', [lot, todos[x]['id']])
 } catch (error) {
             //   console.log(error)
            }
}
}
    } catch (error) {
       // console.log(error)
        res.json('error')
    }
res.json('listo')

}

)



router.get('/lista2',isLoggedInn4,lista2 )


router.post('/ventaLoteleg',ventaLoteleg )



router.get('/cbuspendientes', isLoggedInn2, cbusPendientes)

//lista legajos de un cliente 
router.get('/legajos/:cuil_cuit',isLoggedInn2, legajosCuil)



//Asignar lote a usuario 
router.post('/ventalotee',isLoggedInn2, ventalotee)

////react 
router.post('/add2',isLoggedInn2, add2)
//legales
router.post('/add3',isLoggedInn2, add3)
///////modificar cuil
router.post('/modificarcuil',isLoggedInn2, modificarCuil)
/////////


router.post('/agregaringreso2',isLoggedInn2, AgregarIngreso)
////////////////////////////////


router.get('/detalle/:cuil_cuit',detalleCuil)


router.get('/clientehabilitadoic3/:cuil_cuit',isLoggedInn2, async (req, res) => {
    const { cuil_cuit } = req.params
 
    const links = await pool.query('SELECT * FROM clientes WHERE cuil_cuit= ?', [cuil_cuit])

    const habilitado = await pool.query('SELECT * FROM registro_operaciones WHERE cuil_cuit_referencia = ? and (adicional = "Habilitado" or adicional = "Deshabilitado")', [links[0]['cuil_cuit']])

    if (habilitado.length>0){
    reg= habilitado[(habilitado.length)-1]
        }else{
            reg= {cuil_cuit:'Sistema',
            fecha: 'de su creacion'}

        }
    
    res.json([links,reg])

})
router.get('/clientehabilitado/:cuil_cuit',isLoggedInn2, async (req, res) => {
    const { cuil_cuit } = req.params
 
    const links = await pool.query('SELECT * FROM clientes WHERE cuil_cuit= ?', [cuil_cuit])
    const habilitado = await pool.query('SELECT * FROM registro_operaciones WHERE cuil_cuit_referencia = ? and (adicional = "Habilitado" or adicional = "Deshabilitado")', [cuil_cuit])

    if (habilitado.length>0){
    reg= habilitado[(habilitado.length)-1]
        }else{
            reg= {cuil_cuit:'Sistema',
            fecha: 'de su creacion'}

        }
    
    res.json([links,reg])

})
// MODIDICACION CLIENTES
///agregar beneficiarios  


router.post('/agregarbeneficiarios', async (req, res) => {
  try {
      const { id, 
              beneficiario1, cuilBeneficiario1, porcentaje1,
              beneficiario2, cuilBeneficiario2, porcentaje2,
              beneficiario3, cuilBeneficiario3, porcentaje3 } = req.body;

      if (!id) {
          return res.status(400).json({ error: 'El ID es requerido' });
      }


      const updateBeneficiarios = `
          UPDATE clientes
          SET beneficiario1 = ?, cuilbeneficiario1 = ?, porcentaje1 = ?,
              beneficiario2 = ?, cuilbeneficiario2 = ?, porcentaje2 = ?,
              beneficiario3 = ?, cuilbeneficiario3 = ?, porcentaje3 = ?,
              beneficiarios="Si"
          WHERE id = ?
      `;
      await pool.query(updateBeneficiarios, [
          beneficiario1, cuilBeneficiario1, porcentaje1,
          beneficiario2, cuilBeneficiario2, porcentaje2,
          beneficiario3, cuilBeneficiario3, porcentaje3,
          id
      ]);

      res.status(200).json({ message: 'Cliente actualizado correctamente' });
  } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
  }
});
router.post('/modificarclientelegales',isLoggedInn2, async (req, res) => {
    const { cuil_cuit, email, Nombre, telefono, id } = req.body
    
    try {
 
        const newLink = {
        cuil_cuit,
        email,
        telefono,
        Nombre
        }
 
        await pool.query('UPDATE clientes set ? WHERE id= ?', [newLink, id])
        res.send('Cliente modificado')
    } catch (error) {
        res.send('Error algo sucedió' + error)
    }


})
router.post('/modificarcli', isLoggedInn2, async (req, res) => {
  const {
      cuil_cuit,
      cp,
      email,
      provincia,
      telefono,
      ingresos,
      domicilio,
      razon_social,
      observaciones,
      fechaNacimiento,
      tipoCliente,
      actividadEconomica,
      nacionalidad,
      volumenTransaccional,
      tipoClienteEmpresa,
      antiguedad,
      pep_extranjero,
      categoria_especial
  } = req.body;

  try {
      if (!cuil_cuit) {
          return res.status(400).send('El campo cuil_cuit es obligatorio');
      }

      // Formatea la fecha si existe
      const formattedFechaNacimiento = fechaNacimiento
          ? new Date(fechaNacimiento).toISOString().split('T')[0] // Convierte a formato YYYY-MM-DD
          : null;

      // Crear objeto con los datos enviados
      const newLink = {
          email,
          cp,
          provincia,
          telefono,
          ingresos,
          domicilio,
          razon_social,
          observaciones,
          fechaNacimiento: formattedFechaNacimiento,
          tipoCliente,
          actividadEconomica,
          nacionalidad,
          volumenTransaccional,
          tipoClienteEmpresa,
          antiguedad,
          pep_extranjero,
          categoria_especial
      };

      // Filtrar solo los campos que tienen valores no nulos o no indefinidos
      const filteredLink = Object.fromEntries(
          Object.entries(newLink).filter(([_, value]) => value != null && value !== '')
      );

      if (Object.keys(filteredLink).length === 0) {
          return res.status(400).send('No se enviaron campos válidos para actualizar');
      }

      // Ejecutar la consulta con solo los campos válidos
      await pool.query('UPDATE clientes SET ? WHERE cuil_cuit = ?', [filteredLink, cuil_cuit]);
      res.send('Cliente modificado exitosamente');
  } catch (error) {
      console.error('Error al modificar el cliente:', error);
      res.status(500).send('Error: Algo sucedió. ' + error.message);
  }
});


router.post('/enviarmailprueba/',isLoggedInn2, async (req, res) => {
    const {cuil_cuit} = req.body
  cli = await pool.query ('select * from clientes where cuil_cuit = ?',[cuil_cuit])
    
mensaje= 'Hola como estas '

email = cli[0]['email']
asunto = 'Aprobacion de CBU'
encabezado= 'Notificacion nueva'
enviodemail.enviarmail.enviarmail(email,asunto,encabezado,mensaje)




/* 
   let transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com", // hostname
    port: 587, // port for secure SMTP
    secureConnection: false,
    tls: {
       ciphers:'SSLv3'
    },
    auth: {
        user: 'fideicomisoSCatalina@outlook.com',
        pass: '1385Fideicomiso'
    }
});

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Administracion Santa Catalina " <fideicomisoSCatalina@outlook.com>', // sender address
    to: ["elotroyo005@gmail.com", email], // list of receivers
    subject: "Asunto lisa?", // Subject line
    text: mensaje, // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

 */


   

})

router.get('/listaic3', async (req, res) => {
  try {
    const resultados = await pool.query(`
      SELECT c.Nombre, ci.mes, ci.anio, c.cuil_cuit
      FROM clientes c
      LEFT JOIN cuotas_ic3 ci ON ci.id_cliente = c.id
      INNER JOIN (
          SELECT id_cliente, MAX(anio * 100 + mes) as max_fecha
          FROM cuotas_ic3
          GROUP BY id_cliente
      ) ultimas ON ultimas.id_cliente = ci.id_cliente
              AND (ci.anio * 100 + ci.mes) = ultimas.max_fecha
      WHERE c.zona = "IC3  "
      ORDER BY ci.anio DESC, ci.mes DESC
    `);

    res.json(resultados);
  } catch (error) {
    console.error("Error al obtener clientes y cuotas:", error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


router.post('/subirlegajodni', fileUpload, async (req, res, done) => {
    const { tipo, cuil_cuit } = req.body


    try {
      
        const type = req.file.mimetype
     
        const name = req.file.originalname
 
        const data = fs.readFileSync(path.join(__dirname, '../../pdfs/' + req.file.filename))
    

        const datos = {
            ubicacion: req.file.filename,
            tipo: tipo,
            cuil_cuit: cuil_cuit,
            estado: 'A',
        }
        await pool.query('insert into constancias set?', datos)
        res.send('Imagen guardada con exito')
    } catch (error) {
        res.send('algo salio mal')
    }
    // console.log(req.file)






})


const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), (req, res) => {
    const filePath = path.join(__dirname, req.file.path);
    const workbook = xlsx.readFile(filePath);
  
    // Recorrer todas las hojas
    const sheetNames = workbook.SheetNames;
    const allData = [];
  
    sheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json(worksheet);
  
      sheetData.forEach((row) => {
        // Aquí puedes hacer algo con cada fila
        allData.push({ sheetName, row });
      });
    });
  
    // Eliminar el archivo subido después de procesarlo para no ocupar espacio innecesario
    fs.unlinkSync(filePath);
  
    // Aquí puedes hacer algo con los datos procesados
    console.log(allData);
  
    // Opcionalmente, puedes enviar los datos de vuelta al cliente
    res.json(allData);
  });


  // Función para escapar caracteres especiales en una expresión regular
  function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, '\\$&'); // Escapa todos los caracteres especiales
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, '\\$&'); // Escapa todos los caracteres especiales
  }
  const removeAccents = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .toLowerCase(); // Convertir a minúsculas
  };
  
  
router.get('/consultarenapet/', async (req, res) => {
  try {
    // Obtener datos de la base de datos
    const clientes = await pool.query('SELECT * FROM clientes');
    if (!clientes.length) {
      return res.status(404).json({ error: 'No se encontraron clientes en la base de datos.' });
    }

    // Escapar caracteres especiales en expresiones regulares
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Función de búsqueda
    const busquedarenapet = async (nombresArray) => {
      try {
        const url = 'https://repet.jus.gob.ar/';
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Normalizar el texto de la página
        const pageText = removeAccents($('body').text());
        const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const allResults = [];
        for (const obj of nombresArray) {
          const NombreCompleto = obj?.Nombre;
          if (!NombreCompleto || typeof NombreCompleto !== 'string') continue;

          // Separar el nombre completo en palabras y normalizarlas
          const palabras = NombreCompleto.split(' ')
            .map(word => removeAccents(word.trim()))
            .filter(word => word.length > 0);

          if (palabras.length === 0) continue;

          // Crear expresiones regulares para cada palabra
          const regexPalabras = palabras.map(palabra => new RegExp(`\\b${escapeRegExp(palabra)}\\b`, 'i'));

          let matchedLines = [];

          // Buscar coincidencias en las líneas
          lines.forEach(line => {
            const coincidencias = regexPalabras.every(regex => regex.test(line));
            if (coincidencias) {
              matchedLines.push(line);
            }
          });

          // Agregar resultados si hay coincidencias
          if (matchedLines.length > 0) {
            allResults.push({
              Nombre: NombreCompleto,
              resultados: matchedLines,
            });
          }
        }
        return allResults;
      } catch (error) {
        console.error('Error en la búsqueda:', error);
        return null;
      }
    };

    // Ejecutar búsqueda
    const resultados = await busquedarenapet(clientes);

    if (resultados && resultados.length > 0) {
      res.json({ resultados });
    } else {
      res.status(404).json({ mensaje: 'No se encontraron coincidencias.' });
    }
  } catch (error) {
    console.error('Error en el endpoint:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
});
  
/*  //////////mail
     
      
 const transporter = nodemailer.createTransport({
  service: 'gmail', // O el servicio de correo que utilices
  auth: {
    user: 'sistemasfideicomiso@gmail.com', // Reemplaza con tu correo
    pass: 'mfqh gznx yezv wszc' // Reemplaza con tu contraseña
  }
});

const mailOptions = {
  from: 'email',
  to: 'pipao.pipo@gmail.com',
  subject: 'Nueva Consulta de la web',
  text:  JSON.stringify(resultados, null, 2)
};

try {
  await transporter.sendMail(mailOptions);
  console.log('Correo enviado correctamente');
} catch (error) {
  console.error('Error al enviar el correo:', error);
 // res.status(500).send('Error al enviar el correo');
}




///////// */

/**   
 * 
 * const busquedarenapet = async (nombresArray) => {
  try {
    const url = 'https://repet.jus.gob.ar/';
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const pageText = $('body').text();
    const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const allResults = [];
    for (const obj of nombresArray) {
      const NombreCompleto = obj?.Nombre;
      if (!NombreCompleto || typeof NombreCompleto !== 'string') continue;

      // Separar el nombre completo en partes (nombre y apellidos)
      const [nombre, ...apellidos] = NombreCompleto.split(' ').map(word => word.trim()).filter(word => word.length > 0);
      if (!nombre || apellidos.length === 0) continue;

      let matchedLines = [];

      // Escapar los caracteres especiales y crear una expresión regular para el nombre y apellidos
      const nombreRegex = new RegExp(`\\b${escapeRegExp(nombre)}\\b`, 'i'); // Coincidencia exacta de la palabra 'nombre'
      const apellidosRegex = apellidos.map(apellido => new RegExp(`\\b${escapeRegExp(apellido)}\\b`, 'i')); // Coincidencia exacta de los apellidos

      // Buscar coincidencias en las líneas
      lines.forEach(line => {
        const coincidencias = [];
        const nombreCoincide = nombreRegex.test(line);  // Verificar coincidencia exacta de nombre
        if (nombreCoincide) coincidencias.push(nombre);

        const apellidosCoinciden = apellidos.filter(apellido => {
          return apellidosRegex.some(regex => regex.test(line) && regex.source.includes(apellido));
        });
        coincidencias.push(...apellidosCoinciden);

        // Verificar que el nombre y los apellidos coincidan con la línea completa, no solo fragmentos
        if (coincidencias.length === apellidos.length + 1) {
          matchedLines.push({
            linea: line,
            coincidencias: coincidencias, // Palabras que generaron la coincidencia
          });
        }
      });

      // Agregar resultados si hay coincidencias
      if (matchedLines.length > 0) {
        allResults.push({
          Nombre: NombreCompleto,
          resultados: matchedLines,
        });
      }
    }
    console.log(allResults);
    return allResults;
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return null;
  }
};

 */
  ////////////AUTOMARICA

  
// Función principal
const busquedarenapet = async () => {
  try {
    const clientes = await pool.query('SELECT * FROM clientes');
    
    if (!clientes.length) {
      console.log('No se encontraron clientes en la base de datos.');
      return { mensaje: 'No se encontraron clientes en la base de datos.', clientesAnalizados: 0 };
    }

    const url = 'https://repet.jus.gob.ar/';
    const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // ⚠️ solución
    const response = await axios.get(url, { httpsAgent });

    const html = response.data;
    const $ = cheerio.load(html);

    const pageText = removeAccents($('body').text());
    const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const allResults = [];
    
    for (const obj of clientes) {
      const nombresAAnalizar = [obj?.Nombre, obj?.beneficiario1, obj?.beneficiario2, obj?.beneficiario3]
        .filter(nombre => nombre && typeof nombre === 'string' && nombre !== 'No');

      for (const nombre of nombresAAnalizar) {
        const palabras = nombre.split(' ')
          .map(word => removeAccents(word.trim()))
          .filter(word => word.length > 0);

        if (palabras.length === 0) continue;

        const regexPalabras = palabras.map(palabra => new RegExp(`\\b${escapeRegExp(palabra)}\\b`, 'i'));

        const matchedLines = lines.filter(line =>
          regexPalabras.every(regex => regex.test(line))
        );

        if (matchedLines.length > 0) {
          allResults.push({
            Nombre: nombre,
            resultados: matchedLines,
          });
          
          if (nombre !== obj?.Nombre) {
            console.log(`Coincidencias encontradas para beneficiario: ${nombre}`);
          }
        }
      }
    }

    if (allResults.length > 0) {
      console.log('Resultados encontrados:', allResults);
    } else {
      console.log('No se encontraron coincidencias.');
    }

    return { resultados: allResults, clientesAnalizados: clientes.length };
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return { error: 'Error durante la búsqueda', clientesAnalizados: 0 };
  }
};



// Configurar el cron para ejecutar la función todos los días a las 16:35
cron.schedule('31 9 * * *', async () => {
  console.log('Iniciando la búsqueda automática a las 19:00...');

  const { resultados, clientesAnalizados, mensaje, error } = await busquedarenapet();

  // Configurar el contenido del correo
  const mailOptions = {
    from: 'sistemasfideicomiso@gmail.com',
    to: 'pipao.pipo@gmail.com',
    subject: 'Resultados de la consulta diaria',
    text: resultados?.length
      ? `Se encontraron coincidencias para ${resultados.length} clientes de un total de ${clientesAnalizados} analizados.\n\nResultados:\n${JSON.stringify(resultados, null, 2)}`
      : mensaje || `No se encontraron coincidencias. Se analizaron ${clientesAnalizados} clientes.`,
  };

  // Enviar el correo
  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado correctamente');
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
});




module.exports = router





