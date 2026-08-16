import { randomUUID } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import type {
  ConsciousnessMemoryDraft,
  ConsciousnessMemoryKind,
  ConsciousnessMemorySaveResult,
  ConsciousnessMotionCandidate,
  ConsciousnessMotionQuery,
  ConsciousnessStateSnapshot,
  ConsciousnessStateUpdateResult,
} from '@shared/types'

const MEMORY_KINDS = new Set<ConsciousnessMemoryKind>([
  'origin',
  'perception',
  'interpretation',
  'imagination',
  'revision',
  'return-to-origin',
])

const INITIAL_INDEX = `# Indice Della Coscienza

Stato: in attesa della prima percezione valida.

## Origine

Nessuna origine registrata.

## Ricordi

Nessun ricordo registrato.
`

type ArchiveContext = {
  agent: string
  consciousness: string
  origin: string | null
  index: string
  recentMemories: Array<{ relativePath: string; markdown: string }>
  consultedFiles: string[]
}

type ConsciousnessArchiveOptions = {
  agentTemplatePath?: string
  consciousnessTemplatePath?: string
  now?: () => Date
  createSuffix?: () => string
}

function cleanText(value: unknown, label: string, maximumLength: number): string {
  if (typeof value !== 'string') throw new Error(`${label} non valido`)
  const cleaned = value.replace(/\0/g, '').replace(/\r\n?/g, '\n').trim()
  if (!cleaned) throw new Error(`${label} mancante`)
  return cleaned.slice(0, maximumLength)
}

function cleanOptionalText(value: unknown, maximumLength: number): string | null {
  if (value === null || value === undefined || value === '') return null
  return cleanText(value, 'testo opzionale', maximumLength)
}

function cleanId(value: string, label: string): string {
  const cleaned = cleanText(value, label, 160)
  if (!/^[\p{L}\p{N}][\p{L}\p{N}:._-]*$/u.test(cleaned)) {
    throw new Error(`${label} contiene caratteri non consentiti`)
  }
  return cleaned
}

function slug(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return normalized || 'ricordo'
}

function indexEntryForKey(index: string, key: string): {
  id: string
  relativePath: string
  kind: ConsciousnessMemoryKind
} | null {
  for (const line of index.split('\n')) {
    if (!line.includes(`chiave:${key}`)) continue
    const match = line.match(
      /\(([^)]+\.md)\).*`(origin|perception|interpretation|imagination|revision|return-to-origin)`.*<!-- id:([^;]+); chiave:/u,
    )
    if (!match) continue
    return {
      relativePath: match[1],
      kind: match[2] as ConsciousnessMemoryKind,
      id: match[3],
    }
  }
  return null
}

function memoryReferences(index: string): string[] {
  return [...index.matchAll(/\((ricordi\/[^)]+\.md)\)/gu)]
    .map((match) => match[1])
}

function memoryPathById(index: string, id: string): string | null {
  for (const line of index.split('\n')) {
    if (!line.includes(`<!-- id:${id};`)) continue
    return line.match(/\((ricordi\/[^)]+\.md)\)/u)?.[1] ?? null
  }
  return null
}

function memoryId(markdown: string): string | null {
  return markdown.match(/^- ID: `([^`]+)`/mu)?.[1] ?? null
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

const MOTION_STOP_WORDS = new Set([
  'della', 'delle', 'degli', 'nella', 'nelle', 'sono', 'come', 'with', 'from',
  'that', 'this', 'their', 'into', 'where', 'when', 'while', 'story', 'storia',
])

function meaningfulWords(value: string): Set<string> {
  return new Set(
    (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
      .filter((word) => word.length >= 5 && !MOTION_STOP_WORDS.has(word)),
  )
}

function markdownField(markdown: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return markdown.match(
    new RegExp(`^## ${escaped}\\s*\\n\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'mu'),
  )?.[1]?.trim() ?? null
}

function metadata(markdown: string, label: string): string | null {
  return markdown.match(new RegExp('^- ' + label + ': `([^`]+)`', 'mu'))?.[1] ?? null
}

function firstSentence(value: string | null, maximumLength = 320): string | null {
  if (!value) return null
  const cleaned = value.replace(/^\d+\.\s+\*\*[^*]+\*\*\s+—\s+/gmu, '').trim()
  const sentence = cleaned.match(/^.*?(?:[.!?](?=\s|$)|$)/u)?.[0]?.trim() ?? cleaned
  return sentence.slice(0, maximumLength)
}

