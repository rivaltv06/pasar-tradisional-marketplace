import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { requireAuth, requireRole, type AuthContext } from '../middleware/auth.js'
import { supabase, supabaseBucket, supabasePromoBucket } from '../lib/supabase.js'
import { defaultSettings, getDb, newId, nowIso, saveDb, type ProductRow, type ProductUnit, type PromoSettings, type UserRow } from '../store.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } })

function normalizeUnit(value: unknown): ProductUnit | null {
  if (value === 'kg' || value === 'ikat' || value === 'buah' || value === 'bungkus' || value === 'ekor') return value
  return null
}

function guessCategoryAndUnit(name: string): { categoryId: string; unit: ProductUnit } {
  const n = name.trim().toLowerCase()

  if (n.includes('bayam') || n.includes('kangkung') || n.includes('sawi')) return { categoryId: 'sayur', unit: 'ikat' }

  if (
    n.includes('bawang') ||
    n.includes('cabai') ||
    n.includes('jahe') ||
    n.includes('kunyit') ||
    n.includes('lengkuas') ||
    n.includes('kemiri') ||
    n.includes('serai')
  ) {
    return { categoryId: 'bumbu', unit: 'kg' }
  }

  if (
    n.includes('pisang') ||
    n.includes('jeruk') ||
    n.includes('apel') ||
    n.includes('pepaya') ||
    n.includes('semangka') ||
    n.includes('mangga')
  ) {
    return { categoryId: 'buah', unit: 'buah' }
  }

  if (n.includes('daging') || n.includes('ayam') || n.includes('sapi') || n.includes('telur')) {
    return { categoryId: 'daging', unit: n.includes('telur') ? 'buah' : 'kg' }
  }

  if (n.includes('ikan') || n.includes('udang')) return { categoryId: 'ikan', unit: 'kg' }

  if (
    n.includes('jagung') ||
    n.includes('singkong') ||
    n.includes('ubi') ||
    n.includes('kentang') ||
    n.includes('kol') ||
    n.includes('wortel') ||
    n.includes('buncis') ||
    n.includes('timun') ||
    n.includes('tomat')
  ) {
    return { categoryId: 'sayur', unit: 'kg' }
  }

  if (n.includes('mie') || n.includes('kerupuk') || n.includes('teh') || n.includes('kopi')) {
    return { categoryId: 'jajanan', unit: 'bungkus' }
  }

  if (
    n.includes('beras') ||
    n.includes('minyak') ||
    n.includes('gula') ||
    n.includes('tepung') ||
    n.includes('garam') ||
    n.includes('penyedap') ||
    n.includes('santan') ||
    n.includes('tempe') ||
    n.includes('tahu') ||
    n.includes('kedelai') ||
    n.includes('kacang')
  ) {
    return { categoryId: 'sembako', unit: n.includes('tempe') || n.includes('tahu') || n.includes('santan') ? 'bungkus' : 'kg' }
  }

  return { categoryId: 'sembako', unit: 'kg' }
}

function parseBulkText(text: string): string[] {
  const normalized = text.replace(/\r/g, '\n').replace(/([a-z])\s+(?=[A-Z])/g, '$1\n')
  return normalized
    .split('\n')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

function getDefaultStallId(db: Awaited<ReturnType<typeof getDb>>): string | null {
  const active = db.stalls.find((s) => s.isActive)
  if (active) return active.id
  return db.stalls[0]?.id ?? null
}

router.get(
  '/promo',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    res.json({ success: true, data: db.settings.promo })
  },
)

