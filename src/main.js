import * as THREE from 'three';
import { Builder, V, canvasTex } from './util.js';
import { makeMats } from './mats.js';
import { Nav } from './nav.js';
import { buildHull, buildProps, ST, rLin, MAIN, keelY, ENG, A_Y, B_Y, G_Y, G_YC, GX0, GX1, hw, FIN_OUT } from './hull.js';
import { buildDecks, START } from './decks.js';
import { buildKeel } from './keel.js';
import { buildWorld, TIMES } from './world.js';
import { Player } from './player.js';
import { makeSigns } from './signs.js';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);

// ---------- Ladeanzeige und Fehlerhinweise ----------
const bootT0 = performance.now(), bootLog = [];
function progress(frac, step) {
  const bar = $('loadBar'), st = $('loadStep');
  if (bar) { bar.style.width = (Math.max(0.02, Math.min(1, frac)) * 100).toFixed(1) + '%'; bar.parentElement.classList.remove('wait'); }
  if (st && step) st.textContent = step;
}
/** Hinweis statt weißer Seite (fehlendes WebGL, Fehler beim Aufbau, verlorener Grafikkontext) */
function notice(title, text, { reload = true, keep = false } = {}) {
  let el = $('notice');
  if (!el) { el = document.createElement('div'); el.id = 'notice'; el.className = 'ov'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
  el.innerHTML = `<div class="card"><h1 style="font-size:24px">${title}</h1><p class="lead">${text}</p>${reload ? '<button id="noticeR">Seite neu laden</button>' : ''}</div>`;
  el.style.display = 'flex'; el.dataset.keep = keep ? '1' : '';
  if (reload) $('noticeR').onclick = () => location.reload();
  const ld = $('load'); if (ld) ld.style.display = 'none';
}
const hideNotice = () => { const el = $('notice'); if (el) el.style.display = 'none'; };
function hasWebGL2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (_) { return false; } }

// ---------- Renderer ----------
const canvas = $('c');
let renderer = null;
if (!hasWebGL2()) {
  notice('3D-Grafik nicht verfügbar', 'Dieser Browser oder dieses Gerät stellt kein WebGL 2 bereit, das die Rekonstruktion benötigt. Bitte einen aktuellen Browser (Chrome, Edge, Firefox, Safari ab Version 15) verwenden und in den Einstellungen die Hardwarebeschleunigung einschalten.', { reload: false });
  throw new Error('WebGL 2 nicht verfügbar');
}
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  notice('3D-Grafik nicht verfügbar', 'Die Grafik konnte nicht gestartet werden (' + (err && err.message ? err.message : err) + '). Bitte Hardwarebeschleunigung prüfen oder einen anderen Browser versuchen.');
  throw err;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
{ // Das Schattenbild prüft die Ebenen der Hauptkamera: währenddessen auch Ebene 1 zulassen (per LOD ausgeblendete Teile werfen weiter Schatten)
  const sr = renderer.shadowMap.render;
  renderer.shadowMap.render = function (lights, sc, cam) { const m = cam.layers.mask; cam.layers.mask = m | 2; try { sr.call(this, lights, sc, cam); } finally { cam.layers.mask = m; } };
}
let composer = null, aoPass = null;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 16000);

// ---------- Qualität: feste Stufen und automatische Anpassung ----------
// Stufenleiter von „beste“ nach „sparsamste“: erst Pixelverhältnis, dann LOD-Reichweite, zuletzt Effekte/Schatten.
// pr = höchstes Pixelverhältnis, lod = Faktor auf die Sichtweiten der Klein-/Mittelteile, ao = Umgebungsverschattung, sh = Schatten
const LADDER = [
  { pr: 2, lod: 1, ao: true, sh: true }, { pr: 1.5, lod: 1, ao: true, sh: true }, { pr: 1.5, lod: 1, ao: false, sh: true },
  { pr: 1.25, lod: 1, ao: false, sh: true }, { pr: 1, lod: 1, ao: false, sh: true }, { pr: 1, lod: 0.75, ao: false, sh: true },
  { pr: 1, lod: 0.55, ao: false, sh: true }, { pr: 0.85, lod: 0.55, ao: false, sh: false }, { pr: 0.7, lod: 0.45, ao: false, sh: false },
];
const QN = ['Niedrig', 'Mittel', 'Hoch', 'Auto'], FIXED = [LADDER[4], LADDER[2], LADDER[0]]; // Niedrig/Mittel/Hoch wie bisher (1 / 1,5 / 2 + AO)
const DPR = () => devicePixelRatio || 1;
const eff = (s) => `${Math.min(DPR(), s.pr)}|${s.lod}|${s.ao}|${s.sh}`;
let qual = 3; // Standard: Auto
const auto = { lvl: touch ? 2 : 0, ceil: touch ? 2 : 0, win: { n: 0, iv: 0, load: 0, t: 0 }, bad: 0, good: 0, cool: 2, upAt: -1e9, block: {}, back: {}, log: [] };
let Q = LADDER[auto.lvl];
let markerMat = null; // Material der Infopunkt-Marker (Größe hängt vom Bildwinkel ab)
function resize() {
  renderer.setPixelRatio(Math.min(DPR(), Q.pr));
  renderer.setSize(innerWidth, innerHeight, false);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
  camera.aspect = innerWidth / Math.max(1, innerHeight); camera.fov = innerWidth < innerHeight ? 82 : 72; camera.updateProjectionMatrix();
  if (markerMat) markerMat.size = markerSize();
}
// Unterkante der Knopfleiste als CSS-Variable: Standortanzeige und Infotafel rücken darunter, egal wie oft die Leiste umbricht
const barB = () => { const r = $('bar').getBoundingClientRect(); document.documentElement.style.setProperty('--barB', Math.round(r.bottom) + 'px'); };
addEventListener('resize', () => { resize(); barB(); }); resize(); barB();

