# PsicoFantasma — collaudo repertorio V2

Data: 2026-09-08. Sorgente: pacchetto approvato dal Vice Consigliere del
Capo Supremo, archivio SHA-256
`3617d512a40345b2d3fb0d0f7097523f2cff462f078bbe0c15842788291e02d4`.

## Esito tecnico

- 120 SVG caricati; hash di tutti i file uguali al manifest.
- 24 sagome per ciascuna delle cinque famiglie; 40/40 archetipi guida.
- Contorni runtime ricavati senza reinterpretazione dalle impronte 32×32
  consegnate; round-trip pixel esatto per tutte le 120 sagome.
- Descrittori geometrici finiti per 120/120 sagome.
- Affinità esatta pari a 1 e coerenza strutturale pari a 1 per 120/120.
- Il gate riconosce 115 sagome esatte e ne rifiuta 5 per margine zero. Questo
  numero verifica il gate sul repertorio stesso e non misura il target Visual
  20–40% su immagini reali.
- Persistenza 034-18 verificata dai test dello store fuori istanza e dal
  collaudo Canvas A→B→C già registrato nel piano.

## Profiling simultaneo con Psichedel

Prova nello stesso processo Chrome: Psichedel in denoising WebGPU reale,
PsicoFantasma su CPU. Il passaggio volutamente pessimistico ha caricato il
JSON, calcolato i descrittori di tutte le 120 sagome e prodotto 120 ranking.

- PsicoFantasma: 44,6 ms totali (9,1 ms caricamento, 17,0 ms descrittori,
  18,5 ms ranking); incremento heap osservato circa 1,7 MB.
- Psichedel simultaneo: 34,301 s; riferimento caldo senza lavoro simultaneo:
  34,840 s. La differenza rientra nella variabilità della generazione.
- Nessun modello PsicoFantasma, nessuna sessione ONNX e nessuna allocazione
  WebGPU/VRAM: a runtime resta una sola query per figura al cambio immagine.

## Problemi per asset

```text
asset
artifact-helmet
problema
impronta morfologica completamente piena e indistinguibile da due archetipi diversi
evidenza
fingerprint SHA-256 5a648d80…; affinità 1, margine 0; gate: rifiuto margin
```

```text
asset
animal-bird-03
problema
impronta morfologica completamente piena e indistinguibile da due archetipi diversi
evidenza
fingerprint SHA-256 5a648d80…; affinità 1, margine 0; gate: rifiuto margin
```

```text
asset
everyday-clock-03
problema
impronta morfologica completamente piena e indistinguibile da due archetipi diversi
evidenza
fingerprint SHA-256 5a648d80…; affinità 1, margine 0; gate: rifiuto margin
```

```text
asset
animal-horse-03
problema
impronta morfologica identica a everyday-umbrella-03 nonostante SVG e hash sorgente diversi
evidenza
fingerprint SHA-256 d3012c0b…; affinità 1, margine 0; gate: rifiuto margin
```

```text
asset
everyday-umbrella-03
problema
impronta morfologica identica a animal-horse-03 nonostante SVG e hash sorgente diversi
evidenza
fingerprint SHA-256 d3012c0b…; affinità 1, margine 0; gate: rifiuto margin
```

I cinque asset restano nel repertorio approvato. Il gate evita che le
collisioni diventino riconoscimenti falsi; il repertorio nel suo complesso
non viene riaperto.
