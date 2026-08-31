// Ciclo di Revisione (PIANO-034): ogni 2-4 storie (casuale, sempre a
// confine di storia) la generazione si sospende del tutto e il sistema fa
// ritornare, deformate da un morphing intensificato, immagini già
// generate — non nuovo stimolo, ma rielaborazione di ciò che è già stato
// immaginato. Coerente con filosofia.md §1 (Lowen: carica/scarica,
// tensione/rilascio) e §2 (invarianti onirici, "un elemento ritorna
// deformato"). Le funzioni qui sono pure e derivano tutto da dati già
// esistenti su `DreamFrame` (frameIndex, energy) — zero costo di
// generazione aggiuntivo, nessun nuovo output richiesto a Qwen.

export type OneiricPhase = 'soglia' | 'metamorfosi' | 'condensazione' | 'eco'
export type BioenergeticState = 'tensione' | 'rilascio' | 'quiete'

export const REVISION_CYCLE_MIN_STORIES = 2
export const REVISION_CYCLE_MAX_STORIES = 4
export const REVISION_CYCLE_MIN_IMAGES = 5
export const REVISION_CYCLE_MAX_IMAGES = 9
export const REVISION_CYCLE_ARCHIVE_CAP_PER_TAG = 24
export const REVISION_CYCLE_BOOST_MULTIPLIER = 1.35
// Le immagini scelte non passano una volta sola: girano più volte
// ("giri"/lap), ciascuno più breve del precedente — un ricordo richiamato
// ripetutamente si consuma più in fretta, non si dilata.
export const REVISION_CYCLE_LAPS = 3
export const REVISION_CYCLE_FIRST_LAP_DURATION_FACTOR = 0.7
export const REVISION_CYCLE_LATER_LAP_DURATION_FACTOR = 0.5

