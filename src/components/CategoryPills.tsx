import { CATEGORIES } from '@/constants/categories'
import { cn } from '@/lib/utils'

export function CategoryPills({
  value,
  onChange,
}: {
  value: string | null
  onChange: (next: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full border px-3 py-1.5 text-sm transition',
          value === null
            ? 'border-[hsl(var(--leaf)_/_0.20)] bg-[hsl(var(--leaf)_/_0.10)] text-[hsl(var(--leaf))]'
            : 'border-[hsl(var(--ink)_/_0.12)] bg-[hsl(var(--card)_/_0.7)] text-[hsl(var(--muted))] hover:bg-[hsl(var(--ink)_/_0.04)]',
        )}
      >
        Semua
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition',
            value === c.id
              ? 'border-[hsl(var(--leaf)_/_0.20)] bg-[hsl(var(--leaf)_/_0.10)] text-[hsl(var(--leaf))]'
              : 'border-[hsl(var(--ink)_/_0.12)] bg-[hsl(var(--card)_/_0.7)] text-[hsl(var(--muted))] hover:bg-[hsl(var(--ink)_/_0.04)]',
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

