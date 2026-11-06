import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// PIANO-059 — replay offline condiviso dagli strumenti diagnostici del piano.
// Stesso metodo di `assert-regime-corpus.mjs` e `compare-audio-regimes.mjs`
// (ffmpeg, warm-up di rumore rosa, FFT locale, scala −90…−10 dB come
// `useAudioAnalyzer`, clock di produzione guidati sugli stessi fotogrammi),
// con due differenze soltanto: i moduli sono trascritti in una cartella
// temporanea invece che accanto ai sorgenti, e il guadagno del file è
// regolabile per il gain sweep. Nessuna analisi nuova: la libreria legge le
// diagnostiche che il motore già produce.
export const SAMPLE_RATE = 44_100
export const FFT_SIZE = 1_024
export const FRAME_MS = FFT_SIZE / SAMPLE_RATE * 1_000
export const WARMUP_SECONDS = 40
export const BANDS = ['low', 'lowMid', 'mid', 'high']

const BRAIN_DIR = 'src/renderer/output/brain'

function transpile(source, target, importRewrites = {}) {
  let { outputText } = ts.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  })
  for (const [from, to] of Object.entries(importRewrites)) {
    outputText = outputText.split(`from '${from}'`).join(`from '${to}'`)
  }
  writeFileSync(target, outputText)
}

export async function loadProductionClocks(root = process.cwd()) {
  const dir = mkdtempSync(join(tmpdir(), 'piano-059-'))
  try {
    transpile(join(root, BRAIN_DIR, 'brainRhythm.ts'), join(dir, 'rhythm.mjs'))
    transpile(join(root, BRAIN_DIR, 'brainBioPerception.ts'), join(dir, 'bio.mjs'))
    transpile(
      join(root, BRAIN_DIR, 'brainBioPerceptionExperimental.ts'),
      join(dir, 'experimental.mjs'),
      { './brainBioPerception': './bio.mjs' },
    )
    const { OutputRhythmClock } = await import(pathToFileURL(join(dir, 'rhythm.mjs')).href)
    const { BrainBioPerceptionExperimentalClock } =
      await import(pathToFileURL(join(dir, 'experimental.mjs')).href)
    return { OutputRhythmClock, BrainBioPerceptionExperimentalClock }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// Picco per canale della sorgente, prima di qualunque downmix: è il valore
// che decide se un guadagno porterebbe una catena reale oltre 0 dBFS.
export function sourcePeakDbfs(file) {
  const probe = spawnSync('ffmpeg', [
    '-v', 'info', '-i', file,
    '-af', 'aformat=sample_fmts=flt,astats=measure_overall=Peak_level:measure_perchannel=none',
    '-f', 'null', '-',
  ], { encoding: 'utf8' })
  const match = /Peak level dB:\s*(-?[\d.]+|-?inf)/.exec(probe.stderr)
  if (!match) throw new Error(`picco non misurabile su ${file}`)
  return Number(match[1])
}

// Downmix esplicito a mono = ½(L+R), come `-ac 1` di ffmpeg e come il
// down-mix «speakers» del Web Audio che alimenta l'AnalyserNode in
// produzione. Gli script di calibrazione precedenti lasciano negoziare il
// downmix al grafo `concat`, che somma i canali senza dimezzarli: il
// contenuto entra ~+3 dB più caldo (picco +2,9 dBFS su master a −0,1 dBFS,
// misura PIANO-059 del 2026-11-06). Qui lo «0 dB» è quindi il file a piena
// scala come lo vede il motore dal vivo.
//
// Il guadagno è applicato al solo file, non al rumore di warm-up, con
// `precision=float`: moltiplicazione pura, senza limiter né clipping nel
// dominio float.
function channelCount(file) {
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', file,
  ], { encoding: 'utf8' })
  const channels = Number(probe.stdout.trim())
  if (channels !== 1 && channels !== 2) throw new Error(`${file}: ${probe.stdout.trim() || '?'} canali, previsti 1 o 2`)
  return channels
}

