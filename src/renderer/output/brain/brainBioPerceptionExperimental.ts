import type {
  BrainBioPerceptionState,
  BrainBioRegimeDiagnostics,
  BrainBioRhythmInput,
} from './brainBioPerception'
import { BrainBioPerceptionClock } from './brainBioPerception'
import type { BandEnergies } from '@shared/types'

// Regime Audio sperimentale — PIANO-044, comunicazione del Capo Supremo Jr
// dell'Analisi Audio del 2026-09-11 e disposizione del Vice Consigliere
// allegata. Modulo separato per costruzione, non una ritaratura di
// `brainBioPerception.ts` (che resta la baseline, congelata): i due regimi
// devono restare confrontabili sugli stessi materiali Audio, senza che l'uno
// modifichi retroattivamente il significato dei risultati dell'altro.
//
// CHECKPOINT 1 (impianto a due percorsi, §15/§16 della direttiva): questo
// clock non ha ancora una semantica propria. Delega integralmente alla
// baseline così `audioMode='experimental'` produce oggi lo stesso identico
// output di `audioMode='baseline'` — prova che la separazione
// architetturale (settings, wiring in OutputApp, harness offline) non
// altera nulla prima che la nuova semantica (entrainment, ancoraggio
// motorio, costrizione motoria — Fase 2 del piano) venga costruita a
// partire dai segnali già esistenti (`beatPhase`, `beatPulse`,
// `kickEnvelope`, `bandTransients`, `low`, `lowMid`, `gridDensity`), non da
// nuove entità premature (`organizationScore`, `entrainmentScore`,
// `motorAnchorScore`, `danceabilityScore`).
//
// Il contratto pubblico (`ingestSample`/`getState`/`getRegimeDiagnostics`)
// è identico a `BrainBioPerceptionClock` di proposito: nessun consumer
// (`OutputApp.tsx`, `brainController.ts`, renderer, selettore) deve sapere
// quale regime è attivo.
export class BrainBioPerceptionExperimentalClock {
  private readonly baseline = new BrainBioPerceptionClock()

  ingestSample(
    bands: BandEnergies,
    now: number,
    transients?: BandEnergies,
    rhythm?: BrainBioRhythmInput,
  ): BrainBioPerceptionState {
    return this.baseline.ingestSample(bands, now, transients, rhythm)
  }

  getState(): BrainBioPerceptionState {
    return this.baseline.getState()
  }

  getRegimeDiagnostics(): BrainBioRegimeDiagnostics {
    return this.baseline.getRegimeDiagnostics()
  }
}
