import { CalendarDays, Sparkles, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useData } from '../../app/data'
import { useUI, type QuickAddPrefill } from '../../app/ui'
import { AutoTextarea } from '../../components/ui/AutoTextarea'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Segmented } from '../../components/ui/Feedback'
import { Sheet } from '../../components/ui/Sheet'
import { addTask } from '../../db/repo'
import { CATEGORY_IDS, type CategoryId, type Priority, type RoomId } from '../../db/types'
import { spring } from '../../design/motion'
import { CATEGORIES, formatMinutes, ROOM_ORDER, ROOMS } from '../../lib/catalog'
import { dueLabel } from '../../lib/dates'
import { haptic } from '../../lib/haptics'
import { uid } from '../../lib/id'
import { parseQuickAdd } from '../../lib/parse'
import { knownPeople } from '../../lib/stats'

const EXAMPLES = ['Colgar espejo en el baño 30min', 'Comprar lamparitas !', 'Pintar pared del living con Nacho finde', 'Cambiar cuerito canilla cocina 20min']
const MINUTES = [15, 30, 45, 60, 90, 120, 180]

interface Override {
  room?: RoomId
  category?: CategoryId
  minutes?: number
  priority?: Priority
}

export function QuickAdd() {
  const { quickAdd } = useUI()
  // Conservar el último formulario durante la animación de salida;
  // cada apertura trae un nonce nuevo, así el formulario arranca limpio.
  const last = useRef(quickAdd)
  if (quickAdd) last.current = quickAdd
  const prefill = quickAdd ?? last.current
  if (!prefill) return null
  return <QuickAddSheet key={prefill.nonce ?? 0} open={!!quickAdd} prefill={prefill} />
}

