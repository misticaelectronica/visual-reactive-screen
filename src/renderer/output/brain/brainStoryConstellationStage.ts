// STORY CONSTELLATION — stage Three.js (PIANO-061).
//
// Riuso diretto della struttura dell'esempio ufficiale Three.js
// `webgl_buffergeometry_drawrange` (brief §0, §3–6): `Points` +
// `LineSegments` su `BufferGeometry` con attributi `DynamicDrawUsage`,
// `setDrawRange` per i segmenti effettivi, `PointsMaterial` /
// `LineBasicMaterial` con `AdditiveBlending`. Estensioni, solo dove i
// materiali standard non bastano:
// - `nodeScale` iniettato nel `PointsMaterial` via `onBeforeCompile`
//   (dimensione per nodo, brief §34);
// - un piccolo `ShaderMaterial` per il raster della soglia: la materia
//   emerge per soglia di luminanza con bordo morbido su tutto il quadro
//   (brief §11–12), cosa che `alphaTest` fa solo a taglio netto.
// Navigazione (disp. Capo Supremo 2026-11-06): velocità costante, fluida,
// senza scatti, partenza da dentro la costellazione. La camera non segue
// curve ricalcolate: sterza per gradi (velocità angolare limitata) verso il
// prossimo nodo da sfiorare, quindi la traiettoria resta continua anche
// quando cambia meta.
//
// Ciclo (disp. Capo Supremo 2026-11-06): esce dalla storia conclusa lungo la
// stessa soglia da cui entra, attraversa la rete in giri di 5/15/25 s, cerca
// altre storie in altri nodi, si avvicina al nodo della storia pronta fino a
// entrarci. Camera in movimento: deroga STORY CONSTELLATION in agents.md.

import * as THREE from 'three'
import type { BrainBioRegime } from './brainBioPerception'
import type { BrainRhythmState } from './brainRhythm'
import {
  BASE_MIN_DISTANCE,
  CRUISE_SPEED,
  containDesired,
  cruiseTurnRate,
  limitPitch,
  HOMING_TURN_RATE,
  RASTER_THRESHOLD_HIDDEN,
  chooseNextWaypoint,
  computeConnections,
  createPulseField,
  getConstellationStore,
  hashUnit,
  ingestRhythm,
  nodeColor,
  passByPoint,
  pulseDecayMs,
  slotForStory,
  smoothstepRange,
  stepActivity,
  stepDrift,
  stepMetabolism,
  stepPulses,
  steerDirection,
  thresholdEnvelope,
  type ConstellationEdge,
  type PulseFieldState,
  type Vec3,
} from './brainStoryConstellation'

// Durata di un giro (disp. Capo Supremo 2026-11-06): variabile, scelta a
// caso fra 5, 15 e 25 secondi.
export const CONSTELLATION_DURATIONS_MS = [5_000, 15_000, 25_000] as const

export function pickConstellationDurationMs(random: () => number = Math.random): number {
  const index = Math.min(
    CONSTELLATION_DURATIONS_MS.length - 1,
    Math.floor(random() * CONSTELLATION_DURATIONS_MS.length),
  )
  return CONSTELLATION_DURATIONS_MS[index]
}

const BOOT_FADE_IN_MS = 1_400
// Uscita da una storia: il raster della soglia copre già il quadro, quindi
// l'overlay può comparire in fretta senza salto.
const LEAVE_FADE_IN_MS = 350
const HANDOFF_MS = 1_200
// Distanza dal nodo entro cui si attraversa la soglia: a velocità di
// crociera la soglia dura ~3,5 s.
const THRESHOLD_RADIUS = 520
const INSIDE_DISTANCE = 8
// Variazione massima della soglia: niente salti se il target è già vicino.
const THRESHOLD_MAX_RATE_MS = 700
const PASS_BY_LATERAL = 110
const WAYPOINT_REACH = 90
const LOOK_TAU_MS = 400
// Glitch sui blocchi (disp. Capo Supremo 2026-11-06: "se nella navigazione
// vedi che blocchi, gliccia"). Scatta solo su un fermo reale dei frame
// (GPU o main thread), mai da solo: maschera il salto come il Varco
// Percettivo dei renderer.
const STALL_THRESHOLD_MS = 45
// Ingresso nel neurone "di brutto" (disp. Capo Supremo 2026-11-06): dentro
// la soglia la camera accelera fino a 4× e la visuale zooma al massimo
// (70° → 6°). All'uscita la stessa curva al contrario.
const BASE_FOV = 70
const MIN_FOV = 6
const ENTRY_SPEED_BOOST = 3
const ENTRY_LOOK_TAU_MS = 140
// Enfasi dell'ingresso (disp. Capo Supremo 2026-11-06): lampo nel colore
// della storia quando la camera attraversa il nodo, centrato su questo
// punto della soglia.
const CROSSING_AT = 0.72
const CROSSING_WIDTH = 0.09
const GLITCH_DECAY_MS = 220
const GLITCH_BANDS = 7
const GLITCH_MAX_SHIFT_PX = 90
const GLITCH_RESEED_MS = 45
// Passo massimo per frame (~2 frame a 60 Hz).
const MAX_FRAME_STEP_MS = 34
const MEMORY_ON_VISIT = 0.6
const POINT_SIZE = 34
const HALO_SIZE = 100
// Risoluzione piena e antialias: a 0,75 senza antialias linee e punti
// avanzavano a gradini di pixel e la navigazione sembrava a scatti
// (misurato 2026-11-06: la scena costa ~0,4 ms per frame, il ritmo era
// perfetto). In `lowPowerMode` resta ridotta.
const MAX_PIXEL_RATIO = 2
const LOW_POWER_PIXEL_RATIO = 1
const BACKGROUND: Vec3 = [0.02, 0.012, 0.016]

