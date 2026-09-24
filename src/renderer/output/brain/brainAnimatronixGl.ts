// ANIMATRONIX — renderer WebGL2. Undici grammatiche cinetiche (traversal,
// depth-fracture, perspective-melt, parallax-collapse, occlusion-passage,
// residual-space, hypnotic-zoom, più quattro ad alta salienza: KINETIC
// MATCH, VERTIGO LOCK, TIME CRUSH, FOCUS INVERSION) in un unico shader di
// mondo, più un passaggio di composizione che porta le tracce residue. Usa
// solo raster già prodotti.

import type {
  AnimatronixFrame,
  AnimatronixPlan,
  AnimatronixStructure,
  AnimatronixWorldState,
} from './brainAnimatronix'

const VERT = `#version 300 es
out vec2 vFrag;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vFrag = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const WORLD_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vFrag;
out vec4 outColor;

struct World {
  float flight; float bend; float melt; float fracture; float collapse; float camera;
  float vertigo; float focus; float zoom;
  vec2 vp; vec2 planes; vec2 anchor;
};

uniform sampler2D uImgA;
uniform sampler2D uDepA;
uniform sampler2D uMassA;
uniform sampler2D uImgB;
uniform sampler2D uDepB;
uniform sampler2D uFlow;
uniform float uHasFlow;
uniform vec2 uCoverA;
uniform vec2 uCoverB;
uniform float uAspect;
uniform World uWA;
uniform World uWB;
uniform float uCollapseMode;
uniform float uBendSign;
uniform float uSlipAngle;
uniform int uKind;
uniform float uTrans;
uniform float uHasB;
uniform vec2 uMassC;
uniform vec2 uMassEnd;
uniform float uMassScaleEnd;
uniform float uCrush;
uniform float uCrushFg;
uniform float uZoomUsesAnchor;

vec2 toT(vec2 q, vec2 cover) { return 0.5 + (q - 0.5) * cover; }
vec3 samp(sampler2D img, vec2 q, vec2 cover) { return texture(img, toT(q, cover)).rgb; }
float depthAt(sampler2D dep, vec2 q, vec2 cover) { return texture(dep, toT(q, cover)).r; }

vec2 meltMap(vec2 q, World W, float sgn) {
  float m = W.melt;
  if (m <= 0.0005) return q;
  float h = W.vp.y;
  float vx = W.vp.x + sgn * 0.16 * m;
  float band = smoothstep(h - 0.25, h + 0.35, q.y);
  float sx = 1.0 + sgn * 0.72 * m * (q.y - h) * (0.4 + 0.6 * band);
  vec2 p = vec2(vx + (q.x - vx) / sx, q.y);
  p.y += 0.09 * m * sgn * (q.x - vx) * (q.y - h);
  return 0.5 + (p - 0.5) / (1.0 + 0.18 * m);
}

// TIME CRUSH: uCrush desincronizza per un tratto breve il tempo di primo
// piano e sfondo (frequenza di attraversamento diversa), non è un effetto
// autonomo ma una modulazione di quanto già in corso.
float crushFactor(float depthV) {
  float side = uCrushFg > 0.5 ? depthV : (1.0 - depthV);
  return mix(1.0, 0.05, uCrush * smoothstep(0.28, 0.68, side));
}

vec2 traversalMap(vec2 q, World W, sampler2D dep, vec2 cover) {
  if (W.flight <= 0.0005) return q;
  vec2 V = W.vp + vec2(uBendSign * 0.14 * W.bend, -0.05 * W.bend);
  vec2 d = q - V;
  float rn = clamp(length(d * vec2(uAspect, 1.0)) / 0.8, 0.0, 1.5);
  float near = depthAt(dep, q, cover);
  float cf = crushFactor(near);
  float f = 1.0 / (1.0 + W.flight * cf * (0.14 + 0.22 * rn + 0.34 * near));
  return V + d * f;
}

// VERTIGO LOCK: attorno all'ancora del soggetto il campionamento resta
// quello identico (nessuna deformazione); più lontano, la profondità viene
// deformata come un dolly zoom capovolto, con una breve instabilità a metà
// corsa in cui il riferimento perde tenuta prima di ritrovare un nuovo
// equilibrio.
vec2 vertigoMap(vec2 q, World W, sampler2D dep, vec2 cover) {
  if (W.vertigo <= 0.0005) return q;
  vec2 anchor = W.anchor;
  float d = length((q - anchor) * vec2(uAspect, 1.0));
  // Sblocco morbido e stretto: il soggetto resta identico in un raggio
  // piccolo, il resto del mondo si deforma a piani (non per pixel, altrimenti
  // il rumore della depth map produce un liquify invece di un dolly zoom).
  float lock = 1.0 - smoothstep(0.05, 0.24, d);
  float raw = depthAt(dep, q, cover);
  float layer = 0.5 * smoothstep(W.planes.x - 0.15, W.planes.x + 0.15, raw) +
                0.5 * smoothstep(W.planes.y - 0.15, W.planes.y + 0.15, raw);
  float sign = uCollapseMode > 0.0 ? 1.0 : -1.0;
  float amount = clamp(W.vertigo, 0.0, 1.0);
  float wobble = sign * amount * (layer - 0.5) * 0.8;
  float instability = smoothstep(0.3, 0.55, amount) * (1.0 - smoothstep(0.55, 0.85, amount));
  vec2 noise = instability * 0.012 *
    vec2(sin(q.y * 22.0 + amount * 7.0), cos(q.x * 22.0 + amount * 7.0));
  vec2 warped = anchor + (q - anchor) * (1.0 + wobble) + noise;
  return mix(warped, q, lock);
}

vec2 parallaxMap(vec2 q, World W, sampler2D dep, vec2 cover) {
  if (W.camera <= 0.0005) return q;
  float raw = 0.25 * (depthAt(dep, q + vec2(0.03, 0.0), cover) + depthAt(dep, q - vec2(0.03, 0.0), cover) +
                      depthAt(dep, q + vec2(0.0, 0.03), cover) + depthAt(dep, q - vec2(0.0, 0.03), cover));
  float d = 0.5 * smoothstep(W.planes.x - 0.18, W.planes.x + 0.18, raw) +
            0.5 * smoothstep(W.planes.y - 0.18, W.planes.y + 0.18, raw);
  float target = uCollapseMode > 0.0 ? 0.22 : 1.6;
  float gain = mix(1.0, target, clamp(W.collapse, 0.0, 1.0));
  vec2 dir = vec2(1.0, 0.12);
  float cf = crushFactor(d);
  return q - dir * (min(W.camera, 1.2) * cf * 0.16) * (d - 0.5) * gain;
}

bool insideImg(vec2 q, vec2 cover) {
  vec2 t = toT(q, cover);
  return t.x >= 0.0 && t.x <= 1.0 && t.y >= 0.0 && t.y <= 1.0;
}

// Profondità oltre la frattura: la stessa scena più lontana, sfocata,
// desaturata e scura, mai un nero piatto.
vec3 darkBeyond(sampler2D img, vec2 q, vec2 cover) {
  vec2 far = 0.5 + (q - 0.5) * 0.82;
  vec3 c = textureLod(img, toT(far, cover), 3.0).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), c, 0.55) * 0.42;
}

// Profondità di piano: proxy grossolano + contrasto fine dell'immagine, così i
// bordi dei piani seguono le strutture reali e non solo le macchie a bassa
// risoluzione.
float planeDepth(sampler2D img, sampler2D dep, vec2 q, vec2 cover) {
  vec2 t = toT(q, cover);
  float coarse = texture(dep, t).r;
  float fine = dot(texture(img, t).rgb - textureLod(img, t, 4.5).rgb, vec3(0.299, 0.587, 0.114));
  return coarse + 0.16 * fine;
}

vec3 fractureWorld(sampler2D img, sampler2D dep, vec2 q, vec2 cover, World W,
                   vec3 beyond, float useBeyond, float tr) {
  float F = W.fracture;
  if (F <= 0.0005 && tr <= 0.0005) return samp(img, q, cover);
  // Continuità (log di prova: un solo fotogramma di scarto quando F superava
  // la soglia): la scurita dei piani medio/lontano entra gradualmente con F,
  // non a scatto.
  float k = smoothstep(0.0, 0.12, F + tr);
  vec2 dir = vec2(cos(uSlipAngle), sin(uSlipAngle));
  vec2 slipNear = dir * (0.30 * F + tr * 1.5);
  vec2 slipMid = -dir * (0.17 * F + pow(tr, 1.5) * 1.7);
  vec2 slipFar = dir * (0.06 * F + tr * tr * 1.5);
  vec2 qk = q - slipNear;
  float d = planeDepth(img, dep, qk, cover);
  if (d > W.planes.y && insideImg(qk, cover)) return samp(img, qk, cover);
  qk = q - slipMid;
  d = planeDepth(img, dep, qk, cover);
  if (d > W.planes.x && d <= W.planes.y && insideImg(qk, cover)) return samp(img, qk, cover) * mix(1.0, 0.94, k);
  qk = q - slipFar;
  d = planeDepth(img, dep, qk, cover);
  if (d <= W.planes.x && insideImg(qk, cover)) return samp(img, qk, cover) * mix(1.0, 0.88, k);
  float gapOpen = smoothstep(0.025, 0.11, 0.30 * F + tr);
  // Il raster successivo entra nelle fessure in dissolvenza (bt), non a
  // scatto: prima della transizione le fessure mostrano già lo sfondo scuro.
  float bt = useBeyond > 0.5 ? smoothstep(0.0, 0.4, tr) : 0.0;
  vec3 gap = mix(darkBeyond(img, q, cover), beyond, bt);
  return mix(samp(img, q, cover), gap, gapOpen);
}

// HYPNOTIC ZOOM: zoom continuo e ininterrotto verso il punto di fuga,
// motion graphics ipnotico (Ken Burns portato all'estremo), mai un varco né
// una rivelazione a foro — solo avvicinamento fluido, coerente con la
// deroga Camera di ANIMATRONIX. Irreversibile come gli altri canali: lo
// zoom non torna mai indietro dentro la storia, solo rallenta in silenzio.
// HYPNOTIC ZOOM ANNIDATO (uZoomUsesAnchor): stesso zoom, ma il bersaglio è
// il dettaglio significativo rilevato sul raster (W.anchor) invece del
// punto di fuga — l'immagine successiva è percepita come contenuta in quel
// dettaglio, non semplicemente ingrandita.
vec2 zoomMap(vec2 q, World W) {
  if (W.zoom <= 0.0005) return q;
  vec2 target = mix(W.vp, W.anchor, uZoomUsesAnchor);
  float s = 1.0 + W.zoom;
  return target + (q - target) / s;
}

vec3 renderWorld(sampler2D img, sampler2D dep, vec2 q, World W, vec2 cover,
                 vec3 beyond, float useBeyond, float tr) {
  vec2 qz = zoomMap(q, W);
  vec2 qv = vertigoMap(qz, W, dep, cover);
  vec2 qa = parallaxMap(traversalMap(meltMap(qv, W, 1.0), W, dep, cover), W, dep, cover);
  vec3 ca = fractureWorld(img, dep, qa, cover, W, beyond, useBeyond, tr);
  if (W.melt > 0.02) {
    float band = smoothstep(W.vp.y - 0.25, W.vp.y + 0.35, qv.y);
    vec2 qb = parallaxMap(traversalMap(meltMap(qv, W, -1.0), W, dep, cover), W, dep, cover);
    vec3 cb = fractureWorld(img, dep, qb, cover, W, beyond, useBeyond, tr);
    ca = mix(cb, ca, band);
    ca = mix(ca, cb, 0.2 * smoothstep(0.3, 1.0, W.melt));
  }
  return ca;
}

float maskAt(vec2 q) {
  vec2 t = toT(q, uCoverA);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  return texture(uMassA, t).r;
}

void main() {
  vec2 q = vec2(vFrag.x, 1.0 - vFrag.y);

  // MORPH vero (disp. Capo Supremo 2026-09-24): flusso di corrispondenza
  // A→B (block matching, calcolato prima del confine). Al tempo t un pixel
  // pesca A a q - t*F e B a q + (1-t)*F: le forme di A scivolano verso le
  // forme di B mentre le due immagini si fondono. A t=0 e t=1 il warp è
  // identità, quindi nessuno scatto al confine fra un raster e il
  // successivo. Senza flusso ricade sul richiamo verso il punto di fuga.
  vec2 qA = q;
  vec2 qBmorph = q;
  bool morphKind = uKind == 8 || uKind == 2 || uKind == 4 || uKind == 7;
  if (morphKind && uHasFlow > 0.5) {
    vec2 f = texture(uFlow, toT(q, uCoverA)).rg / uCoverA;
    float tm = uTrans * uTrans * (3.0 - 2.0 * uTrans);
    float amt = uKind == 8 ? 1.0 : 0.7;
    qA = q - tm * f * amt;
    qBmorph = q + (1.0 - tm) * f * amt;
  } else if (uKind == 8) {
    float warp = 0.18 * smoothstep(0.0, 1.0, uTrans);
    qA = uWA.vp + (q - uWA.vp) * (1.0 - warp);
    qBmorph = uWB.vp + (q - uWB.vp) * (1.0 - warp * 0.55);
  }

  vec3 cB = vec3(0.0);
  if (uHasB > 0.5 && uKind != 0) {
    cB = renderWorld(uImgB, uDepB, qBmorph, uWB, uCoverB, vec3(0.0), 0.0, 0.0);
  }
  float fractureKind = uKind == 2 ? 1.0 : 0.0;
  vec3 cA = renderWorld(uImgA, uDepA, qA, uWA, uCoverA, cB, fractureKind,
                        uKind == 2 ? uTrans : 0.0);
  vec3 color = cA;

  if (uKind == 3) {
    float u = uTrans;
    float S = uMassScaleEnd;
    float cov = 0.0;
    for (int k = 0; k < 12; k++) {
      float uk = u * float(k) / 11.0;
      float sk = 1.0 + (S - 1.0) * pow(uk, 1.3);
      vec2 pk = mix(uMassC, uMassEnd, pow(uk, 1.6));
      cov = max(cov, maskAt((q - pk) / sk + uMassC));
    }
    cov = max(cov, smoothstep(0.82, 1.0, u));
    vec3 base = mix(cA, cB, smoothstep(0.4, 0.6, cov));
    float s = 1.0 + (S - 1.0) * pow(u, 1.3);
    vec2 posNow = mix(uMassC, uMassEnd, pow(u, 1.6));
    vec2 mq = (q - posNow) / s + uMassC;
    float m = smoothstep(0.38, 0.62, maskAt(mq));
    // Continuità: la massa parte dall'aspetto reale del mondo (cA, con lo
    // stato accumulato) e solo poi passa al colore grezzo dell'immagine.
    vec3 massRaw = texture(uImgA, toT(mq, uCoverA)).rgb * mix(1.0, 0.8, u);
    vec3 massCol = mix(cA, massRaw, smoothstep(0.0, 0.2, u));
    color = mix(base, massCol, m);
  } else if (uKind == 4) {
    color = mix(cA, cB, smoothstep(0.35, 0.75, uTrans));
  } else if (uKind == 5) {
    // KINETIC MATCH: attorno all'ancora il campionamento resta A, immutato,
    // mentre fuori dall'ancora lo spazio si torce in modo palesemente
    // impossibile; superata metà corsa l'interno rivela la stessa regione
    // di schermo appartenente ora a B.
    float R = 0.24;
    vec2 aAnchor = uWA.anchor;
    vec2 bAnchor = uWB.anchor;
    float dA = length(q - aAnchor);
    float lock = 1.0 - smoothstep(R * 0.72, R, dA);
    vec2 rel = q - aAnchor;
    float warpAmt = smoothstep(0.0, 0.7, uTrans) * 0.9;
    float ang = warpAmt * (0.6 + 0.4 * sin(length(rel) * 14.0 + uTrans * 6.0));
    float ca_ = cos(ang);
    float sa_ = sin(ang);
    vec2 outQ = aAnchor + mat2(ca_, -sa_, sa_, ca_) * rel * (1.0 + 0.5 * warpAmt);
    vec3 outside = samp(uImgA, outQ, uCoverA);
    vec3 innerA = samp(uImgA, aAnchor + rel, uCoverA);
    vec3 innerB = samp(uImgB, bAnchor + rel, uCoverB);
    float reveal = smoothstep(0.55, 0.88, uTrans);
    vec3 inside = mix(innerA, innerB, reveal);
    vec3 kin = mix(outside, inside, lock);
    // Continuità agli estremi (log di prova: scarti fino a 60 al confine):
    // parte da cA e finisce in cB, invece di passare da/verso il campione
    // grezzo dell'immagine.
    color = mix(mix(cA, kin, smoothstep(0.0, 0.15, uTrans)), cB, smoothstep(0.72, 1.0, uTrans));
  } else if (uKind == 8) {
    // MORPH: qA/qB sono già stati tirati verso il proprio punto di fuga
    // sopra (mai una rivelazione a foro/iride) — usata da TRAVERSAL,
    // PERSPECTIVE MELT e HYPNOTIC ZOOM (disp. Capo Supremo, 2026-09-22: via
    // ogni effetto "buco della serratura"; 2026-09-24: deve leggersi come
    // trasformazione, non come dissolvenza piatta).
    color = mix(cA, cB, smoothstep(0.12, 0.88, uTrans));
  } else if (uKind == 7) {
    // FOCUS INVERSION: il piano di attenzione scivola dal primo piano
    // (nitido, saturo) allo sfondo (che acquista nitidezza e saturazione);
    // il vecchio primo piano resta come presenza sfocata.
    float u = uTrans;
    float dep = depthAt(uDepA, q, uCoverA);
    float fgMask = smoothstep(uWA.planes.y - 0.12, uWA.planes.y + 0.12, dep);
    float fgLod = mix(0.0, 3.2, u);
    float bgLod = mix(3.2, 0.0, u);
    vec3 aFg = textureLod(uImgA, toT(q, uCoverA), fgLod).rgb;
    vec3 aBg = textureLod(uImgA, toT(q, uCoverA), bgLod).rgb;
    float fgSat = mix(1.0, 0.3, u);
    float bgSat = mix(0.3, 1.0, u);
    vec3 aFgS = mix(vec3(dot(aFg, vec3(0.299, 0.587, 0.114))), aFg, fgSat);
    vec3 aBgS = mix(vec3(dot(aBg, vec3(0.299, 0.587, 0.114))), aBg, bgSat);
    vec3 base = mix(cA, mix(aBgS, aFgS, fgMask), smoothstep(0.0, 0.15, u));
    float reveal = smoothstep(0.55, 0.88, u);
    color = mix(base, cB, reveal);
  }
  outColor = vec4(color, 1.0);
}`

