import './control.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, BandEnergies, MorphingAlgorithm } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { PSY_HYP_MORPHING_PRESETS } from '@shared/psyHypMorphingShapes'
import { stepVisualEngine, createInitialVisualEngineState } from '@shared/visualEngine'
import { DisplaySelector } from './components/DisplaySelector'
import { AudioInputSelector } from './components/AudioInputSelector'
import { BandMeters } from './components/BandMeters'
import { ThresholdControls } from './components/ThresholdControls'
import { VisualControls } from './components/VisualControls'
import { SafetyControls } from './components/SafetyControls'
import { COLOR_PRESETS, PresetsSelector } from './components/PresetsSelector'
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer'
import { useDisplays } from './hooks/useDisplays'
import { useSettingsPersistence } from './hooks/useSettings'

const silentBands = (): BandEnergies => ({
  low: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
})

const COLOR_ROTATION_MIN_MS = 45_000
const COLOR_ROTATION_MAX_MS = 150_000
const MORPHING_PRESET_MIN_MS = 30_000
const MORPHING_PRESET_MAX_MS = 60_000
const NO_MORPHING_MIN_INTERVAL_MS = 180_000
const NO_MORPHING_MAX_INTERVAL_MS = 420_000

type DynamicMorphingCandidate = {
  id: string
  label: string
  algorithm: 'none' | MorphingAlgorithm
  presetId?: string
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pickWeightedColorPreset(currentId: string | null | undefined) {
  const candidates = COLOR_PRESETS.filter((preset) => preset.id && preset.id !== currentId)
  const pool = candidates.length > 0 ? candidates : COLOR_PRESETS.filter((preset) => preset.id)
  const weighted = pool.map((preset) => ({
    preset,
    weight:
      preset.id === 'mistica-electronica-default' || preset.id === 'mistica-electronica-festival'
        ? 4
        : 1,
  }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) return item.preset
  }
  return weighted[weighted.length - 1]?.preset ?? COLOR_PRESETS[0]
}

function buildDynamicMorphingCandidates(): DynamicMorphingCandidate[] {
  return [
    { id: 'no-morphing', label: 'No Morphing', algorithm: 'none' },
    ...MORPHING_PRESETS.map((preset) => ({
      id: `liquid:${preset.id}`,
      label: `Liquid Morphing - ${preset.name}`,
      algorithm: 'liquid' as const,
      presetId: preset.id,
    })),
    { id: 'oniric:default', label: 'Oniric Morphing - default', algorithm: 'oniric', presetId: 'default' },
    ...MORPHING_PRESETS.map((preset) => ({
      id: `oniric:${preset.id}`,
      label: `Oniric Morphing - ${preset.name}`,
      algorithm: 'oniric' as const,
      presetId: preset.id,
    })),
    ...PSY_HYP_MORPHING_PRESETS.map((preset) => ({
      id: `psy-hyp:${preset.id}`,
      label: `PsyHypMorphing - ${preset.name}`,
      algorithm: 'psy-hyp' as const,
      presetId: preset.id,
    })),
  ]
}

function candidateFromSettings(settings: AppSettings): DynamicMorphingCandidate {
  if (!settings.useMorphing) return { id: 'no-morphing', label: 'No Morphing', algorithm: 'none' }
  return {
    id: `${settings.morphingAlgorithm}:${settings.morphingPresetId}`,
    label: `${settings.morphingAlgorithm} - ${settings.morphingPresetId}`,
    algorithm: settings.morphingAlgorithm,
    presetId: settings.morphingPresetId,
  }
}

function pickDynamicMorphingCandidate(current: DynamicMorphingCandidate, forceNoMorphing: boolean): DynamicMorphingCandidate {
  const candidates = buildDynamicMorphingCandidates()
  if (forceNoMorphing) return candidates[0]
  const pool = candidates.filter((candidate) => candidate.id !== current.id)
  const list = pool.length > 0 ? pool : candidates
  return list[Math.floor(Math.random() * list.length) % list.length]
}

export function ControlApp() {
  const api = window.fxControl
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [panic, setPanic] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const testFlashUntilRef = useRef(0)
  const colorRotationTimerRef = useRef<number | null>(null)
  const morphingRotationTimerRef = useRef<number | null>(null)
  const nextNoMorphingDueAtRef = useRef(0)
  const visStateRef = useRef(createInitialVisualEngineState())
  const lastMovingRef = useRef<BandEnergies>({
    low: 0.05,
    lowMid: 0.05,
    mid: 0.05,
    high: 0.05,
  })

  useSettingsPersistence(settings, setSettings)
  const { displays, refresh: refreshDisplays, error: displayError } = useDisplays()

  const audio = useAudioAnalyzer(
    settings.selectedAudioInputId,
    settings.fftSize,
    settings.smoothingTimeConstant,
  )

  const audioRef = useRef(audio)
  audioRef.current = audio

  const patchSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const applyPresetSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch, softMode: false }))
  }, [])

  const sendSafeIdle = useCallback(() => {
    if (!api) return
    api.sendVisualState({
      backgroundColor: settings.idleColor,
      brightness: 0,
      flashActive: false,
      flashIntensity: 0,
      flashMode: settings.flashMode,
    })
  }, [api, settings.flashMode, settings.idleColor])

  useEffect(() => {
    if (!api) return
    const off = api.onOutputClosed(() => {
      setOutputOpen(false)
      setStatus('Finestra di uscita chiusa')
    })
    return off
  }, [api])

  useEffect(() => {
    if (!api) return
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const deltaMs = Math.min(80, Math.max(1, t - last))
      last = t

      const snap = audioRef.current.running ? audioRef.current.pullFrame(deltaMs) : null
      const bandEnergies = snap?.bandEnergies ?? silentBands()
      const movingAverages = snap?.movingAverages ?? lastMovingRef.current
      if (snap) lastMovingRef.current = snap.movingAverages
      const audioPrimed = snap?.audioPrimed ?? false

      const { output, next } = stepVisualEngine({
        nowMs: t,
        deltaMs,
        bandEnergies,
        movingAverages,
        prev: visStateRef.current,
        settings,
        panic,
        testFlashUntilMs: testFlashUntilRef.current,
        audioPrimed,
        rawFrequencyData: snap?.rawFrequencyData,
        sampleRate: audioRef.current.sampleRate,
      })
      visStateRef.current = next

      api?.sendVisualState({
        backgroundColor: output.backgroundColor,
        brightness: output.brightness,
        flashActive: output.flashActive,
        flashIntensity: output.flashIntensity,
        flashMode: output.flashMode,
        useMorphing: settings.useMorphing,
        bandEnergies,
        settings,
        whiteMix: output.debug.whiteMix,
      })

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [api, panic, settings, audio.running, audio.pullFrame])

  const openOutput = async () => {
    if (!api) return
    if (settings.selectedDisplayId == null) {
      setStatus('Seleziona un display')
      return
    }
    const res = await api.openOutput(settings.selectedDisplayId)
    if (res.ok) {
      setOutputOpen(true)
      setStatus('Uscita aperta')
    } else {
      setStatus(res.error ?? 'Errore apertura uscita')
    }
  }

  const closeOutput = async () => {
    if (!api) return
    await api.closeOutput()
    setOutputOpen(false)
    setStatus('Uscita chiusa')
  }

  const onPanic = () => {
    setPanic(true)
    sendSafeIdle()
  }

  const onPanicRelease = () => {
    setPanic(false)
  }

  const onTestFlash = () => {
    const now = performance.now()
    testFlashUntilRef.current = now + settings.flashDurationMs
    visStateRef.current = {
      ...visStateRef.current,
      flashStartedAtMs: now,
      manualFlashStartedAtMs: now,
      flashPeakIntensity: 1,
      whiteMix: 1,
    }
  }

  useEffect(() => {
    if (colorRotationTimerRef.current) {
      window.clearTimeout(colorRotationTimerRef.current)
      colorRotationTimerRef.current = null
    }

    if (!settings.dynamicPresetEnabled || !settings.dynamicColorRotationEnabled) return

    const scheduleColorRotation = () => {
      const delay = randomBetween(COLOR_ROTATION_MIN_MS, COLOR_ROTATION_MAX_MS)
      colorRotationTimerRef.current = window.setTimeout(() => {
        setSettings((current) => {
          if (!current.dynamicPresetEnabled || !current.dynamicColorRotationEnabled) return current
          const preset = pickWeightedColorPreset(current.selectedColorPresetId)
          return {
            ...current,
            ...preset.settings,
            selectedColorPresetId: preset.id ?? current.selectedColorPresetId,
          }
        })
        scheduleColorRotation()
      }, delay)
    }

    scheduleColorRotation()
    return () => {
      if (colorRotationTimerRef.current) {
        window.clearTimeout(colorRotationTimerRef.current)
        colorRotationTimerRef.current = null
      }
    }
  }, [settings.dynamicPresetEnabled, settings.dynamicColorRotationEnabled])

  useEffect(() => {
    if (morphingRotationTimerRef.current) {
      window.clearTimeout(morphingRotationTimerRef.current)
      morphingRotationTimerRef.current = null
    }

    if (!settings.dynamicPresetEnabled || !settings.dynamicMorphingRotationEnabled) {
      nextNoMorphingDueAtRef.current = 0
      return
    }

    const now = Date.now()
    if (nextNoMorphingDueAtRef.current <= now) {
      nextNoMorphingDueAtRef.current = now + randomBetween(NO_MORPHING_MIN_INTERVAL_MS, NO_MORPHING_MAX_INTERVAL_MS)
    }

    const scheduleMorphingRotation = () => {
      const delay = randomBetween(MORPHING_PRESET_MIN_MS, MORPHING_PRESET_MAX_MS)
      morphingRotationTimerRef.current = window.setTimeout(() => {
        setSettings((current) => {
          if (!current.dynamicPresetEnabled || !current.dynamicMorphingRotationEnabled) return current
          const nowInner = Date.now()
          const forceNoMorphing = nowInner >= nextNoMorphingDueAtRef.current
          const candidate = pickDynamicMorphingCandidate(candidateFromSettings(current), forceNoMorphing)
          if (candidate.algorithm === 'none') {
            nextNoMorphingDueAtRef.current =
              nowInner + randomBetween(NO_MORPHING_MIN_INTERVAL_MS, NO_MORPHING_MAX_INTERVAL_MS)
            return {
              ...current,
              useMorphing: false,
            }
          }

          return {
            ...current,
            useMorphing: true,
            morphingAlgorithm: candidate.algorithm,
            morphingPresetId: candidate.presetId ?? 'default',
          }
        })
        scheduleMorphingRotation()
      }, delay)
    }

    scheduleMorphingRotation()
    return () => {
      if (morphingRotationTimerRef.current) {
        window.clearTimeout(morphingRotationTimerRef.current)
        morphingRotationTimerRef.current = null
      }
    }
  }, [settings.dynamicPresetEnabled, settings.dynamicMorphingRotationEnabled])

  if (!api) {
    const inBrowser =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    return (
      <div className="page">
        <p className="error">
          {inBrowser
            ? 'Stai aprendo questa pagina nel browser: il bridge Electron (finestra controllo) non è disponibile qui.'
            : 'Il preload Electron non ha esposto le API (fxControl). Verifica la build e il percorso del preload.'}
        </p>
        <p className="hint">
          Chiudi questa scheda e avvia l&apos;app da terminale nella cartella del progetto con{' '}
          <code className="inline-code">pnpm dev</code>
          : si aprirà la finestra Electron che carica questa UI con i permessi corretti.
        </p>
        <p className="hint">Non usare &quot;Apri nel browser&quot; sul dev server Vite per questa schermata.</p>
      </div>
    )
  }

  const sens = settings.sensitivity * (settings.softMode ? 0.65 : 1)
  const thresholdPreview = {
    low: audio.averages.low * settings.lowThresholdMultiplier * sens,
    lowMid: audio.averages.lowMid * settings.lowMidThresholdMultiplier * sens,
    mid: audio.averages.mid * settings.midThresholdMultiplier * sens,
    high: audio.averages.high * settings.highThresholdMultiplier * sens,
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Origine FX</h1>
        <p className="subtitle">Uscita HDMI reattiva all&apos;audio (MVP)</p>
      </header>

      <section className="warning">
        <strong>Avviso salute:</strong> luci intermittenti possono provocare fastidio o scatenare crisi in
        persone con epilessia fotosensibile. Usa limiti di frequenza, cooldown, modalità soft e il pulsante
        Panic/Off in caso di necessità. Questa app non fornisce valutazioni mediche.
      </section>

      <section className="toolbar">
        <button type="button" onClick={() => void openOutput()} disabled={outputOpen}>
          Apri uscita fullscreen
        </button>
        <button type="button" onClick={() => void closeOutput()} disabled={!outputOpen}>
          Chiudi uscita
        </button>
        <button type="button" onClick={onTestFlash}>
          Test flash
        </button>
        <button type="button" className="danger" onClick={onPanic}>
          Panic / Off
        </button>
        <button type="button" onClick={onPanicRelease} disabled={!panic}>
          Riprendi (rilascia panic)
        </button>
        <button type="button" onClick={() => void refreshDisplays()}>
          Aggiorna display
        </button>
      </section>

      {status ? <p className="status">{status}</p> : null}
      {displayError ? <p className="error">{displayError}</p> : null}

      <section className="grid">
        <DisplaySelector
          displays={displays}
          value={settings.selectedDisplayId}
          onChange={(id) => patchSettings({ selectedDisplayId: id })}
        />
        <AudioInputSelector
          value={settings.selectedAudioInputId}
          onChange={(id) => patchSettings({ selectedAudioInputId: id })}
        />
      </section>

      <section className="grid audio-actions">
        <button type="button" onClick={() => void audio.start()} disabled={audio.running}>
          Avvia analisi audio
        </button>
        <button type="button" onClick={audio.stop} disabled={!audio.running}>
          Ferma analisi audio
        </button>
        {audio.error ? <p className="error">{audio.error}</p> : null}
      </section>

      <section className="panel">
        <h2>Metriche banda</h2>
        <BandMeters meters={audio.meters} thresholds={thresholdPreview} />
      </section>

      <PresetsSelector settings={settings} onApplyPreset={applyPresetSettings} onChangeSettings={patchSettings} />

      <ThresholdControls settings={settings} onChange={patchSettings} />
      <VisualControls settings={settings} onChange={patchSettings} />
      <SafetyControls settings={settings} onChange={patchSettings} />

      <section className="toolbar">
        <button
          type="button"
          onClick={() => {
            setSettings(DEFAULT_SETTINGS)
            visStateRef.current = createInitialVisualEngineState()
          }}
        >
          Ripristina default
        </button>
      </section>
    </div>
  )
}
