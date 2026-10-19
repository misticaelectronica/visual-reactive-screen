# Changelog

Le modifiche rilevanti di Mistica Electronica Visual Reactive Screen sono
raccolte qui. Il progetto segue versioni semantiche con prerelease Beta e RC.

## [1.0.0-rc.3] — 2026-09-07

Consolida il lavoro bio-percettivo (già `1.0.0-rc.2`), il Varco, Print2D e la
presenza del raster in un'unica release candidate. Chiusura del registro dei
piani: gli otto piani renderer sono marcati implementati; restano attivi il
blocco prestazioni, Print2D e il bootstrap lungo bio-percettivo.

### Modificato

- Varco Percettivo: copertura estesa all'intera durata dell'inferenza
  immagine (latch `imageInferenceActive`), non più una finestra a impulso
  fissa di 2,5 s più corta del fotogramma da coprire.
- Print2D: stato e movimento per regione — dodici stati locali, fase
  circolare filtrata, posizione accumulata entro limiti permanenti; il freeze
  non accumula più delta da recuperare alla ripresa.
- Bauhaus Morph, Fractal Spiral Degeneration e DELIQUESCENCE: il raster di
  fondo resta più presente e si dissolve più lentamente sotto la grammatica
  del renderer, senza toccarne la grammatica.

### Corretto

- Riferimento bio-percettivo: promozione corretta, deriva della mediana
  neutralizzata, ereditarietà del livello.
- Plateau nei transienti corretto; isteresi aggiunta sul trend.
- `unresolved` per livello mancante eredita il livello precedente valido
  invece di azzerarlo.
- DELIQUESCENCE: figura e contorno non più quasi neri su nero (tonemap con
  pavimenti alzati e gate di luminanza allargato).
- macOS, output su secondo monitor: l'icona dell'app non sparisce più dalla
  Dock all'apertura dell'Output; il fullscreen usa l'API nativa invece del
  kiosk.

### Verifica

- Typecheck e lint puliti.
- Suite completa: 66 file, 629 test superati.

### Da collaudare prima di 1.0.0 stabile

- Varco visibile per l'intero fotogramma durante generazioni lente, senza
  scatti al centro dell'inferenza.
- Print2D per regione su set reale prolungato: asincronia, residuo,
  silenzio/ripresa, freeze e low power.
- Presenza del raster nei tre renderer su proiettore reale.
- Bootstrap lungo bio-percettivo (PIANO-040 ancora aperto).

## [1.0.0-rc.1] — 2026-08-28

### Aggiunto

- Stato bio-percettivo Brain con quattro regimi leggibili:
  Pressurizzazione, Decompressione, Respiro Alto e Respiro Profondo.
- Overlay di collaudo e log di sessione con segnali continui, riferimento,
  mediana contestuale, trend e renderer corrente.
- Contratto bio-visivo comune per tutti i nove renderer Brain.
- Documentazione filosofica e operativa del respiro percettivo.

### Modificato

- FilterPsiche è meno saturo, luminoso e aggressivo nei regimi bassi.
- Bauhaus Morph e Materia Morph riducono il moto locale in Decompressione e
  ancora di più in Respiro Profondo.
- Print2D, Psycho2D, Vector Morph, Glitch Morph e Fractal Spiral consumano ora
  sempre il regime quando sono in scena.
- Il Respiro Alto conserva una risposta piena e serrata; il Respiro Profondo
  mantiene camera stabile e materia riconoscibile.

### Corretto

- Lo stato bio-percettivo viene inoltrato dal Renderer Host anche ai renderer
  entranti e ai layer del Varco creati dopo il cambio di regime.
- Dream Segmentation non mostra neuroni, filamenti o scariche elettriche in
  Decompressione e Respiro Profondo, indipendentemente dal residuo.
- L'inferenza GPU parte soltanto quando il Varco Percettivo è già pienamente
  attivo, evitando il lag anticipato dei renderer.
- La Riattivazione scatta ai confini previsti anche quando la prossima storia
  non è ancora pronta o la GPU è in attesa.

### Verifica

- Typecheck e lint puliti.
- Suite completa: 63 file, 574 test superati.
- Build macOS arm64 completa: app, DMG, ZIP e blockmap.

### Da collaudare prima di 1.0.0 stabile

- Risposta fullscreen dei quattro regimi su un set reale prolungato.
- Assenza di neuroni Dream nei regimi bassi su più cambi renderer.
- Varco visibile prima di ogni concessione GPU e assenza di lag anticipato.
- Ingresso periodico della Riattivazione durante generazioni lente.
- Sessione pubblica con input reali e almeno un giro completo del cursore frasi.

## [1.0.0-beta.3] — 2026-08-27

- Sessione pubblica via Google Form/Sheet e QR.
- Campionamento delle frasi tramite finestra scorrevole con sovrapposizione.
- Residuo online e memoria lunga distribuita nel tempo.
- Consolidamento della documentazione del sistema renderer e del Varco.

## [1.0.0-beta.2] — 2026-08-26

- Stabilizzazione di Fractal Spiral Degeneration e correzioni del verso.
- Prima formalizzazione del Varco Percettivo e dei brief di versione.
