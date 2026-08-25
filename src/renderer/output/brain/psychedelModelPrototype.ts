import { PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE } from '@shared/brain/imageModelManifest'
import { Sd15OnnxWebGpuRuntime } from './sd15OnnxWebGpu'

const modelElement = document.querySelector<HTMLDivElement>('#model')
const promptElement = document.querySelector<HTMLTextAreaElement>('#prompt')
const seedElement = document.querySelector<HTMLInputElement>('#seed')
const generateElement = document.querySelector<HTMLButtonElement>('#generate')
const cancelElement = document.querySelector<HTMLButtonElement>('#cancel')
const stateElement = document.querySelector<HTMLDivElement>('#state')
const outputElement = document.querySelector<HTMLImageElement>('#output')

if (
  !modelElement
  || !promptElement
  || !seedElement
  || !generateElement
  || !cancelElement
  || !stateElement
  || !outputElement
) {
  throw new Error('Interfaccia del prototipo incompleta')
}

modelElement.textContent = [
  `MODELLO: ${PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.name}`,
  `SORGENTE: ${PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.sourceRepository}`,
  'RUNTIME: ONNX Runtime Web / WebGPU',
  'SAFETY CHECKER: assente',
].join('\n')
modelElement.style.whiteSpace = 'pre-line'

const runtime = new Sd15OnnxWebGpuRuntime(
  PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE,
  '/prototype-models/pornmaster-sd15-onnx',
)
let abortController: AbortController | null = null
let outputUrl: string | null = null

function setState(phase: string, message: string): void {
  document.body.dataset.phase = phase
  stateElement!.textContent = message
}

generateElement.addEventListener('click', async () => {
  abortController?.abort()
  abortController = new AbortController()
  generateElement.disabled = true
  try {
    const blob = await runtime.generate({
      prompt: promptElement.value,
      seed: Number(seedElement.value) || 0,
      signal: abortController.signal,
      onProgress: (progress) => {
        setState(progress.phase, [
          progress.phase.toLocaleUpperCase(),
          progress.message,
          progress.pct === undefined ? '' : `${progress.pct}%`,
          progress.source ?? '',
        ].filter(Boolean).join(' // '))
      },
    })
    if (outputUrl) URL.revokeObjectURL(outputUrl)
    outputUrl = URL.createObjectURL(blob)
    outputElement.src = outputUrl
  } catch (error) {
    const cancelled = error instanceof DOMException && error.name === 'AbortError'
    setState(
      cancelled ? 'annullato' : 'errore',
      cancelled
        ? 'ANNULLATO'
        : `ERRORE // ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    generateElement.disabled = false
  }
})

cancelElement.addEventListener('click', () => abortController?.abort())

window.addEventListener('beforeunload', () => {
  abortController?.abort()
  if (outputUrl) URL.revokeObjectURL(outputUrl)
  void runtime.release()
})

if (new URLSearchParams(window.location.search).get('autorun') === '1') {
  generateElement.click()
}
