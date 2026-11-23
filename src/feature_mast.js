// Ankermast-Szene: Naval Air Station Lakehurst 1936/37 (nur im Modus 'mast').
// Grundlage: research/gondel_mast.md, Abschnitt 7 und „Vorschlag Ankermast-Szene“.
// Belegt: Wellman-Mast 75 ft hoch (ausfahrbar 160 ft), Unterbau 80 ft, ≈ 300 t, drei Eck-Fahrwerke auf weit gespurten Schienen,
// Mastkopf mit Becher für den Bugkonus, Gleise von Hangar No. 1 zu Ankerkreisen, Heck 1936 per Lokomotive gezogen,
// Hangar No. 1 294 × 107–110 × 68 m mit Toren auf Schienen. Nachtrag (research/gondel_mast.md): „80 ft on a side“ (ZRS) und „drei
// Ecken/drei Traktoren“ (WOWA-M) passen zu einem gleichseitigen Dreieck mit 24,4 m Seite (mittel, Grundriss nicht ausdrücklich
// genannt); die Masten „überspannten zwei Gleispaare“ (NPS-Nominierung Hangar No. 1) – im Modell die zwei Mastgleise.
// Unbelegt (hier abgeleitet): Durchmesser des Ankerkreises 1936/37 (aus Abstand Mast–Heckwagen; belegt sind nur 438 ft Radius
// für die ZR-3, Ort nicht eindeutig, und 643 ft an anderen Navy-Basen), Lage der Gleise, Torform und Fensterteilung der Halle.
import * as THREE from 'three';
import { V, rng, canvasTex, QuadBuf } from './util.js';
import { X_BOW, GROUND_Y, FALLREEP, rLin, hp, D2R } from './hull.js';

const GY = GROUND_Y;
const XM = X_BOW + 1.9;                 // Mastachse (Schwerpunkt des dreieckigen Unterbaus)
const CUP0 = X_BOW + 0.1, CUP1 = X_BOW + 1.1; // Fangtrichter: Mündung / Boden (Bugkonus-Spitze bei X_BOW + 0.5)
const TOPY = -2.5;                      // Oberkante Mastkopf-Plattform (≈ 20,6 m über Grund; Becher in Achshöhe ≈ 23 m)
const LEG0 = GY + 1.9, LT = TOPY - 0.25; // Fuß- und Kopfhöhe der Mastbeine
const SB = 24.4, STOP = 4.2;            // Seitenlänge Unterbau (80 ft) und Kopf
const LX = XM + 1.4;                    // Steigleiter im Mastinneren
const XT = 30;                          // Heckwagen unter der unteren Flosse (hinter dem Heckrad bei x 37)
const RC = XM - XT;                     // Radius des Ankerkreises (Annahme, ≈ 219 m)
const GAUGE = 1.435;
const HX = XM, HZ0 = -330, HZ1 = HZ0 - 294, HW = 55; // Hangar No. 1 (Achse quer zum Schiff, Tor zum Mast hin)
const HP = [[55, 0], [55, 30], [53.5, 40], [50, 49], [44, 56.5], [35, 62.5], [24, 66.2], [12, 67.6], [0, 68]]; // Halbprofil
const S3 = Math.sqrt(3);
const TRI = (s) => [[-s / (2 * S3), -s / 2], [-s / (2 * S3), s / 2], [s / S3, 0]]; // Ecken (dx, dz) um die Achse
const CB = TRI(SB), CT = TRI(STOP);
const ryTo = (dx, dz) => Math.atan2(-dz, dx);
const circ = (th, r = RC) => V(XM - r * Math.cos(th), GY, r * Math.sin(th));
const TITLES = new Set();

let G = null, sock = null, sockArm = null, t = 0, lastMode = null;