export type ConstellationRaster = {
  bitmap: ImageBitmap
  // Colore medio del raster (sRGB 0..1): il colore del campo.
  color: Vec3
}

export async function prepareConstellationRaster(
  blob: Blob | null | undefined,
): Promise<ConstellationRaster | null> {
  if (!blob) return null
  try {
    // `flipY` alla decodifica: le texture da ImageBitmap ignorano `flipY`.
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' })
    const size = 16
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let color: Vec3 = [0.12, 0.1, 0.1]
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      let r = 0
      let g = 0
      let b = 0
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
      }
      const n = (data.length / 4) * 255
      color = [r / n, g / n, b / n]
    }
    return { bitmap, color }
  } catch {
    return null
  }
}

export type ConstellationStageInput = {
  rhythm: BrainRhythmState | null
  // Media delle bande già scalata dalla sensibilità globale.
  energy: number
  regime: BrainBioRegime
  perceptualPressure: number
  motionProfile?: string
  lowPowerMode: boolean
}

export type ConstellationStartOptions = {
  // Storia appena conclusa: si esce dal suo nodo, che riceve il residuo di
  // memoria. `null` all'avvio, quando non esiste ancora nessuna storia.
  closedStoryId: string | null
  closingRaster: ConstellationRaster | null
}

export type StoryConstellationStage = {
  // false se WebGL non è disponibile: la fase viene saltata.
  start(options: ConstellationStartOptions): boolean
  // Storia pronta: il suo nodo diventa il target alla fine del giro.
  // `revisit`: vecchio neurone (Riattivazione), si può rientrare anche nel
  // nodo appena lasciato. Ritorna false se la camera sta già entrando.
  setTarget(storyId: string, raster: ConstellationRaster | null, options?: { revisit?: boolean }): boolean
  // Vero quando il giro è finito e non c'è nessun nodo in cui entrare: il
  // chiamante sceglie un vecchio neurone (o la camera continua a cercare).
  awaitingTarget(): boolean
  // 'entered' una sola volta, quando il raster della storia occupa tutto il
  // quadro: il chiamante avvia la storia, lo stage si dissolve sopra.
  update(dtMs: number, now: number, input: ConstellationStageInput): 'entered' | null
  isBusy(): boolean
  isCovering(): boolean
  destroy(): void
}

function createSoftSprite(hardness: number): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(hardness, 'rgba(255,255,255,0.55)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return new THREE.CanvasTexture(canvas)
}

