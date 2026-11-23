// Passagierdecks A und B des LZ 129 zwischen Ring 173 und 188 – Grundriss nach research/decks.md
// (Fowler-Rekonstruktion, DZR-Prospekte 1936/1937). Treppenhaus, Foyer und Fallreeps liegen ACHTERN (Ring 173),
// Schreibzimmer, Rauchsalon und Offiziersmesse VORN (Ring 188). +z = Steuerbord, −z = Backbord.
import * as THREE from 'three';
import { QuadBuf, V, canvasTex, picture, rng } from './util.js';
import { hw, hp, rLin, A_Y, A_H, B_Y, B_H, keelY, GROUND_Y, FALLREEP } from './hull.js';

// =====================================================================
// Grundriss (Wandmittellinien in Modellkoordinaten)
// =====================================================================
const T = 0.08;                                   // Wanddicke
const XA = 173.06, XF = 187.94;                    // Endschotte an Ring 173 und 188
const AY = A_Y, AC = A_Y + A_H, BY = B_Y, BC = Math.min(B_Y + B_H, A_Y - 0.2);
const BH = BC - BY;
// Podest im vorderen B-Deck: Modellbehelf, historisch NICHT belegt. Fowlers Seitenriss [FOWP] zeigt einen durchgehend ebenen
// B-Deck-Boden; das Podest ist nur nötig, weil die Rumpfkontur aus hull.js auf B_Y zum Bug hin zu schmal wird (hw(187,7) ≈ 1,3 m).
const YP = B_Y + 0.3;
const ZK = 0.5;                                    // Kielgang-Wände im B-Deck (Gang ≈ 1 m breit)
// A-Deck: Längswände des Kabinenblocks (|z|)
const ZO = 5.2, ZG = 3.3, ZGI = 2.4, ZM = 0.5;
const XK0 = 174.3, XK2 = 176.3, XMG = 187.15;      // Kabinenblock achtern, Beginn Innenreihen, Ende Mittelgang
const STA = { x0: 174.3, x1: 175.3, z0: 0.55, z1: 3.35 }; // zwei quer laufende Treppenläufe A ↔ B (|z|)
const XPAN0 = 180.3, XPAN1 = 181.8;                // Anrichte in der Backbord-Außenreihe
const ZBR = 8.9, XQW = 183.1;                      // Brüstung zur Promenade, Querwand Lounge | Schreibzimmer
// B-Deck
const FRX0 = 173.7, FRX1 = FALLREEP.x1 - 0.05, FRBOT = 176.4; // Fallreep: Bodenöffnung und Fußpunkt am Boden
const XWC = 175.6, XHD = 177.7, XZM = 179.8, XSL = 180.6, XBAR = 181.5, XRS = 183.3; // Steuerbord-Querwände
const XDU = 176.75, XMM = 178.05, XKU = 180.8, XOM = 185.3;                          // Backbord-Querwände
const ZFL = 2.2, ZPA = 3.15;                       // Flurwand innen, Fensterbrüstung außen (B-Deck-Flure)
// Kabinenanbau 1937 (Bucht 11, Steuerbord)
const AX0 = 157.2, AXST = 171.2, AXS1 = 172.7, AXV = 159.4, AZW = 2.3, AZC = 3.25, AZWC = 1.1, AWC = [162.2, 167.3];
const ASL = 0.68;                                  // Ausladung der Schrägwand je m Höhe
const aZB = (x) => Math.min(5.6, hw(x, BY) - 0.1); // Fuß der Schrägwand
const aZT = (x, y) => aZB(x) + ASL * (y - BY);

/** y der Innengurtung eines Hauptrings (Tiefe d) bei Querlage |z| */
function chordY(x, z, d = 1.1) {
  const za = Math.abs(z);
  for (let j = 0; j < 9; j++) {
    const p0 = hp(x, j * 10), p1 = hp(x, j * 10 + 10);
    const m = p0.clone().add(p1).multiplyScalar(0.5), n = V(0, -m.y, -m.z).normalize();
    const q0 = p0.clone().addScaledVector(n, d), q1 = p1.clone().addScaledVector(n, d);
    if (za >= q0.z && za <= q1.z) return q0.y + (q1.y - q0.y) * (za - q0.z) / (q1.z - q0.z);
  }
  return -99;
}
const maxChord = (x, z0, z1) => { let m = -99; for (let z = z0; z <= z1 + 1e-6; z += 0.05) m = Math.max(m, chordY(x, z)); return m; };
const YT = maxChord(173, 0, 0.5) + 0.06;           // Schwelle Kielgang achtern (über Ring 173)
const YTH = maxChord(173, 2.4, 3.15) + 0.06;       // Schwelle zum Kabinenanbau 1937
const YF = maxChord(188, 0, 0.55) + 0.08;          // Kielgang vorn über Ring 188
const tipY = (x) => -(rLin(x) - 0.45) * Math.cos(10 * Math.PI / 180); // Innenkante Längsträger 10°

/** Startpunkt: Backbord-Promenade des A-Decks, Blick zum Bug */
export const START = [176.4, A_Y, -9.6, 0];

// ---------- Kabinenliste ----------
const COLS = ['wallBlue', 'wallGrey', 'wallCream'];   // hellblau, grau, beige (airships.net)
function splitX(a, c, n) { const w = (c - a) / n; return Array.from({ length: n }, (_, k) => [a + k * w, a + (k + 1) * w]); }
const CABINS = [];
{
  const add = (row, xs, zc, zb, first, step, deck, y, year, o = {}) => xs.forEach(([x0, x1], k) => {
    const n = first + step * k;
    CABINS.push({ row, x0, x1, zc, zb: zb ?? Math.min(aZB(x0), aZB(x1)) * Math.sign(zc), y, deck, year, label: `${n}/${n + 1}`,
      bedAt: k % 2 ? 'x1' : 'x0', col: COLS[(n * 5 + row) % 3], upper: ((n >> 1) % 3) === 0, ...o });
  });
  add(4, splitX(XK0, XF, 7), ZG, ZO, 1, 2, 'A', AY);              // Stb außen: 1/2 (achtern) … 13/14
  add(3, splitX(XK2, XF, 6), ZM, ZGI, 25, -2, 'A', AY);           // Stb innen: 25/26 (achtern) … 15/16 (vorn)
  add(2, splitX(XK2, XF, 6), -ZM, -ZGI, 27, 2, 'A', AY);          // Bb innen: 27/28 … 37/38
  add(1, splitX(XPAN1, XF, 3), -ZG, -ZO, 43, -2, 'A', AY);        // Bb außen vorn: 43/44 … 39/40
  add(1, splitX(XK0, XPAN0, 3), -ZG, -ZO, 49, -2, 'A', AY);       // Bb außen achtern: 49/50 … 45/46
  add(5, splitX(AXV, AXST, 8).reverse(), AZC, null, 51, 2, 'B', BY, 1937, { slope: true, small: true }); // 51/52 (vorn) … 65/66
  for (const c of CABINS) if ((c.row === 1 || c.row === 4) && Math.abs(c.x0 - XK0) < 0.01) c.dOff = 1.15; // Tür hinter dem Treppengeländer
  CABINS.push({ row: 6, x0: AXST, x1: AXS1, zc: AZC, zb: Math.min(aZB(AXST), aZB(AXS1)), y: BY, deck: 'B', year: 1937, label: 'Steward', bedAt: 'x1', col: 'wallGrey', upper: false, single: true, slope: true, small: true });
}
function cabDoor(c) {
  const small = !!c.small, d0 = c.dOff ?? (small ? 0.82 : 0.88), d1 = small ? Math.min(c.x1 - c.x0 - 0.06, d0 + 0.64) : d0 + 0.72;
  const X =(u) => (c.bedAt === 'x0' ? c.x0 + u : c.x1 - u);
  return [Math.min(X(d0), X(d1)), Math.max(X(d0), X(d1))];
}

// ---------- Raumliste für Detail-Module ----------
/** Räume (Innenflächen, ±4 cm Wandmaß) mit Bodenhöhe y. Ränder am Rumpf: kleinste halbe Breite am Boden. */
export const ROOMS = [];
{
  const r2 = (v) => Math.round(v * 100) / 100;
  const R = (name, deck, x0, x1, z0, z1, y, o = {}) => ROOMS.push({ name, deck, x0: r2(Math.min(x0, x1)), x1: r2(Math.max(x0, x1)), z0: r2(Math.min(z0, z1)), z1: r2(Math.max(z0, z1)), y: r2(y), ...o });
  const hA = hw(XF, AY);
  R('Treppenhalle', 'A', XA, XK0 - 0.04, -ZO, ZO, AY);
  R('Mittelgang', 'A', STA.x1 + 0.04, XMG - 0.04, -ZM + 0.04, ZM - 0.04, AY);
  R('Quergang', 'A', STA.x1 + 0.04, XK2 - 0.04, -ZG + 0.04, ZG - 0.04, AY);
  R('Kabinengang Backbord', 'A', STA.x1 + 0.04, XF, -ZG + 0.04, -ZGI - 0.04, AY);
  R('Kabinengang Steuerbord', 'A', STA.x1 + 0.04, XF, ZGI + 0.04, ZG - 0.04, AY);
  R('Treppe zum B-Deck (Backbord)', 'A', STA.x0, STA.x1, -STA.z1, -STA.z0, AY);
  R('Treppe zum B-Deck (Steuerbord)', 'A', STA.x0, STA.x1, STA.z0, STA.z1, AY);
  R('Anrichte', 'A', XPAN0 + 0.04, XPAN1 - 0.04, -ZO + 0.04, -ZG - 0.04, AY);
  R('Speisesaal', 'A', XA, XF, -ZBR + 0.05, -ZO - 0.04, AY);
  R('Promenade Backbord', 'A', XA, XF, -hA, -ZBR - 0.05, AY);
  R('Gesellschaftsraum', 'A', XA, XQW - 0.04, ZO + 0.04, ZBR - 0.05, AY);
  R('Promenade Steuerbord', 'A', XA, XQW - 0.04, ZBR + 0.05, hw(XQW, AY), AY);
  R('Schreib- und Lesezimmer', 'A', XQW + 0.04, XF, ZO + 0.04, hA, AY);
  R('Kielgang (B-Deck)', 'B', XA, XF, -ZK + 0.04, ZK - 0.04, BY);
  R('Treppe und Fallreep Steuerbord', 'B', XA + 0.3, XWC, ZK + 0.04, hw(XWC, BY), BY);
  R('Treppe und Fallreep Backbord', 'B', XA + 0.3, XWC, -hw(XWC, BY), -ZK - 0.04, BY);
  R('Passagierflur (B-Deck)', 'B', XWC, XSL - 0.04, ZFL + 0.04, ZPA, BY);
  R('Herrentoilette', 'B', XWC + 0.04, XHD - 0.04, ZK + 0.04, ZFL - 0.04, BY);
  R('Damentoilette', 'B', XHD + 0.04, XZM - 0.04, ZK + 0.04, ZFL - 0.04, BY);
  R('Zahlmeister', 'B', XZM + 0.04, XBAR - 0.04, ZK + 0.04, ZFL - 0.04, BY);
  R('Luftschleuse', 'B', XSL + 0.04, XBAR - 0.04, ZFL + 0.04, ZPA + 0.01, BY);
  R('Bar', 'B', XBAR + 0.04, XRS - 0.04, ZK + 0.04, hw(XRS, YP), YP);
  R('Rauchsalon', 'B', XRS + 0.04, XF, ZK + 0.04, hw(XF, YP), YP);
  R('Flur Backbord (B-Deck)', 'B', XWC, XMM - 0.04, -ZPA, -ZFL - 0.04, BY);
  R('Toilette (Backbord)', 'B', XWC + 0.04, XDU - 0.04, -ZFL + 0.04, -ZK - 0.04, BY);
  R('Dusche', 'B', XDU + 0.04, XMM - 0.04, -ZFL + 0.04, -ZK - 0.04, BY);
  R('Mannschaftsmesse', 'B', XMM + 0.04, XKU - 0.04, -hw(XKU, BY), -ZK - 0.04, BY);
  R('Küche', 'B', XKU + 0.04, XOM - 0.04, -hw(XOM, YP), -ZK - 0.04, YP);
  R('Offiziersmesse', 'B', XOM + 0.04, XF, -hw(XF, YP), -ZK - 0.04, YP);
  R('Kabinengang (B-Deck, 1937)', 'B', AXV + 0.04, XA, AZW + 0.04, AZC - 0.04, BY, { year: 1937 });
  R('Vierbettkabine 67–70', 'B', AX0 + 0.04, AXV - 0.04, AZW + 0.04, aZB(AXV), BY, { year: 1937, cabin: true });
  ['WC 1', 'WC 2', 'WC 3'].forEach((n, i) => { const w = (AWC[1] - AWC[0]) / 3; R(n + ' (1937)', 'B', AWC[0] + i * w + 0.04, AWC[0] + (i + 1) * w - 0.04, AZWC + 0.04, AZW - 0.04, BY, { year: 1937 }); });
  for (const c of CABINS) {
    const s = Math.sign(c.zc), zb = c.slope ? s * c.zb : c.zb;
    R(c.label === 'Steward' ? 'Steward-Kabine' : 'Kabine ' + c.label, c.deck, c.x0 + 0.04, c.x1 - 0.04, c.zc + s * 0.04, zb - (c.slope ? 0 : s * 0.04), c.y,
      { cabin: true, bedAt: c.bedAt, corridorZ: c.zc, door: cabDoor(c), ...(c.year ? { year: c.year } : {}) });
  }
}

