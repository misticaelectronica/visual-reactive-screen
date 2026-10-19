import type { AppSettings, BrainImageQuality, MorphingAlgorithm } from '@shared/types'
import { BRAIN_NEGATIVE_PROMPT_MAX_CHARS } from '@shared/types'
import { DEFAULT_BRAIN_NEGATIVE_PROMPT } from '@shared/defaults'
import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { PSY_HYP_MORPHING_PRESETS } from '@shared/psyHypMorphingShapes'
import { SLIT_SCAN_PRESETS } from '@shared/slitScanPresets'
import { isPsicoFantasmaBundled } from '@shared/psicoFantasmaAvailability'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

const ONIRIC_PRESET_OPTIONS = [{ id: 'default', name: 'default' }, ...MORPHING_PRESETS]

type VisualSource = 'color' | 'morphing' | 'brain'

const BRAIN_IMAGE_QUALITY_OPTIONS: { value: BrainImageQuality; label: string }[] = [
  { value: 'low', label: 'Low — veloce (10/14 step)' },
  { value: 'mid', label: 'Mid — intermedia (13/19 step)' },
  { value: 'high', label: 'High — piena (step di brainRendering.json)' },
]

function firstPresetIdForAlgorithm(algorithm: MorphingAlgorithm): string {
  if (algorithm === 'psy-hyp') return PSY_HYP_MORPHING_PRESETS[0]?.id ?? 'default'
  if (algorithm === 'oniric') return ONIRIC_PRESET_OPTIONS[0]?.id ?? 'default'
  if (algorithm === '2001') return SLIT_SCAN_PRESETS[0]?.id ?? 'base'
  return MORPHING_PRESETS[0]?.id ?? 'ritual-drift'
}

function presetExistsForAlgorithm(algorithm: MorphingAlgorithm, presetId: string): boolean {
  if (algorithm === 'psy-hyp') return PSY_HYP_MORPHING_PRESETS.some((preset) => preset.id === presetId)
  if (algorithm === 'oniric') return ONIRIC_PRESET_OPTIONS.some((preset) => preset.id === presetId)
  if (algorithm === '2001') return SLIT_SCAN_PRESETS.some((preset) => preset.id === presetId)
  return MORPHING_PRESETS.some((preset) => preset.id === presetId)
}

interface RangeFieldProps {
  label: string
  min: number
  max: number
  step?: number
  value: number
  display: string
  disabled?: boolean
  onChange: (value: number) => void
}

function RangeField({ label, min, max, step, value, display, disabled, onChange }: RangeFieldProps) {
  return (
    <label>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
      <span className="mono">{display}</span>
    </label>
  )
}

