// STORY CONSTELLATION — logica pura (PIANO-061).
//
// Brief: `team/briefs/brief-story-constellation-2026-11-06.md`. Baseline
// tecnica: esempio ufficiale Three.js `webgl_buffergeometry_drawrange`
// (punti con moto individuale, connessioni per prossimità sotto
// `minDistance` con intensità `1 - distance / minDistance`, limite
// `maxConnections`). Qui vive soltanto ciò che l'esempio non sa fare:
// identità dei nodi, pulse a evento e gerarchico, metabolismo cromatico,
// memoria fuori istanza. Il disegno è in `brainStoryConstellationStage.ts`.

import type { BrainBioRegime } from './brainBioPerception'
import type { BrainRhythmState } from './brainRhythm'

// 192 nodi (2026-11-06): con 48 la camera, navigando dentro la rete,
// inquadrava in media 1 nodo (misurato): vuoto, poi un nodo che sfrecciava
// via, letto come scatto. Con 192 ne inquadra in media 19. Ogni nodo resta
// una storia possibile.
export const CONSTELLATION_NODE_COUNT = 192
const VOLUME_RADIUS_XY = 560
const VOLUME_RADIUS_Z = 380
// Legami più corti in proporzione alla densità: 270 · ∛(48/192).
export const BASE_MIN_DISTANCE = 170
export const MAX_CONNECTIONS_PER_NODE = 4
export const LOW_POWER_MAX_CONNECTIONS_PER_NODE = 2

export type ConstellationNode = {
  slot: number
  home: [number, number, number]
  position: [number, number, number]
  velocity: [number, number, number]
  // Identità percettiva individuale (brief §7): fissa per tutta la sessione.
  hue: number
  saturation: number
  lightness: number
  // Inviluppo ATTACK → DECAY (brief §18). Mai sinusoidale.
  pulse: number
  // Breve deviazione cromatica legata al pulse (brief §17).
  accent: number
  // Residuo di una storia aperta (brief §27): 0 = possibilità, 1 = memoria.
  memory: number
  // Rotazione di tinta accumulata beat dopo beat (disp. Capo Supremo
  // 2026-11-06: il colore di nodi e linee cambia al beat). Ferma in silenzio.
  hueShift: number
  // Verso della rotazione, fisso per nodo: non ruotano tutti insieme.
  hueDirection: number
}

export type ConstellationEdge = {
  a: number
  b: number
  // `1 - distance / minDistance`, come nell'esempio Three.js.
  strength: number
}

