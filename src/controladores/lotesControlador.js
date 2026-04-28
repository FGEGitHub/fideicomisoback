const express = require('express')
const router = express.Router()
const pool = require('../database')

const { isLoggedIn, isLoggedInn2} = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const { EC2 } = require('aws-sdk')

///////
const loteCliente = async (req, res) => {
    cuil_cuit = req.params.cuil_cuit;

    lotes = await pool.query(`
        SELECT 
            l.cuil_cuit, 
            l.id, 
            l.zona, 
            l.fraccion, 
            l.manzana, 
            l.lote, 
            l.parcela, 
            l.valor_total,
            CASE WHEN c.id_lote IS NOT NULL THEN 'Si' ELSE 'No' END AS tiene_cuotas
        FROM lotes l
        LEFT JOIN cuotas c ON l.id = c.id_lote
        WHERE l.cuil_cuit = ?
        GROUP BY l.id
    `, [cuil_cuit]);

    res.json(lotes);
}

const calcularValor = async (req, res) => {
    const { zona, manzana, parcela, cuil_cuit,lote } = req.body
   

    if (zona==='PIT'){
        valormetro= await pool.query('select * from nivel3 where valormetroparque = "PIT" order by id')
         lotee = await pool.query('select * from lotes where zona = ? and manzana =? and  parcela =? ', [zona, manzana, parcela])
    }else{
        valormetro= await pool.query('select * from nivel3 where valormetroparque != "PIT" order by id')
         lotee = await pool.query('select * from lotes where zona = ? and manzana =? and  lote =? ', [zona, manzana, lote])
    }

   

    try {
        valor = valormetro[(valormetro.length-1)]['valormetrocuadrado']  
      
    } catch (error) {
    //    console.log(error)
    }
 
   if  (valor != undefined){
   
    try {
       const  aux= '%'+cuil_cuit+'%'
   const cliente = await pool.query('select * from clientes where cuil_cuit like ? ', aux)
  
   const ingresos = cliente[0]['ingresos']
   if (cliente[0]['expuesta']==='SI' ){
    max = ingresos*0.2
   }else{  max = ingresos*0.3}
  

 
    let final = lotee[0]['superficie'] * valor
    const anticipo = final*0.2
    const estado = lotee[0]['estado']

    const nombre = 'Zona: '+ lotee[0]['zona'] +' Manzana: '+lotee[0]['manzana']  +' Parcela: '+lotee[0]['parcela']
    finalSant= final*0.8
    const cuotas60 = finalSant/60
   
        let puede=true
    let cuotamuygrande =""
    if (max <= cuotas60){
        if (cliente[0]['expuesta']==='SI' ){
            cuotamuygrande='La cuota es mas grande que  el 20% (PEP)'
        }else{
            cuotamuygrande='La cuota es mas grande que  el 30%'
        }
        
        puede=false
    }
   
    let lotetieneasignado =""
    if ((estado != "DISPONIBLE" &&  "Disponible") ){
        lotetieneasignado='El lote no se encuentra disponible'
        puede=false
    }

    const detalle = {
        precio: final.toFixed(2),
        anticipo,
        finalSant,
        superficie: lotee[0]['superficie'],
        nombre: nombre,
        cuotas60: cuotas60.toFixed(2),
        ingresos: ingresos,
        estado:estado,
        cuotamuygrande,
        lotetieneasignado,
        puede,
        valor
    }

    res.json(detalle)
 } catch (error) {
   // console.log(error)
        res.send('Algo salio mal ')
    }}else {  res.send('Algo salio mal ') }

}


const loteCliente2 = async (req, res) => {
    cuil_cuit = req.params.cuil_cuit


    lotes = await pool.query('select  cuil_cuit, id,zona, fraccion, manzana, lote from lotes where cuil_cuit like  ?', [cuil_cuit]);


    res.json(lotes)

}



const traerlotesleg = async (req, res) => {
 
    try {
        const lotes = await pool.query('select distinct(fraccion) from lotes where zona="Legales"')
        
res.json(lotes)
    } catch (error) {
        //console.log(error)
        res.json("Error")
    }

}

