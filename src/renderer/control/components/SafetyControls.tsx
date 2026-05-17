import type { AppSettings } from '@shared/types'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function SafetyControls({ settings, onChange }: Props) {
  return (
    <fieldset className="panel">
      <legend>Sicurezza</legend>
      <label className="inline">
        <input
          type="checkbox"
          checked={settings.softMode}
          onChange={(e) => onChange({ softMode: e.target.checked })}
        />
        Modalità soft (intensità ridotta, decay più lento, meno flash)
      </label>
    </fieldset>
  )
}
