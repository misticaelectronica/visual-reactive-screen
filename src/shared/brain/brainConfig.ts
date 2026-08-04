export const BRAIN_CONFIG = {
  pipelineRevision: 'qwen25-snic-contours-v89',
  phraseSampleMinCount: 4,
  phraseSampleMaxCount: 5,
  phraseMemoryCount: 12,
  storyMemoryCount: 6,
  storyQueueTarget: 1,
  sessionSynthesisMinStories: 3,
  sessionSynthesisMaxStories: 5,
  // Compatibilità del vecchio formato testuale F1..F4.
  storyFrameMin: 4,
  storyFrameMax: 4,
  // Quattro fotogrammi mantengono una storia leggibile; due posizioni
  // casuali dal secondo in poi usano il profilo rapido.
  renderFrameCount: 4,
  storyMaxNewTokens: 140,
  sceneMaxNewTokens: 220,
  storyMinNewTokens: 60,
  sceneMinNewTokens: 24,
  generationTimeoutMs: 60_000,
  storyModelId: 'onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX',
  storyFallbackModelId: 'onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX',
  memoModelId: 'onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX',
  visualModelId: 'onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX',
  inputTranslationModelId: 'onnx-community/opus-mt-it-en',
  uiTranslationModelId: 'Xenova/opus-mt-en-it',
  translationModelDtype: 'q4' as const,
  imageModelId: 'pornmaster-sd15-explicit-onnx-fp16' as const,
  highQualityImageModelId: 'pornmaster-sd15-explicit-onnx-fp16' as const,
  // Mantiene l'URL già usato dal collaudo per riutilizzare gli stessi 2,02 GiB
  // presenti in Cache Storage senza creare una seconda copia.
  imageModelBaseUrl: '/prototype-models/pornmaster-sd15-onnx',
  // `pnpm start` carica l'interfaccia da file://: il protocollo Electron
  // espone gli stessi artefatti persistenti senza copiarli nel compilato.
  imageModelLocalBaseUrl: 'brain-model://local/pornmaster-sd15-onnx',
  imageGenerationTimeoutMs: 120_000,
  nextStoryTargetMs: 120_000,
  nextStoryHardDeadlineMs: 180_000,
  // Breve assestamento dopo il rilascio delle sessioni immagini: impedisce
  // che il modello narrativo venga creato mentre WebGPU sta ancora liberando
  // gli allocator della storia precedente.
  interStoryGpuHandoffMs: 500,
  imageCapabilityTimeoutMs: 12_000,
  imageModelLoadTimeoutMs: 20 * 60_000,
  retryInitialDelayMs: 2_000,
  retryMaximumDelayMs: 60_000,
  vectorMaxSourceBytes: 12 * 1024 * 1024,
  modelDtype: 'q4' as const,
  webGpuModelDtype: 'q4' as const,
  aiEnabled: true,
  statusOpacity: 0.28,
} as const
