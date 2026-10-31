import { useLiveQuery } from 'dexie-react-hooks'
import { AlarmClock, Check, Copy, Play, Plus, RotateCcw, ShieldAlert, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useData, useTask } from '../../app/data'
import { useUI } from '../../app/ui'
import { Burst } from '../../components/Burst'
import { AutoTextarea } from '../../components/ui/AutoTextarea'
import { Button, IconButton } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Segmented } from '../../components/ui/Feedback'
import { Sheet } from '../../components/ui/Sheet'
import { duplicateTask, setTaskInList, toggleMaterial, toggleSubtask, updateTask } from '../../db/repo'
import { db } from '../../db/schema'
import { CATEGORY_IDS, type Energy, type Priority, type Task } from '../../db/types'
import { spring } from '../../design/motion'
import { CATEGORIES, ENERGY_LABEL, formatMinutes, ROOM_ORDER, ROOMS } from '../../lib/catalog'
import { cn } from '../../lib/cn'
import { dayLabel, longDate, time } from '../../lib/dates'
import { uid } from '../../lib/id'
import { suggestMaterials } from '../../lib/materials'
import { knownPeople } from '../../lib/stats'
import { LOG_META } from '../registro/logMeta'
import { TaskPhotos } from './Photos'
import { useTaskActions } from './useTaskActions'

export function TaskDetail() {
  const { taskId, closeTask } = useUI()
  const live = useTask(taskId)
  // Mantener el contenido visible mientras la hoja se va animando hacia abajo
  const last = useRef(live)
  if (live) last.current = live
  const task = live ?? last.current
  return (
    <Sheet
      open={!!taskId && !!live}
      onClose={closeTask}
      label={task ? `Tarea: ${task.title}` : 'Tarea'}
      tall
      header={
        task && (
          <div className="flex items-center gap-2 pb-2">
            <RoomPill task={task} />
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-caption font-medium text-ink-2">
              {(() => {
                const Icon = CATEGORIES[task.category].icon
                return <Icon className="size-3.5" />
              })()}
              {CATEGORIES[task.category].label}
            </span>
            <div className="flex-1" />
            <IconButton label="Cerrar" onClick={closeTask} className="size-9">
              <X className="size-4.5" />
            </IconButton>
          </div>
        )
      }
    >
      {task && <TaskBody key={task.id} task={task} />}
    </Sheet>
  )
}

function RoomPill({ task }: { task: Task }) {
  const room = ROOMS[task.room]
  const Icon = room.icon
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-caption font-semibold text-[#0b0b10]" style={{ background: room.color }}>
      <Icon className="size-3.5" />
      {room.label}
    </span>
  )
}

