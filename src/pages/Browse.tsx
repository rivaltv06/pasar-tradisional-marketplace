import { apiGet } from '@/api/http'
import type { Product } from '@/api/types'
import { CategoryPills } from '@/components/CategoryPills'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/Button'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const q = params.get('q') ?? ''
  const categoryId = params.get('categoryId')
  const inStock = params.get('inStock') === '1'

  const query = useMemo(() => {
    const qs = new URLSearchParams()
    if (q.trim()) qs.set('q', q.trim())
    if (categoryId) qs.set('categoryId', categoryId)
    if (inStock) qs.set('inStock', '1')
    const s = qs.toString()
    return s ? `/api/products?${s}` : '/api/products'
  }, [categoryId, inStock, q])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet<Product[]>(query)
        if (cancelled) return
        setProducts(data)
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
  }, [query])

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[28px] p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Jelajah Produk</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Filter cepat, tambah ke keranjang, lalu checkout.</div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 w-full items-center gap-2 rounded-2xl border border-[hsl(var(--ink)_/_0.12)] bg-[hsl(var(--bg)_/_0.6)] px-4 sm:w-[360px]">
              <Search size={18} className="text-[hsl(var(--muted))]" />
              <input
                value={q}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  if (e.target.value.trim()) next.set('q', e.target.value)
                  else next.delete('q')
                  setParams(next, { replace: true })
                }}
                placeholder="Cari produk..."
                className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-[hsl(var(--muted))]"
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                const next = new URLSearchParams(params)
                if (inStock) next.delete('inStock')
                else next.set('inStock', '1')
                setParams(next, { replace: true })
              }}
              className="w-full sm:w-auto"
            >
              {inStock ? 'Semua stok' : 'Hanya stok ada'}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <CategoryPills
            value={categoryId}
            onChange={(next) => {
              const p = new URLSearchParams(params)
              if (next) p.set('categoryId', next)
              else p.delete('categoryId')
              setParams(p, { replace: true })
            }}
          />
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="paper h-[280px] animate-pulse rounded-3xl bg-[hsl(var(--ink)_/_0.04)]" />
          ))}
        </div>
      ) : products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="paper rounded-3xl p-8 text-center">
          <div className="font-display text-2xl">Belum ketemu</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Coba ganti kata kunci atau kategori.</div>
        </div>
      )}
    </div>
  )
}