const COMPOSITE_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vFrag;
out vec4 outColor;
uniform sampler2D uFrame;
uniform sampler2D uHist0;
uniform sampler2D uHist1;
uniform sampler2D uHist2;
uniform vec3 uGhost[3];   // alpha, relative scale, unused
uniform vec2 uGhostV[3];  // fuga (spazio q) della cattura
uniform vec2 uGhostOff[3];

vec3 trace(sampler2D hist, vec2 q, vec2 V, float rel, vec2 off) {
  vec2 p = V + (q - V) / rel + off;
  vec2 t = vec2(p.x, 1.0 - p.y);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return vec3(0.0);
  vec3 base = textureLod(hist, t, 0.0).rgb;
  vec3 low = textureLod(hist, t, 3.0).rgb;
  float hp = dot(base - low, vec3(0.299, 0.587, 0.114));
  return base * 0.45 + vec3(max(hp, 0.0) * 3.2);
}

void main() {
  vec3 frame = texture(uFrame, vFrag).rgb;
  vec2 q = vec2(vFrag.x, 1.0 - vFrag.y);
  vec3 keep = vec3(1.0);
  if (uGhost[0].x > 0.001) keep *= 1.0 - clamp(trace(uHist0, q, uGhostV[0], uGhost[0].y, uGhostOff[0]) * uGhost[0].x, 0.0, 1.0);
  if (uGhost[1].x > 0.001) keep *= 1.0 - clamp(trace(uHist1, q, uGhostV[1], uGhost[1].y, uGhostOff[1]) * uGhost[1].x, 0.0, 1.0);
  if (uGhost[2].x > 0.001) keep *= 1.0 - clamp(trace(uHist2, q, uGhostV[2], uGhost[2].y, uGhostOff[2]) * uGhost[2].x, 0.0, 1.0);
  outColor = vec4(1.0 - (1.0 - frame) * keep, 1.0);
}`

const GHOST_LIFE_MS = 4_500
const GHOST_INTERVAL_MS = 1_300
const HISTORY_SCALE = 0.5

const KIND_INDEX = {
  fracture: 2,
  occlusion: 3,
  residual: 4,
  kinetic: 5,
  focus: 7,
  morph: 8,
} as const

type RasterGpu = {
  img: WebGLTexture
  depth: WebGLTexture
  mass: WebGLTexture
  flow: WebGLTexture
  hasFlow: boolean
  cover: [number, number]
  structure: AnimatronixStructure
}

type Ghost = {
  captureMs: number
  flight: number
  vp: [number, number]
  strength: number
  seed: number
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type) as WebGLShader
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader ANIMATRONIX: ${gl.getShaderInfoLog(shader) ?? 'errore'}`)
  }
  return shader
}