function useDebounced(value: string, save: (v: string) => void, delay = 500) {
  const first = useRef(true)
  const saveRef = useRef(save)
  saveRef.current = save
  const latest = useRef(value)
  latest.current = value
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => saveRef.current(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  // Guardar lo pendiente al cerrar
  useEffect(() => () => saveRef.current(latest.current), [])
}

function TaskBody({ task }: { task: Task }) {
  const actions = useTaskActions()
  const { closeTask, showToast, openTask } = useUI()
  const { tasks, lists } = useData()
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [celebrate, setCelebrate] = useState(false)
  const done = task.status === 'hecha'

  useDebounced(title, (v) => v.trim() && v.trim() !== task.title && updateTask(task.id, { title: v.trim() }))
  useDebounced(notes, (v) => v !== task.notes && updateTask(task.id, { notes: v }))

  const patch = (p: Partial<Task>) => updateTask(task.id, p)
  const subDone = task.subtasks.filter((s) => s.done).length
  const suggestions = suggestMaterials(task.title).filter((m) => !task.materials.some((x) => x.name.toLowerCase() === m.toLowerCase()))
  const people = knownPeople(tasks).filter((p) => !task.people.includes(p))

  const complete = () => {
    setCelebrate(true)
    setTimeout(() => {
      actions.complete(task)
      setCelebrate(false)
    }, 450)
  }

  return (
    <div className="pb-8">
      <AutoTextarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        rows={1}
        aria-label="Título"
        className="mt-2 w-full resize-none bg-transparent text-[26px] leading-tight font-semibold tracking-tight text-ink outline-none"
      />
      <p className="mt-1 text-footnote text-ink-3">
        Creada {dayLabel(task.createdAt).toLowerCase()} · {formatMinutes(task.minutes)} · {ENERGY_LABEL[task.energy].toLowerCase()}
      </p>

      {/* Acción principal */}
      <div className="mt-5">
        {done ? (
          <div className="flex items-center gap-3 rounded-[22px] border border-success/30 bg-success/10 p-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-success text-[#06281b]">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">¡Hecha!</p>
              <p className="text-footnote text-ink-2">{task.completedAt ? `${longDate(task.completedAt)} · ${time(task.completedAt)}` : ''}</p>
            </div>
            <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => actions.reopen(task)}>
              Reabrir
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="primary" size="lg" className="relative flex-1" icon={<Check className="size-5" strokeWidth={3} />} onClick={complete} data-testid="detail-complete">
              Marcar hecha
              {celebrate && <Burst count={20} radius={90} />}
            </Button>
            {task.status === 'pendiente' ? (
              <IconButton label="Empezar ahora" className="size-14 rounded-[20px]" onClick={() => actions.start(task)}>
                <Play className="size-5" />
              </IconButton>
            ) : null}
            <IconButton
              label="Posponer a mañana"
              className="size-14 rounded-[20px]"
              onClick={() => {
                actions.snooze(task)
                closeTask()
              }}
            >
              <AlarmClock className="size-5" />
            </IconButton>
          </div>
        )}
      </div>

      {task.category === 'electricidad' && !done && (
        <div className="mt-4 flex gap-3 rounded-[20px] border border-warn/30 bg-warn/10 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warn" />
          <p className="text-callout text-ink">
            <strong>Seguridad primero.</strong> Cortá la térmica, verificá con el buscapolo y no trabajes con las manos húmedas.
          </p>
        </div>
      )}

      {/* Subtareas */}
      <Section title="Pasos" meta={task.subtasks.length ? `${subDone}/${task.subtasks.length}` : undefined}>
        {task.subtasks.length > 0 && (
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${(subDone / task.subtasks.length) * 100}%` }} transition={spring.gentle} />
          </div>
        )}
        <AnimatePresence initial={false}>
          {task.subtasks.map((s) => (
            <CheckRow
              key={s.id}
              checked={s.done}
              label={s.title}
              onToggle={() => toggleSubtask(task.id, s.id)}
              onRemove={() => patch({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}
            />
          ))}
        </AnimatePresence>
        <AddRow placeholder="Agregar un paso" onAdd={(v) => patch({ subtasks: [...task.subtasks, { id: uid(), title: v, done: false }] })} />
      </Section>

      {/* Materiales */}
      <Section title="Materiales" meta={task.materials.length ? `${task.materials.filter((m) => m.bought).length}/${task.materials.length} comprados` : undefined}>
        <AnimatePresence initial={false}>
          {task.materials.map((m) => (
            <CheckRow
              key={m.id}
              checked={m.bought}
              label={m.name}
              onToggle={() => toggleMaterial(task.id, m.id)}
              onRemove={() => patch({ materials: task.materials.filter((x) => x.id !== m.id) })}
            />
          ))}
        </AnimatePresence>
        <AddRow placeholder="Agregar material" onAdd={(v) => patch({ materials: [...task.materials, { id: uid(), name: v, bought: false }] })} />
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((m) => (
              <Chip key={m} size="sm" icon={<Plus className="size-3" />} onClick={() => patch({ materials: [...task.materials, { id: uid(), name: m, bought: false }] })}>
                {m}
              </Chip>
            ))}
          </div>
        )}
      </Section>

      <Section title="Fotos" meta="antes y después">
        <TaskPhotos taskId={task.id} />
      </Section>

      <Section title="Notas">
        <AutoTextarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Medidas, links, ideas…"
          aria-label="Notas"
          className="min-h-24 w-full resize-none rounded-2xl border border-line bg-surface-1 p-3.5 text-body text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </Section>

      <Section title="Ajustes">
        <Label>Ambiente</Label>
        <Scroller>
          {ROOM_ORDER.map((r) => {
            const Icon = ROOMS[r].icon
            return (
              <Chip key={r} selected={task.room === r} color={ROOMS[r].color} icon={<Icon className="size-4" />} onClick={() => patch({ room: r })}>
                {ROOMS[r].short}
              </Chip>
            )
          })}
        </Scroller>
        <Label>Tipo</Label>
        <Scroller>
          {CATEGORY_IDS.map((c) => {
            const Icon = CATEGORIES[c].icon
            return (
              <Chip key={c} selected={task.category === c} icon={<Icon className="size-4" />} onClick={() => patch({ category: c })}>
                {CATEGORIES[c].label}
              </Chip>
            )
          })}
        </Scroller>
        <Label>Tiempo</Label>
        <Scroller>
          {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
            <Chip key={m} selected={task.minutes === m} onClick={() => patch({ minutes: m })}>
              {formatMinutes(m)}
            </Chip>
          ))}
        </Scroller>
        <Label>Energía que pide</Label>
        <Segmented<Energy>
          id={`energy-${task.id}`}
          value={task.energy}
          onChange={(v) => patch({ energy: v })}
          options={(['baja', 'media', 'alta'] as Energy[]).map((e) => ({ value: e, label: ENERGY_LABEL[e] }))}
        />
        <Label>Prioridad</Label>
        <Segmented
          id={`prio-${task.id}`}
          value={String(task.priority) as '0' | '1' | '2'}
          onChange={(v) => patch({ priority: Number(v) as Priority })}
          options={[
            { value: '0', label: 'Normal' },
            { value: '1', label: 'Importante' },
            { value: '2', label: 'Urgente' },
          ]}
        />
        <Label>Fecha</Label>
        <div className="flex gap-2">
          <input
            type="date"
            value={task.due ?? ''}
            onChange={(e) => patch({ due: e.target.value || undefined })}
            aria-label="Fecha objetivo"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface-1 px-4 text-ink outline-none focus:border-accent"
          />
          {task.due && (
            <Button variant="ghost" onClick={() => patch({ due: undefined })}>
              Quitar
            </Button>
          )}
        </div>
        <Label>Con quién</Label>
        <div className="flex flex-wrap gap-2">
          {task.people.map((p) => (
            <Chip key={p} selected onClick={() => patch({ people: task.people.filter((x) => x !== p) })} ariaLabel={`Quitar a ${p}`}>
              {p} <X className="size-3.5" />
            </Chip>
          ))}
          {people.map((p) => (
            <Chip key={p} icon={<Plus className="size-3.5" />} onClick={() => patch({ people: [...task.people, p] })}>
              {p}
            </Chip>
          ))}
        </div>
        <AddRow placeholder="Sumar persona (ej: Nacho)" onAdd={(v) => patch({ people: [...task.people, v.charAt(0).toUpperCase() + v.slice(1)] })} />
        {lists.length > 0 && (
          <>
            <Label>Listas</Label>
            <div className="flex flex-wrap gap-2">
              {lists.map((l) => {
                const inList = task.listIds.includes(l.id)
                return (
                  <Chip key={l.id} selected={inList} color={l.color} onClick={() => setTaskInList(task.id, l.id, !inList)}>
                    {l.emoji} {l.name}
                  </Chip>
                )
              })}
            </div>
          </>
        )}
      </Section>

      <TaskHistory taskId={task.id} />

      <div className="mt-8 flex gap-2">
        <Button
          block
          icon={<Copy className="size-4" />}
          onClick={async () => {
            const copy = await duplicateTask(task.id)
            if (copy) {
              showToast({ message: 'Tarea duplicada', tone: 'success' })
              openTask(copy.id)
            }
          }}
        >
          Duplicar
        </Button>
        <Button
          block
          variant="danger"
          icon={<Trash2 className="size-4" />}
          onClick={() => {
            closeTask()
            actions.remove(task)
          }}
        >
          Borrar
        </Button>
      </div>
    </div>
  )
}

function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-headline font-semibold text-ink">{title}</h3>
        {meta && <span className="text-footnote text-ink-3 tabular">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mt-4 mb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase first:mt-0">{children}</p>
}

function Scroller({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">{children}</div>
}

function CheckRow({ checked, label, onToggle, onRemove }: { checked: boolean; label: string; onToggle: () => void; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-1 border-b border-line last:border-0"
    >
      <button type="button" onClick={onToggle} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={checked}>
        <motion.span
          className={cn('flex size-6 shrink-0 items-center justify-center rounded-lg border-2', checked ? 'border-accent bg-accent' : 'border-line-strong')}
          animate={{ scale: checked ? [1, 1.2, 1] : 1 }}
          transition={spring.bouncy}
        >
          {checked && <Check className="size-3.5 text-accent-ink" strokeWidth={3.5} />}
        </motion.span>
        <span className={cn('text-body transition-colors', checked ? 'text-ink-3 line-through' : 'text-ink')}>{label}</span>
      </button>
      <button type="button" onClick={onRemove} aria-label={`Quitar ${label}`} className="flex size-11 items-center justify-center text-ink-3">
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [value, setValue] = useState('')
  const submit = () => {
    const v = value.trim()
    if (!v) return
    onAdd(v)
    setValue('')
  }
  return (
    <form
      className="mt-2 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="done"
        className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface-1 px-4 text-ink outline-none placeholder:text-ink-3 focus:border-accent"
      />
      <IconButton label="Agregar" onClick={submit} className={cn('size-12 rounded-2xl', value.trim() && 'bg-accent text-accent-ink')}>
        <Plus className="size-5" />
      </IconButton>
    </form>
  )
}

function TaskHistory({ taskId }: { taskId: string }) {
  const logs = useLiveQuery(() => db.logs.where('taskId').equals(taskId).toArray(), [taskId])
  if (!logs?.length) return null
  const sorted = [...logs].sort((a, b) => b.at - a.at)
  return (
    <Section title="Historial">
      <ol className="relative ml-2 border-l border-line pl-5">
        {sorted.map((l) => {
          const meta = LOG_META[l.type]
          const Icon = meta.icon
          return (
            <li key={l.id} className="relative pb-4 last:pb-0">
              <span className="absolute top-0.5 -left-[31px] flex size-5 items-center justify-center rounded-full bg-surface-2" style={{ color: meta.color }}>
                <Icon className="size-3" />
              </span>
              <p className="text-callout text-ink">
                {meta.label}
                {l.detail ? <span className="text-ink-3"> · {l.detail}</span> : null}
              </p>
              <p className="text-caption text-ink-3">
                {dayLabel(l.at)} · {time(l.at)}
              </p>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
