const express = require('express')
const router = express.Router()
const pool = require('../database')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const XLSX = require('xlsx')


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Carpeta donde se guardarán los archivos subidos
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


function convertExcelDate(excelDate) {
  const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}
/* 

router.post('/subirexcel', upload.single('excel'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se ha subido ningún archivo');
  }

  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);

  const columns = [
    'Cuota', 'Mes', 'Saldo de Inicio', 'SALDO ACUM.', 'Ajuste por ICC', 'Amortización',
    'Base cálculo ajuste', 'Ajuste', 'Cuota Con Ajuste', 'Pago', 'Excedente',
    'IVA S/ajuste', 'Saldo al Cierre', 'SALDO REAL'
  ];

  // Función para encontrar el encabezado correcto
  const findHeader = (worksheet) => {
    if (!worksheet['!ref']) return null;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      let row = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell = worksheet[XLSX.utils.encode_cell(cell_address)];
        if (cell && cell.t === 's') row.push(cell.v);
      }
      if (row.some(r => columns.includes(r))) return R;
    }
    return null;
  };

  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const worksheet = workbook.Sheets[sheetName];

    const headerRowIndex = findHeader(worksheet);
    if (headerRowIndex === null) continue; // No se encontró el encabezado en esta hoja

    let clienteId = null;

    try {
      const cliente = await pool.query('SELECT * FROM clientes WHERE Nombre=?', [sheetName]);
      if (cliente.length > 0) {
        clienteId = cliente[0].id;
      } else {
        const result = await pool.query('INSERT INTO clientes (nombre, zona) VALUES (?, ?)', [sheetName, 'IC3']);
        clienteId = result.insertId;
        await pool.query('UPDATE clientes SET cuil_cuit = ? WHERE id = ?', [clienteId, clienteId]);
      }
    } catch (error) {
      console.error(`Error procesando cliente ${sheetName}:`, error);
    }

    if (!clienteId) {
      console.log(`No se pudo determinar el cliente para la hoja "${sheetName}". Continuando con la siguiente hoja.`);
      continue;
    }

    let columnIndices = {};
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: headerRowIndex })];
      if (cell && cell.t === 's' && columns.includes(cell.v)) {
        columnIndices[cell.v] = C;
      }
    }

    for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
      const rowObject = { SheetName: sheetName };
      let hasData = false;
      for (const col of columns) {
        const cellValue = worksheet[XLSX.utils.encode_cell({ r: R, c: columnIndices[col] })];
        if (cellValue) {
          let value = cellValue.v;
          if (col === 'Mes' && cellValue.t === 'n') {
            try {
              value = convertExcelDate(cellValue.v);
            } catch (e) {
              value = cellValue.v;
            }
          }
          rowObject[col.replace(/\s+/g, '')] = value;
          hasData = true;
        }
      }
      if (hasData) {
        try {
          if (rowObject['Cuota'] !== undefined) { // Verificación mínima para la cuota
            let ex = await pool.query('SELECT * FROM cuotas_ic3 WHERE cuota=? AND nombre=?', [
              rowObject['Cuota'],
              rowObject['SheetName']
            ]);
            if (ex.length > 0) {
              let cuotaId = ex[0]['id'];
              const updates = {};
              if (rowObject['SALDO ACUM.'] != undefined) updates.saldo_acum = rowObject['SALDO ACUM.'];
              if (rowObject['SaldoalCierre'] != undefined) updates.saldo_cierre = rowObject['SaldoalCierre'];
              if (Object.keys(updates).length > 0) {
                await pool.query('UPDATE cuotas_ic3 SET ? WHERE id = ?', [updates, cuotaId]);
                console.log(`Actualizada cuota ${rowObject['Cuota']} en la hoja "${sheetName}"`);
              }
              if (rowObject['Pago'] != undefined) {
                await pool.query('INSERT INTO pagos (monto, id_cuota) VALUES (?, ?)', [
                  rowObject['Pago'],
                  cuotaId
                ]);
              }
            } else {
              let resultado = await pool.query(
                `INSERT INTO cuotas_ic3 (cuota, mes, saldo_inicial, ajuste_icc, amortizacion, base_calculo, ajuste, cuota_con_ajuste, nombre, iva, saldo_real, saldo_cierre, id_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  rowObject['Cuota'],
                  rowObject['Mes'],
                  rowObject['SaldodeInicio'],
                  rowObject['AjusteporICC'],
                  rowObject['Amortización'],
                  rowObject['Basecálculo'],
                  rowObject['Ajuste'],
                  rowObject['CuotaConAjuste'],
                  rowObject['SheetName'],
                  rowObject['IVAS/ajuste'],
                  rowObject['Saldoreal'],
                  rowObject['SaldoalCierre'],
                  clienteId
                ]
              );
              console.log(`Cargada cuota ${rowObject['Cuota']} en la hoja "${sheetName}"`);
              let cuotaId = resultado.insertId;
              if (rowObject['Pago'] != undefined) {
                await pool.query('INSERT INTO pagos (monto, id_cuota) VALUES (?, ?)', [
                  rowObject['Pago'],
                  cuotaId
                ]);
              }
            }
          }
        } catch (error) {
          console.error(`Error insertando la fila en la base de datos para la cuota ${rowObject['Cuota']} en la hoja "${sheetName}":`, error);
        }
      }
    }
  }

  // Eliminar el archivo temporal después de procesar
  fs.unlinkSync(filePath);

  res.json({ success: true });
}); */   
// router.post('/subbirexcell', upload.single('excel'), async (req, res) => {
//   ////subir un solo cliente
//   if (!req.file) {
//     return res.status(400).send('No se ha subido ningún archivo');
//   }

