import type {
  BandEnergies,
  VisualEngineDebug,
  VisualEngineInput,
  VisualEngineOutput,
  VisualEngineState,
} from './types'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n)) return { r: 5, g: 0, b: 5 }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lerpColor(a: string, colorB: string, t: number): string {
  const A = parseHex(a)
  const B = parseHex(colorB)
  const k = clamp01(t)
  const r = Math.round(A.r + (B.r - A.r) * k)
  const g = Math.round(A.g + (B.g - A.g) * k)
  const blue = Math.round(A.b + (B.b - A.b) * k)
  return `#${[r, g, blue].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function expSmooth(prev: number, target: number, deltaMs: number, tauMs: number): number {
  if (tauMs <= 0) return target
  const k = 1 - Math.exp(-deltaMs / tauMs)
  return prev + (target - prev) * k
}

export function createInitialVisualEngineState(): VisualEngineState {
  return {
    lastTriggerMs: -1e12,
    flashHoldUntilMs: -1e12,
    whiteMix: 0,
    flashHistoryMs: [],
    pinkHotBlend: 0,
    overallDrive: 0,
  }
}

export function stepVisualEngine(input: VisualEngineInput): {
  output: VisualEngineOutput
  next: VisualEngineState
} {
  const {
    nowMs,
    deltaMs,
    bandEnergies,
    movingAverages,
    prev,
    settings,
    panic,
    testFlashUntilMs,
  } = input

  const soft = settings.softMode
  const sens = settings.sensitivity * (soft ? 0.65 : 1)
  const decayMsEffective = settings.decayMs * (soft ? 1.45 : 1)
  const maxFlash = soft
    ? Math.max(2, Math.floor(settings.maxFlashesPerSecond * 0.6))
    : settings.maxFlashesPerSecond

  const thresholds: BandEnergies = {
    low: movingAverages.low * settings.lowThresholdMultiplier * sens,
    lowMid: movingAverages.lowMid * settings.lowMidThresholdMultiplier * sens,
    mid: movingAverages.mid * settings.midThresholdMultiplier * sens,
    high: movingAverages.high * settings.highThresholdMultiplier * sens,
  }

  if (panic) {
    const next: VisualEngineState = {
      lastTriggerMs: prev.lastTriggerMs,
      flashHoldUntilMs: -1e12,
      whiteMix: 0,
      flashHistoryMs: [],
      pinkHotBlend: 0,
      overallDrive: 0,
    }
    const output: VisualEngineOutput = {
      backgroundColor: settings.idleColor,
      brightness: 0,
      flashActive: false,
      debug: {
        lowTrigger: false,
        thresholds,
        whiteMix: 0,
        pinkHotBlend: 0,
        overallDrive: 0,
        flashBlockedReason: 'panic',
      },
    }
    return { output, next }
  }

  let flashHistoryMs = prev.flashHistoryMs.filter((t) => nowMs - t < 1000)
  const underRateLimit = flashHistoryMs.length < maxFlash
  const cooldownOk = nowMs - prev.lastTriggerMs >= settings.cooldownMs

  let flashBlockedReason: VisualEngineDebug['flashBlockedReason'] = 'none'
  let lowTrigger = false

  const testActive = nowMs < testFlashUntilMs

  if (!testActive && input.audioPrimed && bandEnergies.low > thresholds.low) {
    if (!cooldownOk) flashBlockedReason = 'cooldown'
    else if (!underRateLimit) flashBlockedReason = 'rate-limit'
    else {
      lowTrigger = true
      flashBlockedReason = 'none'
    }
  }

  let lastTriggerMs = prev.lastTriggerMs
  let flashHoldUntilMs = prev.flashHoldUntilMs
  let whiteMix = prev.whiteMix

  if (testActive) {
    flashHoldUntilMs = Math.max(flashHoldUntilMs, nowMs + settings.flashDurationMs * 0.35)
    whiteMix = 1
  } else if (lowTrigger && cooldownOk && underRateLimit) {
    lastTriggerMs = nowMs
    flashHistoryMs = [...flashHistoryMs, nowMs]
    flashHoldUntilMs = nowMs + settings.flashDurationMs
    whiteMix = 1
  }

  const inHold = nowMs < flashHoldUntilMs || testActive
  if (inHold) {
    whiteMix = Math.max(whiteMix, 1)
  } else {
    const tau = Math.max(1, decayMsEffective)
    whiteMix *= Math.exp(-deltaMs / tau)
  }

  // Evita residui microscopici che tengono il bianco "appiccicato"
  if (whiteMix < 0.002) whiteMix = 0

  // Mai bianco continuo non controllato: dopo hold, il decay sopra domina
  if (!inHold && !testActive && bandEnergies.low > thresholds.low * 1.05) {
    // se siamo ancora sopra soglia ma in cooldown/rate-limit, non aumentare whiteMix
  }

  const rawDrive = clamp01(
    (bandEnergies.low * 0.35 +
      bandEnergies.lowMid * 0.22 +
      bandEnergies.mid * 0.23 +
      bandEnergies.high * 0.2) *
      (soft ? 0.85 : 1) *
      sens,
  )

  const rawHot = clamp01(
    (bandEnergies.mid * 0.55 + bandEnergies.high * 0.45) * (soft ? 0.75 : 1.05) * sens,
  )

  const driveTau = soft ? 90 : 55
  const hotTau = soft ? 110 : 70
  const overallDrive = expSmooth(prev.overallDrive, rawDrive, deltaMs, driveTau)
  const pinkHotBlend = expSmooth(prev.pinkHotBlend, rawHot, deltaMs, hotTau)

  const idleToPink = clamp01(overallDrive * 1.15)
  const baseLayer = lerpColor(settings.idleColor, settings.basePinkColor, idleToPink)
  const pinkLayer = lerpColor(baseLayer, settings.hotPinkColor, clamp01(pinkHotBlend * 0.95))
  const finalColor = lerpColor(pinkLayer, settings.whiteFlashColor, clamp01(whiteMix))

  const flashActive = whiteMix > 0.35

  const output: VisualEngineOutput = {
    backgroundColor: finalColor,
    brightness: clamp01(overallDrive * 0.85 + pinkHotBlend * 0.35 + whiteMix * 0.2),
    flashActive,
    debug: {
      lowTrigger: lowTrigger && cooldownOk && underRateLimit,
      thresholds,
      whiteMix,
      pinkHotBlend,
      overallDrive,
      flashBlockedReason: lowTrigger && !(cooldownOk && underRateLimit) ? flashBlockedReason : 'none',
    },
  }

  const next: VisualEngineState = {
    lastTriggerMs,
    flashHoldUntilMs,
    whiteMix,
    flashHistoryMs,
    pinkHotBlend,
    overallDrive,
  }

  return { output, next }
}
