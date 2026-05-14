import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { ShoppingCart, Store, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TopBar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const itemsCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.qty, 0))

  return (
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--ink)_/_0.08)] bg-[hsl(var(--bg)_/_0.72)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--leaf))] text-[hsl(var(--bg))] shadow-[0_16px_40px_hsl(var(--leaf)_/_0.18)]">
            <Store size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[18px]">Belanjaku</div>
            <div className="text-xs text-[hsl(var(--muted))]">Belanja bahan pokok, bayar dulu, lalu diproses</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to={user.role === 'seller' ? '/pedagang' : '/pesanan'}
                className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.65)] px-4 py-2 text-sm text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)_/_0.04)]"
              >
                <UserRound size={16} />
                <span className="max-w-[160px] truncate">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.65)] px-4 py-2 text-sm text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)_/_0.04)]"
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link
              to="/masuk"
              className="hidden items-center gap-2 rounded-full border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.65)] px-4 py-2 text-sm text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)_/_0.04)] md:inline-flex"
            >
              <UserRound size={16} />
              <span>Masuk</span>
            </Link>
          )}

          <Link
            to="/keranjang"
            className="relative inline-flex h-11 items-center justify-center rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--card)_/_0.65)] px-4 text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)_/_0.04)]"
          >
            <ShoppingCart size={18} />
            {itemsCount > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[hsl(var(--chili))] px-2 text-xs font-semibold text-white">
                {itemsCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  )
}
