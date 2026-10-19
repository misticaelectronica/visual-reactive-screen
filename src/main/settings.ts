import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  isAudioMode,
  BRAIN_NEGATIVE_PROMPT_MAX_CHARS,
  isBrainImageQuality,
  isBrainRendererId,
  isBrainRendererMode,
  isFlashMode,
  isMorphingAlgorithm,
  type AppSettings,
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/defaults'

const fileName = 'MEvrs-Origine-FX-settings.json'

function settingsPath(): string {
  return path.join(app.getPath('userData'), fileName)
}

export function loadSettingsFromDisk(): AppSettings {
  const p = settingsPath()
  try {
    if (!fs.existsSync(p)) return { ...DEFAULT_SETTINGS }
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      reducedFpsMode?: unknown
      preserveExplicitSource?: unknown
    }
    // L'opzione sperimentale è stata ritirata: non deve riapparire da un file
    // impostazioni scritto da una build precedente.
    delete parsed.reducedFpsMode
    // PIANO-053: la vecchia opzione preservava l'esplicito, mentre la nuova
    // lo blocca. Non migrare automaticamente una semantica opposta.
    delete parsed.preserveExplicitSource
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

export function normalizeSettings(settings: AppSettings): AppSettings {
  const alternateBrainWithMorphing = settings.alternateBrainWithMorphing === true
  const useBrain = alternateBrainWithMorphing || settings.useBrain === true
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
    useBrain,
    useMorphing: useBrain ? false : settings.useMorphing === true,
    alternateBrainWithMorphing,
    animatronixEnabled: settings.animatronixEnabled === true,
    brainRendererId: isBrainRendererId(settings.brainRendererId)
      ? settings.brainRendererId
      : 'print2d',
    brainRendererMode: alternateBrainWithMorphing
      ? 'story-cycle'
      : isBrainRendererMode(settings.brainRendererMode)
        ? settings.brainRendererMode
        : 'manual',
    brainRendererRotationMs:
      typeof settings.brainRendererRotationMs === 'number' &&
      Number.isFinite(settings.brainRendererRotationMs)
        ? Math.max(10_000, Math.min(120_000, settings.brainRendererRotationMs))
        : 30_000,
    morphingAlgorithm: isMorphingAlgorithm(settings.morphingAlgorithm)
      ? settings.morphingAlgorithm
      : 'liquid',
    audioMode: isAudioMode(settings.audioMode) ? settings.audioMode : 'baseline',
    flashMode: isFlashMode(settings.flashMode) ? settings.flashMode : 'mid',
    softMode: settings.softMode === true,
    lowPowerMode: settings.lowPowerMode === true,
    blockExplicitImages: settings.blockExplicitImages === true,
    childSafetyNegativePromptEnabled:
      settings.childSafetyNegativePromptEnabled !== false,
    brainImageQuality: isBrainImageQuality(settings.brainImageQuality)
      ? settings.brainImageQuality
      : DEFAULT_SETTINGS.brainImageQuality,
    brainNegativePrompt: typeof settings.brainNegativePrompt === 'string'
      ? settings.brainNegativePrompt.slice(0, BRAIN_NEGATIVE_PROMPT_MAX_CHARS)
      : DEFAULT_SETTINGS.brainNegativePrompt,
    dmxBrainColorSource:
      settings.dmxBrainColorSource === 'render' || settings.dmxBrainColorSource === 'sequence'
        ? settings.dmxBrainColorSource
        : 'frame',
    dmxSaturation: typeof settings.dmxSaturation === 'number' && Number.isFinite(settings.dmxSaturation)
      ? Math.min(1, Math.max(0, settings.dmxSaturation))
      : DEFAULT_SETTINGS.dmxSaturation,
    dmxEnabled: settings.dmxEnabled === true,
    dmxInterface: settings.dmxInterface === 'usb-pro' ? 'usb-pro' : 'open-dmx',
    dmxFixtureProfiles: Array.isArray(settings.dmxFixtureProfiles) && settings.dmxFixtureProfiles.length > 0
      ? settings.dmxFixtureProfiles.slice(0, 32).map(profile => (profile === '3ch' ? '3ch' : '7ch'))
      : DEFAULT_SETTINGS.dmxFixtureProfiles,
    selectedColorPresetId: selectedColorPresetId ?? null,
    dynamicPresetEnabled: settings.dynamicPresetEnabled === true,
    dynamicColorRotationEnabled: settings.dynamicColorRotationEnabled !== false,
    // Scelta dell'operatore, conservata anche con Brain attivo: la rotazione
    // si ferma già da sola quando Brain comanda (ControlApp). Forzarla a
    // false la lasciava spenta al ritorno al morphing.
    dynamicMorphingRotationEnabled: settings.dynamicMorphingRotationEnabled !== false,
  }
}
