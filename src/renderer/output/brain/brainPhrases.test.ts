import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OutputApi } from '@shared/types'
import {
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
