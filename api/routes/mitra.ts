import { Router, type Request, type Response } from 'express'
import { createPasswordHash } from '../auth-utils.js'
import { requireAuth, requireRole, type AuthContext } from '../middleware/auth.js'
import { getDb, newId, nowIso, saveDb, type MitraApplicationRow, type OrderRow } from '../store.js'

const router = Router()

router.post('/mitra/register', async (req: Request, res: Response): Promise<void> => {
  const name = String(req.body?.name || '').trim()
  const phone = String(req.body?.phone || '').trim()
  const email = req.body?.email ? String(req.body.email).trim() : undefined
  const password = String(req.body?.password || '')
  const addressText = String(req.body?.addressText || '').trim()

  if (name.length < 2) {
    res.status(400).json({ success: false, error: 'Nama minimal 2 karakter' })
    return
  }
  if (!phone || phone.length < 8) {
    res.status(400).json({ success: false, error: 'Nomor HP wajib diisi' })
    return
  }
  if (email && !email.includes('@')) {
    res.status(400).json({ success: false, error: 'Email tidak valid' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: 'Password minimal 8 karakter' })
    return
  }
  if (addressText.length < 6) {
    res.status(400).json({ success: false, error: 'Alamat minimal 6 karakter' })
    return
  }

  const db = await getDb()
  const emailTaken = email ? db.users.some((u) => u.email?.toLowerCase() === email.toLowerCase()) : false
  const phoneTaken = db.users.some((u) => u.phone === phone)
  if (emailTaken || phoneTaken) {
    res.status(409).json({ success: false, error: 'Email/HP sudah terdaftar' })
    return
  }

  const existingPending = db.mitraApplications.some(
    (m) => m.status === 'pending' && (m.phone === phone || (email && m.email?.toLowerCase() === email.toLowerCase())),
  )
  if (existingPending) {
    res.status(409).json({ success: false, error: 'Pendaftaran sedang diproses' })
    return
  }

  const row: MitraApplicationRow = {
    id: newId('mtr'),
    name,
    phone,
    email,
    addressText,
    passwordHash: createPasswordHash(password),
    status: 'pending',
    createdAt: nowIso(),
  }

  db.mitraApplications.push(row)
  await saveDb(db)
  res.status(201).json({ success: true, data: { id: row.id, status: row.status } })
})

router.get(
  '/mitra/orders/inbox',
  requireAuth,
  requireRole('courier'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const orders = db.orders
      .filter(
        (o) =>
          o.fulfillment === 'delivery' &&
          !o.courierUserId &&
          (o.status === 'paid' || o.status === 'confirmed'),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => ({
        order,
        items: db.orderItems.filter((it) => it.orderId === order.id),
      }))
    res.json({ success: true, data: orders })
  },
)

router.get(
  '/mitra/orders/me',
  requireAuth,
  requireRole('courier'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const orders = db.orders
      .filter((o) => o.courierUserId === auth.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => ({
        order,
        items: db.orderItems.filter((it) => it.orderId === order.id),
      }))
    res.json({ success: true, data: orders })
  },
)

router.post(
  '/mitra/orders/:id/claim',
  requireAuth,
  requireRole('courier'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const orderId = String(req.params.id)
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }
    if (order.fulfillment !== 'delivery') {
      res.status(400).json({ success: false, error: 'Pesanan bukan delivery' })
      return
    }
    if (order.courierUserId) {
      res.status(409).json({ success: false, error: 'Pesanan sudah diambil mitra lain' })
      return
    }
    if (order.status !== 'paid' && order.status !== 'confirmed' && order.status !== 'processing') {
      res.status(409).json({ success: false, error: 'Status pesanan belum siap diantar' })
      return
    }

    ;(order as OrderRow).courierUserId = auth.user.id
    order.status = 'out_for_delivery'
    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

export default router

