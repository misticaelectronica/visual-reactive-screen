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
