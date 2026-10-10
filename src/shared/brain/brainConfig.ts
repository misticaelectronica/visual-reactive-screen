export const BRAIN_CONFIG = {
  pipelineRevision: 'qwen25-snic-contours-v89',
  // Righe per finestra, non parole: una riga della base curata può essere una
  // frase breve o un paragrafo da 130 parole, e questo conteggio non distingue
  // i due casi. Vale quindi solo per basi scritte a righe brevi, che è la
  // forma d'uso normale (una frase per riga, vedi config/README.md).
  //
  // Provato a 1-2 il 2026-10-08 su una base scritta a 5 paragrafi da ~115
  // parole, e **ritirato lo stesso giorno**: su una base a righe brevi (39
  // righe da 7-39 parole, media 21) una finestra di 1-2 righe dà 21-42 parole
  // di sorgente, mentre la sinossi richiesta è di 55-80 — il modello deve
  // inventare più di metà della storia, e il risultato è riempitivo generico.
  // Due effetti collaterali misurati sulla stessa base: le righe che fanno
  // scattare `containsExplicitAdultContent` sono 2 su 39, quindi la quota di
  // storie che conservano il contenuto esplicito scende dal 20% al 5-10%; e
  // nei giri di `sessionSynthesis` la finestra scende a 1 riga contro 3 memo.
  // Il difetto misurato sulle basi a paragrafi resta reale — lì la finestra
  // vale ~470 parole, compresse ~6:1 — ma non si corregge con questi due
  // numeri, che sono globali: serve una finestra misurata in parole.
  phraseSampleMinCount: 4,
  phraseSampleMaxCount: 5,
  // Righe condivise fra due finestre consecutive della base curata (vedi
  // brainPhrases.ts:sampleBrainPhraseWindow). Valore alto = più continuità
  // ma rischio di storie ridondanti; da confrontare all'ascolto con 1.
  // Lasciato a 2 di proposito: `sampleBrainPhraseWindow` lo tronca già a
  // `requested - 1`, quindi con finestre di 1-2 righe l'overlap effettivo è
  // 0 o 1 e abbassare il valore qui non cambierebbe nulla. Torna a contare
  // se i conteggi sopra risalgono a 3 o più.
  phraseWindowOverlapCount: 2,
  // Capacità della memoria lunga del sogno, dell'ordine di un giro completo
  // del cursore sulla base curata. Il calcolo originale valeva per una base
  // di ~35 righe con passo ~2-3 → ~14 storie. Con i conteggi sopra il passo
  // è 1, quindi un giro completo vale ora tante storie quante sono le righe
  // del pool: su una base a paragrafi (poche righe lunghe) 14 voci coprono
  // più giri e il memo di sintesi può riproporre materiale già usato.
  // Valore non ritarato: dipende dalla base in uso, non dal codice.
  dreamMemoryBufferCapacity: 14,
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
  // produzione. Segnalato dal Capo Supremo 2026-09-14: il riciclo dei
  // fotogrammi della storia precedente (`recycleCurrentStoryFrame`) scattava
  // troppo spesso — la nuova storia non faceva in tempo a essere pronta
  // prima che quella corrente finisse. Il margine di generazione è stato
  // allargato, ma il riposo della GPU fra una storia e l'inizio della
  // successiva non deve scendere sotto i 25 secondi (limite esplicito del
  // Capo Supremo) — 25s di riposo restano, invece di 30, per dare un po'
  // più di tempo al denoising senza sacrificare il riposo termico.
  nextStoryTargetMs: 120_000,
  nextStoryRefillLeadMs: 95_000,
  // Con tutti i renderer sulla stessa storia il primo attraversamento resta
  // libero da generazione. Il refill ha poi due attraversamenti di margine.
  // Stesso limite di riposo massimo 25s di `nextStoryRefillLeadMs` sopra.
  storyCycleNextStoryTargetMs: 240_000,
  storyCycleRefillLeadMs: 215_000,
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
  imageInferenceCooldownMs: 9_000,
  lowPowerImageInferenceCooldownMs: 12_000,
  imageInferenceLongFrameThresholdMs: 240,
  imageInferenceSevereFrameThresholdMs: 1_000,
  imageInferenceLongFrameBackoffMs: 9_000,
  imageInferenceSevereFrameBackoffMs: 20_000,
  offlineGenerationEnabled: true,
  offlineWindowMaxMs: 120_000,
  gpuYieldBetweenSubmits: true,
  gpuYieldMs: 4,
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
