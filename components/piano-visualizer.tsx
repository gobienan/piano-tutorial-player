"use client"

import type React from "react"
import { useMemo, useRef, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import { Color, Vector3, Matrix4, AdditiveBlending } from "three"
import { RoundedBox, OrbitControls } from "@react-three/drei"
import type { Midi } from "@tonejs/midi"

// --- Types ---

type ViewMode = "top-down" | "synthesia"

interface PianoVisualizerProps {
  midiData: Midi | null
  currentTime: number
  isPlaying: boolean
  handFilter: "both" | "left" | "right"
  viewMode?: ViewMode
}

interface NoteData {
  id: string
  midi: number
  time: number
  duration: number
  velocity: number
  isBlack: boolean
  x: number
  width: number
  color: string
  hit: boolean
}

interface Particle {
  position: Vector3
  velocity: Vector3
  color: Color
  life: number
  maxLife: number
  size: number
}

interface Sparkle {
  position: Vector3
  velocity: Vector3
  color: Color
  life: number
  maxLife: number
  size: number
  rotation: number
  rotationSpeed: number
}

// --- Constants ---

const KEYBOARD_WIDTH = 60
const WHITE_KEY_WIDTH = KEYBOARD_WIDTH / 52
const BLACK_KEY_WIDTH = WHITE_KEY_WIDTH * 0.65
const NOTE_SPEED = 25 // Units per second
const FALL_HEIGHT = 40
const SPAWN_Y = FALL_HEIGHT
const HIT_Y = 0 // Where keys are
const VISIBLE_WINDOW = FALL_HEIGHT / NOTE_SPEED // Seconds visible
const KEY_Z = 0 // Z position where keys are (for Synthesia view)
const SPAWN_Z = -FALL_HEIGHT // Z position where notes spawn (for Synthesia view)
const NOTE_GAP = 0.1 * NOTE_SPEED // Visual gap between notes (0.1s)

const COLORS = {
  cyan: "#4dd0e1",
  cyanGlow: "#4dd0e1", // Emissive
  magenta: "#ce93d8",
  magentaGlow: "#ce93d8",
  pink: "#ff00aa",
  gold: "#ffb74d",
  whiteKey: "#f5f5f5",
  blackKey: "#1a1a1a",
  bg: "#000000",
}

// --- Helper Functions ---

function getNoteX(midi: number) {
  // Similar logic to previous 2D implementation but centered
  // Center Middle C (60) -> roughly center of keyboard
  // A0 is 21.
  let whiteKeyCount = 0
  for (let i = 21; i < midi; i++) {
    const n = i % 12
    if (![1, 3, 6, 8, 10].includes(n)) {
      whiteKeyCount++
    }
  }

  const n = midi % 12
  const isBlack = [1, 3, 6, 8, 10].includes(n)

  // Center the keyboard: 52 white keys. Middle is around 26.
  const offset = -KEYBOARD_WIDTH / 2

  if (isBlack) {
    // Black keys are offset from the previous white key
    return {
      x: offset + (whiteKeyCount + 0.5) * WHITE_KEY_WIDTH,
      width: BLACK_KEY_WIDTH,
      isBlack: true,
    }
  } else {
    return {
      x: offset + whiteKeyCount * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH / 2,
      width: WHITE_KEY_WIDTH * 0.9, // Gap
      isBlack: false,
    }
  }
}

// --- Components ---

function Lights() {
  return (
    <>
      <ambientLight intensity={2} />
      <pointLight position={[0, 10, 10]} intensity={0.5} />
      <pointLight position={[-20, 5, 5]} intensity={0.2} />
      <pointLight position={[20, 5, 5]} intensity={0.2} />
    </>
  )
}

function PianoKeys({
  activeNotes,
  onSpawnParticles
}: {
  activeNotes: Set<number>
  onSpawnParticles: (x: number, color: string) => void
}) {
  // Generate keys
  const keys = useMemo(() => {
    const items = []
    for (let i = 21; i <= 108; i++) {
      const { x, width, isBlack } = getNoteX(i)
      items.push({ midi: i, x, width, isBlack })
    }
    return items
  }, [])

  // Spawn particles for active keys every frame
  useFrame(() => {
    activeNotes.forEach((midi) => {
      const key = keys.find(k => k.midi === midi)
      if (key) {
        const isLeft = midi < 60
        const color = isLeft ? COLORS.magenta : COLORS.cyan
        // Spawn fewer particles per frame for continuous effect
        onSpawnParticles(key.x, color)
      }
    })
  })

  return (
    <group position={[0, HIT_Y, 0]}>
      {keys.map((key) => {
        const isActive = activeNotes.has(key.midi)
        const height = key.isBlack ? 2 : 1.5
        const length = key.isBlack ? 3 : 5
        const yPos = key.isBlack ? 0.5 : 0
        const zPos = key.isBlack ? -1 : 0

        // Dynamic Color
        const isLeft = key.midi < 60
        const baseColor = key.isBlack ? COLORS.blackKey : COLORS.whiteKey
        const activeColor = isLeft ? COLORS.magenta : COLORS.cyan
        // Base emission for all keys, stronger when active
        const baseEmissiveColor = key.isBlack ? "#1a1a1a" : "#2a2a2a"
        const emissiveColor = isActive ? (isLeft ? COLORS.magentaGlow : COLORS.cyanGlow) : baseEmissiveColor
        const emissiveIntensity = isActive ? 2.5 : 0

        return (
          <group key={key.midi} position={[key.x, yPos, zPos]}>
            <RoundedBox args={[key.width, height, length]} radius={0.1} smoothness={4}>
              <meshStandardMaterial
                color={isActive ? activeColor : baseColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                roughness={0.3}
                metalness={0.7}
              />
            </RoundedBox>
            {/* Reflection / Ground glow under active key */}
            {isActive && (
              <pointLight
                position={[0, 0.5, 0]}
                intensity={0.4}
                distance={3}
                color={key.midi < 60 ? COLORS.magenta : COLORS.cyan}
                decay={2}
              />
            )}
          </group>
        )
      })}

      {/* The "Impact Bar" - A subtle line across the keyboard */}
      <mesh position={[0, 1.1, -2.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[KEYBOARD_WIDTH, 0.1, 0.1]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={3.5}
          toneMapped={false}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  )
}

function FallingNotes({
  notes,
  currentTime,
  onSpawnSparkles,
}: {
  notes: NoteData[]
  currentTime: number
  onSpawnSparkles: (x: number, y: number, color: string) => void
}) {
  const groupRef = useRef<any>(null)
  const lastSpawnedNotes = useRef<Set<string>>(new Set())

  useFrame(() => {
    // Reset spawn tracking for notes that are no longer visible
    const visibleNoteIds = new Set<string>()

    notes.forEach((note) => {
      const timeUntilHit = note.time - currentTime
      if (timeUntilHit > VISIBLE_WINDOW || timeUntilHit + note.duration < -0.5) return

      visibleNoteIds.add(note.id)

      // Spawn sparkles for newly visible notes
      if (!lastSpawnedNotes.current.has(note.id) && timeUntilHit > 0 && timeUntilHit < VISIBLE_WINDOW) {
        const y = HIT_Y + timeUntilHit * NOTE_SPEED + (note.duration * NOTE_SPEED) / 2
        onSpawnSparkles(note.x, y, note.color)
        lastSpawnedNotes.current.add(note.id)
      }
    })

    // Clean up notes that are no longer visible
    lastSpawnedNotes.current.forEach((id) => {
      if (!visibleNoteIds.has(id)) {
        lastSpawnedNotes.current.delete(id)
      }
    })
  })

  return (
    <group ref={groupRef}>
      {notes.map((note) => {
        const timeUntilHit = note.time - currentTime
        // Visibility Check
        if (timeUntilHit > VISIBLE_WINDOW || timeUntilHit + note.duration < -0.5) return null

        // Height corresponds to duration, minus a small gap
        const fullHeight = note.duration * NOTE_SPEED
        const height = Math.max(0.1, fullHeight - NOTE_GAP)

        // Calculate Y position
        // Head (bottom) is at HIT_Y + timeUntilHit * NOTE_SPEED
        // Center is Head + height / 2
        const y = HIT_Y + timeUntilHit * NOTE_SPEED + height / 2

        // Colors
        const color = note.color

        return (
          <RoundedBox
            key={note.id}
            position={[note.x, y, -2.5]} // Slight Z offset to be behind keys? Or aligned.
            rotation={[0, 0, 0]} // Rotation: [x, y, z] in radians
            args={[note.width, height, 0.5]}
            radius={0.1}
            smoothness={2}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2.25}
              toneMapped={false}
              roughness={0.2}
              metalness={0.3}
            />
          </RoundedBox>
        )
      })}
    </group>
  )
}

function SynthesiaFallingNotes({
  notes,
  currentTime,
  onSpawnSparkles,
}: {
  notes: NoteData[]
  currentTime: number
  onSpawnSparkles: (x: number, z: number, color: string) => void
}) {
  const groupRef = useRef<any>(null)
  const lastSpawnedNotes = useRef<Set<string>>(new Set())

  useFrame(() => {
    const visibleNoteIds = new Set<string>()

    notes.forEach((note) => {
      const timeUntilHit = note.time - currentTime
      // Only show if it hasn't fully passed yet (timeUntilHit + duration > 0)
      // And is within visible window
      if (timeUntilHit > VISIBLE_WINDOW || timeUntilHit + note.duration < 0) return

      visibleNoteIds.add(note.id)

      // Spawn sparkles for newly visible notes
      if (!lastSpawnedNotes.current.has(note.id) && timeUntilHit > 0 && timeUntilHit < VISIBLE_WINDOW) {
        // Spawn at the top (far negative Z)
        const z = KEY_Z - (timeUntilHit * NOTE_SPEED + (note.duration * NOTE_SPEED) / 2)
        onSpawnSparkles(note.x, z, note.color)
        lastSpawnedNotes.current.add(note.id)
      }
    })

    // Clean up notes that are no longer visible
    lastSpawnedNotes.current.forEach((id) => {
      if (!visibleNoteIds.has(id)) {
        lastSpawnedNotes.current.delete(id)
      }
    })
  })

  return (
    <group ref={groupRef}>
      {notes.map((note) => {
        const timeUntilHit = note.time - currentTime

        // Skip if out of view
        if (timeUntilHit > VISIBLE_WINDOW || timeUntilHit + note.duration < 0) return null

        // Calculate position and dimensions
        // We want the note to "disappear" into the keys at Z=0 (KEY_Z)

        // Original full length of the note
        const fullDepthOriginal = note.duration * NOTE_SPEED

        // Apply visual gap
        const fullDepth = Math.max(0.1, fullDepthOriginal - NOTE_GAP)

        // Calculate where the "head" (bottom) of the note is
        // Head is at Z = KEY_Z - (timeUntilHit * NOTE_SPEED)
        // If timeUntilHit is positive, head is at negative Z (above keys)
        // If timeUntilHit is negative, head is at positive Z (past keys)

        let currentDepth = fullDepth
        // Center is Head - currentDepth / 2
        // Head position is unchanged by the gap (it's the leading edge)
        let zCenter = (KEY_Z - (timeUntilHit * NOTE_SPEED)) - currentDepth / 2

        // If the note has started hitting (timeUntilHit < 0), we need to clip it
        if (timeUntilHit < 0) {
          // The portion that has passed is -timeUntilHit * NOTE_SPEED
          // We want to reduce the depth by this amount
          const passedDepth = -timeUntilHit * NOTE_SPEED
          currentDepth = Math.max(0, fullDepth - passedDepth)

          // Re-center the remaining piece
          // The tail is still at the same position: KEY_Z - (timeUntilHit * NOTE_SPEED + fullDepth)
          // The new head is at KEY_Z (0)
          // So the new center is KEY_Z - currentDepth / 2
          zCenter = KEY_Z - currentDepth / 2
        }

        if (currentDepth <= 0) return null

        // Position notes slightly above keys (Y=1)
        const keyHeight = 1
        const color = note.color

        return (
          <RoundedBox
            key={note.id}
            position={[note.x, keyHeight, zCenter]}
            rotation={[0, 0, 0]}
            args={[note.width, 0.5, currentDepth]} // Flat in Y, variable Z
            radius={0.1}
            smoothness={2}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2.25}
              toneMapped={false}
              roughness={0.2}
              metalness={0.3}
            />
          </RoundedBox>
        )
      })}
    </group>
  )
}

function ParticleSystem({ particlesRef }: { particlesRef: React.MutableRefObject<Particle[]> }) {
  const COUNT = 1000
  const instancedMeshRef = useRef<any>(null)
  const tempMatrix = useMemo(() => new Matrix4(), [])
  const tempScale = useMemo(() => new Vector3(), [])

  useFrame((state, delta) => {
    if (!instancedMeshRef.current) return

    const particles = particlesRef.current
    let activeCount = 0

    // Update physics and limit to COUNT
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life -= delta * 1.2 // Slower fade out for longer-lasting particles

      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      // Skip if we've reached the maximum count
      if (activeCount >= COUNT) {
        particles.splice(i, 1)
        continue
      }

      p.velocity.y -= 20 * delta // Stronger gravity for more force
      p.position.add(p.velocity.clone().multiplyScalar(delta))

      // Update Instance with proper matrix composition
      const scale = p.size * (p.life / p.maxLife)
      tempScale.set(scale, scale, scale)

      tempMatrix.identity()
      tempMatrix.compose(
        p.position,
        state.camera.quaternion, // Face camera
        tempScale
      )

      instancedMeshRef.current.setMatrixAt(activeCount, tempMatrix)
      instancedMeshRef.current.setColorAt(activeCount, p.color)
      activeCount++
    }

    instancedMeshRef.current.count = activeCount
    instancedMeshRef.current.instanceMatrix.needsUpdate = true
    if (instancedMeshRef.current.instanceColor) instancedMeshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, COUNT]}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

function SparkleSystem({ sparklesRef }: { sparklesRef: React.MutableRefObject<Sparkle[]> }) {
  const COUNT = 500
  const instancedMeshRef = useRef<any>(null)
  const tempMatrix = useMemo(() => new Matrix4(), [])
  const tempScale = useMemo(() => new Vector3(), [])

  useFrame((state, delta) => {
    if (!instancedMeshRef.current) return

    const sparkles = sparklesRef.current
    let activeCount = 0

    // Update physics and limit to COUNT
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i]
      s.life -= delta * 1.5 // Fade out speed
      s.rotation += s.rotationSpeed * delta

      if (s.life <= 0) {
        sparkles.splice(i, 1)
        continue
      }

      // Skip if we've reached the maximum count
      if (activeCount >= COUNT) {
        sparkles.splice(i, 1)
        continue
      }

      // Move downward (following note direction)
      s.velocity.y -= 5 * delta // Slight gravity
      s.position.add(s.velocity.clone().multiplyScalar(delta))

      // Update Instance with rotation
      const scale = s.size * (s.life / s.maxLife)
      tempScale.set(scale, scale, scale)

      // Create matrix with position, rotation, and scale
      tempMatrix.identity()
      tempMatrix.makeRotationZ(s.rotation)
      tempMatrix.setPosition(s.position)
      tempMatrix.scale(tempScale)

      instancedMeshRef.current.setMatrixAt(activeCount, tempMatrix)
      instancedMeshRef.current.setColorAt(activeCount, s.color)
      activeCount++
    }

    instancedMeshRef.current.count = activeCount
    instancedMeshRef.current.instanceMatrix.needsUpdate = true
    if (instancedMeshRef.current.instanceColor) instancedMeshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, COUNT]}>
      {/* Star/sparkle shape - using a simple cross geometry */}
      <planeGeometry args={[0.2, 0.2]} />
      <meshBasicMaterial
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

// --- Main Scene Logic ---

function PianoScene({
  midiData,
  currentTimeRef,
  handFilter,
}: {
  midiData: Midi | null
  currentTimeRef: React.MutableRefObject<number>
  handFilter: "both" | "left" | "right"
}) {
  const particlesRef = useRef<Particle[]>([])
  const sparklesRef = useRef<Sparkle[]>([])

  // Precompute notes
  const notes = useMemo(() => {
    if (!midiData) return []
    const allNotes: NoteData[] = []

    midiData.tracks.forEach((track, trackIndex) => {
      track.notes.forEach((n, i) => {
        const { x, width, isBlack } = getNoteX(n.midi)

        // Filter
        const isLeft = n.midi < 60
        if (handFilter === "left" && !isLeft) return
        if (handFilter === "right" && isLeft) return

        // Color
        // Left hand = Magenta, Right hand = Cyan
        const color = isLeft ? COLORS.magenta : COLORS.cyan

        allNotes.push({
          id: `${trackIndex}-${i}-${n.time}`,
          midi: n.midi,
          time: n.time,
          duration: n.duration,
          velocity: n.velocity,
          isBlack,
          x,
          width,
          color,
          hit: false,
        })
      })
    })
    return allNotes.sort((a, b) => a.time - b.time)
  }, [midiData, handFilter])

  // We need a local state for re-rendering frame updates?
  // No, we want smooth animation.
  // We will force a re-render of FallingNotes every frame?
  // No, FallingNotes can read the ref.
  // But React components need props to change to re-render.
  // Strategy: Pass the ref to FallingNotes and let it useFrame to update positions directly?
  // OR: Just use a state that updates every frame? (Expensive)
  // OR: FallingNotes is an InstancedMesh?
  // Given the variable heights, InstancedMesh is hard.
  // Let's use the approach where we pass `currentTime` as a prop to `FallingNotes`,
  // BUT we update that prop via a parent `useFrame` setting state?
  // That's the "render loop" pattern.

  const [animTime, setAnimTime] = useState(0)

  useFrame(() => {
    // Sync visualizer time with audio time (ref)
    // This causes 60fps React renders for the Scene.
    // In Next.js / Modern React, this is often fine for simple scenes.
    if (Math.abs(currentTimeRef.current - animTime) > 0.001) {
      setAnimTime(currentTimeRef.current)
    }
  })

  // Determine active notes for key highlight
  const activeNotes = useMemo(() => {
    const active = new Set<number>()
    // efficient lookup?
    // linear scan of visible notes
    notes.forEach((n) => {
      if (animTime >= n.time && animTime < n.time + n.duration) {
        active.add(n.midi)
      }
    })
    return active
  }, [animTime, notes])

  const spawnParticles = (x: number, color: string) => {
    // Intensified particles - more, bigger, stronger force, brighter
    // Limit total particles to prevent buffer overflow
    const maxParticles = 500
    const currentCount = particlesRef.current.length
    const availableSlots = maxParticles - currentCount

    if (availableSlots <= 0) return // Don't spawn if at capacity

    // Spawn fewer particles per key so multiple keys can emit simultaneously
    const particleCount = Math.min(10, availableSlots) // 30 particles per key
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI - Math.PI / 2 // Upwards cone
      const speed = Math.random() * 15 + 8 // Much stronger force
      const life = 1.0 + Math.random() * 0.5
      particlesRef.current.push({
        position: new Vector3(x + 0.3, HIT_Y + 3, -1),
        velocity: new Vector3(
          Math.sin(angle) * speed * 0.8, // Stronger horizontal spread
          Math.cos(angle) * speed * 1.2, // Stronger upward force
          (Math.random() - 0.5) * 5 // More Z spread
        ),
        color: new Color(color).multiplyScalar(1.5), // Brighter colors
        life: life,
        maxLife: life,
        size: Math.random() * 0.1 + 0.3, // Bigger particles
      })
    }
  }

  const spawnSparkles = (x: number, y: number, color: string) => {
    // Spawn sparkles from above the note, moving downward
    // Limit total sparkles to prevent buffer overflow
    const maxSparkles = 500
    const currentCount = sparklesRef.current.length
    const availableSlots = maxSparkles - currentCount

    if (availableSlots <= 0) return // Don't spawn if at capacity

    const sparkleCount = Math.min(3 + Math.floor(Math.random() * 3), availableSlots) // 3-5 sparkles per note, but respect limit
    for (let i = 0; i < sparkleCount; i++) {
      const offsetX = (Math.random() - 0.5) * 2 // Spread horizontally
      const offsetY = Math.random() * 10 + 2 // Start slightly above
      sparklesRef.current.push({
        position: new Vector3(x + offsetX, y + offsetY, -2),
        velocity: new Vector3(
          (Math.random() - 0.5) * 2, // Small horizontal drift
          -NOTE_SPEED * 0.8 - Math.random() * 5, // Move downward following notes
          (Math.random() - 0.5) * 1
        ),
        color: new Color(color),
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * 0.15 + 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
      })
    }
  }

  return (
    <>
      <PianoKeys activeNotes={activeNotes} onSpawnParticles={spawnParticles} />
      <FallingNotes notes={notes} currentTime={animTime} onSpawnSparkles={spawnSparkles} />
      <ParticleSystem particlesRef={particlesRef} />
      <SparkleSystem sparklesRef={sparklesRef} />

      {/* Floor Reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#000000" roughness={0.2} metalness={0.5} />
      </mesh>
    </>
  )
}

function SynthesiaScene({
  midiData,
  currentTimeRef,
  handFilter,
}: {
  midiData: Midi | null
  currentTimeRef: React.MutableRefObject<number>
  handFilter: "both" | "left" | "right"
}) {
  const particlesRef = useRef<Particle[]>([])
  const sparklesRef = useRef<Sparkle[]>([])

  // Precompute notes (same as PianoScene)
  const notes = useMemo(() => {
    if (!midiData) return []
    const allNotes: NoteData[] = []

    midiData.tracks.forEach((track, trackIndex) => {
      track.notes.forEach((n, i) => {
        const { x, width, isBlack } = getNoteX(n.midi)

        const isLeft = n.midi < 60
        if (handFilter === "left" && !isLeft) return
        if (handFilter === "right" && isLeft) return

        const color = isLeft ? COLORS.magenta : COLORS.cyan

        allNotes.push({
          id: `${trackIndex}-${i}-${n.time}`,
          midi: n.midi,
          time: n.time,
          duration: n.duration,
          velocity: n.velocity,
          isBlack,
          x,
          width,
          color,
          hit: false,
        })
      })
    })
    return allNotes.sort((a, b) => a.time - b.time)
  }, [midiData, handFilter])

  const [animTime, setAnimTime] = useState(0)

  useFrame(() => {
    if (Math.abs(currentTimeRef.current - animTime) > 0.001) {
      setAnimTime(currentTimeRef.current)
    }
  })

  const activeNotes = useMemo(() => {
    const active = new Set<number>()
    notes.forEach((n) => {
      if (animTime >= n.time && animTime < n.time + n.duration) {
        active.add(n.midi)
      }
    })
    return active
  }, [animTime, notes])

  const spawnParticles = (x: number, color: string) => {
    const maxParticles = 500
    const currentCount = particlesRef.current.length
    const availableSlots = maxParticles - currentCount

    if (availableSlots <= 0) return

    const particleCount = Math.min(10, availableSlots)
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 10 + 5
      const life = 0.8 + Math.random() * 0.4
      particlesRef.current.push({
        position: new Vector3(x, 1, 0), // Spawn at hit line
        velocity: new Vector3(
          Math.sin(angle) * speed * 0.5,
          Math.random() * 5 + 2, // Upward pop
          Math.cos(angle) * speed * 0.5 // Spread in Z
        ),
        color: new Color(color).multiplyScalar(1.5),
        life: life,
        maxLife: life,
        size: Math.random() * 0.1 + 0.2,
      })
    }
  }

  const spawnSparkles = (x: number, z: number, color: string) => {
    const maxSparkles = 500
    const currentCount = sparklesRef.current.length
    const availableSlots = maxSparkles - currentCount

    if (availableSlots <= 0) return

    const sparkleCount = Math.min(2, availableSlots)
    for (let i = 0; i < sparkleCount; i++) {
      const offsetX = (Math.random() - 0.5) * 2
      const offsetZ = (Math.random() - 0.5) * 2
      sparklesRef.current.push({
        position: new Vector3(x + offsetX, 2, z + offsetZ),
        velocity: new Vector3(
          (Math.random() - 0.5) * 1,
          Math.random() * 2,
          NOTE_SPEED // Move with the notes? No, sparkles should float or fall?
          // If notes move +Z (towards 0), sparkles should follow?
          // Notes move from -Z to 0. Velocity is +Z.
        ),
        color: new Color(color),
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * 0.1 + 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
      })
    }
  }

  return (
    <>
      <PianoKeys activeNotes={activeNotes} onSpawnParticles={spawnParticles} />
      <SynthesiaFallingNotes notes={notes} currentTime={animTime} onSpawnSparkles={spawnSparkles} />
      <ParticleSystem particlesRef={particlesRef} />
      <SparkleSystem sparklesRef={sparklesRef} />

      {/* Floor Reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#000000" roughness={0.2} metalness={0.5} />
      </mesh>
    </>
  )
}

// --- Main Export ---

function CameraManager({ hasData, viewMode }: { hasData: boolean, viewMode: ViewMode }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const targetPos = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const targetUp = useRef(new Vector3(0, 1, 0))

  useEffect(() => {
    setIsTransitioning(true)
    const t = setTimeout(() => setIsTransitioning(false), 2000)
    return () => clearTimeout(t)
  }, [hasData, viewMode])

  useFrame((state, delta) => {
    if (!hasData) {
      targetPos.current.set(0, 60, 60)
      targetLook.current.set(0, 0, 0)
      targetUp.current.set(0, 1, 0)
    } else {
      if (viewMode === 'synthesia') {
        // Top-down Rousseau style
        // Camera high up, looking down
        targetPos.current.set(0, 60, 0)
        targetLook.current.set(0, 0, 0)
        // We want -Z to be "Up" on the screen (where notes come from)
        targetUp.current.set(0, 0, -1)
      } else {
        // 3D Angled view
        targetPos.current.set(0, 45, 12.5)
        targetLook.current.set(0, 0, 0)
        targetUp.current.set(0, 1, 0)
      }
    }

    // Smoothly interpolate Up vector
    camera.up.lerp(targetUp.current, delta * 2)

    if (isTransitioning) {
      // Smoother interpolation
      const t = 4 * delta
      camera.position.lerp(targetPos.current, t)
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLook.current, t)
        controlsRef.current.update()
      }
    }
    // Removed the "Lock view" block to allow user interaction after transition
  })

  // Configure controls based on view mode
  const isTopDown = viewMode === 'synthesia'

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isTransitioning} // Enable controls when not transitioning
      autoRotate={!hasData && !isTransitioning}
      autoRotateSpeed={0.5}

      // Panning
      enablePan={true} // Allow panning in both modes

      // Zooming
      enableZoom={true}
      minDistance={10}
      maxDistance={150}

      // Rotation
      enableRotate={!isTopDown} // Disable rotation in Top Down mode to keep it 2D-like

      // Constraints
      maxPolarAngle={Math.PI / 2}

      // Damping for smooth feel
      enableDamping={true}
      dampingFactor={0.05}

      // Mouse Button Mapping
      // In Top Down: Left Click = Pan
      // In 3D: Left Click = Rotate (Default)
      mouseButtons={isTopDown ? {
        LEFT: 2, // MOUSE.PAN (2)
        MIDDLE: 1, // MOUSE.DOLLY (1)
        RIGHT: 0 // MOUSE.ROTATE (0) - though rotate is disabled
      } : undefined} // Use defaults for 3D
    />
  )
}

// --- Main Export ---

export function PianoVisualizer({
  midiData,
  currentTime,
  isPlaying,
  handFilter,
  viewMode = "top-down",
}: PianoVisualizerProps) {
  const currentTimeRef = useRef(currentTime);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 60, 60], fov: 50 }}
        gl={{
          powerPreference: "high-performance",
          antialias: false,
          stencil: false,
          depth: true,
        }}
      >
        <color attach="background" args={[COLORS.bg]} />

        <Lights />

        <CameraManager hasData={!!midiData} viewMode={viewMode} />

        {viewMode === "synthesia" ? (
          <SynthesiaScene
            midiData={midiData}
            currentTimeRef={currentTimeRef}
            handFilter={handFilter}
          />
        ) : (
          <PianoScene
            midiData={midiData}
            currentTimeRef={currentTimeRef}
            handFilter={handFilter}
          />
        )}

        <EffectComposer disableNormalPass>
          <Bloom
            luminanceThreshold={0.3}
            mipmapBlur
            intensity={1.5}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

