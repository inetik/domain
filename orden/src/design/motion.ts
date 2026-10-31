import type { Transition, Variants } from 'motion/react'

export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 } satisfies Transition,
  gentle: { type: 'spring', stiffness: 260, damping: 30 } satisfies Transition,
  bouncy: { type: 'spring', stiffness: 420, damping: 18 } satisfies Transition,
  sheet: { type: 'spring', stiffness: 380, damping: 40, mass: 0.9 } satisfies Transition,
}

export const ease = {
  out: [0.2, 0.8, 0.2, 1] as const,
}

export const screen: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: ease.out } },
  exit: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.18, ease: ease.out } },
}

export const stagger: Variants = {
  initial: {},
  enter: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
}

export const rise: Variants = {
  initial: { opacity: 0, y: 14 },
  enter: { opacity: 1, y: 0, transition: spring.gentle },
}
