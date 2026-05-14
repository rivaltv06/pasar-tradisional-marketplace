import type { FulfillmentMethod, OrderStatus, PaymentChannel } from '@/api/types'

export function labelOrderStatus(status: OrderStatus | string): string {
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
      return String(status)
  }
}

export function labelPaymentChannel(channel: PaymentChannel | string): string {
  switch (channel) {
    case 'transfer':
      return 'Transfer'
    case 'qris':
      return 'QRIS'
    case 'cod':
      return 'COD'
    default:
      return String(channel).toUpperCase()
  }
}

export function labelFulfillment(method: FulfillmentMethod | string): string {
  return method === 'pickup' ? 'Pickup' : 'Delivery'
}

