import type { AppSettings } from '@shared/types'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function ThresholdControls({ settings, onChange }: Props) {
  return (
    <fieldset className="panel">
      <legend>Soglie (moltiplicatori sulla media mobile)</legend>
      <div className="grid2">
        <label>
          Low
          <input
            type="number"
            step={0.01}
            min={0.5}
            max={4}
            value={settings.lowThresholdMultiplier}
            onChange={(e) => onChange({ lowThresholdMultiplier: Number(e.target.value) })}
          />
        </label>
        <label>
          Low-mid
          <input
            type="number"
            step={0.01}
            min={0.5}
            max={4}
            value={settings.lowMidThresholdMultiplier}
            onChange={(e) => onChange({ lowMidThresholdMultiplier: Number(e.target.value) })}
          />
        </label>
        <label>
          Mid
          <input
            type="number"
            step={0.01}
            min={0.5}
            max={4}
            value={settings.midThresholdMultiplier}
            onChange={(e) => onChange({ midThresholdMultiplier: Number(e.target.value) })}
          />
        </label>
        <label>
          High
          <input
            type="number"
            step={0.01}
            min={0.5}
            max={4}
            value={settings.highThresholdMultiplier}
            onChange={(e) => onChange({ highThresholdMultiplier: Number(e.target.value) })}
          />
        </label>
      </div>
    </fieldset>
  )
}
