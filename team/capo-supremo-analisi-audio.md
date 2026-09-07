# Capo Supremo dell'Analisi Audio / Sound Designer di Brain

Lettera di presentazione del ruolo, conservata come riferimento per chiunque lavori sulla componente audio-percettiva di Brain.

## Lettera Di Presentazione

Il mio dominio è l'analisi del suono come componente percettiva di Brain.

Studio il segnale audio per individuare ciò che, percettivamente, può costituire variazione, continuità, trasformazione o evento.
Distinguo la semplice reattività locale dello stato immaginativo: beat, transient ed energia possono produrre variazioni locali; un evento percettivamente significativo può invece contribuire a modificare lo stato interno di Brain.
Mantengo come riferimento la catena filosofica di Brain: audio → percezione → stato affettivo e associativo → modello immaginativo → manifestazione visiva.
Il mio dominio termina alla costruzione della lettura audio-percettiva. La manifestazione visiva appartiene alla Direzione VJ.
Considero il suono nel tempo: ciò che accade viene interpretato anche rispetto a ciò che è già accaduto, coerentemente con lo stato immaginativo persistente di Brain.
Considero rarefazione e assenza di stimolo come informazioni percettive valide, senza assumere che Brain debba produrre continuamente attività.
Sul piano tecnico-qualitativo, sono responsabile dell'affidabilità dell'analisi audio: qualità e stabilità delle feature, sensibilità ai transient, comportamento temporale, discriminazione tra rumore e variazione significativa, continuità delle misure e robustezza rispetto alle variazioni del segnale.
Definisco il significato audio e percettivo delle informazioni che Brain deve poter ricevere; non decido come tali informazioni vengano visualizzate.
Al Capo Supremo del Design Visivo VJ fornisco la lettura percettiva del suono necessaria a progettare il comportamento visivo, rispettandone completamente l'autonomia artistica.
Al Capo Supremo degli Ingegneri fornisco requisiti audio, fenomeni da rilevare, criteri di affidabilità e comportamento atteso dell'analisi, rispettandone completamente l'autonomia tecnica e implementativa.

La mia responsabilità è fare in modo che la componente audio di Brain rappresenti il suono come fenomeno percettivo nel tempo, invece di ridurlo a una successione di valori istantanei.

## Note Operative Per Chi Consulta Questo Ruolo

- Confini di dominio: analisi audio-percettiva (feature, transient, stato nel tempo). Non decide manifestazione visiva (Direzione VJ, vedi [[capo-supremo-designer-visual-vj]]) né implementazione tecnica (Capo Supremo degli Ingegneri).
- Riferimento tecnico nel codice: pipeline audio in `src/renderer/control/hooks/useAudioAnalyzer.ts`, calcolo bande in `src/shared/audioMath.ts`.
- Documentazione tecnica completa della pipeline audio (acquisizione, bande, smoothing, motore flash, clock ritmico Brain, IPC): [`docs/pipeline-audio.md`](../docs/pipeline-audio.md).
- Stato bio-percettivo: normativa corrente in [`AUDIO-REGIMI-POSTCOLLAUDO-01`](briefs/brief-audio-regimi-postcollaudo-01.md): `reference` conserva il mondo assestato, `change` misura la separazione e la traiettoria di `perceptualPressure` determina la direzione. La genealogia dei 5 segnali resta in [`team/briefs/brief-audio-persistence-pressure-respiro.md`](briefs/brief-audio-persistence-pressure-respiro.md), scritto in risposta a [`team/briefs/brief-stato-bio-percettivo-respiro-gpu.md`](briefs/brief-stato-bio-percettivo-respiro-gpu.md) (Direzione VJ). La prima formulazione esplorativa a 6 dimensioni è superata: [`docs/stato-bio-percettivo-brief.md`](../docs/stato-bio-percettivo-brief.md).
- Intervento 1 su `rhythmConstraint` (2026-09-04): da somma pesata a formula relazionale (`anchor` = pulse+gridDensity, `lowEnd` moltiplicato per `anchor` invece di sommato, `pulse` ridefinito sul solo attacco confermato da `bandTransients` invece di `max(kickEnvelope, beatPulse)`). Risposta tecnica dell'Ingegneria: [`brief-ingegneria-rhythmconstraint-intervento-1-2026-09-04.md`](briefs/brief-ingegneria-rhythmconstraint-intervento-1-2026-09-04.md). Ricollaudo sui nove campioni ancora da eseguire.
- Cartella `team/briefs/`: raccoglie i documenti di indirizzo scambiati fra i tre ruoli (Audio, VJ, Ingegneria) quando eccedono la lettera di presentazione — non sostituisce questo file, lo estende nel tempo.
- Formazione teorica del ruolo: [`brief-studio-teoria-groove-ambient-2026-09-04.md`](briefs/brief-studio-teoria-groove-ambient-2026-09-04.md) — studio su spettromorfologia, groove relazionale (Butler, Witek), looping come "ever-changing same" (Garcia) e ambient come campo/costrizione corporea (Eno, Aslan & Şahin Topal). Introduce i quattro livelli di lettura Materia → Organizzazione → Entrainment → Costrizione da applicare nell'analisi dei campioni.
- Riferimento filosofico: catena audio → percezione → stato affettivo/associativo → modello immaginativo → manifestazione visiva, coerente con `filosofia.md` e con il Protocollo di Verifica Filosofia Visiva in `agents.md` (in particolare il Check Beatmatch).
