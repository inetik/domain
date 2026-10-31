import { ContactShadows, RoundedBox, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { RoomId } from '../../db/types'
import { ROOM_HEX, ROOMS } from '../../lib/catalog'
import { HOUSE, type RoomBox, type RoomCounts } from './layout'

export interface HouseSceneProps {
  counts: Record<RoomId, RoomCounts>
  selected: RoomId | null
  onSelect: (room: RoomId | null) => void
  theme: 'light' | 'dark'
  animate: boolean
}

const PALETTE = {
  dark: { floor: '#24242e', wall: '#34343f', base: '#17171f', label: 'rgba(16,16,22,0.78)', labelText: '#f5f5f7' },
  light: { floor: '#ece7db', wall: '#ffffff', base: '#ddd7c9', label: 'rgba(255,255,255,0.85)', labelText: '#15151b' },
}

const WALL_H = 0.85
const WALL_T = 0.1

function Orb({ position, color, index, animate }: { position: [number, number, number]; color: string; index: number; animate: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = position[1] + (animate ? Math.sin(t * 1.6 + index * 1.3) * 0.07 : 0)
  })
  return (
    <mesh ref={ref} position={position} castShadow>
      <sphereGeometry args={[0.14, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} toneMapped={false} roughness={0.3} />
    </mesh>
  )
}

function Room({
  box,
  counts,
  selected,
  dimmed,
  onSelect,
  palette,
  animate,
  anchor,
}: {
  anchor: (id: RoomId, obj: THREE.Object3D | null) => void
  box: RoomBox
  counts: RoomCounts
  selected: boolean
  dimmed: boolean
  onSelect: (id: RoomId) => void
  palette: (typeof PALETTE)['dark']
  animate: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const color = ROOM_HEX[box.id]
  const isPorch = box.id === 'general'
  const floorColor = useMemo(() => {
    const c = new THREE.Color(palette.floor)
    return c.lerp(new THREE.Color(color), selected ? 0.75 : counts.open ? 0.42 : 0.22).getStyle()
  }, [palette.floor, color, selected, counts.open])

  useFrame((_, dt) => {
    if (!group.current) return
    const targetY = selected ? 0.32 : 0
    const k = animate ? 1 - Math.exp(-dt * 10) : 1
    group.current.position.y += (targetY - group.current.position.y) * k
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(box.id)
  }

  // Orbes: uno por pendiente (máximo 8), en grilla sobre el piso
  const orbs = useMemo(() => {
    const n = Math.min(counts.open, 8)
    const cols = Math.min(n, isPorch ? 8 : 4)
    const rows = Math.ceil(n / Math.max(cols, 1))
    return Array.from({ length: n }, (_, i): [number, number, number] => {
      const c = i % cols
      const r = Math.floor(i / cols)
      const spacingX = Math.min(0.55, (box.w - 0.9) / Math.max(cols - 1, 1))
      const spacingZ = 0.5
      return [(c - (cols - 1) / 2) * spacingX + 0.1, 0.55, (r - (rows - 1) / 2) * spacingZ + 0.15]
    })
  }, [counts.open, box.w, isPorch])

  // Bloques apilados: lo que ya resolviste
  const blocks = Math.min(counts.done, 6)

  return (
    <group ref={group} position={[box.x, 0, box.z]} onClick={click}>
      <RoundedBox args={[box.w - 0.14, isPorch ? 0.12 : 0.2, box.d - 0.14]} radius={0.06} smoothness={3} position={[0, isPorch ? -0.04 : 0, 0]} receiveShadow>
        <meshStandardMaterial color={floorColor} roughness={0.85} transparent opacity={dimmed ? 0.55 : 1} />
      </RoundedBox>
      {!isPorch && (
        <>
          <mesh position={[0, WALL_H / 2 + 0.1, -box.d / 2 + WALL_T / 2 + 0.07]} castShadow receiveShadow>
            <boxGeometry args={[box.w - 0.14, WALL_H, WALL_T]} />
            <meshStandardMaterial color={palette.wall} roughness={0.9} transparent opacity={dimmed ? 0.5 : 1} />
          </mesh>
          <mesh position={[-box.w / 2 + WALL_T / 2 + 0.07, WALL_H / 2 + 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[WALL_T, WALL_H, box.d - 0.14]} />
            <meshStandardMaterial color={palette.wall} roughness={0.9} transparent opacity={dimmed ? 0.5 : 1} />
          </mesh>
          {/* Zócalo de color del ambiente */}
          <mesh position={[0, 0.16, -box.d / 2 + WALL_T + 0.08]}>
            <boxGeometry args={[box.w - 0.3, 0.04, 0.02]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
      {orbs.map((p, i) => (
        <Orb key={i} position={p} color={color} index={i} animate={animate} />
      ))}
      {Array.from({ length: blocks }, (_, i) => (
        <mesh key={`b${i}`} position={[box.w / 2 - 0.35, 0.22 + i * 0.17, box.d / 2 - 0.35]} rotation={[0, i * 0.35, 0]} castShadow>
          <boxGeometry args={[0.32, 0.15, 0.32]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      {counts.open === 0 && counts.done > 0 && animate && <Sparkles count={18} scale={[box.w * 0.8, 1, box.d * 0.8]} position={[0, 0.7, 0]} size={3} speed={0.4} color={color} />}
      {/* Punto de anclaje de la etiqueta (la etiqueta es DOM, ver LabelProjector) */}
      <group ref={(obj) => anchor(box.id, obj)} position={[0, isPorch ? 0.35 : WALL_H + 0.45, isPorch ? 0 : -0.2]} />
    </group>
  )
}

/** Proyecta cada ancla 3D a la pantalla y mueve su etiqueta DOM (más nítido que texto en WebGL). */
function LabelProjector({ anchors, labels }: { anchors: MutableRefObject<Map<RoomId, THREE.Object3D>>; labels: MutableRefObject<Map<RoomId, HTMLDivElement>> }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    for (const [id, obj] of anchors.current) {
      const el = labels.current.get(id)
      if (!el) continue
      obj.getWorldPosition(v).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      el.style.visibility = 'visible'
    }
  })
  return null
}

function RoomLabel({ id, count, selected, dimmed, palette, register }: { id: RoomId; count: number; selected: boolean; dimmed: boolean; palette: (typeof PALETTE)['dark']; register: (id: RoomId, el: HTMLDivElement | null) => void }) {
  const color = ROOM_HEX[id]
  return (
    <div
      ref={(el) => register(id, el)}
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        background: selected ? color : palette.label,
        color: selected ? '#0b0b10' : palette.labelText,
        border: `1px solid ${selected ? 'transparent' : 'rgba(127,127,140,0.25)'}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '4px 10px 4px 8px',
        borderRadius: 999,
        font: '600 12px/1.2 "Geist Variable", system-ui, sans-serif',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        transition: 'background 200ms, color 200ms, opacity 200ms',
        opacity: dimmed ? 0.55 : 1,
        willChange: 'transform',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 99, background: selected ? '#0b0b10' : color }} />
      {ROOMS[id].short}
      <span style={{ opacity: 0.65, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  )
}

function CameraRig({ selected, yaw, animate }: { selected: RoomId | null; yaw: MutableRefObject<number>; animate: boolean }) {
  const { camera, size } = useThree()
  const target = useRef(new THREE.Vector3(0, 0, 0.5))
  const look = useRef(new THREE.Vector3(0, 0, 0.5))

  useFrame(({ clock }, dt) => {
    const cam = camera as THREE.OrthographicCamera
    const box = selected ? HOUSE.find((h) => h.id === selected) : null
    target.current.set(box ? box.x : 0.15, 0, box ? box.z : 0.15)
    const baseZoom = Math.min(size.width / 10.6, size.height / 7.6)
    const zoomTarget = box ? Math.min(baseZoom * (box.id === 'general' ? 1.25 : 1.75), size.width / (box.w + 2.2)) : baseZoom
    const k = animate ? 1 - Math.exp(-dt * 4) : 1
    look.current.lerp(target.current, k)
    cam.zoom += (zoomTarget - cam.zoom) * k
    const sway = animate && !selected ? Math.sin(clock.getElapsedTime() * 0.25) * 0.1 : 0
    const angle = Math.PI / 4 + sway + yaw.current
    const dist = 14
    cam.position.set(look.current.x + Math.sin(angle) * dist, 10.5, look.current.z + Math.cos(angle) * dist)
    cam.lookAt(look.current)
    cam.updateProjectionMatrix()
  })
  return null
}

export default function HouseScene({ counts, selected, onSelect, theme, animate }: HouseSceneProps) {
  const palette = PALETTE[theme]
  const wrapper = useRef<HTMLDivElement>(null)
  const yaw = useRef(0)
  const [inView, setInView] = useState(true)
  const drag = useRef<{ x: number; yaw: number } | null>(null)
  // El click de three llega después del pointerup: recordamos si fue un arrastre.
  const dragged = useRef(false)
  const anchors = useRef(new Map<RoomId, THREE.Object3D>())
  const labels = useRef(new Map<RoomId, HTMLDivElement>())
  const registerAnchor = useCallback((id: RoomId, obj: THREE.Object3D | null) => {
    if (obj) anchors.current.set(id, obj)
    else anchors.current.delete(id)
  }, [])
  const registerLabel = useCallback((id: RoomId, el: HTMLDivElement | null) => {
    if (el) labels.current.set(id, el)
    else labels.current.delete(id)
  }, [])

  useEffect(() => {
    const el = wrapper.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    const onVis = () => setInView(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div
      ref={wrapper}
      className="absolute inset-0"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, yaw: yaw.current }
        dragged.current = false
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const dx = e.clientX - drag.current.x
        if (Math.abs(dx) > 6) dragged.current = true
        yaw.current = Math.max(-0.7, Math.min(0.7, drag.current.yaw + dx * 0.006))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
      data-testid="house-3d"
    >
      <Canvas
        orthographic
        shadows
        dpr={[1, 2]}
        frameloop={inView ? 'always' : 'never'}
        camera={{ position: [10, 10.5, 10], zoom: 40, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onPointerMissed={() => !dragged.current && onSelect(null)}
        aria-label="Plano 3D de la casa. Tocá un ambiente para ver sus pendientes."
      >
        <hemisphereLight args={[theme === 'dark' ? '#cfd3ff' : '#ffffff', palette.base, theme === 'dark' ? 0.9 : 1.3]} />
        <directionalLight
          position={[6, 12, 5]}
          intensity={theme === 'dark' ? 1.5 : 1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-bias={-0.0005}
        />
        <group position={[0, 0, 0]}>
          <RoundedBox args={[8.5, 0.35, 6.6]} radius={0.12} smoothness={3} position={[0, -0.28, -0.25]} receiveShadow>
            <meshStandardMaterial color={palette.base} roughness={0.95} />
          </RoundedBox>
          {HOUSE.map((box) => (
            <Room
              key={box.id}
              box={box}
              counts={counts[box.id]}
              selected={selected === box.id}
              dimmed={!!selected && selected !== box.id}
              onSelect={(id) => {
                if (dragged.current) return
                onSelect(selected === id ? null : id)
              }}
              palette={palette}
              animate={animate}
              anchor={registerAnchor}
            />
          ))}
        </group>
        <ContactShadows position={[0, -0.46, 0]} scale={16} blur={2.6} opacity={theme === 'dark' ? 0.6 : 0.35} far={4} frames={1} />
        <CameraRig selected={selected} yaw={yaw} animate={animate} />
        <LabelProjector anchors={anchors} labels={labels} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {HOUSE.map((box) => (
          <RoomLabel
            key={box.id}
            id={box.id}
            count={counts[box.id].open}
            selected={selected === box.id}
            dimmed={!!selected && selected !== box.id}
            palette={palette}
            register={registerLabel}
          />
        ))}
      </div>
    </div>
  )
}
