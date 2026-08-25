// Libreria curata di sagome per le "figure Bauhaus" (PIANO-037): quando una
// figura astratta resta abbastanza vicina a un piano esistente, può provare
// a diventare una di queste — mai generata via ML, mai casuale nella scelta
// (vedi `selectBauhausSilhouette` in `brainBauhausMorphCanvas.ts`), sempre
// una riduzione geometrica di un oggetto riconoscibile, nello spirito delle
// figure del Triadisches Ballett di Schlemmer e delle forme di Kandinsky.
//
// Ogni sagoma è un contorno di 8 punti in spazio locale unitario (centro in
// 0,0, estensione approssimativa -0.5..0.5), ordinati in senso orario a
// partire dall'alto — lo stesso ordine usato per il contorno della forma
// astratta di partenza, così `interpolatedPlane` (già esistente, invariato)
// può interpolarli punto per punto invece di scambiarli di colpo.

export type BauhausSilhouettePoint = { x: number; y: number }

export type BauhausSilhouette = {
  id: string
  /** Larghezza/altezza nominale a cui la sagoma si legge meglio. */
  aspectRatio: number
  points: readonly BauhausSilhouettePoint[]
}

export const BAUHAUS_SILHOUETTE_POINT_COUNT = 8

export const BAUHAUS_SILHOUETTES: readonly BauhausSilhouette[] = [
  {
    id: 'moon',
    aspectRatio: 1.2,
    points: [
      { x: 0.05, y: -0.5 },
      { x: 0.35, y: -0.35 },
      { x: 0.5, y: 0 },
      { x: 0.35, y: 0.35 },
      { x: 0.05, y: 0.5 },
      { x: -0.05, y: 0.25 },
      { x: -0.2, y: 0 },
      { x: -0.05, y: -0.25 },
    ],
  },
  {
    id: 'leaf',
    aspectRatio: 0.84,
    points: [
      { x: 0, y: -0.5 },
      { x: 0.28, y: -0.22 },
      { x: 0.42, y: 0.05 },
      { x: 0.22, y: 0.32 },
      { x: 0, y: 0.5 },
      { x: -0.22, y: 0.32 },
      { x: -0.42, y: 0.05 },
      { x: -0.28, y: -0.22 },
    ],
  },
  {
    id: 'bottle',
    aspectRatio: 0.64,
    points: [
      { x: -0.08, y: -0.5 },
      { x: 0.08, y: -0.5 },
      { x: 0.08, y: -0.28 },
      { x: 0.32, y: -0.05 },
      { x: 0.32, y: 0.5 },
      { x: -0.32, y: 0.5 },
      { x: -0.32, y: -0.05 },
      { x: -0.08, y: -0.28 },
    ],
  },
  {
    id: 'bird',
    aspectRatio: 1.1,
    points: [
      { x: 0, y: -0.4 },
      { x: 0.5, y: 0.05 },
      { x: 0.1, y: 0.1 },
      { x: 0.25, y: 0.5 },
      { x: 0, y: 0.15 },
      { x: -0.25, y: 0.5 },
      { x: -0.1, y: 0.1 },
      { x: -0.5, y: 0.05 },
    ],
  },
  {
    id: 'star',
    aspectRatio: 1,
    points: [
      { x: 0, y: -0.5 },
      { x: 0.16, y: -0.16 },
      { x: 0.5, y: 0 },
      { x: 0.16, y: 0.16 },
      { x: 0, y: 0.5 },
      { x: -0.16, y: 0.16 },
      { x: -0.5, y: 0 },
      { x: -0.16, y: -0.16 },
    ],
  },
  {
    id: 'arrow',
    aspectRatio: 0.44,
    points: [
      { x: 0, y: -0.5 },
      { x: 0.22, y: -0.05 },
      { x: 0.09, y: -0.05 },
      { x: 0.09, y: 0.5 },
      { x: 0, y: 0.4 },
      { x: -0.09, y: 0.5 },
      { x: -0.09, y: -0.05 },
      { x: -0.22, y: -0.05 },
    ],
  },
]