// --- hash deterministico (splitmix32): indici piccoli e sequenziali vanno
// diffusi bene (insidia nota in skills.md, "Creare Un Renderer Brain").
export function hashUnit(value: number): number {
  let x = (value | 0) + 0x9e3779b9
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

export function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function slotForStory(storyId: string, count = CONSTELLATION_NODE_COUNT): number {
  return hashString(storyId) % count
}

export function createConstellationNodes(count = CONSTELLATION_NODE_COUNT): ConstellationNode[] {
  const nodes: ConstellationNode[] = []
  for (let i = 0; i < count; i++) {
    // Distribuzione uniforme in un ellissoide: niente scatola, niente pareti.
    const u = hashUnit(i * 7 + 1)
    const v = hashUnit(i * 7 + 2)
    const w = hashUnit(i * 7 + 3)
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const r = Math.cbrt(w)
    const home: [number, number, number] = [
      r * Math.sin(phi) * Math.cos(theta) * VOLUME_RADIUS_XY,
      r * Math.sin(phi) * Math.sin(theta) * VOLUME_RADIUS_XY * 0.72,
      r * Math.cos(phi) * VOLUME_RADIUS_Z,
    ]
    nodes.push({
      slot: i,
      home,
      position: [...home],
      velocity: [
        (hashUnit(i * 7 + 4) - 0.5) * 2,
        (hashUnit(i * 7 + 5) - 0.5) * 2,
        (hashUnit(i * 7 + 6) - 0.5) * 2,
      ],
      // Tinte su tutto il cerchio, saturazione contenuta: nessun "blu
      // digitale" obbligatorio, nessuna particella identica (brief §30).
      hue: hashUnit(i * 7 + 7),
      saturation: 0.38 + hashUnit(i * 11 + 3) * 0.32,
      lightness: 0.34 + hashUnit(i * 13 + 5) * 0.14,
      pulse: 0,
      accent: 0,
      memory: 0,
      hueShift: 0,
      hueDirection: hashUnit(i * 17 + 9) < 0.5 ? -1 : 1,
    })
  }
  return nodes
}

// --- Memoria fuori istanza: lo stage viene ricreato a ogni fase, la rete
// no. Nessun reset al ritorno (brief §41, §49).
type ConstellationStore = {
  nodes: ConstellationNode[]
  metabolism: ConstellationMetabolism
}

let store: ConstellationStore | null = null

export function getConstellationStore(): ConstellationStore {
  store ??= {
    nodes: createConstellationNodes(),
    metabolism: { ...METABOLISM_BY_REGIME.unresolved },
  }
  return store
}

export function resetConstellationStoreForTests(): void {
  store = null
}

// --- Metabolismo lento (brief §21–26). Proposte da validare a collaudo,
// non mapping rigidi (brief §26).
export type ConstellationMetabolism = {
  // Contaminazione delle tinte verso quella del fuoco (coesione cromatica).
  cohesion: number
  // Pressione cromatica: saturazione e contrasto fuoco/periferia.
  chromaPressure: number
  // >0 la rete si contrae verso il fuoco, <0 si disperde.
  contraction: number
  // Moltiplicatore di `minDistance`: legami più lunghi e morbidi se >1.
  linkReach: number
  // Leggibilità delle connessioni.
  linkGain: number
  // Sensibilità della rete al beat.
  beatSensitivity: number
}

export const METABOLISM_BY_REGIME: Record<BrainBioRegime, ConstellationMetabolism> = {
  unresolved: {
    cohesion: 0.3, chromaPressure: 0.45, contraction: 0, linkReach: 1, linkGain: 0.8, beatSensitivity: 1,
  },
  'respiro-profondo': {
    cohesion: 0.62, chromaPressure: 0.28, contraction: -0.12, linkReach: 1.15, linkGain: 0.65, beatSensitivity: 0.8,
  },
  'respiro-alto': {
    cohesion: 0.12, chromaPressure: 0.82, contraction: 0.08, linkReach: 1.05, linkGain: 1.1, beatSensitivity: 1.2,
  },
  pressurized: {
    cohesion: 0.2, chromaPressure: 0.72, contraction: 0.22, linkReach: 0.95, linkGain: 1, beatSensitivity: 1.1,
  },
  decompression: {
    cohesion: 0.5, chromaPressure: 0.35, contraction: -0.22, linkReach: 1.12, linkGain: 0.7, beatSensitivity: 0.9,
  },
}

const METABOLISM_TAU_MS = 4_000

export function stepMetabolism(
  current: ConstellationMetabolism,
  regime: BrainBioRegime,
  perceptualPressure: number,
  dtMs: number,
  audible: boolean,
): ConstellationMetabolism {
  // In silenzio lo stato raggiunto si conserva (brief §41).
  if (!audible) return current
  const target = METABOLISM_BY_REGIME[regime] ?? METABOLISM_BY_REGIME.unresolved
  const k = 1 - Math.exp(-Math.max(0, dtMs) / METABOLISM_TAU_MS)
  const pressureBias = (clamp01(perceptualPressure) - 0.5) * 0.2
  const next = {} as ConstellationMetabolism
  for (const key of Object.keys(target) as (keyof ConstellationMetabolism)[]) {
    const goal = key === 'chromaPressure' ? clamp01(target[key] + pressureBias) : target[key]
    next[key] = current[key] + (goal - current[key]) * k
  }
  return next
}

// --- Deriva individuale (brief §15): richiamo morbido verso la casa, mai
// rimbalzo contro una scatola. La velocità segue l'attività sonora: in
// silenzio il moto geometrico si quieta (agents.md, Check Silenzio).
const DRIFT_SPEED = 0.018 // unità per ms a piena attività
const HOME_SPRING = 0.00015
const VELOCITY_WANDER = 0.0009

export function stepDrift(
  nodes: ConstellationNode[],
  dtMs: number,
  activity: number,
  contraction: number,
  focus: number | null,
  tick: number,
  // Il target acquista stabilità (brief §36): non deriva più.
  still: number | null = null,
): void {
  const dt = Math.max(0, Math.min(100, dtMs)) * clamp01(activity)
  if (dt <= 0) return
  void focus
  for (const node of nodes) {
    if (node.slot === still) continue
    for (let axis = 0; axis < 3; axis++) {
      // Vagabondaggio deterministico per nodo e asse (niente Math.random).
      const wander = (hashUnit(node.slot * 31 + axis * 7 + tick) - 0.5) * VELOCITY_WANDER * dt
      node.velocity[axis] = clamp(node.velocity[axis] + wander, -1, 1)
      // Contrazione/dispersione rispetto al centro della rete, mai rispetto
      // al fuoco: il fuoco cambia a ogni nodo sfiorato e la rete intera
      // cambiava direzione di colpo (scatto).
      const anchor = node.home[axis] * (1 - contraction)
      const pull = (anchor - node.position[axis]) * HOME_SPRING * dt
      node.position[axis] += node.velocity[axis] * DRIFT_SPEED * dt + pull
    }
  }
}

// --- Connessioni per prossimità, come nell'esempio Three.js.
export function computeConnections(
  nodes: ConstellationNode[],
  minDistance: number,
  maxConnections: number,
  out: ConstellationEdge[] = [],
): ConstellationEdge[] {
  out.length = 0
  const counts = new Array<number>(nodes.length).fill(0)
  const minSq = minDistance * minDistance
  for (let i = 0; i < nodes.length; i++) {
    if (counts[i] >= maxConnections) continue
    const a = nodes[i].position
    for (let j = i + 1; j < nodes.length; j++) {
      if (counts[j] >= maxConnections) continue
      const b = nodes[j].position
      const dx = a[0] - b[0]
      const dy = a[1] - b[1]
      const dz = a[2] - b[2]
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq >= minSq) continue
      counts[i] += 1
      counts[j] += 1
      out.push({ a: i, b: j, strength: 1 - Math.sqrt(distSq) / minDistance })
      if (counts[i] >= maxConnections) break
    }
  }
  return out
}

