import { Router, type Request, type Response } from 'express'
import { getDb, type StallRow } from '../store.js'

const router = Router()

router.get('/markets', async (req: Request, res: Response) => {
  const db = await getDb()
  res.json({ success: true, data: db.markets })
})

router.get('/stalls', async (req: Request, res: Response) => {
  const db = await getDb()
  const marketId = req.query.marketId ? String(req.query.marketId) : null
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : null

  let stalls = db.stalls.filter((s) => s.isActive)
  if (marketId) stalls = stalls.filter((s) => s.marketId === marketId)
  if (q) stalls = stalls.filter((s) => s.name.toLowerCase().includes(q))

  res.json({ success: true, data: stalls })
})

router.get('/stalls/:id', async (req: Request, res: Response) => {
  const db = await getDb()
  const stallId = String(req.params.id)
  const stall = db.stalls.find((s) => s.id === stallId)
  if (!stall) {
    res.status(404).json({ success: false, error: 'Kios tidak ditemukan' })
    return
  }
  const products = db.products.filter((p) => p.stallId === stallId && !p.isHidden)
  res.json({ success: true, data: { stall, products } })
})

function toNumber(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

router.get('/products', async (req: Request, res: Response) => {
  const db = await getDb()
  const marketId = req.query.marketId ? String(req.query.marketId) : null
  const stallId = req.query.stallId ? String(req.query.stallId) : null
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : null
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : null
  const minPrice = req.query.minPrice ? toNumber(req.query.minPrice) : null
  const maxPrice = req.query.maxPrice ? toNumber(req.query.maxPrice) : null
  const inStock = req.query.inStock ? String(req.query.inStock) === '1' : false

  let products = db.products.filter((p) => !p.isHidden)

  const stallsById = new Map<string, StallRow>(db.stalls.map((s) => [s.id, s]))
  if (marketId) {
    products = products.filter((p) => stallsById.get(p.stallId)?.marketId === marketId)
  }
  if (stallId) products = products.filter((p) => p.stallId === stallId)
  if (categoryId) products = products.filter((p) => p.categoryId === categoryId)
  if (q) products = products.filter((p) => p.name.toLowerCase().includes(q))
  if (minPrice !== null) products = products.filter((p) => p.price >= minPrice)
  if (maxPrice !== null) products = products.filter((p) => p.price <= maxPrice)
  if (inStock) products = products.filter((p) => p.stockQty > 0)

  res.json({ success: true, data: products })
})

router.get('/products/:id', async (req: Request, res: Response) => {
  const db = await getDb()
  const productId = String(req.params.id)
  const product = db.products.find((p) => p.id === productId && !p.isHidden)
  if (!product) {
    res.status(404).json({ success: false, error: 'Produk tidak ditemukan' })
    return
  }
  const stall = db.stalls.find((s) => s.id === product.stallId)
  res.json({ success: true, data: { product, stall } })
})

export default router
