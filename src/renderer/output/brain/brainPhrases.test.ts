import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OutputApi } from '@shared/types'
import {
  loadBrainPhrases,
  parseBrainPhrases,
  sampleBrainPhrases,
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
    expect(sampleBrainPhrases(2)).toEqual(expect.arrayContaining([
      'Prima versione.',
      'Seconda versione.',
    ]))

    await loadBrainPhrases()
    expect(sampleBrainPhrases(2)).toEqual(expect.arrayContaining([
      'Contenuto modificato.',
      'Nuova frase.',
    ]))
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
