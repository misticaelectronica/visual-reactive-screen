import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { AppSettings, DmxProducerCommand, DmxProfile } from '@shared/types'
import { chainFixtures, PROFILE_CHANNELS, stageColor } from './dmxEngine'
import { createDmxController, type DmxController, type DmxStatus } from './dmxController'
import { createDmxRhythm, type DmxAudioFrame } from './dmxRhythm'
import { screenDominantColors } from './dmxScreenColors'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  panic: boolean
  audioFrameRef: MutableRefObject<DmxAudioFrame | null>
}

const MANUAL = 'manual'
const DEFAULT_COLORS = ['#A82431', '#D78A45', '#273C72', '#72517E']
const MORPHING_TRANSITION_MS = 4000
// Modalità «schermo»: 4 catture al secondo (2 in basso consumo), dissolvenza
// pari all'intervallo.
const SCREEN_SAMPLE_MS = 250
const SCREEN_SAMPLE_LOW_POWER_MS = 500
const SCREEN_COLOR_COUNT = 4

export default function DmxPanel({ settings, onChange, panic, audioFrameRef }: Props) {
  const profiles = settings.dmxFixtureProfiles
  const fixtures = useMemo(() => chainFixtures(profiles), [profiles])
  const controllerRef = useRef<DmxController | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  // Ultimo comando di ogni producer: quando cambia l'owner, le luci vanno
  // subito ai suoi colori invece di aspettare il prossimo cambio.
  const lastCommandRef = useRef(new Map<string, DmxProducerCommand>())
  const [status, setStatus] = useState<DmxStatus | null>(null)
  const [colors, setColorsState] = useState<string[]>(DEFAULT_COLORS)
  const [master, setMaster] = useState(1)
  const [fadeSeconds, setFadeSeconds] = useState(8)
  const [manual, setManual] = useState(false)
  const screenSource = settings.dmxBrainColorSource === 'render'
  // Sequenza: ultimi colori ricevuti per producer e posizione corrente.
  const sequenceRef = useRef({ index: 0 })
  const owner = manual ? MANUAL : screenSource ? 'screen' : settings.useBrain ? 'brain' : 'morphing'

  useEffect(() => {
    const controller = createDmxController(fixtures, setStatus)
    controller.setRhythmSource(createDmxRhythm(
      () => audioFrameRef.current,
      () => settingsRef.current.motionProfile,
      (beatDurationMs) => {
        // Modalità sequenza: a ogni beat tutte le luci passano al colore
        // successivo dell'owner. In silenzio non ci sono beat: luci ferme.
        if (settingsRef.current.dmxBrainColorSource !== 'sequence') return
        const owner = controller.getStatus().owner
        const colors = owner && owner !== MANUAL ? lastCommandRef.current.get(owner)?.colors : undefined
        if (!owner || !colors || colors.length === 0) return
        const color = colors[sequenceRef.current.index % colors.length]
        sequenceRef.current.index += 1
        controller.setColors(owner, [color], Math.min(300, beatDurationMs / 2))
      },
    ))
    controllerRef.current = controller
    // Modulo attivo = luci collegate: si connette da solo e, se il dongle
    // manca, ritenta ogni 2 s finché non compare.
    void controller.connect(settingsRef.current.dmxInterface)
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

  const receive = (command: DmxProducerCommand) => {
    // Il manuale manda esattamente ciò che si sceglie.
    if (command.producer !== MANUAL) {
      const amount = settingsRef.current.dmxSaturation
      // Anche gli scuri passano (disp. Capo Supremo 2026-10-11): il buio fa
      // parte del render; la saturazione non alza la luminosità.
      command = { ...command, colors: command.colors.map(color => stageColor(color, amount)) }
    }
    lastCommandRef.current.set(command.producer, command)
    // In sequenza i colori si applicano un beat alla volta, non tutti insieme.
    if (settingsRef.current.dmxBrainColorSource === 'sequence' && command.producer !== MANUAL) return
    controllerRef.current?.setColors(command.producer, command.colors, command.transitionMs)
  }

  // Un solo owner alla volta: Brain se attivo, altrimenti Morphing; il
  // manuale vince da Applica fino a «Torna automatico».
  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    const previous = controller.getStatus().owner
    if (previous && previous !== owner) controller.release(previous)
    controller.acquire(owner)
    controller.setMasterIntensity(owner, master)
    const last = lastCommandRef.current.get(owner)
    if (last) controller.setColors(owner, last.colors, last.transitionMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner])

  useEffect(() => {
    controllerRef.current?.setMasterIntensity(owner, master)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master])

  // Brain: arriva dalla Output Window via main.
  useEffect(() => window.fxControl?.onDmxProducer(receive), [])

  // Morphing: i colori del preset attivo, mai quelli dei flash.
  useEffect(() => {
    receive({
      producer: 'morphing',
      colors: [settings.basePinkColor, settings.hotPinkColor, settings.idleColor],
      transitionMs: MORPHING_TRANSITION_MS,
    })
  }, [settings.basePinkColor, settings.hotPinkColor, settings.idleColor])

  // Schermo: ciò che vede il pubblico, catturato dal main.
  useEffect(() => {
    if (!screenSource) return
    const interval = settings.lowPowerMode ? SCREEN_SAMPLE_LOW_POWER_MS : SCREEN_SAMPLE_MS
    let busy = false
    const timer = window.setInterval(() => {
      if (busy || !window.fxControl?.dmxCaptureScreen) return
      busy = true
      window.fxControl.dmxCaptureScreen()
        .then((pixels) => {
          if (!pixels) return
          const colors = screenDominantColors(pixels, SCREEN_COLOR_COUNT)
          if (colors.length > 0) receive({ producer: 'screen', colors, transitionMs: interval })
        })
        .catch(() => undefined)
        .finally(() => { busy = false })
    }, interval)
    return () => window.clearInterval(timer)
  }, [screenSource, settings.lowPowerMode])

  // Emergenza / Spegni spegne anche le luci; Riprendi le riaccende.
  useEffect(() => {
    controllerRef.current?.blackout(panic)
  }, [panic])

  const setProfiles = (next: DmxProfile[]) => onChange({ dmxFixtureProfiles: next })
  const colorAt = (i: number) => colors[i % colors.length] ?? '#000000'

  const apply = () => {
    const controller = controllerRef.current
    if (!controller) return
    const previous = controller.getStatus().owner
    if (previous && previous !== MANUAL) controller.release(previous)
    controller.acquire(MANUAL)
    setManual(true)
    receive({ producer: MANUAL, colors: fixtures.map((_, i) => colorAt(i)), transitionMs: fadeSeconds * 1000 })
  }

  return (
    <fieldset className="panel">
      <legend>Luci DMX</legend>
      <div className="toolbar">
        <select
          value={settings.dmxInterface}
          onChange={(e) => {
            const next = e.target.value === 'open-dmx' ? 'open-dmx' : 'usb-pro'
            onChange({ dmxInterface: next })
            // Da connesso, riapre la porta con il protocollo scelto.
            if (status?.connected) void controllerRef.current?.connect(next)
          }}
        >
          <option value="usb-pro">USB-DMX Pro (Enttec Pro e compatibili)</option>
          <option value="open-dmx">Open DMX (FTDI FT232R generico)</option>
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
        <span>{status?.connected ? 'Connesso' : 'Non connesso'} — comanda: {owner}</span>
        {manual ? <button type="button" onClick={() => setManual(false)}>Torna automatico</button> : null}
      </div>
      <div className="toolbar">
        <label>
          Colori{' '}
          <select
            value={settings.dmxBrainColorSource}
            onChange={(e) => onChange({
              dmxBrainColorSource: e.target.value === 'render' || e.target.value === 'sequence' ? e.target.value : 'frame',
            })}
          >
            <option value="frame">Brain: immagine generata (a ogni fotogramma) / Morphing: preset</option>
            <option value="render">schermo: ciò che si vede (veloce, Brain e Morphing)</option>
            <option value="sequence">sequenza: tutte le luci insieme, un colore per beat</option>
          </select>
        </label>
        <label>
          Saturazione luci {Math.round(settings.dmxSaturation * 100)}%
          <input
            type="range" min={0} max={1} step={0.05}
            value={settings.dmxSaturation}
            onChange={(e) => onChange({ dmxSaturation: Number(e.target.value) })}
          />
        </label>
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
