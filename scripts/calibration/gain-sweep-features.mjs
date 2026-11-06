import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { BANDS, decode, loadProductionClocks, replay, sourcePeakDbfs } from './lib/corpusReplay.mjs'

// PIANO-059 Fase 2 — gain sweep offline delle feature attuali del regime
// experimental (brief di autorizzazione PIANO-059 §3-§5). Lo stesso segnale
// viene riprodotto a livelli diversi; si misura quanto ogni feature cambia
// rispetto a un livello di riferimento. Solo diagnostica: nessuna correzione.
//
// Vincoli del brief §4:
// - guadagno puro (`volume:precision=float`), verificato sull'RMS del
//   contenuto: uno scarto oltre 0,05 dB dal nominale è segnalato;
// - un livello che porta il picco per canale della sorgente oltre 0 dBFS
//   andrebbe in clipping in una catena reale: è segnalato e non entra nei
//   giudizi di invarianza. Il riferimento è 0 dB, o se anche quello va in
//   clipping il livello più alto senza clipping.
//
// Uso: node scripts/calibration/gain-sweep-features.mjs [campione.mp3 ...]
const CAMPIONI_DIR = 'docs/campioni'
const OUT_DIR = 'working/calibration-v1/piano-059'
const LEVELS = [-18, -12, -6, 0, 6, 12]
const FEATURES = {
  recurrence: (d) => d.organization.recurrence,
  cyclePersistence: (d) => d.entrainment.cyclePersistence,
  physicalConfirmation: (d) => d.entrainment.physicalConfirmation,
  eventActivity: (d) => d.organization.eventActivity,
  anchor: (d) => d.anchoring.value,
  constraint: (d) => d.constraint.value,
}
const TICK_S = 0.5
// Confronto di traiettoria allo stesso ritardo con cui il motore legge il
// verso (`CONSTRAINT_TREND_LAG_MS` = 6 s).
const TREND_TICKS = 12
const TREND_MIN = 0.02
const LINEARITY_TOLERANCE_DB = 0.05
const RELATIVE_MIN_MEAN = 0.05

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(CAMPIONI_DIR).filter((name) => name.endsWith('.mp3')).sort().map((name) => join(CAMPIONI_DIR, name))

function runLevel(clocks, file, gainDb, sourcePeak) {
  const decoded = decode(file, { gainDb })
  const ticks = []
  const ceiling = Object.fromEntries(BANDS.map((band) => [band, 0]))
  const floor = Object.fromEntries(BANDS.map((band) => [band, 0]))
  const onsets = Object.fromEntries(BANDS.map((band) => [band, 0]))
  let previous = null
  let frames = 0
  let lastTick = -1
  replay(clocks, decoded.samples, ({ t, bands, ceiling: c, floor: f, regime, diagnostics }) => {
    frames += 1
    for (const band of BANDS) {
      ceiling[band] += c[band]
      floor[band] += f[band]
      if (previous) onsets[band] += Math.max(0, bands[band] - previous[band])
    }
    previous = bands
    const tick = Math.floor(t / TICK_S)
    if (tick === lastTick) return
    lastTick = tick
    if (!diagnostics.ready || !diagnostics.anchoring.warmedUp) return
    ticks.push({
      tick,
      regime,
      direction: diagnostics.constraint.direction,
      ...Object.fromEntries(Object.entries(FEATURES).map(([name, read]) => [name, read(diagnostics)])),
    })
  }, { withDiagnostics: true })
  const perFrame = (record) => Object.fromEntries(BANDS.map((band) => [band, record[band] / Math.max(1, frames)]))
  return {
    gainDb,
    peakDbfs: sourcePeak + gainDb,
    rmsDbfs: decoded.rmsDbfs,
    clipping: sourcePeak + gainDb > 0,
    ceiling: perFrame(ceiling),
    floor: perFrame(floor),
    onsets: perFrame(onsets),
    ticks,
  }
}

