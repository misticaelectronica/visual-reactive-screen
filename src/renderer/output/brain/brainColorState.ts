// COLOR DIRECTION V1 (chiusura Vice Consigliere, 2026-09-17): un unico
// blocco testuale in inglese, aggiunto al prompt immagine, che descrive
// l'identità cromatica ORIGINALE con cui l'immagine deve nascere da Stable
// Diffusion. Deliberatamente indipendente da qualsiasi stato — nessun
// BrainBioRegime, nessuna pressione/decompressione/respiro, nessun Audio.
//
// Fondamento (teoria del colore / psicologia del colore / bioenergetica come
// riferimento fenomenologico, brief §5): nessuna equivalenza universale
// colore→emozione (niente "rosso = tensione"). Il testo descrive solo
// RELAZIONI percettive — competizione cromatica, contrasto, continuità,
// densità/profondità delle ombre, saturazione relativa, comportamento degli
// accenti — mai un significato fisso attribuito a un colore specifico. Le
// famiglie di palette (§7) sono una scelta Visual compatibile con questa
// direzione, non una conseguenza scientifica della teoria citata.
//
// PIANO-045: il runtime SD1.5 codifica ora tutto il prompt in blocchi CLIP
// da 75 token di contenuto (massimo 6), senza troncamento silenzioso.
// Questo blocco resta integro; verificare la ricezione degli embeddings
// separatamente dall'effettiva adesione cromatica del raster.
const COLOR_DIRECTION_LINES = [
  'Deep, restrained colour field, low chromatic competition, gentle contrast.',
  'Related, continuous colour families, uneven controlled saturation, rare deeper accents.',
  'Shadows keep density and readable detail.',
  'Avoid bright primaries, pastel grading, neon dominance, flat monochrome.',
] as const

const COLOR_DIRECTION_PALETTE_VARIANTS: readonly (readonly string[])[] = [
  ['graphite', 'petroleum', 'rust', 'blackened green'],
  ['dark burgundy', 'deep violet', 'blue-grey', 'graphite'],
  ['burnt earth', 'dark amber', 'rust', 'petroleum'],
  ['blackened green', 'deep violet', 'dark burgundy', 'dirty mauve'],
  ['petroleum', 'burnt earth', 'graphite', 'dark amber'],
  ['dirty mauve', 'blue-grey', 'rust', 'deep violet'],
]

// FNV-1a seguito da un avalanche a interi (variante splitmix32): la sola
// FNV-1a su chiavi quasi identiche (stesso storyId, frameId incrementale)
// distribuisce male sull'indice piccolo usato per scegliere la variante —
// stesso limite documentato in skills.md per `hashUnit` su indici piccoli.
function hashSeedKey(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  hash >>>= 0
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x2c1b3c6d)
  hash ^= hash >>> 12
  hash = Math.imul(hash, 0x297a2d39)
  hash ^= hash >>> 15
  return hash >>> 0
}

export function buildColorDirectionBlock(seedKey: string): string {
  const variant =
    COLOR_DIRECTION_PALETTE_VARIANTS[hashSeedKey(seedKey) % COLOR_DIRECTION_PALETTE_VARIANTS.length]
  return [
    'COLOR DIRECTION:',
    ...COLOR_DIRECTION_LINES,
    `Colour family: ${variant.join(', ')}.`,
  ].join('\n')
}
