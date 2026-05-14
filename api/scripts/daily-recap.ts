import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb, loadDb, type Db } from '../store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function argValue(name: string): string | null {
  const prefix = `--${name}=`
  const v = process.argv.find((a) => a.startsWith(prefix))
  if (!v) return null
  return v.slice(prefix.length)
}

function yyyyMmDdJakarta(date: Date): string {
  const s = date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  return s.slice(0, 10)
}

function isYyyyMmDd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function dateRangeJakarta(dateStr: string): { startIso: string; endIso: string } {
  const startIso = new Date(`${dateStr}T00:00:00+07:00`).toISOString()
  const endIso = new Date(`${dateStr}T23:59:59.999+07:00`).toISOString()
  return { startIso, endIso }
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function summarize(
  db: Db,
  dateStr: string,
  mode: 'basic' | 'full',
): string {
  const { startIso, endIso } = dateRangeJakarta(dateStr)
  const orders = db.orders.filter((o) => o.createdAt >= startIso && o.createdAt <= endIso)
  const orderItemsByOrderId = new Map<string, typeof db.orderItems>()
  if (mode === 'full') {
    for (const it of db.orderItems) {
      const prev = orderItemsByOrderId.get(it.orderId)
      if (prev) prev.push(it)
      else orderItemsByOrderId.set(it.orderId, [it])
    }
  }

  const byStatus: Record<string, number> = {}
  const byPayment: Record<string, number> = {}
  const productAgg: Record<string, { name: string; qty: number; revenue: number }> = {}

  let itemsAmount = 0
  let shippingFee = 0
  let totalAmount = 0

  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
    byPayment[o.paymentChannel] = (byPayment[o.paymentChannel] ?? 0) + 1
    itemsAmount += o.itemsAmount
    shippingFee += o.shippingFee
    totalAmount += o.totalAmount

    if (mode === 'full') {
      for (const it of orderItemsByOrderId.get(o.id) ?? []) {
        const prev = productAgg[it.productId] ?? { name: it.productNameSnapshot, qty: 0, revenue: 0 }
        productAgg[it.productId] = {
          name: prev.name,
          qty: prev.qty + it.qty,
          revenue: prev.revenue + it.qty * it.unitPriceSnapshot,
        }
      }
    }
  }

  const lines: string[] = []
  lines.push(`# Rekap Harian (${dateStr})`)
  lines.push('')
  lines.push(`- Total order: ${orders.length}`)
  lines.push(`- Omzet (subtotal): ${rupiah(itemsAmount)}`)
  lines.push(`- Ongkir: ${rupiah(shippingFee)}`)
  lines.push(`- Total: ${rupiah(totalAmount)}`)
  lines.push('')

  lines.push('## Status order')
  for (const [k, v] of Object.entries(byStatus).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${k}: ${v}`)
  }
  if (!Object.keys(byStatus).length) lines.push('- (tidak ada)')
  lines.push('')

  lines.push('## Metode pembayaran')
  for (const [k, v] of Object.entries(byPayment).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${k}: ${v}`)
  }
  if (!Object.keys(byPayment).length) lines.push('- (tidak ada)')
  lines.push('')

  lines.push('## Daftar order')
  if (!orders.length) {
    lines.push('- (tidak ada)')
  } else {
    lines.push('| ID | Jam | Status | Bayar | Total |')
    lines.push('|---|---:|---|---|---:|')
    for (const o of orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const jam = new Date(o.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
      lines.push(`| ${o.id.slice(0, 12)} | ${jam} | ${o.status} | ${o.paymentChannel} | ${rupiah(o.totalAmount)} |`)
    }
  }
  lines.push('')

  if (mode === 'full') {
    const topProducts = Object.entries(productAgg)
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    lines.push('## Produk terlaris')
    if (!topProducts.length) {
      lines.push('- (tidak ada)')
    } else {
      lines.push('| Produk | Qty | Omzet |')
      lines.push('|---|---:|---:|')
      for (const p of topProducts) {
        lines.push(`| ${p.name} | ${p.qty} | ${rupiah(p.revenue)} |`)
      }
    }
    lines.push('')

    const lowStock = db.products
      .filter((p) => !p.isHidden && p.stockQty <= 5)
      .slice()
      .sort((a, b) => a.stockQty - b.stockQty)

    lines.push('## Stok menipis (<= 5)')
    if (!lowStock.length) {
      lines.push('- (tidak ada)')
    } else {
      lines.push('| Produk | ID | Stok |')
      lines.push('|---|---|---:|')
      for (const p of lowStock) {
        lines.push(`| ${p.name} | ${p.id} | ${p.stockQty} |`)
      }
    }
    lines.push('')
  }

  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  return lines.join('\n')
}

async function main() {
  const dateArg = argValue('date')
  const todayJakarta = yyyyMmDdJakarta(new Date())
  const defaultDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return yyyyMmDdJakarta(d)
  })()
  const dateStr = dateArg && isYyyyMmDd(dateArg) ? dateArg : defaultDate
  if (dateArg && dateStr !== dateArg) {
    process.stdout.write(`WARN: invalid --date=${dateArg}, using ${dateStr}\n`)
  }
  const modeArg = argValue('mode')
  const mode = modeArg === 'full' ? 'full' : 'basic'

  await loadDb()
  const db = await getDb()

  const content = summarize(db, dateStr, mode)
  const reportsDir = path.join(__dirname, '..', '..', 'reports', 'daily')
  await fs.mkdir(reportsDir, { recursive: true })
  const outPath = path.join(reportsDir, `${dateStr}${mode === 'full' ? '.full' : ''}.md`)

  try {
    await fs.access(outPath)
    process.stdout.write(`SKIP: ${outPath} already exists (todayJakarta=${todayJakarta})\n`)
    return
  } catch {
    void 0
  }

  await fs.writeFile(outPath, content, 'utf8')
  process.stdout.write(`OK: wrote ${outPath}\n`)
}

main().catch((e) => {
  process.stderr.write(String((e as Error).stack || (e as Error).message || e) + '\n')
  process.exit(1)
})