// ---------- Schiff aufbauen ----------
const M = makeMats(), nav = new Nav(), b = new Builder(), ship = new THREE.Group(); scene.add(ship);
const infos = [], portals = [], tps = [], actions = [];
const yearGroups = { 1936: new THREE.Group(), 1937: new THREE.Group() }; ship.add(yearGroups[1936], yearGroups[1937]);
const modeGroups = { flug: new THREE.Group(), mast: new THREE.Group() }; ship.add(modeGroups.flug, modeGroups.mast); modeGroups.mast.visible = false;
// Fahrzustand, den die Bedienelemente der Führergondel verändern und den Umgebung, Propeller und Anzeigen lesen
const live = (o) => (!o.mode || o.mode === sim.mode) && (!o.only || o.only === sim.year); // gilt das Element im aktuellen Zustand?
const sim = { speed: 34, alt: 300, pitch: 0, heading: 0, mode: 'flug', year: 1936 };
const C = {
  b, M, nav, root: ship,
  info: (title, text, x, y, z) => infos.push({ title, text, pos: V(x, y, z), mode: nav.mtag, only: nav.tag }),
  portal: (name, a, c, up, down) => portals.push({ name, a, c, up, down, mode: nav.mtag, only: nav.tag }),
  tp: (name, x, y, z, h) => tps.push({ name, x, y, z, h, mode: nav.mtag, only: nav.tag }),
  scene, sim, camera,
  /** Ton: ctx/out sind erst nach dem ersten Klick gesetzt (onAudio), on = Ton eingeschaltet */
  audio: { ctx: null, out: null, on: false },
  /** bedienbares Element: { label: Text oder () => Text, pos: Vector3, range?: m, onUse: () => void } */
  action: (a) => { actions.push(a); return a; },
  /** alles in fn Gebaute (Builder, Schilder, Zonen, Blocker) gilt nur für das Jahr 1936 bzw. 1937 */
  /** alles in fn Gebaute gilt nur im Flug ('flug') bzw. nur am Ankermast ('mast') */
  mode: (m, fn) => b.only(m, () => { nav.mtag = m; signs.tag(m); try { fn(); } finally { nav.mtag = null; signs.tag(''); } }),
  only: (year, fn) => b.only(year, () => { nav.tag = year; signs.tag(year); try { fn(); } finally { nav.tag = null; signs.tag(''); } }),
};
const signs = makeSigns(); C.sign = signs.sign; C.gauge = signs.gauge; C.panel = signs.panel;
// Detailmodule (detail_*.js, feature_*.js): jedes exportiert default function(C). Sie werden als eigene Dateien
// nachgeladen (paralleler Download, kleineres Hauptskript); ein fehlerhaftes Modul legt den Rest nicht lahm.
const detailMods = { ...import.meta.glob('./detail_*.js'), ...import.meta.glob('./feature_*.js') };
const MOD_LABEL = { adeck: 'A-Deck', bdeck: 'B-Deck', exterior: 'Außenhaut', gondola: 'Führergondel', keel: 'Kielgang und Laufwege', controls: 'Steuerstand', mast: 'Ankermast und Landefeld', sound: 'Motorenklang' };
const modules = [];
let hull = null, props = [], world = null, iMat = null, lodList = [], innerList = [], dynLod = [], markers = null;
const roomLights = [];
const player = new Player(camera, nav, canvas, $('joy')); C.player = player;

// Entfernungsstaffelung: Kleinteile bis LOD[2] m, mittlere Teile bis LOD[1] m sichtbar (Faktor Q.lod je Qualitätsstufe)
const LODD = touch ? [0, 70, 22] : [0, 110, 38], lodD = [0, 0, 0], lodAt = new THREE.Vector3(1e9, 0, 0);
let lodFreeze = 0, lodAll = false, lodDirty = true;
// Teile tief im Schiffsinneren (Builder: userData.inner) sind von außen nie zu sehen: die Hülle ist undurchsichtig, und
// Fenster, Gondel, Fallreeps und Maschinenluken liegen in ausgesparten Bereichen (innerPart).
const COS5 = Math.cos(Math.PI / 36), OPEN_X = [[170.5, 191], [195, 211], [36, 48], ...ENG.map((e) => [e.x - 4, e.x + 4])];
const innerPart = (x0, x1, y0, y1, z0, z1) => {
  if (x0 < 3 || x1 > 244 || OPEN_X.some(([a, c]) => x1 > a && x0 < c)) return false;
  const r = Math.min(rLin(x0), rLin(x1)) * COS5 - 0.3;
  return Math.hypot(Math.max(-y0, y1), Math.max(-z0, z1)) < r;
};
b.inner = innerPart;
/** Kamera sicher außerhalb der Hülle (Außenflug, Boden der Mastszene) – nicht in der Nähe von Öffnungen, durch die man hineinsieht */
function camOutside(p) {
  if (p.x > 196 && p.x < 210 && p.y < -14 && Math.abs(p.z) < 4) return false; // in/an der Führergondel: Luke nach oben
  if (sim.mode === 'mast' && Math.abs(p.x - 174) < 30) return false; // offene Fallreeps
  for (const e of ENG) if (p.distanceTo(e.c) < 14) return false; // Maschinengondel mit Laufsteg und Luke
  if (p.x < 2 || p.x > 246.7) return true;
  return Math.hypot(p.y, p.z) > rLin(p.x) + 0.6;
}
const _lv = new THREE.Vector3();
function updateLod() {
  const p = camera.position, all = lodFreeze > 0; if (all) lodFreeze--;
  // nur neu prüfen, wenn sich die Kamera merklich bewegt hat oder sich etwas geändert hat
  if (!all && !lodAll && !lodDirty && lodAt.distanceToSquared(p) < 0.25) return;
  lodAll = all; lodDirty = false; lodAt.copy(p);
  lodD[1] = LODD[1] * Q.lod; lodD[2] = LODD[2] * Q.lod;
  const out = !all && camOutside(p);
  // Ausblenden über die Ebenen statt über visible: Ebene 0 = Kamerabild, Ebene 1 = Schattenbild. Ausgeblendete Teile
  // behalten Ebene 1 und werfen weiter Schatten – das Schattenbild braucht so kein Bild mit allen Teilen mehr, und die
  // Module können visible ihrer eigenen Meshes weiter selbst schalten.
  for (const m of lodList) {
    const u = m.userData, c = u.lodC, d = lodD[u.lodK] + u.lodR;
    m.layers.mask = all || (!(out && u.inner) && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 + (c.z - p.z) ** 2 < d * d) ? 3 : 2;
  }
  for (const m of innerList) m.layers.mask = out ? 2 : 3;
  // bewegliche Kleinteile der Module
  for (const m of dynLod) {
    const u = m.userData; _lv.copy(u.dynC).applyMatrix4(m.matrixWorld); const d = lodD[u.dynK] + u.dynR;
    m.layers.mask = all || _lv.distanceToSquared(p) < d * d ? 3 : 2;
  }
}
/** nach dem Aufbau: Entfernungsstaffelung auch für die eigenen (beweglichen) Meshes der Module */
function collectDynLod() {
  dynLod = []; const s = new THREE.Vector3();
  ship.traverse((o) => {
    if (!o.isMesh || o.userData.built || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || o.material.transparent) return;
    const g = o.geometry; if (!g.attributes.position) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    o.updateWorldMatrix(true, false); o.matrixWorld.decompose(_lv, new THREE.Quaternion(), s);
    const r = g.boundingSphere.radius * Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)), k = 2 * r < 0.4 ? 2 : 2 * r < 2.2 ? 1 : 0;
    if (!k) return;
    o.userData.dynC = g.boundingSphere.center.clone(); o.userData.dynR = r; o.userData.dynK = k; dynLod.push(o);
  });
}
/** Punktgröße, die einem 0,2 m großen Sprite entspricht (PointsMaterial: Pixel = size · Höhe/2 / Tiefe) */
function markerSize() { return 0.2 / Math.tan(camera.fov * Math.PI / 360); }
function updMarkers() {
  markers.userData.dirty = false;
  const a = []; for (const i of infos) if (i.sprite.visible) a.push(i.pos.x, i.pos.y, i.pos.z);
  markers.geometry.dispose(); markers.geometry = new THREE.BufferGeometry();
  markers.geometry.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
}
function setTime(i) {
  world.set(i, M, renderer);
  const k = [3, 2.5, 5, 9][i]; // tagsüber schwach, damit fensterlose Räume nicht flach wirken
  for (const l of roomLights) { l.visible = k > 0; l.intensity = k; }
}

