import { describe, expect, it } from 'vitest'
import {
  detectSheetDateFormat,
  parsePublishedCsv,
  parseSheetTimestamp,
} from './googleSheetCsv'

describe('parsePublishedCsv', () => {
  it('salta l\'header e legge le righe valide', () => {
    const raw = [
      'Timestamp,La tua frase',
      '8/25/2026 21:04:32,Una frase semplice',
      '8/25/2026 21:05:10,Un\'altra frase',
    ].join('\n')

    expect(parsePublishedCsv(raw)).toEqual([
      { timestamp: '8/25/2026 21:04:32', text: 'Una frase semplice' },
      { timestamp: '8/25/2026 21:05:10', text: "Un'altra frase" },
    ])
  })

  it('gestisce campi fra virgolette con virgole e virgolette interne', () => {
    const raw = [
      'Timestamp,La tua frase',
      '8/25/2026 21:04:32,"Una frase, con virgola e ""citazione"" dentro"',
    ].join('\n')

    expect(parsePublishedCsv(raw)).toEqual([
      {
        timestamp: '8/25/2026 21:04:32',
        text: 'Una frase, con virgola e "citazione" dentro',
      },
    ])
  })

  it('ignora righe vuote e righe senza testo', () => {
    const raw = [
      'Timestamp,La tua frase',
      '',
      '8/25/2026 21:04:32,',
      '8/25/2026 21:06:00,Frase valida',
    ].join('\n')

    expect(parsePublishedCsv(raw)).toEqual([
      { timestamp: '8/25/2026 21:06:00', text: 'Frase valida' },
    ])
  })

  it('ritorna vuoto se manca il corpo dopo l\'header', () => {
    expect(parsePublishedCsv('Timestamp,La tua frase')).toEqual([])
  })

  it('gestisce un header localizzato e una risposta multi-riga fra virgolette, esattamente come il CSV reale di Google', () => {
    const raw =
      'Informazioni cronologiche,Scriva pure\r\n' +
      '26/08/2026 11.34.57,"Aqua pesci acqua\nMare fondali marini\nMare e meduse e coralli"\r\n'

    expect(parsePublishedCsv(raw)).toEqual([
      {
        timestamp: '26/08/2026 11.34.57',
        text: 'Aqua pesci acqua\nMare fondali marini\nMare e meduse e coralli',
      },
    ])
  })
})

describe('detectSheetDateFormat', () => {
  it('riconosce DMY quando il giorno supera 12', () => {
    const rows = parsePublishedCsv(
      ['Timestamp,La tua frase', '26/08/2026 14:03:22,frase'].join('\n'),
    )
    expect(detectSheetDateFormat(rows)).toBe('DMY')
  })

  it('riconosce MDY quando il mese (secondo campo) supera 12', () => {
    const rows = parsePublishedCsv(
      ['Timestamp,La tua frase', '8/26/2026 14:03:22,frase'].join('\n'),
    )
    expect(detectSheetDateFormat(rows)).toBe('MDY')
  })

  it('usa DMY come default quando nessuna riga è inequivocabile', () => {
    const rows = parsePublishedCsv(
      ['Timestamp,La tua frase', '8/5/2026 14:03:22,frase'].join('\n'),
    )
    expect(detectSheetDateFormat(rows)).toBe('DMY')
  })

  it('usa DMY come default quando non ci sono righe', () => {
    expect(detectSheetDateFormat([])).toBe('DMY')
  })
})

describe('parseSheetTimestamp', () => {
  it('interpreta correttamente un timestamp DMY', () => {
    const ms = parseSheetTimestamp('26/08/2026 14:03:22', 'DMY')
    const date = new Date(ms!)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(7) // agosto
    expect(date.getDate()).toBe(26)
    expect(date.getHours()).toBe(14)
    expect(date.getMinutes()).toBe(3)
    expect(date.getSeconds()).toBe(22)
  })

  it('interpreta correttamente un timestamp MDY', () => {
    const ms = parseSheetTimestamp('8/26/2026 14:03:22', 'MDY')
    const date = new Date(ms!)
    expect(date.getMonth()).toBe(7) // agosto
    expect(date.getDate()).toBe(26)
  })

  it('ritorna null per un timestamp non riconoscibile', () => {
    expect(parseSheetTimestamp('non è una data', 'DMY')).toBeNull()
  })

  it('accetta l\'ora separata da punti, come scrive davvero Google in alcune configurazioni italiane', () => {
    const ms = parseSheetTimestamp('26/08/2026 11.34.57', 'DMY')
    expect(ms).not.toBeNull()
    const date = new Date(ms!)
    expect(date.getDate()).toBe(26)
    expect(date.getHours()).toBe(11)
    expect(date.getMinutes()).toBe(34)
    expect(date.getSeconds()).toBe(57)
  })
})