router.patch(
  '/promo',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    void auth
    const db = await getDb()
    const next = { ...defaultSettings().promo, ...db.settings.promo } as PromoSettings

    if (req.body?.enabled !== undefined) next.enabled = Boolean(req.body.enabled)
    if (req.body?.title !== undefined) next.title = String(req.body.title).trim()
    if (req.body?.subtitle !== undefined) next.subtitle = String(req.body.subtitle).trim()
    if (req.body?.ctaLabel !== undefined) next.ctaLabel = String(req.body.ctaLabel).trim()
    if (req.body?.ctaCategoryId !== undefined) {
      const v = String(req.body.ctaCategoryId).trim()
      next.ctaCategoryId = v ? v : undefined
    }
    if (req.body?.minItemsAmount !== undefined) {
      const n = Number(req.body.minItemsAmount)
      if (!Number.isFinite(n) || n < 0) {
        res.status(400).json({ success: false, error: 'minItemsAmount tidak valid' })
        return
      }
      next.minItemsAmount = Math.floor(n)
    }

    if (next.enabled && next.title.length < 2) {
      res.status(400).json({ success: false, error: 'Judul promo minimal 2 karakter' })
      return
    }

    db.settings.promo = next
    await saveDb(db)
    res.json({ success: true, data: next })
  },
)

router.post(
  '/promo/image',
  requireAuth,
  requireRole('admin'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!supabase) {
      res.status(500).json({ success: false, error: 'Supabase Storage belum dikonfigurasi' })
      return
    }
    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, error: 'File gambar wajib diisi' })
      return
    }
    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ success: false, error: 'File harus berupa gambar' })
      return
    }

    const db = await getDb()
    const extFromMime =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/jpeg'
            ? 'jpg'
            : 'jpg'
    const filePath = `promo/${crypto.randomUUID()}.${extFromMime}`

    const uploaded = await supabase.storage.from(supabasePromoBucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    })
    if (uploaded.error) {
      res.status(500).json({ success: false, error: uploaded.error.message })
      return
    }

    const publicUrl = supabase.storage.from(supabasePromoBucket).getPublicUrl(filePath).data.publicUrl
    db.settings.promo.imageUrl = publicUrl
    await saveDb(db)
    res.json({ success: true, data: db.settings.promo })
  },
)

router.get(
  '/mitra-applications',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const list = db.mitraApplications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    res.json({ success: true, data: list })
  },
)

router.patch(
  '/mitra-applications/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const action = String(req.body?.action || '').trim()
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ success: false, error: 'Action tidak valid' })
      return
    }

    const db = await getDb()
    const id = String(req.params.id)
    const app = db.mitraApplications.find((m) => m.id === id)
    if (!app) {
      res.status(404).json({ success: false, error: 'Pendaftaran mitra tidak ditemukan' })
      return
    }
    if (app.status !== 'pending') {
      res.status(409).json({ success: false, error: 'Pendaftaran sudah diproses' })
      return
    }

    if (action === 'reject') {
      app.status = 'rejected'
      app.reviewedAt = nowIso()
      app.reviewedByUserId = auth.user.id
      await saveDb(db)
      res.json({ success: true, data: app })
      return
    }

    const emailTaken = app.email ? db.users.some((u) => u.email?.toLowerCase() === app.email?.toLowerCase()) : false
    const phoneTaken = db.users.some((u) => u.phone === app.phone)
    if (emailTaken || phoneTaken) {
      res.status(409).json({ success: false, error: 'Email/HP sudah terdaftar' })
      return
    }

    const user: UserRow = {
      id: newId('usr'),
      role: 'courier',
      name: app.name,
      email: app.email,
      phone: app.phone,
      passwordHash: app.passwordHash,
      createdAt: nowIso(),
    }
    db.users.push(user)
    app.status = 'approved'
    app.reviewedAt = nowIso()
    app.reviewedByUserId = auth.user.id
    app.approvedUserId = user.id
    await saveDb(db)
    res.json({ success: true, data: { application: app, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } } })
  },
)

