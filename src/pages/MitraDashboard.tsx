import { apiGet, apiSend } from '@/api/http'
import type { Order, OrderItem } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { labelOrderStatus } from '@/lib/orderLabels'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Row = { order: Order; items: OrderItem[] }

export default function MitraDashboard() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [inbox, setInbox] = useState<Row[]>([])
  const [mine, setMine] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mineFilter, setMineFilter] = useState<'active' | 'completed'>('active')

  const reload = async () => {
    if (!token) return
    const [a, b] = await Promise.all([
      apiGet<Row[]>('/api/mitra/orders/inbox', token),
      apiGet<Row[]>('/api/mitra/orders/me', token),
    ])
    setInbox(a)
    setMine(b)
  }

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/mitra', { replace: true })
      return
    }
    if (user.role !== 'courier') navigate('/', { replace: true })
  }, [navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const [a, b] = await Promise.all([
          apiGet<Row[]>('/api/mitra/orders/inbox', token),
          apiGet<Row[]>('/api/mitra/orders/me', token),
        ])
        if (cancelled) return
        setInbox(a)
        setMine(b)
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

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Mitra</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Ambil order baru dan update status pengantaran.</div>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="ghost">Toko</Button>
            </Link>
            <Button variant="ghost" onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {loading ? (
        <div className="paper h-[340px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="paper grain rounded-[32px] p-6 md:p-7">
            <div className="font-display text-2xl">Order masuk</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Order yang belum diambil mitra lain.</div>

            {inbox.length ? (
              <div className="mt-5 space-y-3">
                {inbox.map((r) => (
                  <div key={r.order.id} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xl">#{r.order.id.slice(0, 10)}</div>
                        <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                          {new Date(r.order.createdAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
                        {labelOrderStatus(r.order.status)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-[hsl(var(--muted))]">
                      {r.items.slice(0, 2).map((it) => it.productNameSnapshot).join(', ')}
                      {r.items.length > 2 ? ` +${r.items.length - 2} item` : ''}
                    </div>
                    <div className="mt-3 text-sm text-[hsl(var(--muted))]">{r.order.addressText || '-'}</div>
                    <div className="mt-3 font-display text-2xl">{formatRupiah(r.order.totalAmount)}</div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Link to={`/pesanan/${r.order.id}`} className="w-full">
                        <Button variant="ghost" className="w-full">
                          Detail
                        </Button>
                      </Link>
                      <Button
                        disabled={submitting || !token}
                        onClick={async () => {
                          if (!token) return
                          try {
                            setSubmitting(true)
                            setError(null)
                            await apiSend<Order>(`/api/mitra/orders/${encodeURIComponent(r.order.id)}/claim`, 'POST', undefined, token)
                            await reload()
                          } catch (e) {
                            setError((e as Error).message)
                          } finally {
                            setSubmitting(false)
                          }
                        }}
                      >
                        Ambil order
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-8 text-center">
                <div className="font-display text-2xl">Belum ada</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">Nanti order baru muncul di sini.</div>
              </div>
            )}
          </div>

          <div className="paper grain rounded-[32px] p-6 md:p-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-2xl">Order saya</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">Order yang sudah kamu ambil.</div>
              </div>
              <select
                value={mineFilter}
                onChange={(e) => setMineFilter(e.target.value as 'active' | 'completed')}
                className="h-11 rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
              >
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
              </select>
            </div>

            {mine.length ? (
              <div className="mt-5 space-y-3">
                {mine
                  .filter((r) => (mineFilter === 'completed' ? r.order.status === 'completed' : r.order.status !== 'completed'))
                  .map((r) => (
                  <div key={r.order.id} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xl">#{r.order.id.slice(0, 10)}</div>
                        <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                          {new Date(r.order.createdAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <span className="rounded-full bg-[hsl(var(--leaf)_/_0.10)] px-3 py-1 text-sm text-[hsl(var(--leaf))]">
                        {labelOrderStatus(r.order.status)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-[hsl(var(--muted))]">{r.order.addressText || '-'}</div>
                    <div className="mt-3 font-display text-2xl">{formatRupiah(r.order.totalAmount)}</div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Link to={`/pesanan/${r.order.id}`} className="w-full">
                        <Button variant="ghost" className="w-full">
                          Detail
                        </Button>
                      </Link>
                      <Button
                        disabled={submitting || !token || r.order.status === 'completed'}
                        onClick={async () => {
                          if (!token) return
                          try {
                            setSubmitting(true)
                            setError(null)
                            await apiSend<Order>(
                              `/api/orders/${encodeURIComponent(r.order.id)}/status`,
                              'PATCH',
                              { status: 'completed' },
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
                        Tandai selesai
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-8 text-center">
                <div className="font-display text-2xl">Belum ada</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">Ambil order dari kolom “Order masuk”.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