// Nachbearbeitung: Umgebungsverschattung (Stufe „Hoch“ bzw. Auto auf starken Geräten); wird erst bei Bedarf nachgeladen
let postLoading = null;
function ensurePost() {
  if (composer || postLoading) return postLoading;
  postLoading = Promise.all([
    import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/GTAOPass.js'), import('three/addons/postprocessing/OutputPass.js'),
  ]).then(([{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }]) => {
    // Das Zwischenbild trägt eine Tiefentextur: GTAO liest die Tiefe des normalen Durchgangs und rekonstruiert daraus die
    // Normalen, statt die ganze Szene ein zweites Mal (mit Normalenmaterial) zu zeichnen – halbiert die Zeichenaufrufe
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(innerWidth, innerHeight) });
    const cp = new EffectComposer(renderer, rt);
    cp.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
    {
      // Normalen einmal je Bildpunkt aus der Tiefe in ein eigenes Bild schreiben (ein Vollbilddurchgang); GTAO und Entrauschen
      // lesen sie von dort, statt sie für jede Stichprobe neu aus der Tiefe zu rekonstruieren
      const nrt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
      const nMat = new THREE.ShaderMaterial({
        uniforms: { tDepth: { value: null }, cameraProjectionMatrixInverse: { value: new THREE.Matrix4() } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform sampler2D tDepth; uniform mat4 cameraProjectionMatrixInverse; varying vec2 vUv;
          #include <packing>
          vec3 vp(vec2 uv, float d){ vec4 c = vec4(vec3(uv, d) * 2.0 - 1.0, 1.0); vec4 v = cameraProjectionMatrixInverse * c; return v.xyz / v.w; }
          float fd(ivec2 p){ return texelFetch(tDepth, p, 0).x; }
          void main(){
            vec2 size = vec2(textureSize(tDepth, 0)); ivec2 p = ivec2(vUv * size); float c0 = fd(p);
            if (c0 >= 1.0) { gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); return; }
            float l2 = fd(p - ivec2(2, 0)), l1 = fd(p - ivec2(1, 0)), r1 = fd(p + ivec2(1, 0)), r2 = fd(p + ivec2(2, 0));
            float b2 = fd(p - ivec2(0, 2)), b1 = fd(p - ivec2(0, 1)), t1 = fd(p + ivec2(0, 1)), t2 = fd(p + ivec2(0, 2));
            float dl = abs((2.0 * l1 - l2) - c0), dr = abs((2.0 * r1 - r2) - c0), db = abs((2.0 * b1 - b2) - c0), dt = abs((2.0 * t1 - t2) - c0);
            vec3 ce = vp(vUv, c0);
            vec3 dpdx = (dl < dr) ? ce - vp(vUv - vec2(1.0 / size.x, 0.0), l1) : -ce + vp(vUv + vec2(1.0 / size.x, 0.0), r1);
            vec3 dpdy = (db < dt) ? ce - vp(vUv - vec2(0.0, 1.0 / size.y), b1) : -ce + vp(vUv + vec2(0.0, 1.0 / size.y), t1);
            gl_FragColor = vec4(packNormalToRGB(normalize(cross(dpdx, dpdy))), 1.0);
          }`,
        depthTest: false, depthWrite: false,
      });
      ao.setGBuffer(rt.depthTexture, nrt.texture);
      ao.gtaoMaterial.defines.DEPTH_SWIZZLING = 'x'; ao.pdMaterial.defines.DEPTH_SWIZZLING = 'x';
      const r0 = ao.render.bind(ao), s0 = ao.setSize.bind(ao);
      ao.setSize = (w, h) => { s0(w, h); nrt.setSize(w, h); };
      ao.render = (r, wb, rb, ...rest) => { // nach jedem Pufferwechsel die Tiefe des gerade gezeichneten Bildes verwenden
        const d = rb.depthTexture;
        if (d && ao.depthTexture !== d) { ao.depthTexture = d; ao.gtaoMaterial.uniforms.tDepth.value = d; ao.pdMaterial.uniforms.tDepth.value = d; }
        nMat.uniforms.tDepth.value = d; nMat.uniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
        ao.renderPass(r, nMat, nrt);
        return r0(r, wb, rb, ...rest);
      };
    }
    ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.3, thickness: 1.2, scale: 1.3, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
    // Durchscheinendes, Himmel, Meer und Wolken zählen nicht zur Verschattung (Liste zwischengespeichert statt jedes Bild die Szene zu durchlaufen)
    const ov = ao.overrideVisibility.bind(ao), rv = ao.restoreVisibility.bind(ao), hidden = [];
    let cand = [], candT = -1;
    ao.overrideVisibility = () => {
      ov(); hidden.length = 0;
      const now = performance.now();
      if (now - candT > 2000) { candT = now; cand = []; scene.traverse((o) => { if (o.isSprite || (o.isMesh && (o.material.transparent || o.material.isShaderMaterial))) cand.push(o); }); }
      for (const o of cand) if (o.visible) { o.visible = false; hidden.push(o); }
    };
    ao.restoreVisibility = () => { rv(); for (const o of hidden) o.visible = true; };
    cp.addPass(ao); cp.addPass(new OutputPass());
    composer = cp; aoPass = ao; resize();
  }).catch((err) => { console.error('Nachbearbeitung nicht verfügbar:', err); composer = null; });
  return postLoading;
}

/** Qualitätseinstellung anwenden (Pixelverhältnis, LOD-Faktor, AO, Schatten) */
function applyQ(s) {
  const prev = Q; Q = s;
  if (s.ao) ensurePost();
  if (prev.pr !== s.pr) resize();
  if (prev.lod !== s.lod) lodDirty = true;
  if (world && world.sun.castShadow !== s.sh) { world.sun.castShadow = s.sh; renderer.shadowMap.needsUpdate = true; }
}

// ---------- Bildzeitmessung ----------
// CPU-Zeit je Abschnitt (gleitender Mittelwert, ms) und, wo der Browser es erlaubt, GPU-Zeit über EXT_disjoint_timer_query
const prof = { player: 0, modules: 0, world: 0, ui: 0, lod: 0, render: 0, cpu: 0, gpu: null, interval: 0 };
const gl = renderer.getContext(), tq = gl.getExtension('EXT_disjoint_timer_query_webgl2');
let tqQ = null, tqBusy = false, tqOn = false;
function gpuPoll() {
  if (!tq || !tqBusy) return;
  if (!gl.getQueryParameter(tqQ, gl.QUERY_RESULT_AVAILABLE)) return;
  const ms = gl.getQueryParameter(tqQ, gl.QUERY_RESULT) / 1e6; tqBusy = false;
  // Ausreißer (Hochladen, neues Schattenbild) nicht in den Mittelwert
  if (!gl.getParameter(tq.GPU_DISJOINT_EXT) && ms < 150) prof.gpu = prof.gpu == null ? ms : prof.gpu + (ms - prof.gpu) * 0.2;
}
function gpuBegin() { if (!tq || tqBusy || lost) return; if (!tqQ) tqQ = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, tqQ); tqOn = true; }
function gpuEnd() { if (!tqOn) return; gl.endQuery(tq.TIME_ELAPSED_EXT); tqOn = false; tqBusy = true; }

/** Auto-Qualität: je Sekunde auswerten; abwärts nach 3 schlechten Sekunden, aufwärts nach 8 guten, mit Sperrzeit gegen Pumpen */
function autoTick(ivMs, loadMs) {
  if (qual !== 3) return;
  const w = auto.win;
  if (ivMs > 250 || document.hidden) { w.n = 0; w.iv = 0; w.load = 0; w.t = 0; return; } // Ladehänger, Tab im Hintergrund
  w.n++; w.iv += ivMs; w.load += loadMs; w.t += ivMs;
  if (w.t < 1000) return;
  const iv = w.iv / w.n, load = w.load / w.n, gpuKnown = prof.gpu != null; w.n = 0; w.iv = 0; w.load = 0; w.t = 0;
  if (auto.cool > 0) { auto.cool--; return; }
  // langsam = unter ~48 Bildern/s UND (falls messbar) tatsächlich ausgelastet – eine gedrosselte Bildrate ohne Last zählt nicht
  const slow = iv > 21 && (!gpuKnown || load > 0.7 * iv);
  const fast = gpuKnown ? load < 8.5 && iv < 40 : iv < 17.8;
  auto.bad = slow ? auto.bad + 1 : 0; auto.good = fast ? auto.good + 1 : 0;
  const now = performance.now(), L = auto.lvl;
  // Hat das Herunterschalten nichts gebracht (Bildrate vom Browser/Energiesparmodus gedeckelt statt Last)?
  // Nach zwei wirkungslosen Schritten zurück auf die Ausgangsstufe und eine Weile nicht weiter senken.
  if (auto.pendIv) {
    auto.useless = iv > auto.pendIv * 0.9 ? (auto.useless || 0) + 1 : 0; auto.pendIv = 0;
    if (auto.useless >= 2) { auto.useless = 0; auto.freeze = now + 120000; setAuto(auto.chain, 'Senken wirkungslos'); return; }
  }
  if (auto.freeze > now) auto.bad = 0;
  const step = (dir) => { // nächste Stufe mit tatsächlich anderer Wirkung
    let n = L; do n += dir; while (n > 0 && n < LADDER.length - 1 && eff(LADDER[n]) === eff(LADDER[L]));
    return Math.max(0, Math.min(LADDER.length - 1, n));
  };
  if (auto.bad >= 3 && L < LADDER.length - 1) {
    const n = step(1);
    if (now - auto.upAt < 15000) { // gerade erst hochgeschaltet und gleich wieder zu langsam: diese Stufe eine Weile sperren
      auto.back[L] = Math.min(300000, (auto.back[L] || 15000) * 2); auto.block[L] = now + auto.back[L];
    }
    if (!auto.useless) auto.chain = L;
    setAuto(n, 'langsam ' + iv.toFixed(1) + ' ms'); auto.pendIv = iv;
  } else if (auto.good >= 8 && L > auto.ceil) {
    const n = Math.max(auto.ceil, step(-1));
    if (!(auto.block[n] > now)) { auto.upAt = now; setAuto(n, 'Luft ' + iv.toFixed(1) + ' ms'); }
  }
}
function setAuto(n, why) {
  auto.lvl = n; auto.bad = auto.good = 0; auto.cool = 2;
  auto.log.push([Math.round(performance.now() / 1000), n, why]); if (auto.log.length > 40) auto.log.shift();
  applyQ(LADDER[n]); updQualLabel();
}
function updQualLabel() {
  $('bQual').textContent = 'Qualität: ' + QN[qual]; barB();
  $('bQual').title = qual === 3 ? `automatisch angepasst (Stufe ${auto.lvl + 1} von ${LADDER.length}, Pixelverhältnis ${renderer.getPixelRatio().toFixed(2)})` : '';
}
function setQual(q) {
  qual = q;
  if (q === 3) { auto.bad = auto.good = 0; auto.cool = 2; applyQ(LADDER[auto.lvl]); } else applyQ(FIXED[q]);
  updQualLabel();
}

// ---------- Grafikkontext verloren / wiederhergestellt ----------
let lost = false, lostTimer = 0, freedCPU = false;
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); lost = true; tqQ = null; tqBusy = tqOn = false;
  notice('Grafik wird wiederhergestellt …', 'Der Browser hat die 3D-Grafik vorübergehend zurückgesetzt (z. B. wegen Speichermangel oder eines Treiberwechsels). Die Ansicht kommt in der Regel nach wenigen Sekunden von selbst zurück.', { reload: false });
  clearTimeout(lostTimer);
  lostTimer = setTimeout(() => { if (lost) notice('Grafik nicht wiederhergestellt', 'Die 3D-Grafik konnte nicht zurückgeholt werden. Bitte die Seite neu laden; bei wiederholtem Auftreten im Menü „Qualität“ eine niedrigere Stufe wählen.'); }, 6000);
}, false);
canvas.addEventListener('webglcontextrestored', () => {
  lost = false; clearTimeout(lostTimer);
  // auf Touch-Geräten sind die Geometriedaten nach dem Hochladen freigegeben: dann geht es nur über einen Neustart
  if (freedCPU) { notice('Grafik zurückgesetzt', 'Zum Fortsetzen wird die Seite neu geladen …', { reload: true }); setTimeout(() => location.reload(), 1200); return; }
  hideNotice();
  if (world) setTime(world.idx); // Spiegelungsumgebung neu erzeugen
  renderer.shadowMap.needsUpdate = true; lodDirty = true;
}, false);

// ---------- Oberfläche ----------
const ui = { info: null, cand: null, started: false };
function openOv(id, on) { $(id).style.display = on ? 'flex' : 'none'; if (on && document.pointerLockElement) document.exitPointerLock(); player.enabled = ui.started && !ovOpen(); }
const ovOpen = () => $('start').style.display !== 'none' || $('map').style.display !== 'none';
function showInfo(i) {
  ui.info = i; $('info').style.display = i ? 'block' : 'none'; document.body.classList.toggle('infoOpen', !!i);
  if (i) { $('infoT').textContent = i.title; $('infoP').textContent = i.text; }
}
function activate() {
  const c = ui.cand; if (!c) return;
  if (c.info) showInfo(ui.info === c.info ? null : c.info);
  else if (c.portal) { showInfo(null); player.climb(c.to); }
  else if (c.action) c.action.onUse();
  candT = 0; // Auswahl sofort neu bestimmen
}
function setFly(on) { player.setFly(on); $('bFly').classList.toggle('on', on); document.body.classList.toggle('fly', on); if (on) showInfo(null); }
function setCells(on) { hull.cells.visible = on; $('bCells').classList.toggle('on', on); }
function nextTime() { const i = (world.idx + 1) % TIMES.length; setTime(i); $('bTime').textContent = TIMES[i].name; }
function refreshLive() { for (const i of infos) if (i.sprite) i.sprite.visible = live(i); buildMap(); }
function setYear(y) {
  sim.year = y; nav.year = y; yearGroups[1936].visible = y === 1936; yearGroups[1937].visible = y === 1937;
  ship.traverse((o) => { if (o.userData.year) o.visible = o.userData.year === y; });
  $('bYear').textContent = String(y); for (const m of modules) if (m.onYear) m.onYear(y, C);
  renderer.shadowMap.needsUpdate = true; lodDirty = true; refreshLive();
  const r = nav.ok(player.pos.x, player.pos.z, player.pos.y, 0.25, true); if (!r && !player.fly) go(...START);
}
function setMode(m) {
  sim.mode = m; nav.mode = m; modeGroups.flug.visible = m === 'flug'; modeGroups.mast.visible = m === 'mast';
  if (m === 'mast') { sim.speed = 0; sim.pitch = 0; } else if (sim.speed === 0) sim.speed = 34;
  renderer.shadowMap.needsUpdate = true; lodDirty = true; refreshLive();
  if (!player.fly && !nav.ok(player.pos.x, player.pos.z, player.pos.y, 0.25, true)) player.teleport(...START);
  $('bMast').classList.toggle('on', m === 'mast'); $('bMast').textContent = m === 'mast' ? 'Am Ankermast' : 'Ankermast'; barB();
  for (const md of modules) if (md.onMode) md.onMode(m, C);
}
// Reihenfolge des Knopfs: Auto → Niedrig → Mittel → Hoch → Auto
$('bQual').onclick = () => setQual(qual === 3 ? 0 : qual === 2 ? 3 : qual + 1);
updQualLabel();

$('go').onclick = () => { ui.started = true; $('startX').style.display = ''; openOv('start', false); canvas.focus(); audioInit(); };
$('startX').onclick = () => openOv('start', false);
$('bHelp').onclick = () => { $('go').textContent = ui.started ? 'Weiter' : 'An Bord gehen'; openOv('start', true); };
$('bMap').onclick = () => { openOv('map', true); updateMap(true); };
$('mapX').onclick = () => openOv('map', false);
$('bFly').onclick = () => setFly(!player.fly);
$('bCells').onclick = () => setCells(!hull.cells.visible);
$('bTime').onclick = nextTime;
$('bYear').onclick = () => setYear(sim.year === 1936 ? 1937 : 1936);
$('bMast').onclick = () => setMode(sim.mode === 'mast' ? 'flug' : 'mast');
$('prompt').onclick = activate;
$('infoX').onclick = () => showInfo(null);
for (const [id, v] of [['bUp', 1], ['bDown', -1]]) { const e = $(id); e.onpointerdown = (ev) => { player.vert = v; e.setPointerCapture(ev.pointerId); }; e.onpointerup = e.onpointercancel = () => { player.vert = 0; }; }
function onKey(e) {
  if (e.code === 'KeyM') { openOv('map', $('map').style.display === 'none'); updateMap(true); }
  else if (e.code === 'Escape') { openOv('map', false); if (ui.started) openOv('start', false); showInfo(null); }
  if (!ui.started || ovOpen()) return;
  if (e.code === 'KeyE' || e.code === 'Enter') { ui.cand = findCandidate(); activate(); }
  else if (e.code === 'KeyF') setFly(!player.fly);
  else if (e.code === 'KeyG') setCells(!hull.cells.visible);
  else if (e.code === 'KeyT') nextTime();
  else if (e.code === 'KeyH') $('bHelp').onclick();
}

// ---------- Deckplan ----------
function go(x, y, z, h) { player.teleport(x, y, z, h); setFly(false); showInfo(null); openOv('map', false); }
function buildMap() {
  const P = (f) => ST.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${f(x).toFixed(2)}`).join(' ');
  let s = `<svg viewBox="-2 -26 254 52" xmlns="http://www.w3.org/2000/svg">`;
  const fin = [...FIN_OUT, [13.6, 0.8], [52, 0.8]];
  for (const k of [1, -1]) s += `<polygon points="${fin.map((p) => p[0] + ',' + (p[1] * k)).join(' ')}" fill="#34312a" stroke="#8a7f69" stroke-width=".25"/>`;
  s += `<path d="${P((x) => -rLin(x))} ${ST.slice().reverse().map((x) => `L${x.toFixed(1)} ${rLin(x).toFixed(2)}`).join(' ')} Z" fill="#26241f" stroke="#c9bda3" stroke-width=".35"/>`;
  const bd = [3.5, ...MAIN, 244.5];
  for (const x of MAIN) s += `<line x1="${x}" x2="${x}" y1="${-rLin(x)}" y2="${rLin(x)}" stroke="#6f6757" stroke-width=".25"/>`;
  for (let i = 0; i < 16; i++) s += `<text x="${(bd[i] + bd[i + 1]) / 2}" y="-6" font-size="3" text-anchor="middle" opacity=".55">${i + 1}</text>`;
  s += `<line x1="19.5" x2="233.6" y1="1" y2="1" stroke="#c9a35a" stroke-width=".3" stroke-dasharray="1 .6"/>`;
  s += `<path d="${ST.filter((x) => x >= 14.5 && x <= 233).map((x, i) => `${i ? 'L' : 'M'}${x} ${-keelY(x)}`).join(' ')}" fill="none" stroke="#c9a35a" stroke-width=".3"/>`;
  s += `<rect x="173" y="${-(A_Y + 2.5)}" width="15" height="${A_Y + 2.5 - B_Y}" fill="#5a4a34" stroke="#c9bda3" stroke-width=".2"/>`;
  s += `<rect x="${GX0}" y="${-G_YC}" width="${GX1 - GX0}" height="${G_YC - G_Y}" fill="#5a4a34" stroke="#c9bda3" stroke-width=".2"/>`;
  for (const e of ENG) if (e.side > 0) s += `<ellipse cx="${e.c.x}" cy="${-e.c.y}" rx="3.3" ry="1.2" fill="#5a4a34" stroke="#c9bda3" stroke-width=".2"/>`;
  tps.forEach((t, i) => { if (live(t)) s += `<circle class="tp" data-i="${i}" cx="${t.x}" cy="${-t.y - 1}" r="${touch ? 2.8 : 1.5}"><title>${t.name}</title></circle>`; });
  s += `<circle id="meS" r="1.3" fill="#e0452f" stroke="#fff" stroke-width=".3"/></svg>`;
  $('side').innerHTML = s;
  $('tpList').innerHTML = tps.map((t, i) => (live(t) ? `<button data-i="${i}">${t.name}</button>` : '')).join('');
  const tpGo = (e) => { const i = e.target.dataset.i; if (i != null) { const t = tps[+i]; go(t.x, t.y, t.z, t.h); } };
  $('side').onclick = tpGo; $('tpList').onclick = tpGo;

  const short = { 'Schreib- und Lesezimmer': 'Schreibzimmer', 'Promenade Backbord': 'Promenade', 'Promenade Steuerbord': 'Promenade', 'Kabinengang Backbord': '', 'Kabinengang Steuerbord': '', 'Flur B-Deck': 'Flur', Treppenhaus: '' };
  for (const [deck, y, el] of [['A', A_Y, 'planA'], ['B', B_Y, 'planB']]) {
    const zs = nav.zones.filter((z) => z.plan === deck && (!z.only || z.only === nav.year)), W = hw(180, y) + 0.4;
    const x0v = Math.min(172, ...zs.map((z) => z.x0 - 0.6));
    let p = `<svg viewBox="${x0v} ${-W - 0.4} ${189 - x0v} ${2 * W + 0.8}" xmlns="http://www.w3.org/2000/svg"><path d="M173 ${-hw(173, y)} L188 ${-hw(188, y)} L188 ${hw(188, y)} L173 ${hw(173, y)} Z" fill="#1d1b17" stroke="#c9bda3" stroke-width=".1"/>`;
    zs.forEach((z) => {
      const i = nav.zones.indexOf(z), w = z.x1 - z.x0, d = z.z1 - z.z0, cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2;
      p += `<rect class="room" data-z="${i}" x="${z.x0}" y="${z.z0}" width="${w}" height="${d}"><title>${z.name}</title></rect>`;
      const lab = z.cabin ? '' : (short[z.name] ?? z.name);
      if (lab) p += `<text x="${cx}" y="${cz}" font-size=".52" text-anchor="middle" dominant-baseline="middle" ${d > w * 1.3 ? `transform="rotate(-90 ${cx} ${cz})"` : ''}>${lab}</text>`;
    });
    p += `<text x="187.7" y="${-W + 0.35}" font-size=".45" text-anchor="end" opacity=".6">Backbord · Bug →</text><circle id="me${deck}" r=".3" fill="#e0452f" stroke="#fff" stroke-width=".06"/></svg>`;
    $(el).innerHTML = p;
    $(el).onclick = (e) => { const i = e.target.dataset.z; if (i == null) return; const z = nav.zones[+i]; let x = (z.x0 + z.x1) / 2, zz = (z.z0 + z.z1) / 2; if (z.cabin) x = z.x1 - 0.45; go(x, z.ya, zz, null); };
  }
}
let mapT = 0;
function updateMap(force) {
  if ($('map').style.display === 'none' || (!force && (mapT += 1) % 6)) return; // offen: etwa zehnmal je Sekunde reicht
  const p = player.pos, s = $('meS'); if (!s) return;
  s.setAttribute('cx', p.x); s.setAttribute('cy', -p.y - 1);
  for (const [d, y] of [['A', A_Y], ['B', B_Y]]) { const m = $('me' + d), on = Math.abs(p.y - y) < 0.6 && p.x > 172.5 && p.x < 188.5; m.setAttribute('visibility', on ? 'visible' : 'hidden'); m.setAttribute('cx', p.x); m.setAttribute('cy', p.z); }
}

// ---------- Motorenklang ----------
let actx = null, gain = null, sound = false;
function audioInit() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)(); gain = actx.createGain(); gain.gain.value = 0; gain.connect(actx.destination);
    // die Klangquellen selbst liegen in feature_sound.js; hier nur Kontext und Hauptregler
    C.audio.ctx = actx; C.audio.out = gain;
    for (const m of modules) if (m.onAudio) m.onAudio(C);
  } catch (err) { console.error('Ton nicht verfügbar:', err); actx = null; }
}
$('bSound').onclick = () => {
  audioInit(); if (!actx) return; sound = !sound; C.audio.on = sound; actx.resume();
  gain.gain.cancelScheduledValues(actx.currentTime); gain.gain.setTargetAtTime(sound ? 0.8 : 0, actx.currentTime, 0.2);
  $('bSound').classList.toggle('on', sound);
  for (const m of modules) if (m.onSound) m.onSound(sound, C);
};

