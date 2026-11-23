import * as THREE from 'three';
import { QuadBuf, V, canvasTex } from './util.js';

// ---------- Hauptmaße LZ 129 ----------
// Modell-x = Ringnummer (Meter ab Heck-Bezugspunkt). Werte nach research/rumpf.md (ausgemessener Längsriss).
export const X_TAIL = 2.0, X_BOW = 246.7, LEN = X_BOW - X_TAIL, RMAX = 20.6;   // Länge ≈ 245 m, Ø 41,2 m
export const MAIN = [20, 33.5, 47, 62, 77, 92, 107, 123.5, 140, 156.5, 173, 188, 203, 218, 233]; // 15 Hauptringe
export const D2R = Math.PI / 180;
export const A_Y = -16.6, A_H = 2.5, B_Y = -19.3, B_H = 2.5;   // Deckhöhen (A-Deck ≈ 22 m breit, B-Deck ≈ 9 m)
export const WIN_A = [3, 4], WIN_B = [1];                      // Fensterfelder (Index = Winkel/10°) Steuerbord; Backbord = 35 − j
export const GX0 = 198, GX1 = 208, G_Y = -20.2, G_YC = -17.95, G_HW = 1.3; // Führergondel (an Ring 203)

export const GROUND_Y = -23.1;                                  // Bodenhöhe in der Ankermast-Szene (Heckrad setzt auf)
export const FALLREEP = { x0: 173, x1: 175.6, zi: 0.9, zo: 2.1 }; // zwei Fallreeps am Heckende des B-Decks, beiderseits des Kiels

// Radien je Station [x, r]
const TAB = [[2, 0], [3.5, 1.7], [9, 4.3], [14.5, 6], [20, 7.5], [24.5, 8.6], [29, 9.7], [33.5, 10.7], [38, 11.9], [42.5, 12.9], [47, 13.7], [52, 14.8], [57, 15.5], [62, 16.2],
  [67, 16.8], [72, 17.3], [77, 17.85], [82, 18.2], [87, 18.6], [92, 18.9], [97, 19.2], [102, 19.5], [107, 19.8], [112.5, 20], [118, 20.15], [123.5, 20.3], [129, 20.45], [134.5, 20.55],
  [140, 20.6], [145.5, 20.6], [151, 20.6], [156.5, 20.5], [162, 20.45], [167.5, 20.3], [173, 20.15], [178, 19.95], [183, 19.7], [188, 19.4], [193, 19.05], [198, 18.6], [203, 18.1],
  [208, 17.5], [213, 16.85], [218, 16], [223, 14.7], [228, 13.2], [233, 11.4], [236.83, 9.6], [240.67, 7.3], [244.5, 3.7], [245.5, 2.6], [246.2, 1.4], [246.7, 0]];
function Rs(x) {
  if (x <= X_TAIL || x >= X_BOW) return 0;
  let i = 1; while (TAB[i][0] < x) i++;
  const t = (x - TAB[i - 1][0]) / (TAB[i][0] - TAB[i - 1][0]);
  return TAB[i - 1][1] + (TAB[i][1] - TAB[i - 1][1]) * t;
}
/** Spantstationen: Hauptringe plus je zwei Hilfsringe dazwischen; ab 244,5 nur Formstützpunkte der Bugkappe. */
export const ST = (() => {
  const s = [2, 3.5, 9, 14.5];
  for (let i = 0; i < MAIN.length - 1; i++) { const a = MAIN[i], d = (MAIN[i + 1] - a) / 3; s.push(a, a + d, a + 2 * d); }
  s.push(233, 236.83, 240.67, 244.5, 245.5, 246.2, 246.7);
  return s;
})();
const RS = ST.map(Rs);
export function rLin(x) {
  if (x <= X_TAIL || x >= X_BOW) return 0;
  let i = 1; while (ST[i] < x) i++;
  const t = (x - ST[i - 1]) / (ST[i] - ST[i - 1]);
  return RS[i - 1] + (RS[i] - RS[i - 1]) * t;
}
/** Punkt auf der Hülle: Winkel a in Grad ab Kiel (0 = unten, 90 = Steuerbord). */
export function hp(x, a, k = 1, dr = 0) {
  const r = rLin(x) * k + dr, t = a * D2R;
  return V(x, -r * Math.cos(t), r * Math.sin(t));
}
/** Halbe Innenbreite des 36-Ecks auf Höhe y. */
export function hw(x, y) {
  const r = rLin(x); let pz = 0, py = -r;
  for (let j = 1; j <= 18; j++) {
    const z = r * Math.sin(j * 10 * D2R), yy = -r * Math.cos(j * 10 * D2R);
    if (y <= yy) return pz + (z - pz) * (y - py) / (yy - py);
    pz = z; py = yy;
  }
  return 0;
}
export const keelY = (x) => -rLin(x) + 1.3;
const near = (a, b) => Math.abs(a - b) < 1e-3;

