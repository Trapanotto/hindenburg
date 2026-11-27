// Detailmodul Rumpfinneres: Gerippe-Verspannung, Kielgang, Tanks, Räume und Plattformen am Kiel,
// Axialgang mit Gaszellen-Armaturen und Gasschächten, Bugraum und Hilfssteuerstand in der unteren Flosse.
// Alle Lagen kommen aus keel.js (ROOMS, PLATFORMS, TANKS, LADDERS …), damit Bau und Ausstattung zusammenpassen.
import * as THREE from 'three';
import { V, rng } from './util.js';
import { ST, MAIN, rLin, keelY, hp, hw, ENG, D2R, WIN_A, WIN_B, GX0, GX1, FALLREEP } from './hull.js';
import { KEEL_RANGES, AXIAL, LADDERS, LADDER_Z, FIN_STAND, finHalf, BOW, STB_RES, ROOMS, PLATFORMS, TANKS, roomById, segs, ROOM_H } from './keel.js';
import { table, chair, lean } from './decks.js';

const fmt = (x) => String(x).replace('.', ',');
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
const SHAFTS = [33.5, 62, 92, 123.5, 156.5, 188, 218];   // Gasschächte (rumpf.md, Abschnitt 7)

export default function (C) {
  const { M, root } = C, b = lean(C.b);
  const nav = C.nav, sign = C.sign, gauge = C.gauge, panel = C.panel;
  const R = rng(1290);
  const ky = keelY;
  const fz = (s) => (s > 0 ? 'z-' : 'z+'); // Fläche zeigt zur Schiffsmitte
  const mm = (a, c) => [Math.min(a, c), Math.max(a, c)];
  const Lm = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const Pm = (c) => new THREE.MeshPhongMaterial({ color: c, specular: 0x555555, shininess: 35 });
  const X = {
    fuel: Pm(0x8a6a2a), water: Pm(0x3c6a4a), air: Pm(0x3d5e8c), cable: Lm(0x1d1c1a),
    diesel: Lm(0x7a4a14, { emissive: 0x201000 }), engine: Pm(0x4e5a50), gen: Pm(0x37475a),
    slate: Lm(0x2b2e2c), copper: Pm(0xb06a3a), porcelain: Pm(0xf0eee6), strap: Lm(0x6a5a3a),
    mail: Lm(0x6e6a58), stone: Lm(0x8f8a80), green: Pm(0x3e5a3a), oil: Pm(0x5a4a2a),
  };
  const isMain = (x) => MAIN.some((m) => Math.abs(m - x) < 1e-3);
  const STK = ST.filter((x) => KEEL_RANGES.some(([a, c]) => x >= a && x <= c)); // Stationen mit A-Rahmen
  // A-Rahmen (keel.js): oberer Schenkel (x, y-0.6, ±1.9) → (x, y+2.9, 0), unterer (x, y-0.06, ±0.5) → (x, y-0.6, ±1.9)
  const up = (x, z) => ky(x) - 0.6 + 3.5 * (1.9 - Math.abs(z)) / 1.9;
  const lo = (x, z) => ky(x) - 0.06 - 0.54 * (Math.abs(z) - 0.5) / 1.4;
  // Hüllenhöhe (Unterseite des 36-Ecks) bei Querposition z
  const hy = (x, z) => {
    const r = rLin(x), az = Math.abs(z);
    for (let j = 0; j < 9; j++) {
      const z0 = r * Math.sin(j * 10 * D2R), z1 = r * Math.sin((j + 1) * 10 * D2R);
      if (az <= z1) { const y0 = -r * Math.cos(j * 10 * D2R), y1 = -r * Math.cos((j + 1) * 10 * D2R); return y0 + (y1 - y0) * (az - z0) / (z1 - z0); }
    }
    return 0;
  };
  const yMin = (x0, x1) => Math.min(ky(x0), ky(x1));
  const blockK = (x0, x1, z0, z1, h = 2) => nav.block(x0, x1, z0, z1, yMin(x0, x1) - 0.1, Math.max(ky(x0), ky(x1)) + h);

  const tankNear = (x0, x1, s, m) => TANKS.some((t) => t.s === s && t.x > x0 - m && t.x < x1 + m);
  const inK = (x0, x1) => KEEL_RANGES.some(([a, c]) => x0 >= a + 0.2 && x1 <= c - 0.2);
  const near = (list, x0, x1, s, m) => list.some((r) => r.s === s && x1 > r.x0 - m && x0 < r.x1 + m);
  // belegte Bereiche neben dem Steg (Räume, Plattformen, Gondel, Leitern, Laufstege, Kabinenbereich 1937)
  const busy = (x0, x1, s) => !inK(x0, x1) || x0 < 15.3 || near(ROOMS, x0, x1, s, 0.25) || near(PLATFORMS, x0, x1, s, 0.25) ||
    (s > 0 && x1 > STB_RES[0] - 0.5 && x0 < STB_RES[1]) || (s > 0 && x1 > 196.5 && x0 < 209.5) ||
    (s < 0 && LADDERS.some((l) => x1 > l.x - 0.8 && x0 < l.x + 0.8)) || (s > 0 && x1 > FIN_STAND.lx - 0.8 && x0 < FIN_STAND.lx + 0.8) ||
    ENG.some((e) => x1 > e.x - 0.8 && x0 < e.x + 0.8);

  const wp = []; // Drahtlinien (ein einziges LineSegments)
  const W = (a, c) => wp.push(a.x, a.y, a.z, c.x, c.y, c.z);
  const WIN = [...WIN_A, ...WIN_B].flatMap((j) => [j, 35 - j]);

  // ===================== Gerippe =====================
  // Schubverspannung: zwei Diagonaldrähte je Hüllenfeld
  for (let i = 0; i < ST.length - 1; i++) {
    const x0 = ST[i], x1 = ST[i + 1];
    if (Math.min(rLin(x0), rLin(x1)) < 0.8) continue;
    for (let j = 0; j < 36; j++) {
      if (x0 >= 172.99 && x1 <= 188.01 && WIN.includes(j)) continue;                       // Fensterbänder
      if (x0 >= GX0 - 0.01 && x1 <= GX1 + 0.01 && (j === 0 || j === 35)) continue;       // Gondelöffnung
      if (Math.abs(x0 - FALLREEP.x0) < 1e-3 && (j === 0 || j === 35)) continue;            // Fallreepöffnung
      if (ENG.some((e) => e.js.includes(j) && e.x > x0 && e.x < x1)) continue;            // Luken
      const a0 = j * 10, a1 = a0 + 10, d = -0.09;
      W(hp(x0, a0, 1, d), hp(x1, a1, 1, d)); W(hp(x0, a1, 1, d), hp(x1, a0, 1, d));
    }
  }
  // Knotenbleche an den Ring-/Längsträgerkreuzungen in Kielgangnähe
  for (const x of STK) for (const a of [-20, 0, 20]) {
    if (x < 53 && a !== 0) continue;                                // in der unteren Flosse verdeckt
    if (x > GX0 - 2 && x < GX1 + 2 && Math.abs(a) <= 10) continue;  // Gondelöffnung
    const t = a * D2R, T = V(0, Math.sin(t), Math.cos(t)), N = V(0, -Math.cos(t), Math.sin(t));
    const p = hp(x, a, 1, -0.035), sz = isMain(x) ? 0.6 : 0.4;
    b.add(M.alu, new THREE.BoxGeometry(sz, sz, 0.012), new THREE.Matrix4().makeBasis(V(1, 0, 0), T, N).setPosition(p));
    b.cyl(M.aluDark, p, p.clone().addScaledVector(N, -0.05), 0.045, 8);
  }
  // Ringnummern-Schilder an den Hauptringen (unter der Firstspitze des A-Rahmens)
  for (const m of MAIN) {
    if (!STK.some((x) => Math.abs(x - m) < 1e-3)) continue;
    const y = ky(m);
    b.box(M.aluDark, 0.03, 0.15, 0.5, m, y + 2.33, 0);
    b.cyl(M.steel, V(m, y + 2.405, 0), V(m, y + 2.875, 0), 0.006, 4);
    sign('Ring ' + fmt(m), m + 0.022, y + 2.33, 0, 0.11, 'x+', 'dark');
    sign('Ring ' + fmt(m), m - 0.022, y + 2.33, 0, 0.11, 'x-', 'dark');
  }

  // ===================== Kielgang =====================
  const PIPES = [[X.water, 0.04, 0.84, -0.40], [X.fuel, 0.03, 0.74, -0.41], [X.air, 0.02, 0.655, -0.42]];
  const ENDS = [...KEEL_RANGES.flat(), 197, 209];
  const clip = (xa, xb, s) => {
    if (s < 0 || xb <= 197 || xa >= 209) return [[xa, xb]];
    const o = []; if (xa < 197) o.push([xa, 197]); if (xb > 209) o.push([209, xb]); return o;
  };
  const flange = (x, y, z, r) => b.cyl(M.steel, V(x - 0.02, y, z), V(x + 0.02, y, z), r + 0.018, 8);
  for (const [ra, rb] of KEEL_RANGES) {
    const xs = segs(ra, rb);
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1], ya = ky(xa), yb = ky(xb);
      // Kabelbündel unter dem Firstträger
      b.cyl(X.cable, V(xa, ya + 2.845, 0.045), V(xb, yb + 2.845, 0.045), 0.014, 5);
      b.cyl(X.cable, V(xa, ya + 2.848, -0.042), V(xb, yb + 2.848, -0.042), 0.011, 5);
      b.cyl(M.rubber, V(xa, ya + 2.818, 0), V(xb, yb + 2.818, 0), 0.009, 4);
      for (const s of [-1, 1]) for (const [c0, c1] of clip(xa, xb, s)) {
        const y0 = ky(c0), y1 = ky(c1);
        b.beam(M.alu, V(c0, y0 - 0.6, s * 1.9), V(c1, y1 - 0.6, s * 1.9), 0.06);      // Untergurte des Kielträgers
        for (const [mt, r, z, dy] of PIPES) {                                         // Wasser, Kraftstoff, Druckluft
          b.tube(mt, V(c0, y0 + dy, s * z), V(c1, y1 + dy, s * z), r, 8);              // Stöße im nächsten Stück, Enden im Flansch
          for (const e of [c0, c1]) if (ENDS.includes(e)) flange(e, ky(e) + dy, s * z, r);
        }
      }
      // Ventilräder an der Wasserleitung (Viertelpunkt des Feldes)
      const s = i % 2 ? 1 : -1, xv = xa + (xb - xa) * 0.25, yv = ky(xv);
      if ((i % 2 === 0 || i % 3 === 0) && !busy(xv - 0.3, xv + 0.3, s)) {
        b.sph(M.bronze, 0.065, xv, yv - 0.4, s * 0.84, 1.3, 1, 1, 8);
        b.cyl(M.steel, V(xv, yv - 0.36, s * 0.84), V(xv, yv - 0.05, s * 0.84), 0.012, 5);
        b.torus(M.red, 0.075, 0.01, xv, yv - 0.04, s * 0.84, 'y', 14);
        b.cyl(M.red, V(xv - 0.075, yv - 0.04, s * 0.84), V(xv + 0.075, yv - 0.04, s * 0.84), 0.006, 4);
        b.cyl(M.red, V(xv, yv - 0.04, s * 0.84 - 0.075), V(xv, yv - 0.04, s * 0.84 + 0.075), 0.006, 4);
      }
    }
  }
  // Stationen: Lampen, Kabelschellen, Rohrböcke, Geräteposten
  STK.forEach((x, i) => {
    const y = ky(x), lx = x + 0.3, ly = ky(lx);
    b.cyl(M.steel, V(lx, ly + 2.87, 0), V(lx, ly + 2.7, 0), 0.006, 4);
    b.cyl(M.aluDark, V(lx, ly + 2.6, 0), V(lx, ly + 2.7, 0), 0.12, 10, 0.035);
    b.sph(M.lamp, 0.045, lx, ly + 2.6, 0, 1, 1, 1, 8);
    b.box(M.aluDark, 0.03, 0.06, 0.15, x, y + 2.84, 0);
    for (const s of [-1, 1]) {
      if (s > 0 && x > 196.5 && x < 209.5) continue;
      b.beam(M.alu, V(x, lo(x, 0.95), s * 0.95), V(x, y - 0.47, s * 0.95), 0.025);
      b.beam(M.alu, V(x, y - 0.455, s * 0.6), V(x, y - 0.455, s * 0.97), 0.03, 0.03); // Rohrbock
    }
    // Geräteposten (senkrechte Strebe zwischen den A-Rahmen-Schenkeln)
    const k = i % 6; if (k === 1 || k === 5) return;
    let s = i % 2 ? 1 : -1;
    if (busy(x - 0.15, x + 0.15, s)) s = -s;
    if (busy(x - 0.15, x + 0.15, s)) return;
    const f = fz(s);
    b.beam(M.alu, V(x, lo(x, 0.75), s * 0.75), V(x, up(x, 0.75), s * 0.75), 0.04);
    if (k === 0 || k === 3) { // Feuerlöscher
      b.vcyl(M.red, 0.075, 0.52, x, y + 0.5, s * 0.64, 12);
      b.sph(M.red, 0.075, x, y + 1.02, s * 0.64, 1, 0.5, 1, 10);
      b.vcyl(M.brass, 0.025, 0.08, x, y + 1.04, s * 0.64, 8);
      b.box(M.black, 0.1, 0.015, 0.03, x + 0.03, y + 1.12, s * 0.64);
      b.cyl(M.rubber, V(x + 0.025, y + 1.09, s * 0.62), V(x + 0.085, y + 0.62, s * 0.6), 0.01, 5);
      b.torus(M.alu, 0.078, 0.008, x, y + 0.82, s * 0.64, 'y', 12);
      sign('Feuerlöscher', x, y + 1.28, s * 0.72, 0.065, f, 'red');
    } else if (k === 2) { // Bordtelefon
      b.box(M.woodDark, 0.2, 0.28, 0.09, x, y + 1.3, s * 0.68);
      b.cyl(M.black, V(x - 0.09, y + 1.47, s * 0.66), V(x + 0.09, y + 1.47, s * 0.66), 0.022, 8);
      for (const dx of [-0.05, 0.05]) b.sph(M.brass, 0.035, x + dx, y + 1.36, s * 0.63, 1, 1, 0.6, 8);
      b.cyl(M.black, V(x, y + 1.22, s * 0.635), V(x, y + 1.22, s * 0.6), 0.03, 8, 0.04);
      b.cyl(M.steel, V(x + 0.1, y + 1.25, s * 0.68), V(x + 0.15, y + 1.25, s * 0.68), 0.008, 4);
      b.sph(M.black, 0.018, x + 0.15, y + 1.25, s * 0.66, 1, 1, 1, 6);
      b.cyl(X.cable, V(x + 0.03, y + 1.44, s * 0.7), V(x + 0.03, up(x, 0.7) - 0.04, s * 0.7), 0.008, 4);
      sign('Bordtelefon', x, y + 1.08, s * 0.722, 0.06, f, 'plate');
    } else {
      sign('Rauchen verboten!', x, y + 1.25, s * 0.72, 0.08, f, 'red');
    }
  });

  // ---------- Tanks: Beschriftung, Schauglas, Ventile, Bänder, Lagerung ----------
  const quickDump = (x, yb, z, s, yk) => { // Schnellablass mit rotem Zug zum Geländer
    b.cyl(M.bronze, V(x, yb - 0.04, z), V(x, yb - 0.42, z), 0.06, 8, 0.04);
    b.box(M.red, 0.1, 0.05, 0.05, x, yb - 0.45, z);
    b.cyl(M.red, V(x, yb - 0.45, z - s * 0.03), V(x, yk + 0.95, s * 0.56), 0.005, 4);
    b.cyl(M.woodLight, V(x - 0.06, yk + 0.95, s * 0.56), V(x + 0.06, yk + 0.95, s * 0.56), 0.012, 6);
  };
  const cradle = (x, y0, yk, s) => { for (const dx of [-0.45, 0.45]) {
    b.beam(M.alu, V(x + dx, y0 - 0.02, s * 1.6), V(x + dx, y0 - 0.02, s * 3.1), 0.05, 0.04);
    b.beam(M.alu, V(x + dx, y0 - 0.04, s * 1.9), V(x + dx, yk - 0.57, s * 1.9), 0.04);
  } };
  TANKS.forEach((t, n) => {
    const { x, s, z, y0 } = t, yk = ky(x), f = fz(s);
    if (t.kind === 'nb') {
      const yc = y0 + 0.85;
      sign('Notballast 500 kg', x, yc, s * (Math.abs(z) - 0.56), 0.08, f, 'red');
      b.torus(M.rope, 0.56, 0.014, x, yc, z, 'y', 18);
      for (const ry of [0, Math.PI / 2]) b.add(M.rope, new THREE.TorusGeometry(0.555, 0.011, 4, 18), new THREE.Matrix4().makeTranslation(x, yc, z).multiply(new THREE.Matrix4().makeScale(1, 1.35, 1)).multiply(new THREE.Matrix4().makeRotationY(ry)));
      quickDump(x, yc - 0.72, z, s, yk);
      return;
    }
    if (t.kind === 'oil') {
      b.vcyl(M.steel, 0.355, 0.03, x, y0 + 0.6, z, 14);
      sign('Schmieröl', x, y0 + 0.4, s * (Math.abs(z) - 0.36), 0.07, f, 'plate');
      b.cyl(M.brass, V(x, y0 + 1.08, z), V(x, y0 + 1.2, z), 0.05, 8);
      for (const dx of [-0.2, 0.2]) b.beam(M.alu, V(x + dx, y0 - 0.02, s * 2.2), V(x + dx, y0 - 0.02, s * 3.0), 0.04, 0.04);
      return;
    }
    if (t.kind === 'ballast') {
      for (const h of [0.3, 1.05]) b.vcyl(X.water, 0.81, 0.04, x, y0 + h - 0.02, z, 20);
      sign('Wasserballast 2000 kg', x, y0 + 0.7, s * (2.35 - 0.812), 0.09, f, 'plate');
      quickDump(x, y0, z, s, yk);
      b.vcyl(M.aluDark, 0.2, 0.05, x, y0 + 1.5, z, 12);
      cradle(x, y0, yk, s);
      return;
    }
    for (const h of [0.35, 1.55]) b.vcyl(M.steel, 0.81, 0.03, x, y0 + h - 0.015, z, 20);
    sign('Dieselöl', x, y0 + 1.25, s * (2.35 - 0.812), 0.1, f, 'plate');
    if (n % 3 === 0) sign('Rauchen verboten!', x, y0 + 0.95, s * (2.35 - 0.812), 0.07, f, 'red');
    // Füllstandsanzeiger (Schauglas)
    const gx = x + 0.33, gz = s * 1.571, lvl = 0.2 + R() * 0.75;
    for (const h of [0.25, 1.65]) b.cyl(M.brass, V(gx, y0 + h, s * 1.66), V(gx, y0 + h, s * 1.555), 0.012, 6);
    b.cyl(M.glassClear, V(gx, y0 + 0.22, gz), V(gx, y0 + 1.68, gz), 0.02, 8);
    b.cyl(X.diesel, V(gx, y0 + 0.25, gz), V(gx, y0 + 0.25 + lvl * 1.4, gz), 0.012, 6);
    b.box(M.black, 0.012, 1.4, 0.006, gx + 0.04, y0 + 0.95, s * 1.6);
    // Absperrventil, Mannloch, Entlüftung, Lagerung, Abwurfschäkel
    b.sph(M.bronze, 0.05, x, y0 + 0.3, s * 1.1, 1, 1, 1.4, 8);
    b.cyl(M.steel, V(x, y0 + 0.3, s * 1.1), V(x, y0 + 0.5, s * 1.1), 0.01, 4);
    b.torus(M.red, 0.06, 0.009, x, y0 + 0.5, s * 1.1, 'y', 12);
    b.vcyl(M.aluDark, 0.2, 0.05, x, y0 + 2.08, z, 12);
    b.cyl(M.steel, V(x + 0.1, y0 + 2.1, z), V(x + 0.1, y0 + 2.6, s * 2.1), 0.015, 5);
    b.torus(M.steel, 0.05, 0.012, x - 0.1, y0 + 2.2, z, 'x', 8);
    cradle(x, y0, yk, s);
  });

  // ---------- Konsolen mit Werkzeugkästen, Ersatzteilen, Sandsäcken ----------
  const toolbox = (x, y, z, mat) => {
    b.box(mat, 0.46, 0.2, 0.22, x, y + 0.1, z); b.box(mat, 0.48, 0.03, 0.235, x, y + 0.215, z);
    for (const dx of [-0.13, 0.13]) b.vcyl(M.steel, 0.008, 0.06, x + dx, y + 0.23, z, 4);
    b.cyl(M.steel, V(x - 0.14, y + 0.29, z), V(x + 0.14, y + 0.29, z), 0.012, 6);
    b.box(M.brass, 0.04, 0.04, 0.01, x, y + 0.19, z + Math.sign(-z) * 0.12);
  };
  const sandbags = (x, y, z) => {
    for (const dx of [-0.11, 0.11]) b.sph(M.sack, 1, x + dx, y + 0.07, z, 0.14, 0.075, 0.24, 10);
    b.sph(M.sack, 1, x, y + 0.2, z, 0.14, 0.07, 0.23, 10);
  };
  const spares = (x, y, z) => {
    b.box(M.crate, 0.42, 0.24, 0.34, x, y + 0.12, z);
    for (const dx of [-0.1, 0.1]) b.vcyl(M.steel, 0.075, 0.18, x + dx, y + 0.24, z, 10);
    b.torus(M.aluDark, 0.075, 0.015, x - 0.1, y + 0.42, z, 'y', 10);
  };
  const ropeCoil = (x, y, z, R0 = 0.15, n = 3) => { for (let k = 0; k < n; k++) b.torus(M.rope, R0, 0.03, x, y + 0.03 + k * 0.055, z, 'y', 14); };
  const drum = (x, y, z) => {
    for (const dz of [-0.13, 0.13]) b.cyl(M.woodDark, V(x, y + 0.17, z + dz - 0.015), V(x, y + 0.17, z + dz + 0.015), 0.17, 12);
    b.cyl(X.cable, V(x, y + 0.17, z - 0.115), V(x, y + 0.17, z + 0.115), 0.12, 12);
  };
  const items = [(x, y, z) => toolbox(x, y, z, M.red), sandbags, spares, ropeCoil, drum, (x, y, z) => toolbox(x, y, z, X.green)];
  {
    let cnt = 0;
    for (let i = 0; i < STK.length - 1; i++) {
      const xa = STK[i], xb = STK[i + 1]; if (xb - xa > 6 || xb - xa < 2.2) continue;
      const xm = (xa + xb) / 2, x0 = xm - 0.5, x1 = xm + 0.5;
      let s = cnt % 2 ? 1 : -1, ok = false;
      for (let tr = 0; tr < 2 && !ok; tr++, s = -s) if (!busy(x0, x1, s) && !tankNear(x0, x1, s, 0.95)) { ok = true; break; }
      if (!ok) continue;
      cnt++;
      b.beam(M.plank, V(x0, ky(x0) - 0.03, s * 0.905), V(x1, ky(x1) - 0.03, s * 0.905), 0.69, 0.04);
      b.beam(M.woodDark, V(x0, ky(x0) + 0.02, s * 1.24), V(x1, ky(x1) + 0.02, s * 1.24), 0.02, 0.06);
      for (const xe of [x0 + 0.05, x1 - 0.05]) {
        const ye = ky(xe);
        b.beam(M.alu, V(xe, ye - 0.065, s * 0.53), V(xe, ye - 0.065, s * 1.25), 0.03);
        b.beam(M.alu, V(xe, ye - 0.065, s * 0.53), V(xe, ye - 0.6, s * 1.9), 0.03);
        b.beam(M.alu, V(xe, ye - 0.065, s * 1.25), V(xe, ye - 0.06 - 0.54 * 0.75 / 1.4, s * 1.25), 0.025);
      }
      const a = Math.floor(R() * items.length), c = (a + 1 + Math.floor(R() * (items.length - 1))) % items.length;
      items[a](x0 + 0.27, ky(x0 + 0.27) - 0.01, s * 0.9);
      items[c](x1 - 0.27, ky(x1 - 0.27) - 0.01, s * 0.9);
    }
  }

  // ---------- Wegweiser unter dem Firstträger ----------
  const hang = (text, x) => {
    const y = ky(x), w = Math.max(1.3, Math.min(4, 0.52 * text.length + 0.9)) * 0.12;
    b.box(M.alu, 0.03, 0.02, w * 0.8, x, y + 2.86, 0);
    for (const sz of [-1, 1]) b.cyl(M.steel, V(x, y + 2.85, sz * w * 0.38), V(x, y + 2.43, sz * w * 0.38), 0.004, 4);
    b.box(M.woodDark, 0.02, 0.15, w + 0.04, x, y + 2.35, 0);
    sign(text, x + 0.016, y + 2.35, 0, 0.12, 'x+', 'dark');
    sign(text, x - 0.016, y + 2.35, 0, 0.12, 'x-', 'dark');
  };
  for (const [t, x] of [['Hilfssteuerstand', 38.6], ['Leiter zum Axialgang', 60.4], ['Mannschaftsräume', 64.4], ['Maschinengondeln', 90.6],
    ['Leiter zum Axialgang', 121.8], ['Maschinengondeln', 138.6], ['Frachtraum · Werkstatt', 144.9], ['Mannschaftsräume', 158.2], ['Passagierdecks', 169.4],
    ['Passagierdecks', 191.1], ['Elektrozentrale · Postraum', 192.6], ['Führergondel', 197.5], ['Offiziere', 203.8], ['Bugraum', 231.6]]) hang(t, x);

  // ---------- Türschilder und Rahmen der Räume ----------
  const shadeLamp = (x, y, z) => { // y = Unterkante des Schirms
    b.cyl(M.aluDark, V(x, y, z), V(x, y + 0.1, z), 0.11, 10, 0.03);
    b.sph(M.lamp, 0.04, x, y + 0.01, z, 1, 1, 1, 8);
  };
  const doorLabel = { crew5b: 'Mannschaft', crew5s: 'Mannschaft', crew11: 'Mannschaft', elektro: 'Elektrozentrale', post: 'Postraum', off14: 'Offiziere', kapitaen: 'Kommandant' };
  for (const r of ROOMS) {
    const xm = (r.door[0] + r.door[1]) / 2, s = r.s;
    sign(doorLabel[r.id], xm, ky(xm) + 2.02, s * 0.625, 0.08, fz(s), r.id === 'kapitaen' || r.id === 'elektro' ? 'brass' : 'plate');
    for (const x of r.door) b.box(M.brass, 0.02, 0.1, 0.025, x + (x === r.door[0] ? 0.05 : -0.05), ky(x) + 1.0, s * 0.63);
    // Bunk-Ausstattung: Vorhänge, Kissen, Leselampen
    const zm = (0.65 + r.zo) / 2;
    for (const k of r.bunks) {
      const zc = (k.z0 + k.z1) / 2, outer = Math.abs(zc) > zm;
      const za = outer ? (Math.abs(k.z0) < Math.abs(k.z1) ? k.z0 : k.z1) : (Math.abs(k.z0) > Math.abs(k.z1) ? k.z0 : k.z1);
      const zw = za === k.z0 ? k.z1 : k.z0, d = Math.sign(za - zc), dw = Math.sign(zw - zc), y = ky(k.x + 0.975);
      for (const h of r.tiers) {
        const yr = y + h + 0.76;
        if (r.id !== 'kapitaen') {
          b.cyl(M.alu, V(k.x, yr, za + d * 0.025), V(k.x + 1.95, yr, za + d * 0.025), 0.007, 4);
          const L = 0.35 + R() * 1.4; // zur Seite geschobener Vorhang
          b.bb(M.curtain, k.x + 0.02, k.x + 0.02 + L, y + h + 0.12, yr - 0.01, ...mm(za + d * 0.035, za + d * 0.05));
        }
        b.sph(M.white, 1, k.x + 0.26, y + h + 0.13, zc, 0.2, 0.06, 0.28, 10);
        b.cyl(M.brass, V(k.x + 0.3, y + h + 0.55, zw + dw * 0.04), V(k.x + 0.3, y + h + 0.55, zw - dw * 0.07), 0.01, 4);
        b.sph(M.lamp, 0.03, k.x + 0.3, y + h + 0.5, zw - dw * 0.08, 1, 1, 1, 6);
      }    }
  }
  const stool = (x, z) => {
    const y = ky(x);
    b.vcyl(M.wood, 0.17, 0.04, x, y + 0.42, z, 12);
    for (let k = 0; k < 3; k++) { const a = k * 2.09 + 0.5; b.cyl(M.woodDark, V(x + 0.13 * Math.cos(a), y, z + 0.13 * Math.sin(a)), V(x + 0.09 * Math.cos(a), y + 0.42, z + 0.09 * Math.sin(a)), 0.015, 5); }
  };
  const tableware = (x, z, s) => {
    const tY = ky(x) + 0.7575;
    b.vcyl(M.enamel, 0.04, 0.09, x - 0.3, tY, z - s * 0.15, 10); b.torus(M.enamel, 0.03, 0.007, x - 0.255, tY + 0.045, z - s * 0.15, 'z', 8);
    b.vcyl(M.enamel, 0.04, 0.09, x + 0.35, tY, z + s * 0.2, 10);
    b.vcyl(M.enamel, 0.11, 0.012, x + 0.05, tY, z - s * 0.23, 12);
    b.box(M.white, 0.06, 0.012, 0.09, x + 0.1, tY + 0.006, z + s * 0.07, 0.3);
    b.box(M.upRed, 0.17, 0.03, 0.24, x - 0.2, tY + 0.015, z + s * 0.19, -0.2);
  };
  // Spindreihe an einer Querwand (Türen zeigen nach −x bzw. +x)
  const lockers = (xw, dir, za, zb, n, H = 1.64) => {
    const [z0, z1] = mm(za, zb), x0 = dir < 0 ? xw - 0.45 : xw, x1 = dir < 0 ? xw : xw + 0.45, xf = dir < 0 ? x0 : x1, y = yMin(x0, x1);
    b.bb(M.aluDark, x0, x1, y, y + H + 0.06, z0, z1);
    const dz = (z1 - z0) / n;
    for (let k = 0; k < n; k++) {
      const a = z0 + k * dz + 0.015, c = z0 + (k + 1) * dz - 0.015;
      b.bb(M.alu, xf + dir * 0.0, xf + dir * 0.015, y + 0.06, y + H, a, c);
      b.bb(M.black, xf + dir * 0.015, xf + dir * 0.021, y + H - 0.19, y + H - 0.09, a + 0.06, c - 0.06);
      b.bb(M.white, xf + dir * 0.015, xf + dir * 0.021, y + H - 0.36, y + H - 0.3, a + 0.1, c - 0.1);
      b.box(M.brass, 0.025, 0.1, 0.02, xf + dir * 0.03, y + 1.0, c - 0.05);
    }
    nav.block(x0, x1, z0, z1, y - 0.1, y + 2);
  };
  const hooks = (xw, dir, zs, s) => {
    const y = ky(xw);
    for (const hz of zs) b.cyl(M.brass, V(xw + dir * 0.02, y + 1.65, s * hz), V(xw + dir * 0.1, y + 1.68, s * hz), 0.008, 4);
    for (const [hz, mt] of [[zs[1], M.upBlue], [zs[3], M.leather]]) { b.box(mt, 0.07, 0.75, 0.36, xw + dir * 0.065, y + 1.25, s * hz); b.box(mt, 0.08, 0.06, 0.2, xw + dir * 0.07, y + 1.62, s * hz); }
  };

  // ===================== Mannschaftsräume Bucht 5 (beide Seiten) =====================
  for (const id of ['crew5b', 'crew5s']) {
    const r = roomById(id), s = r.s, x0 = r.x0, Z = (a, c) => mm(s * a, s * c);
    table(C, x0 + 1.5, ky(x0 + 1.5), s * 1.65, 1.0, 0.7, M.woodLight, 0.74, true);
    tableware(x0 + 1.5, s * 1.65, s);
    stool(x0 + 1.5, s * 1.05); stool(x0 + 2.38, s * 1.65);
    lockers(r.x1 - 0.15, -1, s * 0.8, s * 2.0, 3);
    b.box(M.leather, 0.4, 0.18, 0.6, r.x1 - 0.38, ky(r.x1) + 1.79, s * 1.4);
    // Spind an der Innenwand
    { const xa = x0 + 4.6, xb = x0 + 5.6, y = yMin(xa, xb);
      b.bb(M.aluDark, xa, xb, y, y + 1.6, ...Z(0.68, 1.06));
      for (const [a, c, hx] of [[xa + 0.02, xa + 0.49, xa + 0.44], [xa + 0.51, xb - 0.02, xa + 0.56]]) {
        b.bb(M.alu, a, c, y + 0.05, y + 1.55, ...Z(1.06, 1.075));
        b.bb(M.black, a + 0.08, c - 0.08, y + 1.35, y + 1.45, ...Z(1.075, 1.081));
        b.box(M.brass, 0.02, 0.1, 0.025, hx, y + 1.0, s * 1.09);
      }
      nav.block(xa, xb, ...Z(0.66, 1.1), y - 0.1, y + 2); }
    hooks(x0, 1, [0.95, 1.25, 1.55, 1.85, 2.15], s);
    for (const dz of [-0.07, 0.07]) b.box(M.black, 0.26, 0.12, 0.1, x0 + 1.0, ky(x0 + 1) + 0.06, s * (2.95 + dz));
    b.box(M.leather, 0.55, 0.16, 0.38, x0 + 6.7, ky(x0 + 6.7) + 0.08, s * 3.0);
    b.box(M.upGreen, 0.15, 0.03, 0.2, x0 + 3.0, ky(x0 + 3) + 1.345, s * 3.0, 0.3);
  }
  // Wachplan am Eingang Bucht 5 Backbord
  panel('wachplan', (g, w, h) => {
    g.fillStyle = '#eee5cc'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2520'; g.font = 'bold 13px Georgia'; g.textAlign = 'center'; g.fillText('Wacheinteilung', 64, 16);
    g.font = '9px Georgia'; g.textAlign = 'left';
    for (let i = 0; i < 9; i++) { g.fillRect(8, 26 + i * 11, 112, 0.6); g.fillText(['00–04', '04–08', '08–12', '12–16', '16–20', '20–24'][i % 6], 10, 34 + i * 11); g.fillText(['1. Wache', '2. Wache', '3. Wache'][i % 3], 60, 34 + i * 11); }
  }, 64.0, ky(64.0) + 1.45, -0.63, 0.42, 0.55, 'z+');

  // ===================== Mannschaftsraum Bucht 11 (Backbord) =====================
  { const r = roomById('crew11');
    for (const xt of [159.9, 166.0]) {
      table(C, xt, ky(xt), -2.85, 1.4, 0.75, M.woodLight, 0.74, true);
      tableware(xt, -2.85, -1);
      for (const zb of [-3.65, -2.05]) { // Bänke
        const y = ky(xt);
        b.bb(M.woodDark, xt - 0.6, xt + 0.6, y + 0.42, y + 0.46, zb - 0.14, zb + 0.14);
        for (const dx of [-0.5, 0.5]) b.bb(M.woodDark, xt + dx - 0.02, xt + dx + 0.02, y, y + 0.42, zb - 0.12, zb + 0.12);
      }
    }
    lockers(r.x1 - 0.05, -1, -1.6, -4.1, 6);
    hooks(r.x0, 1, [1.75, 2.15, 2.55, 2.95, 3.35], -1);
    for (const [x, z] of [[158.0, -2.0], [164.6, -3.9], [168.3, -1.85]]) b.box(M.leather, 0.55, 0.16, 0.38, x, ky(x) + 0.08, z, 0.2);
    for (const x of [161.0, 167.0]) for (const dz of [-0.07, 0.07]) b.box(M.black, 0.26, 0.12, 0.1, x, ky(x) + 0.06, -3.95 + dz);
    b.box(M.paper, 0.22, 0.02, 0.3, 166.2, ky(166.2) + 0.765, -2.7, 0.4);
  }

  // ===================== Offiziersraum Bucht 14 (Backbord) =====================
  { const r = roomById('off14'), xt = 216.4, yt = ky(xt);
    table(C, xt, yt, -2.1, 0.9, 0.9, M.woodLight, 0.74, true);
    b.box(M.white, 0.6, 0.004, 0.6, xt, yt + 0.762, -2.1);
    chair(C, xt, ky(xt), -1.45, Math.PI, M.upGreen); chair(C, xt, ky(xt), -2.8, 0, M.upGreen);
    b.vcyl(M.enamel, 0.04, 0.09, xt - 0.15, yt + 0.765, -2.0, 10); b.box(M.paper, 0.3, 0.01, 0.22, xt + 0.1, yt + 0.77, -2.25, 0.2);
    lockers(r.x1 - 0.05, -1, -0.8, -3.3, 5);
    hooks(r.x0, 1, [0.95, 1.25, 1.55, 1.85, 2.15], -1);
    // Wandbord mit Büchern und Seekartenrollen über der Tür-Innenseite
    b.bb(M.woodDark, 212.0, 213.4, ky(212.7) + 1.55, ky(212.7) + 1.58, -0.95, -0.68);
    for (let k = 0; k < 9; k++) b.box([M.upRed, M.upBlue, M.upGreen, M.leather][k % 4], 0.04, 0.22 + (k % 3) * 0.03, 0.18, 212.1 + k * 0.06, ky(212.7) + 1.69, -0.8);
    for (let k = 0; k < 3; k++) b.cyl(M.paper, V(212.75 + k * 0.18, ky(212.7) + 1.63, -0.7), V(212.75 + k * 0.18, ky(212.7) + 1.63, -0.93), 0.04, 8);
  }

  // ===================== Kapitänskajüte (Steuerbord) =====================
  { const r = roomById('kapitaen'), dx0 = 212.55, dx1 = 213.65, y = ky(213.1);
    // Schreibplatte mit Schubladen
    b.bb(M.woodDark, dx0, dx1, y + 0.71, y + 0.75, 2.4, 3.12);
    b.bb(M.wood, dx0 + 0.02, dx0 + 0.4, y, y + 0.71, 2.45, 3.1);
    for (let k = 0; k < 3; k++) { b.bb(M.woodDark, dx0 + 0.04, dx0 + 0.38, y + 0.08 + k * 0.21, y + 0.25 + k * 0.21, 2.43, 2.45); b.box(M.brass, 0.08, 0.015, 0.015, dx0 + 0.21, y + 0.17 + k * 0.21, 2.42); }
    b.bb(M.wood, dx1 - 0.04, dx1, y, y + 0.71, 2.45, 3.1);
    nav.block(dx0, dx1, 2.38, 3.15, y - 0.1, y + 1.5);
    chair(C, 213.1, ky(213.1), 1.95, 0, M.leather, true);
    b.box(M.paper, 0.3, 0.004, 0.22, 213.0, y + 0.752, 2.75, 0.1); b.box(M.leather, 0.26, 0.04, 0.2, 213.4, y + 0.77, 2.9);
    b.vcyl(M.brass, 0.06, 0.02, 212.75, y + 0.75, 2.95, 10); b.cyl(M.brass, V(212.75, y + 0.77, 2.95), V(212.8, y + 1.1, 2.9), 0.008, 5); b.cyl(X.green, V(212.8, y + 1.1, 2.9), V(212.9, y + 1.15, 2.85), 0.08, 10, 0.03);
    panel('seekarte', (g, w, h) => {
      g.fillStyle = '#e8dfc2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8aa0a8'; g.lineWidth = 0.6;
      for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); }
      g.fillStyle = '#b9a878'; g.beginPath(); g.moveTo(0, 30); g.lineTo(22, 40); g.lineTo(28, 70); g.lineTo(0, 90); g.fill();
      g.beginPath(); g.moveTo(128, 20); g.lineTo(100, 34); g.lineTo(96, 60); g.lineTo(110, 80); g.lineTo(128, 86); g.fill();
      g.strokeStyle = '#a3261c'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(104, 50); g.quadraticCurveTo(64, 20, 22, 56); g.stroke();
      g.fillStyle = '#2a2520'; g.font = 'bold 9px Georgia'; g.textAlign = 'center'; g.fillText('Nordatlantik', 64, 112);
    }, 213.1, y + 1.5, 3.17, 1.0, 0.7, 'z-');
    // Spind, Waschtisch, Bild
    lockers(r.x1 - 0.05, -1, 0.8, 1.6, 2, 1.7);
    { const wx = 212.8, wy = ky(wx);
      b.bb(M.woodLight, 212.55, 213.05, wy, wy + 0.78, 0.78, 1.28); b.bb(M.enamel, 212.57, 213.03, wy + 0.78, wy + 0.82, 0.8, 1.26);
      b.vcyl(M.white, 0.14, 0.06, wx, wy + 0.8, 1.03, 14, 0.17); b.cyl(M.brass, V(212.6, wy + 0.92, 1.03), V(212.7, wy + 0.92, 1.03), 0.01, 5);
      b.bb(M.glassClear, 212.42, 212.43, wy + 1.15, wy + 1.6, 0.82, 1.24);
      nav.block(212.5, 213.1, 0.75, 1.3, wy - 0.1, wy + 1.5); }
    b.box(M.upBlue, 0.5, 0.1, 0.6, 216.4, ky(216.4) + 0.6, 2.8);
  }

  // ===================== Elektrozentrale (Steuerbord) =====================
  { const r = roomById('elektro'), zc = 2.35, zf = 3.42;
    const gen = (xc, seed) => {
      const yE = ky(xc), ex = -0.9, zw = r.zo + 0.06 - zc;
      b.shadow(M.shadow, xc, yE, zc, 2.3, 1.0);
      b.bb(M.steel, xc - 1.0, xc + 0.98, yE - 0.12, yE, zc - 0.36, zc + 0.36); // Fundament
      b.at(xc, yE, zc, 0, () => {
        for (const sz of [-1, 1]) b.bb(M.steel, -1.0, 0.98, 0, 0.08, sz * 0.3 - 0.04, sz * 0.3 + 0.04);
        b.bb(X.engine, -0.9, 0.12, 0.08, 0.6, -0.24, 0.24);
        b.bb(X.engine, -0.86, 0.08, 0.08, 0.3, -0.29, 0.29);
        for (let k = 0; k < 4; k++) {
          const cx = -0.76 + k * 0.24;
          b.bb(X.engine, cx - 0.1, cx + 0.1, 0.6, 0.7, -0.17, 0.17);
          b.bb(M.aluDark, cx - 0.09, cx + 0.09, 0.7, 0.76, -0.14, 0.14);
          b.cyl(M.steel, V(cx, 0.65, 0.17), V(cx, 0.65, 0.27), 0.03, 6);
          b.cyl(M.brass, V(cx, 0.7, -0.17), V(cx, 0.52, -0.3), 0.008, 4);
        }
        b.box(M.aluDark, 0.5, 0.14, 0.1, -0.4, 0.45, -0.33);
        b.cyl(M.steel, V(-0.9, 0.65, 0.29), V(0.05, 0.65, 0.29), 0.045, 8);
        b.sph(M.steel, 0.05, ex, 0.65, 0.29, 1, 1, 1, 6);
        b.cyl(M.steel, V(ex, 0.65, 0.29), V(ex, 1.5, 0.29), 0.05, 8);
        b.cyl(M.steel, V(ex, 0.95, 0.29), V(ex, 1.3, 0.29), 0.1, 10);
        b.sph(M.steel, 0.055, ex, 1.5, 0.29, 1, 1, 1, 6);
        b.cyl(M.steel, V(ex, 1.5, 0.29), V(ex, 1.5, zw), 0.05, 8);
        b.cyl(M.aluDark, V(ex, 1.5, zw - 0.12), V(ex, 1.5, zw - 0.06), 0.09, 10);
        b.cyl(M.steel, V(0.12, 0.4, 0), V(0.22, 0.4, 0), 0.3, 18);
        b.cyl(M.steel, V(0.22, 0.4, 0), V(0.3, 0.4, 0), 0.08, 8);
        b.cyl(X.gen, V(0.3, 0.4, 0), V(0.88, 0.4, 0), 0.27, 16);
        for (const fx of [0.38, 0.5, 0.62, 0.74]) b.torus(X.gen, 0.272, 0.012, fx, 0.4, 0, 'x', 16);
        b.cyl(M.aluDark, V(0.88, 0.4, 0), V(0.95, 0.4, 0), 0.2, 14);
        b.bb(M.steel, 0.36, 0.84, 0.08, 0.14, -0.22, 0.22);
        b.box(M.black, 0.22, 0.12, 0.16, 0.6, 0.72, 0);
        b.bb(M.black, -1.0, -0.92, 0.1, 0.8, -0.28, 0.28);
        b.bb(M.aluDark, -1.02, -1.0, 0.14, 0.76, -0.25, 0.25);
        b.cyl(M.brass, V(-0.05, 0.45, -0.24), V(-0.05, 0.45, -0.252), 0.05, 10);
      });
      gauge(xc - 0.05, yE + 0.45, zc - 0.258, 0.08, 'z-', 'Öldruck', seed);
      b.cyl(X.cable, V(xc + 0.6, yE + 0.78, zc), V(xc + 0.6, yE + 1.97, zc), 0.02, 5);
      b.cyl(X.cable, V(xc + 0.6, yE + 1.97, zc), V(xc < 194.75 ? 194.4 : 195.1, ky(194.75) + 1.97, zf + 0.02), 0.02, 5);
      nav.block(xc - 1.02, xc + 1.0, zc - 0.36, zc + 0.36, yE - 0.1, yE + 1.6);
    };
    gen(193.3, 3); gen(196.3, 4);
    // Schalttafel an der Außenwand
    const yE = ky(194.75), x0 = 194.3, x1 = 195.2;
    b.bb(X.slate, x0, x1, yE + 0.15, yE + 1.9, zf, zf + 0.04);
    for (const xp of [x0, x1]) b.bb(M.aluDark, xp - 0.03, xp + 0.03, yE, yE + 1.95, zf - 0.01, zf + 0.07);
    b.bb(M.aluDark, x0 - 0.03, x1 + 0.03, yE + 1.9, yE + 1.95, zf - 0.01, zf + 0.07);
    sign('Vorsicht! 220 Volt', 194.75, yE + 1.82, zf - 0.006, 0.06, 'z-', 'red');
    for (let c = 0; c < 2; c++) {
      const xc = 194.52 + c * 0.46;
      for (const [lab, dy] of [['Volt', 1.65], ['Ampere', 1.44], ['kW', 1.23]]) {
        b.cyl(M.black, V(xc, yE + dy, zf), V(xc, yE + dy, zf - 0.02), 0.085, 14);
        gauge(xc, yE + dy, zf - 0.026, 0.15, 'z-', lab, c + 1);
      }
      for (const dx of [-0.11, 0.11]) { // Messerschalter
        const xs = xc + dx, opn = (c === 1 && dx > 0);
        b.box(X.porcelain, 0.1, 0.16, 0.025, xs, yE + 0.95, zf - 0.012);
        if (opn) continue; // dieses Messer (Kielgangbeleuchtung) ist beweglich: feature_interact.js
        const tip = V(xs, yE + 1.02, zf - 0.04);
        b.beam(X.copper, V(xs, yE + 0.88, zf - 0.03), tip, 0.012, 0.03);
        b.sph(M.black, 0.018, tip.x, tip.y, tip.z, 1, 1, 1, 6);
      }
    }
    for (let k = 0; k < 6; k++) b.cyl(X.porcelain, V(194.42 + k * 0.13, yE + 0.72, zf), V(194.42 + k * 0.13, yE + 0.72, zf - 0.05), 0.02, 8);
    panel('schaltbild', (g, w, h) => {
      g.fillStyle = '#2b2e2c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a25a'; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 40); g.lineTo(118, 40); g.stroke();
      g.lineWidth = 3;
      for (const [cx, t] of [[32, 'G1'], [96, 'G2']]) {
        g.beginPath(); g.moveTo(cx, 40); g.lineTo(cx, 78); g.stroke();
        g.beginPath(); g.arc(cx, 94, 16, 0, 7); g.stroke();
        g.fillStyle = '#e9e2cc'; g.font = 'bold 14px Arial'; g.textAlign = 'center'; g.fillText(t, cx, 99);
      }
      g.beginPath(); g.moveTo(64, 40); g.lineTo(64, 14); g.stroke();
      g.fillStyle = '#e9e2cc'; g.font = '11px Arial'; g.textAlign = 'center'; g.fillText('220 V · 24 V', 64, 12);
      g.fillStyle = '#a3261c'; g.fillRect(56, 54, 16, 10);
    }, 194.75, yE + 0.42, zf - 0.006, 0.8, 0.4, 'z-');
    b.cyl(M.alu, V(x0, yE + 1.97, zf + 0.03), V(x0, yE + 1.97, zf - 0.3), 0.012, 5);
    shadeLamp(x0, yE + 1.86, zf - 0.3);
    nav.block(x0 - 0.05, x1 + 0.05, zf - 0.08, zf + 0.08, yE - 0.1, yE + 2);
    // Mutterkompass der Kreiselanlage (achtern, innen)
    { const x = 192.45, y = ky(x);
      b.bb(M.aluDark, 192.15, 192.75, y, y + 0.7, 0.8, 1.35); b.vcyl(M.brass, 0.25, 0.25, x, y + 0.7, 1.075, 16);
      b.sph(M.glassClear, 0.22, x, y + 0.95, 1.075, 1, 0.5, 1, 14); b.vcyl(M.black, 0.18, 0.02, x, y + 0.93, 1.075, 14);
      sign('Mutterkompass', x, y + 0.45, 1.36, 0.06, 'z+', 'brass');
      b.cyl(X.cable, V(x, y + 0.6, 0.8), V(x, ky(x) + ROOM_H - 0.02, 0.8), 0.012, 4);
      nav.block(192.1, 192.8, 0.75, 1.4, y - 0.1, y + 1.2); }
    // Scheinwerfer über der Bodenluke (vorn, innen)
    { const x = 197.22, y = ky(x);
      b.bb(M.aluDark, 196.85, 197.6, y + 0.002, y + 0.02, 0.78, 0.84); b.bb(M.aluDark, 196.85, 197.6, y + 0.002, y + 0.02, 1.44, 1.5);
      for (const xe of [196.85, 197.6]) b.bb(M.aluDark, xe - 0.03, xe + 0.03, y + 0.002, y + 0.02, 0.78, 1.5);
      b.bb(M.black, 196.88, 197.57, y + 0.001, y + 0.006, 0.84, 1.44);
      for (const zz of [0.86, 1.42]) b.vcyl(M.steel, 0.025, 1.2, 197.22, y, zz, 6);
      b.cyl(M.steel, V(197.22, y + 1.2, 0.86), V(197.22, y + 1.2, 1.42), 0.025, 6);
      b.cyl(M.aluDark, V(197.22, y + 0.95, 1.14), V(197.22, y + 0.45, 1.14), 0.26, 16, 0.3);
      b.cyl(M.lamp, V(197.22, y + 0.45, 1.14), V(197.22, y + 0.44, 1.14), 0.27, 16);
      nav.block(196.85, 197.6, 0.78, 1.5, y - 0.1, y + 1.5); }
    // Tagestank, Feuerlöscher, Luftschleuse
    { const x = 197.45, y = ky(x);
      b.vcyl(M.tank, 0.2, 0.7, x, y + 0.3, 3.15, 12);
      for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) b.vcyl(M.alu, 0.015, 0.3, x + dx, y, 3.15 + dz, 4);
      sign('Dieselöl', x, y + 0.75, 3.15 - 0.208, 0.05, 'z-', 'plate'); }
    { const y = ky(192.2); b.vcyl(M.red, 0.1, 0.75, 192.2, y, 3.25, 12); b.sph(M.red, 0.1, 192.2, y + 0.75, 3.25, 1, 0.5, 1, 10); b.vcyl(M.brass, 0.03, 0.12, 192.2, y + 0.78, 3.25, 8); }
    sign('Luftschleuse – Tür geschlossen halten!', 194.8, ky(194.8) + 1.6, 0.62, 0.05, 'z-', 'red');
    for (const zz of [0.9, 1.1]) b.bb(M.aluDark, 194.38, 195.22, ky(194.8) + 1.95, ky(194.8) + 2.08, zz - 0.01, zz + 0.01); // zweiter Türrahmen der Schleuse
    for (const xe of [194.38, 195.22]) b.cyl(M.aluDark, V(xe, ky(xe), 1.0), V(xe, ky(xe) + 2.08, 1.0), 0.025, 6);
    b.vcyl(M.red, 0.07, 0.22, 196.3, ky(196.3), 1.85, 10); b.cyl(M.red, V(196.3, ky(196.3) + 0.2, 1.85), V(196.42, ky(196.3) + 0.32, 1.85), 0.012, 5); // Ölkanne
  }

  // ===================== Postraum (Backbord) =====================
  { const r = roomById('post'), yP = ky(193.4), x0 = 192.6, x1 = 194.1, zA = -2.85, zB = -3.25, H = 1.7;
    b.shadow(M.shadow, 193.35, yP, -3.05, 1.8, 0.6);
    b.bb(M.woodLight, x0, x1, yP, yP + H, zB, zB + 0.03);
    for (const x of [x0, x1]) b.bb(M.woodLight, x - 0.02, x + 0.02, yP, yP + H, zB, zA);
    b.bb(M.woodLight, x0, x1, yP + H - 0.03, yP + H, zB, zA);
    for (let r2 = 0; r2 < 5; r2++) b.bb(M.woodLight, x0, x1, yP + 0.5 + r2 * 0.24, yP + 0.515 + r2 * 0.24, zB + 0.03, zA);
    for (let c = 1; c < 6; c++) { const x = x0 + c * (x1 - x0) / 6; b.bb(M.woodLight, x - 0.008, x + 0.008, yP + 0.5, yP + H - 0.03, zB + 0.03, zA); }
    const rp = rng(77);
    for (let r2 = 0; r2 < 5; r2++) for (let c = 0; c < 6; c++) {
      if (rp() < 0.3) continue;
      const cx = x0 + (c + 0.5) * (x1 - x0) / 6, n = 1 + Math.floor(rp() * 3), yb = yP + 0.515 + r2 * 0.24;
      for (let k = 0; k < n; k++) b.box(rp() < 0.7 ? M.paper : M.white, 0.035, 0.11 + rp() * 0.06, 0.2, cx - 0.06 + k * 0.045, yb + 0.07, -3.05, (rp() - 0.5) * 0.1);
    }
    for (const [xa, xb] of [[x0 + 0.02, (x0 + x1) / 2 - 0.005], [(x0 + x1) / 2 + 0.005, x1 - 0.02]]) {
      b.bb(M.wood, xa, xb, yP + 0.03, yP + 0.47, zA, zA + 0.015);
      b.box(M.brass, 0.02, 0.06, 0.02, xa < 193.3 ? xb - 0.05 : xa + 0.05, yP + 0.3, zA + 0.025);
    }
    b.bb(M.woodDark, 192.85, 193.85, yP + H, yP + H + 0.16, zB + 0.01, zB + 0.04);
    sign('Deutsche Reichspost', 193.35, yP + 0.38, zA + 0.02, 0.06, 'z+', 'dark');
    sign('Luftpost', 193.35, yP + H + 0.08, zB + 0.046, 0.1, 'z+', 'brass');
    nav.block(x0 - 0.03, x1 + 0.03, zB, zA + 0.05, yP - 0.1, yP + 2);
    // Sortiertisch
    table(C, 193.4, ky(193.4), -1.65, 1.2, 0.6, M.woodLight, 0.8, true);
    const tY = ky(193.4) + 0.8175;
    for (let k = 0; k < 5; k++) b.box(k % 2 ? M.paper : M.white, 0.16, 0.05 + 0.02 * k, 0.11, 192.95 + k * 0.17, tY + 0.025 + 0.01 * k, -1.55, 0.1 * k - 0.2);
    b.box(M.leather, 0.3, 0.04, 0.22, 193.7, tY + 0.02, -1.75); b.vcyl(M.woodDark, 0.02, 0.07, 193.95, tY, -1.5, 6); b.vcyl(M.black, 0.03, 0.015, 193.95, tY, -1.5, 8);
    b.cyl(M.brass, V(192.95, tY, -1.8), V(192.95, tY + 0.18, -1.8), 0.012, 5); b.cyl(X.green, V(192.95, tY + 0.18, -1.8), V(193.05, tY + 0.26, -1.8), 0.08, 10, 0.03);
    // Postsäcke im vorderen Teil
    const mailSack = (x, z, lean) => {
      const y = ky(x);
      b.sph(X.mail, 0.22, x, y + 0.42, z, 1, 1.9, 1, 10);
      b.cyl(M.rope, V(x, y + 0.78, z), V(x + lean, y + 0.92, z), 0.04, 6, 0.06);
      b.torus(M.rope, 0.045, 0.012, x, y + 0.8, z, 'y', 8);
      b.sph(M.brass, 0.015, x + 0.05, y + 0.78, z + 0.04, 1, 1, 1, 5);
    };
    mailSack(196.7, -1.3, 0.03); mailSack(197.25, -1.9, -0.04); mailSack(196.6, -2.5, 0.02); mailSack(197.3, -2.95, 0);
    b.sph(X.mail, 0.22, 196.0, ky(196) + 0.16, -2.95, 1.6, 0.7, 1.05, 10);
    sign('Luftpost', 196.7, ky(196.7) + 0.45, -1.3 + 0.226, 0.06, 'z+', 'red');
    sign('Luftpost', 196.6, ky(196.6) + 0.45, -2.5 + 0.226, 0.06, 'z+', 'red');
    nav.block(196.35, 197.6, -3.25, -1.05, ky(196.35) - 0.1, ky(197.6) + 1.5);
    nav.block(195.6, 196.4, -3.2, -2.7, ky(195.6) - 0.1, ky(196.4) + 1);
    b.vcyl(M.lamp, 0.07, 0.02, r.x0 + 0.6, ky(r.x0 + 0.6) + ROOM_H - 0.04, -2.2, 8);
  }

  // ===================== Plattformen: Lagerung, Bordwand =====================
  for (const p of PLATFORMS) {
    const s = p.s;
    for (const xj of [p.x0 + 0.12, (p.x0 + p.x1) / 2, p.x1 - 0.12]) {
      const y = ky(xj);
      b.bb(M.alu, xj - 0.03, xj + 0.03, y - 0.13, y - 0.06, ...mm(s * 0.62, s * p.zo));
      b.beam(M.alu, V(xj, y - 0.13, s * 1.9), V(xj, y - 0.57, s * 1.9), 0.04);
      b.beam(M.alu, V(xj, y - 0.13, s * (p.zo - 0.12)), V(xj, hy(xj, p.zo - 0.12) + 0.02, s * (p.zo - 0.12)), 0.04);
    }
    const xs = segs(p.x0, p.x1);
    for (let i = 0; i < xs.length - 1; i++) b.beam(M.woodDark, V(xs[i], ky(xs[i]) + 0.05, s * (p.zo - 0.015)), V(xs[i + 1], ky(xs[i + 1]) + 0.05, s * (p.zo - 0.015)), 0.03, 0.1);
    for (const x of [p.x0 + 0.05, p.x1 - 0.05]) b.vcyl(M.alu, 0.015, 1.0, x, ky(x), s * (p.zo - 0.03), 5);
    b.cyl(M.rope, V(p.x0 + 0.05, ky(p.x0) + 1.0, s * (p.zo - 0.03)), V(p.x1 - 0.05, ky(p.x1) + 1.0, s * (p.zo - 0.03)), 0.012, 4);
  }
  // Schild an der Geländerlücke
  for (const p of PLATFORMS) {
    const x = p.open[1] + 0.1, y = ky(x), z = p.s * 0.75;
    b.vcyl(M.alu, 0.015, 1.25, x, y, z, 5);
    b.box(M.woodDark, 0.5, 0.14, 0.02, x, y + 1.3, z);
    sign(p.id === 'werk' ? 'Werkstatt' : p.id === 'lager' ? 'Ersatzteillager' : p.id === 'fracht' ? 'Frachtraum' : 'Landetaue', x, y + 1.3, z - p.s * 0.016, 0.1, fz(p.s), 'plate');
  }

  // ---------- Seilstauräume: Landetaue in Buchten ----------
  for (const id of ['seilH', 'seilB']) {
    const p = roomById(id), s = p.s, n = id === 'seilB' ? 4 : 3;
    for (let k = 0; k < n; k++) {
      const x = p.x0 + 0.65 + k * 1.15, z = s * (p.zo - 0.7);
      ropeCoil(x, ky(x), z, 0.42, 6);
      b.vcyl(M.wood, 0.3, 0.1, x, ky(x), z, 12);
      nav.block(x - 0.48, x + 0.48, ...mm(z - 0.48, z + 0.48), ky(x) - 0.1, ky(x) + 1);
    }
    for (let k = 0; k < n; k++) { const x = p.x0 + 0.65 + k * 1.15; b.cyl(M.steel, V(x, ky(x) + 1.3, s * (p.zo - 0.05)), V(x, ky(x) + 1.3, s * (p.zo - 0.25)), 0.012, 5); b.torus(M.rope, 0.12, 0.02, x, ky(x) + 1.15, s * (p.zo - 0.25), 'x', 10); }
    if (id === 'seilB') for (const x of [229.4, 230.0]) { b.sph(M.canvas, 0.28, x, ky(x) + 0.2, s * 1.2, 1, 0.75, 1, 10); b.torus(M.rope, 0.08, 0.02, x, ky(x) + 0.4, s * 1.2, 'y', 8); }
  }

  // ---------- Frachtraum mit Automobil (Backbord) ----------
  { const yC = ky(148.0);
    b.shadow(M.shadow, 148.0, yC, -2.35, 4.2, 2.0);
    b.at(148.0, yC, -2.35, 0, () => {
      for (const wx of [-1.25, 1.25]) for (const wz of [-0.62, 0.62]) {
        b.cyl(M.rubber, V(wx, 0.33, wz - 0.1), V(wx, 0.33, wz + 0.1), 0.33, 14);
        b.box(M.woodDark, 0.12, 0.1, 0.18, wx + 0.4, 0.05, wz); b.box(M.woodDark, 0.12, 0.1, 0.18, wx - 0.4, 0.05, wz);
      }
      b.bb(M.black, -1.75, 1.75, 0.3, 0.42, -0.6, 0.6);
      b.bb(M.tarp, -1.85, 1.8, 0.25, 0.95, -0.79, 0.79);
      b.sph(M.tarp, 1, -0.3, 0.95, 0, 1.15, 0.5, 0.76, 16);
      b.sph(M.tarp, 1, 1.25, 0.95, 0, 0.6, 0.16, 0.72, 12);
      for (const [fx, fz2] of [[-1.2, 0.795], [0.4, 0.795], [-0.6, -0.795], [1.0, -0.795]]) b.box(M.tarp, 0.05, 0.6, 0.02, fx, 0.6, fz2);
      for (const sx of [-1.5, 1.5]) for (const sz of [-1, 1]) {
        b.cyl(M.rope, V(sx, 0.27, sz * 0.8), V(sx * 1.15, 0.03, sz * 0.95), 0.01, 4);
        b.torus(M.steel, 0.04, 0.008, sx * 1.15, 0.008, sz * 0.95, 'y', 8);
      }
      for (const sx of [-1.6, 1.72]) {
        b.box(X.strap, 0.06, 0.012, 1.6, sx, 0.962, 0);
        for (const sz of [-1, 1]) b.box(X.strap, 0.06, 0.71, 0.012, sx, 0.605, sz * 0.802);
      }
    });
    nav.block(146.1, 149.85, -3.2, -1.5, yC - 0.1, yC + 1.5);
    sign('Lakehurst N.J.', 148.8, yC + 0.65, -2.35 + 0.8, 0.08, 'z+', 'plate');
    sign('Eilgut', 147.0, yC + 0.65, -2.35 + 0.8, 0.07, 'z+', 'red');
  }
  // Kisten, Postsäcke unter dem Ladenetz, Dezimalwaage
  { const r = rng(33), lbls = ['Lakehurst N.J.', 'Eilgut', 'Luftpost'];
    for (let k = 0; k < 12; k++) {
      const w = 0.5 + r() * 0.5, h = 0.4 + r() * 0.5, x = 151.6 + r() * 3.9, z = -3.15 + r() * 0.95, d = w * (0.7 + r() * 0.4), ry = r() * 0.6 - 0.3;
      const yb = ky(x) + (k > 8 ? 0.75 : 0);
      b.at(x, yb, z, ry, () => {
        b.box(M.crate, w, h, d, 0, h / 2, 0);
        b.box(X.strap, w + 0.012, 0.008, 0.045, 0, h + 0.004, 0);
        for (const sx of [-1, 1]) b.box(X.strap, 0.008, h - 0.02, 0.045, sx * (w / 2 + 0.004), h / 2, 0);
        b.box(X.strap, 0.045, 0.016, d + 0.012, 0, h + 0.008, 0);
        for (const sz of [-1, 1]) b.box(X.strap, 0.045, h - 0.02, 0.008, 0, h / 2, sz * (d / 2 + 0.004));
        b.box(M.steel, 0.05, 0.06, 0.012, 0, h * 0.55, d / 2 + 0.012);
        if (k > 8) {
          b.box(M.woodDark, w + 0.04, 0.05, d + 0.04, 0, -0.025, 0);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.vcyl(M.alu, 0.02, 0.7, sx * (w / 2 - 0.04), -0.75, sz * (d / 2 - 0.04), 6);
        }
      });
      const lx = w * 0.25, lz = -d * 0.25, c = Math.cos(ry), sn = Math.sin(ry);
      sign(lbls[k % 3], x + c * lx + sn * lz, yb + h + 0.021, z - sn * lx + c * lz, 0.05, 'y+', 'plate');
    }
    nav.block(151.0, 156.1, -3.6, -1.6, ky(151) - 0.1, ky(156) + 2);
    const y = ky(152.6);
    for (let k = 0; k < 4; k++) b.sph(M.sack, 0.35, 151.6 + k * 0.65, y + 0.3, -1.1, 1.2, 0.8, 0.9, 8);
    const netMat = new THREE.LineBasicMaterial({ color: 0x5e4e32 }), np = [];
    const Hn = (x, z) => { let h = 0.012; for (let k = 0; k < 4; k++) { const u = (x - (151.6 + k * 0.65)) / 0.44, v = (z + 1.1) / 0.335, q = 1 - u * u - v * v; if (q > 0) h = Math.max(h, 0.3 + 0.3 * Math.sqrt(q)); } return y + h; };
    const NX = 30, NZ = 9, nx0 = 151.05, nz0 = -1.52, dn = 0.1;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
      const xa = nx0 + i * dn, za = nz0 + j * dn;
      if (i < NX - 1) np.push(xa, Hn(xa, za), za, xa + dn, Hn(xa + dn, za), za);
      if (j < NZ - 1) np.push(xa, Hn(xa, za), za, xa, Hn(xa, za + dn), za + dn);
    }
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(np, 3)); root.add(new THREE.LineSegments(g, netMat)); }
    for (const [x, z] of [[151.05, -1.52], [153.95, -1.52], [151.05, -0.72], [153.95, -0.72]]) b.torus(M.steel, 0.035, 0.008, x, ky(x) + 0.008, z, 'y', 8);
    nav.block(151.0, 154.0, -1.55, -0.7, y - 0.1, y + 0.7);
    const wx = 155.4, wz = -1.1, wy = ky(wx);
    b.shadow(M.shadow, wx, wy, wz, 0.8, 0.7);
    b.box(M.steel, 0.55, 0.08, 0.45, wx, wy + 0.04, wz);
    b.box(M.aluDark, 0.5, 0.015, 0.4, wx, wy + 0.0875, wz);
    b.box(M.aluDark, 0.08, 1.0, 0.08, wx, wy + 0.58, wz - 0.26);
    b.cyl(M.enamel, V(wx, wy + 1.2, wz - 0.25), V(wx, wy + 1.2, wz - 0.21), 0.14, 16);
    b.torus(M.brass, 0.14, 0.012, wx, wy + 1.2, wz - 0.21, 'z', 18);
    gauge(wx, wy + 1.2, wz - 0.204, 0.24, 'z+', 'kg', 5, '#f4f0e2');
    b.cyl(M.steel, V(wx - 0.2, wy + 0.95, wz - 0.26), V(wx + 0.2, wy + 0.95, wz - 0.26), 0.012, 6);
    b.sph(M.sack, 0.2, wx, wy + 0.255, wz, 1.1, 0.8, 0.9, 10);
    nav.block(wx - 0.3, wx + 0.3, wz - 0.32, wz + 0.25, wy - 0.1, wy + 1.4);
  }

  // ---------- Werkstatt (Steuerbord) ----------
  { const yW = ky(147.6), top = yW + 0.86;
    b.shadow(M.shadow, 147.6, yW, 2.85, 2.3, 0.9);
    b.bb(M.woodDark, 146.65, 148.55, top - 0.06, top, 2.55, 3.15);
    for (const x of [146.7, 148.5]) for (const z of [2.6, 3.1]) b.bb(M.wood, x - 0.03, x + 0.03, yW, top - 0.06, z - 0.03, z + 0.03);
    b.bb(M.woodLight, 146.7, 148.5, yW + 0.18, yW + 0.21, 2.6, 3.1);
    for (const [xa, xb] of [[146.75, 147.55], [147.65, 148.45]]) { b.bb(M.wood, xa, xb, top - 0.24, top - 0.07, 2.545, 2.555); b.box(M.brass, 0.1, 0.02, 0.02, (xa + xb) / 2, top - 0.15, 2.535); }
    // Schraubstock
    b.box(M.steel, 0.14, 0.1, 0.2, 148.3, top + 0.05, 2.66);
    b.box(X.green, 0.16, 0.08, 0.04, 148.3, top + 0.14, 2.57); b.box(X.green, 0.16, 0.08, 0.04, 148.3, top + 0.14, 2.66);
    b.cyl(M.steel, V(148.3, top + 0.12, 2.55), V(148.3, top + 0.12, 2.45), 0.012, 6);
    b.cyl(M.steel, V(148.22, top + 0.12, 2.45), V(148.38, top + 0.12, 2.45), 0.008, 4);
    // Schleifbock
    b.cyl(X.green, V(146.9, top + 0.14, 2.95), V(147.2, top + 0.14, 2.95), 0.08, 12);
    for (const x of [146.85, 147.25]) b.cyl(X.stone, V(x - 0.015, top + 0.14, 2.95), V(x + 0.015, top + 0.14, 2.95), 0.1, 14);
    b.box(X.green, 0.12, 0.06, 0.14, 147.05, top + 0.03, 2.95);
    // Werkzeug auf der Bank
    b.cyl(M.woodLight, V(147.55, top + 0.015, 2.7), V(147.85, top + 0.015, 2.75), 0.013, 6); b.box(M.steel, 0.04, 0.03, 0.11, 147.87, top + 0.018, 2.75);
    b.box(M.steel, 0.22, 0.008, 0.03, 147.5, top + 0.004, 2.9, -0.4); b.box(M.steel, 0.18, 0.008, 0.025, 147.7, top + 0.004, 3.0, 0.2);
    b.vcyl(M.red, 0.05, 0.12, 148.0, top, 3.0, 10); b.cyl(M.red, V(148.0, top + 0.1, 3.0), V(148.0, top + 0.2, 2.88), 0.007, 4, 0.003);
    // Werkzeugwand
    for (const x of [146.7, 148.5]) b.bb(M.aluDark, x - 0.025, x + 0.025, yW, yW + 2.0, 3.2, 3.25);
    b.bb(M.woodLight, 146.7, 148.5, yW + 0.95, yW + 1.95, 3.2, 3.22);
    panel('werkzeugwand', (g, w, h) => {
      g.fillStyle = '#c9a26b'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(40,30,20,0.25)'; for (let i = 0; i < 6; i++) g.fillRect(0, i * 22, w, 1);
      g.fillStyle = '#2a2520';
      g.fillRect(10, 20, 6, 50); g.fillRect(4, 14, 18, 10);
      for (let i = 0; i < 5; i++) { g.fillRect(32 + i * 12, 18, 4, 40 + i * 5); g.beginPath(); g.arc(34 + i * 12, 16, 5, 0, 7); g.fill(); }
      g.fillRect(98, 16, 22, 4); g.beginPath(); g.moveTo(98, 20); g.lineTo(120, 20); g.lineTo(120, 70); g.lineTo(104, 70); g.fill();
      g.fillRect(14, 86, 40, 5); g.fillRect(60, 84, 5, 34); g.fillRect(78, 84, 5, 34); g.fillRect(96, 84, 20, 22);
    }, 147.6, yW + 1.45, 3.195, 1.7, 0.95, 'z-');
    for (const x of [146.95, 147.45, 148.05]) { b.cyl(M.steel, V(x, yW + 1.6, 3.2), V(x, yW + 1.6, 3.12), 0.006, 4); b.box(M.steel, 0.025, 0.24, 0.01, x, yW + 1.48, 3.12); }
    b.bb(M.woodDark, 147.15, 148.05, yW + 1.95, yW + 2.1, 3.2, 3.22);
    sign('Werkstatt', 147.6, yW + 2.025, 3.195, 0.1, 'z-', 'brass');
    b.cyl(M.alu, V(147.6, yW + 2.05, 3.2), V(147.6, yW + 2.05, 2.85), 0.012, 5);
    shadeLamp(147.6, yW + 1.93, 2.85);
    nav.block(146.6, 148.6, 2.5, 3.3, yW - 0.1, yW + 2);
    // Ölfass, Hocker, Werkzeugkasten
    { const y = ky(148.7); b.vcyl(M.steel, 0.25, 0.85, 148.7, y, 1.95, 14); for (const h of [0.25, 0.6]) b.torus(M.steel, 0.252, 0.012, 148.7, y + h, 1.95, 'y', 16); nav.block(148.43, 148.97, 1.68, 2.22, y - 0.1, y + 1); }
    stool(147.55, 2.1);
    toolbox(146.9, ky(146.9), 1.2, X.green);
  }

  // ---------- Ersatzteillager (Steuerbord, vor dem Funkraum) ----------
  { const p = roomById('lager');
    for (const [xa, xb] of [[208.5, 210.1], [210.2, 211.7]]) {
      const y = yMin(xa, xb), z0 = 2.45, z1 = 3.0;
      for (const x of [xa, xb]) for (const z of [z0, z1]) b.bb(M.aluDark, x - 0.02, x + 0.02, y, y + 1.9, z - 0.02, z + 0.02);
      for (let k = 0; k < 4; k++) b.bb(M.woodLight, xa, xb, y + 0.1 + k * 0.55, y + 0.13 + k * 0.55, z0, z1);
      const rr = rng(Math.round(xa * 10));
      for (let k = 0; k < 4; k++) for (let q = 0; q < 3; q++) {
        if (rr() < 0.2) continue;
        const cx = xa + 0.28 + q * 0.52, yb = y + 0.13 + k * 0.55, t = rr();
        if (t < 0.4) b.box(M.crate, 0.4, 0.25 + rr() * 0.12, 0.4, cx, yb + 0.15, 2.72, rr() * 0.2);
        else if (t < 0.7) { b.vcyl(M.steel, 0.09, 0.24, cx - 0.1, yb, 2.72, 10); b.vcyl(M.red, 0.07, 0.2, cx + 0.12, yb, 2.75, 10); }
        else { b.torus(M.aluDark, 0.12, 0.03, cx, yb + 0.03, 2.72, 'y', 12); b.box(M.paper, 0.25, 0.08, 0.2, cx, yb + 0.1, 2.72); }
      }
      nav.block(xa - 0.03, xb + 0.03, z0 - 0.03, z1 + 0.03, y - 0.1, y + 2);
    }
    for (let k = 0; k < 3; k++) b.cyl(M.canvas, V(208.4 + k * 0.08, ky(208.4) + 0.1, 1.5 + k * 0.32), V(208.4 + k * 0.08, ky(208.4) + 0.1, 1.75 + k * 0.32), 0.1, 10); // Stoffballen (Hüllenflicken)
    spares(209.2, ky(209.2), 1.2); toolbox(209.9, ky(209.9), 1.25, M.red);
    b.vcyl(M.lamp, 0.07, 0.02, (p.x0 + p.x1) / 2, ky((p.x0 + p.x1) / 2) + 2.3, 2.0, 8);
  }

  // ===================== Axialgang =====================
  const AY = AXIAL.y, A0 = AXIAL.x0, A1 = AXIAL.x1, FX = ST.filter((x) => x > A0 + 0.3 && x < A1 - 0.3);
  for (const s of [-1, 1]) for (const z of [0.74, 0.8]) b.cyl(M.steel, V(A0, -0.94, s * z), V(A1, -0.94, s * z), 0.005, 4);
  FX.forEach((x, i) => {
    if (!isMain(x)) { // Lampe unter dem Firstträger
      b.cyl(M.steel, V(x + 0.3, 1.275, 0), V(x + 0.3, 1.15, 0), 0.005, 4);
      b.cyl(M.aluDark, V(x + 0.3, 1.07, 0), V(x + 0.3, 1.15, 0), 0.08, 10, 0.03);
      b.sph(M.lamp, 0.035, x + 0.3, 1.07, 0, 1, 1, 1, 8);
    }
    if (i % 2 === 0) for (const s of [-1, 1]) { // Umlenkrollen der Steuerseilzüge
      for (const z of [0.74, 0.8]) b.cyl(M.aluDark, V(x, -0.985, s * (z - 0.008)), V(x, -0.985, s * (z + 0.008)), 0.045, 10);
      b.cyl(M.steel, V(x, -0.985, s * 0.7), V(x, -0.985, s * 0.84), 0.007, 4);
      b.beam(M.alu, V(x, -1.1, s * 0.77), V(x, -0.985, s * 0.77), 0.02);
    }
  });
  // Gaszellen-Schilder I–XVI (vom Heck zum Bug)
  const cellSign = (n, x, dir) => {
    b.box(M.aluDark, 0.02, 0.14, 0.52, x, 1.05, 0);
    b.cyl(M.steel, V(x, 1.12, 0), V(x, 1.275, 0), 0.005, 4);
    sign('Gaszelle ' + ROM[n - 1], x + (dir === 'x+' ? 0.016 : -0.016), 1.05, 0, 0.12, dir, 'alu');
  };
  MAIN.forEach((m, i) => {
    if (m < A0 + 0.3 || m > A1 - 0.3) return;
    cellSign(i + 2, m + 0.3, 'x-'); // Zelle vor dem Ring (Blick nach vorn)
    cellSign(i + 1, m - 0.3, 'x+'); // Zelle hinter dem Ring (Blick nach achtern)
  });
  // Manövrierventile (oben) und Überdruckventile (am Gasschacht): je eine Zelle beiderseits jedes Schachts → 14 + 14
  const K = 0.945;
  for (const m of SHAFTS) for (const d of [-1, 1]) {
    const xv = m + d * 1.6, yt = K * rLin(xv);
    b.torus(M.brass, 0.42, 0.03, xv, yt - 0.06, 0, 'y', 20);
    b.vcyl(M.aluDark, 0.4, 0.04, xv, yt - 0.12, 0, 16);
    b.vcyl(M.alu, 0.12, 0.25, xv, yt - 0.37, 0, 8);
    b.beam(M.steel, V(xv, yt - 0.3, 0), V(xv + 0.35, yt - 0.45, 0), 0.025);
    W(V(xv + 0.35, yt - 0.45, 0), V(xv + 0.35, 1.38, 0)); b.cyl(M.steel, V(xv + 0.35, 1.38, -0.025), V(xv + 0.35, 1.38, 0.025), 0.05, 10); b.beam(M.alu, V(xv + 0.35, 1.325, 0), V(xv + 0.35, 1.38, 0), 0.02);
    // Überdruckventil in der Zellstirn, mit Stutzen zum Schacht
    const xo = m + d * 0.66, yo = 2.6;
    b.sph(M.aluDark, 0.3, xo, yo, 0, 0.35, 1, 1, 12);
    b.torus(M.bronze, 0.31, 0.025, xo, yo, 0, 'x', 16);
    b.cyl(M.aluDark, V(xo, yo, 0), V(m + 0.42, yo, 0), 0.14, 10);
  }
  // Verbindungen der Zellen I/II und XV/XVI (gemeinsames Manövrierventil)
  for (const m of [20, 233]) { const y = K * rLin(m) - 0.6; b.cyl(M.canvas, V(m - 1.0, y, 0), V(m + 1.0, y, 0), 0.22, 12); for (const dx of [-0.6, 0.6]) b.torus(M.brass, 0.23, 0.02, m + dx, y, 0, 'x', 14); }
  // Gasschächte vom Kiel bis zum Schiffsrücken mit Abzugshauben
  { const hoop = new THREE.TorusGeometry(1, 0.05, 4, 10);
    const shaft = (xs, yb, yt) => {
      const P = (q, y) => V(xs + (q === 0 || q === 3 ? 0.106 : -0.106), y, q < 2 ? 0.212 : -0.212);
      for (let q = 0; q < 4; q++) b.cyl(M.alu, P(q, yb), P(q, yt), 0.015, 4);
      const n = Math.max(2, Math.round((yt - yb) / 2.2)), dy = (yt - yb) / n;
      for (let k = 0; k <= n; k++) {
        const y = yb + k * dy;
        b.add(M.alu, hoop, new THREE.Matrix4().makeTranslation(xs, y, 0).multiply(new THREE.Matrix4().makeScale(0.15, 0.3, 0.3)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
        if (k < n) for (let q = 0; q < 4; q++) W(P(q, y), P((q + 1) % 4, y + dy));
      }
    };
    for (const m of SHAFTS) {
      const xs = m + 0.42, r = rLin(xs);
      b.bb(M.aluDark, xs - 0.17, xs + 0.17, 1.3, 1.34, -0.32, 0.32);
      shaft(xs, 1.32, r - 0.06);
      if (KEEL_RANGES.some(([a, c]) => xs > a && xs < c)) { // unterer Teil vom Kielträger bis unter den Axialgang
        const yk = ky(xs) + 2.86;
        b.bb(M.aluDark, xs - 0.17, xs + 0.17, yk, yk + 0.04, -0.32, 0.32);
        b.bb(M.aluDark, xs - 0.17, xs + 0.17, AY - 0.2, AY - 0.16, -0.32, 0.32);
        shaft(xs, yk + 0.04, AY - 0.2);
      }
      if (m < 40) continue;                                     // Ring 33,5: Abzug liegt in der oberen Flosse
      // Durchführung durch die Hülle; die Abzugshaube außen baut detail_exterior.js (gasHaube, gleiche Lage xs)
      b.vcyl(M.aluDark, 0.3, 0.14, xs, r - 0.1, 0, 10);
    }
    sign('Gasschacht', 62.42, AY + 2.6, 0.24, 0.07, 'z+', 'red');
    sign('Gasschacht', 123.92, AY + 2.6, 0.24, 0.07, 'z+', 'red');
  }
  // Kontrollpodeste (Steuerbord, zwischen den Rahmen)
  for (const x0 of [78.2, 125.0, 141.4, 189.4, 210.0]) {
    const x1 = x0 + 1.4, xm = x0 + 0.7;
    b.bb(M.plank, x0, x1, -1.09, -1.05, 0.5, 1.3);
    for (const x of [x0 + 0.1, x1 - 0.1]) b.bb(M.alu, x - 0.02, x + 0.02, -1.12, -1.09, 0.5, 1.3);
    for (const x of [x0 + 0.05, xm, x1 - 0.05]) b.vcyl(M.alu, 0.015, 1.0, x, -1.05, 1.27, 5);
    for (const x of [x0 + 0.05, x1 - 0.05]) { b.vcyl(M.alu, 0.015, 1.0, x, -1.05, 0.55, 5); b.cyl(M.rope, V(x, -0.05, 0.55), V(x, -0.05, 1.27), 0.011, 4); }
    for (const yy of [-0.05, -0.55]) b.cyl(M.rope, V(x0 + 0.05, yy, 1.27), V(x1 - 0.05, yy, 1.27), 0.011, 4);
    b.vcyl(M.aluDark, 0.025, 1.2, xm + 0.35, -1.05, 1.18, 6);
    b.cyl(M.brass, V(xm + 0.35, 0.05, 1.18), V(xm + 0.35, 0.05, 1.15), 0.09, 12);
    gauge(xm + 0.35, 0.05, 1.144, 0.15, 'z-', 'Gasdruck', 6);
    b.cyl(M.brass, V(xm + 0.35, 0.15, 1.18), V(xm + 0.35, 2.6, 1.18), 0.008, 4);
    b.vcyl(M.steel, 0.02, 0.93, xm - 0.35, -1.05, 1.18, 6);
    b.torus(M.red, 0.11, 0.012, xm - 0.35, -0.12, 1.18, 'y', 14);
    b.cyl(M.red, V(xm - 0.46, -0.12, 1.18), V(xm - 0.24, -0.12, 1.18), 0.007, 4);
    b.cyl(M.red, V(xm - 0.35, -0.12, 1.07), V(xm - 0.35, -0.12, 1.29), 0.007, 4);
  }
  // Leiterköpfe: Hinweisschild
  for (const L of LADDERS) {
    const x = L.x;
    b.vcyl(M.alu, 0.012, 1.25, x + 0.45, AY, LADDER_Z + 0.06, 5);
    b.box(M.woodDark, 0.34, 0.1, 0.015, x + 0.45, AY + 1.18, LADDER_Z + 0.06);
    sign('Leiter zum Kielgang', x + 0.45, AY + 1.18, LADDER_Z + 0.075, 0.075, 'z+', 'plate');
    // Ringangabe am Leiterfuß im Kielgang
    const y = ky(x);
    b.box(M.woodDark, 0.3, 0.1, 0.015, x, y + 2.2, LADDER_Z - 0.3);
    sign('Ring ' + L.ring, x, y + 2.2, LADDER_Z - 0.285, 0.075, 'z+', 'plate');
  }

  // ===================== Bugraum =====================
  { const y = BOW.y, wx = 236.75;
    for (let k = 0; k < 9; k++) b.torus(M.rope, 0.315, 0.022, wx, y + 0.5, -0.4 + k * 0.1, 'z', 16);
    for (const s of [-1, 1]) {
      b.cyl(M.steel, V(wx, y + 0.5, s * 0.5), V(wx, y + 0.5, s * 0.53), 0.34, 18);
      b.cyl(M.steel, V(wx, y + 0.5, s * 0.53), V(wx, y + 0.5, s * 0.72), 0.03, 8);
      b.beam(M.steel, V(wx, y + 0.5, s * 0.7), V(wx - 0.2, y + 0.78, s * 0.7), 0.035, 0.02);
      b.cyl(M.woodDark, V(wx - 0.2, y + 0.78, s * 0.7), V(wx - 0.2, y + 0.78, s * 0.86), 0.022, 6);
    }
    b.beam(M.red, V(wx + 0.3, y + 0.45, -0.66), V(wx + 0.45, y + 1.15, -0.66), 0.03);
    b.sph(M.black, 0.04, wx + 0.45, y + 1.17, -0.66, 1, 1, 1, 8);
    sign('Ankerwinde', wx - 0.26, y + 0.3, 0, 0.08, 'x-', 'brass');
    // Führungsrohr des Mastseils zum Ankerkonus
    const A = V(wx + 0.2, y + 0.6, 0), B = V(244.3, 0, 0), P = (t) => A.clone().lerp(B, t);
    b.cyl(M.aluDark, P(0.45), P(0.93), 0.1, 10);
    b.cyl(M.steel, P(0.93), V(244.1, 0, 0), 0.16, 12, 0.3);
    const pm = P(0.7);
    for (const a of [45, 135, 225, 315]) b.cyl(M.alu, pm, hp(pm.x, a, 1, -0.1), 0.03, 5);
    for (const t of [0.5, 0.75, 0.9]) b.torus(M.steel, 0.11, 0.015, P(t).x, P(t).y, 0, 'x', 10);
    sign('Ankerkonus', 243.0, P(0.85).y + 0.35, 0, 0.08, 'x-', 'brass');
    // Landetau-Rolle und Instrumentenpfosten (Backbord)
    ropeCoil(235.6, y, -1.0, 0.22, 3);
    b.vcyl(M.aluDark, 0.025, 1.65, 237.35, y, -1.1, 6);
    b.cyl(M.black, V(237.33, y + 1.3, -1.1), V(237.29, y + 1.3, -1.1), 0.09, 12);
    gauge(237.284, y + 1.3, -1.1, 0.15, 'x-', 'Seilzug', 10);
    b.cyl(M.alu, V(237.35, y + 1.65, -1.1), V(237.1, y + 1.65, -1.1), 0.012, 5);
    shadeLamp(237.1, y + 1.53, -1.1);
    nav.block(235.3, 235.9, -1.3, -0.7, y, y + 0.5); nav.block(237.25, 237.45, -1.2, -1.0, y, y + 1.7);
    // Notfunkgerät mit Tretkurbel-Generator (Steuerbord)
    b.bb(M.aluDark, 236.6, 237.4, y, y + 0.7, 0.85, 1.3); b.box(M.black, 0.6, 0.35, 0.3, 237.0, y + 0.88, 1.08);
    for (const dx of [-0.15, 0, 0.15]) b.cyl(M.enamel, V(237.0 + dx, y + 0.9, 0.92), V(237.0 + dx, y + 0.9, 0.9), 0.04, 10);
    b.vcyl(M.black, 0.04, 0.04, 236.75, y + 1.05, 1.15, 8);
    sign('Notsender', 237.0, y + 0.45, 0.84, 0.06, 'z-', 'plate');
    b.bb(M.steel, 235.6, 236.2, y, y + 0.06, 0.9, 1.2);
    b.cyl(X.gen, V(235.95, y + 0.35, 0.9), V(235.95, y + 0.35, 1.2), 0.16, 12);
    b.cyl(M.steel, V(235.65, y + 0.06, 1.05), V(235.65, y + 0.6, 1.05), 0.025, 6); b.box(M.leather, 0.26, 0.06, 0.22, 235.65, y + 0.63, 1.05);
    for (const dz of [-0.12, 0.12]) { b.cyl(M.steel, V(235.95, y + 0.35, 1.05 + dz), V(235.95 + 0.13, y + 0.35 + 0.1 * Math.sign(dz), 1.05 + dz), 0.012, 4); b.box(M.rubber, 0.1, 0.03, 0.06, 235.95 + 0.13, y + 0.35 + 0.1 * Math.sign(dz), 1.05 + dz * 1.4); }
    b.cyl(X.cable, V(236.1, y + 0.35, 1.05), V(236.6, y + 0.3, 1.05), 0.012, 4);
    nav.block(235.55, 237.45, 0.82, 1.32, y, y + 1.2);
  }

  // ===================== Hilfssteuerstand in der unteren Flosse =====================
  { const S = FIN_STAND, y = S.y, wy = y + 1.05, xR = S.x1 - 0.5, xH = 39.4, zH = -0.24;
    // Speichen und Griffe der beiden Räder sind beweglich (feature_interact.js, gleiche Lage, etwas dicker): hier nur die Naben
    b.cyl(M.brass, V(xR - 0.06, wy, 0), V(xR + 0.18, wy, 0), 0.05, 10);
    b.cyl(M.brass, V(xH, wy, zH - 0.04), V(xH, wy, zH - 0.13), 0.05, 10);
    // Kompass auf dem Seitenruderstand
    const xc = S.x1 - 0.32;
    b.vcyl(M.brass, 0.1, 0.1, xc, y + 0.95, 0, 12);
    b.sph(M.glassClear, 0.085, xc, y + 1.05, 0, 1, 0.45, 1, 12);
    panel('kompassrose', (g, w, h) => {
      g.fillStyle = '#17181a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
      g.strokeStyle = '#2a2520';
      for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; g.lineWidth = k % 4 ? 1 : 2.5; g.beginPath(); g.moveTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.lineTo(64 + Math.cos(a) * (k % 4 ? 50 : 44), 64 + Math.sin(a) * (k % 4 ? 50 : 44)); g.stroke(); }
      g.fillStyle = '#a3261c'; g.beginPath(); g.moveTo(64, 14); g.lineTo(72, 64); g.lineTo(56, 64); g.fill();
      g.fillStyle = '#2a2520'; g.beginPath(); g.moveTo(64, 114); g.lineTo(72, 64); g.lineTo(56, 64); g.fill();
      g.font = 'bold 14px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('N', 64, 32); g.fillText('S', 64, 98); g.fillText('O', 96, 64); g.fillText('W', 32, 64);
    }, xc, y + 1.052, 0, 0.16, 0.16, 'y+');
    sign('Seitenruder', xc - 0.128, y + 0.5, 0, 0.07, 'x-', 'plate');
    sign('Höhenruder', xH, y + 0.55, -0.285, 0.07, 'z+', 'plate');
    // Steuerseile nach achtern zu den Rudern
    for (const z of [-0.07, 0.07]) b.cyl(M.steel, V(xc, y + 0.06, z), V(S.x0 + 0.05, y - 0.1, z), 0.006, 4);
    for (const dx of [-0.06, 0.06]) b.cyl(M.steel, V(xH + dx, y + 0.02, -0.36), V(S.x0 + 0.05, y - 0.12, -0.36), 0.006, 4);
    // Instrumententafel (Steuerbord)
    const ib = finHalf(y + 1.42) - 0.08;
    for (const xp of [41.15, 42.05]) b.vcyl(M.aluDark, 0.02, 1.9, xp, y, Math.min(ib, finHalf(y) - 0.06) + 0.01, 6);
    b.bb(M.black, 41.1, 42.1, y + 1.15, y + 1.9, ib - 0.03, ib);
    for (const [gx, lab, sd] of [[41.32, 'Höhe', 7], [41.6, 'Neigung', 8], [41.88, 'Fahrt', 9]]) {
      b.cyl(M.brass, V(gx, y + 1.42, ib - 0.03), V(gx, y + 1.42, ib - 0.045), 0.11, 14);
      gauge(gx, y + 1.42, ib - 0.051, 0.19, 'z-', lab, sd);
    }
    sign('Hilfssteuerstand', 41.6, y + 1.8, ib - 0.036, 0.08, 'z-', 'brass');
    b.cyl(M.aluDark, V(40.0, y + 2.1, 0), V(40.0, y + 1.98, 0), 0.012, 5); shadeLamp(40.0, y + 1.88, 0);
    b.cyl(M.alu, V(S.x0, y + 2.1, 0), V(S.x1, y + 2.1, 0), 0.02, 5); // Tragrohr unter dem Flossenholm
    // Sprachrohr zur Führergondel
    b.cyl(M.brass, V(S.x0 + 0.25, y, 0.3), V(S.x0 + 0.25, y + 1.5, 0.3), 0.025, 8);
    b.cyl(M.brass, V(S.x0 + 0.25, y + 1.5, 0.3), V(S.x0 + 0.3, y + 1.62, 0.22), 0.025, 10, 0.06);
    b.cyl(M.brass, V(S.x0 + 0.25, y + 1.5, 0.3), V(S.x0 + 0.25, ky(S.x0) - 0.3, 0.3), 0.025, 8);
    // Fensterrahmen in den Flossenwänden (außen und innen)
    const yA = y + 0.8, yB = y + 1.55;
    for (const s of [-1, 1]) for (const off of [0.012, -0.012]) {
      const zA = s * (finHalf(yA) + off), zB = s * (finHalf(yB) + off);
      b.beam(M.aluDark, V(38.5, yA, zA), V(42.5, yA, zA), 0.04, 0.012);
      b.beam(M.aluDark, V(38.5, yB, zB), V(42.5, yB, zB), 0.04, 0.012);
      for (let k = 0; k <= 4; k++) { const x = 38.5 + k; b.beam(M.aluDark, V(x, yA, zA), V(x, yB, zB), 0.04, 0.012); }
      if (off > 0) for (let k = 0; k < 4; k++) b.beam(M.black, V(39 + k, yA, s * (finHalf(yA) + 0.006)), V(39 + k, yB, s * (finHalf(yB) + 0.006)), 0.94, 0.004);
    }
    // Lukenrahmen im Kielboden, durch den die Leiter führt
    { const lx = S.lx, z0 = 0.45, z1 = 0.95, yh = (z) => hy(lx, z) + 0.02;
      b.beam(M.black, V(lx, yh(0.7), 0.7), V(lx, yh(0.7) + 0.004, 0.7), 0.6, 0.48);
      for (const dx of [-0.32, 0.32]) b.beam(M.aluDark, V(lx + dx, yh(z0) + 0.01, z0), V(lx + dx, yh(z1) + 0.01, z1), 0.05, 0.03);
      for (const z of [z0, z1]) b.beam(M.aluDark, V(lx - 0.32, yh(z) + 0.01, z), V(lx + 0.32, yh(z) + 0.01, z), 0.05, 0.03);
      b.vcyl(M.alu, 0.014, 1.3, lx + 0.4, ky(lx + 0.4) - 0.05, 0.76, 5);
      b.box(M.woodDark, 0.44, 0.1, 0.015, lx + 0.4, ky(lx + 0.4) + 1.25, 0.75);
      sign('Hilfssteuerstand', lx + 0.4, ky(lx + 0.4) + 1.25, 0.735, 0.07, 'z-', 'plate'); }
  }

  // ---------- alle Drähte als ein LineSegments ----------
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  root.add(new THREE.LineSegments(wg, M.wire));
}
