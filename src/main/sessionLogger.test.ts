import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { sessionLogDirectory, sessionLogFileName } from './sessionLogger'

describe('session logger', () => {
  it('crea un nome stabile con data e ora di inizio sessione', () => {
    const startedAt = new Date(2026, 6, 28, 9, 7, 5)
    expect(sessionLogFileName(startedAt)).toBe(
      'session-2026-07-28-09-07-05.txt',
    )
  })

  it('salva nella cartella log interna ai dati applicativi', () => {
    const applicationDataRoot = path.join('Library', 'Application Support', 'Mistica Electronica')
    expect(sessionLogDirectory(applicationDataRoot)).toBe(
      path.join(applicationDataRoot, 'log'),
    )
  })
})
