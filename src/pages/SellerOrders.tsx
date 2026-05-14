import { apiGet } from '@/api/http'
import type { Order, OrderItem } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { labelFulfillment, labelOrderStatus } from '@/lib/orderLabels'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Row = { order: Order; items: OrderItem[] }

export default function SellerOrders() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    if (!token) return
    const data = await apiGet<Row[]>('/api/seller/orders', token)
    setRows(data)
  }

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/pedagang/pesanan', { replace: true })
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
        const data = await apiGet<Row[]>('/api/seller/orders', token)
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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Pesanan Masuk</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">
              Pesanan baru akan bisa diproses setelah pembeli bayar ke Belanjaku.
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/pedagang">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link to="/pedagang/produk">
              <Button variant="ghost">Produk</Button>
            </Link>
            <Button variant="ghost" onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {loading ? (
        <div className="paper h-[320px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
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
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      r.order.status === 'paid'
                        ? 'bg-[hsl(var(--leaf)_/_0.10)] text-[hsl(var(--leaf))]'
                        : 'bg-[hsl(var(--ink)_/_0.05)] text-[hsl(var(--muted))]'
                    }`}
                  >
                    {labelOrderStatus(r.order.status)}
                  </span>
                  <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
                    {labelFulfillment(r.order.fulfillment)}
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
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Nanti pesanan masuk akan muncul di sini.</div>
        </div>
      )}
    </div>
  )
}
