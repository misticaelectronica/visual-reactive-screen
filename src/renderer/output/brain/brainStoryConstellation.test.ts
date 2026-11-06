import { describe, expect, it } from 'vitest'
import type { BrainRhythmState } from './brainRhythm'
import {
  METABOLISM_BY_REGIME,
  PULSE_HOP_DELAY_MS,
  buildAdjacency,
  computeConnections,
  createConstellationNodes,
  createPulseField,
  ingestRhythm,
  nodeColor,
  BEAT_HUE_STEP,
  CRUISE_SPEED,
  CRUISE_TURN_RATE,
  RASTER_THRESHOLD_FULL,
  RASTER_THRESHOLD_HIDDEN,
  chooseNextWaypoint,
  passByPoint,
  propagationHops,
  steerDirection,
  thresholdEnvelope,
  stepActivity,
  stepDrift,
  stepMetabolism,
  stepPulses,
  type ConstellationEdge,
  type ConstellationNode,
} from './brainStoryConstellation'
import {
  CONSTELLATION_DURATIONS_MS,
  pickConstellationDurationMs,
} from './brainStoryConstellationStage'

const rhythm = (overrides: Partial<BrainRhythmState> = {}): BrainRhythmState => ({
  active: true,
  beat: false,
  beatIndex: 0,
  beatPhase: 0,
  musicalPosition: 0,
  beatPulse: 0,
  kickEnvelope: 0,
  beatDurationMs: 500,
  bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
  ...overrides,
})

// Catena 0-1-2-3 più un nodo isolato (4): fuoco, vicini, periferia.
function chain(): { nodes: ConstellationNode[]; adjacency: number[][]; edges: ConstellationEdge[] } {
  const nodes = createConstellationNodes(5)
  const edges: ConstellationEdge[] = [
    { a: 0, b: 1, strength: 1 },
    { a: 1, b: 2, strength: 1 },
    { a: 2, b: 3, strength: 1 },
  ]
  return { nodes, adjacency: buildAdjacency(5, edges), edges }
}

function runPulses(nodes: ConstellationNode[], field: ReturnType<typeof createPulseField>, from: number, to: number) {
  const peaks = new Array<number>(nodes.length).fill(0)
  for (let t = from; t <= to; t += 10) {
    stepPulses(nodes, field, t, 10, 520)
    nodes.forEach((n, i) => (peaks[i] = Math.max(peaks[i], n.pulse)))
  }
  return peaks
}

describe('STORY CONSTELLATION — nodi', () => {
  it('ha identità deterministiche e diverse per nodo', () => {
    const a = createConstellationNodes(48)
    const b = createConstellationNodes(48)
    expect(a.map((n) => n.hue)).toEqual(b.map((n) => n.hue))
    const hues = new Set(a.map((n) => n.hue.toFixed(3)))
    expect(hues.size).toBeGreaterThan(40)
  })

  it('collega i nodi per prossimità con intensità 1 - d/minDistance e limite di connessioni', () => {
    const nodes = createConstellationNodes(48)
    const edges = computeConnections(nodes, 270, 4)
    expect(edges.length).toBeGreaterThan(10)
    const counts = new Array<number>(48).fill(0)
    for (const edge of edges) {
      counts[edge.a] += 1
      counts[edge.b] += 1
      expect(edge.strength).toBeGreaterThan(0)
      expect(edge.strength).toBeLessThanOrEqual(1)
    }
    expect(Math.max(...counts)).toBeLessThanOrEqual(4)
  })
})

