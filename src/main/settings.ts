import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { isFlashMode, isMorphingAlgorithm, type AppSettings } from '@shared/types'
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
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...parsed })
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettingsToDisk(settings: AppSettings): void {
  const p = settingsPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(normalizeSettings(settings), null, 2), 'utf-8')
}

function normalizeSettings(settings: AppSettings): AppSettings {
  const colorPresetAliases: Record<string, string> = {
    'red-and-black-balzac': 'mistica-electronica-default',
    'festival-origine-aluminum-black': 'mistica-electronica-festival',
  }
  const selectedColorPresetId =
    settings.selectedColorPresetId && colorPresetAliases[settings.selectedColorPresetId]
      ? colorPresetAliases[settings.selectedColorPresetId]
      : settings.selectedColorPresetId

  return {
    ...settings,
    morphingAlgorithm: isMorphingAlgorithm(settings.morphingAlgorithm)
      ? settings.morphingAlgorithm
      : 'liquid',
    flashMode: isFlashMode(settings.flashMode) ? settings.flashMode : 'mid',
    softMode: settings.softMode === true,
    selectedColorPresetId: selectedColorPresetId ?? null,
    dynamicPresetEnabled: settings.dynamicPresetEnabled === true,
    dynamicColorRotationEnabled: settings.dynamicColorRotationEnabled !== false,
    dynamicMorphingRotationEnabled: settings.dynamicMorphingRotationEnabled !== false,
  }
}
