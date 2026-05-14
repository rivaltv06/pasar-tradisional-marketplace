import { apiGet } from '@/api/http'
import type { Product } from '@/api/types'
import { CategoryPills } from '@/components/CategoryPills'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/Button'
import { ArrowRight, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const p = await apiGet<Product[]>('/api/products')
        if (cancelled) return
        setProducts(p)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    let p = products
    if (categoryId) p = p.filter((it) => it.categoryId === categoryId)
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      p = p.filter((it) => it.name.toLowerCase().includes(qq))
    }
    return p.slice(0, 8)
  }, [categoryId, products, q])

  return (
    <div className="space-y-8">
      <section className="paper grain overflow-hidden rounded-[32px] p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--leaf)_/_0.10)] px-3 py-1 text-xs text-[hsl(var(--leaf))]">
              <MapPin size={14} />
              <span>Belanja bahan pokok dari kios terdekat</span>
            </div>
            <h1 className="font-display mt-4 text-4xl leading-[1.05] md:text-6xl">
              Belanjaku: kebutuhan harian, tinggal pesan.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] text-[hsl(var(--muted))] md:text-base">
              Temukan sayur, bumbu, buah, dan kebutuhan harian. Pesan pickup atau delivery, lalu lakukan
              pembayaran ke Belanjaku terlebih dahulu agar pesanan diproses.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-[hsl(var(--ink)_/_0.12)] bg-[hsl(var(--bg)_/_0.6)] px-4">
                <Search size={18} className="text-[hsl(var(--muted))]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari cabai, tomat, bawang..."
                  className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-[hsl(var(--muted))]"
                />
              </div>
              <Button
                onClick={() =>
                  navigate(`/jelajah?q=${encodeURIComponent(q.trim())}${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ''}`)
                }
                className="w-full sm:w-auto"
              >
                <span>Jelajah</span>
                <ArrowRight size={18} />
              </Button>
            </div>

            <div className="mt-6">
              <CategoryPills value={categoryId} onChange={setCategoryId} />
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] bg-[hsl(var(--ink)_/_0.03)] p-4 md:p-5">
            <div className="text-sm text-[hsl(var(--muted))]">Coba akun demo</div>
            <div className="rounded-2xl bg-[hsl(var(--bg)_/_0.7)] p-4">
              <div className="font-display text-lg">Pembeli</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted))]">HP: 081200000001 • Pass: demo12345</div>
            </div>
            <div className="rounded-2xl bg-[hsl(var(--bg)_/_0.7)] p-4">
              <div className="font-display text-lg">Pedagang</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted))]">HP: 081234567890 • Pass: demo12345</div>
            </div>
            <Link to="/masuk" className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
              Masuk sekarang
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-2xl">Rekomendasi hari ini</div>
            <div className="text-sm text-[hsl(var(--muted))]">Pilihan cepat dari kios yang sedang buka</div>
          </div>
          <Link to="/jelajah" className="hidden text-sm text-[hsl(var(--leaf))] underline underline-offset-4 md:block">
            Lihat semua
          </Link>
        </div>

        {error ? (
          <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="paper h-[280px] animate-pulse rounded-3xl bg-[hsl(var(--ink)_/_0.04)]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
