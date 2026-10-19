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

describe('writeBrainPhrasesFile', () => {
  afterEach(() => {
    files.clear()
  })

  it('scrive il contenuto grezzo passato dal renderer, sostituendo brainPhrases.txt', async () => {
    files.set('/project/config/brainPhrases.txt', 'Sequenza vecchia da sostituire.\n')
    const { writeBrainPhrasesFile } = await import('./brainConfigFiles')

    await writeBrainPhrasesFile('Paragrafo 1\nINPUT A\nParagrafo 2\n')

    expect(files.get('/project/config/brainPhrases.txt')).toBe(
      'Paragrafo 1\nINPUT A\nParagrafo 2\n',
    )
  })
})
