import 'dotenv/config'
import crypto from 'node:crypto'
import express from 'express'
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET']
for (const key of required) if (!process.env[key]) console.warn(`[configuración] Falta ${key} en .env`)

const pool = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 10, enableKeepAlive: true
})
const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST'] }))
app.use(express.json({ limit: '10kb' }))
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' } })
const account = z.object({ name: z.string().trim().min(3).max(100).optional(), email: z.string().trim().email().max(254), password: z.string().min(10).max(72) })

app.post('/api/auth/register', authLimit, async (req, res, next) => {
  let connection
  try {
    const { name, email, password } = account.extend({ name: z.string().trim().min(3).max(100) }).parse(req.body)
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [count] = await connection.query('SELECT COUNT(*) AS total FROM users FOR UPDATE')
    if (count[0].total > 0) {
      await connection.rollback()
      return res.status(403).json({ message: 'La cuenta inicial ya fue creada. Solicita al administrador que te dé acceso.' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await connection.execute('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email.toLowerCase(), passwordHash, 'ADMIN'])
    await connection.execute('INSERT INTO audit_log (user_id, action, ip_address) VALUES (?, ?, ?)', [result.insertId, 'INITIAL_ADMIN_REGISTERED', req.ip])
    await connection.commit()
    res.status(201).json({ message: 'Cuenta creada. Ya puedes iniciar sesión.' })
  } catch (error) { if (connection) await connection.rollback(); next(error) } finally { connection?.release() }
})

app.post('/api/auth/login', authLimit, async (req, res, next) => {
  try {
    const { email, password } = account.pick({ email: true, password: true }).parse(req.body)
    const [rows] = await pool.execute('SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()])
    const user = rows[0]
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Correo o contraseña inválidos.' })
    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m', issuer: 'taller-control', audience: 'taller-control-client' })
    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])
    await pool.execute('INSERT INTO audit_log (user_id, action, ip_address) VALUES (?, ?, ?)', [user.id, 'USER_LOGGED_IN', req.ip])
    res.json({ message: `Bienvenido, ${user.full_name}.`, token, user: { id: user.id, name: user.full_name, role: user.role } })
  } catch (error) { next(error) }
})

app.post('/api/auth/forgot-password', authLimit, async (req, res, next) => {
  try {
    const { email } = account.pick({ email: true }).parse(req.body)
    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()])
    if (rows[0]) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      await pool.execute('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))', [rows[0].id, tokenHash])
      // Integra aquí un proveedor de correo. Nunca registres ni devuelvas rawToken al cliente.
    }
    res.json({ message: 'Si el correo existe, recibirás instrucciones para recuperar el acceso.' })
  } catch (error) { next(error) }
})

app.post('/api/auth/reset-password', authLimit, async (req, res, next) => {
  try {
    const data = z.object({ token: z.string().length(64), password: z.string().min(10).max(72) }).parse(req.body)
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex')
    const [rows] = await pool.execute('SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1', [tokenHash])
    if (!rows[0]) return res.status(400).json({ message: 'El enlace es inválido o ya expiró.' })
    const passwordHash = await bcrypt.hash(data.password, 12)
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, rows[0].user_id])
    await pool.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [rows[0].id])
    await pool.execute('INSERT INTO audit_log (user_id, action, ip_address) VALUES (?, ?, ?)', [rows[0].user_id, 'PASSWORD_RESET', req.ip])
    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
  } catch (error) { next(error) }
})

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ message: 'Verifica los datos proporcionados.' })
  console.error(error)
  res.status(500).json({ message: 'Ocurrió un error inesperado.' })
})
app.listen(Number(process.env.PORT || 3001), () => console.log('API disponible en http://localhost:3001'))
