export type UserRole = 'buyer' | 'seller' | 'admin'

export type UserPublic = {
  id: string
  role: UserRole
  name: string
  email?: string
  phone?: string
  createdAt: string
}

export type Market = {
  id: string
  name: string
  city: string
  address?: string
}

export type Stall = {
  id: string
  sellerUserId: string
  marketId: string
  name: string
  description?: string
  openHours?: string
  isActive: boolean
  ratingAvg: number
}

export type ProductUnit = 'kg' | 'ikat' | 'buah' | 'bungkus' | 'ekor'

export type Product = {
  id: string
  stallId: string
  name: string
  categoryId: string
  price: number
  unit: ProductUnit
  stockQty: number
  isHidden: boolean
  imageUrl?: string
}

export type OrderStatus =
  | 'created'
  | 'awaiting_payment'
  | 'paid'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'

export type FulfillmentMethod = 'pickup' | 'delivery'

export type Order = {
  id: string
  buyerUserId: string
  stallId: string
  status: OrderStatus
  fulfillment: FulfillmentMethod
  addressText?: string
  notes?: string
  totalAmount: number
  paymentTo?: string
  paymentBank?: string
  paymentAccountNumber?: string
  paymentAccountName?: string
  paymentMethod?: string
  paymentSenderName?: string
  paymentReference?: string
  paidAt?: string
  createdAt: string
}

export type OrderItem = {
  id: string
  orderId: string
  productId: string
  productNameSnapshot: string
  unitPriceSnapshot: number
  qty: number
  unitSnapshot: ProductUnit
  notes?: string
}
