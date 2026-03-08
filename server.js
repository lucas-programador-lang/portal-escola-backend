const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")

const app = express()

app.use(express.json())

// CORS para permitir acesso do Cloudflare Pages
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}))

/* =========================
   CONEXÃO MYSQL
========================= */

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
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

app.post("/login", (req, res) => {
  const { cpf } = req.body

  db.query(
    "SELECT * FROM alunos WHERE cpf=?",
    [cpf],
    (err, result) => {

      if (err) {
        return res.json({ success: false, error: err })
      }

      if (result.length > 0) {
        res.json({
          success: true,
          aluno: result[0]
        })
      } else {
        res.json({ success: false })
      }

    }
  )
})

/* =========================
   LOGIN PROFESSOR
========================= */

app.post("/login-professor", (req, res) => {
  const { cpf } = req.body

  db.query(
    "SELECT * FROM professores WHERE cpf=?",
    [cpf],
    (err, result) => {

      if (err) {
        return res.json({ success: false })
      }

      if (result.length > 0) {
        res.json({
          success: true,
          professor: result[0]
        })
      } else {
        res.json({ success: false })
      }

    }
  )
})

/* =========================
   LISTAR ALUNOS
========================= */

app.get("/alunos", (req, res) => {

  db.query("SELECT * FROM alunos", (err, result) => {

    if (err) {
      return res.json([])
    }

    res.json(result)

  })

})

/* =========================
   LISTAR ALUNOS POR TURMA
========================= */

app.get("/turma/:turma", (req, res) => {

  const turma = req.params.turma

  db.query(
    "SELECT * FROM alunos WHERE turma=?",
    [turma],
    (err, result) => {

      if (err) {
        return res.json([])
      }

      res.json(result)

    }
  )

})

/* =========================
   CADASTRAR ALUNO
========================= */

app.post("/aluno", (req, res) => {

  const { nome, cpf } = req.body

  db.query(
    "INSERT INTO alunos(nome, cpf) VALUES (?, ?)",
    [nome, cpf],
    (err, result) => {

      if (err) {
        return res.json({ success: false, error: err })
      }

      res.json({ success: true })

    }
  )

})

/* =========================
   REGISTRAR NOTA
========================= */

app.post("/nota", (req, res) => {

  const { aluno_id, disciplina, nota } = req.body

  db.query(
    "INSERT INTO notas(aluno_id, disciplina, nota) VALUES (?, ?, ?)",
    [aluno_id, disciplina, nota],
    (err, result) => {

      if (err) {
        return res.json({ success: false })
      }

      res.json({ success: true })

    }
  )

})

/* =========================
   BOLETIM DO ALUNO
========================= */

app.get("/boletim/:id", (req, res) => {

  const id = req.params.id

  db.query(
    "SELECT disciplina, nota FROM notas WHERE aluno_id=?",
    [id],
    (err, result) => {

      if (err) {
        return res.json([])
      }

      res.json(result)

    }
  )

})

/* =========================
   PORTA DO RENDER
========================= */

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
