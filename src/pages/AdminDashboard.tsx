import { apiGet } from '@/api/http'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { labelOrderStatus, labelPaymentChannel } from '@/lib/orderLabels'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Dashboard = {
  period: { start: string }
  summary: {
    ordersCount: number
    itemsAmount: number
    shippingFee: number
    totalAmount: number
    byStatus: Record<string, number>
    byPayment: Record<string, number>
  }
  days: { date: string; orders: number; itemsAmount: number; shippingFee: number; total: number }[]
  topProducts: { productId: string; name: string; qty: number; revenue: number }[]
  lowStock: { id: string; name: string; stockQty: number }[]
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/admin/dashboard', { replace: true })
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
        const d = await apiGet<Dashboard>('/api/admin/dashboard', token)
        if (cancelled) return
        setData(d)
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

  const last14 = useMemo(() => (data?.days ?? []).slice(-14), [data?.days])

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Dashboard Admin</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">
              Ringkasan bulan ini (trafik pembelian + keuangan).
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/pesanan">
              <Button variant="ghost">Pesanan</Button>
            </Link>
            <Link to="/admin/produk">
              <Button variant="ghost">Produk</Button>
            </Link>
            <Link to="/admin/mitra">
              <Button variant="ghost">Mitra</Button>
            </Link>
          </div>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}

      {loading ? (
        <div className="paper h-[420px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="paper grain rounded-[32px] p-6 md:p-7">
            <div className="font-display text-2xl">Keuangan</div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                <div className="text-sm text-[hsl(var(--muted))]">Omzet (subtotal)</div>
                <div className="mt-2 font-display text-3xl">{formatRupiah(data.summary.itemsAmount)}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                  <div className="text-sm text-[hsl(var(--muted))]">Ongkir</div>
                  <div className="mt-2 font-display text-2xl">{formatRupiah(data.summary.shippingFee)}</div>
                </div>
                <div className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                  <div className="text-sm text-[hsl(var(--muted))]">Total</div>
                  <div className="mt-2 font-display text-2xl">{formatRupiah(data.summary.totalAmount)}</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-[hsl(var(--muted))]">Metode pembayaran</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {Object.entries(data.summary.byPayment).map(([k, v]) => (
                  <div key={k} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-4">
                    <div className="font-display text-lg">{labelPaymentChannel(k)}</div>
                    <div className="text-sm text-[hsl(var(--muted))]">{v} order</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="paper grain rounded-[32px] p-6 md:p-7">
            <div className="font-display text-2xl">Trafik pembelian</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">14 hari terakhir (order + omzet).</div>
            <div className="mt-5 space-y-2">
              {last14.map((d) => (
                <div key={d.date} className="flex items-center justify-between rounded-2xl bg-[hsl(var(--ink)_/_0.03)] px-4 py-3">
                  <div className="text-sm text-[hsl(var(--muted))]">{d.date}</div>
                  <div className="text-sm text-[hsl(var(--muted))]">{d.orders} order</div>
                  <div className="font-display text-lg">{formatRupiah(d.itemsAmount)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-sm text-[hsl(var(--muted))]">Status order</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(data.summary.byStatus).map(([k, v]) => (
                  <div key={k} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-4">
                    <div className="font-display text-lg">{labelOrderStatus(k)}</div>
                    <div className="text-sm text-[hsl(var(--muted))]">{v} order</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="paper grain rounded-[32px] p-6 md:p-7 lg:col-span-2">
            <div className="font-display text-2xl">Produk terlaris</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Berdasarkan total qty bulan ini.</div>
            {data.topProducts.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {data.topProducts.map((p) => (
                  <div key={p.productId} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                    <div className="font-display text-xl">{p.name}</div>
                    <div className="mt-2 text-sm text-[hsl(var(--muted))]">{p.qty} item • {formatRupiah(p.revenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-8 text-center">
                <div className="font-display text-2xl">Belum ada data</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">Data muncul setelah ada transaksi.</div>
              </div>
            )}
          </div>

          <div className="paper grain rounded-[32px] p-6 md:p-7 lg:col-span-2">
            <div className="font-display text-2xl">Stok menipis</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Produk dengan stok 5 atau kurang.</div>
            {data.lowStock.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {data.lowStock.map((p) => (
                  <div key={p.id} className="rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-5">
                    <div className="font-display text-xl">{p.name}</div>
                    <div className="mt-2 text-sm text-[hsl(var(--muted))]">Stok: {p.stockQty}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-[hsl(var(--ink)_/_0.03)] p-8 text-center">
                <div className="font-display text-2xl">Aman</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">Tidak ada produk stok menipis.</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
