export type SlitScanPresetId =
  | 'base'
  | 'bright-dense'
  | 'deep-dense'
  | 'deep-dance-norwell'
  | 'horizontal'
  | 'parallel-slit'
  | 'parallel-slit-ultra'
  | 'eq-progressive'

export type SlitScanLineMode = 'radial' | 'horizontal' | 'parallel'

export interface SlitScanPreset {
  id: SlitScanPresetId
  name: string
  lineMultiplier: number
  alphaMultiplier: number
  brightnessMultiplier: number
  glowMultiplier: number
  thicknessMultiplier: number
  depthSpreadMultiplier: number
  colorShift: number
  lineMode: SlitScanLineMode
  eqReactive: boolean
  parallelLengthMultiplier?: number
}

export const SLIT_SCAN_PRESETS: SlitScanPreset[] = [
  {
    id: 'base',
    name: '2001 Base',
    lineMultiplier: 1,
    alphaMultiplier: 1,
    brightnessMultiplier: 1,
    glowMultiplier: 1,
    thicknessMultiplier: 1,
    depthSpreadMultiplier: 1,
    colorShift: 0,
    lineMode: 'radial',
    eqReactive: false,
  },
  {
    id: 'bright-dense',
    name: '2001 Bright Dense',
    lineMultiplier: 1.3,
    alphaMultiplier: 1.14,
    brightnessMultiplier: 1.22,
    glowMultiplier: 1.18,
    thicknessMultiplier: 0.96,
    depthSpreadMultiplier: 1.08,
    colorShift: 1,
    lineMode: 'radial',
    eqReactive: false,
  },
  {
    id: 'deep-dense',
    name: '2001 Deep Dense',
    lineMultiplier: 1.5,
    alphaMultiplier: 0.74,
    brightnessMultiplier: 0.72,
    glowMultiplier: 0.70,
    thicknessMultiplier: 0.88,
    depthSpreadMultiplier: 1.18,
    colorShift: 2,
    lineMode: 'radial',
    eqReactive: false,
  },
  {
    id: 'deep-dance-norwell',
    name: '2001 Deep Dance Norwell',
    lineMultiplier: 1.5,
    alphaMultiplier: 0.74,
    brightnessMultiplier: 0.72,
    glowMultiplier: 0.70,
    thicknessMultiplier: 0.88,
    depthSpreadMultiplier: 1.18,
    colorShift: 2,
    lineMode: 'radial',
    eqReactive: false,
  },
  {
    id: 'horizontal',
    name: '2001 Horizontal',
    lineMultiplier: 1.14,
    alphaMultiplier: 0.92,
    brightnessMultiplier: 0.92,
    glowMultiplier: 0.82,
    thicknessMultiplier: 0.82,
    depthSpreadMultiplier: 1.10,
    colorShift: 3,
    lineMode: 'horizontal',
    eqReactive: false,
  },
  {
    id: 'parallel-slit',
    name: '2001 Parallel Slit',
    lineMultiplier: 1.0,
    alphaMultiplier: 0.96,
    brightnessMultiplier: 1.02,
    glowMultiplier: 0.86,
    thicknessMultiplier: 0.72,
    depthSpreadMultiplier: 1.02,
    colorShift: 4,
    lineMode: 'parallel',
    eqReactive: false,
  },
  {
    id: 'parallel-slit-ultra',
    name: '2001 Parallel Slit Ultra',
    lineMultiplier: 1.08,
    alphaMultiplier: 0.92,
    brightnessMultiplier: 1.28,
    glowMultiplier: 1.12,
    thicknessMultiplier: 3.6,
    depthSpreadMultiplier: 1.08,
    colorShift: 4,
    lineMode: 'parallel',
    eqReactive: false,
    parallelLengthMultiplier: 2,
  },
  {
    id: 'eq-progressive',
    name: '2001 EQ Progressive',
    lineMultiplier: 1.18,
    alphaMultiplier: 0.95,
    brightnessMultiplier: 1.02,
    glowMultiplier: 1.00,
    thicknessMultiplier: 0.92,
    depthSpreadMultiplier: 1.06,
    colorShift: 0,
    lineMode: 'radial',
    eqReactive: true,
  },
]

export function getSlitScanPreset(id: string | null | undefined): SlitScanPreset {
  return SLIT_SCAN_PRESETS.find((preset) => preset.id === id) ?? SLIT_SCAN_PRESETS[0]
}