function link(gl: WebGL2RenderingContext, fragment: string): WebGLProgram {
  const program = gl.createProgram() as WebGLProgram
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`link ANIMATRONIX: ${gl.getProgramInfoLog(program) ?? 'errore'}`)
  }
  return program
}

export class AnimatronixGl {
  private readonly gl: WebGL2RenderingContext
  private readonly world: WebGLProgram
  private readonly composite: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private rasters: RasterGpu[] = []
  private width = 0
  private height = 0
  private frameTex: WebGLTexture | null = null
  private frameFbo: WebGLFramebuffer | null = null
  private histTex: WebGLTexture[] = []
  private histFbo: WebGLFramebuffer[] = []
  private ghosts: (Ghost | null)[] = [null, null, null]
  private nextGhost = 0
  private lastCaptureMs = -Infinity
  private lastKind: string | null = null
  private readonly uniforms = new Map<string, WebGLUniformLocation | null>()

  constructor(
    private readonly canvas: HTMLCanvasElement,
    preserveDrawingBuffer = false,
  ) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer,
      powerPreference: 'high-performance',
    })
    if (!gl) throw new Error('WebGL2 non disponibile per ANIMATRONIX')
    this.gl = gl
    this.world = link(gl, WORLD_FRAG)
    this.composite = link(gl, COMPOSITE_FRAG)
    this.vao = gl.createVertexArray() as WebGLVertexArrayObject
  }

  private loc(program: WebGLProgram, name: string) {
    const key = `${program === this.world ? 'w' : 'c'}:${name}`
    if (!this.uniforms.has(key)) {
      this.uniforms.set(key, this.gl.getUniformLocation(program, name))
    }
    return this.uniforms.get(key) ?? null
  }

  private texture(
    width: number,
    height: number,
    format: 'rgba' | 'r8',
    filter: 'linear' | 'mip',
    wrap: number,
  ): WebGLTexture {
    const gl = this.gl
    const tex = gl.createTexture() as WebGLTexture
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      filter === 'mip' ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    )
    if (format === 'rgba') {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null)
    }
    return tex
  }

  setRasters(
    bitmaps: ImageBitmap[],
    structures: AnimatronixStructure[],
    flows: (Float32Array | null)[] = [],
  ): void {
    const gl = this.gl
    this.disposeRasters()
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    this.rasters = bitmaps.map((bitmap, i) => {
      const structure = structures[i]
      const img = this.texture(bitmap.width, bitmap.height, 'rgba', 'mip', gl.MIRRORED_REPEAT)
      gl.bindTexture(gl.TEXTURE_2D, img)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
      gl.generateMipmap(gl.TEXTURE_2D)
      const grid = (data: Uint8Array) => {
        const tex = this.texture(structure.width, structure.height, 'r8', 'linear', gl.CLAMP_TO_EDGE)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.R8, structure.width, structure.height, 0,
          gl.RED, gl.UNSIGNED_BYTE, data,
        )
        return tex
      }
      const flowData = flows[i] ?? null
      const flowSize = flowData ? Math.round(Math.sqrt(flowData.length / 2)) : 1
      const flow = gl.createTexture() as WebGLTexture
      gl.bindTexture(gl.TEXTURE_2D, flow)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RG16F, flowSize, flowSize, 0, gl.RG, gl.FLOAT,
        flowData ?? new Float32Array(2),
      )
      return {
        img,
        depth: grid(structure.depthGrid),
        mass: grid(structure.massGrid),
        flow,
        hasFlow: flowData !== null,
        cover: [1, 1] as [number, number],
        structure,
      }
    })
    this.rasterSizes = bitmaps.map((b) => [b.width, b.height] as [number, number])
    this.ghosts = [null, null, null]
    this.lastCaptureMs = -Infinity
    this.updateCovers()
  }

  private rasterSizes: [number, number][] = []

  resize(width: number, height: number): void {
    const gl = this.gl
    const w = Math.max(2, Math.round(width))
    const h = Math.max(2, Math.round(height))
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
    this.releaseTargets()
    const frameTex = this.texture(w, h, 'rgba', 'linear', gl.CLAMP_TO_EDGE)
    const frameFbo = gl.createFramebuffer() as WebGLFramebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTex, 0)
    this.frameTex = frameTex
    this.frameFbo = frameFbo
    const hw = Math.max(2, Math.round(w * HISTORY_SCALE))
    const hh = Math.max(2, Math.round(h * HISTORY_SCALE))
    for (let i = 0; i < 3; i++) {
      const tex = this.texture(hw, hh, 'rgba', 'mip', gl.CLAMP_TO_EDGE)
      const fbo = gl.createFramebuffer() as WebGLFramebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      this.histTex.push(tex)
      this.histFbo.push(fbo)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.ghosts = [null, null, null]
    this.updateCovers()
  }

  private updateCovers(): void {
    if (!this.width || !this.height) return
    const canvasAspect = this.width / this.height
    this.rasters.forEach((raster, i) => {
      const [rw, rh] = this.rasterSizes[i] ?? [1, 1]
      const imgAspect = rw / rh
      raster.cover =
        canvasAspect > imgAspect ? [1, imgAspect / canvasAspect] : [canvasAspect / imgAspect, 1]
    })
  }

  private toQ(raster: RasterGpu, x: number, y: number): [number, number] {
    return [0.5 + (x - 0.5) / raster.cover[0], 0.5 + (y - 0.5) / raster.cover[1]]
  }

  private setWorld(prefix: string, raster: RasterGpu, state: AnimatronixWorldState, extraFlight = 0) {
    const gl = this.gl
    const p = this.world
    const [vx, vy] = this.toQ(raster, raster.structure.vanishing.x, raster.structure.vanishing.y)
    const [anx, any] = this.toQ(raster, raster.structure.anchor.x, raster.structure.anchor.y)
    gl.uniform1f(this.loc(p, `${prefix}.flight`), state.flight + extraFlight)
    gl.uniform1f(this.loc(p, `${prefix}.bend`), state.bend)
    gl.uniform1f(this.loc(p, `${prefix}.melt`), state.melt)
    gl.uniform1f(this.loc(p, `${prefix}.fracture`), state.fracture)
    gl.uniform1f(this.loc(p, `${prefix}.collapse`), state.collapse)
    gl.uniform1f(this.loc(p, `${prefix}.camera`), state.camera)
    gl.uniform1f(this.loc(p, `${prefix}.vertigo`), state.vertigo)
    gl.uniform1f(this.loc(p, `${prefix}.focus`), state.focus)
    gl.uniform1f(this.loc(p, `${prefix}.zoom`), state.zoom)
    gl.uniform2f(this.loc(p, `${prefix}.vp`), vx, vy)
    gl.uniform2f(this.loc(p, `${prefix}.anchor`), anx, any)
    gl.uniform2f(
      this.loc(p, `${prefix}.planes`),
      raster.structure.planeThresholds[0],
      raster.structure.planeThresholds[1],
    )
  }

  private bind(unit: number, tex: WebGLTexture, name: string, program: WebGLProgram) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(this.loc(program, name), unit)
  }

  render(frame: AnimatronixFrame, plan: AnimatronixPlan): void {
    const gl = this.gl
    if (!this.frameFbo || !this.frameTex || !this.rasters.length) return
    const segment = plan.segments[frame.segmentIndex]
    const a = this.rasters[segment.rasterIndex]
    const next = this.rasters[segment.rasterIndex + 1] ?? null
    const b = frame.transition && next ? next : null // senza raster successivo la transizione apre sul buio
    const kind = frame.transition ? KIND_INDEX[frame.transition.kind] : 0
    const tr = frame.transition?.progress ?? 0

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameFbo)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.world)
    gl.bindVertexArray(this.vao)
    this.bind(0, a.img, 'uImgA', this.world)
    this.bind(1, a.depth, 'uDepA', this.world)
    this.bind(2, a.mass, 'uMassA', this.world)
    const bRaster = b ?? a
    this.bind(3, bRaster.img, 'uImgB', this.world)
    this.bind(4, bRaster.depth, 'uDepB', this.world)
    this.bind(5, a.flow, 'uFlow', this.world)
    gl.uniform1f(this.loc(this.world, 'uHasFlow'), a.hasFlow && b ? 1 : 0)
    gl.uniform2f(this.loc(this.world, 'uCoverA'), a.cover[0], a.cover[1])
    gl.uniform2f(this.loc(this.world, 'uCoverB'), bRaster.cover[0], bRaster.cover[1])
    gl.uniform1f(this.loc(this.world, 'uAspect'), this.width / this.height)
    gl.uniform1f(this.loc(this.world, 'uCollapseMode'), plan.collapseMode)
    gl.uniform1f(this.loc(this.world, 'uBendSign'), plan.bendSign)
    gl.uniform1f(this.loc(this.world, 'uSlipAngle'), plan.slipAngle)
    gl.uniform1i(this.loc(this.world, 'uKind'), kind)
    gl.uniform1f(this.loc(this.world, 'uTrans'), tr)
    gl.uniform1f(this.loc(this.world, 'uHasB'), b ? 1 : 0)
    this.setWorld('uWA', a, frame.current)
    this.setWorld('uWB', bRaster, frame.incoming ?? frame.current)

    const s = a.structure
    const [cx, cy] = this.toQ(a, s.massCentroid.x, s.massCentroid.y)
    const [xl, yt] = this.toQ(a, s.massBounds.x0, s.massBounds.y0)
    const [xr, yb] = this.toQ(a, s.massBounds.x1, s.massBounds.y1)
    const heightQ = Math.max(0.12, yb - yt)
    const scaleEnd = Math.min(6, Math.max(1.8, 1.35 / heightQ))
    const endX =
      s.massDir > 0
        ? 1.05 - (xl - cx) * scaleEnd
        : -0.05 - (xr - cx) * scaleEnd
    gl.uniform2f(this.loc(this.world, 'uMassC'), cx, cy)
    gl.uniform2f(this.loc(this.world, 'uMassEnd'), endX, 0.5 + (cy - 0.5) * 0.4)
    gl.uniform1f(this.loc(this.world, 'uMassScaleEnd'), scaleEnd)

    gl.uniform1f(this.loc(this.world, 'uCrush'), frame.crush)
    gl.uniform1f(this.loc(this.world, 'uCrushFg'), frame.crushForeground ? 1 : 0)
    gl.uniform1f(this.loc(this.world, 'uZoomUsesAnchor'), segment.zoomTarget === 'anchor' ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    this.updateGhosts(frame, kind, tr)
    this.drawComposite(frame)
  }

  private updateGhosts(frame: AnimatronixFrame, kind: number, tr: number): void {
    const gl = this.gl
    const due =
      frame.elapsedMs - this.lastCaptureMs >= GHOST_INTERVAL_MS && frame.residual > 0.15
    const residualStart = kind === 4 && this.lastKind !== 'residual' && tr > 0
    this.lastKind = kind === 4 ? 'residual' : null
    if (!due && !residualStart) return
    const slot = this.nextGhost
    this.nextGhost = (this.nextGhost + 1) % 3
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.frameFbo)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.histFbo[slot])
    const hw = Math.max(2, Math.round(this.width * HISTORY_SCALE))
    const hh = Math.max(2, Math.round(this.height * HISTORY_SCALE))
    gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, hw, hh, gl.COLOR_BUFFER_BIT, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, this.histTex[slot])
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const raster = this.rasters[Math.min(this.rasters.length - 1, 0)]
    const seg = this.lastRasterIndexForFrame(frame)
    const ref = this.rasters[seg] ?? raster
    const [vx, vy] = this.toQ(ref, ref.structure.vanishing.x, ref.structure.vanishing.y)
    this.ghosts[slot] = {
      captureMs: frame.elapsedMs,
      flight: frame.current.flight,
      vp: [vx, vy],
      strength: residualStart ? 0.95 : 0.55 + 0.45 * frame.residual,
      seed: slot * 2.1 + frame.elapsedMs * 0.0007,
    }
    if (!residualStart) this.lastCaptureMs = frame.elapsedMs
  }

  private lastRasterIndexForFrame(frame: AnimatronixFrame): number {
    return Math.min(this.rasters.length - 1, frame.segmentIndex)
  }

  private drawComposite(frame: AnimatronixFrame): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.composite)
    gl.bindVertexArray(this.vao)
    this.bind(0, this.frameTex as WebGLTexture, 'uFrame', this.composite)
    for (let i = 0; i < 3; i++) this.bind(1 + i, this.histTex[i], `uHist${i}`, this.composite)
    const ghost = new Float32Array(9)
    const vp = new Float32Array(6)
    const off = new Float32Array(6)
    for (let i = 0; i < 3; i++) {
      const g = this.ghosts[i]
      if (!g) continue
      const age = frame.elapsedMs - g.captureMs
      const life = Math.max(0, 1 - age / GHOST_LIFE_MS)
      if (life <= 0) {
        this.ghosts[i] = null
        continue
      }
      const fadeIn = Math.min(1, Math.max(0, age / 700))
      ghost[i * 3] = g.strength * life * life * (fadeIn * fadeIn * (3 - 2 * fadeIn))
      ghost[i * 3 + 1] = 1 + 0.9 * Math.max(0, frame.current.flight - g.flight) + 0.07 * (age / 1000)
      vp[i * 2] = g.vp[0]
      vp[i * 2 + 1] = g.vp[1]
      off[i * 2] = Math.cos(g.seed) * 0.006 * (age / 1000)
      off[i * 2 + 1] = Math.sin(g.seed) * 0.004 * (age / 1000)
    }
    gl.uniform3fv(this.loc(this.composite, 'uGhost'), ghost)
    gl.uniform2fv(this.loc(this.composite, 'uGhostV'), vp)
    gl.uniform2fv(this.loc(this.composite, 'uGhostOff'), off)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  // Sincronizza con la GPU leggendo un pixel (collaudo dei tempi).
  finish(): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  }

  private releaseTargets(): void {
    const gl = this.gl
    if (this.frameTex) gl.deleteTexture(this.frameTex)
    if (this.frameFbo) gl.deleteFramebuffer(this.frameFbo)
    for (const t of this.histTex) gl.deleteTexture(t)
    for (const f of this.histFbo) gl.deleteFramebuffer(f)
    this.frameTex = null
    this.frameFbo = null
    this.histTex = []
    this.histFbo = []
  }

  private disposeRasters(): void {
    const gl = this.gl
    for (const r of this.rasters) {
      gl.deleteTexture(r.img)
      gl.deleteTexture(r.depth)
      gl.deleteTexture(r.mass)
      gl.deleteTexture(r.flow)
    }
    this.rasters = []
  }

  dispose(): void {
    this.disposeRasters()
    this.releaseTargets()
    const gl = this.gl
    gl.deleteProgram(this.world)
    gl.deleteProgram(this.composite)
    gl.deleteVertexArray(this.vao)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
