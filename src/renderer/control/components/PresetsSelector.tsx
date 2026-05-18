import { useState } from 'react'
import type { AppSettings } from '@shared/types'

interface Preset {
  name: string
  settings: Partial<AppSettings>
}

export const AUDIO_PRESETS: Preset[] = [
  {
    name: 'Tec',
    settings: {
      lowThresholdMultiplier: 1.20,
      lowMidThresholdMultiplier: 1.25,
      midThresholdMultiplier: 1.50,
      highThresholdMultiplier: 1.70,
      flashDurationMs: 80,
      decayMs: 150,
      cooldownMs: 85,
      sensitivity: 1.30,
      maxFlashesPerSecond: 5,
      smoothingTimeConstant: 0.60,
      softMode: false,
    },
  },
  {
    name: 'Rituale / Tribale / Industriale - Anti-Strobo',
    settings: {
      lowThresholdMultiplier: 3.20,
      lowMidThresholdMultiplier: 2.70,
      midThresholdMultiplier: 3.00,
      highThresholdMultiplier: 3.80,
      flashDurationMs: 5,
      decayMs: 1500,
      cooldownMs: 2500,
      sensitivity: 0.45,
      maxFlashesPerSecond: 0.25,
      fftSize: 2048,
      smoothingTimeConstant: 0.95,
      softMode: true,
    },
  },
  {
    name: 'Ambient Techno - Anti-Flash',
    settings: {
      lowThresholdMultiplier: 4.00,
      lowMidThresholdMultiplier: 3.20,
      midThresholdMultiplier: 2.80,
      highThresholdMultiplier: 3.60,
      flashDurationMs: 3,
      decayMs: 2500,
      cooldownMs: 5000,
      sensitivity: 0.35,
      maxFlashesPerSecond: 0.10,
      fftSize: 4096,
      smoothingTimeConstant: 0.98,
      softMode: true,
    },
  },
]

export const COLOR_PRESETS: Preset[] = [
  {
    name: 'Minimale / Meccanica / Club Controllata',
    settings: {
      idleColor: '#030604',
      basePinkColor: '#10251d',
      hotPinkColor: '#6b8f3a',
      whiteFlashColor: '#d8e0b1',
    },
  },
  {
    name: 'Rituale / Tribale / Industriale - Anti-Strobo',
    settings: {
      idleColor: '#070203',
      basePinkColor: '#2b120c',
      hotPinkColor: '#8a2f1c',
      whiteFlashColor: '#c9a27f',
    },
  },
  {
    name: 'Ambient Techno - Anti-Flash',
    settings: {
      idleColor: '#020616',
      basePinkColor: '#18213a',
      hotPinkColor: '#6f7fa6',
      whiteFlashColor: '#c9d3e6',
    },
  },
]

interface Props {
  onApplyPreset: (settings: Partial<AppSettings>) => void
}

export function PresetsSelector({ onApplyPreset }: Props) {
  const [matchColor, setMatchColor] = useState(true)

  const handleAudioPreset = (index: number) => {
    const audioPreset = AUDIO_PRESETS[index]
    let patch = { ...audioPreset.settings }
    if (matchColor) {
      const colorPreset = COLOR_PRESETS[index]
      if (colorPreset) {
        patch = { ...patch, ...colorPreset.settings }
      }
    }
    onApplyPreset(patch)
  }

  const handleColorPreset = (index: number) => {
    onApplyPreset(COLOR_PRESETS[index].settings)
  }

  return (
    <section className="panel">
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
