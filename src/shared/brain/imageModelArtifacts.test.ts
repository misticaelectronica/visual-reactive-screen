import { existsSync } from 'node:fs'
import path from 'node:path'
import { InferenceSession } from 'onnxruntime-node'
import { describe, expect, it } from 'vitest'
import { PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE } from './imageModelManifest'

/**
 * Collaudo di integrità dei pesi ONNX locali del checkpoint attivo. Non
 * verifica la qualità visiva (serve WebGPU per quella), ma intercetta il
 * guasto più comune di una conversione fp16: un grafo con nodi che
 * dichiarano un tipo diverso da quello effettivo, che `onnxruntime` rifiuta
 * di caricare (e quindi la generazione non parte in silenzio).
 *
 * Richiede gli artefatti locali in `.model-artifacts/`; se assenti (es. CI
 * senza pesi scaricati) il collaudo viene saltato invece di fallire.
 */
const artifactsRoot = path.resolve(__dirname, '../../../.model-artifacts')

const localComponents = PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.files.filter(
  (file) => !file.url,
)

describe('integrità pesi ONNX locali del modello immagini attivo', () => {
  for (const file of localComponents) {
    const modelPath = path.join(
      artifactsRoot,
      PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.repository.split('/').pop()!,
      file.path,
    )
    const available = existsSync(modelPath)

    it.skipIf(!available)(
      `${file.component} carica senza errori di tipo (${file.path})`,
      async () => {
        const session = await InferenceSession.create(modelPath, {
          executionProviders: ['cpu'],
        })
        expect(session.inputNames.length).toBeGreaterThan(0)
        expect(session.outputNames.length).toBeGreaterThan(0)
        await session.release()
      },
      60_000,
    )

    if (!available) {
      it.skip(`${file.component}: artefatto assente in .model-artifacts, collaudo saltato`, () => {})
    }
  }
})
