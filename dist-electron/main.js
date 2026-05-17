import { screen as h, app as r, BrowserWindow as g, ipcMain as a } from "electron";
import c from "node:fs";
import u from "node:path";
const i = {
  getDisplays: "fx:get-displays",
  openOutput: "fx:open-output",
  closeOutput: "fx:close-output",
  saveSettings: "fx:save-settings",
  loadSettings: "fx:load-settings",
  sendVisualState: "fx:send-visual-state",
  /** Main → output renderer */
  visualStatePush: "fx:visual-state-push",
  outputClosed: "fx:output-closed"
};
function C() {
  return h.getAllDisplays().map((e) => ({
    id: e.id,
    label: e.label ?? `Display ${e.id}`,
    bounds: { ...e.bounds },
    size: { width: e.size.width, height: e.size.height },
    scaleFactor: e.scaleFactor,
    internal: e.internal ?? !1
  }));
}
const p = {
  fftSize: 1024,
  smoothingTimeConstant: 0.75,
  lowThresholdMultiplier: 1.45,
  lowMidThresholdMultiplier: 1.6,
  midThresholdMultiplier: 1.7,
  highThresholdMultiplier: 1.8,
  flashDurationMs: 80,
  decayMs: 220,
  cooldownMs: 130,
  sensitivity: 1,
  maxFlashesPerSecond: 5,
  idleColor: "#050005",
  basePinkColor: "#ff4fd8",
  hotPinkColor: "#ff8bea",
  whiteFlashColor: "#ffffff",
  softMode: !1,
  selectedDisplayId: null,
  selectedAudioInputId: null
}, x = "origine-fx-settings.json";
function y() {
  return u.join(r.getPath("userData"), x);
}
function v() {
  const e = y();
  try {
    if (!c.existsSync(e)) return { ...p };
    const n = c.readFileSync(e, "utf-8"), o = JSON.parse(n);
    return { ...p, ...o };
  } catch {
    return { ...p };
  }
}
function F(e) {
  const n = y();
  c.mkdirSync(u.dirname(n), { recursive: !0 }), c.writeFileSync(n, JSON.stringify(e, null, 2), "utf-8");
}
let s = null, t = null;
function w() {
  return r.getAppPath();
}
function b() {
  return u.join(w(), "dist-electron", "preload.cjs");
}
function S() {
  if (s && !s.isDestroyed())
    return s.focus(), s;
  const e = h.getPrimaryDisplay(), n = 40;
  return s = new g({
    x: e.workArea.x + n,
    y: e.workArea.y + n,
    width: 980,
    height: 900,
    title: "Origine FX",
    webPreferences: {
      preload: b(),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), s.loadFile(u.join(w(), "dist", "control.html")), s.webContents.openDevTools({ mode: "detach" }), s.on("closed", () => {
    s = null;
  }), s;
}
function m() {
  t && !t.isDestroyed() && t.close(), t = null;
}
function P(e) {
  console.log(`[main] createOutputWindow called displayId=${e}`);
  const o = h.getAllDisplays().find((l) => l.id === e);
  if (!o)
    return { ok: !1, error: "Display non trovato" };
  m(), t = new g({
    x: o.bounds.x,
    y: o.bounds.y,
    width: o.bounds.width,
    height: o.bounds.height,
    frame: !1,
    // On macOS, simpleFullscreen avoids the Space animation that can crash frameless windows
    simpleFullscreen: process.platform === "darwin",
    fullscreen: process.platform !== "darwin",
    backgroundColor: "#050005",
    show: !1,
    // wait for ready-to-show before displaying
    skipTaskbar: !0,
    autoHideMenuBar: !0,
    webPreferences: {
      preload: b(),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), t.once("ready-to-show", () => {
    console.log("[main] output window ready-to-show"), t == null || t.show(), process.platform === "darwin" ? t == null || t.setSimpleFullScreen(!0) : t == null || t.setFullScreen(!0);
  }), t.webContents.on("did-fail-load", (l, f, D) => {
    console.error(`[main] output did-fail-load: ${f} ${D}`);
  }), t.webContents.on("render-process-gone", (l, f) => {
    console.error("[main] output render-process-gone:", f);
  });
  {
    const l = u.join(w(), "dist", "output.html");
    console.log(`[main] loading output.html from ${l}`), t.loadFile(l);
  }
  return t.setMenuBarVisibility(!1), t.on("closed", () => {
    console.log("[main] output window CLOSED"), t = null;
    const l = s;
    l && !l.isDestroyed() && l.webContents.send(i.outputClosed);
  }), { ok: !0 };
}
let d = 0;
function k(e) {
  if (d++, d <= 5 || d % 120 === 0) {
    const n = t !== null && !t.isDestroyed();
    console.log(`[main] broadcast #${d} outputWindow=${n}`);
  }
  t && !t.isDestroyed() && t.webContents.send(i.visualStatePush, e);
}
function M() {
  a.handle(i.getDisplays, () => C()), a.handle(i.openOutput, (n, o) => P(o)), a.handle(i.closeOutput, () => {
    m();
  }), a.handle(i.saveSettings, (n, o) => {
    F(o);
  }), a.handle(i.loadSettings, () => v());
  let e = 0;
  a.on(i.sendVisualState, (n, o) => {
    e++, (e <= 5 || e % 120 === 0) && console.log(`[main] sendVisualState #${e}`, o.backgroundColor), k(o);
  });
}
r.on("window-all-closed", () => {
  process.platform !== "darwin" && r.quit();
});
r.on("activate", () => {
  g.getAllWindows().length === 0 && S();
});
r.whenReady().then(() => {
  M(), S();
});
r.on("before-quit", () => {
  m();
});
