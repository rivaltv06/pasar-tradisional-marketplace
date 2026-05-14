import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { requireAuth, requireRole, type AuthContext } from '../middleware/auth.js'
import {
  getDb,
  newId,
  nowIso,
  saveDb,
  type FulfillmentMethod,
  type OrderItemRow,
  type OrderRow,
  type OrderStatus,
  type PaymentChannel,
} from '../store.js'
import { supabase, supabasePaymentBucket } from '../lib/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } })

async function postWebhook(url: string, payload: unknown): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

function ensureStockAndBuildMap(
  db: Awaited<ReturnType<typeof getDb>>,
  orderItems: OrderItemRow[],
): { ok: true } | { ok: false; error: string } {
  const need: Record<string, number> = {}
  for (const it of orderItems) {
    need[it.productId] = (need[it.productId] ?? 0) + it.qty
  }
  for (const [productId, qty] of Object.entries(need)) {
    const product = db.products.find((p) => p.id === productId)
    if (!product) return { ok: false, error: 'Produk tidak ditemukan' }
    if (product.stockQty < qty) return { ok: false, error: `Stok tidak cukup untuk ${product.name}` }
  }
  return { ok: true }
}

function deductStock(
  db: Awaited<ReturnType<typeof getDb>>,
  order: OrderRow,
): { ok: true } | { ok: false; error: string } {
  if (order.stockDeducted) return { ok: true }
  const items = db.orderItems.filter((it) => it.orderId === order.id)
  const check = ensureStockAndBuildMap(db, items)
  if (!check.ok) return check
  for (const it of items) {
    const product = db.products.find((p) => p.id === it.productId)
    if (!product) continue
    product.stockQty -= it.qty
  }
  order.stockDeducted = true
  order.stockDeductedAt = nowIso()
  return { ok: true }
}

function restock(
  db: Awaited<ReturnType<typeof getDb>>,
  order: OrderRow,
): void {
  if (!order.stockDeducted) return
  const items = db.orderItems.filter((it) => it.orderId === order.id)
  for (const it of items) {
    const product = db.products.find((p) => p.id === it.productId)
    if (!product) continue
    product.stockQty += it.qty
  }
  order.stockDeducted = false
  order.stockDeductedAt = undefined
}

