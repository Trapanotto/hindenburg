// Detailmodul: Außenseite der LZ 129 – Hülle, Leitwerk, Maschinengondeln, Bug und Heck.
// Grundlage: research/rumpf.md (A6, A7, A10, A11) und die Geometrie aus hull.js.
// (Führergondel außen, Fallreep-Klappen, Schriftzug, Kennzeichen und Olympiaringe gehören nicht hierher.)
import * as THREE from 'three';
import { V, QuadBuf } from './util.js';
import { rLin, ST, MAIN, ENG, D2R, GX0, GX1, WIN_A, WIN_B, FALLREEP, FIN_OUT, finT, X_TAIL, X_BOW } from './hull.js';

export default function (C) {
  const { b, M } = C;

  // ---------- lokale Materialien ----------
  const capMat = new THREE.MeshPhongMaterial({ color: 0x8e959c, specular: 0x777777, shininess: 45, side: THREE.DoubleSide });
  const winMat = new THREE.MeshPhongMaterial({ color: 0x1f2c35, specular: 0x9aaab4, shininess: 90 });

  // ---------- Grundbausteine ----------
  // Jede Baugruppe (part) geht als eigenes Teil an den Builder; der staffelt nach Größe und Entfernung.
  let CUR = null;
  function part(fn) {
    const prev = CUR, mine = new Map(); CUR = mine;
    try { fn(); } finally { CUR = prev; for (const [m, q] of mine) if (!q.empty) b.add(m, q.geo()); }
  }
  function Q(mat, fill) {
    if (CUR) { let q = CUR.get(mat); if (!q) CUR.set(mat, (q = new QuadBuf())); fill(q); return; }
    const q = new QuadBuf(); fill(q); if (!q.empty) b.add(mat, q.geo());
  }
  let MZ = false;                                        // Spiegelung an z = 0 (Backbord)
  const W = (p) => (MZ ? V(p.x, p.y, -p.z) : p.clone());
  const mir = (s, fn) => { const o = MZ; MZ = s < 0; try { fn(); } finally { MZ = o; } };

  /** Quader mit orthonormalen Achsen (Mittelpunkt c, volle Kantenlängen). open: nur Oberseite (+ey) und Längsseiten (±ex). */
  function obox(mat, c, ex, ey, ez, sx, sy, sz, open = false) {
    c = W(c); ex = W(ex); ey = W(ey); ez = W(ez);
    const ax = [ex.multiplyScalar(sx / 2), ey.multiplyScalar(sy / 2), ez.multiplyScalar(sz / 2)];
    Q(mat, (q) => {
      for (let i = 0; i < 3; i++) for (const sg of [1, -1]) {
        if (open && (i === 2 || (i === 1 && sg < 0) || (open === 2 && i === 0))) continue;
        const A = ax[i], B = ax[(i + 1) % 3], D = ax[(i + 2) % 3];
        const fc = c.clone().addScaledVector(A, sg);
        const p1 = fc.clone().sub(B).sub(D), p2 = fc.clone().add(B).sub(D), p3 = fc.clone().add(B).add(D), p4 = fc.clone().sub(B).add(D);
        if (new THREE.Vector3().crossVectors(B, D).dot(A) * sg >= 0) q.quad(p1, p2, p3, p4); else q.quad(p1, p4, p3, p2);
      }
    });
  }
  /** Leiste von p1 nach p2: Breite w quer, Dicke t in Richtung nH (offen: Unterseite und Stirnseiten fehlen). */
  function seg(mat, p1, p2, nH, w, t, open = true) {
    const ez = new THREE.Vector3().subVectors(p2, p1), len = ez.length(); if (len < 1e-4) return; ez.divideScalar(len);
    const ex = new THREE.Vector3().crossVectors(nH, ez); if (ex.lengthSq() < 1e-10) return; ex.normalize();
    const ey = new THREE.Vector3().crossVectors(ez, ex);
    obox(mat, p1.clone().add(p2).multiplyScalar(0.5), ex, ey, ez, w, t, len, open);
  }
  /** Nietkopf als flache dreiseitige Pyramide auf einer Fläche mit Normale n */
  function dot(mat, p, n, sz) {
    p = W(p); n = W(n).normalize();
    const e1 = Math.abs(n.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0); e1.addScaledVector(n, -e1.dot(n)).normalize();
    const e2 = new THREE.Vector3().crossVectors(n, e1);
    const bs = [0, 1, 2].map((k) => p.clone().addScaledVector(e1, Math.cos(k * 2.0944) * sz / 2).addScaledVector(e2, Math.sin(k * 2.0944) * sz / 2));
    const ap = p.clone().addScaledVector(n, sz * 0.4);
    Q(mat, (q) => { for (let k = 0; k < 3; k++) q.tri(bs[k], bs[(k + 1) % 3], ap, [0, 0], [1, 0], [0.5, 1]); });
  }
  /** Zylinder; dünne Rohre und Seile ohne Deckflächen (spart Eckpunkte) */
  function bcyl(mat, a, c, r, sg = 8, r2 = r) {
    if (r > 0.05 || r2 > 0.05) return b.cyl(mat, a, c, r, sg, r2);
    const d = new THREE.Vector3().subVectors(c, a), len = d.length(); if (len < 1e-5) return;
    const m = new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1));
    b.add(mat, new THREE.CylinderGeometry(r2, r, len, sg, 1, true), m);
  }
  const cy = (mat, a, c, r, sg = 8, r2 = r) => bcyl(mat, W(a), W(c), r, sg, r2);
  const sp = (mat, r, p, sx = 1, sy = 1, sz = 1, sg = 10) => { const q = W(p); b.sph(mat, r, q.x, q.y, q.z, sx, sy, sz, sg); };
  function ring(mat, c, axis, R, r, sg = 14) {
    c = W(c); axis = W(axis).normalize();
    const e1 = Math.abs(axis.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0); e1.addScaledVector(axis, -e1.dot(axis)).normalize();
    const e2 = new THREE.Vector3().crossVectors(axis, e1);
    b.add(mat, new THREE.TorusGeometry(R, r, 4, sg), new THREE.Matrix4().makeBasis(e1, e2, axis).setPosition(c));
  }

  // ---------- Hüllgeometrie (36-Eck, stückweise linear zwischen den Spanten) ----------
  const COS5 = Math.cos(5 * D2R);
  const n360 = (a) => ((a % 360) + 360) % 360;
  const isV = (a) => { const k = n360(a) / 10; return Math.abs(k - Math.round(k)) < 1e-6; };
  const fcA = (a) => (isV(a) ? a : Math.floor(n360(a) / 10) * 10 + 5);
  function rPoly(x, a) { const r = rLin(x); if (isV(a)) return r; const m = n360(a); return r * COS5 / Math.cos((m - (Math.floor(m / 10) * 10 + 5)) * D2R); }
  /** Punkt auf der echten (facettierten) Hüllfläche, dr radial nach außen */
  const hs = (x, a, dr = 0) => { const r = rPoly(x, a) + dr, t = a * D2R; return V(x, -r * Math.cos(t), r * Math.sin(t)); };
  const slope = (x) => (rLin(x + 0.02) - rLin(x - 0.02)) / 0.04;
  const nrm = (x, a) => { const t = fcA(a) * D2R; return V(-slope(x), -Math.cos(t), Math.sin(t)).normalize(); };
  /** lokales Hüllsystem: p Flächenpunkt, n außen, t längs (+x), u in Umfangsrichtung (wachsender Winkel) */
  function frame(x, a) {
    const n = nrm(x, a), t = a * D2R, u0 = V(0, Math.sin(t), Math.cos(t));
    const tx = new THREE.Vector3().crossVectors(u0, n).normalize();
    return { p: hs(x, a), n, t: tx, u: new THREE.Vector3().crossVectors(n, tx) };
  }
  const at = (F, du, dn, dx) => F.p.clone().addScaledVector(F.u, du).addScaledVector(F.n, dn).addScaledVector(F.t, dx);
  const fb = (mat, F, du, dn, dx, su, sn, sx) => obox(mat, at(F, du, dn, dx), F.u.clone(), F.n.clone(), F.t.clone(), su, sn, sx);
  /** Längsleiste in konstantem Winkel, an den Spanten geteilt */
  function lstrip(mat, xa, xb, a, w, t, dr, op = 1) {
    const xs = [xa, ...ST.filter((s) => s > xa + 0.05 && s < xb - 0.05), xb];
    for (let i = 0; i < xs.length - 1; i++) seg(mat, hs(xs[i], a, dr), hs(xs[i + 1], a, dr), nrm((xs[i] + xs[i + 1]) / 2, a), w, t, op);
  }
  /** Umfangsleiste bei x, an den Längsträgern geteilt */
  function cstrip(mat, x, a0, a1, w, t, dr, op = 1) {
    const as = [a0]; for (let k = Math.floor(a0 / 10) + 1; k * 10 < a1 - 0.05; k++) as.push(k * 10); as.push(a1);
    for (let i = 0; i < as.length - 1; i++) seg(mat, hs(x, as[i], dr), hs(x, as[i + 1], dr), nrm(x, (as[i] + as[i + 1]) / 2), w, t, op);
  }
  /** Intervall-Liste minus [lo, hi] */
  const cut = (iv, lo, hi) => iv.flatMap(([a, c]) => (hi <= a || lo >= c ? [[a, c]] : [...(lo > a ? [[a, lo]] : []), ...(hi < c ? [[hi, c]] : [])]));

  // ---------- Sperrzonen der Hülle ----------
  // offene oder anders belegte Hüllfelder [x0, x1, j]: Fenster, Fallreeps, Führergondel, Gondelluken
  const OPEN = [];
  for (const j of [...WIN_A, ...WIN_B]) for (const jj of [j, 35 - j]) OPEN.push([173, 188, jj]);
  for (const j of [0, 35]) { OPEN.push([FALLREEP.x0, FALLREEP.x1, j]); OPEN.push([GX0, GX1, j]); }
  for (const e of ENG) for (const j of e.js) OPEN.push([e.x - 0.6, e.x + 0.6, j]);
  const KOL = [];   // gesperrte Abschnitte auf Längsträgern [a, x0, x1]
  const KOC = [];   // gesperrte Winkel auf Ringen [x, a0, a1]
  const FIN_A = [0, 90, 180, 270];
  const finHalf = (x) => 1.75 * finT(rLin(x));          // halbe Flossendicke an der Wurzel
  function freeL(a, xa, xb) {
    const J = Math.round(n360(a) / 10) % 36, Jm = (J + 35) % 36;
    let iv = [[xa, xb]];
    for (const [x0, x1, j] of OPEN) if (j === J || j === Jm) iv = cut(iv, x0 - 0.15, x1 + 0.15);
    for (const [ka, x0, x1] of KOL) if (Math.abs(n360(ka) - n360(a)) < 0.1) iv = cut(iv, x0, x1);
    if (FIN_A.includes(n360(a))) iv = cut(iv, 0, 53);
    return iv.filter(([p, q]) => q - p > 0.25);
  }
  function freeC(x, j) {
    for (const [x0, x1, jj] of OPEN) if (jj === j && x > x0 - 0.2 && x < x1 + 0.2) return [];
    let iv = [[j * 10, j * 10 + 10]];
    if (x < 53.5) { const d = (finHalf(x) + 0.18) / rLin(x) / D2R; for (const f of [0, 90, 180, 270, 360]) iv = cut(iv, f - d, f + d); }
    for (const [kx, a0, a1] of KOC) if (Math.abs(kx - x) < 0.6) iv = cut(iv, a0, a1);
    return iv.filter(([p, q]) => q - p > 0.4);
  }

  // Lage der Rückenaufbauten (vorab, damit Leisten dort ausgespart werden)
  const GAS = [62, 92, 123.5, 156.5, 188, 218].map((m) => m + 0.42);   // Gasschächte (wie die Schächte im Kiel, knapp vor dem Ring)
  const HATCH = [62, 123.5, 188].map((m) => m + 1.6);                  // Ausstiege am Schiffsrücken
  for (const x of GAS) { KOL.push([180, x - 0.6, x + 0.6]); const r = rLin(x), d = 0.62 / r / D2R; KOC.push([x - 0.42, 180 - d, 180 + d]); }
  for (const x of HATCH) KOL.push([180, x - 0.6, x + 0.6]);

  // =====================================================================
  // 1. Schnürleisten / Abdeckstreifen auf den 36 Längsträgern
  // =====================================================================
  const FIELDS = [9, ...MAIN, 244.35];
  for (let j = 0; j < 36; j++) {
    const a = j * 10;
    for (let i = 0; i < FIELDS.length - 1; i++) {
      const iv = freeL(a, FIELDS[i], FIELDS[i + 1]);
      if (iv.length) part(() => { for (const [xa, xb] of iv) lstrip(M.hullSeam, xa, xb, a, 0.2, 0.03, 0.06, 2); });
    }
  }

  // =====================================================================
  // 2. Abdeckbänder über den 15 Hauptringen, Randband an Bug- und Heckkappe
  // =====================================================================
  for (const x of MAIN) for (let qd = 0; qd < 4; qd++) part(() => {
    for (let j = qd * 9; j < qd * 9 + 9; j++) for (const [a0, a1] of freeC(x, j)) cstrip(M.hullSeam, x, a0, a1, 0.32, 0.04, 0.065, 2);
  });
  part(() => { for (let j = 0; j < 36; j++) cstrip(M.aluDark, 244.5, j * 10, j * 10 + 10, 0.12, 0.04, 0.07); });

  // =====================================================================
  // 3. Schiffsrücken: Entlüftungshutzen, Gasschacht-Hauben, Ausstiegsluken
  // =====================================================================
  function hutze(x, a) {
    part(() => {
      const F = frame(x, a);
      fb(M.aluDark, F, 0, 0.075, 0, 0.5, 0.05, 0.8);
      fb(M.alu, F, 0, 0.25, 0, 0.4, 0.3, 0.6);
      fb(M.black, F, 0, 0.3, -0.305, 0.34, 0.24, 0.012);                  // Öffnung nach achtern
    });
    const F = frame(x, a);
    cy(M.alu, at(F, 0, 0.4, -0.3), at(F, 0, 0.4, 0.3), 0.2, 10);
  }
  for (let i = 3; i < MAIN.length - 1; i++) for (const s of [1, -1]) mir(s, () => hutze(MAIN[i] - 2.6, 165));

  function gasHaube(x) {
    const F = frame(x, 180);
    cy(M.aluDark, at(F, 0, 0.04, 0), at(F, 0, 0.12, 0), 0.5, 14);
    cy(M.alu, at(F, 0, 0.12, 0), at(F, 0, 0.5, 0), 0.38, 14);
    cy(M.black, at(F, 0, 0.5, 0), at(F, 0, 0.515, 0), 0.35, 14);
    part(() => { for (let k = 0; k < 4; k++) { const w = k * Math.PI / 2 + Math.PI / 4; fb(M.aluDark, F, 0.3 * Math.cos(w), 0.6, 0.3 * Math.sin(w), 0.04, 0.2, 0.04); } });
    cy(M.alu, at(F, 0, 0.7, 0), at(F, 0, 0.78, 0), 0.62, 14);
    cy(M.alu, at(F, 0, 0.78, 0), at(F, 0, 0.92, 0), 0.58, 14, 0.14);
  }
  for (const x of GAS) gasHaube(x);
  // Gasschacht an Ring 33,5 tritt an der Spitze der oberen Flosse aus
  { const y0 = FIN_OUT[9][1] + 0.48;
    bcyl(M.aluDark, V(33.5, y0, 0), V(33.5, y0 + 0.08, 0), 0.32, 12);
    bcyl(M.alu, V(33.5, y0 + 0.08, 0), V(33.5, y0 + 0.32, 0), 0.22, 12);
    bcyl(M.alu, V(33.5, y0 + 0.42, 0), V(33.5, y0 + 0.5, 0), 0.36, 12, 0.08);
    part(() => { for (const d of [-0.16, 0.16]) obox(M.aluDark, V(33.5 + d, y0 + 0.37, 0), V(1, 0, 0), V(0, 1, 0), V(0, 0, 1), 0.03, 0.12, 0.03); }); }

  for (const x of HATCH) part(() => {                                          // Ausstiege der Leiterschächte
    const F = frame(x, 180);
    for (const d of [-0.45, 0.45]) { fb(M.aluDark, F, d, 0.1, 0, 0.06, 0.08, 0.96); fb(M.aluDark, F, 0, 0.1, d, 0.84, 0.08, 0.06); }
    fb(M.alu, F, 0, 0.1, 0, 0.84, 0.04, 0.84);
    for (const d of [-0.25, 0.25]) seg(M.steel, at(F, d - 0.08, 0.13, -0.5), at(F, d + 0.08, 0.13, -0.5), F.n, 0.05, 0.05, false);
    seg(M.steel, at(F, -0.1, 0.15, 0.36), at(F, 0.1, 0.15, 0.36), F.n, 0.025, 0.025, false);
  });

  // =====================================================================
  // 4. Regenabweiser über den Fensterbändern (A-Deck: Felder 3–4, B-Deck: Feld 1)
  // =====================================================================
  const topA = (Math.max(...WIN_A) + 1) * 10, topB = (Math.max(...WIN_B) + 1) * 10;
  for (const s of [1, -1]) for (const a of [topA + 1.6, topB + 1.6]) mir(s, () => part(() => {
    const xs = [173.2, ...ST.filter((x) => x > 173.5 && x < 187.5), 187.8], k = Math.sin(25 * D2R), kc = Math.cos(25 * D2R);
    for (let i = 0; i < xs.length - 1; i++) {
      const Fa = frame(xs[i], a), Fb = frame(xs[i + 1], a);
      seg(M.hullSeam, at(Fa, 0, 0.07, 0), at(Fb, 0, 0.07, 0), Fa.n, 0.12, 0.03);
      const da = Fa.n.clone().multiplyScalar(kc).addScaledVector(Fa.u, -k), db = Fb.n.clone().multiplyScalar(kc).addScaledVector(Fb.u, -k);
      seg(M.aluDark, at(Fa, 0, 0.075, 0).addScaledVector(da, 0.08), at(Fb, 0, 0.075, 0).addScaledVector(db, 0.08), da, 0.025, 0.16, false);
    }
    for (const x of [173.2, 187.8]) { const F = frame(x, a); fb(M.aluDark, F, -0.03, 0.14, 0, 0.1, 0.14, 0.025); }
  }));

  // =====================================================================
  // 5. Klappen und Luken an der Unterseite
  // =====================================================================
  function hatch(x0, x1, a0, a1, hingeAtX0 = true) {
    part(() => {
      const mt = M.aluDark;
      lstrip(mt, x0, x1, a0, 0.07, 0.03, 0.08); lstrip(mt, x0, x1, a1, 0.07, 0.03, 0.08);
      cstrip(mt, x0, a0, a1, 0.07, 0.03, 0.08); cstrip(mt, x1, a0, a1, 0.07, 0.03, 0.08);
      const Fh = frame(hingeAtX0 ? x1 - 0.18 : x0 + 0.18, (a0 + a1) / 2);
      fb(M.black, Fh, 0, 0.1, 0, 0.24, 0.02, 0.08);                         // Griffmulde
    });
    const xh = hingeAtX0 ? x0 : x1;
    for (const f of [0.22, 0.78]) { const F = frame(xh, a0 + (a1 - a0) * f); cy(M.steel, at(F, -0.12, 0.1, 0), at(F, 0.12, 0.1, 0), 0.03, 6); }
  }
  for (const s of [1, -1]) mir(s, () => {
    hatch(151.5, 153.5, 2, 8, true);                                        // Frachtluken
    hatch(225.6, 227.2, 17, 25, false);                                     // Landeleinen-Klappen im Bug
  });
  hatch(234.4, 235.6, -3, 3, false);                                        // Landeleinen-Klappe Bugunterseite

  // Rahmen und Regenkante um die Gondelluken (Laufsteg nach außen)
  for (const e of ENG) mir(e.side, () => part(() => {
    const j = e.side > 0 ? Math.min(...e.js) : 35 - Math.max(...e.js), a0 = j * 10, a1 = a0 + 10 * e.js.length;
    lstrip(M.aluDark, e.x - 0.68, e.x + 0.68, a0 - 0.5, 0.07, 0.03, 0.08);
    lstrip(M.aluDark, e.x - 0.68, e.x + 0.68, a1 + 0.5, 0.07, 0.03, 0.08);
    for (const x of [e.x - 0.68, e.x + 0.68]) cstrip(M.aluDark, x, a0 - 0.5, a1 + 0.5, 0.07, 0.03, 0.08);
    const F0 = frame(e.x - 0.7, a1 + 1.2), F1 = frame(e.x + 0.7, a1 + 1.2);
    seg(M.aluDark, at(F0, 0, 0.1, 0), at(F1, 0, 0.1, 0), F0.n.clone().add(F0.u).normalize(), 0.03, 0.14, false);
  }));

  // =====================================================================
  // 6. Stichkiel-Verkleidungen über den Gondeln (hinten Ring 92–107 ≈ 43°, vorn 140–153 ≈ 57°)
  // =====================================================================
  for (const [x0, x1, a] of [[92.25, 106.75, 43], [140.25, 153, 57]]) for (const s of [1, -1]) mir(s, () => part(() => {
    lstrip(M.hullSeam, x0, x1, a, 0.56, 0.035, 0.055);
    for (const d of [-0.3, 0.3]) lstrip(M.aluDark, x0, x1, a + d / rLin((x0 + x1) / 2) / D2R, 0.04, 0.025, 0.075);
    for (let x = x0 + 1.5; x < x1 - 1; x += 3) { const F = frame(x, a); fb(M.aluDark, F, 0, 0.083, 0, 0.42, 0.02, 0.5); }
    for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.9) { const F = frame(x, a); for (const d of [-0.25, 0.25]) dot(M.alu, at(F, d, 0.073, 0), F.n, 0.04); }
  }));

  // =====================================================================
  // 7. Ballastwasser-Auslässe (unter den Ballastsäcken aus keel.js)
  // =====================================================================
  function auslass(x, a, big = 1) {
    const F = frame(x, a);
    cy(M.aluDark, at(F, 0, 0.04, 0), at(F, 0, 0.09, 0), 0.13 * big, 10);
    cy(M.steel, at(F, 0, 0.09, 0), at(F, 0, 0.09 + 0.24 * big, 0), 0.065 * big, 8, 0.05 * big);
    cy(M.black, at(F, 0, 0.09 + 0.24 * big, 0), at(F, 0, 0.1 + 0.24 * big, 0), 0.042 * big, 8);
  }
  {
    const skip = (x, s) => (x > 166 && x < 194) || (x > 110 && x < 122) || (x > 196.5 && x < 209) || (s < 0 && x > 148 && x < 158) || ENG.some((e) => Math.abs(e.x - x) < 2.2) || [62, 123.5].some((l) => s < 0 && Math.abs(l - x) < 1.5);
    let ti = 0;
    for (let x = 46; x <= 224; x += 4.5) for (const s of [-1, 1]) {
      if (skip(x, s)) continue; ti++;
      if (ti % 5 !== 0 || (x > 150 && x < 155)) continue;
      const a = Math.asin(Math.min(0.9, 2.35 / rLin(x))) / D2R;
      mir(s, () => auslass(x, a));
    }
    for (const x of [228.5, 231]) for (const s of [1, -1]) mir(s, () => auslass(x, 9, 1.4)); // Notballast im Bug
  }

  // =====================================================================
  // 8. Haltegriffe und Ösen für die Bodenmannschaft
  // =====================================================================
  function griff(x, a) {
    part(() => {
      const F = frame(x, a);
      for (const d of [-0.25, 0.25]) { fb(M.aluDark, F, 0, 0.06, d, 0.08, 0.02, 0.08); seg(M.steel, at(F, 0, 0.07, d), at(F, 0, 0.17, d), F.t, 0.025, 0.025); }
      seg(M.steel, at(F, 0, 0.17, -0.27), at(F, 0, 0.17, 0.27), F.n, 0.03, 0.03);
    });
  }
  function oese(x, a) {
    const F = frame(x, a);
    part(() => fb(M.aluDark, F, 0, 0.09, 0, 0.16, 0.02, 0.16));
    cy(M.steel, at(F, 0, 0.1, 0), at(F, 0, 0.125, 0), 0.03, 6);
    ring(M.steel, at(F, 0, 0.19, 0), F.u, 0.06, 0.014, 8);
  }
  const busy = (x, a) => OPEN.some(([x0, x1, j]) => x > x0 - 0.6 && x < x1 + 0.6 && Math.abs(fcA(a) - (j * 10 + 5)) < 6);
  for (const x of ST.filter((x) => x >= 30 && x <= 232 && !(x > 170 && x < 190) && !(x > 195 && x < 211))) for (const s of [1, -1]) if (!busy(x, 15)) mir(s, () => griff(x, 15));
  for (const x of MAIN) for (const s of [1, -1]) if (!busy(x, 28)) mir(s, () => oese(x, 28));
  for (const a of [45, 95, 135, 185, 225, 275, 315]) oese(238.5, a);        // Abspannösen am Bug

  // =====================================================================
  // 9. Positionslichter
  // =====================================================================
  function navLight(x, a, mat) {
    part(() => {
      const F = frame(x, a);
      fb(M.aluDark, F, 0, 0.1, 0, 0.22, 0.08, 0.4);
      fb(M.aluDark, F, 0, 0.24, -0.16, 0.2, 0.2, 0.03);
      fb(M.aluDark, F, 0.14, 0.26, 0, 0.02, 0.18, 0.42);
    });
    sp(mat, 0.1, at(frame(x, a), 0, 0.24, 0.02), 1, 1, 1, 10);
  }
  mir(1, () => navLight(192.5, 90, M.navGreen));
  mir(-1, () => navLight(192.5, 90, M.navRed));
  { const F = frame(241.6, 180);                                            // Buglicht weiß
    part(() => { fb(M.aluDark, F, 0, 0.1, 0, 0.16, 0.06, 0.26); fb(M.aluDark, F, 0, 0.2, -0.12, 0.18, 0.16, 0.02); });
    sp(M.navWhite, 0.09, at(F, 0, 0.2, 0.02)); }
  // Hecklicht weiß an der Heckspitze
  bcyl(M.aluDark, V(X_TAIL - 0.005, 0, 0), V(X_TAIL - 0.75, 0, 0), 0.09, 10, 0.075);
  b.sph(M.navWhite, 0.075, X_TAIL - 0.8, 0, 0);

  // =====================================================================
  // 10. Bug- und Heckkappe, Ankerkonus
  // =====================================================================
  function capShell(xs, off) {
    part(() => Q(capMat, (q) => {
      const cp = (x, a) => hs(x, a).addScaledVector(nrm(x, a), off);
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < 36; j++) {
        const p = [cp(xs[i], j * 10), cp(xs[i + 1], j * 10), cp(xs[i + 1], j * 10 + 10), cp(xs[i], j * 10 + 10)];
        if (xs[i + 1] > xs[i]) q.quad(p[0], p[3], p[2], p[1]); else q.quad(p[0], p[1], p[2], p[3]);
      }
    }));
  }
  capShell([244.5, 245.0, 245.5, 245.85, 246.2, 246.4, 246.55], 0.045);
  capShell([3.5, 3.0, 2.5, 2.1], 0.04);
  part(() => { for (const x of [244.75, 245.3, 245.9]) for (let j = 0; j < 36; j++) { const a = j * 10 + 5, n = nrm(x, a); dot(M.alu, hs(x, a).addScaledVector(n, 0.055), n, 0.035); } });
  part(() => { for (let j = 0; j < 36; j++) cstrip(M.aluDark, 3.5, j * 10, j * 10 + 10, 0.1, 0.035, 0.06); });
  // Bugversteifungen: kräftigere Leisten auf jedem zweiten Längsträger vor Ring 233
  for (let j = 1; j < 36; j += 2) part(() => lstrip(M.aluDark, 233.3, 244.3, j * 10, 0.1, 0.03, 0.085));
  { const xb = X_BOW, coneR = (x) => 0.55 + (0.12 - 0.55) * (x - 244.5) / 2.7;  // Konus aus hull.js: 244,5 … 247,2
    ring(M.steel, V(xb - 0.04, 0, 0), V(1, 0, 0), 0.26, 0.04, 16);           // Kupplungsring am Hüllende
    ring(M.steel, V(246.95, 0, 0), V(1, 0, 0), coneR(246.95) + 0.02, 0.03, 14);
    part(() => { for (let k = 0; k < 6; k++) {
      const t = k * Math.PI / 3, P = (x, o) => V(x, (coneR(x) + o) * Math.cos(t), (coneR(x) + o) * Math.sin(t));
      seg(M.steel, P(xb + 0.04, 0.012), P(246.9, 0.012), V(0.16, Math.cos(t), Math.sin(t)).normalize(), 0.03, 0.03);
    } });
    b.sph(M.brass, 0.1, 247.2, 0, 0, 0.8, 1, 1, 10); }

  // =====================================================================
  // 11. Leitwerk (Kontur und Dicke wie in hull.js: FIN_OUT, finT, Fase 0,5 m)
  // =====================================================================
  // Flossenkörper nachbauen, um die tatsächliche Oberfläche (z über x, r) abzufragen
  const FT = (() => {                                                      // Flossenkörper (lokal, nur zum Abfragen)
    const sh = new THREE.Shape();
    const pts = [...FIN_OUT, ...[13.6, 16, 20, 24.5, 29, 33.5, 38, 42.5, 47].map((x) => [x, Math.max(0.3, rLin(x) - 0.45)])];
    sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]); sh.closePath();
    let g = new THREE.ExtrudeGeometry(sh, { depth: 2.5, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -1.25); if (g.index) g = g.toNonIndexed();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * finT(p.getY(i)));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  })();
  const RC = new THREE.Raycaster(), RO = V(0, 0, 5), RD = V(0, 0, -1);
  /** halbe Flossendicke an (x, r): erste Fläche von außen (+z-Seite) */
  function finZ(x, y) {
    RO.set(x, y, 5); RC.set(RO, RD);
    const h = RC.intersectObject(FT, false);
    return h.length ? h[0].point.z : -1;
  }
  const finN = (x, y, zs) => { const h = 0.05, fx = (finZ(x + h, y) - finZ(x - h, y)) / (2 * h), fy = (finZ(x, y + h) - finZ(x, y - h)) / (2 * h); return V(-fx, -fy, 1).normalize().multiply(V(1, 1, zs)); };
  // Flosse k: lokale Ebene (x, radial y, quer z), um x um k·90° gedreht (wie hull.js)
  const fp = (k, x, y, z) => { const c = Math.round(Math.cos(k * Math.PI / 2)), s = Math.round(Math.sin(k * Math.PI / 2)); return V(x, y * c - z * s, y * s + z * c); };
  const fv = (k, v) => fp(k, v.x, v.y, v.z);
  const finTop = (x) => {
    for (let i = 0; i < FIN_OUT.length - 1; i++) {
      const [xa, ya] = FIN_OUT[i], [xc, yc] = FIN_OUT[i + 1];
      if (x <= xa && x >= xc) return xa - xc < 1e-6 ? Math.max(ya, yc) : ya + (yc - ya) * (xa - x) / (xa - xc);
    }
    return -1;
  };
  const XH = 20;                                                              // Ruderscharnier
  const xTE = (y) => FIN_OUT[12][0] + (Math.max(FIN_OUT[12][1], y) - FIN_OUT[12][1]) * (FIN_OUT[11][0] - FIN_OUT[12][0]) / (FIN_OUT[11][1] - FIN_OUT[12][1]);
  const NS = { x0: 38.6, x1: 42.6, y0: 19.55, y1: 20.35 };                   // Notsteuerstand (untere Flosse), Fensterband
  const inFin = (k, x, y, m) => y >= rLin(x) + 0.35 && x <= 52 - m && [-m, 0, m].every((d) => finTop(x + d) >= y + m) && Math.abs(x - XH) > 0.17
    && !(k === 2 && x > NS.x0 - 0.3 && x < NS.x1 + 0.3 && y > NS.y0 - 0.3 && y < NS.y1 + 0.3);
  /** Punkt auf der Flossenoberfläche (lokal), Abstand off über der Fläche */
  const fs = (x, y, zs, off) => V(x, y, zs * (finZ(x, y) + off));
  /** Leiste auf der Flosse entlang [[x,y],…]; wird geteilt, bis sie der Fläche auf 2 mm folgt */
  function finStrip(mat, k, zs, A, B, w, t, gap = 0.016, op = 1) {
    const off = gap + t / 2, pieces = [];
    const rec = (a, c, n) => {
      const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], q1 = [(3 * a[0] + c[0]) / 4, (3 * a[1] + c[1]) / 4], q3 = [(a[0] + 3 * c[0]) / 4, (a[1] + 3 * c[1]) / 4];
      const za = finZ(...a), zc = finZ(...c);
      const dev = Math.max(Math.abs(finZ(...m) - (za + zc) / 2), Math.abs(finZ(...q1) - (3 * za + zc) / 4), Math.abs(finZ(...q3) - (za + 3 * zc) / 4));
      if (n < 6 && dev > 0.003 && Math.hypot(c[0] - a[0], c[1] - a[1]) > 0.3) { rec(a, m, n + 1); rec(m, c, n + 1); } else pieces.push([a, c]);
    };
    rec(A, B, 0);
    for (const [a, c] of pieces) {
      const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      // Höhe aus Mitte und beiden Kanten, damit die Leiste nirgends in die Fläche taucht
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, px = -(c[1] - a[1]) / L * w / 2, py = (c[0] - a[0]) / L * w / 2;
      const hz = (q) => Math.max(finZ(q[0], q[1]), finZ(q[0] + px, q[1] + py), finZ(q[0] - px, q[1] - py));
      seg(mat, fv(k, V(a[0], a[1], zs * (hz(a) + off))), fv(k, V(c[0], c[1], zs * (hz(c) + off))), fv(k, finN(m[0], m[1], zs)), w, t, op);
    }
  }
  /** zusammenhängende Abschnitte, in denen f(s) wahr ist */
  function spans(s0, s1, ds, f) {
    const out = []; let a = null;
    for (let s = s0; s <= s1 + 1e-9; s += ds) { const ok = f(s); if (ok && a === null) a = s; if ((!ok || s + ds > s1 + 1e-9) && a !== null) { const e = ok ? s : s - ds; if (e - a > 0.4) out.push([a, e]); a = null; } }
    return out;
  }
  const lampMat = [M.navWhite, M.navGreen, M.navWhite, M.navRed];
  const RIB_Y = [9.0, 11.0, 13.0, 15.0, 17.0, 19.0, 21.1];            // Rippen (achsparallel)
  const SPAR_X = [16.4, 18.3, 23.5, 27.5, 31.5, 35.5, 39.5, 43.5, 47.5];         // Holme / Querbänder (radial)
  for (let k = 0; k < 4; k++) {
    const Af = 180 - 90 * k;                                                 // Hüllwinkel der Flossenebene
    for (const zs of [1, -1]) {
      // Rippen und Holme als Abdeckbänder
      for (const y of RIB_Y) for (const [xa, xb] of spans(13.6, 52, 0.05, (x) => inFin(k, x, y, 0.22))) part(() => finStrip(M.hullSeam, k, zs, [xa, y], [xb, y], 0.12, 0.022, 0.016, 2));
      for (const x of SPAR_X) for (const [ya, yb] of spans(rLin(x) + 0.35, 21.8, 0.05, (y) => inFin(k, x, y, 0.22))) part(() => finStrip(M.hullSeam, k, zs, [x, ya], [x, yb], 0.1, 0.03, 0.016, 2));
      // Ruderscharniere an der Scharnierlinie x = 20
      part(() => {
        for (const y of [9.4, 12.6, 15.8, 19.0, 21.0]) {
          finStrip(M.aluDark, k, zs, [XH - 0.45, y], [XH + 0.45, y], 0.16, 0.035, 0.02);
          const z = zs * (Math.max(1.78 * finT(y), finZ(XH, y)) + 0.07);
          seg(M.steel, fp(k, XH, y - 0.2, z), fp(k, XH, y + 0.2, z), fp(k, 0, 0, zs), 0.11, 0.11, false);
        }
      });
      // Trimmklappe an der Ruderhinterkante
      part(() => {
        const ya = 12.2, yb = 15.8, ca = xTE(ya) + 0.3, cb = xTE(yb) + 0.3, ha = xTE(ya) + 1.35, hb = xTE(yb) + 1.35;
        finStrip(M.aluDark, k, zs, [ca, ya], [ha, ya], 0.06, 0.035);
        finStrip(M.aluDark, k, zs, [cb, yb], [hb, yb], 0.06, 0.035);
        finStrip(M.aluDark, k, zs, [ha, ya], [hb, yb], 0.07, 0.035);
        const ym = (ya + yb) / 2, xt = xTE(ym) + 0.75, xr = xt + 1.3;
        const P = (x, o) => fv(k, fs(x, ym, zs, o));
        obox(M.aluDark, P(xt, 0.09), V(1, 0, 0), fp(k, 0, 1, 0), fp(k, 0, 0, 1), 0.08, 0.1, 0.16);   // Steuerhorn der Klappe
        obox(M.aluDark, P(xr, 0.07), V(1, 0, 0), fp(k, 0, 1, 0), fp(k, 0, 0, 1), 0.12, 0.12, 0.1);    // Lagerbock am Ruder
        seg(M.steel, P(xt, 0.14), P(xr, 0.11), fp(k, 0, 1, 0), 0.022, 0.022, false);
      });
      // Spanndrähte Flosse – Rumpf
      for (const [xf, df, xh] of [[29.5, 3.6, 33.5], [43.5, 2.6, 47]]) {
        const yf = rLin(xf) + df, A = fv(k, fs(xf, yf, zs, 0.04));
        part(() => obox(M.aluDark, fv(k, fs(xf, yf, zs, 0.045)), V(1, 0, 0), fp(k, 0, 1, 0), fp(k, 0, 0, 1), 0.22, 0.22, 0.05));
        const F = frame(xh, Af - zs * 28); part(() => fb(M.aluDark, F, 0, 0.035, 0, 0.18, 0.03, 0.22));
        const H = at(F, 0, 0.05, 0);
        bcyl(M.steel, A, H, 0.014, 5);
        bcyl(M.steel, A.clone().lerp(H, 0.46), A.clone().lerp(H, 0.54), 0.03, 6);   // Spannschloss
      }
    }
    // Flossenspitzenlampe
    { const y = FIN_OUT[9][1] + 0.5, x = 24;
      part(() => obox(M.aluDark, fp(k, x, y + 0.02, 0), V(1, 0, 0), fp(k, 0, 1, 0), fp(k, 0, 0, 1), 0.5, 0.24, 0.24));
      const q = fp(k, x + 0.05, y + 0.24, 0); b.sph(lampMat[k], 0.1, q.x, q.y, q.z, 1, 1, 1, 10); }
  }
  // Notsteuerstand in der unteren Flosse (x 38–43): Fensterrahmen außen angedeutet
  for (const zs of [1, -1]) part(() => {
    const k = 2, ym = (NS.y0 + NS.y1) / 2, h = NS.y1 - NS.y0, n = 3, w = (NS.x1 - NS.x0) / n;
    for (let i = 0; i < n; i++) {
      const xm = NS.x0 + w * (i + 0.5), wp = w - 0.16, P = (x, y, o) => fv(k, fs(x, y, zs, o));
      const nn = fv(k, finN(xm, ym, zs)), tx = V(1, 0, 0), ty = new THREE.Vector3().crossVectors(nn, tx).normalize();
      obox(winMat, P(xm, ym, 0.008), tx.clone(), ty.clone(), nn.clone(), wp, h - 0.08, 0.008);
      finStrip(M.alu, k, zs, [xm - wp / 2 - 0.02, NS.y0 + 0.02], [xm + wp / 2 + 0.02, NS.y0 + 0.02], 0.045, 0.03);
      finStrip(M.alu, k, zs, [xm - wp / 2 - 0.02, NS.y1 - 0.02], [xm + wp / 2 + 0.02, NS.y1 - 0.02], 0.045, 0.03);
      for (const d of [-1, 1]) finStrip(M.alu, k, zs, [xm + d * (wp / 2 + 0.02), NS.y0 + 0.02], [xm + d * (wp / 2 + 0.02), NS.y1 - 0.02], 0.045, 0.03);
    }
    finStrip(M.aluDark, k, zs, [NS.x0 - 0.1, NS.y0 - 0.12], [NS.x1 + 0.1, NS.y0 - 0.12], 0.05, 0.04);   // Tropfkante (unter dem Band = zur Spitze hin)
  });
  // Heckrad mit Gabel und Verkleidung unter der unteren Flosse (Radmitte x 37, Unterkante ≈ −23,05)
  { const wx = 37, wy = -22.5;
    b.sph(M.aluDark, 1, wx, -22.32, 0, 0.9, 0.42, 0.36, 16);
    ring(M.rubber, V(wx, wy, 0), V(0, 0, 1), 0.38, 0.17, 18);
    bcyl(M.aluDark, V(wx, wy, -0.2), V(wx, wy, 0.2), 0.2, 12);
    bcyl(M.steel, V(wx, wy, -0.36), V(wx, wy, 0.36), 0.045, 8);
    for (const z of [-0.3, 0.3]) { bcyl(M.aluDark, V(wx, wy, z), V(wx + 0.25, -22.0, z * 0.7), 0.04, 6); bcyl(M.aluDark, V(wx, wy, z), V(wx - 0.25, -22.0, z * 0.7), 0.04, 6); } }

  // =====================================================================
  // 12. Maschinengondeln
  // =====================================================================
  const A3 = 3.4, B3 = 1.3, C3 = 1.2;                                          // Ellipsoid wie hull.js
  for (const e of ENG) {
    const c = e.c, s = e.side, E = V(c.x + 0.3, c.y, c.z);
    // Punkt auf dem Gondel-Ellipsoid: zo = +1 außenbords, −1 innenbords
    const gs = (dx, dy, zo, off = 0) => {
      const zz = C3 * Math.sqrt(Math.max(0, 1 - (dx / A3) ** 2 - (dy / B3) ** 2)), lz = zo * s * zz;
      const n = V(dx / (A3 * A3), dy / (B3 * B3), lz / (C3 * C3)).normalize();
      return { p: V(E.x + dx, E.y + dy, E.z + lz).addScaledVector(n, off), n };
    };
    const gr = (dx, th, off = 0) => {
      const sc = Math.sqrt(Math.max(0, 1 - (dx / A3) ** 2)), y = B3 * sc * Math.cos(th), z = C3 * sc * Math.sin(th);
      const n = V(dx / (A3 * A3), y / (B3 * B3), z / (C3 * C3)).normalize();
      return { p: V(E.x + dx, E.y + y, E.z + z).addScaledVector(n, off), n };
    };
    const zin = (v) => c.z - s * v, zout = (v) => E.z + s * v;

    // Spantbänder mit Nietreihen
    for (const dx of [-2.3, -1.2, 1.0, 2.2]) {
      part(() => { for (let k = 0; k < 24; k++) { const P1 = gr(dx, k * 15 * D2R, 0.01), P2 = gr(dx, (k + 1) * 15 * D2R, 0.01); seg(M.steel, P1.p, P2.p, P1.n.clone().add(P2.n), 0.06, 0.02); } });
      for (let qd = 0; qd < 4; qd++) part(() => { for (let k = qd * 6; k < qd * 6 + 6; k++) { const R = gr(dx, (k + 0.5) * 15 * D2R, 0.03); dot(M.alu, R.p, R.n, 0.03); } });
    }
    for (const th of [0, Math.PI]) part(() => {                              // Längsnietreihen oben/unten
      for (let dx = -2.8; dx <= 3.2; dx += 0.25) {
        if (th > 0 && !(Math.abs(dx - 0.9) > 0.15 && Math.abs(dx + 1.5) > 0.5 && Math.abs(dx - 2.4) > 0.45)) continue;
        const T = gr(dx, th, 0.008); dot(M.alu, T.p, T.n, 0.028);
      }
    });

    // Seitenfenster mit Tropfnase
    const fenster = (dx, dy, zo, w, h) => part(() => {
      const G = gs(dx, dy, zo), n = G.n, tx = V(1, 0, 0).addScaledVector(n, -n.x).normalize(), up = new THREE.Vector3().crossVectors(n, tx).normalize();
      if (up.y < 0) up.negate();
      const P = (a, bb, o) => G.p.clone().addScaledVector(tx, a).addScaledVector(up, bb).addScaledVector(n, o);
      obox(winMat, P(0, 0, 0.012), tx.clone(), up.clone(), n.clone(), w, h, 0.02);
      for (const sg of [1, -1]) {
        seg(M.alu, P(-w / 2 - 0.05, sg * (h / 2 + 0.025), 0.01), P(w / 2 + 0.05, sg * (h / 2 + 0.025), 0.01), n, 0.05, 0.04);
        seg(M.alu, P(sg * (w / 2 + 0.025), -h / 2, 0.01), P(sg * (w / 2 + 0.025), h / 2, 0.01), n, 0.05, 0.04);
      }
      seg(M.alu, P(-w / 2 - 0.08, h / 2 + 0.085, 0.02), P(w / 2 + 0.08, h / 2 + 0.085, 0.02), n, 0.025, 0.06);
    });
    for (const zo of [1, -1]) { fenster(1.9, 0.15, zo, 0.42, 0.32); fenster(2.75, 0.1, zo, 0.3, 0.26); }

    // Tür innenbords (zum Laufsteg), mit Fenster, Griff, Scharnieren und Tropfnase
    const dP = (dx, dy, off) => gs(dx, dy, -1, off).p;
    const dN = (dx, dy) => gs(dx, dy, -1).n;
    part(() => {
      for (const dx of [-0.72, 0.12]) for (let k = 0; k < 5; k++) { const y0 = -0.5 + k * 0.244; seg(M.aluDark, dP(dx, y0, 0.005), dP(dx, y0 + 0.244, 0.005), dN(dx, y0 + 0.122), 0.05, 0.04); }
      for (const dy of [-0.5, 0.72]) for (let k = 0; k < 4; k++) { const x0 = -0.72 + k * 0.21; seg(M.aluDark, dP(x0, dy, 0.005), dP(x0 + 0.21, dy, 0.005), dN(x0 + 0.105, dy), 0.05, 0.04); }
      for (let k = 0; k < 4; k++) { const x0 = -0.8 + k * 0.25; seg(M.alu, dP(x0, 0.82, 0.02), dP(x0 + 0.25, 0.82, 0.02), dN(x0 + 0.125, 0.82), 0.035, 0.035); }
    });
    fenster(-0.3, 0.38, -1, 0.26, 0.2);
    bcyl(M.brass, dP(0.0, 0.05, 0.02), dP(0.0, 0.05, 0.09), 0.015, 6); bcyl(M.brass, dP(0.0, 0.05, 0.09), dP(-0.13, 0.05, 0.09), 0.015, 6);
    for (const dy of [-0.3, 0.45]) bcyl(M.steel, dP(-0.75, dy - 0.1, 0.04), dP(-0.75, dy + 0.1, 0.04), 0.025, 6);

    // Trittplatte vom Laufstegende (zEnd, yEnd) bis an die Türschwelle, Stützen, Haltegriffe
    { const za = zin(1.1), zb = zin(1.72), z0 = Math.min(za, zb), z1 = Math.max(za, zb);
      b.bb(M.alu, c.x - 0.4, c.x + 0.4, e.yEnd - 0.04, e.yEnd, z0, z1);
      part(() => { for (const v of [1.2, 1.35, 1.5, 1.65]) obox(M.steel, V(c.x, e.yEnd + 0.006, zin(v)), V(1, 0, 0), V(0, 1, 0), V(0, 0, 1), 0.78, 0.012, 0.025); });
      b.bb(M.aluDark, c.x - 0.42, c.x + 0.42, e.yEnd - 0.04, e.yEnd + 0.06, Math.min(za, zin(1.18)), Math.max(za, zin(1.18))); // Türschwelle
      for (const d of [-0.35, 0.35]) bcyl(M.aluDark, V(c.x + d, e.yEnd - 0.04, zin(1.68)), gs(-0.3 + d, -0.95, -1, -0.02).p, 0.025, 6);
      if (s > 0) C.nav.zone('Trittplatte ' + e.name, c.x - 0.38, c.x + 0.38, zb, za, e.yEnd);
      else C.nav.zone('Trittplatte ' + e.name, c.x - 0.38, c.x + 0.38, za, zb, e.yEnd); }
    for (const dy of [-0.85, -1.08]) {
      bcyl(M.alu, dP(-0.55, dy, 0.12), dP(-0.05, dy, 0.12), 0.02, 6);
      for (const dx of [-0.55, -0.05]) bcyl(M.alu, dP(dx, dy, -0.01), dP(dx, dy, 0.12), 0.015, 5);
    }
    for (const dx of [-0.85, 0.25]) {
      bcyl(M.alu, dP(dx, -0.4, 0.1), dP(dx, 0.6, 0.1), 0.018, 6);
      for (const dy of [-0.4, 0.6]) bcyl(M.alu, dP(dx, dy, -0.01), dP(dx, dy, 0.1), 0.014, 5);
    }
    for (const [d, dx] of [[-0.44, -0.85], [0.44, 0.25]]) bcyl(M.alu, V(c.x + d, e.yEnd + 1.0, zin(1.7)), dP(dx, 0.45, 0.1), 0.016, 5);

    // Halteseile vom Laufstegende hinauf zur Hülle
    { const ra = Math.atan2(e.zEnd, -(e.yEnd + 1)) / D2R + 8;
      for (const d of [-0.44, 0.44]) mir(s, () => {
        const F = frame(e.x + d * 1.4, ra); part(() => fb(M.aluDark, F, 0, 0.03, 0, 0.16, 0.03, 0.2));
        cy(M.steel, V(e.x + d, e.yEnd + 1.0, e.zEnd), at(F, 0, 0.045, 0), 0.012, 4);
      }); }

    // Auspuffrohre außenbords
    for (const dy of [0.35, -0.2]) {
      const y = c.y + dy, x0 = c.x + 1.3, x1 = c.x - 1.6, end = V(c.x - 2.35, y + 0.22, zout(1.5));
      bcyl(M.steel, V(x0, y, zout(1.32)), V(x1, y, zout(1.32)), 0.07, 8);
      b.sph(M.steel, 0.07, x0, y, zout(1.32), 1, 1, 1, 8);
      for (const xs of [c.x + 0.9, c.x]) bcyl(M.steel, V(xs, y, zout(1.0)), V(xs, y, zout(1.32)), 0.055, 6);
      bcyl(M.steel, V(x1, y, zout(1.32)), end, 0.07, 8, 0.1);
      const d = end.clone().sub(V(x1, y, zout(1.32))).normalize();
      bcyl(M.black, end.clone().addScaledVector(d, -0.01), end.clone().addScaledVector(d, 0.004), 0.088, 8);
    }

    // Kühler (Kasten aus hull.js): Lamellen, Rahmen, Klappe, Leitungen
    { const rx = c.x + 1.2, ry = c.y - 2.3, rz = c.z, X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
      part(() => {
        for (const sz of [1, -1]) {
          for (let k = 0; k < 10; k++) obox(M.aluDark, V(rx, ry - 0.405 + k * 0.09, rz + sz * 0.137), X, Y, Z, 1.1, 0.02, 0.025);
          for (const sy of [1, -1]) obox(M.steel, V(rx, ry + sy * 0.44, rz + sz * 0.14), X, Y, Z, 1.24, 0.04, 0.035);
          for (const sx of [1, -1]) obox(M.steel, V(rx + sx * 0.6, ry, rz + sz * 0.14), X, Y, Z, 0.04, 0.92, 0.035);
        }
        const h0 = V(c.x + 1.82, c.y - 1.86, rz), h1 = V(c.x + 2.2, c.y - 2.62, rz), ez = h1.clone().sub(h0), L = ez.length(); ez.normalize();
        obox(M.aluDark, h0.clone().lerp(h1, 0.5), V(0, 0, 1), new THREE.Vector3().crossVectors(ez, V(0, 0, 1)), ez, 0.3, 0.03, L);
      });
      bcyl(M.steel, V(c.x + 1.82, c.y - 1.86, rz - 0.16), V(c.x + 1.82, c.y - 1.86, rz + 0.16), 0.025, 6);
      for (const x of [c.x + 0.8, c.x + 1.6]) bcyl(M.steel, V(x, c.y - 1.15, rz), V(x, c.y - 1.86, rz), 0.045, 8); }

    // Landepuffer unter der Gondel
    b.sph(M.rubber, 0.3, c.x - 1.2, c.y - 1.28, c.z, 1.5, 0.6, 1.1, 10);
    b.sph(M.rubber, 0.25, c.x + 2.7, c.y - 1.03, c.z, 1.3, 0.55, 1.0, 10);

    // Haube hinter der Propellerebene (Nabe bei c.x − 3,75; Blattkreis bleibt frei), Bugkappe der Gondel
    bcyl(M.aluDark, V(c.x - 4.08, c.y, c.z), V(c.x - 4.8, c.y, c.z), 0.22, 12, 0.03);
    b.sph(M.steel, 0.2, c.x + 3.62, c.y, c.z, 0.5, 1, 1, 12);

    // Streben (Rohre aus hull.js): stromlinienförmige Verkleidung, Schellen und Fußbeschläge an der Hülle
    const a = Math.atan2(Math.abs(c.z), -c.y) / D2R;
    for (const [dx, da] of [[-1.8, -7], [1.8, -7], [-1.8, 7], [1.8, 7], [0, 0]]) {
      const h = V(c.x + dx * 1.5, 0, 0), t = (a + da) * D2R, r = rLin(h.x);
      h.y = -r * Math.cos(t); h.z = s * r * Math.sin(t);
      const p0 = V(c.x + dx, c.y, c.z), d = h.clone().sub(p0), L = d.length(); d.normalize();
      const ex = V(1, 0, 0).addScaledVector(d, -d.x).normalize(), ez = new THREE.Vector3().crossVectors(ex, d);
      let t0 = 0.05; while (t0 < 0.6) { const q = p0.clone().addScaledVector(d, L * t0), lx = q.x - E.x, ly = q.y - E.y, lz = q.z - E.z; if ((lx / A3) ** 2 + (ly / B3) ** 2 + (lz / C3) ** 2 > 1.25) break; t0 += 0.02; }
      const t1 = 0.9, Lf = L * (t1 - t0), mid = p0.clone().addScaledVector(d, L * (t0 + t1) / 2);
      const m = new THREE.Matrix4().makeBasis(ex, d, ez).setPosition(mid).multiply(new THREE.Matrix4().makeScale(2.6, 1, 1));
      b.add(M.alu, new THREE.CylinderGeometry(0.075, 0.075, Lf, 10, 1), m);
      for (const tt of [t0, t1]) bcyl(M.aluDark, p0.clone().addScaledVector(d, L * tt - 0.05), p0.clone().addScaledVector(d, L * tt + 0.05), 0.1, 8);
      mir(s, () => {
        const F = frame(h.x, a + da);
        part(() => fb(M.aluDark, F, 0, 0.035, 0, 0.36, 0.04, 0.36));
        cy(M.aluDark, at(F, 0, 0.055, 0), at(F, 0, 0.13, 0), 0.1, 8, 0.08);
      });
    }
  }
}