router.get(
  '/orders',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const qStatus = req.query.status ? String(req.query.status) : null
    const qCourier = req.query.courier ? String(req.query.courier) : null
    const qPayment = req.query.paymentChannel ? String(req.query.paymentChannel) : null
    const qDateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null
    const qDateTo = req.query.dateTo ? String(req.query.dateTo) : null

    const isYyyyMmDd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
    const dateStartIso =
      qDateFrom && isYyyyMmDd(qDateFrom) ? new Date(`${qDateFrom}T00:00:00+07:00`).toISOString() : null
    const dateEndIso =
      qDateTo && isYyyyMmDd(qDateTo) ? new Date(`${qDateTo}T23:59:59.999+07:00`).toISOString() : null

    let orders = db.orders.slice()
    if (qStatus) orders = orders.filter((o) => o.status === qStatus)
    if (qCourier === 'assigned') orders = orders.filter((o) => Boolean(o.courierUserId))
    if (qCourier === 'unassigned') orders = orders.filter((o) => !o.courierUserId)
    if (qPayment) orders = orders.filter((o) => o.paymentChannel === qPayment)
    if (dateStartIso) orders = orders.filter((o) => o.createdAt >= dateStartIso)
    if (dateEndIso) orders = orders.filter((o) => o.createdAt <= dateEndIso)

    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const rows = orders.map((order) => ({
      order,
      items: db.orderItems.filter((it) => it.orderId === order.id),
    }))
    res.json({ success: true, data: rows })
  },
)

router.get(
  '/couriers',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const couriers = db.users
      .filter((u) => u.role === 'courier')
      .map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone }))
    res.json({ success: true, data: couriers })
  },
)

router.patch(
  '/orders/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const orderId = String(req.params.id)
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }

    if (req.body?.shippingFee !== undefined) {
      const fee = Number(req.body.shippingFee)
      if (!Number.isFinite(fee) || fee < 0) {
        res.status(400).json({ success: false, error: 'Ongkir tidak valid' })
        return
      }
      order.shippingFee = Math.floor(fee)
      order.totalAmount = order.itemsAmount + order.shippingFee
    }

    if (req.body?.courierUserId !== undefined) {
      const v = req.body.courierUserId ? String(req.body.courierUserId).trim() : ''
      if (!v) {
        order.courierUserId = undefined
      } else {
        const courier = db.users.find((u) => u.id === v && u.role === 'courier')
        if (!courier) {
          res.status(400).json({ success: false, error: 'Kurir tidak valid' })
          return
        }
        order.courierUserId = courier.id
      }
    }

    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

router.post(
  '/orders/:id/confirm-payment',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const orderId = String(req.params.id)
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }
    if (order.paymentChannel === 'cod') {
      res.status(409).json({ success: false, error: 'COD tidak perlu konfirmasi pembayaran' })
      return
    }
    if (order.status !== 'awaiting_payment') {
      res.status(409).json({ success: false, error: 'Status pesanan tidak menunggu pembayaran' })
      return
    }

    const items = db.orderItems.filter((it) => it.orderId === order.id)
    const need: Record<string, number> = {}
    for (const it of items) need[it.productId] = (need[it.productId] ?? 0) + it.qty
    for (const [productId, qty] of Object.entries(need)) {
      const product = db.products.find((p) => p.id === productId)
      if (!product) continue
      if (product.stockQty < qty) {
        res.status(409).json({ success: false, error: `Stok tidak cukup untuk ${product.name}` })
        return
      }
    }
    if (!order.stockDeducted) {
      for (const it of items) {
        const product = db.products.find((p) => p.id === it.productId)
        if (!product) continue
        product.stockQty -= it.qty
      }
      order.stockDeducted = true
      order.stockDeductedAt = nowIso()
    }

    order.status = 'paid'
    order.paidAt = nowIso()
    if (req.body?.paymentMethod !== undefined) order.paymentMethod = String(req.body.paymentMethod).trim()
    if (req.body?.paymentSenderName !== undefined) order.paymentSenderName = String(req.body.paymentSenderName).trim()
    if (req.body?.paymentReference !== undefined) order.paymentReference = String(req.body.paymentReference).trim()

    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