describe('STORY CONSTELLATION — pulse gerarchico', () => {
  it('propaga per salti lungo gli archi', () => {
    expect(propagationHops(0, chain().adjacency)).toEqual([0, 1, 2, 3, -1])
  })

  it('un beat produce gerarchia: fuoco > vicini > periferia, in ritardo per salto', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    const registered = ingestRhythm(field, rhythm({ beat: true, beatIndex: 1, beatPulse: 1 }), 0, edges, 1, 0)
    expect(registered).toBe(true)
    // Prima che il primo salto arrivi, solo il fuoco si è acceso.
    stepPulses(nodes, field, 10, 10, 520)
    expect(nodes[0].pulse).toBeGreaterThan(0)
    expect(nodes[1].pulse).toBe(0)
    const peaks = runPulses(nodes, field, 20, 1_000)
    expect(peaks[0]).toBeGreaterThan(peaks[1])
    expect(peaks[1]).toBeGreaterThan(peaks[2])
    expect(peaks[2]).toBeGreaterThan(peaks[3])
    expect(peaks[3]).toBeGreaterThan(peaks[4])
    expect(peaks[4]).toBeGreaterThan(0)
    expect(PULSE_HOP_DELAY_MS).toBeGreaterThan(0)
  })

  it('ATTACK → DECAY → STATO: senza nuovi beat il pulse torna a zero', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    ingestRhythm(field, rhythm({ beat: true, beatIndex: 1, beatPulse: 1 }), 0, edges, 1, 0)
    runPulses(nodes, field, 0, 6_000)
    expect(nodes.every((n) => n.pulse === 0)).toBe(true)
  })

  it('lo stesso beatIndex non genera un secondo impulso', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    ingestRhythm(field, rhythm({ beat: true, beatIndex: 3, beatPulse: 1 }), 0, edges, 1, 0)
    const pending = field.pending.length
    ingestRhythm(field, rhythm({ beat: true, beatIndex: 3, beatPulse: 1 }), 0, edges, 1, 16)
    expect(field.pending.length).toBe(pending)
  })

  it('in silenzio nessun impulso, e quelli in coda decadono', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    ingestRhythm(field, rhythm({ beat: true, beatIndex: 1, beatPulse: 1 }), 0, edges, 1, 0)
    expect(ingestRhythm(field, rhythm({ active: false, beat: true, beatIndex: 2, beatPulse: 1 }), 0, edges, 1, 5)).toBe(false)
    expect(field.pending.length).toBe(0)
  })

  it('un transiente high accende un solo nodo, senza propagazione', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    ingestRhythm(field, rhythm({ bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0.8 } }), 0, edges, 1, 0)
    expect(field.pending.length).toBe(1)
    expect(field.pending[0].node).not.toBe(0)
  })
})

describe('STORY CONSTELLATION — metabolismo e silenzio', () => {
  it('in silenzio il metabolismo raggiunto si conserva', () => {
    const current = { ...METABOLISM_BY_REGIME['respiro-alto'] }
    expect(stepMetabolism(current, 'respiro-profondo', 0.2, 10_000, false)).toBe(current)
  })

  it('converge lentamente verso il regime', () => {
    let m = { ...METABOLISM_BY_REGIME.unresolved }
    m = stepMetabolism(m, 'respiro-profondo', 0.5, 500, true)
    expect(m.cohesion).toBeLessThan(METABOLISM_BY_REGIME['respiro-profondo'].cohesion)
    for (let i = 0; i < 100; i++) m = stepMetabolism(m, 'respiro-profondo', 0.5, 500, true)
    expect(m.cohesion).toBeCloseTo(METABOLISM_BY_REGIME['respiro-profondo'].cohesion, 2)
  })

  it('in silenzio la deriva si ferma', () => {
    let activity = 1
    for (let i = 0; i < 400; i++) activity = stepActivity(activity, false, 0, 50)
    expect(activity).toBe(0)
    const nodes = createConstellationNodes(8)
    const before = nodes.map((n) => [...n.position])
    stepDrift(nodes, 16, activity, 0, 0, 1)
    expect(nodes.map((n) => n.position)).toEqual(before)
  })

  it('il pulse schiarisce il nodo; la coesione avvicina le tinte al fuoco', () => {
    const [node] = createConstellationNodes(1)
    const calm = nodeColor(node, node.hue, METABOLISM_BY_REGIME.unresolved, false, [0, 0, 0])
    const calmSum = calm[0] + calm[1] + calm[2]
    node.pulse = 1
    const lit = nodeColor(node, node.hue, METABOLISM_BY_REGIME.unresolved, false, [0, 0, 0])
    expect(lit[0] + lit[1] + lit[2]).toBeGreaterThan(calmSum)
  })
})

describe('STORY CONSTELLATION — durata del giro', () => {
  it('sceglie fra 5, 15 e 25 secondi', () => {
    expect(pickConstellationDurationMs(() => 0)).toBe(5_000)
    expect(pickConstellationDurationMs(() => 0.5)).toBe(15_000)
    expect(pickConstellationDurationMs(() => 0.999)).toBe(25_000)
    expect(pickConstellationDurationMs(() => 1)).toBe(25_000)
    expect([...CONSTELLATION_DURATIONS_MS]).toEqual([5_000, 15_000, 25_000])
  })
})

describe('STORY CONSTELLATION — adiacenza', () => {
  it('è simmetrica', () => {
    const adjacency = buildAdjacency(3, [{ a: 0, b: 2, strength: 0.5 }])
    expect(adjacency).toEqual([[2], [], [0]])
  })
})