export function decode(file, { gainDb = 0 } = {}) {
  const downmix = channelCount(file) === 2 ? 'pan=mono|c0=0.5*c0+0.5*c1,' : ''
  const decoded = spawnSync('ffmpeg', [
    '-v', 'error',
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:duration=${WARMUP_SECONDS}:sample_rate=${SAMPLE_RATE}:seed=1`,
    '-i', file,
    '-filter_complex',
    `[1:a]aformat=sample_fmts=flt,${downmix}volume=${gainDb}dB:precision=float[g];[0:a]aformat=sample_fmts=flt:channel_layouts=mono[n];[n][g]concat=n=2:v=0:a=1[out]`,
    '-map', '[out]',
    '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', 'pipe:1',
  ], { maxBuffer: 512 * 1024 * 1024 })
  if (decoded.status !== 0) throw new Error(decoded.stderr.toString() || `ffmpeg failed on ${file}`)
  const samples = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset,
    Math.floor(decoded.stdout.byteLength / 4))
  const contentStart = WARMUP_SECONDS * SAMPLE_RATE
  let peak = 0
  let energy = 0
  for (let i = contentStart; i < samples.length; i += 1) {
    const value = Math.abs(samples[i])
    if (value > peak) peak = value
    energy += value * value
  }
  const contentLength = Math.max(1, samples.length - contentStart)
  return {
    samples,
    contentSeconds: contentLength / SAMPLE_RATE,
    peakDbfs: 20 * Math.log10(Math.max(1e-12, peak)),
    rmsDbfs: 10 * Math.log10(Math.max(1e-24, energy / contentLength)),
  }
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

function bandsAndCeiling(bytes) {
  const bands = {}
  const ceiling = {}
  const floor = {}
  for (const [key, [start, end]] of Object.entries(ranges)) {
    let sum = 0
    let atCeiling = 0
    let atFloor = 0
    for (let i = start; i <= end; i += 1) {
      sum += bytes[i]
      if (bytes[i] === 255) atCeiling += 1
      if (bytes[i] === 0) atFloor += 1
    }
    const count = end - start + 1
    bands[key] = sum / count / 255
    ceiling[key] = atCeiling / count
    floor[key] = atFloor / count
  }
  return { bands, ceiling, floor }
}

function smooth(previous, next, tauMs) {
  const alpha = Math.exp(-FRAME_MS / tauMs)
  return Object.fromEntries(Object.keys(next).map((key) =>
    [key, previous[key] * alpha + next[key] * (1 - alpha)]))
}

/**
 * Riproduce un decode con i clock di produzione. `onFrame` riceve, per ogni
 * fotogramma del contenuto reale (dopo il warm-up):
 * `{ t, bands, ceiling, floor, regime, diagnostics }`, con `t` in secondi dal
 * primo campione del file. `diagnostics` è la copia di
 * `getExperimentalDiagnostics()` ed è chiesta solo se `withDiagnostics`.
 *
 * L'experimental clock nasce all'inizio del contenuto reale, come in
 * `assert-regime-corpus.mjs`: dal vivo non esiste rumore rosa prima della
 * musica.
 */
export function replay(clocks, decodedSamples, onFrame, { withDiagnostics = false } = {}) {
  const { OutputRhythmClock, BrainBioPerceptionExperimentalClock } = clocks
  const samples = decodedSamples
  const smoothedMagnitude = new Float64Array(FFT_SIZE / 2)
  const real = new Float64Array(FFT_SIZE)
  const imag = new Float64Array(FFT_SIZE)
  const bytes = new Uint8Array(FFT_SIZE / 2)
  function fftBytes(offset) {
    real.fill(0)
    imag.fill(0)
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
    for (let k = 0; k < bytes.length; k += 1) {
      const magnitude = Math.hypot(real[k], imag[k]) * 2 / windowSum
      smoothedMagnitude[k] = smoothedMagnitude[k] * 0.75 + magnitude * 0.25
      const db = 20 * Math.log10(Math.max(1e-12, smoothedMagnitude[k]))
      bytes[k] = Math.max(0, Math.min(255, Math.round((db + 90) / 80 * 255)))
    }
    return bytes
  }

  const rhythmClock = new OutputRhythmClock()
  let experimentalClock = null
  let moving = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
  const warmupFrames = Math.floor(WARMUP_SECONDS * SAMPLE_RATE / FFT_SIZE)
  for (let frame = 0, offset = 0; offset + FFT_SIZE <= samples.length; frame += 1, offset += FFT_SIZE) {
    const now = (frame + 1) * FRAME_MS
    const { bands, ceiling, floor } = bandsAndCeiling(fftBytes(offset))
    moving = smooth(moving, bands, 280)
    rhythmClock.ingestSample(bands, now, moving, frame, now)
    const rhythm = rhythmClock.projectState(now)
    if (frame === warmupFrames) experimentalClock = new BrainBioPerceptionExperimentalClock()
    if (frame < warmupFrames) continue
    const state = experimentalClock.ingestSample(bands, now, rhythm.bandTransients, rhythm)
    onFrame({
      t: (frame - warmupFrames) * FRAME_MS / 1_000,
      bands,
      ceiling,
      floor,
      regime: state.regime,
      diagnostics: withDiagnostics ? experimentalClock.getExperimentalDiagnostics() : null,
    })
  }
}