/** Vier Maschinengondeln; Laufsteg vom Kielgang durch eine Luke nach außen. */
// Ringe 140 und 92 sind belegt; Gondel und Laufsteg liegen 2,5 m davor, damit der Steg den Hauptring nicht kreuzt.
export const ENG = [[142.5, 54, 4.3], [94.5, 39, 4.9]].flatMap(([x, a, dr]) => [1, -1].map((side) => {
  const r = rLin(x) + dr, cz = r * Math.sin(a * D2R), cy = -r * Math.cos(a * D2R);
  const zEnd = cz - 1.7, yEnd = cy - 0.55, y0 = keelY(x);
  let j = 3;
  for (let t = 0; t <= 1; t += 0.005) {
    const z = 0.45 + (zEnd - 0.45) * t, y = y0 + (yEnd - y0) * t;
    if (z > hw(x, y)) { j = Math.floor(Math.atan2(z, -y) / D2R / 10); break; }
  }
  // Luke über zwei Felder, damit auch auf Kopfhöhe frei ist
  return { x, side, c: V(x, cy, side * cz), zEnd, yEnd, js: side > 0 ? [j, j + 1] : [35 - j, 34 - j], jl: side > 0 ? j + 1 : 35 - j, name: (x > 100 ? 'vordere' : 'hintere') + ' Maschinengondel ' + (side > 0 ? 'Steuerbord' : 'Backbord') };
}));

/** Außenkontur der Flossen [x, r] und Dickenfaktor über r */
export const FIN_OUT = [[52, 14.9], [51, 16.0], [50, 16.9], [48, 18.4], [47, 19.0], [46, 19.5], [44, 20.4], [42, 21.0], [40, 21.5], [38, 21.8], [16.3, 21.8], [15.6, 21.4], [13.6, 6.0]];
export const finT = (r) => 1 - 0.885 * Math.min(1, Math.max(0, (r - 7) / 14.8));

function prism(qb, p1, p2, d, w) {
  const dir = new THREE.Vector3().subVectors(p2, p1), len = dir.length(); if (len < 0.02) return;
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const nIn = V(0, -mid.y, -mid.z); if (nIn.lengthSq() < 1e-6) return; nIn.normalize();
  const s = new THREE.Vector3().crossVectors(dir, nIn).normalize().multiplyScalar(w / 2);
  const a1 = p1.clone().addScaledVector(nIn, d), a2 = p2.clone().addScaledVector(nIn, d);
  const L1 = p1.clone().add(s), L2 = p2.clone().add(s), R1 = p1.clone().sub(s), R2 = p2.clone().sub(s);
  const ur = Math.max(1, Math.round(len / (d * 2.2)));
  qb.quad(L1, L2, a2, a1, 0, 0, ur, 1); qb.quad(R1, R2, a2, a1, 0, 0, ur, 1); qb.quad(L1, L2, R2, R1, 0, 0, ur, 1);
}

