import { BatteryFull, BatteryLow, BatteryMedium, Dices, Shuffle, ShoppingCart, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useData } from '../../app/data'
import { useUI } from '../../app/ui'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/Feedback'
import { Sheet } from '../../components/ui/Sheet'
import { startTask } from '../../db/repo'
import type { Energy, Task } from '../../db/types'
import { spring } from '../../design/motion'
import { CATEGORIES, ENERGY_LABEL, formatMinutes, ROOMS } from '../../lib/catalog'
import { cn } from '../../lib/cn'
import { haptic } from '../../lib/haptics'
import { rankTasks } from '../../lib/suggest'

const TIMES = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: Infinity, label: 'Todo el día' },
]

const ENERGIES: { value: Energy; icon: typeof BatteryLow; hint: string }[] = [
  { value: 'baja', icon: BatteryLow, hint: 'algo liviano' },
  { value: 'media', icon: BatteryMedium, hint: 'lo normal' },
  { value: 'alta', icon: BatteryFull, hint: 'a todo' },
]

export function SuggestSheet() {
  const { suggestOpen, setSuggestOpen } = useUI()
  return (
    <Sheet open={suggestOpen} onClose={() => setSuggestOpen(false)} label="¿Qué hago ahora?">
      <SuggestFlow />
    </Sheet>
  )
}

function SuggestFlow() {
  const { tasks } = useData()
  const { setSuggestOpen, openTask, showToast } = useUI()
  const [minutes, setMinutes] = useState(30)
  const [energy, setEnergy] = useState<Energy>('media')
  const [phase, setPhase] = useState<'ask' | 'pick'>('ask')
  const [index, setIndex] = useState(0)
  const [ranked, setRanked] = useState<Task[]>([])

  const available = useMemo(() => rankTasks(tasks, { minutes, energy }).length, [tasks, minutes, energy])

  const roll = () => {
    haptic()
    // Un poco de azar entre las mejores para que no proponga siempre lo mismo
    const list = rankTasks(tasks, { minutes, energy })
    const top = list.slice(0, 4).sort(() => Math.random() - 0.5)
    setRanked([...top, ...list.slice(4)])
    setIndex(0)
    setPhase('pick')
  }

  const current = ranked[index]

  return (
    <div className="pb-4">
      <h2 className="mt-1 font-serif text-[32px] leading-none text-ink">
        ¿Qué hago <span className="italic text-accent-text">ahora?</span>
      </h2>

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'ask' ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.12 } }}
            transition={spring.gentle}
          >
            <p className="mt-6 mb-3 text-callout text-ink-2">¿Cuánto tiempo tenés?</p>
            <div className="grid grid-cols-4 gap-2">
              {TIMES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setMinutes(t.value)}
                  aria-pressed={minutes === t.value}
                  className={cn(
                    'h-16 rounded-2xl border text-footnote font-semibold transition-colors',
                    minutes === t.value ? 'border-transparent bg-ink text-bg' : 'border-line bg-surface-1 text-ink-2',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-6 mb-3 text-callout text-ink-2">¿Con qué energía?</p>
            <div className="grid grid-cols-3 gap-2">
              {ENERGIES.map((e) => {
                const Icon = e.icon
                const active = energy === e.value
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEnergy(e.value)}
                    aria-pressed={active}
                    className={cn(
                      'flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border transition-colors',
                      active ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-surface-1 text-ink-2',
                    )}
                  >
                    <Icon className={cn('size-6', active && 'text-accent-text')} />
                    <span className="text-footnote font-semibold">{ENERGY_LABEL[e.value]}</span>
                    <span className="text-caption text-ink-3">{e.hint}</span>
                  </button>
                )
              })}
            </div>
            <Button variant="primary" size="lg" block className="mt-6" icon={<Dices className="size-5" />} onClick={roll} disabled={!available} data-testid="suggest-roll">
              {available ? `Elegime una (${available} posibles)` : 'Nada entra en ese tiempo'}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="pick"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, transition: { duration: 0.12 } }}
            transition={spring.gentle}
          >
            {current ? (
              <>
                <div className="mt-6" style={{ perspective: 1200 }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={{ rotateY: -95, opacity: 0, scale: 0.92 }}
                      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                      exit={{ rotateY: 95, opacity: 0, scale: 0.92, transition: { duration: 0.16 } }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <SuggestCard task={current} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button
                    size="lg"
                    icon={<Shuffle className="size-5" />}
                    onClick={() => {
                      haptic()
                      setIndex((i) => (i + 1) % ranked.length)
                    }}
                    disabled={ranked.length < 2}
                  >
                    Otra
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    onClick={async () => {
                      haptic('success')
                      await startTask(current.id)
                      setSuggestOpen(false)
                      showToast({ message: '¡Vamos! Está en curso.', tone: 'success' })
                      openTask(current.id)
                    }}
                  >
                    ¡Dale, la hago!
                  </Button>
                </div>
                <button type="button" className="mt-3 h-11 w-full text-footnote font-medium text-ink-3" onClick={() => setPhase('ask')}>
                  Cambiar tiempo o energía
                </button>
              </>
            ) : (
              <EmptyState icon={Dices} title="No encontré nada" body="Probá con más tiempo o más energía." action={<Button onClick={() => setPhase('ask')}>Volver</Button>} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SuggestCard({ task }: { task: Task }) {
  const room = ROOMS[task.room]
  const RoomIcon = room.icon
  const CatIcon = CATEGORIES[task.category].icon
  const missing = task.materials.filter((m) => !m.bought)
  return (
    <div
      className="noise relative overflow-hidden rounded-[28px] p-6 text-[#0b0b10] shadow-2"
      style={{ background: `linear-gradient(140deg, ${room.color}, color-mix(in oklab, ${room.color} 55%, #ffffff))` }}
      data-testid="suggest-card"
    >
      <RoomIcon className="absolute -right-6 -bottom-6 size-40 opacity-15" strokeWidth={1.25} aria-hidden />
      <div className="flex items-center gap-2 text-footnote font-semibold">
        <RoomIcon className="size-4" /> {room.label}
        <span className="opacity-50">·</span>
        <CatIcon className="size-4" /> {CATEGORIES[task.category].label}
      </div>
      <p className="mt-6 font-serif text-[34px] leading-[1.05]">{task.title}</p>
      <div className="mt-6 flex flex-wrap gap-2 text-footnote font-semibold">
        <span className="rounded-full bg-black/10 px-3 py-1.5">{formatMinutes(task.minutes)}</span>
        <span className="rounded-full bg-black/10 px-3 py-1.5">{ENERGY_LABEL[task.energy]}</span>
        {task.people.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5">
            <Users className="size-3.5" /> {task.people.join(', ')}
          </span>
        )}
      </div>
      {missing.length > 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-footnote font-medium opacity-80">
          <ShoppingCart className="size-4" /> Te faltan {missing.length} {missing.length === 1 ? 'material' : 'materiales'}
        </p>
      )}
    </div>
  )
}
