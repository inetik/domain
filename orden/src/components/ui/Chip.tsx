import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ChipProps {
  selected?: boolean
  onClick?: () => void
  color?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function Chip({ selected, onClick, color, icon, children, className, size = 'md', ariaLabel }: ChipProps) {
  const Comp = onClick ? motion.button : motion.span
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      aria-label={ariaLabel}
      whileTap={onClick ? { scale: 0.94 } : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors',
        size === 'md' ? 'h-9 px-3.5 text-footnote' : 'h-7 px-2.5 text-caption',
        onClick && size === 'md' && 'min-h-11 h-11',
        selected ? 'border-transparent bg-ink text-bg' : 'border-line bg-surface-1 text-ink-2',
        className,
      )}
      style={selected && color ? { background: color, color: '#0b0b10' } : undefined}
    >
      {color && !selected && <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />}
      {icon}
      {children}
    </Comp>
  )
}
