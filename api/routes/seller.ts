import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole, type AuthContext } from '../middleware/auth.js'
import {
  getDb,
  newId,
  saveDb,
  type ProductRow,
  type ProductUnit,
  type StallRow,
} from '../store.js'

const router = Router()

router.get(
  '/seller/stall',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const stall = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    res.json({ success: true, data: stall ?? null })
  },
)

router.post(
  '/seller/stall',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const existing = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    if (existing) {
      res.status(409).json({ success: false, error: 'Kios sudah ada' })
      return
    }

    const marketId = String(req.body?.marketId || '').trim()
    const name = String(req.body?.name || '').trim()
    const description = req.body?.description ? String(req.body.description).trim() : undefined
    const openHours = req.body?.openHours ? String(req.body.openHours).trim() : undefined

    if (!marketId) {
      res.status(400).json({ success: false, error: 'marketId wajib diisi' })
      return
    }
    if (name.length < 3) {
      res.status(400).json({ success: false, error: 'Nama kios minimal 3 karakter' })
      return
    }
    const market = db.markets.find((m) => m.id === marketId)
    if (!market) {
      res.status(404).json({ success: false, error: 'Pasar tidak ditemukan' })
      return
    }

    const stall: StallRow = {
      id: newId('stl'),
      sellerUserId: auth.user.id,
      marketId,
      name,
      description,
      openHours,
      isActive: true,
      ratingAvg: 0,
    }

    db.stalls.push(stall)
    await saveDb(db)
    res.status(201).json({ success: true, data: stall })
  },
)

function normalizeUnit(value: unknown): ProductUnit | null {
  if (
    value === 'kg' ||
    value === 'ikat' ||
    value === 'buah' ||
    value === 'bungkus' ||
    value === 'ekor'
  ) {
    return value
  }
  return null
}

router.post(
  '/seller/products',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const stall = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    if (!stall) {
      res.status(400).json({ success: false, error: 'Buat kios dulu' })
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
      stallId: stall.id,
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

router.get(
  '/seller/products',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const stall = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    if (!stall) {
      res.json({ success: true, data: [] })
      return
    }
    const products = db.products.filter((p) => p.stallId === stall.id)
    res.json({ success: true, data: products })
  },
)

router.patch(
  '/seller/products/:id',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const stall = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    if (!stall) {
      res.status(400).json({ success: false, error: 'Buat kios dulu' })
      return
    }

    const productId = String(req.params.id)
    const product = db.products.find((p) => p.id === productId && p.stallId === stall.id)
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
  '/seller/products/:id/visibility',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const stall = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    if (!stall) {
      res.status(400).json({ success: false, error: 'Buat kios dulu' })
      return
    }

    const productId = String(req.params.id)
    const product = db.products.find((p) => p.id === productId && p.stallId === stall.id)
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

router.get(
  '/seller/orders',
  requireAuth,
  requireRole('seller'),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthContext
    const db = await getDb()
    const stall = db.stalls.find((s) => s.sellerUserId === auth.user.id)
    if (!stall) {
      res.json({ success: true, data: [] })
      return
    }

    const orders = db.orders
      .filter((o) => o.stallId === stall.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => ({
        order,
        items: db.orderItems.filter((it) => it.orderId === order.id),
      }))

    res.json({ success: true, data: orders })
  },
)

export default router
