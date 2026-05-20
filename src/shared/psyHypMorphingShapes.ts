export type PsyHypShapeId =
  | 'disco'
  | 'onda'
  | 'spirale'
  | 'portale'
  | 'ingranaggio'
  | 'torre'
  | 'griglia'
  | 'globo'
  | 'sole'
  | 'fiamma'
  | 'libro'
  | 'seme'
  | 'radice'
  | 'sentiero'
  | 'strumento'
  | 'mano'
  | 'occhio'
  | 'nebbia'
  | 'capsula'
  | 'condotto'
  | 'blocco'
  | 'triangolo'
  | 'frattura'
  | 'luna'

export type PsyHypDrawProfile = {
  kind:
    | 'radial'
    | 'waveField'
    | 'spiral'
    | 'aperture'
    | 'mechanical'
    | 'verticalMass'
    | 'grid'
    | 'orbitalBody'
    | 'radiant'
    | 'flame'
    | 'openSurface'
    | 'organicCore'
    | 'branching'
    | 'path'
    | 'primitiveTool'
    | 'bodyTrace'
    | 'eyeLike'
    | 'fogField'
    | 'capsule'
    | 'conduit'
    | 'mass'
    | 'angular'
    | 'fracture'
    | 'lunar'
  baseGeometry:
    | 'incompleteCircle'
    | 'layeredWave'
    | 'incompleteEllipticSpiral'
    | 'unstablePortal'
    | 'brokenGear'
    | 'towerEmission'
    | 'brokenGrid'
    | 'sphereWithOrbits'
    | 'partialSun'
    | 'verticalGlow'
    | 'abstractBook'
    | 'seedCore'
    | 'rootNetwork'
    | 'disappearingPath'
    | 'obliqueFragment'
    | 'partialHandPrint'
    | 'ambiguousOval'
    | 'layeredMist'
    | 'suspendedMembrane'
    | 'longitudinalChannel'
    | 'erodedBlock'
    | 'brokenTriangle'
    | 'luminousCrack'
    | 'dissolvedMoon'
  closure: number
  edgeNoise: 'low' | 'medium' | 'high'
  rotationBias: 'veryLow' | 'low' | 'medium' | 'high'
  centerStability: 'veryLow' | 'low' | 'medium' | 'high'
  strokeAllowed: boolean
  fillAllowed: boolean
  useBrokenRing?: boolean
  useGranularEdge?: boolean
  useMultipleOffsets?: boolean
  useBrokenSegments?: boolean
  useFadeOutward?: boolean
  avoidPerfectCenter?: boolean
  useInnerVoid?: boolean
  useDepthGradient?: boolean
  useSuggestedTeeth?: boolean
  avoidLiteralGear?: boolean
  useVerticalBias?: boolean
  useTopEmission?: boolean
  useMissingCells?: boolean
  useIrregularSpacing?: boolean
  useOrbitLines?: boolean
  avoidRealisticPlanet?: boolean
  useAsymmetricRays?: boolean
  avoidIconicSun?: boolean
  useFlicker?: boolean
  avoidLiteralFlame?: boolean
  useBilateralWeakSymmetry?: boolean
  avoidLiteralBook?: boolean
  useInternalGlow?: boolean
  useGranularTexture?: boolean
  useBranchingPaths?: boolean
  avoidLiteralTree?: boolean
  usePerspectiveFade?: boolean
  useOpenDestination?: boolean
  useObliqueAxis?: boolean
  useRoughMaterial?: boolean
  useNegativeSpace?: boolean
  avoidAnatomicalHand?: boolean
  useDarkCore?: boolean
  avoidRealisticEye?: boolean
  useLargeGradients?: boolean
  useSoftTrails?: boolean
  useInnerCore?: boolean
  useSemiTransparentMembrane?: boolean
  useLongitudinalDepth?: boolean
  avoidTunnelCliche?: boolean
  useSideLight?: boolean
  avoidPerfectCube?: boolean
  useBrokenEdges?: boolean
  avoidIconicTriangle?: boolean
  useSeparatedMasses?: boolean
  useTensionGap?: boolean
  useColdHalo?: boolean
  avoidRealisticMoon?: boolean
}

export type PsyHypShapeDefinition = {
  id: PsyHypShapeId
  name: string
  description: string
  drawProfile: PsyHypDrawProfile
}

export type PsyHypPreset = {
  id: 'default'
  name: 'default'
  shapes: PsyHypShapeDefinition[]
}

