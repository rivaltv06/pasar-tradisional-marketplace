import { apiGet, apiSend } from '@/api/http'
import type { Product, ProductUnit, PromoSettings } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/constants/categories'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const UNITS: ProductUnit[] = ['kg', 'ikat', 'buah', 'bungkus', 'ekor']

export default function AdminProducts() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [promoEnabled, setPromoEnabled] = useState(false)
  const [promoTitle, setPromoTitle] = useState('')
  const [promoSubtitle, setPromoSubtitle] = useState('')
  const [promoCtaLabel, setPromoCtaLabel] = useState('')
  const [promoCtaCategoryId, setPromoCtaCategoryId] = useState<string>('')
  const [promoMinItemsAmount, setPromoMinItemsAmount] = useState<number>(0)
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null)
  const [promoImageUrl, setPromoImageUrl] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState(CATEGORIES[0]?.id ?? 'sayur')
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editUnit, setEditUnit] = useState<ProductUnit>('kg')
  const [editStockQty, setEditStockQty] = useState<number>(0)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)

  const [bulkText, setBulkText] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]?.id ?? 'sayur')
  const [price, setPrice] = useState<number>(0)
  const [unit, setUnit] = useState<ProductUnit>('kg')
  const [stockQty, setStockQty] = useState<number>(0)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const reload = async () => {
    if (!token) return
    const pr = await apiGet<Product[]>('/api/admin/products', token)
    setProducts(pr)
  }

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/admin/produk', { replace: true })
      return
    }
    if (user.role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const pr = await apiGet<Product[]>('/api/admin/products', token)
        const promoData = await apiGet<PromoSettings>('/api/admin/promo', token)
        if (cancelled) return
        setProducts(pr)
        setPromoEnabled(promoData.enabled)
        setPromoTitle(promoData.title)
        setPromoSubtitle(promoData.subtitle)
        setPromoCtaLabel(promoData.ctaLabel)
        setPromoCtaCategoryId(promoData.ctaCategoryId ?? '')
        setPromoMinItemsAmount(promoData.minItemsAmount)
        setPromoImageUrl(promoData.imageUrl ?? null)
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

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditName(p.name)
    setEditCategoryId(p.categoryId)
    setEditPrice(p.price)
    setEditUnit(p.unit)
    setEditStockQty(p.stockQty)
    setEditImageFile(null)
  }

  const uploadProductImage = async (productId: string, file: File) => {
    if (!token) throw new Error('Tidak ada token')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = (await res.json()) as { success: boolean; error?: string }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (json.success === false) throw new Error(json.error || 'Upload gagal')
  }

  const uploadPromoImage = async (file: File) => {
    if (!token) throw new Error('Tidak ada token')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/promo/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = (await res.json()) as { success: boolean; data?: PromoSettings; error?: string }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (json.success === false) throw new Error(json.error || 'Upload gagal')
    if (json.data?.imageUrl) setPromoImageUrl(json.data.imageUrl)
  }

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Admin Produk</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Kelola katalog Belanjaku (Tasikmalaya).</div>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="ghost">Lihat toko</Button>
            </Link>
            <Link to="/admin/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link to="/admin/pesanan">
              <Button variant="ghost">Pesanan</Button>
            </Link>
            <Link to="/admin/mitra">
              <Button variant="ghost">Mitra</Button>
            </Link>
            <Button variant="ghost" onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}
      {notice ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--leaf))]">{notice}</div> : null}

      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-2xl">Promo banner</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Tampil di halaman depan sebagai iklan promo.</div>
          </div>
          <div className="text-xs text-[hsl(var(--muted))]">Status: {promoEnabled ? 'Aktif' : 'Nonaktif'}</div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex items-center justify-between rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-4">
            <div>
              <div className="text-sm text-[hsl(var(--muted))]">Aktifkan promo</div>
              <div className="text-xs text-[hsl(var(--muted))]">Jika aktif, banner tampil dan promo ongkir diterapkan.</div>
            </div>
            <button
              type="button"
              onClick={() => setPromoEnabled((v) => !v)}
              className={`h-10 w-16 rounded-full border transition ${
                promoEnabled
                  ? 'border-[hsl(var(--leaf)_/_0.35)] bg-[hsl(var(--leaf)_/_0.20)]'
                  : 'border-[hsl(var(--ink)_/_0.12)] bg-[hsl(var(--bg)_/_0.55)]'
              }`}
            >
              <span
                className={`block h-8 w-8 translate-x-1 rounded-full bg-[hsl(var(--card))] transition ${
                  promoEnabled ? 'translate-x-7' : ''
                }`}
              />
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-[hsl(var(--muted))]">Judul</label>
            <input
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              placeholder="Contoh: Gratis ongkir!"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-[hsl(var(--muted))]">Subjudul</label>
            <input
              value={promoSubtitle}
              onChange={(e) => setPromoSubtitle(e.target.value)}
              placeholder="Contoh: Min belanja Rp 50.000 • Tasikmalaya"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>

          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Min belanja (subtotal)</label>
            <input
              value={Number.isFinite(promoMinItemsAmount) ? String(promoMinItemsAmount) : ''}
              onChange={(e) => setPromoMinItemsAmount(Number(e.target.value))}
              inputMode="numeric"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Kategori promo</label>
            <select
              value={promoCtaCategoryId}
              onChange={(e) => setPromoCtaCategoryId(e.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            >
              <option value="">Semua</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Label tombol</label>
            <input
              value={promoCtaLabel}
              onChange={(e) => setPromoCtaLabel(e.target.value)}
              placeholder="Contoh: Belanja promo"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-[hsl(var(--muted))]">Gambar promo (upload)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPromoImageFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-[hsl(var(--muted))] file:mr-4 file:rounded-2xl file:border-0 file:bg-[hsl(var(--ink)_/_0.06)] file:px-4 file:py-2 file:text-sm file:text-[hsl(var(--ink))] hover:file:bg-[hsl(var(--ink)_/_0.08)]"
            />
            {promoImageUrl ? (
              <div className="mt-3 flex items-center gap-3">
                <img src={promoImageUrl} alt="Promo" className="h-14 w-24 rounded-2xl object-cover" />
                <div className="text-xs text-[hsl(var(--muted))]">Gambar saat ini</div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-[hsl(var(--muted))]">Belum ada gambar</div>
            )}
          </div>

          <div className="flex items-end">
            <Button
              disabled={submitting || !token}
              onClick={async () => {
                if (!token) return
                try {
                  setSubmitting(true)
                  setError(null)
                  setNotice(null)
                  const saved = await apiSend<PromoSettings>(
                    '/api/admin/promo',
                    'PATCH',
                    {
                      enabled: promoEnabled,
                      title: promoTitle,
                      subtitle: promoSubtitle,
                      ctaLabel: promoCtaLabel,
                      ctaCategoryId: promoCtaCategoryId || undefined,
                      minItemsAmount: promoMinItemsAmount,
                    },
                    token,
                  )
                  setPromoEnabled(saved.enabled)
                  setPromoTitle(saved.title)
                  setPromoSubtitle(saved.subtitle)
                  setPromoCtaLabel(saved.ctaLabel)
                  setPromoCtaCategoryId(saved.ctaCategoryId ?? '')
                  setPromoMinItemsAmount(saved.minItemsAmount)
                  setPromoImageUrl(saved.imageUrl ?? null)
                  if (promoImageFile) {
                    await uploadPromoImage(promoImageFile)
                    setPromoImageFile(null)
                  }
                  setNotice('Promo berhasil disimpan.')
                } catch (e) {
                  setError((e as Error).message)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting ? 'Menyimpan...' : 'Simpan promo'}
            </Button>
          </div>
        </div>
      </div>

      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="font-display text-2xl">Import dari list</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          Paste daftar produk (boleh ada yang nyambung satu baris). Akan dibuat sebagai draft: disembunyikan, harga 0, stok 0.
        </div>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="Contoh:\nBeras putih\nMinyak goreng\nGula pasir"
          className="mt-4 h-44 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            disabled={submitting || !bulkText.trim()}
            onClick={async () => {
              if (!token) return
              try {
                setSubmitting(true)
                setError(null)
                setNotice(null)
                const data = await apiSend<{ createdCount: number }>(
                  '/api/admin/products/bulk',
                  'POST',
                  { text: bulkText },
                  token,
                )
                setBulkText('')
                setNotice(`Berhasil import ${data.createdCount} produk draft. Lengkapi harga/stok lalu klik “Tampilkan”.`)
                await reload()
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? 'Mengimpor...' : 'Import Produk'}
          </Button>
          <div className="text-xs text-[hsl(var(--muted))]">Draft tidak muncul di katalog pembeli sampai kamu klik “Tampilkan”.</div>
        </div>
      </div>

      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="font-display text-2xl">Tambah produk</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm text-[hsl(var(--muted))]">Nama produk</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Beras 5kg"
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
            <label className="text-sm text-[hsl(var(--muted))]">Gambar (upload opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-[hsl(var(--muted))] file:mr-4 file:rounded-2xl file:border-0 file:bg-[hsl(var(--ink)_/_0.06)] file:px-4 file:py-2 file:text-sm file:text-[hsl(var(--ink))] hover:file:bg-[hsl(var(--ink)_/_0.08)]"
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
                setNotice(null)
                const created = await apiSend<Product>(
                  '/api/admin/products',
                  'POST',
                  {
                    name: name.trim(),
                    categoryId,
                    price,
                    unit,
                    stockQty,
                  },
                  token,
                )
                if (imageFile) {
                  await uploadProductImage(created.id, imageFile)
                }
                setName('')
                setPrice(0)
                setStockQty(0)
                setImageFile(null)
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
            <div className="font-display text-2xl">Daftar produk</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Gunakan Edit untuk ubah nama/kategori/unit/gambar, lalu simpan.</div>
          </div>
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
                      {p.isHidden ? ' • Draft' : ''}
                      {p.price <= 0 ? ' • Harga belum diisi' : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      disabled={submitting}
                      onClick={() => {
                        setError(null)
                        setNotice(null)
                        startEdit(p)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={submitting}
                      onClick={async () => {
                        if (!token) return
                        try {
                          setSubmitting(true)
                          setError(null)
                          setNotice(null)
                          await apiSend<Product>(
                            `/api/admin/products/${encodeURIComponent(p.id)}/visibility`,
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

                {editingId === p.id ? (
                  <div className="mt-4 rounded-3xl bg-[hsl(var(--bg)_/_0.6)] p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="text-xs text-[hsl(var(--muted))]">Nama</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.75)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[hsl(var(--muted))]">Kategori</label>
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.75)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-[hsl(var(--muted))]">Unit</label>
                        <select
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value as ProductUnit)}
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.75)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-[hsl(var(--muted))]">Harga</label>
                        <input
                          value={Number.isFinite(editPrice) ? String(editPrice) : ''}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          inputMode="numeric"
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.75)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[hsl(var(--muted))]">Stok</label>
                        <input
                          value={Number.isFinite(editStockQty) ? String(editStockQty) : ''}
                          onChange={(e) => setEditStockQty(Number(e.target.value))}
                          inputMode="numeric"
                          className="mt-1 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.75)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs text-[hsl(var(--muted))]">Gambar (upload)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)}
                          className="mt-1 block w-full text-sm text-[hsl(var(--muted))] file:mr-4 file:rounded-2xl file:border-0 file:bg-[hsl(var(--ink)_/_0.06)] file:px-4 file:py-2 file:text-sm file:text-[hsl(var(--ink))] hover:file:bg-[hsl(var(--ink)_/_0.08)]"
                        />
                        {p.imageUrl ? (
                          <div className="mt-3 flex items-center gap-3">
                            <img src={p.imageUrl} alt={p.name} className="h-14 w-14 rounded-2xl object-cover" />
                            <div className="text-xs text-[hsl(var(--muted))]">Gambar saat ini</div>
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-[hsl(var(--muted))]">Belum ada gambar</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button
                        disabled={submitting}
                        onClick={async () => {
                          if (!token) return
                          try {
                            setSubmitting(true)
                            setError(null)
                            setNotice(null)
                            await apiSend<Product>(
                              `/api/admin/products/${encodeURIComponent(p.id)}`,
                              'PATCH',
                              {
                                name: editName.trim(),
                                categoryId: editCategoryId,
                                price: editPrice,
                                unit: editUnit,
                                stockQty: editStockQty,
                              },
                              token,
                            )
                            if (editImageFile) {
                              await uploadProductImage(p.id, editImageFile)
                            }
                            setEditingId(null)
                            setEditImageFile(null)
                            setNotice('Produk berhasil diperbarui.')
                            await reload()
                          } catch (e) {
                            setError((e as Error).message)
                          } finally {
                            setSubmitting(false)
                          }
                        }}
                      >
                        {submitting ? 'Menyimpan...' : 'Simpan'}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={submitting}
                        onClick={() => {
                          setEditingId(null)
                          setEditImageFile(null)
                        }}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : null}

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
                            `/api/admin/products/${encodeURIComponent(p.id)}`,
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
                            `/api/admin/products/${encodeURIComponent(p.id)}`,
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
                    <Link to={`/produk/${p.id}`} className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
                      Lihat
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
    </div>
  )
}