const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN
function pearson(a, b) {
  const n = Math.min(a.length, b.length)
  if (n < 3) return NaN
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n))
  let cov = 0, va = 0, vb = 0
  for (let i = 0; i < n; i += 1) {
    cov += (a[i] - ma) * (b[i] - mb)
    va += (a[i] - ma) ** 2
    vb += (b[i] - mb) ** 2
  }
  return va > 1e-12 && vb > 1e-12 ? cov / Math.sqrt(va * vb) : NaN
}

function compare(reference, level) {
  const byTick = new Map(level.ticks.map((tick) => [tick.tick, tick]))
  const pairs = reference.ticks.filter((tick) => byTick.has(tick.tick)).map((tick) => [tick, byTick.get(tick.tick)])
  const features = {}
  for (const name of Object.keys(FEATURES)) {
    const ref = pairs.map(([a]) => a[name])
    const lev = pairs.map(([, b]) => b[name])
    const refMean = mean(ref)
    const levMean = mean(lev)
    let trendCount = 0
    let trendFlips = 0
    for (let i = TREND_TICKS; i < pairs.length; i += 1) {
      const dRef = ref[i] - ref[i - TREND_TICKS]
      const dLev = lev[i] - lev[i - TREND_TICKS]
      if (Math.abs(dRef) < TREND_MIN) continue
      trendCount += 1
      if (Math.abs(dLev) >= TREND_MIN && Math.sign(dLev) !== Math.sign(dRef)) trendFlips += 1
    }
    features[name] = {
      referenceMean: refMean,
      levelMean: levMean,
      delta: levMean - refMean,
      relativeDelta: refMean >= RELATIVE_MIN_MEAN ? (levMean - refMean) / refMean : null,
      trajectoryR: pearson(ref, lev),
      meanAbsDiff: mean(pairs.map(([a, b]) => Math.abs(a[name] - b[name]))),
      trendFlips: trendCount > 0 ? trendFlips / trendCount : null,
      trendSamples: trendCount,
    }
  }
  return {
    pairedTicks: pairs.length,
    directionDisagreement: pairs.length ? pairs.filter(([a, b]) => a.direction !== b.direction).length / pairs.length : null,
    regimeDisagreement: pairs.length ? pairs.filter(([a, b]) => a.regime !== b.regime).length / pairs.length : null,
    onsetRatio: Object.fromEntries(BANDS.map((band) => [band,
      reference.onsets[band] > 1e-9 ? level.onsets[band] / reference.onsets[band] : null])),
    features,
  }
}

const clocks = await loadProductionClocks()
const report = []
for (const file of files) {
  const name = basename(file)
  console.log(`analisi: ${name}`)
  const sourcePeak = sourcePeakDbfs(file)
  const levels = LEVELS.map((gainDb) => runLevel(clocks, file, gainDb, sourcePeak))
  const zero = levels.find((level) => level.gainDb === 0)
  const linearity = levels.map((level) => ({
    gainDb: level.gainDb,
    measuredDb: level.rmsDbfs - zero.rmsDbfs,
    linear: Math.abs(level.rmsDbfs - zero.rmsDbfs - level.gainDb) <= LINEARITY_TOLERANCE_DB,
  }))
  const usable = levels.filter((level) => !level.clipping)
  const reference = usable.find((level) => level.gainDb === 0) ?? usable.at(-1) ?? null
  report.push({
    file: name,
    referenceGainDb: reference?.gainDb ?? null,
    levels: levels.map((level) => ({
      gainDb: level.gainDb,
      peakDbfs: level.peakDbfs,
      rmsDbfs: level.rmsDbfs,
      clipping: level.clipping,
      linear: linearity.find((entry) => entry.gainDb === level.gainDb).linear,
      ceiling: level.ceiling,
      floor: level.floor,
      comparison: reference && !level.clipping && level !== reference ? compare(reference, level) : null,
    })),
  })
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'gain-sweep.json'), JSON.stringify({ levels: LEVELS, files: report }, null, 2) + '\n')

