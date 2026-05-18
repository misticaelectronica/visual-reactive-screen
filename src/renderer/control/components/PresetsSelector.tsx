import { useState } from 'react'
import type { AppSettings } from '@shared/types'

interface Preset {
  name: string
  settings: Partial<AppSettings>
}

export const AUDIO_PRESETS: Preset[] = [
  {
    name: 'Ambient Techno',
    settings: {
      lowThresholdMultiplier: 1.85,
      lowMidThresholdMultiplier: 1.55,
      midThresholdMultiplier: 1.45,
      highThresholdMultiplier: 2.10,
      flashTriggerBandMin: 2200,
      flashTriggerBandMax: 5200,
      secondaryFlashBandMin: 0,
      secondaryFlashBandMax: 0,
      flashThreshold: 4.20,
      transientDelta: 0.34,
      lowDominanceBlockRatio: 1.35,
      flashDurationMs: 6,
      decayMs: 3200,
      cooldownMs: 9000,
      sensitivity: 0.58,
      maxFlashesPerSecond: 0.06,
      fftSize: 4096,
      smoothingTimeConstant: 0.94,
      softMode: true,
      subMovement: 0.26,
      kickMovement: 0.08,
      flashOnKick: false,
    },
  },
  {
    name: 'Techno Rituale / Tribale / Industriale',
    settings: {
      lowThresholdMultiplier: 1.65,
      lowMidThresholdMultiplier: 1.35,
      midThresholdMultiplier: 1.95,
      highThresholdMultiplier: 2.70,
      flashTriggerBandMin: 480,
      flashTriggerBandMax: 1350,
      secondaryFlashBandMin: 1600,
      secondaryFlashBandMax: 3200,
      flashThreshold: 3.80,
      transientDelta: 0.30,
      lowDominanceBlockRatio: 1.25,
      flashDurationMs: 8,
      decayMs: 2400,
      cooldownMs: 6500,
      sensitivity: 0.66,
      maxFlashesPerSecond: 0.09,
      fftSize: 2048,
      smoothingTimeConstant: 0.88,
      softMode: true,
      subMovement: 0.34,
      kickMovement: 0.14,
      flashOnKick: false,
    },
  },
  {
    name: 'Minimal / Hypnotic Techno',
    settings: {
      lowThresholdMultiplier: 1.55,
      lowMidThresholdMultiplier: 1.45,
      midThresholdMultiplier: 1.85,
      highThresholdMultiplier: 2.55,
      flashTriggerBandMin: 850,
      flashTriggerBandMax: 2200,
      secondaryFlashBandMin: 2500,
      secondaryFlashBandMax: 4200,
      flashThreshold: 3.70,
      transientDelta: 0.28,
      lowDominanceBlockRatio: 1.25,
      flashDurationMs: 8,
      decayMs: 1900,
      cooldownMs: 5200,
      sensitivity: 0.70,
      maxFlashesPerSecond: 0.12,
      fftSize: 2048,
      smoothingTimeConstant: 0.86,
      softMode: true,
      subMovement: 0.32,
      kickMovement: 0.16,
      flashOnKick: false,
    },
  },
  {
    name: 'Dub / Deep Hypnotic Techno',
    settings: {
      lowThresholdMultiplier: 1.70,
      lowMidThresholdMultiplier: 1.50,
      midThresholdMultiplier: 1.90,
      highThresholdMultiplier: 2.65,
      flashTriggerBandMin: 1100,
      flashTriggerBandMax: 2800,
      secondaryFlashBandMin: 3200,
      secondaryFlashBandMax: 5600,
      flashThreshold: 4.00,
      transientDelta: 0.32,
      lowDominanceBlockRatio: 1.30,
      flashDurationMs: 7,
      decayMs: 2800,
      cooldownMs: 7500,
      sensitivity: 0.62,
      maxFlashesPerSecond: 0.08,
      fftSize: 4096,
      smoothingTimeConstant: 0.92,
      softMode: true,
      subMovement: 0.38,
      kickMovement: 0.10,
      flashOnKick: false,
    },
  },
  {
    name: 'Industrial Minimal / Machine Drift',
    settings: {
      lowThresholdMultiplier: 1.60,
      lowMidThresholdMultiplier: 1.25,
      midThresholdMultiplier: 2.05,
      highThresholdMultiplier: 2.85,
      flashTriggerBandMin: 320,
      flashTriggerBandMax: 780,
      secondaryFlashBandMin: 1300,
      secondaryFlashBandMax: 2600,
      flashThreshold: 3.90,
      transientDelta: 0.32,
      lowDominanceBlockRatio: 1.18,
      flashDurationMs: 7,
      decayMs: 1700,
      cooldownMs: 5800,
      sensitivity: 0.68,
      maxFlashesPerSecond: 0.10,
      fftSize: 2048,
      smoothingTimeConstant: 0.84,
      softMode: true,
      subMovement: 0.30,
      kickMovement: 0.13,
      flashOnKick: false,
    },
  },
]

export const COLOR_PRESETS: Preset[] = [
  {
    name: 'Ambient Techno',
    settings: {
      idleColor: '#020616',
      basePinkColor: '#18213a',
      hotPinkColor: '#6f7fa6',
      whiteFlashColor: '#c9d3e6',
    },
  },
  {
    name: 'Techno Rituale / Tribale / Industriale',
    settings: {
      idleColor: '#070203',
      basePinkColor: '#2b120c',
      hotPinkColor: '#8a2f1c',
      whiteFlashColor: '#c9a27f',
    },
  },
  {
    name: 'Minimal / Hypnotic Techno',
    settings: {
      idleColor: '#030604',
      basePinkColor: '#10251d',
      hotPinkColor: '#6b8f3a',
      whiteFlashColor: '#d8e0b1',
    },
  },
  {
    name: 'Dub / Deep Hypnotic Techno',
    settings: {
      idleColor: '#02040a',
      basePinkColor: '#15233a',
      hotPinkColor: '#4d6a8f',
      whiteFlashColor: '#c5d1dc',
    },
  },
  {
    name: 'Industrial Minimal / Machine Drift',
    settings: {
      idleColor: '#060504',
      basePinkColor: '#262018',
      hotPinkColor: '#8a6a3c',
      whiteFlashColor: '#d6c29a',
    },
  },
  {
    name: 'IL ROSSO E IL NERO — BALZAC',
    settings: {
      idleColor: '#030000',
      basePinkColor: '#170204',
      hotPinkColor: '#b00016',
      whiteFlashColor: '#ffb3a6',
    },
  },
  {
    name: 'FESTIVAL — ORIGINE / ALLUMINIO / NERO',
    settings: {
      idleColor: '#010403',
      basePinkColor: '#0f5f2a',
      hotPinkColor: '#39ff6a',
      whiteFlashColor: '#d8d8cf',
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