function QuickAddSheet({ open, prefill: quickAdd }: { open: boolean; prefill: QuickAddPrefill }) {
  const { closeQuickAdd, showToast, openTask } = useUI()
  const { tasks, lists } = useData()
  const [text, setText] = useState(quickAdd?.text ?? '')
  const [override, setOverride] = useState<Override>(quickAdd?.room ? { room: quickAdd.room } : {})
  const [removedPeople, setRemovedPeople] = useState<string[]>([])
  const [removedDue, setRemovedDue] = useState<string | null>(null)
  const sending = useRef(false)
  const [added, setAdded] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const people0 = useMemo(() => knownPeople(tasks), [tasks])
  const parsed = useMemo(() => parseQuickAdd(text, people0), [text, people0])
  const list = lists.find((l) => l.id === quickAdd?.listId)

  useEffect(() => {
    // Pasarle el foco desde el input "puente" (ver primeKeyboard) al real.
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(t)
  }, [added])

  const room = override.room ?? parsed.room
  const category = override.category ?? parsed.category
  const minutes = override.minutes ?? parsed.minutes
  const priority = override.priority ?? parsed.priority
  const finalPeople = parsed.people.filter((p) => !removedPeople.includes(p))
  const finalDue = parsed.due && parsed.due !== removedDue ? parsed.due : undefined
  const canAdd = parsed.title.length > 1

  const submit = async (again: boolean) => {
    if (!canAdd || sending.current) return
    sending.current = true
    haptic('success')
    const task = await addTask({
      title: parsed.title,
      room,
      category,
      minutes,
      priority,
      energy: CATEGORIES[category].energy,
      people: finalPeople,
      due: finalDue,
      materials: parsed.materials.map((name) => ({
        id: uid(),
        name,
        bought: false,
      })),
      listIds: list ? [list.id] : [],
    })
    showToast({
      message: `Agregada a ${ROOMS[room].label}`,
      tone: 'success',
      action: { label: 'Ver', onClick: () => openTask(task.id) },
    })
    if (again) {
      setText('')
      setOverride(quickAdd?.room ? { room: quickAdd.room } : {})
      setRemovedPeople([])
      setRemovedDue(null)
      setAdded((n) => n + 1)
      sending.current = false
    } else {
      closeQuickAdd()
    }
  }

  const footer = (
    <div className="flex gap-2">
      <Button variant="secondary" size="lg" onClick={() => submit(true)} disabled={!canAdd} className="flex-1">
        + Otra
      </Button>
      <Button variant="primary" size="lg" onClick={() => submit(false)} disabled={!canAdd} className="flex-[2]" data-testid="quickadd-submit">
        Agregar
      </Button>
    </div>
  )

  return (
    <Sheet open={open} onClose={closeQuickAdd} label="Nuevo pendiente" tall footer={footer}>
      <div className="flex flex-col pt-1 pb-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-[30px] leading-none text-ink">
            Nuevo <span className="italic text-accent-text">pendiente</span>
          </h2>
          {added > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={spring.bouncy}
              className="rounded-full bg-accent px-2.5 py-1 text-caption font-bold text-accent-ink"
            >
              +{added}
            </motion.span>
          )}
        </div>
        {list && (
          <p className="mb-2 text-footnote text-ink-2">
            Se suma a la lista {list.emoji} {list.name}
          </p>
        )}

        <div className="relative mt-3 rounded-[22px] border border-line-strong bg-surface-1 p-4 focus-within:border-accent-stroke">
          <AutoTextarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(false)
              }
            }}
            rows={2}
            enterKeyHint="done"
            placeholder="¿Qué hay que hacer? Ej: colgar espejo baño 30min !"
            aria-label="Descripción del pendiente"
            data-testid="quickadd-input"
            className="w-full resize-none bg-transparent text-[19px] leading-snug text-ink outline-none placeholder:text-ink-3"
          />
          <div className="mt-2 flex items-center gap-1.5 text-caption text-ink-3">
            <Sparkles className="size-3.5 text-accent-text" />
            Entiendo ambiente, tiempo, “con Nacho”, “mañana”, “!” importante y “!!” urgente.
          </div>
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {!text && (
            <motion.div key="examples" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              {EXAMPLES.map((ex) => (
                <Chip key={ex} size="sm" onClick={() => setText(ex)} className="!h-9">
                  {ex}
                </Chip>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {canAdd && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle} className="mt-4 rounded-2xl bg-surface-2/60 p-3">
            <p className="text-caption font-semibold tracking-wide text-ink-3 uppercase">Vista previa</p>
            <p className="mt-1 text-headline font-semibold break-words text-ink" data-testid="quickadd-title">
              {parsed.title}
            </p>
            <p className="mt-1 text-footnote text-ink-2">
              <span style={{ color: ROOMS[room].ink }}>{ROOMS[room].label}</span> · {CATEGORIES[category].label} · {formatMinutes(minutes)}
              {priority > 0 && <span className={priority === 2 ? 'text-danger-ink' : 'text-warn-ink'}> · {priority === 2 ? 'Urgente' : 'Importante'}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {finalPeople.map((p) => (
                <Chip key={p} size="sm" icon={<Users className="size-3.5" />} onClick={() => setRemovedPeople((r) => [...r, p])} ariaLabel={`Quitar a ${p}`}>
                  {p} <X className="size-3" />
                </Chip>
              ))}
              {finalDue && (
                <Chip size="sm" icon={<CalendarDays className="size-3.5" />} onClick={() => setRemovedDue(finalDue ?? null)} ariaLabel="Quitar fecha">
                  {dueLabel(finalDue)} <X className="size-3" />
                </Chip>
              )}
              {parsed.materials.length > 0 && <Chip size="sm">🛒 {parsed.materials.length} materiales sugeridos</Chip>}
            </div>
          </motion.div>
        )}

        <Field label="Ambiente" selected={room}>
          {ROOM_ORDER.map((r) => {
            const Icon = ROOMS[r].icon
            return (
              <Chip key={r} selected={room === r} color={ROOMS[r].color} icon={<Icon className="size-4" />} onClick={() => setOverride((o) => ({ ...o, room: r }))}>
                {ROOMS[r].short}
              </Chip>
            )
          })}
        </Field>

        <Field label="Tipo" selected={category}>
          {CATEGORY_IDS.map((c) => {
            const Icon = CATEGORIES[c].icon
            return (
              <Chip
                key={c}
                selected={category === c}
                icon={<Icon className="size-4" />}
                onClick={() =>
                  setOverride((o) => ({
                    ...o,
                    category: c,
                    minutes: o.minutes ?? (parsed.minutesDetected ? undefined : CATEGORIES[c].defaultMinutes),
                  }))
                }
              >
                {CATEGORIES[c].label}
              </Chip>
            )
          })}
        </Field>

        <Field label="Tiempo estimado" selected={minutes}>
          {MINUTES.map((m) => (
            <Chip key={m} selected={minutes === m} onClick={() => setOverride((o) => ({ ...o, minutes: m }))}>
              {formatMinutes(m)}
            </Chip>
          ))}
          {!MINUTES.includes(minutes) && <Chip selected>{formatMinutes(minutes)}</Chip>}
        </Field>

        <div className="mt-5">
          <p className="mb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase">Prioridad</p>
          <Segmented
            id="qa-priority"
            value={String(priority) as '0' | '1' | '2'}
            onChange={(v) => setOverride((o) => ({ ...o, priority: Number(v) as Priority }))}
            options={[
              { value: '0', label: 'Normal' },
              { value: '1', label: 'Importante' },
              { value: '2', label: 'Urgente' },
            ]}
          />
        </div>
      </div>
    </Sheet>
  )
}

function Field({ label, selected, children }: { label: string; selected: string | number; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null)
  // Que la opción elegida (o detectada al escribir) quede a la vista
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (el && row.current) row.current.scrollTo({ left: el.offsetLeft - 20, behavior: 'smooth' })
  }, [selected])
  return (
    <div className="mt-5">
      <p className="mb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase">{label}</p>
      <div ref={row} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {children}
      </div>
    </div>
  )
}