export function buildAdjacency(count: number, edges: ConstellationEdge[]): number[][] {
  const adjacency: number[][] = Array.from({ length: count }, () => [])
  for (const edge of edges) {
    adjacency[edge.a].push(edge.b)
    adjacency[edge.b].push(edge.a)
  }
  return adjacency
}

// --- Pulse a evento e gerarchico (brief §17–20). Il beat entra nel nodo
// fuoco e attraversa la topologia lungo gli archi: fuoco forte, vicini
// intermedi, periferia minima. Nessuna oscillazione autonoma.
export const PULSE_HOP_DELAY_MS = 85
export const PULSE_HOP_GAIN = [1, 0.5, 0.24, 0.11] as const
export const PULSE_PERIPHERY_GAIN = 0.06
const PULSE_ATTACK_MS = 35
export const BEAT_HUE_STEP = 0.05
const ACCENT_DECAY_FACTOR = 0.6
const BEAT_MIN_AMPLITUDE = 0.15
const HIGH_TRANSIENT_THRESHOLD = 0.35
const HIGH_SPARK_GAIN = 0.32
const HIGH_SPARK_COOLDOWN_MS = 140

export type PendingImpulse = { node: number; at: number; amplitude: number; spark?: boolean }

export function propagationHops(focus: number, adjacency: number[][]): number[] {
  const hops = new Array<number>(adjacency.length).fill(-1)
  hops[focus] = 0
  const queue = [focus]
  while (queue.length > 0) {
    const current = queue.shift() as number
    const next = hops[current] + 1
    if (next >= PULSE_HOP_GAIN.length) continue
    for (const neighbour of adjacency[current]) {
      if (hops[neighbour] !== -1) continue
      hops[neighbour] = next
      queue.push(neighbour)
    }
  }
  return hops
}

