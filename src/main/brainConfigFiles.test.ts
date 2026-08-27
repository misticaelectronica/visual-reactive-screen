import { afterEach, describe, expect, it, vi } from 'vitest'

const { files, readFile, writeFile, appendFile } = vi.hoisted(() => {
  const files = new Map<string, string>()
  return {
    files,
    readFile: vi.fn(async (path: string) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`ENOENT: ${path}`)
      return content
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content)
    }),
    appendFile: vi.fn(async (path: string, content: string) => {
      files.set(path, (files.get(path) ?? '') + content)
    }),
  }
})

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/project',
  },
}))

vi.mock('node:fs/promises', () => ({
  readFile,
  writeFile,
  appendFile,
  default: { readFile, writeFile, appendFile },
}))

describe('resetBrainPhrasesToBase', () => {
  afterEach(() => {
    files.clear()
  })

  it('sovrascrive brainPhrases.txt col contenuto di brainPhrasesBaseStory.txt', async () => {
    files.set('/project/config/brainPhrasesBaseStory.txt', 'Frase curata uno.\nFrase curata due.\n')
    files.set('/project/config/brainPhrases.txt', 'Roba raccolta online da buttare.\n')
    const { resetBrainPhrasesToBase } = await import('./brainConfigFiles')

    await resetBrainPhrasesToBase()

    expect(files.get('/project/config/brainPhrases.txt')).toBe(
      'Frase curata uno.\nFrase curata due.\n',
    )
  })

  it('resetBrainPhrasesToBaseIfPossible non lancia se il file base manca ancora', async () => {
    const { resetBrainPhrasesToBaseIfPossible } = await import('./brainConfigFiles')

    await expect(resetBrainPhrasesToBaseIfPossible()).resolves.toBeUndefined()
  })
})

describe('overwriteBrainPhrasesWithOnlineRows', () => {
  afterEach(() => {
    files.clear()
  })

  it('scrive una riga per elemento, collassando i newline interni in spazi', async () => {
    const { overwriteBrainPhrasesWithOnlineRows } = await import('./brainConfigFiles')

    await overwriteBrainPhrasesWithOnlineRows([
      'Frase singola.',
      'Frase\nsu più\nrighe.',
    ])

    expect(files.get('/project/config/brainPhrases.txt')).toBe(
      'Frase singola.\nFrase su più righe.\n',
    )
  })

  it('con array vuoto scrive un file vuoto', async () => {
    files.set('/project/config/brainPhrases.txt', 'Roba vecchia da sostituire.\n')
    const { overwriteBrainPhrasesWithOnlineRows } = await import('./brainConfigFiles')

    await overwriteBrainPhrasesWithOnlineRows([])

    expect(files.get('/project/config/brainPhrases.txt')).toBe('')
  })
})

describe('appendOnlinePhraseToBrainPhrases', () => {
  afterEach(() => {
    files.clear()
  })

  it('accoda una riga, collassando i newline interni in spazi', async () => {
    files.set('/project/config/brainPhrases.txt', 'Riga esistente.\n')
    const { appendOnlinePhraseToBrainPhrases } = await import('./brainConfigFiles')

    await appendOnlinePhraseToBrainPhrases('Nuova frase\nsu due righe.')

    expect(files.get('/project/config/brainPhrases.txt')).toBe(
      'Riga esistente.\nNuova frase su due righe.\n',
    )
  })
})
