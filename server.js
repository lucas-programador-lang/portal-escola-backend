const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const app = express()

app.use(express.json())

/* =========================
CORS
========================= */

app.use(cors({
origin: "*",
methods: ["GET","POST","PUT","DELETE","OPTIONS"],
allowedHeaders: ["Content-Type","Authorization"]
}))

app.options("*", cors())

/* =========================
JWT
========================= */

const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_forte"

/* =========================
UPLOAD
========================= */

const uploadPath = path.join(__dirname,"uploads")

if(!fs.existsSync(uploadPath)){
fs.mkdirSync(uploadPath)
}

const storage = multer.diskStorage({
destination:(req,file,cb)=>{
cb(null,uploadPath)
},
filename:(req,file,cb)=>{
cb(null,Date.now()+"-"+file.originalname)
}
})

const upload = multer({storage})

app.use("/uploads",express.static(uploadPath))

/* =========================
MYSQL
========================= */

let db

function conectarBanco(){

if(process.env.DATABASE_URL){

const url = new URL(process.env.DATABASE_URL)

db = mysql.createPool({
host: url.hostname,
user: url.username,
password: url.password,
database: url.pathname.replace("/",""),
port: url.port,
connectionLimit:10
})

}else{

db = mysql.createPool({
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
connectionLimit:10
})

}

db.getConnection((err,conn)=>{
if(err){
console.log("❌ Erro banco:",err)
}else{
console.log("✅ Banco conectado")
conn.release()
}
})

}

conectarBanco()

/* =========================
MIDDLEWARE TOKEN
========================= */

function verificarToken(req,res,next){

const auth = req.headers.authorization

if(!auth){
return res.status(401).json({erro:"Token necessário"})
}

const token = auth.split(" ")[1]

try{

const decoded = jwt.verify(token,JWT_SECRET)
req.usuario = decoded
next()

}catch(err){
return res.status(401).json({erro:"Token inválido"})
}

}

/* =========================
UPLOAD IMAGEM
========================= */

app.post("/upload",verificarToken,upload.single("imagem"),(req,res)=>{

if(!req.file){
return res.json({success:false})
}

const url = req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename

res.json({success:true,url})

})

/* =========================
LOGIN ADMIN
========================= */

app.post("/login-admin",(req,res)=>{

const {usuario,senha}=req.body

if(usuario==="admin" && senha==="123456"){

const token = jwt.sign(
{tipo:"admin"},
JWT_SECRET,
{expiresIn:"8h"}
)

return res.json({success:true,token})

}

res.json({success:false})

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

const professor=result[0]

const senhaValida = await bcrypt.compare(senha,professor.senha)

if(!senhaValida){
return res.json({success:false})
}

const token = jwt.sign(
{ id: professor.id, tipo:"professor" },
JWT_SECRET,
{expiresIn:"8h"}
)

res.json({
success:true,
token,
professor
})

})

})

/* =========================
ALUNOS
========================= */

app.post("/aluno",verificarToken,async (req,res)=>{

try{

const {nome,cpf,senha,turma_id}=req.body

const hash = await bcrypt.hash(senha || "1234",10)

db.query(
"INSERT INTO alunos(nome,cpf,senha,turma_id) VALUES (?,?,?,?)",
[nome,cpf,hash,turma_id || null],
(err)=>{

if(err){
console.log(err)
return res.json({success:false})
}

res.json({success:true})

})

}catch{
res.json({success:false})
}

})

/* =========================
PROFESSORES
========================= */

app.post("/professor",verificarToken,async (req,res)=>{

try{

const {nome,cpf,senha,disciplina}=req.body

const hash = await bcrypt.hash(senha || "1234",10)

db.query(
"INSERT INTO professores(nome,cpf,senha,disciplina) VALUES (?,?,?,?)",
[nome,cpf,hash,disciplina],
(err)=>{

if(err){
console.log(err)
return res.json({success:false})
}

res.json({success:true})

})

}catch{
res.json({success:false})
}

})

/* =========================
DASHBOARD
========================= */

app.get("/dashboard",verificarToken,(req,res)=>{

let dados={}

db.query("SELECT COUNT(*) total FROM alunos",(err,r1)=>{

dados.alunos=r1?.[0]?.total || 0

db.query("SELECT COUNT(*) total FROM professores",(err,r2)=>{

dados.professores=r2?.[0]?.total || 0

db.query("SELECT COUNT(*) total FROM notas",(err,r3)=>{

dados.notas=r3?.[0]?.total || 0

res.json(dados)

})

})

})

})

/* =========================
CRIAR PUBLICAÇÃO
========================= */

app.post("/publicacao",verificarToken,(req,res)=>{

const {titulo,conteudo,imagem,tipo}=req.body

if(!titulo || !tipo){
return res.json({success:false})
}

db.query(
"INSERT INTO publicacoes(titulo,conteudo,imagem,tipo) VALUES (?,?,?,?)",
[titulo,conteudo || "",imagem || "",tipo],
(err)=>{

if(err){
console.log(err)
return res.json({success:false})
}

res.json({success:true})

})

})

/* =========================
LISTAR PUBLICAÇÕES
========================= */

app.get("/publicacoes",(req,res)=>{

db.query(
"SELECT * FROM publicacoes ORDER BY data_publicacao DESC",
(err,result)=>{

if(err){
console.log(err)
return res.json([])
}

res.json(result)

})

})

/* =========================
EXCLUIR PUBLICAÇÃO
========================= */

app.delete("/publicacao/:id",verificarToken,(req,res)=>{

const id=req.params.id

db.query(
"DELETE FROM publicacoes WHERE id=?",
[id],
(err)=>{

if(err){
return res.json({success:false})
}

res.json({success:true})

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
