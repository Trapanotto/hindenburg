import * as THREE from 'three';
import { V } from './util.js';
import { ST, rLin, keelY, hw, hp, ENG, GX0, GX1, G_Y, G_YC, G_HW, D2R, finT } from './hull.js';

// ======================================================================
//  Gemeinsame Lagedaten des Rumpfinneren (werden von detail_keel.js importiert)
//  Quellen: research/gondel_mast.md (Abschnitt 5, 6, Abweichungen), research/rumpf.md (6, 7, A11)
// ======================================================================
export const segs = (xa, xb) => [xa, ...ST.filter((s) => s > xa + 0.3 && s < xb - 0.3), xb];
/** Kielgang: Unterbrechung nur durch die Fahrgastdecks (Rampen 170,2–173,2 und 187,8–190,8 baut decks.js) */
export const KEEL_RANGES = [[14.5, 170.2], [190.8, 233]];
/** Axialgang in der Schiffsachse, von Ring 20 bis Ring 233 */
export const AXIAL = { y: -1, x0: 19.5, x1: 233.6 };
/** Leiterschächte Kielgang ↔ Axialgang (Backbord, z −0,66). Ring 188 liegt über den Fahrgastdecks,
 *  daher steht die dritte Leiter unmittelbar vor dem vorderen Rampenende. */
export const LADDERS = [{ x: 62, ring: '62' }, { x: 123.5, ring: '123,5' }, { x: 191.5, ring: '188' }];
export const LADDER_Z = -0.66;
/** Hilfssteuerstand in der unteren Flosse (x ≈ 38–43, ≈ 4,6 × 0,9 m), Leiter vom Kielgang bei lx */
export const FIN_STAND = { x0: 38.2, x1: 42.8, y: -19.0, lx: 40.6, lz: 0.68 };
/** halbe Flossendicke der unteren Flosse auf Höhe y (wie die Verjüngung in hull.js) */
export const finHalf = (y) => 1.75 * finT(-y);
/** Bugraum: Treppe vom Kielgangende (Ring 233) hinauf zur Plattform der Ankerwinde */
export const BOW = { sx0: 233, sx1: 235, x0: 235, x1: 237.6, y: -8.6, hz: 1.4 };
/** Steuerbord x 157–173 bleibt frei für die Fahrgastkabinen von 1937 (anderes Modul). */
export const STB_RES = [157, 173];

const row = (xs, z0, z1) => xs.map((x) => ({ x, z0, z1 }));
/** Geschlossene Räume neben dem Kielgang. s = Seite (−1 Backbord, +1 Steuerbord), Innenwand bei |z| = 0,65.
 *  Boden folgt dem Kielgang (keelY), damit die Türen immer ebenerdig sind. */
export const ROOMS = [
  { id: 'crew5b', name: 'Mannschaftsraum (Bucht 5, Backbord)', x0: 63, x1: 71, s: -1, zo: 3.45, door: [66.5, 67.5], wall: 'canvas', tiers: [0.4, 1.25], bunks: row([63.15, 65.2, 68.75], -3.38, -2.65) },
  { id: 'crew5s', name: 'Mannschaftsraum (Bucht 5, Steuerbord)', x0: 63, x1: 71, s: 1, zo: 3.45, door: [66.5, 67.5], wall: 'canvas', tiers: [0.4, 1.25], bunks: row([63.15, 65.2, 68.75], 2.65, 3.38) },
  { id: 'crew11', name: 'Mannschaftsraum (Bucht 11)', x0: 157, x1: 170.6, s: -1, zo: 5.0, door: [161.8, 162.7], wall: 'canvas', tiers: [0.4, 1.25],
    bunks: [...row([157.15, 159.25, 161.35, 163.45, 165.55, 167.65], -4.93, -4.2), ...row([157.15, 159.25, 163.45, 165.55, 167.65], -1.45, -0.72)] },
  { id: 'elektro', name: 'Elektrozentrale', x0: 192.0, x1: 197.7, s: 1, zo: 3.5, door: [194.4, 195.2], wall: 'alu', tiers: [], bunks: [] },
  { id: 'post', name: 'Postraum', x0: 192.3, x1: 197.7, s: -1, zo: 3.3, door: [194.6, 195.4], wall: 'canvas', tiers: [], bunks: [] },
  { id: 'off14', name: 'Offiziersraum (Bucht 14)', x0: 203.4, x1: 217.6, s: -1, zo: 3.45, door: [209.9, 210.8], wall: 'cream', tiers: [0.4, 1.25],
    bunks: row([203.55, 205.6, 207.65, 209.7, 211.75, 213.8], -3.38, -2.65) },
  { id: 'kapitaen', name: 'Kapitänskajüte', x0: 212.4, x1: 217.6, s: 1, zo: 3.2, door: [214.3, 215.1], wall: 'cream', tiers: [0.45], bunks: row([215.4], 2.45, 3.13) },
];
/** Offene Plattformen (begehbar über eine Lücke im Geländer `open`). */
export const PLATFORMS = [
  { id: 'seilH', name: 'Seilstauraum (Heck)', x0: 29.6, x1: 33.0, s: -1, zo: 2.9, open: [30.9, 31.8] },
  { id: 'fracht', name: 'Frachtraum', x0: 145.8, x1: 156.2, s: -1, zo: 3.6, open: [150.05, 150.95] },
  { id: 'werk', name: 'Werkstatt', x0: 145.9, x1: 150.3, s: 1, zo: 3.3, open: [149.05, 149.95] },
  { id: 'lager', name: 'Ersatzteillager', x0: 207.2, x1: 211.8, s: 1, zo: 3.1, open: [207.4, 208.3] },
  { id: 'seilB', name: 'Seilstauraum (Bug)', x0: 225.5, x1: 230.5, s: -1, zo: 2.9, open: [227.4, 228.3] },
];
export const roomById = (id) => ROOMS.find((r) => r.id === id) || PLATFORMS.find((r) => r.id === id);

const onSide = (list, x, s, m) => list.some((r) => r.s === s && x > r.x0 - m && x < r.x1 + m);
function tankFree(x, s) {
  if (onSide(ROOMS, x, s, 1.0) || onSide(PLATFORMS, x, s, 1.0)) return false;
  if (ENG.some((e) => Math.abs(e.x - x) < 2.4)) return false;
  if (s < 0 && LADDERS.some((l) => Math.abs(l.x - x) < 1.4)) return false;
  if (x > 166 && x < 192.5) return false;                       // Fahrgastdecks
  if (s > 0 && x > STB_RES[0] - 1.5 && x < STB_RES[1] + 0.5) return false;
  if (x > 196.5 && x < (s > 0 ? 209 : 203.4)) return false;     // Gondeltreppe, Funkraum, Gondelöffnung
  return true;
}
/** Tanks am Kielgang. kind: 'fuel' Dieselöl, 'ballast' Haupt-Wasserballast (7 × 2000 kg, Lage bis auf Ring 77 unbelegt),
 *  'nb' Notballastsack (8 × 500 kg: je 4 an Ring 47 und Ring 218), 'oil' Schmieröl an jeder Maschinengondel.
 *  Belegt (research/gondel_mast.md, Nachtrag): Dieseltanks als zylindrische Leichtmetallbehälter beiderseits des Kielgangs,
 *  „hinter der Offiziersunterkunft“ fast über die ganze Länge, untereinander verbunden, abwerfbar. Zahl und Einzelgröße unbelegt. */
