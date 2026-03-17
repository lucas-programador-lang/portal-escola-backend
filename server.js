require("dotenv").config()

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
app.use(cors())

/* =========================
JWT
========================= */
const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_forte"

/* =========================
UPLOAD
========================= */
const uploadPath = path.join(__dirname,"uploads")
if(!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath)

const storage = multer.diskStorage({
  destination:(req,file,cb)=> cb(null,uploadPath),
  filename:(req,file,cb)=> cb(null,Date.now()+"-"+file.originalname)
})

const upload = multer({storage})
app.use("/uploads",express.static(uploadPath))

/* =========================
MYSQL (PROMISE)
========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "escola",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  connectionLimit:10
}).promise()

console.log("✅ Banco conectado")

/* =========================
MIDDLEWARES
========================= */
function verificarToken(req,res,next){
  const auth = req.headers.authorization
  if(!auth) return res.status(401).json({erro:"Token necessário"})

  try{
    const token = auth.split(" ")[1]
    req.usuario = jwt.verify(token,JWT_SECRET)
    next()
  }catch{
    return res.status(401).json({erro:"Token inválido"})
  }
}

function apenasAdmin(req,res,next){
  if(req.usuario.tipo !== "admin"){
    return res.status(403).json({erro:"Apenas admin"})
  }
  next()
}

/* =========================
LOGIN
========================= */
app.post("/login-admin",(req,res)=>{
  const {usuario,senha} = req.body

  if(usuario==="admin" && senha==="123456"){
    const token = jwt.sign({tipo:"admin"},JWT_SECRET,{expiresIn:"8h"})
    return res.json({success:true,token})
  }

  res.json({success:false})
})

app.post("/login-aluno",async (req,res)=>{
  try{
    let {cpf,senha} = req.body
    cpf = cpf.replace(/\D/g,'')

    const [rows] = await db.query("SELECT * FROM alunos WHERE cpf=?",[cpf])
    if(rows.length===0) return res.json({success:false})

    const aluno = rows[0]
    const ok = await bcrypt.compare(senha,aluno.senha)
    if(!ok) return res.json({success:false})

    const token = jwt.sign({id:aluno.id,tipo:"aluno"},JWT_SECRET,{expiresIn:"8h"})
    res.json({success:true,token,aluno})

  }catch(err){
    console.log(err)
    res.json({success:false})
  }
})

app.post("/login-professor",async (req,res)=>{
  try{
    let {cpf,senha} = req.body
    cpf = cpf.replace(/\D/g,'')

    const [rows] = await db.query("SELECT * FROM professores WHERE cpf=?",[cpf])
    if(rows.length===0) return res.json({success:false})

    const prof = rows[0]
    const ok = await bcrypt.compare(senha,prof.senha)
    if(!ok) return res.json({success:false})

    const token = jwt.sign({id:prof.id,tipo:"professor"},JWT_SECRET,{expiresIn:"8h"})
    res.json({success:true,token,professor:prof})

  }catch(err){
    console.log(err)
    res.json({success:false})
  }
})

/* =========================
CADASTRO
========================= */
app.post("/aluno",verificarToken,apenasAdmin, async (req,res)=>{
  try{
    let {nome,cpf,senha} = req.body
    cpf = cpf.replace(/\D/g,'')

    if(!nome || !cpf) return res.json({success:false})

    const [existe] = await db.query("SELECT id FROM alunos WHERE cpf=?",[cpf])
    if(existe.length>0) return res.json({success:false,erro:"CPF já cadastrado"})

    const hash = await bcrypt.hash(senha || "1234",10)

    await db.query("INSERT INTO alunos(nome,cpf,senha) VALUES(?,?,?)",[nome,cpf,hash])

    res.json({success:true})

  }catch(err){
    console.log(err)
    res.json({success:false})
  }
})