export function scheduleBeatImpulses(
  focus: number,
  amplitude: number,
  adjacency: number[][],
  now: number,
  out: PendingImpulse[],
): void {
  const hops = propagationHops(focus, adjacency)
  for (let node = 0; node < hops.length; node++) {
    const hop = hops[node]
    if (hop === -1) {
      // Dissipazione: la periferia riceve un'eco minima, per ultima.
      out.push({
        node,
        at: now + PULSE_HOP_DELAY_MS * PULSE_HOP_GAIN.length,
        amplitude: amplitude * PULSE_PERIPHERY_GAIN,
      })
    } else {
      out.push({ node, at: now + PULSE_HOP_DELAY_MS * hop, amplitude: amplitude * PULSE_HOP_GAIN[hop] })
    }
  }
}

export function pulseDecayMs(motionProfile: string | undefined): number {
  if (motionProfile === 'techno') return 320
  if (motionProfile === 'ambient') return 820
  return 520
}

export type PulseFieldState = {
  pending: PendingImpulse[]
  // Valore richiesto dall'ultimo impulso arrivato, raggiunto in ATTACK.
  targets: number[]
  lastBeatIndex: number | null
  lastHighTransient: number
  lastSparkAt: number
  sparkCounter: number
}

export function createPulseField(count: number): PulseFieldState {
  return {
    pending: [],
    targets: new Array<number>(count).fill(0),
    lastBeatIndex: null,
    lastHighTransient: 0,
    lastSparkAt: -Infinity,
    sparkCounter: 0,
  }
}

export function kickAmplitude(rhythm: BrainRhythmState): number {
  return clamp01(Math.max(rhythm.beatPulse, rhythm.kickEnvelope))
}

/**
 * Ingerisce il ritmo del frame (prima del pacing di disegno, Check
 * Beatmatch) e trasforma gli eventi in impulsi. Ritorna true se ha
 * registrato un beat.
 */
export function ingestRhythm(
  field: PulseFieldState,
  rhythm: BrainRhythmState | null,
  focus: number,
  edges: ConstellationEdge[],
  sensitivity: number,
  now: number,
): boolean {
  if (!rhythm || rhythm.active !== true) {
    // Silenzio: nessun impulso, e gli eventi in coda non arrivano più.
    field.pending.length = 0
    field.lastHighTransient = 0
    return false
  }
  let registered = false
  const isNewBeat = rhythm.beat && rhythm.beatIndex !== field.lastBeatIndex
  if (isNewBeat) {
    field.lastBeatIndex = rhythm.beatIndex
    const amplitude = clamp01(kickAmplitude(rhythm) * sensitivity)
    if (amplitude >= BEAT_MIN_AMPLITUDE) {
      // L'adiacenza serve solo al beat: nessuna allocazione negli altri frame.
      scheduleBeatImpulses(focus, amplitude, buildAdjacency(field.targets.length, edges), now, field.pending)
      registered = true
    }
  }
  // `high`: dettaglio secondario, una scintilla su un solo nodo periferico,
  // senza propagazione (Check Beatmatch: le bande restano distinte).
  const high = rhythm.bandTransients.high
  if (
    high >= HIGH_TRANSIENT_THRESHOLD &&
    field.lastHighTransient < HIGH_TRANSIENT_THRESHOLD &&
    now - field.lastSparkAt >= HIGH_SPARK_COOLDOWN_MS
  ) {
    field.sparkCounter += 1
    const count = field.targets.length
    let node = Math.floor(hashUnit(field.sparkCounter * 13 + 5) * count)
    if (node === focus) node = (node + 1) % count
    field.pending.push({ node, at: now, amplitude: HIGH_SPARK_GAIN * clamp01(high), spark: true })
    field.lastSparkAt = now
  }
  field.lastHighTransient = high
  return registered
}