const FUEL_X1 = 203.4;   // Vorderkante der Dieseltank-Reihe = Achterwand der Offiziersunterkunft (Bucht 14)
export const TANKS = (() => {
  const t = [];
  for (const x of [45.8, 48.2, 219.4, 221.6]) for (const s of [-1, 1]) t.push({ kind: 'nb', x, s });
  for (const e of ENG) t.push({ kind: 'oil', x: e.x - 1.2, s: e.side });
  const BALL = [[74.5, -1], [74.5, 1], [104.5, -1], [104.5, 1], [131.75, -1], [131.75, 1], [225.5, 1]];
  for (let i = 0; i < ST.length - 1; i++) {
    const a = ST[i], c = ST[i + 1], x = (a + c) / 2;  // Feldmitte: Abstand zu den Kielträger-Rahmen
    if (a < 52 - 1e-6 || c > 233 + 1e-6 || c - a < 3.9) continue;
    if (x > 217 && x < 223.5) continue;                           // Notballast an Ring 218
    for (const s of [-1, 1]) {
      if (!tankFree(x, s)) continue;
      const ball = BALL.some(([bx, bs]) => bs === s && Math.abs(bx - x) < 0.3);
      if (!ball && x > FUEL_X1) continue;                          // Dieseltanks nur achtern der Offiziersunterkunft (WOWA-R)
      t.push({ kind: ball ? 'ballast' : 'fuel', x, s });
    }
  }
  return t.map((o) => ({ ...o, z: o.s * (o.kind === 'oil' ? 2.6 : 2.35), y0: keelY(o.x) - 0.25 }));
})();

/** Quader, dessen Unterkante von (xa, ya) nach (xb, yb) ansteigt (Höhe h, z-Bereich z0…z1). */
export function slab(b, mat, xa, xb, ya, yb, h, z0, z1) {
  const m = new THREE.Matrix4().set(
    xb - xa, 0, 0, (xa + xb) / 2,
    yb - ya, h, 0, (ya + yb) / 2 + h / 2,
    0, 0, z1 - z0, (z0 + z1) / 2,
    0, 0, 0, 1);
  b.add(mat, new THREE.BoxGeometry(1, 1, 1), m);
}
const mm = (a, c) => [Math.min(a, c), Math.max(a, c)];
export const ROOM_H = 2.1;

