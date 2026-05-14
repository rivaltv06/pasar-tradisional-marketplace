import { create } from 'zustand'
import type { Product } from '@/api/types'

export type CartItem = {
  productId: string
  stallId: string
  name: string
  price: number
  unit: string
  imageUrl?: string
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
    if (state.stallId && state.stallId !== product.stallId) {
      return { ok: false, error: 'Keranjang hanya untuk 1 kios. Kosongkan dulu untuk belanja di kios lain.' }
    }
    const exists = state.items.find((it) => it.productId === product.id)
    if (exists) {
      set({
        items: state.items.map((it) =>
          it.productId === product.id ? { ...it, qty: it.qty + nextQty } : it,
        ),
      })
      return { ok: true }
    }
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
          qty: nextQty,
        },
      ],
    })
    return { ok: true }
  },
  setQty: (productId, qty) => {
    const next = Math.max(1, Math.floor(qty))
    set((s) => ({
      items: s.items.map((it) => (it.productId === productId ? { ...it, qty: next } : it)),
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