// ---------- Interaktion: nächster Infopunkt / nächste Leiter ----------
const dir = new THREE.Vector3(), tmp = new THREE.Vector3();
function findCandidate() {
  if (player.fly || player.travel || !ui.started) return null;
  camera.getWorldDirection(dir); let best = null, bs = 1e9;
  const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
  for (const p of portals) {
    if (!live(p)) continue;
    for (let k = 0; k < 2; k++) {
      const end = k ? p.c : p.a, d = Math.hypot(end.x - px, end.z - pz);
      if (d < 1.3 && Math.abs(end.y - py) < 1.2 && d - 2 < bs) { bs = d - 2; best = { portal: p, to: k ? p.a : p.c, label: `↕ ${p.name} ${k ? p.down : p.up}` }; }
    }
  }
  for (const a of actions) {
    tmp.subVectors(a.pos, camera.position); const d = tmp.length(); if (d > (a.range || 1.5)) continue;
    const aim = tmp.dot(dir) / d; if (aim < 0.86) continue;
    const sc = (1 - aim) * 8 - 1.5; // unter mehreren Bedienelementen gewinnt das am genauesten anvisierte
    if (sc < bs) { bs = sc; best = { action: a, label: '✋ ' + (typeof a.label === 'function' ? a.label() : a.label) }; }
  }
  for (const i of infos) {
    if (!live(i)) continue;
    tmp.subVectors(i.pos, camera.position); const d = tmp.length(); if (d > 3.8) continue;
    if (tmp.dot(dir) / d < 0.78) continue;
    if (d < bs) { bs = d; best = { info: i, label: `ⓘ ${i.title}` }; }
  }
  return best;
}

