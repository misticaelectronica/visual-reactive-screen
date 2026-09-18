import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OutputApi } from '@shared/types'
import {
  insertPhraseAtCursor,
  loadBrainPhrases,
  parseBrainPhrases,
  sampleBrainPhraseWindow,
} from './brainPhrases'

describe('configurazione esterna delle frasi Brain', () => {
  afterEach(() => {
    delete window.fxOutput
  })

  it('ignora righe vuote e commenti', () => {
    expect(parseBrainPhrases([
      '# commento',
      '',
      ' Prima frase. ',
      'Seconda frase.',
    ].join('\n'))).toEqual([
      'Prima frase.',
      'Seconda frase.',
    ])
  })

  it('rilegge il file prima di una nuova selezione senza usare il bundle', async () => {
    const readBrainConfigFile = vi.fn()
      .mockResolvedValueOnce('Prima versione.\nSeconda versione.')
      .mockResolvedValueOnce('Contenuto modificato.\nNuova frase.')
    window.fxOutput = {
      readBrainConfigFile,
    } as unknown as OutputApi

    await loadBrainPhrases()
    expect(sampleBrainPhraseWindow(0, 1).phrases).toEqual(['Prima versione.'])

    await loadBrainPhrases()
    expect(sampleBrainPhraseWindow(0, 1).phrases).toEqual(['Contenuto modificato.'])
    expect(readBrainConfigFile).toHaveBeenCalledTimes(2)
    expect(readBrainConfigFile).toHaveBeenNthCalledWith(1, 'brainPhrases.txt')
    expect(readBrainConfigFile).toHaveBeenNthCalledWith(2, 'brainPhrases.txt')
  })

  it('rifiuta un file senza frasi valide', async () => {
    window.fxOutput = {
      readBrainConfigFile: vi.fn().mockResolvedValue('# solo commenti\n\n'),
    } as unknown as OutputApi

    await expect(loadBrainPhrases()).rejects.toThrow('non contiene frasi valide')
  })
})

describe('finestra scorrevole sequenziale su BRAIN_PHRASES', () => {
  afterEach(() => {
    delete window.fxOutput
  })

  async function loadPhrases(lines: string[]): Promise<void> {
    window.fxOutput = {
      readBrainConfigFile: vi.fn().mockResolvedValue(lines.join('\n')),
    } as unknown as OutputApi
    await loadBrainPhrases()
  }

  it('legge righe contigue a partire dal cursore', async () => {
    await loadPhrases(['a', 'b', 'c', 'd', 'e'])
    expect(sampleBrainPhraseWindow(1, 3).phrases).toEqual(['b', 'c', 'd'])
  })

  it('si avvolge a fine file', async () => {
    await loadPhrases(['a', 'b', 'c', 'd', 'e'])
    expect(sampleBrainPhraseWindow(4, 3).phrases).toEqual(['e', 'a', 'b'])
  })

  it('avanza il cursore di un passo inferiore al conteggio, per la sovrapposizione', async () => {
    await loadPhrases(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    // overlap di test = BRAIN_CONFIG.phraseWindowOverlapCount (2): passo = count - overlap
    const first = sampleBrainPhraseWindow(0, 5)
    expect(first.nextCursor).toBe(3)
    const second = sampleBrainPhraseWindow(first.nextCursor, 5)
    expect(second.phrases).toEqual(['d', 'e', 'f', 'g', 'h'])
    expect(second.phrases.slice(0, 2)).toEqual(first.phrases.slice(-2))
  })

  it('non lascia mai che la finestra coincida con l’intero pool, su un pool minuscolo', async () => {
    // Caso reale osservato dal vivo: sessione pubblica appena aperta, solo
    // due righe raccolte, overlap di configurazione (2) pari al conteggio
    // richiesto. Senza il vincolo strutturale la finestra conterrebbe
    // sempre le stesse due righe, solo riordinate — la stessa storia due
    // volte, con soli i ponti invertiti.
    await loadPhrases(['prima riga pubblico', 'seconda riga pubblico'])
    const first = sampleBrainPhraseWindow(0, 5)
    expect(first.phrases).toEqual(['prima riga pubblico'])
    const second = sampleBrainPhraseWindow(first.nextCursor, 5)
    expect(second.phrases).toEqual(['seconda riga pubblico'])
    expect(second.phrases).not.toEqual(first.phrases)
  })

  it('con un pool di una sola riga non ha altra scelta che ripeterla', async () => {
    await loadPhrases(['unica riga'])
    const result = sampleBrainPhraseWindow(0, 5)
    expect(result.phrases).toEqual(['unica riga'])
    expect(result.nextCursor).toBeGreaterThanOrEqual(1)
  })
})

describe('insertPhraseAtCursor — BrainPhrasesBaseStory di Sessione', () => {
  it('inserisce esattamente al cursore, senza toccare le righe precedenti', () => {
    const result = insertPhraseAtCursor(
      ['Paragrafo 1', 'Paragrafo 2', 'Paragrafo 3', 'Paragrafo 4'],
      2,
      'INPUT A',
    )
    expect(result.lines).toEqual([
      'Paragrafo 1',
      'Paragrafo 2',
      'INPUT A',
      'Paragrafo 3',
      'Paragrafo 4',
    ])
    expect(result.nextCursor).toBe(3)
  })

  it('accoda input consecutivi nell’ordine di arrivo, prima del paragrafo successivo', () => {
    let state = { lines: ['Paragrafo 1', 'Paragrafo 2', 'Paragrafo 3', 'Paragrafo 4'], nextCursor: 2 }
    state = insertPhraseAtCursor(state.lines, state.nextCursor, 'INPUT A')
    state = insertPhraseAtCursor(state.lines, state.nextCursor, 'INPUT B')
    state = insertPhraseAtCursor(state.lines, state.nextCursor, 'INPUT C')
    expect(state.lines).toEqual([
      'Paragrafo 1',
      'Paragrafo 2',
      'INPUT A',
      'INPUT B',
      'INPUT C',
      'Paragrafo 3',
      'Paragrafo 4',
    ])
    expect(state.nextCursor).toBe(5)
  })

  it('normalizza il cursore come sampleBrainPhraseWindow quando eccede la lunghezza', () => {
    const result = insertPhraseAtCursor(['a', 'b', 'c', 'd'], 137, 'INPUT')
    // 137 % 4 = 1
    expect(result.lines).toEqual(['a', 'INPUT', 'b', 'c', 'd'])
    expect(result.nextCursor).toBe(2)
  })

  it('su un file vuoto inserisce come unica riga', () => {
    const result = insertPhraseAtCursor([], 0, 'INPUT')
    expect(result.lines).toEqual(['INPUT'])
    expect(result.nextCursor).toBe(1)
  })
})
