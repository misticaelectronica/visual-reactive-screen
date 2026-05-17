import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/defaults'

const fileName = 'origine-fx-settings.json'

function settingsPath(): string {
  return path.join(app.getPath('userData'), fileName)
}

export function loadSettingsFromDisk(): AppSettings {
  const p = settingsPath()
  try {
    if (!fs.existsSync(p)) return { ...DEFAULT_SETTINGS }
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettingsToDisk(settings: AppSettings): void {
  const p = settingsPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8')
}
