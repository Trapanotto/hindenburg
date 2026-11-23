// Bedienbare Führergondel: Seiten- und Höhenrad, Maschinentelegrafen, Ballast- und Gaszüge, Selbststeuerung,
// dazu lebende Anzeigen (Zeiger, Kompassrosen, Räder, Lampen) und eine kleine Statusanzeige.
// Vereinfachte Simulation nach research/gondel_mast.md („Vorschlag Bedienmodell“); nicht belegte Werte sind als Annahme markiert.
// Lage aller Teile: LAYOUT aus detail_gondola.js (dort stehen die zugehörigen Gehäuse, Zifferblätter und Beschriftungen).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { V, canvasTex } from './util.js';
import { GX0, GX1, G_Y, G_YC, G_HW } from './hull.js';
import { LAYOUT } from './detail_gondola.js';

const D = Math.PI / 180;
// ---------- Modellkonstanten ----------
const VC = 34.7;              // Reisefahrt 125 km/h bei 1.350 U/min (AN-OPS)
const VMAX = 37.5, VREV = -10; // Höchstfahrt 135 km/h (AN-STAT); rückwärts langsam (Annahme)
const RPM_REISE = 1350;
const H_SCALE = 8400;         // Skalenhöhe der Atmosphäre in m
const V_FULL = 200000;        // Gasinhalt bei 100 % Füllung, m³ (AN-OPS „gut 7 Mio. ft³“)
const LIFT = 1.1;             // Auftrieb Wasserstoff kg je m³ (Meereshöhe)
const P_HEIGHT0 = 800;        // Prallhöhe beim Start (Annahme)
const V0 = V_FULL * Math.exp(-P_HEIGHT0 / H_SCALE), V_MIN = 0.8 * V_FULL;
const VALVE_Q = 2.5;          // m³/s je Manöverventil (Annahme; Abblasrate unbelegt)
const TANK = 2000, SACK = 500, BALLAST0 = 7 * TANK + 8 * SACK; // 7 Haupttanks, 8 Notsäcke (AN-CC)
const ALT_MIN = 80, ALT_MAX = 1200;
const RUD_MAX = 20, ELEV_MAX = 20, STEP = 5; // Ruderendanschläge ±20° (Annahme), Stufen je Radbetätigung
const ST = LAYOUT.stations, I_STOP = 2, I_REISE = ST.length - 1;
const SACK_ORDER = [0, 4, 1, 5, 2, 6, 3, 7]; // Säcke 1–4 Bug (Ring 218), 5–8 Heck (Ring 47); abwechselnd
const CELL_OFF = Array.from({ length: 16 }, (_, i) => ((i * 7) % 11 - 5) * 6); // Füllunterschiede der Zellen (m Prallhöhe)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toward = (v, t, r) => (Math.abs(t - v) <= r ? t : v + Math.sign(t - v) * r);
const wrap = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',').replace(/^-0(,0+)?$/, '0$1');
const sgn = (v, n = 1) => (v > 0.05 ? '+' : '') + fmt(Math.abs(v) < 0.05 ? 0 : v, n);

// ---------- Fahrzustand und Modellgleichungen ----------
export function newState(sim = {}) {
  return {
    tele: [I_REISE, I_REISE, I_REISE, I_REISE], dirs: [-1, -1, -1, -1], rpm: [RPM_REISE, RPM_REISE, RPM_REISE, RPM_REISE], teleAng: Array(4).fill(ST[I_REISE].ang),
    rudSet: 0, rud: 0, elevSet: 0, elev: 0, yaw: 0,
    v: Number.isFinite(sim.speed) ? sim.speed : VC, pitch: Number.isFinite(sim.pitch) ? sim.pitch / D : 0,
    alt: Number.isFinite(sim.alt) ? clamp(sim.alt, ALT_MIN, ALT_MAX) : 300, head: Number.isFinite(sim.heading) ? wrap(sim.heading) : 0,
    vs: 0, vz: 0, vzDisp: 0, dW: 0,
    tanks: Array(7).fill(TANK), flow: 0, sacks: Array(8).fill(true), sackN: 0, trim: 0,
    Vg: V0, valveT: 0, handrad: false, blown: 0, auto: 0, fuel: 0, t: 0,
  };
}
export const ballast = (S) => S.tanks.reduce((a, b) => a + b, 0) + S.sacks.filter(Boolean).length * SACK;
export const pressureHeight = (S) => H_SCALE * Math.log(V_FULL / S.Vg);

