import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { FRAME_MS, decode, loadProductionClocks, replay } from './lib/corpusReplay.mjs'

// PIANO-059 Fase 1 — replay del corpus contro marcature temporali.
// Le marcature (`docs/campioni/marcature.json`, guida in `MARCATURE.md`) le
// assegna l'Analisi Audio. Questo strumento non le deduce in alcun modo: un
// tratto senza regione è NON ANNOTATO e resta fuori da ogni punteggio,
// insieme alle regioni `unresolved-ground-truth` (brief di autorizzazione
// PIANO-059 §1-§2).
//
// Uso: node scripts/calibration/replay-annotated-corpus.mjs
//        [--marcature <file.json>] [--out <file.json>] [campione.mp3 ...]
const CAMPIONI_DIR = 'docs/campioni'
const EXPECTED = ['pressurized', 'decompression', 'respiro-alto', 'respiro-profondo', 'unresolved-ground-truth']
const ROLES = ['prima', 'trasformazione', 'dopo', 'altro']
const CONFIDENCES = ['alta', 'media', 'bassa']
const AMBIGUOUS = 'unresolved-ground-truth'

const args = process.argv.slice(2)
function option(name, fallback) {
  const index = args.indexOf(name)
  if (index < 0) return fallback
  const [, value] = args.splice(index, 2)
  return value
}
const annotationsPath = option('--marcature', join(CAMPIONI_DIR, 'marcature.json'))
const outPath = option('--out', 'working/calibration-v1/piano-059/annotated-replay.json')
const files = args.length > 0
  ? args
  : readdirSync(CAMPIONI_DIR).filter((name) => name.endsWith('.mp3')).sort().map((name) => join(CAMPIONI_DIR, name))

function parseTime(value, where) {
  const match = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(String(value))
  if (!match || Number(match[2]) >= 60) throw new Error(`${where}: tempo non valido «${value}» (atteso m:ss o m:ss.s)`)
  return Number(match[1]) * 60 + Number(match[2])
}

function loadAnnotations(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  if (data.schemaVersion !== 1) throw new Error(`${path}: schemaVersion ${data.schemaVersion} non supportata`)
  const byFile = new Map()
  for (const [file, entry] of Object.entries(data.campioni ?? {})) {
    const regions = (entry.regioni ?? []).map((region, index) => {
      const where = `${file} regione ${index + 1}`
      if (!EXPECTED.includes(region.atteso)) throw new Error(`${where}: atteso «${region.atteso}» non ammesso`)
      if (!CONFIDENCES.includes(region.confidenza)) throw new Error(`${where}: confidenza «${region.confidenza}» non ammessa`)
      if (region.ruolo !== undefined && !ROLES.includes(region.ruolo)) throw new Error(`${where}: ruolo «${region.ruolo}» non ammesso`)
      const start = parseTime(region.inizio, where)
      const end = parseTime(region.fine, where)
      if (end <= start) throw new Error(`${where}: fine non successiva all'inizio`)
      return { ...region, start, end, index: index + 1 }
    }).sort((a, b) => a.start - b.start)
    for (let i = 1; i < regions.length; i += 1) {
      if (regions[i].start < regions[i - 1].end) {
        throw new Error(`${file}: regioni ${regions[i - 1].index} e ${regions[i].index} sovrapposte`)
      }
    }
    byFile.set(file, { marcatoDa: entry.marcatoDa ?? null, marcatoIl: entry.marcatoIl ?? null, regions })
  }
  return byFile
}

const annotations = loadAnnotations(annotationsPath)
const corpusNames = new Set(readdirSync(CAMPIONI_DIR))
for (const name of annotations.keys()) {
  if (!corpusNames.has(name)) console.warn(`ATTENZIONE: «${name}» è in ${annotationsPath} ma non esiste in ${CAMPIONI_DIR}/: le sue marcature non vengono lette.`)
}
const clocks = await loadProductionClocks()
const seconds = (frames) => Number((frames * FRAME_MS / 1_000).toFixed(2))
const results = []