export function stepPulses(
  nodes: ConstellationNode[],
  field: PulseFieldState,
  now: number,
  dtMs: number,
  decayMs: number,
): void {
  if (field.pending.length > 0) {
    let write = 0
    for (const impulse of field.pending) {
      if (impulse.at <= now) {
        const node = nodes[impulse.node]
        if (node) {
          field.targets[impulse.node] = Math.max(field.targets[impulse.node], node.pulse, impulse.amplitude)
          // Il beat cambia il colore: ogni impulso ruota la tinta del nodo,
          // in proporzione alla sua forza. La scintilla `high` no.
          if (!impulse.spark) {
            node.hueShift = wrap01(node.hueShift + node.hueDirection * BEAT_HUE_STEP * impulse.amplitude)
          }
        }
      } else {
        field.pending[write++] = impulse
      }
    }
    field.pending.length = write
  }
  const dt = Math.max(0, dtMs)
  const decay = Math.exp(-dt / Math.max(1, decayMs))
  const attack = 1 - Math.exp(-dt / PULSE_ATTACK_MS)
  for (const node of nodes) {
    const target = field.targets[node.slot]
    if (target > node.pulse) {
      // ATTACK rapido verso il valore dell'impulso.
      node.pulse += (target - node.pulse) * attack
      if (target - node.pulse < 0.01) {
        node.pulse = target
        field.targets[node.slot] = 0
      }
    } else {
      // DECAY → STATO.
      field.targets[node.slot] = 0
      node.pulse *= decay
      if (node.pulse < 0.002) node.pulse = 0
    }
    node.accent = Math.max(node.accent * Math.pow(decay, ACCENT_DECAY_FACTOR), node.pulse)
  }
}

// --- Colore (brief §22): l'audio cambia il metabolismo, non illustra le
// frequenze. Nessuna banda ha un colore proprio.
export function nodeColor(
  node: ConstellationNode,
  focusHue: number,
  metabolism: ConstellationMetabolism,
  isFocus: boolean,
  out: [number, number, number],
): [number, number, number] {
  const hue =
    mixHue(wrap01(node.hue + node.hueShift), focusHue, isFocus ? 0 : metabolism.cohesion * 0.65) +
    node.accent * 0.06
  const saturation = clamp01(
    node.saturation * (0.55 + metabolism.chromaPressure * 0.7) + node.pulse * 0.2 + node.memory * 0.08,
  )
  // Contrasto fuoco/periferia guidato dalla pressione cromatica.
  const contrast = (metabolism.chromaPressure - 0.5) * 0.12
  const lightness = clamp01(
    node.lightness + (isFocus ? 0.08 + contrast : -contrast) + node.memory * 0.08 + node.pulse * 0.32,
  )
  return hslToRgb(hue, saturation, lightness, out)
}

export function mixHue(a: number, b: number, t: number): number {
  let delta = b - a
  if (delta > 0.5) delta -= 1
  if (delta < -0.5) delta += 1
  const value = a + delta * clamp01(t)
  return value - Math.floor(value)
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
  out: [number, number, number],
): [number, number, number] {
  const hue = h - Math.floor(h)
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1))
  const m = l - c / 2
  const sector = Math.floor(hue * 6)
  let r = 0
  let g = 0
  let b = 0
  if (sector === 0) [r, g, b] = [c, x, 0]
  else if (sector === 1) [r, g, b] = [x, c, 0]
  else if (sector === 2) [r, g, b] = [0, c, x]
  else if (sector === 3) [r, g, b] = [0, x, c]
  else if (sector === 4) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  out[0] = r + m
  out[1] = g + m
  out[2] = b + m
  return out
}

// Attività sonora lenta per la deriva: sale col suono, si quieta in ~3 s di
// silenzio (brief §41).
const ACTIVITY_RISE_MS = 600
const ACTIVITY_FALL_MS = 3_000

