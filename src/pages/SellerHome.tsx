import { apiGet, apiSend } from '@/api/http'
import type { Market, Stall } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function SellerHome() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [stall, setStall] = useState<Stall | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [marketId, setMarketId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [openHours, setOpenHours] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/pedagang', { replace: true })
      return
    }
    if (user.role !== 'seller') {
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
        const [m, s] = await Promise.all([
          apiGet<Market[]>('/api/markets'),
          apiGet<Stall | null>('/api/seller/stall', token),
        ])
        if (cancelled) return
        setMarkets(m)
        setStall(s)
        setMarketId(s?.marketId ?? m[0]?.id ?? '')
        setName(s?.name ?? '')
        setDescription(s?.description ?? '')
        setOpenHours(s?.openHours ?? '')
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

  const marketLabel = useMemo(() => {
    const m = markets.find((it) => it.id === (stall?.marketId ?? marketId))
    return m ? `${m.name} • ${m.city}` : ''
  }, [marketId, markets, stall?.marketId])

  if (loading) return <div className="paper h-[520px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Dashboard Pedagang</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Kelola kios, produk, dan pesanan masuk.</div>
          </div>
          {stall ? (
            <div className="flex gap-2">
              <Link to="/pedagang/produk">
                <Button variant="ghost">Produk</Button>
              </Link>
              <Link to="/pedagang/pesanan">
                <Button variant="ghost">Pesanan</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {stall ? (
        <div className="paper grain rounded-[32px] p-6 md:p-7">
          <div className="text-sm text-[hsl(var(--muted))]">Kios kamu</div>
          <div className="mt-2 font-display text-3xl">{stall.name}</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">{marketLabel}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
              <div className="text-sm text-[hsl(var(--muted))]">Jam buka</div>
              <div className="mt-2 text-[15px]">{stall.openHours ?? 'Belum diisi'}</div>
            </div>
            <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
              <div className="text-sm text-[hsl(var(--muted))]">Deskripsi</div>
              <div className="mt-2 text-[15px]">{stall.description ?? 'Belum diisi'}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="paper grain rounded-[32px] p-6 md:p-7">
          <div className="font-display text-2xl">Buat kios dulu</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Kios dipakai untuk menampilkan produk dan menerima pesanan.</div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Pilih pasar</label>
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} • {m.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Nama kios</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kios Bu Sari"
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>

            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Jam buka (opsional)</label>
              <input
                value={openHours}
                onChange={(e) => setOpenHours(e.target.value)}
                placeholder="Contoh: 05.30–11.00"
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>

            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Deskripsi (opsional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Sayur segar tiap pagi, bisa substitusi."
                className="mt-2 h-24 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>

            <Button
              disabled={submitting}
              onClick={async () => {
                if (!token) return
                try {
                  setSubmitting(true)
                  setError(null)
                  const created = await apiSend<Stall>(
                    '/api/seller/stall',
                    'POST',
                    {
                      marketId: marketId.trim(),
                      name: name.trim(),
                      description: description.trim() || undefined,
                      openHours: openHours.trim() || undefined,
                    },
                    token,
                  )
                  setStall(created)
                } catch (e) {
                  setError((e as Error).message)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting ? 'Menyimpan...' : 'Buat Kios'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

