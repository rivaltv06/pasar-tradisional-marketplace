import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { calcCartTotal, useCartStore } from '@/stores/cartStore'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Cart() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const setQty = useCartStore((s) => s.setQty)
  const setNotes = useCartStore((s) => s.setNotes)
  const remove = useCartStore((s) => s.remove)
  const clear = useCartStore((s) => s.clear)

  const total = calcCartTotal(items)

  if (items.length === 0) {
    return (
      <div className="paper grain rounded-[32px] p-10 text-center">
        <div className="font-display text-3xl">Keranjang kosong</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          Cari barang dulu, lalu tambah ke keranjang.
        </div>
        <div className="mt-6">
          <Link to="/jelajah" className="text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
            Mulai jelajah
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-start">
      <div className="space-y-4">
        <div className="paper grain rounded-[32px] p-6 md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-display text-3xl">Keranjang</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                Catatan per item akan terlihat oleh tim Belanjaku.
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              className="text-sm text-[hsl(var(--chili))] underline underline-offset-4"
            >
              Kosongkan
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.productId} className="paper grain rounded-[28px] p-4 md:p-5">
              <div className="flex gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-2xl bg-[hsl(var(--ink)_/_0.04)]">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xl leading-tight">{it.name}</div>
                      <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                        {formatRupiah(it.price)}/{it.unit}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(it.productId)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--ink)_/_0.04)] px-3 py-2 text-sm text-[hsl(var(--muted))] hover:bg-[hsl(var(--ink)_/_0.06)]"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(it.productId, it.qty - 1)}
                        className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--ink)_/_0.05)] hover:bg-[hsl(var(--ink)_/_0.07)]"
                      >
                        <Minus size={18} />
                      </button>
                      <div className="min-w-14 text-center">
                        <div className="font-display text-2xl leading-none">{it.qty}</div>
                        <div className="text-xs text-[hsl(var(--muted))]">{it.unit}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQty(it.productId, it.qty + 1)}
                        className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--ink)_/_0.05)] hover:bg-[hsl(var(--ink)_/_0.07)]"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="text-right text-sm">
                      <div className="text-[hsl(var(--muted))]">Subtotal</div>
                      <div className="font-display text-2xl">{formatRupiah(it.price * it.qty)}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <textarea
                      value={it.notes ?? ''}
                      onChange={(e) => setNotes(it.productId, e.target.value)}
                      placeholder="Catatan item (opsional)"
                      className="h-20 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="paper grain sticky top-24 rounded-[32px] p-6 md:p-7">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[hsl(var(--muted))]">Total</div>
          <div className="font-display text-3xl">{formatRupiah(total)}</div>
        </div>
        <div className="mt-4 grid gap-3">
          <Button onClick={() => navigate('/checkout')}>Lanjut Checkout</Button>
          <Link to="/jelajah" className="text-center text-sm text-[hsl(var(--leaf))] underline underline-offset-4">
            Tambah belanjaan
          </Link>
        </div>
      </div>
    </div>
  )
}
