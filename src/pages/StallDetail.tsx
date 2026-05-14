import { apiGet } from '@/api/http'
import type { Product, Stall } from '@/api/types'
import { ProductCard } from '@/components/ProductCard'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

type Data = { stall: Stall; products: Product[] }

export default function StallDetail() {
  const { id } = useParams()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await apiGet<Data>(`/api/stalls/${encodeURIComponent(String(id))}`)
        if (cancelled) return
        setData(res)
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
  }, [id])

  if (loading) {
    return <div className="paper h-[520px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
  }

  if (error) {
    return <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-4xl leading-tight">{data.stall.name}</div>
            <div className="mt-2 max-w-2xl text-[15px] text-[hsl(var(--muted))]">
              {data.stall.description ?? 'Pedagang pasar, siap melayani pesanan harian.'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-[hsl(var(--muted))]">
              <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1">
                {data.stall.openHours ?? 'Jam buka belum diisi'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1">
                <Star size={14} className="text-[hsl(var(--turmeric))]" />
                <span>{data.stall.ratingAvg.toFixed(1)}</span>
              </span>
            </div>
          </div>
          <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-4 text-sm text-[hsl(var(--muted))]">
            Tips: tambah beberapa item lalu checkout. Jika stok berubah, pedagang bisa usulkan substitusi.
          </div>
        </div>
      </div>

      {data.products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="paper grain rounded-[32px] p-10 text-center">
          <div className="font-display text-3xl">Belum ada produk</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Coba cek lagi nanti atau jelajah produk lain.</div>
        </div>
      )}
    </div>
  )
}