//   const filePath = req.file.path;
//   const workbook = XLSX.readFile(filePath);

//   const columns = [
//     'Cuota', 'Mes', 'Saldo de Inicio', 'SALDO ACUM.', 'Ajuste por ICC', 'Amortización',
//     'Base cálculo ajuste', 'Ajuste', 'Cuota Con Ajuste', 'Pago', 'Excedente',
//     'IVA S/ajuste', 'Saldo al Cierre', 'SALDO REAL'
//   ];

//   // Función para encontrar el encabezado correcto
//   const findHeader = (worksheet) => {
//     if (!worksheet['!ref']) return null;
//     const range = XLSX.utils.decode_range(worksheet['!ref']);
//     for (let R = range.s.r; R <= range.e.r; ++R) {
//       let row = [];
//       for (let C = range.s.c; C <= range.e.c; ++C) {
//         const cell_address = { c: C, r: R };
//         const cell = worksheet[XLSX.utils.encode_cell(cell_address)];
//         if (cell && cell.t === 's') row.push(cell.v);
//       }
//       if (row.some(r => columns.includes(r))) return R;
//     }
//     return null;
//   };

//   for (let i = 0; i < workbook.SheetNames.length; i++) {
//     const sheetName = workbook.SheetNames[i];
//     const worksheet = workbook.Sheets[sheetName];

//     const headerRowIndex = findHeader(worksheet);
//     if (headerRowIndex === null) continue; // No se encontró el encabezado en esta hoja

//     let clienteId = null;

//     try {
//       const cliente = await pool.query('SELECT * FROM clientes WHERE Nombre=?', [sheetName]);
//   /*     if (cliente.length > 0) {
//         clienteId = cliente[0].id;
//         console.log('existe cliente ')
//       } else { */
//         const result = await pool.query('INSERT INTO clientes (nombre, zona) VALUES (?, ?)', [sheetName, 'IC3']);
//         clienteId = result.insertId;
//         await pool.query('UPDATE clientes SET cuil_cuit = ? WHERE id = ?', [clienteId, clienteId]);
//      // }
//     } catch (error) {
//       console.error(`Error procesando cliente ${sheetName}:`, error);
//     }

//     if (!clienteId) {
//       console.log(`No se pudo determinar el cliente para la hoja "${sheetName}". Continuando con la siguiente hoja.`);
//       continue;
//     }

//     let columnIndices = {};
//     const range = XLSX.utils.decode_range(worksheet['!ref']);
//     for (let C = range.s.c; C <= range.e.c; ++C) {
//       const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: headerRowIndex })];
//       if (cell && cell.t === 's' && columns.includes(cell.v)) {
//         columnIndices[cell.v] = C;
//       }
//     }

//     for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
//       const rowObject = { SheetName: sheetName };
//       let hasData = false;
//       for (const col of columns) {
//         const cellValue = worksheet[XLSX.utils.encode_cell({ r: R, c: columnIndices[col] })];
//         if (cellValue) {
//           let value = cellValue.v;
//           if (col === 'Mes' && cellValue.t === 'n') {
//             try {
//               value = convertExcelDate(cellValue.v);
//             } catch (e) {
//               value = cellValue.v;
//             }
//           }
//           rowObject[col.replace(/\s+/g, '')] = value;
//           hasData = true;
//         }
//       }
//       if (hasData) {
//         try {
//           if (rowObject['Cuota'] !== undefined) { // Verificación mínima para la cuota
//             let ex = await pool.query('SELECT * FROM cuotas_ic3 WHERE cuota=? AND nombre=?', [
//               rowObject['Cuota'],
//               rowObject['SheetName'],
              