export const PSY_HYP_DEFAULT_PRESET: PsyHypPreset = {
  id: 'default',
  name: 'default',
  shapes: [
    {
      id: 'disco',
      name: 'disco',
      description: 'Cerchio incompleto, decentrato e granulare, con orbita lenta e bordo consumato.',
      drawProfile: {
        kind: 'radial',
        baseGeometry: 'incompleteCircle',
        closure: 0.65,
        edgeNoise: 'medium',
        rotationBias: 'high',
        centerStability: 'low',
        strokeAllowed: false,
        fillAllowed: true,
        useBrokenRing: true,
        useGranularEdge: true,
      },
    },
    {
      id: 'onda',
      name: 'onda',
      description: 'Campo ondulatorio stratificato, sporco e respirante, lontano da una sinusoide pulita.',
      drawProfile: {
        kind: 'waveField',
        baseGeometry: 'layeredWave',
        closure: 0.05,
        edgeNoise: 'high',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: true,
        fillAllowed: false,
        useMultipleOffsets: true,
        useBrokenSegments: true,
      },
    },
    {
      id: 'spirale',
      name: 'spirale',
      description: 'Spirale ellittica incompleta, lenta e deformata, con centro instabile.',
      drawProfile: {
        kind: 'spiral',
        baseGeometry: 'incompleteEllipticSpiral',
        closure: 0.45,
        edgeNoise: 'medium',
        rotationBias: 'high',
        centerStability: 'low',
        strokeAllowed: true,
        fillAllowed: false,
        useFadeOutward: true,
        avoidPerfectCenter: true,
      },
    },
    {
      id: 'portale',
      name: 'portale',
      description: 'Apertura instabile con vuoto centrale e profondita luminosa controllata.',
      drawProfile: {
        kind: 'aperture',
        baseGeometry: 'unstablePortal',
        closure: 0.55,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useInnerVoid: true,
        useDepthGradient: true,
      },
    },
    {
      id: 'ingranaggio',
      name: 'ingranaggio',
      description: 'Meccanismo astratto con denti suggeriti, frammenti e rotazioni parziali.',
      drawProfile: {
        kind: 'mechanical',
        baseGeometry: 'brokenGear',
        closure: 0.50,
        edgeNoise: 'medium',
        rotationBias: 'high',
        centerStability: 'medium',
        strokeAllowed: true,
        fillAllowed: true,
        useSuggestedTeeth: true,
        avoidLiteralGear: true,
      },
    },
    {
      id: 'torre',
      name: 'torre',
      description: 'Presenza verticale dissolta, con base scura ed emissione fumosa superiore.',
      drawProfile: {
        kind: 'verticalMass',
        baseGeometry: 'towerEmission',
        closure: 0.35,
        edgeNoise: 'medium',
        rotationBias: 'veryLow',
        centerStability: 'high',
        strokeAllowed: false,
        fillAllowed: true,
        useVerticalBias: true,
        useTopEmission: true,
      },
    },
    {
      id: 'griglia',
      name: 'griglia',
      description: 'Reticolo modulare incompleto, con celle irregolari e zone mancanti.',
      drawProfile: {
        kind: 'grid',
        baseGeometry: 'brokenGrid',
        closure: 0.30,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: true,
        fillAllowed: false,
        useMissingCells: true,
        useIrregularSpacing: true,
      },
    },
    {
      id: 'globo',
      name: 'globo',
      description: 'Corpo orbitale sospeso, scuro, attraversato da traiettorie incomplete.',
      drawProfile: {
        kind: 'orbitalBody',
        baseGeometry: 'sphereWithOrbits',
        closure: 0.70,
        edgeNoise: 'low',
        rotationBias: 'medium',
        centerStability: 'medium',
        strokeAllowed: true,
        fillAllowed: true,
        useOrbitLines: true,
        avoidRealisticPlanet: true,
      },
    },
    {
      id: 'sole',
      name: 'sole',
      description: 'Disco luminoso parziale con raggi asimmetrici trattenuti.',
      drawProfile: {
        kind: 'radiant',
        baseGeometry: 'partialSun',
        closure: 0.60,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useAsymmetricRays: true,
        avoidIconicSun: true,
      },
    },
    {
      id: 'fiamma',
      name: 'fiamma',
      description: 'Bagliore verticale concentrato, instabile e piu luminoso che figurativo.',
      drawProfile: {
        kind: 'flame',
        baseGeometry: 'verticalGlow',
        closure: 0.40,
        edgeNoise: 'high',
        rotationBias: 'veryLow',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useFlicker: true,
        avoidLiteralFlame: true,
      },
    },
    {
      id: 'libro',
      name: 'libro',
      description: 'Superficie aperta e bassa, quasi simmetrica, con luce centrale minima.',
      drawProfile: {
        kind: 'openSurface',
        baseGeometry: 'abstractBook',
        closure: 0.45,
        edgeNoise: 'low',
        rotationBias: 'veryLow',
        centerStability: 'high',
        strokeAllowed: true,
        fillAllowed: true,
        useBilateralWeakSymmetry: true,
        avoidLiteralBook: true,
      },
    },
    {
      id: 'seme',
      name: 'seme',
      description: 'Nucleo organico compatto, granulare, con luce interna trattenuta.',
      drawProfile: {
        kind: 'organicCore',
        baseGeometry: 'seedCore',
        closure: 0.80,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useInternalGlow: true,
        useGranularTexture: true,
      },
    },
    {
      id: 'radice',
      name: 'radice',
      description: 'Rete ramificata scura, verticale e irregolare, tra radici e venature.',
      drawProfile: {
        kind: 'branching',
        baseGeometry: 'rootNetwork',
        closure: 0.10,
        edgeNoise: 'high',
        rotationBias: 'veryLow',
        centerStability: 'low',
        strokeAllowed: true,
        fillAllowed: false,
        useBranchingPaths: true,
        avoidLiteralTree: true,
      },
    },
    {
      id: 'sentiero',
      name: 'sentiero',
      description: 'Traccia aperta nel buio, curva o diagonale, con destinazione non visibile.',
      drawProfile: {
        kind: 'path',
        baseGeometry: 'disappearingPath',
        closure: 0.05,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'low',
        strokeAllowed: true,
        fillAllowed: false,
        usePerspectiveFade: true,
        useOpenDestination: true,
      },
    },
    {
      id: 'strumento',
      name: 'strumento',
      description: 'Silhouette obliqua e ruvida, con punta o taglio astratto.',
      drawProfile: {
        kind: 'primitiveTool',
        baseGeometry: 'obliqueFragment',
        closure: 0.55,
        edgeNoise: 'high',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useObliqueAxis: true,
        useRoughMaterial: true,
      },
    },
    {
      id: 'mano',
      name: 'mano',
      description: 'Impronta corporea parziale, trattata come ombra o negativo.',
      drawProfile: {
        kind: 'bodyTrace',
        baseGeometry: 'partialHandPrint',
        closure: 0.50,
        edgeNoise: 'medium',
        rotationBias: 'veryLow',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useNegativeSpace: true,
        avoidAnatomicalHand: true,
      },
    },
    {
      id: 'occhio',
      name: 'occhio',
      description: 'Ellisse scura e riflettente con nucleo ambiguo e simmetria disturbata.',
      drawProfile: {
        kind: 'eyeLike',
        baseGeometry: 'ambiguousOval',
        closure: 0.75,
        edgeNoise: 'low',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useDarkCore: true,
        avoidRealisticEye: true,
      },
    },
    {
      id: 'nebbia',
      name: 'nebbia',
      description: 'Campo sospeso di velature sovrapposte, senza contorni chiusi.',
      drawProfile: {
        kind: 'fogField',
        baseGeometry: 'layeredMist',
        closure: 0.00,
        edgeNoise: 'high',
        rotationBias: 'low',
        centerStability: 'veryLow',
        strokeAllowed: false,
        fillAllowed: true,
        useLargeGradients: true,
        useSoftTrails: true,
      },
    },
    {
      id: 'capsula',
      name: 'capsula',
      description: 'Membrana ellittica sospesa, con nucleo interno vivo e trasparenza.',
      drawProfile: {
        kind: 'capsule',
        baseGeometry: 'suspendedMembrane',
        closure: 0.85,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useInnerCore: true,
        useSemiTransparentMembrane: true,
      },
    },
    {
      id: 'condotto',
      name: 'condotto',
      description: 'Apertura longitudinale con flusso, pressione e profondita laterale.',
      drawProfile: {
        kind: 'conduit',
        baseGeometry: 'longitudinalChannel',
        closure: 0.45,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: true,
        fillAllowed: true,
        useLongitudinalDepth: true,
        avoidTunnelCliche: true,
      },
    },
    {
      id: 'blocco',
      name: 'blocco',
      description: 'Massa monumentale erosa, pesante, con luce laterale e ombra profonda.',
      drawProfile: {
        kind: 'mass',
        baseGeometry: 'erodedBlock',
        closure: 0.75,
        edgeNoise: 'medium',
        rotationBias: 'veryLow',
        centerStability: 'high',
        strokeAllowed: false,
        fillAllowed: true,
        useSideLight: true,
        avoidPerfectCube: true,
      },
    },
    {
      id: 'triangolo',
      name: 'triangolo',
      description: 'Forma angolare incompleta, tesa e asimmetrica, con bordi spezzati.',
      drawProfile: {
        kind: 'angular',
        baseGeometry: 'brokenTriangle',
        closure: 0.55,
        edgeNoise: 'medium',
        rotationBias: 'low',
        centerStability: 'medium',
        strokeAllowed: true,
        fillAllowed: true,
        useBrokenEdges: true,
        avoidIconicTriangle: true,
      },
    },
    {
      id: 'frattura',
      name: 'frattura',
      description: 'Crepa luminosa aperta con masse separate e tensione tra due parti.',
      drawProfile: {
        kind: 'fracture',
        baseGeometry: 'luminousCrack',
        closure: 0.10,
        edgeNoise: 'high',
        rotationBias: 'veryLow',
        centerStability: 'low',
        strokeAllowed: true,
        fillAllowed: false,
        useSeparatedMasses: true,
        useTensionGap: true,
      },
    },
    {
      id: 'luna',
      name: 'luna',
      description: 'Corpo pallido e lontano, parzialmente dissolto, con alone freddo.',
      drawProfile: {
        kind: 'lunar',
        baseGeometry: 'dissolvedMoon',
        closure: 0.70,
        edgeNoise: 'low',
        rotationBias: 'medium',
        centerStability: 'medium',
        strokeAllowed: false,
        fillAllowed: true,
        useColdHalo: true,
        avoidRealisticMoon: true,
      },
    },
  ],
}

export const PSY_HYP_MORPHING_PRESETS: PsyHypPreset[] = [PSY_HYP_DEFAULT_PRESET]