export type DreamImageArchiveEntry = {
  fileName: string
  tag: string
  storyId: string
  frameId: string
  frameIndex: number
  energy: number
  createdAt: number
  title: string
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * La fase onirica di un fotogramma è la sua posizione nella storia a 4
 * immagini (filosofia.md §2): soglia (prima), metamorfosi/condensazione
 * (le intermedie, in ordine), eco (ultima). Generalizzato a un numero
 * qualunque di fotogrammi, non solo 4.
 */
export function deriveOneiricPhase(frameIndex: number, frameCount: number): OneiricPhase {
  if (frameCount <= 1 || frameIndex >= frameCount - 1) return 'eco'
  if (frameIndex <= 0) return 'soglia'
  const middleSpan = Math.max(1, frameCount - 3)
  const middlePosition = (frameIndex - 1) / middleSpan
  return middlePosition < 0.5 ? 'metamorfosi' : 'condensazione'
}

/**
 * Lo stato bioenergetico (filosofia.md §1, Lowen: carica/scarica) si
 * deriva dall'energia del fotogramma e dal suo scarto rispetto al
 * precedente — non un valore assoluto isolato, ma una direzione: energia
 * che sale è tensione (carica), che scende è rilascio (scarica), stabile
 * e bassa è quiete.
 */
export function deriveBioenergeticState(
  energy: number,
  previousEnergy: number | null,
): BioenergeticState {
  const current = clamp01(energy)
  if (previousEnergy === null) {
    return current >= 0.6 ? 'tensione' : 'quiete'
  }
  const previous = clamp01(previousEnergy)
  if (current > previous + 0.02) return 'tensione'
  if (current < previous - 0.02) return 'rilascio'
  return current >= 0.6 ? 'tensione' : 'quiete'
}

export function combineRevisionTag(phase: OneiricPhase, state: BioenergeticState): string {
  return `${phase}+${state}`
}

export function pickStoriesUntilNextRevisionCycle(random: () => number = Math.random): number {
  const span = REVISION_CYCLE_MAX_STORIES - REVISION_CYCLE_MIN_STORIES + 1
  return REVISION_CYCLE_MIN_STORIES +
    Math.floor(Math.min(0.999_999, Math.max(0, random())) * span)
}

/**
 * La Riattivazione dipende dal proprio contatore e dal confine di storia,
 * non dalla disponibilità della prossima produzione né dal regime visivo.
 */
export function shouldStartRevisionCycleAtBoundary(
  storiesUntilNextCycle: number,
  active: boolean,
  starting: boolean,
): boolean {
  return storiesUntilNextCycle <= 0 && !active && !starting
}

export function pickRevisionImageCount(random: () => number = Math.random): number {
  const span = REVISION_CYCLE_MAX_IMAGES - REVISION_CYCLE_MIN_IMAGES + 1
  return REVISION_CYCLE_MIN_IMAGES +
    Math.floor(Math.min(0.999_999, Math.max(0, random())) * span)
}

/**
 * Durata di un fotogramma al giro `lapIndex` (0 = primo giro): -30% al
 * primo giro, -50% dal secondo in poi — un ricordo che ritorna già una
 * volta si consuma più in fretta la volta successiva.
 */
export function computeRevisionLapDurationMs(baseDurationMs: number, lapIndex: number): number {
  const factor = lapIndex <= 0
    ? REVISION_CYCLE_FIRST_LAP_DURATION_FACTOR
    : REVISION_CYCLE_LATER_LAP_DURATION_FACTOR
  return Math.max(1, Math.round(baseDurationMs * factor))
}

/**
 * Elimina le voci più vecchie di un tag quando superano il budget —
 * stesso principio di `storyMemoryCount`/`renderFrameCount`: il disco non
 * deve crescere indefinitamente. Ritorna sia le voci da conservare (tutti
 * i tag) sia quelle appena evitte (per poterne cancellare il file).
 */
export function pruneArchiveEntriesForTag(
  entries: readonly DreamImageArchiveEntry[],
  tag: string,
  cap: number = REVISION_CYCLE_ARCHIVE_CAP_PER_TAG,
): { kept: DreamImageArchiveEntry[]; evicted: DreamImageArchiveEntry[] } {
  const forTag = entries
    .filter((entry) => entry.tag === tag)
    .sort((left, right) => left.createdAt - right.createdAt)
  if (forTag.length <= cap) return { kept: [...entries], evicted: [] }
  const others = entries.filter((entry) => entry.tag !== tag)
  const evicted = forTag.slice(0, forTag.length - cap)
  const kept = forTag.slice(forTag.length - cap)
  return { kept: [...others, ...kept], evicted }
}

export type RevisionPoolSelection = {
  entries: DreamImageArchiveEntry[]
  tagUsed: string
}

/**
 * Sceglie da quale sottoinsieme dell'archivio pescare: prima il tag
 * combinato esatto (fase+stato), poi solo la fase onirica, poi
 * qualunque immagine disponibile. Non blocca su una soglia minima — anche
 * poche immagini vanno bene, "fino a" 10, non "esattamente" 10.
 */
export function selectRevisionPool(
  entries: readonly DreamImageArchiveEntry[],
  preferredPhase: OneiricPhase,
  preferredState: BioenergeticState,
): RevisionPoolSelection | null {
  const exactTag = combineRevisionTag(preferredPhase, preferredState)
  const exact = entries.filter((entry) => entry.tag === exactTag)
  if (exact.length > 0) return { entries: exact, tagUsed: exactTag }
  const byPhase = entries.filter((entry) => entry.tag.startsWith(`${preferredPhase}+`))
  if (byPhase.length > 0) return { entries: byPhase, tagUsed: preferredPhase }
  if (entries.length > 0) return { entries: [...entries], tagUsed: 'any' }
  return null
}

/** Fisher-Yates: varietà nella sequenza restituita, non le N più recenti. */
export function pickRevisionEntries(
  entries: readonly DreamImageArchiveEntry[],
  count: number,
  random: () => number = Math.random,
): DreamImageArchiveEntry[] {
  const pool = [...entries]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }
  return pool.slice(0, Math.max(0, count))
}
