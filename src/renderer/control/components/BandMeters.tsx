import type { BandEnergies, BandKey } from '@shared/types'

const ORDER: BandKey[] = ['low', 'lowMid', 'mid', 'high']
const LABELS: Record<BandKey, string> = {
  low: 'Low (kick)',
  lowMid: 'Low-mid',
  mid: 'Mid',
  high: 'High',
}

interface Props {
  meters: BandEnergies
  thresholds: BandEnergies
}

export function BandMeters({ meters, thresholds }: Props) {
  return (
    <div className="meters">
      {ORDER.map((key) => (
        <div key={key} className="meter-row">
          <div className="meter-label">{LABELS[key]}</div>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${Math.min(100, meters[key] * 100)}%` }} />
            <div
              className="meter-threshold"
              style={{ left: `${Math.min(100, thresholds[key] * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
