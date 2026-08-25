export type Sd15SchedulerStep = {
  timestep: number
  sigma: number
  nextSigma: number
}

export type Sd15SchedulerOptions = {
  betaStart?: number
  betaEnd?: number
  trainTimesteps?: number
}

export function createSd15EulerSchedule(
  inferenceSteps: number,
  options: Sd15SchedulerOptions = {},
): Sd15SchedulerStep[] {
  if (!Number.isInteger(inferenceSteps) || inferenceSteps < 1) {
    throw new Error('Il numero di step deve essere un intero positivo')
  }
  const trainTimesteps = options.trainTimesteps ?? 1_000
  const betaStart = options.betaStart ?? 0.00085
  const betaEnd = options.betaEnd ?? 0.012
  const start = Math.sqrt(betaStart)
  const end = Math.sqrt(betaEnd)
  let alphaProduct = 1
  const sigmas = new Float64Array(trainTimesteps)

  for (let index = 0; index < trainTimesteps; index += 1) {
    const ratio = index / Math.max(1, trainTimesteps - 1)
    const beta = (start + (end - start) * ratio) ** 2
    alphaProduct *= 1 - beta
    sigmas[index] = Math.sqrt((1 - alphaProduct) / alphaProduct)
  }

  const sigmaAt = (timestep: number): number => {
    const lower = Math.max(0, Math.min(trainTimesteps - 1, Math.floor(timestep)))
    const upper = Math.min(trainTimesteps - 1, lower + 1)
    const fraction = timestep - lower
    return sigmas[lower] + (sigmas[upper] - sigmas[lower]) * fraction
  }

  const schedule: Sd15SchedulerStep[] = []
  for (let index = 0; index < inferenceSteps; index += 1) {
    const timestep = inferenceSteps === 1
      ? trainTimesteps - 1
      : (trainTimesteps - 1) * (1 - index / (inferenceSteps - 1))
    const nextTimestep = index === inferenceSteps - 1
      ? -1
      : (trainTimesteps - 1) * (1 - (index + 1) / (inferenceSteps - 1))
    schedule.push({
      timestep,
      sigma: sigmaAt(timestep),
      nextSigma: nextTimestep < 0 ? 0 : sigmaAt(nextTimestep),
    })
  }
  return schedule
}

export function eulerStep(
  latents: Float32Array,
  noisePrediction: Float32Array,
  sigma: number,
  nextSigma: number,
): Float32Array {
  if (latents.length !== noisePrediction.length) {
    throw new Error('Latenti e predizione rumore hanno dimensioni diverse')
  }
  const result = new Float32Array(latents.length)
  const delta = nextSigma - sigma
  for (let index = 0; index < latents.length; index += 1) {
    result[index] = latents[index] + noisePrediction[index] * delta
  }
  return result
}

export function classifierFreeGuidance(
  noise: Float32Array,
  guidanceScale: number,
): Float32Array {
  if (noise.length % 2 !== 0) {
    throw new Error('La predizione CFG deve contenere due batch equivalenti')
  }
  const size = noise.length / 2
  const guided = new Float32Array(size)
  for (let index = 0; index < size; index += 1) {
    const unconditional = noise[index]
    const conditional = noise[size + index]
    guided[index] = unconditional + guidanceScale * (conditional - unconditional)
  }
  return guided
}
