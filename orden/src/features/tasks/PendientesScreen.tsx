import { ChevronDown, Hand, ListChecks, Plus, Search, SearchX, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useData } from '../../app/data'
import { useUI } from '../../app/ui'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { EmptyState, Segmented } from '../../components/ui/Feedback'
import { CATEGORY_IDS, ROOM_IDS, type CategoryId, type RoomId, type Task } from '../../db/types'
import { rise, stagger } from '../../design/motion'
import { CATEGORIES, formatMinutes, PRIORITY_LABEL, ROOM_ORDER, ROOMS } from '../../lib/catalog'
import { ls } from '../../lib/device'
import { normalize } from '../../lib/id'
import { isActive, isOpen, isSnoozed } from '../../lib/stats'
import { TaskCard } from './TaskCard'

type GroupBy = 'ambiente' | 'tipo' | 'prioridad'

export function PendientesScreen({ initialRoom }: { initialRoom?: string }) {
  const { tasks, ready } = useData()
  const { openQuickAdd } = useUI()
  const [room, setRoom] = useState<RoomId | null>(asRoom(initialRoom))
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>(() => (ls.get('orden:groupBy') as GroupBy) || 'ambiente')
  const [showDone, setShowDone] = useState(false)
  const [showSnoozed, setShowSnoozed] = useState(false)
  const [hint, setHint] = useState(() => ls.get('orden:swipeHint') !== 'off')

  useEffect(() => setRoom(asRoom(initialRoom)), [initialRoom])
  // Si venimos filtrados desde la casa, mostrar el chip activo
  useEffect(() => {
    if (!initialRoom) return
    const t = setTimeout(() => document.querySelector(`[data-room-chip="${initialRoom}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 150)
    return () => clearTimeout(t)
  }, [initialRoom])

  const filtered = useMemo(() => {
    const q = normalize(query)
    return tasks.filter(
      (t) =>
        (!room || t.room === room) &&
        (!category || t.category === category) &&
        (!q || normalize(`${t.title} ${t.notes} ${t.people.join(' ')} ${t.materials.map((m) => m.name).join(' ')}`).includes(q)),
    )
  }, [tasks, room, category, query])

  const open = filtered.filter((t) => isOpen(t) && !isSnoozed(t))
  const snoozed = filtered.filter((t) => isSnoozed(t))
  const done = filtered.filter((t) => t.status === 'hecha').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  const totalOpen = tasks.filter((t) => isActive(t))
  const minutes = open.reduce((a, t) => a + t.minutes, 0)
  const groups = useMemo(() => group(open, groupBy), [open, groupBy])
  const filtering = !!(room || category || query)

  return (
    <motion.div variants={stagger} initial="initial" animate="enter">
      <motion.header variants={rise} className="pt-2">
        <h1 className="font-serif text-[40px] leading-none tracking-tight text-ink">Pendientes</h1>
        <p className="mt-2 text-callout text-ink-2" data-testid="pending-summary">
          {open.length} {open.length === 1 ? 'abierta' : 'abiertas'} · {formatMinutes(minutes)} estimadas
        </p>
      </motion.header>

      <motion.div variants={rise} className="relative mt-5">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar"
          className="h-12 w-full rounded-2xl border border-line bg-surface-1 pr-11 pl-11 text-ink outline-none placeholder:text-ink-3 focus:border-accent-stroke"
        />
        {query && (
          <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')} className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center text-ink-3">
            <X className="size-4" />
          </button>
        )}
      </motion.div>

      <motion.div variants={rise} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por ambiente">
        <Chip selected={!room} onClick={() => setRoom(null)}>
          Todos <span className="opacity-60 tabular">{totalOpen.length}</span>
        </Chip>
        {ROOM_ORDER.map((r) => {
          const n = totalOpen.filter((t) => t.room === r).length
          const Icon = ROOMS[r].icon
          return (
            <span key={r} data-room-chip={r} className="contents">
              <Chip selected={room === r} color={ROOMS[r].color} icon={<Icon className="size-4" />} onClick={() => setRoom(room === r ? null : r)}>
                {ROOMS[r].short} <span className="opacity-60 tabular">{n}</span>
              </Chip>
            </span>
          )
        })}
      </motion.div>
      <motion.div variants={rise} className="no-scrollbar -mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por tipo">
        {CATEGORY_IDS.filter((c) => tasks.some((t) => t.category === c)).map((c) => {
          const Icon = CATEGORIES[c].icon
          return (
            <Chip key={c} size="md" selected={category === c} icon={<Icon className="size-4" />} onClick={() => setCategory(category === c ? null : c)}>
              {CATEGORIES[c].label}
            </Chip>
          )
        })}
      </motion.div>

      <motion.div variants={rise} className="mt-4">
        <Segmented<GroupBy>
          id="groupby"
          value={groupBy}
          onChange={(v) => {
            ls.set('orden:groupBy', v)
            setGroupBy(v)
          }}
          options={[
            { value: 'ambiente', label: 'Ambiente' },
            { value: 'tipo', label: 'Tipo' },
            { value: 'prioridad', label: 'Prioridad' },
          ]}
        />
      </motion.div>

      <AnimatePresence>
        {hint && open.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-3 text-footnote text-ink-2">
              <span className="flex w-10 shrink-0 justify-center">
                <motion.span animate={{ x: [0, 12, 0, -12, 0] }} transition={{ duration: 2.4, repeat: 3 }}>
                  <Hand className="size-5 text-accent-text" />
                </motion.span>
              </span>
              <span className="flex-1">Deslizá una tarea → para terminarla, ← para pasarla a mañana.</span>
              <button
                type="button"
                aria-label="Entendido"
                onClick={() => {
                  ls.set('orden:swipeHint', 'off')
                  setHint(false)
                }}
                className="-my-2 flex size-11 shrink-0 items-center justify-center text-ink-3"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6" data-testid="pending-list">
        {!ready ? null : tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="Todavía no hay pendientes" body="Cargá lo primero que se te ocurra. Después lo ordenamos." action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => openQuickAdd()}>Agregar pendiente</Button>} />
        ) : open.length === 0 && filtering ? (
          <EmptyState
            icon={SearchX}
            title="Nada con ese filtro"
            body={room ? `En ${room === 'general' ? 'toda la casa' : ROOMS[room].label} no queda nada abierto.` : 'Probá con otra búsqueda.'}
            color={room ? ROOMS[room].ink : undefined}
            action={
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setRoom(null)
                    setCategory(null)
                    setQuery('')
                  }}
                >
                  Ver todo
                </Button>
                {room && (
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => openQuickAdd({ room })}>
                    Agregar acá
                  </Button>
                )}
              </div>
            }
          />
        ) : open.length === 0 ? (
          <EmptyState icon={ListChecks} title="¡Casa en orden!" body="No queda nada abierto. Disfrutalo." color="var(--success-ink)" />
        ) : (
          groups.map(([key, label, color, list]) => (
            <section key={key} className="mb-6">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                {color && <span className="size-2.5 rounded-full" style={{ background: color }} />}
                <h2 className="text-footnote font-semibold text-ink">{label}</h2>
                <span className="text-footnote text-ink-3 tabular">
                  {list.length} · {formatMinutes(list.reduce((a, t) => a + t.minutes, 0))}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} showRoom={groupBy !== 'ambiente'} />
                ))}
              </AnimatePresence>
            </section>
          ))
        )}
      </div>

      {snoozed.length > 0 && (
        <Collapsible title={`Pospuestas (${snoozed.length})`} open={showSnoozed} onToggle={() => setShowSnoozed((v) => !v)}>
          {snoozed.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </Collapsible>
      )}
      {done.length > 0 && (
        <Collapsible title={`Hechas (${done.length})`} open={showDone} onToggle={() => setShowDone((v) => !v)}>
          <AnimatePresence initial={false}>
            {done.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </Collapsible>
      )}
    </motion.div>
  )
}

function asRoom(value?: string): RoomId | null {
  return value && (ROOM_IDS as readonly string[]).includes(value) ? (value as RoomId) : null
}

function group(list: Task[], by: GroupBy): [string, string, string | undefined, Task[]][] {
  if (by === 'ambiente') {
    return ROOM_ORDER.map((r): [string, string, string | undefined, Task[]] => [r, ROOMS[r].label, ROOMS[r].color, list.filter((t) => t.room === r)]).filter((g) => g[3].length)
  }
  if (by === 'tipo') {
    return CATEGORY_IDS.map((c): [string, string, string | undefined, Task[]] => [c, CATEGORIES[c].label, undefined, list.filter((t) => t.category === c)]).filter((g) => g[3].length)
  }
  return ([2, 1, 0] as const)
    .map((p): [string, string, string | undefined, Task[]] => [String(p), PRIORITY_LABEL[p], p === 2 ? 'var(--danger)' : p === 1 ? 'var(--warn)' : 'var(--text-3)', list.filter((t) => t.priority === p)])
    .filter((g) => g[3].length)
}

function Collapsible({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="mb-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex h-12 w-full items-center justify-between rounded-2xl px-1 text-footnote font-semibold text-ink-2">
        {title}
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
