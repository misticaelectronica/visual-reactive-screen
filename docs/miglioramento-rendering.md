# Miglioramento rendering

## Obiettivo

Superare la percezione chiusa e quadrata del fotogramma vettorializzato, senza
ingrandirlo, ritagliarlo o forzarlo fuori dallo schermo.

## Principi approvati

- Estendere lateralmente colori, forme periferiche e particelle partendo dai
  contenuti realmente presenti nell’immagine.
- Deformare gradualmente i bordi, senza imporre necessariamente che le forme
  escano oltre lo schermo.

## Primo intervento applicato

L’SVG usa una copertura proporzionale centrata equivalente a:

```text
preserveAspectRatio="xMidYMid slice"
```

Il fotogramma quadrato viene ingrandito fino a coprire lo schermo senza deformarsi.
Su un’uscita panoramica il ritaglio è simmetrico nella parte superiore e inferiore.
Non rimangono fasce laterali e il contenuto eccedente resta nascosto.

## Effetto desiderato

Il centro conserva il contenuto narrativo e riconoscibile dell’immagine originale.
La periferia diventa una continuazione organica e psichedelica:

- i colori si propagano come pigmenti liquidi;
- le forme prossime ai bordi si ramificano e si ricombinano;
- alcune geometrie periferiche possono duplicarsi e ruotare;
- particelle e connessioni riempiono lo spazio laterale;
- il confine originale respira e si deforma lentamente seguendo la musica.

Il risultato deve sembrare un’immagine che continua a sognare oltre i propri
confini, non un quadrato inserito dentro una cornice decorativa.

## Vincolo visivo

La transizione fra immagine e campo periferico deve essere progressiva. Non devono
comparire un bordo netto, una maschera evidente o una fascia decorativa separata.
