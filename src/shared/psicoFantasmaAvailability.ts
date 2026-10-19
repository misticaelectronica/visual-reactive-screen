declare const __PSICOFANTASMA_AVAILABLE__: boolean

/** Set by the build once the curated repertoire is present (matcher geometrico,
 * nessun encoder — PIANO-043 034-17). */
export function isPsicoFantasmaBundled(): boolean {
  return typeof __PSICOFANTASMA_AVAILABLE__ !== 'undefined' && __PSICOFANTASMA_AVAILABLE__
}
