import type { PublicSessionStatus } from '@shared/types'
import { resetBrainPhrasesToBase } from './brainConfigFiles'
import { parsePublishedCsv, type PublishedCsvRow } from './googleSheetCsv'
import { pushPublicOnlinePhrase, pushPublicSessionStatus } from './windows'

const POLL_INTERVAL_MS = 8_000
const MAX_ONLINE_PHRASE_LENGTH = 3_000

type SessionState = {
  active: boolean
  sessionId: string
  sessionStartedAtMs: number
  csvUrl: string
  formUrl: string
  seenRowKeys: Set<string>
  collectedCount: number
  lastError: string | null
  timer: ReturnType<typeof setInterval> | null
}

let state: SessionState | null = null

function generateSessionId(): string {
  return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

function currentStatus(): PublicSessionStatus {
  if (!state) {
    return { active: false, startedAtIso: null, collectedCount: 0, lastError: null, formUrl: null }
  }
  return {
    active: state.active,
    startedAtIso: new Date(state.sessionStartedAtMs).toISOString(),
    collectedCount: state.collectedCount,
    lastError: state.lastError,
    formUrl: state.formUrl,
  }
}

export function getPublicSessionStatus(): PublicSessionStatus {
  return currentStatus()
}

export function getActivePublicSessionId(): string | null {
  return state?.active ? state.sessionId : null
}

/**
 * Ogni riga non ancora vista, sia trovata all'apertura sessione sia in un
 * poll successivo, ha lo stesso trattamento: si notifica al renderer
 * (`pushPublicOnlinePhrase`), che la inserisce esattamente al punto della
 * sequenza in cui si trova (`insertPhraseAtCursor` in `brainPhrases.ts`) e
 * la scrive su `brainPhrases.txt` — main non conosce quella posizione,
 * quindi non scrive più il file per conto proprio (BrainPhrasesBaseStory
 * di Sessione, disp. Capo Supremo 2026-09-18). Nessuna riga viene trattata
 * diversamente solo perché era già lì al momento dell'apertura.
 */
async function processRow(session: SessionState, row: PublishedCsvRow): Promise<boolean> {
  const rowKey = `${row.timestamp}|${row.text}`
  if (session.seenRowKeys.has(rowKey)) return false
  session.seenRowKeys.add(rowKey)
  const text = row.text.slice(0, MAX_ONLINE_PHRASE_LENGTH)
  session.collectedCount += 1
  console.log(`[publicPhraseSession] nuovo input online: "${text.slice(0, 80)}"`)
  pushPublicOnlinePhrase(text)
  return true
}

async function poll(): Promise<void> {
  if (!state) return
  const session = state
  console.log(
    `[publicPhraseSession] poll: csvUrl=${session.csvUrl} sessionId=${session.sessionId}`,
  )
  try {
    const response = await fetch(session.csvUrl)
    const contentType = response.headers.get('content-type') ?? ''
    console.log(
      `[publicPhraseSession] poll: risposta HTTP ${response.status}, content-type=${contentType}`,
    )
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const raw = await response.text()
    // Se il link non è quello di "Pubblica sul web" in CSV, o il foglio non
    // è davvero pubblico, Google risponde comunque con HTTP 200 ma con una
    // pagina HTML (login/errore di permessi) invece del CSV: senza questo
    // controllo il codice la interpreta come "0 righe" e resta in silenzio.
    const looksLikeCsv =
      contentType.includes('csv') || !raw.trimStart().toLowerCase().startsWith('<')
    if (!looksLikeCsv) {
      console.error(
        `[publicPhraseSession] poll: la risposta non sembra un CSV pubblicato (content-type=${contentType}, primi 200 caratteri): ${raw.slice(0, 200)}`,
      )
      throw new Error(
        'La risposta non è un CSV valido: verifica che l\'URL sia quello di "Pubblica sul web → CSV" e che il foglio sia davvero pubblico',
      )
    }
    const rows = parsePublishedCsv(raw)
    console.log(`[publicPhraseSession] poll: ${rows.length} righe totali nel CSV`)
    let newInThisPoll = 0
    for (const row of rows) {
      if (await processRow(session, row)) newInThisPoll += 1
    }
    console.log(`[publicPhraseSession] poll: ${newInThisPoll} righe nuove in questo giro`)
    session.lastError = null
  } catch (error) {
    console.error('[publicPhraseSession] poll: errore', error)
    session.lastError = error instanceof Error ? error.message : String(error)
  }
  pushPublicSessionStatus(currentStatus())
}

export async function startPublicPhraseSession(
  csvUrl: string,
  formUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!csvUrl.trim()) {
    return { ok: false, error: 'URL del CSV pubblicato mancante' }
  }
  if (state?.timer) clearInterval(state.timer)
  const sessionId = generateSessionId()

  // All'apertura sessione, brainPhrases.txt riparte da una copia fresca
  // della storia base curata (BrainPhrasesBaseStory di Sessione, disp.
  // Capo Supremo 2026-09-18) — non più vuoto: la storia principale deve
  // continuare ad avanzare paragrafo per paragrafo durante la sessione,
  // non restare ferma. Ogni riga già presente nel foglio in quel momento
  // viene trattata esattamente come una trovata in un poll successivo —
  // stessa funzione, nessuna scorciatoia.
  let rows: PublishedCsvRow[]
  try {
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const raw = await response.text()
    rows = parsePublishedCsv(raw)
    await resetBrainPhrasesToBase()
  } catch (error) {
    return {
      ok: false,
      error: `Impossibile leggere il CSV all'apertura sessione: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }

  state = {
    active: true,
    sessionId,
    sessionStartedAtMs: Date.now(),
    csvUrl,
    formUrl,
    seenRowKeys: new Set(),
    collectedCount: 0,
    lastError: null,
    timer: null,
  }
  console.log(`[publicPhraseSession] apertura sessione: ${rows.length} righe già presenti nel foglio`)
  for (const row of rows) {
    await processRow(state, row)
  }
  state.timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
  pushPublicSessionStatus(currentStatus())
  return { ok: true }
}

/** Sessione chiusa: brainPhrases.txt torna al set curato (brainPhrasesBaseStory.txt). */
export async function stopPublicPhraseSession(): Promise<void> {
  if (!state) return
  if (state.timer) clearInterval(state.timer)
  state.timer = null
  state.active = false
  try {
    await resetBrainPhrasesToBase()
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error)
  }
  pushPublicSessionStatus(currentStatus())
}
