const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedInn, isLoggedInn2 } = require('../lib/auth')


const nodemailer = require("nodemailer");
const { email } = require("../keys");

// 🔧 Configuración SMTP directa acá
const transporter = nodemailer.createTransport({
  host: email.host,
  port: email.port,
  secure: email.secure,
  auth: {
    user: email.user,
    pass: email.pass
  }
});

// ⏱️ Delay helper
const delay = (ms) => new Promise(res => setTimeout(res, ms));

router.get("/enviar", async (req, res) => {
  try {
    // 👉 Lista de correos (puede venir de DB también)
    const listaCorreos = [
      "correo1@gmail.com",
      "correo2@gmail.com",
      "correo3@gmail.com"
      // ... hasta 650
    ];

    const lote = 10;     // cantidad por bloque
    const espera = 2000; // 2 segundos entre envíos

    let enviados = 0;

    for (let i = 0; i < listaCorreos.length; i++) {
      const emailDestino = listaCorreos[i];

      try {
        await transporter.sendMail({
          from: `"Sistema" <${email.user}>`,
          to: emailDestino,
          subject: "Acceso",
          html: `
            <p>Hola 👋</p>
            <p>Este es tu link:</p>
            <a href="https://tu-link.com">Entrar</a>
          `
        });

        enviados++;
        console.log(`✅ Enviado a: ${emailDestino} (${enviados}/${listaCorreos.length})`);

      } catch (err) {
        console.error(`❌ Error con ${emailDestino}`, err.message);
      }

      // ⏱️ Espera entre envíos
      await delay(espera);

      // 🧠 pausa extra cada lote
      if ((i + 1) % lote === 0) {
        console.log("⏸️ Pausa por lote...");
        await delay(5000);
      }
    }

    res.json({
      ok: true,
      mensaje: `Enviados ${enviados} de ${listaCorreos.length}`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al enviar correos" });
  }
});

router.get('/todas',isLoggedInn2, async (req, res) => {

    try {
        const todas = await pool.query('select * from novedades ');
   
   
     
   
        res.json(todas)

    } catch (error) {
      //  console.log(error)
        res.json(error)
    }
  

    

})




router.get('/todosloschats',isLoggedInn2, async (req, res) => {

    try {
        const todas = await pool.query('select * from chats ');
   
   
     
   
        res.json(todas)

    } catch (error) {
       // console.log(error)
        res.json(error)
    }
  

    

})

router.get('/leerchat/:id',isLoggedInn2, async (req, res) => {
    const id = req.params.id

    try {
        const todas = await pool.query('select * from chats where id=?',[id]);
   
   
     
   
        res.json(todas)

    } catch (error) {
      //  console.log(error)
        res.json(error)
    }
  

    

})

router.get('/leer/:id',isLoggedInn2, async (req, res) => {
const id  =  req.params.id
    try {
        const todas = await pool.query('select * from novedades where id = ?',[id]);
   
   
     
   
        res.json(todas)

    } catch (error) {
       // console.log(error)
        res.json(error)
    }
  

    

})

router.post('/crear',isLoggedInn2, async (req, res) => {
    const  { detalle, cuil_cuit,asunto, dirigido  } = req.body;
   
    const mes =(new Date(Date.now())).toLocaleDateString()
 

    try {
      
       
     const nueva = {
        mes,
        detalle, 
        cuil_cuit,
        asunto,
         dirigido
     }
        
    await pool.query('insert into novedades set ?', nueva)
      
     res.json('Cargada con éxito')
    } catch (error) {
     //  console.log(error)
        res.send('Error algo sucedió')
    }

})





module.exports = router