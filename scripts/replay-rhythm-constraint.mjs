import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'

// Run from repository root: node scripts/replay-rhythm-constraint.mjs
// Execute the actual pure production module, without duplicating its formula.
const sourcePath = 'src/renderer/output/brain/brainBioPerception.ts'
const inputPath = 'working/calibration-v1/calibration-v1-log-warmed.jsonl'
const outputPath = 'working/calibration-v1/rhythm-constraint-replay.md'
const source = readFileSync(sourcePath, 'utf8')
const input = readFileSync(inputPath, 'utf8')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
})
const { advanceBioRhythmConstraint, calculateRhythmConstraint,
  calculatePerceptualPressure, createInitialBioRhythmConstraintState } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const rows = input.trim().split('\n').map((line) => JSON.parse(line))
let state = createInitialBioRhythmConstraintState()
let previousTime = rows[0].tGlobalMs
let maxBaselineError = 0
let maxRetainedEnvelopeError = 0
const groups = new Map()
for (const [index, row] of rows.entries()) {
  const dt = index === 0 ? 16 : row.tGlobalMs - previousTime
  if (!(dt >= 0) || !Number.isFinite(dt)) throw new Error('Non-monotonic timestamps')
  previousTime = row.tGlobalMs
  state = advanceBioRhythmConstraint(state, row.bands, row.transients, row.rhythm, dt)
  const c = row.diagnostics.pressureComponents
  const baseline = calculatePerceptualPressure(c.sustainedEnergy, c.spectralOccupancy,
    c.temporalOccupancy, c.rhythmConstraint)
  maxBaselineError = Math.max(maxBaselineError, Math.abs(baseline - row.signals.perceptualPressure))
  // Unknown warm-up state affects only the first 20 seconds of the continuous replay.
  if (row.tGlobalMs - rows[0].tGlobalMs < 20000) continue
  for (const key of ['lowEnd', 'gridDensity']) {
    maxRetainedEnvelopeError = Math.max(maxRetainedEnvelopeError,
      Math.abs(state[key] - row.diagnostics.rhythmConstraintComponents[key]))
  }
  const rhythm = calculateRhythmConstraint(state)
  const pressure = calculatePerceptualPressure(c.sustainedEnergy, c.spectralOccupancy,
    c.temporalOccupancy, rhythm)
  const record = { old: baseline, pressure, rhythm, pulse: state.pulse }
  if (!Object.values(record).every(Number.isFinite)) throw new Error('Non-finite result')
  if (!groups.has(row.file)) groups.set(row.file, [])
  groups.get(row.file).push({ ...record, time: row.tLocalMs })
}
if (maxBaselineError > 1e-12 || maxRetainedEnvelopeError > 1e-5) {
  throw new Error(`Replay integrity failed: ${maxBaselineError}, ${maxRetainedEnvelopeError}`)
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const med = (items, key) => median(items.map((r) => r[key])).toFixed(4)
const lines = [
  '# Replay isolato rhythmConstraint — 2026-09-04', '',
  'Confronto sugli stessi ingressi registrati, usando il modulo di produzione attuale.',
  'Le altre tre componenti sono quelle della baseline: nessuna nuova analisi FFT o simulazione del corpus.',
  'Sequenza continua originale; stato ritmico iniziale zero. Esclusi i primi 20 s globali perché il warm-up non è registrato.',
  'Il residuo massimo teorico dello stato pulse iniziale (0–1) dopo 20 s è exp(-20000/1800) < 0.000015.',
  'Non vengono ricalcolati regime, reference o mediana: questo è un confronto della sola pressione, non un collaudo live.',
  'Dieci file presenti; nessuna mappa verificabile C01–C09. Non attribuire gli identificativi per congettura.', '',
  `- Input SHA256: ${hash(input)}`,
  `- Modulo SHA256: ${hash(source)}`,
  `- Errore massimo ricostruzione PP baseline: ${maxBaselineError}`,
  `- Errore massimo lowEnd/gridDensity dopo esclusione: ${maxRetainedEnvelopeError}`, '',
  '| File | N | PP prima (mediana) | PP dopo (mediana) | Ritmo dopo | Pulse dopo |',
  '|---|---:|---:|---:|---:|---:|',
]
for (const [file, items] of groups) {
  lines.push(`| ${file} | ${items.length} | ${med(items, 'old')} | ${med(items, 'pressure')} | ${med(items, 'rhythm')} | ${med(items, 'pulse')} |`)
}
lines.push('', '## Andamento in finestre di 10 secondi', '',
  'Mediane per finestre locali, senza inferire le etichette Audio. Prima finestra del primo file esclusa dal warm-up.', '')
for (const [file, items] of groups) {
  const windows = new Map()
  for (const item of items) {
    const slot = Math.floor(item.time / 10000)
    if (!windows.has(slot)) windows.set(slot, [])
    windows.get(slot).push(item)
  }
  lines.push(`- ${file}: ` + [...windows].map(([slot, values]) =>
    `${slot * 10}–${slot * 10 + 10}s: ${med(values, 'old')} → ${med(values, 'pressure')}`).join('; '))
}
writeFileSync(outputPath, lines.join('\n') + '\n')
console.log(lines.slice(0, 26).join('\n'))
