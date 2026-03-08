const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")

const app = express()

app.use(express.json())

// CORS para Cloudflare Pages acessar o backend
app.use(cors({
  origin: "*",
  methods: ["GET","POST"]
}))

/* =========================
   CONEXÃO MYSQL (Railway)
========================= */

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "escola"
})

db.connect(err => {

  if (err) {
    console.error("❌ Erro ao conectar no banco:", err)
  } else {
    console.log("✅ Banco conectado")
  }

})

/* =========================
   LOGIN ALUNO
========================= */

app.post("/login", (req,res)=>{

  const {cpf, senha} = req.body

  db.query(
    "SELECT * FROM alunos WHERE cpf=? AND senha=?",
    [cpf,senha],
    (err,result)=>{

      if(err){
        return res.json({success:false,error:"Erro no banco"})
      }

      if(result.length>0){

        res.json({
          success:true,
          aluno:result[0]
        })

      }else{

        res.json({success:false})

      }

    }
  )

})

/* =========================
   LOGIN PROFESSOR
========================= */

app.post("/login-professor",(req,res)=>{

  const {cpf,senha} = req.body

  db.query(
    "SELECT * FROM professores WHERE cpf=? AND senha=?",
    [cpf,senha],
    (err,result)=>{

      if(err){
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

    }
  )

})

/* =========================
   LISTAR ALUNOS
========================= */

app.get("/alunos",(req,res)=>{

  db.query(
    "SELECT * FROM alunos",
    (err,result)=>{

      if(err){
        return res.json([])
      }

      res.json(result)

    }
  )

})

/* =========================
   LISTAR ALUNOS POR TURMA
========================= */

app.get("/turma/:turma",(req,res)=>{

  const turma = req.params.turma

  db.query(
    "SELECT * FROM alunos WHERE turma_id=?",
    [turma],
    (err,result)=>{

      if(err){
        return res.json([])
      }

      res.json(result)

    }
  )

})

/* =========================
   CADASTRAR ALUNO
========================= */

app.post("/aluno",(req,res)=>{

  const {nome,cpf,senha,turma_id} = req.body

  db.query(
    "INSERT INTO alunos(nome,cpf,senha,turma_id) VALUES (?,?,?,?)",
    [nome,cpf,senha || "1234", turma_id || null],
    (err,result)=>{

      if(err){
        return res.json({success:false,error:"Erro ao cadastrar"})
      }

      res.json({success:true})

    }
  )

})

/* =========================
   CADASTRAR PROFESSOR
========================= */

app.post("/professor",(req,res)=>{

  const {nome,cpf,senha,disciplina} = req.body

  db.query(
    "INSERT INTO professores(nome,cpf,senha,disciplina) VALUES (?,?,?,?)",
    [nome,cpf,senha || "1234", disciplina || ""],
    (err,result)=>{

      if(err){
        return res.json({success:false})
      }

      res.json({success:true})

    }
  )

})

/* =========================
   REGISTRAR NOTA
========================= */

app.post("/nota",(req,res)=>{

  const {aluno_id,disciplina,nota} = req.body

  db.query(
    "INSERT INTO notas(aluno_id,disciplina,nota) VALUES (?,?,?)",
    [aluno_id,disciplina,nota],
    (err,result)=>{

      if(err){
        return res.json({success:false})
      }

      res.json({success:true})

    }
  )

})

/* =========================
   BOLETIM DO ALUNO
========================= */

app.get("/boletim/:id",(req,res)=>{

  const id = req.params.id

  db.query(
    "SELECT disciplina,nota FROM notas WHERE aluno_id=?",
    [id],
    (err,result)=>{

      if(err){
        return res.json([])
      }

      res.json(result)

    }
  )

})

/* =========================
   TESTE DA API
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
