// Detailmodul: Führergondel (innen und außen), Treppe zum Kielgang und Funkraum.
// Ergänzt die Grundausstattung aus keel.js – keine bestehenden Teile werden verändert.
// Ausstattung nach research/gondel_mast.md (airships.net „Control Car“). Alle Höhen relativ zu G_Y / G_YC.
// Die beweglichen Teile (Zeiger, Räder, Hebel, Lampen) baut feature_controls.js nach LAYOUT.
import * as THREE from 'three';
import { V, rng } from './util.js';
import { keelY, GX0, GX1, G_Y, G_YC, G_HW } from './hull.js';
import { chair, table } from './decks.js';

const V3 = THREE.Vector3, UP = new THREE.Vector3(0, 1, 0), D = Math.PI / 180;
const F0 = (h) => G_Y + h;

// ---------- Lage der bedienbaren / lebenden Instrumente (gemeinsam mit feature_controls.js) ----------
export const LAYOUT = {
  // Höhenruderbrett an der Backbordwand über dem Fensterband, Blick des Rudergängers nach −z
  board: { x0: 204.42, x1: 205.98, z: -1.138, top: F0(2.115), bot: F0(1.965), d: 0.13 },
  boardSlots: { top: [204.56, 204.72, 204.88, 205.04, 205.2, 205.36, 205.52, 205.68, 205.84], bot: [204.56, 204.72, 204.88, 205.04, 205.2, 205.36, 205.52, 205.68, 205.84] },
  live: { stato: [205.68, 'top'], vario: [205.84, 'top'], hrBb: [204.72, 'bot'], hrG: [204.88, 'bot'], hrStb: [205.04, 'bot'], neig5: [205.36, 'bot'], neig20: [205.52, 'bot'], hoehe: [205.68, 'bot'] },
  // Wandbrett Steuerbord über den Telegrafen (Blick nach +z): Uhr, Barometer, Höhenmesser, Variometer, Fahrtmesser
  wall: { z: 1.262, y: F0(2.06), d: 0.19, uhr: 204.56, baro: 204.78, hoehe: 205.0, vario: 205.22, fahrt: 205.44 },
  // Deckenkasten vor dem Seitenrudergänger (Blick nach +x): Seitenruder oben, Kreiseltochter, Seitenruder unten
  box: { x: 207.12, y: G_YC - 0.175, d: 0.17, zO: -0.24, zK: 0, zU: 0.24 },
  binnacle: [206.98, F0(1.078), 0],          // Kreiseltochter im Kompasshaus, Rose waagerecht
  magnet: [206.95, G_YC - 0.252, 0.45],       // Hängekompass unter der Decke, von unten abzulesen
  wheelS: [206.72, F0(1.05), 0],              // Seitenrad (Achse x)
  wheelH: [205.5, F0(1.05), -0.93],           // Höhenrad (Achse z)
  tele: [[204.55, 1.0, 'Vorn Backbord'], [205.1, 1.0, 'Vorn Steuerbord'], [205.75, 1.0, 'Achtern Backbord'], [206.3, 0.93, 'Achtern Steuerbord']],
  teleY: F0(1.1), rpmY: F0(1.43),
  // Telegrafenstellungen nach AN-CC (deutscher Wortlaut unbelegt); ang = Uhrzeigersinn ab 12 Uhr, voraus rechts
  stations: [
    { n: 'Zurück Voll', s: 'Voll', ang: -90, rpm: 1100, dir: -1 },
    { n: 'Zurück Leerlauf', s: 'Leerlauf', ang: -40, rpm: 450, dir: -1 },
    { n: 'Stopp', s: 'Stopp', ang: 0, rpm: 0, dir: 0 },
    { n: 'Voraus Leerlauf', s: 'Leerlauf', ang: 30, rpm: 450, dir: 1 },
    { n: 'Langsam voraus', s: 'Langsam', ang: 60, rpm: 800, dir: 1 },
    { n: 'Halbe Fahrt voraus', s: 'Halb', ang: 90, rpm: 1100, dir: 1 },
    { n: 'Reisefahrt', s: 'Reise', ang: 120, rpm: 1350, dir: 1 },
  ],
  // Ballasttafel rechts (= bugwärts) vom Höhenruderbrett, Front achsparallel (Blick nach −z)
  ballast: { x0: 205.96, x1: 206.66, y0: F0(1.875), y1: F0(2.195), z: -0.985,
    tankX: (i) => 205.995 + i * 0.05, tankY0: F0(1.925), tankY1: F0(2.135),
    lampX: (j) => 206.39 + j * 0.07, lampBug: F0(2.115), lampHeck: F0(2.045), trimY: F0(1.95), trimX0: 206.38, trimX1: 206.63,
    pullY: F0(1.893), notX: (j) => 206.375 + j * 0.036 },
  // Zellenschema der Gastafel: Platte unter dem Achterende der Deckentafel, Blick nach −x
  gas: { x: 205.205, y0: G_YC - 0.4, y1: G_YC - 0.17, z0: -0.83, z1: -0.17, lampY: G_YC - 0.25, lampZ: (i) => -0.8 + (i + 0.5) * 0.0375 },
  handrad: [206.68, G_YC - 0.3, -0.5],
  autopilot: { x0: 206.6, x1: 206.9, y0: F0(0.5), y1: F0(0.85), z: 0.86 },
  sammel: { x0: 205.66, x1: 206.22, y0: F0(1.93), y1: F0(2.17), z: 1.1 },
};

