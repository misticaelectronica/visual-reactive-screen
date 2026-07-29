import { describe, expect, it } from 'vitest'
import { sessionLogFileName } from './sessionLogger'

describe('session logger', () => {
  it('crea un nome stabile con data e ora di inizio sessione', () => {
    const startedAt = new Date(2026, 6, 28, 9, 7, 5)
    expect(sessionLogFileName(startedAt)).toBe(
      'session-2026-07-28-09-07-05.txt',
    )
  })
})
