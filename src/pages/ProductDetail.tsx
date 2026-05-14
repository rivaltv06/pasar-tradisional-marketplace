import { apiGet } from '@/api/http'
import type { Product } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { categoryLabel } from '@/constants/categories'
import { useCartStore } from '@/stores/cartStore'
import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type Data = { product: Product }

export default function ProductDetail() {
  const { id } = useParams()
  const addProduct = useCartStore((s) => s.addProduct)
  const [data, setData] = useState<Data | null>(null)
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await apiGet<Data>(`/api/products/${encodeURIComponent(String(id))}`)
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

  const total = useMemo(() => {
    if (!data) return 0
    return data.product.price * qty
  }, [data, qty])

  const maxQty = useMemo(() => {
    if (!data) return 0
    return Math.max(0, Math.floor(data.product.stockQty))
  }, [data])

  useEffect(() => {
    if (!data) return
    setQty((v) => Math.min(Math.max(1, v), Math.max(1, maxQty)))
  }, [data, maxQty])

  if (loading) {
    return <div className="paper h-[520px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
  }

  if (error) {
    return <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div>
  }

  if (!data) return null
  const { product } = data

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-start">
      <div className="paper grain overflow-hidden rounded-[32px]">
        <div className="relative aspect-[16/10] bg-[hsl(var(--ink)_/_0.04)]">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="p-6 md:p-8">
          <div className="font-display text-3xl">{product.name}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[hsl(var(--muted))]">
            <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1">{categoryLabel(product.categoryId)}</span>
            <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1">{product.stockQty} tersedia</span>
            <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1">
              {formatRupiah(product.price)}/{product.unit}
            </span>
          </div>
        </div>
      </div>

      <div className="paper grain sticky top-24 rounded-[32px] p-6 md:p-7">
        <div className="text-sm text-[hsl(var(--muted))]">Atur jumlah & catatan</div>
        <div className="mt-3 flex items-center justify-between rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-3">
          <button
            type="button"
            onClick={() => setQty((v) => Math.max(1, v - 1))}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--ink)_/_0.05)] hover:bg-[hsl(var(--ink)_/_0.07)]"
          >
            <Minus size={18} />
          </button>
          <div className="text-center">
            <div className="font-display text-2xl">{qty}</div>
            <div className="text-xs text-[hsl(var(--muted))]">{product.unit}</div>
          </div>
          <button
            type="button"
            onClick={() => setQty((v) => Math.min(Math.max(1, maxQty), v + 1))}
            disabled={maxQty <= 0 || qty >= maxQty}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--ink)_/_0.05)] hover:bg-[hsl(var(--ink)_/_0.07)] disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="mt-2 text-xs text-[hsl(var(--muted))]">
          {maxQty > 0 ? `Stok tersisa ${maxQty} ${product.unit}.` : 'Stok habis.'}
        </div>

        <div className="mt-4">
          <label className="text-sm text-[hsl(var(--muted))]">Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: pilih yang matang, jangan pedas..."
            className="mt-2 h-24 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
          />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-3xl bg-[hsl(var(--ink)_/_0.04)] p-4">
          <div className="text-sm text-[hsl(var(--muted))]">Perkiraan total</div>
          <div className="font-display text-2xl">{formatRupiah(total)}</div>
        </div>

        <div className="mt-4 grid gap-3">
          <Button
            onClick={() => {
              const r = addProduct(product, qty)
              if (r.ok === false) {
                setError(r.error)
                return
              }
              setError(null)
              setNotes('')
              setQty(1)
            }}
            disabled={maxQty <= 0}
          >
            <Plus size={18} />
            <span>Tambah ke Keranjang</span>
          </Button>
          <Link to="/keranjang" className="text-center text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
            Lihat keranjang
          </Link>
          {error ? <div className="text-sm text-[hsl(var(--chili))]">{error}</div> : null}
        </div>
      </div>
    </div>
  )
}
