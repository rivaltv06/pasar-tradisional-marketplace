import { apiGet, apiSend } from '@/api/http'
import type { Order, OrderItem, OrderStatus } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

type Data = { order: Order; items: OrderItem[] }

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

const SELLER_STEPS: Array<{ label: string; status: OrderStatus }> = [
  { label: 'Konfirmasi', status: 'confirmed' },
  { label: 'Proses', status: 'processing' },
  { label: 'Siap', status: 'ready_for_pickup' },
  { label: 'Kirim', status: 'out_for_delivery' },
  { label: 'Selesai', status: 'completed' },
]

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [paySenderName, setPaySenderName] = useState('')
  const [payMethod, setPayMethod] = useState('Transfer Bank')
  const [payReference, setPayReference] = useState('')

  useEffect(() => {
    if (!user || !token) navigate(`/masuk?next=/pesanan/${encodeURIComponent(String(id))}`, { replace: true })
  }, [id, navigate, token, user])

  const reload = async () => {
    if (!token) return
    const res = await apiGet<Data>(`/api/orders/${encodeURIComponent(String(id))}`, token)
    setData(res)
  }

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

  const isSeller = user?.role === 'seller'
  const isAwaitingPayment = data.order.status === 'awaiting_payment' || data.order.status === 'created'
  const isPaid = data.order.status === 'paid'

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-start">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Detail Pesanan</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">#{data.order.id.slice(0, 12)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[hsl(var(--leaf)_/_0.10)] px-3 py-1 text-sm text-[hsl(var(--leaf))]">
              {labelStatus(data.order.status)}
            </span>
            <span className="rounded-full bg-[hsl(var(--ink)_/_0.05)] px-3 py-1 text-sm text-[hsl(var(--muted))]">
              {data.order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {data.items.map((it) => (
            <div key={it.id} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-xl leading-tight">{it.productNameSnapshot}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                    {it.qty} {it.unitSnapshot} • {formatRupiah(it.unitPriceSnapshot)}/{it.unitSnapshot}
                  </div>
                  {it.notes ? <div className="mt-2 text-sm text-[hsl(var(--muted))]">Catatan: {it.notes}</div> : null}
                </div>
                <div className="font-display text-2xl">{formatRupiah(it.unitPriceSnapshot * it.qty)}</div>
              </div>
            </div>
          ))}
        </div>

        {data.order.addressText ? (
          <div className="mt-6 rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-5">
            <div className="text-sm text-[hsl(var(--muted))]">Alamat pengantaran</div>
            <div className="mt-2 text-[15px]">{data.order.addressText}</div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between rounded-3xl bg-[hsl(var(--ink)_/_0.04)] p-5">
          <div className="text-sm text-[hsl(var(--muted))]">Total</div>
          <div className="font-display text-3xl">{formatRupiah(data.order.totalAmount || itemsTotal)}</div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link to="/pesanan" className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
            Kembali ke daftar
          </Link>
          <Button variant="ghost" onClick={() => reload()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="paper grain sticky top-24 rounded-[32px] p-6 md:p-7">
        <div className="font-display text-2xl">Aksi</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          {isSeller ? 'Update status agar pembeli tahu progres.' : 'Lakukan pembayaran dulu agar pesanan diproses Belanjaku.'}
        </div>

        {isSeller ? (
          <div className="mt-5 grid gap-2">
            {SELLER_STEPS.map((s) => (
              <Button
                key={s.status}
                variant={data.order.status === s.status ? 'primary' : 'ghost'}
                disabled={updating || isAwaitingPayment}
                onClick={async () => {
                  if (!token) return
                  try {
                    setUpdating(true)
                    setError(null)
                    await apiSend<Order>(
                      `/api/orders/${encodeURIComponent(data.order.id)}/status`,
                      'PATCH',
                      { status: s.status },
                      token,
                    )
                    await reload()
                  } catch (e) {
                    setError((e as Error).message)
                  } finally {
                    setUpdating(false)
                  }
                }}
              >
                {updating ? 'Mengubah...' : s.label}
              </Button>
            ))}
            {isAwaitingPayment ? (
              <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5 text-sm text-[hsl(var(--muted))]">
                Menunggu pembayaran ke Belanjaku dari pembeli.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {isAwaitingPayment ? (
              <div className="rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-5">
                <div className="text-sm text-[hsl(var(--muted))]">Tujuan pembayaran</div>
                <div className="mt-2 font-display text-xl">{data.order.paymentTo ?? 'Belanjaku'}</div>
                <div className="mt-3 grid gap-2 rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[hsl(var(--muted))]">Bank</div>
                    <div className="font-semibold text-[hsl(var(--ink))]">{data.order.paymentBank ?? '-'}</div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[hsl(var(--muted))]">No. rekening</div>
                    <div className="font-semibold text-[hsl(var(--ink))]">{data.order.paymentAccountNumber ?? '-'}</div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[hsl(var(--muted))]">Atas nama</div>
                    <div className="font-semibold text-[hsl(var(--ink))]">{data.order.paymentAccountName ?? '-'}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">
                  Lakukan pembayaran, lalu isi data di bawah untuk mencatat pembayaran.
                </div>
              </div>
            ) : null}

            {isPaid ? (
              <div className="rounded-3xl bg-[hsl(var(--leaf)_/_0.08)] p-5 text-sm text-[hsl(var(--leaf))]">
                Pembayaran tercatat. Menunggu Belanjaku memproses pesanan.
              </div>
            ) : null}

            {isAwaitingPayment ? (
              <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                <div className="grid gap-3">
                  <div>
                    <label className="text-sm text-[hsl(var(--muted))]">Metode pembayaran</label>
                    <input
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
                      placeholder="Transfer Bank / QRIS / e-Wallet"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[hsl(var(--muted))]">Nama pengirim</label>
                    <input
                      value={paySenderName}
                      onChange={(e) => setPaySenderName(e.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
                      placeholder="Nama rekening/akun"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[hsl(var(--muted))]">Nomor referensi</label>
                    <input
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
                      placeholder="Contoh: ID transaksi / 4 digit terakhir"
                    />
                  </div>
                  <Button
                    disabled={updating}
                    onClick={async () => {
                      if (!token) return
                      try {
                        setUpdating(true)
                        setError(null)
                        await apiSend<Order>(
                          `/api/orders/${encodeURIComponent(data.order.id)}/payment`,
                          'POST',
                          {
                            senderName: paySenderName.trim(),
                            method: payMethod.trim(),
                            reference: payReference.trim(),
                          },
                          token,
                        )
                        await reload()
                      } catch (e) {
                        setError((e as Error).message)
                      } finally {
                        setUpdating(false)
                      }
                    }}
                  >
                    {updating ? 'Menyimpan...' : 'Saya sudah bayar'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {error ? <div className="mt-4 text-sm text-[hsl(var(--chili))]">{error}</div> : null}
      </div>
    </div>
  )
}
