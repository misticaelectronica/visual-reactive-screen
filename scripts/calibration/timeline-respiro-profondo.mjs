import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import ts from 'typescript'

// Ricostruzione temporale richiesta dal Vice Consigliere (2026-09-11):
// perché `pressureLanded===true` e `level!==null` non coincidono mai sui
// tre campioni respiro-profondo. Usa il modulo di produzione reale
// (BrainBioPerceptionClock + `classifyLevel`, ora esportata per questo
// scopo — nessuna duplicazione di formula, nessuna modifica di
// comportamento). Logga solo agli EVENTI (non ogni fotogramma): cambi di
// pressureLanded, pressureJustLanded, referencePhase, referenceJustSettled,
// gatedLevel, regimeReason — per restare "breve, limitata al tratto
// rilevante".
const SAMPLE_RATE = 44_100
const FFT_SIZE = 1_024
const FRAME_MS = FFT_SIZE / SAMPLE_RATE * 1_000
const WARMUP_SECONDS = 40

async function loadTs(path) {
  const source = readFileSync(path, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const [{ OutputRhythmClock }, { BrainBioPerceptionClock, classifyLevel }] = await Promise.all([
  loadTs('src/renderer/output/brain/brainRhythm.ts'),
  loadTs('src/renderer/output/brain/brainBioPerception.ts'),
])

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

function timelineFor(file) {
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
  const bioClock = new BrainBioPerceptionClock()
  let moving = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
  const warmupFrames = Math.floor(WARMUP_SECONDS * SAMPLE_RATE / FFT_SIZE)

  const events = []
  let prev = null // { pressureLanded, referencePhase, referenceJustSettled, gatedLevel, regimeReason }
  let previousGatedLevel = null

  for (let frame = 0, offset = 0; offset + FFT_SIZE <= samples.length; frame += 1, offset += FFT_SIZE) {
    const now = (frame + 1) * FRAME_MS
    const currentBands = bands(fftMagnitude(offset))
    moving = smooth(moving, currentBands, 280)
    rhythmClock.ingestSample(currentBands, now, moving, frame, now)
    const rhythm = rhythmClock.projectState(now)
    const state = bioClock.ingestSample(currentBands, now, rhythm.bandTransients, rhythm)
    if (frame < warmupFrames) continue
    const diagnostics = bioClock.getRegimeDiagnostics()
    const localSeconds = +((now - WARMUP_SECONDS * 1_000) / 1_000).toFixed(2)

    const everPromoted = !diagnostics.bootstrapping
    const pressureJustLanded = diagnostics.pressureLanded && !(prev?.pressureLanded ?? false)
    // Ricostruzione di `settledLevel` (pre-gate `everPromoted`) con la
    // stessa identica formula della classe, chiamando `classifyLevel` reale.
    const rawSettledLevel = diagnostics.referenceJustSettled
      ? classifyLevel(diagnostics.referencePressure, diagnostics.pressureMedian, previousGatedLevel)
      : pressureJustLanded
        ? classifyLevel(diagnostics.currentPressure, diagnostics.pressureMedian, previousGatedLevel)
        : previousGatedLevel
    previousGatedLevel = diagnostics.level // il valore REALE (già gated) diventa il "previous" del prossimo giro, come nella classe

    const point = {
      pressureLanded: diagnostics.pressureLanded,
      pressureFlatMs: Math.round(diagnostics.pressureFlatMs),
      referencePhase: diagnostics.referencePhase,
      referenceJustSettled: diagnostics.referenceJustSettled,
      everPromoted,
      rawSettledLevel,
      gatedLevel: diagnostics.level,
      regimeReason: diagnostics.regimeReason,
      regime: state.regime,
    }
    const changed = !prev
      || point.pressureLanded !== prev.pressureLanded
      || point.referencePhase !== prev.referencePhase
      || point.referenceJustSettled
      || point.gatedLevel !== prev.gatedLevel
      || point.regimeReason !== prev.regimeReason
      || pressureJustLanded
    if (changed) {
      events.push({ seconds: localSeconds, pressureJustLanded, ...point })
    }
    prev = point
  }
  return { file, events }
}

const files = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : [
    'docs/campioni/respiro-profondo.mp3',
    'docs/campioni/respiro-profondo-1.mp3',
    'docs/campioni/respirto-profondo-3.mp3',
  ]

const results = files.map((file) => {
  process.stderr.write(`timeline: ${file}\n`)
  return timelineFor(file)
})

const outputPath = 'working/calibration-v1/timeline-respiro-profondo.json'
writeFileSync(outputPath, JSON.stringify(results, null, 2) + '\n')

for (const r of results) {
  console.log(`\n=== ${r.file} ===`)
  for (const e of r.events) {
    console.log(
      `+${e.seconds}s  landed=${e.pressureLanded}${e.pressureJustLanded ? '(JUST)' : ''} flatMs=${e.pressureFlatMs}  ` +
      `refPhase=${e.referencePhase}${e.referenceJustSettled ? '(JUST-SETTLED)' : ''} everPromoted=${e.everPromoted}  ` +
      `rawLevel=${e.rawSettledLevel} gatedLevel=${e.gatedLevel}  reason=${e.regimeReason} regime=${e.regime}`,
    )
  }
}
console.log(`\nOutput: ${outputPath}`)
