import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { Home, Search, ShoppingCart, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const linkBase =
  'flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs transition'

export function BottomNav() {
  const user = useAuthStore((s) => s.user)
  const itemsCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.qty, 0))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[hsl(var(--ink)_/_0.08)] bg-[hsl(var(--bg)_/_0.78)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-2 px-3 py-3">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'bg-[hsl(var(--ink)_/_0.06)] text-[hsl(var(--ink))]' : 'text-[hsl(var(--muted))]'}`
          }
        >
          <Home size={18} />
          <span>Beranda</span>
        </NavLink>
        <NavLink
          to="/jelajah"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'bg-[hsl(var(--ink)_/_0.06)] text-[hsl(var(--ink))]' : 'text-[hsl(var(--muted))]'}`
          }
        >
          <Search size={18} />
          <span>Jelajah</span>
        </NavLink>
        <NavLink
          to="/keranjang"
          className={({ isActive }) =>
            `${linkBase} relative ${isActive ? 'bg-[hsl(var(--ink)_/_0.06)] text-[hsl(var(--ink))]' : 'text-[hsl(var(--muted))]'}`
          }
        >
          <ShoppingCart size={18} />
          <span>Keranjang</span>
          {itemsCount > 0 ? (
            <span className="absolute right-3 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--chili))] px-1 text-[10px] font-semibold text-white">
              {itemsCount}
            </span>
          ) : null}
        </NavLink>
        <NavLink
          to={
            user
              ? user.role === 'seller'
                ? '/pedagang'
                : user.role === 'courier'
                  ? '/mitra'
                  : user.role === 'admin'
                    ? '/admin/dashboard'
                    : '/pesanan'
              : '/masuk'
          }
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'bg-[hsl(var(--ink)_/_0.06)] text-[hsl(var(--ink))]' : 'text-[hsl(var(--muted))]'}`
          }
        >
          <UserRound size={18} />
          <span>{user ? 'Akun' : 'Masuk'}</span>
        </NavLink>
      </div>
    </nav>
  )
}
