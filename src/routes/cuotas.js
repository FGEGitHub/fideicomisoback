const express = require('express')
const router = express.Router()
const pool = require('../database')

const { isLoggedIn, isLoggedInn2, isLoggedInn4, isLoggedInn } = require('../lib/auth') //proteger profile

const {compensaric3, compensar, cancelarlote,addautvarias, cuotasdeunlote, postadd, postaddaut2, lotefuncion2, post_agregaricc, asignarloteacuotas, modificarmontototal, traercuotaselcliente, listavarios, deletes, postcuotas, actualizarcuota, borrartodas, ief, traercuota, traercuotasfinales, agregarcuotasleg, vercuotas2, vercuotas4, ief2, borrarpago, traercuotasdisponiblesporlote, iefgralleg } = require('../controladores/cuotasControlador')







//--------INICIO AGREGAR CUOTAS---------------------------------------------------------------------------



// AGREGAR UNA SOLA CUOTA 
router.post('/add', postadd)
router.post('/borrarpago', borrarpago)



router.post('/compensar', compensar)

router.post('/compensaric3', compensaric3)


// AGREGA VARIAS CUOTAS 

router.post('/addaut2', isLoggedInn2, postaddaut2)

router.post('/agregarcuotasleg', isLoggedInn2, agregarcuotasleg)


router.post('/addautvarias', isLoggedInn2, addautvarias)


/// cuotasdeunloteReact
router.get("/cuotasdeunlote/:id", isLoggedInn, cuotasdeunlote)



//--------FIN AGREGAR CUOTAS----------------------------------------------------------------------------
// elegir lote




// auxililar react
router.get("/lote2/:id", isLoggedInn2, lotefuncion2)



router.get("/vercuotas2/:id", isLoggedInn2, vercuotas2)



router.get("/vercuotas4/:id",/* isLoggedInn2, */vercuotas4)

// LISTADO DE CUOTAS DE UN CUIL DETERMINADO 





//-------------------------------------------------------------------------AGREGAR ICC


// ACCION DE  AGREGAR ICC  REACT
router.post('/agregaricc', isLoggedInn2, post_agregaricc)



//////////asignar a lotes cuadro decuotasexistente
router.post('/asignarloteacuotas', asignarloteacuotas)
//-------------------------------------------------------------------------FIN  AGREGAR ICC---------------------------------------

router.post('/modificarmontotal', modificarmontototal)

router.get('/traercuotaselcliente/:id', isLoggedInn2, traercuotaselcliente)

router.get('/listavarios/:cuil_cuit', isLoggedInn2, listavarios)

router.get('/delete/:id', isLoggedInn2, deletes)
//----- Ver... no esta enchufado

router.post('/cuotas', postcuotas)

/////Actualizar cuota 
router.post('/actualizarcuota', actualizarcuota)


//borrar cuotas
router.get('/borrartodas/:id', isLoggedInn2, borrartodas)


router.post('/cancelarlote', isLoggedInn2, cancelarlote)



router.get('/ief/:id', isLoggedInn2, ief)

router.get('/ief2/:id', ief2)


router.get('/iefgralleg', isLoggedInn4, iefgralleg)



///trae una cuota 

router.get('/traercuota/:id', isLoggedInn2, traercuota)


///trae las cuotas finales de un lote//objetivo: mostrar para pagar varias en una 
router.get('/traercuotasfinales/:id', isLoggedInn2, traercuotasfinales)


router.get('/traercuotasdisponiblesporlote/:id', isLoggedInn2, traercuotasdisponiblesporlote)

/* router.get('/actualic3', async (req, res) => {


    cuotas = await pool.query("select * from cuotas_ic3 ")
    for (i in cuotas) {
        try {
            let fecha = cuotas[i]['mes'];

            // Separa la fecha en partes usando split
            let partes = fecha.split('-');

            // Extrae el año y el mes
            let anio = partes[0];
            let mes = parseInt(partes[1], 10);
            await pool.query('UPDATE cuotas_ic3 SET mes = ?, anio =? WHERE id=? ', [mes, anio,cuotas[i]['id']])
console.log('ok')

        } catch (error) {
            console.log(error)
        }

    }




}) */

/////  ruta nivel2 /cuotasic3
    router.get('/traercuotasic3/:cuil_cuit', async (req, res) => {
        const cuil_cuit = req.params.cuil_cuit;
        console.log(cuil_cuit);
        
        try {
            // Obtener todos los clientes con el cuil_cuit proporcionado
            const clientes = await pool.query('SELECT * FROM clientes WHERE cuil_cuit = ?', [cuil_cuit]);
            
            if (clientes.length === 0) {
                return res.status(404).json({ error: 'No se encontraron clientes con el CUIL/CUIT proporcionado.' });
            }
    
            let env = [];
    
            // Iterar sobre cada cliente y obtener sus cuotas
            for (const cliente of clientes) {


                 cuotas = await pool.query('SELECT * FROM cuotas_ic3 WHERE id_cliente = ?', [cliente.id]);
                 let saldo_real
                if(cuotas.length>0){
   
                saldo_real=cuotas[0].saldo_inicial
                }
              
                for (const cuota of cuotas) {
                    const pagos = await pool.query('SELECT SUM(monto) AS total_pago FROM pagos_ic3 WHERE id_cuota = ?', [cuota.id]);
                    const total_pago = pagos[0]?.total_pago || 0; // Asignar 0 si es null
    
                    const excedente = (parseFloat(total_pago) - parseFloat(cuota.cuota_con_ajuste)).toFixed(2);
                    const saldo_final = (parseFloat(cuota.saldo_inicial) - parseFloat(cuota.amortizacion)).toFixed(2);
                     saldo_real = (parseFloat(saldo_real) -parseFloat(cuota.amortizacion) - parseFloat(excedente)).toFixed(2);
    
                    let nuevo = {
                        id: cuota.id,
                        id_cliente: cuota.id_cliente,
                        mes: cuota.mes,
                        anio: cuota.anio,
                        pago: total_pago,
                        id_cliente: cuota.id_cliente,
                        excedente,
                        cuota: cuota.cuota,
                        saldo_inicial: cuota.saldo_inicial,
                        amortizacion: parseFloat(cuota.amortizacion).toFixed(2),
                        ajuste: parseFloat(cuota.ajuste).toFixed(2),
                        ajuste_icc: parseFloat(cuota.ajuste_icc).toFixed(2),
                        cuota_con_ajuste: parseFloat(cuota.cuota_con_ajuste).toFixed(2),
                        iva: cuota.iva,
                        saldo_cierre: cuota.saldo_cierre,
                        saldo_final,
                        saldo_real,
                        compensada: cuota.compensada
                    };
    
                    env.push(nuevo);
                }
            }
    
            res.json(env);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al procesar la solicitud.' });
        }
    });
    
    
router.get('/corregir', async (req, res) => {

    cuotas = await pool.query('select * from cuotas where zona="Legales"')

    for (i in cuotas) {

        if (cuotas[i]['pago'] == null) {
            await pool.query('UPDATE cuotas SET Saldo_real = ? WHERE id=? ', [parseFloat(cuotas[i]['saldo_inicial']) - 0, cuotas[i]['id']])

        } else {
            console.log(cuotas[i]['saldo_inicial'])
            console.log('---')
            console.log(cuotas[i]['pago'])

            await pool.query('UPDATE cuotas SET Saldo_real = ? WHERE id=? ', [parseFloat(cuotas[i]['saldo_inicial']) - parseFloat(cuotas[i]['pago']), cuotas[i]['id']])
        }

    }
    res.json('Realizado')
})


module.exports = router


