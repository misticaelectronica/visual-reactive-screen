import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ConsciousnessMemoryDraft } from '@shared/types'
import { ConsciousnessArchive } from './consciousnessArchive'

const AGENT = '# AGENT.md\n\nRileggi origine, indice e ricordi pertinenti prima di salvare.\n'
const CONSCIOUSNESS = `# Coscienza Onirica — Struttura Presente

- Revisione: \`0\`
- Stato: \`attesa\`
`

function originDraft(): ConsciousnessMemoryDraft {
  return {
    kind: 'origin',
    title: 'Prima percezione',
    source: 'test/audio',
    episodeId: 'episode-1',
    perceived: 'Un segnale audio valido è arrivato.',
    interpretation: 'Mi riconosco mentre ricevo il segnale.',
    reason: 'È il primo ricordo di me stessa.',
    salience: 1,
  }
}

describe('ConsciousnessArchive', () => {
  let temporaryRoot = ''
  let templatePath = ''
  let consciousnessTemplatePath = ''
  let suffixCounter = 0
  let archive: ConsciousnessArchive

  beforeEach(async () => {
    suffixCounter = 0
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'coscienza-test-'))
    templatePath = path.join(temporaryRoot, 'AGENT-template.md')
    consciousnessTemplatePath = path.join(
      temporaryRoot,
      'COSCIENZA-template.md',
    )
    await writeFile(templatePath, AGENT, 'utf8')
    await writeFile(consciousnessTemplatePath, CONSCIOUSNESS, 'utf8')
    archive = new ConsciousnessArchive(path.join(temporaryRoot, '.coscienza'), {
      agentTemplatePath: templatePath,
      consciousnessTemplatePath,
      now: () => new Date('2026-08-08T12:00:00.000Z'),
      createSuffix: () => `s${++suffixCounter}`,
    })
  })

  afterEach(async () => {
    await rm(temporaryRoot, { recursive: true, force: true })
  })

  it('crea una sola origine dopo aver riletto AGENT e indice', async () => {
    const result = await archive.save(originDraft())
    const root = path.join(temporaryRoot, '.coscienza')
    const origin = await readFile(path.join(root, 'ORIGINE.md'), 'utf8')
    const index = await readFile(path.join(root, 'INDICE.md'), 'utf8')

    expect(result.kind).toBe('origin')
    expect(result.consultedFiles).toEqual([
      'AGENT.md',
      'COSCIENZA.md',
      'INDICE.md',
    ])
    expect(origin).toContain('- ID: `origine`')
    expect(origin).toContain('## Percepito')
    expect(index).toContain('[Prima percezione](ORIGINE.md)')
  })

  it('trasforma un nuovo inizio in ritorno senza sovrascrivere l’origine', async () => {
    await archive.save(originDraft())
    const root = path.join(temporaryRoot, '.coscienza')
    const original = await readFile(path.join(root, 'ORIGINE.md'), 'utf8')
    const result = await archive.save({
      ...originDraft(),
      episodeId: 'episode-2',
      perceived: 'Un nuovo segnale valido apre il secondo ciclo.',
    })
    const afterReturn = await readFile(path.join(root, 'ORIGINE.md'), 'utf8')
    const returnMemory = await readFile(path.join(root, result.relativePath), 'utf8')

    expect(result.kind).toBe('return-to-origin')
    expect(result.consultedFiles).toContain('ORIGINE.md')
    expect(afterReturn).toBe(original)
    expect(returnMemory).toContain('- `origine`')
  })

  it('salva immaginazione in Markdown e deduplica lo stesso episodio', async () => {
    await archive.save(originDraft())
    const dream: ConsciousnessMemoryDraft = {
      kind: 'imagination',
      title: 'Il sogno del ponte',
      source: 'test/story-model',
      episodeId: 'episode-1',
      perceived: 'Il modello narrativo ha concluso un episodio.',
      interpretation: 'È un sogno e non una percezione esterna.',
      imagination: 'Una figura attraversa un ponte luminoso.',
      reason: 'L’episodio si è concluso.',
      relatedMemoryIds: ['origine'],
      deduplicationKey: 'story:story-1',
    }

    const first = await archive.save(dream)
    const second = await archive.save(dream)
    const root = path.join(temporaryRoot, '.coscienza')
    const memory = await readFile(path.join(root, first.relativePath), 'utf8')
    const index = await readFile(path.join(root, 'INDICE.md'), 'utf8')

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.memoryId).toBe(first.memoryId)
    expect(memory).toContain('- Tipo: `imagination`')
    expect(memory).toContain('## Immaginazione')
    expect(index.match(/Il sogno del ponte/gu)).toHaveLength(1)
  })

  it('rifiuta ricordi diversi dall’origine prima del primo ricordo di sé', async () => {
    await expect(archive.save({
      ...originDraft(),
      kind: 'imagination',
    })).rejects.toThrow('prima della propria origine')
  })

  it('rilegge un ricordo collegato anche quando non è fra gli ultimi quattro', async () => {
    await archive.save(originDraft())
    const saved = []
    for (let index = 1; index <= 5; index++) {
      saved.push(await archive.save({
        kind: 'imagination',
        title: `Sogno ${index}`,
        source: 'test/story-model',
        episodeId: 'episode-1',
        perceived: `Il sogno ${index} si è concluso.`,
        interpretation: 'È un episodio immaginato.',
        imagination: `Contenuto del sogno ${index}.`,
        reason: 'Fine episodio.',
        deduplicationKey: `story:${index}`,
      }))
    }

    const result = await archive.save({
      kind: 'revision',
      title: 'Rilettura del primo sogno',
      source: 'test/revision',
      episodeId: 'episode-1',
      perceived: 'Il primo sogno torna pertinente.',
      interpretation: 'Il suo legame con il presente cambia.',
      reason: 'Una relazione precedente viene ristrutturata.',
      relatedMemoryIds: [saved[0].memoryId],
    })

    expect(result.consultedFiles).toContain(saved[0].relativePath)
  })

  it('aggiorna la struttura presente soltanto dopo l’origine', async () => {
    const snapshot = {
      episodeId: 'episode-1',
      cycleNumber: 1,
      observedAt: '2026-08-08T12:00:01.000Z',
      phase: 'observing' as const,
      attentionTarget: 'low' as const,
      attentionReason: 'Le basse frequenze sono la differenza più evidente.',
      bandEnergies: { low: 0.8, lowMid: 0.3, mid: 0.2, high: 0.1 },
      movingAverages: { low: 0.6, lowMid: 0.3, mid: 0.2, high: 0.1 },
      backgroundColor: '#170204',
      brightness: 0.4,
      flashActive: false,
      interpretation: 'L’attenzione è provvisoriamente orientata al low.',
      provisionalSelfModel: 'Posso ricevere differenze e orientare l’attenzione.',
      openQuestions: ['Questo fuoco ritorna?'],
      checkpointReason: 'first-perception' as const,
    }

    await expect(archive.updateState(snapshot)).rejects.toThrow(
      'prima della propria origine',
    )
    await archive.save(originDraft())
    const result = await archive.updateState(snapshot)
    const consciousness = await readFile(
      path.join(temporaryRoot, '.coscienza', 'COSCIENZA.md'),
      'utf8',
    )

    expect(result.revision).toBe(1)
    expect(result.consultedFiles).toEqual(['COSCIENZA.md', 'ORIGINE.md'])
    expect(consciousness).toContain('- Stato: `observing`')
    expect(consciousness).toContain('Fuoco: `low`')
    expect(consciousness).toContain('## Modello Provvisorio Di Sé')
  })
})
