import { ArrowRight, ChevronRight, Dices, HardHat, Lightbulb, PartyPopper, Settings, TriangleAlert, Waypoints } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useData } from '../../app/data'
import { navigate } from '../../app/router'
import { useUI } from '../../app/ui'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { IconButton } from '../../components/ui/Button'
import { SectionTitle } from '../../components/ui/Feedback'
import { rise, stagger } from '../../design/motion'
import { formatMinutes, plural, ROOM_ORDER, ROOMS } from '../../lib/catalog'
import { capatazInsights, type Insight } from '../../lib/capataz'
import { greeting, longDate } from '../../lib/dates'
import { isOpen, isSnoozed, roomSummary } from '../../lib/stats'
import { HouseCard } from '../house3d/HouseCard'
import { TaskCard } from '../tasks/TaskCard'

const TONE: Record<Insight['tone'], { icon: typeof Lightbulb; color: string }> = {
  tip: { icon: Lightbulb, color: 'var(--room-taller-ink)' },
  warn: { icon: TriangleAlert, color: 'var(--warn-ink)' },
  win: { icon: PartyPopper, color: 'var(--success-ink)' },
  plan: { icon: Waypoints, color: 'var(--room-living-ink)' },
}

export function CasaScreen() {
  const { tasks } = useData()
  const { openTask, setSuggestOpen } = useUI()
  const insights = useMemo(() => capatazInsights(tasks), [tasks])
  const top = insights[0]
  const rest = insights.slice(1, 7)
  const open = tasks.filter((t) => isOpen(t) && !isSnoozed(t))
  const next = open.slice(0, 3)
  const now = new Date()

  const runAction = (insight: Insight) => {
    const a = insight.action
    if (!a) return
    if (a.kind === 'task') openTask(a.taskId)
    else if (a.kind === 'room') navigate(`/pendientes?ambiente=${a.room}`)
    else if (a.kind === 'route') navigate(a.to)
    else setSuggestOpen(true)
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="enter" className="space-y-8">
      <motion.header variants={rise} className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-footnote text-ink-3 first-letter:uppercase">
            {longDate(now.getTime())} · {greeting(now)}
          </p>
          {open.length ? (
            <h1 className="mt-1.5 font-serif text-[34px] leading-[1] tracking-tight text-ink" data-testid="casa-title">
              Tenés <AnimatedNumber value={open.length} className="italic text-accent-text" /> {open.length === 1 ? 'pendiente' : 'pendientes'}.
            </h1>
          ) : (
            <h1 className="mt-1.5 font-serif text-[34px] leading-[1] tracking-tight text-ink" data-testid="casa-title">
              Casa <span className="italic text-accent-text">en orden.</span>
            </h1>
          )}
        </div>
        <IconButton label="Ajustes" tone="glass" onClick={() => navigate('/ajustes')}>
          <Settings className="size-5" />
        </IconButton>
      </motion.header>

      {top && (
        <motion.button
          variants={rise}
          type="button"
          onClick={() => runAction(top)}
          whileTap={{ scale: 0.98 }}
          className="-mt-3 flex min-h-14 w-full items-center gap-3 rounded-[20px] border border-line bg-surface-1 px-4 py-3 text-left"
          data-testid="ahora"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${TONE[top.tone].color} 18%, transparent)`,
              color: TONE[top.tone].color,
            }}
          >
            {(() => {
              const Icon = TONE[top.tone].icon
              return <Icon className="size-4.5" />
            })()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-caption font-semibold tracking-[0.08em] text-ink-3 uppercase">Ahora</span>
            <span className="block truncate text-callout font-medium text-ink">{top.action?.kind === 'task' ? top.body.split('.')[0] : top.title}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-ink-3" />
        </motion.button>
      )}

      <motion.div variants={rise}>
        <HouseCard />
      </motion.div>

      {/* El Capataz */}
      {rest.length > 0 && (
        <motion.section variants={rise} aria-labelledby="capataz-title">
          <SectionTitle>
            <span id="capataz-title" className="inline-flex items-center gap-1.5">
              <HardHat className="size-3.5" /> El Capataz
            </span>
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1" data-testid="capataz">
            {rest.map((ins, i) => {
              const tone = TONE[ins.tone]
              const Icon = tone.icon
              return (
                <motion.button
                  key={ins.id}
                  type="button"
                  onClick={() => runAction(ins)}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.1 + i * 0.06,
                    type: 'spring',
                    stiffness: 260,
                    damping: 28,
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="flex w-[78%] max-w-[300px] shrink-0 snap-start flex-col rounded-[24px] border border-line bg-surface-1 p-4 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="flex size-8 items-center justify-center rounded-xl"
                      style={{
                        background: `color-mix(in oklab, ${tone.color} 18%, transparent)`,
                        color: tone.color,
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-headline font-semibold text-ink">{ins.title}</span>
                  </span>
                  <span className="mt-2 flex-1 text-callout text-ink-2">{ins.body}</span>
                  {ins.action && (
                    <span className="mt-3 inline-flex items-center gap-1 text-footnote font-semibold text-accent-text">
                      {ins.action.label} <ArrowRight className="size-3.5" />
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ¿Qué hago ahora? */}
      <motion.button
        variants={rise}
        type="button"
        onClick={() => setSuggestOpen(true)}
        whileTap={{ scale: 0.98 }}
        className="noise relative flex w-full items-center gap-4 overflow-hidden rounded-[28px] p-5 text-left text-accent-ink"
        style={{
          background: 'linear-gradient(120deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 55%, var(--room-bano)) 100%)',
        }}
        data-testid="suggest-open"
      >
        <motion.span
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-black/10"
          animate={{ rotate: [0, -12, 12, 0] }}
          transition={{ duration: 2.4, repeat: 2, repeatDelay: 2 }}
        >
          <Dices className="size-7" />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[26px] leading-none">¿Qué hago ahora?</span>
          <span className="mt-1 block text-footnote font-medium opacity-70">Decime cuánto tiempo tenés y te elijo una.</span>
        </span>
        <ChevronRight className="size-5 opacity-60" />
      </motion.button>

      {/* Ambientes */}
      <motion.section variants={rise}>
        <SectionTitle>Ambientes</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {ROOM_ORDER.map((id) => {
            const room = ROOMS[id]
            const s = roomSummary(tasks, id)
            const Icon = room.icon
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/pendientes?ambiente=${id}`)}
                className="relative overflow-hidden rounded-[24px] border border-line bg-surface-1 p-4 text-left"
              >
                <div className="absolute -top-8 -right-8 size-24 rounded-full opacity-20 blur-2xl" style={{ background: room.color }} aria-hidden />
                <span
                  className="flex size-10 items-center justify-center rounded-2xl"
                  style={{
                    background: `color-mix(in oklab, ${room.color} 20%, transparent)`,
                    color: room.ink,
                  }}
                >
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-headline font-semibold text-ink">{room.label}</p>
                <p className="text-footnote text-ink-3">
                  {s.open ? `${plural(s.open, 'pendiente', 'pendientes')} · ${formatMinutes(s.minutes)}` : s.done ? 'Todo listo ✓' : 'Nada por ahora'}
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: room.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.progress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.section>

      {/* Próximas */}
      {next.length > 0 && (
        <motion.section variants={rise}>
          <SectionTitle
            action={
              <button type="button" onClick={() => navigate('/pendientes')} className="-my-2 flex h-11 items-center gap-0.5 text-footnote font-semibold text-accent-text">
                Ver todas <ChevronRight className="size-4" />
              </button>
            }
          >
            Lo próximo
          </SectionTitle>
          {next.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </motion.section>
      )}
    </motion.div>
  )
}
