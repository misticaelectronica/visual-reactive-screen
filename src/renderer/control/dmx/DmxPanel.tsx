import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, DmxProfile } from '@shared/types'
import { chainFixtures, PROFILE_CHANNELS } from './dmxEngine'
import { createDmxController, type DmxController, type DmxStatus } from './dmxController'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

const PRODUCER = 'manual'
const DEFAULT_COLORS = ['#A82431', '#D78A45', '#273C72', '#72517E']

export default function DmxPanel({ settings, onChange }: Props) {
  const profiles = settings.dmxFixtureProfiles
  const fixtures = useMemo(() => chainFixtures(profiles), [profiles])
  const controllerRef = useRef<DmxController | null>(null)
  const [status, setStatus] = useState<DmxStatus | null>(null)
  const [colors, setColorsState] = useState<string[]>(DEFAULT_COLORS)
  const [master, setMaster] = useState(1)
  const [fadeSeconds, setFadeSeconds] = useState(8)

  useEffect(() => {
    const controller = createDmxController(fixtures, setStatus)
    controller.acquire(PRODUCER)
    controllerRef.current = controller
    return () => {
      controllerRef.current = null
      void controller.destroy()
    }
    // Il controller vive quanto il pannello; le fixture si aggiornano sotto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    controllerRef.current?.setFixtures(fixtures)
  }, [fixtures])

  const setProfiles = (next: DmxProfile[]) => onChange({ dmxFixtureProfiles: next })
  const colorAt = (i: number) => colors[i % colors.length] ?? '#000000'

  const apply = () => {
    const controller = controllerRef.current
    if (!controller) return
    controller.setMasterIntensity(PRODUCER, master)
    controller.setColors(PRODUCER, fixtures.map((_, i) => colorAt(i)), fadeSeconds * 1000)
  }

  return (
    <fieldset className="panel">
      <legend>Luci DMX</legend>
      <div className="toolbar">
        <select
          value={settings.dmxInterface}
          onChange={(e) => onChange({ dmxInterface: e.target.value === 'open-dmx' ? 'open-dmx' : 'usb-pro' })}
        >
          <option value="usb-pro">USB-DMX Pro (Enttec e compatibili)</option>
          <option value="open-dmx">Open DMX (FTDI)</option>
        </select>
        {status?.connected
          ? <button type="button" onClick={() => void controllerRef.current?.disconnect()}>Disconnetti</button>
          : <button type="button" onClick={() => void controllerRef.current?.connect(settings.dmxInterface)}>Connetti</button>}
        <button
          type="button"
          className={status?.blackout ? undefined : 'danger'}
          onClick={() => controllerRef.current?.blackout(!status?.blackout)}
        >
          {status?.blackout ? 'Riaccendi' : 'Blackout'}
        </button>
        <span>{status?.connected ? 'Connesso' : 'Non connesso'}</span>
      </div>
      {status?.error ? <p className="error">{status.error}</p> : null}

      {fixtures.map((fixture, i) => (
        <label key={i} className="inline">
          Luce {i + 1} — indirizzo {String(fixture.address).padStart(3, '0')}
          <select
            value={fixture.profile}
            onChange={(e) => setProfiles(profiles.map((p, j) => (j === i ? (e.target.value as DmxProfile) : p)))}
          >
            {(Object.keys(PROFILE_CHANNELS) as DmxProfile[]).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="color"
            value={colorAt(i)}
            onChange={(e) => setColorsState(fixtures.map((_, j) => (j === i ? e.target.value : colorAt(j))))}
          />
        </label>
      ))}
      <div className="toolbar">
        <button type="button" onClick={() => setProfiles([...profiles, profiles[profiles.length - 1] ?? '7ch'])}>
          Aggiungi luce
        </button>
        <button type="button" disabled={profiles.length <= 1} onClick={() => setProfiles(profiles.slice(0, -1))}>
          Togli ultima
        </button>
      </div>

      <label>
        Luminosità {Math.round(master * 100)}%
        <input type="range" min={0} max={1} step={0.01} value={master} onChange={(e) => setMaster(Number(e.target.value))} />
      </label>
      <label>
        Dissolvenza {fadeSeconds} s
        <input type="range" min={0} max={30} step={0.5} value={fadeSeconds} onChange={(e) => setFadeSeconds(Number(e.target.value))} />
      </label>
      <button type="button" onClick={apply}>Applica</button>
    </fieldset>
  )
}