router.post(
  '/orders',
  requireAuth,
  requireRole('buyer'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const stallId = String(req.body?.stallId || '').trim()
    const fulfillment = 'delivery' satisfies FulfillmentMethod
    const addressText = req.body?.addressText ? String(req.body.addressText).trim() : undefined
    const notes = req.body?.notes ? String(req.body.notes).trim() : undefined
    const paymentChannel = String(req.body?.paymentChannel || '').trim() as PaymentChannel
    const items = Array.isArray(req.body?.items) ? req.body.items : []

    if (!stallId) {
      res.status(400).json({ success: false, error: 'stallId wajib diisi' })
      return
    }
    if (!addressText || addressText.length < 8) {
      res.status(400).json({ success: false, error: 'Alamat wajib diisi' })
      return
    }
    if (paymentChannel !== 'transfer' && paymentChannel !== 'qris' && paymentChannel !== 'cod') {
      res.status(400).json({ success: false, error: 'Metode pembayaran tidak valid' })
      return
    }
    if (items.length === 0) {
      res.status(400).json({ success: false, error: 'Item pesanan kosong' })
      return
    }

    const db = await getDb()
    const stall = db.stalls.find((s) => s.id === stallId && s.isActive)
    if (!stall) {
      res.status(404).json({ success: false, error: 'Kios tidak ditemukan' })
      return
    }

    const orderItems: OrderItemRow[] = []
    let itemsAmount = 0
    const promo = db.settings?.promo
    let promoCategoryOk = true

    for (const raw of items) {
      const productId = String(raw?.productId || '').trim()
      const qty = Number(raw?.qty)
      const itemNotes = raw?.notes ? String(raw.notes).trim() : undefined
      if (!productId || !Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ success: false, error: 'Item tidak valid' })
        return
      }

      const product = db.products.find(
        (p) => p.id === productId && p.stallId === stallId && !p.isHidden,
      )
      if (!product) {
        res.status(400).json({ success: false, error: 'Produk tidak valid untuk kios ini' })
        return
      }

      const line = product.price * qty
      itemsAmount += line
      if (promo?.enabled && promo.ctaCategoryId && product.categoryId !== promo.ctaCategoryId) {
        promoCategoryOk = false
      }
      orderItems.push({
        id: newId('oit'),
        orderId: '',
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        qty,
        unitSnapshot: product.unit,
        notes: itemNotes,
      })
    }

    const baseShippingFee = 15000
    const shippingFee =
      promo?.enabled && itemsAmount >= promo.minItemsAmount && promoCategoryOk ? 0 : baseShippingFee
    const totalAmount = itemsAmount + shippingFee
    const status: OrderRow['status'] = paymentChannel === 'cod' ? 'confirmed' : 'awaiting_payment'

    const order: OrderRow = {
      id: newId('ord'),
      buyerUserId: auth.user.id,
      stallId,
      status,
      fulfillment,
      addressText,
      notes,
      itemsAmount,
      shippingFee,
      totalAmount,
      paymentChannel,
      paymentTo: 'Belanjaku',
      paymentBank: 'BCA',
      paymentAccountNumber: '0541206603',
      paymentAccountName: 'Adnan Rival Nugraha',
      stockDeducted: false,
      createdAt: nowIso(),
    }

    for (const it of orderItems) it.orderId = order.id
    const stockCheck = ensureStockAndBuildMap(db, orderItems)
    if (stockCheck.ok === false) {
      res.status(409).json({ success: false, error: stockCheck.error })
      return
    }
    db.orders.push(order)
    db.orderItems.push(...orderItems)
    if (status === 'confirmed') {
      const r = deductStock(db, order)
      if (r.ok === false) {
        res.status(409).json({ success: false, error: r.error })
        return
      }
    }
    await saveDb(db)

    const waUrl = process.env.WHATSAPP_WEBHOOK_URL
    const emailUrl = process.env.EMAIL_WEBHOOK_URL
    if (waUrl || emailUrl) {
      const couriers = db.users.filter((u) => u.role === 'courier')
      const message = `Order baru #${order.id.slice(0, 10)} • ${order.addressText ?? '-'} • Total ${order.totalAmount}`
      void (async () => {
        for (const c of couriers) {
          if (waUrl && c.phone) {
            try {
              await postWebhook(waUrl, { channel: 'whatsapp', to: c.phone, message, orderId: order.id })
            } catch {
              void 0
            }
          }
          if (emailUrl && c.email) {
            try {
              await postWebhook(emailUrl, { channel: 'email', to: c.email, message, orderId: order.id })
            } catch {
              void 0
            }
          }
        }
      })()
    }

    res.status(201).json({ success: true, data: { order, items: orderItems } })
  },
)

router.post(
  '/orders/:id/payment-proof',
  requireAuth,
  requireRole('buyer'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    if (!supabase) {
      res.status(500).json({ success: false, error: 'Supabase Storage belum dikonfigurasi' })
      return
    }
    const db = await getDb()
    const orderId = String(req.params.id)
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }
    if (order.buyerUserId !== auth.user.id) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }
    if (order.paymentChannel === 'cod') {
      res.status(409).json({ success: false, error: 'COD tidak perlu bukti bayar' })
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
    const extFromMime =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/jpeg'
            ? 'jpg'
            : 'jpg'
    const filePath = `orders/${order.id}/${crypto.randomUUID()}.${extFromMime}`
    const uploaded = await supabase.storage.from(supabasePaymentBucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    })
    if (uploaded.error) {
      res.status(500).json({ success: false, error: uploaded.error.message })
      return
    }
    const publicUrl = supabase.storage.from(supabasePaymentBucket).getPublicUrl(filePath).data.publicUrl
    order.paymentProofUrl = publicUrl
    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