// Sintesi Markdown: mediana e caso peggiore sul corpus, solo livelli senza
// clipping e solo confronti con un riferimento valido.
const median = (values) => {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (!sorted.length) return NaN
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const fmt = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—'
const pct = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(0)} %` : '—'
const relativeOffset = (level, ref) => level.gainDb - ref
const lines = []
lines.push('# Gain sweep delle feature experimental — PIANO-059 Fase 2')
lines.push('')
lines.push(`Generato da \`scripts/calibration/gain-sweep-features.mjs\` su ${report.length} campioni, livelli ${LEVELS.join(', ')} dB. Dati completi in \`gain-sweep.json\`.`)
lines.push('')
lines.push('## Livelli esclusi e riferimenti')
lines.push('')
lines.push('Picco per canale della sorgente; il motore riceve il downmix ½(L+R), come in produzione.')
lines.push('')
lines.push('| Campione | picco a 0 dB | livelli con clipping (esclusi) | riferimento | guadagno lineare |')
lines.push('|---|---:|---|---:|---|')
for (const entry of report) {
  const zero = entry.levels.find((level) => level.gainDb === 0)
  const clipped = entry.levels.filter((level) => level.clipping).map((level) => level.gainDb)
  const nonLinear = entry.levels.filter((level) => !level.linear).map((level) => level.gainDb)
  lines.push(`| \`${entry.file}\` | ${fmt(zero.peakDbfs, 1)} dBFS | ${clipped.length ? clipped.join(', ') : 'nessuno'} | ${entry.referenceGainDb ?? '—'} dB | ${nonLinear.length ? `scarto a ${nonLinear.join(', ')}` : 'sì'} |`)
}
lines.push('')
const offsets = [...new Set(report.flatMap((entry) => entry.levels
  .filter((level) => level.comparison)
  .map((level) => relativeOffset(level, entry.referenceGainDb))))].sort((a, b) => a - b)
