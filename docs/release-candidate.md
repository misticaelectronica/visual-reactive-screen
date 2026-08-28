# Release Candidate 1 — guida di collaudo e rilascio

Versione candidata: **1.0.0-rc.1**  
Data: **28 agosto 2026**  
Branch di integrazione: **develop**

Questa RC congela le funzionalità. Fino alla promozione a `1.0.0` sono ammessi
soltanto correzioni di regressioni, crash, problemi live bloccanti e aggiornamenti
documentali; nessuna nuova grammatica visiva o nuova meccanica percettiva.

## Artefatti attesi

- app macOS arm64 non firmata in `release/mac-arm64/`;
- DMG `Mistica Electronica Visual Reactive Screen-1.0.0-rc.1-arm64.dmg`;
- ZIP `Mistica Electronica Visual Reactive Screen-1.0.0-rc.1-arm64-mac.zip`;
- blockmap corrispondenti;
- build Intel e Windows solo come passaggi extra, non parte del build normale.

## Installazione e avvio

1. Installare con `pnpm install` se si usa il repository.
2. Eseguire `pnpm build` oppure montare il DMG RC.
3. Su macOS autorizzare manualmente l'app non firmata e concedere il microfono.
4. Al primo uso Brain attendere il download/cache degli artefatti ONNX (~2,02 GiB).
5. Selezionare display, ingresso audio e aprire l'Output fullscreen.

## Smoke test obbligatorio

- Control Window aperta senza DevTools automatici.
- Output visibile sul display selezionato e nessun `OUTPUT READY` permanente.
- Meter audio aggiornati anche con Control Window in background.
- `Test flash` visibile senza audio; `Panic / Off` immediato.
- Chiusura e riapertura Output senza perdita dello stato più recente.
- Riavvio con device audio salvato invalido: fallback al dispositivo predefinito.

## Collaudo Brain live

### Regimi bio-percettivi

- Verificare la sequenza Pressurizzazione → Decompressione → Respiro Profondo
  e il ritorno attraverso Respiro Alto.
- Cambiare più volte renderer: tutti devono mantenere lo stesso regime già
  attivo, anche quando entrano dopo la classificazione.
- In Decompressione il moto locale deve essere chiaramente più calmo; in
  Respiro Profondo quasi fermo ma non congelato quando l'audio è presente.
- In silenzio non deve comparire moto geometrico autonomo.
- Dream Segmentation non deve mostrare reti neurali, dendriti, filamenti o
  scariche in Decompressione e Respiro Profondo.

### Varco, GPU e continuità

- Il Varco FilterPsiche deve diventare pienamente visibile prima dell'avvio
  dell'inferenza GPU.
- Nessun renderer deve iniziare a rallentare durante `preparing/entering`.
- Durante un cambio fotogramma il Varco deve seguire l'host visibile senza
  scatti o finestre prive di protezione.
- La Riattivazione deve entrare al proprio confine anche con una generazione
  lenta o `nextProduction` non pronta.

### Sessione pubblica

- QR leggibile sul pannello e sull'Output quando previsto.
- Una nuova frase produce una storia dedicata senza interrompere quella in onda.
- Alla chiusura o al riavvio il pool attivo torna al set curato.
- Eseguire almeno un giro completo del cursore frasi e verificare che non si
  ripeta lo stesso seme su pool piccoli.

## Matrice minima

| Area | macOS arm64 | macOS Intel | Windows x64 |
|---|---:|---:|---:|
| Build | Obbligatoria | Prima della distribuzione Intel | Prima della distribuzione Windows |
| Output fullscreen | Obbligatoria | Raccomandata | Obbligatoria |
| Microfono/loopback | Obbligatoria | Raccomandata | Obbligatoria |
| Brain WebGPU | Obbligatoria | Se supportata | Obbligatoria |
| Sessione pubblica | Obbligatoria | Una piattaforma sufficiente | Una piattaforma sufficiente |

## Problemi noti e limiti

- La build macOS è intenzionalmente non firmata (`identity: null`): Gatekeeper
  può richiedere apertura manuale.
- Il primo avvio Brain è pesante per download e inizializzazione del modello.
- Le build Intel e Windows non sono prodotte dal comando standard.
- La validazione automatica non sostituisce il collaudo percettivo fullscreen
  su audio reale e una sessione prolungata.

## Criteri Go / No-Go

**Go** soltanto se tutti gli smoke test sono superati, non compaiono crash o
output nero, i quattro regimi restano coerenti attraverso i cambi renderer,
Dream non mostra neuroni nei regimi bassi e la GPU non parte prima del Varco.

**No-Go** con qualunque regressione su microfono, fullscreen, Panic, continuità
del renderer, lag anticipato, classificazione bloccata o Riattivazione assente.

## Procedura di promozione

1. Registrare il collaudo live e chiudere i punti No-Go.
2. Rieseguire typecheck, lint, test e build su commit pulito.
3. Aggiornare changelog e versione da `1.0.0-rc.1` a `1.0.0`.
4. Creare tag firmato/annotato solo dopo approvazione del team.
5. Pubblicare DMG/ZIP e, se richiesti, pacchetti Intel/Windows con checksum.
