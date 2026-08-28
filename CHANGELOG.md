# Changelog

Le modifiche rilevanti di Mistica Electronica Visual Reactive Screen sono
raccolte qui. Il progetto segue versioni semantiche con prerelease Beta e RC.

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