/** Ein Zeitschritt dt (s). Gleichungen:
 *  Drehzahl n_i → Stellung mit τ = 2,5 s;  Schub T = Σ f|f|·η / 4, f = n/1350 (η = 1 voraus, 0,1 zurück)
 *  v_soll = 34,7 · sign(T)·√|T| · (1 − 0,8·sin θ), begrenzt −10 … 37,5 m/s;  dv/dt = (v_soll − v)/τ, τ = 20 s (12 s beim Rückwärtsbremsen)
 *  Ruder folgen dem Rad mit 4°/s (Seite) bzw. 5°/s (Höhe)
 *  Drehrate r_soll = 0,1 · δ_s · v/34,7 (°/s; 15° Ruder bei Reise → 1,5°/s), dr/dt = (r_soll − r)/5 s
 *  Neigung θ_soll = 5° · δ_h/15° · q − 2°·Trimm/2000 kg, q = v|v|/34,7² (−0,3 … 1,3), |θ_soll| ≤ 5°; dθ/dt = (θ_soll − θ)/6 s
 *  Statik ΔW = 1,1·(V_g − V_0) + (Ballast_0 − Ballast) + Kraftstoffverbrauch  (kg, + = leicht)
 *  w_soll = sign(ΔW)·1,5·√(|ΔW|/1000) m/s (≤ 5), dw/dt = (w_soll − w)/15 s;  Steigen = v·sin θ + w
 *  Über der Prallhöhe H·ln(V_voll/V_g) bläst das Schiff selbsttätig ab: V_g → V_voll·e^(−h/H) */
export function step(S, dt) {
  S.t += dt;
  let T = 0, burn = 0;
  for (let i = 0; i < 4; i++) {
    const st = ST[S.tele[i]];
    S.rpm[i] += (st.dir * st.rpm - S.rpm[i]) * Math.min(1, dt / 2.5);
    const f = S.rpm[i] / RPM_REISE;
    T += f * Math.abs(f) * (f < 0 ? 0.1 : 1) / 4;
    burn += 130 / 3600 * Math.abs(f) ** 3; // 130 kg/h je Motor bei Reise (AN-OPS)
  }
  const vt = clamp(VC * Math.sign(T) * Math.sqrt(Math.abs(T)) * (1 - 0.8 * Math.sin(S.pitch * D)), VREV, VMAX);
  S.v += (vt - S.v) * Math.min(1, dt / (T < 0 && S.v > 1 ? 12 : 20));
  S.rud = toward(S.rud, S.rudSet, 4 * dt);
  S.elev = toward(S.elev, S.elevSet, 5 * dt);
  S.yaw += (0.1 * S.rud * (S.v / VC) - S.yaw) * Math.min(1, dt / 5);
  S.head = wrap(S.head + S.yaw * D * dt);
  const q = clamp(S.v * Math.abs(S.v) / (VC * VC), -0.3, 1.3);
  const pt = clamp(5 * (S.elev / 15) * q - 2 * S.trim / 2000, -5, 5);
  S.pitch += (pt - S.pitch) * Math.min(1, dt / 6);
  // Wasserballast: 100 kg/s aus dem jeweils nächsten Tank
  if (S.flow > 0) {
    let k = S.tanks.findIndex((m) => m > 0);
    if (k < 0) S.flow = 0;
    else { const m = Math.min(S.flow, 100 * dt, S.tanks[k]); S.tanks[k] -= m; S.flow -= m; }
  }
  // Gas: Manöverventile (14) und Handrad (11 Zellen)
  const open = (S.valveT > 0 ? 14 : 0) + (S.handrad ? 11 : 0);
  if (open) { const dV = Math.min(open * VALVE_Q * dt, Math.max(0, S.Vg - V_MIN)); S.Vg -= dV; S.blown += dV; if (S.Vg <= V_MIN + 1) S.handrad = false; }
  S.valveT = Math.max(0, S.valveT - dt);
  const vh = V_FULL * Math.exp(-S.alt / H_SCALE);
  if (S.Vg > vh) { const dV = (S.Vg - vh) * Math.min(1, dt / 2); S.Vg -= dV; S.auto += dV; }
  S.fuel += burn * dt;
  S.dW = LIFT * (S.Vg - V0) + (BALLAST0 - ballast(S)) + S.fuel;
  const wt = clamp(Math.sign(S.dW) * 1.5 * Math.sqrt(Math.abs(S.dW) / 1000), -5, 5);
  S.vs += (wt - S.vs) * Math.min(1, dt / 15);
  let vz = S.v * Math.sin(S.pitch * D) + S.vs;
  S.alt += vz * dt;
  if (S.alt <= ALT_MIN) { S.alt = ALT_MIN; vz = Math.max(0, vz); S.vs = Math.max(0, S.vs); }
  if (S.alt >= ALT_MAX) { S.alt = ALT_MAX; vz = Math.min(0, vz); S.vs = Math.min(0, S.vs); }
  S.vz = vz;
  S.vzDisp += (vz - S.vzDisp) * Math.min(1, dt / 1.5);
}