const listadeTodos = async (req, res) => {
 
    const lotes = await pool.query('select * from lotes left join (select cuil_cuit as cui, nombre from clientes) as sel on lotes.cuil_cuit=sel.cui ')
    const disponibles = await pool.query('select * from lotes where estado = "DISPONIBLE" or estado = "disponible"')
    const parque = await pool.query('select * from lotes where (estado = "DISPONIBLE" or estado = "disponible"or estado = "libre") and zona ="PIT"and manzana<>"Area verde" and manzana<>"Equipamiento del parque"')
    const parquetotal = await pool.query('select * from lotes where zona ="PIT"')
    const parquevendidos = await pool.query('select * from lotes where (estado = "VENDIDO" or estado = "vendido") and zona ="PIT" ')
    const ic3 = await pool.query('select * from lotes where (estado = "DISPONIBLE" or estado = "disponible") and zona ="IC3" ')
    parquevendidoss=(parquevendidos.length/parquetotal.length *100).toFixed(2)
    parquevendidoss= parquevendidoss + "% ("+parquevendidos.length+")"


    res.json([lotes,disponibles.length,parque.length,ic3.length,parquetotal.length,parquevendidoss])
}

const lista2 = async (req, res) => {
 
    const lotes = await pool.query('select * from lotes where zona ="Legales"')
    const disponibles = await pool.query('select * from lotes where (estado = "DISPONIBLE" or estado = "disponible") and zona ="Legales"')


    res.json([lotes,disponibles.length])
}

const listadeLotes = async (req, res) => {

    const zona = await pool.query('select zona from lotes group by=zona')


    res.json(zona)
}

const desasignarlote = async (req, res) => {
const id = req.params.id
    

await pool.query('UPDATE lotes SET cuil_cuit=?,estado=? WHERE id=? ',["0","libre",id])


    res.json("realizado")
}






const traermanzanas = async (req, res) => {

    const exi = await pool.query('select * from manzanas ')
    res.json(exi)
}

const nuevamanzana = async (req, res) => {
    const {manzana} = req.body
    try { 
        const nuevo={
       manzana
    }
    
     const exi = await pool.query('select * from manzanas where  manzana=? ',[ manzana])
    if (exi.length>0){
        res.json("Error, lote ya existe")
    }else{
         await pool.query('insert into manzanas set ?',[nuevo])
    res.json("Realizado")
    }
    
    
        
    } catch (error) {
    //    console.log(error)
        res.json("No realizado")
    }
       
    

}

const modificarlote = async (req, res) => {
    const {parcela, manzana, fraccion, adrema,id} = req.body


    try {
        const newLink ={
            parcela, manzana, fraccion, adrema
        }
         await pool.query('UPDATE lotes set ? WHERE id = ?', [newLink, id])
         res.json('Realizado')

    } catch (error) {
       // console.log(error)
        res.json('No relizado')
    }
   


}

const nuevolote = async (req, res) => {
const {parcela, manzana, fraccion, adrema} = req.body
try { 
manzanaa = await pool.query('select *  from manzanas where id =?',[manzana])
 const exi = await pool.query('select * from lotes where  parcela=? and  manzana=? and  fraccion=? and zona=?',[ parcela, manzanaa[0]['manzana'], fraccion,"Legales"])
 const nuevo={
    parcela, manzana: manzanaa[0]['manzana'], fraccion:"Legales",adrema,
    zona:"Legales" 
}
if (exi.length>0){
    res.json("Error, lote ya existe")
}else{
     await pool.query('insert into lotes set ?',[nuevo])
res.json("Realizado")
}


    
} catch (error) {
   // console.log(error)
    res.json("No realizado")
}
   

}



module.exports = {
    traerlotesleg,
    lista2,
    nuevolote,
    loteCliente,
    calcularValor,
    loteCliente2,
    listadeTodos,
    listadeLotes,
    desasignarlote,
    nuevamanzana,
    traermanzanas,
    modificarlote

}