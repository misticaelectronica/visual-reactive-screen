export type MorphingSpatialBias =
  | 'centered'
  | 'peripheral'
  | 'lateral'
  | 'upperSymmetric'
  | 'distributed'
  | 'edgeWeighted'
  | 'fieldWide'
  | 'diagonal'
  | 'fragmented'

export type MorphingSymmetry =
  | 'none'
  | 'weak'
  | 'bilateralWeak'
  | 'radialWeak'
  | 'brokenSymmetry'
  | 'repeatedWeak'

export type MorphingDensity =
  | 'diffuse'
  | 'clustered'
  | 'fragmented'
  | 'membrane'
  | 'field'
  | 'particulate'
  | 'residual'
  | 'streaked'

export type MorphingMotion =
  | 'drift'
  | 'contraction'
  | 'expansion'
  | 'oscillation'
  | 'biological'
  | 'mechanical'
  | 'peripheralFade'
  | 'afterimage'
  | 'signalPulse'

export type MorphingClosure =
  | 'open'
  | 'incomplete'
  | 'suggested'
  | 'broken'
  | 'neverClosed'

export type MorphingEdgeBehavior =
  | 'noEdges'
  | 'impliedEdges'
  | 'brokenContours'
  | 'dissolvedContours'
  | 'peripheralDissolve'

export interface MorphingThemeProfile {
  presetId: string
  guideFigure: string
  perceptualReference: string
  perceptualPrinciple: string
  renderingIntent: string
  literatureReference?: string
  spatialBias: MorphingSpatialBias
  symmetry: MorphingSymmetry
  density: MorphingDensity
  motion: MorphingMotion
  closure: MorphingClosure
  edgeBehavior: MorphingEdgeBehavior
}

export const FALLBACK_THEME_PROFILE: MorphingThemeProfile = {
  presetId: 'fallback',
  guideFigure: 'nube indifferenziata distribuita',
  perceptualReference: 'blank field',
  perceptualPrinciple: 'omogeneità di campo stimolante',
  renderingIntent: 'distribuire velature in modo asimmetrico e continuo senza centri d’ordine',
  spatialBias: 'distributed',
  symmetry: 'none',
  density: 'diffuse',
  motion: 'drift',
  closure: 'open',
  edgeBehavior: 'noEdges',
}