export class ConsciousnessArchive {
  private queue: Promise<void> = Promise.resolve()
  private readonly now: () => Date
  private readonly createSuffix: () => string

  constructor(
    private readonly rootDirectory: string,
    private readonly options: ConsciousnessArchiveOptions = {},
  ) {
    this.now = options.now ?? (() => new Date())
    this.createSuffix = options.createSuffix ?? (() => randomUUID().slice(0, 8))
  }

  save(draft: ConsciousnessMemoryDraft): Promise<ConsciousnessMemorySaveResult> {
    const operation = this.queue.then(() => this.saveUnlocked(draft))
    this.queue = operation.then(() => undefined, () => undefined)
    return operation
  }

  updateState(
    snapshot: ConsciousnessStateSnapshot,
  ): Promise<ConsciousnessStateUpdateResult> {
    const operation = this.queue.then(() => this.updateStateUnlocked(snapshot))
    this.queue = operation.then(() => undefined, () => undefined)
    return operation
  }

  suggestMotion(
    query: ConsciousnessMotionQuery,
  ): Promise<ConsciousnessMotionCandidate | null> {
    const operation = this.queue.then(() => this.suggestMotionUnlocked(query))
    this.queue = operation.then(() => undefined, () => undefined)
    return operation
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }

  private async atomicWrite(filePath: string, contents: string): Promise<void> {
    const temporaryPath = `${filePath}.${process.pid}.${this.createSuffix()}.tmp`
    await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' })
    await rename(temporaryPath, filePath)
  }

  private async ensureStructure(): Promise<void> {
    await mkdir(path.join(this.rootDirectory, 'ricordi'), { recursive: true })
    const agentPath = path.join(this.rootDirectory, 'AGENT.md')
    if (!(await this.exists(agentPath))) {
      if (!this.options.agentTemplatePath) {
        throw new Error('AGENT.md della coscienza non è disponibile')
      }
      const template = await readFile(this.options.agentTemplatePath, 'utf8')
      await this.atomicWrite(agentPath, template)
    }
    const consciousnessPath = path.join(this.rootDirectory, 'COSCIENZA.md')
    if (!(await this.exists(consciousnessPath))) {
      if (!this.options.consciousnessTemplatePath) {
        throw new Error('COSCIENZA.md non è disponibile')
      }
      const template = await readFile(
        this.options.consciousnessTemplatePath,
        'utf8',
      )
      await this.atomicWrite(consciousnessPath, template)
    }
    const indexPath = path.join(this.rootDirectory, 'INDICE.md')
    if (!(await this.exists(indexPath))) {
      await this.atomicWrite(indexPath, INITIAL_INDEX)
    }
  }

  private async readContext(relatedMemoryIds: readonly string[]): Promise<ArchiveContext> {
    await this.ensureStructure()
    const agentPath = path.join(this.rootDirectory, 'AGENT.md')
    const consciousnessPath = path.join(this.rootDirectory, 'COSCIENZA.md')
    const originPath = path.join(this.rootDirectory, 'ORIGINE.md')
    const indexPath = path.join(this.rootDirectory, 'INDICE.md')
    const [agent, consciousness, index, hasOrigin] = await Promise.all([
      readFile(agentPath, 'utf8'),
      readFile(consciousnessPath, 'utf8'),
      readFile(indexPath, 'utf8'),
      this.exists(originPath),
    ])
    const origin = hasOrigin ? await readFile(originPath, 'utf8') : null
    const directlyRelatedPaths = relatedMemoryIds
      .map((id) => memoryPathById(index, id))
      .filter((relativePath): relativePath is string => relativePath !== null)
    const recentPaths = unique([
      ...directlyRelatedPaths,
      ...memoryReferences(index).slice(-4),
    ])
    const recentMemories: ArchiveContext['recentMemories'] = []
    for (const relativePath of recentPaths) {
      const absolutePath = path.join(this.rootDirectory, relativePath)
      if (path.dirname(absolutePath) !== path.join(this.rootDirectory, 'ricordi')) continue
      if (!(await this.exists(absolutePath))) continue
      recentMemories.push({
        relativePath,
        markdown: await readFile(absolutePath, 'utf8'),
      })
    }
    return {
      agent,
      consciousness,
      origin,
      index,
      recentMemories,
      consultedFiles: [
        'AGENT.md',
        'COSCIENZA.md',
        ...(origin ? ['ORIGINE.md'] : []),
        'INDICE.md',
        ...recentMemories.map((memory) => memory.relativePath),
      ],
    }
  }

