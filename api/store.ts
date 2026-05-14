import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { Pool } from 'pg'
import { seedDb } from './seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type UserRole = 'buyer' | 'seller' | 'courier' | 'admin'

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

export type PaymentChannel = 'transfer' | 'qris' | 'cod'

export type PromoSettings = {
  enabled: boolean
  title: string
  subtitle: string
  ctaLabel: string
  ctaCategoryId?: string
  minItemsAmount: number
  imageUrl?: string
}

export type AppSettings = {
  promo: PromoSettings
}

export type MitraApplicationStatus = 'pending' | 'approved' | 'rejected'

export type MitraApplicationRow = {
  id: string
  name: string
  email?: string
  phone: string
  addressText: string
  passwordHash: string
  status: MitraApplicationStatus
  createdAt: string
  reviewedAt?: string
  reviewedByUserId?: string
  approvedUserId?: string
}

export type OrderRow = {
  id: string
  buyerUserId: string
  stallId: string
  courierUserId?: string
  status: OrderStatus
  fulfillment: FulfillmentMethod
  addressText?: string
  notes?: string
  itemsAmount: number
  shippingFee: number
  totalAmount: number
  paymentChannel: PaymentChannel
  paymentTo?: string
  paymentBank?: string
  paymentAccountNumber?: string
  paymentAccountName?: string
  paymentMethod?: string
  paymentSenderName?: string
  paymentReference?: string
  paymentProofUrl?: string
  paidAt?: string
  stockDeducted?: boolean
  stockDeductedAt?: string
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
  settings: AppSettings
  mitraApplications: MitraApplicationRow[]
}

const DB_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DB_DIR, 'db.json')

let cachedDb: Db | null = null
let writeInFlight: Promise<void> | null = null
let pgPool: Pool | null = null
let pgReady: Promise<void> | null = null

export function defaultSettings(): AppSettings {
  return {
    promo: {
      enabled: false,
      title: 'Gratis ongkir',
      subtitle: 'Atur promo di menu Admin.',
      ctaLabel: 'Lihat promo',
      minItemsAmount: 0,
      imageUrl: undefined,
    },
  }
}

function hasPostgres(): boolean {
  const url = process.env.DATABASE_URL
  return Boolean(url && (url.startsWith('postgres://') || url.startsWith('postgresql://')))
}

function getPgPool(): Pool {
  if (!pgPool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL belum diset')
    const needsSsl = !url.includes('localhost') && !url.includes('127.0.0.1')
    pgPool = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX || 5),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    })
  }
  return pgPool
}

async function ensurePgSchema(): Promise<void> {
  const pool = getPgPool()
  await pool.query(`
    create table if not exists users (
      id text primary key,
      role text not null,
      name text not null,
      email text,
      phone text,
      password_hash text not null,
      created_at text not null
    );
    create table if not exists markets (
      id text primary key,
      name text not null,
      city text not null,
      address text
    );
    create table if not exists stalls (
      id text primary key,
      seller_user_id text not null,
      market_id text not null,
      name text not null,
      description text,
      open_hours text,
      is_active boolean not null,
      rating_avg double precision not null
    );
    create table if not exists products (
      id text primary key,
      stall_id text not null,
      name text not null,
      category_id text not null,
      price integer not null,
      unit text not null,
      stock_qty integer not null,
      is_hidden boolean not null,
      image_url text
    );
    create table if not exists orders (
      id text primary key,
      buyer_user_id text not null,
      stall_id text not null,
      courier_user_id text,
      status text not null,
      fulfillment text not null,
      address_text text,
      notes text,
      items_amount integer not null,
      shipping_fee integer not null,
      total_amount integer not null,
      payment_channel text not null,
      payment_to text,
      payment_bank text,
      payment_account_number text,
      payment_account_name text,
      payment_method text,
      payment_sender_name text,
      payment_reference text,
      payment_proof_url text,
      paid_at text,
      stock_deducted boolean not null default false,
      stock_deducted_at text,
      created_at text not null
    );
    alter table orders add column if not exists courier_user_id text;
    alter table orders add column if not exists payment_proof_url text;
    alter table orders add column if not exists stock_deducted boolean;
    alter table orders add column if not exists stock_deducted_at text;
    create table if not exists order_items (
      id text primary key,
      order_id text not null,
      product_id text not null,
      product_name_snapshot text not null,
      unit_price_snapshot integer not null,
      qty integer not null,
      unit_snapshot text not null,
      notes text
    );
    create table if not exists mitra_applications (
      id text primary key,
      name text not null,
      email text,
      phone text not null,
      address_text text not null,
      password_hash text not null,
      status text not null,
      created_at text not null,
      reviewed_at text,
      reviewed_by_user_id text,
      approved_user_id text
    );
    create table if not exists app_settings (
      key text primary key,
      value text not null
    );
  `)
}

