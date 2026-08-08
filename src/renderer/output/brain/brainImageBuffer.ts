export function isCompleteBrainImageBuffer(
  sceneCount: number,
  expectedSize: number,
): boolean {
  return sceneCount === expectedSize
}

export interface BrainImageBufferRefillWindow {
  startsAt: number
  targetAt: number
}

export function calculateNextImageBufferRefillWindow(
  productionCompletedAt: number,
  targetMs: number,
  refillLeadMs: number,
): BrainImageBufferRefillWindow {
  const safeTargetMs = Math.max(0, targetMs)
  const safeLeadMs = Math.min(
    safeTargetMs,
    Math.max(0, refillLeadMs),
  )
  return {
    startsAt: productionCompletedAt + safeTargetMs - safeLeadMs,
    targetAt: productionCompletedAt + safeTargetMs,
  }
}

export function shouldActivateProgressiveImageBuffer(
  hasCurrentCompleteBuffer: boolean,
): boolean {
  return !hasCurrentCompleteBuffer
}