//             ]);
//      /*        if (ex.length > 0) {
//               let cuotaId = ex[0]['id'];
//               const updates = {};
//               if (rowObject['SALDO ACUM.'] != undefined) updates.saldo_acum = rowObject['SALDO ACUM.'];
//               if (rowObject['SaldoalCierre'] != undefined) updates.saldo_cierre = rowObject['SaldoalCierre'];
//               if (Object.keys(updates).length > 0) {
//                 await pool.query('UPDATE cuotas_ic3 SET ? WHERE id = ?', [updates, cuotaId]);
//                 console.log(`Actualizada cuota ${rowObject['Cuota']} en la hoja "${sheetName}"`);
//               }
//               if (rowObject['Pago'] != undefined) {
//                 await pool.query('INSERT INTO pagos_ic3 (monto, id_cuota) VALUES (?, ?)', [
//                   rowObject['Pago'],
//                   cuotaId
//                 ]);
//               }
//             } else { */
//               let resultado = await pool.query(
//                 `INSERT INTO cuotas_ic3 (cuota, mes, saldo_inicial, ajuste_icc, amortizacion, base_calculo, ajuste, cuota_con_ajuste, nombre, iva, saldo_real, saldo_cierre, id_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//                 [
//                   rowObject['Cuota'],
//                   rowObject['Mes'],
//                   rowObject['SaldodeInicio'],
//                   rowObject['AjusteporICC'],
//                   rowObject['Amortización'],
//                   rowObject['Basecálculo'],
//                   rowObject['Ajuste'],
//                   rowObject['CuotaConAjuste'],
//                   rowObject['SheetName'],
//                   rowObject['IVAS/ajuste'],
//                   rowObject['Saldoreal'],
//                   rowObject['SaldoalCierre'],
//                   clienteId
//                 ]
//               );
//               console.log(`Cargada cuota ${rowObject['Cuota']} en la hoja "${sheetName}"`);
//               let cuotaId = resultado.insertId;
//               console.log(resultado.insertId)
//               if (rowObject['Pago'] != undefined) {
//                 await pool.query('INSERT INTO pagos_ic3 (monto, id_cuota) VALUES (?, ?)', [
//                   rowObject['Pago'],
//                   cuotaId
//                 ]);
//               }
//          //   }
//           }
//         } catch (error) {
//           console.error(`Error insertando la fila en la base de datos para la cuota ${rowObject['Cuota']} en la hoja "${sheetName}":`, error);
//         }
//       }
//     }
//   }

//   // Eliminar el archivo temporal después de procesar
//   fs.unlinkSync(filePath);

//   res.json({ success: true });
// })




router.post('/subirexcellotes', upload.single('excel'), async (req, res) => {
  try {
    // Leer el archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Suponiendo que hay solo una hoja en el archivo

    // Obtener los datos de la hoja
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Procesar los datos
    /*   const sheetData = sheetData.map(row => ({
        nombre: row.Nombre,
        apellido: row.Apellido
  
       ));    // Agrega más campos según las columnas que necesites procesar
      } */



    ///////////////////////////////////////////////////////////////////
    for (property in sheetData) {
      // a += 1
      ///////MES DE PAGO
      console.log(sheetData[property]['Mes'])
      console.log(sheetData[property]['Cuota'])
      ///actualizar



    }


    // Devolver los datos procesados como respuesta
    res.json('realizado');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar el archivo Excel.');
  }
})










