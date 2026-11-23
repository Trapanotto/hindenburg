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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);

// ---------- Renderer ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
let composer = null;
let qual = touch ? 1 : 2; const QN = ['Niedrig', 'Mittel', 'Hoch'], QR = [1, 1.5, 2];
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 16000);
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QR[qual]));
  renderer.setSize(innerWidth, innerHeight, false);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
  camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 82 : 72; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

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
  /** bedienbares Element: { label: Text oder () => Text, pos: Vector3, range?: m, onUse: () => void } */
  action: (a) => { actions.push(a); return a; },
  /** alles in fn Gebaute (Builder, Schilder, Zonen, Blocker) gilt nur für das Jahr 1936 bzw. 1937 */
  /** alles in fn Gebaute gilt nur im Flug ('flug') bzw. nur am Ankermast ('mast') */
  mode: (m, fn) => b.only(m, () => { nav.mtag = m; signs.tag(m); try { fn(); } finally { nav.mtag = null; signs.tag(''); } }),
  only: (year, fn) => b.only(year, () => { nav.tag = year; signs.tag(year); try { fn(); } finally { nav.tag = null; signs.tag(''); } }),
};
const signs = makeSigns(); C.sign = signs.sign; C.gauge = signs.gauge; C.panel = signs.panel;
const hull = buildHull(ship, M, b, qual);
buildDecks(C);
buildKeel(C);
// Detailmodule (detail_*.js): jedes exportiert default function(C)
const detailMods = { ...import.meta.glob('./detail_*.js', { eager: true }), ...import.meta.glob('./feature_*.js', { eager: true }) };
const modules = [];
for (const [path, mod] of Object.entries(detailMods)) {
  try { mod.default(C); modules.push(mod); } catch (err) { console.error('Detailmodul fehlgeschlagen:', path, err); }
}
b.build(ship, { ...yearGroups, ...modeGroups });
signs.finish(ship, { ...yearGroups, ...modeGroups });
// Schatten: alles Feste wirft und empfängt; durchscheinende Teile und die Innenseite der Hülle nicht
ship.traverse((o) => {
  if (!o.isMesh) return;
  const m = o.material, solid = !m.transparent && !m.isMeshBasicMaterial && m !== M.hullIn;
  o.castShadow = solid && o.userData.lodK !== 2; o.receiveShadow = solid;
});
const props = buildProps(ship, M);
const world = buildWorld(scene, touch);

// Raumlichter für Abend und Nacht (warm, ohne eigene Schatten)
const roomLights = [[180.5, A_Y + 2.2, -7, 10], [178, A_Y + 2.2, 7, 9], [185.5, A_Y + 2.2, 7.4, 7], [173.7, A_Y + 2.2, 0, 8], [181.5, A_Y + 2.2, 0, 8],
  [185.6, B_Y + 2.3, 2.4, 7], [178.5, B_Y + 2.2, 2.4, 7], [183, B_Y + 2.3, -2.6, 7], [179.4, B_Y + 2.2, -2.6, 6], [205.3, G_YC - 0.3, 0, 6]].map(([x, y, z, d]) => {
  const l = new THREE.PointLight(0xffd9a0, 0, d, 1.6); l.position.set(x, y, z); l.visible = false; scene.add(l); return l;
});
// Entfernungsstaffelung: Kleinteile bis LOD[2] m, mittlere Teile bis LOD[1] m sichtbar
const lodList = ship.userData.lod || [], LODD = touch ? [0, 70, 22] : [0, 110, 38];
let lodFreeze = 0;
function updateLod() {
  const p = camera.position, all = lodFreeze > 0; if (all) lodFreeze--;
  for (const m of lodList) {
    const c = m.userData.lodC, d = LODD[m.userData.lodK] + m.userData.lodR;
    m.visible = all || (c.x - p.x) ** 2 + (c.y - p.y) ** 2 + (c.z - p.z) ** 2 < d * d;
  }
}
world.onShadow = () => { lodFreeze = 3; }; // für ein neues Schattenbild kurz alles einblenden
function setTime(i) {
  world.set(i, M, renderer);
  const k = [3, 2.5, 5, 9][i]; // tagsüber schwach, damit fensterlose Räume nicht flach wirken
  for (const l of roomLights) { l.visible = k > 0; l.intensity = k; }
}
setTime(1);