// ---------- Bedienung ----------
function resetCruise(S) {
  S.rudSet = 0; S.elevSet = 0; S.tele.fill(I_REISE); S.dirs.fill(-1);
  S.valveT = 0; S.handrad = false; S.flow = 0;
  S.tanks.fill(TANK); S.sacks.fill(true); S.sackN = 0; S.trim = 0; S.Vg = V0; S.fuel = 0;
}
const nextTele = (S, i) => { let d = S.dirs[i], n = S.tele[i] + d; if (n < 0 || n >= ST.length) { d = -d; n = S.tele[i] + d; } return [n, d]; };
const commonTele = (S) => Math.round(S.tele.reduce((a, b) => a + b, 0) / 4);
const rs = (d) => (d === 0 ? 'mittschiffs' : `${Math.abs(d)}° ${d < 0 ? 'Bb' : 'Stb'}`);
const hs = (d) => (d === 0 ? '0°' : `${Math.abs(d)}° ${d > 0 ? 'hoch' : 'tief'}`);

// ---------- Zifferblätter (128×128, ohne Zeiger) ----------
const P = (deg, r) => [64 + Math.cos((deg - 90) * D) * r, 64 + Math.sin((deg - 90) * D) * r];
function dialBase(g, face = '#f1ead6') {
  g.fillStyle = '#17181a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b9954a'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  g.fillStyle = face; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
}
function ticks(g, a0, a1, n, every, r = 53) {
  g.strokeStyle = '#1a1a1a';
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, big = k % every === 0, [x0, y0] = P(a, r), [x1, y1] = P(a, r - (big ? 10 : 5)); g.lineWidth = big ? 2.4 : 1.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
}
function labels(g, list, r = 36, size = 11, col = '#1a1a1a') { g.fillStyle = col; g.font = `bold ${size}px Arial`; for (const [a, t] of list) { const [x, y] = P(a, r); g.fillText(t, x, y); } }
function title(g, t, y, size = 10) { g.fillStyle = '#1a1a1a'; g.font = `${size}px Georgia,serif`; g.fillText(t, 64, y); }
const FACES = {
  hoehe: (g) => { dialBase(g); ticks(g, -150, 150, 24, 2); labels(g, [0, 2, 4, 6, 8, 10, 12].map((k) => [-150 + k * 25, String(k)])); title(g, 'Höhe', 82); title(g, '× 100 m', 94, 8); },
  vario: (g) => { dialBase(g); ticks(g, -255, 75, 20, 2); labels(g, [[-90, '0'], [-24, '2'], [42, '4'], [-156, '2'], [-222, '4']]); title(g, 'Steigen', 50, 9); title(g, 'Sinken', 80, 9); title(g, 'm/s', 92, 8); },
  stato: (g) => { dialBase(g, '#e8e2cc'); ticks(g, -70, 70, 14, 7); labels(g, [[0, '0']], 38); g.fillStyle = '#2a5a2a'; g.font = 'bold 9px Arial'; g.fillText('steigt', 92, 60); g.fillStyle = '#a3261c'; g.fillText('fällt', 36, 60); title(g, 'Statoskop', 88, 9); },
  neig20: (g) => { dialBase(g); ticks(g, 120, 240, 8, 2); labels(g, [[180, '0'], [150, '10'], [210, '10'], [120, '20'], [240, '20']], 38, 10); g.fillStyle = '#1a1a1a'; g.font = 'bold 8px Arial'; g.fillText('hoch', 34, 74); g.fillText('tief', 96, 74); title(g, 'Neigung ±20°', 38, 9); },
  neig5: (g) => { dialBase(g); ticks(g, 105, 255, 10, 2); labels(g, [[180, '0'], [150, '2'], [210, '2'], [120, '4'], [240, '4']], 38, 10); g.fillStyle = '#1a1a1a'; g.font = 'bold 8px Arial'; g.fillText('hoch', 30, 64); g.fillText('tief', 98, 64); title(g, 'Neigung ±5°', 38, 9); },
  rud_h: (g) => { dialBase(g); ticks(g, -100, 100, 8, 2); labels(g, [[0, '0'], [-50, '10'], [50, '10'], [-100, '20'], [100, '20']], 37, 10); g.fillStyle = '#1a1a1a'; g.font = 'bold 8px Arial'; g.fillText('tief', 34, 92); g.fillText('hoch', 94, 92); title(g, 'Höhenruder', 80, 9); },
  rud_s: (g) => { dialBase(g); ticks(g, -100, 100, 8, 2); labels(g, [[0, '0'], [-50, '10'], [50, '10'], [-100, '20'], [100, '20']], 37, 10); g.fillStyle = '#a3261c'; g.font = 'bold 9px Arial'; g.fillText('Bb', 36, 92); g.fillStyle = '#2a6a2a'; g.fillText('Stb', 92, 92); title(g, 'Seitenruder', 80, 9); },
  fahrt: (g) => { dialBase(g); ticks(g, -135, 135, 30, 5); labels(g, [0, 25, 50, 75, 100, 125, 150].map((k) => [-135 + k / 150 * 270, String(k)]), 37, 9); title(g, 'Fahrt', 82); title(g, 'km/h', 94, 8); },
  rpm: (g) => { dialBase(g); ticks(g, -135, 135, 33, 3); labels(g, [0, 4, 8, 12, 16].map((k) => [-135 + k * 100 / 1650 * 270, String(k)]), 37, 10); const [x, y] = P(-135 + 1350 / 1650 * 270, 50); g.fillStyle = '#a3261c'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); title(g, 'U/min', 84); title(g, '× 100', 96, 8); },
};
// Kompassrose als eigene Textur (dreht sich); flip: Rose für einen von unten gelesenen Hängekompass
function drawRose(g, w, flip) {
  const c = w / 2, R = w * 0.48, A = (d) => ((flip ? 180 - d : d) - 90) * D;
  g.fillStyle = '#efe7cf'; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
  g.strokeStyle = '#1a1a1a';
  for (let d = 0; d < 360; d += 5) { const l = d % 30 === 0 ? 0.16 : d % 10 === 0 ? 0.1 : 0.05, a = A(d); g.lineWidth = d % 30 === 0 ? 3 : 1.5; g.beginPath(); g.moveTo(c + Math.cos(a) * R * 0.97, c + Math.sin(a) * R * 0.97); g.lineTo(c + Math.cos(a) * R * (0.97 - l), c + Math.sin(a) * R * (0.97 - l)); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let d = 0; d < 360; d += 30) { const a = A(d), t = { 0: 'N', 90: 'O', 180: 'S', 270: 'W' }[d] || String(d / 10); g.fillStyle = d % 90 === 0 ? '#a3261c' : '#1a1a1a'; g.font = `bold ${Math.round(w * (d % 90 === 0 ? 0.11 : 0.075))}px Arial`; g.fillText(t, c + Math.cos(a) * R * 0.66, c + Math.sin(a) * R * 0.66); }
  const n = A(0), e = A(90);
  g.fillStyle = '#a3261c'; g.beginPath(); g.moveTo(c + Math.cos(n) * R * 0.45, c + Math.sin(n) * R * 0.45); g.lineTo(c + Math.cos(e) * R * 0.07, c + Math.sin(e) * R * 0.07); g.lineTo(c - Math.cos(e) * R * 0.07, c - Math.sin(e) * R * 0.07); g.closePath(); g.fill();
  g.fillStyle = '#2a2520'; g.beginPath(); g.moveTo(c - Math.cos(n) * R * 0.45, c - Math.sin(n) * R * 0.45); g.lineTo(c + Math.cos(e) * R * 0.07, c + Math.sin(e) * R * 0.07); g.lineTo(c - Math.cos(e) * R * 0.07, c - Math.sin(e) * R * 0.07); g.closePath(); g.fill();
  g.fillStyle = '#b9954a'; g.beginPath(); g.arc(c, c, w * 0.03, 0, 7); g.fill();
}

