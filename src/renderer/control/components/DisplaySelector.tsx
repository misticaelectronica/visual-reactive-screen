import type { DisplayInfo } from '@shared/types'

interface Props {
  displays: DisplayInfo[]
  value: number | null
  onChange: (id: number | null) => void
}

export function DisplaySelector({ displays, value, onChange }: Props) {
  return (
    <label className="field">
      <span>Display di uscita (HDMI / proiettore)</span>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? null : Number(v))
        }}
      >
        <option value="">— Seleziona —</option>
        {displays.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label} ({d.size.width}×{d.size.height}) {d.internal ? ' • interno' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