function createNodeMaterial(size: number, map: THREE.Texture): THREE.PointsMaterial {
  const material = new THREE.PointsMaterial({
    size,
    map,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float nodeScale;\n${shader.vertexShader}`.replace(
      'gl_PointSize = size;',
      'gl_PointSize = size * nodeScale;',
    )
  }
  return material
}

function createRasterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null },
      threshold: { value: RASTER_THRESHOLD_HIDDEN },
      softness: { value: 0.16 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float threshold;
      uniform float softness;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(map, vUv);
        float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
        float alpha = smoothstep(threshold - softness, threshold, luma);
        gl_FragColor = vec4(texel.rgb, alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
}

// Vecchia TV sui blocchi: righe di scansione, neve, banda di disturbo che
// scorre, strappi luminosi. Intensità = glitch (mai senza un blocco reale).
function createTvMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      intensity: { value: 0 },
      time: { value: 0 },
      lines: { value: 540 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float intensity;
      uniform float time;
      uniform float lines;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        float snow = hash(floor(vUv * vec2(lines * 1.6, lines)) + fract(time * 13.0));
        float scan = 0.5 + 0.5 * sin(vUv.y * lines * 3.14159);
        float rollY = fract(vUv.y - time * 0.7);
        float roll = smoothstep(0.12, 0.0, abs(rollY - 0.5));
        float tear = step(0.975, hash(vec2(floor(vUv.y * 140.0), floor(time * 30.0))));
        vec3 color = vec3(snow * 0.7 + roll * 0.35 + tear * 0.8);
        float alpha = intensity * (0.16 + 0.34 * (1.0 - scan) + 0.22 * snow + 0.28 * roll + 0.5 * tear);
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
}

type Scene3d = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  fog: THREE.Fog
  pointPositions: THREE.BufferAttribute
  pointColors: THREE.BufferAttribute
  pointScales: THREE.BufferAttribute
  haloColors: THREE.BufferAttribute
  haloScales: THREE.BufferAttribute
  linePositions: THREE.BufferAttribute
  lineColors: THREE.BufferAttribute
  lineGeometry: THREE.BufferGeometry
  rasterQuad: THREE.Mesh
  rasterMaterial: THREE.ShaderMaterial
  tvQuad: THREE.Mesh
  tvMaterial: THREE.ShaderMaterial
  disposables: { dispose(): void }[]
}

// leave: si esce dalla storia conclusa attraverso il suo nodo;
// travel: giri nella rete; enter: si punta al nodo della storia pronta e lo
// si attraversa; handoff: la storia è partita, l'overlay si dissolve.
type Phase = 'idle' | 'leave' | 'travel' | 'enter' | 'handoff'

type Threshold = {
  slot: number
  raster: ConstellationRaster | null
  texture: THREE.Texture | null
}

type Waypoint = { slot: number; side: number; from: Vec3 }

const RASTER_QUAD_DISTANCE = 2
const TV_QUAD_DISTANCE = 1.5

const follow = (dtMs: number, tauMs: number) => 1 - Math.exp(-Math.max(0, dtMs) / tauMs)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function distanceBetween(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function createStoryConstellationStage(parent: HTMLElement): StoryConstellationStage {
  const overlay = document.createElement('div')
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2',
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none',
    background: '#050304',
    display: 'none',
  })
  overlay.dataset.brainPhase = 'story-constellation'
  parent.appendChild(overlay)

  let canvas: HTMLCanvasElement | null = null
  let gl: Scene3d | null = null
  let phase: Phase = 'idle'
  let overlayOpacity = 0
  let fadeInMs = BOOT_FADE_IN_MS
  let lowPowerAtStart = false
  let activity = 0
  let tick = 0
  let glitch = 0
  let glitchSeed = 0
  let glitchSeedAt = 0
  const viewSize = new THREE.Vector2()
  let pulseField: PulseFieldState | null = null
  const edges: ConstellationEdge[] = []
  const rgb: Vec3 = [0, 0, 0]
  const clearColor = new THREE.Color()

  // Camera: posizione, direzione di marcia (unitaria) e sguardo.
  const cameraPosition: Vec3 = [0, 0, 0]
  let cameraDirection: Vec3 = [0, 0, -1]
  const lookDirection: Vec3 = [0, 0, -1]
  let waypoint: Waypoint | null = null
  let giro = 0
  let giroRemainingMs = 0
  let closedSlot: number | null = null
  let target: { storyId: string; slot: number; raster: ConstellationRaster | null } | null = null
  // Soglia in corso (uscita o ingresso): t = 1 dentro la storia.
  let threshold: Threshold | null = null
  let thresholdT = 0

  const resize = () => {
    if (!gl) return
    const width = parent.clientWidth || window.innerWidth
    const height = parent.clientHeight || window.innerHeight
    gl.renderer.setSize(width, height, false)
    gl.camera.aspect = width / Math.max(1, height)
    gl.camera.updateProjectionMatrix()
    fitRasterQuad()
  }

  // Il raster copre il quadro intero (cover), agganciato alla camera.
  const fitRasterQuad = () => {
    if (!gl) return
    const viewHeight = 2 * RASTER_QUAD_DISTANCE * Math.tan(THREE.MathUtils.degToRad(gl.camera.fov / 2))
    const viewWidth = viewHeight * gl.camera.aspect
    const bitmap = threshold?.raster?.bitmap
    const imageAspect = bitmap ? bitmap.width / Math.max(1, bitmap.height) : gl.camera.aspect
    const cover = imageAspect > gl.camera.aspect
      ? [viewHeight * imageAspect, viewHeight]
      : [viewWidth, viewWidth / imageAspect]
    gl.rasterQuad.scale.set(cover[0] * 1.02, cover[1] * 1.02, 1)
    const tvScale = TV_QUAD_DISTANCE / RASTER_QUAD_DISTANCE
    gl.tvQuad.scale.set(viewWidth * tvScale * 1.02, viewHeight * tvScale * 1.02, 1)
  }

  const build = (lowPowerMode: boolean): Scene3d => {
    const nodes = getConstellationStore().nodes
    const count = nodes.length
    canvas = document.createElement('canvas')
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
    overlay.appendChild(canvas)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !lowPowerMode,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(
      lowPowerMode ? LOW_POWER_PIXEL_RATIO : Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
    )
    const scene = new THREE.Scene()
    const fog = new THREE.Fog(new THREE.Color(...BACKGROUND), 200, 2_300)
    scene.fog = fog
    const camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 1, 4_000)
    scene.add(camera)
    const group = new THREE.Group()
    scene.add(group)

    const dynamic = (array: Float32Array, size: number) =>
      new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage)

    const pointPositions = dynamic(new Float32Array(count * 3), 3)
    const pointColors = dynamic(new Float32Array(count * 3), 3)
    const pointScales = dynamic(new Float32Array(count).fill(1), 1)
    const haloColors = dynamic(new Float32Array(count * 3), 3)
    const haloScales = dynamic(new Float32Array(count).fill(1), 1)

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', pointPositions)
    pointGeometry.setAttribute('color', pointColors)
    pointGeometry.setAttribute('nodeScale', pointScales)
    pointGeometry.setDrawRange(0, count)

    const haloGeometry = new THREE.BufferGeometry()
    haloGeometry.setAttribute('position', pointPositions)
    haloGeometry.setAttribute('color', haloColors)
    haloGeometry.setAttribute('nodeScale', haloScales)
    haloGeometry.setDrawRange(0, lowPowerMode ? 0 : count)

    const coreSprite = createSoftSprite(0.35)
    const haloSprite = createSoftSprite(0.12)
    const pointMaterial = createNodeMaterial(POINT_SIZE, coreSprite)
    const haloMaterial = createNodeMaterial(HALO_SIZE, haloSprite)
    const halo = new THREE.Points(haloGeometry, haloMaterial)
    const points = new THREE.Points(pointGeometry, pointMaterial)
    // I punti si muovono ogni frame: niente culling su bounding sphere vecchie.
    halo.frustumCulled = false
    points.frustumCulled = false
    group.add(halo)
    group.add(points)

    // Tutti i legami sotto `minDistance`, senza tetto per nodo: col tetto un
    // legame nuovo ne scacciava un altro ancora visibile (linee che
    // comparivano e sparivano di colpo). L'intensità `1 - d/minDistance` li
    // fa nascere e morire a zero.
    const maxSegments = (count * (count - 1)) / 2
    const linePositions = dynamic(new Float32Array(maxSegments * 6), 3)
    const lineColors = dynamic(new Float32Array(maxSegments * 6), 3)
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', linePositions)
    lineGeometry.setAttribute('color', lineColors)
    lineGeometry.setDrawRange(0, 0)
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    lines.frustumCulled = false
    group.add(lines)

    const quadGeometry = new THREE.PlaneGeometry(1, 1)
    const rasterMaterial = createRasterMaterial()
    const rasterQuad = new THREE.Mesh(quadGeometry, rasterMaterial)
    rasterQuad.position.set(0, 0, -RASTER_QUAD_DISTANCE)
    rasterQuad.renderOrder = 10
    rasterQuad.frustumCulled = false
    rasterQuad.visible = false
    camera.add(rasterQuad)

    const tvMaterial = createTvMaterial()
    const tvQuad = new THREE.Mesh(quadGeometry, tvMaterial)
    tvQuad.position.set(0, 0, -TV_QUAD_DISTANCE)
    tvQuad.renderOrder = 20
    tvQuad.frustumCulled = false
    tvQuad.visible = false
    camera.add(tvQuad)

    return {
      renderer,
      scene,
      camera,
      fog,
      pointPositions,
      pointColors,
      pointScales,
      haloColors,
      haloScales,
      linePositions,
      lineColors,
      lineGeometry,
      rasterQuad,
      rasterMaterial,
      tvQuad,
      tvMaterial,
      disposables: [
        pointGeometry, haloGeometry, lineGeometry, quadGeometry,
        pointMaterial, haloMaterial, lineMaterial, rasterMaterial, tvMaterial,
        coreSprite, haloSprite, renderer,
      ],
    }
  }

  const releaseThreshold = () => {
    threshold?.texture?.dispose()
    threshold?.raster?.bitmap.close?.()
    threshold = null
  }

  const openThreshold = (slot: number, raster: ConstellationRaster | null) => {
    releaseThreshold()
    let texture: THREE.Texture | null = null
    if (raster) {
      texture = new THREE.Texture(raster.bitmap)
      texture.flipY = false
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    }
    threshold = { slot, raster, texture }
    if (gl) gl.rasterMaterial.uniforms.map.value = texture
    fitRasterQuad()
  }

  const cleanup = () => {
    window.removeEventListener('resize', resize)
    releaseThreshold()
    target?.raster?.bitmap.close?.()
    target = null
    waypoint = null
    if (gl) {
      for (const item of gl.disposables) item.dispose()
      gl.renderer.forceContextLoss()
    }
    gl = null
    canvas?.remove()
    canvas = null
    pulseField = null
    overlay.style.display = 'none'
    overlay.style.opacity = '0'
    overlayOpacity = 0
    phase = 'idle'
  }

  const nodePosition = (slot: number): Vec3 => getConstellationStore().nodes[slot]?.position ?? [0, 0, 0]

  const pickWaypoint = () => {
    const nodes = getConstellationStore().nodes
    giro += 1
    const exclude = [closedSlot ?? -1, waypoint?.slot ?? -1, target?.slot ?? -1, threshold?.slot ?? -1]
    const slot = chooseNextWaypoint(
      nodes.map((node) => node.position),
      cameraPosition,
      cameraDirection,
      exclude,
      giro * 7 + 3,
    )
    waypoint = {
      slot,
      side: hashUnit(giro * 31 + 5) < 0.5 ? -1 : 1,
      from: [...cameraPosition],
    }
  }

  const beginGiro = () => {
    giroRemainingMs = pickConstellationDurationMs()
    if (!waypoint) pickWaypoint()
  }

  const moveCamera = (dtMs: number, desired: Vec3 | null, turnRate: number) => {
    const dtS = dtMs / 1000
    if (desired) {
      // In crociera l'inclinazione è limitata; verso il nodo d'ingresso no,
      // altrimenti la camera potrebbe non raggiungerlo.
      const steered = steerDirection(cameraDirection, desired, turnRate * dtS)
      cameraDirection = phase === 'enter' ? steered : limitPitch(steered)
    }
    const boost =
      phase === 'enter' || phase === 'leave'
        ? 1 + ENTRY_SPEED_BOOST * smoothstepRange(0, 1, thresholdT)
        : 1
    const step = CRUISE_SPEED * boost * dtS
    for (let axis = 0; axis < 3; axis++) cameraPosition[axis] += cameraDirection[axis] * step
  }

  const toward = (point: Vec3): Vec3 => [
    point[0] - cameraPosition[0],
    point[1] - cameraPosition[1],
    point[2] - cameraPosition[2],
  ]

  // Avanzamento della camera a velocità costante (nessuna dipendenza da
  // energia o attività: la velocità di navigazione è costante).
  const navigate = (dtMs: number): 'entered' | null => {
    if (phase === 'leave' && threshold) {
      // Si esce attraversando il nodo: la soglia si ripercorre all'indietro
      // man mano che la camera se ne allontana.
      moveCamera(dtMs, null, 0)
      const distance = distanceBetween(cameraPosition, nodePosition(threshold.slot))
      const goal = Math.max(0, Math.min(1, 1 - (distance - INSIDE_DISTANCE) / THRESHOLD_RADIUS))
      thresholdT = Math.max(goal, thresholdT - dtMs / THRESHOLD_MAX_RATE_MS)
      if (thresholdT <= 0) {
        releaseThreshold()
        phase = 'travel'
        beginGiro()
      }
      return null
    }
    if (phase === 'travel') {
      giroRemainingMs -= dtMs
      if (giroRemainingMs <= 0 && target) {
        // Fine giro con una storia pronta: si punta al suo nodo.
        openThreshold(target.slot, target.raster)
        // La bitmap ora appartiene alla soglia.
        target.raster = null
        thresholdT = 0
        waypoint = null
        phase = 'enter'
      } else {
        // Giro finito senza target: si continua a navigare finché il
        // chiamante non indica un nodo (storia pronta o vecchio neurone).
        if (giroRemainingMs < 0) giroRemainingMs = 0
        if (!waypoint) pickWaypoint()
        const current = waypoint as Waypoint
        const point = passByPoint(nodePosition(current.slot), current.from, PASS_BY_LATERAL, current.side)
        const desired = toward(point)
        const distance = Math.hypot(desired[0], desired[1], desired[2])
        const ahead =
          (desired[0] * cameraDirection[0] + desired[1] * cameraDirection[1] + desired[2] * cameraDirection[2]) /
          (distance || 1)
        // Nodo sfiorato, oppure ormai alle spalle: il prossimo.
        if (distance < WAYPOINT_REACH || (ahead < 0 && distance < 420)) pickWaypoint()
        moveCamera(dtMs, containDesired(cameraPosition, desired), cruiseTurnRate(cameraPosition))
        return null
      }
    }
    if (phase === 'enter' && threshold) {
      const node = nodePosition(threshold.slot)
      const desired = toward(node)
      const distance = Math.hypot(desired[0], desired[1], desired[2])
      // Stessa tolleranza d'arrivo per il moto e per la chiusura della soglia
      // (erano diverse: la camera si fermava a 13 unità e l'arrivo era
      // riconosciuto solo sotto 9, la storia non partiva mai).
      const arrived = distance <= INSIDE_DISTANCE + CRUISE_SPEED * (1 + ENTRY_SPEED_BOOST) * (dtMs / 1000)
      if (!arrived) {
        // La virata cresce con la velocità e si stringe vicino al nodo: a 4×
        // con la virata di crociera la camera girava attorno al nodo senza
        // entrarci mai (misurato nella finestra di prova).
        const boost = 1 + ENTRY_SPEED_BOOST * smoothstepRange(0, 1, thresholdT)
        const near = 1 + 4 * (1 - smoothstepRange(40, 300, distance))
        moveCamera(dtMs, desired, HOMING_TURN_RATE * boost * near)
      }
      const goal = Math.max(0, Math.min(1, 1 - (distance - INSIDE_DISTANCE) / THRESHOLD_RADIUS))
      thresholdT = Math.min(goal >= 0.999 ? 1 : goal, thresholdT + dtMs / THRESHOLD_MAX_RATE_MS)
      if (arrived) {
        // Arrivati: la soglia completa il suo corso, la camera resta.
        thresholdT = Math.min(1, thresholdT + dtMs / THRESHOLD_MAX_RATE_MS)
      }
      if (thresholdT >= 1) {
        phase = 'handoff'
        return 'entered'
      }
    }
    return null
  }

  const updateCameraView = (dtMs: number) => {
    if (!gl) return
    const k = follow(dtMs, LOOK_TAU_MS)
    // Lo sguardo segue la direzione di marcia, smorzato: rotazione continua.
    // Entrando, punta dritto al nodo: con lo zoom al massimo un minimo
    // disallineamento lo faceva uscire dall'inquadratura.
    let goal: Vec3 = cameraDirection
    let lookK = k
    if (phase === 'enter' && threshold) {
      const node = nodePosition(threshold.slot)
      const toNode: Vec3 = [node[0] - cameraPosition[0], node[1] - cameraPosition[1], node[2] - cameraPosition[2]]
      const length = Math.hypot(toNode[0], toNode[1], toNode[2])
      if (length > 1e-3) goal = [toNode[0] / length, toNode[1] / length, toNode[2] / length]
      lookK = follow(dtMs, ENTRY_LOOK_TAU_MS)
    }
    for (let axis = 0; axis < 3; axis++) {
      lookDirection[axis] += (goal[axis] - lookDirection[axis]) * lookK
    }
    // Zoom al massimo dentro la soglia, la stessa curva all'uscita.
    const fov = threshold
      ? BASE_FOV + (MIN_FOV - BASE_FOV) * smoothstepRange(0.15, 1, thresholdT)
      : BASE_FOV
    if (Math.abs(fov - gl.camera.fov) > 0.01) {
      gl.camera.fov = fov
      gl.camera.updateProjectionMatrix()
      fitRasterQuad()
    }
    gl.camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2])
    gl.camera.lookAt(
      cameraPosition[0] + lookDirection[0] * 100,
      cameraPosition[1] + lookDirection[1] * 100,
      cameraPosition[2] + lookDirection[2] * 100,
    )
  }

  const focusSlot = (): number => threshold?.slot ?? waypoint?.slot ?? closedSlot ?? 0

  const draw = (now: number, dtMs: number, input: ConstellationStageInput) => {
    if (!gl || !pulseField) return
    const store = getConstellationStore()
    const nodes = store.nodes
    const audible = input.rhythm?.active === true
    tick += 1

    activity = stepActivity(activity, audible, input.energy, dtMs)
    store.metabolism = stepMetabolism(store.metabolism, input.regime, input.perceptualPressure, dtMs, audible)
    const metabolism = store.metabolism
    const focus = focusSlot()

    // Il nodo della soglia non deriva: la camera lo attraversa.
    stepDrift(nodes, dtMs, activity, metabolism.contraction, focus, tick, threshold?.slot ?? null)
    computeConnections(
      nodes,
      BASE_MIN_DISTANCE * metabolism.linkReach * (input.lowPowerMode ? 0.8 : 1),
      nodes.length,
      edges,
    )
    ingestRhythm(pulseField, input.rhythm, focus, edges, metabolism.beatSensitivity, now)
    stepPulses(nodes, pulseField, now, dtMs, pulseDecayMs(input.motionProfile))
    updateCameraView(dtMs)

    const envelope = threshold ? thresholdEnvelope(thresholdT) : null
    const crossing = threshold
      ? Math.exp(-(((thresholdT - CROSSING_AT) / CROSSING_WIDTH) ** 2))
      : 0
    // Il nodo d'arrivo resta acceso e pulsante per tutto l'avvicinamento.
    if (threshold) {
      const node = nodes[threshold.slot]
      node.pulse = Math.max(node.pulse, 0.55 + 0.45 * smoothstepRange(0, 0.6, thresholdT))
    }
    const thresholdNode = threshold ? nodes[threshold.slot] : null
    const storyColor: Vec3 | null =
      threshold?.raster?.color ??
      (thresholdNode ? nodeColor(thresholdNode, thresholdNode.hue, metabolism, true, [0, 0, 0]) : null)
    const others = envelope?.others ?? 1

    // Campo: il fondo prende il colore della storia.
    const field = envelope?.field ?? 0
    if (storyColor) {
      // Lampo d'attraversamento: il campo si accende oltre il colore della
      // storia, poi ci si assesta.
      const bright = (c: number) => Math.min(1, c * 1.8 + 0.25)
      clearColor.setRGB(
        lerp(lerp(BACKGROUND[0], storyColor[0], field), bright(storyColor[0]), crossing * 0.85),
        lerp(lerp(BACKGROUND[1], storyColor[1], field), bright(storyColor[1]), crossing * 0.85),
        lerp(lerp(BACKGROUND[2], storyColor[2], field), bright(storyColor[2]), crossing * 0.85),
        THREE.SRGBColorSpace,
      )
    } else {
      clearColor.setRGB(BACKGROUND[0], BACKGROUND[1], BACKGROUND[2], THREE.SRGBColorSpace)
    }
    gl.renderer.setClearColor(clearColor, 1)
    gl.fog.color.copy(clearColor)

    const focusHue = nodes[focus]?.hue ?? 0
    const positions = gl.pointPositions.array as Float32Array
    const colors = gl.pointColors.array as Float32Array
    const scales = gl.pointScales.array as Float32Array
    const haloColors = gl.haloColors.array as Float32Array
    const haloScales = gl.haloScales.array as Float32Array
    for (const node of nodes) {
      const i = node.slot
      const isFocus = i === focus
      const isThreshold = threshold?.slot === i
      positions[i * 3] = node.position[0]
      positions[i * 3 + 1] = node.position[1]
      positions[i * 3 + 2] = node.position[2]
      nodeColor(node, focusHue, metabolism, isFocus, rgb)
      // I nodi sfiorati dalla camera si sciolgono invece di accecare.
      const distance = distanceBetween(node.position, cameraPosition)
      let core: number
      let haloGain = smoothstepRange(80, 320, distance)
      let haloGrow = 0
      if (isThreshold && envelope) {
        // MASSA: il nodo prende il colore della storia e si espande, poi il
        // suo punto si scioglie nel campo.
        if (storyColor) {
          for (let c = 0; c < 3; c++) rgb[c] = lerp(rgb[c], storyColor[c], envelope.halo)
        }
        core = Math.min(1.6, envelope.core + crossing)
        haloGain = Math.max(1 - envelope.field, crossing)
        haloGrow = envelope.halo + crossing * 2.5
      } else {
        core = smoothstepRange(30, 160, distance) * others
        haloGain *= others
      }
      if (glitch > 0.02) {
        // L'interferenza arriva ai neuroni: sfarfallano e sobbalzano.
        const flicker = hashUnit(i * 13 + glitchSeed * 7)
        core *= 1 - glitch * 0.75 + glitch * 1.5 * flicker
        positions[i * 3] += (hashUnit(i * 5 + glitchSeed * 11) - 0.5) * glitch * 14
        positions[i * 3 + 1] += (hashUnit(i * 9 + glitchSeed * 3) - 0.5) * glitch * 6
      }
      colors[i * 3] = rgb[0] * core
      colors[i * 3 + 1] = rgb[1] * core
      colors[i * 3 + 2] = rgb[2] * core
      scales[i] = (isFocus ? 1.25 : 1) + node.pulse * 0.75 + node.memory * 0.15
      const halo = (0.08 + node.pulse * 0.55 + node.memory * 0.1 + (isFocus ? 0.06 : 0) + haloGrow * 0.5) * haloGain
      haloColors[i * 3] = rgb[0] * halo
      haloColors[i * 3 + 1] = rgb[1] * halo
      haloColors[i * 3 + 2] = rgb[2] * halo
      haloScales[i] = 1 + node.pulse * 1.1 + node.memory * 0.2 + haloGrow * 3
    }

    // Le linee prendono il colore dei nodi che congiungono: cambiano con
    // loro al beat e si accendono dove passa l'impulso.
    const linePositions = gl.linePositions.array as Float32Array
    const lineColors = gl.lineColors.array as Float32Array
    let offset = 0
    for (const edge of edges) {
      const a = nodes[edge.a]
      const b = nodes[edge.b]
      const interference =
        glitch > 0.02 ? 1 - glitch + glitch * 1.8 * hashUnit(edge.a * 31 + edge.b * 7 + glitchSeed) : 1
      // I legami del nodo d'arrivo convergono e si accendono.
      const toThreshold =
        envelope && threshold && (edge.a === threshold.slot || edge.b === threshold.slot)
          ? 1 + 3 * envelope.halo
          : 1
      const alpha =
        edge.strength * metabolism.linkGain * (0.22 + 0.78 * Math.max(a.pulse, b.pulse)) *
        Math.max(others, toThreshold > 1 ? 1 - envelope!.field : 0) * interference * toThreshold
      linePositions[offset] = a.position[0]
      linePositions[offset + 1] = a.position[1]
      linePositions[offset + 2] = a.position[2]
      linePositions[offset + 3] = b.position[0]
      linePositions[offset + 4] = b.position[1]
      linePositions[offset + 5] = b.position[2]
      lineColors[offset] = colors[edge.a * 3] * alpha
      lineColors[offset + 1] = colors[edge.a * 3 + 1] * alpha
      lineColors[offset + 2] = colors[edge.a * 3 + 2] * alpha
      lineColors[offset + 3] = colors[edge.b * 3] * alpha
      lineColors[offset + 4] = colors[edge.b * 3 + 1] * alpha
      lineColors[offset + 5] = colors[edge.b * 3 + 2] * alpha
      offset += 6
    }
    gl.lineGeometry.setDrawRange(0, offset / 3)

    // RASTER: la materia della storia emerge per soglia di luminanza.
    const showRaster = Boolean(threshold?.texture && envelope && envelope.threshold < RASTER_THRESHOLD_HIDDEN - 0.01)
    gl.rasterQuad.visible = showRaster
    if (showRaster && envelope) gl.rasterMaterial.uniforms.threshold.value = envelope.threshold

    gl.pointPositions.needsUpdate = true
    gl.pointColors.needsUpdate = true
    gl.pointScales.needsUpdate = true
    gl.haloColors.needsUpdate = true
    gl.haloScales.needsUpdate = true
    gl.linePositions.needsUpdate = true
    gl.lineColors.needsUpdate = true
    renderFrame(now)
  }

  // Fasce orizzontali della stessa scena ridisegnate spostate (scissor +
  // viewport di Three.js), poi ricomposte mentre il glitch decade.
  const renderFrame = (now: number) => {
    if (!gl) return
    const renderer = gl.renderer
    const tvOn = glitch >= 0.02
    gl.tvQuad.visible = tvOn
    if (tvOn) {
      renderer.getSize(viewSize)
      gl.tvMaterial.uniforms.intensity.value = glitch
      gl.tvMaterial.uniforms.time.value = now / 1000
      gl.tvMaterial.uniforms.lines.value = Math.max(120, viewSize.y / 2)
    }
    renderer.render(gl.scene, gl.camera)
    if (!tvOn) return
    if (now - glitchSeedAt >= GLITCH_RESEED_MS) {
      glitchSeed += 1
      glitchSeedAt = now
    }
    renderer.getSize(viewSize)
    const width = viewSize.x
    const height = viewSize.y
    renderer.setScissorTest(true)
    let y = 0
    for (let band = 0; band < GLITCH_BANDS && y < height; band++) {
      const bandHeight = Math.max(8, Math.round(height * (0.04 + hashUnit(glitchSeed * 31 + band) * 0.16)))
      const gap = Math.round(height * hashUnit(glitchSeed * 17 + band * 3) * 0.12)
      y += gap
      const shift = (hashUnit(glitchSeed * 13 + band * 7) - 0.5) * 2 * GLITCH_MAX_SHIFT_PX * glitch
      renderer.setScissor(0, y, width, bandHeight)
      renderer.setViewport(shift, 0, width, height)
      renderer.render(gl.scene, gl.camera)
      y += bandHeight
    }
    renderer.setScissorTest(false)
    renderer.setViewport(0, 0, width, height)
  }

  return {
    start({ closedStoryId, closingRaster }) {
      cleanup()
      const store = getConstellationStore()
      closedSlot = closedStoryId === null ? null : slotForStory(closedStoryId, store.nodes.length)
      if (closedSlot !== null) {
        // La storia appena vissuta lascia un residuo nel suo nodo (brief §27).
        const node = store.nodes[closedSlot]
        node.memory = Math.min(1, node.memory + MEMORY_ON_VISIT)
      }
      try {
        gl = build(lowPowerAtStart)
      } catch {
        closingRaster?.bitmap.close?.()
        cleanup()
        return false
      }
      pulseField = createPulseField(store.nodes.length)
      window.addEventListener('resize', resize)
      resize()
      activity = 0
      overlay.style.display = 'block'
      overlayOpacity = 0
      if (closedSlot !== null) {
        // Si esce dal nodo della storia conclusa come ci si era entrati:
        // stessa soglia all'indietro, avanzando verso l'interno della rete.
        const node = nodePosition(closedSlot)
        const seed = hashUnit(closedSlot * 17 + giro)
        cameraDirection = normalizeOutward(node, seed)
        for (let axis = 0; axis < 3; axis++) {
          cameraPosition[axis] = node[axis] - cameraDirection[axis] * INSIDE_DISTANCE
          lookDirection[axis] = cameraDirection[axis]
        }
        openThreshold(closedSlot, closingRaster)
        thresholdT = 1
        fadeInMs = closingRaster ? LEAVE_FADE_IN_MS : BOOT_FADE_IN_MS
        phase = 'leave'
      } else {
        // All'avvio si parte già dentro la costellazione, in movimento.
        cameraPosition.splice(0, 3, 0, 0, 0)
        cameraDirection = [0.28, 0.06, -0.96]
        lookDirection.splice(0, 3, ...cameraDirection)
        fadeInMs = BOOT_FADE_IN_MS
        phase = 'travel'
        beginGiro()
      }
      return true
    },

    setTarget(storyId, raster, options) {
      if (phase === 'idle' || phase === 'enter' || phase === 'handoff') {
        raster?.bitmap.close?.()
        return false
      }
      const nodeCount = getConstellationStore().nodes.length
      let slot = slotForStory(storyId, nodeCount)
      // Mai rientrare in una storia nuova dal nodo appena lasciato.
      if (!options?.revisit && slot === closedSlot) slot = (slot + 1) % nodeCount
      target?.raster?.bitmap.close?.()
      target = { storyId, slot, raster }
      return true
    },

    awaitingTarget() {
      return phase === 'travel' && giroRemainingMs <= 0 && target === null
    },

    update(dtMs, now, input) {
      lowPowerAtStart = input.lowPowerMode
      if (phase === 'idle' || !gl) return null
      // Dopo un fermo del main thread o della GPU il moto riprende da dove si
      // era fermato: niente balzo in avanti per recuperare il tempo perso.
      const dt = Math.max(0, Math.min(MAX_FRAME_STEP_MS, dtMs))
      if (dtMs > STALL_THRESHOLD_MS) glitch = 1
      else glitch *= Math.exp(-Math.max(0, dtMs) / GLITCH_DECAY_MS)
      let event: 'entered' | null = null
      if (phase === 'handoff') {
        overlayOpacity = Math.max(0, overlayOpacity - dt / HANDOFF_MS)
        if (overlayOpacity <= 0) {
          cleanup()
          return null
        }
      } else {
        overlayOpacity = Math.min(1, overlayOpacity + dt / fadeInMs)
        event = navigate(dt)
      }
      draw(now, dt, input)
      overlay.style.opacity = String(overlayOpacity * overlayOpacity * (3 - 2 * overlayOpacity))
      return event
    },

    isBusy() {
      return phase !== 'idle'
    },

    isCovering() {
      return phase !== 'idle' && phase !== 'handoff' && overlayOpacity >= 1
    },

    destroy() {
      cleanup()
      overlay.remove()
    },
  }
}

// Direzione d'uscita dal nodo: verso l'interno della rete (il centro), con
// una deviazione per nodo, così dopo la storia si è di nuovo dentro la
// costellazione.
function normalizeOutward(node: Vec3, seed: number): Vec3 {
  const inward: Vec3 = [-node[0], -node[1], -node[2]]
  const length = Math.hypot(inward[0], inward[1], inward[2])
  const base: Vec3 = length < 1 ? [0, 0, -1] : [inward[0] / length, inward[1] / length, inward[2] / length]
  const angle = seed * Math.PI * 2
  const swirl: Vec3 = [Math.cos(angle) * 0.45, Math.sin(angle) * 0.25, Math.sin(angle) * 0.45]
  const v: Vec3 = [base[0] + swirl[0], base[1] + swirl[1], base[2] + swirl[2]]
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}