for (const file of files) {
  const name = basename(file)
  const annotation = annotations.get(name) ?? { marcatoDa: null, marcatoIl: null, regions: [] }
  const decoded = decode(file)
  for (const region of annotation.regions) {
    if (region.end > decoded.contentSeconds + 0.05) {
      throw new Error(`${name} regione ${region.index}: fine ${region.fine} oltre la durata (${decoded.contentSeconds.toFixed(1)} s)`)
    }
  }
  const tally = {
    totalFrames: 0,
    notAnnotatedFrames: 0,
    ambiguousFrames: 0,
    regions: annotation.regions.map((region) => ({
      index: region.index,
      inizio: region.inizio,
      fine: region.fine,
      atteso: region.atteso,
      ruolo: region.ruolo ?? null,
      confidenza: region.confidenza,
      frames: 0,
      emitted: {},
      firstMatchAt: null,
    })),
  }
  let cursor = 0
  replay(clocks, decoded.samples, ({ t, regime }) => {
    tally.totalFrames += 1
    while (cursor < annotation.regions.length && t >= annotation.regions[cursor].end) cursor += 1
    const region = annotation.regions[cursor]
    if (!region || t < region.start) {
      tally.notAnnotatedFrames += 1
      return
    }
    const slot = tally.regions[cursor]
    slot.frames += 1
    slot.emitted[regime] = (slot.emitted[regime] ?? 0) + 1
    if (region.atteso === AMBIGUOUS) {
      tally.ambiguousFrames += 1
      return
    }
    if (regime === region.atteso && slot.firstMatchAt === null) slot.firstMatchAt = t - region.start
  })

  const scored = tally.regions.filter((region) => region.atteso !== AMBIGUOUS)
  const byConfidence = {}
  for (const region of scored) {
    const bucket = byConfidence[region.confidenza] ??= { frames: 0, correct: 0, engineUnresolved: 0 }
    bucket.frames += region.frames
    bucket.correct += region.emitted[region.atteso] ?? 0
    bucket.engineUnresolved += region.emitted.unresolved ?? 0
  }
  results.push({
    file: name,
    marcatoDa: annotation.marcatoDa,
    marcatoIl: annotation.marcatoIl,
    durataSecondi: seconds(tally.totalFrames),
    nonAnnotatoSecondi: seconds(tally.notAnnotatedFrames),
    ambiguoSecondi: seconds(tally.ambiguousFrames),
    perConfidenza: Object.fromEntries(Object.entries(byConfidence).map(([level, bucket]) => [level, {
      annotatoSecondi: seconds(bucket.frames),
      corrispondenzaSecondi: seconds(bucket.correct),
      motoreNonRisoltoSecondi: seconds(bucket.engineUnresolved),
      corrispondenza: bucket.frames > 0 ? Number((bucket.correct / bucket.frames).toFixed(3)) : null,
    }])),
    regioni: tally.regions.map((region) => ({
      ...region,
      frames: undefined,
      secondi: seconds(region.frames),
      emesso: Object.fromEntries(Object.entries(region.emitted).map(([regime, frames]) => [regime, seconds(frames)])),
      emitted: undefined,
      primaCorrispondenzaDopoSecondi: region.firstMatchAt === null ? null : Number(region.firstMatchAt.toFixed(2)),
      firstMatchAt: undefined,
    })),
  })
}

console.log(`Marcature: ${annotationsPath}`)
for (const result of results) {
  const annotated = Object.values(result.perConfidenza).reduce((sum, bucket) => sum + bucket.annotatoSecondi, 0)
  if (annotated === 0 && result.ambiguoSecondi === 0) {
    console.log(`${result.file.padEnd(28)} NON ANNOTATO (${result.durataSecondi} s)`)
    continue
  }
  console.log(`${result.file.padEnd(28)} durata ${result.durataSecondi} s, non annotato ${result.nonAnnotatoSecondi} s, ambiguo ${result.ambiguoSecondi} s`)
  for (const [level, bucket] of Object.entries(result.perConfidenza)) {
    console.log(`    confidenza ${level.padEnd(5)}: corrispondenza ${bucket.corrispondenzaSecondi}/${bucket.annotatoSecondi} s (${bucket.corrispondenza}), di cui motore non risolto ${bucket.motoreNonRisoltoSecondi} s`)
  }
  for (const region of result.regioni) {
    if (region.atteso === AMBIGUOUS) {
      console.log(`    ${region.inizio}–${region.fine} AMBIGUA, fuori punteggio: emesso ${JSON.stringify(region.emesso)}`)
      continue
    }
    const first = region.primaCorrispondenzaDopoSecondi === null ? 'mai' : `dopo ${region.primaCorrispondenzaDopoSecondi} s`
    console.log(`    ${region.inizio}–${region.fine} atteso ${region.atteso} (${region.confidenza}): emesso ${JSON.stringify(region.emesso)}; prima corrispondenza ${first}`)
  }
}

const totals = {}
for (const result of results) {
  for (const [level, bucket] of Object.entries(result.perConfidenza)) {
    const total = totals[level] ??= { annotatoSecondi: 0, corrispondenzaSecondi: 0 }
    total.annotatoSecondi += bucket.annotatoSecondi
    total.corrispondenzaSecondi += bucket.corrispondenzaSecondi
  }
}
if (Object.keys(totals).length === 0) {
  console.log('\nNessuna regione annotata: nessun punteggio.')
} else {
  console.log('\nTotale sul solo tempo annotato, separato per confidenza:')
  for (const [level, total] of Object.entries(totals)) {
    console.log(`    ${level.padEnd(5)}: ${total.corrispondenzaSecondi.toFixed(1)}/${total.annotatoSecondi.toFixed(1)} s (${(total.corrispondenzaSecondi / total.annotatoSecondi).toFixed(3)})`)
  }
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify({ marcature: annotationsPath, risultati: results, totaliPerConfidenza: totals }, null, 2) + '\n')
console.log(`\nOutput: ${outPath}`)
