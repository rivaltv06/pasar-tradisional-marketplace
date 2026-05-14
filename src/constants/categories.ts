export const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'sayur', label: 'Sayur' },
  { id: 'buah', label: 'Buah' },
  { id: 'daging', label: 'Daging' },
  { id: 'ikan', label: 'Ikan' },
  { id: 'bumbu', label: 'Bumbu' },
  { id: 'sembako', label: 'Sembako' },
  { id: 'jajanan', label: 'Jajanan' },
]

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}
