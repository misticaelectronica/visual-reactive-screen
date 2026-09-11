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
    for (const [key, state] of [['baseline', baselineState], ['experimental', experimentalState]]) {
      duration[key].set(state.regime, (duration[key].get(state.regime) ?? 0) + FRAME_MS)
      if (state.regime !== previous[key]) {
        if (previous[key] !== null) transitions[key] += 1
        previous[key] = state.regime
      }
    }
  }
  const toSeconds = (map) => Object.fromEntries([...map].map(([key, value]) => [key, value / 1_000]))
  return {
    file,
    baseline: { durationSeconds: toSeconds(duration.baseline), transitions: transitions.baseline },
    experimental: { durationSeconds: toSeconds(duration.experimental), transitions: transitions.experimental },
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
writeFileSync(outputPath, JSON.stringify(results, null, 2) + '\n')

let identical = true
for (const result of results) {
  const same = JSON.stringify(result.baseline) === JSON.stringify(result.experimental)
  if (!same) identical = false
  console.log(`${result.file}${same ? '' : '  << DIFFORME'}`)
  console.log(`  baseline     ${JSON.stringify(result.baseline.durationSeconds)}  transizioni=${result.baseline.transitions}`)
  console.log(`  experimental ${JSON.stringify(result.experimental.durationSeconds)}  transizioni=${result.experimental.transitions}`)
}
console.log(`\nOutput: ${outputPath}`)
console.log(identical
  ? 'Checkpoint 1: baseline ed experimental coincidono su tutto il corpus (atteso: scaffold, nessuna nuova semantica).'
  : 'ATTENZIONE: baseline ed experimental differiscono — inatteso al checkpoint 1 (scaffold puro).')
if (!identical) process.exitCode = 1