describe('STORY CONSTELLATION — navigazione', () => {
  it('sterza per gradi: mai più dell\'angolo consentito per frame', () => {
    const turned = steerDirection([0, 0, -1], [1, 0, 0], 0.05)
    const angle = Math.acos(-turned[2])
    expect(angle).toBeCloseTo(0.05, 4)
    expect(Math.hypot(...turned)).toBeCloseTo(1, 6)
    expect(steerDirection([0, 0, -1], [0.01, 0, -1], 0.5)[0]).toBeGreaterThan(0)
  })

  it('anche da direzione opposta la virata è graduale', () => {
    const turned = steerDirection([0, 0, -1], [0, 0, 1], 0.05)
    expect(Math.acos(-turned[2])).toBeCloseTo(0.05, 4)
  })

  it('a velocità costante la traiettoria resta continua al cambio di meta', () => {
    let direction: [number, number, number] = [0, 0, -1]
    const position: [number, number, number] = [0, 0, 0]
    const dt = 1 / 60
    const steps: number[] = []
    for (let frame = 0; frame < 600; frame++) {
      const goal: [number, number, number] = frame < 300 ? [400, 0, -400] : [-400, 200, 0]
      const desired: [number, number, number] = [goal[0] - position[0], goal[1] - position[1], goal[2] - position[2]]
      const before = [...position]
      direction = steerDirection(direction, desired, CRUISE_TURN_RATE * dt)
      for (let axis = 0; axis < 3; axis++) position[axis] += direction[axis] * CRUISE_SPEED * dt
      steps.push(Math.hypot(position[0] - before[0], position[1] - before[1], position[2] - before[2]))
    }
    for (const step of steps) expect(step).toBeCloseTo(CRUISE_SPEED * dt, 6)
  })

  it('il prossimo nodo è davanti alla camera e non escluso', () => {
    const nodes = createConstellationNodes(48)
    for (let seed = 0; seed < 30; seed++) {
      const slot = chooseNextWaypoint(nodes.map((n) => n.position), [0, 0, 0], [0, 0, -1], [3], seed)
      expect(slot).not.toBe(3)
      expect(nodes[slot].position[2]).toBeLessThan(0)
    }
  })

  it('sfiora i nodi senza attraversarli', () => {
    const pass = passByPoint([100, 0, 0], [0, 0, 1000], 110, 1)
    expect(Math.hypot(pass[0] - 100, pass[1], pass[2])).toBeGreaterThan(100)
  })
})

describe('STORY CONSTELLATION — colore al beat', () => {
  it('ogni beat ruota la tinta dei nodi raggiunti, più forte sul fuoco', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    ingestRhythm(field, rhythm({ beat: true, beatIndex: 1, beatPulse: 1 }), 0, edges, 1, 0)
    runPulses(nodes, field, 0, 1_000)
    const shift = (n: ConstellationNode) => Math.min(n.hueShift, 1 - n.hueShift)
    expect(shift(nodes[0])).toBeCloseTo(BEAT_HUE_STEP, 5)
    expect(shift(nodes[1])).toBeGreaterThan(0)
    expect(shift(nodes[1])).toBeLessThan(shift(nodes[0]))
  })

  it('in silenzio il colore non cambia', () => {
    const { nodes, edges } = chain()
    const field = createPulseField(nodes.length)
    ingestRhythm(field, rhythm({ active: false, beat: true, beatIndex: 1, beatPulse: 1 }), 0, edges, 1, 0)
    runPulses(nodes, field, 0, 1_000)
    expect(nodes.every((n) => n.hueShift === 0)).toBe(true)
  })
})

describe('STORY CONSTELLATION — soglia nodo ↔ storia', () => {
  it('nella rete: nessun raster, rete piena; dentro la storia: raster pieno, rete assente', () => {
    const outside = thresholdEnvelope(0)
    expect(outside.threshold).toBeCloseTo(RASTER_THRESHOLD_HIDDEN)
    expect(outside.others).toBe(1)
    expect(outside.field).toBe(0)
    const inside = thresholdEnvelope(1)
    expect(inside.threshold).toBeCloseTo(RASTER_THRESHOLD_FULL)
    expect(inside.others).toBe(0)
    expect(inside.field).toBe(1)
  })

  it('ordine NODO → MASSA → CAMPO → RASTER', () => {
    const firstAbove = (pick: (t: number) => boolean) => {
      for (let i = 0; i <= 100; i++) if (pick(i / 100)) return i / 100
      return 2
    }
    const massa = firstAbove((t) => thresholdEnvelope(t).halo > 0.5)
    const campo = firstAbove((t) => thresholdEnvelope(t).field > 0.5)
    const raster = firstAbove((t) => thresholdEnvelope(t).threshold < 0.5)
    expect(massa).toBeLessThan(campo)
    expect(campo).toBeLessThan(raster)
  })
})