router.get(
  '/dashboard',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const monthOrders = db.orders.filter((o) => o.createdAt >= start)
    const byStatus: Record<string, number> = {}
    const byPayment: Record<string, number> = {}
    const byDay: Record<string, { orders: number; itemsAmount: number; shippingFee: number; total: number }> = {}
    const productAgg: Record<string, { name: string; qty: number; revenue: number }> = {}

    let ordersCount = 0
    let itemsAmount = 0
    let shippingFee = 0
    let totalAmount = 0

    for (const o of monthOrders) {
      ordersCount += 1
      itemsAmount += o.itemsAmount
      shippingFee += o.shippingFee
      totalAmount += o.totalAmount

      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
      byPayment[o.paymentChannel] = (byPayment[o.paymentChannel] ?? 0) + 1

      const day = o.createdAt.slice(0, 10)
      const prev = byDay[day] ?? { orders: 0, itemsAmount: 0, shippingFee: 0, total: 0 }
      byDay[day] = {
        orders: prev.orders + 1,
        itemsAmount: prev.itemsAmount + o.itemsAmount,
        shippingFee: prev.shippingFee + o.shippingFee,
        total: prev.total + o.totalAmount,
      }

      for (const it of db.orderItems.filter((x) => x.orderId === o.id)) {
        const key = it.productId
        const prevP = productAgg[key] ?? { name: it.productNameSnapshot, qty: 0, revenue: 0 }
        productAgg[key] = {
          name: prevP.name,
          qty: prevP.qty + it.qty,
          revenue: prevP.revenue + it.qty * it.unitPriceSnapshot,
        }
      }
    }

    const topProducts = Object.entries(productAgg)
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    const days = Object.entries(byDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const lowStock = db.products
      .filter((p) => !p.isHidden && p.stockQty <= 5)
      .slice()
      .sort((a, b) => a.stockQty - b.stockQty)
      .map((p) => ({ id: p.id, name: p.name, stockQty: p.stockQty }))

    res.json({
      success: true,
      data: {
        period: { start },
        summary: { ordersCount, itemsAmount, shippingFee, totalAmount, byStatus, byPayment },
        days,
        topProducts,
        lowStock,
      },
    })
  },
)

router.get(
  '/products',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    res.json({ success: true, data: db.products.slice().sort((a, b) => a.name.localeCompare(b.name)) })
  },
)

router.post(
  '/products',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    void auth
    const db = await getDb()
    const stallId = getDefaultStallId(db)
    if (!stallId) {
      res.status(400).json({ success: false, error: 'Stall belum tersedia' })
      return
    }

    const name = String(req.body?.name || '').trim()
    const categoryId = String(req.body?.categoryId || '').trim()
    const price = Number(req.body?.price)
    const unit = normalizeUnit(req.body?.unit)
    const stockQty = Number(req.body?.stockQty ?? 0)
    const imageUrl = req.body?.imageUrl ? String(req.body.imageUrl).trim() : undefined

    if (name.length < 2) {
      res.status(400).json({ success: false, error: 'Nama produk minimal 2 karakter' })
      return
    }
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'categoryId wajib diisi' })
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      res.status(400).json({ success: false, error: 'Harga tidak valid' })
      return
    }
    if (!unit) {
      res.status(400).json({ success: false, error: 'Unit tidak valid' })
      return
    }
    if (!Number.isFinite(stockQty) || stockQty < 0) {
      res.status(400).json({ success: false, error: 'Stok tidak valid' })
      return
    }

    const product: ProductRow = {
      id: newId('prd'),
      stallId,
      name,
      categoryId,
      price,
      unit,
      stockQty,
      isHidden: false,
      imageUrl,
    }

    db.products.push(product)
    await saveDb(db)
    res.status(201).json({ success: true, data: product })
  },
)

