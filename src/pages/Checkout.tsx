import { apiSend } from '@/api/http'
import type { FulfillmentMethod, Order, OrderItem } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { calcCartTotal, useCartStore } from '@/stores/cartStore'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Created = { order: Order; items: OrderItem[] }

export default function Checkout() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const stallId = useCartStore((s) => s.stallId)
  const items = useCartStore((s) => s.items)
  const clear = useCartStore((s) => s.clear)

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>('pickup')
  const [addressText, setAddressText] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/checkout', { replace: true })
    }
  }, [navigate, token, user])

  useEffect(() => {
    if (!items.length) {
      navigate('/keranjang', { replace: true })
    }
  }, [items.length, navigate])

  const total = useMemo(() => calcCartTotal(items), [items])

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-start">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="font-display text-3xl">Checkout</div>
        <div className="mt-1 text-sm text-[hsl(var(--muted))]">
          Pesanan akan dibuat dulu, lalu kamu bayar ke Belanjaku. Setelah pembayaran tercatat, Belanjaku mulai memproses.
        </div>

        <div className="mt-6 grid gap-6">
          <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
            <div className="text-sm text-[hsl(var(--muted))]">Metode pemenuhan</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfillment('pickup')}
                className={`rounded-3xl border p-4 text-left transition ${
                  fulfillment === 'pickup'
                    ? 'border-[hsl(var(--leaf)_/_0.25)] bg-[hsl(var(--leaf)_/_0.08)]'
                    : 'border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] hover:bg-[hsl(var(--ink)_/_0.04)]'
                }`}
              >
                <div className="font-display text-xl">Pickup</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">Ambil langsung di toko.</div>
              </button>
              <button
                type="button"
                onClick={() => setFulfillment('delivery')}
                className={`rounded-3xl border p-4 text-left transition ${
                  fulfillment === 'delivery'
                    ? 'border-[hsl(var(--leaf)_/_0.25)] bg-[hsl(var(--leaf)_/_0.08)]'
                    : 'border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] hover:bg-[hsl(var(--ink)_/_0.04)]'
                }`}
              >
                <div className="font-display text-xl">Delivery</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">Diantar ke alamat kamu.</div>
              </button>
            </div>
          </div>

          {fulfillment === 'delivery' ? (
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Alamat</label>
              <textarea
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Tulis alamat lengkap + patokan"
                className="mt-2 h-28 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>
          ) : null}

          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Catatan pesanan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: tolong konfirmasi stok dulu ya"
              className="mt-2 h-24 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>

          {error ? <div className="text-sm text-[hsl(var(--chili))]">{error}</div> : null}
        </div>
      </div>

      <div className="paper grain sticky top-24 rounded-[32px] p-6 md:p-7">
        <div className="text-sm text-[hsl(var(--muted))]">Ringkasan</div>
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div key={it.productId} className="flex items-start justify-between gap-3 rounded-2xl bg-[hsl(var(--ink)_/_0.03)] p-3">
              <div>
                <div className="font-display leading-tight">{it.name}</div>
                <div className="text-sm text-[hsl(var(--muted))]">
                  {it.qty} {it.unit} • {formatRupiah(it.price)}/{it.unit}
                </div>
              </div>
              <div className="font-display text-lg">{formatRupiah(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-3xl bg-[hsl(var(--ink)_/_0.04)] p-4">
          <div className="text-sm text-[hsl(var(--muted))]">Total</div>
          <div className="font-display text-3xl">{formatRupiah(total)}</div>
        </div>

        <div className="mt-4 grid gap-3">
          <Button
            disabled={submitting || !stallId || !token}
            onClick={async () => {
              try {
                setSubmitting(true)
                setError(null)
                const payload = {
                  stallId,
                  fulfillment,
                  addressText: fulfillment === 'delivery' ? addressText : undefined,
                  notes: notes || undefined,
                  items: items.map((it) => ({
                    productId: it.productId,
                    qty: it.qty,
                    notes: it.notes || undefined,
                  })),
                }
                const data = await apiSend<Created>('/api/orders', 'POST', payload, token ?? undefined)
                clear()
                navigate(`/pesanan/${data.order.id}`, { replace: true })
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? 'Membuat...' : 'Buat Pesanan'}
          </Button>
          <div className="text-center text-xs text-[hsl(var(--muted))]">
            Setelah dibuat, lanjutkan pembayaran di halaman detail pesanan.
          </div>
        </div>
      </div>
    </div>
  )
}
