import { Cloud, CloudOff, Copy, ExternalLink, LogOut, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useUI } from '../../app/ui'
import { Button } from '../../components/ui/Button'
import { CLOUD_SQL, disconnectCloud, getCloudStatus, saveCloudConfig, signIn, signOut, signUp, syncNow, type CloudStatus } from '../../db/sync'
import { dayLabel, time } from '../../lib/dates'

const input = 'h-12 w-full rounded-2xl border border-line bg-surface-1 px-4 text-ink outline-none placeholder:text-ink-3 focus:border-accent-stroke'

export function CloudPanel() {
  const { showToast } = useUI()
  const [status, setStatus] = useState<CloudStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    getCloudStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false }))
  }, [])
  useEffect(refresh, [refresh])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
      refresh()
    }
  }

  if (!status) return <div className="h-24" />

  if (!status.configured) {
    return (
      <div className="space-y-4">
        <p className="text-callout text-ink-2">
          Opcional. Guarda una copia en la nube y sincroniza entre dispositivos (por ejemplo, tu iPhone y el de tu pareja usando la misma cuenta). Es gratis con Supabase.
        </p>
        <Step n={1} title="Creá un proyecto gratis">
          <Button size="sm" className="h-11" icon={<ExternalLink className="size-4" />} onClick={() => window.open('https://supabase.com/dashboard/new', '_blank', 'noopener')}>
            Abrir Supabase
          </Button>
        </Step>
        <Step n={2} title="Pegá este SQL en SQL Editor y tocá Run">
          <Button
            size="sm"
            className="h-11"
            icon={<Copy className="size-4" />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(CLOUD_SQL)
                showToast({ message: 'SQL copiado', tone: 'success' })
              } catch {
                showToast({ message: 'No pude copiar. Mantené apretado el texto.', tone: 'warn' })
              }
            }}
          >
            Copiar SQL
          </Button>
        </Step>
        <Step n={3} title="En Settings → API copiá la URL y la clave “anon public”">
          <div className="space-y-2">
            <input
              className={input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              aria-label="URL del proyecto"
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="url"
            />
            <input
              className={input}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Clave anon public"
              aria-label="Clave anon"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <Button variant="primary" block disabled={busy || !url || !key} onClick={() => run(() => saveCloudConfig(url, key))} icon={<Cloud className="size-4" />}>
              Conectar
            </Button>
          </div>
        </Step>
        {error && <p className="text-footnote text-danger-ink">{error}</p>}
      </div>
    )
  }

  if (!status.email) {
    return (
      <div className="space-y-3">
        <p className="text-callout text-ink-2">Nube conectada. Creá una cuenta (o entrá) para empezar a sincronizar.</p>
        <input
          className={input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          aria-label="Email"
          autoComplete="email"
          autoCapitalize="off"
        />
        <input
          className={input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña (mín. 6)"
          aria-label="Contraseña"
          autoComplete="current-password"
        />
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={busy || !email || password.length < 6}
            onClick={() =>
              run(async () => {
                const r = await signUp(email, password)
                showToast({ message: r.needsConfirmation ? 'Te mandé un mail: confirmalo y después tocá Entrar.' : 'Cuenta creada', tone: 'success' })
              })
            }
          >
            Crear cuenta
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={busy || !email || password.length < 6}
            onClick={() =>
              run(async () => {
                await signIn(email, password)
                const r = await syncNow()
                showToast({ message: `Sincronizado: ↓${r.pulled} ↑${r.pushed}`, tone: 'success' })
              })
            }
          >
            Entrar
          </Button>
        </div>
        {error && <p className="text-footnote text-danger-ink">{error}</p>}
        <button type="button" className="h-11 text-footnote font-medium text-ink-3" onClick={() => run(disconnectCloud)}>
          Desconectar nube
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-[20px] border border-success/30 bg-success/10 p-4">
        <Cloud className="size-5 text-success-ink" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-callout font-semibold text-ink">{status.email}</p>
          <p className="text-footnote text-ink-2">
            {status.lastSyncAt ? `Última sincronización: ${dayLabel(status.lastSyncAt).toLowerCase()} ${time(status.lastSyncAt)}` : 'Todavía sin sincronizar'}
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        block
        disabled={busy}
        icon={<RefreshCw className={busy ? 'size-4 animate-spin' : 'size-4'} />}
        onClick={() =>
          run(async () => {
            const r = await syncNow()
            showToast({ message: `Sincronizado: ↓${r.pulled} ↑${r.pushed}`, tone: 'success' })
          })
        }
      >
        Sincronizar ahora
      </Button>
      {error && <p className="text-footnote text-danger-ink">{error}</p>}
      <div className="flex gap-2">
        <Button className="flex-1" icon={<LogOut className="size-4" />} onClick={() => run(signOut)}>
          Cerrar sesión
        </Button>
        <Button className="flex-1" variant="ghost" icon={<CloudOff className="size-4" />} onClick={() => run(disconnectCloud)}>
          Desconectar
        </Button>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-caption font-bold text-ink">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-callout font-medium text-ink">{title}</p>
        {children}
      </div>
    </div>
  )
}
