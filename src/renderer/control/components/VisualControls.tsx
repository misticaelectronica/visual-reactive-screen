import type { AppSettings, MorphingAlgorithm } from '@shared/types'
import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { PSY_HYP_MORPHING_PRESETS } from '@shared/psyHypMorphingShapes'
import { SLIT_SCAN_PRESETS } from '@shared/slitScanPresets'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

const ONIRIC_PRESET_OPTIONS = [{ id: 'default', name: 'default' }, ...MORPHING_PRESETS]

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

  return (
    <fieldset className="panel">
      <legend>Morphing e visuali</legend>
      <div className="grid2" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.useMorphing}
            onChange={(e) =>
              onChange({
                useMorphing: e.target.checked,
                useBrain: e.target.checked ? false : settings.useBrain,
              })
            }
          />
          <strong>Usa morphing</strong>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.useBrain}
            onChange={(e) =>
              onChange({
                useBrain: e.target.checked,
                useMorphing: e.target.checked ? false : settings.useMorphing,
                dynamicMorphingRotationEnabled: e.target.checked
                  ? false
                  : settings.dynamicMorphingRotationEnabled,
              })
            }
          />
          <strong>Brain</strong>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <strong>Alternate with Brain (80/20)</strong>
        </label>
        <label>
          Algoritmo morphing
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
            disabled={!settings.useMorphing}
          >
            <option value="liquid">Liquid Morphing</option>
            <option value="2001">2001</option>
            <option value="oniric">Oniric Morphing</option>
            <option value="psy-hyp">PsyHypMorphing</option>
          </select>
        </label>
        <label>
          Preset morphing
          <select
            value={presetValue}
            onChange={(e) => onChange({ morphingPresetId: e.target.value, softMode: false })}
            disabled={!settings.useMorphing}
          >
            {presetOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
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
          Renderer Brain
          <select
            value={settings.brainRendererId}
            onChange={(e) => onChange({
              brainRendererId: e.target.value as AppSettings['brainRendererId'],
            })}
            disabled={!settings.useBrain || settings.alternateBrainWithMorphing}
          >
            <option value="print2d">Print2D — serigrafico</option>
            <option value="psycho2d">Psycho2D — finestre</option>
            <option value="vector-morph">Vector Morph — vettoriale</option>
            <option value="material-morph">Materia Morph — sedimentale</option>
            <option value="filter-psiche">FilterPsiche — cromatico</option>
            <option value="bauhaus-morph">Bauhaus Morph — pittorico</option>
            <option value="dream-segmentation">Dream Segmentation — immaginazione</option>
          </select>
        </label>
        <label>
          Alternanza renderer Brain
          <select
            value={settings.brainRendererMode}
            onChange={(e) => onChange({
              brainRendererMode: e.target.value as AppSettings['brainRendererMode'],
            })}
            disabled={!settings.useBrain || settings.alternateBrainWithMorphing}
          >
            <option value="manual">Manuale</option>
            <option value="rotation">Automatica</option>
            <option value="story-cycle">Tutti per storia — casuale per fotogramma</option>
          </select>
        </label>
        <label>
          Intervallo renderer Brain
          <input
            type="range"
            min={10_000}
            max={120_000}
            step={5_000}
            value={settings.brainRendererRotationMs}
            onChange={(e) => onChange({ brainRendererRotationMs: Number(e.target.value) })}
            disabled={!settings.useBrain || settings.brainRendererMode !== 'rotation'}
          />
          <span className="mono">{Math.round(settings.brainRendererRotationMs / 1_000)} s</span>
        </label>
      </div>

      <legend>Debug morphing onirico</legend>
      <div className="grid2" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.debugMorphingVisibility}
            onChange={(e) => onChange({ debugMorphingVisibility: e.target.checked })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <strong>Debug visibilità</strong>
        </label>
        <label>
          Opacità morphing
          <input
            type="range"
            min={0.18}
            max={0.8}
            step={0.01}
            value={settings.morphingOpacity}
            onChange={(e) => onChange({ morphingOpacity: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingOpacity.toFixed(2)}</span>
        </label>
        <label>
          Opacità minima
          <input
            type="range"
            min={0.12}
            max={0.5}
            step={0.01}
            value={settings.morphingMinOpacity}
            onChange={(e) => onChange({ morphingMinOpacity: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingMinOpacity.toFixed(2)}</span>
        </label>
        <label>
          Luminanza morphing
          <input
            type="range"
            min={0}
            max={0.7}
            step={0.01}
            value={settings.morphingLuminanceBoost}
            onChange={(e) => onChange({ morphingLuminanceBoost: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingLuminanceBoost.toFixed(2)}</span>
        </label>
        <label>
          Glow morphing
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.morphingGlowIntensity}
            onChange={(e) => onChange({ morphingGlowIntensity: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingGlowIntensity.toFixed(2)}</span>
        </label>
        <label>
          Contrasto morphing
          <input
            type="range"
            min={0.8}
            max={1.8}
            step={0.01}
            value={settings.morphingContrast}
            onChange={(e) => onChange({ morphingContrast: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingContrast.toFixed(2)}</span>
        </label>
        <label>
          Scala morphing
          <input
            type="range"
            min={0.75}
            max={1.6}
            step={0.01}
            value={settings.morphingScale}
            onChange={(e) => onChange({ morphingScale: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingScale.toFixed(2)}</span>
        </label>
        <label>
          Morbidezza bordo
          <input
            type="range"
            min={0.25}
            max={1}
            step={0.01}
            value={settings.morphingEdgeSoftness}
            onChange={(e) => onChange({ morphingEdgeSoftness: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.morphingEdgeSoftness.toFixed(2)}</span>
        </label>
        <label>
          Buio sfondo
          <input
            type="range"
            min={0}
            max={0.98}
            step={0.01}
            value={settings.backgroundDarkness}
            onChange={(e) => onChange({ backgroundDarkness: Number(e.target.value) })}
            disabled={!settings.useMorphing || settings.morphingAlgorithm !== 'oniric'}
          />
          <span className="mono">{settings.backgroundDarkness.toFixed(2)}</span>
        </label>
      </div>

      <legend>Flash, dissolvenza e colori</legend>
      <div className="grid2">
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
        <label>
          Durata flash (ms)
          <input
            type="range"
            min={20}
            max={220}
            value={settings.flashDurationMs}
            onChange={(e) => onChange({ flashDurationMs: Number(e.target.value) })}
          />
          <span className="mono">{settings.flashDurationMs} ms</span>
        </label>
        <label>
          Dissolvenza (ms)
          <input
            type="range"
            min={80}
            max={3200}
            value={settings.decayMs}
            onChange={(e) => onChange({ decayMs: Number(e.target.value) })}
          />
          <span className="mono">{settings.decayMs} ms</span>
        </label>
        <label>
          Intervallo minimo (ms)
          <input
            type="range"
            min={40}
            max={6000}
            value={settings.cooldownMs}
            onChange={(e) => onChange({ cooldownMs: Number(e.target.value) })}
          />
          <span className="mono">{settings.cooldownMs} ms</span>
        </label>
        <label>
          Sensibilità
          <input
            type="range"
            min={0.2}
            max={2}
            step={0.01}
            value={settings.sensitivity}
            onChange={(e) => onChange({ sensitivity: Number(e.target.value) })}
          />
          <span className="mono">{settings.sensitivity.toFixed(2)}</span>
        </label>
        <label>
          Flash massimi al secondo
          <input
            type="range"
            min={0.05}
            max={1.5}
            step={0.01}
            value={settings.maxFlashesPerSecond}
            onChange={(e) => onChange({ maxFlashesPerSecond: Number(e.target.value) })}
          />
          <span className="mono">{settings.maxFlashesPerSecond.toFixed(2)}</span>
        </label>
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
        <label>
          Livellamento analizzatore
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={settings.smoothingTimeConstant}
            onChange={(e) => onChange({ smoothingTimeConstant: Number(e.target.value) })}
          />
          <span className="mono">{settings.smoothingTimeConstant.toFixed(2)}</span>
        </label>
      </div>
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
  )
}