// ---------- frei gezeichnete Flächen (128×128) ----------
// Telegrafenzifferblatt ohne Zeiger (Hebel und Zeiger bewegt feature_controls.js)
function drawTele(g) {
  const P = (deg, r) => [64 + Math.cos((deg - 90) * D) * r, 64 + Math.sin((deg - 90) * D) * r];
  g.fillStyle = '#b9954a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#f3efe2'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  g.fillStyle = '#a3261c'; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 58, (-112 - 90) * D, (-20 - 90) * D); g.closePath(); g.fill();
  g.fillStyle = '#d8cfb4'; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 58, (15 - 90) * D, (135 - 90) * D); g.closePath(); g.fill();
  g.fillStyle = '#f3efe2'; g.beginPath(); g.arc(64, 64, 49, 0, 7); g.fill();
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.2;
  for (const deg of [-112, -65, -20, 15, 45, 75, 105, 135]) { const [a, b] = P(deg, 22), [c, d] = P(deg, 58); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const st of LAYOUT.stations) {
    const [x, y] = P(st.ang, 37); g.fillStyle = st.dir < 0 ? '#7a1a12' : '#1a1a1a'; g.font = st.dir === 0 ? 'bold 9px Arial' : 'bold 7px Arial'; g.fillText(st.s, x, y);
    const [a, b] = P(st.ang, 50), [c, d] = P(st.ang, 57); g.strokeStyle = st.dir < 0 ? '#f3efe2' : '#1a1a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
  }
  g.font = 'bold 7px Arial'; g.fillStyle = '#1a1a1a'; g.fillText('VORAUS', 92, 108); g.fillStyle = '#a3261c'; g.fillText('ZURÜCK', 36, 108);
  g.fillStyle = '#2a1d0c'; g.beginPath(); g.arc(64, 64, 6, 0, 7); g.fill();
}
// Ballasttafel: 7 Haupttanks mit Füllstandsrohren, 8 Notballastsäcke mit Lampen, Trimmanzeige
function drawBallast(g) {
  const L = LAYOUT.ballast, W = L.x1 - L.x0, H = L.y1 - L.y0, k = H / W; // k: Zeichenstauchung, damit Schrift unverzerrt erscheint
  const px = (x) => (x - L.x0) / W * 128, py = (y) => (L.y1 - y) / H * 128;
  const txt = (t, x, y, size, col, bold = true) => { g.save(); g.translate(px(x), py(y)); g.scale(k, 1); g.fillStyle = col; g.font = `${bold ? 'bold ' : ''}${size}px Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
  g.fillStyle = '#1e2124'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b9954a'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 126, 128, 2); g.fillRect(0, 0, 1, 128); g.fillRect(127, 0, 1, 128);
  g.fillRect(px(206.343), 4, 1, 120);
  txt('WASSERBALLAST', 206.15, L.y1 - 0.016, 14, '#e9e2cc'); txt('NOTBALLAST', 206.505, L.y1 - 0.016, 14, '#e9e2cc');
  for (let i = 0; i < 7; i++) {
    const x = L.tankX(i), a = px(x - 0.011), b = px(x + 0.011);
    g.fillStyle = '#efe7cf'; g.fillRect(a, py(L.tankY1), b - a, py(L.tankY0) - py(L.tankY1));
    g.fillStyle = '#7d9fb3'; g.fillRect(a + 1, py(L.tankY1) + 1, b - a - 2, py(L.tankY0) - py(L.tankY1) - 2);
    g.fillStyle = '#1a1a1a';
    for (let q = 0; q <= 4; q++) { const y = py(L.tankY0 + (L.tankY1 - L.tankY0) * q / 4); g.fillRect(b, y - 0.5, q % 2 ? 2 : 4, 1); }
    txt(String(i + 1), x, L.tankY0 - 0.012, 11, '#e9e2cc');
  }
  txt('Bug · Ring 218', 206.495, L.lampBug + 0.026, 12, '#c9bda3', false);
  txt('Heck · Ring 47', 206.495, L.lampHeck + 0.026, 12, '#c9bda3', false);
  for (let j = 0; j < 4; j++) for (const y of [L.lampBug, L.lampHeck]) { g.fillStyle = '#0c0c0c'; g.beginPath(); g.arc(px(L.lampX(j)), py(y), 4, 0, 7); g.fill(); }
  g.fillStyle = '#efe7cf'; g.fillRect(px(L.trimX0), py(L.trimY) - 3, px(L.trimX1) - px(L.trimX0), 6);
  g.fillStyle = '#1a1a1a'; for (let q = 0; q <= 4; q++) g.fillRect(px(L.trimX0 + (L.trimX1 - L.trimX0) * q / 4) - 0.5, py(L.trimY) - 3, 1, q === 2 ? 8 : 5);
  txt('Bug schwer', L.trimX0 + 0.04, L.trimY + 0.022, 10, '#c9bda3', false); txt('Heck schwer', L.trimX1 - 0.04, L.trimY + 0.022, 10, '#c9bda3', false);
  txt('2000 kg  ·  0  ·  2000 kg', 206.505, L.trimY - 0.02, 9, '#c9bda3', false);
}
// Gastafel: Zellenschema mit 16 Lampenplätzen (rot = Zelle prall) und Druckanzeigen
function drawGas(g) {
  const L = LAYOUT.gas, W = L.z1 - L.z0, H = L.y1 - L.y0, k = H / W;
  const px = (z) => (z - L.z0) / W * 128, py = (y) => (L.y1 - y) / H * 128;
  const txt = (t, z, y, size, col, bold = true) => { g.save(); g.translate(px(z), py(y)); g.scale(k, 1); g.fillStyle = col; g.font = `${bold ? 'bold ' : ''}${size}px Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
  g.fillStyle = '#23262a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b9954a'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 126, 128, 2);
  txt('GASZELLEN · FÜLLUNG UND DRUCK', -0.5, L.y1 - 0.018, 15, '#e9e2cc');
  // Schiffsumriss längs (Heck links, Bug rechts)
  g.strokeStyle = '#c9bda3'; g.lineWidth = 1; g.beginPath(); g.ellipse(64, py(L.lampY), 62, 13, 0, 0, 7); g.stroke();
  for (let i = 1; i < 16; i++) { const x = px((L.lampZ(i - 1) + L.lampZ(i)) / 2); g.beginPath(); g.moveTo(x, py(L.lampY) - 11); g.lineTo(x, py(L.lampY) + 11); g.stroke(); }
  for (let i = 0; i < 16; i++) {
    const x = px(L.lampZ(i));
    g.fillStyle = '#0c0c0c'; g.beginPath(); g.arc(x, py(L.lampY), 3, 0, 7); g.fill();
    txt(String(i + 1), L.lampZ(i), L.lampY - 0.035, 10, '#e9e2cc');
    g.fillStyle = '#efe7cf'; g.beginPath(); g.ellipse(x, py(L.y0 + 0.07), 2.6, 7.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#a3261c'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, py(L.y0 + 0.07)); g.lineTo(x + 1.6, py(L.y0 + 0.085)); g.stroke();
  }
  txt('◄ Heck', L.z0 + 0.06, L.y0 + 0.02, 11, '#c9bda3', false); txt('mm WS', -0.5, L.y0 + 0.02, 11, '#c9bda3', false); txt('Bug ►', L.z1 - 0.06, L.y0 + 0.02, 11, '#c9bda3', false);
}
function drawUhr(g) {
  g.fillStyle = '#2a2520'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f4efe0'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill();
  g.strokeStyle = '#1a1a1a';
  for (let m = 0; m < 60; m++) { const a = m * 6 * D, l = m % 5 ? 3 : 6; g.lineWidth = m % 5 ? 1 : 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.lineTo(64 + Math.cos(a) * (56 - l), 64 + Math.sin(a) * (56 - l)); g.stroke(); }
  g.fillStyle = '#1a1a1a'; g.font = 'bold 12px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) { const a = h * 30 * D - Math.PI / 2; g.fillText(String(h), 64 + Math.cos(a) * 43, 64 + Math.sin(a) * 43); }
  g.beginPath(); g.arc(64, 88, 9, 0, 7); g.lineWidth = 1; g.stroke();
  const hand = (deg, len, w) => { const a = deg * D - Math.PI / 2; g.lineWidth = w; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * len, 64 + Math.sin(a) * len); g.stroke(); };
  hand((10 + 12 / 60) * 30, 28, 4); hand(12 * 6, 42, 2.5);
  g.beginPath(); g.arc(64, 64, 4, 0, 7); g.fill();
}
function drawKarte(g) {
  const r = rng(129);
  g.fillStyle = '#d3e3e6'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(70,100,120,0.35)'; g.lineWidth = 1;
  for (let i = 8; i < 128; i += 16) { g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, 128); g.stroke(); g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(128, i + 0.5); g.stroke(); }
  const land = (pts) => { g.fillStyle = '#eadcb4'; g.strokeStyle = '#6a5a3a'; g.lineWidth = 1; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.stroke(); };
  const west = [[0, 0]]; for (let y = 0; y <= 128; y += 6) west.push([16 + 9 * Math.sin(y * 0.07) + r() * 6, y]); west.push([0, 128]); land(west);
  const east = [[128, 14]]; for (let y = 14; y <= 128; y += 6) east.push([104 + 7 * Math.sin(y * 0.09) + r() * 5, y]); east.push([128, 128]); land(east);
  const isl = []; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; isl.push([90 + Math.cos(a) * (5 + r() * 2), 44 + Math.sin(a) * (9 + r() * 2)]); } land(isl);
  const grl = []; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; grl.push([44 + Math.cos(a) * (14 + r() * 3), 2 + Math.sin(a) * (8 + r() * 2)]); } land(grl);
  g.fillStyle = 'rgba(40,70,100,0.5)'; for (let k = 0; k < 40; k++) g.fillRect(30 + r() * 70, 20 + r() * 100, 1, 1);
  g.strokeStyle = '#a3261c'; g.lineWidth = 1.6; g.setLineDash([4, 3]);
  g.beginPath(); g.moveTo(24, 92); g.quadraticCurveTo(64, 40, 106, 70); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#a3261c'; for (const t of [0.15, 0.35, 0.55, 0.72]) { const x = (1 - t) * (1 - t) * 24 + 2 * (1 - t) * t * 64 + t * t * 106, y = (1 - t) * (1 - t) * 92 + 2 * (1 - t) * t * 40 + t * t * 70; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  g.strokeStyle = '#2a2520'; g.lineWidth = 1; g.beginPath(); g.arc(62, 108, 10, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(62, 96); g.lineTo(65, 108); g.lineTo(62, 120); g.lineTo(59, 108); g.closePath(); g.fillStyle = '#2a2520'; g.fill();
  g.font = 'bold 7px Georgia,serif'; g.textAlign = 'center'; g.fillText('NORDATLANTIK', 66, 60);
}
function drawPeil(g) {
  g.fillStyle = '#17181a'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#e9e2cc'; g.fillStyle = '#e9e2cc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 9px Arial';
  g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
  for (let d = 0; d < 360; d += 5) { const a = d * D - Math.PI / 2, l = d % 45 === 0 ? 9 : d % 15 === 0 ? 5 : 3; g.lineWidth = d % 45 === 0 ? 2 : 1; g.beginPath(); g.moveTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.lineTo(64 + Math.cos(a) * (56 - l), 64 + Math.sin(a) * (56 - l)); g.stroke(); if (d % 45 === 0) g.fillText(String(d), 64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40); }
  g.font = '8px Arial'; g.fillText('PEILUNG', 64, 82);
  const a = 62 * D - Math.PI / 2; g.strokeStyle = '#d23a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(64 - Math.cos(a) * 52, 64 - Math.sin(a) * 52); g.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); g.stroke();
  g.fillStyle = '#b9954a'; g.beginPath(); g.arc(64, 64, 6, 0, 7); g.fill();
}
function drawSkala(g) {
  g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#efe3c0'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  g.strokeStyle = '#2a2520'; g.fillStyle = '#2a2520'; g.font = 'bold 10px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 0; k <= 20; k++) { const a = Math.PI + k / 20 * Math.PI, l = k % 5 ? 5 : 10; g.lineWidth = k % 5 ? 1 : 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 54, 70 + Math.sin(a) * 54); g.lineTo(64 + Math.cos(a) * (54 - l), 70 + Math.sin(a) * (54 - l)); g.stroke(); if (k % 5 === 0) g.fillText(String(k * 5), 64 + Math.cos(a) * 34, 70 + Math.sin(a) * 34); }
  g.strokeStyle = '#a3261c'; g.lineWidth = 2; const a = Math.PI * 1.62; g.beginPath(); g.moveTo(64, 70); g.lineTo(64 + Math.cos(a) * 56, 70 + Math.sin(a) * 56); g.stroke();
}
function drawTelegramm(g) {
  const r = rng(37);
  g.fillStyle = '#f1ead2'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#7a2a20'; g.fillRect(6, 6, 116, 3);
  g.font = 'bold 13px Georgia,serif'; g.textAlign = 'center'; g.fillText('Funktelegramm', 64, 24);
  g.fillStyle = '#3a3020'; g.font = '8px Georgia,serif'; g.fillText('Luftschiff „Hindenburg“ · DEKAH', 64, 36);
  g.strokeStyle = 'rgba(60,50,30,0.45)'; g.lineWidth = 1;
  for (let y = 48; y < 120; y += 9) { g.beginPath(); g.moveTo(8, y + 0.5); g.lineTo(120, y + 0.5); g.stroke(); }
  g.fillStyle = 'rgba(30,30,40,0.75)';
  for (let y = 46; y < 100; y += 9) { let x = 10; while (x < 112) { const w = 4 + r() * 12; g.fillRect(x, y - 4, Math.min(w, 116 - x), 3); x += w + 3; } }
}