export function stepActivity(current: number, audible: boolean, energy: number, dtMs: number): number {
  const goal = audible ? clamp01(0.35 + energy * 2.2) : 0
  const tau = goal > current ? ACTIVITY_RISE_MS : ACTIVITY_FALL_MS
  const next = current + (goal - current) * (1 - Math.exp(-Math.max(0, dtMs) / tau))
  return next < 0.003 && !audible ? 0 : next
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function wrap01(value: number): number {
  return value - Math.floor(value)
}

function clamp01(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1)
}

// --- Navigazione (fase 2, deroga Camera STORY CONSTELLATION) ---------------

export type Vec3 = [number, number, number]

// Velocità di crociera costante (disp. Capo Supremo 2026-11-06: veloce,
// fluida, costante, leggermente più veloce di prima). Unità per secondo.
export const CRUISE_SPEED = 150
// Velocità angolare massima: la camera sterza per gradi, mai di colpo.
export const CRUISE_TURN_RATE = 0.75
export const HOMING_TURN_RATE = 2.2

export function normalizeVec(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2])
  if (length < 1e-9) return [0, 0, 1]
  return [v[0] / length, v[1] / length, v[2] / length]
}

/**
 * Ruota la direzione corrente verso quella desiderata di al più `maxAngle`
 * radianti (slerp su vettori unitari): la traiettoria resta continua anche
 * quando cambia la meta.
 */
export function steerDirection(current: Vec3, desired: Vec3, maxAngle: number): Vec3 {
  const a = normalizeVec(current)
  const b = normalizeVec(desired)
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const angle = Math.acos(dot)
  if (angle <= maxAngle || angle < 1e-6) return b
  const t = maxAngle / angle
  if (angle > Math.PI - 1e-3) {
    // Opposti: si gira attorno a un asse qualunque perpendicolare.
    const side = normalizeVec(Math.abs(a[1]) < 0.9 ? [a[2], 0, -a[0]] : [0, a[2], -a[1]])
    return normalizeVec([
      a[0] * Math.cos(maxAngle) + side[0] * Math.sin(maxAngle),
      a[1] * Math.cos(maxAngle) + side[1] * Math.sin(maxAngle),
      a[2] * Math.cos(maxAngle) + side[2] * Math.sin(maxAngle),
    ])
  }
  const sinAngle = Math.sin(angle)
  const wa = Math.sin((1 - t) * angle) / sinAngle
  const wb = Math.sin(t * angle) / sinAngle
  return normalizeVec([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb])
}

// Inclinazione massima della direzione di marcia: `lookAt` con l'alto fisso
// si ribalta vicino alla verticale (scatto di 180°), e una navigazione quasi
// orizzontale è anche più leggibile.
export const MAX_PITCH_Y = 0.42

export function limitPitch(v: Vec3): Vec3 {
  const n = normalizeVec(v)
  if (Math.abs(n[1]) <= MAX_PITCH_Y) return n
  const y = Math.sign(n[1]) * MAX_PITCH_Y
  const horizontal = Math.hypot(n[0], n[2])
  if (horizontal < 1e-6) return normalizeVec([1, y, 0])
  const scale = Math.sqrt(1 - y * y) / horizontal
  return [n[0] * scale, y, n[2] * scale]
}

// Raggio normalizzato nel volume della rete: 0 al centro, 1 sul bordo.
export function volumeRadius(p: Vec3): number {
  return Math.hypot(p[0] / VOLUME_RADIUS_XY, p[1] / (VOLUME_RADIUS_XY * 0.72), p[2] / VOLUME_RADIUS_Z)
}

function towardCenter(p: Vec3): Vec3 | null {
  const length = Math.hypot(p[0], p[1], p[2])
  return length < 1 ? null : [-p[0] / length, -p[1] / length, -p[2] / length]
}

/**
 * Contenimento (2026-11-06): verso il bordo del volume la direzione voluta
 * piega progressivamente verso il centro, così la camera resta dentro la
 * rete invece di finire nel vuoto.
 */
