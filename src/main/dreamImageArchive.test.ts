import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DreamImageArchive, type SaveDreamImageRequest } from './dreamImageArchive'

function request(overrides: Partial<SaveDreamImageRequest> = {}): SaveDreamImageRequest {
  return {
    tag: 'soglia+quiete',
    storyId: 'story-1',
    frameId: 'frame-1',
    frameIndex: 0,
    energy: 0.3,
    title: 'Test',
    bytes: new Uint8Array([1, 2, 3]),
    ...overrides,
  }
}

describe('DreamImageArchive', () => {
  let temporaryRoot = ''
  let archive: DreamImageArchive
  let nowValue = 1

  beforeEach(async () => {
    nowValue = 1
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'dream-images-test-'))
    archive = new DreamImageArchive(temporaryRoot, {
      now: () => nowValue,
      archiveCapPerTag: 3,
    })
  })

  afterEach(async () => {
    await rm(temporaryRoot, { recursive: true, force: true })
  })

  it('salva un\'immagine e la ritrova nell\'indice', async () => {
    const result = await archive.save(request())
    expect(result.ok).toBe(true)
    const entries = await archive.queryEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].tag).toBe('soglia+quiete')
    expect(entries[0].storyId).toBe('story-1')
  })

  it('scrive il file byte-per-byte, recuperabile con loadImages', async () => {
    await archive.save(request())
    const entries = await archive.queryEntries()
    const loaded = await archive.loadImages([entries[0].fileName])
    expect(loaded).toHaveLength(1)
    expect([...loaded[0].bytes]).toEqual([1, 2, 3])
  })

  it('salta silenziosamente un file mancante in loadImages', async () => {
    const loaded = await archive.loadImages(['non-esiste.webp'])
    expect(loaded).toEqual([])
  })

  it('evinge le immagini più vecchie del tag oltre il budget, cancellando i file su disco', async () => {
    for (let index = 0; index < 5; index += 1) {
      nowValue = index + 1
      await archive.save(request({ frameId: `frame-${index}` }))
    }
    const entries = await archive.queryEntries()
    expect(entries).toHaveLength(3)
    const filesOnDisk = (await readdir(temporaryRoot)).filter((name) => name !== 'index.json')
    expect(filesOnDisk).toHaveLength(3)
  })

  it('non tocca i tag diversi quando ne evinge uno', async () => {
    for (let index = 0; index < 5; index += 1) {
      nowValue = index + 1
      await archive.save(request({ frameId: `frame-${index}` }))
    }
    nowValue = 100
    await archive.save(request({ frameId: 'other', tag: 'eco+rilascio' }))
    const entries = await archive.queryEntries()
    expect(entries.filter((entry) => entry.tag === 'eco+rilascio')).toHaveLength(1)
    expect(entries.filter((entry) => entry.tag === 'soglia+quiete')).toHaveLength(3)
  })

  it('l\'indice su disco è JSON leggibile indipendentemente', async () => {
    await archive.save(request())
    const raw = await readFile(path.join(temporaryRoot, 'index.json'), 'utf8')
    const parsed = JSON.parse(raw)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
  })
})
