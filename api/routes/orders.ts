import { Router, type Request, type Response } from 'express'
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
} from '../store.js'

const router = Router()

router.post(
  '/orders',
  requireAuth,
  requireRole('buyer'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const stallId = String(req.body?.stallId || '').trim()
    const fulfillment = String(req.body?.fulfillment || '').trim() as FulfillmentMethod
    const addressText = req.body?.addressText ? String(req.body.addressText).trim() : undefined
    const notes = req.body?.notes ? String(req.body.notes).trim() : undefined
    const items = Array.isArray(req.body?.items) ? req.body.items : []

    if (!stallId) {
      res.status(400).json({ success: false, error: 'stallId wajib diisi' })
      return
    }
    if (fulfillment !== 'pickup' && fulfillment !== 'delivery') {
      res.status(400).json({ success: false, error: 'fulfillment tidak valid' })
      return
    }
    if (fulfillment === 'delivery' && (!addressText || addressText.length < 8)) {
      res.status(400).json({ success: false, error: 'Alamat wajib diisi untuk delivery' })
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
    let totalAmount = 0

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
      totalAmount += line
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

    const order: OrderRow = {
      id: newId('ord'),
      buyerUserId: auth.user.id,
      stallId,
      status: 'awaiting_payment',
      fulfillment,
      addressText,
      notes,
      totalAmount,
      paymentTo: 'Belanjaku',
      paymentBank: 'BCA',
      paymentAccountNumber: '0541206603',
      paymentAccountName: 'Adnan Rival Nugraha',
      createdAt: nowIso(),
    }

    for (const it of orderItems) it.orderId = order.id
    db.orders.push(order)
    db.orderItems.push(...orderItems)
    await saveDb(db)

    res.status(201).json({ success: true, data: { order, items: orderItems } })
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
    if (!isBuyer && !isSeller && !isAdmin) {
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

    if (order.status !== 'awaiting_payment' && order.status !== 'created') {
      res.status(409).json({ success: false, error: 'Pembayaran sudah tercatat atau pesanan sudah diproses' })
      return
    }

    order.status = 'paid'
    order.paymentTo = order.paymentTo ?? 'Belanjaku'
    order.paymentMethod = method
    order.paymentSenderName = senderName
    order.paymentReference = reference
    order.paidAt = nowIso()
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
  requireRole('seller', 'admin'),
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

    if (auth.user.role === 'seller') {
      if (order.status === 'awaiting_payment' || order.status === 'created') {
        res.status(409).json({ success: false, error: 'Menunggu pembayaran ke Belanjaku' })
        return
      }
    }

    order.status = status
    await saveDb(db)
    res.json({ success: true, data: order })
  },
)

export default router
