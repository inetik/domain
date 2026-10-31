import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children?: ReactNode
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold shadow-glow disabled:bg-surface-2 disabled:text-ink-3 disabled:shadow-none',
  secondary: 'bg-surface-2 text-ink font-medium disabled:opacity-40',
  ghost: 'bg-transparent text-ink-2 font-medium disabled:opacity-40',
  danger: 'bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] text-danger-ink font-semibold disabled:opacity-40',
  outline: 'border border-line-strong text-ink font-medium disabled:opacity-40',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-footnote gap-1.5 rounded-xl',
  md: 'h-12 px-5 text-callout gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-headline gap-2.5 rounded-[20px]',
}

export function Button({ variant = 'secondary', size = 'md', icon, children, block, className, disabled, ...rest }: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={cn('inline-flex min-w-0 items-center justify-center whitespace-nowrap transition-colors', variants[variant], sizes[size], block && 'w-full', className)}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children != null && <span className="truncate">{children}</span>}
    </motion.button>
  )
}

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string
  children: ReactNode
  tone?: 'surface' | 'ghost' | 'glass'
}

export function IconButton({ label, children, tone = 'surface', className, ...rest }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink',
        tone === 'surface' && 'bg-surface-2',
        tone === 'glass' && 'glass border border-line',
        tone === 'ghost' && 'bg-transparent text-ink-2',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
