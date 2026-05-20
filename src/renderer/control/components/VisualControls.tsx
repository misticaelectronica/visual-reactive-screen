import type { AppSettings } from '@shared/types'
import { MORPHING_PRESETS } from '@shared/morphingPresets'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function VisualControls({ settings, onChange }: Props) {
  return (
    <fieldset className="panel">
      <legend>Morphing & Visuals</legend>
      <div className="grid2" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.useMorphing}
            onChange={(e) => onChange({ useMorphing: e.target.checked })}
          />
          <strong>Use morphing</strong>
        </label>
        <label>
          Morphing Algorithm
          <select
            value={settings.morphingAlgorithm || 'liquid'}
            onChange={(e) => onChange({ morphingAlgorithm: e.target.value as 'liquid' | 'oniric' })}
            disabled={!settings.useMorphing}
          >
            <option value="liquid">Liquid Morphing</option>
            <option value="oniric">Oniric Morphing</option>
          </select>
        </label>
        <label>
          Morphing Preset
          <select
            value={settings.morphingPresetId}
            onChange={(e) => onChange({ morphingPresetId: e.target.value })}
            disabled={!settings.useMorphing}
          >
            {MORPHING_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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

      <legend>Flash, decay e colori</legend>
      <div className="grid2">
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
          Decay (ms)
          <input
            type="range"
            min={80}
            max={800}
            value={settings.decayMs}
            onChange={(e) => onChange({ decayMs: Number(e.target.value) })}
          />
          <span className="mono">{settings.decayMs} ms</span>
        </label>
        <label>
          Cooldown (ms)
          <input
            type="range"
            min={40}
            max={400}
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
          Max flash / sec
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={settings.maxFlashesPerSecond}
            onChange={(e) => onChange({ maxFlashesPerSecond: Number(e.target.value) })}
          />
          <span className="mono">{settings.maxFlashesPerSecond}</span>
        </label>
        <label>
          FFT size
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
          Smoothing analyser
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
          Idle
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
