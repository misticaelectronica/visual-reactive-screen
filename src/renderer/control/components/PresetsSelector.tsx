import { useState } from 'react'
import type { AppSettings } from '@shared/types'

interface Preset {
  id?: string
  name: string
  settings: Partial<AppSettings>
}

export const AUDIO_PRESETS: Preset[] = [
  {
    name: 'Ambient Techno',
    settings: {
      lowThresholdMultiplier: 1.70,
      lowMidThresholdMultiplier: 1.45,
      midThresholdMultiplier: 1.40,
      highThresholdMultiplier: 1.95,
      flashMode: 'high',
      flashTriggerBandMin: 1800,
      flashTriggerBandMax: 5200,
      secondaryFlashBandMin: 5200,
      secondaryFlashBandMax: 8000,
      flashThreshold: 1.55,
      transientDelta: 0.16,
      lowDominanceBlockRatio: 1.50,
      flashDurationMs: 32,
      decayMs: 1300,
      cooldownMs: 3200,
      sensitivity: 0.72,
      maxFlashesPerSecond: 0.30,
      fftSize: 4096,
      smoothingTimeConstant: 0.86,
      softMode: false,
      subMovement: 0.38,
      kickMovement: 0.16,
      flashOnKick: false,
    },
  },
  {
    name: 'Techno Rituale / Tribale / Industriale',
    settings: {
      lowThresholdMultiplier: 1.45,
      lowMidThresholdMultiplier: 1.25,
      midThresholdMultiplier: 1.80,
      highThresholdMultiplier: 2.45,
      flashMode: 'mid',
      flashTriggerBandMin: 420,
      flashTriggerBandMax: 1800,
      secondaryFlashBandMin: 1800,
      secondaryFlashBandMax: 3600,
      flashThreshold: 1.45,
      transientDelta: 0.14,
      lowDominanceBlockRatio: 1.35,
      flashDurationMs: 34,
      decayMs: 1050,
      cooldownMs: 2200,
      sensitivity: 0.82,
      maxFlashesPerSecond: 0.45,
      fftSize: 2048,
      smoothingTimeConstant: 0.78,
      softMode: false,
      subMovement: 0.50,
      kickMovement: 0.26,
      flashOnKick: false,
    },
  },
  {
    name: 'Minimal / Hypnotic Techno',
    settings: {
      lowThresholdMultiplier: 1.38,
      lowMidThresholdMultiplier: 1.32,
      midThresholdMultiplier: 1.70,
      highThresholdMultiplier: 2.30,
      flashMode: 'mid',
      flashTriggerBandMin: 420,
      flashTriggerBandMax: 1800,
      secondaryFlashBandMin: 1800,
      secondaryFlashBandMax: 3600,
      flashThreshold: 1.42,
      transientDelta: 0.13,
      lowDominanceBlockRatio: 1.35,
      flashDurationMs: 32,
      decayMs: 950,
      cooldownMs: 1900,
      sensitivity: 0.84,
      maxFlashesPerSecond: 0.50,
      fftSize: 2048,
      smoothingTimeConstant: 0.76,
      softMode: false,
      subMovement: 0.46,
      kickMovement: 0.26,
      flashOnKick: false,
    },
  },
  {
    name: 'Dub / Deep Hypnotic Techno',
    settings: {
      lowThresholdMultiplier: 1.55,
      lowMidThresholdMultiplier: 1.38,
      midThresholdMultiplier: 1.75,
      highThresholdMultiplier: 2.40,
      flashMode: 'high',
      flashTriggerBandMin: 1800,
      flashTriggerBandMax: 5200,
      secondaryFlashBandMin: 5200,
      secondaryFlashBandMax: 8000,
      flashThreshold: 1.50,
      transientDelta: 0.15,
      lowDominanceBlockRatio: 1.45,
      flashDurationMs: 30,
      decayMs: 1200,
      cooldownMs: 2800,
      sensitivity: 0.76,
      maxFlashesPerSecond: 0.35,
      fftSize: 4096,
      smoothingTimeConstant: 0.84,
      softMode: false,
      subMovement: 0.56,
      kickMovement: 0.20,
      flashOnKick: false,
    },
  },
  {
    name: 'Industrial Minimal / Machine Drift',
    settings: {
      lowThresholdMultiplier: 1.42,
      lowMidThresholdMultiplier: 1.18,
      midThresholdMultiplier: 1.90,
      highThresholdMultiplier: 2.55,
      flashMode: 'low',
      flashTriggerBandMin: 120,
      flashTriggerBandMax: 420,
      secondaryFlashBandMin: 600,
      secondaryFlashBandMax: 1400,
      flashThreshold: 1.38,
      transientDelta: 0.13,
      lowDominanceBlockRatio: 1.25,
      flashDurationMs: 32,
      decayMs: 900,
      cooldownMs: 1800,
      sensitivity: 0.82,
      maxFlashesPerSecond: 0.55,
      fftSize: 2048,
      smoothingTimeConstant: 0.74,
      softMode: false,
      subMovement: 0.44,
      kickMovement: 0.26,
      flashOnKick: false,
    },
  },
]