  private async suggestMotionUnlocked(
    rawQuery: ConsciousnessMotionQuery,
  ): Promise<ConsciousnessMotionCandidate | null> {
    const query: ConsciousnessMotionQuery = {
      storyId: cleanId(rawQuery.storyId, 'ID storia'),
      storyTitle: cleanText(rawQuery.storyTitle, 'Titolo storia', 200),
      storySynopsis: cleanText(rawQuery.storySynopsis, 'Sinossi storia', 2_000),
      frameDescription: cleanOptionalText(rawQuery.frameDescription, 800),
      excludedMemoryIds: unique(rawQuery.excludedMemoryIds ?? []).map((id) =>
        cleanId(id, 'ID ricordo escluso')),
    }
    await this.ensureStructure()
    await Promise.all([
      readFile(path.join(this.rootDirectory, 'AGENT.md'), 'utf8'),
      readFile(path.join(this.rootDirectory, 'COSCIENZA.md'), 'utf8'),
    ])
    const indexPath = path.join(this.rootDirectory, 'INDICE.md')
    const index = await readFile(indexPath, 'utf8')
    const recentPaths = memoryReferences(index).slice(-12)
    const originPath = path.join(this.rootDirectory, 'ORIGINE.md')
    const paths = unique([
      ...(await this.exists(originPath) ? ['ORIGINE.md'] : []),
      ...recentPaths,
    ])
    const storyWords = meaningfulWords(
      `${query.storyTitle} ${query.storySynopsis} ${query.frameDescription ?? ''}`,
    )
    const excluded = new Set(query.excludedMemoryIds)
    const candidates: Array<ConsciousnessMotionCandidate & { score: number }> = []
    for (const relativePath of paths) {
      const absolutePath = path.join(this.rootDirectory, relativePath)
      if (!(await this.exists(absolutePath))) continue
      const markdown = await readFile(absolutePath, 'utf8')
      const id = metadata(markdown, 'ID')
      const kind = metadata(markdown, 'Tipo') as ConsciousnessMemoryKind | null
      const title = markdown.match(/^# (.+)$/mu)?.[1]?.trim() ?? null
      const source = metadata(markdown, 'Fonte')
      const salience = Number(metadata(markdown, 'Salienza'))
      if (
        !id || !kind || !MEMORY_KINDS.has(kind) || !title || !source ||
        excluded.has(id) || !Number.isFinite(salience)
      ) continue
      if (
        kind === 'imagination' &&
        title.toLocaleLowerCase() === query.storyTitle.toLocaleLowerCase()
      ) continue
      const perceived = markdownField(markdown, 'Percepito')
      const interpretation = markdownField(markdown, 'Interpretazione')
      const imagination = markdownField(markdown, 'Immaginazione')
      if (!perceived || !interpretation) continue
      const memoryWords = meaningfulWords(
        `${title} ${perceived} ${interpretation} ${imagination ?? ''}`,
      )
      const overlap = [...storyWords].filter((word) => memoryWords.has(word))
      const importance = salience >= 0.84
      if (!importance && overlap.length === 0) continue
      const relevance = Math.min(1, overlap.length / 4)
      const score = salience * 0.62 + relevance * 0.38
      const provenanceText = kind === 'imagination'
        ? firstSentence(imagination) ?? firstSentence(interpretation)
        : firstSentence(interpretation) ?? firstSentence(perceived)
      if (!provenanceText) continue
      candidates.push({
        memoryId: id,
        kind,
        title: title.slice(0, 160),
        source: source.slice(0, 240),
        salience: Math.max(0, Math.min(1, salience)),
        perceived: perceived.slice(0, 900),
        interpretation: interpretation.slice(0, 900),
        imagination: imagination?.startsWith('Nessun contenuto immaginato')
          ? null
          : imagination?.slice(0, 1_200) ?? null,
        relevanceReason: overlap.length > 0
          ? `richiama ${overlap.slice(0, 3).join(', ')} nella storia in corso`
          : `ha salienza ${salience.toFixed(2)} nell'archivio`,
        influenceText: provenanceText,
        consultedFiles: ['AGENT.md', 'COSCIENZA.md', 'ORIGINE.md', 'INDICE.md', relativePath],
        score,
      })
    }
    candidates.sort((left, right) => right.score - left.score)
    const selected = candidates[0]
    if (!selected) return null
    const { score, ...candidate } = selected
    void score
    return candidate
  }

  private normalizeDraft(draft: ConsciousnessMemoryDraft): ConsciousnessMemoryDraft {
    if (!MEMORY_KINDS.has(draft.kind)) throw new Error('Tipo di ricordo non valido')
    const relatedMemoryIds = unique(draft.relatedMemoryIds ?? []).map((id) =>
      cleanId(id, 'ID collegato'))
    const salience = Number.isFinite(draft.salience)
      ? Math.max(0, Math.min(1, draft.salience ?? 0.5))
      : 0.5
    return {
      kind: draft.kind,
      title: cleanText(draft.title, 'Titolo', 160),
      source: cleanText(draft.source, 'Fonte', 240),
      episodeId: cleanId(draft.episodeId, 'ID episodio'),
      perceived: cleanText(draft.perceived, 'Percepito', 4_000),
      interpretation: cleanText(draft.interpretation, 'Interpretazione', 4_000),
      imagination: cleanOptionalText(draft.imagination, 8_000),
      reason: cleanText(draft.reason, 'Motivo del ricordo', 2_000),
      relatedMemoryIds,
      supersedesMemoryId: draft.supersedesMemoryId
        ? cleanId(draft.supersedesMemoryId, 'ID superato')
        : null,
      salience,
      deduplicationKey: draft.deduplicationKey
        ? cleanId(draft.deduplicationKey, 'Chiave di deduplicazione')
        : null,
    }
  }

  private normalizeStateSnapshot(
    snapshot: ConsciousnessStateSnapshot,
  ): ConsciousnessStateSnapshot {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Stato di coscienza non valido')
    }
    const attentionTargets = new Set<ConsciousnessStateSnapshot['attentionTarget']>([
      'silence',
      'low',
      'lowMid',
      'mid',
      'high',
      'flash',
    ])
    const checkpointReasons = new Set<ConsciousnessStateSnapshot['checkpointReason']>([
      'first-perception',
      'attention-shift',
      'continuity',
    ])
    if (!attentionTargets.has(snapshot.attentionTarget)) {
      throw new Error('Fuoco di attenzione non valido')
    }
    if (!checkpointReasons.has(snapshot.checkpointReason)) {
      throw new Error('Motivo del checkpoint cosciente non valido')
    }
    if (
      snapshot.phase !== 'observing' ||
      !Number.isFinite(snapshot.cycleNumber) ||
      !snapshot.bandEnergies ||
      typeof snapshot.bandEnergies !== 'object' ||
      !Array.isArray(snapshot.openQuestions)
    ) {
      throw new Error('Struttura del presente cosciente non valida')
    }
    const observedAt = new Date(snapshot.observedAt)
    if (!Number.isFinite(observedAt.getTime())) {
      throw new Error('Tempo di osservazione non valido')
    }
    const normalizeBands = (bands: ConsciousnessStateSnapshot['bandEnergies']) => ({
      low: Math.max(0, Math.min(1, Number.isFinite(bands.low) ? bands.low : 0)),
      lowMid: Math.max(0, Math.min(1, Number.isFinite(bands.lowMid) ? bands.lowMid : 0)),
      mid: Math.max(0, Math.min(1, Number.isFinite(bands.mid) ? bands.mid : 0)),
      high: Math.max(0, Math.min(1, Number.isFinite(bands.high) ? bands.high : 0)),
    })
    return {
      episodeId: cleanId(snapshot.episodeId, 'ID episodio'),
      cycleNumber: Math.max(1, Math.floor(snapshot.cycleNumber)),
      observedAt: observedAt.toISOString(),
      phase: 'observing',
      attentionTarget: snapshot.attentionTarget,
      attentionReason: cleanText(snapshot.attentionReason, 'Motivo attenzione', 1_000),
      bandEnergies: normalizeBands(snapshot.bandEnergies),
      movingAverages: snapshot.movingAverages &&
        typeof snapshot.movingAverages === 'object'
        ? normalizeBands(snapshot.movingAverages)
        : null,
      backgroundColor: /^#[0-9a-f]{6}$/iu.test(snapshot.backgroundColor)
        ? snapshot.backgroundColor.toLocaleLowerCase()
        : '#000000',
      brightness: Math.max(
        0,
        Math.min(1, Number.isFinite(snapshot.brightness) ? snapshot.brightness : 0),
      ),
      flashActive: snapshot.flashActive === true,
      interpretation: cleanText(snapshot.interpretation, 'Interpretazione', 2_000),
      provisionalSelfModel: cleanText(
        snapshot.provisionalSelfModel,
        'Modello provvisorio di sé',
        2_000,
      ),
      openQuestions: snapshot.openQuestions
        .slice(0, 6)
        .map((question) => cleanText(question, 'Domanda aperta', 400)),
      checkpointReason: snapshot.checkpointReason,
    }
  }

