// Feinausstattung des B-Decks (Kielgang, Treppenschächte/Fallreeps, Passagierseite, Mannschaftsseite)
// und des Kabinenanbaus 1937. Alle Raumgrenzen kommen aus ROOMS (decks.js), Türen und Bodenhöhen aus den nav-Zonen.
// Lederfarbe im Rauchsalon: dunkel blaugrau (airships.net); die Angabe „schwarzes Leder“ (Airship Heritage Trust) wurde verworfen.
import * as THREE from 'three';
import { V } from './util.js';
import { ROOMS } from './decks.js';
import { B_Y, B_H, A_Y, hw, FALLREEP } from './hull.js';

export default function (C) {
  const { b, M, nav } = C;
  const RM = {}; for (const r of ROOMS) RM[r.name] = r;
  const BY = B_Y, BC = Math.min(B_Y + B_H, A_Y - 0.2);
  const KG = RM['Kielgang (B-Deck)'], TS = RM['Treppe und Fallreep Steuerbord'];
  const PF = RM['Passagierflur (B-Deck)'], HT = RM['Herrentoilette'], DT = RM['Damentoilette'], ZMR = RM['Zahlmeister'];
  const LS = RM['Luftschleuse'], BAR = RM['Bar'], RS = RM['Rauchsalon'], FB = RM['Flur Backbord (B-Deck)'];
  const TBB = RM['Toilette (Backbord)'], DU = RM['Dusche'], MM = RM['Mannschaftsmesse'], KU = RM['Küche'], OM = RM['Offiziersmesse'];
  const AG = RM['Kabinengang (B-Deck, 1937)'], WCS = ['WC 1 (1937)', 'WC 2 (1937)', 'WC 3 (1937)'].map((n) => RM[n]);
  const YP = BAR.y, XA = KG.x0, XF = KG.x1, ZK = KG.z1 + 0.04, XWC = TS.x1;

  // ---------- lokale Materialien ----------
  const Lm = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const Sm = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.5, envMapIntensity: 0.4, ...o });
  const X = {
    mirror: Sm(0xd8e2e8, { metalness: 1, roughness: 0.06, envMapIntensity: 1.1 }),
    leder: Sm(0x4a5866, { roughness: 0.42 }),
    navy: Lm(0x1d2431), bread: Lm(0xc08a4a), copper: Sm(0xb36b3c, { metalness: 0.75, roughness: 0.35 }),
    bakelit: Sm(0x2b1a10, { roughness: 0.3 }), chalk: Lm(0x283028), cigar: Lm(0x6a4322), ash: Lm(0x8c8a84),
    shade: Sm(0x2f5a3a, { roughness: 0.3 }), basin: Lm(0xd6dad6), ovenGlass: Sm(0x1a1c1e, { roughness: 0.1, envMapIntensity: 0.8 }),
    bottle: Sm(0x3d5a2a, { transparent: true, opacity: 0.78, roughness: 0.1 }), amber: Sm(0x9a5a1a, { transparent: true, opacity: 0.8, roughness: 0.1 }),
  };

  // ---------- Hilfen ----------
  /** Zone (nach Name/Prädikat) aus nav */
  const zoneOf = (name, pred = () => true) => nav.zones.find((q) => q.name === name && pred(q));
  const flat = (q) => q && Math.abs(q.ya - q.yb) < 1e-6;
  const YT = zoneOf('Übergang zum Kielgang (achtern)', flat)?.ya ?? BY + 0.3;
  const YF = zoneOf('Übergang zum Kielgang (vorn)', flat)?.ya ?? YP + 0.8;
  /** Türlücke [a, c] in einer Wand: axis 'z' = Wand längs x bei z = c0, axis 'x' = Wand längs z bei x = c0 */
  const gap = (name, axis, c0, def) => {
    const q = nav.zones.find((d) => d.name === name && (axis === 'z'
      ? Math.abs(d.z1 - d.z0 - 0.64) < 0.02 && Math.abs((d.z0 + d.z1) / 2 - c0) < 0.06
      : Math.abs(d.x1 - d.x0 - 0.64) < 0.02 && Math.abs((d.x0 + d.x1) / 2 - c0) < 0.06));
    return q ? (axis === 'z' ? [q.x0 - 0.04, q.x1 + 0.04] : [q.z0 - 0.04, q.z1 + 0.04]) : def;
  };
  /** Wandfläche: dir = Normale in den Raum ('x+','x-','z+','z-'), c = Lage der Fläche. u = Längs-, d = Abstand von der Fläche. */
  const W = (dir, c) => {
    const ax = dir[0], n = dir[1] === '+' ? 1 : -1;
    const P = (u, y, d = 0) => (ax === 'x' ? V(c + n * d, y, u) : V(u, y, c + n * d));
    return {
      dir, P, ry: { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 }[dir],
      bb(mat, u0, u1, y0, y1, d0, d1) { const a = P(u0, y0, d0), q = P(u1, y1, d1); b.bb(mat, Math.min(a.x, q.x), Math.max(a.x, q.x), y0, y1, Math.min(a.z, q.z), Math.max(a.z, q.z)); },
      cyl(mat, u0, y0, d0, u1, y1, d1, r, seg = 8, r2 = r) { b.cyl(mat, P(u0, y0, d0), P(u1, y1, d1), r, seg, r2); },
      sph(mat, r, u, y, d, su = 1, sy = 1, sn = 1, seg = 10) { const p = P(u, y, d); if (ax === 'x') b.sph(mat, r, p.x, p.y, p.z, sn, sy, su, seg); else b.sph(mat, r, p.x, p.y, p.z, su, sy, sn, seg); },
      sign(t, u, y, h, st = 'plate', d = 0.016) { const p = P(u, y, d); C.sign(t, p.x, p.y, p.z, h, dir, st); },
      gauge(u, y, dm, lab, seed, face = '#f1ead6', d = 0.036) { const p = P(u, y, d); C.gauge(p.x, p.y, p.z, dm, dir, lab, seed, face); },
      panel(key, draw, u, y, wd, ht, d = 0.016) { const p = P(u, y, d); C.panel(key, draw, p.x, p.y, p.z, wd, ht, dir); },
    };
  };
  /** Rahmen um ein Rechteck (Bilder, Tafeln) */
  const frame4 = (w, u0, u1, y0, y1, d0, d1, t, mat) => {
    w.bb(mat, u0 - t, u1 + t, y1, y1 + t, d0, d1); w.bb(mat, u0 - t, u1 + t, y0 - t, y0, d0, d1);
    w.bb(mat, u0 - t, u0, y0, y1, d0, d1); w.bb(mat, u1, u1 + t, y0, y1, d0, d1);
  };
  const ext = (w, u, y0) => {      // Feuerlöscher mit Wandhalter und Schild
    w.bb(M.steel, u - 0.05, u + 0.05, y0 + 0.12, y0 + 0.5, 0, 0.012);
    w.cyl(M.red, u, y0 + 0.04, 0.095, u, y0 + 0.56, 0.095, 0.075, 12);
    w.sph(M.red, 0.075, u, y0 + 0.56, 0.095, 1, 0.45, 1, 12);
    w.cyl(M.brass, u, y0 + 0.59, 0.095, u, y0 + 0.65, 0.095, 0.018, 8);
    w.cyl(M.black, u - 0.05, y0 + 0.66, 0.095, u + 0.04, y0 + 0.64, 0.095, 0.008, 5);
    w.cyl(M.rubber, u + 0.02, y0 + 0.62, 0.11, u + 0.085, y0 + 0.45, 0.13, 0.009, 5);
    w.cyl(M.rubber, u + 0.085, y0 + 0.45, 0.13, u + 0.08, y0 + 0.22, 0.13, 0.009, 5);
    w.cyl(M.black, u + 0.08, y0 + 0.22, 0.13, u + 0.08, y0 + 0.16, 0.13, 0.013, 6, 0.007);
    for (const yy of [0.2, 0.42]) { const p = w.P(u, y0 + yy, 0.095); b.torus(M.steel, 0.078, 0.007, p.x, p.y, p.z, 'y', 14); }
    w.sign('Feuerlöscher', u, y0 + 0.8, 0.05, 'red');
  };
  const clock = (w, u, y, dm = 0.26) => {
    w.cyl(M.woodDark, u, y, 0, u, y, 0.028, dm / 2 + 0.02, 16);
    w.cyl(M.brass, u, y, 0.028, u, y, 0.033, dm / 2 + 0.006, 16);
    w.gauge(u, y, dm, 'Bordzeit', 4, '#f4efe0', 0.036);
  };
  const board = (w, key, draw, u, y, wd, ht) => {   // Aushang auf Korkplatte mit Holzrahmen
    w.bb(M.cork, u - wd / 2 - 0.03, u + wd / 2 + 0.03, y - ht / 2 - 0.03, y + ht / 2 + 0.03, 0, 0.012);
    frame4(w, u - wd / 2 - 0.03, u + wd / 2 + 0.03, y - ht / 2 - 0.03, y + ht / 2 + 0.03, 0, 0.02, 0.022, M.woodDark);
    w.panel(key, draw, u, y, wd, ht, 0.014);
    for (const su of [-1, 1]) for (const sy of [-1, 1]) w.sph(M.brass, 0.007, u + su * (wd / 2 - 0.02), y + sy * (ht / 2 - 0.02), 0.017, 1, 1, 1, 6);
  };
  const sconce = (w, u, y) => {     // Wandleuchte
    w.bb(M.brass, u - 0.045, u + 0.045, y - 0.09, y + 0.07, 0, 0.012);
    w.cyl(M.brass, u, y - 0.04, 0.012, u, y, 0.12, 0.01, 6);
    const p = w.P(u, y + 0.01, 0.13);
    b.vcyl(M.brass, 0.03, 0.03, p.x, p.y - 0.03, p.z, 10, 0.05);
    b.sph(M.lamp, 0.055, p.x, p.y + 0.035, p.z, 1, 0.75, 1, 10);
  };
  const grilleW = (w, u0, u1, y0, y1) => {  // Lüftungsgitter an der Wand
    w.bb(M.black, u0, u1, y0, y1, 0.001, 0.004);
    frame4(w, u0, u1, y0, y1, 0, 0.012, 0.018, M.alu);
    const n = Math.max(3, Math.round((y1 - y0) / 0.03));
    for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n; w.bb(M.alu, u0, u1, y - 0.005, y + 0.005, 0.004, 0.012); }
  };
  const grilleC = (x0, x1, z0, z1) => {     // Lüftungsgitter in der Decke
    b.bb(M.black, x0, x1, BC - 0.004, BC - 0.001, z0, z1);
    for (const [a, c, e, f] of [[x0, x1, z0 - 0.02, z0], [x0, x1, z1, z1 + 0.02], [x0 - 0.02, x0, z0 - 0.02, z1 + 0.02], [x1, x1 + 0.02, z0 - 0.02, z1 + 0.02]]) b.bb(M.alu, a, c, BC - 0.014, BC - 0.001, e, f);
    for (let i = 0; i < 6; i++) { const z = z0 + (z1 - z0) * (i + 0.5) / 6; b.bb(M.alu, x0, x1, BC - 0.012, BC - 0.004, z - 0.007, z + 0.007); }
  };
  /** Handlauf entlang einer Wand: floorAt(u) Bodenhöhe, Lücken [a, c] werden ausgespart, kinks = Knickstellen */
  const handrail = (w, u0, u1, floorAt, gaps = [], kinks = [], h = 0.95, d = 0.065) => {
    const ivs = []; let s = u0;
    for (const [a, c] of [...gaps].sort((p, q) => p[0] - q[0])) { if (c < u0 || a > u1) continue; if (a - 0.1 > s + 0.3) ivs.push([s, a - 0.1]); s = Math.max(s, c + 0.1); }
    if (u1 > s + 0.3) ivs.push([s, u1]);
    for (const [a, c] of ivs) {
      const us = [a, ...kinks.filter((k) => k > a + 0.02 && k < c - 0.02), c];
      for (let i = 0; i < us.length - 1; i++) w.cyl(M.alu, us[i], floorAt(us[i]) + h, d, us[i + 1], floorAt(us[i + 1]) + h, d, 0.02, 6);
      for (const e of [a, c]) w.sph(M.alu, 0.022, e, floorAt(e) + h, d, 1, 1, 1, 8);
      const n = Math.max(1, Math.round((c - a) / 0.9));
      for (let i = 0; i <= n; i++) {
        const u = a + 0.08 + (c - a - 0.16) * i / n, y = floorAt(u) + h;
        w.cyl(M.alu, u, y - 0.045, 0.006, u, y - 0.045, d, 0.008, 5); w.cyl(M.alu, u, y - 0.045, d, u, y, d, 0.008, 5);
        w.bb(M.alu, u - 0.03, u + 0.03, y - 0.075, y - 0.015, 0, 0.006);
      }
    }
  };
  const jacket = (w, u, yT, white = false) => {    // Uniformjacke am Haken
    w.cyl(M.brass, u, yT, 0, u, yT, 0.05, 0.006, 5); w.sph(M.brass, 0.009, u, yT + 0.01, 0.05, 1, 1, 1, 6);
    w.cyl(M.woodLight, u - 0.18, yT - 0.06, 0.06, u + 0.18, yT - 0.06, 0.06, 0.008, 5);
    w.bb(X.navy, u - 0.19, u + 0.19, yT - 0.68, yT - 0.1, 0.03, 0.1);
    w.cyl(X.navy, u - 0.19, yT - 0.1, 0.065, u + 0.19, yT - 0.1, 0.065, 0.035, 8);
    for (const su of [-1, 1]) w.bb(X.navy, u + su * 0.17, u + su * 0.23, yT - 0.62, yT - 0.12, 0.04, 0.09);
    w.bb(white ? M.white : M.linen, u - 0.05, u + 0.05, yT - 0.2, yT - 0.08, 0.1, 0.104);
    w.bb(M.black, u - 0.003, u + 0.003, yT - 0.66, yT - 0.2, 0.1, 0.104);
    for (let k = 0; k < 4; k++) w.sph(M.brass, 0.009, u + 0.035, yT - 0.28 - k * 0.1, 0.103, 1, 1, 0.6, 6);
  };
  const cap = (w, u, y, d, white = false) => {     // Schirmmütze, Schirm zeigt in den Raum
    const p = w.P(u, y, d);
    b.at(p.x, p.y, p.z, w.ry, () => {
      b.vcyl(X.navy, 0.085, 0.045, 0, 0, 0, 12);
      b.vcyl(white ? M.white : X.navy, 0.1, 0.03, 0, 0.045, 0, 12, 0.11);
      b.torus(M.brass, 0.087, 0.004, 0, 0.02, 0, 'y', 14);
      b.box(M.black, 0.15, 0.008, 0.07, 0, 0.006, 0.1);
      b.sph(M.brass, 0.012, 0, 0.055, 0.1, 1, 1, 0.5, 6);
    });
  };
  /** Gedeck: Teller, Besteck, Glas; lokales +z zeigt zum Platz */
  const setting = (x, y, z, ry, glass = true) => b.at(x, y, z, ry, () => {
    b.vcyl(M.enamel, 0.11, 0.012, 0, 0, 0, 14); b.vcyl(X.basin, 0.07, 0.002, 0, 0.012, 0, 12);
    b.box(M.alu, 0.016, 0.004, 0.17, -0.14, 0.002, 0); b.box(M.alu, 0.014, 0.004, 0.19, 0.14, 0.002, 0);
    b.box(M.linen, 0.09, 0.015, 0.06, 0, 0.02, 0.02);
    if (glass) b.vcyl(M.glassClear, 0.028, 0.1, 0.11, 0, -0.17, 8, 0.033);
  });
  /** Geschirrschrank an einer Wand (unten geschlossen, oben verglast) */
  const cupboard = (w, u0, u1, y, h, D = 0.36) => {
    w.bb(M.woodLight, u0, u1, y, y + 0.85, 0, D); w.bb(M.wood, u0 - 0.01, u1 + 0.01, y + 0.85, y + 0.88, 0, D + 0.02);
    w.bb(M.trim, u0 + 0.02, u1 - 0.02, y, y + 0.08, D, D + 0.006);
    const um = (u0 + u1) / 2;
    w.bb(M.trim, um - 0.004, um + 0.004, y + 0.1, y + 0.82, D, D + 0.006);
    for (const su of [-1, 1]) w.sph(M.brass, 0.014, um + su * 0.05, y + 0.62, D + 0.012, 1, 1, 1, 6);
    w.bb(M.woodLight, u0, u1, y + 0.88, y + h, 0, 0.02);
    w.bb(M.woodLight, u0, u0 + 0.02, y + 0.88, y + h, 0, D - 0.06); w.bb(M.woodLight, u1 - 0.02, u1, y + 0.88, y + h, 0, D - 0.06);
    w.bb(M.wood, u0 - 0.015, u1 + 0.015, y + h - 0.04, y + h, 0, D - 0.03);
    for (const yy of [1.22, 1.56]) w.bb(M.woodLight, u0 + 0.02, u1 - 0.02, y + yy, y + yy + 0.02, 0.02, D - 0.08);
    w.bb(M.glassClear, u0 + 0.02, u1 - 0.02, y + 0.9, y + h - 0.04, D - 0.07, D - 0.065);
    for (const uu of [u0 + 0.02, um - 0.01, u1 - 0.04]) w.bb(M.trim, uu, uu + 0.02, y + 0.9, y + h - 0.04, D - 0.07, D - 0.058);
    for (const yy of [0.9, h - 0.06]) w.bb(M.trim, u0 + 0.02, u1 - 0.02, y + yy, y + yy + 0.02, D - 0.07, D - 0.058);
    for (const su of [-1, 1]) w.sph(M.brass, 0.01, um + su * 0.04, y + 1.4, D - 0.05, 1, 1, 1, 6);
    const n = Math.max(2, Math.floor((u1 - u0 - 0.1) / 0.2));
    for (let k = 0; k < n; k++) {
      const u = u0 + 0.12 + (u1 - u0 - 0.24) * k / (n - 1);
      w.cyl(M.enamel, u, y + 1.34, 0.05, u, y + 1.34, 0.062, 0.1, 14);           // stehende Teller
      const p = w.P(u, y + 0.88, 0.14); b.vcyl(M.enamel, 0.036, 0.07, p.x, p.y, p.z, 8, 0.042); // Tassen
      const q = w.P(u, y + 1.58, 0.13); b.vcyl(M.enamel, 0.05, 0.06, q.x, q.y, q.z, 10, 0.085);   // Schüsseln
    }
  };

  // Hier folgen die Raumabschnitte (siehe unten)
  kielgang(); treppen(); passagiere(); bar(); rauchsalon(); zahlmeister(); backbordNass(); messe(); kueche(); offiziere();
  C.only(1937, anbau);

  // ===================================================================================
  /** gezeichneter Aushang: Überschrift und Kritzelzeilen */
  function sheet(bg, fg, title, rows = 10, seed = 1) {
    return (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = 'bold 13px Georgia'; g.textAlign = 'center'; g.fillText(title, w / 2, 18);
      g.fillRect(14, 24, w - 28, 1.5);
      for (let i = 0; i < rows; i++) { const l = 30 + ((i * 37 + seed * 13) % 60); g.globalAlpha = 0.6; g.fillRect(14, 34 + i * 9, l, 2.2); g.fillRect(w - 34, 34 + i * 9, 20, 2.2); g.globalAlpha = 1; }
    };
  }

  // ===================================================================================
  // KIELGANG im B-Deck: Handläufe, Leitungen, Türschilder, Feuerlöscher, Wachplan, Uhr, Fernsprecher
  function kielgang() {
    const segs = nav.zones.filter((q) => q.name === 'Kielgang (B-Deck)' && q.z0 < 0 && q.z1 > 0);
    const floorK = (x) => { let y = -1e9; for (const q of segs) if (x >= q.x0 - 1e-6 && x <= q.x1 + 1e-6) y = Math.max(y, nav.h(q, x, 0)); return y > -1e8 ? y : BY; };
    const kinks = [...new Set(segs.flatMap((q) => [q.x0, q.x1]))].sort((a, c) => a - c);
    const ws = W('z-', KG.z1), wb = W('z+', KG.z0);
    const dZ = gap('Zahlmeister', 'z', ZK, [180.6, 181.3]);
    const dM = gap('Mannschaftsmesse', 'z', -ZK, [179.0, 179.7]), dK = gap('Küche', 'z', -ZK, [183.6, 184.3]), dO = gap('Offiziersmesse', 'z', -ZK, [185.5, 186.2]);
    const u0 = XA + 0.55, u1 = XF - 0.35;
    // Steuerbordwand: Feuerlöscher, Fernsprecher, Uhr
    const xE1 = 176.4, xT = 177.9, xU = 182.1;
    ext(ws, xE1, floorK(xE1) + 0.2);
    { // Bordfernsprecher (Kurbelinduktor)
      const y = BY + 1.25;
      ws.bb(X.bakelit, xT - 0.08, xT + 0.08, y, y + 0.3, 0, 0.1);
      for (const su of [-1, 1]) ws.sph(M.brass, 0.035, xT + su * 0.04, y + 0.33, 0.06, 1, 0.8, 1, 10);
      ws.cyl(X.bakelit, xT + 0.11, y + 0.06, 0.06, xT + 0.11, y + 0.26, 0.06, 0.017, 8);
      ws.sph(X.bakelit, 0.03, xT + 0.11, y + 0.27, 0.06, 1, 0.6, 1, 8); ws.sph(X.bakelit, 0.026, xT + 0.11, y + 0.05, 0.06, 1, 0.6, 1, 8);
      ws.cyl(M.brass, xT + 0.08, y + 0.2, 0.05, xT + 0.12, y + 0.2, 0.05, 0.006, 5);
      ws.cyl(M.steel, xT, y + 0.12, 0.1, xT, y + 0.12, 0.13, 0.012, 6); ws.cyl(M.steel, xT, y + 0.12, 0.13, xT - 0.06, y + 0.06, 0.13, 0.008, 5);
      ws.cyl(M.black, xT - 0.06, y + 0.06, 0.13, xT - 0.06, y + 0.06, 0.17, 0.012, 6);
      ws.cyl(M.rubber, xT + 0.08, y + 0.03, 0.05, xT + 0.11, y + 0.04, 0.06, 0.006, 4);
      ws.sign('Fernsprecher', xT, y + 0.47, 0.045, 'alu');
    }
    clock(ws, xU, BY + 2.08);
    handrail(ws, u0, u1, floorK, [dZ, [xE1 - 0.12, xE1 + 0.12], [xT - 0.2, xT + 0.2]], kinks);
    ws.sign('Zahlmeister', (dZ[0] + dZ[1]) / 2, BY + 2.2, 0.07, 'plate');
    // Backbordwand: Wachplan, Feuerlöscher, Türschilder
    board(wb, 'bd_wachplan', sheet('#efe8d2', '#2a2520', 'Wachplan', 10, 3), 181.3, BY + 1.55, 0.5, 0.42);
    const xE2 = (dK[1] + dO[0]) / 2;
    ext(wb, xE2, floorK(xE2) + 0.2);
    handrail(wb, u0, u1, floorK, [dM, dK, dO, [xE2 - 0.12, xE2 + 0.12]], kinks);
    wb.sign('Küche', (dK[0] + dK[1]) / 2, BY + 2.42, 0.06);
    wb.sign('Offiziersmesse', (dO[0] + dO[1]) / 2, BY + 2.42, 0.06);
    wb.sign('Mannschaftsmesse', dM[0] - 0.4, BY + 1.6, 0.055);
    // Leitungen unter der Decke: Wasserrohr (Stb) und Kabelstrang (Bb) mit Schellen
    const xc0 = XA + 0.5, xc1 = 187.1;
    b.cyl(M.alu, V(xc0, BC - 0.07, 0.3), V(xc1, BC - 0.07, 0.3), 0.02, 8);
    b.cyl(M.rubber, V(xc0, BC - 0.06, -0.3), V(xc1, BC - 0.06, -0.3), 0.014, 6);
    b.cyl(M.rubber, V(xc0, BC - 0.06, -0.33), V(xc1, BC - 0.06, -0.33), 0.01, 6);
    for (let x = xc0 + 0.3; x < xc1; x += 1.2) {
      b.bb(M.aluDark, x - 0.015, x + 0.015, BC - 0.09, BC, 0.27, 0.33);
      b.bb(M.aluDark, x - 0.015, x + 0.015, BC - 0.075, BC, -0.36, -0.27);
    }
    // Übergang vorn: Wegweiser zur Führergondel
    const wf = W('x-', XF);
    wf.sign('Zur Führergondel', 0, YF + 2.2, 0.07, 'dark', 0.015);
    wf.sign('Nur für Besatzung', 0, YF + 2.32, 0.055, 'red', 0.015);
  }
  // TREPPENSCHÄCHTE und FALLREEPS achtern (beiderseits des Kiels)
  function treppen() {
    const wa = W('x+', XA), wx = W('x-', XWC - 0.04);
    for (const s of [-1, 1]) {
      const nm = s > 0 ? 'Treppe und Fallreep Steuerbord' : 'Treppe und Fallreep Backbord';
      const hatch = zoneOf(nm, (q) => q.mode === 'flug');
      const hx0 = hatch ? hatch.x0 : XA + 0.64, zi = FALLREEP.zi, zo = FALLREEP.zo;
      // Kielgangwand zum Schacht: Zutrittsverbot
      W(s > 0 ? 'z+' : 'z-', s * ZK).sign('Kielgang – nur Besatzung', XA + 0.7, BY + 1.8, 0.075, 'red');
      // Endschott Ring 173: Feuerlöscher, Haltegriffe am Fallreep
      ext(wa, s * 3.6, BY + 0.2);
      for (const z of [1.0, 2.05]) {
        wa.cyl(M.alu, s * z, BY + 0.85, 0.07, s * z, BY + 1.65, 0.07, 0.016, 8);
        for (const y of [0.9, 1.6]) wa.cyl(M.alu, s * z, BY + y, 0, s * z, BY + y, 0.07, 0.01, 5);
        for (const y of [0.9, 1.6]) wa.bb(M.alu, s * z - 0.025, s * z + 0.025, BY + y - 0.03, BY + y + 0.03, 0, 0.006);
      }
      // Riegel am Rand der Bodenöffnung
      for (const z of [zi + 0.25, zo - 0.25]) {
        b.bb(M.alu, hx0 - 0.065, hx0 - 0.005, BY, BY + 0.006, s * z - 0.04, s * z + 0.04);
        C.mode('flug', () => b.bb(M.steel, hx0 - 0.045, hx0 + 0.05, BY + 0.006, BY + 0.016, s * z - 0.011, s * z + 0.011));
        C.mode('mast', () => b.bb(M.steel, hx0 - 0.06, hx0 - 0.015, BY + 0.006, BY + 0.016, s * z - 0.011, s * z + 0.011));
      }
      // Querwand vor dem Fallreep: Fallreep-Winde, Meldeleuchte, Hinweisschilder je nach Fahrzustand
      const uW = s * 1.78;
      wx.bb(M.aluDark, s * 1.62, s * 1.94, BY + 0.85, BY + 1.15, 0, 0.13);
      wx.bb(M.steel, s * 1.6, s * 1.96, BY + 0.83, BY + 0.85, 0, 0.14);
      wx.cyl(M.steel, uW, BY + 1.0, 0.13, uW, BY + 1.0, 0.17, 0.02, 8);
      wx.cyl(M.steel, uW, BY + 1.0, 0.17, uW, BY + 0.84, 0.17, 0.012, 6);
      wx.cyl(M.black, uW, BY + 0.84, 0.17, uW, BY + 0.84, 0.25, 0.015, 6);
      wx.sign('Fallreep-Winde', uW, BY + 1.25, 0.04, 'alu');
      wx.cyl(M.brass, s * 0.8, BY + 1.65, 0, s * 0.8, BY + 1.65, 0.035, 0.035, 10);
      C.mode('flug', () => {
        wx.sph(M.navRed, 0.026, s * 0.8, BY + 1.65, 0.04, 1, 1, 1, 8);
        wx.cyl(M.red, uW + s * 0.12, BY + 1.0, 0.04, uW + s * 0.12, BY + 1.0, 0.18, 0.008, 5);   // Sperrbolzen
        wx.sign('Klappe geschlossen', s * 1.3, BY + 1.65, 0.06, 'red');
      });
      C.mode('mast', () => {
        wx.sph(M.navGreen, 0.026, s * 0.8, BY + 1.65, 0.04, 1, 1, 1, 8);
        wx.sign('Fallreep ausgefahren', s * 1.3, BY + 1.65, 0.06, 'dark');
        wx.sign('Vorsicht Stufen', s * 1.3, BY + 1.5, 0.05, 'red');
      });
    }
    // Steuerbord: Abgabetisch für Feuerzeuge (Tisch aus decks.js: x 173.45–174.1, z 4.35–4.85, Platte BY+0.93)
    const yt = BY + 0.93;
    b.bb(M.alu, 173.5, 173.8, yt, yt + 0.015, 4.7, 4.84);
    [[173.56, M.brass], [173.63, M.black], [173.71, M.brass]].forEach(([x, m], i) => b.box(m, 0.035, 0.012, 0.05, x, yt + 0.022, 4.76 + (i % 2) * 0.03));
    b.bb(M.paper, 173.5, 173.6, yt, yt + 0.012, 4.38, 4.5); b.cyl(M.woodLight, V(173.52, yt + 0.016, 4.4), V(173.6, yt + 0.016, 4.48), 0.004, 5);
    b.bb(M.woodDark, 174.03, 174.045, yt, yt + 0.1, 4.64, 4.8);
    C.sign('Feuerzeuge hier abgeben', 174.052, yt + 0.05, 4.72, 0.04, 'x+');
    wa.sign('Abgabe von Feuerzeugen und Streichhölzern', 4.6, BY + 1.45, 0.065, 'plate');
    // Backbord: Bordordnung
    board(wa, 'bd_bordordnung', sheet('#f1ead6', '#2a2520', 'Bordordnung', 11, 7), -4.2, BY + 1.45, 0.5, 0.62);
  }
  /** WC-Zelle aus decks.js (x0..x1, innen am Kielgang, s = Seite): Deckel, Spülhebel, Papierhalter, Haken, Türknopf */
  function stall(x0, x1, s) {
    const zi = ZK + 0.04, xm = (x0 + x1) / 2, Z = (v) => s * v;
    const zz = (a, c) => [Math.min(Z(a), Z(c)), Math.max(Z(a), Z(c))];
    const [la, lc] = zz(zi + 0.19, zi + 0.21); b.bb(M.white, xm - 0.17, xm + 0.17, BY + 0.43, BY + 0.8, la, lc);       // hochgeklappter Deckel
    b.cyl(M.brass, V(xm - 0.2, BY + 0.98, Z(zi + 0.1)), V(xm - 0.27, BY + 0.98, Z(zi + 0.1)), 0.007, 5);
    b.sph(M.white, 0.016, xm - 0.28, BY + 0.98, Z(zi + 0.1), 1, 1, 1, 6);
    const [ba, bc] = zz(zi + 0.03, zi + 0.12); b.bb(M.enamel, xm - 0.22, xm + 0.22, BY, BY + 0.04, ba, bc);        // Sockel
    const wp = W('x-', x1 - 0.04);
    wp.bb(M.brass, Z(zi + 0.48), Z(zi + 0.62), BY + 0.66, BY + 0.74, 0, 0.008);
    wp.cyl(M.brass, Z(zi + 0.55), BY + 0.7, 0.008, Z(zi + 0.55), BY + 0.7, 0.07, 0.006, 5);
    wp.cyl(M.white, Z(zi + 0.495), BY + 0.66, 0.075, Z(zi + 0.605), BY + 0.66, 0.075, 0.052, 12);
    wp.cyl(M.brass, Z(zi + 0.25), BY + 1.65, 0, Z(zi + 0.25), BY + 1.65, 0.06, 0.007, 5); wp.sph(M.brass, 0.012, Z(zi + 0.25), BY + 1.67, 0.06, 1, 1, 1, 6);
    b.sph(M.brass, 0.015, x0 + 0.08, BY + 1.0, Z(1.27), 1, 1, 1, 6); b.bb(M.brass, x0 + 0.06, x0 + 0.075, BY + 0.95, BY + 1.05, Math.min(Z(1.24), Z(1.3)), Math.max(Z(1.24), Z(1.3)));
  }
  /** Waschbecken der Waschräume (Becken aus decks.js 0,3 × 0,42 m, 0,16 m vor der Wand x0) */
  function basinDetails(x0, zc, towelWall) {
    const bx = x0 + 0.16, w = W('x+', x0);
    b.bb(X.basin, bx - 0.11, bx + 0.09, BY + 0.88, BY + 0.884, zc - 0.14, zc + 0.14);
    b.vcyl(M.black, 0.018, 0.002, bx, BY + 0.884, zc, 8);
    for (const [dz, m] of [[-0.12, M.red], [0.12, M.upBlue]]) { b.vcyl(M.alu, 0.008, 0.06, x0 + 0.06, BY + 0.88, zc + dz, 5); b.sph(m, 0.014, x0 + 0.06, BY + 0.95, zc + dz, 1, 1, 1, 6); }
    b.cyl(M.alu, V(x0 + 0.06, BY + 0.96, zc), V(x0 + 0.12, BY + 0.94, zc), 0.008, 5);
    b.box(M.white, 0.06, 0.012, 0.09, bx + 0.08, BY + 0.886, zc + 0.16);
    b.cyl(M.alu, V(bx, BY + 0.76, zc), V(bx, BY + 0.55, zc), 0.018, 6); b.cyl(M.alu, V(bx, BY + 0.55, zc), V(x0 + 0.005, BY + 0.5, zc), 0.016, 6);
    w.bb(X.mirror, zc - 0.16, zc + 0.16, BY + 1.15, BY + 1.55, 0.012, 0.016);
    w.bb(M.glassClear, zc - 0.14, zc + 0.14, BY + 1.08, BY + 1.09, 0, 0.12);
    for (const dz of [-0.11, 0.11]) w.bb(M.alu, zc + dz - 0.006, zc + dz + 0.006, BY + 1.04, BY + 1.08, 0, 0.1);
    const g = w.P(zc + 0.07, BY + 1.09, 0.06); b.vcyl(M.glassClear, 0.025, 0.09, g.x, g.y, g.z, 8, 0.028);
    if (towelWall) {   // Handtuchhalter an der Flurwand
      const tw = W(towelWall.dir, towelWall.c);
      tw.cyl(M.alu, x0 + 0.05, BY + 1.18, 0.05, x0 + 0.32, BY + 1.18, 0.05, 0.008, 5);
      for (const u of [x0 + 0.05, x0 + 0.32]) tw.cyl(M.alu, u, BY + 1.18, 0, u, BY + 1.18, 0.05, 0.007, 5);
      tw.bb(M.linen, x0 + 0.07, x0 + 0.3, BY + 0.78, BY + 1.17, 0.035, 0.052);
    }
    const bn = w.P(zc - 0.34, BY, 0.13); b.vcyl(M.alu, 0.085, 0.28, bn.x, bn.y, bn.z, 10, 0.095);
  }
  // PASSAGIERFLUR (Steuerbord) und WASCHRÄUME
  function passagiere() {
    const wf = W('z+', PF.z0);
    const dH = gap('Herrentoilette', 'z', PF.z0 - 0.04, [176.0, 176.7]), dD = gap('Damentoilette', 'z', PF.z0 - 0.04, [178.9, 179.6]), dZ = gap('Zahlmeister', 'z', PF.z0 - 0.04, [179.87, 180.55]);
    ext(wf, (PF.x0 + dH[0]) / 2, BY + 0.2);
    handrail(wf, dH[1] + 0.05, dD[0] - 0.05, () => BY, []);
    clock(wf, 177.25, BY + 2.05);
    wf.sign('Rauchen verboten', 177.25, BY + 1.62, 0.05);
    board(wf, 'bd_fahrplan', sheet('#efe8d2', '#1f2a3a', 'Fahrplan', 9, 5), 178.15, BY + 1.5, 0.5, 0.4);
    // Herren- und Damentoilette: je zwei Zellen, Waschbecken, Urinale (Herren)
    for (const r of [HT, DT]) {
      const xm = (r.x0 + r.x1) / 2;
      stall(r.x0, xm, 1); stall(xm, r.x1, 1);
      basinDetails(r.x0, (1.62 + 1.98) / 2, { dir: 'z-', c: r.z1 });
    }
    { // Urinale an der Vorderwand der Herrentoilette
      const wu = W('x-', HT.x1);
      wu.bb(M.enamel, 1.5, 2.1, BY + 1.45, BY + 1.7, 0, 0.14);
      for (const z of [1.62, 1.98]) {
        wu.cyl(M.alu, z, BY + 1.025, 0.04, z, BY + 1.45, 0.04, 0.012, 6);
        wu.bb(X.basin, z - 0.1, z + 0.1, BY + 0.6, BY + 0.95, 0.2, 0.204);
        b.vcyl(M.alu, 0.045, 0.004, HT.x1 - 0.12, BY, z, 10);
      }
      wu.bb(M.enamel, 1.795, 1.805, BY + 0.45, BY + 1.35, 0, 0.24);
    }
    // Damen: kleiner Hocker
    { const sx = DT.x1 - 0.22, sz = 1.62;
      for (let k = 0; k < 3; k++) { const a = k * 2.094; b.cyl(M.alu, V(sx + Math.cos(a) * 0.12, BY, sz + Math.sin(a) * 0.12), V(sx + Math.cos(a) * 0.08, BY + 0.42, sz + Math.sin(a) * 0.08), 0.011, 5); }
      b.vcyl(M.upRed, 0.13, 0.05, sx, BY + 0.42, sz, 12); b.torus(M.alu, 0.105, 0.007, sx, BY + 0.15, sz, 'y', 12); }
    void dZ;
  }
  /** kräftige Türzarge mit Dichtung um eine Türlücke in einer Querwand bei x (Lücke z0..z1, Höhe yb..yt) */
  function zarge(x, z0, z1, yb, yt, sill = true) {
    for (const [a, c] of [[z0 - 0.075, z0], [z1, z1 + 0.075]]) b.bb(M.frame, x - 0.075, x + 0.075, yb, yt + 0.075, a, c);
    b.bb(M.frame, x - 0.075, x + 0.075, yt, yt + 0.075, z0 - 0.075, z1 + 0.075);
    for (const z of [z0, z1 - 0.008]) b.bb(M.rubber, x - 0.05, x + 0.05, yb, yt, z, z + 0.008);
    b.bb(M.rubber, x - 0.05, x + 0.05, yt - 0.008, yt, z0, z1);
    for (const z of [z0 - 0.04, z1 + 0.04]) for (const y of [0.3, 1.0, 1.7]) for (const sx of [-1, 1]) b.sph(M.steel, 0.008, x + sx * 0.077, yb + y, z, 1, 1, 0.6, 5);
    if (sill) b.bb(M.alu, x - 0.07, x + 0.07, yb, yb + 0.012, z0, z1);
  }
  // LUFTSCHLEUSE und BAR
  function bar() {
    // Schleuse: Zargen beider Türen, Schilder, Überdruckanzeige, Lüftungsgitter
    const XSL = LS.x0 - 0.04, XBAR = LS.x1 + 0.04;
    const g1 = gap('Luftschleuse', 'x', XSL, [PF.z0 + 0.03, PF.z1 - 0.03]), g2 = gap('Luftschleuse', 'x', XBAR, g1);
    zarge(XSL, g1[0], g1[1], BY, BY + 2.0); zarge(XBAR, g2[0], g2[1], BY, BY + 2.0, false);
    const wo = W('z-', LS.z1), wi = W('z+', LS.z0);
    wo.sign('Luftschleuse', (LS.x0 + LS.x1) / 2, BY + 1.95, 0.075, 'brass');
    wo.cyl(M.brass, LS.x0 + 0.21, BY + 1.5, 0, LS.x0 + 0.21, BY + 1.5, 0.03, 0.085, 14);
    wo.gauge(LS.x0 + 0.21, BY + 1.5, 0.14, 'Überdruck', 2, '#f1ead6', 0.033);
    wo.sign('Türen stets schließen', LS.x1 - 0.26, BY + 1.5, 0.05);
    grilleW(wo, LS.x0 + 0.12, LS.x1 - 0.12, BY + 2.22, BY + 2.38);
    wi.sign('Kein Feuer mitnehmen', (LS.x0 + LS.x1) / 2, BY + 1.6, 0.055, 'red');
    W('x+', XBAR + 0.04).sign('Luftschleuse', (g2[0] + g2[1]) / 2, BY + 2.16, 0.07, 'plate');
    // Bar: Theke aus decks.js (Platte x 181.7–183.1, z 1.1–1.58, Oberkante YP+1.06), Hocker bei z 1.85
    const yt = YP + 1.06;
    b.cyl(X.leder, V(181.72, yt - 0.02, 1.575), V(183.08, yt - 0.02, 1.575), 0.025, 8);     // gepolsterte Kante
    b.cyl(M.brass, V(181.75, YP + 0.18, 1.62), V(183.05, YP + 0.18, 1.62), 0.022, 10);       // Messing-Fußstange
    for (const x of [181.8, 182.4, 183.0]) b.cyl(M.brass, V(x, YP + 0.18, 1.5), V(x, YP + 0.18, 1.62), 0.012, 6);
    for (const x of [181.75, 183.05]) b.sph(M.brass, 0.026, x, YP + 0.18, 1.62, 1, 1, 1, 8);
    b.bb(M.rubber, 181.8, 182.5, yt, yt + 0.006, 1.14, 1.26);
    for (let k = 0; k < 7; k++) b.vcyl(M.glassClear, 0.03, 0.09, 181.85 + k * 0.1, yt + 0.006, 1.2, 8, 0.036);
    for (let k = 0; k < 4; k++) { const x = 181.86 + k * 0.1; b.vcyl(M.glassClear, 0.03, 0.006, x, yt, 1.33, 8); b.vcyl(M.glassClear, 0.004, 0.08, x, yt, 1.33, 5); b.vcyl(M.glassClear, 0.005, 0.04, x, yt + 0.08, 1.33, 10, 0.05); }
    // Zapfhahn
    b.box(M.steel, 0.2, 0.015, 0.12, 182.85, yt + 0.0075, 1.3);
    b.vcyl(M.brass, 0.028, 0.32, 182.85, yt, 1.25, 10); b.sph(M.brass, 0.042, 182.85, yt + 0.33, 1.25, 1, 1, 1, 10);
    b.cyl(M.brass, V(182.85, yt + 0.29, 1.26), V(182.85, yt + 0.24, 1.34), 0.012, 6);
    b.cyl(M.black, V(182.85, yt + 0.36, 1.25), V(182.85, yt + 0.5, 1.22), 0.012, 6); b.sph(M.black, 0.022, 182.85, yt + 0.51, 1.22, 1, 1.4, 1, 8);
    // Shaker, Eiskübel mit Eis und Zange, Getränkekarte
    b.vcyl(M.alu, 0.033, 0.14, 182.62, yt, 1.45, 10, 0.038); b.vcyl(M.alu, 0.036, 0.05, 182.62, yt + 0.14, 1.45, 10, 0.016); b.sph(M.alu, 0.012, 182.62, yt + 0.195, 1.45, 1, 1, 1, 6);
    b.vcyl(M.alu, 0.075, 0.12, 181.86, yt, 1.42, 12, 0.088);
    for (let k = 0; k < 5; k++) b.box(M.glassClear, 0.03, 0.03, 0.03, 181.83 + (k % 3) * 0.03, yt + 0.115 + (k > 2 ? 0.02 : 0), 1.4 + (k % 2) * 0.04, 0.3 * k);
    b.beam(M.alu, V(181.9, yt + 0.12, 1.43), V(181.98, yt + 0.004, 1.48), 0.008, 0.003); b.beam(M.alu, V(181.9, yt + 0.12, 1.44), V(181.99, yt + 0.004, 1.5), 0.008, 0.003);
    b.beam(M.paper, V(182.3, yt, 1.53), V(182.3, yt + 0.11, 1.495), 0.14, 0.003); b.beam(M.paper, V(182.3, yt, 1.46), V(182.3, yt + 0.11, 1.495), 0.14, 0.003);
    // Hocker: Fußplatte, Messingrand, Polsterknopf
    for (const x of [181.95, 182.45, 182.95]) {
      b.vcyl(M.alu, 0.17, 0.02, x, YP, 1.85, 14, 0.13); b.torus(M.brass, 0.17, 0.012, x, YP + 0.75, 1.85, 'y', 16);
      b.sph(X.leder, 0.02, x, YP + 0.78, 1.85, 1, 0.4, 1, 8);
    }
    // Rückbuffet am Kielgang mit Kasse, Flaschen, Spiegel und hängenden Gläsern
    const wk = W('z+', BAR.z0);
    wk.bb(M.woodDark, 181.72, 183.08, YP, YP + 0.9, 0, 0.36); wk.bb(M.wood, 181.7, 183.1, YP + 0.9, YP + 0.93, 0, 0.38);
    for (const u of [182.17, 182.63]) wk.bb(M.trim, u - 0.004, u + 0.004, YP + 0.08, YP + 0.85, 0.36, 0.366);
    for (const u of [181.95, 182.4, 182.86]) wk.sph(M.brass, 0.013, u + 0.12, YP + 0.62, 0.372, 1, 1, 1, 6);
    wk.bb(X.mirror, 181.75, 183.05, YP + 0.95, YP + 2.12, 0.002, 0.006);
    frame4(wk, 181.75, 183.05, YP + 0.95, YP + 2.12, 0, 0.012, 0.02, M.brass);
    // Kasse
    wk.bb(M.woodDark, 182.76, 183.04, YP + 0.93, YP + 0.98, 0.08, 0.34);
    wk.bb(M.brass, 182.78, 183.02, YP + 0.98, YP + 1.12, 0.1, 0.3);
    b.beam(M.brass, wk.P(182.9, YP + 1.08, 0.3), wk.P(182.9, YP + 1.0, 0.36), 0.24, 0.05);
    for (let r = 0; r < 3; r++) b.beam(M.white, wk.P(182.9, YP + 1.04 - r * 0.022, 0.31 + r * 0.016), wk.P(182.9, YP + 1.042 - r * 0.022, 0.312 + r * 0.016), 0.2, 0.012);
    wk.bb(M.white, 182.82, 182.98, YP + 1.12, YP + 1.2, 0.18, 0.19);
    wk.cyl(M.brass, 183.02, YP + 1.05, 0.2, 183.08, YP + 1.05, 0.2, 0.01, 6); wk.sph(M.black, 0.015, 183.09, YP + 1.05, 0.2, 1, 1, 1, 6);
    // Flaschen und Siphon auf dem Buffet
    [X.bottle, X.amber, M.glassClear, X.bottle, X.amber].forEach((m, k) => {
      const p = wk.P(181.82 + k * 0.13, YP + 0.93, 0.2); b.vcyl(m, 0.034, 0.2, p.x, p.y, p.z, 10); b.vcyl(m, 0.012, 0.08, p.x, p.y + 0.2, p.z, 6, 0.01);
      b.vcyl(k % 2 ? M.brass : M.red, 0.013, 0.02, p.x, p.y + 0.28, p.z, 6); b.vcyl(M.paper, 0.0345, 0.07, p.x, p.y + 0.06, p.z, 10);
    });
    { const p = wk.P(182.5, YP + 0.93, 0.25); b.vcyl(M.glassClear, 0.045, 0.24, p.x, p.y, p.z, 10); b.vcyl(M.alu, 0.03, 0.08, p.x, p.y + 0.24, p.z, 8); b.cyl(M.alu, V(p.x, p.y + 0.29, p.z), V(p.x + 0.07, p.y + 0.28, p.z), 0.008, 5); }
    // Gläser hängend unter dem unteren Flaschenbord (YP+1.3)
    for (const d of [0.09, 0.2]) wk.cyl(M.alu, 181.78, YP + 1.29, d, 182.5, YP + 1.29, d, 0.005, 4);
    for (let k = 0; k < 6; k++) { const p = wk.P(181.84 + (k >> 1) * 0.24 + (k & 1) * 0.1, YP + 1.29, (k & 1) ? 0.2 : 0.09); b.vcyl(M.glassClear, 0.004, 0.07, p.x, p.y - 0.07, p.z, 5); b.vcyl(M.glassClear, 0.045, 0.05, p.x, p.y - 0.13, p.z, 10, 0.005); b.vcyl(M.glassClear, 0.03, 0.004, p.x, p.y - 0.004, p.z, 8); }
    nav.block(181.7, 183.1, BAR.z0, BAR.z0 + 0.38, YP, YP + 1);
    // Getränkekarte an der Rückwand (Außenteil), Wandleuchte, Schild über der Tür zum Rauchsalon
    const wb = W('x+', XBAR);
    wb.bb(M.woodDark, 3.62, 4.1, YP + 1.14, YP + 1.76, 0, 0.012);
    wb.panel('bd_getraenke', (g, w, h) => {
      g.fillStyle = '#1e2430'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9954a'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#d9b96a'; g.font = 'bold 14px Georgia'; g.textAlign = 'center'; g.fillText('Getränke', w / 2, 24);
      g.fillStyle = '#e9e2cc'; for (let i = 0; i < 9; i++) { g.fillRect(14, 36 + i * 9, 50 + (i * 23) % 30, 2); g.fillRect(w - 30, 36 + i * 9, 16, 2); }
    }, 3.86, YP + 1.45, 0.42, 0.56, 0.014);
    const wr = W('x-', RS.x0 - 0.08);
    sconce(wr, 1.85, YP + 1.75);
    const gR = gap('Rauchsalon', 'x', RS.x0 - 0.04, [PF.z0 - 0.04, PF.z1 - 0.15]);
    wr.sign('Rauchsalon', (gR[0] + gR[1]) / 2, BY + 2.42, 0.06, 'brass');
    zarge(RS.x0 - 0.04, gR[0], gR[1], YP, BY + 2.3);
  }
  // RAUCHSALON (Möbel aus decks.js: L-Bank z 3.05–3.62 / x 187.2–187.72, vier Rundtische r 0,32, Platte YP+0.62)
  function rauchsalon() {
    const y = YP;
    // Teppichbordüre
    const bx0 = RS.x0 + 0.2, bx1 = 187.05, bz0 = RS.z0 + 0.16, bz1 = 2.95;
    for (const [a, c, e, f] of [[bx0, bx1, bz0, bz0 + 0.035], [bx0, bx1, bz1 - 0.035, bz1], [bx0, bx0 + 0.035, bz0, bz1], [bx1 - 0.035, bx1, bz0, bz1]]) b.bb(M.pigskin, a, c, y + 0.01, y + 0.013, e, f);
    // Lederpolster: Paspel, Knöpfe, Wulst (dunkel blaugrau)
    b.cyl(X.leder, V(RS.x0 + 0.11, y + 0.46, 3.05), V(187.19, y + 0.46, 3.05), 0.012, 6);
    b.cyl(X.leder, V(RS.x0 + 0.11, y + 0.92, 3.555), V(187.19, y + 0.92, 3.555), 0.06, 10);
    for (let x = RS.x0 + 0.6; x < 187.1; x += 0.62) b.bb(M.black, x - 0.003, x + 0.003, y + 0.46, y + 0.463, 3.06, 3.49);
    for (let x = RS.x0 + 0.3; x < 187.1; x += 0.31) for (const yy of [0.62, 0.78]) b.sph(X.leder, 0.015, x, y + yy, 3.488, 1, 1, 0.6, 6);
    b.cyl(X.leder, V(187.2, y + 0.46, RS.z0 + 0.03), V(187.2, y + 0.46, 3.04), 0.012, 6);
    b.cyl(X.leder, V(187.655, y + 0.92, RS.z0 + 0.03), V(187.655, y + 0.92, 3.6), 0.06, 10);
    for (let z = RS.z0 + 0.25; z < 3.45; z += 0.31) for (const yy of [0.62, 0.78]) b.sph(X.leder, 0.015, 187.588, y + yy, z, 0.6, 1, 1, 6);
    // Tische: Gläser, Aschenbecher-Inhalt, Zigarrenkiste, Karaffe, Zeitung
    const tt = y + 0.62;
    [[184.6, 2.45], [186.0, 2.45], [186.6, 1.3], [184.3, 1.25]].forEach(([tx, tz], i) => {
      b.vcyl(M.black, 0.045, 0.002, tx, tt + 0.03, tz, 10);
      b.cyl(M.white, V(tx + 0.03, tt + 0.033, tz + 0.02), V(tx + 0.1, tt + 0.036, tz + 0.04), 0.004, 5); b.sph(X.ash, 0.005, tx + 0.03, tt + 0.033, tz + 0.02, 1, 1, 1, 5);
      for (const [dx, dz] of [[0.16, -0.08], [-0.12, 0.14]].slice(0, i === 1 ? 2 : 1)) { b.vcyl(M.glassClear, 0.03, 0.09, tx + dx, tt, tz + dz, 8, 0.034); b.vcyl(X.amber, 0.026, 0.035, tx + dx, tt + 0.004, tz + dz, 8); }
      if (i === 0) { b.box(M.woodDark, 0.2, 0.05, 0.13, tx - 0.14, tt + 0.025, tz - 0.1, 0.3); b.box(M.paper, 0.1, 0.002, 0.07, tx - 0.14, tt + 0.051, tz - 0.1, 0.3); }
      if (i === 1) { b.sph(M.glassClear, 0.07, tx - 0.15, tt + 0.07, tz - 0.08, 1, 1, 1, 10); b.vcyl(M.glassClear, 0.018, 0.1, tx - 0.15, tt + 0.13, tz - 0.08, 8); b.sph(M.glassClear, 0.022, tx - 0.15, tt + 0.24, tz - 0.08, 1, 1, 1, 6); }
      if (i === 2) b.box(M.paper, 0.3, 0.012, 0.22, tx - 0.1, tt + 0.006, tz + 0.1, -0.4);
      if (i === 3) { b.cyl(X.cigar, V(tx - 0.02, tt + 0.036, tz), V(tx - 0.15, tt + 0.04, tz - 0.03), 0.009, 6); b.sph(X.ash, 0.009, tx - 0.02, tt + 0.036, tz, 1, 1, 1, 5); }
    });
    // Standaschenbecher
    for (const [x, z] of [[185.3, 2.88], [187.0, 0.8]]) {
      b.vcyl(M.alu, 0.12, 0.02, x, y, z, 12, 0.1); b.vcyl(M.alu, 0.018, 0.6, x, y + 0.02, z, 8);
      b.vcyl(M.brass, 0.06, 0.05, x, y + 0.62, z, 12, 0.1); b.vcyl(M.black, 0.085, 0.002, x, y + 0.67, z, 12);
    }
    // Lederwand am Kielgang: Bilderrahmen, Wandleuchten, elektrischer Anzünder
    const wk = W('z+', RS.z0);
    for (const cx of [184.2, 185.6, 186.8]) frame4(wk, cx - 0.375, cx + 0.375, y + 1.125, y + 1.875, 0.013, 0.032, 0.035, M.brass);
    for (const u of [184.9, 186.2]) sconce(wk, u, y + 1.75);
    wk.bb(X.bakelit, 183.6, 183.8, y + 0.86, y + 1.14, 0.013, 0.018);
    wk.bb(M.brass, 183.66, 183.74, y + 0.88, y + 0.92, 0.075, 0.11);
    wk.cyl(X.bakelit, 183.7, y + 0.9, 0.095, 183.7, y + 1.02, 0.095, 0.016, 8); wk.sph(M.steel, 0.012, 183.7, y + 0.895, 0.095, 1, 1, 1, 6);
    wk.cyl(M.rubber, 183.85, y + 0.82, 0.17, 183.72, y + 0.885, 0.1, 0.008, 5);
    wk.bb(M.alu, 183.585, 183.615, y + 1.14, BC, 0.013, 0.03);
    wk.sign('Elektr. Anzünder', 183.72, y + 0.8, 0.045, 'brass');
    // Querwand achtern: Rahmen der Nordhimmel-Karte, Wandleuchte, Schild über der Tür
    const wa = W('x+', RS.x0);
    frame4(wa, 1.3 - 0.425, 1.3 + 0.425, y + 1.025, y + 1.875, 0, 0.026, 0.03, M.brass);
    sconce(wa, 1.95, y + 1.75);
    wa.sign('Kein Feuer mitnehmen', 2.6, BY + 2.42, 0.055, 'red');
    // Lüftungsgitter (Überdruck-Belüftung) in der Decke
    grilleC(185.15, 185.6, 2.55, 2.8); grilleC(186.75, 187.1, 1.45, 1.75);
  }
  // ZAHLMEISTERBÜRO (decks.js: Schreibtisch x 181.0–181.46, z 1.15–2.12, Platte BY+0.79; Tresor x 179.85–180.35, z 0.55–1.0; Wandbord am Achterende)
  function zahlmeister() {
    const yd = BY + 0.79;
    // Schreibtischlampe, Tintenfass, Federschale, Stempelkissen, Stempelständer, Kassenbuch, Schreibmaschine
    b.vcyl(M.brass, 0.06, 0.02, 181.36, yd, 1.25, 12); b.cyl(M.brass, V(181.36, yd + 0.02, 1.25), V(181.36, yd + 0.34, 1.25), 0.008, 6);
    b.cyl(M.brass, V(181.36, yd + 0.34, 1.25), V(181.25, yd + 0.4, 1.25), 0.007, 6);
    b.vcyl(X.shade, 0.085, 0.08, 181.25, yd + 0.32, 1.25, 12, 0.03); b.sph(M.lamp, 0.025, 181.25, yd + 0.33, 1.25, 1, 1, 1, 8);
    b.vcyl(M.glassClear, 0.025, 0.04, 181.08, yd, 1.22, 8); b.vcyl(M.black, 0.014, 0.015, 181.08, yd + 0.04, 1.22, 6);
    b.box(M.woodDark, 0.14, 0.015, 0.05, 181.1, yd + 0.0075, 1.33); b.cyl(M.black, V(181.04, yd + 0.02, 1.33), V(181.16, yd + 0.022, 1.33), 0.005, 5);
    b.box(M.steel, 0.07, 0.015, 0.05, 181.18, yd + 0.0075, 1.2);
    b.box(M.woodDark, 0.045, 0.02, 0.17, 181.43, yd + 0.01, 1.63);
    for (const z of [1.57, 1.63, 1.69]) { b.vcyl(M.woodDark, 0.011, 0.06, 181.43, yd + 0.02, z, 6); b.sph(M.woodDark, 0.014, 181.43, yd + 0.085, z, 1, 1, 1, 6); }
    b.box(M.upRed, 0.3, 0.006, 0.24, 181.25, yd + 0.008, 1.62); for (const dz of [-0.055, 0.055]) b.box(M.paper, 0.13, 0.008, 0.11, 181.25 + dz * 1.25, yd + 0.012, 1.62);
    b.cyl(M.black, V(181.31, yd + 0.145, 1.83), V(181.31, yd + 0.145, 2.07), 0.025, 10);
    b.bb(M.paper, 181.314, 181.318, yd + 0.14, yd + 0.31, 1.88, 2.02);
    for (let r = 0; r < 3; r++) b.box(M.white, 0.022, 0.012, 0.2, 181.17 + r * 0.03, yd + 0.126 + r * 0.008, 1.95);
    b.cyl(M.alu, V(181.31, yd + 0.17, 2.07), V(181.25, yd + 0.2, 2.1), 0.005, 4);
    // Geldkassette auf dem Tresor, Tresortür mit Scharnieren, Zahlenschloss und Hebel
    b.box(M.aluDark, 0.26, 0.09, 0.18, 180.1, BY + 0.845, 0.78); b.cyl(M.brass, V(180.03, BY + 0.9, 0.78), V(180.17, BY + 0.9, 0.78), 0.007, 5);
    b.box(M.brass, 0.03, 0.03, 0.006, 180.1, BY + 0.85, 0.873);
    const wt = W('x+', 180.35);
    frame4(wt, 0.6, 0.95, BY + 0.08, BY + 0.74, 0, 0.008, 0.012, M.aluDark);
    for (const yy of [0.15, 0.55]) b.vcyl(M.steel, 0.016, 0.1, 180.36, BY + yy, 0.6, 8);
    wt.cyl(M.brass, 0.87, BY + 0.55, 0, 0.87, BY + 0.55, 0.025, 0.045, 16); wt.cyl(M.black, 0.87, BY + 0.55, 0.025, 0.87, BY + 0.55, 0.03, 0.03, 14);
    wt.bb(M.white, 0.868, 0.872, BY + 0.57, BY + 0.59, 0.03, 0.033);
    wt.cyl(M.brass, 0.72, BY + 0.38, 0, 0.72, BY + 0.38, 0.05, 0.012, 6); wt.cyl(M.brass, 0.72, BY + 0.38, 0.05, 0.65, BY + 0.3, 0.05, 0.01, 6);
    wt.sign('Tresor', 0.77, BY + 0.68, 0.035, 'brass', 0.01);
    // Schlüsselbrett über dem Schreibtisch
    const wb = W('x-', ZMR.x1);
    wb.bb(M.woodDark, 1.3, 1.78, BY + 1.3, BY + 1.62, 0, 0.018);
    wb.sign('Schlüssel', 1.54, BY + 1.67, 0.035, 'brass', 0.004);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
      const u = 1.36 + k * 0.072, yy = BY + 1.56 - r * 0.15;
      wb.cyl(M.brass, u, yy, 0.018, u, yy, 0.04, 0.004, 4);
      if ((k + r) % 4 !== 3) { wb.bb(M.brass, u - 0.006, u + 0.006, yy - 0.06, yy - 0.01, 0.028, 0.032); if (k % 2 === 0) wb.bb(M.paper, u - 0.012, u + 0.012, yy - 0.095, yy - 0.06, 0.026, 0.028); }
    }
    // Formulare, Ordner und Postfächer am Wandbord (Bord BY+1.3–1.33 an der Achterwand)
    const ws = W('x+', ZMR.x0);
    const ys = BY + 1.33;
    ws.bb(M.paper, 1.15, 1.43, ys, ys + 0.06, 0.03, 0.23); ws.bb(M.paper, 1.17, 1.41, ys + 0.06, ys + 0.09, 0.04, 0.22);
    [M.upRed, M.upBlue, M.upGreen, M.upBrown, M.upBlue, M.upRed].forEach((m, k) => ws.bb(m, 1.5 + k * 0.05, 1.54 + k * 0.05, ys, ys + 0.28, 0.02, 0.24));
    ws.bb(M.paper, 1.8, 1.88, ys, ys + 0.05, 0.04, 0.2);
    const yp = BY + 1.72;
    ws.bb(M.woodLight, 1.2, 1.9, yp, yp + 0.012, 0, 0.2); ws.bb(M.woodLight, 1.2, 1.9, yp + 0.34, yp + 0.352, 0, 0.2); ws.bb(M.woodLight, 1.2, 1.9, yp + 0.17, yp + 0.18, 0, 0.2);
    ws.bb(M.woodLight, 1.2, 1.9, yp, yp + 0.35, 0, 0.01);
    for (let k = 0; k <= 4; k++) ws.bb(M.woodLight, 1.2 + k * 0.175 - 0.006, 1.2 + k * 0.175 + 0.006, yp, yp + 0.35, 0, 0.2);
    for (let k = 0; k < 8; k++) if (k % 3 !== 1) { const u = 1.29 + (k % 4) * 0.175, y0 = yp + 0.012 + (k >> 2) * 0.17; ws.bb(M.paper, u - 0.06, u + 0.06, y0, y0 + 0.02 + (k % 2) * 0.03, 0.03, 0.18); }
    // Kalender an der Kielgangwand über dem Tresor, Papierkorb, Schild über der Kielgangtür
    const wk = W('z+', ZMR.z0);
    board(wk, 'bd_kalender', (g, w, h) => {
      g.fillStyle = '#f1ead6'; g.fillRect(0, 0, w, h); g.fillStyle = '#a3261c'; g.fillRect(0, 0, w, 26); g.fillStyle = '#fff3dc'; g.font = 'bold 13px Georgia'; g.textAlign = 'center'; g.fillText('Kalender', w / 2, 18);
      g.strokeStyle = '#6a5f4a'; g.lineWidth = 1; for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(8 + i * 16, 34); g.lineTo(8 + i * 16, 118); g.stroke(); } for (let j = 0; j <= 5; j++) { g.beginPath(); g.moveTo(8, 34 + j * 16.8); g.lineTo(120, 34 + j * 16.8); g.stroke(); }
    }, 180.1, BY + 1.55, 0.32, 0.42);
    b.vcyl(M.cork, 0.1, 0.28, 180.45, BY, 0.68, 10, 0.12);
    const dK = gap('Zahlmeister', 'z', ZK, [180.6, 181.3]);
    wk.sign('Kielgang – nur Besatzung', (dK[0] + dK[1]) / 2, BY + 2.16, 0.06, 'red');
  }
  // BACKBORD: Flur, Toilette, Dusche
  function backbordNass() {
    const wf = W('z-', FB.z1);
    const dT = gap('Toilette (Backbord)', 'z', FB.z1 - 0.04, [175.85, 176.5]), dS = gap('Dusche', 'z', FB.z1 - 0.04, [177.1, 177.75]);
    ext(wf, (dT[1] + dS[0]) / 2, BY + 0.2);
    W('x-', FB.x1).sign('Rauchen verboten', (FB.z0 + FB.z1) / 2, BY + 1.6, 0.05);
    // Toilette: Zelle, Handwaschbecken an der Achterwand, Spiegel, Handtuch
    stall(TBB.x0, TBB.x1, -1);
    const wa = W('x+', TBB.x0), zc = -1.81;
    wa.bb(M.enamel, zc - 0.19, zc + 0.19, BY + 0.76, BY + 0.88, 0, 0.24);
    wa.bb(X.basin, zc - 0.14, zc + 0.14, BY + 0.88, BY + 0.884, 0.05, 0.2);
    for (const [dz, m] of [[-0.1, M.red], [0.1, M.upBlue]]) { const p = wa.P(zc + dz, BY + 0.88, 0.03); b.vcyl(M.alu, 0.008, 0.06, p.x, p.y, p.z, 5); b.sph(m, 0.013, p.x, p.y + 0.07, p.z, 1, 1, 1, 6); }
    wa.cyl(M.alu, zc, BY + 0.95, 0.03, zc, BY + 0.93, 0.1, 0.008, 5);
    wa.cyl(M.alu, zc, BY + 0.76, 0.12, zc, BY + 0.5, 0.12, 0.016, 6); wa.cyl(M.alu, zc, BY + 0.5, 0.12, zc, BY + 0.47, 0.005, 0.014, 6);
    wa.bb(M.alu, zc - 0.17, zc + 0.17, BY + 1.1, BY + 1.52, 0, 0.01); wa.bb(X.mirror, zc - 0.15, zc + 0.15, BY + 1.12, BY + 1.5, 0.01, 0.014);
    nav.block(TBB.x0, TBB.x0 + 0.24, zc - 0.19, zc + 0.19, BY, BY + 1);
    const wt = W('x-', TBB.x1);
    wt.cyl(M.alu, -1.9, BY + 1.15, 0.05, -1.6, BY + 1.15, 0.05, 0.008, 5);
    for (const u of [-1.9, -1.6]) wt.cyl(M.alu, u, BY + 1.15, 0, u, BY + 1.15, 0.05, 0.007, 5);
    wt.bb(M.linen, -1.88, -1.62, BY + 0.76, BY + 1.14, 0.035, 0.052);
    // Dusche: Fliesen an der Kielgangwand, Steigrohr und Ventile, Abfluss, Vorhangringe, Bank, Handtuch, Spiegel
    const wd = W('z-', DU.z1);
    wd.bb(M.tile, DU.x0, DU.x1, BY + 0.1, BY + 2.0, 0.004, 0.01);
    wd.cyl(M.alu, 177.0, BY + 1.27, 0.018, 177.0, BY + 2.1, 0.018, 0.012, 6);
    wd.cyl(M.alu, 177.0, BY + 2.1, 0.018, 177.4, BY + 2.1, 0.012, 0.012, 6); wd.sph(M.alu, 0.016, 177.0, BY + 2.1, 0.018, 1, 1, 1, 6);
    for (const u of [176.95, 177.05]) wd.cyl(M.alu, u, BY + 0.1, 0.016, u, BY + 1.13, 0.016, 0.01, 6);
    for (const [u, m] of [[176.86, M.red], [177.14, M.upBlue]]) {
      wd.cyl(M.brass, 177.0 + Math.sign(u - 177) * 0.07, BY + 1.2, 0.02, u, BY + 1.2, 0.02, 0.008, 5);
      wd.cyl(M.brass, u, BY + 1.2, 0.01, u, BY + 1.2, 0.06, 0.01, 6);
      const p = wd.P(u, BY + 1.2, 0.06); b.torus(M.brass, 0.035, 0.006, p.x, p.y, p.z, 'z', 12);
      for (const a of [0, Math.PI / 2]) wd.cyl(M.brass, u - Math.cos(a) * 0.035, BY + 1.2 - Math.sin(a) * 0.035, 0.06, u + Math.cos(a) * 0.035, BY + 1.2 + Math.sin(a) * 0.035, 0.06, 0.004, 4);
      wd.sph(m, 0.012, u, BY + 1.2, 0.068, 1, 1, 1, 6);
    }
    wd.sign('Duschzeit begrenzt', 177.62, BY + 1.45, 0.055);
    wd.bb(M.alu, 177.68, 177.84, BY + 1.18, BY + 1.2, 0, 0.07); wd.bb(M.white, 177.71, 177.81, BY + 1.2, BY + 1.22, 0.02, 0.06);
    b.vcyl(M.alu, 0.05, 0.004, 177.4, BY + 0.1, -1.0, 12);
    for (const x of [176.88, 176.93, 176.98, 177.04, 177.1, 177.16, 177.5, 177.85]) b.torus(M.alu, 0.016, 0.003, x, BY + 2.05, -1.45, 'x', 8);
    for (let k = 0; k < 4; k++) b.bb(M.woodLight, 176.82 + k * 0.075, 176.87 + k * 0.075, BY + 0.43, BY + 0.455, -2.1, -1.6);
    for (const x of [176.84, 177.08]) for (const z of [-2.06, -1.64]) b.vcyl(M.alu, 0.013, 0.43, x, BY, z, 6);
    b.cyl(M.alu, V(176.84, BY + 0.15, -1.85), V(177.08, BY + 0.15, -1.85), 0.008, 5);
    nav.block(DU.x0, 177.12, -2.12, -1.58, BY, BY + 0.6);
    b.bb(M.cork, 177.15, 177.7, BY, BY + 0.012, -1.98, -1.55);
    const wm = W('x-', DU.x1);
    wm.cyl(M.brass, -2.0, BY + 1.62, 0, -2.0, BY + 1.62, 0.05, 0.007, 5); wm.sph(M.brass, 0.012, -2.0, BY + 1.64, 0.05, 1, 1, 1, 6);
    wm.bb(M.linen, -2.12, -1.88, BY + 1.05, BY + 1.6, 0.025, 0.045);
    wm.bb(M.alu, -1.76, -1.54, BY + 1.28, BY + 1.72, 0, 0.008); wm.bb(X.mirror, -1.745, -1.555, BY + 1.3, BY + 1.7, 0.008, 0.012);
  }
  function fotoPanel(g, w, h) {
    g.fillStyle = '#d8c9a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b9a680'; g.fillRect(0, h * 0.7, w, h * 0.3);
    g.fillStyle = '#5a4a36'; g.beginPath(); g.ellipse(w / 2, h * 0.4, 50, 11, -0.05, 0, 7); g.fill();
    g.fillRect(w / 2 + 6, h * 0.4 + 9, 12, 4); g.strokeStyle = '#f1ead6'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  }
  // MANNSCHAFTSMESSE (decks.js: Tische x 178.3–179.25 und 179.4–180.3, z −2.58…−1.86; Bänke außen und innen)
  function messe() {
    const yt = BY + 0.7575;
    for (const [x0, x1] of [[178.3, 179.25], [179.4, 180.3]]) {
      for (const x of [x0 + 0.25, x1 - 0.25]) {   // Besteck an den vorhandenen Tellern (Außenbank)
        b.box(M.alu, 0.016, 0.004, 0.16, x - 0.13, yt + 0.002, -2.35); b.box(M.alu, 0.014, 0.004, 0.17, x + 0.13, yt + 0.002, -2.35);
      }
      for (const x of [x0 + 0.22, x1 - 0.32]) setting(x, yt, -1.97, 0, false);
    }
    // Brotkorb, Salz und Pfeffer, Kaffeekanne
    b.box(M.woodLight, 0.2, 0.05, 0.1, 178.775, yt + 0.025, -2.2); for (const dx of [-0.05, 0, 0.05]) b.box(X.bread, 0.04, 0.03, 0.08, 178.775 + dx, yt + 0.06, -2.2, 0.2);
    for (const [dx, m] of [[-0.03, M.white], [0.03, M.black]]) b.vcyl(m, 0.014, 0.06, 179.85 + dx, yt, -2.2, 6);
    b.vcyl(M.enamel, 0.06, 0.16, 179.85, yt, -2.08, 12, 0.045); b.vcyl(M.enamel, 0.047, 0.02, 179.85, yt + 0.16, -2.08, 10, 0.02);
    b.cyl(M.enamel, V(179.9, yt + 0.06, -2.08), V(179.95, yt + 0.14, -2.08), 0.012, 6); b.torus(M.enamel, 0.035, 0.007, 179.79, yt + 0.09, -2.08, 'z', 10);
    // Geschirrschrank an der Kielgangwand, Garderobe neben der Tür
    const wk = W('z-', MM.z1);
    const dM = gap('Mannschaftsmesse', 'z', -ZK, [179.0, 179.7]);
    cupboard(wk, MM.x0 + 0.06, dM[0] - 0.05, BY, 1.9);
    nav.block(MM.x0 + 0.06, dM[0] - 0.05, MM.z1 - 0.38, MM.z1, BY, BY + 2);
    const g0 = dM[1] + 0.12, g1 = MM.x1 - 0.08;
    wk.bb(M.woodDark, g0, g1, BY + 1.62, BY + 1.7, 0, 0.025);
    wk.bb(M.woodDark, g0, g1, BY + 1.86, BY + 1.88, 0, 0.24);
    for (const u of [g0 + 0.05, g1 - 0.05]) wk.bb(M.woodDark, u - 0.01, u + 0.01, BY + 1.72, BY + 1.86, 0, 0.18);
    jacket(wk, g0 + 0.18, BY + 1.66); jacket(wk, g0 + 0.6, BY + 1.66);
    cap(wk, g0 + 0.2, BY + 1.88, 0.12); cap(wk, g0 + 0.62, BY + 1.88, 0.12);
    // Vorderwand: Uhr, Speiseplan, Foto; Rahmen um das Wandbild an der Achterwand
    const wv = W('x-', MM.x1);
    clock(wv, -2.6, BY + 1.78);
    board(wv, 'bd_speiseplan', sheet('#efe8d2', '#2a2520', 'Speiseplan', 10, 9), -3.3, BY + 1.45, 0.38, 0.48);
    wv.bb(M.woodDark, -1.13, -0.77, BY + 1.39, BY + 1.71, 0, 0.012);
    wv.panel('bd_foto127', fotoPanel, -0.95, BY + 1.55, 0.3, 0.24, 0.014);
    frame4(W('x+', MM.x0), -2.7, -1.1, BY + 1.2, BY + 1.8, 0, 0.025, 0.035, M.woodDark);
  }
  // KÜCHE (decks.js: Herd x 184.5–185.25, z −2.55…−1.0; Kühlschrank x 184.6–185.24, z −3.3…−2.6; Außentisch mit Spüle
  // x 181.72–184.5, z −3.62…−2.93, Platte YP+0.91; Innentisch x 181.0–183.4, z −1.17…−0.55, Platte YP+0.9; Speiseaufzug x 180.9–181.7, Front z −3.45)
  function kueche() {
    const y = YP;
    // Herd: Ofentüren mit Fenster und Griff, Schalterleiste, Schlingerleiste, Topfhalter
    const wh = W('x-', 184.55);
    for (const pz of [-2.1, -1.45]) {
      wh.bb(X.ovenGlass, pz - 0.15, pz + 0.15, y + 0.3, y + 0.52, 0.02, 0.024);
      wh.cyl(M.alu, pz - 0.2, y + 0.63, 0.06, pz + 0.2, y + 0.63, 0.06, 0.012, 8);
      for (const su of [-1, 1]) wh.cyl(M.alu, pz + su * 0.18, y + 0.63, 0.02, pz + su * 0.18, y + 0.63, 0.06, 0.008, 5);
    }
    wh.bb(M.black, -2.46, -1.09, y + 0.74, y + 0.83, -0.005, 0.02);
    for (let k = 0; k < 6; k++) { const u = -2.38 + k * 0.25; wh.cyl(X.bakelit, u, y + 0.785, 0.02, u, y + 0.785, 0.05, 0.02, 10); wh.bb(M.white, u - 0.002, u + 0.002, y + 0.79, y + 0.805, 0.05, 0.052); }
    for (const u of [-2.45, -1.1]) wh.sph(M.navRed, 0.008, u, y + 0.8, 0.022, 1, 1, 1, 6);
    wh.cyl(M.alu, -2.5, y + 0.97, 0.04, -1.05, y + 0.97, 0.04, 0.012, 6);
    for (const u of [-2.5, -1.78, -1.05]) wh.cyl(M.alu, u, y + 0.9, 0.04, u, y + 0.97, 0.04, 0.009, 5);
    for (const z of [-2.0, -1.55]) b.cyl(M.alu, V(184.52, y + 0.93, z), V(185.22, y + 0.93, z), 0.008, 5);
    // Abzugshaube: Messingkante, Fettfilter, Leuchte, Abluftrohr; Hakenleiste mit Pfannen und Kellen
    wh.bb(M.brass, -2.56, -0.99, y + 1.79, y + 1.81, 0.05, 0.058);
    for (let k = 0; k < 6; k++) { const x = 184.6 + k * 0.11; b.bb(M.alu, x, x + 0.02, y + 1.79, y + 1.797, -2.5, -1.05); }
    b.vcyl(M.lamp, 0.05, 0.012, 184.9, y + 1.778, -1.3, 10);
    b.vcyl(M.aluDark, 0.13, BC - (y + 2.1), 184.9, y + 2.1, -1.8, 12);
    wh.cyl(M.alu, -2.45, y + 1.74, 0.09, -1.1, y + 1.74, 0.09, 0.01, 6);
    for (const u of [-2.45, -1.1]) wh.cyl(M.alu, u, y + 1.74, 0.05, u, y + 1.74, 0.09, 0.008, 5);
    const ladle = (u) => { wh.cyl(M.alu, u, y + 1.73, 0.09, u, y + 1.43, 0.09, 0.006, 5); wh.sph(M.alu, 0.04, u, y + 1.41, 0.1, 1, 0.6, 1, 8); };
    const pan = (u, m) => { wh.cyl(m, u, y + 1.73, 0.09, u, y + 1.57, 0.1, 0.008, 5); wh.cyl(m, u, y + 1.45, 0.1, u, y + 1.45, 0.14, 0.11, 14); };
    ladle(-2.35); pan(-2.05, X.copper); ladle(-1.8); pan(-1.5, M.alu); ladle(-1.15);
    wh.cyl(M.woodDark, -1.3, y + 1.73, 0.09, -1.3, y + 1.55, 0.09, 0.007, 5); wh.sph(M.alu, 0.03, -1.3, y + 1.5, 0.09, 1, 1.6, 1, 8);
    // Kühlschrank: Türfuge, Scharniere, Riegel, Lüftungsgitter, Thermometer
    const wc = W('x-', 184.6);
    wc.bb(M.black, -3.28, -2.62, y + 0.96, y + 0.967, -0.002, 0.004);
    for (const yy of [0.15, 0.8, 1.1, 1.5]) wc.bb(M.alu, -3.3, -3.26, y + yy, y + yy + 0.06, 0, 0.02);
    wc.bb(M.brass, -2.72, -2.66, y + 0.5, y + 0.7, 0, 0.03); wc.bb(M.brass, -2.73, -2.65, y + 1.32, y + 1.4, 0, 0.03);
    grilleW(wc, -3.22, -2.68, y + 0.04, y + 0.18);
    wc.gauge(-2.95, y + 1.42, 0.1, 'Kühlung', 3, '#e8eef0', 0.006);
    // Spüle: Beckenboden, Abfluss, Hähne, Abtropffläche mit Tellergestell, Geschirrtuch
    b.bb(M.steel, 182.84, 183.36, y + 0.916, y + 0.919, -3.41, -3.09); b.vcyl(M.black, 0.025, 0.002, 183.1, y + 0.919, -3.25, 8);
    for (const [x, m] of [[183.0, M.red], [183.2, M.upBlue]]) { b.vcyl(M.alu, 0.01, 0.06, x, y + 0.915, -3.52, 6); b.sph(m, 0.016, x, y + 0.985, -3.52, 1, 1, 1, 6); }
    for (let k = 0; k < 6; k++) b.bb(M.alu, 183.47, 183.9, y + 0.91, y + 0.918, -3.42 + k * 0.07, -3.41 + k * 0.07);
    for (const z of [-3.4, -3.1]) b.cyl(M.alu, V(183.5, y + 0.95, z), V(183.88, y + 0.95, z), 0.004, 4);
    for (let k = 0; k < 5; k++) b.cyl(M.enamel, V(183.54 + k * 0.075, y + 1.025, -3.25), V(183.552 + k * 0.075, y + 1.025, -3.25), 0.1, 14);
    const wf = W('z+', -2.93);
    wf.cyl(M.alu, 182.0, y + 0.8, 0.03, 182.5, y + 0.8, 0.03, 0.007, 5);
    wf.bb(M.linen, 182.05, 182.32, y + 0.52, y + 0.8, 0.025, 0.04);
    // Arbeitsfläche: Gewürzdosen, Schneidbrett mit Brot und Messer, Messerblock, Schüsseln, Waage
    const yw = y + 0.91;
    b.bb(M.woodDark, 181.78, 182.0, yw, yw + 0.02, -3.6, -3.5);
    [M.red, M.white, M.brass, M.upGreen, M.red, M.white].forEach((m, k) => b.vcyl(m, 0.016, 0.07, 181.8 + (k % 3) * 0.07, yw + 0.02, -3.575 + (k > 2 ? 0.05 : 0), 8));
    b.bb(M.woodLight, 182.0, 182.43, yw, yw + 0.025, -3.42, -3.12);
    b.sph(X.bread, 0.1, 182.12, yw + 0.06, -3.27, 1.4, 0.55, 0.75, 12);
    for (const x of [182.28, 182.3]) b.box(X.bread, 0.012, 0.075, 0.1, x, yw + 0.063, -3.25, 0.1);
    b.box(M.alu, 0.16, 0.003, 0.025, 182.3, yw + 0.027, -3.15); b.box(M.woodDark, 0.09, 0.018, 0.02, 182.42, yw + 0.034, -3.15);
    b.box(M.woodDark, 0.1, 0.18, 0.14, 182.6, yw + 0.09, -3.5);
    for (let k = 0; k < 4; k++) b.box(M.black, 0.018, 0.08, 0.02, 182.57 + (k % 2) * 0.05, yw + 0.22, -3.54 + (k >> 1) * 0.07);
    b.vcyl(M.enamel, 0.08, 0.09, 182.6, yw, -3.12, 14, 0.13); b.vcyl(X.basin, 0.115, 0.002, 182.6, yw + 0.09, -3.12, 12);
    b.cyl(M.alu, V(182.6, yw + 0.07, -3.12), V(182.66, yw + 0.22, -3.06), 0.006, 5);
    b.vcyl(M.enamel, 0.08, 0.09, 184.3, yw, -3.15, 14, 0.13); b.vcyl(M.enamel, 0.06, 0.07, 184.3, yw + 0.09, -3.15, 12, 0.1);
    b.box(M.aluDark, 0.16, 0.08, 0.12, 184.1, yw + 0.04, -3.47); b.vcyl(M.brass, 0.1, 0.012, 184.1, yw + 0.1, -3.47, 12); b.cyl(M.alu, V(184.1, yw + 0.08, -3.47), V(184.1, yw + 0.1, -3.47), 0.01, 5);
    b.box(M.white, 0.06, 0.04, 0.003, 184.1, yw + 0.04, -3.408);
    // Speiseaufzug: Zarge, Schiebetür mit Griff, Klingelknopf, Meldelampe, Schild
    const wl = W('z+', -3.45);
    frame4(wl, 180.99, 181.61, y + 0.89, y + 1.51, 0, 0.012, 0.03, M.alu);
    wl.bb(M.alu, 181.02, 181.58, y + 0.92, y + 1.48, 0.003, 0.008);
    for (const yy of [1.1, 1.3]) wl.bb(M.aluDark, 181.02, 181.58, y + yy, y + yy + 0.006, 0.008, 0.01);
    wl.cyl(M.brass, 181.22, y + 1.0, 0.035, 181.38, y + 1.0, 0.035, 0.01, 6);
    for (const u of [181.22, 181.38]) wl.cyl(M.brass, u, y + 1.0, 0.008, u, y + 1.0, 0.035, 0.007, 5);
    wl.cyl(M.brass, 181.665, y + 1.25, 0, 181.665, y + 1.25, 0.012, 0.022, 10); wl.sph(M.red, 0.01, 181.665, y + 1.25, 0.015, 1, 1, 1, 6);
    wl.sph(M.lamp, 0.012, 181.665, y + 1.36, 0.01, 1, 1, 1, 6);
    wl.sign('Zur Anrichte', 181.3, y + 0.8, 0.04, 'alu');
    // Wandborde an der Achterwand (Teller, Tassen, Schüsseln) mit Schlingerleisten
    const wa = W('x+', KU.x0);
    [1.2, 1.55, 1.9].forEach((yy, k) => {
      wa.bb(M.woodLight, -3.4, -2.2, y + yy, y + yy + 0.025, 0, 0.28);
      wa.cyl(M.alu, -3.4, y + yy + 0.07, 0.265, -2.2, y + yy + 0.07, 0.265, 0.006, 4);
      for (const u of [-3.35, -2.25]) { wa.cyl(M.alu, u, y + yy, 0.265, u, y + yy + 0.07, 0.265, 0.005, 4); wa.bb(M.alu, u - 0.01, u + 0.01, y + yy - 0.12, y + yy, 0, 0.02); }
      for (let i = 0; i < 4; i++) {
        const p = wa.P(-3.25 + i * 0.3, y + yy + 0.025, 0.14);
        if (k === 0) for (const dd of [-0.07, 0.06]) b.vcyl(M.enamel, 0.036, 0.07, p.x + dd, p.y, p.z + 0.08 * (i % 2 ? 1 : -1), 8, 0.042);
        if (k === 1) b.vcyl(M.enamel, 0.11, 0.06 + (i % 2) * 0.03, p.x, p.y, p.z, 14);
        if (k === 2) b.vcyl(i % 2 ? M.glassClear : M.enamel, 0.06, 0.1, p.x, p.y, p.z, 10, 0.1);
      }
    });
    // Borde über dem Innentisch an der Kielgangwand: Tassen an Haken, Tellerstapel, Gewürzdosen; Pfannengestell unter der Decke
    const wk = W('z-', KU.z1);
    for (const yy of [1.35, 1.7]) wk.bb(M.woodLight, 181.05, 183.35, y + yy, y + yy + 0.025, 0, 0.22);
    for (let u = 181.15; u < 183.3; u += 0.2) {
      wk.cyl(M.brass, u, y + 1.35, 0.12, u, y + 1.31, 0.12, 0.004, 4);
      const p = wk.P(u, y + 1.22, 0.12); b.vcyl(M.enamel, 0.034, 0.075, p.x, p.y, p.z, 8, 0.04);
    }
    for (let k = 0; k < 5; k++) { const p = wk.P(181.3 + k * 0.45, y + 1.725, 0.12); b.vcyl(M.enamel, 0.1, 0.05 + (k % 3) * 0.02, p.x, p.y, p.z, 14); }
    for (let k = 0; k < 10; k++) { const p = wk.P(181.15 + k * 0.08, y + 1.375, 0.1); b.vcyl([M.red, M.white, M.brass][k % 3], 0.028, 0.08, p.x, p.y, p.z, 8); }
    b.cyl(M.alu, V(181.3, y + 1.92, -0.98), V(183.1, y + 1.92, -0.98), 0.012, 6);
    for (const x of [181.4, 182.2, 183.0]) b.cyl(M.alu, V(x, y + 1.92, -0.98), V(x, BC, -0.98), 0.008, 5);
    [[181.5, 'pot'], [181.8, 'pan'], [182.1, 'pot'], [182.45, 'pan'], [182.75, 'pot'], [183.0, 'ladle']].forEach(([x, t], k) => {
      b.cyl(M.alu, V(x, y + 1.92, -0.98), V(x, y + 1.78, -0.98), 0.005, 4);
      if (t === 'pot') b.vcyl(k % 2 ? X.copper : M.alu, 0.1, 0.12, x, y + 1.62, -0.98, 12);
      if (t === 'pan') { b.cyl(X.copper, V(x, y + 1.66, -1.0), V(x, y + 1.66, -0.96), 0.12, 14); b.cyl(M.woodDark, V(x, y + 1.78, -0.98), V(x, y + 1.72, -0.98), 0.01, 5); }
      if (t === 'ladle') b.sph(M.alu, 0.04, x, y + 1.76, -0.98, 1, 0.6, 1, 8);
    });
    // Vorderwand neben dem Herd: Speisekarte (Kreidetafel), Feuerlöscher
    const wv = W('x-', KU.x1);
    wv.bb(M.woodDark, -0.94, -0.6, y + 1.26, y + 1.74, 0, 0.012);
    wv.panel('bd_menue', (g, w, h) => {
      g.fillStyle = '#283028'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e8dc'; g.font = 'bold 14px Georgia'; g.textAlign = 'center'; g.fillText('Heute', w / 2, 20);
      g.globalAlpha = 0.75; for (let i = 0; i < 8; i++) g.fillRect(16, 34 + i * 11, 40 + (i * 29) % 50, 2); g.globalAlpha = 1;
    }, -0.77, y + 1.5, 0.3, 0.44, 0.014);
    ext(wv, -0.77, y + 0.15);
  }
  // OFFIZIERSMESSE (decks.js: Rundtisch (186.45, −2.2) r 0,5, Platte YP+0.74; Bänke außen und vorn; drei Stühle)
  function offiziere() {
    const y = YP, cx = 186.45, cz = -2.2, yt = y + 0.74;
    b.vcyl(M.linen, 0.53, 0.12, cx, yt - 0.115, cz, 20);
    for (const a of [Math.PI / 2, Math.PI * 0.75, Math.PI, Math.PI * 1.25]) setting(cx + Math.sin(a) * 0.3, yt + 0.006, cz + Math.cos(a) * 0.3, a);
    b.vcyl(M.brass, 0.05, 0.01, cx, yt + 0.006, cz, 10);
    for (const [dx, m] of [[-0.025, M.white], [0.025, M.black]]) b.vcyl(m, 0.012, 0.055, cx + dx, yt + 0.016, cz + 0.02, 6);
    b.vcyl(M.glassClear, 0.014, 0.09, cx, yt + 0.016, cz - 0.03, 8); b.cyl(M.brass, V(cx - 0.05, yt + 0.016, cz), V(cx - 0.05, yt + 0.12, cz), 0.005, 4);
    b.vcyl(M.glassClear, 0.03, 0.12, cx + 0.08, yt + 0.006, cz + 0.08, 8, 0.02); b.cyl(M.plant, V(cx + 0.08, yt + 0.12, cz + 0.08), V(cx + 0.1, yt + 0.24, cz + 0.07), 0.004, 4);
    b.sph(M.red, 0.025, cx + 0.1, yt + 0.25, cz + 0.07, 1, 1, 1, 8);
    // Geschirrschrank an der Kielgangwand
    const wk = W('z-', OM.z1);
    const dO = gap('Offiziersmesse', 'z', -ZK, [185.5, 186.2]);
    cupboard(wk, dO[1] + 0.15, 187.1, y, 1.85);
    nav.block(dO[1] + 0.15, 187.1, OM.z1 - 0.38, OM.z1, y, y + 2);
    // Garderobe an der Achterwand, Rahmen um das Wandbild
    const wa = W('x+', OM.x0);
    wa.bb(M.woodDark, -1.25, -0.62, y + 1.62, y + 1.7, 0, 0.025); wa.bb(M.woodDark, -1.25, -0.62, y + 1.86, y + 1.88, 0, 0.24);
    jacket(wa, -1.05, y + 1.66, true); cap(wa, -1.05, y + 1.88, 0.12, true); cap(wa, -0.78, y + 1.88, 0.12);
    wa.cyl(M.brass, -0.78, y + 1.66, 0, -0.78, y + 1.66, 0.05, 0.006, 5);
    frame4(wa, -2.7, -1.3, y + 1.2, y + 1.8, 0, 0.025, 0.035, M.woodDark);
    // Vorderwand: Uhr, Barometer, Foto
    const wv = W('x-', OM.x1);
    clock(wv, -2.0, y + 1.6);
    wv.cyl(M.brass, -2.75, y + 1.6, 0, -2.75, y + 1.6, 0.03, 0.1, 16); wv.gauge(-2.75, y + 1.6, 0.17, 'Luftdruck', 5, '#f4efe0', 0.033);
    wv.bb(M.woodDark, -1.38, -0.98, y + 1.38, y + 1.7, 0, 0.012); wv.panel('bd_foto127', fotoPanel, -1.18, y + 1.54, 0.34, 0.26, 0.014);
  }
  // KABINENANBAU 1937 (Bucht 11, Steuerbord): Gang mit Läufer, Leuchten, Schilder, Ruftafel; drei WCs
  function anbau() {
    const y = BY, w = W('z+', AG.z0);
    const kd = zoneOf('Zugang Kabinen 1937');
    const KD = kd ? [kd.x0 - 0.04, kd.x1 + 0.04] : [169.0, 169.7];
    const wcDoors = nav.zones.filter((q) => q.name === 'WC (1937)' && Math.abs(q.z1 - q.z0 - 0.64) < 0.02).map((q) => [q.x0 - 0.04, q.x1 + 0.04]);
    // Läufer mit Kantenband und Messingschienen
    const lx0 = AG.x0 + 0.12, lx1 = 172.05, lz0 = AG.z0 + 0.13, lz1 = AG.z1 - 0.13;
    b.bb(M.carpetRed, lx0, lx1, y + 0.002, y + 0.012, lz0, lz1);
    for (const z of [lz0 + 0.03, lz1 - 0.05]) b.bb(M.trim, lx0, lx1, y + 0.012, y + 0.0135, z, z + 0.02);
    for (const x of [lx0, lx1 - 0.03]) b.bb(M.brass, x, x + 0.03, y + 0.002, y + 0.016, lz0 - 0.01, lz1 + 0.01);
    // Leuchtenringe an den Gangleuchten aus decks.js, Wandleuchten
    for (let x = 160.5; x < 172.5; x += 2.5) { b.vcyl(M.alu, 0.1, 0.012, x, BC - 0.015, 2.78, 12); b.torus(M.brass, 0.085, 0.006, x, BC - 0.05, 2.78, 'y', 14); }
    const free = (u, half) => ![...wcDoors, KD].some(([a, c]) => u + half > a - 0.08 && u - half < c + 0.08);
    for (const u of [160.4, 163.9, 165.6, 167.9, 172.3]) if (free(u, 0.06)) sconce(w, u, y + 1.85);
    if (free(161.6, 0.12)) ext(w, 161.6, y + 0.2);
    // Schilder und Wegweiser
    w.sign('Kielgang – nur Besatzung', (KD[0] + KD[1]) / 2, y + 2.16, 0.06, 'red');
    if (free(170.6, 0.2)) w.sign('Treppe zum A-Deck →', 170.6, y + 1.75, 0.06, 'brass');
    if (free(171.5, 0.25)) {
      w.bb(M.woodDark, 171.3, 171.7, y + 1.71, y + 1.99, 0, 0.02);
      w.panel('bd_ruftafel', (g, ww, hh) => {
        g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, ww, hh); g.font = 'bold 9px Arial'; g.textAlign = 'center';
        for (let i = 0; i < 20; i++) { const cx = 14 + (i % 5) * 25, cy = 22 + Math.floor(i / 5) * 28; g.fillStyle = i === 7 ? '#f2c040' : '#3a3c40'; g.fillRect(cx - 9, cy - 8, 18, 14); g.fillStyle = '#d9d2bc'; g.fillText(String(51 + i), cx, cy + 16); }
      }, 171.5, y + 1.85, 0.36, 0.24, 0.022);
      w.sign('Ruftafel', 171.5, y + 2.08, 0.035, 'brass', 0.022);
    }
    // WCs: Spülkasten, Deckel, Papierhalter, Spiegel, Armaturen, Handtuchhalter, Haken, Abfalleimer
    for (const r of WCS) {
      const xa = r.x0 - 0.04, wcW = r.x1 - r.x0 + 0.08, xm = xa + wcW / 2, zt = r.z0 + 0.24;
      const ws = W('x+', r.x0), wb = W('z+', r.z0), wp = W('x-', r.x1), wd = W('z-', r.z1);
      ws.bb(M.enamel, zt - 0.14, zt + 0.14, y + 0.75, y + 1.1, 0, 0.17);
      ws.cyl(M.alu, zt, y + 0.75, 0.1, zt, y + 0.4, 0.2, 0.012, 5);
      ws.cyl(M.brass, zt + 0.14, y + 1.02, 0.12, zt + 0.21, y + 1.02, 0.12, 0.007, 5); ws.sph(M.white, 0.015, zt + 0.22, y + 1.02, 0.12, 1, 1, 1, 6);
      ws.bb(M.white, zt - 0.16, zt + 0.16, y + 0.43, y + 0.82, 0.18, 0.2);
      wb.bb(M.brass, xm - 0.05, xm + 0.09, y + 0.66, y + 0.74, 0, 0.008);
      wb.cyl(M.white, xm - 0.03, y + 0.66, 0.075, xm + 0.07, y + 0.66, 0.075, 0.052, 12);
      const bx = xa + 1.45;
      wb.bb(M.alu, bx - 0.17, bx + 0.17, y + 1.08, y + 1.52, 0, 0.008); wb.bb(X.mirror, bx - 0.15, bx + 0.15, y + 1.1, y + 1.5, 0.008, 0.012);
      b.bb(X.basin, bx - 0.13, bx + 0.13, y + 0.88, y + 0.884, r.z0 + 0.06, r.z0 + 0.26);
      for (const [dx, m] of [[-0.08, M.red], [0.08, M.upBlue]]) { b.vcyl(M.alu, 0.008, 0.06, bx + dx, y + 0.88, r.z0 + 0.04, 5); b.sph(m, 0.013, bx + dx, y + 0.95, r.z0 + 0.04, 1, 1, 1, 6); }
      b.cyl(M.alu, V(bx, y + 0.95, r.z0 + 0.03), V(bx, y + 0.93, r.z0 + 0.1), 0.008, 5);
      wp.cyl(M.alu, 1.55, y + 1.05, 0.05, 1.95, y + 1.05, 0.05, 0.008, 5);
      for (const u of [1.55, 1.95]) wp.cyl(M.alu, u, y + 1.05, 0, u, y + 1.05, 0.05, 0.007, 5);
      wp.bb(M.linen, 1.58, 1.92, y + 0.66, y + 1.04, 0.035, 0.052);
      wd.cyl(M.brass, xa + 0.3, y + 1.65, 0, xa + 0.3, y + 1.65, 0.06, 0.007, 5); wd.sph(M.brass, 0.012, xa + 0.3, y + 1.67, 0.06, 1, 1, 1, 6);
      b.vcyl(M.alu, 0.08, 0.26, xm + 0.2, y, r.z0 + 0.14, 10, 0.09);
    }
  }
}