async function ensurePgReady(): Promise<void> {
  if (!pgReady) {
    pgReady = ensurePgSchema()
  }
  await pgReady
}

async function loadDbFromPostgres(): Promise<Db> {
  await ensurePgReady()
  const pool = getPgPool()
  const [users, markets, stalls, products, orders, orderItems, mitraApplications, settings] = await Promise.all([
    pool.query('select * from users'),
    pool.query('select * from markets'),
    pool.query('select * from stalls'),
    pool.query('select * from products'),
    pool.query('select * from orders'),
    pool.query('select * from order_items'),
    pool.query('select * from mitra_applications'),
    pool.query('select * from app_settings'),
  ])

  let promo: PromoSettings | null = null
  for (const r of settings.rows) {
    if (r.key === 'promo') {
      try {
        promo = JSON.parse(String(r.value)) as PromoSettings
      } catch {
        promo = null
      }
    }
  }

  return {
    users: users.rows.map((r) => ({
      id: r.id,
      role: r.role,
      name: r.name,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      passwordHash: r.password_hash,
      createdAt: r.created_at,
    })),
    markets: markets.rows.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      address: r.address ?? undefined,
    })),
    stalls: stalls.rows.map((r) => ({
      id: r.id,
      sellerUserId: r.seller_user_id,
      marketId: r.market_id,
      name: r.name,
      description: r.description ?? undefined,
      openHours: r.open_hours ?? undefined,
      isActive: Boolean(r.is_active),
      ratingAvg: Number(r.rating_avg),
    })),
    products: products.rows.map((r) => ({
      id: r.id,
      stallId: r.stall_id,
      name: r.name,
      categoryId: r.category_id,
      price: Number(r.price),
      unit: r.unit,
      stockQty: Number(r.stock_qty),
      isHidden: Boolean(r.is_hidden),
      imageUrl: r.image_url ?? undefined,
    })),
    orders: orders.rows.map((r) => ({
      id: r.id,
      buyerUserId: r.buyer_user_id,
      stallId: r.stall_id,
      courierUserId: r.courier_user_id ?? undefined,
      status: r.status,
      fulfillment: r.fulfillment,
      addressText: r.address_text ?? undefined,
      notes: r.notes ?? undefined,
      itemsAmount: Number(r.items_amount),
      shippingFee: Number(r.shipping_fee),
      totalAmount: Number(r.total_amount),
      paymentChannel: r.payment_channel,
      paymentTo: r.payment_to ?? undefined,
      paymentBank: r.payment_bank ?? undefined,
      paymentAccountNumber: r.payment_account_number ?? undefined,
      paymentAccountName: r.payment_account_name ?? undefined,
      paymentMethod: r.payment_method ?? undefined,
      paymentSenderName: r.payment_sender_name ?? undefined,
      paymentReference: r.payment_reference ?? undefined,
      paymentProofUrl: r.payment_proof_url ?? undefined,
      paidAt: r.paid_at ?? undefined,
      stockDeducted: r.stock_deducted !== null && r.stock_deducted !== undefined ? Boolean(r.stock_deducted) : undefined,
      stockDeductedAt: r.stock_deducted_at ?? undefined,
      createdAt: r.created_at,
    })),
    orderItems: orderItems.rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      productId: r.product_id,
      productNameSnapshot: r.product_name_snapshot,
      unitPriceSnapshot: Number(r.unit_price_snapshot),
      qty: Number(r.qty),
      unitSnapshot: r.unit_snapshot,
      notes: r.notes ?? undefined,
    })),
    settings: { ...defaultSettings(), promo: promo ?? defaultSettings().promo },
    mitraApplications: mitraApplications.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email ?? undefined,
      phone: r.phone,
      addressText: r.address_text,
      passwordHash: r.password_hash,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at ?? undefined,
      reviewedByUserId: r.reviewed_by_user_id ?? undefined,
      approvedUserId: r.approved_user_id ?? undefined,
    })),
  }
}

async function upsertMany<T>(
  rows: T[],
  run: (row: T) => Promise<void>,
): Promise<void> {
  for (const row of rows) await run(row)
}

