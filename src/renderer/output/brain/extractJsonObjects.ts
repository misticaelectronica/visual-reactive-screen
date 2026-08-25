export function extractJsonObjects(text: string): unknown[] {
  const values: unknown[] = []

  for (let start = 0; start < text.length; start++) {
    if (text[start] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = start; index < text.length; index++) {
      const character = text[index]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (character === '\\') {
          escaped = true
        } else if (character === '"') {
          inString = false
        }
        continue
      }

      if (character === '"') {
        inString = true
      } else if (character === '{') {
        depth += 1
      } else if (character === '}') {
        depth -= 1
        if (depth === 0) {
          try {
            values.push(JSON.parse(text.slice(start, index + 1)))
          } catch {
            // Continue scanning: a later object may still contain the valid response.
          }
          start = index
          break
        }
      }
    }
  }

  return values
}