export default function (C) {
  const { b, M, nav } = C;
  const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const P = (c, o = {}) => new THREE.MeshPhongMaterial({ color: c, specular: 0x333333, shininess: 25, ...o });
  const corr = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 8) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(i, 0, 3, h); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(i + 4, 0, 2, h); }
  });
  const K = {
    paint: P(0x5f6569), concrete: L(0xb3afa4), concreteDk: L(0x8f8b82), gravel: L(0x8c857a),
    khaki: L(0xa8946a), navy: L(0x26304a), shirt: L(0x7d94ae), skin: L(0xd6ab86), suit: L(0x4f5256), overall: L(0x3d5670),
    dress1: L(0x5b6b8a), dress2: L(0x7a4b3c), dress3: L(0x58664a),
    hangar: L(0x9a9c98, { map: corr }), hangarIn: L(0x3b3a36), hangarDoor: L(0x8c8f8c, { side: THREE.DoubleSide }),
    glassDk: P(0x33424c, { shininess: 80, specular: 0x888888 }), steelDS: P(0x4b5157, { side: THREE.DoubleSide }),
    vehGrey: P(0x56616b), vehGreen: P(0x3f4a36), busLow: P(0x6b2a24), busHigh: P(0xd8cfb4), tank: P(0x8a8d8f),
    loco: P(0x1d1e20, { shininess: 50 }), pine: L(0x2c432b), pine2: L(0x37502f), trunk: L(0x5a4632), house: L(0x6f766c, { map: corr }),
  };
  K.hangar.userData.wuv = 3; K.house.userData.wuv = 1.5;

  // ---------- Hilfen ----------
  const B = (mat, x0, x1, y0, y1, z0, z1) => b.bb(mat, Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1), Math.min(z0, z1), Math.max(z0, z1));
  const rope = (pts, r = 0.022, mat = M.rope) => { for (let i = 0; i < pts.length - 1; i++) b.cyl(mat, pts[i], pts[i + 1], r, 5); };
  const sag = (a, c, n, s) => { const out = []; for (let i = 0; i <= n; i++) { const f = i / n; out.push(a.clone().lerp(c, f).add(V(0, -4 * s * f * (1 - f), 0))); } return out; };
  const info = (title, text, x, y, z) => { TITLES.add(title); C.info(title, text, x, y, z); };
  const block = (x0, x1, z0, z1, h = 4, y0 = GY) => nav.block(x0, x1, z0, z1, y0, y0 + h);
  /** Schildtafel mit zwei Pfosten; dir 'x+','x-','z+','z-' */
  const board = (text, x, z, h, dir, style = 'plate', yb = 1.2) => {
    const w = h * Math.max(1.3, Math.min(4, 0.52 * text.length + 0.9)) + 0.25, alongX = dir[0] === 'z', sgn = dir[1] === '+' ? 1 : -1;
    const yc = GY + yb + h / 2 + 0.1;
    if (alongX) B(M.woodDark, x - w / 2, x + w / 2, yc - h / 2 - 0.12, yc + h / 2 + 0.12, z - 0.04, z + 0.04);
    else B(M.woodDark, x - 0.04, x + 0.04, yc - h / 2 - 0.12, yc + h / 2 + 0.12, z - w / 2, z + w / 2);
    for (const k of [-0.42, 0.42]) {
      const px = alongX ? x + k * w : x, pz = alongX ? z : z + k * w;
      b.vcyl(M.woodDark, 0.06, yc + h / 2 + 0.1 - GY, px - (alongX ? 0 : sgn * 0.1), GY, pz - (alongX ? sgn * 0.1 : 0), 6);
    }
    C.sign(text, alongX ? x : x + sgn * 0.05, yc, alongX ? z + sgn * 0.05 : z, h, dir, style);
  };

  // ---------- Figuren (1,75 m) ----------
  const STY = {
    navy: { top: M.white, legs: M.white, hat: 'sailor' }, dung: { top: K.shirt, legs: K.navy, hat: 'sailor' },
    officer: { top: K.khaki, legs: K.khaki, hat: 'officer' }, civil: { top: K.suit, legs: K.suit, hat: 'fedora', hm: M.black },
    civil2: { top: M.upBrown, legs: M.upBrown, hat: 'fedora', hm: M.woodDark }, worker: { top: K.overall, legs: K.overall, hat: 'cap' },
    woman: { top: K.dress1, legs: K.skin, hat: 'cloche', woman: true }, woman2: { top: K.dress2, legs: K.skin, hat: 'cloche', woman: true },
    woman3: { top: K.dress3, legs: K.skin, hat: 'cloche', woman: true },
  };
  function fig(x, z, ry, kind, o = {}) {
    const y0 = o.y ?? GY, c = Math.cos(ry), s = Math.sin(ry), pose = o.pose || 'stand', S = STY[kind];
    const k = pose === 'pull' ? 0.2 : 0;
    const Wf = (lx, ly, lz) => V(x + c * lx + s * lz, y0 + ly, z - s * lx + c * lz);
    const W = (lx, ly, lz) => Wf(lx - k * ly, ly, lz);
    const feet = pose === 'pull' ? [[0.3, 0.12], [-0.26, -0.12]] : pose === 'walk' ? [[0.2, 0.1], [-0.18, -0.1]] : [[0.02, 0.11], [-0.02, -0.11]];
    for (const [fx, fz] of feet) {
      const f = Wf(fx + 0.04, 0.045, fz); b.box(M.black, 0.26, 0.09, 0.11, f.x, f.y, f.z, ry);
      if (S.woman) b.cyl(S.legs, Wf(fx, 0.08, fz), W(0, 0.55, fz * 0.7), 0.05, 6, 0.06);
      else b.cyl(S.legs, Wf(fx, 0.08, fz), W(0, 0.9, fz * 0.8), 0.068, 7, 0.085);
    }
    if (S.woman) { b.cyl(o.mat || S.top, W(0, 0.42, 0), W(0, 1.0, 0), 0.25, 9, 0.16); b.cyl(o.mat || S.top, W(0, 1.0, 0), W(0, 1.44, 0), 0.15, 8, 0.18); }
    else b.cyl(o.mat || S.top, W(0, 0.84, 0), W(0, 1.46, 0), 0.165, 8, 0.2);
    b.cyl(K.skin, W(0, 1.44, 0), W(0, 1.53, 0), 0.05, 6);
    const hd = W(0, 1.6, 0); b.sph(K.skin, 0.105, hd.x, hd.y, hd.z, 1, 1.08, 1, 10);
    const hands = o.hands || (pose === 'pull' ? [Wf(0.3, 1.02, 0.14), Wf(0.3, 1.02, -0.14)] : pose === 'walk' ? [W(0.14, 0.82, 0.25), W(-0.12, 0.82, -0.25)] : [W(0.04, 0.79, 0.25), W(0.04, 0.79, -0.25)]);
    [0.215, -0.215].forEach((lz, i) => { const h = hands[i]; b.cyl(o.mat || S.top, W(0, 1.41, lz), h, 0.046, 6, 0.04); b.sph(K.skin, 0.042, h.x, h.y, h.z, 1, 1, 1, 6); });
    if (o.bag) { const h = hands[0]; b.box(o.bag, 0.48, 0.33, 0.15, h.x, h.y - 0.2, h.z, ry); }
    if (S.hat === 'sailor') b.vcyl(M.white, 0.1, 0.07, hd.x, hd.y + 0.06, hd.z, 10, 0.11);
    else if (S.hat === 'fedora') { b.vcyl(S.hm, 0.17, 0.015, hd.x, hd.y + 0.06, hd.z, 12); b.vcyl(S.hm, 0.1, 0.09, hd.x, hd.y + 0.07, hd.z, 10, 0.09); }
    else if (S.hat === 'officer') { b.vcyl(K.khaki, 0.115, 0.06, hd.x, hd.y + 0.07, hd.z, 10, 0.125); const v = W(0.1, 1.68, 0); b.box(M.black, 0.08, 0.015, 0.16, v.x, v.y, v.z, ry); }
    else if (S.hat === 'cloche') b.sph(o.hat || M.black, 0.12, hd.x, hd.y + 0.055, hd.z, 1, 0.62, 1, 10);
    else { b.vcyl(M.steel, 0.1, 0.05, hd.x, hd.y + 0.065, hd.z, 10); const v = W(0.1, 1.67, 0); b.box(M.steel, 0.09, 0.012, 0.15, v.x, v.y, v.z, ry); }
  }
  /** Mannschaft an einem Tau: Leute beidseits der Linie a→c, Blick zum Schiff (Richtung a) */
  function crewOnLine(a, c, n, seed) {
    const r = rng(seed), d = V(a.x - c.x, 0, a.z - c.z).normalize(), nrm = V(-d.z, 0, d.x), ry = ryTo(d.x, d.z);
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(c, (i + 0.5) / n), side = i % 2 ? 1 : -1, off = 0.33 * side;
      const fx = p.x + nrm.x * off - d.x * 0.05, fz = p.z + nrm.z * off - d.z * 0.05;
      fig(fx, fz, ry + (r() - 0.5) * 0.15, r() < 0.7 ? 'navy' : r() < 0.6 ? 'dung' : 'civil', { pose: 'pull', hands: [p.clone().addScaledVector(d, 0.32), p.clone()] });
    }
  }

  // ---------- Fahrzeuge (lokal: +x vorn, y = 0 Boden) ----------
  const wheel = (lx, lz, r, w, hub = M.steel) => { b.cyl(M.rubber, V(lx, r, lz - w / 2), V(lx, r, lz + w / 2), r, 14); b.cyl(hub, V(lx, r, lz - w / 2 - 0.012), V(lx, r, lz + w / 2 + 0.012), r * 0.5, 10); };
  function cab(col, x0, x1, w, y1) {
    B(col, x0, x1, 0.75, y1, -w, w); B(M.black, x0 - 0.05, x1 + 0.05, y1, y1 + 0.07, -w - 0.04, w + 0.04);
    B(K.glassDk, x1, x1 + 0.015, y1 - 0.72, y1 - 0.12, -w + 0.12, w - 0.12);
    for (const s of [-1, 1]) B(K.glassDk, x0 + 0.5, x1 - 0.12, y1 - 0.72, y1 - 0.12, s * w, s * (w + 0.015));
  }
  function hood(col, x0, x1, w, y1) {
    B(col, x0, x1, 0.78, y1, -w, w); B(M.alu, x1, x1 + 0.07, 0.8, y1 - 0.04, -w + 0.05, w - 0.05);
    for (const s of [-1, 1]) { b.sph(M.alu, 0.12, x1 - 0.05, y1 - 0.15, s * (w + 0.12), 1, 1, 1, 10); b.sph(col, 1, x1 - 0.6, 0.74, s * (w + 0.36), 0.62, 0.3, 0.22, 12); }
    B(M.steel, x1 + 0.07, x1 + 0.16, 0.42, 0.56, -w - 0.4, w + 0.4); // Stoßstange
  }
  function truck(x, z, ry, col, seed) {
    b.at(x, GY, z, ry, () => {
      B(M.steel, -3.0, 2.6, 0.5, 0.74, -0.42, 0.42);
      hood(col, 1.35, 2.6, 0.5, 1.6); cab(col, -0.35, 1.35, 0.95, 2.25);
      for (const s of [-1, 1]) B(M.black, -0.3, 1.5, 0.46, 0.52, s * 0.82, s * 1.06);
      B(M.wood, -3.05, -0.4, 0.75, 0.86, -1.08, 1.08);
      for (const s of [-1, 1]) B(M.woodDark, -3.05, -0.4, 0.86, 1.38, s * 1.02, s * 1.08);
      B(M.woodDark, -3.05, -2.99, 0.86, 1.38, -1.02, 1.02); B(M.woodDark, -0.46, -0.4, 0.86, 1.5, -1.02, 1.02);
      const r = rng(seed); for (let i = 0; i < 5; i++) { const sx = 0.5 + r() * 0.4, sy = 0.35 + r() * 0.35; b.box(r() < 0.5 ? M.crate : M.sack, sx, sy, 0.6, -2.6 + i * 0.47, 0.86 + sy / 2, (r() - 0.5) * 1.2, r() * 0.3); }
      for (const s of [-1, 1]) { wheel(2.0, s * 0.86, 0.45, 0.2); wheel(-1.9, s * 0.78, 0.45, 0.2); wheel(-1.9, s * 1.0, 0.45, 0.2); }
      b.shadow(M.shadow, 0, 0, 0, 6.6, 2.8);
    });
  }
  function tanker(x, z, ry) {
    b.at(x, GY, z, ry, () => {
      B(M.steel, -3.0, 2.6, 0.5, 0.74, -0.42, 0.42);
      hood(K.vehGrey, 1.35, 2.6, 0.5, 1.6); cab(K.vehGrey, -0.35, 1.35, 0.95, 2.25);
      for (const s of [-1, 1]) B(M.black, -0.3, 1.5, 0.46, 0.52, s * 0.82, s * 1.06);
      B(M.steel, -3.0, -0.5, 0.74, 0.86, -0.7, 0.7);
      b.cyl(K.tank, V(-2.75, 1.72, 0), V(-0.75, 1.72, 0), 0.85, 18);
      for (const ex of [-2.75, -0.75]) b.sph(K.tank, 0.85, ex, 1.72, 0, 0.28, 1, 1, 18);
      b.vcyl(M.steel, 0.22, 0.14, -1.75, 2.5, 0, 12); B(M.steel, -2.9, -0.6, 2.56, 2.6, -0.25, 0.25);
      for (const xx of [-2.4, -1.1]) b.cyl(M.steel, V(xx, 0.86, -0.8), V(xx, 0.86, 0.8), 0.04, 6);
      b.cyl(M.rubber, V(-3.05, 0.95, 0.4), V(-3.05, 0.95, -0.4), 0.06, 8);
      for (const s of [-1, 1]) { wheel(2.0, s * 0.86, 0.45, 0.2); wheel(-1.9, s * 0.78, 0.45, 0.2); wheel(-1.9, s * 1.0, 0.45, 0.2); }
      b.shadow(M.shadow, 0, 0, 0, 6.6, 2.6);
    });
  }
  function bus(x, z, ry) {
    b.at(x, GY, z, ry, () => {
      B(M.steel, -4.5, 4.4, 0.45, 0.68, -0.5, 0.5);
      B(K.busLow, -4.6, 3.2, 0.62, 1.72, -1.2, 1.2); B(K.busHigh, -4.6, 3.2, 1.72, 2.95, -1.2, 1.2);
      B(K.busHigh, -4.55, 3.15, 2.95, 3.1, -1.08, 1.08);
      for (const s of [-1, 1]) b.cyl(K.busHigh, V(-4.6, 2.93, s * 1.06), V(3.2, 2.93, s * 1.06), 0.15, 8);
      for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { if (s > 0 && i === 6) continue; B(K.glassDk, -4.25 + i * 1.03, -3.42 + i * 1.03, 1.85, 2.6, s * 1.2, s * 1.215); }
      B(M.woodDark, 2.25, 3.0, 0.7, 2.75, 1.2, 1.215); B(M.alu, 2.27, 2.98, 0.72, 0.78, 1.215, 1.23);
      B(K.glassDk, 3.2, 3.215, 1.85, 2.65, -1.05, 1.05); B(K.glassDk, -4.615, -4.6, 1.95, 2.6, -0.9, 0.9);
      B(M.alu, -4.66, -4.6, 1.7, 1.75, -1.2, 1.2); for (const s of [-1, 1]) B(M.alu, -4.6, 3.2, 1.7, 1.75, s * 1.2, s * 1.215);
      hood(K.busLow, 3.2, 4.45, 0.62, 1.75);
      B(M.steel, -4.75, -4.6, 0.42, 0.56, -1.2, 1.2);
      for (const s of [-1, 1]) { wheel(3.65, s * 0.98, 0.5, 0.22); wheel(-2.6, s * 0.9, 0.5, 0.22); wheel(-2.6, s * 1.13, 0.5, 0.22); }
      B(M.black, -1.0, -0.2, 3.1, 3.35, -0.9, 0.9); // Gepäckgitter
      b.shadow(M.shadow, 0, 0, 0, 9.8, 3);
    });
  }
  function car(x, z, ry, col) {
    b.at(x, GY, z, ry, () => {
      B(col, -2.3, 0.7, 0.42, 1.02, -0.82, 0.82); B(col, -1.7, 0.45, 1.02, 1.58, -0.78, 0.78); B(M.black, -1.75, 0.5, 1.58, 1.62, -0.8, 0.8);
      B(K.glassDk, 0.45, 0.465, 1.1, 1.5, -0.68, 0.68); for (const s of [-1, 1]) B(K.glassDk, -1.55, 0.35, 1.1, 1.5, s * 0.78, s * 0.795);
      hood(col, 0.7, 2.25, 0.48, 1.12);
      for (const s of [-1, 1]) { b.sph(col, 1, -1.65, 0.6, s * 0.86, 0.55, 0.28, 0.2, 12); B(M.black, -1.2, 1.3, 0.34, 0.39, s * 0.82, s * 1.0); }
      for (const s of [-1, 1]) { wheel(1.65, s * 0.84, 0.36, 0.17); wheel(-1.65, s * 0.84, 0.36, 0.17); }
      b.cyl(M.rubber, V(-2.38, 0.75, 0), V(-2.5, 0.75, 0), 0.34, 14);
      b.shadow(M.shadow, 0, 0, 0, 5, 2.2);
    });
  }
  function cart(x, z, ry, seed) {
    const r = rng(seed);
    b.at(x, GY, z, ry, () => {
      B(M.wood, -1.2, 1.2, 0.44, 0.5, -0.65, 0.65); B(M.steel, -1.15, 1.15, 0.34, 0.44, -0.12, 0.12);
      for (const s of [-1, 1]) { B(M.steel, -1.2, 1.2, 0.5, 0.56, s * 0.62, s * 0.66); for (const xx of [-1.15, 0, 1.15]) B(M.steel, xx - 0.02, xx + 0.02, 0.5, 0.8, s * 0.6, s * 0.64); B(M.steel, -1.2, 1.2, 0.78, 0.82, s * 0.6, s * 0.64); }
      for (const xx of [-0.85, 0.85]) for (const s of [-1, 1]) wheel(xx, s * 0.55, 0.2, 0.08);
      b.beam(M.steel, V(1.2, 0.4, 0), V(2.1, 0.25, 0), 0.05);
      const lug = [M.leather, M.pigskin, M.crate, M.upBrown, M.woodDark]; let xx = -1.0;
      while (xx < 0.9) { const w = 0.45 + r() * 0.35, h = 0.3 + r() * 0.35; b.box(lug[(r() * 5) | 0], w, h, 0.5 + r() * 0.5, xx + w / 2, 0.5 + h / 2, (r() - 0.5) * 0.4, (r() - 0.5) * 0.2); xx += w + 0.05; }
      b.shadow(M.shadow, 0, 0, 0, 2.8, 1.6);
    });
  }
  function tug(x, z, ry) {
    b.at(x, GY, z, ry, () => {
      B(K.vehGreen, -0.9, 0.9, 0.3, 0.75, -0.55, 0.55); B(K.vehGreen, 0.1, 0.9, 0.75, 1.1, -0.45, 0.45);
      B(M.leather, -0.75, -0.2, 0.75, 0.85, -0.3, 0.3); B(M.leather, -0.85, -0.75, 0.85, 1.25, -0.3, 0.3);
      b.cyl(M.steel, V(0.05, 0.85, 0), V(-0.2, 1.15, 0), 0.025, 6); b.torus(M.black, 0.17, 0.02, -0.22, 1.17, 0, 'y', 12);
      for (const xx of [-0.6, 0.6]) for (const s of [-1, 1]) wheel(xx, s * 0.6, 0.3, 0.16);
      b.shadow(M.shadow, 0, 0, 0, 2.2, 1.6);
    });
  }

  C.mode('mast', () => {
    // =================================================================
    // Begehbarkeit
    // =================================================================
    nav.zone('Hangar No. 1', HX - HW + 1.2, HX + HW - 1.2, HZ1 + 1.5, HZ0 + 1, GY);
    nav.zone('Mastkopf-Plattform', XM - 1.35, XM + 2.45, -2.15, 2.15, TOPY);
    nav.zone('Landefeld Lakehurst', -200, 500, -660, 260, GY);
    // tief hängende Schiffsteile: untere Flosse, Heckrad, Stoßrad, Gondelrad, hintere Maschinengondeln
    block(12.5, 46, -0.7, 0.7, 3); block(201.9, 204.1, -0.6, 0.6, 3);
    for (const s of [-1, 1]) block(90.5, 99, s * 13.3, s * 16.9, 3);

    // =================================================================
    // Ankermast (Wellman-Mast, fahrbar)
    // =================================================================
    const corner = (i, y) => { const f = (y - LEG0) / (LT - LEG0); return V(XM + CB[i][0] + (CT[i][0] - CB[i][0]) * f, y, CB[i][1] + (CT[i][1] - CB[i][1]) * f); };
    const yAt = (f) => LEG0 + f * (LT - LEG0);
    const sAt = (y) => SB + (STOP - SB) * (y - LEG0) / (LT - LEG0);
    // Beine als Gitterstützen: vier Gurte mit Zickzack-Vergitterung
    const OFF = [[0.32, 0.32], [0.32, -0.32], [-0.32, -0.32], [-0.32, 0.32]];
    for (let i = 0; i < 3; i++) {
      const a = corner(i, LEG0), c = corner(i, LT);
      const ch = OFF.map(([ox, oz]) => [a.clone().add(V(ox, 0, oz)), c.clone().add(V(ox * 0.8, 0, oz * 0.8))]);
      for (const [p, q] of ch) b.beam(K.paint, p, q, 0.13);
      const n = 26;
      for (let f = 0; f < 4; f++) {
        const A = ch[f], Bc = ch[(f + 1) % 4];
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n, p0 = (k % 2 ? A : Bc), p1 = (k % 2 ? Bc : A);
          b.beam(K.paint, p0[0].clone().lerp(p0[1], t0), p1[0].clone().lerp(p1[1], t1), 0.06);
        }
      }
      b.vcyl(M.steel, 0.55, 0.12, a.x, LEG0 - 0.12, a.z, 12);                     // Fußplatte auf dem Drehzapfen
    }
    // Ringgurte und Kreuzverbände
    const LV = [0.03, 0.22, 0.42, 0.6, 0.76, 0.9, 1.0];
    for (const f of LV) for (let i = 0; i < 3; i++) b.beam(K.paint, corner(i, yAt(f)), corner((i + 1) % 3, yAt(f)), 0.26, 0.36);
    for (let k = 0; k < LV.length - 1; k++) for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3, y0 = yAt(LV[k]), y1 = yAt(LV[k + 1]);
      b.cyl(M.steel, corner(i, y0), corner(j, y1), 0.045, 6); b.cyl(M.steel, corner(j, y0), corner(i, y1), 0.045, 6);
      const m = corner(i, y0).lerp(corner(j, y1), 0.5); b.sph(M.steel, 0.12, m.x, m.y, m.z, 1, 1, 1, 8);
    }
    // Querträger an der Leiter (z ±0.55) in jeder Ebene
    const faceX = (y, z) => { const s = sAt(y), xa = XM - s / (2 * S3), xp = XM + s / S3; return [xa, xa + (xp - xa) * (1 - Math.abs(z) / (s / 2))]; };
    for (const f of LV.slice(1, -1)) for (const z of [-0.55, 0.55]) { const y = yAt(f), [xa, xb] = faceX(y, z); b.beam(K.paint, V(xa, y, z), V(xb, y, z), 0.14, 0.2); }
    // Steigleiter mit Rückenschutz
    for (const z of [-0.22, 0.22]) b.cyl(M.steel, V(LX, GY, z), V(LX, TOPY + 1.0, z), 0.025, 6);
    for (let y = GY + 0.3; y < TOPY; y += 0.3) b.cyl(M.steel, V(LX, y, -0.22), V(LX, y, 0.22), 0.016, 5);
    const rest = [yAt(0.33), yAt(0.66)];
    for (let y = GY + 2.6; y < TOPY - 0.3; y += 0.9) if (!rest.some((r) => Math.abs(r + 1 - y) < 0.6)) b.torus(M.steel, 0.42, 0.018, LX - 0.38, y, 0, 'y', 14);
    for (const a of [100, 150, 180, 210, 260]) { const cx = LX - 0.38 + 0.42 * Math.cos(a * D2R), cz = 0.42 * Math.sin(a * D2R); b.cyl(M.steel, V(cx, GY + 2.6, cz), V(cx, TOPY - 0.1, cz), 0.014, 4); }
    for (const y of rest) {                                                     // Ruhebühnen
      B(M.aluDark, LX - 0.9, LX + 0.3, y - 0.06, y, 0.45, 1.6);
      for (const [px, pz] of [[LX - 0.9, 1.6], [LX + 0.3, 1.6], [LX - 0.9, 0.45], [LX + 0.3, 0.45]]) b.cyl(M.steel, V(px, y, pz), V(px, y + 1.05, pz), 0.02, 5);
      b.beam(M.steel, V(LX - 0.9, y + 1.05, 1.6), V(LX + 0.3, y + 1.05, 1.6), 0.035); b.beam(M.steel, V(LX - 0.9, y + 1.05, 0.45), V(LX - 0.9, y + 1.05, 1.6), 0.035);
      b.beam(M.steel, V(LX + 0.3, y + 1.05, 0.45), V(LX + 0.3, y + 1.05, 1.6), 0.035);
    }
    // Mastkopf-Plattform mit Einstiegsluke und Geländer
    const D0 = XM - 1.5, D1 = XM + 2.6, DZ = 2.3;
    B(M.aluDark, D0, LX - 0.55, TOPY - 0.08, TOPY, -DZ, DZ); B(M.aluDark, LX + 0.15, D1, TOPY - 0.08, TOPY, -DZ, DZ);
    B(M.aluDark, LX - 0.55, LX + 0.15, TOPY - 0.08, TOPY, -DZ, -0.4); B(M.aluDark, LX - 0.55, LX + 0.15, TOPY - 0.08, TOPY, 0.4, DZ);
    b.box(M.aluDark, 0.04, 0.8, 0.8, LX + 0.17, TOPY + 0.4, 0);                // aufgeklappter Lukendeckel
    for (const z of [-2.2, -0.9, 0.9, 2.2]) b.beam(K.paint, V(D0, TOPY - 0.2, z), V(D1, TOPY - 0.2, z), 0.12, 0.2);
    b.beam(K.paint, corner(0, LT - 1.6), V(D0 + 0.1, TOPY - 0.2, -2.2), 0.12); b.beam(K.paint, corner(1, LT - 1.6), V(D0 + 0.1, TOPY - 0.2, 2.2), 0.12);
    b.beam(K.paint, corner(2, LT - 1.6), V(D1 - 0.1, TOPY - 0.2, -2.2), 0.12); b.beam(K.paint, corner(2, LT - 1.6), V(D1 - 0.1, TOPY - 0.2, 2.2), 0.12);
    const rail = (a, c, n) => { for (let i = 0; i <= n; i++) { const p = a.clone().lerp(c, i / n); b.cyl(M.steel, p, V(p.x, TOPY + 1.05, p.z), 0.022, 5); } b.cyl(M.steel, V(a.x, TOPY + 1.05, a.z), V(c.x, TOPY + 1.05, c.z), 0.03, 6); b.cyl(M.steel, V(a.x, TOPY + 0.55, a.z), V(c.x, TOPY + 0.55, c.z), 0.02, 5); };
    rail(V(D0 + 0.05, TOPY, -DZ + 0.05), V(D0 + 0.05, TOPY, DZ - 0.05), 4); rail(V(D1 - 0.05, TOPY, -DZ + 0.05), V(D1 - 0.05, TOPY, DZ - 0.05), 4);
    rail(V(D0 + 0.05, TOPY, -DZ + 0.05), V(D1 - 0.05, TOPY, -DZ + 0.05), 4); rail(V(D0 + 0.05, TOPY, DZ - 0.05), V(D1 - 0.05, TOPY, DZ - 0.05), 4);
    // Mastkopf: Drehkranz, ausfahrbares Innenrohr, Gehäuse, Ausleger, Fangtrichter, Kupplung
    b.vcyl(K.paint, 0.38, 3.6, XM, TOPY - 3.6, 0, 14);
    b.vcyl(M.steel, 0.75, 0.25, XM, TOPY, 0, 18); b.torus(M.steel, 0.75, 0.04, XM, TOPY + 0.25, 0, 'y', 18);
    b.vcyl(K.paint, 0.45, 2.6, XM, TOPY + 0.25, 0, 16); b.sph(K.paint, 0.45, XM, TOPY + 2.85, 0, 1, 0.35, 1, 16);
    b.sph(M.navRed, 0.1, XM, TOPY + 3.05, 0, 1, 1, 1, 8);                        // Hindernisfeuer
    b.cyl(M.steel, V(XM - 0.42, 0, 0), V(CUP1 - 0.02, 0, 0), 0.28, 14);
    b.cyl(M.steel, V(XM - 0.5, -0.45, 0), V(CUP1 + 0.15, -0.3, 0), 0.08, 8);  // Stützstrebe
    b.add(K.steelDS, new THREE.CylinderGeometry(0.26, 0.78, CUP1 - CUP0, 20, 1, true), new THREE.Matrix4().makeRotationZ(-Math.PI / 2).setPosition((CUP0 + CUP1) / 2, 0, 0));
    b.add(K.paint, new THREE.CylinderGeometry(0.31, 0.83, CUP1 - CUP0 - 0.05, 20, 1, true), new THREE.Matrix4().makeRotationZ(-Math.PI / 2).setPosition((CUP0 + CUP1) / 2 + 0.03, 0, 0));
    b.torus(M.steel, 0.8, 0.05, CUP0, 0, 0, 'x', 20);
    b.cyl(M.steel, V(CUP1, 0, 0), V(CUP1 + 0.08, 0, 0), 0.31, 14);
    for (let k = 0; k < 4; k++) { const a = (45 + k * 90) * D2R, ca = Math.cos(a), sa = Math.sin(a); b.beam(M.brass, V(CUP1 - 0.4, 0.42 * ca, 0.42 * sa), V(CUP1 - 0.4, 0.66 * ca, 0.66 * sa), 0.08, 0.08); }
    b.cyl(M.steel, V(CUP1, 0, 0), V(X_BOW + 0.6, 0, 0), 0.07, 10);           // Kupplungsspindel
    b.sph(M.brass, 0.09, X_BOW + 0.59, 0, 0, 1, 1, 1, 10);                       // Kupplungskopf an der Konusspitze
    b.torus(M.steel, 0.15, 0.035, X_BOW + 0.43, 0, 0, 'x', 14);                // Klauenring um den Bugkonus
    // Hauptwinde: Seil vom Maschinenhaus über eine Umlenkrolle zum Kopf
    b.torus(M.steel, 0.3, 0.05, XM + 0.5, LT - 0.4, -0.7, 'z', 14);
    rope([V(XM + 3.0, GY + 3.9, -0.7), V(XM + 0.5, LT - 0.7, -0.7)], 0.02, M.steel); rope([V(XM + 0.2, LT - 0.2, -0.7), V(XM, TOPY + 0.6, -0.4)], 0.02, M.steel);
    fig(XM - 0.9, 1.5, Math.PI, 'officer', { y: TOPY });                       // Mastoffizier
    // Fahrwerke („Traktoren“) an den drei Ecken
    for (let i = 0; i < 3; i++) {
      const cx = XM + CB[i][0], cz = CB[i][1];
      B(K.paint, cx - 0.55, cx + 0.55, GY + 0.52, GY + 1.25, cz - 2.9, cz + 2.9);
      for (const s of [-1, 1]) B(K.paint, cx + s * 0.86, cx + s * 1.0, GY + 0.5, GY + 1.2, cz - 2.7, cz + 2.7);
      for (const dz of [-1.8, -0.6, 0.6, 1.8]) for (const s of [-1, 1]) { b.cyl(M.black, V(cx + s * 0.64, GY + 0.62, cz + dz), V(cx + s * 0.8, GY + 0.62, cz + dz), 0.42, 14); b.cyl(M.steel, V(cx + s * 0.6, GY + 0.62, cz + dz), V(cx + s * 0.84, GY + 0.62, cz + dz), 0.12, 8); }
      B(K.paint, cx - 1.1, cx + 1.1, GY + 1.25, GY + 1.33, cz - 2.9, cz + 2.9);
      b.vcyl(M.steel, 0.5, 0.45, cx, GY + 1.33, cz, 14);
      B(K.vehGrey, cx - 1.0, cx + 1.0, GY + 1.33, GY + 2.3, cz + 1.0, cz + 2.8); B(M.steel, cx - 0.8, cx + 0.8, GY + 1.45, GY + 2.15, cz + 2.8, cz + 2.86);
      B(K.vehGrey, cx - 1.0, cx + 1.0, GY + 1.33, GY + 1.9, cz - 2.8, cz - 1.0);
      for (const dz of [-3.0, 3.0]) B(M.steel, cx - 1.05, cx + 1.05, GY + 0.65, GY + 0.95, cz + dz - 0.1, cz + dz + 0.1);
      block(cx - 1.3, cx + 1.3, cz - 3.2, cz + 3.2, 4);
    }
    // Maschinenhaus (Benzinmotor 565 PS, Generatoren, Hauptwinde)
    { const x0 = XM + 2.6, x1 = XM + 8.0, zh = 2.4, yb = GY + 0.35, yt = GY + 3.6;
      B(M.steel, x0 - 0.1, x1 + 0.1, GY, yb, -zh - 0.1, zh + 0.1);
      B(K.house, x0, x1, yb, yt, -zh, zh); B(K.paint, x0 - 0.15, x1 + 0.15, yt, yt + 0.12, -zh - 0.15, zh + 0.15);
      for (const s of [-1, 1]) for (const wx of [x0 + 1.0, x0 + 2.6, x0 + 4.2]) B(K.glassDk, wx, wx + 0.9, yb + 1.4, yb + 2.2, s * zh, s * (zh + 0.02));
      B(M.woodDark, x0 - 0.02, x0, yb, yb + 2.1, -0.5, 0.5); B(M.brass, x0 - 0.05, x0 - 0.02, yb + 1.0, yb + 1.06, 0.3, 0.38);
      for (let k = 0; k < 3; k++) B(M.steel, x0 - 0.5 + k * 0.17, x0 - 0.33 + k * 0.17, GY, yb - k * 0.12, -0.5, 0.5);
      b.vcyl(M.steel, 0.16, 2.0, x1 - 0.8, yt, 1.4, 10); b.vcyl(M.black, 0.2, 0.1, x1 - 0.8, yt + 2.0, 1.4, 10);
      b.vcyl(M.aluDark, 0.3, 0.5, x0 + 2.0, yt, -1.0, 10);
      C.sign('Mooring Mast', x0 - 0.05, yb + 2.5, 0, 0.32, 'x-', 'dark');
      block(x0 - 0.7, x1 + 0.2, -zh - 0.2, zh + 0.2, 4);
      fig(x0 - 1.3, 1.1, Math.PI, 'worker');
    }
    // Gierwinden am Mastfuß und Abspannungen zu Bodenankern
    for (const s of [-1, 1]) {
      const wx = XM - 12, wz = s * 17;
      B(K.vehGrey, wx - 1.2, wx + 1.2, GY, GY + 1.1, wz - 0.8, wz + 0.8); b.cyl(M.steel, V(wx - 0.9, GY + 1.45, wz), V(wx + 0.9, GY + 1.45, wz), 0.38, 14);
      for (const k of [-1, 1]) b.cyl(M.steel, V(wx + k * 0.95, GY + 1.45, wz), V(wx + k * 1.02, GY + 1.45, wz), 0.5, 14);
      b.torus(M.rope, 0.3, 0.07, wx, GY + 1.45, wz, 'x', 12);
      block(wx - 1.3, wx + 1.3, wz - 0.9, wz + 0.9, 3);
      fig(wx - 1.8, wz, 0, 'dung');
    }
    for (const [i, ax, az] of [[0, XM - 17, -24], [1, XM - 17, 24], [2, XM + 30, 0]]) {
      const top = corner(i, yAt(0.9)), an = V(ax, GY + 0.7, az);
      B(K.concrete, ax - 0.7, ax + 0.7, GY - 0.2, GY + 0.6, az - 0.7, az + 0.7); b.torus(M.steel, 0.12, 0.03, ax, GY + 0.68, az, 'x', 8);
      b.cyl(M.steel, top, an, 0.025, 6); const tb = top.clone().lerp(an, 0.93); b.cyl(M.steel, tb, top.clone().lerp(an, 0.96), 0.05, 8);
      block(ax - 0.8, ax + 0.8, az - 0.8, az + 0.8, 2);
    }
    fig(LX - 0.9, -0.8, 0.3, 'dung');

    // =================================================================
    // Gleise: Ankerkreis, Mastgleise und Heckgleis zum Hangar
    // =================================================================
    const NS = 200;
    for (let i = 0; i < NS; i++) {
      const a0 = (i / NS) * 2 * Math.PI, a1 = ((i + 1) / NS) * 2 * Math.PI;
      for (const rr of [RC - GAUGE / 2, RC + GAUGE / 2, RC]) {
        const p = circ(a0, rr), q = circ(a1, rr), dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz);
        if (rr === RC) b.box(K.concreteDk, len + 0.05, 0.06, 2.6, (p.x + q.x) / 2, GY + 0.03, (p.z + q.z) / 2, ryTo(dx, dz));
        else b.box(M.steel, len + 0.02, 0.14, 0.07, (p.x + q.x) / 2, GY + 0.13, (p.z + q.z) / 2, ryTo(dx, dz));
      }
    }
    const track = (x, z0, z1, sleepers) => {
      const n = Math.ceil(Math.abs(z1 - z0) / 30);
      for (let k = 0; k < n; k++) {
        const a = z0 + (z1 - z0) * k / n, c = z0 + (z1 - z0) * (k + 1) / n;
        B(K.gravel, x - 1.5, x + 1.5, GY, GY + 0.05, a, c);
        for (const s of [-1, 1]) B(M.steel, x + s * GAUGE / 2 - 0.035, x + s * GAUGE / 2 + 0.035, GY + 0.1, GY + 0.24, a, c);
      }
      if (sleepers) for (let z = sleepers[0]; z < sleepers[1]; z += 0.9) B(M.woodDark, x - 1.3, x + 1.3, GY + 0.05, GY + 0.1, z - 0.12, z + 0.12);
    };
    track(XM + CB[0][0], 32, HZ1 + 4, [-40, 32]); track(XM + CB[2][0], 32, HZ1 + 4, [-40, 32]);
    track(XM, -RC - 2, HZ1 + 4, null);
    board('Mooring Out Circle', 37, -32, 0.5, 'x+', 'dark', 1.3);
    info('Ankerkreis', 'Von Hangar No. 1 führten Gleise zu zwei Ankerkreisen („mooring-out circles“) für Mast, Heckträger und Heckwagen. Die selbstfahrenden Masten überspannten zwei Gleispaare. Für die ZR-3 „Los Angeles“ ist in den 1920er Jahren ein Ankerkreis von 438 ft (≈ 133 m) Radius überliefert, an anderen Navy-Basen wurden später Kreise von 643 ft (≈ 196 m) gebaut; welchen Kreis die Hindenburg 1936/37 nutzte, ist nicht belegt. Im Modell ergibt sich der Radius aus dem Abstand zwischen Mastkopf und Heckwagen unter der unteren Flosse (rund 219 m); auch die Lage der Gleise zur Halle ist abgeleitet.', 37.6, GY + 1.6, -30.4);

    // =================================================================
    // Heck: beschwerter Wagen unter der unteren Flosse, Lokomotive auf dem Kreisgleis
    // =================================================================
    b.at(XT, GY, 0, ryTo(0, 1), () => {                                         // lokal +x = Gleisrichtung (+z)
      for (const lx of [-3.0, -2.3, -1.6, 1.6, 2.3, 3.0]) for (const s of [-1, 1]) b.cyl(M.black, V(lx, 0.45, s * GAUGE / 2 - 0.06), V(lx, 0.45, s * GAUGE / 2 + 0.06), 0.25, 12);
      for (const s of [-1, 1]) B(K.paint, -3.6, 3.6, 0.3, 0.77, s * 1.0, s * 1.25);
      B(M.steel, -3.6, 3.6, 0.71, 0.77, -1.0, 1.0);
      for (const s of [-1, 1]) B(K.paint, s * 3.6, s * 3.75, 0.3, 0.77, -1.3, 1.3);
      for (const s of [-1, 1]) {
        B(K.concrete, s * 0.6, s * 3.4, 0.77, 1.55, -1.15, 1.15);
        B(K.concrete, s * 1.2, s * 2.9, 1.55, 2.05, -0.9, 0.9);
        b.torus(M.steel, 0.1, 0.025, s * 2.05, 2.12, 0, 'x', 8);
        B(M.steel, s * 0.28, s * 0.42, 0.77, 1.45, -1.1, 1.1);                  // Flossenschuh: Klauen beidseits der Flosse
      }
      B(M.rubber, -0.28, 0.28, 0.77, 0.79, -1.0, 1.0);
      B(M.steel, 3.75, 4.5, 0.48, 0.6, -0.08, 0.08);
    });
    block(XT - 1.4, XT + 1.4, -3.9, 3.9, 3);
    const onCircle = (s, fn) => { const th = s / RC, p = circ(th), d = V(Math.sin(th), 0, Math.cos(th)); b.at(p.x, GY, p.z, ryTo(d.x, d.z), fn); return p; };
    onCircle(7.5, () => {                                                       // Tender
      B(K.loco, -2.6, 2.6, 0.9, 3.0, -1.4, 1.4); B(M.black, -2.4, 2.4, 3.0, 3.25, -1.2, 1.2);
      for (const lx of [-1.8, -0.9, 0.9, 1.8]) for (const s of [-1, 1]) b.cyl(M.black, V(lx, 0.65, s * 0.72 - 0.06), V(lx, 0.65, s * 0.72 + 0.06), 0.45, 12);
      B(M.steel, -2.75, -2.6, 0.8, 1.1, -0.1, 0.1);
    });
    onCircle(16.6, () => {                                                      // Lokomotive, Führerhaus zum Tender
      B(M.black, -5.0, 5.2, 0.9, 1.35, -0.55, 0.55); B(K.loco, -4.6, 4.8, 1.72, 1.78, -1.45, 1.45);
      for (const lx of [-2.4, -0.8, 0.8, 2.4]) for (const s of [-1, 1]) b.cyl(K.loco, V(lx, 0.95, s * 0.72 - 0.07), V(lx, 0.95, s * 0.72 + 0.07), 0.75, 16);
      for (const s of [-1, 1]) { b.cyl(M.black, V(4.4, 0.65, s * 0.72 - 0.06), V(4.4, 0.65, s * 0.72 + 0.06), 0.45, 12); b.beam(M.steel, V(-2.4, 0.95, s * 0.86), V(2.4, 0.95, s * 0.86), 0.1, 0.14); b.cyl(M.black, V(3.2, 1.25, s * 1.15), V(4.3, 1.25, s * 1.15), 0.32, 12); }
      b.cyl(K.loco, V(-2.2, 2.65, 0), V(4.4, 2.65, 0), 0.95, 18); b.cyl(M.black, V(4.4, 2.65, 0), V(5.2, 2.65, 0), 1.0, 18);
      b.vcyl(M.black, 0.3, 0.85, 4.8, 3.55, 0, 12, 0.36); b.sph(K.loco, 0.45, 1.2, 3.55, 0, 1, 0.8, 1, 12); b.sph(K.loco, 0.35, 2.9, 3.5, 0, 1, 0.8, 1, 12);
      b.sph(M.alu, 0.2, 5.15, 3.4, 0, 0.6, 1, 1, 10); B(M.red, 5.2, 5.4, 0.95, 1.4, -1.4, 1.4);
      B(K.loco, -4.6, -2.2, 1.78, 4.3, -1.45, 1.45); B(M.black, -4.75, -2.05, 4.3, 4.42, -1.55, 1.55);
      for (const s of [-1, 1]) B(K.glassDk, -3.9, -2.8, 3.1, 3.9, s * 1.45, s * 1.465);
      B(M.steel, -5.15, -5.0, 0.8, 1.1, -0.1, 0.1);
    });
    block(XT - 2.2, XT + 2.2, 4.0, 22.5, 5);
    fig(XT - 2.0, -2.2, 0, 'dung'); fig(XT + 2.0, 2.4, Math.PI, 'navy'); fig(XT - 1.9, 3.0, -0.4, 'officer'); fig(XT + 2.1, -3.0, Math.PI, 'navy');
    info('Heck am Kreisgleis', 'Nach deutschem Verfahren lief die untere Flosse auf einem schweren Wagen, der auf einem Kreisgleis um den Mast fuhr und das Schiff im Wind hielt. In Lakehurst lehnten die Deutschen 1936 den 89 t schweren Heckträger der Navy und das Spreizgeschirr ab; das Heck wurde nur von einer Lokomotive (rund 132 t) gezogen, bis das Schiff auf die Hallengleise ausgerichtet war. Ballastwagen und Lokomotive sind hier vereinfacht dargestellt.', XT + 3.2, GY + 1.6, -4.6);

    // =================================================================
    // Landetaue und Spinnen
    // =================================================================
    for (const s of [-1, 1]) {
      const A = hp(240.5, s * 32, 1, 0.06), H0 = V(212, GY + 1.02, s * 38), H1 = V(190, GY + 0.95, s * 50);
      rope(sag(A, H0, 10, 0.45), 0.024); rope([H0, H1], 0.024);
      const dir = V(H1.x - H0.x, 0, H1.z - H0.z).normalize(), post = H1.clone().addScaledVector(dir, 3.5);
      b.vcyl(M.woodDark, 0.16, 1.2, post.x, GY, post.z, 10); b.vcyl(M.steel, 0.2, 0.08, post.x, GY + 0.8, post.z, 10);
      rope([H1, V(post.x, GY + 0.85, post.z)], 0.024);
      for (let k = 0; k < 3; k++) b.torus(M.rope, 0.45, 0.05, post.x + dir.x * 1.4 + 0.9, GY + 0.05 + k * 0.08, post.z + dir.z * 1.4, 'y', 14);
      block(post.x - 0.3, post.x + 0.3, post.z - 0.3, post.z + 0.3, 2);
      crewOnLine(H0, H1, 12, s > 0 ? 21 : 22);
      fig(H0.x + 3, H0.z - s * 3, ryTo(1, -s), 'officer');
      // Spinnen: Haupttau zum Spinnenring, davon verzweigte Leinen in viele Hände
      for (const [x, seed] of [[226, 31], [112, 41]]) {
        const Ap = hp(x, s * 38, 1, 0.06), R0 = V(x - 2, GY + 5.2, s * (rLin(x) * Math.sin(38 * D2R) + 8));
        rope(sag(Ap, R0, 5, 0.15), 0.022); b.torus(M.steel, 0.2, 0.03, R0.x, R0.y, R0.z, 'y', 12);
        const r = rng(seed + s);
        for (let k = 0; k < 8; k++) {
          const phi = (-70 + k * 20) * D2R, rad = 5.6 + r() * 1.2;
          const px = R0.x + rad * Math.sin(phi), pz = R0.z + s * rad * Math.cos(phi);
          const tw = V(R0.x - px, 0, R0.z - pz).normalize(), hand = V(px + tw.x * 0.42, GY + 1.08, pz + tw.z * 0.42);
          rope(sag(R0, hand, 3, 0.12), 0.016);
          fig(px, pz, ryTo(tw.x, tw.z), r() < 0.75 ? 'navy' : 'civil2', { pose: 'pull', hands: [hand, hand.clone().add(V(-tw.x * 0.18, -0.02, -tw.z * 0.18))] });
        }
      }
    }
    for (const [x, z] of [[205, 18], [198, -20], [232, -26]]) for (let k = 0; k < 3; k++) b.torus(M.rope, 0.5 - k * 0.06, 0.05, x, GY + 0.05 + k * 0.09, z, 'y', 14);
    info('Landung in Lakehurst', 'Die Hindenburg landete als „Hochlandung“: Aus der Höhe wurden Landetaue und Mastseil abgeworfen, die Bodenmannschaft verband das Bugtau mit dem Seil des Masts, und das Schiff wurde herangewinscht, bis der Bugkonus im Becher des Mastkopfs einrastete. An den Bugtauen und an den verzweigten „Spinnen“ hielten Navy-Matrosen und zivile Hilfskräfte das Schiff; ihre Zahl bei der Hindenburg ist nicht genau belegt (beim LZ 127 rund 200). Am 6. Mai 1937 wurden die Taue um 19:21 Uhr aus 55 bis 90 m Höhe abgeworfen (die Angaben widersprechen sich); kurz darauf geriet das Schiff hier am Landeplatz in Brand, 36 Menschen kamen ums Leben.', 224.5, GY + 1.6, 10);
    info('Fahrbarer Ankermast', 'Der fahrbare Ankermast (Wellman-Mast) der Naval Air Station Lakehurst war 75 ft (22,9 m) hoch und ließ sich bis 160 ft (48,8 m) ausfahren. Der Unterbau hatte 80 ft (24,4 m) Seitenlänge, wog rund 300 t und fuhr mit drei Eckfahrwerken auf weit gespurten Schienen. Ein 8-Zylinder-Benzinmotor mit 565 PS trieb Generatoren an; die Hauptwinde zog 25.000 lb (≈ 11 t) mit 400 ft/min. Im Mastkopf rastet der Bugkonus des Schiffs in einen Becher, der Kopf dreht sich mit, wenn das Schiff dem Wind folgt. Am 6. Mai 1937 stand ein Offizier oben auf dem Mast. Der dreieckige Grundriss ist aus den drei Eckfahrwerken abgeleitet, belegt ist er nicht.', XM - 9.5, GY + 1.6, 4);

    // =================================================================
    // Passagiere, Gepäck, Zoll, Fahrzeuge
    // =================================================================
    const xF = Math.min(FALLREEP.x0, 168);                                    // Fußende der Fallreeps (x ≈ 168–171)
    const pr = rng(55), bags = [M.leather, M.pigskin, M.upBrown];
    const pax = [[164.5, -3.2, 'civil'], [163.6, -4.0, 'woman'], [162.4, -3.4, 'civil2'], [161.5, -4.4, 'woman2'], [164.2, 3.4, 'civil'], [163.0, 4.2, 'woman3'],
      [161.8, 3.6, 'civil2'], [160.5, -9.5, 'civil'], [159.7, -10.4, 'woman'], [157.5, -14.5, 'civil2'], [156.8, -15.6, 'woman2'], [155.5, -19.5, 'civil'], [154.6, -20.2, 'woman3'], [166.2, 4.8, 'civil']];
    pax.forEach(([x, z, k], i) => fig(x, z, i > 6 ? ryTo(-0.25, -1) : ryTo(-1, (pr() - 0.5) * 0.6), k, { pose: i > 6 ? 'walk' : 'stand', bag: pr() < 0.55 ? bags[i % 3] : null }));
    fig(xF - 0.6, -3.0, ryTo(1, 0.6), 'officer'); fig(xF - 0.6, 3.0, ryTo(1, -0.6), 'navy');
    // Zolltisch
    B(M.woodDark, 156.4, 157.9, GY + 0.72, GY + 0.76, -8.2, -7.4);
    for (const [x, z] of [[156.5, -8.1], [157.8, -8.1], [156.5, -7.5], [157.8, -7.5]]) b.vcyl(M.woodDark, 0.03, 0.72, x, GY, z, 6);
    b.box(M.paper, 0.3, 0.01, 0.22, 157.0, GY + 0.765, -7.8); b.box(M.black, 0.24, 0.06, 0.16, 157.5, GY + 0.79, -7.75);
    fig(156.9, -9.0, ryTo(0, 1), 'civil'); board('U.S. Customs', 157.15, -9.6, 0.32, 'z+', 'dark', 1.25);
    block(156.3, 158.0, -8.3, -7.3, 1);
    info('Aussteigen in Lakehurst', 'Die Fahrgäste verließen das Schiff über die ausklappbaren Treppen im Schiffsbauch. In Lakehurst stand nach Filmaufnahmen auch eine fahrbare Treppe bereit, während das Schiff knapp über dem Boden gehalten wurde. Danach folgten Zoll- und Passkontrolle, das Gepäck kam auf Karren zu den Bussen. Die genaue Lage der Treppen am Schiff ist nicht belegt.', 162.2, GY + 1.6, -6.2);
    for (const [x, z, sd] of [[160.6, -6.0, 1], [160.6, 6.2, 2], [157.6, 6.4, 3], [157.6, -11.6, 4]]) { cart(x, z, 0, sd); block(x - 1.3, x + 2.1, z - 0.75, z + 0.75, 1.2); }
    tug(155.0, 6.4, 0); block(154.0, 156.0, 5.6, 7.2, 1.5);
    bus(150, -30, 0); block(145.3, 154.7, -31.4, -28.6, 3.5);
    bus(138, -30, 0); block(133.3, 142.7, -31.4, -28.6, 3.5);
    car(170, -33, 0, K.navy); block(167.6, 172.4, -34.0, -32.0, 2);
    truck(118, 34, Math.PI, K.vehGreen, 7); block(115.2, 121.2, 32.8, 35.2, 3);
    truck(XM - 28, -38, Math.PI / 2, K.vehGrey, 9); block(XM - 29.2, XM - 26.8, -41.1, -34.9, 3);
    tanker(XM + 20, 22, 0); block(XM + 16.9, XM + 22.9, 20.8, 23.2, 3);
    C.sign('U.S. Navy', XM + 18.25, GY + 1.72, 22.92, 0.35, 'z+', 'alu');
    board('U.S. Naval Air Station Lakehurst', 152, -46, 0.9, 'z+', 'plate', 1.4);
    board('Passengers', 158.5, -12.6, 0.36, 'z+', 'plate', 1.3);
    board('Baggage', 162.8, 7.6, 0.3, 'z-', 'plate', 1.1);
    board('No Smoking', 176, -12, 0.42, 'z+', 'red', 1.2); board('No Smoking', 176, 12, 0.42, 'z-', 'red', 1.2); board('No Smoking', XM - 16, -6, 0.42, 'x-', 'red', 1.2);
    board('Keep Clear of Lines', 208, 30, 0.36, 'z+', 'red', 1.2); board('Keep Clear of Lines', 208, -30, 0.36, 'z-', 'red', 1.2);
    board('Authorized Personnel Only', XM - 20, 10, 0.32, 'x-', 'dark', 1.2);
    C.panel('lageplan', (g, w, h) => {
      g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2520'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#2a2520'; g.font = 'bold 11px Georgia'; g.textAlign = 'center'; g.fillText('NAS LAKEHURST', w / 2, 16);
      g.lineWidth = 1.5; g.beginPath(); g.arc(70, 52, 30, 0, 7); g.stroke(); g.fillRect(98, 50, 5, 5);
      g.fillStyle = '#7a6a4c'; g.fillRect(88, 78, 26, 40); g.fillStyle = '#2a2520'; g.font = '9px Georgia'; g.fillText('HANGAR No. 1', 64, 122);
      g.strokeStyle = '#a3261c'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 52); g.lineTo(98, 52); g.stroke();
    }, 152, GY + 1.6, -45.95, 1.0, 1.0, 'z+');
    // Absperrungen mit Zuschauern
    const fence = (x0, x1, z, seed, n) => {
      for (let x = x0; x <= x1; x += 4) { b.vcyl(M.woodDark, 0.05, 1.0, x, GY, z, 6); if (x + 4 <= x1) rope(sag(V(x, GY + 0.95, z), V(x + 4, GY + 0.95, z), 2, 0.08), 0.015); }
      const r = rng(seed), kinds = ['civil', 'civil2', 'woman', 'woman2', 'woman3', 'navy'];
      for (let i = 0; i < n; i++) { const fz = z + Math.sign(z) * (0.8 + r() * 2.5); fig(x0 + 4 + r() * (x1 - x0 - 8), fz, ryTo((r() - 0.5) * 0.6, -Math.sign(z)), kinds[(r() * kinds.length) | 0]); }
    };
    fence(96, 236, -50, 61, 20); fence(104, 224, 54, 62, 12);
    board('Danger – Keep Behind Barrier', 120, -49.7, 0.4, 'z+', 'red', 1.1); board('Danger – Keep Behind Barrier', 200, 53.7, 0.4, 'z-', 'red', 1.1);

    // =================================================================
    // Scheinwerfermasten, Windsackmast
    // =================================================================
    for (const [px, pz] of [[130, -64], [130, 66], [330, -64], [330, 66]]) {
      const H = 20, leg = (sx, sz, f) => V(px + sx * (0.9 - 0.6 * f), GY + f * H, pz + sz * (0.9 - 0.6 * f)), C4 = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
      for (const [sx, sz] of C4) b.beam(K.paint, leg(sx, sz, 0), leg(sx, sz, 1), 0.1);
      for (let k = 1; k <= 7; k++) for (let i = 0; i < 4; i++) {
        const [ax, az] = C4[i], [cx, cz] = C4[(i + 1) % 4];
        b.beam(K.paint, leg(ax, az, k / 7), leg(cx, cz, k / 7), 0.06); b.beam(K.paint, leg(ax, az, (k - 1) / 7), leg(cx, cz, k / 7), 0.04);
      }
      B(M.aluDark, px - 1.1, px + 1.1, GY + H, GY + H + 0.1, pz - 1.1, pz + 1.1);
      const d = V(XM - 60 - px, 0, -pz).normalize();
      for (let i = 0; i < 6; i++) {
        const o = V(px + (i % 3 - 1) * 0.65 * -d.z, GY + H + 0.55 + Math.floor(i / 3) * 0.6, pz + (i % 3 - 1) * 0.65 * d.x), f = o.clone().add(V(d.x * 0.45, -0.12, d.z * 0.45));
        b.cyl(M.enamel, o, f, 0.26, 12, 0.3); b.cyl(M.lamp, f, f.clone().add(V(d.x * 0.02, -0.005, d.z * 0.02)), 0.27, 12);
      }
      block(px - 1.0, px + 1.0, pz - 1.0, pz + 1.0, 4);
    }
    const WX = 196, WZ = 74, WH = 9;
    b.vcyl(K.concrete, 0.45, 0.25, WX, GY, WZ, 12); b.vcyl(M.steel, 0.09, WH, WX, GY + 0.25, WZ, 10, 0.06);
    b.vcyl(M.steel, 0.14, 0.2, WX, GY + WH - 0.2, WZ, 10); b.sph(M.red, 0.1, WX, GY + WH + 0.35, WZ, 1, 1, 1, 8);
    block(WX - 0.5, WX + 0.5, WZ - 0.5, WZ + 0.5, 3);

    // =================================================================
    // Hangar No. 1 (294 × 110 × 68 m)
    // =================================================================
    { const out = new QuadBuf(), inn = new QuadBuf(), NB = 12, BW = (HZ0 - HZ1) / NB;
      for (let k = 0; k < NB; k++) {
        const za = HZ0 - k * BW, zb = za - BW;
        for (const s of [1, -1]) for (let i = 0; i < HP.length - 1; i++) {
          const a = V(HX + s * HP[i][0], GY + HP[i][1], za), c = V(HX + s * HP[i + 1][0], GY + HP[i + 1][1], za);
          const d = V(c.x, c.y, zb), e = V(a.x, a.y, zb);
          if (s > 0) { out.quad(a, e, d, c); inn.quad(a, c, d, e); } else { out.quad(a, c, d, e); inn.quad(a, e, d, c); }
        }
      }
      b.add(K.hangar, out.geo()); b.add(K.hangarIn, inn.geo());
      // Pfeiler und Dachrippen je Feld
      for (let k = 0; k <= NB; k++) {
        const z = HZ0 - k * BW;
        for (const s of [1, -1]) {
          B(K.paint, HX + s * 55, HX + s * 56.2, GY, GY + 31, z - 0.8, z + 0.8);
          for (let i = 1; i < HP.length - 1; i++) {
            const nx = HP[i + 1][1] - HP[i][1], ny = -(HP[i + 1][0] - HP[i][0]), nl = Math.hypot(nx, ny) || 1, o = 0.5;
            b.beam(K.paint, V(HX + s * (HP[i][0] + nx / nl * o), GY + HP[i][1] + ny / nl * o, z), V(HX + s * (HP[i + 1][0] + nx / nl * o), GY + HP[i + 1][1] + ny / nl * o, z), 0.9, 0.9);
          }
        }
        if (k < NB) for (const s of [1, -1]) for (const [y0, y1] of [[9, 15], [21, 27]]) B(K.glassDk, HX + s * 55.02, HX + s * 55.15, GY + y0, GY + y1, z - 1.0, z - BW + 1.0);
      }
      // Tore (vereinfachte Torflügel nach dem Halbprofil): vorn aufgeschoben, hinten geschlossen
      const leaf = (s, zf, zb2, dx, outward) => {
        // Torfläche im Halbprofil: u von 0 (Hallenmitte) bis 55 (Außenkante); dx = seitliche Verschiebung (offen)
        const q = new QuadBuf(), W3 = (u, v, z) => V(HX + s * (u + dx), GY + v, z);
        const poly = [[0, 0], ...HP];
        const hAt = (u) => { for (let i = 0; i < HP.length - 1; i++) { const [ua, va] = HP[i], [ub, vb] = HP[i + 1]; if (u <= ua && u >= ub) return va + (vb - va) * (ua - u) / (ua - ub || 1); } return 68; };
        for (let i = 1; i < poly.length - 1; i++) for (const z of [zf, zb2]) q.tri(W3(poly[0][0], poly[0][1], z), W3(poly[i][0], poly[i][1], z), W3(poly[i + 1][0], poly[i + 1][1], z), [0, 0], [1, 0], [1, 1]);
        for (let i = 0; i < poly.length; i++) { const p = poly[i], n = poly[(i + 1) % poly.length]; q.quad(W3(p[0], p[1], zf), W3(n[0], n[1], zf), W3(n[0], n[1], zb2), W3(p[0], p[1], zb2)); }
        b.add(K.hangarDoor, q.geo());
        const zo = zb2 + outward * 0.035;                                       // Außenfläche des Flügels
        for (const u of [9, 27, 45]) {                                          // Stützböcke mit Laufwerk
          b.beam(K.paint, W3(u, hAt(u) - 3, zb2 + outward * 0.6), W3(u, 0.6, zb2 + outward * 12), 1.1, 1.1);
          B(M.steel, HX + s * (u + dx) - 1.2, HX + s * (u + dx) + 1.2, GY, GY + 1.0, zb2 + outward * 11, zb2 + outward * 13);
        }
        for (const u of [6, 18, 30, 42, 52]) B(K.paint, HX + s * (u + dx) - 0.4, HX + s * (u + dx) + 0.4, GY, GY + hAt(u + 0.4) - 0.3, zo - 0.03, zo + outward * 0.08);
      };
      for (const s of [1, -1]) { leaf(s, HZ0, HZ0 + 2.5, 56, 1); leaf(s, HZ1, HZ1 - 2.5, 0, -1); }
      for (const zr of [HZ0 + 0.6, HZ0 + 1.9, HZ1 - 0.6, HZ1 - 1.9]) for (let k = 0; k < 8; k++) { const x0 = HX - 112 + k * 28; B(M.steel, x0, x0 + 28, GY + 0.05, GY + 0.18, zr - 0.04, zr + 0.04); }
      for (const s of [1, -1]) { block(HX + s * 54.4, HX + s * 56.4, HZ1, HZ0, 30); block(HX + s * 56, HX + s * 112, HZ0 - 0.2, HZ0 + 15, 30); }
      block(HX - 56, HX + 56, HZ1 - 15, HZ1 + 0.3, 30);
      C.sign('Hangar No. 1', HX + 84, GY + 14, HZ0 + 2.56, 3.2, 'z+', 'dark'); C.sign('Hangar No. 1', HX - 84, GY + 14, HZ0 + 2.56, 3.2, 'z+', 'dark');
      board('U.S. Naval Air Station Lakehurst', HX - 20, HZ0 + 48, 1.2, 'z+', 'plate', 1.6);
      info('Hangar No. 1', 'Hangar No. 1 wurde 1921 fertig und misst 966 × 350 × 224 ft (294 × 107–110 × 68 m). Die Tore an beiden Enden wiegen je 1.350 t, laufen auf Schienen und werden von je zwei 20-PS-Motoren bewegt. Die Hindenburg wurde in der Planung auf 245 m Länge gekürzt (statt 248 m), damit sie in diese Halle passte; 1936 lag sie nur zweimal darin. Torform, Fensterbänder und Gleisführung sind im Modell vereinfacht.', HX + 10, GY + 1.6, HZ0 + 37);
      fig(HX + 4, HZ0 + 20, ryTo(0, 1), 'navy'); fig(HX + 5, HZ0 + 21, ryTo(-1, 0.3), 'dung');
    }

    // Kiefern-Haine auf mittlere Entfernung
    { const r = rng(91);
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d = 750 + r() * 550, x = XM + Math.cos(a) * d, z = -150 + Math.sin(a) * d, h = 13 + r() * 9;
        for (let j = 0; j < 4; j++) {
          const tx = x + (r() - 0.5) * 30, tz = z + (r() - 0.5) * 30, th = h * (0.8 + r() * 0.4);
          b.vcyl(K.trunk, 0.3, th * 0.5, tx, GY, tz, 6); b.vcyl(j % 2 ? K.pine : K.pine2, th * 0.22, th * 0.6, tx, GY + th * 0.4, tz, 7, 0.4);
        }
      }
    }
  });

  // =================================================================
  // Boden, Horizontwald und Windsack als eigene Gruppe an der Szene
  // =================================================================
  G = new THREE.Group(); G.name = 'mastScene'; G.visible = false; C.scene.add(G);
  const S = 1800, X0 = XM - 60 - S / 2, Z0 = -200 - S / 2, TX = 2048;
  const toPx = (x, z) => [(x - X0) / S * TX, (z - Z0) / S * TX], mpx = TX / S;
  const macro = canvasTex(TX, TX, (g) => {
    const r = rng(17), blob = (x, z, rad, col, al) => {
      const [px, pz] = toPx(x, z), R = rad * mpx, gr = g.createRadialGradient(px, pz, 0, px, pz, R);
      gr.addColorStop(0, `rgba(${col},${al})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(px, pz, R, 0, 7); g.fill();
    };
    g.fillStyle = '#6f7a46'; g.fillRect(0, 0, TX, TX);
    for (let i = 0; i < 700; i++) blob(X0 + 40 + r() * (S - 80), Z0 + 40 + r() * (S - 80), 8 + r() * 45, r() < 0.5 ? '92,104,58' : '128,132,78', 0.35);
    for (let i = 0; i < 90; i++) blob(X0 + 60 + r() * (S - 120), Z0 + 60 + r() * (S - 120), 6 + r() * 26, '186,168,122', 0.55);
    const line = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w * mpx; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, z], i) => { const [px, pz] = toPx(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke(); };
    { const [cx, cz] = toPx(XM, 0); g.strokeStyle = 'rgba(168,152,110,0.75)'; g.lineWidth = 9 * mpx; g.beginPath(); g.arc(cx, cz, RC * mpx, 0, 7); g.stroke();
      g.fillStyle = 'rgba(176,160,118,0.85)'; g.beginPath(); g.arc(cx, cz, 30 * mpx, 0, 7); g.fill(); }
    for (const x of [XM + CB[0][0], XM + CB[2][0], XM]) line([[x, x === XM ? -RC : 34], [x, HZ1]], 5, 'rgba(150,140,118,0.9)');
    blob(XT, 0, 14, '170,154,112', 0.8);
    blob(170, 0, 30, '150,140,98', 0.6); blob(215, 0, 40, '140,134,90', 0.45);
    line([[150, -30], [150, -100], [HX - 80, HZ0 + 70]], 7, 'rgba(165,154,128,0.95)'); line([[150, -30], [-600, -90]], 7, 'rgba(165,154,128,0.95)');
    line([[160, -30], [160, -6]], 4, 'rgba(160,148,116,0.8)');
    { const [ax, az] = toPx(HX - 80, HZ0); g.fillStyle = '#a8a497'; g.fillRect(ax, az, 160 * mpx, 72 * mpx);
      const [hx, hz] = toPx(HX - 56, HZ1 - 16); g.fillStyle = '#9d998e'; g.fillRect(hx, hz, 112 * mpx, (HZ0 - HZ1 + 16) * mpx);
      const [ix, iz] = toPx(HX - 54.5, HZ1); g.fillStyle = '#56534d'; g.fillRect(ix, iz, 109 * mpx, (HZ0 - HZ1) * mpx); }
    g.strokeStyle = '#6f7a46'; g.lineWidth = 16; g.strokeRect(0, 0, TX, TX);
  }, { repeat: false });
  macro.anisotropy = 8;
  const detail = canvasTex(256, 256, (g, w, h) => {
    const r = rng(23); g.fillStyle = 'rgb(134,134,134)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { const v = 70 + r() * 140 | 0; g.fillStyle = `rgba(${v},${v},${v},0.55)`; g.fillRect(r() * w, r() * h, 1, 2 + r() * 4); }
    for (let i = 0; i < 40; i++) { const v = 150 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.beginPath(); g.arc(r() * w, r() * h, 4 + r() * 14, 0, 7); g.fill(); }
  });
  detail.colorSpace = THREE.NoColorSpace;
  const gmat = new THREE.MeshLambertMaterial({ map: macro });
  gmat.onBeforeCompile = (sh) => {
    sh.uniforms.uDet = { value: detail }; sh.uniforms.uHaze = { value: new THREE.Color(0x9aa38e) };
    sh.vertexShader = 'varying vec3 vGW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D uDet;\nuniform vec3 uHaze;\nvarying vec3 vGW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  float gD = length(vGW.xz - cameraPosition.xz);
  float gT = texture2D(uDet, vGW.xz * 0.11).r * 0.6 + texture2D(uDet, vGW.xz * 0.023 + 0.37).r * 0.4;
  diffuseColor.rgb *= mix(gT * 1.9, 1.0, smoothstep(120.0, 900.0, gD));
  diffuseColor.rgb = mix(diffuseColor.rgb, uHaze, smoothstep(700.0, 6000.0, gD) * 0.7);`);
  };
  const pg = new THREE.PlaneGeometry(12000, 12000, 4, 4); pg.rotateX(-Math.PI / 2); pg.translate(XM - 60, GY, -200);
  { const p = pg.attributes.position, uv = pg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - X0) / S, 1 - (p.getZ(i) - Z0) / S); }
  const ground = new THREE.Mesh(pg, gmat); ground.receiveShadow = true; ground.name = 'Landefeld'; G.add(ground);
  // Kiefernwald am Horizont: zwei gezackte Bänder
  for (const [R, N, hMin, hMax, col, seed] of [[1900, 2400, 14, 24, 0x2f3d2c, 5], [2700, 2600, 16, 30, 0x55625c, 6]]) {
    const pos = [], nor = [], r = rng(seed), cx = XM, cz = -150;
    const at = (a, rr, y) => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
    for (let i = 0; i < N; i++) {
      const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, am = (a0 + a1) / 2, rr = R + (r() - 0.5) * 60;
      const hv = hMin * (0.5 + r() * 0.3), hpk = hMin + r() * (hMax - hMin);
      const p = [at(a0, rr, GY - 1), at(a1, rr, GY - 1), at(a1, rr, GY + hv), at(a0, rr, GY + hv), at(am, rr, GY + hpk)];
      const n = [-Math.cos(am) * 0.95, 0.3, -Math.sin(am) * 0.95];
      for (const k of [0, 1, 2, 0, 2, 3, 3, 2, 4]) { pos.push(...p[k]); nor.push(...n); }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const fm = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })); fm.frustumCulled = false; G.add(fm);
  }
  // Windsack (bewegt)
  { const tex = canvasTex(64, 128, (g, w, h) => { for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#f2efe6' : '#d8602a'; g.fillRect(0, i * h / 5, w, h / 5 + 1); } }, { repeat: false });
    const sm = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
    sockArm = new THREE.Group(); sockArm.position.set(196, GY + 9 - 0.1, 74); G.add(sockArm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 16), new THREE.MeshLambertMaterial({ color: 0x4b5157 })); ring.rotation.y = Math.PI / 2; ring.position.x = -0.15; sockArm.add(ring);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), ring.material); arm.rotation.z = Math.PI / 2; arm.position.x = -0.05; sockArm.add(arm);
    const sg = new THREE.CylinderGeometry(0.45, 0.18, 3.6, 14, 4, true); sg.rotateZ(-Math.PI / 2); sg.translate(-1.8, 0, 0);
    sock = new THREE.Mesh(sg, sm); sock.position.x = -0.15; sock.castShadow = true; sockArm.add(sock);
  }
  C.tp('Landefeld unter dem Bug', 222, GY, 10, 0);
  C.tp('Am Ankermast', XM - 12, GY, 4, 0);
  C.tp('Mastkopf-Plattform', XM + 2.0, TOPY, 0.9, Math.PI);
  C.tp('Vor Hangar No. 1', HX + 10, GY, HZ0 + 40, -Math.PI / 2);
  C.portal('Leiter am Ankermast', V(LX - 0.55, GY, 0), V(LX + 0.75, TOPY, -0.9), 'hinauf', 'hinab');
}

function apply(mode) {
  lastMode = mode; const on = mode === 'mast';
  if (G) G.visible = on;
  const hb = typeof window !== 'undefined' ? window.__hb : null;
  if (hb && hb.infos) for (const i of hb.infos) if (TITLES.has(i.title) && i.sprite) i.sprite.visible = on;
}
export function onMode(mode) { apply(mode); }
export function update(dt, C) {
  if (C.sim.mode !== lastMode) apply(C.sim.mode);
  if (!G || !G.visible || !sockArm) return;
  t += dt;
  sockArm.rotation.y = 0.12 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.3);
  sock.rotation.z = -0.1 + 0.05 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 5.1);
  sock.rotation.x = 0.06 * Math.sin(t * 2.9);
}