export const COLOR_PRESETS: Preset[] = [
  {
    id: 'ambient-techno',
    name: 'Ambient Techno',
    settings: {
      idleColor: '#020616',
      basePinkColor: '#18213a',
      hotPinkColor: '#6f7fa6',
      whiteFlashColor: '#c9d3e6',
    },
  },
  {
    id: 'techno-rituale-tribale-industriale',
    name: 'Techno Rituale / Tribale / Industriale',
    settings: {
      idleColor: '#070203',
      basePinkColor: '#2b120c',
      hotPinkColor: '#8a2f1c',
      whiteFlashColor: '#c9a27f',
    },
  },
  {
    id: 'minimal-hypnotic-techno',
    name: 'Minimal / Hypnotic Techno',
    settings: {
      idleColor: '#030604',
      basePinkColor: '#10251d',
      hotPinkColor: '#6b8f3a',
      whiteFlashColor: '#d8e0b1',
    },
  },
  {
    id: 'dub-deep-hypnotic-techno',
    name: 'Dub / Deep Hypnotic Techno',
    settings: {
      idleColor: '#02040a',
      basePinkColor: '#15233a',
      hotPinkColor: '#4d6a8f',
      whiteFlashColor: '#c5d1dc',
    },
  },
  {
    id: 'industrial-minimal-machine-drift',
    name: 'Industrial Minimal / Machine Drift',
    settings: {
      idleColor: '#060504',
      basePinkColor: '#262018',
      hotPinkColor: '#8a6a3c',
      whiteFlashColor: '#d6c29a',
    },
  },
  {
    id: 'mistica-electronica-default',
    name: 'MISTICA ELECTRONICA DEFAULT',
    settings: {
      idleColor: '#030000',
      basePinkColor: '#170204',
      hotPinkColor: '#b00016',
      whiteFlashColor: '#ffb3a6',
    },
  },
  {
    id: 'mistica-electronica-festival',
    name: 'MISTICA ELECTRONICA FESTIVAL',
    settings: {
      idleColor: '#010403',
      basePinkColor: '#0f5f2a',
      hotPinkColor: '#39ff6a',
      whiteFlashColor: '#d8d8cf',
    },
  },
]

interface Props {
  settings: AppSettings
  onApplyPreset: (settings: Partial<AppSettings>) => void
  onChangeSettings: (settings: Partial<AppSettings>) => void
}

export function PresetsSelector({ settings, onApplyPreset, onChangeSettings }: Props) {
  const [matchColor, setMatchColor] = useState(true)

  const handleAudioPreset = (index: number) => {
    const audioPreset = AUDIO_PRESETS[index]
    let patch = { ...audioPreset.settings }
    if (matchColor) {
      const colorPreset = COLOR_PRESETS[index]
      if (colorPreset) {
        patch = { ...patch, ...colorPreset.settings, selectedColorPresetId: colorPreset.id ?? null }
      }
    }
    onApplyPreset({ ...patch, softMode: false })
  }

  const handleColorPreset = (index: number) => {
    onApplyPreset({ ...COLOR_PRESETS[index].settings, selectedColorPresetId: COLOR_PRESETS[index].id ?? null, softMode: false })
  }

  return (
    <section className="panel">
      <h2>Dynamic Preset</h2>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <input
          type="checkbox"
          checked={settings.dynamicPresetEnabled}
          onChange={(e) => onChangeSettings({ dynamicPresetEnabled: e.target.checked })}
        />
        Dynamic Preset
      </label>
      <div className="grid2" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.dynamicColorRotationEnabled}
            onChange={(e) => onChangeSettings({ dynamicColorRotationEnabled: e.target.checked })}
            disabled={!settings.dynamicPresetEnabled}
          />
          Rotazione colori
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.dynamicMorphingRotationEnabled}
            onChange={(e) => onChangeSettings({ dynamicMorphingRotationEnabled: e.target.checked })}
            disabled={!settings.dynamicPresetEnabled}
          />
          Rotazione morphing
        </label>
      </div>

      <h2>Presets Genere</h2>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {AUDIO_PRESETS.map((p, i) => (
          <button key={p.name} type="button" onClick={() => handleAudioPreset(i)}>
            {p.name}
          </button>
        ))}
      </div>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="checkbox" 
          checked={matchColor} 
          onChange={(e) => setMatchColor(e.target.checked)} 
        />
        Match Genere/Colore (Applica automaticamente i colori del genere)
      </label>

      <h2>Presets Colore</h2>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {COLOR_PRESETS.map((p, i) => (
          <button key={p.name} type="button" onClick={() => handleColorPreset(i)}>
            {p.name}
          </button>
        ))}
      </div>
    </section>
  )
}
