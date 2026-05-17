import { useEffect, useState } from 'react'

export interface AudioDeviceOption {
  deviceId: string
  label: string
}

interface Props {
  value: string | null
  onChange: (deviceId: string | null) => void
}

export function AudioInputSelector({ value, onChange }: Props) {
  const [devices, setDevices] = useState<AudioDeviceOption[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        const inputs = list
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Ingresso ${d.deviceId.slice(0, 6)}…`,
          }))
        setDevices(inputs)
        setError(null)
      } catch {
        setError('Impossibile enumerare i dispositivi audio')
      }
    }
    void load()
    navigator.mediaDevices.addEventListener('devicechange', load)
    return () => {
      cancelled = true
      navigator.mediaDevices.removeEventListener('devicechange', load)
    }
  }, [])

  return (
    <label className="field">
      <span>Ingresso audio</span>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? null : v)
        }}
      >
        <option value="">— Seleziona —</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label}
          </option>
        ))}
      </select>
      {error ? <p className="hint error">{error}</p> : null}
      <p className="hint">
        Se le etichette sono generiche, concedi una volta il permesso microfono dal browser/Electron
        per popolare i nomi reali.
      </p>
    </label>
  )
}