// ---------- Modulzustand ----------
let S = null, R = null, hud = null, hudT = 0;

export default function (C) {
  const { b, M } = C, F = (h) => G_Y + h, gc = G_YC;
  S = newState(C.sim);
  const L = LAYOUT;

  // ---- Zifferblätter der lebenden Instrumente (Atlas) und Einfassungen (Builder)
  const B = L.board, gz = B.z + 0.006, W = L.wall, X = L.box;
  const boardPos = (k) => { const [x, row] = L.live[k]; return V(x, row === 'top' ? B.top : B.bot, gz); };
  const DIALS = [
    ['stato', 'stato', boardPos('stato'), B.d, 'z+'], ['vario', 'vario', boardPos('vario'), B.d, 'z+'], ['hrBb', 'rud_h', boardPos('hrBb'), B.d, 'z+'],
    ['hrG', 'rud_h', boardPos('hrG'), B.d, 'z+'], ['hrStb', 'rud_h', boardPos('hrStb'), B.d, 'z+'], ['neig5', 'neig5', boardPos('neig5'), B.d, 'z+'],
    ['neig20', 'neig20', boardPos('neig20'), B.d, 'z+'], ['hoehe', 'hoehe', boardPos('hoehe'), B.d, 'z+'],
    ['hoehe2', 'hoehe', V(W.hoehe, W.y, W.z - 0.006), W.d, 'z-'], ['vario2', 'vario', V(W.vario, W.y, W.z - 0.006), W.d, 'z-'], ['fahrt', 'fahrt', V(W.fahrt, W.y, W.z - 0.006), W.d, 'z-'],
    ['srO', 'rud_s', V(X.x - 0.007, X.y, X.zO), X.d, 'x-'], ['srU', 'rud_s', V(X.x - 0.007, X.y, X.zU), X.d, 'x-'],
    ...L.tele.map(([x, z], i) => ['rpm' + i, 'rpm', V(x, L.rpmY, z - 0.066), 0.11, 'z-']),
  ];
  for (const [, face, p, d, dir] of DIALS) C.panel('fc_' + face, FACES[face], p.x, p.y, p.z, d, d, dir);
  for (const k of ['hoehe2', 'vario2', 'fahrt']) { const p = DIALS.find((e) => e[0] === k)[2]; b.torus(M.brass, W.d / 2 + 0.004, 0.006, p.x, p.y, W.z - 0.004, 'z', 18); }

  // ---- bewegliche Teile: eigene kleine Meshes an C.root
  const live = new THREE.Group(); live.name = 'Führergondel – bewegliche Teile'; C.root.add(live);
  const AX = { 'z+': [V(1, 0, 0), V(0, 1, 0)], 'z-': [V(-1, 0, 0), V(0, 1, 0)], 'x-': [V(0, 0, 1), V(0, 1, 0)], 'y+': [V(0, 0, 1), V(1, 0, 0)], 'y-': [V(0, 0, 1), V(-1, 0, 0)] };
  // Drehteil vor einer Fläche: lokales z = Flächennormale (zum Betrachter); Drehung um lokales z
  const mount = (p, dir, off) => {
    const [r, u] = AX[dir], n = new THREE.Vector3().crossVectors(r, u), g = new THREE.Group();
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, n)); g.position.copy(p).addScaledVector(n, off);
    const rot = new THREE.Group(); g.add(rot); live.add(g); return rot;
  };
  const mk = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.lodK = 2; /* kein Schattenwurf (main.js) */ parent.add(m); return m; };
  const mRed = new THREE.MeshLambertMaterial({ color: 0xa3261c }), mNeedle = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const mLampOff = new THREE.MeshLambertMaterial({ color: 0x3a0d0a }), mLampRed = new THREE.MeshBasicMaterial({ color: 0xff3a24 }), mLampGreen = new THREE.MeshBasicMaterial({ color: 0x4cff6a });
  const needleGeo = (len, w) => new THREE.BoxGeometry(w, len * 1.25, 0.002).translate(0, len * 0.375, 0);
  const hubGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 10).rotateX(Math.PI / 2);
  const needle = (p, dir, d, mat = mRed) => { const rot = mount(p, dir, 0.004); mk(needleGeo(d * 0.36, d * 0.035), mat, rot); mk(hubGeo, M.black, rot); return rot; };
  R = { needles: {}, tele: [], wheels: {}, cards: {}, tanks: [], sacks: [], cells: [], live };
  for (const [key, , p, d, dir] of DIALS) R.needles[key] = needle(p, dir, d, key.startsWith('hr') || key.startsWith('sr') ? mNeedle : mRed);

  // Kompassrosen: Kreiseltochter (Kompasshaus und Deckenkasten), Magnetkompass (von unten)
  const roseTex = canvasTex(256, 256, (g, w) => drawRose(g, w, false), { repeat: false }), roseTexF = canvasTex(256, 256, (g, w) => drawRose(g, w, true), { repeat: false });
  const mRose = new THREE.MeshLambertMaterial({ map: roseTex }), mRoseF = new THREE.MeshLambertMaterial({ map: roseTexF });
  const card = (p, dir, r, mat, off) => { const rot = mount(p, dir, off); mk(new THREE.CircleGeometry(r, 36), mat, rot); return rot; };
  R.cards.bin = card(V(...L.binnacle), 'y+', 0.075, mRose, 0);
  R.cards.kurs = card(V(X.x, X.y, X.zK), 'x-', 0.08, mRose, 0.009);
  R.cards.mag = card(V(...L.magnet), 'y-', 0.075, mRoseF, 0.001);

  // Steuerräder: 8 Speichen und Griffe (die Felge aus keel.js ist drehsymmetrisch; ihre 4 Speichen decken sich in Ruhe mit den neuen)
  const wheelGeo = (() => {
    const parts = [];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, rz = new THREE.Matrix4().makeRotationZ(a);
      parts.push(new THREE.CylinderGeometry(0.014, 0.014, 0.29, 6).translate(0, 0.045 + 0.145, 0).applyMatrix4(rz));
      parts.push(new THREE.CylinderGeometry(0.018, 0.014, 0.085, 6).translate(0, 0.3975, 0).applyMatrix4(rz));
      parts.push(new THREE.SphereGeometry(0.019, 6, 4).translate(0, 0.445, 0).applyMatrix4(rz));
    }
    return mergeGeometries(parts.map((g) => g.toNonIndexed()));
  })();
  R.wheels.s = mount(V(...L.wheelS), 'x-', 0); mk(wheelGeo, M.woodLight, R.wheels.s);
  R.wheels.h = mount(V(...L.wheelH), 'z+', 0); mk(wheelGeo, M.woodLight, R.wheels.h);

  // Telegrafenhebel mit Stellungszeiger
  const leverGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.19, 8).translate(0, 0.095, 0), knobGeo = new THREE.SphereGeometry(0.022, 10, 8);
  const bossGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.05, 10).rotateX(Math.PI / 2).translate(0, 0, -0.02);
  const pointGeo = new THREE.BoxGeometry(0.012, 0.12, 0.003).translate(0, 0.08, 0);
  for (const [x, z] of L.tele) {
    const rot = mount(V(x, L.teleY, z - 0.086), 'z-', 0.045);
    mk(leverGeo, M.brass, rot); mk(knobGeo, M.brass, rot, 0, 0.2, 0); mk(bossGeo, M.brass, rot); mk(pointGeo, mNeedle, rot, 0, 0, -0.015); // vor dem festen Hebelstab aus keel.js
    R.tele.push(rot);
  }
  // Ballasttafel: Füllstandsmarken, Notsacklampen, Trimmzeiger
  const BL = L.ballast, markGeo = new THREE.BoxGeometry(0.03, 0.006, 0.006), lampGeo = new THREE.SphereGeometry(0.009, 8, 6);
  for (let i = 0; i < 7; i++) R.tanks.push(mk(markGeo, mRed, live, BL.tankX(i), BL.tankY1, BL.z + 0.009));
  for (let j = 0; j < 8; j++) R.sacks.push(mk(lampGeo, mLampGreen, live, BL.lampX(j % 4), j < 4 ? BL.lampBug : BL.lampHeck, BL.z + 0.008));
  R.trim = mk(new THREE.BoxGeometry(0.008, 0.018, 0.006), mNeedle, live, (BL.trimX0 + BL.trimX1) / 2, BL.trimY, BL.z + 0.009);
  // Gastafel: 16 Zellenlampen
  for (let i = 0; i < 16; i++) R.cells.push(mk(lampGeo, mLampOff, live, L.gas.x - 0.008, L.gas.lampY, L.gas.lampZ(i)));
  R.mat = { mLampOff, mLampRed, mLampGreen };

  // ---- Bedienelemente
  const act = (name, detail, pos, onUse, range = 1.5) => C.action({
    label: () => (C.sim.mode === 'mast' ? `${name} – am Ankermast stillgelegt` : `${name} · ${detail()}`),
    pos, range, onUse: () => { if (C.sim.mode !== 'mast') onUse(); },
  });
  const [sx, sy, sz] = L.wheelS, [hx, hy, hz] = L.wheelH;
  act('Seitenrad nach Backbord', () => `Ruder ${rs(S.rudSet)} → ${rs(Math.max(-RUD_MAX, S.rudSet - STEP))}`, V(sx, sy + 0.25, sz - 0.3), () => { S.rudSet = Math.max(-RUD_MAX, S.rudSet - STEP); });
  act('Seitenrad nach Steuerbord', () => `Ruder ${rs(S.rudSet)} → ${rs(Math.min(RUD_MAX, S.rudSet + STEP))}`, V(sx, sy + 0.25, sz + 0.3), () => { S.rudSet = Math.min(RUD_MAX, S.rudSet + STEP); });
  act('Höhenrad: Höhenruder hoch', () => `${hs(S.elevSet)} → ${hs(Math.min(ELEV_MAX, S.elevSet + STEP))}`, V(hx, hy + 0.37, hz), () => { S.elevSet = Math.min(ELEV_MAX, S.elevSet + STEP); });
  act('Höhenrad: Höhenruder tief', () => `${hs(S.elevSet)} → ${hs(Math.max(-ELEV_MAX, S.elevSet - STEP))}`, V(hx, hy - 0.37, hz), () => { S.elevSet = Math.max(-ELEV_MAX, S.elevSet - STEP); });
  L.tele.forEach(([x, z, name], i) => act(`Telegraf ${name}`, () => `${ST[S.tele[i]].n} → ${ST[nextTele(S, i)[0]].n}`, V(x, L.teleY + 0.05, z - 0.14), () => { const [n, d] = nextTele(S, i); S.tele[i] = n; S.dirs[i] = d; }));
  act('Alle Maschinen eine Stufe voraus', () => `→ ${ST[Math.min(I_REISE, commonTele(S) + 1)].n}`, V(205.75, F(2.0), L.sammel.z - 0.03), () => { S.tele.fill(Math.min(I_REISE, commonTele(S) + 1)); S.dirs.fill(1); });
  act('Alle Maschinen eine Stufe zurück', () => `→ ${ST[Math.max(0, commonTele(S) - 1)].n}`, V(206.12, F(2.0), L.sammel.z - 0.03), () => { S.tele.fill(Math.max(0, commonTele(S) - 1)); S.dirs.fill(-1); });
  act('Wasserballast ablassen (500 kg)', () => { const rest = S.tanks.reduce((a, c) => a + c, 0) - S.flow; return rest > 0 ? `Haupttanks noch ${fmt(rest / 1000)} t` : 'Haupttanks leer'; },
    V(BL.tankX(3), BL.pullY, BL.z + 0.05), () => { const rest = S.tanks.reduce((a, c) => a + c, 0) - S.flow; if (rest > 0) S.flow += Math.min(500, rest); });
  act('Notballast abwerfen', () => { if (S.sackN >= 8) return 'alle Säcke abgeworfen'; const k = SACK_ORDER[S.sackN]; return `Sack ${k + 1} (${k < 4 ? 'Bug, Ring 218' : 'Heck, Ring 47'}, 500 kg)`; },
    V(BL.notX(4), BL.pullY, BL.z + 0.05), () => { if (S.sackN >= 8) return; const k = SACK_ORDER[S.sackN++]; S.sacks[k] = false; S.trim += k < 4 ? -SACK : SACK; });
  act('Manöverventile ziehen (14 Züge, 5 s)', () => (S.valveT > 0 ? `offen, noch ${Math.ceil(S.valveT)} s` : `Gas ${fmt(S.Vg / V_FULL * 100, 0)} %`), V(205.9, gc - 0.36, -0.52), () => { S.valveT = Math.min(30, S.valveT + 5); });
  act('Handrad', () => (S.handrad ? '11 Zellen schließen' : '11 Zellen öffnen (Gas abblasen)'), V(L.handrad[0], L.handrad[1], L.handrad[2]), () => { S.handrad = !S.handrad && S.Vg > V_MIN + 1; });
  act('Selbststeuerung', () => 'Rückstellen auf Reiseflug (Ruder mittschiffs, alle Maschinen Reise, Ballast und Gas wie beim Start)', V(206.75, F(0.72), L.autopilot.z - 0.05), () => resetCruise(S));

  // ---- Statusanzeige (nur in der Führergondel)
  if (typeof document !== 'undefined' && document.body) {
    const css = document.createElement('style');
    css.textContent = `#fcHud{position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:4;pointer-events:none;display:none;
      background:var(--panel,rgba(24,22,18,.86));border:1px solid var(--line,rgba(243,234,216,.22));border-top:3px solid var(--acc,#c9a35a);border-radius:6px;
      padding:7px 11px 8px;font:13px/1.35 Georgia,"Times New Roman",serif;color:var(--ink,#f3ead8);min-width:200px}
      #fcHud b{font-weight:normal;color:var(--dim,#c9bda3);display:inline-block;min-width:74px}
      #fcHud .h{letter-spacing:.08em;font-size:11px;color:var(--acc,#c9a35a);text-transform:uppercase;margin-bottom:2px}
      body.touch #fcHud{bottom:calc(max(26px,env(safe-area-inset-bottom)) + 116px);right:max(10px,env(safe-area-inset-right));font-size:12px;min-width:0}
      @media (max-width:760px){#fcHud{font-size:12px;padding:5px 9px}#fcHud b{min-width:64px}}`;
    document.head.appendChild(css);
    hud = document.createElement('div'); hud.id = 'fcHud';
    const rows = [['Fahrt'], ['Höhe'], ['Kurs'], ['Neigung'], ['Steigen'], ['Maschinen'], ['Ballast'], ['Gas']];
    hud.innerHTML = '<div class="h">Fahrzustand</div>' + rows.map(([t]) => `<div><b>${t}</b><span></span></div>`).join('');
    document.body.appendChild(hud);
    hud._v = [...hud.querySelectorAll('span')];
  }
}

