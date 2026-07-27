const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
])

const ALLOWED_ATTRIBUTES = new Set([
  'viewBox',
  'transform',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'points',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'xmlns',
])

export function sanitizeBrainSvg(markup: string): string | null {
  if (markup.length > 600_000) return null
  const documentNode = new DOMParser().parseFromString(markup, 'image/svg+xml')
  if (documentNode.querySelector('parsererror')) return null
  const root = documentNode.documentElement
  if (root.localName !== 'svg') return null

  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (!ALLOWED_TAGS.has(element.localName)) {
      element.remove()
      continue
    }
    for (const attribute of Array.from(element.attributes)) {
      const dangerousValue = /url\s*\(|javascript:|data:/i.test(attribute.value)
      if (!ALLOWED_ATTRIBUTES.has(attribute.name) || dangerousValue) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  root.setAttribute('viewBox', root.getAttribute('viewBox') ?? '0 0 1000 1000')
  root.removeAttribute('style')
  root.removeAttribute('onload')
  return new XMLSerializer().serializeToString(root)
}