async function saveDbToPostgres(db: Db): Promise<void> {
  await ensurePgReady()
  const pool = getPgPool()
  const client = await pool.connect()
  try {
    await client.query('begin')

    await upsertMany(db.users, async (u) => {
      await client.query(
        `insert into users (id, role, name, email, phone, password_hash, created_at)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do update set
           role=excluded.role,
           name=excluded.name,
           email=excluded.email,
           phone=excluded.phone,
           password_hash=excluded.password_hash,
           created_at=excluded.created_at`,
        [u.id, u.role, u.name, u.email ?? null, u.phone ?? null, u.passwordHash, u.createdAt],
      )
    })

    await upsertMany(db.markets, async (m) => {
      await client.query(
        `insert into markets (id, name, city, address)
         values ($1,$2,$3,$4)
         on conflict (id) do update set
           name=excluded.name,
           city=excluded.city,
           address=excluded.address`,
        [m.id, m.name, m.city, m.address ?? null],
      )
    })

    await upsertMany(db.stalls, async (s) => {
      await client.query(
        `insert into stalls (id, seller_user_id, market_id, name, description, open_hours, is_active, rating_avg)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set
           seller_user_id=excluded.seller_user_id,
           market_id=excluded.market_id,
           name=excluded.name,
           description=excluded.description,
           open_hours=excluded.open_hours,
           is_active=excluded.is_active,
           rating_avg=excluded.rating_avg`,
        [
          s.id,
          s.sellerUserId,
          s.marketId,
          s.name,
          s.description ?? null,
          s.openHours ?? null,
          s.isActive,
          s.ratingAvg,
        ],
      )
    })

    await upsertMany(db.products, async (p) => {
      await client.query(
        `insert into products (id, stall_id, name, category_id, price, unit, stock_qty, is_hidden, image_url)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (id) do update set
           stall_id=excluded.stall_id,
           name=excluded.name,
           category_id=excluded.category_id,
           price=excluded.price,
           unit=excluded.unit,
           stock_qty=excluded.stock_qty,
           is_hidden=excluded.is_hidden,
           image_url=excluded.image_url`,
        [
          p.id,
          p.stallId,
          p.name,
          p.categoryId,
          p.price,
          p.unit,
          p.stockQty,
          p.isHidden,
          p.imageUrl ?? null,
        ],
      )
    })

    await upsertMany(db.orders, async (o) => {
      await client.query(
        `insert into orders (
           id, buyer_user_id, stall_id, courier_user_id, status, fulfillment, address_text, notes,
           items_amount, shipping_fee, total_amount, payment_channel,
           payment_to, payment_bank, payment_account_number, payment_account_name,
           payment_method, payment_sender_name, payment_reference, payment_proof_url, paid_at,
           stock_deducted, stock_deducted_at, created_at
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,
           $13,$14,$15,$16,
           $17,$18,$19,$20,$21,
           $22,$23,$24
         )
         on conflict (id) do update set
           buyer_user_id=excluded.buyer_user_id,
           stall_id=excluded.stall_id,
           courier_user_id=excluded.courier_user_id,
           status=excluded.status,
           fulfillment=excluded.fulfillment,
           address_text=excluded.address_text,
           notes=excluded.notes,
           items_amount=excluded.items_amount,
           shipping_fee=excluded.shipping_fee,
           total_amount=excluded.total_amount,
           payment_channel=excluded.payment_channel,
           payment_to=excluded.payment_to,
           payment_bank=excluded.payment_bank,
           payment_account_number=excluded.payment_account_number,
           payment_account_name=excluded.payment_account_name,
           payment_method=excluded.payment_method,
           payment_sender_name=excluded.payment_sender_name,
           payment_reference=excluded.payment_reference,
           payment_proof_url=excluded.payment_proof_url,
           paid_at=excluded.paid_at,
           stock_deducted=excluded.stock_deducted,
           stock_deducted_at=excluded.stock_deducted_at,
           created_at=excluded.created_at`,
        [
          o.id,
          o.buyerUserId,
          o.stallId,
          o.courierUserId ?? null,
          o.status,
          o.fulfillment,
          o.addressText ?? null,
          o.notes ?? null,
          o.itemsAmount,
          o.shippingFee,
          o.totalAmount,
          o.paymentChannel,
          o.paymentTo ?? null,
          o.paymentBank ?? null,
          o.paymentAccountNumber ?? null,
          o.paymentAccountName ?? null,
          o.paymentMethod ?? null,
          o.paymentSenderName ?? null,
          o.paymentReference ?? null,
          o.paymentProofUrl ?? null,
          o.paidAt ?? null,
          o.stockDeducted ?? false,
          o.stockDeductedAt ?? null,
          o.createdAt,
        ],
      )
    })

    await upsertMany(db.orderItems, async (it) => {
      await client.query(
        `insert into order_items (
           id, order_id, product_id, product_name_snapshot, unit_price_snapshot, qty, unit_snapshot, notes
         ) values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set
           order_id=excluded.order_id,
           product_id=excluded.product_id,
           product_name_snapshot=excluded.product_name_snapshot,
           unit_price_snapshot=excluded.unit_price_snapshot,
           qty=excluded.qty,
           unit_snapshot=excluded.unit_snapshot,
           notes=excluded.notes`,
        [
          it.id,
          it.orderId,
          it.productId,
          it.productNameSnapshot,
          it.unitPriceSnapshot,
          it.qty,
          it.unitSnapshot,
          it.notes ?? null,
        ],
      )
    })

    await upsertMany(db.mitraApplications ?? [], async (m) => {
      await client.query(
        `insert into mitra_applications (
           id, name, email, phone, address_text, password_hash, status, created_at,
           reviewed_at, reviewed_by_user_id, approved_user_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (id) do update set
           name=excluded.name,
           email=excluded.email,
           phone=excluded.phone,
           address_text=excluded.address_text,
           password_hash=excluded.password_hash,
           status=excluded.status,
           created_at=excluded.created_at,
           reviewed_at=excluded.reviewed_at,
           reviewed_by_user_id=excluded.reviewed_by_user_id,
           approved_user_id=excluded.approved_user_id`,
        [
          m.id,
          m.name,
          m.email ?? null,
          m.phone,
          m.addressText,
          m.passwordHash,
          m.status,
          m.createdAt,
          m.reviewedAt ?? null,
          m.reviewedByUserId ?? null,
          m.approvedUserId ?? null,
        ],
      )
    })

    await client.query(
      `insert into app_settings (key, value)
       values ($1, $2)
       on conflict (key) do update set value=excluded.value`,
      ['promo', JSON.stringify(db.settings?.promo ?? defaultSettings().promo)],
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export async function loadDb(): Promise<Db> {
  if (cachedDb) return cachedDb

  if (hasPostgres()) {
    const db = await loadDbFromPostgres()
    if (db.users.length === 0 || db.markets.length === 0) {
      cachedDb = seedDb()
      await saveDb(cachedDb)
      return cachedDb
    }
    cachedDb = db
    return cachedDb
  }

  await fs.mkdir(DB_DIR, { recursive: true })

  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Db
    if (!parsed?.users || !parsed?.markets) {
      cachedDb = seedDb()
      await saveDb(cachedDb)
      return cachedDb
    }
    for (const o of parsed.orders ?? []) {
      const anyOrder = o as unknown as Partial<OrderRow>
      const itemsAmount = typeof anyOrder.itemsAmount === 'number' ? anyOrder.itemsAmount : o.totalAmount ?? 0
      const shippingFee = typeof anyOrder.shippingFee === 'number' ? anyOrder.shippingFee : 0
      ;(o as unknown as OrderRow).itemsAmount = itemsAmount
      ;(o as unknown as OrderRow).shippingFee = shippingFee
      ;(o as unknown as OrderRow).totalAmount = o.totalAmount ?? itemsAmount + shippingFee
      ;(o as unknown as OrderRow).paymentChannel = anyOrder.paymentChannel ?? 'transfer'
      ;(o as unknown as OrderRow).courierUserId = anyOrder.courierUserId ?? undefined
      ;(o as unknown as OrderRow).paymentProofUrl = anyOrder.paymentProofUrl ?? undefined
      ;(o as unknown as OrderRow).stockDeducted = typeof anyOrder.stockDeducted === 'boolean' ? anyOrder.stockDeducted : false
      ;(o as unknown as OrderRow).stockDeductedAt = anyOrder.stockDeductedAt ?? undefined
    }
    ;(parsed as unknown as { settings?: AppSettings }).settings = parsed.settings ?? defaultSettings()
    if (!parsed.settings?.promo) parsed.settings = { ...defaultSettings(), ...parsed.settings, promo: defaultSettings().promo }
    ;(parsed as unknown as { mitraApplications?: MitraApplicationRow[] }).mitraApplications = parsed.mitraApplications ?? []
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
  if (hasPostgres()) {
    await saveDbToPostgres(db)
    return
  }
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
