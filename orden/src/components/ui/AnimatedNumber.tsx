import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'

export function AnimatedNumber({ value, className, suffix = '' }: { value: number; className?: string; suffix?: string }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`)
  useEffect(() => {
    const controls = animate(mv, value, { type: 'spring', stiffness: 70, damping: 18 })
    return () => controls.stop()
  }, [mv, value])
  return (
    <motion.span className={className} aria-label={`${value}${suffix}`}>
      {text}
    </motion.span>
  )
}
