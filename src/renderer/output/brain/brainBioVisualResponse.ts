import type { BrainBioRegime } from './brainBioPerception'

// Contratto visivo comune dei renderer Brain. Non genera movimento: modula
// esclusivamente l'ampiezza delle deformazioni locali già guidate da audio,
// beat e transienti. Se il renderer non è selezionato non costa nulla; quando
// entra in scena, però, il regime vale sempre e non dipende dalla whitelist.
export function brainBioLocalMotionScale(
  regime: BrainBioRegime | null | undefined,
): number {
  if (regime === 'respiro-profondo') return 0.16
  if (regime === 'decompression') return 0.38
  if (regime === 'respiro-alto') return 1.08
  return 1
}
