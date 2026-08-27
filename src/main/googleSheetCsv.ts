export type PublishedCsvRow = {
  timestamp: string
  text: string
}

/**
 * Parser CSV sull'intero testo (non riga per riga): una risposta di Form può
 * contenere newline dentro un campo fra virgolette (risposta multi-riga), e
 * spezzare prima per `\n` la spappolerebbe in righe sbagliate.
 */
function parseCsv(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const push = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    push()
    rows.push(row)
    row = []
  }
  while (i < raw.length) {
    const char = raw[i]
    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (char === ',') {
      push()
      i += 1
      continue
    }
    if (char === '\r') {
      i += 1
      continue
    }
    if (char === '\n') {
      endRow()
      i += 1
      continue
    }
    field += char
    i += 1
  }
  if (field.length > 0 || row.length > 0) endRow()
  return rows
}

/**
 * Legge il CSV pubblicato di un Google Sheet collegato a un Form con un solo
 * campo di testo libero: colonna 0 = Timestamp, colonna 1 = risposta.
 * Salta l'header (qualunque sia il suo testo: dipende dal locale e dai nomi
 * scelti nel Form) e le righe vuote/malformate.
 */
export function parsePublishedCsv(raw: string): PublishedCsvRow[] {
  const rows = parseCsv(raw)
  const result: PublishedCsvRow[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const timestamp = rows[i][0]?.trim()
    const text = rows[i][1]?.trim()
    if (!timestamp || !text) continue
    result.push({ timestamp, text })
  }
  return result
}

export type SheetDateFormat = 'DMY' | 'MDY'

// L'ora può essere separata da ":" o da "." a seconda del locale del foglio
// (Google usa il punto in alcune configurazioni italiane).
const TIMESTAMP_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2})[:.](\d{2})[:.](\d{2})/

/**
 * La colonna Timestamp di Google Sheet non porta il fuso e il suo formato
 * (giorno/mese o mese/giorno) dipende dal locale del foglio, non è fisso —
 * `Date.parse` su questa stringa fallisce in silenzio o interpreta i campi
 * al contrario. Lo rileviamo dai dati stessi: se un giorno/mese osservato
 * supera 12 non può che essere il giorno, quindi il formato è inequivocabile.
 * Se non c'è alcun indizio nelle righe disponibili, il fallback è DMY
 * (locale italiano, il caso comune per questo progetto).
 */
export function detectSheetDateFormat(rows: readonly PublishedCsvRow[]): SheetDateFormat {
  for (const row of rows) {
    const match = TIMESTAMP_PATTERN.exec(row.timestamp)
    if (!match) continue
    const first = Number(match[1])
    const second = Number(match[2])
    if (first > 12) return 'DMY'
    if (second > 12) return 'MDY'
  }
  return 'DMY'
}

/** Converte il Timestamp del foglio in millisecondi, nel formato indicato. */
export function parseSheetTimestamp(raw: string, format: SheetDateFormat): number | null {
  const match = TIMESTAMP_PATTERN.exec(raw)
  if (!match) return null
  const [, a, b, year, hour, minute, second] = match
  const day = format === 'DMY' ? Number(a) : Number(b)
  const month = format === 'DMY' ? Number(b) : Number(a)
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  const date = new Date(
    Number(year),
    month - 1,
    day,
    Number(hour),
    Number(minute),
    Number(second),
  )
  return date.getTime()
}