// Nachbearbeitung: Umgebungsverschattung (nur Qualitätsstufe „Hoch“)
function setupPost() {
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.3, thickness: 1.2, scale: 1.3, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
  // Durchscheinendes, Himmel, Meer und Wolken zählen nicht zur Verschattung
  const ov = ao.overrideVisibility.bind(ao), rv = ao.restoreVisibility.bind(ao), hidden = [];
  ao.overrideVisibility = () => {
    ov(); hidden.length = 0;
    scene.traverse((o) => { if (o.visible && (o.isSprite || (o.isMesh && (o.material.transparent || o.material.isShaderMaterial)))) { o.visible = false; hidden.push(o); } });
  };
  ao.restoreVisibility = () => { rv(); for (const o of hidden) o.visible = true; };
  composer.addPass(ao); composer.addPass(new OutputPass());
  resize();
}
try { setupPost(); } catch (err) { console.error('Nachbearbeitung nicht verfügbar:', err); composer = null; }

// Infopunkt-Marker
const iTex = canvasTex(64, 64, (g) => {
  g.clearRect(0, 0, 64, 64); g.fillStyle = 'rgba(201,163,90,0.92)'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill();
  g.strokeStyle = '#fff6e0'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#1b1915'; g.font = 'italic bold 40px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('i', 32, 35);
}, { repeat: false });
const iMat = new THREE.SpriteMaterial({ map: iTex, transparent: true, depthWrite: false, fog: false });
for (const i of infos) { const s = new THREE.Sprite(iMat); s.position.copy(i.pos); s.scale.setScalar(0.2); s.renderOrder = 6; ship.add(s); i.sprite = s; }

// ---------- Spieler ----------
const player = new Player(camera, nav, canvas, $('joy'));
player.teleport(...START);

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
}
function setFly(on) { player.setFly(on); $('bFly').classList.toggle('on', on); document.body.classList.toggle('fly', on); if (on) showInfo(null); }
function setCells(on) { hull.cells.visible = on; $('bCells').classList.toggle('on', on); }
function nextTime() { const i = (world.idx + 1) % TIMES.length; setTime(i); $('bTime').textContent = TIMES[i].name; }
function refreshLive() { for (const i of infos) if (i.sprite) i.sprite.visible = live(i); buildMap(); }
function setYear(y) {
  sim.year = y; nav.year = y; yearGroups[1936].visible = y === 1936; yearGroups[1937].visible = y === 1937;
  ship.traverse((o) => { if (o.userData.year) o.visible = o.userData.year === y; });
  $('bYear').textContent = String(y); for (const m of modules) if (m.onYear) m.onYear(y, C);
  renderer.shadowMap.needsUpdate = true; lodFreeze = 3; refreshLive();
  const r = nav.ok(player.pos.x, player.pos.z, player.pos.y, 0.25, true); if (!r && !player.fly) go(...START);
}
function setMode(m) {
  sim.mode = m; nav.mode = m; modeGroups.flug.visible = m === 'flug'; modeGroups.mast.visible = m === 'mast';
  if (m === 'mast') { sim.speed = 0; sim.pitch = 0; } else if (sim.speed === 0) sim.speed = 34;
  renderer.shadowMap.needsUpdate = true; lodFreeze = 3; refreshLive();
  if (!player.fly && !nav.ok(player.pos.x, player.pos.z, player.pos.y, 0.25, true)) player.teleport(...START);
  $('bMast').classList.toggle('on', m === 'mast'); $('bMast').textContent = m === 'mast' ? 'Am Ankermast' : 'Ankermast';
  for (const md of modules) if (md.onMode) md.onMode(m, C);
}
function setQual(q) { qual = q; $('bQual').textContent = 'Qualität: ' + QN[q]; resize(); }
setQual(qual);