// =====================================================================
// Wand- und Bodenhelfer
// =====================================================================
let TR = null; // { trim, frame } – Sockel-/Deckenleisten und Türzargen
const E = 0.007, FW = 0.035;
/** Wand längs x bei z. gaps: [g0, g1, Oberkante?, Unterkante?] (relativ zu y0). */
function wallX(b, mat, z, x0, x1, y0, h, gaps = [], door = 2.0) {
  let xs = x0;
  const seg = (a, c) => {
    b.bb(mat, a, c, y0, y0 + h, z - T / 2, z + T / 2);
    if (TR && h > 2.1) { b.bb(TR.trim, a, c, y0, y0 + 0.09, z - T / 2 - E, z + T / 2 + E); b.bb(TR.trim, a, c, y0 + h - 0.05, y0 + h, z - T / 2 - E, z + T / 2 + E); }
  };
  for (const g of [...gaps].sort((a, c) => a[0] - c[0])) {
    const [g0, g1] = g, dt = g[2] ?? door, db = g[3] ?? 0;
    if (g0 > xs) seg(xs, g0);
    if (dt < h) b.bb(mat, g0, g1, y0 + dt, y0 + h, z - T / 2, z + T / 2);
    if (db > 0) b.bb(mat, g0, g1, y0, y0 + db, z - T / 2, z + T / 2);
    if (TR) {
      for (const [a, c] of [[g0, g0 + FW], [g1 - FW, g1]]) b.bb(TR.frame, a, c, y0 + db, y0 + dt, z - T / 2 - 2 * E, z + T / 2 + 2 * E);
      b.bb(TR.frame, g0, g1, y0 + dt - FW, y0 + dt, z - T / 2 - 2 * E, z + T / 2 + 2 * E);
      b.bb(TR.frame, g0, g1, y0 + db - 0.002, y0 + db + 0.006, z - T / 2 - 2 * E, z + T / 2 + 2 * E);
    }
    xs = g1;
  }
  if (x1 > xs) seg(xs, x1);
}
/** Wand längs z bei x (gaps wie bei wallX). */
function wallZ(b, mat, x, z0, z1, y0, h, gaps = [], door = 2.0) {
  let zs = z0;
  const seg = (a, c) => {
    b.bb(mat, x - T / 2, x + T / 2, y0, y0 + h, a, c);
    if (TR && h > 2.1) { b.bb(TR.trim, x - T / 2 - E, x + T / 2 + E, y0, y0 + 0.09, a, c); b.bb(TR.trim, x - T / 2 - E, x + T / 2 + E, y0 + h - 0.05, y0 + h, a, c); }
  };
  for (const g of [...gaps].sort((a, c) => a[0] - c[0])) {
    const [g0, g1] = g, dt = g[2] ?? door, db = g[3] ?? 0;
    if (g0 > zs) seg(zs, g0);
    if (dt < h) b.bb(mat, x - T / 2, x + T / 2, y0 + dt, y0 + h, g0, g1);
    if (db > 0) b.bb(mat, x - T / 2, x + T / 2, y0, y0 + db, g0, g1);
    if (TR) {
      for (const [a, c] of [[g0, g0 + FW], [g1 - FW, g1]]) b.bb(TR.frame, x - T / 2 - 2 * E, x + T / 2 + 2 * E, y0 + db, y0 + dt, a, c);
      b.bb(TR.frame, x - T / 2 - 2 * E, x + T / 2 + 2 * E, y0 + dt - FW, y0 + dt, g0, g1);
      b.bb(TR.frame, x - T / 2 - 2 * E, x + T / 2 + 2 * E, y0 + db - 0.002, y0 + db + 0.006, g0, g1);
    }
    zs = g1;
  }
  if (z1 > zs) seg(zs, z1);
}
/** waagerechter Streifen zwischen zwei z-Funktionen über x0..x1 */
function hstrip(qb, y, up, x0, x1, lo, hi, step = 0.5) {
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  for (let i = 0; i < n; i++) {
    const xa = x0 + (x1 - x0) * i / n, xb = x0 + (x1 - x0) * (i + 1) / n;
    const p1 = V(xa, y, lo(xa)), p2 = V(xb, y, lo(xb)), p3 = V(xb, y, hi(xb)), p4 = V(xa, y, hi(xa));
    if (up) qb.quad(p1, p4, p3, p2); else qb.quad(p1, p2, p3, p4);
  }
}
/** senkrechte Querwand bei x, seitlich durch z-Funktionen von y begrenzt */
function vquad(qb, x, y0, y1, za, zb, n = 6) {
  for (let k = 0; k < n; k++) {
    const ya = y0 + (y1 - y0) * k / n, yb = y0 + (y1 - y0) * (k + 1) / n;
    qb.quad(V(x, ya, za(ya)), V(x, ya, zb(ya)), V(x, yb, zb(yb)), V(x, yb, za(yb)));
  }
}
function railZ(C, x, z0, z1, y) {
  const { b, M, nav } = C;
  b.cyl(M.alu, V(x, y + 0.9, z0), V(x, y + 0.9, z1), 0.022, 6); b.cyl(M.alu, V(x, y + 0.45, z0), V(x, y + 0.45, z1), 0.014, 6);
  const n = Math.max(1, Math.round(Math.abs(z1 - z0) / 1.0));
  for (let i = 0; i <= n; i++) b.vcyl(M.alu, 0.018, 0.9, x, y, z0 + (z1 - z0) * i / n, 6);
  nav.block(x - 0.04, x + 0.04, z0, z1, y, y + 1);
}
function railX(C, z, x0, x1, y) {
  const { b, M, nav } = C;
  b.cyl(M.alu, V(x0, y + 0.9, z), V(x1, y + 0.9, z), 0.022, 6); b.cyl(M.alu, V(x0, y + 0.45, z), V(x1, y + 0.45, z), 0.014, 6);
  const n = Math.max(1, Math.round((x1 - x0) / 1.0));
  for (let i = 0; i <= n; i++) b.vcyl(M.alu, 0.018, 0.9, x0 + (x1 - x0) * i / n, y, z, 6);
  nav.block(x0, x1, z - 0.04, z + 0.04, y, y + 1);
}

// ---------- Möbel (Exporte) ----------
export function chair(C, x, y, z, ry, up, arm = false) {
  const { b, M } = C;
  b.at(x, y, z, ry, () => {
    const w = arm ? 0.56 : 0.44;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.vcyl(M.alu, 0.014, sz < 0 ? (arm ? 0.82 : 0.86) : 0.44, sx * (w / 2 - 0.02), 0, sz * 0.2, 5);
    b.box(up, w, arm ? 0.12 : 0.06, 0.46, 0, arm ? 0.42 : 0.45, 0);
    b.box(up, w, 0.36, 0.06, 0, arm ? 0.68 : 0.7, -0.21);
    if (arm) for (const sx of [-1, 1]) { b.box(M.alu, 0.03, 0.03, 0.46, sx * w / 2, 0.64, 0); b.vcyl(M.alu, 0.012, 0.2, sx * w / 2, 0.44, 0.2, 5); }
    for (const sx of [-1, 1]) b.cyl(M.alu, V(sx * (w / 2 - 0.02), 0.012, -0.2), V(sx * (w / 2 - 0.02), 0.012, 0.2), 0.012, 5);
    b.cyl(M.alu, V(-w / 2 + 0.02, 0.86 - (arm ? 0.04 : 0), -0.2), V(w / 2 - 0.02, 0.86 - (arm ? 0.04 : 0), -0.2), 0.013, 5);
    b.cyl(M.alu, V(-w / 2 + 0.02, 0.2, 0.2), V(w / 2 - 0.02, 0.2, 0.2), 0.01, 5);
    b.shadow(M.shadow, 0, 0, 0, w + 0.3, 0.8);
  });
}
export function table(C, x, y, z, w, d, top, h = 0.74, block = true) {
  const { b, M, nav } = C;
  b.shadow(M.shadow, x, y, z, w + 0.5, d + 0.5);
  b.box(M.alu, w - 0.1, 0.05, d - 0.1, x, y + h - 0.04, z);
  b.box(top, w, 0.035, d, x, y + h, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.vcyl(M.alu, 0.018, h, x + sx * (w / 2 - 0.06), y, z + sz * (d / 2 - 0.06), 6);
  if (block) nav.block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + 1);
}
export function lamp(C, x, y, z) { C.b.vcyl(C.M.lamp, 0.22, 0.04, x, y - 0.05, z, 14); C.b.vcyl(C.M.alu, 0.25, 0.015, x, y - 0.015, z, 14); }

function roundTable(C, x, y, z, r, top, h = 0.74, block = true) {
  const { b, M, nav } = C;
  b.shadow(M.shadow, x, y, z, 2 * r + 0.5, 2 * r + 0.5);
  b.vcyl(top, r, 0.035, x, y + h - 0.035, z, 18);
  b.vcyl(M.alu, 0.035, h - 0.035, x, y, z, 8);
  b.vcyl(M.alu, r * 0.55, 0.025, x, y, z, 14);
  if (block) nav.block(x - r * 0.8, x + r * 0.8, z - r * 0.8, z + r * 0.8, y, y + 1);
}

// ---------- Wandbilder (prozedural gemalt) ----------
function sceneTex(seed) {
  return canvasTex(512, 192, (g, w, h) => {
    const r = rng(seed), hue = [28, 200, 340, 45, 170][seed % 5];
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, `hsl(${hue},45%,82%)`); sky.addColorStop(1, `hsl(${hue + 20},50%,90%)`);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,240,200,0.8)'; g.beginPath(); g.arc(w * (0.2 + r() * 0.6), h * 0.3, 18, 0, 7); g.fill();
    for (let l = 0; l < 3; l++) {
      g.fillStyle = `hsl(${hue + 120 + l * 15},${22 + l * 8}%,${70 - l * 12}%)`; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.55 + l * 0.12) - Math.sin(x * 0.012 * (l + 1) + seed + l) * 14 - r() * 6);
      g.lineTo(w, h); g.fill();
    }
    g.fillStyle = '#e8e4da'; g.strokeStyle = '#7a756a'; g.lineWidth = 1.2;
    const zx = w * (0.3 + r() * 0.4), zy = h * 0.28;
    g.beginPath(); g.ellipse(zx, zy, 70, 12, -0.05, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#7a756a'; g.fillRect(zx + 18, zy + 11, 14, 4);
    for (let i = 0; i < 5; i++) { const px = r() * w, py = h * 0.8 + r() * 20; g.fillStyle = '#5f6b4a'; g.fillRect(px, py - 22, 2, 22); g.beginPath(); g.arc(px, py - 24, 9, 0, 7); g.fill(); }
    g.strokeStyle = '#b9a47a'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  }, { repeat: false });
}
function mapTex() {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#d9c9a2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,100,70,0.25)'; for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo(i * w / 12, 0); g.lineTo(i * w / 12, h); g.stroke(); } for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
    const lands = [
      [[.06, .2], [.16, .12], [.27, .14], [.3, .28], [.24, .4], [.2, .5], [.16, .42], [.1, .36]],
      [[.2, .52], [.27, .55], [.31, .66], [.27, .86], [.23, .95], [.21, .78], [.19, .62]],
      [[.44, .2], [.5, .13], [.62, .1], [.8, .12], [.92, .2], [.9, .34], [.8, .44], [.74, .52], [.68, .42], [.6, .46], [.54, .36], [.46, .34]],
      [[.45, .4], [.54, .4], [.6, .52], [.57, .72], [.53, .86], [.49, .7], [.44, .54]],
      [[.8, .68], [.9, .66], [.93, .78], [.84, .84], [.79, .76]],
    ];
    g.fillStyle = '#9a8558'; g.strokeStyle = '#5e4f30'; g.lineWidth = 2;
    for (const l of lands) { g.beginPath(); l.forEach((p, i) => (i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h))); g.closePath(); g.fill(); g.stroke(); }
    g.setLineDash([6, 6]); g.strokeStyle = '#8a2a1e'; g.lineWidth = 2.5;
    for (const [a, c, d] of [[[.5, .27], [.36, .2], [.25, .3]], [[.5, .27], [.4, .5], [.29, .7]], [[.5, .27], [.7, .2], [.9, .3]], [[.46, .3], [.3, .9], [.1, .8]]]) { g.beginPath(); g.moveTo(a[0] * w, a[1] * h); g.quadraticCurveTo(c[0] * w, c[1] * h, d[0] * w, d[1] * h); g.stroke(); }
    g.setLineDash([]); g.strokeStyle = '#5e4f30'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  }, { repeat: false });
}
function balloonTex(seed) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d6b574'; g.fillRect(0, 0, w, h);
    const hue = [10, 210, 45, 130][seed % 4];
    g.fillStyle = `hsl(${hue},45%,42%)`; g.strokeStyle = '#3a2a16'; g.lineWidth = 2;
    if (seed % 2) { g.beginPath(); g.ellipse(w / 2, h * 0.45, 100, 26, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#6a4a2a'; g.fillRect(w / 2 - 20, h * 0.45 + 24, 40, 10); }
    else {
      g.beginPath(); g.ellipse(w / 2, h * 0.38, 62, 72, 0, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,240,200,0.6)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(w / 2, h * 0.38, Math.abs(i) * 22 + 6, 72, 0, 0, 7); g.stroke(); }
      g.strokeStyle = '#3a2a16'; g.beginPath(); g.moveTo(w / 2 - 40, h * 0.6); g.lineTo(w / 2 - 12, h * 0.8); g.moveTo(w / 2 + 40, h * 0.6); g.lineTo(w / 2 + 12, h * 0.8); g.stroke();
      g.fillStyle = '#6a4a2a'; g.fillRect(w / 2 - 14, h * 0.8, 28, 18);
    }
    g.strokeStyle = '#8a6a30'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  }, { repeat: false });
}

