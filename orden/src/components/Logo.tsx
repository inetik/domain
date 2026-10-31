import { motion } from 'motion/react'

/** Marca de Orden: un techo y un tilde — la casa, resuelta. */
export function Logo({ size = 96, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Orden">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#23232e" />
          <stop offset="1" stopColor="#0b0b10" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#logo-bg)" />
      <motion.path
        d="M128 270 L256 158 L384 270"
        fill="none"
        stroke="#c6f432"
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.path
        d="M186 332 L238 382 L332 286"
        fill="none"
        stroke="#f5f5f7"
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </svg>
  )
}
