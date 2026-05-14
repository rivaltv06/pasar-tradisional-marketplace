import { create } from 'zustand'
import type { Product } from '@/api/types'

export type CartItem = {
  productId: string
  stallId: string
  name: string
  price: number
  unit: string
  imageUrl?: string
  stockQtySnapshot?: number
  qty: number
  notes?: string
}

type CartState = {
  stallId: string | null
  items: CartItem[]
  addProduct: (product: Product, qty?: number) => { ok: true } | { ok: false; error: string }
  setQty: (productId: string, qty: number) => void
  setNotes: (productId: string, notes: string) => void
  remove: (productId: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  stallId: null,
  items: [],
  addProduct: (product, qty = 1) => {
    const state = get()
    const nextQty = Math.max(1, Math.floor(qty))
    const maxQty = Math.max(0, Math.floor(product.stockQty))
    if (state.stallId && state.stallId !== product.stallId) {
      return { ok: false, error: 'Keranjang hanya untuk 1 kios. Kosongkan dulu untuk belanja di kios lain.' }
    }
    if (maxQty <= 0) return { ok: false, error: 'Stok habis.' }
    const exists = state.items.find((it) => it.productId === product.id)
    if (exists) {
      const desired = exists.qty + nextQty
      const clamped = Math.min(desired, maxQty)
      if (clamped === exists.qty) return { ok: false, error: `Stok tersisa ${maxQty} ${product.unit}.` }
      set({
        items: state.items.map((it) =>
          it.productId === product.id
            ? { ...it, qty: clamped, stockQtySnapshot: maxQty }
            : it,
        ),
      })
      if (clamped !== desired) return { ok: false, error: `Stok tersisa ${maxQty} ${product.unit}.` }
      return { ok: true }
    }
    const initialQty = Math.min(nextQty, maxQty)
    set({
      stallId: state.stallId ?? product.stallId,
      items: [
        ...state.items,
        {
          productId: product.id,
          stallId: product.stallId,
          name: product.name,
          price: product.price,
          unit: product.unit,
          imageUrl: product.imageUrl,
          stockQtySnapshot: maxQty,
          qty: initialQty,
        },
      ],
    })
    if (initialQty !== nextQty) return { ok: false, error: `Stok tersisa ${maxQty} ${product.unit}.` }
    return { ok: true }
  },
  setQty: (productId, qty) => {
    const raw = Math.max(1, Math.floor(qty))
    set((s) => ({
      items: s.items.map((it) => {
        if (it.productId !== productId) return it
        const max = it.stockQtySnapshot
        const next = typeof max === 'number' && max > 0 ? Math.min(raw, max) : raw
        return { ...it, qty: next }
      }),
    }))
  },
  setNotes: (productId, notes) => {
    set((s) => ({
      items: s.items.map((it) => (it.productId === productId ? { ...it, notes } : it)),
    }))
  },
  remove: (productId) => {
    const items = get().items.filter((it) => it.productId !== productId)
    set({ items, stallId: items.length ? items[0].stallId : null })
  },
  clear: () => set({ items: [], stallId: null }),
}))

export function calcCartTotal(items: CartItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0)
}
