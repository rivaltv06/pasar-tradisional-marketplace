import { apiGet, apiSend } from '@/api/http'
import type { Order, OrderItem, PaymentChannel, PromoSettings } from '@/api/types'
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

  const [addressText, setAddressText] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('transfer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promo, setPromo] = useState<PromoSettings | null | undefined>(undefined)

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await apiGet<PromoSettings>('/api/promo')
        if (cancelled) return
        setPromo(p)
      } catch {
        if (cancelled) return
        setPromo(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const itemsTotal = useMemo(() => calcCartTotal(items), [items])
  const baseShippingFee = 15000
  const promoLoading = promo === undefined
  const promoEligible = promo?.enabled && itemsTotal >= (promo?.minItemsAmount ?? 0) && !promo?.ctaCategoryId
  const shippingFee = promoEligible ? 0 : baseShippingFee
  const grandTotal = itemsTotal + (promoLoading ? baseShippingFee : shippingFee)

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-start">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="font-display text-3xl">Checkout</div>
        <div className="mt-1 text-sm text-[hsl(var(--muted))]">
          Pesanan akan dibuat dulu, lalu kamu bayar ke Belanjaku. Setelah pembayaran tercatat, Belanjaku mulai memproses.
        </div>

        <div className="mt-6 grid gap-6">
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Alamat pengantaran</label>
            <textarea
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Tulis alamat lengkap + patokan"
              className="mt-2 h-28 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
            <div className="mt-2 text-xs text-[hsl(var(--muted))]">
              {promoLoading ? (
                <>Menghitung promo ongkir...</>
              ) : promo?.enabled ? (
                promo?.ctaCategoryId ? (
                  <>Ongkir mengikuti promo sesuai kategori (akan dihitung saat pesanan dibuat).</>
                ) : (
                  <>Promo ongkir: {shippingFee === 0 ? 'Gratis ongkir' : `Min belanja ${formatRupiah(promo.minItemsAmount)}`}</>
                )
              ) : (
                <>Ongkir flat Tasikmalaya: {formatRupiah(shippingFee)}</>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
            <div className="text-sm text-[hsl(var(--muted))]">Metode pembayaran</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPaymentChannel('transfer')}
                className={`rounded-3xl border p-4 text-left transition ${
                  paymentChannel === 'transfer'
                    ? 'border-[hsl(var(--leaf)_/_0.25)] bg-[hsl(var(--leaf)_/_0.08)]'
                    : 'border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] hover:bg-[hsl(var(--ink)_/_0.04)]'
                }`}
              >
                <div className="font-display text-lg">Transfer</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">BCA</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChannel('qris')}
                className={`rounded-3xl border p-4 text-left transition ${
                  paymentChannel === 'qris'
                    ? 'border-[hsl(var(--leaf)_/_0.25)] bg-[hsl(var(--leaf)_/_0.08)]'
                    : 'border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] hover:bg-[hsl(var(--ink)_/_0.04)]'
                }`}
              >
                <div className="font-display text-lg">QRIS</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">Scan</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChannel('cod')}
                className={`rounded-3xl border p-4 text-left transition ${
                  paymentChannel === 'cod'
                    ? 'border-[hsl(var(--leaf)_/_0.25)] bg-[hsl(var(--leaf)_/_0.08)]'
                    : 'border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] hover:bg-[hsl(var(--ink)_/_0.04)]'
                }`}
              >
                <div className="font-display text-lg">COD</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted))]">Bayar di tempat</div>
              </button>
            </div>
          </div>

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

        <div className="mt-4 space-y-2 rounded-3xl bg-[hsl(var(--ink)_/_0.04)] p-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-[hsl(var(--muted))]">Subtotal</div>
            <div className="font-semibold text-[hsl(var(--ink))]">{formatRupiah(itemsTotal)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[hsl(var(--muted))]">Ongkir</div>
            <div className="font-semibold text-[hsl(var(--ink))]">{promoLoading ? '...' : formatRupiah(shippingFee)}</div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-[hsl(var(--muted))]">Total</div>
            <div className="font-display text-3xl">{formatRupiah(grandTotal)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <Button
            disabled={submitting || !stallId || !token || addressText.trim().length < 8}
            onClick={async () => {
              try {
                setSubmitting(true)
                setError(null)
                const payload = {
                  stallId,
                  addressText,
                  notes: notes || undefined,
                  paymentChannel,
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
            {paymentChannel === 'cod'
              ? 'COD: pembayaran saat pesanan diterima.'
              : 'Setelah dibuat, lanjutkan pembayaran di halaman detail pesanan.'}
          </div>
        </div>
      </div>
    </div>
  )
}
