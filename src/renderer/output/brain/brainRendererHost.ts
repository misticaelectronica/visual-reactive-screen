import type { AppSettings, BandEnergies, BrainRendererId } from '@shared/types'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainRhythmState } from './brainRhythm'
import type {
  BrainFlashState,
  BrainMorphShape,
  BrainSceneRendererController,
} from './brainSvgScene'
import type {
  BrainRendererPluginContext,
  BrainRendererRegistry,
} from './brainRendererPlugin'
import { brainLog, brainWarn } from './brainLog'
import type { BrainBioPerceptionState, BrainBioRegime } from './brainBioPerception'

const SWITCH_DURATION_MS = 1_800
const SWITCH_TIMEOUT_MS = 15_000
// **Varco Percettivo** — nome condiviso con la Direzione VJ (Capo Supremo
// del Visual) per questa composizione di flash + strisce glitch + mix
// passthrough FilterPsiche/Psycho2D: un breve "sipario sensoriale" che
// segnala e maschera un momento in cui la visuale reale sta per
// interrompersi (carico GPU da denoising, e — da PIANO-039bis, vedi
// `brainController.ts` — anche l'inizio del moto di coscienza, che
// congela la timeline della storia allo stesso modo). Stesso segnale
// (`visualPressurePulseUntil`/`setResourcePressure`), trigger diversi:
// non è un effetto nuovo per ogni occasione, è un unico linguaggio
// riusato ovunque la continuità visiva stia per rompersi.
// Il controller può armare `resourcePressure` prima del carico noto e ora
// interroga `isResourcePressureReady`: la GPU non parte finché FilterPsiche
// non è completamente dentro il Varco. Gli stalli imprevedibili restano
// coperti dal medesimo segnale reattivo. Non è reattività musicale (Check
// Silenzio): nasce soltanto da pressione GPU, mai dall'audio.
// Rinforzato su richiesta esplicita del Capo Supremo ("Glitch+Flash più
// evidenti", 2026-08-25): il mascheramento precedente restava troppo
// discreto per coprire davvero il momento del carico, anche con il
// semaforo proattivo che lo arma in anticipo.
//
// AGGIORNAMENTO (brief del braccio destro, punto 3): quel rinforzo resta
// valido per uno stallo GPU reale in qualunque regime — non è in
// contraddizione. Ma nel RESPIRO PROFONDO il flash pieno leggerebbe come un
// nuovo scatto di attenzione dentro una fase che deve restare bassa e
// aperta (Check Silenzio): lì il flash va a zero, resta solo il glitch a
// intensità minima — sufficiente a non far leggere il taglio tecnico come
// un blocco, senza produrre un accento visivo che il respiro non deve
// avere. Fuori dal respiro stabile nessun cambiamento: intensità piena
// come sempre.
const PRESSURE_FLASH_ATTACK_MS = 32
const PRESSURE_FLASH_DECAY_MS = 220
const PRESSURE_FLASH_PEAK_OPACITY = 0.85
const RESPIRO_PROFONDO_FLASH_MULTIPLIER = 0
// Collaudo Visual 2026-08-31: le slice di glitch al 25% con tinte sature
// (cyan/magenta/giallo) restano chiare e brevi, ma la disposizione è "scuro
// predominante". Moltiplicatore abbassato E tinte sostituite con toni
// organici scuri (`PRESSURE_GLITCH_TINTS_DARK`, sotto).
const RESPIRO_PROFONDO_GLITCH_MULTIPLIER = 0.1
function pressureFlashRegimeMultipliers(
  regime: BrainBioRegime | undefined,
): { flash: number; glitch: number } {
  if (regime === 'respiro-profondo') {
    return { flash: RESPIRO_PROFONDO_FLASH_MULTIPLIER, glitch: RESPIRO_PROFONDO_GLITCH_MULTIPLIER }
  }
  return { flash: 1, glitch: 1 }
}
const PRESSURE_GLITCH_SLICE_COUNT = 7
const PRESSURE_GLITCH_MAX_OFFSET_PX = 26
const PRESSURE_GLITCH_PEAK_OPACITY = 0.7
const PRESSURE_GLITCH_TINTS = [
  'rgba(70,225,255,0.75)',
  'rgba(255,70,195,0.72)',
  'rgba(255,225,70,0.6)',
] as const
// Respiro Profondo: toni organici scuri (petrolio, viola ematico, ruggine
// annerita) al posto delle tinte sature — "scuro predominante" anche nel
// Varco (collaudo Visual 2026-08-31).
const PRESSURE_GLITCH_TINTS_DARK = [
  'rgba(22,40,44,0.55)',
  'rgba(46,26,40,0.5)',
  'rgba(48,32,20,0.45)',
] as const

