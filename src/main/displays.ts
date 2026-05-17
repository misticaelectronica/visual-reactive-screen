import { screen } from 'electron'
import type { DisplayInfo } from '@shared/types'

export function getAllDisplayInfo(): DisplayInfo[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label ?? `Display ${d.id}`,
    bounds: { ...d.bounds },
    size: { width: d.size.width, height: d.size.height },
    scaleFactor: d.scaleFactor,
    internal: d.internal ?? false,
  }))
}
