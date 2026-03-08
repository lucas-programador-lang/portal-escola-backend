const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")

const app = express()

app.use(express.json())

/* CORS PARA CLOUDFLARE */

app.use(cors({
origin: "*",
methods: ["GET","POST"]
}))

/* CONEXÃO MYSQL */

const db = mysql.createConnection({

host: process.env.DB_HOST || "localhost",
user: process.env.DB_USER || "root",
password: process.env.DB_PASSWORD || "",
database: process.env.DB_NAME || "escola"

})

db.connect(err=>{

if(err){
console.log("❌ Erro ao conectar no banco:",err)
}else{
console.log("✅ Banco conectado")
}

})



/* =========================
   LOGIN ALUNO
========================= */

app.post("/login",(req,res)=>{

const {cpf} = req.body

db.query(
"SELECT * FROM alunos WHERE cpf=?",
[cpf],
(err,result)=>{

if(err){
return res.json({success:false,error:err})
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



/* =========================
   LISTAR ALUNOS
========================= */

app.get("/alunos",(req,res)=>{

db.query("SELECT * FROM alunos",(err,result)=>{

if(err){
return res.json([])
}

res.json(result)

})

})



/* =========================
   CADASTRAR ALUNO
========================= */

app.post("/aluno",(req,res)=>{

const {nome,cpf}=req.body

db.query(
"INSERT INTO alunos(nome,cpf) VALUES (?,?)",
[nome,cpf],
(err,result)=>{

if(err){
return res.json({success:false,error:err})
}

res.json({success:true})

})

})



/* =========================
   REGISTRAR NOTA
========================= */

app.post("/nota",(req,res)=>{

const {aluno_id,disciplina,nota}=req.body

db.query(
"INSERT INTO notas(aluno_id,disciplina,nota) VALUES (?,?,?)",
[aluno_id,disciplina,nota],
(err,result)=>{

if(err){
return res.json({success:false})
}

res.json({success:true})

})

})



/* =========================
   BOLETIM
========================= */

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



/* =========================
   PORTA RENDER
========================= */

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{

console.log("🚀 Servidor rodando na porta",PORT)

})
