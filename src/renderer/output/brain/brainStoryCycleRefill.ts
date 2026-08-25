import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainRendererMode } from '@shared/types'
import { calculateNextImageBufferRefillWindow } from './brainImageBuffer'

export function calculateNextStoryRefillWindowForMode(
  completedAt: number,
  mode: BrainRendererMode,
): { startsAt: number; targetAt: number } {
  const targetMs = mode === 'story-cycle'
    ? BRAIN_CONFIG.storyCycleNextStoryTargetMs
    : BRAIN_CONFIG.nextStoryTargetMs
  const leadMs = mode === 'story-cycle'
    ? BRAIN_CONFIG.storyCycleRefillLeadMs
    : BRAIN_CONFIG.nextStoryRefillLeadMs
  return calculateNextImageBufferRefillWindow(
    completedAt,
    targetMs,
    leadMs,
  )
}
