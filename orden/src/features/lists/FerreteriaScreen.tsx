import { Check, PackageCheck, Share } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useData } from '../../app/data'
import { useUI } from '../../app/ui'
import { BackHeader } from '../../components/BackHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState, SectionTitle } from '../../components/ui/Feedback'
import { setMaterialBought } from '../../db/repo'
import { rise, spring, stagger } from '../../design/motion'
import { ROOMS } from '../../lib/catalog'
import { cn } from '../../lib/cn'
import { haptic } from '../../lib/haptics'
import { shoppingList, shoppingText, type ShoppingItem } from '../../lib/shopping'

export function FerreteriaScreen() {
  const { tasks } = useData()
  const { showToast, openTask } = useUI()
  const items = useMemo(() => shoppingList(tasks), [tasks])
  const toBuy = items.filter((i) => !i.bought)
  const bought = items.filter((i) => i.bought)
  const [showBought, setShowBought] = useState(false)

  const toggle = async (item: ShoppingItem) => {
    haptic(item.bought ? 'light' : 'success')
    const refs = item.refs.map((r) => ({ taskId: r.taskId, materialId: r.materialId }))
    await setMaterialBought(refs, !item.bought)
    if (!item.bought) showToast({ message: `${item.name}: comprado`, tone: 'success', action: { label: 'Deshacer', onClick: () => setMaterialBought(refs, false) } })
  }

  const share = async () => {
    const text = shoppingText(items)
    try {
      if (navigator.share) {
        await navigator.share({ text, title: 'Ferretería' })
        return
      }
      await navigator.clipboard.writeText(text)
      showToast({ message: 'Lista copiada', tone: 'success' })
    } catch {
      /* cancelado */
    }
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="enter">
      <BackHeader
        to="/listas"
        label="Listas"
        right={
          toBuy.length > 0 && (
            <Button size="sm" className="h-11" icon={<Share className="size-4" />} onClick={share}>
              Compartir
            </Button>
          )
        }
      />
      <motion.header variants={rise} className="mt-3">
        <h1 className="font-serif text-[40px] leading-none tracking-tight text-ink">
          Ferre<span className="italic text-accent-text">tería</span>
        </h1>
        <p className="mt-2 text-callout text-ink-2">Todo lo que piden tus pendientes, en una sola vuelta. Tocá para tachar.</p>
      </motion.header>

      <div className="mt-6" data-testid="shopping-list">
        {toBuy.length === 0 ? (
          <EmptyState icon={PackageCheck} color="var(--success-ink)" title="No falta comprar nada" body="Cuando una tarea pida materiales, aparecen acá." />
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-line bg-surface-1">
            <AnimatePresence initial={false}>
              {toBuy.map((item) => (
                <Row key={item.key} item={item} onToggle={() => toggle(item)} onOpenTask={openTask} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {bought.length > 0 && (
        <section className="mt-8">
          <SectionTitle
            action={
              <button type="button" className="-my-2 h-11 text-footnote font-semibold text-accent-text" onClick={() => setShowBought((v) => !v)}>
                {showBought ? 'Ocultar' : 'Mostrar'}
              </button>
            }
          >
            Ya comprado ({bought.length})
          </SectionTitle>
          {showBought && (
            <div className="overflow-hidden rounded-[24px] border border-line bg-surface-1 opacity-70">
              {bought.map((item) => (
                <Row key={item.key} item={item} onToggle={() => toggle(item)} onOpenTask={openTask} />
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  )
}

function Row({ item, onToggle, onOpenTask }: { item: ShoppingItem; onToggle: () => void; onOpenTask: (id: string) => void }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={spring.gentle} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
      <button type="button" onClick={onToggle} aria-pressed={item.bought} aria-label={`${item.bought ? 'Desmarcar' : 'Marcar comprado'}: ${item.name}`} className="-m-2 flex size-11 shrink-0 items-center justify-center">
        <motion.span
          className={cn('flex size-6 items-center justify-center rounded-lg border-2', item.bought ? 'border-success bg-success' : 'border-line-strong')}
          whileTap={{ scale: 0.8 }}
        >
          {item.bought && <Check className="size-3.5 text-[#06281b]" strokeWidth={3.5} />}
        </motion.span>
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-body font-medium', item.bought ? 'text-ink-3 line-through' : 'text-ink')}>
          {item.name}
          {item.refs.length > 1 && <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-caption font-semibold text-ink-2">×{item.refs.length}</span>}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {item.refs.map((r) => (
            <button key={r.materialId} type="button" onClick={() => onOpenTask(r.taskId)} className="inline-flex min-h-7 items-start gap-1.5 py-1 text-left text-caption text-ink-3">
              <span className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ background: ROOMS[r.room].color }} />
              {r.taskTitle}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
