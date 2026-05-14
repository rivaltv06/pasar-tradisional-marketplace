import { apiGet, apiSend } from '@/api/http'
import type { Product, ProductUnit, Stall } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/constants/categories'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const UNITS: ProductUnit[] = ['kg', 'ikat', 'buah', 'bungkus', 'ekor']

export default function SellerProducts() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [stall, setStall] = useState<Stall | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]?.id ?? 'sayur')
  const [price, setPrice] = useState<number>(0)
  const [unit, setUnit] = useState<ProductUnit>('kg')
  const [stockQty, setStockQty] = useState<number>(0)
  const [imageUrl, setImageUrl] = useState('')

  const reload = async () => {
    if (!token) return
    const [st, pr] = await Promise.all([
      apiGet<Stall | null>('/api/seller/stall', token),
      apiGet<Product[]>('/api/seller/products', token),
    ])
    setStall(st)
    setProducts(pr)
  }

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/pedagang/produk', { replace: true })
      return
    }
    if (user.role !== 'seller') navigate('/', { replace: true })
  }, [navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const [st, pr] = await Promise.all([
          apiGet<Stall | null>('/api/seller/stall', token),
          apiGet<Product[]>('/api/seller/products', token),
        ])
        if (cancelled) return
        setStall(st)
        setProducts(pr)
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
  }, [token])

  const categoriesById = useMemo(() => new Map(CATEGORIES.map((c) => [c.id, c.label])), [])

  if (loading) return <div className="paper h-[520px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Produk</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Tambah dan kelola harga/stok produk kios.</div>
          </div>
          <div className="flex gap-2">
            <Link to="/pedagang">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link to="/pedagang/pesanan">
              <Button variant="ghost">Pesanan</Button>
            </Link>
          </div>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {!stall ? (
        <div className="paper grain rounded-[32px] p-10 text-center">
          <div className="font-display text-3xl">Kios belum dibuat</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Buat kios dulu sebelum menambah produk.</div>
          <div className="mt-6">
            <Link to="/pedagang" className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
              Ke dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="paper grain rounded-[32px] p-6 md:p-7">
            <div className="font-display text-2xl">Tambah produk</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm text-[hsl(var(--muted))]">Nama produk</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cabai rawit"
                  className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
                />
              </div>

              <div>
                <label className="text-sm text-[hsl(var(--muted))]">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[hsl(var(--muted))]">Harga</label>
                  <input
                    value={Number.isFinite(price) ? String(price) : ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    inputMode="numeric"
                    className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                    placeholder="20000"
                  />
                </div>
                <div>
                  <label className="text-sm text-[hsl(var(--muted))]">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ProductUnit)}
                    className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-[hsl(var(--muted))]">Stok</label>
                <input
                  value={Number.isFinite(stockQty) ? String(stockQty) : ''}
                  onChange={(e) => setStockQty(Number(e.target.value))}
                  inputMode="numeric"
                  className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="text-sm text-[hsl(var(--muted))]">Gambar (URL opsional)</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="mt-5">
              <Button
                disabled={submitting}
                onClick={async () => {
                  if (!token) return
                  try {
                    setSubmitting(true)
                    setError(null)
                    await apiSend<Product>(
                      '/api/seller/products',
                      'POST',
                      {
                        name: name.trim(),
                        categoryId,
                        price,
                        unit,
                        stockQty,
                        imageUrl: imageUrl.trim() || undefined,
                      },
                      token,
                    )
                    setName('')
                    setPrice(0)
                    setStockQty(0)
                    setImageUrl('')
                    await reload()
                  } catch (e) {
                    setError((e as Error).message)
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? 'Menyimpan...' : 'Tambah Produk'}
              </Button>
            </div>
          </div>

          <div className="paper grain rounded-[32px] p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-display text-2xl">Produk kios</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">Klik untuk edit cepat.</div>
              </div>
              <Button variant="ghost" onClick={() => reload()}>
                Refresh
              </Button>
            </div>

            {products.length ? (
              <div className="mt-5 space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-display text-xl leading-tight">{p.name}</div>
                        <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                          {categoriesById.get(p.categoryId) ?? p.categoryId} • {p.unit}
                          {p.isHidden ? ' • Disembunyikan' : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          disabled={submitting}
                          onClick={async () => {
                            if (!token) return
                            try {
                              setSubmitting(true)
                              setError(null)
                              await apiSend<Product>(
                                `/api/seller/products/${encodeURIComponent(p.id)}/visibility`,
                                'PATCH',
                                { isHidden: !p.isHidden },
                                token,
                              )
                              await reload()
                            } catch (e) {
                              setError((e as Error).message)
                            } finally {
                              setSubmitting(false)
                            }
                          }}
                        >
                          {p.isHidden ? 'Tampilkan' : 'Sembunyikan'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs text-[hsl(var(--muted))]">Harga</label>
                        <input
                          defaultValue={p.price}
                          inputMode="numeric"
                          onBlur={async (e) => {
                            if (!token) return
                            const next = Number(e.target.value)
                            if (!Number.isFinite(next) || next <= 0 || next === p.price) return
                            try {
                              setSubmitting(true)
                              setError(null)
                              await apiSend<Product>(
                                `/api/seller/products/${encodeURIComponent(p.id)}`,
                                'PATCH',
                                { price: next },
                                token,
                              )
                              await reload()
                            } catch (err) {
                              setError((err as Error).message)
                            } finally {
                              setSubmitting(false)
                            }
                          }}
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[hsl(var(--muted))]">Stok</label>
                        <input
                          defaultValue={p.stockQty}
                          inputMode="numeric"
                          onBlur={async (e) => {
                            if (!token) return
                            const next = Number(e.target.value)
                            if (!Number.isFinite(next) || next < 0 || next === p.stockQty) return
                            try {
                              setSubmitting(true)
                              setError(null)
                              await apiSend<Product>(
                                `/api/seller/products/${encodeURIComponent(p.id)}`,
                                'PATCH',
                                { stockQty: next },
                                token,
                              )
                              await reload()
                            } catch (err) {
                              setError((err as Error).message)
                            } finally {
                              setSubmitting(false)
                            }
                          }}
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        />
                      </div>
                      <div className="flex items-end">
                        <Link
                          to={`/produk/${p.id}`}
                          className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4"
                        >
                          Lihat di katalog
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-8 text-center">
                <div className="font-display text-2xl">Belum ada produk</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">Tambahkan produk pertama di atas.</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