// ---------- Hauptschleife ----------
const clock = new THREE.Clock(); let acc = 0, lastLab = '', lastLoc = '', candT = 0, lastNow = 0, running = false;
const EMA = 0.08, ema = (k, v) => { prof[k] += (v - prof[k]) * EMA; };
function frame() {
  const t0 = performance.now(), iv = lastNow ? t0 - lastNow : 16.7; lastNow = t0;
  const dt = Math.min(0.05, clock.getDelta()); acc += dt;
  player.update(dt);
  const t1 = performance.now();
  for (const m of modules) if (m.update) m.update(dt, C);
  const t2 = performance.now();
  world.update(dt, camera, sim);
  for (const p of props) p.rotation.x += dt * 13 * (sim.mode === 'mast' ? 0 : Math.max(0.15, Math.abs(sim.speed) / 34));
  const t3 = performance.now();
  iMat.opacity = 0.75 + 0.25 * Math.sin(acc * 3);
  if (markers.userData.dirty) updMarkers();
  // Auswahl (Infopunkt/Leiter/Bedienelement) etwa zwölfmal je Sekunde statt jedes Bild
  if ((candT -= dt) <= 0) {
    candT = 0.08; ui.cand = findCandidate();
    const lab = ui.cand ? ui.cand.label + (touch ? '' : '  [E]') : '';
    if (lab !== lastLab) { lastLab = lab; $('prompt').textContent = lab; $('prompt').style.display = lab ? 'block' : 'none'; }
    if (ui.info && (player.fly || camera.position.distanceTo(ui.info.pos) > 7)) showInfo(null);
    const loc = player.fly ? 'Außenflug' : player.travel ? 'Leiterschacht' : (player.zone ? player.zone.name : '');
    if (loc !== lastLoc) { lastLoc = loc; $('loc').textContent = loc; }
  }
  updateMap();
  const t4 = performance.now();
  updateLod();
  const t5 = performance.now();
  if (!lost) {
    if (warmQ.length) warmStep();
    gpuPoll(); gpuBegin();
    if (composer && Q.ao) composer.render(); else renderer.render(scene, camera);
    gpuEnd();
  }
  const t6 = performance.now();
  ema('player', t1 - t0); ema('modules', t2 - t1); ema('world', t3 - t2); ema('ui', t4 - t3); ema('lod', t5 - t4); ema('render', t6 - t5); ema('cpu', t6 - t0); ema('interval', iv);
  autoTick(iv, Math.max(t6 - t0, prof.gpu || 0));
}
function loop() { if (!running) return; frame(); requestAnimationFrame(loop); }