lines.push('Le tabelle seguenti raggruppano per **scarto dal riferimento** (non per livello assoluto), così un file con riferimento a −6 dB entra nella colonna giusta. `n` = campioni che contribuiscono.')
lines.push('')
for (const name of Object.keys(FEATURES)) {
  lines.push(`## \`${name}\``)
  lines.push('')
  lines.push('| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |')
  lines.push('|---:|---:|---:|---|---|---|')
  for (const offset of offsets) {
    const rows = report.flatMap((entry) => entry.levels
      .filter((level) => level.comparison && relativeOffset(level, entry.referenceGainDb) === offset)
      .map((level) => ({ file: entry.file, ...level.comparison.features[name] })))
    if (!rows.length) continue
    const relative = rows.map((row) => row.relativeDelta).filter((value) => value !== null)
    const worstRelative = relative.length ? relative.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a) : NaN
    const worstRelativeFile = rows.find((row) => row.relativeDelta === worstRelative)?.file
    const rs = rows.map((row) => row.trajectoryR).filter(Number.isFinite)
    const minR = rs.length ? Math.min(...rs) : NaN
    const minRFile = rows.find((row) => row.trajectoryR === minR)?.file
    const flips = rows.map((row) => row.trendFlips).filter((value) => value !== null)
    const worstFlip = flips.length ? Math.max(...flips) : NaN
    const worstFlipFile = rows.find((row) => row.trendFlips === worstFlip)?.file
    lines.push(`| ${offset > 0 ? '+' : ''}${offset} dB | ${rows.length} | ${fmt(median(rows.map((row) => row.delta)), 3)} | ${pct(median(relative))} / ${pct(worstRelative)}${worstRelativeFile ? ` (\`${worstRelativeFile}\`)` : ''} | ${fmt(median(rs))} / ${fmt(minR)}${minRFile ? ` (\`${minRFile}\`)` : ''} | ${pct(median(flips))} / ${pct(worstFlip)}${worstFlipFile && worstFlip > 0 ? ` (\`${worstFlipFile}\`)` : ''} |`)
  }
  lines.push('')
}
lines.push('## Saturazioni per banda')
lines.push('')
lines.push('Quota media dei bin FFT della banda al tetto della scala (255, cioè ≥ −10 dB) e al pavimento (0, cioè ≤ −90 dB), per livello assoluto, mediana sul corpus e caso peggiore.')
lines.push('')
lines.push('| livello | ' + BANDS.map((band) => `${band} tetto`).join(' | ') + ' | ' + BANDS.map((band) => `${band} pavimento`).join(' | ') + ' |')
lines.push('|---:|' + BANDS.map(() => '---').join('|') + '|' + BANDS.map(() => '---').join('|') + '|')
for (const gainDb of LEVELS) {
  const levelRows = report.map((entry) => entry.levels.find((level) => level.gainDb === gainDb))
  const cell = (kind, band) => {
    const values = levelRows.map((level) => level[kind][band])
    return `${pct(median(values))} / ${pct(Math.max(...values))}`
  }
  lines.push(`| ${gainDb > 0 ? '+' : ''}${gainDb} dB | ${BANDS.map((band) => cell('ceiling', band)).join(' | ')} | ${BANDS.map((band) => cell('floor', band)).join(' | ')} |`)
}
lines.push('')
lines.push('## Onset per banda rispetto al riferimento')
lines.push('')
lines.push('Rapporto fra l\'incremento positivo medio per fotogramma della banda al livello e quello al riferimento (1 = invariato, < 1 = onset che collassano). Mediana / minimo.')
lines.push('')
lines.push('| scarto | ' + BANDS.join(' | ') + ' |')
lines.push('|---:|' + BANDS.map(() => '---').join('|') + '|')
for (const offset of offsets) {
  const comparisons = report.flatMap((entry) => entry.levels
    .filter((level) => level.comparison && relativeOffset(level, entry.referenceGainDb) === offset)
    .map((level) => level.comparison))
  if (!comparisons.length) continue
  lines.push(`| ${offset > 0 ? '+' : ''}${offset} dB | ${BANDS.map((band) => {
    const values = comparisons.map((comparison) => comparison.onsetRatio[band]).filter((value) => value !== null)
    return `${fmt(median(values))} / ${fmt(Math.min(...values))}`
  }).join(' | ')} |`)
}
lines.push('')
lines.push('## Verso e regime emessi rispetto al riferimento')
lines.push('')
lines.push('Quota di tick (0,5 s, solo dopo l\'avvio) in cui verso di `constraint` o regime emesso differiscono dal riferimento. Mediana / peggiore.')
lines.push('')
lines.push('| scarto | verso diverso | regime diverso |')
lines.push('|---:|---|---|')
for (const offset of offsets) {
  const rows = report.flatMap((entry) => entry.levels
    .filter((level) => level.comparison && relativeOffset(level, entry.referenceGainDb) === offset)
    .map((level) => ({ file: entry.file, ...level.comparison })))
  if (!rows.length) continue
  const worst = (key) => {
    const value = Math.max(...rows.map((row) => row[key]))
    return `${pct(value)} (\`${rows.find((row) => row[key] === value).file}\`)`
  }
  lines.push(`| ${offset > 0 ? '+' : ''}${offset} dB | ${pct(median(rows.map((row) => row.directionDisagreement)))} / ${worst('directionDisagreement')} | ${pct(median(rows.map((row) => row.regimeDisagreement)))} / ${worst('regimeDisagreement')} |`)
}
lines.push('')
writeFileSync(join(OUT_DIR, 'gain-sweep.md'), lines.join('\n'))
console.log(`\nOutput: ${join(OUT_DIR, 'gain-sweep.md')}, ${join(OUT_DIR, 'gain-sweep.json')}`)
