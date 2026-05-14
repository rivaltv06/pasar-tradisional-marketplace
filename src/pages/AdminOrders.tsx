import { apiGet } from '@/api/http'
import type { Order, OrderItem, PaymentChannel } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { labelOrderStatus, labelPaymentChannel } from '@/lib/orderLabels'
import { useAuthStore } from '@/stores/authStore'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Row = { order: Order; items: OrderItem[] }

const STATUSES = [
  '',
  'created',
  'awaiting_payment',
  'paid',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
  'cancelled',
] as const

export default function AdminOrders() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('')
  const [courier, setCourier] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [paymentChannel, setPaymentChannel] = useState<'' | PaymentChannel>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const reload = useCallback(async () => {
    if (!token) return
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    if (courier !== 'all') qs.set('courier', courier)
    if (paymentChannel) qs.set('paymentChannel', paymentChannel)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    const data = await apiGet<Row[]>(`/api/admin/orders?${qs.toString()}`, token)
    setRows(data)
  }, [courier, dateFrom, dateTo, paymentChannel, status, token])

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/admin/pesanan', { replace: true })
      return
    }
    if (user.role !== 'admin') navigate('/', { replace: true })
  }, [navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        await reload()
        if (cancelled) return
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
  }, [reload, token])

  const incoming = useMemo(
    () => rows.filter((r) => r.order.status === 'paid' || r.order.status === 'confirmed'),
    [rows],
  )

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Pesanan</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">
              Pesanan masuk: {incoming.length} (Paid/COD).
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link to="/admin/produk">
              <Button variant="ghost">Produk</Button>
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

      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Filter status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            >
              <option value="">Semua</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {labelOrderStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Filter kurir</label>
            <select
              value={courier}
              onChange={(e) => setCourier(e.target.value as 'all' | 'assigned' | 'unassigned')}
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            >
              <option value="all">Semua</option>
              <option value="unassigned">Belum ada kurir</option>
              <option value="assigned">Sudah ada kurir</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Metode bayar</label>
            <select
              value={paymentChannel}
              onChange={(e) => setPaymentChannel(e.target.value as '' | PaymentChannel)}
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            >
              <option value="">Semua</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
              <option value="cod">COD</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Tanggal</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-3 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-3 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={() => reload()} disabled={!token}>
              Terapkan filter
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="paper h-[340px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.order.id}
              to={`/pesanan/${r.order.id}`}
              className="paper grain block rounded-[28px] p-5 hover:bg-[hsl(var(--ink)_/_0.02)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-display text-xl">#{r.order.id.slice(0, 10)}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                    {new Date(r.order.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
                    {labelOrderStatus(r.order.status)}
                  </span>
                  <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
                    {labelPaymentChannel(r.order.paymentChannel)}
                  </span>
                  <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
                    {r.order.courierUserId ? 'Kurir: Ada' : 'Kurir: -'}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-sm text-[hsl(var(--muted))]">
                {r.items.slice(0, 2).map((it) => it.productNameSnapshot).join(', ')}
                {r.items.length > 2 ? ` +${r.items.length - 2} item` : ''}
              </div>
              <div className="mt-3 font-display text-2xl">{formatRupiah(r.order.totalAmount)}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="paper grain rounded-[32px] p-10 text-center">
          <div className="font-display text-3xl">Belum ada pesanan</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Nanti pesanan muncul di sini.</div>
        </div>
      )}
    </div>
  )
}
