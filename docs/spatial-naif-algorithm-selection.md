# Cattura Spaziale Naïf - scelta algoritmica

## Obiettivo

La funzione deve disegnare forme reali viste dalla webcam, non simboli degli oggetti. La pipeline corretta non e':

`oggetto riconosciuto -> simbolo`

ma:

`frame webcam -> segmentazione/mask -> contorni reali -> pulizia -> vettorializzazione -> morphing`

## Scelta

La scelta consigliata e' una pipeline ibrida:

1. **MediaPipe Tasks Vision / Image Segmenter** come sorgente principale di maschere quando disponibile.
2. **MediaPipe Body Segmentation / Selfie Segmentation** come percorso specializzato per persone vicine alla webcam.
3. **MediaPipe Object Detector** solo come generatore opzionale di ROI, non come output visuale.
4. **OpenCV.js o contour pipeline equivalente** per trovare contorni, filtrare area/perimetro, approssimare path e produrre shape morphabili.
5. Fallback leggero interno solo quando i modelli non sono caricati o il low power mode lo richiede.

## Perche'

- Image segmentation produce maschere: e' il dato giusto per ricalcare una forma.
- Object detection produce bounding box e label: utile per sapere dove guardare, insufficiente per disegnare la forma reale.
- Body segmentation e' adatta a persone, posture e silhouette, ma non basta per sedie, casse, finestre o arredi.
- OpenCV/contour extraction e' lo step corretto dopo la maschera: trova contorni, area, perimetro, centroidi e approssimazione Douglas-Peucker.

## Pipeline runtime

### 1. Cattura

- mantenere stream camera pronto;
- campionare solo ogni 10/30/90 secondi o su `Forza cattura spaziale`;
- downscale di analisi: 256 px lato lungo per ML, 160-224 px per contour fallback;
- nessun layer webcam visibile.

### 2. Segmentazione primaria

Usare `@mediapipe/tasks-vision` con `ImageSegmenter`:

- `runningMode: "IMAGE"` per cattura periodica;
- `outputCategoryMask: true` quando basta la categoria vincente;
- `outputConfidenceMasks: true` se serve soglia di confidenza;
- modello da salvare localmente in `public/mediapipe/models` o equivalente, non caricare da CDN in produzione.

Nota performance: le chiamate `segment()` / `segmentForVideo()` possono bloccare il main thread. Eseguire l'inferenza in Web Worker o in una finestra/worker dedicato quando si passa a ML.

### 3. Segmentazione persone

Per persone, preferire Selfie Segmentation / body-segmentation:

- MediaPipe runtime su desktop/macOS per performance;
- modello `landscape` quando serve velocita';
- modello `general` quando serve qualita' maggiore;
- output: maschera persona, non stickman, non pose skeleton.

### 4. Object detection opzionale

Usare Object Detector solo per:

- scartare frame senza oggetti riconoscibili;
- limitare la segmentazione a ROI;
- dare priorita' a persone, sedie, casse, tavoli, finestre o oggetti grandi.

Non usare bounding box, label o classe come forma finale.

### 5. Contour extraction

Da ogni maschera accettata:

- binarizzare soglie di confidenza;
- close/open morfologico;
- `findContours`;
- filtrare per area minima, perimetro, rapporto area/bounding box, stabilita' e complessita';
- `approxPolyDP` / Douglas-Peucker per ridurre punti senza perdere profilo;
- convertire in `SpatialNaifPath` chiusi.

### 6. Quality scoring

Scartare se:

- maschera troppo piccola;
- contorno troppo spezzato;
- troppi frammenti;
- rapporto area/perimetro incoerente;
- shape troppo complessa per morphing;
- confidenza ML bassa;
- costo previsto alto.

Meglio fallback PsyMorphing che profili sporchi.

## Librerie

### Raccomandate

- `@mediapipe/tasks-vision`
- `@tensorflow-models/body-segmentation` + runtime MediaPipe, solo se Image Segmenter non basta sulle persone
- `opencv.js` localizzato nel progetto, oppure implementazione interna mirata di `findContours` + `approxPolyDP`

### Da evitare come prima scelta

- YOLO/browser generico: buono per detection, non per silhouette reali.
- BodyPix legacy come scelta principale: superato da MediaPipe/selfie/body segmentation per performance e qualita'.
- CDN runtime in produzione: fragile offline e poco controllabile per packaging live.

## Decisione pratica per questo progetto

Implementare in due fasi:

1. **Fase A stabile**: aggiungere `@mediapipe/tasks-vision`, modello segmenter locale, output maschera -> contour extraction interna -> `SpatialNaifPath`.
2. **Fase B qualita'**: aggiungere percorso persona con Selfie/Body Segmentation e ROI opzionali da Object Detector se gli oggetti/arredi risultano ancora deboli.

La UI non deve esporre questi dettagli: resta solo **Cattura Spaziale Naïf** con intervallo e cattura forzata.

## Fonti tecniche

- MediaPipe Image Segmenter Web: https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js
- MediaPipe Object Detector Web: https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js
- TensorFlow.js Body Segmentation / MediaPipe runtime: https://blog.tensorflow.org/2022/01/body-segmentation.html
- OpenCV.js contours: https://docs.opencv.org/4.x/d5/daa/tutorial_js_contours_begin.html
- OpenCV contour features / approxPolyDP: https://docs.opencv.org/4.x/dd/d49/tutorial_py_contour_features.html
