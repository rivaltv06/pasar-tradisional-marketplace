import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition will-change-transform disabled:opacity-60 disabled:cursor-not-allowed',
        size === 'md' ? 'h-11 px-4 text-[15px]' : 'h-9 px-3 text-sm',
        variant === 'primary' &&
          'bg-[hsl(var(--leaf))] text-[hsl(var(--bg))] shadow-[0_14px_30px_hsl(var(--leaf)_/_0.18)] hover:-translate-y-[1px] hover:shadow-[0_18px_40px_hsl(var(--leaf)_/_0.22)] active:translate-y-0',
        variant === 'ghost' &&
          'bg-transparent text-[hsl(var(--ink))] border border-[hsl(var(--ink)_/_0.10)] hover:bg-[hsl(var(--ink)_/_0.04)] active:bg-[hsl(var(--ink)_/_0.06)]',
        className,
      )}
    />
  )
}

