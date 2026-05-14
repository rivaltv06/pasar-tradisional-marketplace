import crypto from 'crypto'
import type {
  Db,
  MarketRow,
  ProductRow,
  StallRow,
  UserRole,
  UserRow,
} from './store.js'
import { defaultSettings } from './store.js'

function nowIso(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 32, 'sha256')
    .toString('hex')
  return `pbkdf2_sha256$120000$${salt}$${hash}`
}

function makeUser(params: {
  role: UserRole
  name: string
  email?: string
  phone?: string
  password: string
}): UserRow {
  return {
    id: newId('usr'),
    role: params.role,
    name: params.name,
    email: params.email,
    phone: params.phone,
    passwordHash: hashPassword(params.password),
    createdAt: nowIso(),
  }
}

export function seedDb(): Db {
  const isProd = process.env.NODE_ENV === 'production'
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD

  if (isProd && (!adminName || !adminEmail || !adminPassword)) {
    throw new Error('BOOTSTRAP_ADMIN_NAME/EMAIL/PASSWORD wajib diisi untuk production')
  }

  const admin = makeUser({
    role: 'admin',
    name: adminName || 'Admin Belanjaku',
    email: adminEmail || 'admin@pasar.local',
    password: adminPassword || 'demo12345',
  })

  if (isProd) {
    const markets: MarketRow[] = [
      {
        id: newId('mkt'),
        name: 'Belanjaku Tasikmalaya',
        city: 'Tasikmalaya',
        address: 'Rajapolah, Tasikmalaya, Jawa Barat, Indonesia',
      },
    ]

    const stalls: StallRow[] = [
      {
        id: newId('stl'),
        sellerUserId: admin.id,
        marketId: markets[0].id,
        name: 'Belanjaku',
        description: 'Belanja kebutuhan harian. Delivery Tasikmalaya.',
        isActive: true,
        ratingAvg: 0,
      },
    ]

    return {
      users: [admin],
      markets,
      stalls,
      products: [],
      orders: [],
      orderItems: [],
      settings: defaultSettings(),
      mitraApplications: [],
    }
  }

  const seller = makeUser({
    role: 'seller',
    name: 'Bu Sari',
    phone: '081234567890',
    password: 'demo12345',
  })

  const buyer = makeUser({
    role: 'buyer',
    name: 'Raka',
    phone: '081200000001',
    password: 'demo12345',
  })

  const markets: MarketRow[] = [
    {
      id: newId('mkt'),
      name: 'Pasar Pagi Kota',
      city: 'Jakarta',
      address: 'Jl. Pasar Pagi No. 12',
    },
    {
      id: newId('mkt'),
      name: 'Pasar Induk Sentral',
      city: 'Jakarta',
      address: 'Jl. Raya Sentral No. 8',
    },
  ]

  const stalls: StallRow[] = [
    {
      id: newId('stl'),
      sellerUserId: seller.id,
      marketId: markets[0].id,
      name: 'Kios Segar Bu Sari',
      description: 'Sayur & bumbu harian. Bisa titip pilih yang segar.',
      openHours: '05:00–12:00',
      isActive: true,
      ratingAvg: 4.8,
    },
  ]

  const products: ProductRow[] = [
    {
      id: newId('prd'),
      stallId: stalls[0].id,
      name: 'Cabai Rawit Merah',
      categoryId: 'bumbu',
      price: 65000,
      unit: 'kg',
      stockQty: 12,
      isHidden: false,
      imageUrl:
        'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=close-up%20of%20fresh%20red%20bird%27s%20eye%20chilies%20on%20a%20woven%20bamboo%20tray%2C%20morning%20market%20lighting%2C%20warm%20tones%2C%20shallow%20depth%20of%20field%2C%20high%20detail%2C%20photorealistic&image_size=landscape_4_3',
    },
    {
      id: newId('prd'),
      stallId: stalls[0].id,
      name: 'Bawang Merah',
      categoryId: 'bumbu',
      price: 42000,
      unit: 'kg',
      stockQty: 30,
      isHidden: false,
      imageUrl:
        'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=photorealistic%20shallots%20in%20a%20market%20basket%2C%20natural%20morning%20light%2C%20warm%20paper%20background%2C%20high%20detail%2C%20traditional%20market%20vibe&image_size=landscape_4_3',
    },
    {
      id: newId('prd'),
      stallId: stalls[0].id,
      name: 'Tomat Merah',
      categoryId: 'sayur',
      price: 18000,
      unit: 'kg',
      stockQty: 18,
      isHidden: false,
      imageUrl:
        'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=ripe%20red%20tomatoes%20stacked%20at%20a%20traditional%20market%20stall%2C%20soft%20morning%20light%2C%20subtle%20grain%2C%20photorealistic%2C%20high%20detail&image_size=landscape_4_3',
    },
    {
      id: newId('prd'),
      stallId: stalls[0].id,
      name: 'Bayam (1 ikat)',
      categoryId: 'sayur',
      price: 5000,
      unit: 'ikat',
      stockQty: 40,
      isHidden: false,
      imageUrl:
        'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=fresh%20spinach%20bundles%20tied%20with%20raffia%2C%20traditional%20market%20table%2C%20warm%20light%2C%20photorealistic%2C%20high%20detail&image_size=landscape_4_3',
    },
  ]

  return {
    users: [admin, seller, buyer],
    markets,
    stalls,
    products,
    orders: [],
    orderItems: [],
    settings: defaultSettings(),
    mitraApplications: [],
  }
}
