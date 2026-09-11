import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

// PIANO-044 — confronto A/B fra il regime Audio baseline e quello
// sperimentale, sullo stesso decode del corpus reale (`docs/campioni/`).
// Riusa lo stesso metodo di `scripts/calibration/analyze-sample.mjs`
// (ffmpeg + warmup di rumore rosa + FFT locale), guidando entrambi i clock
// di produzione sugli stessi fotogrammi — nessuna doppia acquisizione, nessuna
// nuova analisi spettrale per il regime sperimentale.
//
// Uso: node scripts/calibration/compare-audio-regimes.mjs [file...]
// Senza argomenti, gira su tutti i file di docs/campioni/. Non esiste una
// mappa C01-C09 (mai conservata, vedi piano-040 §1264 e i brief Audio del
// 2026-09-04): il nome file è già l'etichetta percettiva reale ed è quello
// che va letto.
const CAMPIONI_DIR = 'docs/campioni'
const SAMPLE_RATE = 44_100
const FFT_SIZE = 1_024
const FRAME_MS = FFT_SIZE / SAMPLE_RATE * 1_000
const WARMUP_SECONDS = 40

// `brainBioPerceptionExperimental.ts` importa `./brainBioPerception` (import
// di valore, non solo di tipi): una data: URL non può risolvere un import
// relativo. Lo trascriviamo quindi su file temporanei accanto ai sorgenti
// reali, così la risoluzione relativa di Node funziona, e li rimuoviamo alla
// fine. `brainRhythm.ts` non ha import locali: resta caricabile via data: URL.
async function loadTsDataUrl(path) {
  const source = readFileSync(path, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const tempFiles = []
function transpileToTempFile(path, importRewrites = {}) {
  const source = readFileSync(path, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  })
  let rewritten = outputText
  for (const [from, to] of Object.entries(importRewrites)) {
    rewritten = rewritten.split(`from '${from}'`).join(`from '${to}'`)
  }
  const tempPath = path.replace(/\.ts$/, '.compare-tmp.mjs')
  writeFileSync(tempPath, rewritten)
  tempFiles.push(tempPath)
  return tempPath
}

const bioPerceptionTemp = transpileToTempFile('src/renderer/output/brain/brainBioPerception.ts')
const bioExperimentalTemp = transpileToTempFile(
  'src/renderer/output/brain/brainBioPerceptionExperimental.ts',
  { './brainBioPerception': `./${bioPerceptionTemp.split('/').pop()}` },
)
let OutputRhythmClock, BrainBioPerceptionClock, BrainBioPerceptionExperimentalClock
try {
  ;({ OutputRhythmClock } = await loadTsDataUrl('src/renderer/output/brain/brainRhythm.ts'))
  ;({ BrainBioPerceptionClock } = await import(`file://${process.cwd()}/${bioPerceptionTemp}`))
  ;({ BrainBioPerceptionExperimentalClock } = await import(`file://${process.cwd()}/${bioExperimentalTemp}`))
} finally {
  for (const tempFile of tempFiles) unlinkSync(tempFile)
}

const window_ = Float64Array.from({ length: FFT_SIZE }, (_, n) =>
  0.42 - 0.5 * Math.cos(2 * Math.PI * n / (FFT_SIZE - 1)) +
  0.08 * Math.cos(4 * Math.PI * n / (FFT_SIZE - 1)))
const windowSum = window_.reduce((sum, value) => sum + value, 0)
const ranges = {
  low: [Math.floor(40 * FFT_SIZE / SAMPLE_RATE), Math.ceil(160 * FFT_SIZE / SAMPLE_RATE) - 1],
  lowMid: [Math.floor(160 * FFT_SIZE / SAMPLE_RATE), Math.ceil(400 * FFT_SIZE / SAMPLE_RATE) - 1],
  mid: [Math.floor(400 * FFT_SIZE / SAMPLE_RATE), Math.ceil(2_000 * FFT_SIZE / SAMPLE_RATE) - 1],
  high: [Math.floor(2_000 * FFT_SIZE / SAMPLE_RATE), Math.ceil(8_000 * FFT_SIZE / SAMPLE_RATE) - 1],
}
function bands(bytes) {
  return Object.fromEntries(Object.entries(ranges).map(([key, [start, end]]) => {
    let sum = 0
    for (let i = start; i <= end; i += 1) sum += bytes[i]
    return [key, sum / (end - start + 1) / 255]
  }))
}
function smooth(previous, next, tauMs) {
  const alpha = Math.exp(-FRAME_MS / tauMs)
  return Object.fromEntries(Object.keys(next).map((key) =>
    [key, previous[key] * alpha + next[key] * (1 - alpha)]))
}

function decode(file) {
  const decoded = spawnSync('ffmpeg', [
    '-v', 'error',
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:duration=${WARMUP_SECONDS}:sample_rate=${SAMPLE_RATE}:seed=1`,
    '-i', file,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]', '-map', '[out]',
    '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', 'pipe:1',
  ], { maxBuffer: 256 * 1024 * 1024 })
  if (decoded.status !== 0) throw new Error(decoded.stderr.toString() || `ffmpeg failed on ${file}`)
  return new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset,
    Math.floor(decoded.stdout.byteLength / 4))
}

function analyzeFile(file) {
  const samples = decode(file)
  const smoothedMagnitude = new Float64Array(FFT_SIZE / 2)
  function fftMagnitude(offset) {
    const real = new Float64Array(FFT_SIZE)
    const imag = new Float64Array(FFT_SIZE)
    for (let i = 0; i < FFT_SIZE; i += 1) real[i] = (samples[offset + i] ?? 0) * window_[i]
    for (let i = 1, j = 0; i < FFT_SIZE; i += 1) {
      let bit = FFT_SIZE >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j ^= bit
      if (i < j) [real[i], real[j]] = [real[j], real[i]]
    }
    for (let len = 2; len <= FFT_SIZE; len <<= 1) {
      const angle = -2 * Math.PI / len
      for (let base = 0; base < FFT_SIZE; base += len) {
        for (let j = 0; j < len / 2; j += 1) {
          const cos = Math.cos(angle * j), sin = Math.sin(angle * j)
          const even = base + j, odd = even + len / 2
          const tr = real[odd] * cos - imag[odd] * sin
          const ti = real[odd] * sin + imag[odd] * cos
          real[odd] = real[even] - tr; imag[odd] = imag[even] - ti
          real[even] += tr; imag[even] += ti
        }
      }
    }
    const bytes = new Uint8Array(FFT_SIZE / 2)
    for (let k = 0; k < bytes.length; k += 1) {
      const magnitude = Math.hypot(real[k], imag[k]) * 2 / windowSum
      smoothedMagnitude[k] = smoothedMagnitude[k] * 0.75 + magnitude * 0.25
      const db = 20 * Math.log10(Math.max(1e-12, smoothedMagnitude[k]))
      bytes[k] = Math.max(0, Math.min(255, Math.round((db + 90) / 80 * 255)))
    }
    return bytes
  }

  const rhythmClock = new OutputRhythmClock()
  const baselineClock = new BrainBioPerceptionClock()
  const experimentalClock = new BrainBioPerceptionExperimentalClock()
  let moving = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
  const duration = { baseline: new Map(), experimental: new Map() }
  let transitions = { baseline: 0, experimental: 0 }
  let previous = { baseline: null, experimental: null }
  // PIANO-044 / Fase 2: osserva soltanto relazioni già disponibili. Non
  // introduce ancora una nuova grandezza nel runtime sperimentale.
  const motor = {
    frames: 0,
    beats: 0,
    sumBeatConfirmation: 0,
    sumPhysicalPulse: 0,
    sumLowEnd: 0,
    sumGridDensity: 0,
    sumRhythmConstraint: 0,
    sumPersistence: 0,
    sumChange: 0,
    sumAlignedGrid: 0,
    sumGridActivity: 0,
    gridSeries: [],
    lowSeries: [],
    rawLowOnsetSeries: [],
    rawBandOnsetSeries: [],
    previousGridActivity: 0,
    previousLowActivity: 0,
    previousRawLow: 0,
    previousRawBands: { low: 0, lowMid: 0, mid: 0, high: 0 },
    referencePhaseFrames: {},
    experimentalReadyFrames: 0,
    experimentalRecurrence: 0,
    experimentalCyclePersistence: 0,
    experimentalPhysicalConfirmation: 0,
    experimentalAnchor: 0,
    experimentalConstraint: 0,
    experimentalSettlement: 0,
    experimentalOscillatingFrames: 0,
    experimentalDirections: {},
    experimentalTimeline: [],
    experimentalTimelineSecond: -1,
  }
  const warmupFrames = Math.floor(WARMUP_SECONDS * SAMPLE_RATE / FFT_SIZE)
  for (let frame = 0, offset = 0; offset + FFT_SIZE <= samples.length; frame += 1, offset += FFT_SIZE) {
    const now = (frame + 1) * FRAME_MS
    const currentBands = bands(fftMagnitude(offset))
    moving = smooth(moving, currentBands, 280)
    rhythmClock.ingestSample(currentBands, now, moving, frame, now)
    const rhythm = rhythmClock.projectState(now)
    const baselineState = baselineClock.ingestSample(currentBands, now, rhythm.bandTransients, rhythm)
    const experimentalState = experimentalClock.ingestSample(currentBands, now, rhythm.bandTransients, rhythm)
    if (frame < warmupFrames) continue
    const diagnostics = baselineClock.getRegimeDiagnostics()
    const experimentalDiagnostics = experimentalClock.getExperimentalDiagnostics()
    const physicalConfirmation = Math.min(
      1,
      rhythm.bandTransients.low * 0.7 + rhythm.bandTransients.lowMid * 0.3,
    )
    const gridActivity = Math.min(
      1,
      (rhythm.bandTransients.low + rhythm.bandTransients.lowMid +
        rhythm.bandTransients.mid + rhythm.bandTransients.high) / 4 * 4,
    )
    // Distanza circolare dalla suddivisione metrica più vicina. Vale 1 sul
    // quarto, 0 a metà strada: misura allineamento, non quantità di eventi.
    const quarterPhase = ((rhythm.beatPhase * 4) % 1 + 1) % 1
    const subdivisionDistance = Math.min(quarterPhase, 1 - quarterPhase)
    const metricAlignment = Math.max(0, 1 - subdivisionDistance * 2)
    motor.frames += 1
    motor.sumPhysicalPulse += diagnostics.rhythmConstraintComponents.pulse
    motor.sumLowEnd += diagnostics.rhythmConstraintComponents.lowEnd
    motor.sumGridDensity += diagnostics.rhythmConstraintComponents.gridDensity
    motor.sumRhythmConstraint += diagnostics.pressureComponents.rhythmConstraint
    motor.sumPersistence += baselineState.signals.persistence
    motor.sumChange += baselineState.signals.change
    motor.referencePhaseFrames[diagnostics.referencePhase] =
      (motor.referencePhaseFrames[diagnostics.referencePhase] ?? 0) + 1
    if (experimentalDiagnostics.ready) {
      motor.experimentalReadyFrames += 1
      motor.experimentalRecurrence += experimentalDiagnostics.organization.recurrence
      motor.experimentalCyclePersistence += experimentalDiagnostics.entrainment.cyclePersistence
      motor.experimentalPhysicalConfirmation +=
        experimentalDiagnostics.entrainment.physicalConfirmation
      motor.experimentalAnchor += experimentalDiagnostics.anchoring.value
      motor.experimentalConstraint += experimentalDiagnostics.constraint.value
      motor.experimentalSettlement += experimentalDiagnostics.settlement.evidence
      if (experimentalDiagnostics.settlement.oscillatingTransformation) {
        motor.experimentalOscillatingFrames += 1
      }
      const direction = experimentalDiagnostics.constraint.direction
      motor.experimentalDirections[direction] =
        (motor.experimentalDirections[direction] ?? 0) + 1
      const localSecond = Math.floor((frame - warmupFrames) * FRAME_MS / 1_000)
      if (localSecond !== motor.experimentalTimelineSecond) {
        motor.experimentalTimelineSecond = localSecond
        motor.experimentalTimeline.push({
          second: localSecond,
          recurrence: experimentalDiagnostics.organization.recurrence,
          cyclePersistence: experimentalDiagnostics.entrainment.cyclePersistence,
          anchor: experimentalDiagnostics.anchoring.value,
          constraint: experimentalDiagnostics.constraint.value,
          settlement: experimentalDiagnostics.settlement.evidence,
          direction,
        })
      }
    }
    motor.sumGridActivity += gridActivity
    motor.sumAlignedGrid += gridActivity * metricAlignment
    // Gli inviluppi dei transienti decadono fra i fronti: correlare il valore
    // grezzo premierebbe banalmente lag corti. Conserviamo solo il fronte di
    // salita, cioè l'arrivo fisico di un evento.
    motor.gridSeries.push(Math.max(0, gridActivity - motor.previousGridActivity))
    motor.lowSeries.push(Math.max(0, physicalConfirmation - motor.previousLowActivity))
    motor.rawLowOnsetSeries.push(Math.max(0, currentBands.low - motor.previousRawLow))
    motor.rawBandOnsetSeries.push(
      (Math.max(0, currentBands.low - motor.previousRawBands.low) +
        Math.max(0, currentBands.lowMid - motor.previousRawBands.lowMid) +
        Math.max(0, currentBands.mid - motor.previousRawBands.mid) +
        Math.max(0, currentBands.high - motor.previousRawBands.high)) / 4,
    )
    motor.previousGridActivity = gridActivity
    motor.previousLowActivity = physicalConfirmation
    motor.previousRawLow = currentBands.low
    motor.previousRawBands = { ...currentBands }
    if (rhythm.beat) {
      motor.beats += 1
      motor.sumBeatConfirmation += physicalConfirmation
    }
    for (const [key, state] of [['baseline', baselineState], ['experimental', experimentalState]]) {
      duration[key].set(state.regime, (duration[key].get(state.regime) ?? 0) + FRAME_MS)
      if (state.regime !== previous[key]) {
        if (previous[key] !== null) transitions[key] += 1
        previous[key] = state.regime
      }
    }
  }
  const toSeconds = (map) => Object.fromEntries([...map].map(([key, value]) => [key, value / 1_000]))
  const periodicity = (series) => {
    let best = { correlation: 0, periodMs: 0 }
    // 240–1200 ms: stesso dominio già ammesso dal clock ritmico. Pearson
    // normalizzato evita che un letto steady o una serie quasi nulla sembri
    // periodica solo perché cambia poco.
    for (let lag = Math.ceil(240 / FRAME_MS); lag <= Math.floor(1_200 / FRAME_MS); lag += 1) {
      const count = series.length - lag
      if (count < 2) continue
      let meanA = 0, meanB = 0
      for (let index = lag; index < series.length; index += 1) {
        meanA += series[index]
        meanB += series[index - lag]
      }
      meanA /= count
      meanB /= count
      let covariance = 0, varianceA = 0, varianceB = 0
      for (let index = lag; index < series.length; index += 1) {
        const a = series[index] - meanA
        const b = series[index - lag] - meanB
        covariance += a * b
        varianceA += a * a
        varianceB += b * b
      }
      const denominator = Math.sqrt(varianceA * varianceB)
      const correlation = denominator > 1e-9 ? covariance / denominator : 0
      if (correlation > best.correlation) best = { correlation, periodMs: lag * FRAME_MS }
    }
    return best
  }
  const gridPeriodicity = periodicity(motor.gridSeries)
  const lowPeriodicity = periodicity(motor.lowSeries)
  const rawLowPeriodicity = periodicity(motor.rawLowOnsetSeries)
  const rawBandPeriodicity = periodicity(motor.rawBandOnsetSeries)
  const rollingPeriodicity = (series) => {
    const windowFrames = Math.round(8_000 / FRAME_MS)
    const stepFrames = Math.round(2_000 / FRAME_MS)
    const windows = []
    for (let start = 0; start + windowFrames <= series.length; start += stepFrames) {
      windows.push(periodicity(series.slice(start, start + windowFrames)))
    }
    if (windows.length === 0) {
      return { meanCorrelation: 0, correlationStdDev: 0, periodConsistency: 0, windows: [] }
    }
    const meanCorrelation = windows.reduce((sum, item) => sum + item.correlation, 0) / windows.length
    const correlationStdDev = Math.sqrt(
      windows.reduce((sum, item) => sum + (item.correlation - meanCorrelation) ** 2, 0) / windows.length,
    )
    let consistentPairs = 0
    let weightedPairs = 0
    for (let index = 1; index < windows.length; index += 1) {
      const weight = Math.min(windows[index - 1].correlation, windows[index].correlation)
      weightedPairs += weight
      const ratio = windows[index].periodMs / Math.max(1, windows[index - 1].periodMs)
      const octaveEquivalent = Math.min(Math.abs(ratio - 1), Math.abs(ratio - 2), Math.abs(ratio - 0.5))
      if (octaveEquivalent <= 0.12) consistentPairs += weight
    }
    return {
      meanCorrelation,
      correlationStdDev,
      periodConsistency: weightedPairs > 0 ? consistentPairs / weightedPairs : 0,
      windows: windows.map((window, index) => ({
        startSeconds: index * stepFrames * FRAME_MS / 1_000,
        ...window,
      })),
    }
  }
  const rollingRawBandPeriodicity = rollingPeriodicity(motor.rawBandOnsetSeries)
  return {
    file,
    baseline: { durationSeconds: toSeconds(duration.baseline), transitions: transitions.baseline },
    experimental: { durationSeconds: toSeconds(duration.experimental), transitions: transitions.experimental },
    motorObservables: {
      meanPhysicalPulse: motor.sumPhysicalPulse / motor.frames,
      meanLowEnd: motor.sumLowEnd / motor.frames,
      meanGridDensity: motor.sumGridDensity / motor.frames,
      meanRhythmConstraint: motor.sumRhythmConstraint / motor.frames,
      meanPersistence: motor.sumPersistence / motor.frames,
      meanChange: motor.sumChange / motor.frames,
      meanBeatConfirmation: motor.beats > 0 ? motor.sumBeatConfirmation / motor.beats : 0,
      metricGridAlignment: motor.sumGridActivity > 0
        ? motor.sumAlignedGrid / motor.sumGridActivity
        : 0,
      gridPeriodicity,
      lowPeriodicity,
      rawLowPeriodicity,
      rawBandPeriodicity,
      rollingRawBandPeriodicity,
      beats: motor.beats,
      referencePhaseSeconds: Object.fromEntries(
        Object.entries(motor.referencePhaseFrames)
          .map(([phase, frames]) => [phase, frames * FRAME_MS / 1_000]),
      ),
      experimentalTemporal: motor.experimentalReadyFrames > 0
        ? {
            meanRecurrence: motor.experimentalRecurrence / motor.experimentalReadyFrames,
            meanCyclePersistence:
              motor.experimentalCyclePersistence / motor.experimentalReadyFrames,
            meanPhysicalConfirmation:
              motor.experimentalPhysicalConfirmation / motor.experimentalReadyFrames,
            meanAnchor: motor.experimentalAnchor / motor.experimentalReadyFrames,
            meanConstraint: motor.experimentalConstraint / motor.experimentalReadyFrames,
            meanSettlement: motor.experimentalSettlement / motor.experimentalReadyFrames,
            oscillatingShare:
              motor.experimentalOscillatingFrames / motor.experimentalReadyFrames,
            directionSeconds: Object.fromEntries(
              Object.entries(motor.experimentalDirections)
                .map(([direction, frames]) => [direction, frames * FRAME_MS / 1_000]),
            ),
            timeline: motor.experimentalTimeline,
          }
        : null,
    },
  }
}

const requested = process.argv.slice(2)
const files = requested.length > 0
  ? requested
  : readdirSync(CAMPIONI_DIR)
    .filter((name) => name.toLowerCase().endsWith('.mp3'))
    .sort()
    .map((name) => join(CAMPIONI_DIR, name))

const results = files.map((file) => {
  process.stderr.write(`analisi: ${file}\n`)
  return analyzeFile(file)
})

const outputPath = 'working/calibration-v1/audio-regimes-compare.json'
writeFileSync(
  outputPath,
  JSON.stringify(results.map(({ file, baseline, experimental }) => ({ file, baseline, experimental })), null, 2) + '\n',
)
const motorOutputPath = 'working/calibration-v1/motor-observables.json'
writeFileSync(
  motorOutputPath,
  JSON.stringify(results.map(({ file, motorObservables }) => ({ file, ...motorObservables })), null, 2) + '\n',
)

let identical = true
for (const result of results) {
  const same = JSON.stringify(result.baseline) === JSON.stringify(result.experimental)
  if (!same) identical = false
  console.log(`${result.file}${same ? '' : '  << DIFFORME'}`)
  console.log(`  baseline     ${JSON.stringify(result.baseline.durationSeconds)}  transizioni=${result.baseline.transitions}`)
  console.log(`  experimental ${JSON.stringify(result.experimental.durationSeconds)}  transizioni=${result.experimental.transitions}`)
}
console.log(`\nOutput: ${outputPath}`)
console.log(`Osservabili motori: ${motorOutputPath}`)
console.log(identical
  ? 'Il contratto di regime resta baseline su tutto il corpus; la nuova semantica è confinata in experimentalDiagnostics.'
  : 'ATTENZIONE: baseline ed experimental differiscono — inatteso al checkpoint 1 (scaffold puro).')
if (!identical) process.exitCode = 1
