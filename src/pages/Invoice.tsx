import { apiGet } from '@/api/http'
import type { Order, OrderItem } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

type Data = { order: Order; items: OrderItem[] }

export default function Invoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) navigate(`/masuk?next=/nota/${encodeURIComponent(String(id))}`, { replace: true })
  }, [id, navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const res = await apiGet<Data>(`/api/orders/${encodeURIComponent(String(id))}`, token)
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
  }, [id, token])

  const itemsTotal = useMemo(() => {
    if (!data) return 0
    return data.items.reduce((sum, it) => sum + it.unitPriceSnapshot * it.qty, 0)
  }, [data])

  if (loading) return <div className="paper h-[520px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
  if (error) return <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div>
  if (!data) return null

  return (
    <div className="mx-auto max-w-3xl">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .paper { box-shadow: none !important; }
  .grain::before { display: none !important; }
}
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to={`/pesanan/${encodeURIComponent(data.order.id)}`}>
          <Button variant="ghost">Kembali</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="paper grain rounded-[24px] p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-display text-3xl">Belanjaku</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Nota pesanan</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl">#{data.order.id.slice(0, 12)}</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">
              {new Date(data.order.createdAt).toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
            <div className="text-sm text-[hsl(var(--muted))]">Pengiriman</div>
            <div className="mt-2 text-sm">{data.order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</div>
            <div className="mt-2 break-words text-sm text-[hsl(var(--muted))]">{data.order.addressText || '-'}</div>
          </div>
          <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
            <div className="text-sm text-[hsl(var(--muted))]">Pembayaran</div>
            <div className="mt-2 text-sm">{data.order.paymentChannel.toUpperCase()}</div>
            <div className="mt-2 break-words text-sm text-[hsl(var(--muted))]">
              {data.order.paymentBank ? `${data.order.paymentBank} ${data.order.paymentAccountNumber ?? ''}` : '-'}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[hsl(var(--ink)_/_0.10)]">
          <div className="grid grid-cols-[1fr_56px_120px] gap-2 bg-[hsl(var(--ink)_/_0.03)] px-5 py-3 text-xs text-[hsl(var(--muted))]">
            <div>Item</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Subtotal</div>
          </div>
          <div className="divide-y divide-[hsl(var(--ink)_/_0.08)]">
            {data.items.map((it) => (
              <div key={it.id} className="grid grid-cols-[1fr_56px_120px] gap-2 px-5 py-4">
                <div>
                  <div className="text-sm">{it.productNameSnapshot}</div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted))]">
                    {formatRupiah(it.unitPriceSnapshot)} / {it.unitSnapshot}
                  </div>
                </div>
                <div className="text-right text-sm">{it.qty}</div>
                <div className="text-right text-sm">{formatRupiah(it.unitPriceSnapshot * it.qty)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:ml-auto sm:max-w-sm">
          <div className="flex items-center justify-between rounded-2xl bg-[hsl(var(--ink)_/_0.03)] px-4 py-3">
            <div className="text-sm text-[hsl(var(--muted))]">Subtotal</div>
            <div className="text-sm">{formatRupiah(itemsTotal)}</div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[hsl(var(--ink)_/_0.03)] px-4 py-3">
            <div className="text-sm text-[hsl(var(--muted))]">Ongkir</div>
            <div className="text-sm">{formatRupiah(data.order.shippingFee)}</div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[hsl(var(--leaf)_/_0.12)] px-4 py-3">
            <div className="text-sm text-[hsl(var(--muted))]">Total</div>
            <div className="font-display text-xl">{formatRupiah(data.order.totalAmount)}</div>
          </div>
        </div>

        <div className="mt-6 text-xs text-[hsl(var(--muted))]">Terima kasih sudah belanja di Belanjaku.</div>
      </div>
    </div>
  )
}
