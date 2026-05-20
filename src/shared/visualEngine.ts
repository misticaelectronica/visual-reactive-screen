import type {
  BandEnergies,
  FlashMode,
  VisualEngineDebug,
  VisualEngineInput,
  VisualEngineOutput,
  VisualEngineState,
} from './types'

const DEBUG_FLASH = false
let lastFlashDebugLogMs = -1e12

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

function darkenColor(hex: string, amount: number): string {
  return lerpColor(hex, '#000000', clamp01(amount))
}

function expSmooth(prev: number, target: number, deltaMs: number, tauMs: number): number {
  if (tauMs <= 0) return target
  const k = 1 - Math.exp(-deltaMs / tauMs)
  return prev + (target - prev) * k
}

type FlashBandConfig = {
  main: { minHz: number; maxHz: number }
  secondary?: { minHz: number; maxHz: number }
}

function getFlashBandsForMode(flashMode: FlashMode): FlashBandConfig | null {
  if (flashMode === 'off') return null
  if (flashMode === 'low') {
    return {
      main: { minHz: 120, maxHz: 420 },
      secondary: { minHz: 600, maxHz: 1400 },
    }
  }
  if (flashMode === 'mid') {
    return {
      main: { minHz: 420, maxHz: 1800 },
      secondary: { minHz: 1800, maxHz: 3600 },
    }
  }
  if (flashMode === 'high') {
    return {
      main: { minHz: 1800, maxHz: 5200 },
      secondary: { minHz: 5200, maxHz: 8000 },
    }
  }
  return null
}

function fallbackFlashEnergyForMode(flashMode: FlashMode, bandEnergies: BandEnergies): number {
  if (flashMode === 'low') return Math.max(bandEnergies.low, bandEnergies.lowMid * 0.85)
  if (flashMode === 'mid') return Math.max(bandEnergies.lowMid, bandEnergies.mid)
  if (flashMode === 'high') return Math.max(bandEnergies.mid * 0.8, bandEnergies.high)
  return 0
}

export function createInitialVisualEngineState(): VisualEngineState {
  return {
    lastTriggerMs: -1e12,
    flashHoldUntilMs: -1e12,
    whiteMix: 0,
    flashHistoryMs: [],
    pinkHotBlend: 0,
    overallDrive: 0,
    flashStartedAtMs: undefined,
    manualFlashStartedAtMs: undefined,
    flashPeakIntensity: 0,
    lastFlashCandidateMs: undefined,
    lastFlashCandidateIntervalMs: undefined,
    regularFlashCandidateCount: 0,
  }
}