router.get(
  '/orders/me',
  requireAuth,
  requireRole('buyer'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const orders = db.orders
      .filter((o) => o.buyerUserId === auth.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => ({
        order,
        items: db.orderItems.filter((it) => it.orderId === order.id),
      }))

    res.json({ success: true, data: orders })
  },
)

router.get(
  '/orders/:id',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const orderId = String(req.params.id)
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }

    const isBuyer = auth.user.role === 'buyer' && order.buyerUserId === auth.user.id
    const sellerStall = db.stalls.find((s) => s.id === order.stallId)
    const isSeller = auth.user.role === 'seller' && sellerStall?.sellerUserId === auth.user.id
    const isAdmin = auth.user.role === 'admin'
    const isCourier = auth.user.role === 'courier' && order.courierUserId === auth.user.id
    if (!isBuyer && !isSeller && !isAdmin && !isCourier) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }

    const items = db.orderItems.filter((it) => it.orderId === order.id)
    res.json({ success: true, data: { order, items } })
  },
)

router.post(
  '/orders/:id/payment',
  requireAuth,
  requireRole('buyer'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const orderId = String(req.params.id)
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }

    if (order.buyerUserId !== auth.user.id) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }

    if (order.paymentChannel === 'cod') {
      res.status(409).json({ success: false, error: 'COD tidak perlu pembayaran' })
      return
    }

    const senderName = String(req.body?.senderName || '').trim()
    const method = String(req.body?.method || '').trim()
    const reference = String(req.body?.reference || '').trim()

    if (senderName.length < 2) {
      res.status(400).json({ success: false, error: 'Nama pengirim minimal 2 karakter' })
      return
    }
    if (!method) {
      res.status(400).json({ success: false, error: 'Metode pembayaran wajib diisi' })
      return
    }
    if (reference.length < 3) {
      res.status(400).json({ success: false, error: 'Nomor referensi minimal 3 karakter' })
      return
    }

    if (order.status !== 'awaiting_payment') {
      res.status(409).json({ success: false, error: 'Pembayaran sudah tercatat atau pesanan sudah diproses' })
      return
    }

    order.status = 'paid'
    order.paymentTo = order.paymentTo ?? 'Belanjaku'
    order.paymentMethod = method
    order.paymentSenderName = senderName
    order.paymentReference = reference
    order.paidAt = nowIso()
    const r = deductStock(db, order)
    if (r.ok === false) {
      res.status(409).json({ success: false, error: r.error })
      return
    }
    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

function normalizeStatus(value: unknown): OrderStatus | null {
  if (
    value === 'created' ||
    value === 'confirmed' ||
    value === 'processing' ||
    value === 'ready_for_pickup' ||
    value === 'out_for_delivery' ||
    value === 'completed' ||
    value === 'cancelled'
  ) {
    return value
  }
  return null
}

router.patch(
  '/orders/:id/status',
  requireAuth,
  requireRole('seller', 'admin', 'courier'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const orderId = String(req.params.id)
    const status = normalizeStatus(req.body?.status)
    if (!status) {
      res.status(400).json({ success: false, error: 'Status tidak valid' })
      return
    }

    const order = db.orders.find((o) => o.id === orderId)
    if (!order) {
      res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' })
      return
    }

    if (auth.user.role === 'seller') {
      const stall = db.stalls.find((s) => s.id === order.stallId)
      if (!stall || stall.sellerUserId !== auth.user.id) {
        res.status(403).json({ success: false, error: 'Forbidden' })
        return
      }
    }

    if (auth.user.role === 'courier') {
      if (order.courierUserId !== auth.user.id) {
        res.status(403).json({ success: false, error: 'Forbidden' })
        return
      }
      if (status !== 'out_for_delivery' && status !== 'completed') {
        res.status(403).json({ success: false, error: 'Status tidak diizinkan' })
        return
      }
    }

    if (auth.user.role === 'seller') {
      if (order.status === 'awaiting_payment' || order.status === 'created') {
        res.status(409).json({ success: false, error: 'Menunggu pembayaran ke Belanjaku' })
        return
      }
    }

    if (status === 'cancelled') {
      restock(db, order)
    }

    order.status = status
    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

export default router