router.post("/datos", async (req, res) => {
  const { barrio } = req.body

  const datos = await pool.query('SELECT * FROM relevamiento where zona  = ?', [barrio])

  let cdenuncia = 0
  let sdenuncia = 0
  let enproceso = 0

  let uno = 0
  let dos = 0
  let tres = 0
  // console.log(datos[0]['Rango_Antiguedad'])
  for (var i = 0; i < datos.length; i++) {


    switch (datos[i]['Status']) {
      case "Denuncia":
        cdenuncia = cdenuncia + 1

        break;
      case "SinDenuncia":
        sdenuncia = sdenuncia + 1
        break;
      case "EnProceso":
        enproceso = enproceso + 1
        break;
      default:
        break;
    }
    switch (datos[i]['Rango_Antiguedad']) {
      case "0-4":
        uno = uno + 1

        break;
      case "4-8":
        dos = dos + 1
        break;
      case "8-12":
        tres = tres + 1
        break;
      default:
        break;
    }



  }
  porcD = (cdenuncia / datos.length * 100).toFixed(2)

  porcSD = (sdenuncia / datos.length * 100).toFixed(2)
  porcEP = (enproceso / datos.length * 100).toFixed(2)

  const status = {
    "familias": datos.length,

    "cdenuncia": cdenuncia,
    "porcDenuncia": porcD,

    "SinDenuncia": sdenuncia,
    "porcSDenuncia": porcSD,

    "EnProceso": enproceso,
    "porcEnProceso": porcEP

  }

  unoo = {
    rango: "0-4",
    cantidad: uno,
  }
  doss = {
    rango: "4-8",
    cantidad: uno,
  }
  tress = {
    rango: "8-12",
    cantidad: tres,
  }

  const rangoo = [unoo, doss, tress]

  const rta = [status, rangoo, datos]
  res.json(rta)


})


router.post("/nuevazona", async (req, res) => {
  const { zona } = req.body
  try {
    const nuev = {
      nombre: zona
    }
    await pool.query('INSERT INTO zonarelev SET ?', [nuev]);

    res.send('Guardado con exito')
  } catch (error) {
    res.send('Erro algo sucedio')
  }


})




router.post("/cargar", async (req, res) => {
  const { Zona, Material_Construccion, Status, Rango_Antiguedad, Observaciones, Familia } = req.body
  const newDato = {
    Zona, Material_Construccion, Status, Rango_Antiguedad, Observaciones, Familia
  }

  try {
    await pool.query('INSERT INTO relevamiento SET ?', [newDato]);
    res.send('Cargado correctamente!')
  } catch (error) {
    res.send('Algo Salio mal')
  }




})

router.post("/borrardatoszona", async (req, res) => {
  const { Zona } = req.body

  try {
    await pool.query('DELETE FROM relevamiento WHERE zona = ?', [Zona])
    res.send('Borrado correctamente!')
  } catch (error) {
    res.send('Algo Salio mal')
  }




})


router.get('/zonas', async (req, res) => {

  const zonass = await pool.query(" Select DISTINCT Zona from relevamiento ")

  res.json(zonas)
}

)


router.post('/subbirexcel', upload.single('excel'), async (req, res) => {
  try {
    // Leer el archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = 'Info para matriz de riesgo'; // Hoja específica

    // Obtener los datos de la hoja, omitiendo las primeras filas irrelevantes
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Identificar el encabezado y datos reales
    const headerRowIndex = sheetData.findIndex(row => row.includes('Nombre o razón social del cliente'));
    if (headerRowIndex === -1) {
      throw new Error('No se encontró un encabezado válido en la hoja seleccionada.');
    }

    const headers = sheetData[headerRowIndex];
    const dataRows = sheetData.slice(headerRowIndex + 1);

    // Mostrar cada fila como objeto basado en los encabezados
    const processedData = dataRows.map(row => {
      const rowData = {};
      headers.forEach((header, index) => {
        if (header) rowData[header] = row[index];
      });
      return rowData;
    });

    // Log de cada elemento procesado con diferenciación por campo
    processedData.forEach((row, index) => {
      console.log(`Fila ${index + 1}:`);
      Object.keys(row).forEach(key => {
        switch (key) {
          case 'Nacionalidad':
            console.log(`${key}: Esta es la nacionalidad - ${row[key]}`);
            break;
          case 'Nombre o razón social del cliente':
            console.log(`${key}: Este es el nombre o razón social - ${row[key]}`);
            break;
          case 'CUIT':
            console.log(`${key}: Este es el CUIT - ${row[key]}`);
            break;
          case 'Domicilio Legal':
            console.log(`${key}: Este es el domicilio legal - ${row[key]}`);
            break;
          default:
            console.log(`${key}: ${row[key]}`);
        }
      });
    });

    res.json({ message: 'Archivo procesado correctamente', processedData });
  } catch (error) {
    console.error('Error al procesar el archivo Excel:', error.message);
    res.status(500).send('Error al procesar el archivo Excel.');
  }
});
 



module.exports = router