export function buildHull(root, M, b, quality) {
  const winFaces = [];
  const faceKind = (i, j) => {
    const x0 = ST[i], x1 = ST[i + 1];
    if (x0 >= 173 - 1e-3 && x1 <= 188 + 1e-3 && [...WIN_A, ...WIN_B].some((w) => j === w || j === 35 - w)) return 'win';
    if (x0 >= GX0 - 1e-3 && x1 <= GX1 + 1e-3 && (j === 0 || j === 35)) return 'slot';
    return null;
  };
  // ---------- Außenhaut ----------
  const skin = new QuadBuf();
  const face = (xa, xb, j) => skin.quad(hp(xa, j * 10), hp(xb, j * 10), hp(xb, j * 10 + 10), hp(xa, j * 10 + 10), xa / 6, 0, xb / 6, 1);
  for (let i = 0; i < ST.length - 1; i++) {
    for (let j = 0; j < 36; j++) {
      const k = faceKind(i, j);
      if (k === 'win') { winFaces.push([i, j]); continue; }
      if (k === 'slot') continue;
      const e = ENG.find((e) => e.js.includes(j) && e.x > ST[i] && e.x < ST[i + 1]);
      if (e) { face(ST[i], e.x - 0.6, j); face(e.x + 0.6, ST[i + 1], j); continue; }
      if ((j === 0 || j === 35) && Math.abs(ST[i] - FALLREEP.x0) < 1e-3) { face(FALLREEP.x1, ST[i + 1], j); continue; } // Öffnung für die Fallreeps
      face(ST[i], ST[i + 1], j);
    }
  }
  const sg = skin.geo();
  const outer = new THREE.Mesh(sg, M.hullOut), inner = new THREE.Mesh(sg, M.hullIn);
  root.add(outer, inner);

  // Verkleidung zwischen Rumpf und Führergondel
  const fair = new QuadBuf();
  for (let i = 0; i < ST.length - 1; i++) {
    if (faceKind(i, 0) !== 'slot') continue;
    for (const s of [1, -1]) fair.quad(hp(ST[i], s * 10), hp(ST[i + 1], s * 10), V(ST[i + 1], G_YC, s * G_HW), V(ST[i], G_YC, s * G_HW));
  }
  for (const x of [GX0, GX1]) {
    const c = [-1, 1].map((s) => V(x, G_YC, s * G_HW));
    fair.tri(hp(x, -10), hp(x, 0), c[0], [0, 0], [1, 0], [0, 1]);
    fair.tri(hp(x, 0), c[1], c[0], [0, 0], [1, 0], [0, 1]);
    fair.tri(hp(x, 0), hp(x, 10), c[1], [0, 0], [1, 0], [0, 1]);
  }
  root.add(new THREE.Mesh(fair.geo(), M.hullOutDS));

  // ---------- Fensterbänder der Promenaden ----------
  const glass = new QuadBuf();
  for (const [i, j] of winFaces) {
    const x0 = ST[i], x1 = ST[i + 1], a0 = j * 10, a1 = a0 + 10;
    glass.quad(hp(x0, a0), hp(x1, a0), hp(x1, a1), hp(x0, a1));
    b.beam(M.alu, hp(x0, a0), hp(x1, a0), 0.07); b.beam(M.alu, hp(x0, a1), hp(x1, a1), 0.07);
    const n = 5;
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; b.beam(M.alu, hp(x, a0), hp(x, a1), 0.05); }
    b.beam(M.alu, hp(x0, a0 + 5), hp(x1, a0 + 5), 0.03);
  }
  const gm = new THREE.Mesh(glass.geo(), M.glass); gm.renderOrder = 3; root.add(gm);

  // Innenverkleidung der Passagierdecks: stoffbespannte Wandfläche vor der Hülle zwischen B-Deck-Fenstern und A-Deck-Fenstern
  // (sonst wirkt die durchscheinende Hülle dort wie eine fehlende Wand)
  const lining = new QuadBuf(), LJ = WIN_B[0] + 1, K = 0.992;
  for (let i = 0; i < ST.length - 1; i++) {
    const x0 = ST[i], x1 = ST[i + 1]; if (x0 < 173 - 1e-3 || x1 > 188 + 1e-3) continue;
    for (const j of [LJ, 35 - LJ]) lining.quad(hp(x0, j * 10 + 10, K), hp(x1, j * 10 + 10, K), hp(x1, j * 10, K), hp(x0, j * 10, K));
  }
  b.add(M.wallCream, lining.geo());

  // ---------- Gerippe: Ringe und Längsträger ----------
  const tq = new QuadBuf();
  for (let i = 1; i < ST.length - 1; i++) {
    const x = ST[i], main = MAIN.some((m) => near(m, x));
    if (rLin(x) < 1.5 || x > 244.6) continue;
    for (let j = 0; j < 36; j++) {
      if (!main && faceKind(i, j) === 'slot') continue;
      if (!main && faceKind(i - 1, j) === 'slot') continue;
      prism(tq, hp(x, j * 10), hp(x, j * 10 + 10), main ? 1.1 : 0.4, main ? 0.5 : 0.28);
    }
  }
  for (let j = 0; j < 36; j++) {
    for (let i = 0; i < ST.length - 1; i++) {
      if (j === 0 && faceKind(i, 0) === 'slot') continue;
      if (RS[i] < 0.6 && RS[i + 1] < 0.6) continue;
      if (ENG.some((e) => e.jl === j && e.x > ST[i] && e.x < ST[i + 1])) continue;
      prism(tq, hp(ST[i], j * 10), hp(ST[i + 1], j * 10), 0.45, 0.34);
    }
  }
  root.add(new THREE.Mesh(tq.geo(), M.truss));

  // Drahtverspannung der Hauptringe
  const wp = [];
  for (const x of MAIN) for (let a = 60; a <= 300; a += 10) {
    const p = hp(x, a), t = a * D2R; wp.push(p.x, p.y, p.z, x, -1.6 * Math.cos(t), 1.6 * Math.sin(t));
    const q = hp(x, a + 40 > 300 ? a : a + 40); wp.push(p.x, p.y, p.z, q.x, q.y, q.z);
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  const wires = new THREE.LineSegments(wg, M.wire); root.add(wires);

  // ---------- 16 Gaszellen ----------
  const cq = new QuadBuf();
  const bounds = [3.5, ...MAIN, 244.5];
  for (let c = 0; c < bounds.length - 1; c++) {
    const x0 = bounds[c] + 0.6, x1 = bounds[c + 1] - 0.6;
    const xs = [x0, ...ST.filter((s) => s > x0 + 0.5 && s < x1 - 0.5), x1];
    const K = 0.945, A0 = 55, A1 = 305;
    for (let i = 0; i < xs.length - 1; i++) {
      for (let a = A0; a < A1; a += 10) cq.quad(hp(xs[i], a, K), hp(xs[i + 1], a, K), hp(xs[i + 1], a + 10, K), hp(xs[i], a + 10, K));
      cq.quad(hp(xs[i], A1, K), hp(xs[i + 1], A1, K), hp(xs[i + 1], A0, K), hp(xs[i], A0, K));
    }
    for (const x of [x0, x1]) {
      const cpt = V(x, 0, 0);
      for (let a = A0; a < A1; a += 10) cq.tri(cpt, hp(x, a, K), hp(x, a + 10, K), [0, 0], [1, 0], [1, 1]);
      cq.tri(cpt, hp(x, A1, K), hp(x, A0, K), [0, 0], [1, 0], [1, 1]);
    }
  }
  const cells = new THREE.Mesh(cq.geo(), M.cell); cells.renderOrder = 4; root.add(cells);

  buildExterior(root, M, b);
  return { cells, wires, outer };
}