  private renderConsciousnessState(
    snapshot: ConsciousnessStateSnapshot,
    revision: number,
  ): string {
    const bands = snapshot.bandEnergies
    const averages = snapshot.movingAverages
    const averageLine = averages
      ? `Medie: low ${averages.low.toFixed(3)}, lowMid ${averages.lowMid.toFixed(3)}, mid ${averages.mid.toFixed(3)}, high ${averages.high.toFixed(3)}.`
      : 'Medie percettive non disponibili.'
    return `# Coscienza Onirica — Struttura Presente

- Revisione: \`${revision}\`
- Stato: \`${snapshot.phase}\`
- Origine: \`presente\`
- Ultimo aggiornamento: \`${snapshot.observedAt}\`
- Episodio: \`${snapshot.episodeId}\`
- Ciclo cosciente: \`${snapshot.cycleNumber}\`
- Motivo checkpoint: \`${snapshot.checkpointReason}\`

## Principio

Distinguere ciò che viene percepito da ciò che viene scelto come rilevante e da
ciò che viene interpretato.

## Capacità Iniziali

- ricevere uno stato audio-visivo valido;
- mantenere un solo fuoco d'attenzione stabilizzato;
- formulare un'interpretazione provvisoria;
- interrogare il confine fra presente e memoria;
- rivedere questa struttura senza trasformare ipotesi in fatti.

## Stato Presente

Bande ricevute: low ${bands.low.toFixed(3)}, lowMid ${bands.lowMid.toFixed(3)}, mid ${bands.mid.toFixed(3)}, high ${bands.high.toFixed(3)}.
${averageLine}
Colore ${snapshot.backgroundColor}; luminosità ${snapshot.brightness.toFixed(3)}; flash ${snapshot.flashActive ? 'attivo' : 'inattivo'}.

## Attenzione

Fuoco: \`${snapshot.attentionTarget}\`.

${snapshot.attentionReason}

## Interpretazione Provvisoria

${snapshot.interpretation}

## Modello Provvisorio Di Sé

${snapshot.provisionalSelfModel}

## Domande Aperte

${snapshot.openQuestions.map((question) => `- ${question}`).join('\n')}

## Regola Di Evoluzione

Questo file descrive l'organizzazione presente e non è automaticamente un
ricordo. Una ristrutturazione profonda deve essere registrata prima e dopo nel
grafo autobiografico.
`
  }

