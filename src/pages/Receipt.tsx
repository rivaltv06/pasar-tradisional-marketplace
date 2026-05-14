import { apiGet } from '@/api/http'
import type { Order, OrderItem } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

type Data = { order: Order; items: OrderItem[] }

export default function Receipt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) navigate(`/masuk?next=/nota-kecil/${encodeURIComponent(String(id))}`, { replace: true })
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
    <div className="thermal mx-auto w-full max-w-[420px]">
      <style>{`
@media print {
  @page { size: 80mm auto; margin: 6mm; }
  .no-print { display: none !important; }
  body { background: white !important; }
  .thermal { width: 100% !important; max-width: 68mm !important; }
}
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to={`/pesanan/${encodeURIComponent(data.order.id)}`}>
          <Button variant="ghost">Kembali</Button>
        </Link>
        <Button variant="ghost" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="rounded-[16px] border border-[hsl(var(--ink)_/_0.10)] bg-white p-4 text-[13px] text-black">
        <div className="text-center">
          <div className="text-base font-semibold">BELANJAKU</div>
          <div className="text-[12px]">Nota (thermal)</div>
        </div>

        <div className="mt-3 space-y-1 border-t border-dashed border-black/30 pt-3">
          <div className="flex justify-between">
            <div>ID</div>
            <div className="font-mono">{data.order.id.slice(0, 12)}</div>
          </div>
          <div className="flex justify-between">
            <div>Waktu</div>
            <div>{new Date(data.order.createdAt).toLocaleString('id-ID')}</div>
          </div>
          <div className="flex justify-between">
            <div>Bayar</div>
            <div>{data.order.paymentChannel.toUpperCase()}</div>
          </div>
          <div className="flex justify-between">
            <div>Fulfillment</div>
            <div>{data.order.fulfillment === 'delivery' ? 'DELIVERY' : 'PICKUP'}</div>
          </div>
        </div>

        {data.order.addressText ? (
          <div className="mt-3 border-t border-dashed border-black/30 pt-3">
            <div className="text-[12px] font-semibold">Alamat</div>
            <div className="mt-1 break-words text-[12px]">{data.order.addressText}</div>
          </div>
        ) : null}

        <div className="mt-3 border-t border-dashed border-black/30 pt-3">
          <div className="text-[12px] font-semibold">Item</div>
          <div className="mt-2 space-y-2">
            {data.items.map((it) => (
              <div key={it.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="break-words whitespace-normal">{it.productNameSnapshot}</div>
                    <div className="text-[12px] text-black/70">
                      {it.qty} {it.unitSnapshot} x {formatRupiah(it.unitPriceSnapshot)}
                    </div>
                  </div>
                  <div className="whitespace-nowrap">{formatRupiah(it.unitPriceSnapshot * it.qty)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1 border-t border-dashed border-black/30 pt-3">
          <div className="flex justify-between">
            <div>Subtotal</div>
            <div>{formatRupiah(itemsTotal)}</div>
          </div>
          <div className="flex justify-between">
            <div>Ongkir</div>
            <div>{formatRupiah(data.order.shippingFee)}</div>
          </div>
          <div className="flex justify-between text-[14px] font-semibold">
            <div>TOTAL</div>
            <div>{formatRupiah(data.order.totalAmount)}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-black/30 pt-3 text-center text-[12px]">
          Terima kasih
        </div>
      </div>
    </div>
  )
}
