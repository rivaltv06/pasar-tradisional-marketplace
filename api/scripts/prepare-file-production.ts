import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createPasswordHash } from '../auth-utils.js'
import { defaultSettings, newId, nowIso, type Db, type UserRow } from '../store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error('BOOTSTRAP_ADMIN_NAME/EMAIL/PASSWORD wajib diisi')
  }

  const dbFile = path.join(__dirname, '..', 'data', 'db.json')
  const raw = await fs.readFile(dbFile, 'utf-8')
  const db = JSON.parse(raw) as Db

  const adminId = newId('usr')
  const admin: UserRow = {
    id: adminId,
    role: 'admin',
    name: adminName,
    email: adminEmail,
    passwordHash: createPasswordHash(adminPassword),
    createdAt: nowIso(),
  }

  const markets = db.markets?.length
    ? db.markets
    : [
        {
          id: newId('mkt'),
          name: 'Belanjaku Tasikmalaya',
          city: 'Tasikmalaya',
          address: 'Rajapolah, Tasikmalaya, Jawa Barat, Indonesia',
        },
      ]

  const stalls = db.stalls?.length
    ? db.stalls.map((s) => ({ ...s, sellerUserId: adminId }))
    : [
        {
          id: newId('stl'),
          sellerUserId: adminId,
          marketId: markets[0].id,
          name: 'Belanjaku',
          description: 'Belanja kebutuhan harian. Delivery Tasikmalaya.',
          isActive: true,
          ratingAvg: 0,
        },
      ]

  const sanitized: Db = {
    users: [admin],
    markets,
    stalls,
    products: db.products ?? [],
    orders: [],
    orderItems: [],
    settings: db.settings ?? defaultSettings(),
    mitraApplications: [],
  }

  await fs.writeFile(dbFile, JSON.stringify(sanitized, null, 2), 'utf-8')
  process.stdout.write('ok\n')
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
