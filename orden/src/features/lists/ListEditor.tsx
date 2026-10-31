import { Check } from 'lucide-react'
import { useState } from 'react'
import { navigate } from '../../app/router'
import { useUI } from '../../app/ui'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { addList, updateList } from '../../db/repo'
import type { TaskList } from '../../db/types'
import { LIST_COLORS, LIST_EMOJIS } from '../../lib/catalog'
import { cn } from '../../lib/cn'

export function ListEditor({ open, onClose, list }: { open: boolean; onClose: () => void; list?: TaskList }) {
  return (
    <Sheet open={open} onClose={onClose} label={list ? 'Editar lista' : 'Nueva lista'}>
      <ListForm key={list?.id ?? 'new'} list={list} onDone={onClose} />
    </Sheet>
  )
}

function ListForm({ list, onDone }: { list?: TaskList; onDone: () => void }) {
  const { showToast } = useUI()
  const [name, setName] = useState(list?.name ?? '')
  const [emoji, setEmoji] = useState(list?.emoji ?? LIST_EMOJIS[0])
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[0])

  const save = async () => {
    if (!name.trim()) return
    if (list) {
      await updateList(list.id, { name: name.trim(), emoji, color })
      showToast({ message: 'Lista actualizada', tone: 'success' })
    } else {
      const created = await addList({ name: name.trim(), emoji, color })
      showToast({ message: `Lista “${created.name}” creada`, tone: 'success' })
      navigate(`/listas/${created.id}`)
    }
    onDone()
  }

  return (
    <div className="pb-2">
      <h2 className="mt-1 font-serif text-[30px] leading-none text-ink">{list ? 'Editar lista' : 'Nueva lista'}</h2>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-[28px]" style={{ background: `color-mix(in oklab, ${color} 25%, transparent)` }}>
          {emoji}
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Ej: Finde con Nacho"
          aria-label="Nombre de la lista"
          className="h-14 min-w-0 flex-1 rounded-2xl border border-line bg-surface-1 px-4 text-[18px] text-ink outline-none placeholder:text-ink-3 focus:border-accent-stroke"
        />
      </div>
      <p className="mt-5 mb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase">Ícono</p>
      <div className="grid grid-cols-8 gap-1.5">
        {LIST_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            aria-pressed={emoji === e}
            className={cn('flex aspect-square items-center justify-center rounded-xl text-[22px] transition-colors', emoji === e ? 'bg-surface-3' : 'bg-transparent')}
          >
            {e}
          </button>
        ))}
      </div>
      <p className="mt-5 mb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase">Color</p>
      <div className="grid grid-cols-4 justify-items-center gap-3">
        {LIST_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c} className="flex size-12 items-center justify-center rounded-full" style={{ background: c }}>
            {color === c && <Check className="size-5 text-[#0b0b10]" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <Button variant="primary" size="lg" block className="mt-7" onClick={save} disabled={!name.trim()}>
        {list ? 'Guardar' : 'Crear lista'}
      </Button>
    </div>
  )
}