// ---------- Aufbau in Etappen ----------
// Jede Etappe läuft am Stück (die Module bauen synchron), dazwischen bekommt der Browser den Hauptthread zurück,
// damit Fortschrittsbalken und Eingaben nicht einfrieren. Gewichte des Balkens = gemessene Dauer beim letzten Besuch.
const blocks = []; let resumed = performance.now(), curStep = ''; // längste Stücke ohne Unterbrechung (für die Messung)
const yieldUI = () => { blocks.push([curStep, +(performance.now() - resumed).toFixed(1)]); return yieldRaw().then(() => { resumed = performance.now(); }); };
const yieldRaw = () => new Promise((res) => {
  if (document.hidden) { const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0); return; } // Hintergrund-Tab: nicht auf Bildwechsel warten
  let done = false; const f = () => { if (!done) { done = true; res(); } };
  requestAnimationFrame(() => setTimeout(f, 0)); setTimeout(f, 40);
});
let W0 = {}; try { W0 = JSON.parse(localStorage.getItem('hb.bootW') || '{}') || {}; } catch (_) { W0 = {}; }
async function boot() {
  const mods = Object.entries(detailMods).map(([path, load]) => {
    const key = path.replace(/^.*\/(detail_|feature_)|\.js$/g, '');
    return { path, key, label: MOD_LABEL[key] || key, p: load().catch((err) => ({ __err: err })) };
  });
  const steps = [
    ['hull', 'Rumpf, Gerippe und Gaszellen', () => { hull = buildHull(ship, M, b, touch ? 1 : 2); }],
    ['decks', 'Passagierdecks', () => buildDecks(C)],
    ['keel', 'Kielgang', () => buildKeel(C)],
    ...mods.map((m) => ['m:' + m.key, m.label, async () => {
      const mod = await m.p;
      if (mod.__err) { console.error('Detailmodul konnte nicht geladen werden:', m.path, mod.__err); return; }
      const t = performance.now();
      try { mod.default(C); modules.push(mod); } catch (err) { console.error('Detailmodul fehlgeschlagen:', m.path, err); }
      return performance.now() - t; // nur die Aufbauzeit, ohne Wartezeit auf den Download
    }]),
    ['build', 'Bauteile zusammenfassen', async (sub) => {
      // je Material ein Schritt; nach spätestens ~25 ms kurz abgeben
      let t = performance.now();
      for (const k of b.steps(ship, { ...yearGroups, ...modeGroups })) if (performance.now() - t > 25) { await sub(k * 0.9); t = performance.now(); }
      signs.finish(ship, { ...yearGroups, ...modeGroups });
      // Schatten: alles Feste wirft und empfängt; durchscheinende Teile und die Innenseite der Hülle nicht
      ship.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material, solid = !m.transparent && !m.isMeshBasicMaterial && m !== M.hullIn;
        o.castShadow = solid && o.userData.lodK !== 2; o.receiveShadow = solid;
      });
      props = buildProps(ship, M);
      lodList = ship.userData.lod || [];
      innerList = []; ship.traverse((o) => { if (o.userData.inner && !o.userData.lodK) innerList.push(o); });
      collectDynLod();
    }],
    ['world', 'Himmel, Meer und Licht', () => {
      world = buildWorld(scene, touch);
      // Raumlichter für Abend und Nacht (warm, ohne eigene Schatten)
      for (const [x, y, z, d] of [[180.5, A_Y + 2.2, -7, 10], [178, A_Y + 2.2, 7, 9], [185.5, A_Y + 2.2, 7.4, 7], [173.7, A_Y + 2.2, 0, 8], [181.5, A_Y + 2.2, 0, 8],
        [185.6, B_Y + 2.3, 2.4, 7], [178.5, B_Y + 2.2, 2.4, 7], [183, B_Y + 2.3, -2.6, 7], [179.4, B_Y + 2.2, -2.6, 6], [205.3, G_YC - 0.3, 0, 6]]) {
        const l = new THREE.PointLight(0xffd9a0, 0, d, 1.6); l.position.set(x, y, z); l.visible = false; scene.add(l); roomLights.push(l);
      }
      setTime(1);
      world.sun.castShadow = Q.sh;
      // Infopunkt-Marker
      const iTex = canvasTex(64, 64, (g) => {
        g.clearRect(0, 0, 64, 64); g.fillStyle = 'rgba(201,163,90,0.92)'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill();
        g.strokeStyle = '#fff6e0'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#1b1915'; g.font = 'italic bold 40px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('i', 32, 35);
      }, { repeat: false });
      // alle Marker als EIN Punktwolken-Objekt (ein Zeichenaufruf statt einem je Marker); Punktgröße = 0,2 m wie zuvor die Sprites.
      // i.sprite bleibt als Objekt mit visible erhalten (Module schalten darüber einzelne Marker)
      iMat = new THREE.PointsMaterial({ map: iTex, transparent: true, depthWrite: false, fog: false, sizeAttenuation: true, size: markerSize() });
      markerMat = iMat; markers = new THREE.Points(new THREE.BufferGeometry(), iMat); markers.renderOrder = 6; markers.frustumCulled = false; ship.add(markers);
      for (const i of infos) {
        let v = true;
        i.sprite = { get visible() { return v; }, set visible(x) { x = !!x; if (x !== v) { v = x; markers.userData.dirty = true; } } };
      }
      markers.userData.dirty = true;
      player.teleport(...START);
      player.onKey = onKey;
      setYear(1936);
    }],
    ['post', 'Nachbearbeitung', () => (Q.ao ? ensurePost() : null)],
    ['compile', 'Shader vorbereiten', async () => {
      camera.position.set(START[0], START[1] + 1.65, START[2]); camera.rotation.set(0, -START[3] - Math.PI / 2, 0, 'YXZ');
      lodFreeze = 1; updateLod();
      if (!renderer.compileAsync) return;
      // mit AO zeichnet die Szene in ein Zwischenbild (ohne Tonwertabbildung): dann für dieses Ziel übersetzen
      renderer.setRenderTarget(composer && Q.ao ? composer.readBuffer : null);
      const p = renderer.compileAsync(scene, camera); // mit KHR_parallel_shader_compile ohne Blockieren
      renderer.setRenderTarget(null);
      await p;
    }],
    ['upload', 'Geometrie und Texturen an die Grafikkarte', async (sub) => {
      if (touch) freeCPU();
      await uploadSlices(sub);
    }],
    ['shadow', 'Schattenbild', () => {
      // Schattenbild (samt Tiefen-Shadern) vorab in ein 1×1-Bild zeichnen, damit das erste echte Bild nicht alles auf einmal trägt
      lodFreeze = 1; updateLod(); renderer.shadowMap.needsUpdate = true;
      const rt = new THREE.WebGLRenderTarget(1, 1); renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); rt.dispose();
    }],
    ['first', 'Erstes Bild', () => { frame(); }],
  ];
  const wsum = steps.reduce((s, st) => s + (W0[st[0]] || 40), 0);
  let done = 0;
  const W1 = {};
  for (const [key, label, fn] of steps) {
    progress(done / wsum, label + ' …');
    if (performance.now() - resumed > 25) await yieldUI(); // höchstens ~25 ms am Stück vor dem nächsten Schritt
    const t = performance.now(), w = W0[key] || 40, d0 = done; curStep = key;
    // sub(k): Fortschritt innerhalb einer Etappe (0…1) melden und dem Browser kurz den Hauptthread geben
    const sub = async (k, txt) => { progress((d0 + k * w) / wsum, txt || label + ' …'); await yieldUI(); };
    let ms = await fn(sub);
    if (typeof ms !== 'number') ms = performance.now() - t;
    bootLog.push([key, +ms.toFixed(1)]); W1[key] = Math.max(5, Math.round(ms));
    done += W0[key] || 40;
  }
  try { localStorage.setItem('hb.bootW', JSON.stringify(W1)); } catch (_) { /* ohne Speicher: gleiche Gewichte */ }
  blocks.push([curStep, +(performance.now() - resumed).toFixed(1)]);
  progress(1, 'Fertig');
  bootLog.push(['gesamt', +(performance.now() - bootT0).toFixed(1)]);
  $('load').remove();
  $('start').style.display = 'flex';
  running = true; lastNow = 0; requestAnimationFrame(loop);
  setTimeout(() => warmHidden().catch((err) => console.warn('Vorwärmen abgebrochen:', err)), 1500);
}
/** Nach dem Start: die ausgeblendeten Teile (Mastszene, Jahr 1937, abgeschaltete Module) vorwärmen, damit das erste
 *  Umschalten nicht ruckelt. Texturen im Leerlauf; Geometrie portionsweise in den nächsten Bildern mit den echten
 *  Materialien (Hochladen, Shader-Bindungen, Vertex-Arrays genau der Variante, die später gezeichnet wird) – das Bild
 *  wird danach ohnehin vollständig überzeichnet. Zuletzt ein Schattenbild mit allem (Tiefen-Shader). */