export function containDesired(position: Vec3, desired: Vec3): Vec3 {
  const center = towardCenter(position)
  const w = smoothstepRange(0.25, 0.6, volumeRadius(position))
  const d = normalizeVec(desired)
  if (!center || w <= 0) return d
  return normalizeVec([d[0] + (center[0] - d[0]) * w, d[1] + (center[1] - d[1]) * w, d[2] + (center[2] - d[2]) * w])
}

// Virata più decisa man mano che ci si allontana dal centro: la camera
// rientra prima di arrivare al bordo e non guarda mai il vuoto.
export function cruiseTurnRate(position: Vec3): number {
  const r = volumeRadius(position)
  return CRUISE_TURN_RATE * (1 + 2.5 * Math.max(0, Math.min(1, (r - 0.25) / 0.35)))
}

/**
 * Prossimo nodo da sfiorare: davanti alla camera e a distanza percorribile
 * senza virate brusche; fra i candidati sceglie l'hash del giro. Se davanti
 * non c'è nulla, il nodo più allineato con la direzione.
 */
export function chooseNextWaypoint(
  positions: Vec3[],
  from: Vec3,
  direction: Vec3,
  exclude: number[],
  seed: number,
): number {
  const candidates: number[] = []
  let best = -1
  let bestDot = -Infinity
  const dir = normalizeVec(direction)
  positions.forEach((p, slot) => {
    if (exclude.includes(slot)) return
    const dx = p[0] - from[0]
    const dy = p[1] - from[1]
    const dz = p[2] - from[2]
    const distance = Math.hypot(dx, dy, dz) || 1
    const dot = (dx * dir[0] + dy * dir[1] + dz * dir[2]) / distance
    if (dot > bestDot) {
      bestDot = dot
      best = slot
    }
    if (dot > 0.35 && distance > 220 && distance < 1_000 && volumeRadius(p) < 0.65) candidates.push(slot)
  })
  if (candidates.length === 0) return best
  return candidates[Math.floor(hashUnit(seed) * candidates.length)]
}

// Punto di passaggio accanto a un nodo, non dentro: la camera lo sfiora.
export function passByPoint(node: Vec3, from: Vec3, lateral: number, side: number): Vec3 {
  const dx = node[0] - from[0]
  const dy = node[1] - from[1]
  const dz = node[2] - from[2]
  const length = Math.hypot(dx, dy, dz) || 1
  const px = -dz / length
  const pz = dx / length
  return [node[0] + px * lateral * side, node[1] + lateral * 0.35 * side, node[2] + pz * lateral * side]
}

/**
 * Soglia nodo ↔ storia (brief §11, Test E3): NODO → MASSA → CAMPO → RASTER.
 * `t` = 0 nella rete, 1 dentro la storia. L'ingresso percorre t da 0 a 1,
 * l'uscita la stessa curva da 1 a 0: si esce come si è entrati.
 * - `others`: presenza della rete attorno (nodi e legami);
 * - `core`: presenza del punto del nodo, che si scioglie nel campo;
 * - `halo`: espansione dell'alone del nodo (la massa);
 * - `field`: quanto il fondo ha preso il colore della storia (il campo);
 * - `threshold`: soglia di luminanza del raster. La materia emerge dalle
 *   luci verso le ombre, su tutto il quadro, mai da un foro (brief §12).
 */
export type ThresholdEnvelope = {
  others: number
  core: number
  halo: number
  field: number
  threshold: number
}

export const RASTER_THRESHOLD_HIDDEN = 1.08
export const RASTER_THRESHOLD_FULL = -0.12

export function thresholdEnvelope(t: number): ThresholdEnvelope {
  const x = clamp01(t)
  return {
    others: 1 - smoothstepRange(0.1, 0.6, x),
    core: 1 - smoothstepRange(0.35, 0.65, x),
    halo: smoothstepRange(0, 0.5, x),
    field: smoothstepRange(0.25, 0.65, x),
    threshold:
      RASTER_THRESHOLD_HIDDEN +
      (RASTER_THRESHOLD_FULL - RASTER_THRESHOLD_HIDDEN) * smoothstepRange(0.45, 1, x),
  }
}

export function smoothstepRange(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}
