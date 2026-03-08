const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")
const path = require("path")

const app = express()

app.use(express.json())
app.use(cors())

app.use(express.static(__dirname))

const db = mysql.createConnection({
host:"localhost",
user:"root",
password:"",
database:"escola"
})

db.connect(err=>{
if(err){
console.log("Erro ao conectar ao banco")
}else{
console.log("Banco conectado")
}
})

/* LOGIN */

app.post("/login",(req,res)=>{

const {cpf}=req.body

db.query(
"SELECT * FROM alunos WHERE cpf=?",
[cpf],
(err,result)=>{

if(err){
return res.json({success:false})
}

if(result.length>0){

res.json({
success:true,
aluno:result[0]
})

}else{

res.json({success:false})

}

})

})

/* BOLETIM */

app.get("/boletim/:id",(req,res)=>{

const id=req.params.id

db.query(
"SELECT disciplina,nota FROM notas WHERE aluno_id=?",
[id],
(err,result)=>{

if(err){
return res.json([])
}

res.json(result)

})

})

/* CADASTRAR ALUNO */

app.post("/cadastrar-aluno",(req,res)=>{

const {nome,cpf}=req.body

db.query(
"INSERT INTO alunos (nome,cpf) VALUES (?,?)",
[nome,cpf],
(err,result)=>{

if(err){
return res.json({success:false})
}

res.json({success:true})

})

})

app.listen(3000,()=>{

console.log("Servidor rodando em http://localhost:3000")

})