const warmQ = [];
async function warmHidden() {
  const idle = () => new Promise((res) => (window.requestIdleCallback ? requestIdleCallback(() => res(), { timeout: 400 }) : setTimeout(res, 60)));
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const hid = [], tex = new Set();
  scene.traverse((o) => { // ganze Szene: manche Module hängen eigene Gruppen direkt an die Szene (z. B. die Mastszene)
    if (!(o.isMesh || o.isLine || o.isPoints) || shown(o)) return;
    hid.push(o); const m = o.material; if (m && !Array.isArray(m)) for (const k of ['map', 'alphaMap', 'emissiveMap']) if (m[k]) tex.add(m[k]);
  });
  let k = 0; for (const t of tex) { if (k++ % 8 === 0) { await idle(); if (lost) return; } renderer.initTexture(t); }
  let cur = [], n = 0;
  for (const o of hid) { cur.push(o); n += o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; if (n > 1.2e5) { warmQ.push(cur); cur = []; n = 0; } }
  if (cur.length) warmQ.push(cur);
  while (warmQ.length) { await idle(); if (lost) return; }
  await idle();
  if (lost || !world || !world.sun.castShadow) return;
  const rt = new THREE.WebGLRenderTarget(1, 1), basic = new THREE.MeshBasicMaterial();
  const saved = []; scene.traverse((o) => saved.push([o, o.visible]));
  scene.traverse((o) => { o.visible = true; });
  const ov = scene.overrideMaterial, prevRT = renderer.getRenderTarget();
  try { renderer.shadowMap.needsUpdate = true; scene.overrideMaterial = basic; renderer.setRenderTarget(rt); renderer.render(scene, camera); }
  finally { renderer.setRenderTarget(prevRT); scene.overrideMaterial = ov; for (const [o, v] of saved) o.visible = v; renderer.shadowMap.needsUpdate = true; rt.dispose(); basic.dispose(); }
}
/** eine Portion vorwärmen: nur sie (samt ausgeblendeter Elterngruppen) sichtbar, in das Ziel des folgenden Bildes zeichnen */
function warmStep() {
  const sl = warmQ.shift(), saved = [];
  scene.traverse((o) => saved.push([o, o.visible, o.frustumCulled, o.layers.mask]));
  for (const [o] of saved) if (o.isMesh || o.isLine || o.isPoints || o.isSprite) o.visible = false;
  for (const o of sl) { o.frustumCulled = false; o.layers.mask |= 1; for (let p = o; p; p = p.parent) p.visible = true; }
  const sh = renderer.shadowMap.needsUpdate, prevRT = renderer.getRenderTarget();
  try { renderer.shadowMap.needsUpdate = false; renderer.setRenderTarget(composer && Q.ao ? composer.readBuffer : null); renderer.render(scene, camera); }
  finally { renderer.setRenderTarget(prevRT); renderer.shadowMap.needsUpdate = sh; for (const [o, v, f, l] of saved) { o.visible = v; o.frustumCulled = f; o.layers.mask = l; } }
}
/** Geometrie und Texturen in Portionen auf die Grafikkarte laden (statt alles im ersten Bild): je Portion ein
 *  unsichtbarer Zeichenvorgang in ein 1×1-Bild, dazwischen kommt der Browser zum Zug. */