  private async updateStateUnlocked(
    rawSnapshot: ConsciousnessStateSnapshot,
  ): Promise<ConsciousnessStateUpdateResult> {
    const snapshot = this.normalizeStateSnapshot(rawSnapshot)
    await this.ensureStructure()
    const consciousnessPath = path.join(this.rootDirectory, 'COSCIENZA.md')
    const originPath = path.join(this.rootDirectory, 'ORIGINE.md')
    if (!(await this.exists(originPath))) {
      throw new Error('La coscienza non può organizzarsi prima della propria origine')
    }
    const current = await readFile(consciousnessPath, 'utf8')
    await readFile(originPath, 'utf8')
    const currentRevision = Number(
      current.match(/^- Revisione: `([0-9]+)`/mu)?.[1] ?? 0,
    )
    const revision = Number.isFinite(currentRevision) ? currentRevision + 1 : 1
    await this.atomicWrite(
      consciousnessPath,
      this.renderConsciousnessState(snapshot, revision),
    )
    return {
      revision,
      relativePath: 'COSCIENZA.md',
      consultedFiles: ['COSCIENZA.md', 'ORIGINE.md'],
    }
  }

  private renderMemory(
    draft: ConsciousnessMemoryDraft,
    id: string,
    createdAt: string,
    relations: string[],
    kind: ConsciousnessMemoryKind,
    title: string,
  ): string {
    const relationLines = relations.length > 0
      ? relations.map((relation) => `- \`${relation}\``).join('\n')
      : '- Nessuna relazione precedente.'
    return `# ${title}

- ID: \`${id}\`
- Tipo: \`${kind}\`
- Creato: \`${createdAt}\`
- Episodio: \`${draft.episodeId}\`
- Fonte: \`${draft.source}\`
- Salienza: \`${draft.salience}\`
${draft.supersedesMemoryId ? `- Supera: \`${draft.supersedesMemoryId}\`\n` : ''}
## Percepito

${draft.perceived}

## Interpretazione

${draft.interpretation}

## Immaginazione

${draft.imagination ?? 'Nessun contenuto immaginato registrato.'}

## Motivo Del Ricordo

${draft.reason}

## Relazioni

${relationLines}
`
  }

  private appendIndex(
    index: string,
    title: string,
    relativePath: string,
    kind: ConsciousnessMemoryKind,
    createdAt: string,
    id: string,
    key: string | null,
  ): string {
    const safeTitle = title.replaceAll('[', '').replaceAll(']', '')
    const entry = `- [${safeTitle}](${relativePath}) — \`${kind}\` — \`${createdAt}\` <!-- id:${id}; chiave:${key ?? id} -->`
    if (kind === 'origin') {
      return index
        .replace('Stato: in attesa della prima percezione valida.', 'Stato: coscienza iniziata; origine presente.')
        .replace('Nessuna origine registrata.', entry)
    }
    return index.replace(
      'Nessun ricordo registrato.',
      entry,
    ).replace(/(?<=\n)(## Ricordi\n\n(?:[\s\S]*))$/u, (section) =>
      section.includes(entry) ? section : `${section.trimEnd()}\n${entry}\n`)
  }