app.post("/professor",verificarToken,apenasAdmin, async (req,res)=>{
  try{
    let {nome,cpf,senha,disciplina} = req.body
    cpf = cpf.replace(/\D/g,'')

    if(!nome || !cpf || !disciplina) return res.json({success:false})

    const [existe] = await db.query("SELECT id FROM professores WHERE cpf=?",[cpf])
    if(existe.length>0) return res.json({success:false,erro:"CPF já cadastrado"})

    const hash = await bcrypt.hash(senha || "1234",10)

    await db.query(
      "INSERT INTO professores(nome,cpf,senha,disciplina) VALUES(?,?,?,?)",
      [nome,cpf,hash,disciplina]
    )

    res.json({success:true})

  }catch(err){
    console.log(err)
    res.json({success:false})
  }
})

/* =========================
PUBLICAÇÕES
========================= */
app.post("/publicacao",verificarToken,apenasAdmin, async (req,res)=>{
  try{
    const {titulo,conteudo,tipo} = req.body

    if(!titulo || !tipo) return res.json({success:false})

    await db.query(
      "INSERT INTO publicacoes(titulo,conteudo,tipo) VALUES(?,?,?)",
      [titulo,conteudo || "",tipo]
    )

    res.json({success:true})

  }catch(err){
    console.log(err)
    res.json({success:false})
  }
})

app.get("/publicacoes",async (req,res)=>{
  try{
    const [rows] = await db.query(
      "SELECT * FROM publicacoes ORDER BY data_publicacao DESC"
    )
    res.json(rows)
  }catch{
    res.json([])
  }
})

app.delete("/publicacao/:id",verificarToken,apenasAdmin, async (req,res)=>{
  await db.query("DELETE FROM publicacoes WHERE id=?",[req.params.id])
  res.json({success:true})
})

/* =========================
BOLETIM
========================= */
app.get("/boletim/:id",verificarToken, async (req,res)=>{
  const [rows] = await db.query(
    "SELECT disciplina,nota FROM notas WHERE aluno_id=?",
    [req.params.id]
  )
  res.json(rows)
})

/* =========================
TROCAR SENHA
========================= */
app.post("/trocar-senha",verificarToken,async (req,res)=>{
  try{
    const {cpf,senhaAtual,novaSenha,tipo} = req.body

    if(tipo === "aluno"){
      const [rows] = await db.query("SELECT * FROM alunos WHERE cpf=?",[cpf])
      if(rows.length===0) return res.json({success:false})

      const aluno = rows[0]
      const ok = await bcrypt.compare(senhaAtual,aluno.senha)
      if(!ok) return res.json({success:false})

      const hash = await bcrypt.hash(novaSenha,10)
      await db.query("UPDATE alunos SET senha=? WHERE id=?",[hash,aluno.id])

      return res.json({success:true})
    }

    if(tipo === "professor"){
      const [rows] = await db.query("SELECT * FROM professores WHERE cpf=?",[cpf])
      if(rows.length===0) return res.json({success:false})

      const prof = rows[0]
      const ok = await bcrypt.compare(senhaAtual,prof.senha)
      if(!ok) return res.json({success:false})

      const hash = await bcrypt.hash(novaSenha,10)
      await db.query("UPDATE professores SET senha=? WHERE id=?",[hash,prof.id])

      return res.json({success:true})
    }

  }catch(err){
    console.log(err)
    res.json({success:false})
  }
})

/* =========================
DASHBOARD
========================= */
app.get("/dashboard",verificarToken, async (req,res)=>{
  try{
    const [[a]] = await db.query("SELECT COUNT(*) total FROM alunos")
    const [[p]] = await db.query("SELECT COUNT(*) total FROM professores")
    const [[pub]] = await db.query("SELECT COUNT(*) total FROM publicacoes")

    res.json({
      alunos:a.total,
      professores:p.total,
      publicacoes:pub.total
    })

  }catch{
    res.json({alunos:0,professores:0,publicacoes:0})
  }
})

/* =========================
ROOT
========================= */
app.get("/",(req,res)=>{
  res.send("API Portal Escolar Seguro")
})

const PORT = process.env.PORT || 3000
app.listen(PORT,()=>console.log("🚀 Servidor rodando na porta",PORT))