export function buildKeel(C) {
  const { b, M, nav, root } = C;
  const I = C.info, ky = keelY;

  // ---------- Öffnungen im Kielganggeländer: [x0, x1, Seite] ----------
  const open = [[198.9, 203.1, 1], [204.4, 205.4, 1]];          // Gondeltreppe, Funkraumtür
  for (const e of ENG) open.push([e.x - 0.6, e.x + 0.6, e.side]);
  for (const l of LADDERS) open.push([l.x - 0.45, l.x + 0.45, -1]);
  open.push([FIN_STAND.lx - 0.45, FIN_STAND.lx + 0.45, 1]);
  for (const r of ROOMS) open.push([r.door[0], r.door[1], r.s]);
  for (const p of PLATFORMS) open.push([p.open[0], p.open[1], p.s]);
  const isOpen = (x, s) => open.some((o) => o[2] === s && x > o[0] && x < o[1]);
  const inRes = (x, s) => s > 0 && x > STB_RES[0] && x < STB_RES[1];
  // Rahmenschenkel entfallen, wo ein Raum oder eine Plattform anliegt (die Raumwände übernehmen)
  const legSkip = (x, s) => onSide(ROOMS, x, s, 0.05) || onSide(PLATFORMS, x, s, 0.05) || (s > 0 && x > 198.9 && x < 203.1);
  const y1936 = (cond, fn) => (cond ? C.only(1936, fn) : fn());

  // ================= Kielgang =================
  for (const [ra, rb] of KEEL_RANGES) {
    const xs = segs(ra, rb);
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1], ya = ky(xa), yb = ky(xb);
      b.beam(M.plank, V(xa, ya - 0.03, 0), V(xb, yb - 0.03, 0), 0.95, 0.05);
      nav.ramp('Kielgang', xa, xb, -0.45, 0.45, ya, yb, 'x');
      const n = Math.max(1, Math.round((xb - xa) / 1.1));
      for (let k = 0; k < n; k++) {
        const x0 = xa + (xb - xa) * k / n, x1 = xa + (xb - xa) * (k + 1) / n;
        for (const s of [-1, 1]) {
          if (isOpen((x0 + x1) / 2, s)) continue;
          y1936(inRes((x0 + x1) / 2, s), () => {
            b.cyl(M.rope, V(x0, ky(x0) + 1.0, s * 0.5), V(x1, ky(x1) + 1.0, s * 0.5), 0.012, 4);
            b.cyl(M.alu, V(x0, ky(x0) - 0.05, s * 0.5), V(x0, ky(x0) + 1.0, s * 0.5), 0.014, 4);
          });
        }
      }
    }
    // Kielträger: A-Rahmen über dem Laufsteg
    for (const x of ST.filter((s) => s >= ra && s <= rb)) {
      const y = ky(x), top = V(x, y + 2.9, 0);
      for (const s of [-1, 1]) {
        b.beam(M.alu, V(x, y - 0.06, s * 0.5), V(x, y - 0.6, s * 1.9), 0.05);
        if (legSkip(x, s)) continue;
        y1936(inRes(x, s), () => b.beam(M.alu, V(x, y - 0.6, s * 1.9), top, 0.07));
      }
      b.beam(M.alu, V(x, y - 0.08, -0.5), V(x, y - 0.08, 0.5), 0.06);
    }
    const tx = xs.map((x) => V(x, ky(x) + 2.9, 0));
    for (let i = 0; i < tx.length - 1; i++) b.beam(M.alu, tx[i], tx[i + 1], 0.06);
  }
  // Abschluss achtern
  { const x = KEEL_RANGES[0][0], y = ky(x);
    b.cyl(M.alu, V(x, y + 1.0, -0.5), V(x, y + 1.0, 0.5), 0.016, 5); b.cyl(M.alu, V(x, y + 0.5, -0.5), V(x, y + 0.5, 0.5), 0.016, 5);
    for (const s of [-1, 1]) b.cyl(M.alu, V(x, y - 0.05, s * 0.5), V(x, y + 1.0, s * 0.5), 0.016, 5); }

  // ================= Tanks und Ballast =================
  for (const t of TANKS) {
    const { x, z, y0, s } = t;
    if (t.kind === 'nb') {           // Notballastsack, an Seilen vom Kielträger abgehängt
      b.sph(M.sack, 0.55, x, y0 + 0.85, z, 1, 1.35, 1, 12);
      for (const dx of [-0.25, 0.25]) b.cyl(M.rope, V(x + dx, y0 + 1.5, z), V(x + dx * 0.4, ky(x) + 2.6, s * 0.7), 0.015, 4);
    } else if (t.kind === 'oil') {
      b.vcyl(M.tank, 0.35, 1.0, x, y0, z, 12); b.sph(M.tank, 0.35, x, y0 + 1.0, z, 1, 0.3, 1, 12);
      b.cyl(M.steel, V(x, y0 + 0.2, z - s * 0.35), V(x, y0 + 0.2, s * 0.55), 0.02, 5);
    } else if (t.kind === 'ballast') {
      b.vcyl(M.tank, 0.8, 1.35, x, y0, z, 16); b.sph(M.tank, 0.8, x, y0 + 1.35, z, 1, 0.22, 1, 16);
      b.cyl(M.steel, V(x, y0 + 0.15, z - s * 0.8), V(x, y0 + 0.15, s * 0.55), 0.035, 6);
    } else {
      b.vcyl(M.tank, 0.8, 1.9, x, y0, z, 14); b.sph(M.tank, 0.8, x, y0 + 1.9, z, 1, 0.25, 1, 14);
      b.cyl(M.steel, V(x, y0 + 0.3, z - s * 0.8), V(x, y0 + 0.3, s * 0.55), 0.025, 5);
    }
  }
  // Sammelleitung Dieselöl, beidseits unter dem Geländer
  const fuelX = TANKS.filter((t) => t.kind === 'fuel').map((t) => t.x);
  for (const s of [-1, 1]) {
    const a = Math.min(...fuelX) - 0.5;
    b.cyl(M.steel, V(a, ky(a) + 0.05, s * 0.56), V(156, ky(156) + 0.05, s * 0.56), 0.03, 5);
    const fwd = fuelX.filter((x) => x > 190), c = fwd.length ? Math.max(...fwd) + 0.5 : 0;  // endet am vordersten Dieseltank
    if (c > 192.5) b.cyl(M.steel, V(192.5, ky(192.5) + 0.05, s * 0.56), V(c, ky(c) + 0.05, s * 0.56), 0.03, 5);
  }

  // ================= Räume am Kielgang =================
  const wallMat = { canvas: M.canvas, alu: M.aluDark, cream: M.wallCream };
  const wallX = (mat, xa, xb, z, y0 = 0, h = ROOM_H, t = 0.03) => {
    const xs = segs(xa, xb);
    for (let i = 0; i < xs.length - 1; i++) slab(b, mat, xs[i], xs[i + 1], ky(xs[i]) + y0, ky(xs[i + 1]) + y0, h, z - t / 2, z + t / 2);
  };
  const floorX = (mat, xa, xb, z0, z1) => {
    const xs = segs(xa, xb);
    for (let i = 0; i < xs.length - 1; i++) slab(b, mat, xs[i], xs[i + 1], ky(xs[i]) - 0.06, ky(xs[i + 1]) - 0.06, 0.06, z0, z1);
  };
  const zoneX = (name, xa, xb, z0, z1) => {
    const xs = segs(xa, xb);
    for (let i = 0; i < xs.length - 1; i++) nav.ramp(name, xs[i], xs[i + 1], z0, z1, ky(xs[i]), ky(xs[i + 1]), 'x');
  };
  for (const r of ROOMS) {
    const s = r.s, zi = s * 0.65, zo = s * r.zo, [z0, z1] = mm(zi, zo), mat = wallMat[r.wall], [d0, d1] = r.door, H = ROOM_H;
    floorX(r.wall === 'alu' ? M.aluDark : M.plank, r.x0, r.x1, z0, z1);
    wallX(mat, r.x0, d0, zi); wallX(mat, d1, r.x1, zi);
    wallX(mat, d0, d1, zi, 1.95, H - 1.95);                       // Türsturz
    for (const x of [d0, d1]) b.cyl(M.aluDark, V(x, ky(x) - 0.02, zi), V(x, ky(x) + 1.97, zi), 0.022, 6);
    wallX(mat, r.x0, r.x1, zo);
    for (const x of [r.x0, r.x1]) b.bb(mat, x - 0.015, x + 0.015, ky(x) - 0.06, ky(x) + H, z0, z1);
    const xs = segs(r.x0, r.x1);
    for (let i = 0; i < xs.length - 1; i++) slab(b, mat, xs[i], xs[i + 1], ky(xs[i]) + H, ky(xs[i + 1]) + H, 0.03, z0, z1);
    zoneX(r.name, r.x0 + 0.08, r.x1 - 0.08, ...mm(s * 0.72, s * (r.zo - 0.07)));
    nav.ramp(r.name, d0 + 0.08, d1 - 0.08, ...mm(s * 0.4, s * 0.76), ky(d0 + 0.08), ky(d1 - 0.08), 'x');
    // Kojen (Gestell, Matratze, Decke)
    for (const k of r.bunks) {
      const xc = k.x + 0.975, y = ky(xc), cap = r.id === 'kapitaen';
      for (const h of r.tiers) {
        b.bb(cap ? M.woodDark : M.alu, k.x, k.x + 1.95, y + h - 0.04, y + h, k.z0, k.z1);
        b.bb(M.linen, k.x + 0.02, k.x + 1.93, y + h, y + h + 0.08, k.z0 + 0.02, k.z1 - 0.02);
        b.bb(cap ? M.upBlue : M.blanket, k.x + 0.5, k.x + 1.94, y + h + 0.02, y + h + 0.095, k.z0 + 0.01, k.z1 - 0.01);
      }
      const top = y + r.tiers[r.tiers.length - 1] + 0.12;
      for (const px of [k.x + 0.02, k.x + 1.93]) for (const pz of [k.z0 + 0.02, k.z1 - 0.02]) b.cyl(cap ? M.woodDark : M.alu, V(px, ky(px) - 0.01, pz), V(px, top, pz), 0.016, 6);
      nav.block(k.x, k.x + 1.95, k.z0, k.z1, Math.min(ky(k.x), ky(k.x + 1.95)) - 0.1, y + 2);
    }
    for (let i = 0; i < 2; i++) { const lx = r.x0 + (r.x1 - r.x0) * (0.3 + 0.4 * i); b.vcyl(M.lamp, 0.08, 0.03, lx, ky(lx) + H - 0.04, s * (0.65 + r.zo) / 2, 8); }
  }
  for (const p of PLATFORMS) {
    const s = p.s, [z0, z1] = mm(s * 0.62, s * p.zo);
    floorX(M.plank, p.x0, p.x1, z0, z1);
    zoneX(p.name, p.x0 + 0.06, p.x1 - 0.06, ...mm(s * 0.66, s * (p.zo - 0.1)));
    nav.ramp(p.name, p.open[0] + 0.05, p.open[1] - 0.05, ...mm(s * 0.4, s * 0.7), ky(p.open[0] + 0.05), ky(p.open[1] - 0.05), 'x');
  }

  // ================= Axialgang =================
  const AY = AXIAL.y, A0 = AXIAL.x0, A1 = AXIAL.x1;
  nav.zone('Axialgang', A0, A1, -0.4, 0.4, AY);
  b.bb(M.plank, A0, A1, AY - 0.05, AY, -0.42, 0.42);
  for (const s of [-1, 1]) b.cyl(M.rope, V(A0, AY + 1.0, s * 0.46), V(A1, AY + 1.0, s * 0.46), 0.012, 4);
  for (const x of [A0, ...ST.filter((s) => s > A0 + 0.3 && s < A1 - 0.3), A1]) {
    const a = V(x, AY - 0.12, -0.95), c = V(x, AY - 0.12, 0.95), t = V(x, AY + 2.3, 0);
    b.beam(M.alu, a, c, 0.05); b.beam(M.alu, a, t, 0.05); b.beam(M.alu, c, t, 0.05);
    for (const s of [-1, 1]) b.cyl(M.alu, V(x, AY, s * 0.46), V(x, AY + 1.0, s * 0.46), 0.012, 4);
  }
  for (const s of [-0.95, 0.95]) b.beam(M.alu, V(A0, AY - 0.12, s), V(A1, AY - 0.12, s), 0.05);
  b.beam(M.alu, V(A0, AY + 2.3, 0), V(A1, AY + 2.3, 0), 0.05);
  for (const x of [A0, A1]) b.cyl(M.alu, V(x, AY + 1.0, -0.46), V(x, AY + 1.0, 0.46), 0.014, 5); // Endsperre

  // Leiterschächte Kielgang ↔ Axialgang
  for (const L of LADDERS) {
    const x = L.x, y0 = ky(x), z = LADDER_Z;
    for (const dx of [-0.2, 0.2]) b.cyl(M.alu, V(x + dx, y0, z), V(x + dx, AY + 1.0, z), 0.02, 6);
    for (let y = y0 + 0.3; y < AY + 0.9; y += 0.32) b.cyl(M.alu, V(x - 0.2, y, z), V(x + 0.2, y, z), 0.013, 5);
    for (let y = y0 + 2.2; y < AY - 0.4; y += 1.6) b.add(M.alu, new THREE.TorusGeometry(0.42, 0.012, 4, 14), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, y, z - 0.25));
    C.portal('Leiter (Ring ' + L.ring + ')', V(x, y0, 0), V(x, AY, 0), 'hinauf zum Axialgang', 'hinab zum Kielgang');
  }

  // ================= Hilfssteuerstand in der unteren Flosse =================
  { const S = FIN_STAND, y = S.y, yk = ky(S.lx);
    b.bb(M.plank, S.x0, S.x1, y - 0.05, y, -0.43, 0.43);
    for (const x of [S.x0 + 0.1, (S.x0 + S.x1) / 2, S.x1 - 0.1]) b.bb(M.aluDark, x - 0.03, x + 0.03, y - 0.14, y - 0.05, -0.4, 0.4);
    for (const x of [S.x0, S.x1]) b.bb(M.aluDark, x - 0.015, x + 0.015, y, y + 2.0, -finHalf(y) + 0.06, finHalf(y) - 0.06);
    nav.zone('Hilfssteuerstand (untere Flosse)', S.x0 + 0.15, S.x1 - 0.15, -0.42, 0.42, y);
    // Seitenruderrad vorn (Blick nach vorn), Höhenruderrad an Backbord (Blick zur Seite)
    b.box(M.aluDark, 0.25, 0.95, 0.25, S.x1 - 0.32, y + 0.475, 0); nav.block(S.x1 - 0.45, S.x1 - 0.15, -0.15, 0.15, y, y + 1.2);
    b.add(M.woodLight, new THREE.TorusGeometry(0.33, 0.028, 6, 20), new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(S.x1 - 0.5, y + 1.05, 0));
    b.box(M.aluDark, 0.22, 0.95, 0.14, 39.4, y + 0.475, -0.36); nav.block(39.25, 39.55, -0.45, -0.27, y, y + 1.2);
    b.torus(M.woodLight, 0.33, 0.028, 39.4, y + 1.05, -0.24, 'z', 20);
    // Leiter vom Kielgang durch den Kiel hinab in die Flosse
    const ta = V(S.lx, yk + 1.0, S.lz), tb = V(S.lx, y, 0.25);
    for (const dx of [-0.2, 0.2]) b.cyl(M.alu, V(ta.x + dx, ta.y, ta.z), V(tb.x + dx, tb.y, tb.z), 0.02, 6);
    for (let k = 1; ; k++) { const f = (1.0 + 0.3 * k) / (ta.y - tb.y); if (f > 0.99) break; const p = ta.clone().lerp(tb, f); b.cyl(M.alu, V(p.x - 0.2, p.y, p.z), V(p.x + 0.2, p.y, p.z), 0.013, 5); }
    C.portal('Leiter', V(S.lx, yk, 0), V(S.lx, y, 0), 'hinab zum Hilfssteuerstand', 'hinauf zum Kielgang');
  }

  // ================= Laufstege zu den Maschinengondeln =================
  for (const e of ENG) {
    const y0 = ky(e.x), s = e.side;
    const rampY = (z) => y0 + (e.yEnd - y0) * ((z - 0.45) / (e.zEnd - 0.45));
    b.beam(M.plank, V(e.x, y0 - 0.03, s * 0.45), V(e.x, e.yEnd - 0.03, s * e.zEnd), 0.85, 0.05);
    for (const dx of [-0.44, 0.44]) {
      b.cyl(M.alu, V(e.x + dx, y0 + 1.0, s * 0.6), V(e.x + dx, e.yEnd + 1.0, s * e.zEnd), 0.016, 5);
      const n = 6; for (let k = 0; k <= n; k++) { const z = 0.6 + (e.zEnd - 0.6) * k / n, y = rampY(z); b.cyl(M.alu, V(e.x + dx, y, s * z), V(e.x + dx, y + 1.0, s * z), 0.014, 4); }
    }
    b.cyl(M.alu, V(e.x - 0.44, e.yEnd + 1.0, s * e.zEnd), V(e.x + 0.44, e.yEnd + 1.0, s * e.zEnd), 0.016, 5);
    b.cyl(M.alu, V(e.x - 0.44, e.yEnd + 0.5, s * e.zEnd), V(e.x + 0.44, e.yEnd + 0.5, s * e.zEnd), 0.016, 5);
    if (s > 0) nav.ramp('Laufsteg zur Maschinengondel', e.x - 0.42, e.x + 0.42, 0.45, e.zEnd, y0, e.yEnd, 'z');
    else nav.ramp('Laufsteg zur Maschinengondel', e.x - 0.42, e.x + 0.42, -e.zEnd, -0.45, e.yEnd, y0, 'z');
    // Durchtritt durch die Hülle: Podest am Stichkiel, Lukenrahmen, Leiter hinauf zum Stichkiel
    let zc = e.zEnd;
    for (let t = 0; t <= 1; t += 0.002) { const z = 0.45 + (e.zEnd - 0.45) * t; if (z > hw(e.x, rampY(z))) { zc = z; break; } }
    const yc = rampY(zc), ac = Math.atan2(zc, -yc) / D2R, aS = ac + 14, ring = e.x > 100 ? 140 : 92, len = e.x > 100 ? 13 : 15;
    const pz0 = zc - 1.05, pz1 = zc - 0.15, yP = rampY(zc - 0.6), px0 = e.x + 0.4, px1 = e.x + 1.25;
    b.bb(M.plank, px0, px1, yP - 0.05, yP, ...mm(s * pz0, s * pz1));
    for (const px of [px0 + 0.08, px1 - 0.08]) b.beam(M.alu, V(px, yP - 0.06, s * (pz0 + 0.4)), V(px, yP - 0.75, s * (pz0 + 0.15)), 0.04);
    for (const pz of [pz0 + 0.03, pz1 - 0.03]) b.vcyl(M.alu, 0.014, 1.0, px1 - 0.03, yP, s * pz, 5);
    b.cyl(M.alu, V(px1 - 0.03, yP + 1.0, s * (pz0 + 0.03)), V(px1 - 0.03, yP + 1.0, s * (pz1 - 0.03)), 0.014, 5);
    b.cyl(M.alu, V(px0 + 0.05, yP + 1.0, s * (pz0 + 0.03)), V(px1 - 0.03, yP + 1.0, s * (pz0 + 0.03)), 0.014, 5);
    b.vcyl(M.alu, 0.014, 1.0, px0 + 0.05, yP, s * (pz0 + 0.03), 5);
    nav.zone('Podest am Stichkiel', px0, px1 - 0.05, ...mm(s * pz0, s * pz1), yP);
    const j = s > 0 ? e.js[0] : 35 - e.js[0], P = (x, a, d = 0) => { const p = hp(x, a, 1, d); p.z *= s; return p; };
    for (const xe of [e.x - 0.6, e.x + 0.6]) b.beam(M.aluDark, P(xe, j * 10, -0.04), P(xe, j * 10 + 20, -0.04), 0.06);
    for (const a of [j * 10, j * 10 + 20]) b.beam(M.aluDark, P(e.x - 0.6, a, -0.04), P(e.x + 0.6, a, -0.04), 0.06);
    // Stichkiel: Dreiecksträger längs der Hülle von Ring 92 bzw. 140 nach vorn
    const nS = Math.round(len / 1.25);
    for (let k = 0; k < nS; k++) {
      const xa = ring + len * k / nS, xb = ring + len * (k + 1) / nS;
      b.beam(M.alu, P(xa, aS - 2, -0.1), P(xb, aS - 2, -0.1), 0.05); b.beam(M.alu, P(xa, aS + 2, -0.1), P(xb, aS + 2, -0.1), 0.05); b.beam(M.alu, P(xa, aS, -0.7), P(xb, aS, -0.7), 0.05);
      b.beam(M.alu, P(xa, aS - 2, -0.1), P(xb, aS, -0.7), 0.03); b.beam(M.alu, P(xa, aS + 2, -0.1), P(xb, aS, -0.7), 0.03);
    }
    const lt = P(e.x + 0.84, aS, -0.72), lb = V(e.x + 0.84, yP, s * (pz0 + 0.45));
    for (const dx of [-0.17, 0.17]) b.cyl(M.alu, V(lb.x + dx, lb.y, lb.z), V(lt.x + dx, lt.y, lt.z), 0.016, 5);
    const ln = Math.floor(lb.distanceTo(lt) / 0.3);
    for (let k = 1; k < ln; k++) { const p = lb.clone().lerp(lt, k / ln); b.cyl(M.alu, V(p.x - 0.17, p.y, p.z), V(p.x + 0.17, p.y, p.z), 0.011, 4); }
    C.tp(e.name[0].toUpperCase() + e.name.slice(1), e.x, e.yEnd, s * (e.zEnd - 0.5), s * Math.PI / 2);
    I('Maschinengondel', 'Je zwei Gondeln hingen an Ring 92 (tiefer, damit die Propeller in ungestörter Luft liefen) und an Ring 140. In jeder lief ein 16-Zylinder-V-Dieselmotor Daimler-Benz DB 602 (LOF 6) mit 88,5 l Hubraum. Die Höchstleistung wird je nach Quelle mit 1.200 oder 1.320 PS (bei 1.650 U/min) angegeben, die Reiseleistung mit etwa 850 PS bei 1.350 U/min. Über ein Untersetzungsgetriebe 2 : 1 trieb er einen vierflügeligen Holz-Druckpropeller von 6 m Durchmesser an. Jede Gondel war ständig mit einem Maschinisten besetzt; er erreichte sie vom Kielgang über Laufsteg und Stichkiel, durch eine Luke in der Hülle und über eine Außenleiter.', e.x, e.yEnd + 1.4, s * (e.zEnd - 0.2));
  }

  // ================= Führergondel =================
  const gy = G_Y, gc = G_YC, H = gc - gy;
  const outline = [[GX0, -G_HW], [205.6, -G_HW], [207.4, -0.85], [208.1, 0], [207.4, 0.85], [205.6, G_HW], [GX0, G_HW]];
  const fs = new THREE.Shape(); outline.forEach((p, i) => (i ? fs.lineTo(p[0], p[1]) : fs.moveTo(p[0], p[1]))); fs.closePath();
  const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.08, bevelEnabled: false }); fg.rotateX(Math.PI / 2); fg.translate(0, gy, 0);
  b.add(M.linoGreen, fg);
  const glassPts = [];
  const winWall = (p, q) => {
    const a = V(p[0], gy, p[1]), c = V(q[0], gy, q[1]), up = (v, h) => V(v.x, v.y + h, v.z);
    b.beam(M.aluDark, up(a, 0.475), up(c, 0.475), 0.04, 0.95);
    b.beam(M.aluDark, up(a, 1.9 + (H - 1.9) / 2), up(c, 1.9 + (H - 1.9) / 2), 0.04, H - 1.9);
    const len = a.distanceTo(c), n = Math.max(1, Math.round(len / 0.85));
    for (let k = 0; k <= n; k++) { const m = a.clone().lerp(c, k / n); b.beam(M.alu, up(m, 0.95), up(m, 1.9), 0.05); }
    glassPts.push([up(a, 0.95), up(c, 0.95), up(c, 1.9), up(a, 1.9)]);
  };
  for (let i = 0; i < outline.length; i++) winWall(outline[i], outline[(i + 1) % outline.length]);
  { const pos = []; for (const [p1, p2, p3, p4] of glassPts) for (const p of [p1, p2, p3, p1, p3, p4]) pos.push(p.x, p.y, p.z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, M.glass); m.renderOrder = 3; root.add(m); }
  for (const [x0, x1, z0, z1] of [[GX0, 198.9, -G_HW, G_HW], [198.9, 202.7, -G_HW, 0.4], [202.7, GX1, -G_HW, G_HW]]) b.bb(M.ceil, x0, x1, gc - 0.05, gc, z0, z1);
  // Landerad
  b.cyl(M.rubber, V(203, gy - 0.75, -0.14), V(203, gy - 0.75, 0.14), 0.42, 14); b.box(M.aluDark, 0.9, 0.5, 0.5, 203, gy - 0.3, 0);

  // Treppe Kielgang ↔ Gondel
  const sx0 = 199, sx1 = 202.2, sy1 = ky(sx1), n = 13;
  for (let i = 0; i < n; i++) { const x0 = sx0 + (sx1 - sx0) * i / n, x1 = sx0 + (sx1 - sx0) * (i + 1) / n, y = gy + (sy1 - gy) * (i + 1) / n; b.bb(M.alu, x0, x1, y - 0.03, y, 0.47, 1.13); }
  for (const z of [0.47, 1.13]) { b.beam(M.aluDark, V(sx0, gy, z), V(sx1, sy1, z), 0.03, 0.12); b.cyl(M.alu, V(sx0, gy + 0.95, z), V(sx1, sy1 + 0.95, z), 0.016, 5); }
  b.bb(M.plank, sx1, 203.05, sy1 - 0.05, sy1, 0.45, 1.2);
  nav.ramp('Treppe zur Führergondel', sx0, sx1, 0.45, 1.15, gy, sy1, 'x');
  nav.zone('Treppe zur Führergondel', sx1, 203.0, 0.45, 1.15, sy1);
  nav.block(200.25, 202.4, 0.42, 1.2, gy, gy + 0.7);

  nav.zone('Führergondel – Beobachtungsraum', 198.2, 202.42, -1.05, 1.05, gy);
  nav.zone('Führergondel – Navigationsraum', 202.58, 204.22, -1.05, 1.05, gy);
  nav.zone('Führergondel – Steuerraum', 204.38, 207.15, -1.05, 1.05, gy);
  nav.zone('Führergondel – Steuerraum', 207.1, 207.6, -0.45, 0.45, gy);
  nav.zone('Führergondel', 202.3, 202.7, -0.95, 0.3, gy); nav.zone('Führergondel', 204.1, 204.5, -0.45, 0.45, gy);
  // Trennwände
  for (const [x, g0, g1] of [[202.5, -1.0, 0.36], [204.3, -0.5, 0.5]]) {
    b.bb(M.wallGreen, x - 0.02, x + 0.02, gy, gy + 0.95, -G_HW, g0); b.bb(M.wallGreen, x - 0.02, x + 0.02, gy, gy + 0.95, g1, G_HW);
    b.bb(M.wallGreen, x - 0.02, x + 0.02, gy + 1.9, gc, -G_HW, G_HW);
    for (const z of [g0, g1]) b.vcyl(M.alu, 0.02, 1.9, x, gy, z, 6);
  }
  // Seitenruderstand (vorn, Blick nach vorn)
  b.box(M.aluDark, 0.3, 0.95, 0.3, 206.95, gy + 0.475, 0); nav.block(206.75, 207.2, -0.2, 0.2, gy, gy + 1);
  b.add(M.woodLight, new THREE.TorusGeometry(0.33, 0.028, 6, 20), new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(206.72, gy + 1.05, 0));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; b.cyl(M.woodLight, V(206.72, gy + 1.05 - Math.cos(a) * 0.33, -Math.sin(a) * 0.33), V(206.72, gy + 1.05 + Math.cos(a) * 0.33, Math.sin(a) * 0.33), 0.012, 5); }
  b.vcyl(M.brass, 0.11, 0.1, 206.98, gy + 0.95, 0, 12); b.vcyl(M.black, 0.09, 0.02, 206.98, gy + 1.05, 0, 12);
  // Höhenruderstand (Backbord, Blick zur Seite)
  b.box(M.aluDark, 0.3, 0.95, 0.22, 205.5, gy + 0.475, -1.12);
  b.add(M.woodLight, new THREE.TorusGeometry(0.33, 0.028, 6, 20), new THREE.Matrix4().setPosition(205.5, gy + 1.05, -0.93));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; b.cyl(M.woodLight, V(205.5 - Math.sin(a) * 0.33, gy + 1.05 - Math.cos(a) * 0.33, -0.93), V(205.5 + Math.sin(a) * 0.33, gy + 1.05 + Math.cos(a) * 0.33, -0.93), 0.012, 5); }
  b.box(M.black, 0.9, 0.3, 0.06, 205.5, gy + 2.02, -1.2);
  for (const dx of [-0.3, 0, 0.3]) b.cyl(M.enamel, V(205.5 + dx, gy + 2.02, -1.17), V(205.5 + dx, gy + 2.02, -1.15), 0.1, 12);
  nav.block(205.3, 205.7, -1.3, -0.95, gy, gy + 1);
  // Ballast- und Gastafel über dem Höhenruderstand
  b.box(M.aluDark, 1.4, 0.08, 0.7, 205.9, gc - 0.12, -0.5);
  for (let k = 0; k < 8; k++) for (const [dz, mt] of [[-0.2, M.upRed], [0.15, M.upBlue]]) b.box(mt, 0.035, 0.12, 0.035, 205.35 + k * 0.16, gc - 0.22, -0.5 + dz);
  // Maschinentelegrafen (Steuerbord)
  for (const x of [205.1, 205.75]) { b.vcyl(M.brass, 0.04, 1.0, x, gy, 1.0, 8); b.cyl(M.brass, V(x, gy + 1.1, 0.93), V(x, gy + 1.1, 1.07), 0.14, 14); b.cyl(M.enamel, V(x, gy + 1.1, 0.92), V(x, gy + 1.1, 0.93), 0.12, 14); } // Hebel: beweglich in detail_gondola.js
  nav.block(205.0, 205.85, 0.85, 1.2, gy, gy + 1);
  // Kartentisch und Navigationsgerät
  b.bb(M.woodLight, 202.75, 204.15, gy + 0.86, gy + 0.9, -1.25, -0.55); b.bb(M.aluDark, 202.8, 204.1, gy, gy + 0.86, -1.22, -0.6);
  b.box(M.paper, 1.0, 0.006, 0.55, 203.45, gy + 0.905, -0.9, 0.08); b.vcyl(M.brass, 0.05, 0.3, 204.0, gy + 0.9, -1.1, 8);
  nav.block(202.75, 204.15, -1.25, -0.55, gy, gy + 1);
  b.bb(M.aluDark, 203.3, 204.15, gy, gy + 0.9, 0.75, 1.25); b.box(M.black, 0.5, 0.3, 0.3, 203.7, gy + 1.05, 1.05); nav.block(203.3, 204.15, 0.75, 1.25, gy, gy + 1);
  // Bank im Beobachtungsraum
  b.bb(M.upGreen, 198.25, 199.9, gy + 0.4, gy + 0.47, -1.22, -0.8); b.bb(M.aluDark, 198.25, 199.9, gy, gy + 0.4, -1.2, -0.85); nav.block(198.25, 199.9, -1.25, -0.8, gy, gy + 1);
  for (const x of [199.5, 203.4, 205.8]) b.vcyl(M.lamp, 0.08, 0.02, x, gc - 0.08, -0.2, 8);

  // Funkraum über der Gondel
  const yR = ky(205);
  b.bb(M.plank, 203.6, 206.4, yR - 0.05, yR, 0.6, 3.0);
  for (const [xa, xb] of [[203.6, 204.45], [205.35, 206.4]]) b.bb(M.canvas, xa, xb, yR, yR + 2.0, 0.63, 0.66);
  b.bb(M.canvas, 203.6, 206.4, yR, yR + 2.0, 2.97, 3.0); for (const x of [203.6, 206.4]) b.bb(M.canvas, x - 0.015, x + 0.015, yR, yR + 2.0, 0.63, 3.0);
  b.bb(M.canvas, 203.6, 206.4, yR + 2.0, yR + 2.03, 0.63, 3.0);
  nav.zone('Funkraum', 203.7, 206.3, 0.72, 2.9, yR); nav.zone('Funkraum', 204.55, 205.25, 0.4, 0.76, yR);
  b.bb(M.woodLight, 203.75, 206.25, yR + 0.72, yR + 0.76, 2.35, 2.95); nav.block(203.7, 206.3, 2.35, 2.95, yR, yR + 1);
  for (const [x, w] of [[204.2, 0.6], [205.0, 0.7], [205.85, 0.5]]) { b.box(M.black, w, 0.45, 0.35, x, yR + 0.99, 2.72); for (const dx of [-0.15, 0.15]) b.cyl(M.enamel, V(x + dx, yR + 1.05, 2.54), V(x + dx, yR + 1.05, 2.52), 0.06, 10); }
  b.vcyl(M.lamp, 0.07, 0.02, 205, yR + 1.96, 1.8, 8);
  { const { chairAt } = C; if (chairAt) chairAt(205.0, yR, 1.95, 0); }

  // ================= Bugraum: Plattform der Ankerwinde =================
  { const B = BOW, y = B.y, ya = ky(B.sx0), ns = 8;
    for (let i = 0; i < ns; i++) { const x0 = B.sx0 + (B.sx1 - B.sx0) * i / ns, x1 = B.sx0 + (B.sx1 - B.sx0) * (i + 1) / ns, yy = ya + (y - ya) * (i + 1) / ns; b.bb(M.alu, x0, x1, yy - 0.03, yy, -0.45, 0.45); }
    for (const s of [-1, 1]) { b.beam(M.aluDark, V(B.sx0, ya - 0.05, s * 0.47), V(B.sx1, y - 0.05, s * 0.47), 0.03, 0.14); b.cyl(M.alu, V(B.sx0, ya + 1.0, s * 0.5), V(B.sx1, y + 1.0, s * 0.5), 0.016, 5); }
    nav.ramp('Treppe zum Bugraum', B.sx0, B.sx1, -0.45, 0.45, ya, y, 'x');
    b.bb(M.plank, B.x0, B.x1, y - 0.05, y, -B.hz, B.hz);
    for (const x of [B.x0 + 0.1, (B.x0 + B.x1) / 2, B.x1 - 0.1]) b.beam(M.alu, V(x, y - 0.06, 0), V(x, -rLin(x) + 0.15, 0), 0.06);
    nav.zone('Bugraum', B.x0 + 0.02, B.x1 - 0.1, -B.hz + 0.1, B.hz - 0.1, y);
    for (const s of [-1, 1]) {
      b.cyl(M.alu, V(B.x0 + 0.5, y + 1.0, s * B.hz), V(B.x1, y + 1.0, s * B.hz), 0.016, 5);
      for (const x of [B.x0 + 0.5, (B.x0 + B.x1) / 2 + 0.25, B.x1]) b.vcyl(M.alu, 0.014, 1.0, x, y, s * B.hz, 5);
      b.cyl(M.alu, V(B.x0, y + 1.0, s * 0.5), V(B.x0 + 0.5, y + 1.0, s * B.hz), 0.016, 5);
    }
    // Ankerwinde für das Mastseil
    const wx = 236.75;
    b.cyl(M.steel, V(wx, y + 0.5, -0.5), V(wx, y + 0.5, 0.5), 0.3, 14); b.box(M.aluDark, 0.5, 0.5, 1.2, wx, y + 0.25, 0); nav.block(wx - 0.35, wx + 0.35, -0.65, 0.65, y, y + 1);
    b.cyl(M.rope, V(wx + 0.2, y + 0.6, 0), V(244.3, 0, 0), 0.02, 5); }

  // ================= Teleportziele und Infopunkte =================
  const mid = (r) => (r.door[0] + r.door[1]) / 2;
  const inside = (r, f = 0.5) => r.s * (0.65 + (r.zo - 0.65) * f);
  const RM = Object.fromEntries(ROOMS.map((r) => [r.id, r])), PL = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
  C.tp('Kielgang achtern', 44, ky(44), 0, 0);
  C.tp('Hilfssteuerstand (untere Flosse)', 41.6, FIN_STAND.y, 0.05, Math.PI);
  C.tp('Mannschaftsräume (Bucht 5)', mid(RM.crew5b), ky(mid(RM.crew5b)), 0, 0);
  C.tp('Axialgang (Schiffsmitte)', 123.5, AY, 0, 0);
  C.tp('Frachtraum', 150.5, ky(150.5), -1.6, -Math.PI / 2);
  C.tp('Mannschaftsraum (Bucht 11)', 162.25, ky(162.25), -2.7, Math.PI);
  C.tp('Elektrozentrale', 194.8, ky(194.8), 1.3, Math.PI / 2);
  C.tp('Führergondel – Steuerraum', 205.6, gy, 0.2, 0);
  C.tp('Funkraum', 204.9, yR, 1.5, Math.PI / 2);
  C.tp('Offiziersraum (Bucht 14)', mid(RM.off14), ky(mid(RM.off14)), -1.6, 0);
  C.tp('Axialgang (Bug)', 226, AY, 0, Math.PI);
  C.tp('Bugraum', 235.6, BOW.y, 0, 0);

  I('Kielgang', 'Der Kielgang lief als schmaler Laufsteg im dreieckigen Kielträger fast durch die ganze Länge des Schiffs; nur im Bereich der Fahrgastdecks (Ring 173–188) war er unterbrochen. An ihm lagen Treibstoff- und Ballasttanks, Fracht- und Posträume, Werkstatt, Elektrozentrale, die Quartiere der Besatzung und die Zugänge zu allen Gondeln. Wer danebentrat, stand auf nichts als der Stoffhülle.', 58, ky(58) + 1.5, 0.3);
  I('Treibstoff und Ballast', 'Das Dieselöl lagerte in zylindrischen Leichtmetallbehältern beiderseits des Kielgangs, von der Offiziersunterkunft nach achtern fast über die ganze Länge. Sie waren untereinander verbunden, sodass sich das Schiff durch Umpumpen trimmen ließ, und hingen an Drähten, die man im Notfall durchtrennen konnte, um einen Tank abzuwerfen. Die Gesamtmenge wird unterschiedlich angegeben – rund 60 bis 75 t, nach einer Quelle 88.000 Liter. Dazu kamen sieben Haupt-Ballasttanks mit je 2.000 kg Wasser und acht Notballastsäcke zu je 500 kg, je vier an Ring 47 und an Ring 218. Weil das Schiff durch den Verbrauch von rund einer halben Tonne Diesel je Stunde leichter wurde, musste unterwegs Gas abgeblasen werden. Zahl und Größe der einzelnen Tanks und die Lage der Ballasttanks sind nicht überliefert; eine zeitgenössische Beschreibung nennt statt der sieben Tanks fünfzehn Ballastfässer.', 100, ky(100) + 1.5, 0.3);
  I('Notballast', 'Hier, an Ring 47, hingen vier der acht Notballastsäcke mit je 500 kg Wasser; vier weitere saßen vorn an Ring 218. Sie wurden vom Höhenruderstand der Führergondel aus mit einem Zug sofort entleert, um das Heck oder den Bug schnell zu erleichtern.', 47, ky(47) + 1.6, 0.3);
  I('Mannschaftsräume (Bucht 5)', 'In Bucht 5 zwischen Ring 62 und 77 lagen zwölf Kojen der Mannschaft in stoffbespannten Kammern beiderseits des Kielgangs. Gearbeitet wurde in Wachen rund um die Uhr; gegessen wurde in der Mannschaftsmesse auf dem B-Deck.', mid(RM.crew5b), ky(mid(RM.crew5b)) + 1.6, 0.25);
  I('Mannschaftsraum (Bucht 11)', 'Direkt hinter den Fahrgasträumen, in Bucht 11 zwischen Ring 156,5 und 173, schliefen 22 Mann in Doppelstockkojen. Mit den zwölf Kojen in Bucht 5 und den zwölf Offizierskojen ergibt das 46 Schlafplätze; eine andere Quelle nennt 54 Schlafplätze bei bis zu 61 Mann Besatzung – die Differenz ist ungeklärt.', mid(RM.crew11), ky(mid(RM.crew11)) + 1.6, -0.25);
  I('Offiziersraum', 'Die Offiziere schliefen in einer gemeinsamen Abteilung mit zwölf Kojen in Bucht 14 zwischen Ring 203 und 218, unmittelbar vor der Führergondel. Der Kommandant hatte dort eine eigene Kammer. Ihre Messe lag – wie die der Mannschaft – auf dem B-Deck an Backbord.', mid(RM.off14), ky(mid(RM.off14)) + 1.6, -0.25);
  I('Kapitänskajüte', 'Die Kammer des Kommandanten lag in Bucht 14 bei den Offizieren. Ihre genaue Lage und Einrichtung sind nicht überliefert; dargestellt ist eine einfache Kammer mit Koje, Schreibplatte und Spind.', mid(RM.kapitaen), ky(mid(RM.kapitaen)) + 1.6, 0.25);
  I('Elektrozentrale', 'Achtern der Führergondel lag die Elektrozentrale: zwei Daimler-Benz-Diesel OM 65 (je 50–65 PS) mit Siemens-Generatoren lieferten zusammen 35 kW für die Bordnetze mit 220 V und 24 V; ein Aggregat allein genügte. Der Raum war mit Aluminiumblech verkleidet, durch eine Luftschleuse zugänglich und stand unter Überdruck, damit kein Wasserstoff eindringen konnte. Hier standen auch der Mutterkompass der Kreiselanlage und ein Scheinwerfer, der durch eine Bodenluke ausgefahren wurde. Die genaue Ringlage ist nicht belegt.', mid(RM.elektro), ky(mid(RM.elektro)) + 1.6, 0.25);
  I('Postraum', 'Die Zeppelinpost war eine wichtige Einnahmequelle. Im Postraum wurde sie sortiert, gestempelt und in Säcken verstaut. Wo genau der Postraum am Kielgang lag, ist nicht überliefert.', mid(RM.post), ky(mid(RM.post)) + 1.6, -0.25);
  I('Frachtraum', 'Neben Passagieren beförderte das Schiff Post und eilige Fracht – bis hin zu einem Automobil. Fracht- und Seilstauräume lagen am Kiel; ihre genaue Lage ist nicht überliefert.', (PL.fracht.open[0] + PL.fracht.open[1]) / 2, ky(150.5) + 1.4, -0.6);
  I('Werkstatt', 'In der Werkstatt am Kielgang hielten Takelmeister und Maschinisten Werkzeug und Ersatzteile bereit; kleinere Reparaturen an Gerippe, Leitungen und Motorenteilen wurden unterwegs selbst erledigt.', (PL.werk.open[0] + PL.werk.open[1]) / 2, ky(149.5) + 1.4, 0.6);
  I('Gerippe', 'Das Gerippe aus Duraluminium bestand aus 15 Hauptringen, je zwei leichteren Hilfsringen dazwischen und 36 Längsträgern. Die Hauptringe waren wie ein Speichenrad mit Stahldrähten verspannt. Mit rund 245 m Länge und 41,2 m Durchmesser waren LZ 129 und sein Schwesterschiff LZ 130 die größten je gebauten Luftfahrzeuge.', 137.5, ky(137.5) + 1.6, 0.3);
  I('Gaszellen', '16 Gaszellen, vom Heck zum Bug mit I bis XVI bezeichnet, fassten zusammen 200.000 m³ Traggas. Ihre Hülle war Baumwollstoff mit einem gasdichten Gelatinefilm statt der früher üblichen Goldschlägerhaut. 14 Manövrierventile – die Zellen I und II sowie XV und XVI teilten sich je eines – wurden vom Gasstand der Führergondel aus bedient; dazu kamen 14 selbsttätige Überdruckventile. Das abgeblasene Gas zog durch sieben senkrechte Gasschächte zu Abzugshauben auf dem Schiffsrücken. Entworfen war das Schiff für Helium; weil die USA es nicht lieferten, wurde es mit Wasserstoff gefüllt.', 123.5, AY + 1.4, 0.2);
  I('Axialgang', 'Neu bei LZ 129 war ein zweiter Laufsteg genau in der Mittelachse, mitten durch die Gaszellen. Von hier aus konnten Zellen und Ventile im Flug kontrolliert werden. Leitern an Ring 62, 123,5 und 188 verbanden ihn mit dem Kielgang.', 100, AY + 1.4, 0.2);
  I('Steuerraum', 'Vorn stand der Seitenrudergänger am Steuerrad mit Kreiselkompass. Der Höhenrudergänger stand quer zur Fahrtrichtung an Backbord, um Neigungen des Schiffs im Körper zu spüren; vor ihm Höhenmesser, Variometer und Neigungsmesser. Über ihm hingen die Züge für Wasserballast und Gasventile. An Steuerbord standen die Maschinentelegrafen zu den vier Gondeln.', 205.9, gy + 1.5, 0.45);
  I('Navigationsraum', 'Im Kartenraum wurde mit Koppelnavigation, Funkpeilung und Sternbeobachtung der Kurs bestimmt. Die Abdrift las man an den Schaumkronen der Wellen ab.', 203.5, gy + 1.5, -0.3);
  I('Funkraum', 'Der Funkraum lag über der Führergondel im Rumpf. Von hier wurden Wettermeldungen empfangen, Peilungen genommen und Telegramme der Passagiere übermittelt.', 205, yR + 1.4, 1.2);
  I('Bugraum', 'Der vordere Kielgang endete an der Plattform der Ankerwinde. In der Bugspitze saß der Ankerkonus, mit dem das Schiff am Mast einrastete; von hier wurden beim Landen Mastseil und Landetaue ausgegeben. Im Bug stand auch ein Notfunkgerät, dessen Strom ein Tretkurbel-Generator lieferte. Bei der Landung in Lakehurst am 6. Mai 1937 waren zwölf Mann im Bug. Das Schiff fing Feuer und brannte in weniger als einer Minute aus; 36 Menschen kamen ums Leben, 62 der 97 an Bord überlebten.', 236.2, BOW.y + 1.4, -0.9);
  I('Hilfssteuerstand', 'In der unteren Flosse lag ein Notsteuerstand von etwa 4,6 × 0,9 m mit eigenem Höhen- und Seitenruderrad. Er war über eine Leiter vom Kielgang zu erreichen und wurde besetzt, wenn die Steuerzüge aus der Führergondel ausfielen oder bei Landungen. Am 6. Mai 1937 tat hier Helmut Lau Dienst.', 41.2, FIN_STAND.y + 1.4, 0.15);
}
