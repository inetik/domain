import { Box, Dices, HardHat, ShoppingCart } from 'lucide-react'
import { motion } from 'motion/react'
import { useData } from '../../app/data'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { spring } from '../../design/motion'
import { ROOMS } from '../../lib/catalog'

const FEATURES = [
  { icon: Box, text: 'Tu casa en 3D: cada ambiente muestra lo que falta.' },
  { icon: HardHat, text: 'El Capataz te dice por dónde arrancar.' },
  { icon: ShoppingCart, text: 'La lista de ferretería se arma sola.' },
  { icon: Dices, text: '¿Poco tiempo? Te elijo una tarea a medida.' },
]

export function Welcome({ onDone }: { onDone: () => void }) {
  const { tasks } = useData()
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-bg px-6 pt-safe pb-safe"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
      transition={{ duration: 0.4 }}
      data-testid="welcome"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-60" style={{ background: 'radial-gradient(60% 50% at 50% 20%, color-mix(in oklab, var(--accent) 22%, transparent), transparent)' }} aria-hidden />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <motion.div className="mt-10" initial={{ scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={spring.bouncy}>
          <Logo size={88} />
        </motion.div>
        <motion.h1 className="mt-8 font-serif text-[56px] leading-[0.9] tracking-tight text-ink" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring.gentle, delay: 0.15 }}>
          Tu casa,
          <br />
          <span className="italic text-accent-text">en orden.</span>
        </motion.h1>
        <motion.p className="mt-4 text-body text-ink-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          Ya cargué tus {tasks.length} pendientes y los ordené por ambiente.
        </motion.p>

        <div className="relative -mx-6 mt-5 overflow-hidden py-1" aria-hidden>
          <motion.div className="flex w-max gap-2 px-6" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
            {[...tasks, ...tasks].map((t, i) => (
              <span key={`${t.id}-${i}`} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface-1 px-3 text-footnote whitespace-nowrap text-ink-2">
                <span className="size-2 rounded-full" style={{ background: ROOMS[t.room].color }} />
                {t.title}
              </span>
            ))}
          </motion.div>
        </div>

        <ul className="mt-6 space-y-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.li key={f.text} className="flex items-center gap-3" initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...spring.gentle, delay: 0.4 + i * 0.08 }}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-accent-text">
                  <Icon className="size-5" />
                </span>
                <span className="text-callout text-ink">{f.text}</span>
              </motion.li>
            )
          })}
        </ul>

        <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-bg from-60% to-transparent pt-8 pb-4">
          <Button variant="primary" size="lg" block onClick={onDone} data-testid="welcome-start">
            Entrar a mi casa
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
