const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express()

app.use(express.json())

app.use(cors({
  origin:"*",
  methods:["GET","POST","PUT","DELETE"]
}))

const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_forte"

/* =========================
   CONEXÃO MYSQL
========================= */

const db = mysql.createPool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  database:process.env.DB_NAME,
  waitForConnections:true,
  connectionLimit:10,
  ssl:{ rejectUnauthorized:false }
})

db.getConnection((err,conn)=>{

if(err){
console.error("❌ Erro banco:",err)
}else{
console.log("✅ Banco conectado")
conn.release()
}

})

/* =========================
   MIDDLEWARE TOKEN
========================= */

function verificarToken(req,res,next){

const auth=req.headers.authorization

if(!auth){
return res.status(401).json({erro:"Token necessário"})
}

const token=auth.split(" ")[1]

try{

const decoded=jwt.verify(token,JWT_SECRET)

req.usuario=decoded

next()

}catch(err){

return res.status(401).json({erro:"Token inválido"})

}

}

/* =========================
   LOGIN ALUNO
========================= */

app.post("/login",(req,res)=>{

const {cpf,senha}=req.body

db.query(
"SELECT * FROM alunos WHERE cpf=?",
[cpf],
async (err,result)=>{

if(err || result.length===0){
return res.json({success:false})
}

let aluno=result[0]

const senhaValida = await bcrypt.compare(senha, aluno.senha)

if(!senhaValida){
return res.json({success:false})
}

const token = jwt.sign(
{ id: aluno.id, tipo:"aluno" },
JWT_SECRET,
{ expiresIn:"8h" }
)

res.json({
success:true,
token,
usuario:aluno
})

})

})

/* =========================
   LOGIN PROFESSOR
========================= */

app.post("/login-professor",(req,res)=>{

const {cpf,senha}=req.body

db.query(
"SELECT * FROM professores WHERE cpf=?",
[cpf],
async (err,result)=>{

if(err || result.length===0){
return res.json({success:false})
}

let professor=result[0]

const senhaValida = await bcrypt.compare(senha, professor.senha)

if(!senhaValida){
return res.json({success:false})
}

const token = jwt.sign(
{ id: professor.id, tipo:"professor" },
JWT_SECRET,
{ expiresIn:"8h" }
)

res.json({
success:true,
token,
usuario:professor
})

})

})

/* =========================
   CADASTRAR ALUNO
========================= */

app.post("/aluno",async (req,res)=>{

const {nome,cpf,senha,turma_id}=req.body

const hash = await bcrypt.hash(senha || "1234",10)

db.query(
"INSERT INTO alunos(nome,cpf,senha,turma_id) VALUES (?,?,?,?)",
[nome,cpf,hash,turma_id || null],
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

app.post("/professor",async (req,res)=>{

const {nome,cpf,senha,disciplina}=req.body

const hash = await bcrypt.hash(senha || "1234",10)

db.query(
"INSERT INTO professores(nome,cpf,senha,disciplina) VALUES (?,?,?,?)",
[nome,cpf,hash,disciplina],
(err)=>{

if(err){
console.error(err)
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   TROCAR SENHA
========================= */

app.post("/trocar-senha",(req,res)=>{

const {cpf,senhaAtual,novaSenha,tipo}=req.body

let tabela = tipo==="professor"?"professores":"alunos"

db.query(
`SELECT * FROM ${tabela} WHERE cpf=?`,
[cpf],
async (err,result)=>{

if(result.length===0){
return res.json({success:false})
}

let usuario=result[0]

const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha)

if(!senhaValida){
return res.json({success:false})
}

const hash = await bcrypt.hash(novaSenha,10)

db.query(
`UPDATE ${tabela} SET senha=? WHERE cpf=?`,
[hash,cpf],
(err)=>{

if(err){
return res.json({success:false})
}

res.json({success:true})

})

})

})

/* =========================
   RECUPERAR SENHA
========================= */

app.post("/recuperar-senha",(req,res)=>{

const {cpf,tipo}=req.body

let tabela = tipo==="professor"?"professores":"alunos"

db.query(
`SELECT * FROM ${tabela} WHERE cpf=?`,
[cpf],
(err,result)=>{

if(result.length===0){
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   REDEFINIR SENHA
========================= */

app.post("/redefinir-senha",async (req,res)=>{

const {cpf,novaSenha,tipo}=req.body

let tabela = tipo==="professor"?"professores":"alunos"

const hash = await bcrypt.hash(novaSenha,10)

db.query(
`UPDATE ${tabela} SET senha=? WHERE cpf=?`,
[hash,cpf],
(err)=>{

if(err){
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   LISTAR ALUNOS (PROTEGIDO)
========================= */

app.get("/alunos",verificarToken,(req,res)=>{

db.query("SELECT * FROM alunos",(err,result)=>{

if(err){
return res.json([])
}

res.json(result)

})

})

/* =========================
   LISTAR PROFESSORES
========================= */

app.get("/professores",verificarToken,(req,res)=>{

db.query("SELECT * FROM professores",(err,result)=>{

if(err){
return res.json([])
}

res.json(result)

})

})

/* =========================
   REGISTRAR NOTA
========================= */

app.post("/nota",verificarToken,(req,res)=>{

const {aluno_id,disciplina,nota}=req.body

db.query(
"INSERT INTO notas(aluno_id,disciplina,nota) VALUES (?,?,?)",
[aluno_id,disciplina,nota],
(err)=>{

if(err){
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
   BOLETIM
========================= */

app.get("/boletim/:id",verificarToken,(req,res)=>{

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
   DASHBOARD
========================= */

app.get("/dashboard",verificarToken,(req,res)=>{

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

/* ========================= */

app.get("/",(req,res)=>{
res.send("API Portal Escolar Seguro")
})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("🚀 Servidor rodando na porta",PORT)
})