// ---------- Kabine (vollständig eingerichtet) ----------
// Lokales System: u längs x ab der Bettwand, v quer ab der Gangwand (zur Rückwand hin).
function buildCabin(C, c) {
  const { b, M, nav } = C;
  const y = c.y, H = c.deck === 'A' ? A_H : BH, L = c.x1 - c.x0;
  const su = c.bedAt === 'x0' ? 1 : -1, ub = su > 0 ? c.x0 : c.x1;
  const zb = c.slope ? Math.sign(c.zc) * c.zb : c.zb;
  const sv = Math.sign(zb - c.zc), D = Math.abs(zb - c.zc);
  const X = (u) => ub + su * u, Zv = (v) => c.zc + sv * v;
  const bx = (mat, u0, u1, y0, y1, v0, v1) => b.bb(mat, Math.min(X(u0), X(u1)), Math.max(X(u0), X(u1)), y + y0, y + y1, Math.min(Zv(v0), Zv(v1)), Math.max(Zv(v0), Zv(v1)));
  const P = (u, yy, v) => V(X(u), y + yy, Zv(v));
  const blk = (u0, u1, v0, v1, h = 1) => nav.block(X(u0), X(u1), Zv(v0), Zv(v1), y, y + h);
  const Mc = M[c.col] || M.wallBlue;
  const small = !!c.small, bu1 = small ? 0.78 : 0.8, d0 = c.dOff ?? (small ? 0.82 : 0.88), d1 = small ? Math.min(L - 0.06, d0 + 0.64) : d0 + 0.72;
  const bv0 = 0.06, bv1 = Math.min(D - 0.08, 1.95);
  const faceX = (dirU) => (dirU * su > 0 ? 'x+' : 'x-'), faceZ = (dirV) => (dirV * sv > 0 ? 'z+' : 'z-');
  // Wandbespannung im eigenen Farbton
  bx(Mc, 0.044, 0.051, 0.09, H - 0.05, 0.05, D - 0.05);
  bx(Mc, L - 0.051, L - 0.044, 0.09, H - 0.05, 0.05, D - 0.05);
  bx(Mc, 0.05, d0, 0.09, H - 0.05, 0.044, 0.051); bx(Mc, d1, L - 0.05, 0.09, H - 0.05, 0.044, 0.051); bx(Mc, d0, d1, 2.0, H - 0.05, 0.044, 0.051);
  if (!c.slope) bx(Mc, 0.05, L - 0.05, 0.09, H - 0.05, D - 0.051, D - 0.044);
  // Bett (unten fest, Luftkissen-Matratze, Federbett)
  bx(M.alu, 0.06, bu1, 0.36, 0.41, bv0, bv1);
  bx(M.linen, 0.08, bu1 - 0.02, 0.41, 0.53, bv0 + 0.02, bv1 - 0.02);
  bx(M.blanket, 0.07, bu1 - 0.01, 0.44, 0.545, bv0 + 0.02, bv1 - 0.45);
  bx(M.linen, 0.12, bu1 - 0.06, 0.53, 0.6, bv1 - 0.4, bv1 - 0.08);
  for (const v of [bv0 + 0.03, bv1 - 0.03]) b.vcyl(M.alu, 0.018, 0.36, X(bu1 - 0.03), y, Zv(v), 6);
  bx(M.crate, 0.15, 0.68, 0.02, 0.25, 0.35, 0.95); bx(M.brass, 0.38, 0.45, 0.2, 0.23, 0.95, 0.965);   // Koffer unter dem Bett
  if (!c.single) {
    if (c.upper) { // oberes Bett heruntergeklappt
      bx(M.alu, 0.06, bu1, 1.3, 1.35, bv0, bv1); bx(M.linen, 0.08, bu1 - 0.02, 1.35, 1.46, bv0 + 0.02, bv1 - 0.02);
      bx(M.blanket, 0.07, bu1 - 0.01, 1.38, 1.475, bv0 + 0.02, bv1 - 0.45); bx(M.linen, 0.12, bu1 - 0.06, 1.46, 1.53, bv1 - 0.4, bv1 - 0.08);
      b.cyl(M.alu, P(bu1 - 0.02, 1.62, bv0 + 0.3), P(bu1 - 0.02, 1.62, bv1 - 0.3), 0.012, 5);
      for (const v of [bv0 + 0.03, bv1 - 0.03]) b.vcyl(M.alu, 0.018, 1.7, X(bu1 - 0.03), y, Zv(v), 6);
      for (const v of [bv0 + 0.25, bv0 + 0.55]) b.cyl(M.alu, P(bu1 + 0.02, 0, v), P(bu1 + 0.02, 1.4, v), 0.012, 5);
      for (const hh of [0.3, 0.65, 1.0]) b.cyl(M.alu, P(bu1 + 0.02, hh, bv0 + 0.25), P(bu1 + 0.02, hh, bv0 + 0.55), 0.01, 5);
    } else {       // tagsüber an die Wand geklappt
      bx(M.alu, 0.051, 0.075, 1.12, 1.98, bv0 + 0.04, bv1 - 0.04); bx(M.blanket, 0.075, 0.16, 1.15, 1.95, bv0 + 0.07, bv1 - 0.07);
      for (const v of [bv0 + 0.35, bv1 - 0.35]) bx(M.leather, 0.16, 0.172, 1.35, 1.42, v - 0.03, v + 0.03);
    }
  }
  b.cyl(M.alu, P(bu1 + 0.04, 2.08, bv0), P(bu1 + 0.04, 2.08, bv1), 0.008, 4);                          // Vorhangstange
  bx(M.curtainBlue, bu1 + 0.02, bu1 + 0.055, 0.55, 2.06, bv1 - 0.32, bv1 - 0.04);                      // Bettvorhang (zusammengezogen)
  bx(M.lamp, 0.051, 0.09, 0.85, 0.9, bv1 - 0.5, bv1 - 0.36); if (c.upper) bx(M.lamp, 0.051, 0.09, 1.78, 1.83, bv1 - 0.5, bv1 - 0.36); // Leselampen
  bx(M.brass, 0.051, 0.062, 0.7, 0.78, bv1 - 0.22, bv1 - 0.15); b.sph(M.red, 0.012, X(0.068), y + 0.74, Zv(bv1 - 0.185), 1, 1, 1, 6); // Rufknopf
  C.sign('Rauchen verboten', X(0.06), y + 0.92, Zv(bv0 + 0.5), 0.05, faceX(1), 'plate');
  blk(0, bu1 + 0.03, 0, bv1 + 0.02, 2);
  // Klappwaschbecken (weißer Kunststoff) mit Spiegel an der Gegenwand
  const vw = Math.min(D - 0.55, 1.4), wu = L - 0.05;
  bx(M.white, wu - 0.34, wu, 0.8, 0.87, vw - 0.22, vw + 0.22);
  bx(M.enamel, wu - 0.3, wu - 0.05, 0.871, 0.877, vw - 0.17, vw + 0.17);
  b.vcyl(M.black, 0.02, 0.008, X(wu - 0.18), y + 0.877, Zv(vw), 8);
  for (const [dv, m] of [[-0.08, M.red], [0.08, M.upBlue]]) { b.vcyl(M.alu, 0.008, 0.08, X(wu - 0.03), y + 0.87, Zv(vw + dv), 5); b.sph(m, 0.013, X(wu - 0.03), y + 0.96, Zv(vw + dv), 1, 1, 1, 6); }
  bx(M.white, wu - 0.26, wu, 0.12, 0.78, vw - 0.2, vw + 0.2);
  bx(M.alu, wu - 0.012, wu - 0.002, 1.15, 1.6, vw - 0.18, vw + 0.18);
  bx(M.glassClear, wu - 0.12, wu, 1.1, 1.11, vw - 0.2, vw + 0.2);
  bx(M.linen, wu - 0.035, wu - 0.02, 0.95, 1.25, vw + 0.27, vw + 0.43);
  blk(wu - 0.36, L, vw - 0.24, vw + 0.24, 1);
  if (!small) {
    // Klapptisch (Schreibbrett) mit Hocker, schmaler Vorhangschrank
    bx(M.woodLight, wu - 0.32, wu, 0.72, 0.745, 0.22, 0.62); b.cyl(M.alu, P(wu - 0.28, 0.5, 0.42), P(wu, 0.6, 0.42), 0.008, 4);
    b.vcyl(M.alu, 0.012, 0.42, X(wu - 0.5), y, Zv(0.45), 5); b.vcyl(M[c.col] === M.wallBlue ? M.upBlue : M.upBrown, 0.14, 0.04, X(wu - 0.5), y + 0.42, Zv(0.45), 10);
    bx(M.curtain, bu1 + 0.05, bu1 + 0.55, 0.15, 1.95, D - 0.38, D - 0.35); bx(M.woodLight, bu1 + 0.05, bu1 + 0.55, 1.95, 1.98, D - 0.38, D - 0.05);
    b.cyl(M.alu, P(bu1 + 0.05, 1.97, D - 0.36), P(bu1 + 0.55, 1.97, D - 0.36), 0.008, 4);
    blk(bu1 + 0.03, bu1 + 0.57, D - 0.4, D, 2);
    b.box(M.carpetBlue, Math.abs(X(L - 0.1) - X(bu1 + 0.06)), 0.01, Math.max(0.3, D - 0.6), (X(L - 0.1) + X(bu1 + 0.06)) / 2, y + 0.006, Zv(0.1 + (D - 0.6) / 2));
  }
  for (const du of [0.15, 0.3]) b.cyl(M.brass, P(d1 + du, 1.72, 0.052), P(d1 + du, 1.72, 0.1), 0.008, 4); // Kleiderhaken
  b.vcyl(M.lamp, 0.09, 0.03, X((bu1 + L) / 2), y + H - 0.05, Zv(D / 2), 10); b.vcyl(M.alu, 0.11, 0.012, X((bu1 + L) / 2), y + H - 0.015, Zv(D / 2), 10);
  // Schiebetür (stoffbespannt) auf der Gangseite, offen
  // Türblatt und Griff sind beweglich: feature_interact.js
  b.cyl(M.alu, P(d0 - 0.76, 2.03, -0.065), P(d1 + 0.04, 2.03, -0.065), 0.01, 4);
  C.sign(c.label, X((d0 + d1) / 2), y + 2.16, Zv(-0.055), 0.085, faceZ(-1), 'brass');
  // Navigation: freie Bodenfläche neben dem Bett und Türöffnung
  nav.zone(c.label === 'Steward' ? 'Steward-Kabine' : 'Kabine ' + c.label, Math.min(X(bu1 + 0.03), X(L - 0.07)), Math.max(X(bu1 + 0.03), X(L - 0.07)), Math.min(Zv(0.07), Zv(D - 0.07)), Math.max(Zv(0.07), Zv(D - 0.07)), y, { plan: c.deck, cabin: true });
  nav.zone(c.label === 'Steward' ? 'Steward-Kabine' : 'Kabine ' + c.label, Math.min(X(d0), X(d1)) + 0.04, Math.max(X(d0), X(d1)) - 0.04, c.zc - 0.32, c.zc + 0.32, y);
}

