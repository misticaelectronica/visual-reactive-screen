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

export type BrainConsciousnessMotionImageSource = {
  id: string
  raster: Blob
}

export type BrainConsciousnessMotionLayer = {
  offer: (candidate: ConsciousnessMotionCandidate, storyId: string, now: number) => boolean
  update: (
    rhythm: BrainRhythmState,
    now: number,
    lowPowerMode: boolean,
  ) => { active: boolean; completedPauseMs: number }
  setImageSources: (
    sources: readonly BrainConsciousnessMotionImageSource[],
    currentImageId: string,
  ) => void
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
    mixBlendMode: 'normal',
    contain: 'layout style paint',
  })
  const embeddedImage = document.createElement('img')
  embeddedImage.dataset.brainConsciousnessImage = 'true'
  embeddedImage.alt = ''
  Object.assign(embeddedImage.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: '0.82',
    filter: 'contrast(1.08) saturate(1.12)',
    willChange: 'filter, opacity',
  })
  region.appendChild(embeddedImage)
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
  let imageSources: BrainConsciousnessMotionImageSource[] = []
  let currentImageId = ''
  let activeImageUrl: string | null = null

  const revokeActiveImage = () => {
    if (activeImageUrl) URL.revokeObjectURL(activeImageUrl)
    activeImageUrl = null
    embeddedImage.removeAttribute('src')
    delete embeddedImage.dataset.sourceId
  }

  const showAlternateImage = (entry: MotionEntry) => {
    const alternatives = imageSources.filter((source) => source.id !== currentImageId)
    if (alternatives.length === 0) {
      revokeActiveImage()
      region.style.display = 'none'
      return
    }
    const selected = alternatives[
      hash(`${entry.storyId}:${entry.candidate.memoryId}`) % alternatives.length
    ]
    revokeActiveImage()
    activeImageUrl = URL.createObjectURL(selected.raster)
    embeddedImage.src = activeImageUrl
    embeddedImage.dataset.sourceId = selected.id
    region.style.display = 'block'
  }

  const hide = () => {
    layer.style.opacity = '0'
    layer.dataset.state = 'idle'
  }

  return {
    setImageSources(sources, activeImageId) {
      imageSources = [...sources]
      currentImageId = activeImageId
    },
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
        showAlternateImage(active)
        caption.textContent =
          `moto di coscienza: cosa ha cambiato Brain nelle storie, nelle forme e nei colori — ` +
          `storia: ${active.candidate.influenceText.slice(0, 170)}; ` +
          `forme: un'altra immagine attiva riaffiora nel riquadro; ` +
          `colori: nuovi accenti dal ricordo ` +
          `«${active.candidate.title}» (${active.candidate.kind}).`
        layer.dataset.state = 'active'
        layer.style.opacity = '1'
      }
      if (!active) return { active: false, completedPauseMs }
      if (rhythm.active) {
        const pulse = Math.max(rhythm.beatPulse, rhythm.kickEnvelope)
        const high = rhythm.bandTransients.high
        const mid = rhythm.bandTransients.mid
        embeddedImage.style.filter = [
          `contrast(${(1.08 + mid * 0.28 + pulse * 0.1).toFixed(3)})`,
          `saturate(${(1.12 + high * 0.42 + pulse * 0.16).toFixed(3)})`,
        ].join(' ')
        embeddedImage.style.opacity = String(
          lowPowerMode ? 0.74 + pulse * 0.08 : 0.78 + pulse * 0.14,
        )
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
      revokeActiveImage()
      layer.remove()
    },
  }
}
