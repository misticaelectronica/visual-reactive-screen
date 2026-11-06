# Marcature temporali del corpus

`marcature.json` contiene la ground truth percettiva dei campioni di questa
cartella, tratto per tratto. Le marcature le assegna l'Analisi Audio
all'ascolto. L'Ingegneria prepara formato e strumenti e non deduce le
marcature dalle feature, dal nome del file o dallo stato emesso dal motore
(`team/briefs/brief-audio-autorizzazione-piano-059-2026-11-06.md` §2).

## Formato

```json
{
  "schemaVersion": 1,
  "campioni": {
    "nome-file.mp3": {
      "marcatoDa": "Analisi Audio",
      "marcatoIl": "2026-11-07",
      "regioni": [
        { "inizio": "0:00", "fine": "0:21.5", "atteso": "respiro-alto", "ruolo": "prima", "confidenza": "alta" },
        { "inizio": "0:21.5", "fine": "0:29", "atteso": "decompression", "ruolo": "trasformazione", "confidenza": "media", "nota": "il kick si allontana" },
        { "inizio": "0:29", "fine": "0:41", "atteso": "respiro-profondo", "ruolo": "dopo", "confidenza": "bassa" }
      ]
    }
  }
}
```

I valori dell'esempio sono inventati e mostrano soltanto la forma.

| Campo | Valori | Obbligatorio |
|---|---|---|
| `inizio`, `fine` | `m:ss` o `m:ss.s` dall'inizio del file | sì |
| `atteso` | `pressurized`, `decompression`, `respiro-alto`, `respiro-profondo`, `unresolved-ground-truth` | sì |
| `ruolo` | `prima`, `trasformazione`, `dopo`, `altro` | no |
| `confidenza` | `alta`, `media`, `bassa` | sì |
| `nota` | testo libero | no |

Le regioni non si sovrappongono e restano dentro la durata del file.

## Come vengono lette

`node scripts/calibration/replay-annotated-corpus.mjs` riproduce ogni
campione con i moduli di produzione e confronta, fotogramma per fotogramma,
il regime emesso con `atteso`.

- Un tratto senza regione è **NON ANNOTATO**: non conta né come corretto né
  come errato e non entra in nessun punteggio.
- Una regione `unresolved-ground-truth` è **AMBIGUA**: è mostrata a parte e
  resta fuori dal punteggio.
- Nelle regioni annotate, `unresolved` emesso dal motore (avvio a freddo)
  conta come non corretto ma è mostrato in una colonna propria.
- I punteggi sono separati per confidenza e non vengono pesati fra loro.
- Senza regioni annotate lo strumento non produce alcun punteggio.

Lo strumento usa il downmix ½(L+R) della produzione. Gli script storici
(`assert-regime-corpus.mjs`, `compare-audio-regimes.mjs`) entrano ~3 dB più
caldi, quindi i numeri possono differire di poco sullo stesso file
(`working/calibration-v1/piano-059/gain-sweep-sintesi.md` §2).
