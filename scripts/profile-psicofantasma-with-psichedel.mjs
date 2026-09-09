#!/usr/bin/env node

/** Runs the complete repertoire descriptor/ranking pass in the same browser
 * process while the local Psichedel prototype is generating through WebGPU.
 */
const socketUrl = process.argv[2]
const startGeneration = process.argv.includes('--start')
if (!socketUrl?.startsWith('ws://127.0.0.1:')) {
  throw new Error('Pass the local Psichedel page WebSocket URL from Chrome DevTools')
}

const expression = `(async () => {
  const sleep = duration => new Promise(resolve => setTimeout(resolve, duration))
  const startGeneration = ${JSON.stringify(startGeneration)}
  const generationStarted = performance.now()
  if (startGeneration) {
    document.querySelector('#generate')?.click()
    const deadline = performance.now() + 30000
    while (document.body.dataset.phase !== 'generazione' && performance.now() < deadline) await sleep(25)
  }
  const phaseBefore = document.body.dataset.phase ?? null
  const stateBefore = document.querySelector('#state')?.textContent ?? null
  const heapBefore = performance.memory?.usedJSHeapSize ?? null
  const started = performance.now()
  const [repertoireModule, shapeModule, recognitionModule] = await Promise.all([
    import('/src/renderer/output/brain/psicofantasma/repertoire.ts'),
    import('/src/renderer/output/brain/psicofantasma/shape.ts'),
    import('/src/renderer/output/brain/psicofantasma/recognition.ts'),
  ])
  const response = await fetch('/psicofantasma/repertoire.json')
  if (!response.ok) throw new Error('repertoire HTTP ' + response.status)
  const repertoire = repertoireModule.loadPsicoFantasmaRepertoire(await response.json())
  const loadedAt = performance.now()
  const descriptors = repertoire.silhouettes.map(item => shapeModule.describeSilhouette(item.rings))
  const describedAt = performance.now()
  const ranked = descriptors.map(descriptor => recognitionModule.rankPsicoFantasma(descriptor, repertoire))
  const finished = performance.now()
  if (startGeneration) {
    const deadline = performance.now() + 90000
    while (!['completato', 'errore', 'annullato'].includes(document.body.dataset.phase) && performance.now() < deadline) {
      await sleep(100)
    }
  }
  return JSON.stringify({
    phaseBefore,
    stateBefore,
    phaseAfter: document.body.dataset.phase ?? null,
    stateAfter: document.querySelector('#state')?.textContent ?? null,
    silhouettes: repertoire.silhouettes.length,
    loadMs: loadedAt - started,
    descriptorMs: describedAt - loadedAt,
    rankingMs: finished - describedAt,
    totalMs: finished - started,
    heapBefore,
    heapAfter: performance.memory?.usedJSHeapSize ?? null,
    candidates: ranked.filter(item => item.candidate).length,
    generationWallMs: startGeneration ? performance.now() - generationStarted : null,
  })
})()`

const socket = new WebSocket(socketUrl)
const response = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Chrome DevTools timeout')), startGeneration ? 125_000 : 30_000)
  socket.onerror = () => reject(new Error('Chrome DevTools connection failed'))
  socket.onopen = () => socket.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression, awaitPromise: true, returnByValue: true },
  }))
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id !== 1) return
    clearTimeout(timeout)
    if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.text))
    else resolve(message.result?.result?.value)
  }
})
socket.close()
console.log(response)
