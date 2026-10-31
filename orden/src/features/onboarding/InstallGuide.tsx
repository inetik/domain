import { Check, Share, SquarePlus } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { spring } from '../../design/motion'

const STEPS = [
  { icon: Share, title: 'Tocá Compartir', body: 'El cuadradito con la flecha, abajo en Safari.' },
  { icon: SquarePlus, title: '“Agregar a inicio”', body: 'Bajá en el menú hasta encontrarlo.' },
  { icon: Check, title: 'Tocá “Agregar”', body: 'Listo: Orden queda como una app más, a pantalla completa y sin internet.' },
]

export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Instalar en el iPhone"
      footer={
        <Button variant="primary" size="lg" block onClick={onClose}>
          Entendido
        </Button>
      }
    >
      <h2 className="mt-1 font-serif text-[30px] leading-none text-ink">
        Instalala en tu <span className="italic text-accent-text">iPhone</span>
      </h2>
      <p className="mt-2 text-callout text-ink-2">No hace falta App Store. Son tres toques desde Safari:</p>
      <ol className="mt-6 space-y-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.gentle, delay: 0.1 + i * 0.12 }}
              className="flex items-center gap-4 rounded-[22px] border border-line bg-surface-1 p-4"
            >
              <motion.span
                className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, repeatDelay: 1 }}
              >
                <Icon className="size-6" />
                <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-bg">{i + 1}</span>
              </motion.span>
              <span>
                <span className="block text-headline font-semibold text-ink">{s.title}</span>
                <span className="block text-footnote text-ink-2">{s.body}</span>
              </span>
            </motion.li>
          )
        })}
      </ol>
      <div className="mt-5 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-footnote text-ink">
        <strong>Importante:</strong> lo que cargues en Safari no pasa a la app instalada (iOS las guarda por separado), y Safari puede borrarlo si no lo usás por una semana.
        Instalala antes de empezar, o guardá una copia en Ajustes y restaurala desde la app.
      </div>
      <p className="mt-3 text-footnote text-ink-3">Instalada, iOS conserva tus datos aunque no la abras por un tiempo.</p>
    </Sheet>
  )
}