async function uploadSlices(sub) {
  const all = [], tex = new Set(), on = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  scene.traverse((o) => {
    if ((o.isMesh || o.isLine || o.isPoints) && on(o)) all.push(o);
    const m = o.material; if (m && !Array.isArray(m)) for (const k of ['map', 'alphaMap', 'emissiveMap']) if (m[k]) tex.add(m[k]);
  });
  const BUDGET = 6e5, slices = []; let cur = [], n = 0; // Eckpunkte je Portion
  for (const o of all) { cur.push(o); n += o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; if (n > BUDGET) { slices.push(cur); cur = []; n = 0; } }
  if (cur.length) slices.push(cur);
  const rt = new THREE.WebGLRenderTarget(1, 1), basic = new THREE.MeshBasicMaterial(), prevOv = scene.overrideMaterial;
  const st = all.map((o) => [o.visible, o.frustumCulled]);
  let k = 0;
  for (const t of tex) { renderer.initTexture(t); if (++k % 6 === 0) await sub(0.15 * k / tex.size); }
  for (let i = 0; i < slices.length; i++) {
    const set = new Set(slices[i]);
    all.forEach((o) => { o.visible = set.has(o); o.frustumCulled = false; });
    renderer.shadowMap.needsUpdate = false; // kein Schattenbild aus einer Teilmenge
    scene.overrideMaterial = basic; renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); scene.overrideMaterial = prevOv;
    all.forEach((o, j) => { o.visible = st[j][0]; o.frustumCulled = st[j][1]; });
    await sub(0.15 + 0.85 * (i + 1) / slices.length, `Geometrie an die Grafikkarte (${i + 1}/${slices.length}) …`);
  }
  rt.dispose(); basic.dispose();
}
/** Auf Touch-Geräten: nach dem Hochladen die Geometriedaten der Builder-Meshes im Arbeitsspeicher freigeben (bleiben auf der Grafikkarte) */
function freeCPU() {
  freedCPU = true;
  const drop = function () { this.array = null; };
  ship.traverse((o) => {
    if (!o.isMesh || !o.userData.built) return; // nur die statische Builder-Geometrie; Bewegliches der Module bleibt unangetastet
    const g = o.geometry; // Hüllkörper vorher berechnen: die Sichtfeld-Auslese braucht sie später ohne Eckpunktdaten
    if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();
    for (const a of Object.values(g.attributes)) if (a.array && a.array.length > 3000 && !a.isInterleavedBufferAttribute) a.onUpload(drop);
  });
}
document.addEventListener('visibilitychange', () => { lastNow = 0; });
boot().catch((err) => {
  console.error(err);
  notice('Aufbau fehlgeschlagen', 'Beim Aufbau des Schiffs ist ein Fehler aufgetreten: ' + String(err && err.message ? err.message : err).replace(/</g, '&lt;') + '. Bitte die Seite neu laden.');
});

// für Tests in der Konsole
window.__hb = { setTime, setYear, setMode, sim, actions, modules, player, nav, scene, camera, renderer, go, setFly, infos, tps, prof, auto, bootLog, blocks, frame, setQual, signs,
  get world() { return world; }, get warm() { return warmQ.length; }, get hull() { return hull; }, get Q() { return Q; }, get qual() { return qual; } };