function inGondola(cam) {
  const p = cam && cam.position; if (!p) return false;
  return p.x > GX0 - 0.1 && p.x < GX1 + 0.3 && p.y > G_Y - 0.2 && p.y < G_YC + 0.3 && Math.abs(p.z) < G_HW + 0.1;
}

function updateHud(C) {
  if (!hud) return;
  const on = inGondola(C.camera);
  hud.style.display = on ? 'block' : 'none';
  if (!on) return;
  const mast = C.sim.mode === 'mast', v = hud._v;
  const tel = S.tele.every((t) => t === S.tele[0]) ? `${ST[S.tele[0]].n} (alle 4)` : S.tele.map((t) => ST[t].s).join(' · ');
  const vals = mast ? ['0 km/h', `${Math.round(S.alt)} m`, `${String(Math.round(S.head / D) % 360).padStart(3, '0')}°`, '0°', '–', 'Am Ankermast: stillgelegt', '', ''] : [
    `${Math.round(S.v * 3.6)} km/h`, `${Math.round(S.alt)} m  (prall ab ${Math.round(pressureHeight(S))} m)`,
    `${String(Math.round(S.head / D) % 360).padStart(3, '0')}°  · Ruder ${rs(Math.round(S.rud))}`, `${sgn(S.pitch)}°  · Höhenruder ${hs(Math.round(S.elev))}`,
    `${sgn(S.vzDisp)} m/s  · ${S.dW >= 0 ? 'leicht' : 'schwer'} ${fmt(Math.abs(S.dW) / 1000, 2)} t`, tel,
    `${fmt(S.tanks.reduce((a, c) => a + c, 0) / 1000)} t Wasser · Not ${S.sacks.filter(Boolean).length}/8`,
    `${fmt(S.Vg / V_FULL * 100, 1)} %${S.valveT > 0 || S.handrad ? ' · Ventile offen' : ''}`,
  ];
  vals.forEach((t, i) => { if (v[i] && v[i].textContent !== t) v[i].textContent = t; v[i] && (v[i].parentNode.style.display = t ? '' : 'none'); });
}

