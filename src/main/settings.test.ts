import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { AppSettings } from '@shared/types'
import { normalizeSettings } from './settings'

describe('impostazione blocco immagini esplicite', () => {
  it('è spenta di default e conserva una scelta esplicita', () => {
    expect(DEFAULT_SETTINGS.blockExplicitImages).toBe(false)
    expect(normalizeSettings({
      ...DEFAULT_SETTINGS,
      blockExplicitImages: true,
    }).blockExplicitImages).toBe(true)
  })

  it('non interpreta la vecchia opzione di significato opposto come nuovo blocco', () => {
    const legacy = {
      ...DEFAULT_SETTINGS,
      blockExplicitImages: false,
      preserveExplicitSource: true,
    } as AppSettings & { preserveExplicitSource: boolean }

    expect(normalizeSettings(legacy).blockExplicitImages).toBe(false)
  })
})