router.post(
  '/products/bulk',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const stallId = getDefaultStallId(db)
    if (!stallId) {
      res.status(400).json({ success: false, error: 'Stall belum tersedia' })
      return
    }

    const text = req.body?.text ? String(req.body.text) : ''
    if (!text.trim()) {
      res.status(400).json({ success: false, error: 'Text kosong' })
      return
    }

    const names = parseBulkText(text)
    const existing = new Set(db.products.map((p) => p.name.trim().toLowerCase()))
    const created: ProductRow[] = []

    for (const name of names) {
      const key = name.toLowerCase()
      if (existing.has(key)) continue
      existing.add(key)
      const guess = guessCategoryAndUnit(name)
      const product: ProductRow = {
        id: newId('prd'),
        stallId,
        name,
        categoryId: guess.categoryId,
        price: 0,
        unit: guess.unit,
        stockQty: 0,
        isHidden: true,
      }
      db.products.push(product)
      created.push(product)
    }

    await saveDb(db)
    res.status(201).json({ success: true, data: { createdCount: created.length, created } })
  },
)

router.patch(
  '/products/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const productId = String(req.params.id)
    const product = db.products.find((p) => p.id === productId)
    if (!product) {
      res.status(404).json({ success: false, error: 'Produk tidak ditemukan' })
      return
    }

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim()
      if (name.length < 2) {
        res.status(400).json({ success: false, error: 'Nama produk minimal 2 karakter' })
        return
      }
      product.name = name
    }
    if (req.body?.categoryId !== undefined) {
      const categoryId = String(req.body.categoryId).trim()
      if (!categoryId) {
        res.status(400).json({ success: false, error: 'categoryId wajib diisi' })
        return
      }
      product.categoryId = categoryId
    }
    if (req.body?.price !== undefined) {
      const price = Number(req.body.price)
      if (!Number.isFinite(price) || price <= 0) {
        res.status(400).json({ success: false, error: 'Harga tidak valid' })
        return
      }
      product.price = price
    }
    if (req.body?.unit !== undefined) {
      const unit = normalizeUnit(req.body.unit)
      if (!unit) {
        res.status(400).json({ success: false, error: 'Unit tidak valid' })
        return
      }
      product.unit = unit
    }
    if (req.body?.stockQty !== undefined) {
      const stockQty = Number(req.body.stockQty)
      if (!Number.isFinite(stockQty) || stockQty < 0) {
        res.status(400).json({ success: false, error: 'Stok tidak valid' })
        return
      }
      product.stockQty = stockQty
    }
    if (req.body?.imageUrl !== undefined) {
      product.imageUrl = req.body.imageUrl ? String(req.body.imageUrl).trim() : undefined
    }

    await saveDb(db)
    res.json({ success: true, data: product })
  },
)

router.patch(
  '/products/:id/visibility',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    const db = await getDb()
    const productId = String(req.params.id)
    const product = db.products.find((p) => p.id === productId)
    if (!product) {
      res.status(404).json({ success: false, error: 'Produk tidak ditemukan' })
      return
    }

    const isHidden = Boolean(req.body?.isHidden)
    product.isHidden = isHidden
    await saveDb(db)
    res.json({ success: true, data: product })
  },
)

router.post(
  '/products/:id/image',
  requireAuth,
  requireRole('admin'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!supabase) {
      res.status(500).json({ success: false, error: 'Supabase Storage belum dikonfigurasi' })
      return
    }

    const productId = String(req.params.id)
    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, error: 'File gambar wajib diisi' })
      return
    }
    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ success: false, error: 'File harus berupa gambar' })
      return
    }

    const db = await getDb()
    const product = db.products.find((p) => p.id === productId)
    if (!product) {
      res.status(404).json({ success: false, error: 'Produk tidak ditemukan' })
      return
    }

    const extFromMime =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/jpeg'
            ? 'jpg'
            : 'jpg'
    const filePath = `products/${productId}/${crypto.randomUUID()}.${extFromMime}`

    const uploaded = await supabase.storage.from(supabaseBucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    })
    if (uploaded.error) {
      res.status(500).json({ success: false, error: uploaded.error.message })
      return
    }

    const publicUrl = supabase.storage.from(supabaseBucket).getPublicUrl(filePath).data.publicUrl
    product.imageUrl = publicUrl
    await saveDb(db)
    res.json({ success: true, data: product })
  },
)

export default router