function glitchTintFor(regime: BrainBioRegime | undefined, index: number): string {
  const set = regime === 'respiro-profondo' ? PRESSURE_GLITCH_TINTS_DARK : PRESSURE_GLITCH_TINTS
  return set[index % set.length]
}

type RendererLayer = {
  id: BrainRendererId
  root: HTMLDivElement
  controller: BrainSceneRendererController
  requestedAt: number
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smootherstep(value: number): number {
  const x = clamp(value)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

// --- CONTAMINATION — Transition System, Slice 01 (brief Visual definitivo
// "Slice 01", via libera Consigliere 2026-09-09) -------------------------
//
// Morph -> Morph SULLA STESSA IMMAGINE non e' un crossfade simmetrico.
// L'ingresso di B precede l'uscita di A; nella fascia centrale entrambi
// restano alti (la somma delle opacita' supera 1) e la stessa figura mostra
// insieme le due grammatiche. Solo host: nessuno stato ereditato, nessun
// framebuffer, nessun compositing nuovo (brief §12/§13). Ambito ristretto a
// questo solo caso (brief §25): image->image, cambio raster, INHERITANCE ecc.
// restano fuori.
const CONTAMINATION_DURATION_MS = 3_400
// Tetto di opacita' in coesistenza: mentre convivono, nessuno dei due copre
// del tutto l'altro, cosi' la fascia ibrida resta leggibile (brief §17).
const CONTAMINATION_COEXIST_CAP = 0.82
// Blend del SOLO layer entrante durante la coesistenza; 'normal' fuori. Stesso
// meccanismo CSS gia' usato per denoisingPsycho2d ('lighten') e per la
// Riattivazione ('lighter') — non e' compositing nuovo ai sensi del §13.
const CONTAMINATION_COEXIST_BLEND = 'overlay'
// Coppie (from->to) per cui la contaminazione risulta percettivamente sporca:
// tornano al crossfade simmetrico. VUOTO: si popola SOLO al collaudo — il §24
// dice che la contaminazione non si forza dove sporca, non che si escluda per
// prudenza.
const CONTAMINATION_EXCLUDED_PAIRS = new Set<string>([])

/** Inviluppo asimmetrico della Slice 01. `t` in [0,1].
 *  - `inOpacity`: ingresso anticipato di B (sale entro ~il 40% della
 *    transizione, poi resta alto);
 *  - `outOpacity`: uscita ritardata di A (piena fino a ~meta', poi cede);
 *  - nel centro entrambe alte (somma > 1) = coesistenza; li' un tetto morbido
 *    tiene i due sotto 1 senza produrre scatti ai bordi della fascia.
 */
function contaminationEnvelope(t: number, cap: number): {
  inOpacity: number; outOpacity: number; coexisting: boolean
} {
  const x = clamp(t)
  const rawIn = smootherstep(x / 0.4)
  const rawOut = 1 - smootherstep((x - 0.5) / 0.5)
  // 0 ai bordi, ~1 nel centro: quanto la coesistenza e' piena.
  const central = smootherstep(rawIn) * smootherstep(rawOut)
  const blendCap = (raw: number) => raw * (1 - central) + Math.min(raw, cap) * central
  return {
    inOpacity: blendCap(rawIn),
    outOpacity: blendCap(rawOut),
    coexisting: central > 0.25,
  }
}

export function createBrainRendererHost(
  container: HTMLElement,
  registry: BrainRendererRegistry,
  pluginContext: Omit<BrainRendererPluginContext, 'container'>,
  getRendererId: (settings: AppSettings, now: number) => BrainRendererId,
  initialRendererId: BrainRendererId,
  getBoostHint?: () => boolean,
  onRendererFailed?: (id: BrainRendererId, settings: AppSettings, now: number) => void,
  // PIANO-040 (brief §4/§17.1): regime bio-percettivo corrente — usato solo
  // per scegliere la rete di sicurezza (sotto). Opzionale, retrocompatibile:
  // senza di esso il comportamento resta quello di sempre (`print2d` durante
  // la Riattivazione).
  getBioRegime?: () => BrainBioRegime,
  // Rete di sicurezza al failure di un renderer: elenco dei renderer eleggibili
  // per lo stato/regime corrente (di norma `BrainRendererSelector.eligibleRenderers`).
  // Se presente, il sostituto e' scelto a caso qui dentro invece di essere
  // fissato su FilterPsiche. Opzionale, retrocompatibile.
  getEligibleRenderers?: () => BrainRendererId[],
): BrainSceneRendererController {
  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    contain: 'layout style paint',
  })
  container.appendChild(root)

  let destroyed = false
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let resourcePressure = false
  let offlineHold = false
  let transitionProgress = 1
  let transitionRole: 'enter' | 'exit' = 'enter'
  let switchStartedAt: number | null = null
  // CONTAMINATION: il blend del layer entrante si accende/spegne una sola
  // volta per fascia, non ad ogni frame.
  let contaminationBlendOn = false
  let latestPerception: BrainBioPerceptionState | null = null
  const retryRendererAfter = new Map<BrainRendererId, number>()

  let pressureFlashOverlay: HTMLDivElement | null = null
  let pressureFlashStartedAt: number | null = null
  // `setResourcePressure` non riceve il tempo di `update()`: il fronte di
  // salita si registra qui e l'orologio del flash parte al successivo
  // `update()`, restando nello stesso dominio temporale di `time` (RAF).
  let pressureFlashArmed = false
  const ensurePressureFlashOverlay = (): HTMLDivElement => {
    if (!pressureFlashOverlay) {
      pressureFlashOverlay = document.createElement('div')
      pressureFlashOverlay.dataset.brainPressureFlash = 'true'
      Object.assign(pressureFlashOverlay.style, {
        position: 'absolute',
        inset: '0',
        opacity: '0',
        pointerEvents: 'none',
        backgroundColor: '#ffffff',
        mixBlendMode: 'screen',
        zIndex: '3',
      })
      root.appendChild(pressureFlashOverlay)
    }
    return pressureFlashOverlay
  }

  // Poche strisce sottili, sfalsate orizzontalmente e tinte in ciano/
  // magenta (stessa frangia cromatica già usata altrove nel codebase per i
  // glitch) sopra il renderer bloccato: costo nullo per frame, sono
  // elementi CSS statici ristilizzati solo al momento dell'armo (non ad
  // ogni frame), l'opacità segue lo stesso inviluppo del flash.
  let pressureGlitchSlices: HTMLDivElement[] = []
  // Offset di base e velocità di deriva per striscia, fissati all'armo:
  // il jitter per-frame (sotto, nello stesso punto che già aggiorna
  // l'opacità) oscilla ATTORNO a questi valori, non li rimpiazza — così
  // ogni comparsa ha una propria "corsa" ma resta stabile fra un frame e
  // l'altro, non un tremolio casuale ad ogni tick.
  let pressureGlitchBaseOffsets: number[] = []
  let pressureGlitchDriftSpeeds: number[] = []
  const armPressureGlitchSlices = (): void => {
    if (pressureGlitchSlices.length === 0) {
      pressureGlitchSlices = Array.from({ length: PRESSURE_GLITCH_SLICE_COUNT }, () => {
        const slice = document.createElement('div')
        slice.dataset.brainPressureGlitchSlice = 'true'
        Object.assign(slice.style, {
          position: 'absolute',
          left: '0',
          right: '0',
          opacity: '0',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          zIndex: '3',
        })
        root.appendChild(slice)
        return slice
      })
    }
    pressureGlitchBaseOffsets = []
    pressureGlitchDriftSpeeds = []
    pressureGlitchSlices.forEach((slice, index) => {
      const top = 6 + Math.random() * 84
      const height = 2 + Math.random() * 5
      const offset = (Math.random() - 0.5) * 2 * PRESSURE_GLITCH_MAX_OFFSET_PX
      pressureGlitchBaseOffsets.push(offset)
      pressureGlitchDriftSpeeds.push(0.012 + Math.random() * 0.02)
      Object.assign(slice.style, {
        top: `${top.toFixed(1)}%`,
        height: `${height.toFixed(1)}%`,
        transform: `translateX(${offset.toFixed(1)}px)`,
        backgroundColor: glitchTintFor(getBioRegime?.(), index),
      })
    })
  }

  const createLayer = (id: BrainRendererId, now: number): RendererLayer => {
    const plugin = registry.get(id) ?? registry.get('print2d')
    if (!plugin) throw new Error(`Renderer Brain non registrato: ${id}`)
    const layerRoot = document.createElement('div')
    Object.assign(layerRoot.style, {
      position: 'absolute',
      inset: '0',
      opacity: '1',
      pointerEvents: 'none',
      contain: 'layout style paint',
      zIndex: '1',
    })
    root.appendChild(layerRoot)
    const controller = plugin.create({ ...pluginContext, container: layerRoot })
    controller.setMorphPattern(morphPattern)
    controller.setResourcePressure(resourcePressure)
    if (latestPerception) controller.setPerception?.(latestPerception)
    controller.setTransition(transitionProgress, transitionRole)
    return { id: plugin.id, root: layerRoot, controller, requestedAt: now }
  }

  let active = createLayer(initialRendererId, performance.now())
  root.dataset.activeRenderer = active.id
  let incoming: RendererLayer | null = null
  // Costruiti solo alla prima vera pressione risorse, non a ogni cambio di
  // fotogramma: quasi sempre non serve (nessuna transizione lo richiede),
  // quindi non vale la pena pagarne il costo di creazione ogni volta.
  let denoisingFilterPsiche: RendererLayer | null = null
  const ensureDenoisingFilterPsiche = (now: number): RendererLayer => {
    if (!denoisingFilterPsiche) {
      denoisingFilterPsiche = createLayer('filter-psiche', now)
      denoisingFilterPsiche.root.dataset.brainDenoisingFilterPsiche = 'true'
      denoisingFilterPsiche.root.style.opacity = '0'
      denoisingFilterPsiche.root.style.zIndex = '2'
      denoisingFilterPsiche.controller.setResourcePressure(true)
    }
    return denoisingFilterPsiche
  }
  // Secondo strato, leggero quanto il primo (stessa risoluzione/fps ridotti
  // del passthrough): sovrapposto in 'lighten' a FilterPsiche per dare il
  // "mix" di movimento richiesto durante il denoising, senza sostituirlo —
  // resta un accento (opacità ridotta rispetto al primo), non un secondo
  // renderer a pieno carico.
  let denoisingPsycho2d: RendererLayer | null = null
  const ensureDenoisingPsycho2d = (now: number): RendererLayer => {
    if (!denoisingPsycho2d) {
      denoisingPsycho2d = createLayer('psycho2d', now)
      denoisingPsycho2d.root.dataset.brainDenoisingPsycho2d = 'true'
      denoisingPsycho2d.root.style.opacity = '0'
      denoisingPsycho2d.root.style.zIndex = '2'
      denoisingPsycho2d.root.style.mixBlendMode = 'lighten'
      denoisingPsycho2d.controller.setResourcePressure(true)
    }
    return denoisingPsycho2d
  }
  const DENOISING_MIX_OPACITY_FACTOR = 0.6
  let passthroughState: 'idle' | 'entering' | 'active' | 'exiting' = 'idle'
  let passthroughStartedAt = 0
  let passthroughStartOpacity = 0
  let passthroughOpacity = 0
  let lastPassthroughPluginUpdateAt = Number.NEGATIVE_INFINITY

  const destroyLayer = (layer: RendererLayer | null): void => {
    if (!layer) return
    layer.controller.destroy()
    layer.root.remove()
  }

  const requestRenderer = (id: BrainRendererId, now: number): void => {
    if (id === active.id) {
      if (incoming) {
        destroyLayer(incoming)
        incoming = null
        switchStartedAt = null
        contaminationBlendOn = false
        active.root.style.opacity = '1'
      }
      return
    }
    if (now < (retryRendererAfter.get(id) ?? 0)) return
    if (incoming?.id === id) return
    destroyLayer(incoming)
    incoming = null
    switchStartedAt = null
    contaminationBlendOn = false
    try {
      incoming = createLayer(id, now)
      incoming.root.style.opacity = '0'
      brainLog('render', 'cambio renderer Brain preparato', {
        from: active.id,
        to: incoming.id,
      })
    } catch (error) {
      brainWarn('render', 'renderer Brain non creato; mantengo quello attivo', {
        requested: id,
        active: active.id,
        error,
      })
    }
  }

  return {
    element: root,
    isReady: () => active.controller.isReady?.() !== false,
    setOpacity(opacity) {
      root.style.opacity = String(clamp(opacity))
    },
    getMorphShapes(): BrainMorphShape[] {
      return active.controller.getMorphShapes()
    },
    setMorphPattern(pattern) {
      morphPattern = pattern
      active.controller.setMorphPattern(pattern)
      incoming?.controller.setMorphPattern(pattern)
      denoisingFilterPsiche?.controller.setMorphPattern(pattern)
      denoisingPsycho2d?.controller.setMorphPattern(pattern)
    },
    setResourcePressure(activePressure) {
      if (resourcePressure === activePressure) return
      resourcePressure = activePressure
      if (activePressure) {
        ensurePressureFlashOverlay()
        armPressureGlitchSlices()
        pressureFlashArmed = true
      }
      active.controller.setResourcePressure(activePressure)
      incoming?.controller.setResourcePressure(activePressure)
    },
    isResourcePressureReady() {
      return resourcePressure && passthroughState === 'active'
    },
    setPerception(state) {
      latestPerception = state
      active.controller.setPerception?.(state)
      incoming?.controller.setPerception?.(state)
      denoisingFilterPsiche?.controller.setPerception?.(state)
      denoisingPsycho2d?.controller.setPerception?.(state)
    },
    setOfflineHold(activeHold) {
      if (offlineHold === activeHold) return
      offlineHold = activeHold
      root.dataset.brainOfflineHold = activeHold ? 'active' : 'idle'
    },
    setTransition(progress, role, counterpartShapes) {
      transitionProgress = clamp(progress)
      transitionRole = role
      denoisingFilterPsiche?.controller.setTransition(progress, role, counterpartShapes)
      denoisingPsycho2d?.controller.setTransition(progress, role, counterpartShapes)
      active.controller.setTransition(progress, role, counterpartShapes)
      incoming?.controller.setTransition(progress, role, counterpartShapes)
    },
    update(
      bands: BandEnergies,
      settings: AppSettings,
      time: number,
      rhythm?: BrainRhythmState,
      movingAverages?: BandEnergies,
      flash?: BrainFlashState,
    ) {
      if (destroyed) return
      if (pressureFlashArmed) {
        pressureFlashArmed = false
        pressureFlashStartedAt = time
      }
      // La preparazione del passthrough (createImageBitmap + trasformazione
      // pixel per pixel, tre varianti) può richiedere anche 1-2s — durante
      // quell'attesa il fotogramma bloccato del renderer attivo restava
      // visibile ben oltre il breve flash pensato per coprire un cambio
      // istantaneo (segnalato dal Capo Supremo). Il flash ora resta al
      // picco finché il passthrough non è davvero pronto, invece di
      // spegnersi dopo un tempo fisso troppo corto per l'attesa reale — non
      // costa nulla in più: usa lo stesso `ensureDenoisingFilterPsiche` già
      // chiamato subito sotto, solo spostato prima.
      const passthrough = resourcePressure && BRAIN_CONFIG.lightweightDenoisingRender
        ? ensureDenoisingFilterPsiche(time)
        : null
      const passthroughReady = passthrough !== null && passthrough.controller.isReady?.() !== false
      if (pressureFlashStartedAt !== null) {
        const elapsed = time - pressureFlashStartedAt
        const totalMs = PRESSURE_FLASH_ATTACK_MS + PRESSURE_FLASH_DECAY_MS
        const holding = resourcePressure && !passthroughReady
        if (!holding && elapsed >= totalMs) {
          pressureFlashStartedAt = null
          if (pressureFlashOverlay) pressureFlashOverlay.style.opacity = '0'
          pressureGlitchSlices.forEach((slice) => { slice.style.opacity = '0' })
        } else {
          const intensity = elapsed < PRESSURE_FLASH_ATTACK_MS
            ? elapsed / PRESSURE_FLASH_ATTACK_MS
            : holding
              ? 1
              : 1 - (elapsed - PRESSURE_FLASH_ATTACK_MS) / PRESSURE_FLASH_DECAY_MS
          const clamped = clamp(intensity)
          const regimeMultipliers = pressureFlashRegimeMultipliers(getBioRegime?.())
          if (pressureFlashOverlay) {
            pressureFlashOverlay.style.opacity =
              String(clamped * PRESSURE_FLASH_PEAK_OPACITY * regimeMultipliers.flash)
          }
          const glitchRegime = getBioRegime?.()
          pressureGlitchSlices.forEach((slice, index) => {
            slice.style.opacity =
              String(clamped * PRESSURE_GLITCH_PEAK_OPACITY * regimeMultipliers.glitch)
            slice.style.backgroundColor = glitchTintFor(glitchRegime, index)
            const base = pressureGlitchBaseOffsets[index] ?? 0
            const speed = pressureGlitchDriftSpeeds[index] ?? 0.016
            const jitter = Math.sin(elapsed * speed + index * 2.4) * PRESSURE_GLITCH_MAX_OFFSET_PX * 0.6
            slice.style.transform = `translateX(${(base + jitter).toFixed(1)}px)`
          })
        }
      }
      if (passthrough) {
        const bioRegime = getBioRegime?.()
        const regimeAllowsPsycho2d = bioRegime !== 'decompression' && bioRegime !== 'respiro-profondo'
        const mix = regimeAllowsPsycho2d ? ensureDenoisingPsycho2d(time) : null
        if (!regimeAllowsPsycho2d && denoisingPsycho2d) {
          denoisingPsycho2d.root.style.opacity = '0'
        }
        if (passthroughReady) {
          if (passthroughState === 'idle' || passthroughState === 'exiting') {
            passthroughState = 'entering'
            passthroughStartedAt = time
            passthroughStartOpacity = passthroughOpacity
            root.dataset.brainDenoisingFilterPsiche = 'entering'
            brainLog('render', 'denoising-filter-psiche: active', {
              renderer: active.id,
            })
          }
          const progress = smootherstep(
            (time - passthroughStartedAt) /
              BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
          )
          passthroughOpacity = passthroughStartOpacity +
            (1 - passthroughStartOpacity) * progress
          passthrough.root.style.opacity = String(passthroughOpacity)
          passthrough.controller.update(
            bands,
            settings,
            time,
            rhythm,
            movingAverages,
            flash,
          )
          // Psycho2D si aggiunge solo quando è pronto (createImageBitmap
          // può richiedere qualche frame in più della prima volta): finché
          // non lo è resta a opacità 0, senza bloccare FilterPsiche.
          if (mix) {
            const mixReady = mix.controller.isReady?.() !== false
            mix.root.style.opacity = mixReady
              ? String(passthroughOpacity * DENOISING_MIX_OPACITY_FACTOR)
              : '0'
            mix.controller.update(bands, settings, time, rhythm, movingAverages, flash)
          }
          const pluginFrameInterval = settings.lowPowerMode
            ? 1_000 / BRAIN_CONFIG.lowPowerDenoisingPassthroughPluginFps
            : 1_000 / BRAIN_CONFIG.denoisingPassthroughPluginFps
          if (
            (passthroughState === 'entering' || passthroughState === 'active') &&
            time - lastPassthroughPluginUpdateAt >= pluginFrameInterval
          ) {
            lastPassthroughPluginUpdateAt = time
            active.controller.update(bands, settings, time, rhythm, movingAverages, flash)
          }
          if (progress >= 1) {
            passthroughState = 'active'
            root.dataset.brainDenoisingFilterPsiche = 'active'
          }
          return
        }
      }

      if (passthroughState === 'entering' || passthroughState === 'active') {
        passthroughState = 'exiting'
        passthroughStartedAt = time
        passthroughStartOpacity = passthroughOpacity
        root.dataset.brainDenoisingFilterPsiche = 'exiting'
      }
      if (passthroughState === 'exiting' && denoisingFilterPsiche) {
        const progress = smootherstep(
          (time - passthroughStartedAt) /
            BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
        )
        passthroughOpacity = passthroughStartOpacity * (1 - progress)
        denoisingFilterPsiche.root.style.opacity = String(passthroughOpacity)
        denoisingFilterPsiche.controller.update(
          bands,
          settings,
          time,
          rhythm,
          movingAverages,
          flash,
        )
        if (denoisingPsycho2d) {
          const bioRegime = getBioRegime?.()
          const regimeAllowsPsycho2d = bioRegime !== 'decompression' && bioRegime !== 'respiro-profondo'
          denoisingPsycho2d.root.style.opacity = regimeAllowsPsycho2d
            ? String(passthroughOpacity * DENOISING_MIX_OPACITY_FACTOR)
            : '0'
          if (regimeAllowsPsycho2d) {
            denoisingPsycho2d.controller.update(
              bands,
              settings,
              time,
              rhythm,
              movingAverages,
              flash,
            )
          }
        }
        if (progress >= 1) {
          passthroughState = 'idle'
          passthroughOpacity = 0
          denoisingFilterPsiche.root.style.opacity = '0'
          if (denoisingPsycho2d) denoisingPsycho2d.root.style.opacity = '0'
          root.dataset.brainDenoisingFilterPsiche = 'idle'
          brainLog('render', 'denoising-filter-psiche: idle', {
            renderer: active.id,
          })
        }
      }

      const desired = getRendererId(settings, time)
      const frameTransitionComplete = transitionProgress >= 1 && transitionRole === 'enter'
      if (frameTransitionComplete && desired !== active.id) requestRenderer(desired, time)

      // Un fallimento del renderer ATTIVO (non solo di quello entrante,
      // già gestito sotto) non deve restare a schermo per l'intera durata
      // del fotogramma — es. Vector Morph quando la vettorializzazione
      // viene respinta dal controllo qualità mostra solo il raster di
      // sfondo finché nessuno lo nota. Il sostituto deve appartenere allo
      // stesso pool eleggibile del selettore; il vecchio Print2D/FilterPsiche
      // resta soltanto come fallback retrocompatibile quando quel pool non è
      // disponibile.
      //
      // PIANO-040 (brief §4/§6.1/§17.1): il regime vince sempre sull'evento
      // tecnico. In particolare Print2D resta ineleggibile in
      // `decompression`/`respiro-profondo`, anche durante la Riattivazione.
      const bioRegime = getBioRegime?.()
      const regimeAllowsPrint2d = bioRegime !== 'decompression' && bioRegime !== 'respiro-profondo'
      // Rete di sicurezza al failure: se l'host conosce i renderer eleggibili
      // per lo stato corrente (`getEligibleRenderers`, dal selettore), il
      // sostituto e' scelto A CASO fra quelli — escluso il renderer appena
      // fallito e quelli in cooldown (`retryRendererAfter`, stato gia'
      // esistente). Cosi' il fallback non converge sempre su FilterPsiche e
      // resta dentro whitelist/esclusioni di regime. Se il callback manca o
      // non restituisce nulla, si ricade sul comportamento storico
      // (`print2d` in Riattivazione fuori regime basso, altrimenti
      // `filter-psiche`).
      const eligibleFallback = (getEligibleRenderers?.() ?? []).filter(
        (id) => id !== active.id
          && time >= (retryRendererAfter.get(id) ?? 0)
          && registry.get(id) !== undefined,
      )
      const legacySafetyNetId: BrainRendererId =
        getBoostHint?.() === true && regimeAllowsPrint2d ? 'print2d' : 'filter-psiche'
      const safetyNetId: BrainRendererId = eligibleFallback.length > 0
        ? eligibleFallback[Math.floor(Math.random() * eligibleFallback.length)]
        : legacySafetyNetId
      if (active.controller.hasFailed?.() === true && active.id !== safetyNetId) {
        brainWarn('render', 'renderer Brain attivo fallito; passo alla rete di sicurezza', {
          active: active.id,
          safetyNet: safetyNetId,
        })
        retryRendererAfter.set(active.id, time + 30_000)
        requestRenderer(safetyNetId, time)
        // Fa avanzare subito il mazzo del selettore oltre l'entrata
        // fallita, invece di lasciare la rete di sicurezza in scena per
        // l'intera durata residua del fotogramma (segnalato dal
        // Capo Supremo: Print2D restava troppo a lungo durante la
        // Riattivazione a causa dei fallimenti ripetuti di Vector Morph).
        onRendererFailed?.(active.id, settings, time)
      }

      active.controller.update(bands, settings, time, rhythm, movingAverages, flash)
      incoming?.controller.update(bands, settings, time, rhythm, movingAverages, flash)
      if (!incoming) return

      if (incoming.controller.hasFailed?.() === true) {
        brainWarn('render', 'renderer Brain entrante fallito; cambio annullato', {
          active: active.id,
          incoming: incoming.id,
        })
        retryRendererAfter.set(incoming.id, time + 30_000)
        destroyLayer(incoming)
        incoming = null
        switchStartedAt = null
        contaminationBlendOn = false
        active.root.style.opacity = '1'
        return
      }
      const incomingReady = incoming.controller.isReady?.() !== false
      if (!incomingReady) {
        if (time - incoming.requestedAt >= SWITCH_TIMEOUT_MS) {
          brainWarn('render', 'timeout renderer Brain entrante; cambio annullato', {
            active: active.id,
            incoming: incoming.id,
          })
          retryRendererAfter.set(incoming.id, time + 10_000)
          destroyLayer(incoming)
          incoming = null
        }
        return
      }
      if (switchStartedAt === null) switchStartedAt = time
      const degraded = settings.lowPowerMode || resourcePressure || offlineHold
      // CONTAMINATION (Slice 01) sul cambio renderer a immagine invariata:
      // curve asimmetriche, ingresso prima dell'uscita, fascia ibrida al
      // centro. Fallback al crossfade simmetrico quando: la coppia e' esclusa
      // (brief §24); si e' degradati (low power / pressione / offline hold);
      // oppure il renderer uscente ha fallito il proprio QC (`hasFailed`) —
      // li' e' una sostituzione d'emergenza, deve essere rapida, non una
      // convivenza artistica.
      const pairKey = `${active.id}->${incoming.id}`
      const contaminate = !degraded
        && active.controller.hasFailed?.() !== true
        && !CONTAMINATION_EXCLUDED_PAIRS.has(pairKey)
      const duration = contaminate
        ? CONTAMINATION_DURATION_MS
        : degraded ? SWITCH_DURATION_MS * 0.6 : SWITCH_DURATION_MS
      const t = (time - switchStartedAt) / duration
      if (contaminate) {
        const envelope = contaminationEnvelope(t, CONTAMINATION_COEXIST_CAP)
        active.root.style.opacity = String(envelope.outOpacity)
        incoming.root.style.opacity = String(envelope.inOpacity)
        if (envelope.coexisting !== contaminationBlendOn) {
          contaminationBlendOn = envelope.coexisting
          incoming.root.style.mixBlendMode = envelope.coexisting ? CONTAMINATION_COEXIST_BLEND : 'normal'
        }
        root.dataset.brainContamination = envelope.coexisting
          ? 'coexist'
          : clamp(t) < 0.5 ? 'enter' : 'cede'
      } else {
        const progress = smootherstep(t)
        active.root.style.opacity = String(1 - progress)
        incoming.root.style.opacity = String(progress)
      }
      if (t < 1) return

      const previous = active
      active = incoming
      root.dataset.activeRenderer = active.id
      incoming = null
      switchStartedAt = null
      contaminationBlendOn = false
      active.root.style.opacity = '1'
      active.root.style.mixBlendMode = 'normal'
      delete root.dataset.brainContamination
      destroyLayer(previous)
      brainLog('render', 'cambio renderer Brain completato', {
        active: active.id,
      })
    },
    destroy() {
      destroyed = true
      destroyLayer(incoming)
      destroyLayer(active)
      destroyLayer(denoisingFilterPsiche)
      destroyLayer(denoisingPsycho2d)
      pressureFlashOverlay = null
      pressureGlitchSlices = []
      pressureGlitchBaseOffsets = []
      pressureGlitchDriftSpeeds = []
      incoming = null
      root.remove()
    },
  }
}
