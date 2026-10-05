import 'dotenv/config'
import crypto from 'node:crypto'
import express from 'express'
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { z } from 'zod'
import { CustomerRepository } from './repositories/customerRepository.js'
import { CustomerService, CustomerNotFoundError, DuplicateCustomerError } from './services/customerService.js'

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
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST', 'PUT'], allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json({ limit: '10kb' }))
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' } })
const clientLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Demasiadas solicitudes de clientes. Intenta más tarde.' } })
const account = z.object({ name: z.string().trim().min(3).max(100).optional(), email: z.string().trim().email().max(254), password: z.string().min(10).max(72) })
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/, 'Teléfono inválido.')
const customerSchema = z.object({
  fullName: z.string().trim().min(3).max(150),
  alternateContact: z.string().trim().min(3).max(150),
  age: z.coerce.number().int().min(0).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  personalPhone: phone,
  workPhone: phone,
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  workEmail: z.union([z.literal(''), z.string().trim().email().max(254)]).transform(value => value ? value.toLowerCase() : null),
  street: z.string().trim().min(3).max(150),
  neighborhood: z.string().trim().min(2).max(100),
  municipality: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Código postal inválido.')
}).superRefine((customer, context) => {
  const birthDate = new Date(`${customer.dateOfBirth}T00:00:00.000Z`)
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== customer.dateOfBirth || birthDate > new Date()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'Fecha de nacimiento inválida.' })
    return
  }
  const now = new Date()
  let calculatedAge = now.getUTCFullYear() - birthDate.getUTCFullYear()
  const birthdayNotReached = now.getUTCMonth() < birthDate.getUTCMonth() || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())
  if (birthdayNotReached) calculatedAge -= 1
  if (customer.age !== calculatedAge) context.addIssue({ code: z.ZodIssueCode.custom, path: ['age'], message: 'La edad no coincide con la fecha de nacimiento.' })
})
const customerRepository = new CustomerRepository(pool)
const customerService = new CustomerService(pool, customerRepository)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 7 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/'))
})

/** Verifica la sesión antes de exponer operaciones protegidas. */
function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Sesión requerida.' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'taller-control', audience: 'taller-control-client' })
    next()
  } catch (_error) { res.status(401).json({ message: 'Sesión inválida o expirada.' }) }
}

/** Autoriza únicamente los roles declarados por la ruta. */
function authorizeRoles(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'No tienes permiso para registrar clientes.' })
}

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

/** Endpoint REST protegido para registrar clientes con fotografía. */
app.post('/api/clients', authenticate, authorizeRoles('ADMIN', 'RECEPCION'), clientLimit, photoUpload.single('photo'), async (req, res, next) => {
  try {
    const customer = customerSchema.parse(req.body)
    if (!req.file) return res.status(400).json({ message: 'La fotografía es obligatoria y debe ser una imagen de máximo 7 MB.' })
    const id = await customerService.register(customer, req.file, req.user.sub, req.ip)
    res.status(201).json({ id, message: 'usuario guardado' })
  } catch (error) {
    if (error instanceof DuplicateCustomerError) return res.status(409).json({ message: error.message })
    next(error)
  }
})

/** Endpoint REST protegido para consultar el resumen de clientes registrados. */
app.get('/api/clients', authenticate, authorizeRoles('ADMIN', 'RECEPCION'), async (_req, res, next) => {
  try {
    res.json(await customerRepository.list())
  } catch (error) { next(error) }
})

/** Endpoint protegido que devuelve todos los datos de un cliente, incluida su foto. */
app.get('/api/clients/:id', authenticate, authorizeRoles('ADMIN', 'RECEPCION'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id)
    const client = await customerRepository.findById(id)
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado.' })
    const { photoData, photoMime, ...details } = client
    res.json({ ...details, photoUrl: `data:${photoMime};base64,${photoData.toString('base64')}` })
  } catch (error) { next(error) }
})

/** Endpoint protegido para actualizar todos los datos de un cliente. */
app.put('/api/clients/:id', authenticate, authorizeRoles('ADMIN', 'RECEPCION'), clientLimit, photoUpload.single('photo'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id)
    const customer = customerSchema.parse(req.body)
    await customerService.update(id, customer, req.file || null, req.user.sub, req.ip)
    res.json({ message: 'Cliente actualizado' })
  } catch (error) {
    if (error instanceof CustomerNotFoundError) return res.status(404).json({ message: error.message })
    if (error instanceof DuplicateCustomerError) return res.status(409).json({ message: error.message })
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ message: 'Verifica los datos proporcionados.' })
  if (error instanceof multer.MulterError) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'La fotografía supera el máximo de 7 MB.' : 'No fue posible procesar la fotografía.' })
  console.error(error)
  res.status(500).json({ message: 'Ocurrió un error inesperado.' })
})
app.listen(Number(process.env.PORT || 3001), () => console.log('API disponible en http://localhost:3001'))