export const MORPHING_THEME_PROFILES: Record<string, MorphingThemeProfile> = {
  'ritual-drift': {
    presetId: 'ritual-drift',
    guideFigure: 'deriva sciamanica lenta / traccia fluida rituale',
    perceptualReference: 'indetermined movement detection',
    perceptualPrinciple: 'cattura visiva tramite deriva fluida a bassa frequenza',
    renderingIntent: 'disporre velature sparse e libere in lento transito continuo',
    spatialBias: 'distributed',
    symmetry: 'none',
    density: 'diffuse',
    motion: 'drift',
    closure: 'open',
    edgeBehavior: 'noEdges',
  },
  'dream-plasma': {
    presetId: 'dream-plasma',
    guideFigure: 'quasi-volto / nube luminosa instabile / aurora ambigua',
    perceptualReference: 'face pareidolia',
    perceptualPrinciple: 'riconoscimento illusorio di volti in configurazioni ambigue',
    renderingIntent: 'creare due addensamenti superiori debolmente simmetrici e una zona inferiore più scura, senza mai chiudere un volto leggibile',
    literatureReference: 'face pareidolia; coinvolgimento di aree occipito-temporali selettive per i volti',
    spatialBias: 'upperSymmetric',
    symmetry: 'bilateralWeak',
    density: 'diffuse',
    motion: 'drift',
    closure: 'neverClosed',
    edgeBehavior: 'noEdges',
  },
  'submerged-organism': {
    presetId: 'submerged-organism',
    guideFigure: 'organismo acquatico incompleto / membrana biologica sommersa',
    perceptualReference: 'biological motion / point-light biological motion',
    perceptualPrinciple: 'il cervello riconosce vitalità e movimento organico anche da segnali minimi e frammentari',
    renderingIntent: 'produrre contrazioni asincrone, derive morbide e movimenti non meccanici, senza creare un animale riconoscibile',
    literatureReference: 'Johansson; biological motion perception; point-light displays',
    spatialBias: 'distributed',
    symmetry: 'none',
    density: 'membrane',
    motion: 'biological',
    closure: 'incomplete',
    edgeBehavior: 'dissolvedContours',
  },
  'industrial-ectoplasm': {
    presetId: 'industrial-ectoplasm',
    guideFigure: 'fumo metallico / residuo energetico industriale / bordo incompleto',
    perceptualReference: 'Kanizsa illusory contours',
    perceptualPrinciple: 'completamento percettivo di contorni assenti o incompleti',
    renderingIntent: 'distribuire addensamenti separati che suggeriscono un bordo o una fenditura, senza disegnarli davvero',
    literatureReference: 'illusory contours; Kanizsa figures; perceptual completion',
    spatialBias: 'fragmented',
    symmetry: 'brokenSymmetry',
    density: 'fragmented',
    motion: 'drift',
    closure: 'suggested',
    edgeBehavior: 'impliedEdges',
  },
  'slow-lysergic-field': {
    presetId: 'slow-lysergic-field',
    guideFigure: 'campo cromatico da occhi chiusi / macchia allucinatoria lenta',
    perceptualReference: 'Ganzfeld effect',
    perceptualPrinciple: 'riduzione dei riferimenti visivi stabili e comparsa di campi percettivi indeterminati',
    renderingIntent: 'usare grandi campi morbidi quasi uniformi, variazioni lente di luminosità e assenza di contorni netti',
    literatureReference: 'Ganzfeld effect; visual field homogenization',
    spatialBias: 'fieldWide',
    symmetry: 'none',
    density: 'field',
    motion: 'drift',
    closure: 'open',
    edgeBehavior: 'noEdges',
  },
  'blacklight-pollen': {
    presetId: 'blacklight-pollen',
    guideFigure: 'pulviscolo ultravioletto periferico / micro-addensamenti sospesi',
    perceptualReference: 'scintillating grid / peripheral visual instability',
    perceptualPrinciple: 'instabilità percettiva periferica generata da piccoli contrasti e micro-presenze',
    renderingIntent: 'creare piccoli addensamenti morbidi ai margini del campo visivo, evitando glitter, stelle o particelle troppo nette',
    literatureReference: 'scintillating grid illusion; peripheral contrast interactions',
    spatialBias: 'peripheral',
    symmetry: 'none',
    density: 'particulate',
    motion: 'oscillation',
    closure: 'open',
    edgeBehavior: 'peripheralDissolve',
  },
  'molten-memory': {
    presetId: 'molten-memory',
    guideFigure: 'impronta fusa / ricordo liquido / colatura mentale',
    perceptualReference: 'visual persistence / iconic memory',
    perceptualPrinciple: 'permanenza temporanea di una traccia visiva dopo lo stimolo',
    renderingIntent: 'usare scie lente, dissolvenze e persistenza morbida, come se la forma fosse una memoria che si riscrive',
    literatureReference: 'iconic memory; visual persistence',
    spatialBias: 'distributed',
    symmetry: 'none',
    density: 'residual',
    motion: 'afterimage',
    closure: 'incomplete',
    edgeBehavior: 'dissolvedContours',
  },
  'ritual-afterimage': {
    presetId: 'ritual-afterimage',
    guideFigure: 'post-immagine retinica / alone fantasma / traccia residua',
    perceptualReference: 'negative afterimage / positive afterimage',
    perceptualPrinciple: 'permanenza o inversione percettiva dopo esposizione luminosa',
    renderingIntent: 'produrre aloni residui e schiarite morbide che sembrano restare dopo un evento, senza flash pieno schermo',
    literatureReference: 'visual afterimage; retinal/cortical adaptation',
    spatialBias: 'fieldWide',
    symmetry: 'weak',
    density: 'residual',
    motion: 'afterimage',
    closure: 'open',
    edgeBehavior: 'noEdges',
  },
  'spectral-membrane': {
    presetId: 'spectral-membrane',
    guideFigure: 'velo elastico / membrana incompleta / superficie percettiva instabile',
    perceptualReference: 'perceptual filling-in',
    perceptualPrinciple: 'completamento di superfici o campi visivi mancanti a partire da informazioni parziali',
    renderingIntent: 'creare superfici velate, interrotte e incomplete che il cervello tenta di rendere continue',
    literatureReference: 'perceptual filling-in; surface completion',
    spatialBias: 'distributed',
    symmetry: 'weak',
    density: 'membrane',
    motion: 'oscillation',
    closure: 'incomplete',
    edgeBehavior: 'dissolvedContours',
  },
  'nocturnal-bloom': {
    presetId: 'nocturnal-bloom',
    guideFigure: 'fioritura astratta nel buio / corolla non letterale',
    perceptualReference: 'Troxler fading',
    perceptualPrinciple: 'dissoluzione percettiva di stimoli periferici o stabili durante fissazione prolungata',
    renderingIntent: 'far emergere e dissolvere lentamente forme periferiche, come aperture vegetali non dichiarate',
    literatureReference: 'Troxler fading; peripheral fading',
    spatialBias: 'peripheral',
    symmetry: 'radialWeak',
    density: 'diffuse',
    motion: 'expansion',
    closure: 'suggested',
    edgeBehavior: 'peripheralDissolve',
  },
  'machine-hallucination': {
    presetId: 'machine-hallucination',
    guideFigure: 'quasi-pattern meccanico degradato / struttura industriale non risolta',
    perceptualReference: 'pattern completion',
    perceptualPrinciple: 'tendenza a completare strutture regolari anche quando sono frammentate o degradate',
    renderingIntent: 'suggerire griglie, macchine, ingranaggi o ripetizioni industriali senza renderle riconoscibili',
    literatureReference: 'pattern completion; Gestalt closure',
    spatialBias: 'fragmented',
    symmetry: 'repeatedWeak',
    density: 'fragmented',
    motion: 'mechanical',
    closure: 'broken',
    edgeBehavior: 'impliedEdges',
  },
  'imaginary-friend': {
    presetId: 'imaginary-friend',
    guideFigure: 'presenza laterale non identificata / quasi-sagoma affettiva',
    perceptualReference: 'feeling of presence / sensed presence',
    perceptualPrinciple: 'percezione di una presenza in assenza di una figura chiaramente visibile',
    renderingIntent: 'collocare una massa laterale morbida e instabile che sembra accompagnare lo sguardo senza diventare persona',
    literatureReference: 'sensed presence; body schema and presence perception',
    spatialBias: 'lateral',
    symmetry: 'none',
    density: 'clustered',
    motion: 'drift',
    closure: 'suggested',
    edgeBehavior: 'dissolvedContours',
  },
  'alien-contact': {
    presetId: 'alien-contact',
    guideFigure: 'segnale simmetrico non decifrabile / geometria molle non umana',
    perceptualReference: 'symmetry detection / apophenia',
    perceptualPrinciple: 'rilevamento di ordine, simmetria o significato in pattern ambigui',
    renderingIntent: 'creare simmetrie incomplete, ripetizioni deboli e campi luminosi che sembrano comunicare senza diventare simboli leggibili',
    literatureReference: 'symmetry perception; apophenia; pattern detection',
    spatialBias: 'distributed',
    symmetry: 'brokenSymmetry',
    density: 'clustered',
    motion: 'signalPulse',
    closure: 'suggested',
    edgeBehavior: 'dissolvedContours',
  },
}

export function getThemeProfileForPreset(presetId: string): MorphingThemeProfile {
  return MORPHING_THEME_PROFILES[presetId] || FALLBACK_THEME_PROFILE
}