export function update(dt, C) {
  if (!S || !R) return;
  dt = Math.min(Math.max(dt, 0), 0.1);
  const mast = C.sim.mode === 'mast';
  if (!mast) {
    step(S, dt);
    C.sim.speed = S.v; C.sim.alt = S.alt; C.sim.pitch = S.pitch * D; C.sim.heading = S.head;
  } else {
    for (let i = 0; i < 4; i++) S.rpm[i] *= Math.max(0, 1 - dt / 1.5);
    S.vzDisp *= Math.max(0, 1 - dt / 1.5);
  }
  // Anzeigen nur nachführen, wenn jemand in der Nähe ist
  const cam = C.camera && C.camera.position;
  const near = !cam || (cam.x > GX0 - 25 && cam.x < GX1 + 25 && Math.abs(cam.y - G_Y) < 25 && Math.abs(cam.z) < 25);
  R.live.visible = near;
  if (near) animate(dt, mast);
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; updateHud(C); }
}

function animate(dt, mast) {
  const n = R.needles, kmh = mast ? 0 : Math.max(0, S.v * 3.6), vz = S.vzDisp;
  const set = (k, deg) => { if (n[k]) n[k].rotation.z = -deg * D; };
  set('hoehe', -150 + clamp(S.alt / 1200, 0, 1) * 300); set('hoehe2', -150 + clamp(S.alt / 1200, 0, 1) * 300);
  set('vario', -90 + clamp(vz / 5, -1, 1) * 165); set('vario2', -90 + clamp(vz / 5, -1, 1) * 165);
  set('stato', clamp(vz, -1, 1) * 70);
  set('neig20', 180 + clamp(S.pitch, -20, 20) * 3); set('neig5', 180 + clamp(S.pitch, -5, 5) * 15);
  for (const k of ['hrBb', 'hrG', 'hrStb']) set(k, clamp(S.elev, -20, 20) * 5);
  for (const k of ['srO', 'srU']) set(k, clamp(S.rud, -20, 20) * 5);
  set('fahrt', -135 + clamp(kmh / 150, 0, 1) * 270);
  for (let i = 0; i < 4; i++) set('rpm' + i, -135 + clamp(Math.abs(S.rpm[i]) / 1650, 0, 1) * 270);
  // Räder: 5° Ruder = 90° Raddrehung (Annahme), Steuerbord bzw. „hoch“ = im Uhrzeigersinn
  R.wheels.s.rotation.z = -(S.rud / STEP) * 90 * D;
  R.wheels.h.rotation.z = -(S.elev / STEP) * 90 * D;
  // Kompassrosen: Kreiseltochter zeigt den Kurs, Magnetkompass mit kleiner Ablenkung (Annahme 2°)
  R.cards.bin.rotation.z = S.head; R.cards.kurs.rotation.z = S.head; R.cards.mag.rotation.z = -(S.head + 2 * D);
  for (let i = 0; i < 4; i++) { S.teleAng[i] = toward(S.teleAng[i], mast ? ST[I_STOP].ang : ST[S.tele[i]].ang, 400 * dt); R.tele[i].rotation.z = -S.teleAng[i] * D; }
  const BL = LAYOUT.ballast;
  for (let i = 0; i < 7; i++) R.tanks[i].position.y = BL.tankY0 + (BL.tankY1 - BL.tankY0) * clamp(S.tanks[i] / TANK, 0, 1);
  for (let j = 0; j < 8; j++) R.sacks[j].material = S.sacks[j] ? R.mat.mLampGreen : R.mat.mLampRed;
  R.trim.position.x = (BL.trimX0 + BL.trimX1) / 2 - clamp(S.trim / 2000, -1, 1) * (BL.trimX1 - BL.trimX0) / 2;
  const hp = pressureHeight(S);
  for (let i = 0; i < 16; i++) R.cells[i].material = S.alt >= hp + CELL_OFF[i] ? R.mat.mLampRed : R.mat.mLampOff;
}

export function onMode(mode, C) {
  if (!S) return;
  if (mode === 'mast') { S.tele.fill(I_STOP); S.v = 0; S.pitch = 0; S.yaw = 0; S.vs = 0; S.vz = 0; S.valveT = 0; S.handrad = false; S.flow = 0; S.rudSet = S.rud = 0; S.elevSet = S.elev = 0; }
  else { S.tele.fill(I_REISE); S.dirs.fill(-1); S.rpm.fill(RPM_REISE); S.v = Number.isFinite(C.sim.speed) && C.sim.speed > 0 ? C.sim.speed : VC; S.pitch = 0; }
  hudT = 0;
}
