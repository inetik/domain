import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Download, ShieldCheck, Smartphone, Trash2, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUI, type ThemePref } from '../../app/ui'
import { BackHeader } from '../../components/BackHeader'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Feedback'
import { Sheet } from '../../components/ui/Sheet'
import { importBackup, readBackupFile, saveBackup, type BackupFile } from '../../db/backup'
import { wipeAll } from '../../db/repo'
import { db } from '../../db/schema'
import { seedIfNeeded } from '../../db/seed'
import { rise, stagger } from '../../design/motion'
import { daysAgo, dayLabel } from '../../lib/dates'
import { isStandalone, requestPersistentStorage } from '../../lib/device'
import { InstallGuide } from '../onboarding/InstallGuide'
import { CloudPanel } from './CloudPanel'

export function AjustesScreen() {
  const { theme, setTheme, scene3d, setScene3d, showToast } = useUI()
  const lastBackup = useLiveQuery(() => db.meta.get('lastBackupAt').then((r) => r?.value as number | undefined), [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [guide, setGuide] = useState(false)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const installed = isStandalone()

  useEffect(() => {
    requestPersistentStorage().then(setPersisted)
  }, [])

  return (
    <motion.div variants={stagger} initial="initial" animate="enter" className="space-y-8">
      <div>
        <BackHeader to="/" label="Casa" />
        <motion.h1 variants={rise} className="mt-3 font-serif text-[40px] leading-none tracking-tight text-ink">
          Ajustes
        </motion.h1>
      </div>

      <Group title="En tu iPhone">
        <Row
          icon={<Smartphone className="size-5" />}
          title={installed ? 'Instalada como app' : 'Instalala en la pantalla de inicio'}
          body={installed ? 'Funciona sin internet y a pantalla completa.' : 'Tres toques desde Safari, sin App Store.'}
          action={installed ? <Check className="size-5 text-success-ink" /> : <Button size="sm" className="h-10" onClick={() => setGuide(true)}>Cómo</Button>}
        />
        <Row
          icon={<ShieldCheck className="size-5" />}
          title={persisted ? 'Datos protegidos' : 'Datos guardados en el teléfono'}
          body={persisted ? 'El sistema no va a borrar tu base de datos para liberar espacio.' : 'Guardá copias seguido para no perder nada.'}
        />
      </Group>

      <Group title="Copias de seguridad">
        <p className="text-callout text-ink-2">
          {lastBackup ? `Última copia: ${dayLabel(lastBackup).toLowerCase()}${daysAgo(lastBackup) > 7 ? ' — ya toca otra' : ''}.` : 'Todavía no guardaste ninguna copia.'} En el iPhone elegí “Guardar en Archivos” (iCloud Drive).
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            icon={<Download className="size-4" />}
            onClick={async () => {
              try {
                const r = await saveBackup()
                if (r !== 'cancelled') showToast({ message: 'Copia guardada', tone: 'success' })
              } catch {
                showToast({ message: 'No se pudo generar la copia', tone: 'warn' })
              }
            }}
            data-testid="backup-save"
          >
            Guardar copia
          </Button>
          <Button className="flex-1" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
            Restaurar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="backup-input"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                setPending(await readBackupFile(file))
              } catch (err) {
                showToast({ message: (err as Error).message, tone: 'warn' })
              }
            }}
          />
        </div>
      </Group>

      <Group title="Nube">
        <CloudPanel />
      </Group>

      <Group title="Apariencia">
        <Segmented<ThemePref>
          id="theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'Automático' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
        />
        <label className="mt-4 flex min-h-12 items-center justify-between gap-3">
          <span>
            <span className="block text-body text-ink">Casa en 3D</span>
            <span className="block text-footnote text-ink-3">Apagala si querés ahorrar batería.</span>
          </span>
          <Toggle checked={scene3d} onChange={setScene3d} label="Casa en 3D" />
        </label>
      </Group>

      <Group title="Datos">
        {confirmWipe ? (
          <div className="space-y-2">
            <p className="text-callout text-ink">¿Seguro? Se borra todo lo de este teléfono. Si no tenés copia, no se puede recuperar.</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setConfirmWipe(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  await wipeAll()
                  await seedIfNeeded()
                  setConfirmWipe(false)
                  showToast({ message: 'Empezaste de cero', tone: 'warn' })
                }}
              >
                Borrar todo
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" block icon={<Trash2 className="size-4" />} onClick={() => setConfirmWipe(true)}>
            Borrar todo y empezar de cero
          </Button>
        )}
      </Group>

      <p className="pb-4 text-center text-caption text-ink-3">
        Orden · v1.0
        <br />
        Tus datos viven en este teléfono.
      </p>

      <InstallGuide open={guide} onClose={() => setGuide(false)} />
      <Sheet open={!!pending} onClose={() => setPending(null)} label="Restaurar copia">
        {pending && (
          <div className="pb-2">
            <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">Restaurar copia</h2>
            <p className="mt-3 text-callout text-ink-2">
              La copia tiene {pending.tasks.length} tareas, {pending.lists.length} listas y {pending.photos.length} fotos ({dayLabel(pending.exportedAt).toLowerCase()}).
            </p>
            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                block
                size="lg"
                onClick={async () => {
                  const r = await importBackup(pending, 'merge')
                  setPending(null)
                  showToast({ message: `Combinado: ${r.tasks} tareas actualizadas`, tone: 'success' })
                }}
              >
                Combinar con lo que tengo
              </Button>
              <Button
                variant="danger"
                block
                size="lg"
                onClick={async () => {
                  await importBackup(pending, 'replace')
                  setPending(null)
                  showToast({ message: 'Copia restaurada', tone: 'success' })
                }}
              >
                Reemplazar todo
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </motion.div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section variants={rise}>
      <h2 className="mb-3 text-caption font-semibold tracking-[0.08em] text-ink-3 uppercase">{title}</h2>
      <div className="rounded-[24px] border border-line bg-surface-1 p-4">{children}</div>
    </motion.section>
  )
}

function Row({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">{title}</span>
        <span className="block text-footnote text-ink-3">{body}</span>
      </span>
      {action}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-8 w-[52px] shrink-0 rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--surface-3)' }}
    >
      <motion.span className="absolute top-1 left-1 size-6 rounded-full bg-white shadow-1" animate={{ x: checked ? 20 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
    </button>
  )
}
