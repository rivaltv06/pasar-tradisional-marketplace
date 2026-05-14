import type { Product } from '@/api/types'
import { formatRupiah } from '@/components/Price'
import { Button } from '@/components/ui/Button'
import { categoryLabel } from '@/constants/categories'
import { useCartStore } from '@/stores/cartStore'
import { Plus, ShoppingBasket } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ProductCard({ product }: { product: Product }) {
  const addProduct = useCartStore((s) => s.addProduct)

  return (
    <div className="paper grain group relative overflow-hidden rounded-3xl">
      <Link to={`/produk/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(var(--ink)_/_0.04)]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : null}
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--bg)_/_0.82)] px-3 py-1 text-xs text-[hsl(var(--ink))] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--turmeric))]" />
            <span>{product.stockQty > 0 ? 'Stok ada' : 'Habis'}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-[18px] leading-tight">{product.name}</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted))]">{categoryLabel(product.categoryId)}</div>
            </div>
            <div className="shrink-0 rounded-2xl bg-[hsl(var(--ink)_/_0.04)] px-3 py-2 text-right">
              <div className="text-sm font-semibold">{formatRupiah(product.price)}</div>
              <div className="text-xs text-[hsl(var(--muted))]">/{product.unit}</div>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-4 pb-4">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted))]">
          <ShoppingBasket size={14} />
          <span>{product.stockQty} tersedia</span>
        </div>
        <Button
          size="sm"
          onClick={() => addProduct(product)}
          disabled={product.stockQty <= 0}
          className="rounded-full"
        >
          <Plus size={16} />
          <span>Tambah</span>
        </Button>
      </div>
    </div>
  )
}
