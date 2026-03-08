const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")

const app = express()

app.use(express.json())

app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"]
}))

/* =========================
   CONEXÃO MYSQL (Railway)
========================= */

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized:false
  }
})

db.getConnection((err,conn)=>{

if(err){
console.error("❌ Erro ao conectar:",err)
}else{
console.log("✅ Banco conectado")
conn.release()
}

})

/* =========================
   LOGIN ALUNO
========================= */

app.post("/login",(req,res)=>{

const {cpf,senha}=req.body

db.query(
"SELECT * FROM alunos WHERE cpf=? AND senha=?",
[cpf,senha],
(err,result)=>{

if(err){
console.error(err)
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

/* =========================
   LOGIN PROFESSOR
========================= */

app.post("/login-professor",(req,res)=>{

const {cpf,senha}=req.body

db.query(
"SELECT * FROM professores WHERE cpf=? AND senha=?",
[cpf,senha],
(err,result)=>{

if(err){
console.error(err)
return res.json({success:false})
}

if(result.length>0){

res.json({
success:true,
professor:result[0]
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

db.query(
"SELECT * FROM alunos",
(err,result)=>{

if(err){
console.error(err)
return res.json([])
}

res.json(result)

})

})

/* =========================
   LISTAR PROFESSORES
========================= */

app.get("/professores",(req,res)=>{

db.query(
"SELECT * FROM professores",
(err,result)=>{

if(err){
console.error(err)
return res.json([])
}

res.json(result)

})

})

/* =========================
   CADASTRAR ALUNO
========================= */

app.post("/aluno",(req,res)=>{

const {nome,cpf,senha,turma_id}=req.body

db.query(
"INSERT INTO alunos(nome,cpf,senha,turma_id) VALUES (?,?,?,?)",
[nome,cpf,senha || "1234", turma_id || null],
(err)=>{

if(err){
console.error(err)
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   EDITAR ALUNO
========================= */

app.put("/aluno/:id",(req,res)=>{

const id=req.params.id
const {nome,cpf}=req.body

db.query(
"UPDATE alunos SET nome=?, cpf=? WHERE id=?",
[nome,cpf,id],
(err)=>{

if(err){
console.error(err)
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   EXCLUIR ALUNO
========================= */

app.delete("/aluno/:id",(req,res)=>{

const id=req.params.id

db.query(
"DELETE FROM alunos WHERE id=?",
[id],
(err)=>{

if(err){
console.error(err)
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   CADASTRAR PROFESSOR
========================= */

app.post("/professor",(req,res)=>{

const {nome,cpf,senha,disciplina}=req.body

db.query(
"INSERT INTO professores(nome,cpf,senha,disciplina) VALUES (?,?,?,?)",
[nome,cpf,senha || "1234", disciplina || ""],
(err)=>{

if(err){
console.error(err)
return res.json({success:false})
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
(err)=>{

if(err){
console.error(err)
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   BOLETIM DO ALUNO
========================= */

app.get("/boletim/:id",(req,res)=>{

const id=req.params.id

db.query(
"SELECT disciplina,nota FROM notas WHERE aluno_id=?",
[id],
(err,result)=>{

if(err){
console.error(err)
return res.json([])
}

res.json(result)

})

})

/* =========================
   DASHBOARD
========================= */

app.get("/dashboard",(req,res)=>{

let dados={}

db.query("SELECT COUNT(*) total FROM alunos",(err,r1)=>{

dados.alunos=r1[0].total

db.query("SELECT COUNT(*) total FROM professores",(err,r2)=>{

dados.professores=r2[0].total

db.query("SELECT COUNT(*) total FROM notas",(err,r3)=>{

dados.notas=r3[0].total

res.json(dados)

})

})

})

})

/* =========================
   TESTE API
========================= */

app.get("/",(req,res)=>{

res.send("API Portal Escolar Online")

})

/* =========================
   PORTA RENDER
========================= */

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{

console.log("🚀 Servidor rodando na porta",PORT)

})
