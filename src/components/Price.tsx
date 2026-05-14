export function formatRupiah(value: number): string {
  try {
    if (!Number.isFinite(value)) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value)
  } catch {
    if (!Number.isFinite(value)) return 'Rp 0'
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`
  }
}
