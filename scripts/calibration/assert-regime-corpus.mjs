import { spawnSync } from 'node:child_process'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import ts from 'typescript'

// Regressione mirata (PIANO-044, MVP, 2026-09-11): garantisce che i file
// etichettati respiro-alto restino classificati respiro-alto dal regime
// Audio experimental — stesso metodo di decodifica e stesso codice di
// produzione di compare-audio-regimes.mjs, nessuna doppia analisi.
// Non copre gli altri discriminanti del corpus (decompresisone*, test-1):
// limiti già noti e fuori scope MVP, vedi working/STATE.md.
//
// Uso: node scripts/calibration/assert-regime-corpus.mjs
const SAMPLE_RATE = 44_100
const FFT_SIZE = 1_024
const FRAME_MS = FFT_SIZE / SAMPLE_RATE * 1_000
const WARMUP_SECONDS = 40

const EXPECTATIONS = [
  { file: 'docs/campioni/respiro-alto-0.mp3', dominant: 'respiro-alto', minShare: 0.6, forbidden: ['respiro-profondo'] },
  { file: 'docs/campioni/respiro-alto-1.mp3', dominant: 'respiro-alto', minShare: 0.6, forbidden: ['respiro-profondo'] },
  { file: 'docs/campioni/respiro-alto-2.mp3', dominant: 'respiro-alto', minShare: 0.6, forbidden: ['respiro-profondo'] },
  // minShare più basso rispetto agli altri: la timeline (verificata a mano,
  // 2026-09-13) mostra un'intro reale di ~10s di attacco genuino
  // (constraint 0,2→0,385, direzione rising sostenuta) su un file di soli
  // 29s — non un difetto, un'intro musicale proporzionalmente lunga su un
  // file corto. Il resto del file (t=19-28s) è stabilmente respiro-alto.
  { file: 'docs/campioni/respiro-alto-3.mp3', dominant: 'respiro-alto', minShare: 0.5, forbidden: ['respiro-profondo', 'decompression'] },
  { file: 'docs/campioni/respiro-alto-4.mp3', dominant: 'respiro-alto', minShare: 0.6, forbidden: ['respiro-profondo', 'decompression'] },
]

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
  const tempPath = path.replace(/\.ts$/, '.assert-tmp.mjs')
  writeFileSync(tempPath, rewritten)
  tempFiles.push(tempPath)
  return tempPath
}

const bioPerceptionTemp = transpileToTempFile('src/renderer/output/brain/brainBioPerception.ts')
const bioExperimentalTemp = transpileToTempFile(
  'src/renderer/output/brain/brainBioPerceptionExperimental.ts',
  { './brainBioPerception': `./${bioPerceptionTemp.split('/').pop()}` },
)
let OutputRhythmClock, BrainBioPerceptionExperimentalClock
try {
  const rhythmSource = readFileSync('src/renderer/output/brain/brainRhythm.ts', 'utf8')
  const { outputText } = ts.transpileModule(rhythmSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  })
  ;({ OutputRhythmClock } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`))
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

function regimeShares(file) {
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
  // Il rumore rosa di warmup serve a stabilizzare rhythmClock/medie mobili
  // prima del contenuto reale (§ metodo condiviso da tutti gli script di
  // questo corpus), ma la memoria di 8s dell'experimental clock diventa
  // `ready` già durante il rumore stesso (8s << 40s di warmup) — molto
  // prima che il contenuto reale inizi. Istanziarlo da subito farebbe
  // scadere il transitorio d'avvio (`ANCHOR_WARMUP_GRACE_MS`) durante il
  // rumore, lasciandolo già "caldo" (e quindi inefficace) esattamente nel
  // punto in cui il contenuto reale comincia — un artefatto del metodo di
  // collaudo, non della produzione (dal vivo non esiste rumore rosa prima
  // del materiale reale). Creato quindi solo all'inizio del contenuto vero.
  let experimentalClock = null
  let moving = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
  const duration = new Map()
  const warmupFrames = Math.floor(WARMUP_SECONDS * SAMPLE_RATE / FFT_SIZE)
  for (let frame = 0, offset = 0; offset + FFT_SIZE <= samples.length; frame += 1, offset += FFT_SIZE) {
    const now = (frame + 1) * FRAME_MS
    const currentBands = bands(fftMagnitude(offset))
    moving = smooth(moving, currentBands, 280)
    rhythmClock.ingestSample(currentBands, now, moving, frame, now)
    const rhythm = rhythmClock.projectState(now)
    if (frame === warmupFrames) experimentalClock = new BrainBioPerceptionExperimentalClock()
    if (frame < warmupFrames) continue
    const state = experimentalClock.ingestSample(currentBands, now, rhythm.bandTransients, rhythm)
    duration.set(state.regime, (duration.get(state.regime) ?? 0) + FRAME_MS)
  }
  const totalMs = [...duration.values()].reduce((sum, value) => sum + value, 0)
  return Object.fromEntries([...duration].map(([regime, ms]) => [regime, ms / totalMs]))
}

let failures = 0
for (const { file, dominant, minShare, forbidden = [] } of EXPECTATIONS) {
  const shares = regimeShares(file)
  // `unresolved` è l'8s di avvio a freddo della memoria sperimentale
  // (nessun dato ancora), non una lettura del materiale: escluso dalla
  // base della quota dominante, stessa logica già in uso nel progetto per
  // il tempo di Varco — un file corto non deve fallire solo perché l'8s
  // strutturale pesa di più sul suo totale.
  const resolvedTotal = Object.entries(shares)
    .filter(([regime]) => regime !== 'unresolved')
    .reduce((sum, [, value]) => sum + value, 0)
  const dominantRegime = Object.entries(shares)
    .filter(([regime]) => regime !== 'unresolved')
    .sort(([, a], [, b]) => b - a)[0]?.[0]
  const share = resolvedTotal > 0 ? (shares[dominant] ?? 0) / resolvedTotal : 0
  const forbiddenPresent = forbidden.filter((regime) => (shares[regime] ?? 0) > 0)
  const ok = dominantRegime === dominant && share >= minShare && forbiddenPresent.length === 0
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${file}: atteso dominante=${dominant} (>=${minShare} sul tempo risolto), vietati=[${forbidden.join(', ')}], osservato=${dominantRegime} (${share.toFixed(3)})`)
  console.log(`     distribuzione: ${JSON.stringify(Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, Number(v.toFixed(3))])))}`)
  if (!ok) failures += 1
}
if (failures > 0) {
  console.error(`\n${failures} campione/i fuori attesa.`)
  process.exit(1)
}
console.log('\nTutti i campioni respiro-alto rispettano la soglia di dominanza.')