export default function (C) {
  const { b, M, nav } = C;
  const gy = G_Y, gc = G_YC, F = (h) => gy + h;
  const sign = C.sign, gauge = C.gauge, panel = C.panel;
  const mCellu = new THREE.MeshLambertMaterial({ color: 0xe6dcb0 });
  const mVisor = new THREE.MeshLambertMaterial({ color: 0x35503f, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const mCopper = new THREE.MeshPhongMaterial({ color: 0xb06a3a, specular: 0x886644, shininess: 50 });

  // Quader in beliebiger Lage: ax = Längsrichtung (lx), ay ≈ Hochrichtung (ly)
  const plate = (mat, c, ax, ay, lx, ly, lz) => {
    const x = ax.clone().normalize(), z = new V3().crossVectors(x, ay).normalize(), y = new V3().crossVectors(z, x);
    b.add(mat, new THREE.BoxGeometry(lx, ly, lz), new THREE.Matrix4().makeBasis(x, y, z).setPosition(c));
  };
  const pencil = (x, y, z, ang, mat, L = 0.17) => {
    const dx = Math.cos(ang) * L / 2, dz = Math.sin(ang) * L / 2;
    b.cyl(mat, V(x - dx, y, z - dz), V(x + dx * 0.8, y, z + dz * 0.8), 0.0045, 6);
    b.cyl(M.woodLight, V(x + dx * 0.8, y, z + dz * 0.8), V(x + dx, y, z + dz), 0.0045, 6, 0.0012);
  };
  const knob = (x, y, z, dz, r = 0.02) => { // Drehknopf, dz = Richtung (−1: zeigt nach −z)
    b.cyl(M.black, V(x, y, z), V(x, y, z + dz * 0.022), r, 10);
    b.cyl(M.brass, V(x, y, z), V(x, y, z + dz * 0.004), r * 1.45, 12);
  };
  const switchBox = (x, y, z, nx, noKnob) => { // Drehschalter auf einer Wand mit Normale ±x
    b.box(M.black, 0.02, 0.075, 0.075, x + nx * 0.01, y, z);
    b.cyl(M.enamel, V(x + nx * 0.02, y, z), V(x + nx * 0.032, y, z), 0.016, 8);
    if (!noKnob) b.box(M.black, 0.012, 0.012, 0.04, x + nx * 0.038, y, z);
  };
  const extinguisher = (x, z, nx) => { // Feuerlöscher an Wand mit Normale ±x (x = Wandfläche)
    const cx = x + nx * 0.075;
    b.vcyl(M.red, 0.065, 0.42, cx, F(0.12), z, 12); b.sph(M.red, 0.065, cx, F(0.54), z, 1, 0.5, 1, 12);
    b.vcyl(M.brass, 0.02, 0.07, cx, F(0.56), z, 8); b.box(M.steel, 0.012, 0.012, 0.09, cx, F(0.63), z + 0.03);
    b.cyl(M.rubber, V(cx, F(0.6), z - 0.02), V(cx + nx * 0.03, F(0.6), z - 0.07), 0.009, 5);
    b.cyl(M.rubber, V(cx + nx * 0.03, F(0.6), z - 0.07), V(cx + nx * 0.03, F(0.3), z - 0.08), 0.009, 5);
    b.cyl(M.brass, V(cx + nx * 0.03, F(0.3), z - 0.08), V(cx + nx * 0.03, F(0.24), z - 0.08), 0.008, 6, 0.005);
    for (const y of [F(0.25), F(0.45)]) b.box(M.aluDark, 0.07, 0.025, 0.15, x + nx * 0.035, y, z);
    b.vcyl(M.black, 0.067, 0.005, cx, F(0.2), z, 12);
  };

  // Gehäuse vor einer schrägen Bugwand (SEG 1 Backbord / SEG 4 Steuerbord), achsparallele Front bei zFront:
  // in schmalen Scheiben, deren Rückseite der Wandinnenseite folgt
  const wallZ = (x, side) => side * (G_HW - Math.max(0, x - 205.6) * 0.25 - 0.022);
  const stepCase = (mat, x0, x1, y0, y1, zFront, side) => {
    const n = Math.max(1, Math.ceil((x1 - x0) / 0.06));
    for (let i = 0; i < n; i++) {
      const xa = x0 + (x1 - x0) * i / n, xb = x0 + (x1 - x0) * (i + 1) / n, zb = wallZ(xb, side);
      if ((zb - zFront) * side > 0.002) b.bb(mat, xa, xb, y0, y1, Math.min(zb, zFront), Math.max(zb, zFront));
    }
  };

  // =====================================================================
  //  Grundriss der Gondel (wie keel.js) – Hilfen für Fenster und Außenhaut
  // =====================================================================
  const OL = [[GX0, -G_HW], [205.6, -G_HW], [207.4, -0.85], [GX1 + 0.1, 0], [207.4, 0.85], [205.6, G_HW], [GX0, G_HW]];
  const SEG = OL.map((p, i) => {
    const q = OL[(i + 1) % OL.length], dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
    return { i, p, q, len, t: new V3(dx / len, 0, dz / len), n: new V3(dz / len, 0, -dx / len), k: Math.max(1, Math.round(len / 0.85)) };
  });
  // Punkt auf Segment s bei Parameter u, o = Abstand nach außen (negativ = innen)
  const at = (s, u, o, y) => new V3(s.p[0] + (s.q[0] - s.p[0]) * u + s.n.x * o, y, s.p[1] + (s.q[1] - s.p[1]) * u + s.n.z * o);
  const corner = (i, o, y) => {
    const n1 = SEG[(i - 1 + SEG.length) % SEG.length].n, n2 = SEG[i].n, m = n1.clone().add(n2).normalize(), L = o / m.dot(n1);
    return new V3(OL[i][0] + m.x * L, y, OL[i][1] + m.z * L);
  };
  const ring = (o, y, fn) => SEG.forEach((s, i) => fn(corner(i, o, y), corner((i + 1) % SEG.length, o, y), s));

  // ---------------- Fenster: Laufschienen, Schiebefenster, Griffe, Fensterbänke, Sonnenblenden
  ring(-0.034, F(0.963), (a, c) => b.beam(M.alu, a, c, 0.014, 0.01));
  ring(-0.034, F(1.888), (a, c) => b.beam(M.alu, a, c, 0.014, 0.01));
  const noSill = (s, x0, x1, zm) => (zm < 0 && x0 < 205.75 && x1 > 205.25) || (zm > 0 && x0 < 204.0 && x1 > 203.4);
  for (const s of SEG) {
    const pl = s.len / s.k, du = 0.03 / s.len;
    for (let k = 0; k < s.k; k++) {
      const u0 = k / s.k, u1 = (k + 1) / s.k, um = (u0 + u1) / 2, pa = at(s, u0, 0, 0), pb = at(s, u1, 0, 0);
      if (k % 2 === 0) { // Schiebeflügel: Rahmen über die halbe Scheibe, Griff am Stoß
        const ua = u0 + du, ub = um;
        for (const y of [F(0.985), F(1.865)]) plate(M.alu, at(s, (ua + ub) / 2, -0.042, y), s.t, UP, (ub - ua) * s.len, 0.03, 0.012);
        for (const u of [ua, ub]) plate(M.alu, at(s, u, -0.042, F(1.425)), UP, s.n, 0.88, 0.012, 0.028);
        const h = at(s, ub - 0.035 / s.len, -0.058, F(1.42)); b.sph(M.brass, 0.014, h.x, h.y, h.z, 1, 1, 1, 8);
        const h2 = at(s, ub - 0.035 / s.len, -0.05, F(1.42)); b.cyl(M.brass, h2, at(s, ub - 0.035 / s.len, -0.042, F(1.42)), 0.006, 5);
      }
      // Riegelgriff unten Mitte
      const ug = Math.min(u1 - 0.07 / s.len, um + 0.12 / s.len);
      plate(M.brass, at(s, ug, -0.03, F(1.0)), s.t, UP, 0.03, 0.04, 0.012);
      plate(M.brass, at(s, ug, -0.048, F(1.01)), s.t, UP, 0.085, 0.016, 0.016);
      // Fensterbank
      if (!noSill(s, Math.min(pa.x, pb.x), Math.max(pa.x, pb.x), (pa.z + pb.z) / 2)) plate(M.woodLight, at(s, um, -0.07, F(0.945)), s.t, UP, pl - 0.06, 0.02, 0.1);
      // Sonnenblenden über den Bugfenstern (leicht nach innen geklappt)
      if (s.i >= 2 && s.i <= 4) { // Backbord-Schrägfenster (i = 1) frei für die Ballasttafel
        const hinge = at(s, um, -0.05, F(1.885)), d = s.n.clone().multiplyScalar(-Math.cos(20 * D)).add(new V3(0, -Math.sin(20 * D), 0));
        b.cyl(M.alu, at(s, u0 + du * 1.5, -0.05, F(1.885)), at(s, u1 - du * 1.5, -0.05, F(1.885)), 0.007, 6);
        plate(mVisor, hinge.clone().addScaledVector(d, 0.115), s.t, new V3().crossVectors(d, s.t), pl - 0.1, 0.004, 0.22);
        plate(M.aluDark, hinge.clone().addScaledVector(d, 0.228), s.t, new V3().crossVectors(d, s.t), pl - 0.1, 0.01, 0.012);
      }
    }
  }

  // =====================================================================
  //  Außenhaut der Gondel
  // =====================================================================
  // Nietleisten mit Nietreihen
  for (const y of [F(0.06), F(0.9), F(2.2)]) ring(0.024, y, (a, c, s) => {
    b.beam(M.hullSeam, a, c, 0.008, 0.03);
    const n = Math.floor(s.len / 0.12);
    for (let k = 1; k < n; k++) { const p = at(s, k / n, 0.029, y); b.sph(M.alu, 0.0065, p.x, p.y, p.z, 1, 1, 1, 4); }
  });
  // Regenrinne über dem Fensterband
  ring(0.042, F(1.918), (a, c) => b.beam(M.alu, a, c, 0.044, 0.01));
  ring(0.064, F(1.935), (a, c) => b.beam(M.alu, a, c, 0.006, 0.03));
  // Umlaufende Handreling für die Haltemannschaft
  { const RY = F(0.5), RO = 0.15;
    ring(RO, RY, (a, c) => { b.cyl(M.alu, a, c, 0.016, 6); b.sph(M.alu, 0.02, a.x, a.y, a.z, 1, 1, 1, 6); });
    for (const s of SEG) {
      const n = Math.max(1, Math.round(s.len / 0.75));
      for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; b.cyl(M.alu, at(s, u, 0.02, RY), at(s, u, RO, RY), 0.01, 5); const f = at(s, u, 0.025, RY); b.sph(M.aluDark, 0.018, f.x, f.y, f.z, 1, 1, 1, 6); }
    }
  }
  // Positionslichter: Backbord rot (−z), Steuerbord grün (+z), Hecklicht weiß
  for (const [s, mat] of [[-1, M.navRed], [1, M.navGreen]]) {
    const zw = s * (G_HW + 0.02);
    b.bb(M.aluDark, 205.13, 205.27, F(2.0), F(2.1), Math.min(zw, zw + s * 0.05), Math.max(zw, zw + s * 0.05));
    b.bb(mat, 205.15, 205.25, F(2.02), F(2.08), Math.min(zw + s * 0.05, zw + s * 0.058), Math.max(zw + s * 0.05, zw + s * 0.058));
    b.bb(M.aluDark, 205.11, 205.29, F(2.1), F(2.11), Math.min(zw, zw + s * 0.075), Math.max(zw, zw + s * 0.075));
  }
  b.bb(M.aluDark, 197.93, 197.98, F(2.0), F(2.1), -0.07, 0.07); b.bb(M.navWhite, 197.922, 197.93, F(2.02), F(2.08), -0.05, 0.05);
  // Scheinwerfer unter dem Bug
  { const p0 = V(207.22, F(-0.22), 0), p1 = V(207.48, F(-0.29), 0), dir = p1.clone().sub(p0).normalize();
    b.beam(M.aluDark, V(207.3, F(-0.08), 0), V(207.3, F(-0.17), 0), 0.05, 0.05);
    b.cyl(M.aluDark, V(207.3, F(-0.17), -0.09), V(207.3, F(-0.17), 0.09), 0.025, 8);
    b.cyl(M.steel, p0, p1, 0.1, 14, 0.125);
    b.cyl(M.enamel, p1, p1.clone().addScaledVector(dir, 0.006), 0.115, 14);
    b.add(M.steel, new THREE.TorusGeometry(0.122, 0.01, 5, 18), new THREE.Matrix4().makeBasis(new V3(0, 0, 1), new V3().crossVectors(dir, new V3(0, 0, 1)), dir).setPosition(p1.clone().addScaledVector(dir, 0.004)));
    b.sph(M.steel, 0.1, p0.x, p0.y, p0.z, 1, 1, 1, 10);
  }
  // Landerad: Nabe, Achse, Gabel, Federbeine, abgerundete Verkleidung, Lauffläche
  { const X = 203, Y = F(-0.75);
    b.cyl(M.alu, V(X, Y, -0.16), V(X, Y, 0.16), 0.13, 12);
    for (const z of [-0.165, 0.165]) b.sph(M.alu, 0.07, X, Y, z, 1, 1, 0.4, 10);
    b.cyl(M.steel, V(X, Y, -0.27), V(X, Y, 0.27), 0.03, 8);
    for (const z of [-0.1, 0.1]) b.torus(M.rubber, 0.405, 0.03, X, Y, z, 'z', 24);
    for (const s of [-1, 1]) {
      b.beam(M.aluDark, V(X, F(-0.5), s * 0.21), V(X, Y, s * 0.21), 0.14, 0.025);
      b.cyl(M.steel, V(202.6, F(-0.52), s * 0.235), V(202.78, F(-0.63), s * 0.235), 0.032, 8);
      b.cyl(M.alu, V(202.78, F(-0.63), s * 0.235), V(X - 0.02, Y + 0.02, s * 0.235), 0.02, 8);
      b.sph(M.steel, 0.035, X, Y, s * 0.235, 1, 1, 1, 8);
    }
    for (const x of [202.55, 203.45]) b.cyl(M.aluDark, V(x, F(-0.3), -0.25), V(x, F(-0.3), 0.25), 0.25, 14);
    for (const z of [-0.252, 0.252]) for (let k = 0; k < 7; k++) { const x = 202.6 + k * 0.133; b.sph(M.alu, 0.007, x, F(-0.1), z, 1, 1, 1, 4); b.sph(M.alu, 0.007, x, F(-0.5), z, 1, 1, 1, 4); }
    b.bb(M.hullSeam, 202.5, 203.5, F(-0.08), F(-0.06), -0.27, 0.27);
  }
  // Stoßpuffer an den Ecken des Gondelbodens
  for (const [x, z] of [[198.35, -0.95], [198.35, 0.95], [206.6, -0.55], [206.6, 0.55]]) {
    b.bb(M.aluDark, x - 0.09, x + 0.09, F(-0.1), F(-0.08), z - 0.09, z + 0.09);
    b.sph(M.rubber, 0.085, x, F(-0.13), z, 1, 0.55, 1, 10);
  }
  // Rahmenantenne des Funkpeilers unter dem Boden
  { const x = 204.0, z = 0.6, yc = F(-0.5);
    b.sph(M.aluDark, 0.08, x, F(-0.1), z, 1, 0.5, 1, 10);
    b.cyl(M.steel, V(x, F(-0.1), z), V(x, yc + 0.18, z), 0.02, 8);
    b.torus(M.aluDark, 0.18, 0.016, x, yc, z, 'x', 20);
    b.cyl(M.alu, V(x, yc - 0.18, z), V(x, yc + 0.18, z), 0.007, 5);
    b.sph(M.enamel, 0.025, x, yc + 0.18, z, 1, 1, 1, 8);
  }

  // =====================================================================
  //  Steuerraum (x 204.38 … 207.6)
  // =====================================================================
  // --- Seitenruderstand: Kompasshaus mit Kreiseltochter (die Rose dreht feature_controls.js), Steuerstrich bugseitig
  b.torus(M.brass, 0.092, 0.008, 206.98, F(1.072), 0, 'y', 20);
  b.sph(M.glassClear, 0.09, 206.98, F(1.075), 0, 1, 0.35, 1, 14);
  b.vcyl(M.brass, 0.115, 0.012, 206.98, F(0.94), 0, 14);
  b.box(M.red, 0.018, 0.01, 0.006, 207.055, F(1.082), 0);
  sign('Kreiseltochter', 206.98, F(0.985), -0.118, 0.022, 'z-', 'brass');
  b.cyl(M.brass, V(206.72, F(1.05), 0), V(206.8, F(1.05), 0), 0.026, 8);            // Welle
  b.cyl(M.brass, V(206.69, F(1.05), 0), V(206.75, F(1.05), 0), 0.045, 10);           // Nabe (Speichen und Griffe: feature_controls.js)
  b.bb(M.aluDark, 206.76, 207.14, gy, F(0.03), -0.19, 0.19);                           // Fußflansch
  b.bb(M.alu, 206.792, 206.8, F(0.12), F(0.42), -0.1, 0.1);                            // Wartungsklappe
  for (const y of [F(0.14), F(0.4)]) for (const z of [-0.08, 0.08]) b.sph(M.steel, 0.008, 206.79, y, z, 1, 1, 1, 4);
  sign('Seitensteuer', 206.794, F(0.55), 0, 0.035, 'x-', 'brass');
  for (const z of [-0.07, 0.07]) b.cyl(M.steel, V(207.1, F(0.3), z), V(207.3, gy, z), 0.008, 5); // Steuerseile in den Boden
  for (const z of [-0.07, 0.07]) b.cyl(M.brass, V(207.3, gy, z), V(207.3, F(0.015), z), 0.02, 8);
  // Gummimatte für den Seitenrudergänger
  b.bb(M.rubber, 205.95, 206.62, gy, F(0.012), -0.38, 0.38);
  for (let k = 0; k < 7; k++) b.bb(M.rubber, 205.98, 206.59, F(0.012), F(0.018), -0.34 + k * 0.11, -0.32 + k * 0.11);
  // Deckenkasten vor dem Rudergänger: Anzeiger oberes Seitenruder – Kreiseltochter (Kurs) – unteres Seitenruder (Zeiger: feature_controls.js)
  b.bb(M.aluDark, 207.12, 207.24, gc - 0.3, gc - 0.05, -0.36, 0.36);
  for (const z of [-0.34, 0.34]) b.sph(M.steel, 0.01, 207.115, gc - 0.075, z, 1, 1, 1, 4);
  { const X = LAYOUT.box;
    for (const z of [X.zO, X.zK, X.zU]) b.torus(M.brass, X.d / 2 + 0.004, 0.006, X.x - 0.004, X.y, z, 'x', 18);
    sign('oberes Ruder', X.x - 0.007, gc - 0.283, X.zO, 0.018, 'x-', 'dark');
    sign('unteres Ruder', X.x - 0.007, gc - 0.283, X.zU, 0.018, 'x-', 'dark'); }
  // Magnetkompass als Hängekompass unter der Decke (von unten abzulesen; Rose: feature_controls.js)
  { const [x, y, z] = LAYOUT.magnet;
    b.vcyl(M.aluDark, 0.06, 0.012, x, gc - 0.062, z, 12);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; b.cyl(M.brass, V(x + Math.cos(a) * 0.05, gc - 0.06, z + Math.sin(a) * 0.05), V(x + Math.cos(a) * 0.078, y + 0.045, z + Math.sin(a) * 0.078), 0.005, 5); }
    b.vcyl(M.brass, 0.085, 0.04, x, y + 0.006, z, 14);
    b.torus(M.brass, 0.085, 0.007, x, y - 0.004, z, 'y', 18);
    b.vcyl(M.glassClear, 0.08, 0.003, x, y - 0.007, z, 14);
    b.box(M.red, 0.012, 0.004, 0.004, x + 0.074, y - 0.002, z);                       // Steuerstrich
    sign('Magnetkompass', x - 0.088, y + 0.026, z, 0.02, 'x-', 'brass'); }
  // Zweiter (optischer) Abtriftmesser neben dem Seitenruderstand
  { const x = 206.45, z = -0.65;
    b.vcyl(M.aluDark, 0.1, 0.012, x, gy, z, 12); b.vcyl(M.steel, 0.045, 0.98, x, gy, z, 10);
    b.vcyl(M.brass, 0.07, 0.05, x, F(0.98), z, 12); b.torus(M.brass, 0.07, 0.008, x, F(1.03), z, 'y', 14);
    b.cyl(M.black, V(x, F(1.0), z + 0.06), V(x, F(1.08), z + 0.13), 0.018, 8);
    b.cyl(M.rubber, V(x, F(1.08), z + 0.13), V(x, F(1.095), z + 0.145), 0.021, 8);
    for (const s of [-1, 1]) { b.cyl(M.steel, V(x + s * 0.07, F(1.0), z), V(x + s * 0.11, F(1.0), z), 0.006, 5); b.sph(M.black, 0.014, x + s * 0.115, F(1.0), z, 1, 1, 1, 8); }
    b.bb(M.brass, x - 0.045, x + 0.045, F(0.7), F(0.73), z + 0.045, z + 0.049);
    sign('Abtriftmesser', x, F(0.715), z + 0.055, 0.02, 'z+', 'brass');
    nav.block(x - 0.12, x + 0.12, z - 0.12, z + 0.16, gy, gy + 1.1);
    b.shadow(M.shadow, x, gy, z, 0.3, 0.3); }
  // Selbststeuergerät (Anschütz) – Lage in der Gondel unbelegt (Annahme): Steuerbordwand unter dem Fenster
  { const A = LAYOUT.autopilot;
    stepCase(M.aluDark, A.x0, A.x1, A.y0, A.y1, A.z, 1);
    b.bb(M.black, A.x0 + 0.015, A.x1 - 0.015, A.y0 + 0.02, A.y1 - 0.02, A.z - 0.006, A.z);
    for (const x of [206.67, 206.83]) { knob(x, F(0.62), A.z - 0.006, -1, 0.017); b.torus(M.brass, 0.032, 0.004, x, F(0.62), A.z - 0.009, 'z', 12); }
    b.cyl(M.steel, V(206.75, F(0.66), A.z - 0.006), V(206.75, F(0.71), A.z - 0.05), 0.007, 5); b.sph(M.red, 0.016, 206.75, F(0.71), A.z - 0.052, 1, 1, 1, 8);
    b.cyl(M.enamel, V(206.86, F(0.76), A.z - 0.006), V(206.86, F(0.76), A.z - 0.014), 0.01, 8);
    sign('Selbststeuerung', 206.75, F(0.8), A.z - 0.008, 0.024, 'z-', 'brass');
    nav.block(A.x0, A.x1, A.z - 0.06, 1.02, gy, A.y1); }

  // --- Höhenruderbrett: Gehäuse über dem Fensterband; deckt das Grundbrett aus keel.js ab
  //     oben: Uhr, Stoppuhr, Thermometer Außenluft / Zelle 5 / Zelle 13, Thermohygrometer, Gasdruck, Statoskop*, Variometer*
  //     unten: Höhenruder Bb* / gemeinsam* / Stb*, Neigungsmesser fein* (±5°) und grob* (±20°), Höhenmesser*   (* lebend)
  { const B = LAYOUT.board, S = LAYOUT.boardSlots;
    b.bb(M.aluDark, B.x0, 205.6, F(1.865), F(2.2), -1.27, B.z - 0.012);
    b.bb(M.aluDark, 205.6, B.x1, F(1.865), F(2.2), -1.17, B.z - 0.012);
    b.bb(M.black, B.x0 + 0.01, B.x1 - 0.01, F(1.875), F(2.19), B.z - 0.012, B.z);
    for (const x of [B.x0 + 0.04, B.x1 - 0.04]) for (const y of [F(1.89), F(2.175)]) b.sph(M.steel, 0.006, x, y, B.z, 1, 1, 1, 4);
    const gz = B.z + 0.006;
    panel('uhr', drawUhr, S.top[0], B.top, gz, B.d, B.d, 'z+');
    [['Stoppuhr', 12], ['Außenluft', 8], ['Gaszelle 5', 13], ['Gaszelle 13', 14], ['Thermohygr.', 15], ['Gasdruck', 6]].forEach(([t, sd], i) => gauge(S.top[i + 1], B.top, gz, B.d, 'z+', t, sd));
    const used = [...S.top.map((x) => [x, B.top]), ...[S.bot[1], S.bot[2], S.bot[3], S.bot[5], S.bot[6], S.bot[7]].map((x) => [x, B.bot])];
    for (const [x, y] of used) b.torus(M.brass, B.d / 2 + 0.003, 0.005, x, y, B.z + 0.004, 'z', 16);
    [['Bb', S.bot[1]], ['gemeinsam', S.bot[2]], ['Stb', S.bot[3]], ['fein', S.bot[5]], ['grob', S.bot[6]]].forEach(([t, x]) => sign(t, x, F(1.887), B.z + 0.005, 0.016, 'z+', 'dark'));
    b.bb(M.brass, S.bot[1] - 0.06, S.bot[3] + 0.06, F(2.035), F(2.042), B.z, B.z + 0.003); }
  b.cyl(M.brass, V(205.5, F(1.05), -0.96), V(205.5, F(1.05), -0.9), 0.045, 10);       // Nabe (Speichen und Griffe: feature_controls.js)
  b.cyl(M.brass, V(205.5, F(1.05), -1.01), V(205.5, F(1.05), -0.93), 0.026, 8);       // Welle
  b.bb(M.aluDark, 205.32, 205.68, gy, F(0.03), -1.26, -0.98);
  sign('Höhensteuer', 205.344, F(0.6), -1.12, 0.035, 'x-', 'brass');
  b.bb(M.alu, 205.42, 205.58, F(0.15), F(0.45), -1.008, -1.003);
  // Fußrost für den Höhenrudergänger
  for (const x of [205.2, 205.8]) b.bb(M.woodDark, x - 0.025, x + 0.025, gy, F(0.012), -0.85, -0.35);
  for (let k = 0; k < 7; k++) b.bb(M.woodLight, 205.15, 205.85, F(0.012), F(0.03), -0.84 + k * 0.07, -0.79 + k * 0.07);

  // --- Ballasttafel rechts (bugwärts) vom Höhenruderbrett: 7 Haupttanks à 2000 kg, 8 Notballastsäcke à 500 kg
  { const L = LAYOUT.ballast;
    stepCase(M.aluDark, L.x0, L.x1, F(1.865), F(2.2), L.z - 0.006, -1);
    b.bb(M.black, L.x0, L.x1, L.y0, L.y1, L.z - 0.006, L.z);
    panel('ballast', drawBallast, (L.x0 + L.x1) / 2, (L.y0 + L.y1) / 2, L.z + 0.006, L.x1 - L.x0, L.y1 - L.y0, 'z+');
    for (let i = 0; i < 7; i++) { const x = L.tankX(i); b.cyl(M.steel, V(x, L.pullY, L.z), V(x, L.pullY, L.z + 0.04), 0.004, 5); b.sph(M.black, 0.011, x, L.pullY, L.z + 0.046, 1, 1, 1, 8); }
    for (let j = 0; j < 8; j++) { const x = L.notX(j); b.cyl(M.steel, V(x, L.pullY, L.z), V(x, L.pullY, L.z + 0.035), 0.003, 4); b.cyl(M.red, V(x - 0.012, L.pullY, L.z + 0.038), V(x + 0.012, L.pullY, L.z + 0.038), 0.006, 6); } }

  // --- Gastafel an der Decke (Lage unbelegt, Annahme: wie bisher über dem Höhenrudergänger)
  //     14 Manöverventilzüge: die 16 Griffe aus keel.js werden ummantelt; Reihe Backbord (z −0.7) = Zellen 1–8,
  //     Reihe Mitte (z −0.35) = Zellen 9–16; Zellen 1+2 und 15+16 haben je einen gemeinsamen Zug
  { const cellX = (k) => 205.35 + k * 0.16;
    const grip = (x, z) => { b.cyl(M.woodDark, V(x - 0.035, gc - 0.375, z), V(x + 0.035, gc - 0.375, z), 0.011, 6); for (const s of [-1, 1]) b.sph(M.brass, 0.012, x + s * 0.036, gc - 0.375, z, 1, 1, 1, 6); };
    for (const [z, c0] of [[-0.7, 0], [-0.35, 8]]) for (let k = 0; k < 8; k++) {
      const x = cellX(k), cell = c0 + k + 1, pair = cell <= 2 || cell >= 15;
      b.bb(M.aluDark, x - 0.024, x + 0.024, gc - 0.288, gc - 0.158, z - 0.024, z + 0.024);
      b.cyl(M.rope, V(x, gc - 0.288, z), V(x, gc - (pair ? 0.33 : 0.37), z), 0.005, 4);
      if (!pair) { grip(x, z); sign(String(cell), x + 0.06, gc - 0.163, z, 0.022, 'y-', 'dark'); }
    }
    for (const [z, k0, t] of [[-0.7, 0, '1+2'], [-0.35, 6, '15+16']]) {
      const xa = cellX(k0), xb = cellX(k0 + 1), xm = (xa + xb) / 2;
      b.cyl(M.brass, V(xa, gc - 0.33, z), V(xb, gc - 0.33, z), 0.006, 6);
      b.cyl(M.rope, V(xm, gc - 0.33, z), V(xm, gc - 0.37, z), 0.005, 4);
      grip(xm, z); sign(t, xm, gc - 0.163, z, 0.022, 'y-', 'dark');
    }
    sign('Manöverventile', 205.193, gc - 0.12, -0.5, 0.04, 'x-', 'dark');
    for (const x of [205.25, 206.55]) for (const z of [-0.8, -0.2]) b.vcyl(M.steel, 0.008, 0.03, x, gc - 0.08, z, 5);
    // Zellenschema mit 16 Lampenplätzen und Druckanzeigen (Lampen: feature_controls.js)
    const G = LAYOUT.gas;
    b.bb(M.aluDark, G.x, G.x + 0.02, G.y0, G.y1, G.z0, G.z1);
    for (const z of [G.z0 + 0.03, G.z1 - 0.03]) b.bb(M.aluDark, G.x + 0.005, G.x + 0.015, G.y1, gc - 0.158, z - 0.01, z + 0.01);
    panel('gasschema', drawGas, G.x - 0.006, (G.y0 + G.y1) / 2, (G.z0 + G.z1) / 2, G.z1 - G.z0, G.y1 - G.y0, 'x-');
    // Großes Handrad: öffnet die Ventile der Zellen 3–11, 13, 14 gleichzeitig
    const [hx, hy, hz] = LAYOUT.handrad;
    b.cyl(M.aluDark, V(hx - 0.04, gc - 0.05, hz), V(hx - 0.04, hy, hz), 0.014, 8);
    b.cyl(M.steel, V(hx - 0.05, hy, hz), V(hx + 0.025, hy, hz), 0.012, 8);
    b.cyl(M.brass, V(hx - 0.01, hy, hz), V(hx + 0.015, hy, hz), 0.03, 10);
    b.torus(M.steel, 0.12, 0.011, hx, hy, hz, 'x', 20);
    for (let k = 0; k < 5; k++) { const a = k * 1.2566; b.cyl(M.steel, V(hx, hy, hz), V(hx, hy + Math.cos(a) * 0.115, hz + Math.sin(a) * 0.115), 0.006, 5); }
    b.sph(M.woodDark, 0.018, hx + 0.02, hy - 0.12, hz, 1, 1, 1, 6);
    b.cyl(M.steel, V(hx - 0.05, hy + 0.01, hz), V(206.58, gc - 0.16, hz), 0.004, 4);
    sign('Handrad 11 Zellen', hx - 0.056, gc - 0.13, hz, 0.022, 'x-', 'dark'); }

  // --- Maschinentelegrafen (vier Gondeln) mit Drehzahlmesser darüber; Hebel und Zeiger: feature_controls.js
  const tele = (x, z, name, isNew) => {
    if (isNew) {
      b.vcyl(M.brass, 0.04, 1.0, x, gy, z, 8);
      b.cyl(M.brass, V(x, F(1.1), z - 0.07), V(x, F(1.1), z + 0.07), 0.14, 14);
      b.cyl(M.enamel, V(x, F(1.1), z - 0.08), V(x, F(1.1), z - 0.07), 0.12, 14);
      nav.block(x - 0.15, x + 0.15, z - 0.15, z + 0.1, gy, gy + 1);
    }
    panel('telegraf', drawTele, x, F(1.1), z - 0.086, 0.19, 0.19, 'z-');
    b.torus(M.brass, 0.126, 0.01, x, F(1.1), z - 0.08, 'z', 18);
    b.sph(M.brass, 0.05, x, F(1.24), z, 1, 0.5, 1, 10);
    b.vcyl(M.brass, 0.085, 0.03, x, gy, z, 12);
    b.box(M.brass, 0.15, 0.045, 0.006, x, F(0.86), z - 0.043);
    sign(name, x, F(0.86), z - 0.05, 0.032, 'z-', 'dark');
    b.shadow(M.shadow, x, gy, z, 0.4, 0.4);
    const ry = LAYOUT.rpmY;
    b.cyl(M.brass, V(x, F(1.25), z), V(x, ry - 0.055, z), 0.012, 6);
    b.cyl(M.brass, V(x, ry, z - 0.06), V(x, ry, z + 0.02), 0.065, 14);
    b.torus(M.brass, 0.059, 0.006, x, ry, z - 0.062, 'z', 16);
  };
  for (const [x, z, name] of LAYOUT.tele) tele(x, z, name, x < 205 || x > 206);
  // Klingeltasten zu den Maschinisten und Sammelgeber für alle Telegrafen (Steuerbord, über dem Fenster)
  { const S = LAYOUT.sammel;
    stepCase(M.aluDark, S.x0, S.x1, S.y0, S.y1, S.z, 1);
    b.bb(M.black, S.x0 + 0.01, S.x1 - 0.01, S.y0 + 0.01, S.y1 - 0.01, S.z - 0.006, S.z);
    for (let i = 0; i < 4; i++) { const x = S.x0 + 0.1 + i * 0.12; b.cyl(M.brass, V(x, F(2.12), S.z - 0.006), V(x, F(2.12), S.z - 0.013), 0.016, 10); b.cyl(M.enamel, V(x, F(2.12), S.z - 0.013), V(x, F(2.12), S.z - 0.019), 0.01, 8); }
    for (const [x, m] of [[205.75, M.enamel], [206.12, M.red]]) { b.cyl(M.brass, V(x, F(2.0), S.z - 0.006), V(x, F(2.0), S.z - 0.02), 0.024, 12); b.cyl(m, V(x, F(2.0), S.z - 0.02), V(x, F(2.0), S.z - 0.03), 0.017, 10); }
    sign('Alle Maschinen', 205.935, F(2.0), S.z - 0.008, 0.024, 'z-', 'dark'); }

  // --- Wandinstrumente über dem Fensterband (Steuerbord): Uhr, Barometer, Höhenmesser*, Variometer*, Fahrtmesser* (* lebend; Fahrtmesser unbelegt)
  b.bb(M.black, 204.45, 205.58, F(1.93), F(2.19), 1.262, 1.278);
  panel('uhr', drawUhr, LAYOUT.wall.uhr, LAYOUT.wall.y, 1.256, 0.19, 0.19, 'z-');
  gauge(LAYOUT.wall.baro, LAYOUT.wall.y, 1.256, 0.19, 'z-', 'Barometer', 1);
  // Haltestange unter der Decke
  b.cyl(M.alu, V(204.6, gc - 0.13, 0.75), V(206.0, gc - 0.13, 0.75), 0.013, 6);
  for (const x of [204.65, 205.3, 205.95]) b.cyl(M.alu, V(x, gc - 0.13, 0.75), V(x, gc - 0.05, 0.75), 0.01, 5);

  // --- Sprachrohre an der Trennwand (Steuerraumseite): zum Funkraum und zu den Takelmeistern im Axialgang
  [[0.62, F(1.45), 'Funkraum'], [0.74, F(1.6), 'Axialgang']].forEach(([z, y, t]) => {
    b.cyl(M.brass, V(204.345, gy, z), V(204.345, gc - 0.05, z), 0.02, 8);
    for (const yy of [F(0.3), F(0.8), F(2.1)]) b.bb(M.aluDark, 204.32, 204.37, yy - 0.012, yy + 0.012, z - 0.03, z + 0.03);
    b.sph(M.brass, 0.026, 204.345, y, z, 1, 1, 1, 8);
    b.cyl(M.brass, V(204.345, y, z), V(204.42, y, z), 0.02, 8);
    b.cyl(M.brass, V(204.42, y, z), V(204.48, y, z), 0.02, 10, 0.04);
    b.cyl(M.brass, V(204.48, y + 0.035, z), V(204.488, y - 0.01, z), 0.042, 10);
    b.bb(M.brass, 204.362, 204.368, y + 0.05, y + 0.09, z - 0.055, z + 0.055);
    sign(t, 204.374, y + 0.07, z, 0.025, 'x+', 'brass');
  });
  // --- Bordtelefon (14 Sprechstellen) im Navigationsraum an der Trennwand, über dem Kartentisch
  { const x = 204.28, n = -1, z = -1.05, X = (d) => x + n * d, Y = (h) => F(h + 0.45);
    b.bb(M.woodDark, X(0.07), x, Y(0.55), Y(0.87), z - 0.09, z + 0.09);
    for (const dz of [-0.04, 0.04]) b.sph(M.brass, 0.028, X(0.05), Y(0.84), z + dz, 1, 1, 1, 8);
    b.cyl(M.black, V(X(0.09), Y(0.82), z - 0.06), V(X(0.09), Y(0.6), z - 0.06), 0.014, 6);
    b.sph(M.black, 0.026, X(0.09), Y(0.83), z - 0.06, 1, 1.2, 1, 8); b.sph(M.black, 0.028, X(0.09), Y(0.59), z - 0.06, 1, 1.2, 1, 8);
    b.box(M.steel, 0.03, 0.01, 0.01, X(0.085), Y(0.78), z - 0.06);
    b.cyl(M.steel, V(X(0.07), Y(0.68), z + 0.05), V(X(0.095), Y(0.68), z + 0.05), 0.008, 5);
    b.cyl(M.steel, V(X(0.095), Y(0.68), z + 0.05), V(X(0.095), Y(0.63), z + 0.07), 0.006, 5);
    b.cyl(M.black, V(X(0.095), Y(0.63), z + 0.07), V(X(0.12), Y(0.63), z + 0.07), 0.01, 6);
    b.cyl(M.rubber, V(X(0.07), Y(0.6), z), V(X(0.09), Y(0.58), z - 0.06), 0.004, 4);
    b.cyl(M.black, V(X(0.07), Y(0.74), z + 0.03), V(X(0.085), Y(0.74), z + 0.03), 0.018, 10); // Wählschalter
    b.torus(M.brass, 0.03, 0.004, X(0.072), Y(0.74), z + 0.03, 'x', 14);
    sign('Fernsprecher', X(0.006), Y(0.48), z, 0.035, 'x-', 'plate');
  }
  // --- Rohrpost zum Funkraum (Navigationsraum, Steuerbordwand vor dem Fensterpfosten)
  { const x = 203.067, z = 1.25;
    b.bb(M.aluDark, 202.94, 203.2, F(0.5), F(0.88), 1.16, 1.278);
    b.bb(M.brass, 202.96, 203.18, F(0.62), F(0.8), 1.154, 1.16);
    b.cyl(M.brass, V(203.07, F(0.65), 1.154), V(203.07, F(0.65), 1.14), 0.01, 6);
    b.cyl(M.aluDark, V(x, F(0.88), z), V(x, gc, z), 0.02, 10);
    for (const y of [F(1.3), F(1.85)]) b.torus(M.steel, 0.022, 0.005, x, y, z, 'y', 10);
    b.cyl(M.brass, V(202.98, F(0.902), 1.19), V(203.16, F(0.902), 1.19), 0.022, 10);
    sign('Rohrpost', 203.07, F(0.84), 1.153, 0.025, 'z-', 'brass');
  }
  extinguisher(204.32, -0.72, 1);
  sign('Feuerlöscher', 204.326, F(0.76), -0.72, 0.035, 'x+', 'red');
  switchBox(204.28, F(0.82), 0.62, -1);
  switchBox(202.48, F(0.82), 0.46, -1);
  switchBox(204.32, F(0.82), -0.6, 1, true); // Knebel des Landescheinwerfers: feature_interact.js
  { const z = -0.82, y = F(2.03);
    b.cyl(M.steel, V(204.32, F(2.15), z), V(204.4, F(2.15), z), 0.006, 5);
    b.cyl(M.steel, V(204.4, F(2.15), z), V(204.43, F(2.1), z), 0.005, 4);
    b.cyl(M.aluDark, V(204.34, y, z), V(204.52, y, z), 0.06, 12);
    b.cyl(M.enamel, V(204.52, y, z), V(204.526, y, z), 0.054, 12);
    b.torus(M.steel, 0.058, 0.007, 204.524, y, z, 'x', 14);
    b.cyl(M.steel, V(204.37, F(2.095), z), V(204.49, F(2.095), z), 0.008, 5);
    for (const x of [204.38, 204.48]) b.cyl(M.steel, V(x, F(2.09), z), V(x, F(2.1), z), 0.006, 4);
    b.cyl(M.aluDark, V(204.4, F(2.1), z + 0.04), V(204.5, F(2.1), z + 0.04), 0.012, 6);
    b.cyl(M.black, V(204.36, F(1.97), z), V(204.36, F(1.92), z + 0.01), 0.014, 6);
  }
  // --- Fernglas auf der Fensterbank (Steuerbord)
  for (const z of [1.205, 1.251]) {
    b.cyl(M.black, V(205.29, F(0.978), z), V(205.4, F(0.978), z), 0.022, 10);
    b.cyl(M.black, V(205.4, F(0.978), z), V(205.43, F(0.978), z), 0.024, 10, 0.026);
    b.cyl(M.rubber, V(205.27, F(0.978), z), V(205.29, F(0.978), z), 0.015, 8);
  }
  b.box(M.black, 0.04, 0.012, 0.05, 205.33, F(0.985), 1.228); b.cyl(M.brass, V(205.33, F(0.992), 1.228), V(205.33, F(1.0), 1.228), 0.008, 6);
  // --- Kabelkanal an der Backborddecke
  b.bb(M.aluDark, 198.2, 206.0, gc - 0.09, gc - 0.05, -1.08, -1.02);
  for (let x = 198.5; x < 206; x += 0.6) b.bb(M.alu, x - 0.01, x + 0.01, gc - 0.095, gc - 0.05, -1.09, -1.01);

  // =====================================================================
  //  Navigationsraum (x 202.58 … 204.22)
  // =====================================================================
  const TT = F(0.9); // Tischplatte oben
  panel('seekarte', drawKarte, 203.45, F(0.913), -0.9, 0.48, 0.86, 'y+');
  b.bb(M.woodDark, 202.75, 204.15, TT, F(0.915), -0.565, -0.55);                      // Tischleiste
  { // Kursdreieck aus Zelluloid
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.22, 0); sh.lineTo(0, 0.13); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(0.035, 0.025); hole.lineTo(0.14, 0.025); hole.lineTo(0.035, 0.087); hole.closePath(); sh.holes.push(hole);
    const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false });
    b.add(mCellu, tg, new THREE.Matrix4().makeRotationY(0.35).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(203.15, F(0.917), -1.05));
  }
  b.box(M.woodLight, 0.32, 0.004, 0.03, 203.65, F(0.916), -0.72, 0.2);                 // Lineal
  { const ap = V(203.62, F(0.918), -1.02); // Stechzirkel
    b.cyl(M.steel, ap, V(203.52, F(0.915), -1.06), 0.003, 4); b.cyl(M.steel, ap, V(203.53, F(0.915), -0.98), 0.003, 4); b.sph(M.brass, 0.008, ap.x, ap.y, ap.z, 1, 1, 1, 6); }
  pencil(203.78, F(0.918), -1.0, 1.2, M.upGreen); pencil(203.05, F(0.918), -0.72, -0.3, M.red); pencil(203.3, F(0.918), -0.66, 0.1, M.upGreen);
  b.box(M.upRed, 0.04, 0.012, 0.02, 203.85, F(0.919), -0.68, 0.3);                     // Radiergummi
  // Schubladen des Kartentisches
  [['Nordatlantik', 'Südatlantik', 0.68, 0.84], ['Europa', 'Nordamerika', 0.47, 0.66], ['Wetterkarten', 'Tabellen', 0.06, 0.45]].forEach(([t1, t2, y0, y1]) => {
    [[202.85, 203.43, t1], [203.47, 204.05, t2]].forEach(([x0, x1, t]) => {
      const xm = (x0 + x1) / 2, yh = F((y0 + y1) / 2 - 0.01);
      b.bb(M.alu, x0, x1, F(y0), F(y1), -0.6, -0.592);
      b.cyl(M.brass, V(xm - 0.06, yh, -0.578), V(xm + 0.06, yh, -0.578), 0.007, 6);
      for (const dx of [-0.055, 0.055]) b.cyl(M.brass, V(xm + dx, yh, -0.592), V(xm + dx, yh, -0.578), 0.005, 4);
      b.bb(M.brass, xm - 0.07, xm + 0.07, F(y1 - 0.042), F(y1 - 0.008), -0.592, -0.589);
      sign(t, xm, F(y1 - 0.025), -0.583, 0.028, 'z+', 'plate');
    });
  });
  // Chronometerkasten
  b.bb(M.woodDark, 202.79, 202.97, F(0.91), F(1.02), -1.17, -0.99);
  b.bb(M.brass, 202.85, 202.91, F(0.95), F(0.98), -0.99, -0.984);
  for (const x of [202.82, 202.94]) b.bb(M.brass, x - 0.015, x + 0.015, F(1.0), F(1.02), -1.176, -1.17);
  b.torus(M.brass, 0.066, 0.006, 202.88, F(1.024), -1.08, 'y', 18);
  panel('uhr', drawUhr, 202.88, F(1.026), -1.08, 0.12, 0.12, 'y+');
  // Logbuch, aufgeschlagen
  b.bb(M.leather, 203.95, 204.13, F(0.908), F(0.913), -0.92, -0.64);
  b.bb(M.paper, 203.955, 204.125, F(0.913), F(0.925), -0.915, -0.783);
  b.bb(M.paper, 203.955, 204.125, F(0.913), F(0.925), -0.777, -0.645);
  for (let k = 0; k < 6; k++) { b.bb(M.black, 203.97 + k * 0.025, 203.985 + k * 0.025, F(0.9255), F(0.926), -0.9, -0.8); }
  pencil(204.04, F(0.93), -0.78, 1.5, M.red, 0.15);
  // Pendelleuchte über dem Kartentisch
  b.cyl(M.black, V(203.45, gc - 0.05, -0.9), V(203.45, gc - 0.26, -0.9), 0.005, 4);
  b.cyl(M.alu, V(203.45, gc - 0.26, -0.9), V(203.45, gc - 0.34, -0.9), 0.04, 12, 0.12);
  b.sph(M.lamp, 0.035, 203.45, gc - 0.32, -0.9, 1, 1, 1, 8);
  // Bücherbord mit Handbüchern (Trennwand zum Steuerraum, Oberteil)
  b.bb(M.woodLight, 204.1, 204.28, F(1.91), F(1.93), -1.25, -0.56);
  for (const z of [-1.2, -0.62]) b.bb(M.aluDark, 204.24, 204.28, F(1.86), F(1.91), z - 0.01, z + 0.01);
  { const r = rng(52), mats = [M.upRed, M.upBlue, M.upGreen, M.upBrown, M.leather, M.woodDark];
    let z = -1.235;
    while (z < -0.62) {
      const t = 0.025 + r() * 0.03, h = 0.14 + r() * 0.07, d = 0.12 + r() * 0.03, m = mats[Math.floor(r() * mats.length)];
      if (z + t > -0.6) break;
      b.bb(m, 204.27 - d, 204.27, F(1.93), F(1.93 + h), z, z + t);
      if (r() > 0.4) b.bb(M.paper, 204.268 - d, 204.27 - d, F(1.93 + h * 0.6), F(1.93 + h * 0.75), z + 0.005, z + t - 0.005);
      z += t + 0.002;
    }
    b.bb(M.brass, 204.14, 204.27, F(1.93), F(2.08), -0.6, -0.594);
  }
  b.cyl(M.alu, V(204.11, F(2.03), -1.25), V(204.11, F(2.03), -0.56), 0.007, 5);
  for (const z of [-1.24, -0.57]) b.cyl(M.alu, V(204.11, F(1.93), z), V(204.11, F(2.03), z), 0.006, 4);
  sign('Handbücher', 204.093, F(1.92), -0.9, 0.018, 'x-', 'plate');
  // Wandbord mit Sextantenkasten (Trennwand zum Beobachtungsraum, Oberteil)
  b.bb(M.woodLight, 202.52, 202.72, F(1.91), F(1.93), -1.25, -0.6);
  for (const z of [-1.2, -0.66]) b.bb(M.aluDark, 202.52, 202.56, F(1.86), F(1.91), z - 0.01, z + 0.01);
  b.bb(M.woodDark, 202.54, 202.7, F(1.93), F(2.05), -1.15, -0.88);
  b.bb(M.brass, 202.7, 202.704, F(1.97), F(2.0), -1.03, -1.0);
  b.cyl(M.leather, V(202.62, F(2.05), -1.06), V(202.62, F(2.05), -0.97), 0.008, 5);
  sign('Sextant', 202.708, F(2.02), -1.08, 0.022, 'x+', 'brass');
  for (let k = 0; k < 3; k++) b.bb([M.upBlue, M.upRed, M.leather][k], 202.55, 202.7, F(1.93 + k * 0.03), F(1.958 + k * 0.03), -0.84 + k * 0.01, -0.66 - k * 0.01);
  // Kartenrollen im Ständer
  b.bb(M.woodLight, 202.54, 202.84, gy, F(0.02), 0.85, 1.22);
  for (const [x0, x1, z0, z1] of [[202.54, 202.84, 0.85, 0.865], [202.54, 202.84, 1.205, 1.22], [202.54, 202.555, 0.85, 1.22], [202.825, 202.84, 0.85, 1.22]]) b.bb(M.woodLight, x0, x1, gy, F(0.55), z0, z1);
  { const r = rng(77);
    for (let k = 0; k < 8; k++) {
      const x = 202.6 + (k % 3) * 0.085 + r() * 0.02, z = 0.9 + Math.floor(k / 3) * 0.1 + r() * 0.03, h = 0.66 + r() * 0.18, rr = 0.025 + r() * 0.012;
      b.vcyl(k % 3 === 1 ? M.linen : M.paper, rr, h, x, F(0.02), z, 8);
      b.torus(M.rope, rr + 0.002, 0.003, x, F(0.02 + h * 0.7), z, 'y', 10);
    }
  }
  nav.block(202.52, 202.84, 0.84, 1.24, gy, gy + 1);
  b.shadow(M.shadow, 202.69, gy, 1.03, 0.5, 0.55);
  // Funkpeiler mit Skala und Handrad
  panel('peil', drawPeil, 203.6, F(1.05), 0.894, 0.2, 0.2, 'z-');
  b.torus(M.brass, 0.103, 0.007, 203.6, F(1.05), 0.895, 'z', 18);
  b.torus(M.black, 0.055, 0.008, 203.83, F(1.05), 0.87, 'z', 14);
  b.cyl(M.steel, V(203.83, F(1.05), 0.9), V(203.83, F(1.05), 0.87), 0.01, 6);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; b.cyl(M.black, V(203.83, F(1.05), 0.87), V(203.83 + Math.cos(a) * 0.055, F(1.05) + Math.sin(a) * 0.055, 0.87), 0.005, 4); }
  b.cyl(M.black, V(203.875, F(1.08), 0.87), V(203.875, F(1.08), 0.845), 0.01, 6);
  gauge(203.6, F(1.206), 1.05, 0.12, 'y+', 'Empfang', 10);
  b.torus(M.black, 0.065, 0.008, 203.85, F(1.215), 1.1, 'y', 12);                      // Kopfhörer auf dem Gerät
  for (const dx of [-0.065, 0.065]) b.vcyl(M.black, 0.03, 0.025, 203.85 + dx, F(1.2), 1.1, 10);
  b.bb(M.alu, 203.35, 204.1, F(0.08), F(0.82), 0.742, 0.75);
  b.cyl(M.brass, V(204.0, F(0.5), 0.742), V(204.0, F(0.5), 0.725), 0.012, 6);
  for (const [x, y] of [[203.36, 0.1], [204.09, 0.1], [203.36, 0.8], [204.09, 0.8]]) b.sph(M.steel, 0.006, x, F(y), 0.741, 1, 1, 1, 4);

  // =====================================================================
  //  Beobachtungsraum (x 198.2 … 202.42)
  // =====================================================================
  // Bank: Polster, Rückenlehne, Paspel, Staukästen
  [[198.28, 198.82], [198.84, 199.36], [199.38, 199.88]].forEach(([x0, x1]) => b.bb(M.upGreen, x0, x1, F(0.47), F(0.505), -1.21, -0.81));
  b.bb(M.upGreen, 198.3, 199.86, F(0.52), F(0.88), -1.25, -1.2);
  for (const x of [198.3, 199.86]) b.bb(M.aluDark, x - 0.02, x + 0.02, F(0.5), F(0.88), -1.275, -1.25);
  b.cyl(M.trim, V(198.28, F(0.505), -0.81), V(199.88, F(0.505), -0.81), 0.007, 5);
  b.bb(M.woodLight, 199.88, 199.93, F(0.4), F(0.65), -1.25, -0.82);
  for (const [x0, x1] of [[198.32, 199.05], [199.12, 199.85]]) {
    b.bb(M.alu, x0, x1, F(0.06), F(0.36), -0.85, -0.845);
    b.cyl(M.brass, V((x0 + x1) / 2 - 0.05, F(0.3), -0.835), V((x0 + x1) / 2 + 0.05, F(0.3), -0.835), 0.006, 5);
  }
  b.bb(M.rubber, 198.25, 199.9, gy, F(0.05), -0.85, -0.84);
  b.shadow(M.shadow, 199.07, gy, -1.02, 1.9, 0.6);
  // Abtriftmesser (Optik durch den Boden, Drehring mit Teilung)
  { const x = 200.9, z = -1.0;
    b.vcyl(M.aluDark, 0.13, 0.012, x, gy, z, 14); b.torus(M.brass, 0.1, 0.012, x, F(0.012), z, 'y', 16);
    b.vcyl(M.steel, 0.055, 0.92, x, gy, z, 12);
    b.vcyl(M.brass, 0.1, 0.07, x, F(0.92), z, 14);
    gauge(x, F(0.996), z, 0.17, 'y+', 'Abdrift', 11);
    b.cyl(M.black, V(x, F(0.96), z + 0.09), V(x, F(1.06), z + 0.17), 0.022, 10);
    b.cyl(M.rubber, V(x, F(1.06), z + 0.17), V(x, F(1.08), z + 0.186), 0.026, 10);
    for (const s of [-1, 1]) { b.cyl(M.steel, V(x + s * 0.1, F(0.95), z), V(x + s * 0.16, F(0.95), z), 0.008, 5); b.sph(M.black, 0.018, x + s * 0.17, F(0.95), z, 1, 1, 1, 8); }
    b.beam(M.aluDark, V(x, F(0.6), z - 0.055), V(x, F(0.6), -1.28), 0.04, 0.04);
    b.bb(M.brass, x - 0.05, x + 0.05, F(0.68), F(0.715), z + 0.056, z + 0.06);
    sign('Abtriftmesser', x, F(0.6975), z + 0.066, 0.025, 'z+', 'brass');
    nav.block(x - 0.18, x + 0.18, -1.28, z + 0.19, gy, gy + 1.1);
    b.shadow(M.shadow, x, gy, z, 0.45, 0.45);
  }
  // Leuchtmunitionskasten (rot) unter der Treppe
  b.bb(M.red, 200.55, 201.05, gy, F(0.33), 0.6, 1.0);
  b.bb(M.red, 200.54, 201.06, F(0.33), F(0.36), 0.59, 1.01);
  for (const x of [200.64, 200.96]) b.bb(M.steel, x - 0.03, x + 0.03, F(0.36), F(0.365), 0.97, 1.0);
  b.bb(M.brass, 200.78, 200.82, F(0.27), F(0.34), 0.585, 0.59);
  for (const x of [200.555, 201.045]) b.cyl(M.steel, V(x, F(0.24), 0.75), V(x, F(0.24), 0.85), 0.008, 5);
  sign('Leuchtmunition', 200.8, F(0.16), 0.594, 0.045, 'z-', 'dark');
  b.shadow(M.shadow, 200.8, gy, 0.8, 0.7, 0.6);
  // Leuchtpistole im Halter und Feuerlöscher an der Rückwand
  { const x = 198.02;
    b.bb(M.woodDark, x, x + 0.03, F(0.55), F(0.85), -0.12, 0.08);
    b.bb(M.leather, x + 0.03, x + 0.08, F(0.6), F(0.76), -0.08, -0.01);
    b.box(M.steel, 0.03, 0.05, 0.05, x + 0.055, F(0.78), -0.045);
    plate(M.woodDark, V(x + 0.055, F(0.83), -0.035), new V3(0, 0.94, 0.34), new V3(1, 0, 0), 0.09, 0.028, 0.035);
    for (let k = 0; k < 4; k++) { b.vcyl(M.brass, 0.012, 0.012, x + 0.05, F(0.6), 0.015 + k * 0.016, 6); b.vcyl(M.red, 0.012, 0.07, x + 0.05, F(0.612), 0.015 + k * 0.016, 6); }
    b.bb(M.woodDark, x + 0.03, x + 0.07, F(0.58), F(0.6), 0.0, 0.08);
  }
  extinguisher(198.02, 0.25, 1);
  // Landeleinen-Trommel an der Rückwand
  { const x = 198.3, y = F(0.36);
    b.cyl(M.woodDark, V(x, y, -0.62), V(x, y, -0.28), 0.12, 12);
    b.cyl(M.rope, V(x, y, -0.61), V(x, y, -0.29), 0.175, 14);
    for (let k = 0; k < 6; k++) b.torus(M.rope, 0.172, 0.01, x, y, -0.6 + k * 0.058, 'z', 16);
    for (const z of [-0.625, -0.275]) b.cyl(M.aluDark, V(x, y, z - 0.008), V(x, y, z + 0.008), 0.22, 16);
    for (const z of [-0.66, -0.24]) { b.beam(M.aluDark, V(x, gy, z), V(x, y + 0.02, z), 0.32, 0.02); b.bb(M.aluDark, 198.03, 198.45, gy, F(0.03), z - 0.02, z + 0.02); }
    b.cyl(M.steel, V(x, y, -0.68), V(x, y, -0.22), 0.025, 8);
    b.beam(M.steel, V(x, y, -0.69), V(x + 0.12, y - 0.1, -0.69), 0.025, 0.012);
    b.cyl(M.woodLight, V(x + 0.12, y - 0.1, -0.69), V(x + 0.12, y - 0.1, -0.76), 0.014, 6);
    b.cyl(M.rope, V(x + 0.17, y - 0.02, -0.45), V(198.62, F(0.02), -0.45), 0.012, 5);
    b.torus(M.brass, 0.045, 0.01, 198.62, F(0.012), -0.45, 'y', 12); b.vcyl(M.black, 0.04, 0.008, 198.62, gy, -0.45, 10);
    b.bb(M.brass, x - 0.07, x + 0.07, F(0.12), F(0.16), -0.232, -0.229);
    sign('Landeleine', x, F(0.14), -0.226, 0.03, 'z+', 'brass');
    nav.block(198.03, 198.5, -0.75, -0.18, gy, gy + 0.7);
    b.shadow(M.shadow, 198.3, gy, -0.45, 0.6, 0.7);
  }
  // Raumschilder über den Durchgängen
  sign('Navigationsraum', 202.474, F(2.06), -0.32, 0.07, 'x-', 'plate');
  sign('Rauchen verboten', 202.526, F(2.07), 0.0, 0.06, 'x+', 'red');
  sign('Steuerraum', 204.274, F(2.06), 0.0, 0.07, 'x-', 'plate');

  // =====================================================================
  //  Treppe Kielgang ↔ Gondel: Geländerpfosten, Antrittspfosten, Trittkanten, Schild
  // =====================================================================
  { const sx0 = 199, sx1 = 202.2, sy1 = keelY(sx1), n = 13;
    for (let i = 0; i < n; i++) {
      const x0 = sx0 + (sx1 - sx0) * i / n, y = gy + (sy1 - gy) * (i + 1) / n;
      b.bb(M.rubber, x0 + 0.005, x0 + 0.045, y, y + 0.006, 0.5, 1.1);
    }
    for (const z of [0.47, 1.13]) {
      for (let k = 1; k <= 8; k++) { const t = k / 8, x = sx0 + (sx1 - sx0) * t, y = gy + (sy1 - gy) * t; b.cyl(M.alu, V(x, y + 0.05, z), V(x, y + 0.95, z), 0.01, 5); }
      b.vcyl(M.alu, 0.022, 1.0, sx0 + 0.02, gy, z, 8); b.sph(M.brass, 0.028, sx0 + 0.02, F(1.0), z, 1, 1, 1, 8);
      b.cyl(M.alu, V(sx0, gy + 0.5, z), V(sx1, sy1 + 0.5, z), 0.01, 5);
    }
    b.bb(M.rubber, 198.55, 199.0, gy, F(0.008), 0.47, 1.13);
    b.bb(M.aluDark, 198.875, 198.885, gc - 0.17, gc - 0.05, 0.55, 1.05);
    sign('Zum Kielgang', 198.869, gc - 0.11, 0.8, 0.09, 'x-', 'plate');
  }

  // =====================================================================
  //  Funkraum über der Gondel (x 203.7 … 206.3, z 0.72 … 2.9)
  // =====================================================================
  const yR = keelY(205), R = (h) => yR + h;
  // Schreibtisch: Wangen, Schubladenblock, Fußleiste
  for (const x of [203.78, 206.22]) b.bb(M.aluDark, x - 0.015, x + 0.015, yR, R(0.72), 2.38, 2.93);
  b.bb(M.aluDark, 205.65, 206.2, R(0.02), R(0.72), 2.4, 2.93);
  for (let k = 0; k < 3; k++) {
    const y0 = R(0.06 + k * 0.22), y1 = y0 + 0.19;
    b.bb(M.alu, 205.67, 206.18, y0, y1, 2.394, 2.4);
    b.cyl(M.brass, V(205.87, (y0 + y1) / 2, 2.392), V(205.98, (y0 + y1) / 2, 2.392), 0.006, 5);
  }
  b.cyl(M.alu, V(203.8, R(0.12), 2.8), V(205.65, R(0.12), 2.8), 0.012, 6);
  b.shadow(M.shadow, 205.0, yR, 2.65, 2.7, 0.8);
  // Sende- und Empfangsgeräte (untere Reihe, vorhanden): Skalen, Knöpfe, Beschriftung
  [[204.2, 0.6, 'Sender', 'Antenne', 2], [205.0, 0.7, 'Empfänger', 'Anode', 3], [205.85, 0.5, 'Notsender', 'Heizung', 4]].forEach(([x, w, t, gl, sd]) => {
    const zf = 2.545;
    for (const dx of [-0.15, 0.15]) { panel('skala', drawSkala, x + dx, R(1.05), 2.514, 0.085, 0.085, 'z-'); knob(x + dx, R(0.955), zf, -1, 0.016); }
    gauge(x, R(1.1), zf - 0.007, 0.1, 'z-', gl, sd);
    sign(t, x, R(1.18), zf - 0.006, 0.03, 'z-', 'alu');
    for (const dx of w > 0.55 ? [-0.18, 0, 0.18] : [-0.15, 0, 0.15]) knob(x + dx, R(0.85), zf, -1, 0.02);
    for (const dx of [-w / 2 + 0.05, w / 2 - 0.05]) { b.cyl(M.enamel, V(x + dx, R(0.93), zf), V(x + dx, R(0.93), zf - 0.006), 0.014, 8); b.cyl(M.steel, V(x + dx, R(0.93), zf - 0.006), V(x + dx, R(0.95), zf - 0.03), 0.004, 4); }
    for (const dx of [-w / 2 + 0.02, w / 2 - 0.02]) for (const y of [R(0.79), R(1.19)]) b.sph(M.steel, 0.006, x + dx, y, zf - 0.002, 1, 1, 1, 4);
  });
  // obere Reihe: Kurzwellenempfänger, Langwellenempfänger, Wellenmesser
  b.bb(M.black, 203.95, 204.45, R(1.215), R(1.6), 2.6, 2.9);
  gauge(204.2, R(1.47), 2.594, 0.13, 'z-', 'Empfang', 6);
  for (const dx of [-0.12, 0, 0.12]) knob(204.2 + dx, R(1.29), 2.6, -1, 0.018);
  b.bb(M.black, 204.7, 205.3, R(1.215), R(1.6), 2.6, 2.9);
  gauge(204.88, R(1.47), 2.594, 0.13, 'z-', 'Frequenz', 7);
  panel('skala', drawSkala, 205.12, R(1.47), 2.594, 0.13, 0.13, 'z-');
  knob(205.12, R(1.3), 2.6, -1, 0.03); knob(204.88, R(1.3), 2.6, -1, 0.02);
  b.bb(M.woodDark, 205.65, 206.05, R(1.215), R(1.5), 2.62, 2.9);
  gauge(205.85, R(1.36), 2.614, 0.16, 'z-', 'Wellenmesser', 5);
  knob(205.99, R(1.26), 2.62, -1, 0.015);
  for (const x of [204.0, 204.4, 204.75, 205.25]) for (let k = 0; k < 4; k++) b.bb(M.aluDark, x - 0.02, x + 0.02, R(1.55 - k * 0.03), R(1.555 - k * 0.03), 2.595, 2.6); // Lüftungsschlitze
  // Antennenzuführung mit Isolatoren
  b.cyl(M.brass, V(204.05, R(1.6), 2.8), V(204.05, R(2.0), 2.8), 0.008, 6);
  for (const y of [R(1.7), R(1.85)]) b.sph(M.enamel, 0.025, 204.05, y, 2.8, 1, 1.3, 1, 10);
  // Kabelbäume an der Außenwand und unter der Decke
  for (const x of [204.1, 204.125, 205.1, 205.125, 205.85]) b.cyl(M.black, V(x, R(1.2), 2.935), V(x, R(1.965), 2.935), 0.009, 5);
  for (const [y, z] of [[R(1.965), 2.935], [R(1.975), 2.95], [R(1.955), 2.95]]) b.cyl(M.black, V(203.65, y, z), V(206.35, y, z), 0.008, 5);
  for (let x = 203.9; x < 206.3; x += 0.4) b.bb(M.alu, x - 0.01, x + 0.01, R(1.94), R(1.99), 2.92, 2.965);
  // Morsetaste
  { const x = 205.0, y = R(0.76), z = 2.44;
    b.bb(M.woodDark, x - 0.07, x + 0.07, y, y + 0.02, z - 0.035, z + 0.035);
    // Tasthebel und Knopf: beweglich in feature_interact.js
    b.cyl(M.brass, V(x - 0.02, y + 0.02, z), V(x - 0.02, y + 0.04, z), 0.01, 6);
    for (const dx of [-0.055, 0.03]) b.vcyl(M.brass, 0.006, 0.015, x + dx, y + 0.02, z + 0.022, 6);
    b.cyl(M.rubber, V(x - 0.07, y + 0.01, z + 0.02), V(x - 0.2, y + 0.005, 2.54), 0.004, 4);
  }
  // Kopfhörer
  { const x = 205.48, y = R(0.76), z = 2.45;
    b.add(M.black, new THREE.TorusGeometry(0.08, 0.006, 4, 12, Math.PI), new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(x, y + 0.03, z));
    for (const dx of [-0.08, 0.08]) { b.vcyl(M.black, 0.035, 0.028, x + dx, y, z, 12); b.vcyl(M.leather, 0.03, 0.005, x + dx, y + 0.028, z, 12); }
    b.cyl(M.rubber, V(x + 0.08, y + 0.01, z + 0.03), V(205.15, R(0.85), 2.545), 0.004, 4);
  }
  // Funktagebuch, Telegrammformulare, Bleistift, Tischlampe
  b.bb(M.leather, 203.92, 204.28, R(0.76), R(0.765), 2.37, 2.53);
  b.bb(M.paper, 203.925, 204.095, R(0.765), R(0.775), 2.375, 2.525); b.bb(M.paper, 204.105, 204.275, R(0.765), R(0.775), 2.375, 2.525);
  pencil(204.15, R(0.78), 2.45, 0.6, M.upGreen, 0.15);
  b.bb(M.paper, 205.66, 205.86, R(0.76), R(0.775), 2.37, 2.53);
  panel('telegramm', drawTelegramm, 205.76, R(0.778), 2.45, 0.15, 0.19, 'y+');
  { const x = 206.15, y = R(0.76), z = 2.45;
    b.vcyl(M.black, 0.055, 0.02, x, y, z, 12);
    b.cyl(M.aluDark, V(x, y + 0.02, z), V(x, y + 0.3, z + 0.03), 0.008, 5);
    b.cyl(M.aluDark, V(x, y + 0.3, z + 0.03), V(x - 0.1, y + 0.36, z), 0.008, 5);
    b.cyl(M.upGreen, V(x - 0.1, y + 0.37, z), V(x - 0.16, y + 0.3, z), 0.03, 10, 0.07);
    b.sph(M.lamp, 0.025, x - 0.155, y + 0.305, z, 1, 1, 1, 8);
  }
  // Funkerstuhl und Bodenbelag
  b.bb(M.linoGreen, 204.5, 205.5, yR, R(0.004), 1.45, 2.33);
  chair(C, 205.0, R(0.004), 1.98, 0, M.leather, true);
  // Schreibmaschinentisch an der Stirnwand
  table(C, 204.0, yR, 1.55, 0.55, 0.7, M.woodLight, 0.72, true);
  chair(C, 204.6, yR, 1.55, -Math.PI / 2, M.leather);
  { const T = R(0.7375);
    b.bb(M.black, 203.86, 204.12, T, T + 0.075, 1.4, 1.7);
    b.bb(M.black, 204.08, 204.24, T, T + 0.03, 1.41, 1.69);
    for (let row = 0; row < 4; row++) for (let k = 0; k < 10; k++) b.vcyl(M.enamel, 0.0075, 0.008, 204.22 - row * 0.032, T + 0.03 + row * 0.012, 1.445 + k * 0.024, 8);
    b.bb(M.enamel, 204.226, 204.244, T + 0.026, T + 0.034, 1.48, 1.62);
    b.bb(M.steel, 203.86, 203.95, T + 0.075, T + 0.095, 1.37, 1.73);
    b.cyl(M.black, V(203.9, T + 0.12, 1.36), V(203.9, T + 0.12, 1.74), 0.028, 12);
    for (const [z0, z1] of [[1.33, 1.36], [1.74, 1.77]]) b.cyl(M.black, V(203.9, T + 0.12, z0), V(203.9, T + 0.12, z1), 0.02, 10);
    b.bb(M.paper, 203.882, 203.886, T + 0.12, T + 0.32, 1.47, 1.68);
    b.cyl(M.steel, V(203.92, T + 0.14, 1.36), V(204.0, T + 0.17, 1.3), 0.006, 5);
    for (const z of [1.47, 1.63]) b.vcyl(M.steel, 0.025, 0.012, 204.0, T + 0.075, z, 10);
    b.bb(M.paper, 203.78, 203.98, T, T + 0.018, 1.74, 1.88);
    panel('telegramm', drawTelegramm, 203.88, T + 0.021, 1.81, 0.13, 0.19, 'y+');
    b.bb(M.alu, 204.08, 204.2, T, T + 0.004, 1.76, 1.86);
  }
  // Fächerregal für Telegramme und Klemmbrett an der Stirnwand (Steuerbordende x 206.4)
  { const xw = 206.385;
    b.bb(M.woodLight, xw - 0.02, xw, R(1.1), R(1.5), 1.5, 2.0);
    for (const y of [1.1, 1.3, 1.485]) b.bb(M.woodLight, xw - 0.18, xw - 0.02, R(y), R(y + 0.015), 1.5, 2.0);
    for (const z of [1.5, 1.7425, 1.985]) b.bb(M.woodLight, xw - 0.18, xw - 0.02, R(1.1), R(1.5), z, z + 0.015);
    const r = rng(19);
    for (const [y, z] of [[1.115, 1.52], [1.115, 1.76], [1.315, 1.52], [1.315, 1.76]]) { const n = 2 + Math.floor(r() * 4); b.bb(M.paper, xw - 0.16, xw - 0.03, R(y), R(y + n * 0.006), z + 0.01, z + 0.2); }
    sign('Eingang', xw - 0.006, R(1.56), 1.62, 0.03, 'x-', 'plate');
    sign('Ausgang', xw - 0.006, R(1.56), 1.86, 0.03, 'x-', 'plate');
    b.bb(M.woodLight, xw - 0.012, xw, R(1.15), R(1.45), 2.05, 2.25);
    b.bb(M.steel, xw - 0.02, xw - 0.012, R(1.42), R(1.44), 2.11, 2.19);
    panel('telegramm', drawTelegramm, xw - 0.018, R(1.29), 2.15, 0.18, 0.24, 'x-');
  }
  // Antennenhaspel (Schleppantenne) mit Kurbel und Bodendurchführung
  { const y = R(0.4), z = 1.05;
    for (const x of [205.92, 206.33]) { b.bb(M.aluDark, x - 0.01, x + 0.01, yR, R(0.62), 0.82, 1.28); }
    b.cyl(M.woodDark, V(205.95, y, z), V(206.3, y, z), 0.1, 12);
    b.cyl(mCopper, V(205.97, y, z), V(206.28, y, z), 0.14, 14);
    for (const x of [205.96, 206.29]) b.cyl(M.aluDark, V(x - 0.008, y, z), V(x + 0.008, y, z), 0.2, 16);
    b.cyl(M.steel, V(205.86, y, z), V(206.36, y, z), 0.02, 8);
    b.beam(M.steel, V(205.88, y, z), V(205.88, y - 0.13, z + 0.08), 0.012, 0.025);
    b.cyl(M.woodLight, V(205.88, y - 0.13, z + 0.08), V(205.8, y - 0.13, z + 0.08), 0.014, 6);
    b.cyl(M.steel, V(206.12, y - 0.14, z + 0.04), V(206.12, yR + 0.02, 1.32), 0.004, 4);
    b.vcyl(M.brass, 0.03, 0.04, 206.12, yR, 1.32, 10); b.cyl(M.steel, V(206.12, yR, 1.32), V(206.12, yR - 0.35, 1.32), 0.02, 8);
    b.cyl(M.steel, V(205.92, R(0.55), 0.85), V(205.85, R(0.75), 0.85), 0.01, 5); b.sph(M.red, 0.02, 205.85, R(0.75), 0.85, 1, 1, 1, 8);
    b.bb(M.black, 205.9, 205.91, R(0.5), R(0.58), 1.1, 1.22);
    b.bb(M.brass, 205.905, 205.91, R(0.64), R(0.68), 0.96, 1.14);
    sign('Antennenhaspel', 205.9, R(0.66), 1.05, 0.028, 'x-', 'brass');
    nav.block(205.85, 206.35, 0.78, 1.32, yR, yR + 1);
    b.shadow(M.shadow, 206.12, yR, 1.05, 0.6, 0.65);
  }
  // Wanduhr innen, Türschilder außen
  b.bb(M.woodDark, 203.83, 204.07, R(1.48), R(1.72), 0.661, 0.671);
  panel('uhr', drawUhr, 203.95, R(1.6), 0.677, 0.2, 0.2, 'z+');
  b.torus(M.brass, 0.105, 0.008, 203.95, R(1.6), 0.679, 'z', 18);
  sign('Funkraum', 204.0, R(1.55), 0.624, 0.08, 'z-', 'plate');
  sign('Zutritt verboten', 205.9, R(1.55), 0.624, 0.05, 'z-', 'red');
}
