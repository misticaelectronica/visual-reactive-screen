# Registro Dei Deprecati

Questo è il registro canonico delle funzionalità ancora presenti ma destinate
a essere rivalutate o rimosse. Va letto integralmente all'inizio di ogni
intervento, prima del piano e prima delle modifiche.

Per ogni intervento si registra una decisione:

- `NON COINVOLTO`: nessuna relazione con il lavoro corrente;
- `MANTENERE`: resta temporaneamente per compatibilità, con motivazione e
  criterio di uscita;
- `AGGIORNARE`: modifica limitata a compatibilità, sicurezza o disposizione
  esplicita, senza estendere la funzionalità;
- `DISMETTERE`: rimozione completa, inclusa migrazione di impostazioni, UI,
  test e documentazione.

## DEP-001 — Alternate with Brain (80/20)

- **Stato**: `DEPRECATO — ATTIVO PER COMPATIBILITÀ`.
- **Superficie**: impostazione `alternateBrainWithMorphing`, controllo nella
  Control Window e programmazione dell'interludio morphing in `OutputApp`.
- **Motivo**: introduce una seconda programmazione al confine della storia e
  si sovrappone alla nuova cadenza diretta Storia → Riattivazione.
- **Comportamento corrente**: default disattivato; le configurazioni salvate
  che lo abilitano continuano a funzionare. Non va raccomandato per nuove
  sessioni e non va esteso con nuove capacità.
- **Sostituto corrente**: flusso Brain con Riattivazione dopo ogni storia.
- **Criterio di dismissione**: decidere esplicitamente la migrazione delle
  configurazioni salvate, rimuovere il controllo UI e il ramo di alternanza,
  poi eliminare tipo, normalizzazione e test dedicati in un unico intervento.
- **Audit 2026-09-10**: `MANTENERE`. Ragione: evitare di rompere impostazioni
  salvate e sessioni esistenti. Uscita: intervento di dismissione completo
  autorizzato dopo verifica che la Riattivazione copra il flusso live voluto.
- **Audit 2026-09-11 — diagnosi Respiri**: `NON COINVOLTO`. L'alternanza non
  partecipa al calcolo di pressione, trend, atterraggio o livello e non spiega
  l'assenza di Respiro Alto nei log.
