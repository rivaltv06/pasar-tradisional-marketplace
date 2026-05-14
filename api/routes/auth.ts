/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import { createPasswordHash, createSession, deleteSession, verifyPassword } from '../auth-utils.js'
import { getDb, newId, nowIso, saveDb, type UserRole, type UserRow } from '../store.js'

const router = Router()

function sanitizeUser(user: UserRow) {
  const rest = { ...user }
  delete (rest as Partial<UserRow>).passwordHash
  return rest
}

function normalizeRole(value: unknown): UserRole | null {
  if (value === 'buyer' || value === 'seller') return value
  return null
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const role = normalizeRole(req.body?.role)
  const name = String(req.body?.name || '').trim()
  const email = req.body?.email ? String(req.body.email).trim() : undefined
  const phone = req.body?.phone ? String(req.body.phone).trim() : undefined
  const password = String(req.body?.password || '')

  if (!role) {
    res.status(400).json({ success: false, error: 'Role tidak valid' })
    return
  }
  if (name.length < 2) {
    res.status(400).json({ success: false, error: 'Nama minimal 2 karakter' })
    return
  }
  if (!email && !phone) {
    res.status(400).json({ success: false, error: 'Email atau nomor HP wajib diisi' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: 'Password minimal 8 karakter' })
    return
  }

  const db = await getDb()
  const emailTaken = email ? db.users.some((u) => u.email?.toLowerCase() === email.toLowerCase()) : false
  const phoneTaken = phone ? db.users.some((u) => u.phone === phone) : false

  if (emailTaken) {
    res.status(409).json({ success: false, error: 'Email sudah terdaftar' })
    return
  }
  if (phoneTaken) {
    res.status(409).json({ success: false, error: 'Nomor HP sudah terdaftar' })
    return
  }

  const user: UserRow = {
    id: newId('usr'),
    role,
    name,
    email,
    phone,
    passwordHash: createPasswordHash(password),
    createdAt: nowIso(),
  }

  db.users.push(user)
  await saveDb(db)

  const session = createSession(user)

  res.status(201).json({
    success: true,
    data: {
      token: session.token,
      user: sanitizeUser(user),
    },
  })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const identifier = String(req.body?.identifier || '').trim()
  const password = String(req.body?.password || '')
  if (!identifier || !password) {
    res.status(400).json({ success: false, error: 'Identifier dan password wajib diisi' })
    return
  }

  const db = await getDb()
  const user = db.users.find((u) => {
    if (u.email && u.email.toLowerCase() === identifier.toLowerCase()) return true
    if (u.phone && u.phone === identifier) return true
    return false
  })

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ success: false, error: 'Login gagal' })
    return
  }

  const session = createSession(user)
  res.json({
    success: true,
    data: {
      token: session.token,
      user: sanitizeUser(user),
    },
  })
})

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (token) deleteSession(token)
  res.json({ success: true })
})

export default router