$('go').onclick = () => { ui.started = true; $('startX').style.display = ''; openOv('start', false); canvas.focus(); audioInit(); };
$('startX').onclick = () => openOv('start', false);
$('bHelp').onclick = () => { $('go').textContent = ui.started ? 'Weiter' : 'An Bord gehen'; openOv('start', true); };
$('bMap').onclick = () => { openOv('map', true); };
$('mapX').onclick = () => openOv('map', false);
$('bFly').onclick = () => setFly(!player.fly);
$('bCells').onclick = () => setCells(!hull.cells.visible);
$('bTime').onclick = nextTime;
$('bYear').onclick = () => setYear(sim.year === 1936 ? 1937 : 1936);
$('bMast').onclick = () => setMode(sim.mode === 'mast' ? 'flug' : 'mast');
$('bQual').onclick = () => setQual((qual + 1) % 3);
$('prompt').onclick = activate;
$('infoX').onclick = () => showInfo(null);
for (const [id, v] of [['bUp', 1], ['bDown', -1]]) { const e = $(id); e.onpointerdown = (ev) => { player.vert = v; e.setPointerCapture(ev.pointerId); }; e.onpointerup = e.onpointercancel = () => { player.vert = 0; }; }
player.onKey = (e) => {
  if (e.code === 'KeyM') openOv('map', $('map').style.display === 'none');
  else if (e.code === 'Escape') { openOv('map', false); if (ui.started) openOv('start', false); showInfo(null); }
  if (!ui.started || ovOpen()) return;
  if (e.code === 'KeyE' || e.code === 'Enter') activate();
  else if (e.code === 'KeyF') setFly(!player.fly);
  else if (e.code === 'KeyG') setCells(!hull.cells.visible);
  else if (e.code === 'KeyT') nextTime();
  else if (e.code === 'KeyH') $('bHelp').onclick();
};

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
  tps.forEach((t, i) => { if (live(t)) s += `<circle class="tp" data-i="${i}" cx="${t.x}" cy="${-t.y - 1}" r="1.5"><title>${t.name}</title></circle>`; });
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
buildMap();
function updateMap() {
  if ($('map').style.display === 'none') return;
  const p = player.pos; $('meS').setAttribute('cx', p.x); $('meS').setAttribute('cy', -p.y - 1);
  for (const [d, y] of [['A', A_Y], ['B', B_Y]]) { const m = $('me' + d), on = Math.abs(p.y - y) < 0.6 && p.x > 172.5 && p.x < 188.5; m.setAttribute('visibility', on ? 'visible' : 'hidden'); m.setAttribute('cx', p.x); m.setAttribute('cy', p.z); }
}

// ---------- Motorenklang ----------
let actx = null, gain = null, sound = false;
function audioInit() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)(); gain = actx.createGain(); gain.gain.value = 0; gain.connect(actx.destination);
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(gain);
    for (const [f, t, v] of [[46, 'sawtooth', 0.25], [46.7, 'sawtooth', 0.25], [92.5, 'triangle', 0.18], [23, 'sine', 0.35]]) { const o = actx.createOscillator(), g = actx.createGain(); o.type = t; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(lp); o.start(); }
    const nb = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = actx.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = actx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 0.4; const ng = actx.createGain(); ng.gain.value = 0.05; ns.connect(nf); nf.connect(ng); ng.connect(gain); ns.start();
  } catch (_) { actx = null; }
}
$('bSound').onclick = () => { audioInit(); if (!actx) return; sound = !sound; actx.resume(); gain.gain.linearRampToValueAtTime(sound ? 0.5 : 0, actx.currentTime + 0.6); $('bSound').classList.toggle('on', sound); };

// ---------- Interaktion: nächster Infopunkt / nächste Leiter ----------
const dir = new THREE.Vector3(), tmp = new THREE.Vector3();
function findCandidate() {
  if (player.fly || player.travel || !ui.started) return null;
  camera.getWorldDirection(dir); let best = null, bs = 1e9;
  for (const p of portals) if (live(p)) for (const [end, to, lab] of [[p.a, p.c, p.up], [p.c, p.a, p.down]]) {
    const d = Math.hypot(end.x - player.pos.x, end.z - player.pos.z);
    if (d < 1.3 && Math.abs(end.y - player.pos.y) < 1.2 && d - 2 < bs) { bs = d - 2; best = { portal: p, to, label: `↕ ${p.name} ${lab}` }; }
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
const clock = new THREE.Clock(); let acc = 0, lastLab = '', lastLoc = '';
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); acc += dt;
  player.update(dt);
  for (const m of modules) if (m.update) m.update(dt, C);
  world.update(dt, camera, sim);
  for (const p of props) p.rotation.x += dt * 13 * (sim.mode === 'mast' ? 0 : Math.max(0.15, Math.abs(sim.speed) / 34));
  iMat.opacity = 0.75 + 0.25 * Math.sin(acc * 3);
  ui.cand = findCandidate();
  const lab = ui.cand ? ui.cand.label + (touch ? '' : '  [E]') : '';
  if (lab !== lastLab) { lastLab = lab; $('prompt').textContent = lab; $('prompt').style.display = lab ? 'block' : 'none'; }
  if (ui.info && (player.fly || camera.position.distanceTo(ui.info.pos) > 7)) showInfo(null);
  const loc = player.fly ? 'Außenflug' : player.travel ? 'Leiterschacht' : (player.zone ? player.zone.name : '');
  if (loc !== lastLoc) { lastLoc = loc; $('loc').textContent = loc; }
  updateMap();
  updateLod();
  if (composer && qual === 2) composer.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
setYear(1936);
$('load').remove();
$('start').style.display = 'flex';
requestAnimationFrame(frame);

// für Tests in der Konsole
window.__hb = { setTime, setYear, setMode, sim, actions, modules, player, nav, scene, camera, renderer, go, setFly, world, hull, infos, tps };
