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
  // I 120 secondi sono una finestra di refill, non una pausa da sommare alla
  // produzione. Dopo 30 secondi di riposo restano 90 secondi per preparare il
  // buffer successivo mantenendo cooldown e backoff fra le inferenze.
  nextStoryTargetMs: 120_000,
  nextStoryRefillLeadMs: 90_000,
  // Con tutti i renderer sulla stessa storia il primo attraversamento resta
  // libero da generazione. Il refill ha poi due attraversamenti di margine.
  storyCycleNextStoryTargetMs: 240_000,
  storyCycleRefillLeadMs: 210_000,
  storyCycleRefillTransitionGuardMs: 10_000,
  nextStoryHardDeadlineMs: 180_000,
  // Esperimento MACRO-009: evita di ricreare text encoder, UNet e VAE a ogni
  // storia. In low power il rilascio resta obbligatorio.
  retainImageModelBetweenStories: true,
  // Breve assestamento dopo il rilascio delle sessioni immagini: impedisce
  // che il modello narrativo venga creato mentre WebGPU sta ancora liberando
  // gli allocator della storia precedente.
  interStoryGpuHandoffMs: 500,
  // Pausa fra singole inferenze della stessa storia. I gap RAF osservati
  // possono estenderla dinamicamente nello scheduler termico.
  imageInferenceCooldownMs: 6_000,
  lowPowerImageInferenceCooldownMs: 12_000,
  imageInferenceLongFrameThresholdMs: 240,
  imageInferenceSevereFrameThresholdMs: 1_000,
  imageInferenceLongFrameBackoffMs: 9_000,
  imageInferenceSevereFrameBackoffMs: 20_000,
  // Esperimento MACRO-009: il modello dichiara batch dinamico. Il ramo
  // condizionale singolo dimezza il batch UNet senza cambiare seed/step/shape.
  imageGuidanceMode: 'single-conditional' as const,
  // Fallback PIANO-010: dopo un gap RAF reale il Renderer Host rallenta
  // brevemente il plugin. La sola inferenza nel Worker non lo attiva più.
  lightweightDenoisingRender: true,
  denoisingPassthroughWidth: 320,
  denoisingPassthroughHeight: 180,
  denoisingPassthroughFps: 20,
  lowPowerDenoisingPassthroughFps: 15,
  denoisingPassthroughPluginFps: 5,
  lowPowerDenoisingPassthroughPluginFps: 3,
  denoisingPassthroughCrossfadeMs: 220,
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