// ---------- Leitwerk, Maschinengondeln, Beschriftung ----------
function buildExterior(root, M, b) {
  // Leitwerk: Kontur nach dem Längsriss; Dicke 3,5 m an der Wurzel, zur Spitze auf 0,4 m verjüngt
  const sh = new THREE.Shape();
  const pts = [...FIN_OUT, ...[13.6, 16, 20, 24.5, 29, 33.5, 38, 42.5, 47].map((x) => [x, Math.max(0.3, rLin(x) - 0.45)])];
  sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]); sh.closePath();
  const taper = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * finT(p.getY(i))); g.computeVertexNormals(); return g; };
  const fg = new THREE.ExtrudeGeometry(sh, { depth: 2.5, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 1 });
  fg.translate(0, 0, -1.25);
  const fin = taper(fg.index ? fg.toNonIndexed() : fg);
  const seam = taper(new THREE.BoxGeometry(0.14, 14.2, 3.56, 1, 10, 1).translate(20, 14.7, 0).toNonIndexed());
  for (let k = 0; k < 4; k++) {
    const m = new THREE.Matrix4().makeRotationX(k * Math.PI / 2);
    b.add(M.hullOutDS, fin.clone(), m);
    b.add(M.hullSeam, seam.clone(), m);
  }
  // Heckrad unter der unteren Flosse, Ankerkonus am Bug
  b.sph(M.rubber, 0.55, 37, -22.5, 0, 1, 1, 0.5);
  b.cyl(M.aluDark, V(244.5, 0, 0), V(247.2, 0, 0), 0.55, 12, 0.12);

  // Maschinengondeln
  for (const e of ENG) {
    const c = e.c;
    b.sph(M.aluDark, 1, c.x + 0.3, c.y, c.z, 3.4, 1.3, 1.2, 20);
    b.cyl(M.steel, V(c.x - 3.0, c.y, c.z), V(c.x - 3.9, c.y, c.z), 0.3, 10, 0.18);
    const a = Math.atan2(Math.abs(c.z), -c.y) / D2R;
    for (const [dx, da] of [[-1.8, -7], [1.8, -7], [-1.8, 7], [1.8, 7], [0, 0]]) {
      const h = hp(c.x + dx * 1.5, a + da); h.z *= e.side;
      b.cyl(M.alu, V(c.x + dx, c.y, c.z), h, 0.07, 6);
    }
    b.cyl(M.steel, V(c.x + 1.2, c.y - 1.2, c.z), V(c.x + 1.2, c.y - 2.0, c.z), 0.1, 6); // Kühlerstütze
    b.box(M.steel, 1.2, 0.9, 0.25, c.x + 1.2, c.y - 2.3, c.z);
  }

  // Schriftzug, Kennzeichen, olympische Ringe (Zustand 1936)
  const label = (tex, xLo, xHi, aLo, aHi, year = 0) => {
    for (const side of [1, -1]) {
      const q = new QuadBuf(), nx = 16, na = 3;
      const P = (x, a) => { const p = hp(x, a, 1.004, 0.04); p.z *= side; return p; };
      for (let i = 0; i < nx; i++) for (let k = 0; k < na; k++) {
        const xa = xLo + (xHi - xLo) * i / nx, xb = xLo + (xHi - xLo) * (i + 1) / nx;
        const a0 = aLo + (aHi - aLo) * k / na, a1 = aLo + (aHi - aLo) * (k + 1) / na;
        let u0 = i / nx, u1 = (i + 1) / nx; if (side < 0) { u0 = 1 - u0; u1 = 1 - u1; }
        q.quad(P(xa, a0), P(xb, a0), P(xb, a1), P(xa, a1), u0, k / na, u1, (k + 1) / na);
      }
      const m = new THREE.Mesh(q.geo(), new THREE.MeshLambertMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.renderOrder = 1; if (year) m.userData.year = year; root.add(m);
    }
  };
  const txt = (s, color, font) => canvasTex(1024, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, h / 2 + 6);
  }, { repeat: false });
  label(txt('Hindenburg', '#a3261c', 'bold 150px "Old English Text MT","UnifrakturCook","Times New Roman",serif'), 202, 219, 96, 102);
  label(txt('D-LZ129', '#1a1a1a', 'bold 140px "Arial Narrow",Arial,sans-serif'), 104, 132, 97, 108);
  const rings = canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.lineWidth = 16;
    const cols = ['#1f6fb5', '#1a1a1a', '#c8281e', '#d8a51c', '#2c8a3c'], pos = [[262, 95], [512, 95], [762, 95], [387, 165], [637, 165]];
    pos.forEach((p, i) => { g.strokeStyle = cols[i]; g.beginPath(); g.arc(p[0], p[1], 78, 0, 7); g.stroke(); });
  }, { repeat: false });
  label(rings, 150, 168, 95, 109, 1936); // die olympischen Ringe trug das Schiff nur 1936
}

/** Drehende Propeller (eigene Objekte, werden pro Frame gedreht). */
export function buildProps(root, M) {
  const props = [];
  for (const e of ENG) {
    const g = new THREE.Group(); g.position.set(e.c.x - 3.75, e.c.y, e.c.z);
    for (let k = 0; k < 4; k++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, 0.42), M.woodDark);
      bl.position.y = 1.5; bl.rotation.y = 0.35;
      const arm = new THREE.Group(); arm.rotation.x = k * Math.PI / 2; arm.add(bl); g.add(arm);
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24), new THREE.MeshBasicMaterial({ color: 0x5a4632, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.y = Math.PI / 2; g.add(disc);
    root.add(g); props.push(g);
  }
  return props;
}