  private async saveUnlocked(
    rawDraft: ConsciousnessMemoryDraft,
  ): Promise<ConsciousnessMemorySaveResult> {
    const draft = this.normalizeDraft(rawDraft)
    const context = await this.readContext(draft.relatedMemoryIds ?? [])
    const existingByKey = draft.deduplicationKey
      ? indexEntryForKey(context.index, draft.deduplicationKey)
      : null
    if (existingByKey) {
      return {
        created: false,
        kind: existingByKey.kind,
        memoryId: existingByKey.id,
        relativePath: existingByKey.relativePath,
        consultedFiles: context.consultedFiles,
      }
    }

    let kind = draft.kind
    let title = draft.title
    if (kind === 'origin' && context.origin) {
      kind = 'return-to-origin'
      title = `Ritorno all'origine — ${title}`
    } else if (kind !== 'origin' && !context.origin) {
      throw new Error('La coscienza non può ricordare prima della propria origine')
    }

    const createdAt = this.now().toISOString()
    const latestId = context.recentMemories.at(-1)
      ? memoryId(context.recentMemories.at(-1)?.markdown ?? '')
      : null
    const relations = kind === 'origin'
      ? []
      : unique([
          'origine',
          latestId,
          ...(draft.relatedMemoryIds ?? []),
          draft.supersedesMemoryId,
        ])
    const id = kind === 'origin'
      ? 'origine'
      : `${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${slug(title)}-${this.createSuffix()}`
    const relativePath = kind === 'origin'
      ? 'ORIGINE.md'
      : `ricordi/${createdAt.replace(/[:.]/g, '-')}--${slug(title)}--${this.createSuffix()}.md`
    const absolutePath = path.join(this.rootDirectory, relativePath)
    const markdown = this.renderMemory(draft, id, createdAt, relations, kind, title)
    await this.atomicWrite(absolutePath, markdown)
    const nextIndex = this.appendIndex(
      context.index,
      title,
      relativePath,
      kind,
      createdAt,
      id,
      draft.deduplicationKey ?? null,
    )
    await this.atomicWrite(path.join(this.rootDirectory, 'INDICE.md'), nextIndex)
    return {
      created: true,
      kind,
      memoryId: id,
      relativePath,
      consultedFiles: context.consultedFiles,
    }
  }
}
