import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { seedDb } from './seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type UserRole = 'buyer' | 'seller' | 'admin'

export type UserRow = {
  id: string
  role: UserRole
  name: string
  email?: string
  phone?: string
  passwordHash: string
  createdAt: string
}

export type MarketRow = {
  id: string
  name: string
  city: string
  address?: string
}

export type StallRow = {
  id: string
  sellerUserId: string
  marketId: string
  name: string
  description?: string
  openHours?: string
  isActive: boolean
  ratingAvg: number
}

export type ProductUnit = 'kg' | 'ikat' | 'buah' | 'bungkus' | 'ekor'

export type ProductRow = {
  id: string
  stallId: string
  name: string
  categoryId: string
  price: number
  unit: ProductUnit
  stockQty: number
  isHidden: boolean
  imageUrl?: string
}

export type OrderStatus =
  | 'created'
  | 'awaiting_payment'
  | 'paid'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'

export type FulfillmentMethod = 'pickup' | 'delivery'

export type OrderRow = {
  id: string
  buyerUserId: string
  stallId: string
  status: OrderStatus
  fulfillment: FulfillmentMethod
  addressText?: string
  notes?: string
  totalAmount: number
  paymentTo?: string
  paymentBank?: string
  paymentAccountNumber?: string
  paymentAccountName?: string
  paymentMethod?: string
  paymentSenderName?: string
  paymentReference?: string
  paidAt?: string
  createdAt: string
}

export type OrderItemRow = {
  id: string
  orderId: string
  productId: string
  productNameSnapshot: string
  unitPriceSnapshot: number
  qty: number
  unitSnapshot: ProductUnit
  notes?: string
}

export type Db = {
  users: UserRow[]
  markets: MarketRow[]
  stalls: StallRow[]
  products: ProductRow[]
  orders: OrderRow[]
  orderItems: OrderItemRow[]
}

const DB_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DB_DIR, 'db.json')

let cachedDb: Db | null = null
let writeInFlight: Promise<void> | null = null

export function nowIso(): string {
  return new Date().toISOString()
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export async function loadDb(): Promise<Db> {
  if (cachedDb) return cachedDb

  await fs.mkdir(DB_DIR, { recursive: true })

  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Db
    if (!parsed?.users || !parsed?.markets) {
      cachedDb = seedDb()
      await saveDb(cachedDb)
      return cachedDb
    }
    cachedDb = parsed
    return cachedDb
  } catch {
    cachedDb = seedDb()
    await saveDb(cachedDb)
    return cachedDb
  }
}

export async function saveDb(db: Db): Promise<void> {
  cachedDb = db
  const doWrite = async () => {
    await fs.mkdir(DB_DIR, { recursive: true })
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8')
  }

  writeInFlight = (writeInFlight ?? Promise.resolve()).then(doWrite)
  await writeInFlight
}

export async function getDb(): Promise<Db> {
  return loadDb()
}