function getBandEnergy(
  frequencyData: Uint8Array | undefined,
  sampleRate: number | undefined,
  minHz: number,
  maxHz: number,
  fftSize: number
): number {
  if (!frequencyData || !sampleRate || frequencyData.length === 0) return 0
  const binCount = frequencyData.length
  const nyquist = sampleRate / 2
  const maxHzClamped = Math.min(maxHz, nyquist - 1e-6)
  const minHzClamped = Math.max(minHz, 0)

  let start = Math.floor(minHzClamped / (sampleRate / fftSize))
  let end = Math.ceil(maxHzClamped / (sampleRate / fftSize)) - 1

  start = Math.max(0, Math.min(binCount - 1, start))
  end = Math.max(start, Math.min(binCount - 1, end))

  if (end < start) return 0
  let sum = 0
  let sumSquares = 0
  const count = end - start + 1
  for (let i = start; i <= end; i++) {
    const value = frequencyData[i] ?? 0
    sum += value
    sumSquares += value * value
  }
  const mean = sum / count / 255
  const rms = Math.sqrt(sumSquares / count) / 255
  return clamp01(rms * 0.82 + mean * 0.18)
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

  const soft = settings.softMode === true
  const flashMode: FlashMode = settings.flashMode ?? 'mid'
  const sens = settings.sensitivity * (soft ? 0.65 : 1)
  const maxFlashRate = Number(settings.maxFlashesPerSecond)

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
      customFlashBandAverage: prev.customFlashBandAverage,
      prevCustomFlashBandEnergy: prev.prevCustomFlashBandEnergy,
      secondaryFlashBandAverage: prev.secondaryFlashBandAverage,
      flashStartedAtMs: undefined,
      manualFlashStartedAtMs: undefined,
      flashPeakIntensity: 0,
      lastFlashCandidateMs: prev.lastFlashCandidateMs,
      lastFlashCandidateIntervalMs: prev.lastFlashCandidateIntervalMs,
      regularFlashCandidateCount: prev.regularFlashCandidateCount ?? 0,
    }
    const output: VisualEngineOutput = {
      backgroundColor: settings.idleColor,
      brightness: 0,
      flashActive: false,
      flashIntensity: 0,
      flashMode,
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
  
  // Rate limit reale basato sia su cooldownMs che su frequenza decimale
  const rateLimitMs =
    flashMode === 'off'
      ? Number.POSITIVE_INFINITY
      : !Number.isFinite(maxFlashRate) || maxFlashRate <= 0
        ? 2500
        : 1000 / maxFlashRate
  let requiredIntervalMs = Math.max(settings.cooldownMs, rateLimitMs)
  if (!Number.isFinite(requiredIntervalMs) || Number.isNaN(requiredIntervalMs)) {
    requiredIntervalMs = 2500
  }
  const cooldownOk = nowMs - prev.lastTriggerMs >= requiredIntervalMs
  const timeSinceLastFlash = nowMs - prev.lastTriggerMs

  let flashBlockedReason: VisualEngineDebug['flashBlockedReason'] = 'none'

  // Calcolo dell'energia dinamica della trigger band selezionata dal flashMode
  let mainFlashBandEnergy = 0
  let secondaryFlashBandEnergy = 0
  const flashBand = getFlashBandsForMode(flashMode)
  if (flashBand && input.rawFrequencyData && input.sampleRate) {
    mainFlashBandEnergy = getBandEnergy(
      input.rawFrequencyData,
      input.sampleRate,
      flashBand.main.minHz,
      flashBand.main.maxHz,
      settings.fftSize
    )
    if (flashBand.secondary) {
      secondaryFlashBandEnergy = getBandEnergy(
        input.rawFrequencyData,
        input.sampleRate,
        flashBand.secondary.minHz,
        flashBand.secondary.maxHz,
        settings.fftSize
      )
    }
  } else {
    mainFlashBandEnergy = fallbackFlashEnergyForMode(flashMode, bandEnergies)
    secondaryFlashBandEnergy =
      flashMode === 'low'
        ? bandEnergies.mid * 0.75
        : flashMode === 'mid'
          ? bandEnergies.high * 0.85
          : bandEnergies.high * 0.55
  }
  const currentFlashBandEnergy = flashBand?.secondary
    ? mainFlashBandEnergy * 0.75 + secondaryFlashBandEnergy * 0.25
    : mainFlashBandEnergy

  // Media dinamica lenta e transitorio per la trigger band
  let customFlashBandAverage = prev.customFlashBandAverage ?? 0.025
  let secondaryFlashBandAverage = prev.secondaryFlashBandAverage ?? 0.025
  const prevCustomFlashBandEnergy = prev.prevCustomFlashBandEnergy ?? currentFlashBandEnergy
  const averageFloor = 0.025
  const flashBandAverageForDecision = Math.max(customFlashBandAverage, averageFloor)

  const transient = Math.max(0, currentFlashBandEnergy - prevCustomFlashBandEnergy)
  const deltaRelative = transient / flashBandAverageForDecision
  const relativeEnergy = currentFlashBandEnergy / flashBandAverageForDecision
  const secondaryBoost =
    flashBand?.secondary && secondaryFlashBandEnergy > Math.max(secondaryFlashBandAverage, averageFloor) * 1.35 ? 0.10 : 0
  const boostedRelativeEnergy = relativeEnergy + secondaryBoost

  // Blocco dominanza del basso ed inibizione sul kick regular
  const lowEnergy = input.rawFrequencyData && input.sampleRate
    ? getBandEnergy(input.rawFrequencyData, input.sampleRate, 40, 160, settings.fftSize)
    : bandEnergies.low
  const isLowDominant = lowEnergy > currentFlashBandEnergy * settings.lowDominanceBlockRatio
  const lowDominanceBlockEnabled = flashMode !== 'low' && settings.flashOnKick === false
  const effectiveFlashThreshold =
    lowDominanceBlockEnabled && isLowDominant ? settings.flashThreshold * 1.15 : settings.flashThreshold
  const energyThresholdMet = boostedRelativeEnergy >= effectiveFlashThreshold
  const transientThresholdMet = deltaRelative >= settings.transientDelta
  if (lowDominanceBlockEnabled && isLowDominant) {
    flashBlockedReason = 'none'
  }

  let flashTriggered = false
  const testActive = nowMs < testFlashUntilMs
  const flashCandidate = flashMode !== 'off' && energyThresholdMet && transientThresholdMet
  const lastFlashCandidateMs = prev.lastFlashCandidateMs
  const lastFlashCandidateIntervalMs = prev.lastFlashCandidateIntervalMs
  const regularFlashCandidateCount = prev.regularFlashCandidateCount ?? 0

  if (!testActive && input.audioPrimed) {
    if (flashCandidate) {
      if (!cooldownOk) flashBlockedReason = 'cooldown'
      else {
        flashTriggered = true
        flashBlockedReason = 'none'
      }
    }
  }

  const avgAlpha = 0.035
  customFlashBandAverage += (currentFlashBandEnergy - customFlashBandAverage) * avgAlpha
  secondaryFlashBandAverage += (secondaryFlashBandEnergy - secondaryFlashBandAverage) * avgAlpha

  let lastTriggerMs = prev.lastTriggerMs
  let flashHoldUntilMs = prev.flashHoldUntilMs
  let flashStartedAtMs = prev.flashStartedAtMs
  let manualFlashStartedAtMs = prev.manualFlashStartedAtMs
  let flashPeakIntensity = prev.flashPeakIntensity ?? 0

  if (testActive && flashStartedAtMs === undefined) {
    flashStartedAtMs = nowMs
    manualFlashStartedAtMs = nowMs
    flashPeakIntensity = 1
  }

  const manualFlashInProgress = manualFlashStartedAtMs !== undefined

  if (flashMode === 'off' && !testActive && !manualFlashInProgress) {
    flashHoldUntilMs = -1e12
    flashStartedAtMs = undefined
    flashPeakIntensity = 0
  } else if (testActive) {
    flashHoldUntilMs = Math.max(flashHoldUntilMs, nowMs + settings.flashDurationMs)
    flashPeakIntensity = 1
  } else if (flashTriggered && cooldownOk) {
    lastTriggerMs = nowMs
    flashHistoryMs = [...flashHistoryMs, nowMs]
    flashHoldUntilMs = nowMs + settings.flashDurationMs
    flashStartedAtMs = nowMs
    manualFlashStartedAtMs = undefined
    flashPeakIntensity = flashMode === 'high' ? 1 : flashMode === 'mid' ? 0.85 : 0.80
  }

  let whiteMix = 0
  if (flashStartedAtMs !== undefined) {
    const elapsed = nowMs - flashStartedAtMs
    if (elapsed <= settings.flashDurationMs || testActive) {
      whiteMix = flashPeakIntensity || 1
    } else {
      const decayProgress = (elapsed - settings.flashDurationMs) / Math.max(1, settings.decayMs)
      whiteMix = Math.max(0, (flashPeakIntensity || 1) * (1 - decayProgress))
    }
    if (whiteMix <= 0) {
      whiteMix = 0
      flashStartedAtMs = undefined
      manualFlashStartedAtMs = undefined
      flashPeakIntensity = 0
      flashHoldUntilMs = -1e12
    }
  }

  if (whiteMix < 0.002) whiteMix = 0

  const rawDrive = clamp01(
    (bandEnergies.low * 0.35 +
      bandEnergies.lowMid * 0.22 +
      bandEnergies.mid * 0.23 +
      bandEnergies.high * 0.2 +
      bandEnergies.low * settings.subMovement * 0.12 +
      Math.max(0, bandEnergies.low - movingAverages.low) * settings.kickMovement * 0.20) *
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
  const baseFlashIntensity = settings.useMorphing ? whiteMix * 0.65 : whiteMix
  const morphingFlashIntensity = settings.useMorphing ? whiteMix * 0.85 : whiteMix
  const flashedColor = lerpColor(pinkLayer, settings.whiteFlashColor, clamp01(baseFlashIntensity))
  const finalColor =
    settings.useMorphing && settings.morphingAlgorithm === 'oniric'
      ? darkenColor(flashedColor, settings.backgroundDarkness ?? 0.92)
      : flashedColor

  const flashActive = whiteMix > 0.35

  if (DEBUG_FLASH && nowMs - lastFlashDebugLogMs >= 500) {
    lastFlashDebugLogMs = nowMs
    console.info('[flash-debug]', {
      flashMode,
      softMode: soft,
      mainFlashBandMin: flashBand?.main.minHz ?? null,
      mainFlashBandMax: flashBand?.main.maxHz ?? null,
      flashBandEnergy: currentFlashBandEnergy,
      flashBandAverage: flashBandAverageForDecision,
      relativeEnergy: boostedRelativeEnergy,
      flashThreshold: effectiveFlashThreshold,
      flashBandDelta: transient,
      deltaRelative,
      transientDelta: settings.transientDelta,
      lowEnergy,
      lowDominanceBlockRatio: settings.lowDominanceBlockRatio,
      lowDominates: isLowDominant,
      cooldownMs: settings.cooldownMs,
      maxFlashesPerSecond: settings.maxFlashesPerSecond,
      requiredIntervalMs,
      timeSinceLastFlash,
      timeOk: cooldownOk,
      blockReason: flashBlockedReason,
      flashCandidate,
      flashTriggered,
      flashIntensity: whiteMix,
      lastFlashAt: lastTriggerMs,
      now: nowMs,
    })
  }

  const output: VisualEngineOutput = {
    backgroundColor: finalColor,
    brightness: clamp01(overallDrive * 0.85 + pinkHotBlend * 0.35 + whiteMix * 0.2),
    flashActive,
    flashIntensity: morphingFlashIntensity,
    flashMode,
    debug: {
      lowTrigger: flashTriggered && cooldownOk,
      thresholds,
      whiteMix,
      pinkHotBlend,
      overallDrive,
      flashBlockedReason: flashCandidate && !cooldownOk ? flashBlockedReason : 'none',
    },
  }

  const next: VisualEngineState = {
    lastTriggerMs,
    flashHoldUntilMs,
    whiteMix,
    flashHistoryMs,
    pinkHotBlend,
    overallDrive,
    customFlashBandAverage,
    prevCustomFlashBandEnergy: currentFlashBandEnergy,
    secondaryFlashBandAverage,
    flashStartedAtMs,
    manualFlashStartedAtMs,
    flashPeakIntensity,
    lastFlashCandidateMs,
    lastFlashCandidateIntervalMs,
    regularFlashCandidateCount,
  }

  return { output, next }
}
