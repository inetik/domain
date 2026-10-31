import { ChevronRight, Plus, ShoppingCart } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useData } from '../../app/data'
import { navigate } from '../../app/router'
import { SectionTitle } from '../../components/ui/Feedback'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { rise, stagger } from '../../design/motion'
import { plural, strokeFor } from '../../lib/catalog'
import { shoppingList } from '../../lib/shopping'
import { smartLists, smartListTasks } from '../../lib/smartLists'
import { ListEditor } from './ListEditor'

export function ListasScreen() {
  const { tasks, lists } = useData()
  const [creating, setCreating] = useState(false)
  const smart = useMemo(() => smartLists(tasks), [tasks])
  const shopping = useMemo(() => shoppingList(tasks), [tasks])
  const toBuy = shopping.filter((i) => !i.bought)
  const tasksBlocked = new Set(toBuy.flatMap((i) => i.refs.filter((r) => !r.bought).map((r) => r.taskId))).size

  return (
    <motion.div variants={stagger} initial="initial" animate="enter" className="space-y-8">
      <motion.header variants={rise} className="pt-2">
        <h1 className="font-serif text-[40px] leading-none tracking-tight text-ink">Listas</h1>
        <p className="mt-2 text-callout text-ink-2">Armá tandas de tareas y resolvé la compra de una.</p>
      </motion.header>

      <motion.button
        variants={rise}
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/ferreteria')}
        className="noise relative flex w-full items-center gap-4 overflow-hidden rounded-[28px] p-5 text-left text-[#1d0f00]"
        style={{ background: 'linear-gradient(130deg, var(--room-cocina), color-mix(in oklab, var(--room-taller) 80%, #fff))' }}
        data-testid="ferreteria-card"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-black/10">
          <ShoppingCart className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[28px] leading-none">Ferretería</span>
          <span className="mt-1 block text-footnote font-medium opacity-75">
            {toBuy.length ? `${toBuy.length} materiales · destraban ${tasksBlocked} tareas` : 'No falta comprar nada'}
          </span>
        </span>
        <ChevronRight className="size-5 opacity-60" />
      </motion.button>

      <motion.section variants={rise}>
        <SectionTitle>Mis listas</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {lists.map((l) => {
            const inList = tasks.filter((t) => t.listIds.includes(l.id))
            const done = inList.filter((t) => t.status === 'hecha').length
            return (
              <motion.button
                key={l.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/listas/${l.id}`)}
                className="relative flex min-h-36 flex-col overflow-hidden rounded-[24px] border border-line bg-surface-1 p-4 text-left"
              >
                <div className="absolute -top-10 -right-10 size-28 rounded-full opacity-25 blur-2xl" style={{ background: l.color }} aria-hidden />
                <div className="flex items-start justify-between">
                  <span className="text-[30px] leading-none">{l.emoji}</span>
                  <ProgressRing value={inList.length ? done / inList.length : 0} size={30} stroke={3.5} color={strokeFor(l.color)} label={`${done} de ${inList.length} hechas`} />
                </div>
                <span className="mt-auto pt-4 text-headline font-semibold text-ink">{l.name}</span>
                <span className="text-footnote text-ink-3">
                  {plural(inList.length - done, 'pendiente', 'pendientes')}
                  {done ? ` · ${plural(done, 'hecha', 'hechas')}` : ''}
                </span>
              </motion.button>
            )
          })}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreating(true)}
            className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-line-strong text-ink-2"
            data-testid="new-list"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-2">
              <Plus className="size-5" />
            </span>
            <span className="text-footnote font-semibold">Nueva lista</span>
          </motion.button>
        </div>
      </motion.section>

      <motion.section variants={rise}>
        <SectionTitle>Inteligentes</SectionTitle>
        <div className="overflow-hidden rounded-[24px] border border-line bg-surface-1">
          {smart.map((s, i) => {
            const n = smartListTasks(s, tasks).length
            const Icon = s.icon
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/listas/${encodeURIComponent(s.id)}`)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                style={{ borderTop: i ? '1px solid var(--border)' : undefined }}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-ink">{s.name}</span>
                  <span className="block text-footnote text-ink-3">{s.description}</span>
                </span>
                <span className="text-callout font-semibold text-ink-2 tabular">{n}</span>
                <ChevronRight className="size-4 text-ink-3" />
              </button>
            )
          })}
        </div>
      </motion.section>

      <ListEditor open={creating} onClose={() => setCreating(false)} />
    </motion.div>
  )
}
