import { apiGet } from '@/api/http'
import type { Order, OrderItem } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Row = { order: Order; items: OrderItem[] }

function labelStatus(status: string): string {
  switch (status) {
    case 'created':
      return 'Menunggu pembayaran'
    case 'awaiting_payment':
      return 'Menunggu pembayaran'
    case 'paid':
      return 'Dibayar'
    case 'confirmed':
      return 'Dikonfirmasi'
    case 'processing':
      return 'Diproses'
    case 'ready_for_pickup':
      return 'Siap diambil'
    case 'out_for_delivery':
      return 'Dikirim'
    case 'completed':
      return 'Selesai'
    case 'cancelled':
      return 'Dibatalkan'
    default:
      return status
  }
}

export default function Orders() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) navigate('/masuk?next=/pesanan', { replace: true })
  }, [navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet<Row[]>('/api/orders/me', token)
        if (cancelled) return
        setRows(data)
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
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-3xl">Pesanan Saya</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Pantau status pesanan kamu di Belanjaku.</div>
          </div>
          <Button variant="ghost" onClick={() => navigate(0)} className="hidden md:inline-flex">
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {loading ? (
        <div className="paper h-[320px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link key={r.order.id} to={`/pesanan/${r.order.id}`} className="paper grain block rounded-[28px] p-5 hover:bg-[hsl(var(--ink)_/_0.02)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-display text-xl">#{r.order.id.slice(0, 10)}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                    {new Date(r.order.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[hsl(var(--leaf)_/_0.10)] px-3 py-1 text-sm text-[hsl(var(--leaf))]">
                    {labelStatus(r.order.status)}
                  </span>
                  <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
                    {r.order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}
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
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Mulai dari jelajah produk, lalu checkout.</div>
          <div className="mt-6">
            <Link to="/jelajah" className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
              Jelajah sekarang
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
