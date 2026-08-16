import type { ConsciousnessMotionCandidate } from '@shared/types'
import type { BrainRhythmState } from './brainRhythm'

const MOTION_BEATS = 16
const MOTION_MIN_READ_MS = 12_000
const MOTION_COOLDOWN_MS = 75_000

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function motionColors(candidate: ConsciousnessMotionCandidate): [string, string, string] {
  const seed = hash(`${candidate.memoryId}:${candidate.influenceText}`)
  const hue = seed % 360
  return [
    `hsl(${hue} 88% 56%)`,
    `hsl(${(hue + 74) % 360} 84% 62%)`,
    `hsl(${(hue + 191) % 360} 92% 48%)`,
  ]
}

export type BrainConsciousnessMotionLayer = {
  offer: (candidate: ConsciousnessMotionCandidate, storyId: string, now: number) => boolean
  update: (
    rhythm: BrainRhythmState,
    now: number,
    lowPowerMode: boolean,
  ) => { active: boolean; completedPauseMs: number }
  pendingInfluence: () => ConsciousnessMotionCandidate | null
  destroy: () => void
}

export function createBrainConsciousnessMotionLayer(
  host: HTMLElement,
): BrainConsciousnessMotionLayer {
  const layer = document.createElement('div')
  layer.dataset.brainConsciousnessMotion = 'true'
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '4',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 420ms ease',
    contain: 'layout style paint',
  })
  const region = document.createElement('div')
  Object.assign(region.style, {
    position: 'absolute',
    left: '56%',
    top: '14%',
    width: 'min(30vw, 480px)',
    height: 'min(30vh, 320px)',
    overflow: 'hidden',
    border: '1px solid rgba(255, 36, 55, 0.42)',
    background: 'rgba(10, 0, 4, 0.08)',
    mixBlendMode: 'screen',
    contain: 'layout style paint',
  })
  const shapes = Array.from({ length: 3 }, (_, index) => {
    const shape = document.createElement('div')
    Object.assign(shape.style, {
      position: 'absolute',
      left: `${12 + index * 24}%`,
      top: `${14 + (index % 2) * 28}%`,
      width: `${32 - index * 4}%`,
      aspectRatio: '1',
      borderRadius: index === 1 ? '46% 54% 62% 38%' : '58% 42% 52% 48%',
      filter: 'blur(0.6px) saturate(1.4)',
      mixBlendMode: index === 2 ? 'difference' : 'screen',
      opacity: '0.42',
      willChange: 'transform, opacity',
    })
    region.appendChild(shape)
    return shape
  })
  const caption = document.createElement('div')
  caption.setAttribute('aria-live', 'polite')
  Object.assign(caption.style, {
    position: 'absolute',
    right: '18px',
    bottom: '18px',
    width: 'min(620px, 52vw)',
    padding: '9px 11px',
    color: '#ff233d',
    background: 'rgba(15, 0, 3, 0.78)',
    borderRight: '2px solid #ff233d',
    fontFamily: '"SFMono-Regular", "IBM Plex Mono", "Courier New", monospace',
    fontSize: 'clamp(10px, 0.72vw, 13px)',
    lineHeight: '1.4',
    letterSpacing: '0.025em',
    textAlign: 'right',
    textShadow: '0 0 7px rgba(255, 20, 50, 0.42)',
  })
  layer.append(region, caption)
  host.appendChild(layer)

  type MotionEntry = { candidate: ConsciousnessMotionCandidate; storyId: string }
  let queued: MotionEntry | null = null
  let active: MotionEntry | null = null
  let startedAt = 0
  let startedBeat = 0
  let lastFinishedAt = Number.NEGATIVE_INFINITY
  const usedPairs = new Set<string>()

  const hide = () => {
    layer.style.opacity = '0'
    layer.dataset.state = 'idle'
  }

  return {
    offer(candidate, storyId, now) {
      const key = `${storyId}:${candidate.memoryId}`
      if (queued || active || usedPairs.has(key) || now - lastFinishedAt < MOTION_COOLDOWN_MS) {
        return false
      }
      queued = { candidate, storyId }
      usedPairs.add(key)
      return true
    },
    update(rhythm, now, lowPowerMode) {
      let completedPauseMs = 0
      if (!active && queued && rhythm.active && rhythm.beat) {
        active = queued
        queued = null
        startedAt = now
        startedBeat = rhythm.beatIndex
        const colors = motionColors(active.candidate)
        shapes.forEach((shape, index) => {
          shape.style.display = lowPowerMode && index === 2 ? 'none' : 'block'
          shape.style.background = `radial-gradient(circle at 38% 42%, ${colors[index]}, transparent 68%)`
        })
        caption.textContent =
          `moto di coscienza: cosa ha cambiato Brain nelle storie, nelle forme e nei colori — ` +
          `storia: ${active.candidate.influenceText.slice(0, 170)}; ` +
          `forme: tre nuclei locali raccolti; colori: nuovi accenti dal ricordo ` +
          `«${active.candidate.title}» (${active.candidate.kind}).`
        layer.dataset.state = 'active'
        layer.style.opacity = '1'
      }
      if (!active) return { active: false, completedPauseMs }
      if (rhythm.active) {
        const pulse = Math.max(rhythm.beatPulse, rhythm.kickEnvelope)
        const localPhase = rhythm.beatPhase - 0.5
        shapes.forEach((shape, index) => {
          if (lowPowerMode && index === 2) return
          const direction = index % 2 === 0 ? 1 : -1
          const offset = direction * localPhase * (3 + pulse * 5)
          const scale = 1 + pulse * (0.025 + index * 0.008)
          shape.style.transform = `translate3d(${offset.toFixed(2)}px, ${(offset * 0.45).toFixed(2)}px, 0) scale(${scale.toFixed(3)})`
          shape.style.opacity = String(0.3 + pulse * 0.28)
        })
      }
      if (
        rhythm.active && rhythm.beat &&
        rhythm.beatIndex - startedBeat >= MOTION_BEATS &&
        now - startedAt >= MOTION_MIN_READ_MS
      ) {
        completedPauseMs = Math.max(0, now - startedAt)
        lastFinishedAt = now
        active = null
        hide()
      }
      return { active: active !== null, completedPauseMs }
    },
    pendingInfluence() {
      return active?.candidate ?? queued?.candidate ?? null
    },
    destroy() {
      queued = null
      active = null
      layer.remove()
    },
  }
}