// =====================================================================
export function buildDecks(C) {
  const { b, M, nav, root } = C;
  const I = C.info;
  TR = { trim: M.trim, frame: M.frame };
  const wallDS = new THREE.MeshLambertMaterial({ color: 0xe4d9be, side: THREE.DoubleSide });
  const winPane = new THREE.MeshLambertMaterial({ color: 0xa8c4d4, emissive: 0x4d6474 });
  const Q = () => new QuadBuf();
  const qWall = Q(), qCeil = Q(), qCanvas = Q(), qFloorB = Q(), qPod = Q(), qCarR = Q(), qCarBr = Q(), qCarBl = Q(), qLino = Q();
  const K = (v) => () => v, hwf = (x) => (y) => hw(x, y), nhw = (x) => (y) => -hw(x, y);
  const M2 = (s, a, c) => (s > 0 ? [a, c] : [-c, -a]);
  const Z = (name, x0, x1, z0, z1, y, o) => nav.zone(name, Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1), y, o);
  const doorX = (name, zw, g0, g1, y) => Z(name, g0 + 0.04, g1 - 0.04, zw - 0.32, zw + 0.32, y);
  const doorZ = (name, xw, g0, g1, y) => Z(name, xw - 0.32, xw + 0.32, g0 + 0.04, g1 - 0.04, y);
  const plA = { plan: 'A' }, plB = { plan: 'B' };
  const fz0 = FALLREEP.zi, fz1 = FALLREEP.zo;

  // =================== BÖDEN, DECKEN, SCHOTTE ===================
  // B-Deck-Boden (Linoleum) und Unterseite, mit Öffnungen für die Fallreeps
  for (const [qb, yy, up] of [[qFloorB, BY, true], [qCanvas, BY - 0.12, false]]) {
    const hh = (x) => hw(x, yy);
    hstrip(qb, yy, up, XA, FRX0, (x) => -hh(x), hh);
    hstrip(qb, yy, up, FRX1, XF, (x) => -hh(x), hh);
    hstrip(qb, yy, up, FRX0, FRX1, (x) => -hh(x), K(-fz1));
    hstrip(qb, yy, up, FRX0, FRX1, K(-fz0), K(fz0));
    hstrip(qb, yy, up, FRX0, FRX1, K(fz1), hh);
  }
  for (const s of [-1, 1]) {
    const [za, zc] = M2(s, fz0, fz1);
    b.bb(M.aluDark, FRX0, FRX1, BY - 0.12, BY, za, za + 0.012); b.bb(M.aluDark, FRX0, FRX1, BY - 0.12, BY, zc - 0.012, zc);
    b.bb(M.aluDark, FRX0, FRX0 + 0.012, BY - 0.12, BY, za, zc); b.bb(M.aluDark, FRX1 - 0.012, FRX1, BY - 0.12, BY, za, zc);
  }
  // Podest im vorderen B-Deck (dort steigt der Rumpfboden an)
  hstrip(qPod, YP, true, XBAR, XF, K(ZK), hwf2(YP));
  hstrip(qPod, YP, true, XKU, XF, (x) => -hw(x, YP), K(-ZK));
  function hwf2(yy) { return (x) => hw(x, yy); }
  vquad(qWall, XBAR, BY, YP, K(ZK), hwf(XBAR), 1);
  vquad(qWall, XKU, BY, YP, nhw(XKU), K(-ZK), 1);
  // Decke des B-Decks (Unterseite A-Deck) mit Treppenlöchern und Schacht vorn
  const hC = (x) => hw(x, BC);
  hstrip(qCeil, BC, false, XA, STA.x0, (x) => -hC(x), hC);
  for (const [lo, hi] of [[(x) => -hC(x), K(-STA.z1)], [K(-STA.z0), K(STA.z0)], [K(STA.z1), hC]]) hstrip(qCeil, BC, false, STA.x0, STA.x1, lo, hi);
  hstrip(qCeil, BC, false, STA.x1, XMG, (x) => -hC(x), hC);
  hstrip(qCeil, BC, false, XMG, XF, (x) => -hC(x), K(-ZK)); hstrip(qCeil, BC, false, XMG, XF, K(ZK), hC);
  // A-Deck-Boden: Teppiche im Kabinenblock (mit Treppenlöchern), Speisesaal, Lounge, Schreibzimmer; Linoleum auf den Promenaden
  hstrip(qCarR, AY, true, XA, STA.x0, K(-ZO), K(ZO));
  for (const [lo, hi] of [[K(-ZO), K(-STA.z1)], [K(-STA.z0), K(STA.z0)], [K(STA.z1), K(ZO)]]) hstrip(qCarR, AY, true, STA.x0, STA.x1, lo, hi);
  hstrip(qCarR, AY, true, STA.x1, XMG, K(-ZO), K(ZO));
  hstrip(qCarR, AY, true, XMG, XF, K(-ZO), K(-ZK)); hstrip(qCarR, AY, true, XMG, XF, K(ZK), K(ZO));
  hstrip(qCarR, AY, true, XA, XF, K(-ZBR), K(-ZO));
  hstrip(qCarBr, AY, true, XA, XQW, K(ZO), K(ZBR));
  hstrip(qCarBl, AY, true, XQW, XF, K(ZO), (x) => hw(x, AY));
  hstrip(qLino, AY, true, XA, XF, (x) => -hw(x, AY), K(-ZBR));
  hstrip(qLino, AY, true, XA, XQW, K(ZBR), (x) => hw(x, AY));
  // Blende zwischen Decke B und Boden A an der Hülle
  for (const s of [-1, 1]) for (let x = XA; x < XF - 0.01; x += 0.5) {
    const xb = Math.min(XF, x + 0.5);
    qWall.quad(V(x, BC, s * hw(x, BC)), V(xb, BC, s * hw(xb, BC)), V(xb, AY, s * hw(xb, AY)), V(x, AY, s * hw(x, AY)));
  }
  // Leibungen der Treppenlöcher und des Schachts zwischen Decke B und Boden A
  for (const s of [-1, 1]) {
    const [za, zc] = M2(s, STA.z0, STA.z1);
    b.bb(M.wallCream, STA.x0 - 0.01, STA.x0, BC, AY, za, zc); b.bb(M.wallCream, STA.x1, STA.x1 + 0.01, BC, AY, za, zc);
    const zo = s * STA.z1; b.bb(M.wallCream, STA.x0, STA.x1, BC, AY, Math.min(zo, zo + s * 0.01), Math.max(zo, zo + s * 0.01));
    b.bb(M.wallCream, XMG, XF, BC, AY, s > 0 ? ZK - 0.04 : -ZK, s > 0 ? ZK : -ZK + 0.04);
  }
  b.bb(M.wallCream, XMG - 0.04, XMG, BC, AY, -ZK, ZK);
  // A-Decke und Stoffbespannung darüber
  hstrip(qCeil, AC, false, XA, XF, (x) => -hw(x, AC), (x) => hw(x, AC));
  hstrip(qCanvas, AC + 0.06, true, XA, XF, (x) => -hw(x, AC), (x) => hw(x, AC));
  // Endschotte (Ring 173 achtern, Ring 188 vorn)
  vquad(qWall, XA, BC, AC, nhw(XA), hwf(XA), 8);
  vquad(qWall, XA, BY, BC, nhw(XA), K(-ZK));
  vquad(qWall, XA, BY, YT, K(-ZK), K(ZK), 1); vquad(qWall, XA, YT + 2.0, BC, K(-ZK), K(ZK), 1);
  vquad(qWall, XA, BY, BC, K(ZK), K(2.4));
  vquad(qWall, XA, BY, YTH, K(2.4), K(3.15), 1);
  vquad(qWall, XA, BY, BC, K(3.15), hwf(XA));
  C.only(1936, () => b.bb(M.wallGrey, XA - 0.02, XA + 0.02, YTH, BC, 2.4, 3.15));   // 1936 noch keine Tür zum Anbau
  vquad(qWall, XF, BC, AC, nhw(XF), K(-ZK), 8); vquad(qWall, XF, BC, AC, K(ZK), hwf(XF), 8);
  vquad(qWall, XF, YF + 2.05, AC, K(-ZK), K(ZK), 2);
  vquad(qWall, XF, BY, BC, nhw(XF), K(-ZK)); vquad(qWall, XF, BY, BC, K(ZK), hwf(XF));
  vquad(qWall, XF, BY, YF, K(-ZK), K(ZK), 1);

  // =================== A-DECK ===================
  const WA = M.wallCream;
  const cabA = CABINS.filter((c) => c.deck === 'A');
  const gapsOn = (zc) => cabA.filter((c) => c.zc === zc).map(cabDoor);
  wallX(b, WA, -ZO, XK0 - 0.04, XF, AY, A_H, [[180.5, 181.6]]);       // Speisesaal | Kabinen, Durchgang zur Anrichte
  wallX(b, WA, ZO, XK0 - 0.04, XF, AY, A_H);
  wallX(b, WA, -ZG, XK0 - 0.04, XF, AY, A_H, gapsOn(-ZG));
  wallX(b, WA, ZG, XK0 - 0.04, XF, AY, A_H, gapsOn(ZG));
  wallX(b, WA, -ZGI, XK2 - 0.04, XF, AY, A_H); wallX(b, WA, ZGI, XK2 - 0.04, XF, AY, A_H);
  wallX(b, WA, -ZM, XK2 - 0.04, XF, AY, A_H, gapsOn(-ZM)); wallX(b, WA, ZM, XK2 - 0.04, XF, AY, A_H, gapsOn(ZM));
  wallZ(b, WA, XK0, -ZO, -ZG, AY, A_H); wallZ(b, WA, XK0, ZG, ZO, AY, A_H);
  wallZ(b, WA, XK2, -ZGI, -ZM, AY, A_H); wallZ(b, WA, XK2, ZM, ZGI, AY, A_H);
  wallZ(b, WA, XMG, -ZM, ZM, AY, A_H);
  for (const x of [XPAN0, XPAN1]) wallZ(b, WA, x, -ZO, -ZG, AY, A_H);
  for (const c of cabA) if (Math.abs(c.x0 - (c.row === 2 || c.row === 3 ? XK2 : XK0)) > 0.01 && Math.abs(c.x0 - XPAN1) > 0.01) wallZ(b, WA, c.x0, Math.min(c.zc, c.zb), Math.max(c.zc, c.zb), AY, A_H);
  for (const c of cabA) buildCabin(C, c);

  // Zonen Treppenhalle, Gänge
  Z('Treppenhalle', 173.2, XK0 - 0.07, -ZO - 0.1, ZO + 0.1, AY, plA);
  Z('Treppenhalle', XK0 - 0.1, STA.x1 + 0.12, -0.6, 0.6, AY);
  Z('Quergang', STA.x1 + 0.07, XK2 - 0.07, -ZG + 0.07, ZG - 0.07, AY, plA);
  Z('Mittelgang', STA.x1 + 0.07, XMG - 0.07, -ZM + 0.07, ZM - 0.07, AY, plA);
  Z('Kabinengang Backbord', STA.x1 + 0.07, XF - 0.07, -ZG + 0.07, -ZGI - 0.07, AY, plA);
  Z('Kabinengang Steuerbord', STA.x1 + 0.07, XF - 0.07, ZGI + 0.07, ZG - 0.07, AY, plA);
  for (let x = 176.8; x < XF; x += 2.5) { lamp(C, x, AC, 0); lamp(C, x, AC, -2.85); lamp(C, x, AC, 2.85); }

  // ---------- Treppen A ↔ B (zwei quer laufende Läufe, oben innen, unten außen) ----------
  for (const s of [-1, 1]) {
    const n = 15, z0 = STA.z0, z1 = STA.z1, run = (z1 - z0) / n, rise = (AY - BY) / n, xa = STA.x0, xc = STA.x1, xm = (xa + xc) / 2;
    for (let k = 1; k < n; k++) {
      const zm = z0 + k * run, yk = AY - k * rise;
      const [ta, tc] = M2(s, zm - run / 2, zm + run / 2);
      b.bb(M.linoRed, xa + 0.04, xc - 0.04, yk - 0.035, yk, ta, tc);
      const [na, nc] = M2(s, zm - run / 2, zm - run / 2 + 0.03); b.bb(M.alu, xa + 0.04, xc - 0.04, yk - 0.03, yk + 0.005, na, nc);
      const [ra, rc] = M2(s, zm - run / 2 - 0.012, zm - run / 2); b.bb(M.woodDark, xa + 0.05, xc - 0.05, yk, yk + rise - 0.035, ra, rc);
    }
    for (const x of [xa + 0.02, xc - 0.02]) b.beam(M.aluDark, V(x, AY - 0.1, s * z0), V(x, BY - 0.02, s * z1), 0.04, 0.24);
    for (const x of [xa + 0.06, xc - 0.06]) {
      b.cyl(M.alu, V(x, AY + 0.9, s * z0), V(x, BY + 0.9, s * z1), 0.02, 6);
      for (const k of [3, 8, 13]) { const zk = z0 + k * run; b.vcyl(M.alu, 0.014, 0.9, x, AY - k * rise, s * zk, 5); }
    }
    const zE = z0 + (AY - BY - 0.27) / (AY - BY) * (z1 - z0);
    b.beam(M.wallCream, V(xm, AY - 0.25, s * z0), V(xm, AY - (zE - z0) / (z1 - z0) * (AY - BY) - 0.25, s * zE), xc - xa - 0.02, 0.03);
    nav.ramp('Treppe zwischen A- und B-Deck', xa + 0.07, xc - 0.07, s > 0 ? z0 : -z1, s > 0 ? z1 : -z0, s > 0 ? AY : BY, s > 0 ? BY : AY, 'z');
    nav.block(xa, xc, s * 1.17, s * 2.85, BY, BY + 0.15);  // unter dem Lauf zu niedrig
    railZ(C, xa, s * 0.62, s * (ZG - 0.05), AY); railZ(C, xc, s * 0.62, s * (ZG - 0.05), AY);
    C.sign('Zum B-Deck', XK0 - 0.05, AY + 1.95, s * 4.25, 0.09, 'x-', 'brass');
  }

  // ---------- Treppenhalle (Foyer): Büste, Anschlagbrett ----------
  b.bb(M.woodDark, 173.12, 173.5, AY, AY + 1.12, -0.28, 0.28); b.bb(M.trim, 173.1, 173.54, AY + 1.12, AY + 1.16, -0.32, 0.32);
  b.box(M.bronze, 0.26, 0.24, 0.46, 173.3, AY + 1.3, 0); b.sph(M.bronze, 0.13, 173.31, AY + 1.55, 0, 0.95, 1.15, 0.9, 12);
  b.box(M.brass, 0.01, 0.06, 0.24, 173.505, AY + 0.9, 0);
  nav.block(173.08, 173.52, -0.3, 0.3, AY, AY + 2);
  b.bb(M.cork, 173.062, 173.07, AY + 1.05, AY + 1.95, -2.75, -1.25); b.bb(M.cork, 173.062, 173.07, AY + 1.05, AY + 1.95, 1.25, 2.75);
  C.panel('pos', (g, w, h) => {
    g.fillStyle = '#c9dbe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8c79a';
    g.beginPath(); g.moveTo(0, 20); g.lineTo(30, 30); g.lineTo(26, 70); g.lineTo(0, 90); g.fill();
    g.beginPath(); g.moveTo(128, 10); g.lineTo(100, 24); g.lineTo(96, 60); g.lineTo(128, 66); g.fill();
    g.strokeStyle = '#8a2a1e'; g.setLineDash([4, 3]); g.lineWidth = 2; g.beginPath(); g.moveTo(104, 40); g.quadraticCurveTo(64, 20, 26, 48); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#a3261c'; g.beginPath(); g.arc(70, 30, 4, 0, 7); g.fill();
    g.fillStyle = '#222'; g.font = 'bold 10px Georgia'; g.fillText('Standort', 44, 118);
  }, 173.075, AY + 1.5, -2.0, 1.4, 0.8, 'x+');
  C.panel('funk', (g, w, h) => {
    g.fillStyle = '#efe8d2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2520'; g.font = 'bold 11px Georgia'; g.fillText('Funknachrichten', 18, 16);
    g.fillStyle = 'rgba(40,35,30,0.55)'; for (let i = 0; i < 12; i++) g.fillRect(10, 26 + i * 8, 40 + ((i * 37) % 70), 2);
  }, 173.075, AY + 1.5, 2.0, 1.4, 0.8, 'x+');
  C.gauge(173.075, AY + 2.12, 0, 0.3, 'x+', 'Bordzeit', 4, '#f4efe0');
  lamp(C, 173.7, AC, -3.0); lamp(C, 173.7, AC, 3.0);

  // ---------- Speisesaal und Backbord-Promenade ----------
  Z('Speisesaal', 173.2, XF - 0.07, -ZBR + 0.04, -ZO - 0.07, AY, plA);
  const prom = (name, s, x0, x1) => {
    Z(name, x0, x1, s * (ZBR - 0.06), s * (hw(x1, AY) - 0.12), AY, plA);
    for (let xa = x0; xa < x1 - 0.01; xa += 2.5) { const xb = Math.min(x1, xa + 2.5); Z(name, xa, xb, s * (ZBR - 0.06), s * (hw(xb, AY) - 0.12), AY); }
  };
  prom('Promenade Backbord', -1, 173.35, 187.65);
  const brust = (s, x0, x1, gaps) => {
    let xs = x0; const z = s * ZBR;
    const seg = (a, c) => {
      b.bb(M.woodDark, a, c, AY, AY + 0.8, z - 0.05, z + 0.05);
      b.bb(M.alu, a, c, AY + 0.8, AY + 0.83, z - 0.065, z + 0.065);
      b.bb(M.trim, a, c, AY, AY + 0.08, z - 0.057, z + 0.057);
      for (const xe of [a, c]) b.vcyl(M.alu, 0.068, 0.845, xe, AY, z, 10);
      nav.block(a - 0.07, c + 0.07, z - 0.07, z + 0.07, AY, AY + 1);
    };
    for (const [g0, g1] of gaps) { seg(xs, g0); xs = g1; } seg(xs, x1);
  };
  brust(-1, 173.35, 187.65, [[180.25, 181.05]]);
  {
    const tz = -7.25;
    for (const [tx, round] of [[175.0, 0], [177.2, 1], [179.3, 0], [182.2, 0], [184.4, 1], [186.6, 0]]) {
      if (round) {
        roundTable(C, tx, AY, tz, 0.62, M.linen);
        b.vcyl(M.linen, 0.66, 0.16, tx, AY + 0.585, tz, 18);
        for (let k = 0; k < 6; k++) {
          const a = k * Math.PI / 3 + Math.PI / 6;
          chair(C, tx + Math.sin(a) * 0.98, AY, tz + Math.cos(a) * 0.98, a + Math.PI, M.upRed);
          b.vcyl(M.enamel, 0.11, 0.012, tx + Math.sin(a) * 0.45, AY + 0.745, tz + Math.cos(a) * 0.45, 12);
          b.vcyl(M.glassClear, 0.03, 0.1, tx + Math.sin(a + 0.35) * 0.4, AY + 0.745, tz + Math.cos(a + 0.35) * 0.4, 8);
        }
      } else {
        table(C, tx, AY, tz, 0.95, 0.95, M.linen, 0.74);
        b.box(M.linen, 0.99, 0.16, 0.99, tx, AY + 0.665, tz);
        for (const [dx, dz, ry] of [[0, 0.7, Math.PI], [0, -0.7, 0], [0.7, 0, -Math.PI / 2], [-0.7, 0, Math.PI / 2]]) {
          chair(C, tx + dx, AY, tz + dz, ry, M.upRed);
          b.vcyl(M.enamel, 0.11, 0.012, tx + dx * 0.43, AY + 0.762, tz + dz * 0.43, 12);
          b.vcyl(M.glassClear, 0.03, 0.1, tx + dx * 0.36 + 0.17 * Math.sign(dz), AY + 0.762, tz + dz * 0.36 - 0.17 * Math.sign(dx), 8); // Glas rechts oberhalb des Tellers
        }
      }
      b.vcyl(M.brass, 0.035, 0.16, tx, AY + 0.76, tz, 8); b.sph(M.plant, 0.06, tx, AY + 0.97, tz, 1, 0.8, 1, 8);
    }
    for (const [x0, x1] of [[174.9, 176.5], [177.4, 179.0], [182.6, 184.2], [185.1, 186.7]]) { // Buffets an der Kabinenwand
      b.bb(M.woodLight, x0, x1, AY, AY + 0.88, -ZO - 0.5, -ZO - 0.05); b.bb(M.alu, x0 - 0.02, x1 + 0.02, AY + 0.88, AY + 0.91, -ZO - 0.52, -ZO - 0.05);
      b.bb(M.trim, x0 + 0.02, x1 - 0.02, AY + 0.05, AY + 0.1, -ZO - 0.505, -ZO - 0.495);
      nav.block(x0, x1, -ZO - 0.52, -ZO - 0.04, AY, AY + 1);
    }
    picture(root, sceneTex(1), 176.95, AY + 1.62, -ZO - 0.056, 4.0, 1.15, 'z-');
    picture(root, sceneTex(2), 184.65, AY + 1.62, -ZO - 0.056, 4.0, 1.15, 'z-');
    for (const x of [175.0, 177.2, 179.3, 182.2, 184.4, 186.6]) lamp(C, x, AC, -7.25);
    for (const s of [-1, 1]) for (const [x0, x1] of s < 0 ? [[175.3, 176.9], [178.0, 179.6]] : [[174.3, 175.9], [177.6, 179.2]]) {
      const [za, zc] = M2(s, ZBR + 0.07, ZBR + 0.52);
      b.bb(M.woodDark, x0, x1, AY, AY + 0.36, za, zc); b.bb(s < 0 ? M.upRed : M.upBrown, x0, x1, AY + 0.36, AY + 0.45, za, zc);
      nav.block(x0, x1, za, zc, AY, AY + 1);
    }
  }
  // Fensterhandläufe und Spantrahmen an den Promenaden
  for (const s of [-1, 1]) {
    const yr = AY + 0.95, pts = [];
    for (let x = 173.4; x <= 187.61; x += 0.71) pts.push(V(x, yr, s * (hw(x, yr) - 0.1)));
    for (let i = 0; i < pts.length - 1; i++) b.cyl(M.alu, pts[i], pts[i + 1], 0.02, 6);
    for (let i = 0; i < pts.length; i += 3) b.cyl(M.alu, pts[i], V(pts[i].x, yr, s * (hw(pts[i].x, yr) + 0.02)), 0.012, 4);
    for (const xr of [178, 183]) nav.block(xr - 0.16, xr + 0.16, s * (hw(xr, AY) - 0.45), s * (hw(xr, AY) + 0.1), AY, AY + 2.5);
  }

  // ---------- Anrichte mit Speiseaufzug ----------
  Z('Anrichte', 180.8, XPAN1 - 0.07, -ZO + 0.07, -4.05, AY, plA);
  doorX('Anrichte', -ZO, 180.5, 181.6, AY);
  b.bb(M.alu, XPAN0 + 0.04, 180.72, AY, AY + 0.9, -ZO + 0.08, -ZG - 0.08); b.bb(M.steel, XPAN0 + 0.04, 180.74, AY + 0.9, AY + 0.93, -ZO + 0.08, -ZG - 0.06);
  nav.block(XPAN0, 180.74, -ZO, -ZG, AY, AY + 1);
  b.bb(M.woodLight, 180.9, 181.7, YP, AY + 1.05, -4.1, -3.45);                   // Schacht des Speiseaufzugs (Küche → Anrichte)
  b.bb(M.alu, 181.0, 181.6, AY + 0.4, AY + 0.98, -4.115, -4.1);
  nav.block(180.9, 181.7, -4.1, -3.4, AY, AY + 2);
  b.bb(M.woodLight, 181.56, XPAN1 - 0.04, AY + 1.2, AY + 1.23, -5.1, -4.2); b.bb(M.woodLight, 181.56, XPAN1 - 0.04, AY + 1.6, AY + 1.63, -5.1, -4.2);
  { const r = rng(12); for (let k = 0; k < 6; k++) b.vcyl(M.enamel, 0.09, 0.05 + r() * 0.05, 181.66, AY + 1.23, -5.0 + k * 0.15, 10); }
  nav.block(181.56, XPAN1, -ZO, -4.15, AY, AY + 2);
  C.sign('Anrichte', 181.05, AY + 2.16, -ZO - 0.055, 0.085, 'z-', 'brass');
  lamp(C, 181.1, AC, -4.6);

  // ---------- Gesellschaftsraum, Steuerbord-Promenade ----------
  Z('Gesellschaftsraum', 173.2, XQW - 0.07, ZO + 0.07, ZBR - 0.04, AY, plA);
  prom('Promenade Steuerbord', 1, 173.35, XQW - 0.07);
  brust(1, 173.35, XQW - 0.6, [[176.0, 176.8], [179.6, 180.4]]);
  picture(root, mapTex(), 177.6, AY + 1.6, ZO + 0.056, 6.0, 1.5, 'z+');
  const group = (x, z, n = 4) => {
    roundTable(C, x, AY, z, 0.38, M.woodLight, 0.6);
    for (let k = 0; k < n; k++) { const a = k * 2 * Math.PI / n + 0.4; chair(C, x + Math.sin(a) * 0.8, AY, z + Math.cos(a) * 0.8, a + Math.PI, M.upBrown, true); }
    b.vcyl(M.glassClear, 0.035, 0.12, x + 0.1, AY + 0.6, z, 8);
  };
  group(175.6, 7.0); group(178.1, 7.0);
  C.only(1936, () => { // Blüthner-Stutzflügel aus Aluminium (1936 an Bord, vor der Saison 1937 ausgebaut)
    b.at(181.8, AY, 6.95, 0, () => {
      const s = new THREE.Shape(); s.moveTo(-0.75, -0.3); s.lineTo(0.75, -0.3); s.lineTo(0.75, 0.5); s.quadraticCurveTo(0.7, 1.3, 0.1, 1.45); s.quadraticCurveTo(-0.5, 1.5, -0.75, 0.6); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 6 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.7, 0);
      b.add(M.pigskin, g);
      b.box(M.enamel, 1.3, 0.03, 0.16, 0, 0.74, 0.38); b.box(M.black, 1.3, 0.035, 0.08, 0, 0.745, 0.34);
      for (const [lx, lz] of [[-0.6, 0.15], [0.6, 0.15], [0, -1.2]]) b.vcyl(M.alu, 0.035, 0.7, lx, 0, lz, 8);
      b.box(M.pigskin, 0.6, 0.06, 0.32, 0, 0.48, 0.85); for (const sx of [-1, 1]) b.vcyl(M.alu, 0.016, 0.46, sx * 0.25, 0, 0.85, 6);
      b.shadow(M.shadow, 0, 0, -0.5, 1.8, 2.2);
    });
    nav.block(181.0, 182.6, 5.45, 7.45, AY, AY + 1.2);
  });
  C.only(1937, () => group(181.6, 6.9, 3));
  for (const x of [175.6, 178.1, 181.4]) lamp(C, x, AC, 7.0);

  // ---------- Schreib- und Lesezimmer (vorn an Steuerbord) ----------
  wallZ(b, M.wallPeach, XQW, ZO, 9.7, AY, A_H, [[8.3, 9.2]]);
  vquad(qWall, XQW, AY, AC, K(9.7), hwf(XQW), 6);
  doorZ('Schreib- und Lesezimmer', XQW, 8.3, 9.2, AY);
  Z('Schreib- und Lesezimmer', XQW + 0.07, XF - 0.07, ZO + 0.07, 9.0, AY, plA);
  Z('Schreib- und Lesezimmer', XQW + 0.07, 185.4, 8.9, hw(185.4, AY) - 0.12, AY);
  Z('Schreib- und Lesezimmer', 185.4, 187.65, 8.9, hw(187.65, AY) - 0.12, AY);
  for (const x of [184.3, 186.3]) {
    table(C, x, AY, 9.35, 1.0, 0.5, M.woodLight, 0.74); chair(C, x, AY, 8.7, 0, M.upBrown);
    b.box(M.paper, 0.3, 0.01, 0.22, x - 0.1, AY + 0.762, 9.3); b.vcyl(M.brass, 0.05, 0.3, x + 0.38, AY + 0.758, 9.45, 8); b.sph(M.lamp, 0.06, x + 0.38, AY + 1.1, 9.45, 1, 0.6, 1, 8);
    b.vcyl(M.black, 0.02, 0.07, x + 0.25, AY + 0.758, 9.25, 6);
  }
  roundTable(C, 185.2, AY, 6.8, 0.42, M.woodLight, 0.62);
  for (const a of [0.6, 2.6, 4.6]) chair(C, 185.2 + Math.sin(a) * 0.85, AY, 6.8 + Math.cos(a) * 0.85, a + Math.PI, M.upBrown, true);
  b.bb(M.woodDark, 185.8, 187.5, AY, AY + 1.8, ZO + 0.05, ZO + 0.42); b.bb(M.glassClear, 185.85, 187.45, AY + 0.9, AY + 1.75, ZO + 0.425, ZO + 0.432);
  { const r = rng(31), cs = [M.upRed, M.upBlue, M.upGreen, M.upBrown, M.paper];
    for (const yb of [0.95, 1.35]) for (let x = 185.9; x < 187.38;) { const w = 0.03 + r() * 0.03; b.bb(cs[Math.floor(r() * 5)], x, x + w, AY + yb, AY + yb + 0.22 + r() * 0.08, ZO + 0.12, ZO + 0.38); x += w + 0.004; }
    for (const yb of [0.92, 1.32]) b.bb(M.woodDark, 185.85, 187.45, AY + yb, AY + yb + 0.03, ZO + 0.06, ZO + 0.41); }
  nav.block(185.8, 187.5, ZO, ZO + 0.45, AY, AY + 2);
  b.bb(M.brass, XQW + 0.04, XQW + 0.16, AY + 0.9, AY + 1.25, 5.9, 6.3); b.bb(M.black, XQW + 0.16, XQW + 0.165, AY + 1.15, AY + 1.18, 6.0, 6.2);
  C.sign('Briefkasten', XQW + 0.17, AY + 1.36, 6.1, 0.07, 'x+', 'brass');
  picture(root, sceneTex(4), 184.4, AY + 1.6, ZO + 0.056, 2.0, 0.8, 'z+');
  picture(root, sceneTex(5), XQW + 0.056, AY + 1.6, 6.9, 1.6, 0.7, 'x+');
  lamp(C, 184.8, AC, 7.2); lamp(C, 186.6, AC, 8.6);

  // =================== B-DECK ===================
  const WB = M.wallGrey, WP = M.wallCream;
  // Kielgang-Wände mit Türen (Zahlmeister Stb; Mannschaftsmesse, Küche, Offiziersmesse Bb)
  wallX(b, WB, ZK, XA + 0.39, XF, BY, BH, [[180.6, 181.3]]);
  wallX(b, WB, -ZK, XA + 0.39, XF, BY, BH, [[179.0, 179.7], [183.6, 184.3, 2.3, 0.3], [185.5, 186.2, 2.3, 0.3]]);
  // Kielgang: Schwelle achtern über Ring 173, Podest und Stufen vorn über Ring 188
  b.bb(M.plank, 172.55, 173.45, YT - 0.06, YT, -ZK, ZK);
  for (const [x0, x1, h] of [[173.45, 173.7, (YT - BY) * 2 / 3], [173.7, 173.95, (YT - BY) / 3]]) b.bb(M.plank, x0, x1, BY, BY + h, -ZK + 0.04, ZK - 0.04);
  b.bb(M.linoGreen, 182.6, 182.9, BY, BY + 0.1, -ZK + 0.04, ZK - 0.04); b.bb(M.linoGreen, 182.9, 183.2, BY, BY + 0.2, -ZK + 0.04, ZK - 0.04);
  b.bb(M.linoGreen, 183.2, 186.8, BY, YP, -ZK + 0.04, ZK - 0.04);
  { const n = 5; for (let i = 0; i < n; i++) { const x0 = 186.8 + 0.9 * i / n, x1 = 186.8 + 0.9 * (i + 1) / n; b.bb(M.plank, x0, x1, BY, YP + (YF - YP) * (i + 1) / n, -ZK + 0.04, ZK - 0.04); } }
  b.bb(M.plank, 187.7, 188.05, YF - 0.06, YF, -ZK, ZK);
  b.bb(M.plank, 173.95, 182.6, BY, BY + 0.012, -0.3, 0.3);
  for (const [xa, xb, ya, yb] of [[170.2, 172.55, keelY(170.2), YT], [188.05, 190.8, YF, keelY(190.8)]]) {
    const n = 8;
    for (let i = 0; i < n; i++) { const x0 = xa + (xb - xa) * i / n, x1 = xa + (xb - xa) * (i + 1) / n, y = ya + (yb - ya) * (i + 0.5) / n; b.bb(M.plank, x0, x1, y - 0.06, y, -0.5, 0.5); }
    for (const z of [-0.52, 0.52]) { b.cyl(M.rope, V(xa, ya + 0.95, z), V(xb, yb + 0.95, z), 0.015, 5); for (const x of [xa, xb]) b.vcyl(M.alu, 0.016, 0.95, x, x === xa ? ya : yb, z, 5); }
  }
  nav.ramp('Übergang zum Kielgang (achtern)', 170.2, 172.6, -0.45, 0.45, keelY(170.2), YT, 'x');
  Z('Übergang zum Kielgang (achtern)', 172.55, 173.5, -0.45, 0.45, YT);
  nav.ramp('Kielgang (B-Deck)', 173.45, 173.95, -0.42, 0.42, YT, BY, 'x');
  Z('Kielgang (B-Deck)', 173.9, 182.65, -0.42, 0.42, BY, plB);
  nav.ramp('Kielgang (B-Deck)', 182.6, 183.2, -0.42, 0.42, BY, YP, 'x');
  Z('Kielgang (B-Deck)', 183.15, 186.85, -0.42, 0.42, YP, plB);
  nav.ramp('Kielgang (B-Deck)', 186.8, 187.7, -0.42, 0.42, YP, YF, 'x');
  Z('Übergang zum Kielgang (vorn)', 187.65, 188.1, -0.45, 0.45, YF);
  nav.ramp('Übergang zum Kielgang (vorn)', 188.05, 190.8, -0.45, 0.45, YF, keelY(190.8), 'x');
  for (const x of [175.5, 178.5, 181.5]) lamp(C, x, BC, 0); lamp(C, 185.0, BC, 0);
  C.sign('Kielgang', XA + 0.02, YT + 2.1, 0, 0.09, 'x+', 'dark');
  C.sign('Kein Zutritt für Fahrgäste', 179.35, BY + 2.16, -ZK + 0.055, 0.08, 'z+', 'red');

  // ---------- Treppenschächte und Fallreeps achtern (beiderseits des Kiels) ----------
  for (const s of [-1, 1]) {
    const nm = s > 0 ? 'Treppe und Fallreep Steuerbord' : 'Treppe und Fallreep Backbord';
    Z(nm, 173.4, XWC - 0.07, s * (fz1 + 0.05), s * (hw(XWC, BY) - 0.15), BY, plB);
    Z(nm, 173.4, FRX0 + 0.05, s * (ZK + 0.12), s * (fz1 + 0.1), BY);
    Z(nm, XWC - 0.1, 176.0, s * (ZFL + 0.07), s * (hw(176.0, BY) - 0.15), BY);
    C.mode('flug', () => {
      Z(nm, FRX0, FRX1, s * (ZK + 0.12), s * (fz1 + 0.1), BY);
      const [za, zc] = M2(s, fz0, fz1);
      b.bb(M.aluDark, FRX0 + 0.012, FRX1 - 0.012, BY - 0.04, BY - 0.004, za + 0.012, zc - 0.012);           // Bodenklappe
      for (let x = FRX0 + 0.2; x < FRX1; x += 0.3) b.bb(M.alu, x, x + 0.02, BY - 0.004, BY + 0.002, za + 0.05, zc - 0.05);
      b.cyl(M.steel, V(FRX1 - 0.05, BY - 0.02, za + 0.05), V(FRX1 - 0.05, BY - 0.02, zc - 0.05), 0.02, 6);   // Scharnier
    });
    railX(C, s * (fz1 + 0.02), 174.12, FRX1, BY);
    C.sign('Fallreep', 173.95, BY + 1.0, s * (fz1 + 0.05), 0.08, s > 0 ? 'z+' : 'z-', 'dark');
    lamp(C, 174.6, BC, s * 3.9);
  }
  // Abgabetisch (Kameras, Feuerzeuge) an Steuerbord
  b.bb(M.woodLight, 173.45, 174.1, BY, BY + 0.9, 4.35, 4.85); b.bb(M.alu, 173.43, 174.12, BY + 0.9, BY + 0.93, 4.33, 4.87);
  b.box(M.black, 0.16, 0.1, 0.12, 173.7, BY + 0.98, 4.6); b.box(M.leather, 0.12, 0.08, 0.1, 173.95, BY + 0.97, 4.5);
  nav.block(173.43, 174.12, 4.33, 4.87, BY, BY + 1);

  // ---------- Steuerbord (Passagiere) ----------
  wallZ(b, M.wallWhite, XWC, ZK, ZFL, BY, BH); wallZ(b, M.wallWhite, XHD, ZK, ZFL, BY, BH); wallZ(b, WP, XZM, ZK, ZFL, BY, BH);
  wallX(b, WP, ZFL, XWC - 0.04, XBAR, BY, BH, [[176.0, 176.7], [178.9, 179.6], [179.87, 180.55]]);
  wallZ(b, WP, XSL, ZFL, ZPA + 0.05, BY, BH, [[ZFL + 0.07, ZPA - 0.03]]);
  wallX(b, WP, ZPA + 0.05, XSL, XBAR, BY, BH);
  wallZ(b, M.woodDark, XBAR, ZK, ZPA + 0.1, BY, BH, [[ZFL + 0.07, ZPA - 0.03]]); vquad(qWall, XBAR, YP, BC, K(ZPA + 0.1), hwf(XBAR), 6);
  wallZ(b, M.wallBlue, XRS, ZK, ZPA + 0.1, BY, BH, [[ZFL, ZPA - 0.15, 2.3, 0.3]]); vquad(qWall, XRS, YP, BC, K(ZPA + 0.1), hwf(XRS), 6);
  const parapet = (s, x0, x1) => {
    let mt = -99; for (let x = x0; x <= x1 + 1e-6; x += 0.25) mt = Math.max(mt, tipY(x));
    const top = Math.max(BY + 0.42, mt + 0.06), [za, zc] = M2(s, ZPA, ZPA + 0.5);
    b.bb(M.wallCream, x0, x1, BY, top - 0.03, za, zc); b.bb(M.woodLight, x0, x1, top - 0.03, top, za - 0.02, zc + 0.02);
    b.bb(M.trim, x0, x1, BY, BY + 0.08, za - 0.007, zc + 0.007);
    b.cyl(M.alu, V(x0, top + 0.3, s * (ZPA + 0.05)), V(x1, top + 0.3, s * (ZPA + 0.05)), 0.018, 6);
    for (let x = x0 + 0.3; x < x1; x += 1.2) b.vcyl(M.alu, 0.012, 0.3, x, top, s * (ZPA + 0.05), 5);
    nav.block(x0, x1, za, zc, BY, BY + 1);
  };
  parapet(1, 176.0, XBAR); parapet(-1, 176.0, XMM);    // achtern davon liegt der Längsträger noch unter dem Boden
  Z('Passagierflur (B-Deck)', STA.x1 - 0.3, XSL - 0.03, ZFL + 0.07, ZPA - 0.04, BY, plB);
  for (const x of [176.6, 179.3]) lamp(C, x, BC, 2.7);
  // Toiletten (Herren mit Urinalen, Damen), je zwei WCs innen am Kielgang
  const wcStall = (x0, x1, zi, zo, y, s) => {
    const [za, zc] = M2(s, zi, zo), xm = (x0 + x1) / 2;
    wallZ(b, M.wallWhite, x1, za, zc, y, 1.9);
    b.box(M.enamel, 0.38, 0.4, 0.5, xm, y + 0.2, s * (zi + 0.28)); b.box(M.white, 0.36, 0.03, 0.42, xm, y + 0.415, s * (zi + 0.3));
    b.box(M.enamel, 0.4, 0.35, 0.16, xm, y + 0.9, s * (zi + 0.1)); b.cyl(M.alu, V(xm + 0.12, y + 0.9, s * (zi + 0.1)), V(xm + 0.12, y + 0.45, s * (zi + 0.15)), 0.012, 5);
    b.bb(M.wallWhite, x0 + 0.04, x0 + 0.06, y, y + 1.9, Math.min(s * zo, s * (zo - 0.6)), Math.max(s * zo, s * (zo - 0.6)));   // offene Tür
    nav.block(x0, x1, za, zc, y, y + 2);
  };
  wcStall(XWC + 0.04, 176.65, ZK + 0.04, 1.35, BY, 1); wcStall(176.65, XHD - 0.04, ZK + 0.04, 1.35, BY, 1);
  wcStall(XHD + 0.04, 178.75, ZK + 0.04, 1.35, BY, 1); wcStall(178.75, XZM - 0.04, ZK + 0.04, 1.35, BY, 1);
  for (const z of [1.62, 1.98]) { b.box(M.enamel, 0.2, 0.55, 0.3, XHD - 0.14, BY + 0.75, z); }    // Urinale
  nav.block(XHD - 0.26, XHD, 1.45, 2.15, BY, BY + 1);
  for (const [x, nm] of [[XWC + 0.2, 'H'], [XHD + 0.2, 'D']]) {
    b.box(M.enamel, 0.3, 0.12, 0.42, x, BY + 0.82, 1.8); b.box(M.alu, 0.012, 0.45, 0.36, x - 0.155, BY + 1.35, 1.8);
    b.vcyl(M.alu, 0.008, 0.08, x - 0.1, BY + 0.88, 1.8, 5); nav.block(x - 0.16, x + 0.15, 1.55, 2.05, BY, BY + 1);
    void nm;
  }
  Z('Herrentoilette', XWC + 0.07, XHD - 0.07, 1.42, ZFL - 0.07, BY, plB); doorX('Herrentoilette', ZFL, 176.0, 176.7, BY);
  Z('Damentoilette', XHD + 0.07, XZM - 0.07, 1.42, ZFL - 0.07, BY, plB); doorX('Damentoilette', ZFL, 178.9, 179.6, BY);
  C.sign('Herren', 176.35, BY + 2.16, ZFL + 0.055, 0.085, 'z+'); C.sign('Damen', 179.25, BY + 2.16, ZFL + 0.055, 0.085, 'z+');
  lamp(C, 176.7, BC, 1.6); lamp(C, 178.75, BC, 1.6);
  // Zahlmeister (mit Tür zum Kielgang)
  Z('Zahlmeister', XZM + 0.07, XBAR - 0.07, ZK + 0.07, ZFL - 0.07, BY, plB);
  doorX('Zahlmeister', ZFL, 179.87, 180.55, BY); doorX('Zahlmeister', ZK, 180.6, 181.3, BY);
  b.bb(M.woodDark, 181.05, XBAR - 0.05, BY, BY + 0.76, 1.2, 2.1); b.bb(M.woodLight, 181.0, XBAR - 0.05, BY + 0.76, BY + 0.79, 1.15, 2.12);
  b.box(M.paper, 0.3, 0.01, 0.4, 181.25, BY + 0.795, 1.6); b.box(M.black, 0.2, 0.12, 0.25, 181.25, BY + 0.85, 1.95);
  nav.block(181.0, XBAR, 1.15, 2.15, BY, BY + 1); chair(C, 180.65, BY, 1.65, Math.PI / 2, M.leather);
  b.bb(M.steel, XZM + 0.05, 180.35, BY, BY + 0.8, ZK + 0.05, 1.0); b.vcyl(M.brass, 0.04, 0.02, 180.36, BY + 0.5, 0.75, 8);
  nav.block(XZM, 180.37, ZK, 1.02, BY, BY + 1);
  b.bb(M.woodLight, XZM + 0.05, XZM + 0.3, BY + 1.3, BY + 1.33, 1.1, 2.1);
  C.sign('Zahlmeister', 180.21, BY + 2.16, ZFL + 0.055, 0.085, 'z+'); lamp(C, 180.65, BC, 1.35);
  // Luftschleuse mit zwei Türen
  Z('Luftschleuse', XSL + 0.07, XBAR - 0.07, ZFL + 0.07, ZPA - 0.02, BY, plB);
  doorZ('Luftschleuse', XSL, ZFL + 0.07, ZPA - 0.03, BY); doorZ('Luftschleuse', XBAR, ZFL + 0.07, ZPA - 0.03, BY);
  // die beiden Türflügel der Schleuse sind beweglich: feature_interact.js
  b.bb(M.alu, XBAR - 0.3, XBAR - 0.04, BY, BY + 0.15, ZFL + 0.07, ZPA - 0.03);  // Stufe zur Bar
  C.sign('Rauchsalon', XSL - 0.055, BY + 2.16, 2.67, 0.085, 'x-');
  lamp(C, 181.05, BC, 2.7);
  // Bar (auf dem Podest)
  Z('Bar', XBAR + 0.07, XRS - 0.07, ZK + 0.07, hw(XRS, YP) - 0.2, YP, plB);
  b.bb(M.woodDark, 181.75, 183.05, YP, YP + 1.02, 1.15, 1.5); b.bb(M.wood, 181.7, 183.1, YP + 1.02, YP + 1.06, 1.1, 1.58);
  b.bb(M.brass, 181.75, 183.05, YP + 0.12, YP + 0.14, 1.5, 1.53);
  nav.block(181.7, 183.1, ZK, 1.58, YP, YP + 1.2);
  { const r = rng(21); for (let sh = 0; sh < 2; sh++) { b.bb(M.wood, 181.7, 183.1, YP + 1.3 + sh * 0.38, YP + 1.33 + sh * 0.38, ZK + 0.04, ZK + 0.3);
    for (let k = 0; k < 8; k++) b.vcyl([M.upGreen, M.brass, M.upRed, M.glassClear][Math.floor(r() * 4)], 0.035, 0.22 + r() * 0.08, 181.8 + k * 0.17, YP + 1.33 + sh * 0.38, ZK + 0.17, 6); } }
  for (const x of [181.95, 182.45, 182.95]) { b.vcyl(M.alu, 0.02, 0.72, x, YP, 1.85, 6); b.vcyl(M.upBlue, 0.17, 0.06, x, YP + 0.72, 1.85, 10); b.torus(M.alu, 0.14, 0.01, x, YP + 0.25, 1.85, 'y', 10); }
  C.sign('Bar', XBAR + 0.055, YP + 1.95, 1.0, 0.09, 'x+', 'brass'); lamp(C, 182.4, BC, 2.2);
  // Rauchsalon (auf dem Podest): L-förmige Polsterbank an Vorder- und Außenwand
  Z('Rauchsalon', XRS + 0.07, 187.13, ZK + 0.07, 2.98, YP, plB);
  doorZ('Rauchsalon', XRS, ZFL, ZPA - 0.15, YP);
  b.bb(M.carpetBlue, XRS + 0.04, 187.72, YP, YP + 0.01, ZK + 0.04, 3.1);
  const sofa = (x0, x1, z0, z1, y, back) => {
    b.bb(M.woodDark, x0, x1, y, y + 0.34, z0, z1); b.bb(M.upBlue, x0, x1, y + 0.34, y + 0.46, z0, z1);
    const t = 0.13;
    if (back === 'z+') b.bb(M.upBlue, x0, x1, y + 0.46, y + 0.92, z1 - t, z1);
    if (back === 'z-') b.bb(M.upBlue, x0, x1, y + 0.46, y + 0.92, z0, z0 + t);
    if (back === 'x+') b.bb(M.upBlue, x1 - t, x1, y + 0.46, y + 0.92, z0, z1);
    nav.block(x0, x1, z0, z1, y, y + 1);
  };
  sofa(XRS + 0.1, 187.2, 3.05, 3.62, YP, 'z+'); sofa(187.2, 187.72, ZK + 0.06, 3.62, YP, 'x+');
  for (const [tx, tz] of [[184.6, 2.45], [186.0, 2.45], [186.6, 1.3], [184.3, 1.25]]) {
    roundTable(C, tx, YP, tz, 0.32, M.woodDark, 0.62); b.vcyl(M.brass, 0.06, 0.03, tx, YP + 0.62, tz, 8);
    if (tz > 2) chair(C, tx, YP, tz - 0.75, 0, M.upBlue, true);
    else { chair(C, tx - 0.75, YP, tz, Math.PI / 2, M.upBlue, true); if (tx < 186) chair(C, tx + 0.75, YP, tz, -Math.PI / 2, M.upBlue, true); }
  }
  b.bb(M.pigskin, XRS + 0.1, 187.15, YP + 0.95, YP + 2.05, ZK + 0.045, ZK + 0.053);
  [184.2, 185.6, 186.8].forEach((x, i) => picture(root, balloonTex(i), x, YP + 1.5, ZK + 0.066, 0.75, 0.75, 'z+'));
  C.panel('nordhimmel', (g, w, h) => {
    g.fillStyle = '#18233a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(220,210,170,0.5)';
    for (const r of [20, 40, 60]) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); }
    const r = rng(77); g.fillStyle = '#f2e6b8'; for (let i = 0; i < 70; i++) g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    g.fillStyle = '#d9b96a'; g.font = '9px Georgia'; g.fillText('Nordhimmel', 38, 122);
  }, XRS + 0.056, YP + 1.45, 1.3, 0.85, 0.85, 'x+');
  b.box(M.brass, 0.12, 0.16, 0.06, 183.7, YP + 1.0, ZK + 0.085); b.cyl(M.rubber, V(183.7, YP + 0.92, ZK + 0.09), V(183.85, YP + 0.82, ZK + 0.2), 0.008, 4); // elektrisches Feuerzeug
  for (const x of [184.5, 186.3]) lamp(C, x, BC, 1.8);

  // ---------- Backbord (Dusche, WC; Mannschaftsbereich) ----------
  wallZ(b, M.wallWhite, XWC, -ZFL, -ZK, BY, BH); wallZ(b, M.tile, XDU, -ZFL, -ZK, BY, BH);
  wallX(b, WP, -ZFL, XWC - 0.04, XMM, BY, BH, [[175.85, 176.5], [177.1, 177.75]]);
  wallZ(b, WB, XMM, -(ZPA + 0.55), -ZK, BY, BH); vquad(qWall, XMM, BY, BC, nhw(XMM), K(-(ZPA + 0.55)), 6);
  wallZ(b, WB, XKU, -(ZPA + 0.55), -ZK, BY, BH, [[-1.95, -1.25]]); vquad(qWall, XKU, BY, BC, nhw(XKU), K(-(ZPA + 0.55)), 6);
  wallZ(b, WB, XOM, -(ZPA + 0.55), -ZK, BY, BH); vquad(qWall, XOM, YP, BC, nhw(XOM), K(-(ZPA + 0.55)), 6);
  Z('Flur Backbord (B-Deck)', STA.x1 - 0.3, XMM - 0.07, -ZPA + 0.04, -ZFL - 0.07, BY, plB);
  lamp(C, 176.8, BC, -2.7);
  Z('Toilette (Backbord)', XWC + 0.07, XDU - 0.07, -ZFL + 0.07, -1.42, BY, plB); doorX('Toilette (Backbord)', -ZFL, 175.85, 176.5, BY);
  wcStall(XWC + 0.04, XDU - 0.04, ZK + 0.04, 1.35, BY, -1);
  C.sign('Toilette', 176.18, BY + 2.16, -ZFL - 0.055, 0.085, 'z-');
  Z('Dusche', XDU + 0.07, XMM - 0.07, -ZFL + 0.07, -1.5, BY, plB); doorX('Dusche', -ZFL, 177.1, 177.75, BY);
  b.bb(M.tile, XDU + 0.04, XMM - 0.04, BY, BY + 0.012, -ZFL + 0.04, -ZK - 0.04);
  b.bb(M.enamel, XDU + 0.1, XMM - 0.1, BY + 0.012, BY + 0.1, -1.45, -ZK - 0.06);
  b.cyl(M.alu, V(XDU + 0.1, BY + 2.05, -1.45), V(XMM - 0.1, BY + 2.05, -1.45), 0.01, 5);
  b.bb(M.curtainBlue, XDU + 0.1, XDU + 0.45, BY + 0.3, BY + 2.04, -1.46, -1.44);
  b.cyl(M.alu, V(177.4, BY + 2.1, -ZK - 0.05), V(177.4, BY + 2.0, -0.85), 0.012, 5); b.vcyl(M.alu, 0.07, 0.03, 177.4, BY + 1.97, -0.85, 10);
  b.box(M.brass, 0.14, 0.14, 0.04, 177.0, BY + 1.2, -ZK - 0.06); b.vcyl(M.alu, 0.015, 0.03, 177.0, BY + 1.2, -ZK - 0.1, 6);
  nav.block(XDU, XMM, -1.46, -ZK, BY, BY + 2);
  C.sign('Dusche', 177.43, BY + 2.16, -ZFL - 0.055, 0.085, 'z-'); lamp(C, 177.4, BC, -1.8);
  // Mannschaftsmesse
  Z('Mannschaftsmesse', XMM + 0.07, XKU - 0.07, -3.0, -ZK - 0.07, BY, plB);
  doorX('Mannschaftsmesse', -ZK, 179.0, 179.7, BY); doorZ('Küche', XKU, -1.95, -1.25, BY);
  b.bb(M.alu, XKU - 0.3, XKU - 0.04, BY, BY + 0.15, -1.95, -1.25);              // Stufe zur Küche
  b.bb(M.woodDark, XMM + 0.1, XKU - 0.08, BY, BY + 0.34, -3.62, -3.05); b.bb(M.upGreen, XMM + 0.1, XKU - 0.08, BY + 0.34, BY + 0.45, -3.62, -3.05);
  b.bb(M.upGreen, XMM + 0.1, XKU - 0.08, BY + 0.45, BY + 0.85, -3.62, -3.5); nav.block(XMM, XKU, -3.62, -3.05, BY, BY + 1);
  for (const [x0, x1] of [[178.3, 179.25], [179.4, 180.3]]) {
    table(C, (x0 + x1) / 2, BY, -2.22, x1 - x0, 0.72, M.woodLight, 0.74);
    b.bb(M.wood, x0, x1, BY + 0.42, BY + 0.46, -1.75, -1.45); for (const x of [x0 + 0.08, x1 - 0.08]) b.vcyl(M.alu, 0.02, 0.42, x, BY, -1.6, 6);
    nav.block(x0, x1, -1.75, -1.45, BY, BY + 0.6);
    for (const x of [x0 + 0.25, x1 - 0.25]) { b.vcyl(M.enamel, 0.1, 0.012, x, BY + 0.758, -2.35, 10); b.vcyl(M.enamel, 0.04, 0.09, x + 0.15, BY + 0.758, -2.1, 8); }
  }
  picture(root, sceneTex(7), XMM + 0.056, BY + 1.5, -1.9, 1.6, 0.6, 'x+');
  C.sign('Mannschaftsmesse', 179.35, BY + 2.16, -ZK - 0.055, 0.08, 'z-'); lamp(C, 179.4, BC, -2.0);
  // Küche (vollelektrisch, auf dem Podest)
  Z('Küche', XKU + 0.07, XOM - 0.07, -2.88, -ZK - 0.07, YP, plB);
  doorX('Küche', -ZK, 183.6, 184.3, YP);
  b.bb(M.steel, 184.55, XOM - 0.06, YP, YP + 0.85, -2.5, -1.05); b.bb(M.aluDark, 184.5, XOM - 0.05, YP + 0.85, YP + 0.9, -2.55, -1.0);
  for (const [px, pz] of [[184.75, -2.2], [185.05, -2.2], [184.75, -1.35], [185.05, -1.35]]) b.vcyl(M.black, 0.12, 0.012, px, YP + 0.9, pz, 12);
  for (const pz of [-2.1, -1.45]) b.bb(M.aluDark, 184.53, 184.55, YP + 0.12, YP + 0.7, pz - 0.28, pz + 0.28);   // Back- und Bratofen
  b.vcyl(M.alu, 0.14, 0.2, 184.75, YP + 0.912, -2.2, 12); b.vcyl(M.brass, 0.12, 0.13, 185.05, YP + 0.912, -1.35, 12);
  b.bb(M.aluDark, 184.5, XOM - 0.05, YP + 1.8, YP + 2.1, -2.55, -1.0);
  nav.block(184.5, XOM, -2.55, -1.0, YP, YP + 1);
  b.bb(M.enamel, 184.6, XOM - 0.06, YP, YP + 1.6, -3.3, -2.6); b.bb(M.alu, 184.58, 184.6, YP + 0.9, YP + 1.3, -2.7, -2.66); // Kühlschrank
  nav.block(184.58, XOM, -3.3, -2.6, YP, YP + 2);
  b.bb(M.alu, 181.75, 184.5, YP, YP + 0.88, -3.6, -2.95); b.bb(M.steel, 181.72, 184.5, YP + 0.88, YP + 0.91, -3.62, -2.93);
  b.bb(M.enamel, 182.8, 183.4, YP + 0.84, YP + 0.915, -3.45, -3.05); b.cyl(M.alu, V(183.1, YP + 0.91, -3.5), V(183.1, YP + 1.1, -3.35), 0.012, 5);
  nav.block(181.72, 184.5, -3.62, -2.93, YP, YP + 1);
  b.bb(M.alu, 181.0, 183.4, YP, YP + 0.86, -1.15, -ZK - 0.05); b.bb(M.woodLight, 180.98, 183.42, YP + 0.86, YP + 0.9, -1.17, -ZK - 0.05);
  nav.block(180.98, 183.42, -1.17, -ZK, YP, YP + 1);
  { const r = rng(5); for (let k = 0; k < 6; k++) b.vcyl(k % 2 ? M.alu : M.brass, 0.08 + r() * 0.05, 0.1 + r() * 0.1, 181.3 + k * 0.38, YP + 0.9, -0.85, 10); }
  b.bb(M.alu, 181.0, 181.6, YP + 0.9, YP + 1.5, -3.457, -3.447);               // Klappe des Speiseaufzugs
  nav.block(180.9, 181.7, -4.1, -3.44, YP, YP + 2);
  C.sign('Speiseaufzug', 181.3, YP + 1.62, -3.44, 0.06, 'z+');
  C.sign('Küche', 183.95, YP + 2.06, -ZK - 0.055, 0.085, 'z-');
  lamp(C, 182.3, BC, -2.0); lamp(C, 184.0, BC, -2.0);
  // Offiziersmesse (vorn, auf dem Podest)
  Z('Offiziersmesse', XOM + 0.07, 187.13, -2.98, -ZK - 0.07, YP, plB);
  doorX('Offiziersmesse', -ZK, 185.5, 186.2, YP);
  b.bb(M.linoGreen, XOM + 0.04, 187.72, YP, YP + 0.008, -3.1, -ZK - 0.04);
  {
    const s2 = (x0, x1, z0, z1, back) => { b.bb(M.woodDark, x0, x1, YP, YP + 0.34, z0, z1); b.bb(M.upGreen, x0, x1, YP + 0.34, YP + 0.46, z0, z1);
      if (back === 'z-') b.bb(M.upGreen, x0, x1, YP + 0.46, YP + 0.9, z0, z0 + 0.13); else b.bb(M.upGreen, x1 - 0.13, x1, YP + 0.46, YP + 0.9, z0, z1); nav.block(x0, x1, z0, z1, YP, YP + 1); };
    s2(XOM + 0.1, 187.2, -3.62, -3.05, 'z-'); s2(187.2, 187.72, -3.62, -ZK - 0.06, 'x+');
  }
  roundTable(C, 186.45, YP, -2.2, 0.5, M.linen, 0.74);
  for (const a of [Math.PI * 0.75, Math.PI, Math.PI * 1.25]) chair(C, 186.45 + Math.sin(a) * 0.85, YP, -2.2 + Math.cos(a) * 0.85, a + Math.PI, M.upGreen);
  picture(root, sceneTex(3), XOM + 0.056, YP + 1.5, -2.0, 1.4, 0.6, 'x+');
  C.sign('Offiziersmesse', 185.85, YP + 2.06, -ZK - 0.055, 0.08, 'z-'); lamp(C, 186.4, BC, -2.0);

  // =================== FALLREEPS: Flug (Klappen zu) / Ankermast (ausgeklappt) ===================
  const hullFace = (qb, x0, x1, s, t0, t1) => {          // Ausschnitt der ebenen Hüllfläche 0–10° (Stb) bzw. 350–360° (Bb)
    const P = (x, t) => { const a = hp(x, 0), c = hp(x, 10); c.z *= s; return a.lerp(c, t); };
    qb.quad(P(x0, t0), P(x1, t0), P(x1, t1), P(x0, t1));
  };
  C.mode('flug', () => {
    const qf = new QuadBuf();
    for (const s of [-1, 1]) hullFace(qf, FALLREEP.x0, FALLREEP.x1, s, 0, 1);
    b.add(M.hullOutDS, qf.geo());
    for (const s of [-1, 1]) { b.beam(M.hullSeam, hp(FALLREEP.x0 + 0.15, 0, 1.002), hp(FALLREEP.x0 + 0.15, s * 10, 1.002), 0.02, 0.01); b.beam(M.hullSeam, hp(FALLREEP.x1 - 0.1, 0, 1.002), hp(FALLREEP.x1 - 0.1, s * 10, 1.002), 0.02, 0.01); }
  });
  C.mode('mast', () => {
    const qf = new QuadBuf();
    for (const s of [-1, 1]) {
      hullFace(qf, FALLREEP.x0, 174.0, s, 0, 1);
      const zmax = (x) => rLin(x) * Math.sin(10 * Math.PI / 180);
      const t0 = (fz0 - 0.04) / zmax(174.8), t1 = (fz1 + 0.04) / zmax(174.8);
      hullFace(qf, 174.0, FALLREEP.x1, s, 0, t0); hullFace(qf, 174.0, FALLREEP.x1, s, t1, 1);
      // ausgeklappte Treppe
      const n = 20, x0 = FRX0, x1 = FRBOT, y0 = BY, y1 = GROUND_Y, run = (x1 - x0) / n, zi = s * (fz0 + 0.04), zo = s * (fz1 - 0.04), zm = s * (fz0 + fz1) / 2;
      const [za, zc] = M2(s, fz0 + 0.04, fz1 - 0.04);
      for (let k = 1; k <= n; k++) {
        const x = x0 + run * k, yk = y0 + (y1 - y0) * k / n;
        b.bb(M.alu, x - run / 2 - 0.02, x + run / 2, yk - 0.03, yk, za + 0.03, zc - 0.03); b.bb(M.rubber, x - run / 2 - 0.02, x - run / 2 + 0.03, yk - 0.025, yk + 0.004, za + 0.05, zc - 0.05);
      }
      for (const z of [zi, zo]) {
        b.beam(M.aluDark, V(x0, y0 - 0.1, z), V(x1, y1 - 0.05, z), 0.04, 0.24);
        b.cyl(M.alu, V(x0, y0 + 0.95, z), V(x1, y1 + 0.95, z), 0.02, 6);
        for (let k = 0; k <= n; k += 4) { const x = x0 + run * k, yk = y0 + (y1 - y0) * k / n; b.vcyl(M.alu, 0.014, 0.95, x, yk, z, 5); }
      }
      b.beam(M.hullOutDS, V(x0 + 0.15, y0 - 0.25, zm), V(x1, y1 - 0.1, zm), fz1 - fz0, 0.03);   // Unterseite (äußere Klappe)
      b.bb(M.aluDark, x1 - 0.05, x1 + 0.55, y1, y1 + 0.04, za, zc);
      nav.ramp(s > 0 ? 'Fallreep Steuerbord' : 'Fallreep Backbord', x0, x1, Math.min(zi, zo) + 0.02, Math.max(zi, zo) - 0.02, y0, y1, 'x');
      const xt = x0 + 0.35, [ea, ec] = M2(s, ZK + 0.12, fz1 + 0.12);              // oberstes Stück etwas breiter (Antritt vom Podest)
      nav.ramp(s > 0 ? 'Fallreep Steuerbord' : 'Fallreep Backbord', x0, xt, ea, ec, y0, y0 + (y1 - y0) * (xt - x0) / (x1 - x0), 'x');
    }
    b.add(M.hullOutDS, qf.geo());
    b.bb(M.tarp, 176.2, 182.5, GROUND_Y, GROUND_Y + 0.01, -5.5, 5.5);           // Laufmatte am Boden
    Z('Landeplatz am Ankermast', 176.2, 182.5, -5.5, 5.5, GROUND_Y);
  });

  // =================== KABINENANBAU 1937 (Bucht 11, Steuerbord) ===================
  C.only(1937, () => {
    const y = BY, qa = new QuadBuf(), qc = new QuadBuf(), qs = new QuadBuf(), qw = new QuadBuf(), qp = new QuadBuf(), qg = new QuadBuf();
    hstrip(qa, y, true, AX0, XA, K(AZWC), aZB);
    hstrip(qc, BC, false, AX0, XA, K(AZWC), (x) => aZT(x, BC));
    for (let x = AX0; x < XA - 0.01; x += 0.5) { const xb = Math.min(XA, x + 0.5); qs.quad(V(x, y, aZB(x)), V(xb, y, aZB(xb)), V(xb, BC, aZT(xb, BC)), V(x, BC, aZT(x, BC))); }
    b.add(M.linoLight, qa.geo()); b.add(M.ceil, qc.geo()); b.add(wallDS, qs.geo());
    const n = V(0, ASL, -1).normalize();
    const onSlope = (x, h, d) => V(x, y + h, aZB(x) + ASL * h).addScaledVector(n, d);
    const windowAt = (xa, xb) => {               // verglaster Rahmen an der Schrägwand (Fenster nach außen angedeutet)
      const h0 = 0.4, h1 = 1.3;
      qp.quad(onSlope(xa, h0, 0.012), onSlope(xb, h0, 0.012), onSlope(xb, h1, 0.012), onSlope(xa, h1, 0.012));
      qg.quad(onSlope(xa, h0, 0.03), onSlope(xb, h0, 0.03), onSlope(xb, h1, 0.03), onSlope(xa, h1, 0.03));
      for (const [p, q2] of [[[xa, h0], [xb, h0]], [[xa, h1], [xb, h1]], [[xa, h0], [xa, h1]], [[xb, h0], [xb, h1]], [[(xa + xb) / 2, h0], [(xa + xb) / 2, h1]]]) b.beam(M.alu, onSlope(p[0], p[1], 0.035), onSlope(q2[0], q2[1], 0.035), 0.04, 0.03);
      b.beam(M.woodLight, onSlope(xa - 0.05, h0 - 0.04, 0.06), onSlope(xb + 0.05, h0 - 0.04, 0.06), 0.08, 0.03);
    };
    // Wände: Gang, Toiletten, Querwände bis zur Schrägwand
    const cab37 = CABINS.filter((c) => c.year === 1937);
    wallX(b, M.wallCream, AZC, AXV - 0.04, XA, y, BH, cab37.map(cabDoor));
    const wcW = (AWC[1] - AWC[0]) / 3, wcDoors = [0, 1, 2].map((i) => [AWC[0] + i * wcW + 0.5, AWC[0] + i * wcW + 1.2]);
    const KD = [169.0, 169.7];                    // Tür vom Kielgang in den Anbau
    wallX(b, M.wallCream, AZW, AX0, XA, y, BH, [...wcDoors, KD]);
    // Wand zum Kielgang (1937 an Steuerbord), mit Tür und kurzer Treppe hinab zum Anbau
    const yk = keelY((KD[0] + KD[1]) / 2);
    wallX(b, M.wallGrey, 0.6, AX0, XA, y, BH, [[KD[0], KD[1], yk - y + 2.0, yk - y]]);
    vquad(qw, AX0, y, BC, K(0.6), K(AZW), 2);
    for (let i = 0; i < 4; i++) { const z0 = 0.64 + i * 0.42, z1 = z0 + 0.42, h = yk + (y - yk) * (i + 0.5) / 4; b.bb(M.plank, KD[0] + 0.04, KD[1] - 0.04, Math.min(h, yk) - 0.06, h, z0, Math.min(z1, AZW)); }
    nav.ramp('Zugang Kabinen 1937', KD[0] + 0.04, KD[1] - 0.04, 0.38, AZW + 0.12, yk, y, 'z');
    C.sign('Kabinen 51–70', (KD[0] + KD[1]) / 2, yk + 2.12, 0.55, 0.08, 'z-', 'brass');
    wallX(b, M.wallWhite, AZWC, AWC[0], AWC[1], y, BH);
    for (let i = 0; i <= 3; i++) wallZ(b, M.wallWhite, AWC[0] + i * wcW, AZWC, AZW, y, BH);
    wallZ(b, M.wallCream, AXV, AZW, AZC, y, BH, [[2.4, 3.15]]);
    for (const x of [AX0, AXV, AXS1, ...cab37.map((c) => c.x0)]) vquad(qw, x, y, BC, K(x === AX0 ? AZW : AZC), (yy) => aZT(x, yy), 6);
    b.add(wallDS, qw.geo());
    for (const c of cab37) { buildCabin(C, c); windowAt(c.x0 + 0.22, c.x1 - 0.22); }
    windowAt(AX0 + 0.3, AXV - 0.3);
    b.add(winPane, qp.geo()); b.add(M.glassClear, qg.geo());
    // Vierbettkabine 67–70
    for (const [bx0, bx1, z0, z1] of [[AX0 + 0.06, AX0 + 0.8, 2.4, 4.3], [AXV - 0.8, AXV - 0.06, 3.3, 5.2]]) {
      for (const h of [0.41, 1.35]) { b.bb(M.alu, bx0, bx1, y + h - 0.05, y + h, z0, z1); b.bb(M.linen, bx0 + 0.02, bx1 - 0.02, y + h, y + h + 0.11, z0 + 0.02, z1 - 0.02); b.bb(M.blanket, bx0 + 0.01, bx1 - 0.01, y + h + 0.03, y + h + 0.125, z0 + 0.02, z1 - 0.45); }
      for (const z of [z0 + 0.03, z1 - 0.03]) b.vcyl(M.alu, 0.018, 1.7, (bx0 + bx1) / 2 + 0.33 * Math.sign(158.3 - bx0), y, z, 6);
      nav.block(bx0 - 0.06, bx1 + 0.03, z0, z1, y, y + 2);
    }
    b.bb(M.white, AX0 + 0.04, AX0 + 0.36, y + 0.8, y + 0.87, 4.5, 4.95); b.bb(M.alu, AX0 + 0.04, AX0 + 0.052, y + 1.15, y + 1.6, 4.55, 4.9);
    nav.block(AX0, AX0 + 0.38, 4.45, 5.0, y, y + 1);
    Z('Vierbettkabine 67–70', AX0 + 0.83, AXV - 0.07, AZW + 0.07, AZC - 0.04, y, { plan: 'B', cabin: true });
    Z('Vierbettkabine 67–70', AX0 + 0.83, AXV - 0.83, AZC - 0.1, 5.35, y);
    Z('Vierbettkabine 67–70', AX0 + 0.38, AXV - 0.83, 4.35, 5.35, y);
    doorZ('Vierbettkabine 67–70', AXV, 2.4, 3.15, y);
    C.sign('67–70', AXV + 0.055, y + 2.16, 2.78, 0.085, 'x+', 'brass');
    b.vcyl(M.lamp, 0.09, 0.03, 158.3, BC - 0.05, 3.8, 10);
    // Toiletten am Gang
    for (let i = 0; i < 3; i++) {
      const xa = AWC[0] + i * wcW, xm = xa + wcW / 2;
      b.box(M.enamel, 0.5, 0.4, 0.38, xm - 0.35, y + 0.2, AZWC + 0.28); b.box(M.white, 0.42, 0.03, 0.36, xm - 0.33, y + 0.415, AZWC + 0.3);
      b.box(M.enamel, 0.34, 0.12, 0.28, xa + wcW - 0.25, y + 0.82, AZWC + 0.2);
      nav.block(xa, xm, AZWC, AZWC + 0.6, y, y + 1); nav.block(xa + wcW - 0.45, xa + wcW, AZWC, AZWC + 0.36, y, y + 1);
      Z('WC (1937)', xa + 0.07, xa + wcW - 0.07, AZWC + 0.07, AZW - 0.07, y);
      doorX('WC (1937)', AZW, wcDoors[i][0], wcDoors[i][1], y);
      C.sign('WC', (wcDoors[i][0] + wcDoors[i][1]) / 2, y + 2.16, AZW + 0.055, 0.085, 'z+');
      b.vcyl(M.lamp, 0.07, 0.03, xm, BC - 0.05, 1.7, 8);
    }
    // Gang, Schwelle über Ring 173, Tür im Achterschott
    Z('Kabinengang (B-Deck, 1937)', AXV - 0.15, 172.25, AZW + 0.07, AZC - 0.07, y, plB);
    nav.ramp('Kabinengang (B-Deck, 1937)', 172.15, 172.6, AZW + 0.12, AZC - 0.12, y, YTH, 'x');
    Z('Kabinengang (B-Deck, 1937)', 172.55, 173.5, 2.44, 3.11, YTH);
    nav.ramp('Kabinengang (B-Deck, 1937)', 173.45, 173.95, 2.44, 3.11, YTH, y, 'x');
    b.bb(M.alu, 172.55, 173.5, YTH - 0.06, YTH, 2.4, 3.15);
    for (const [x0, x1, h] of [[172.15, 172.3, 0.2], [172.3, 172.45, 0.4], [172.45, 172.55, 0.55], [173.5, 173.65, 0.4], [173.65, 173.8, 0.2]]) b.bb(M.alu, x0, x1, y, y + h, 2.42, 3.13);
    for (const z of [2.4, 3.15]) b.bb(M.frame, XA - 0.03, XA + 0.03, YTH, BC, z - (z > 3 ? 0.035 : 0), z + (z > 3 ? 0 : 0.035));
    C.sign('Kabinen 51–70', XA + 0.03, YTH + 1.75, 2.77, 0.08, 'x+', 'brass');
    for (let x = 160.5; x < 172.5; x += 2.5) b.vcyl(M.lamp, 0.08, 0.03, x, BC - 0.05, 2.78, 10);
  });

  // ---------- Sonderflächen als Meshes ----------
  b.add(M.linoGreen, qFloorB.geo()); b.add(M.linoGreen, qPod.geo());
  b.add(M.ceil, qCeil.geo()); b.add(M.canvas, qCanvas.geo());
  b.add(M.carpetRed, qCarR.geo()); b.add(M.carpetBrown, qCarBr.geo()); b.add(M.carpetBlue, qCarBl.geo()); b.add(M.linoLight, qLino.geo());
  root.add(new THREE.Mesh(qWall.geo(), wallDS));

  // ---------- Teleportziele ----------
  C.tp('A-Deck – Promenade Backbord', START[0], START[1], START[2], START[3]);
  C.tp('B-Deck – Rauchsalon', 184.0, YP, 1.0, 0);

  // ---------- Infopunkte ----------
  I('Treppenhalle', 'Am Heckende des A-Decks lag eine Querhalle zwischen Speisesaal und Gesellschaftsraum. Zwei quer laufende Treppen führten von hier hinab zum B-Deck und zu den Fallreeps, über die man an Bord kam. Über der Treppe stand eine Büste des Namensgebers Paul von Hindenburg; am Anschlagbrett hingen Funknachrichten und die Positionskarte.', 173.9, AY + 1.4, -1.2);
  I('Speisesaal', 'Der Speisesaal nahm die Backbordseite des A-Decks ein, etwa 14,3 × 4 m groß. Die Aluminium-Rohrstühle mit roten Polstern entwarf Fritz August Breuhaus. Die mit Stoff bespannten Wände bemalte Otto Arpke mit Szenen der Südamerikafahrten des „Graf Zeppelin“. Eine niedrige Brüstung trennte die Tische von der Promenade. Ab 1937 wurde in zwei Tischzeiten serviert.', 178.2, AY + 1.3, -6.0);
  I('Anrichte', 'In der Anrichte zwischen den Kabinen kamen die Speisen aus der Küche des B-Decks mit einem Speiseaufzug herauf und wurden von hier in den Speisesaal getragen.', 181.1, AY + 1.3, -4.6);
  I('Promenade', 'Beiderseits des A-Decks lagen Promenaden mit langen Reihen schräg geneigter Fenster, die den Blick hinab auf Land und Meer freigaben. Einige Fenster ließen sich im Flug öffnen. Bänke luden zum Verweilen ein.', 180.0, AY + 1.3, -10.0);
  I('Gesellschaftsraum', 'Der Gesellschaftsraum an Steuerbord war rund 10 m lang und mit braun gepolsterten Aluminiummöbeln eingerichtet. Arpkes Wandbild zeigte eine Weltkarte mit den Routen von Magellan, Kolumbus, Vasco da Gama und Cook, den Fahrten von LZ 126 und „Graf Zeppelin“ sowie der Schnelldampfer „Bremen“ und „Europa“. 1936 stand hier ein Stutzflügel von Blüthner aus Aluminium, mit gelbem Schweinsleder bezogen und nach airships.net nur 161 kg schwer. Vor der Saison 1937 wurde er ausgebaut.', 179.6, AY + 1.3, 6.2);
  I('Schreib- und Lesezimmer', 'Vorn an Steuerbord lag hinter einer Querwand das Schreib- und Lesezimmer mit Schreibplätzen, Lesetisch und einem Bücherschrank, den der Steward aufschloss. Die Post kam gleich in den Bordbriefkasten.', 185.0, AY + 1.3, 8.0);
  I('Passagierkabinen', 'Im fensterlosen Inneren des A-Decks lagen 25 Doppelkabinen in vier Reihen an drei Gängen, jede etwa 1,98 × 1,68 m groß. Das untere Bett war fest, das obere wurde tagsüber an die Wand geklappt. Dazu kamen ein Klappwaschbecken mit warmem und kaltem Wasser, ein Klapptisch, ein Hocker, ein Rufknopf und ein schmaler Schrank mit Vorhang. Wände und Türen bestanden aus stoffbespanntem Leichtschaum und waren hellhörig. Jede Kabine hatte ihren eigenen Farbton: hellblau, grau oder beige. 1937 kamen Kabinen auf dem B-Deck hinzu, damit stieg die Zahl der Betten von 50 auf 70.', 180.0, AY + 1.3, -2.85);
  I('Fallreep', 'Ein- und ausgestiegen wurde über zwei Treppen, die am Heckende des Passagierbereichs aus dem Rumpfboden heruntergeklappt wurden – je eine beiderseits des Kielgangs. Im Flug waren die Öffnungen durch Klappen verschlossen. Oben sammelte ein Steward Kameras und Feuerzeuge ein.', 173.9, BY + 1.3, 2.9);
  I('Rauchsalon', 'Rauchen an Bord eines Wasserstoff-Luftschiffs: Der Rauchsalon stand unter leichtem Überdruck, damit kein Gas eindringen konnte, und war nur über die Bar und eine Luftschleuse mit Doppeltür zu erreichen. Es gab ein einziges elektrisches Feuerzeug. Die Wandbilder zeigten die Geschichte der Luftfahrt leichter als Luft, von der Montgolfière bis zum „Graf Zeppelin“. Die fast waagerechten Fenster im Rumpfboden ließen sich nicht öffnen.', 185.3, YP + 1.3, 1.6);
  I('Bar und Luftschleuse', 'Zwischen dem Passagierflur und dem Rauchsalon lagen die Luftschleuse und die kleine Bar. Barmann Max Schulze überwachte die Schleuse und achtete darauf, dass niemand mit Feuer den Rauchsalon verließ.', 182.3, YP + 1.3, 2.6);
  I('Zahlmeister', 'Büro des Zahlmeisters. Nach airships.net hatte die Kabine des Chefstewards Heinrich Kubis eine Tür zum Kielgang – die einzige Verbindung zwischen Passagier- und Mannschaftsbereich. Wo genau sie lag, zeigen die Pläne nicht; im Modell liegt diese Tür hier.', 180.6, BY + 1.3, 1.3);
  I('Waschräume', 'Auf dem A-Deck gab es keine Toiletten. Die Waschräume lagen auf dem B-Deck, getrennt für Damen und Herren; eine weitere Toilette und die Dusche lagen an Backbord.', 177.7, BY + 1.3, 2.7);
  I('Dusche', 'Die Hindenburg hatte eine Dusche an Bord. Der Wasserstrahl war schwach und schaltete sich nach kurzer Zeit ab – Wasser war Gewicht.', 177.4, BY + 1.3, -2.6);
  I('Küche', 'Die Küche arbeitete vollelektrisch: Herd mit vier Platten, Back- und Bratofen, Kühlschrank. Ein Speiseaufzug brachte die Gerichte hinauf in die Anrichte am Speisesaal.', 183.0, YP + 1.3, -2.0);
  I('Offiziersmesse', 'Vorn an Backbord lag die Offiziersmesse, in der die Schiffsoffiziere ihre Mahlzeiten einnahmen.', 186.2, YP + 1.3, -1.2);
  I('Mannschaftsmesse', 'Speise- und Aufenthaltsraum der Besatzung. Die Backbordseite des B-Decks gehörte der Mannschaft, die Steuerbordseite den Passagieren.', 179.4, BY + 1.3, -1.0);
  I('Kielgang im B-Deck', 'Der Kielgang lief als etwa 1 m breiter Gang mitten durch das B-Deck und trennte die Mannschaftsräume an Backbord von den Passagierräumen an Steuerbord.', 177.0, BY + 1.4, 0);
  I('Kabinen von 1937', 'Im Winter 1936/37 wurden in Frankfurt achtern des Passagierbereichs, in Bucht 11 an Steuerbord, neue Kabinen mit Fenstern eingebaut: eine Steward-Kabine, acht Doppelkabinen und eine Vierbettkabine an einem Längsgang mit drei Toiletten. Damit bot das Schiff 70 Passagierbetten. (Nur im Zustand 1937 vorhanden.)', 172.6, BY + 1.5, 2.0);
}
