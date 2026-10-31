import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUI } from '../../app/ui'
import { IconButton } from '../../components/ui/Button'
import { addPhoto, deletePhoto, restorePhoto } from '../../db/repo'
import { db } from '../../db/schema'
import type { Photo, PhotoKind } from '../../db/types'
import { spring } from '../../design/motion'
import { compressImage } from '../../lib/image'

export function usePhotoUrl(photo: Photo | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photo) return
    const u = URL.createObjectURL(photo.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo])
  return url
}

function Thumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = usePhotoUrl(photo)
  return (
    <motion.button
      type="button"
      layoutId={`photo-${photo.id}`}
      onClick={onOpen}
      className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2"
      aria-label="Ver foto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {url && <img src={url} alt="" className="size-full object-cover" />}
    </motion.button>
  )
}

export function TaskPhotos({ taskId }: { taskId: string }) {
  const photos = useLiveQuery(() => db.photos.where('taskId').equals(taskId).sortBy('createdAt'), [taskId])
  const [viewing, setViewing] = useState<Photo | null>(null)

  return (
    <div className="grid grid-cols-2 gap-3">
      {(['antes', 'despues'] as PhotoKind[]).map((kind) => (
        <div key={kind}>
          <p className="mb-2 text-footnote font-medium text-ink-2">{kind === 'antes' ? 'Antes' : 'Después'}</p>
          <div className="grid grid-cols-2 gap-2">
            {photos
              ?.filter((p) => p.kind === kind)
              .map((p) => (
                <Thumb key={p.id} photo={p} onOpen={() => setViewing(p)} />
              ))}
            <AddPhoto taskId={taskId} kind={kind} />
          </div>
        </div>
      ))}
      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function AddPhoto({ taskId, kind }: { taskId: string; kind: PhotoKind }) {
  const ref = useRef<HTMLInputElement>(null)
  const { showToast } = useUI()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong text-ink-3 transition-colors active:bg-surface-2"
        aria-label={`Agregar foto del ${kind === 'antes' ? 'antes' : 'después'}`}
      >
        {busy ? <span className="size-5 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" /> : <Camera className="size-5" />}
        <span className="text-[11px]">Foto</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            await addPhoto(taskId, kind, await compressImage(file))
          } catch {
            showToast({ message: 'No pude guardar la foto. Probá con otra.', tone: 'warn' })
          } finally {
            setBusy(false)
          }
        }}
      />
    </>
  )
}

function PhotoViewer({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  const url = usePhotoUrl(photo ?? undefined)
  const { showToast } = useUI()
  return createPortal(
    <AnimatePresence>
      {photo && (
        <motion.div className="fixed inset-0 z-[70] flex flex-col bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="flex items-center justify-between px-4 pt-safe">
            <IconButton label="Cerrar" tone="glass" onClick={onClose}>
              <X className="size-5" />
            </IconButton>
            <IconButton
              label="Borrar foto"
              tone="glass"
              onClick={async () => {
                const removed = photo
                await deletePhoto(removed.id)
                onClose()
                showToast({ message: 'Foto borrada', tone: 'warn', action: { label: 'Deshacer', onClick: () => restorePhoto(removed) } })
              }}
            >
              <Trash2 className="size-5 text-danger" />
            </IconButton>
          </div>
          <motion.div
            className="flex min-h-0 flex-1 items-center justify-center p-4"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, i) => Math.abs(i.offset.y) > 100 && onClose()}
          >
            {url && <motion.img layoutId={`photo-${photo.id}`} transition={spring.gentle} src={url} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
