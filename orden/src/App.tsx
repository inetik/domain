import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { DataProvider, useData } from './app/data'
import { parseHash, tabOf, useHash } from './app/router'
import { UIProvider, useUI } from './app/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TabBar } from './components/TabBar'
import { Button } from './components/ui/Button'
import { Skeleton, Toaster } from './components/ui/Feedback'
import { getMeta, setMeta } from './db/schema'
import { saveBackup } from './db/backup'
import { seedIfNeeded } from './db/seed'
import { startAutoSync } from './db/sync'
import { screen } from './design/motion'
import { AjustesScreen } from './features/ajustes/AjustesScreen'
import { CasaScreen } from './features/casa/CasaScreen'
import { FerreteriaScreen } from './features/lists/FerreteriaScreen'
import { ListaScreen } from './features/lists/ListaScreen'
import { ListasScreen } from './features/lists/ListasScreen'
import { InstallGuide } from './features/onboarding/InstallGuide'
import { Welcome } from './features/onboarding/Welcome'
import { RegistroScreen } from './features/registro/RegistroScreen'
import { SuggestSheet } from './features/suggest/SuggestSheet'
import { PendientesScreen } from './features/tasks/PendientesScreen'
import { QuickAdd } from './features/tasks/QuickAdd'
import { TaskDetail } from './features/tasks/TaskDetail'
import { isIOS, isStandalone, requestPersistentStorage } from './lib/device'
import { isOpen } from './lib/stats'

export default function App() {
  return (
    <ErrorBoundary fallback={(error, reset) => <Crash error={error} reset={reset} />}>
      <MotionConfig reducedMotion="user">
        <UIProvider>
          <DataProvider>
            <Shell />
          </DataProvider>
        </UIProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}

function Shell() {
  const hash = useHash()
  const route = useMemo(() => parseHash(hash), [hash])
  const { tasks, ready } = useData()
  const { showToast } = useUI()
  const [booted, setBooted] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await seedIfNeeded()
      const welcomed = await getMeta<boolean>('welcomed')
      if (cancelled) return
      setWelcome(!welcomed)
      setBooted(true)
      requestPersistentStorage()
      // Recordatorio de copia de seguridad cada 7 días
      const last = await getMeta<number>('lastBackupAt')
      const since = await getMeta<number>('installedAt')
      const ref = last ?? since ?? Date.now()
      if (welcomed && Date.now() - ref > 7 * 24 * 60 * 60 * 1000) {
        showToast({ message: last ? 'Hace más de una semana que no guardás una copia' : 'Guardá tu primera copia de seguridad', tone: 'warn', action: { label: 'Guardar', onClick: () => saveBackup() } })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showToast])

  useEffect(
    () =>
      startAutoSync((r) => {
        if (r instanceof Error) console.warn('[orden] sync', r.message)
      }),
    [],
  )

  const finishWelcome = async () => {
    await setMeta('welcomed', true)
    setWelcome(false)
    if (isIOS() && !isStandalone()) setTimeout(() => setGuide(true), 500)
  }

  const badge = tasks.filter(isOpen).length
  const routeKey = route.name + ('id' in route ? route.id : '')

  return (
    <div className="relative mx-auto min-h-dvh max-w-xl">
      <main className="px-4 pt-safe" style={{ paddingBottom: 'calc(max(var(--sab), 12px) + 110px)' }}>
        {!ready || !booted ? (
          <Loading />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={routeKey} variants={screen} initial="initial" animate="enter" exit="exit" onAnimationStart={(def) => def === 'enter' && window.scrollTo({ top: 0 })}>
              <ErrorBoundary fallback={(error, reset) => <Crash error={error} reset={reset} />}>
                {route.name === 'casa' && <CasaScreen />}
                {route.name === 'pendientes' && <PendientesScreen initialRoom={route.room} />}
                {route.name === 'listas' && <ListasScreen />}
                {route.name === 'lista' && <ListaScreen id={route.id} />}
                {route.name === 'ferreteria' && <FerreteriaScreen />}
                {route.name === 'registro' && <RegistroScreen />}
                {route.name === 'ajustes' && <AjustesScreen />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <TabBar active={tabOf(route)} badge={badge} />
      <TaskDetail />
      <QuickAdd />
      <SuggestSheet />
      <InstallGuide open={guide} onClose={() => setGuide(false)} />
      <Toaster />
      <AnimatePresence>{welcome && booted && <Welcome onDone={finishWelcome} />}</AnimatePresence>
    </div>
  )
}

function Loading() {
  return (
    <div className="space-y-6 pt-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-20 w-3/4" />
      <Skeleton className="h-[380px] rounded-[32px]" />
      <div className="flex gap-3">
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-32 flex-1" />
      </div>
    </div>
  )
}

function Crash({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-[34px] leading-none text-ink">Algo se trabó</p>
      <p className="mt-3 text-callout text-ink-2">Tus datos están a salvo en el teléfono. Probá de nuevo; si sigue, guardá una copia desde Ajustes.</p>
      <p className="mt-3 max-w-full truncate text-caption text-ink-3">{error.message}</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => window.location.reload()}>Recargar</Button>
        <Button variant="primary" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
