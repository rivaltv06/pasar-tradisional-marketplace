export function formatRupiah(value: number): string {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
  } catch {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`
  }
}

