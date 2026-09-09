#!/usr/bin/env node

/**
 * Normalizza il pacchetto PsicoFantasma approvato nel formato runtime.
 *
 * Gli SVG e il manifest sorgente restano immutati. I contorni derivano
 * esclusivamente dall'impronta morfologica 32x32 consegnata nel pacchetto,
 * così l'import non introduce una seconda interpretazione o curatela.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const PROJECT = process.cwd()
const SOURCE = path.resolve(PROJECT, process.argv[2] ?? 'docs/psicofantasma-repertoire-v2')
const OUTPUT = path.resolve(PROJECT, process.argv[3] ?? 'config/psicofantasma/repertoire.json')
const FAMILIES = ['human', 'animal', 'organic', 'everyday', 'artifact']
const SIZE = 32

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function fail(message) {
  throw new Error(`PsicoFantasma repertoire import: ${message}`)
}

function key(x, y) {
  return `${x},${y}`
}

function direction(a, b) {
  if (b[0] > a[0]) return 0
  if (b[1] > a[1]) return 1
  if (b[0] < a[0]) return 2
  return 3
}

function boundaryEdges(mask) {
  const edges = []
  const on = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE && mask[y * SIZE + x] === 1
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (!on(x, y)) continue
    if (!on(x, y - 1)) edges.push([[x, y], [x + 1, y]])
    if (!on(x + 1, y)) edges.push([[x + 1, y], [x + 1, y + 1]])
    if (!on(x, y + 1)) edges.push([[x + 1, y + 1], [x, y + 1]])
    if (!on(x - 1, y)) edges.push([[x, y + 1], [x, y]])
  }
  return edges
}

function removeCollinear(points) {
  let current = points
  let changed = true
  while (changed && current.length > 3) {
    changed = false
    const next = current.filter((point, index) => {
      const before = current[(index + current.length - 1) % current.length]
      const after = current[(index + 1) % current.length]
      const cross = (point[0] - before[0]) * (after[1] - point[1])
        - (point[1] - before[1]) * (after[0] - point[0])
      if (cross === 0) changed = true
      return cross !== 0
    })
    if (next.length >= 3) current = next
    else break
  }
  return current
}

function traceRings(mask) {
  const edges = boundaryEdges(mask).map(([a, b], index) => ({ a, b, index, used: false }))
  const starts = new Map()
  for (const edge of edges) {
    const list = starts.get(key(...edge.a)) ?? []
    list.push(edge)
    starts.set(key(...edge.a), list)
  }
  const rings = []
  for (const first of edges) {
    if (first.used) continue
    first.used = true
    const points = [first.a]
    let edge = first
    for (let guard = 0; guard <= edges.length; guard++) {
      const end = edge.b
      if (end[0] === first.a[0] && end[1] === first.a[1]) break
      points.push(end)
      const incoming = direction(edge.a, edge.b)
      const candidates = (starts.get(key(...end)) ?? []).filter(candidate => !candidate.used)
      candidates.sort((a, b) => {
        const da = direction(a.a, a.b), db = direction(b.a, b.b)
        const priority = d => [1, 0, 3, 2].indexOf((d - incoming + 4) % 4)
        return priority(da) - priority(db) || a.index - b.index
      })
      const next = candidates[0]
      if (!next) fail('open contour in morphological fingerprint')
      next.used = true
      edge = next
    }
    const ring = removeCollinear(points)
    if (ring.length >= 3) rings.push(ring.map(([x, y]) => [x / SIZE, y / SIZE]))
  }
  return rings
}

function pointInRings(x, y, rings) {
  let inside = false
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if ((a[1] > y) !== (b[1] > y)
      && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

function assertRoundTrip(id, mask, rings) {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const actual = pointInRings((x + 0.5) / SIZE, (y + 0.5) / SIZE, rings)
    if (actual !== Boolean(mask[y * SIZE + x])) fail(`${id}: contour does not reproduce fingerprint at ${x},${y}`)
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(SOURCE, 'repertoire.json'), 'utf8'))
  const validation = JSON.parse(await readFile(path.join(SOURCE, 'validation.json'), 'utf8'))
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== 120) fail('expected exactly 120 assets')
  if (validation.selected !== 120 || validation.outputSvgCount !== 120 || validation.networkAccess !== false) {
    fail('source validation does not certify the delivered package')
  }
  const svgNames = (await readdir(path.join(SOURCE, 'svg'))).filter(name => name.endsWith('.svg')).sort()
  const expectedNames = manifest.assets.map(asset => `${asset.id}.svg`).sort()
  if (JSON.stringify(svgNames) !== JSON.stringify(expectedNames)) fail('SVG files do not match manifest IDs')

  const ids = new Set()
  const silhouettes = []
  for (const asset of manifest.assets) {
    if (ids.has(asset.id)) fail(`duplicate ID ${asset.id}`)
    ids.add(asset.id)
    if (!FAMILIES.includes(asset.family)) fail(`${asset.id}: invalid family`)
    const svg = await readFile(path.join(SOURCE, 'svg', `${asset.id}.svg`))
    if (sha256(svg) !== asset.hash) fail(`${asset.id}: SVG hash mismatch`)
    const mask = Buffer.from(asset.morphologicalFingerprint, 'base64')
    if (mask.length !== SIZE * SIZE || [...mask].some(value => value !== 0 && value !== 1)) {
      fail(`${asset.id}: invalid 32x32 morphological fingerprint`)
    }
    if (![...mask].some(Boolean)) fail(`${asset.id}: empty morphological fingerprint`)
    const rings = traceRings(mask)
    assertRoundTrip(asset.id, mask, rings)
    const points = rings.reduce((total, ring) => total + ring.length, 0)
    if (!rings.length || rings.length > 32 || points > 2048 || rings.some(ring => ring.length > 512)) {
      fail(`${asset.id}: contour exceeds runtime budget (${rings.length} rings, ${points} points)`)
    }
    silhouettes.push({
      id: asset.id,
      archetype: asset.archetype,
      label: asset.label,
      family: asset.family,
      rings,
      source: `docs/psicofantasma-repertoire-v2/svg/${asset.id}.svg#sha256=${asset.hash}`,
      license: asset.license,
      approvedBy: 'Vice Consigliere del Capo Supremo — pacchetto approvato 2026-09-08',
    })
  }
  const counts = Object.fromEntries(FAMILIES.map(family => [family, silhouettes.filter(s => s.family === family).length]))
  if (Object.values(counts).some(count => count !== 24)) fail(`invalid family distribution: ${JSON.stringify(counts)}`)
  if (new Set(silhouettes.map(s => s.archetype)).size !== 40) fail('expected 40 guide archetypes')

  const output = {
    version: 1,
    sourcePackage: {
      name: manifest.name,
      generatedAt: manifest.generatedAt,
      manifestSha256: sha256(await readFile(path.join(SOURCE, 'repertoire.json'))),
      validationSha256: sha256(await readFile(path.join(SOURCE, 'validation.json'))),
    },
    silhouettes,
  }
  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)
  console.log(JSON.stringify({ output: path.relative(PROJECT, OUTPUT), silhouettes: silhouettes.length,
    archetypes: new Set(silhouettes.map(s => s.archetype)).size, families: counts }, null, 2))
}

await main()