export function VisualControls({ settings, onChange }: Props) {
  const morphingAlgorithm = settings.morphingAlgorithm || 'liquid'
  const presetOptions =
    morphingAlgorithm === 'psy-hyp'
      ? PSY_HYP_MORPHING_PRESETS
      : morphingAlgorithm === 'oniric'
        ? ONIRIC_PRESET_OPTIONS
        : morphingAlgorithm === '2001'
          ? SLIT_SCAN_PRESETS
          : MORPHING_PRESETS
  const presetValue = presetOptions.some((preset) => preset.id === settings.morphingPresetId)
    ? settings.morphingPresetId
    : firstPresetIdForAlgorithm(morphingAlgorithm)
  const source: VisualSource = settings.useBrain
    ? 'brain'
    : settings.useMorphing
      ? 'morphing'
      : 'color'
  const brainOff = !settings.useBrain
  const oniricActive = settings.useMorphing && morphingAlgorithm === 'oniric'

  const selectSource = (next: VisualSource) => {
    if (next === 'brain') {
      onChange({ useBrain: true, useMorphing: false })
    } else if (next === 'morphing') {
      onChange({ useBrain: false, useMorphing: true })
    } else {
      onChange({ useBrain: false, useMorphing: false })
    }
  }

  return (
    <>
      <fieldset className="panel">
        <legend>Sorgente visiva</legend>
        <div className="segmented" role="radiogroup" aria-label="Sorgente visiva">
          {([
            ['color', 'Solo colore'],
            ['morphing', 'Morphing'],
            ['brain', 'Brain'],
          ] as const).map(([value, label]) => (
            <label key={value} className={source === value ? 'active' : undefined}>
              <input
                type="radio"
                name="visual-source"
                value={value}
                checked={source === value}
                onChange={() => selectSource(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="panel" disabled={brainOff}>
        <legend>Brain</legend>
        <div className="grid2">
          <label>
            Renderer
            <select
              value={settings.brainRendererId}
              onChange={(e) => onChange({
                brainRendererId: e.target.value as AppSettings['brainRendererId'],
                ...(e.target.value === 'psicofantasma' ? { brainRendererMode: 'manual' as const } : {}),
              })}
              disabled={settings.alternateBrainWithMorphing}
            >
              <option value="print2d">Print2D — serigrafico</option>
              <option value="psycho2d">Psycho2D — finestre</option>
              <option value="vector-morph">Vector Morph — vettoriale</option>
              <option value="material-morph">Materia Morph — sedimentale</option>
              <option value="filter-psiche">FilterPsiche — cromatico</option>
              <option value="bauhaus-morph">Bauhaus Morph — pittorico</option>
              <option value="dream-segmentation">Dream Segmentation — immaginazione</option>
              <option value="glitch-morph">Glitch Morph — contorno</option>
              <option value="fractal-spiral-degeneration">Fractal Spiral Degeneration — ricorsivo</option>
              <option value="deliquescence">Deliquescence — dissoluzione oscura</option>
              <option value="psicofantasma">
                {isPsicoFantasmaBundled() ? 'PsicoFantasma — pareidolia artificiale' : 'PsicoFantasma — repertorio in preparazione'}
              </option>
            </select>
            {settings.brainRendererId === 'psicofantasma' && !isPsicoFantasmaBundled() && (
              <small>Prova di emersione e risposta all’audio. Riconoscimento in attesa del repertorio.</small>
            )}
          </label>
          <label>
            Alternanza renderer
            <select
              value={settings.brainRendererMode}
              onChange={(e) => onChange({
                brainRendererMode: e.target.value as AppSettings['brainRendererMode'],
              })}
              disabled={settings.alternateBrainWithMorphing}
            >
              <option value="manual">Manuale</option>
              <option value="rotation">Automatica</option>
              <option value="story-cycle">Tutti per storia — casuale per fotogramma</option>
            </select>
          </label>
          <RangeField
            label="Intervallo renderer"
            min={10_000}
            max={120_000}
            step={5_000}
            value={settings.brainRendererRotationMs}
            display={`${Math.round(settings.brainRendererRotationMs / 1_000)} s`}
            disabled={settings.brainRendererMode !== 'rotation'}
            onChange={(value) => onChange({ brainRendererRotationMs: value })}
          />
          <label>
            Regime audio (collaudo)
            <select
              value={settings.audioMode ?? 'baseline'}
              onChange={(e) => onChange({ audioMode: e.target.value as AppSettings['audioMode'] })}
            >
              <option value="baseline">Baseline — pressione percettiva</option>
              <option value="experimental">Sperimentale — ancoraggio motorio (MVP, pilota il Visual)</option>
            </select>
          </label>
        </div>
        <div className="checks">
          <label className="inline">
            <input
              type="checkbox"
              checked={settings.animatronixEnabled}
              onChange={(e) => onChange({ animatronixEnabled: e.target.checked })}
            />
            <strong>ANIMATRONIX</strong> — anima la storia a fine ciclo
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={settings.blockExplicitImages === true}
              onChange={(e) => onChange({ blockExplicitImages: e.target.checked })}
            />
            Emergenza: impedisci la generazione di immagini esplicite (di norma spento: il modello è libero)
          </label>
        </div>

        <h3>Generazione immagini</h3>
        <div className="grid2">
          <label>
            Qualità
            <select
              value={settings.brainImageQuality}
              onChange={(e) => onChange({ brainImageQuality: e.target.value as BrainImageQuality })}
            >
              {BRAIN_IMAGE_QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="hint">
              Step per fotogramma intermedio/alta qualità. Più step = corpi più definiti, ma più
              tempo GPU per storia.
            </small>
          </label>
        </div>
        <label className="field">
          Negative prompt — cosa il modello deve evitare
          <textarea
            rows={3}
            maxLength={BRAIN_NEGATIVE_PROMPT_MAX_CHARS}
            value={settings.brainNegativePrompt}
            onChange={(e) => onChange({ brainNegativePrompt: e.target.value })}
          />
          <small className="hint">
            In inglese, termini separati da virgole. Solo difetti anatomici: non aggiungere termini su
            nudità o contenuto. Vuoto = nessun negative prompt.
            {' '}
            {settings.brainNegativePrompt.length}/{BRAIN_NEGATIVE_PROMPT_MAX_CHARS}
          </small>
        </label>
        <button
          type="button"
          onClick={() => onChange({ brainNegativePrompt: DEFAULT_BRAIN_NEGATIVE_PROMPT })}
          disabled={settings.brainNegativePrompt === DEFAULT_BRAIN_NEGATIVE_PROMPT}
        >
          Ripristina negative prompt predefinito
        </button>
      </fieldset>

      <fieldset className="panel" disabled={!settings.useMorphing}>
        <legend>Morphing</legend>
        <div className="grid2">
          <label>
            Algoritmo
            <select
              value={morphingAlgorithm}
              onChange={(e) => {
                const nextAlgorithm = e.target.value as MorphingAlgorithm
                const nextPresetId = presetExistsForAlgorithm(nextAlgorithm, settings.morphingPresetId)
                  ? settings.morphingPresetId
                  : firstPresetIdForAlgorithm(nextAlgorithm)
                onChange({
                  morphingAlgorithm: nextAlgorithm,
                  softMode: false,
                  morphingPresetId: nextPresetId,
                })
              }}
            >
              <option value="liquid">Liquid Morphing</option>
              <option value="2001">2001</option>
              <option value="oniric">Oniric Morphing</option>
              <option value="psy-hyp">PsyHypMorphing</option>
            </select>
          </label>
          <label>
            Preset
            <select
              value={presetValue}
              onChange={(e) => onChange({ morphingPresetId: e.target.value, softMode: false })}
            >
              {presetOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {oniricActive ? (
          <details className="subpanel">
            <summary>Debug morphing onirico</summary>
            <div className="grid2">
              <label className="inline">
                <input
                  type="checkbox"
                  checked={settings.debugMorphingVisibility}
                  onChange={(e) => onChange({ debugMorphingVisibility: e.target.checked })}
                />
                <strong>Debug visibilità</strong>
              </label>
              <RangeField label="Opacità morphing" min={0.18} max={0.8} step={0.01}
                value={settings.morphingOpacity} display={settings.morphingOpacity.toFixed(2)}
                onChange={(value) => onChange({ morphingOpacity: value })} />
              <RangeField label="Opacità minima" min={0.12} max={0.5} step={0.01}
                value={settings.morphingMinOpacity} display={settings.morphingMinOpacity.toFixed(2)}
                onChange={(value) => onChange({ morphingMinOpacity: value })} />
              <RangeField label="Luminanza morphing" min={0} max={0.7} step={0.01}
                value={settings.morphingLuminanceBoost} display={settings.morphingLuminanceBoost.toFixed(2)}
                onChange={(value) => onChange({ morphingLuminanceBoost: value })} />
              <RangeField label="Glow morphing" min={0} max={1} step={0.01}
                value={settings.morphingGlowIntensity} display={settings.morphingGlowIntensity.toFixed(2)}
                onChange={(value) => onChange({ morphingGlowIntensity: value })} />
              <RangeField label="Contrasto morphing" min={0.8} max={1.8} step={0.01}
                value={settings.morphingContrast} display={settings.morphingContrast.toFixed(2)}
                onChange={(value) => onChange({ morphingContrast: value })} />
              <RangeField label="Scala morphing" min={0.75} max={1.6} step={0.01}
                value={settings.morphingScale} display={settings.morphingScale.toFixed(2)}
                onChange={(value) => onChange({ morphingScale: value })} />
              <RangeField label="Morbidezza bordo" min={0.25} max={1} step={0.01}
                value={settings.morphingEdgeSoftness} display={settings.morphingEdgeSoftness.toFixed(2)}
                onChange={(value) => onChange({ morphingEdgeSoftness: value })} />
              <RangeField label="Buio sfondo" min={0} max={0.98} step={0.01}
                value={settings.backgroundDarkness} display={settings.backgroundDarkness.toFixed(2)}
                onChange={(value) => onChange({ backgroundDarkness: value })} />
            </div>
          </details>
        ) : null}
      </fieldset>

      <fieldset className="panel">
        <legend>Risposta musicale e flash</legend>
        <div className="grid2">
          <label>
            Profilo movimento
            <select
              value={settings.motionProfile ?? 'dub'}
              onChange={(e) => onChange({ motionProfile: e.target.value as AppSettings['motionProfile'], softMode: false })}
            >
              <option value="dub">Dub - elastico</option>
              <option value="techno">Techno - pulsante</option>
              <option value="ambient">Ambient - fluido</option>
            </select>
          </label>
          <label>
            Modalità flash
            <select
              value={settings.flashMode}
              onChange={(e) => onChange({ flashMode: e.target.value as AppSettings['flashMode'] })}
            >
              <option value="high">Alti</option>
              <option value="mid">Medi</option>
              <option value="low">Bassi</option>
              <option value="off">Disattivato</option>
            </select>
          </label>
          <RangeField label="Sensibilità" min={0.2} max={2} step={0.01}
            value={settings.sensitivity} display={settings.sensitivity.toFixed(2)}
            onChange={(value) => onChange({ sensitivity: value })} />
          <RangeField label="Durata flash" min={20} max={220}
            value={settings.flashDurationMs} display={`${settings.flashDurationMs} ms`}
            onChange={(value) => onChange({ flashDurationMs: value })} />
          <RangeField label="Dissolvenza" min={80} max={3200}
            value={settings.decayMs} display={`${settings.decayMs} ms`}
            onChange={(value) => onChange({ decayMs: value })} />
          <RangeField label="Intervallo minimo" min={40} max={6000}
            value={settings.cooldownMs} display={`${settings.cooldownMs} ms`}
            onChange={(value) => onChange({ cooldownMs: value })} />
          <RangeField label="Flash massimi al secondo" min={0.05} max={1.5} step={0.01}
            value={settings.maxFlashesPerSecond} display={settings.maxFlashesPerSecond.toFixed(2)}
            onChange={(value) => onChange({ maxFlashesPerSecond: value })} />
        </div>
      </fieldset>

      <fieldset className="panel">
        <legend>Colori</legend>
        <div className="grid2 colors">
          <label>
            Riposo
            <input
              type="color"
              value={settings.idleColor}
              onChange={(e) => onChange({ idleColor: e.target.value })}
            />
          </label>
          <label>
            Rosa base
            <input
              type="color"
              value={settings.basePinkColor}
              onChange={(e) => onChange({ basePinkColor: e.target.value })}
            />
          </label>
          <label>
            Rosa caldo
            <input
              type="color"
              value={settings.hotPinkColor}
              onChange={(e) => onChange({ hotPinkColor: e.target.value })}
            />
          </label>
          <label>
            Flash bianco
            <input
              type="color"
              value={settings.whiteFlashColor}
              onChange={(e) => onChange({ whiteFlashColor: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <details className="panel">
        <summary>
          Avanzate{settings.alternateBrainWithMorphing ? ' — alternanza 80/20 attiva' : ''}
        </summary>
        <div className="grid2">
          <label>
            Dimensione FFT
            <select
              value={settings.fftSize}
              onChange={(e) => onChange({ fftSize: Number(e.target.value) as AppSettings['fftSize'] })}
            >
              {[256, 512, 1024, 2048, 4096, 8192].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <RangeField label="Livellamento analizzatore" min={0} max={0.99} step={0.01}
            value={settings.smoothingTimeConstant} display={settings.smoothingTimeConstant.toFixed(2)}
            onChange={(value) => onChange({ smoothingTimeConstant: value })} />
        </div>
        <label className="inline deprecated">
          <input
            type="checkbox"
            checked={settings.alternateBrainWithMorphing}
            onChange={(e) => onChange({
              alternateBrainWithMorphing: e.target.checked,
              useBrain: e.target.checked ? true : settings.useBrain,
              useMorphing: e.target.checked ? false : settings.useMorphing,
              brainRendererMode: e.target.checked
                ? 'story-cycle'
                : settings.brainRendererMode,
            })}
          />
          Alternate with Brain (80/20) — deprecata, solo per compatibilità
        </label>
      </details>
    </>
  )
}
