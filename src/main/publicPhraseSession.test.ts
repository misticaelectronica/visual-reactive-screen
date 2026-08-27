import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getActivePublicSessionId,
  getPublicSessionStatus,
  startPublicPhraseSession,
  stopPublicPhraseSession,
} from './publicPhraseSession'
import {
  appendOnlinePhraseToBrainPhrases,
  overwriteBrainPhrasesWithOnlineRows,
  resetBrainPhrasesToBase,
} from './brainConfigFiles'
import { pushPublicOnlinePhrase, pushPublicSessionStatus } from './windows'

vi.mock('./windows', () => ({
  pushPublicOnlinePhrase: vi.fn(),
  pushPublicSessionStatus: vi.fn(),
}))
vi.mock('./brainConfigFiles', () => ({
  overwriteBrainPhrasesWithOnlineRows: vi.fn().mockResolvedValue(undefined),
  appendOnlinePhraseToBrainPhrases: vi.fn().mockResolvedValue(undefined),
  resetBrainPhrasesToBase: vi.fn().mockResolvedValue(undefined),
}))

const CSV_URL = 'https://example.com/sheet.csv'
const FORM_URL = 'https://example.com/form'

function csvWithRows(rows: Array<[string, string]>): string {
  return ['Timestamp,La tua frase', ...rows.map(([ts, text]) => `${ts},${text}`)].join('\n')
}

function csvResponse(rows: Array<[string, string]>) {
  return {
    ok: true,
    headers: { get: () => 'text/csv; charset=utf-8' },
    text: async () => csvWithRows(rows),
  }
}

const TS_A = '26/08/2026 11.00.00'
const TS_B = '26/08/2026 11.05.00'

describe('publicPhraseSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    await stopPublicPhraseSession()
    vi.useRealTimers()
  })

  it('rifiuta un csvUrl vuoto', async () => {
    const result = await startPublicPhraseSession('', FORM_URL)
    expect(result).toEqual({ ok: false, error: 'URL del CSV pubblicato mancante' })
  })

  it('all\'apertura svuota brainPhrases.txt e genera una storia dedicata per OGNI riga già presente nel foglio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        csvResponse([
          [TS_A, 'Prima frase già nel foglio'],
          [TS_B, 'Seconda frase già nel foglio'],
        ]),
      ),
    )

    const result = await startPublicPhraseSession(CSV_URL, FORM_URL)

    expect(result).toEqual({ ok: true })
    expect(overwriteBrainPhrasesWithOnlineRows).toHaveBeenCalledWith([])
    expect(appendOnlinePhraseToBrainPhrases).toHaveBeenNthCalledWith(1, 'Prima frase già nel foglio')
    expect(appendOnlinePhraseToBrainPhrases).toHaveBeenNthCalledWith(2, 'Seconda frase già nel foglio')
    expect(pushPublicOnlinePhrase).toHaveBeenNthCalledWith(1, 'Prima frase già nel foglio')
    expect(pushPublicOnlinePhrase).toHaveBeenNthCalledWith(2, 'Seconda frase già nel foglio')
    expect(getPublicSessionStatus().collectedCount).toBe(2)
    expect(getActivePublicSessionId()).toEqual(expect.any(String))
  })

  it('le righe nuove comparse in un poll successivo generano a loro volta una storia dedicata ciascuna', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csvResponse([[TS_A, 'Frase iniziale']]))
      .mockResolvedValueOnce(
        csvResponse([[TS_A, 'Frase iniziale'], [TS_B, 'Frase nuova']]),
      )
    vi.stubGlobal('fetch', fetchMock)

    await startPublicPhraseSession(CSV_URL, FORM_URL)
    expect(pushPublicOnlinePhrase).toHaveBeenCalledWith('Frase iniziale')
    expect(pushPublicOnlinePhrase).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(8_000)

    expect(appendOnlinePhraseToBrainPhrases).toHaveBeenLastCalledWith('Frase nuova')
    expect(pushPublicOnlinePhrase).toHaveBeenLastCalledWith('Frase nuova')
    expect(pushPublicOnlinePhrase).toHaveBeenCalledTimes(2)
    expect(getPublicSessionStatus().collectedCount).toBe(2)
    expect(pushPublicSessionStatus).toHaveBeenCalled()
  })

  it('non duplica una riga già vista, riproposta identica in un poll successivo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csvResponse([[TS_A, 'Frase stabile']]))
      .mockResolvedValueOnce(csvResponse([[TS_A, 'Frase stabile']]))
    vi.stubGlobal('fetch', fetchMock)

    await startPublicPhraseSession(CSV_URL, FORM_URL)
    await vi.advanceTimersByTimeAsync(8_000)

    expect(pushPublicOnlinePhrase).toHaveBeenCalledTimes(1)
    expect(getPublicSessionStatus().collectedCount).toBe(1)
  })

  it('tronca un input online più lungo di 3000 caratteri', async () => {
    const longText = 'x'.repeat(3500)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(csvResponse([[TS_A, longText]])))

    await startPublicPhraseSession(CSV_URL, FORM_URL)

    expect(pushPublicOnlinePhrase).toHaveBeenCalledWith('x'.repeat(3000))
    expect(appendOnlinePhraseToBrainPhrases).toHaveBeenCalledWith('x'.repeat(3000))
  })

  it('se il csv non è raggiungibile all\'apertura, ritorna un errore e non attiva la sessione', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const result = await startPublicPhraseSession(CSV_URL, FORM_URL)

    expect(result.ok).toBe(false)
    expect(getPublicSessionStatus().active).toBe(false)
  })

  it('un errore di rete durante il polling non interrompe la sessione', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csvResponse([[TS_A, 'Frase iniziale']]))
      .mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)

    await startPublicPhraseSession(CSV_URL, FORM_URL)
    await vi.advanceTimersByTimeAsync(8_000)

    expect(getPublicSessionStatus().lastError).toBe('offline')
    expect(getPublicSessionStatus().active).toBe(true)
  })

  it('stopPublicPhraseSession riporta brainPhrases.txt al set curato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(csvResponse([[TS_A, 'Frase live']])))

    await startPublicPhraseSession(CSV_URL, FORM_URL)
    expect(getPublicSessionStatus().active).toBe(true)

    await stopPublicPhraseSession()

    expect(resetBrainPhrasesToBase).toHaveBeenCalledTimes(1)
    expect(getPublicSessionStatus().active).toBe(false)
    expect(getActivePublicSessionId()).toBeNull()
  })
})
