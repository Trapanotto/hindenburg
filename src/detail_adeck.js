// Feinausstattung des A-Decks (Ring 173–188) auf dem Grundriss aus decks.js:
// gedeckte Tische und Buffets im Speisesaal, Anrichte mit Speiseaufzug, Promenaden, Gesellschaftsraum mit Flügel (1936)
// bzw. Sitzgruppe (1937), Schreib- und Lesezimmer, Treppenhalle mit Büste und Anschlagbrett, Gänge mit Wegweisern.
// Raumgrenzen kommen aus ROOMS; Lagen bestehender Möbel (Tische, Buffets, Bilder, Bänke, Flügel …) sind aus decks.js übernommen.
import * as THREE from 'three';
import { V, rng } from './util.js';
import { ROOMS, table, lamp, lean } from './decks.js';
import { A_Y, A_H, B_Y, hw } from './hull.js';

export default function (C) {
  const { M, nav } = C, b = lean(C.b);
  const AY = A_Y, AC = A_Y + A_H, PI = Math.PI;
  const R = Object.fromEntries(ROOMS.filter((r) => r.deck === 'A' && !r.cabin).map((r) => [r.name, r]));
  const SAAL = R['Speisesaal'], PAN = R['Anrichte'], LOUNGE = R['Gesellschaftsraum'], LESE = R['Schreib- und Lesezimmer'];
  const HALLE = R['Treppenhalle'], QG = R['Quergang'], MG = R['Mittelgang'], KGB = R['Kabinengang Backbord'], KGS = R['Kabinengang Steuerbord'];
  const PS = R['Promenade Steuerbord'];
  const XA = HALLE.x0, XF = SAAL.x1;                 // Endschotte (Flächen)
  const ZWS = SAAL.z1, ZWL = LOUNGE.z0;              // Kabinenblock-Wand zum Speisesaal (−) bzw. zur Lounge (+), Wandfläche
  const ZBR = PS.z0 - 0.05;                          // Brüstung zur Promenade (|z|)
  const XQL = LOUNGE.x1, XQS = LESE.x0;              // Querwand Lounge | Schreibzimmer: Fläche zur Lounge bzw. zum Schreibzimmer
  const XK0 = HALLE.x1, XK2 = QG.x1;                 // Wandflächen der Kabinenblock-Stirnseiten (zur Halle bzw. zum Quergang)
  const ZGI = KGS.z0;                                // Fläche der Innenwand der seitlichen Kabinengänge (|z|)
  const STS = R['Treppe zum B-Deck (Steuerbord)'];
  const ZRS = SAAL.z0;                               // Brüstung, Speisesaalseite
  const r1 = rng(129);
  // ----- lokale Zusatzmaterialien -----
  const shade = new THREE.MeshLambertMaterial({ color: 0xead9ae, emissive: 0x4a3c22, side: THREE.DoubleSide });
  const shadeRed = new THREE.MeshLambertMaterial({ color: 0xb8664a, emissive: 0x3a1a10, side: THREE.DoubleSide });
  const blossoms = [new THREE.MeshLambertMaterial({ color: 0xd8607a }), new THREE.MeshLambertMaterial({ color: 0xf2e6a0 }), M.white, new THREE.MeshLambertMaterial({ color: 0xc23a2e })];
  const ivory = new THREE.MeshLambertMaterial({ color: 0xf6f0de });

  const DIR = { 'x+': [1, 0], 'x-': [-1, 0], 'z+': [0, 1], 'z-': [0, -1] };
  /** Wandleuchte: Rosette, Arm, Tülle, Glaskolben mit Schirmchen */
  function sconce(x, y, z, dir) {
    const [nx, nz] = DIR[dir], P = (d, dy = 0) => V(x + nx * d, y + dy, z + nz * d);
    b.cyl(M.brass, P(0.002), P(0.016), 0.065, 12);
    b.cyl(M.brass, P(0.014, -0.03), P(0.12, 0.0), 0.01, 6);
    b.vcyl(M.brass, 0.022, 0.035, x + nx * 0.13, y - 0.01, z + nz * 0.13, 10, 0.04);
    b.sph(M.lamp, 0.045, x + nx * 0.13, y + 0.07, z + nz * 0.13, 1, 1.3, 1, 10);
    b.add(shade, new THREE.CylinderGeometry(0.055, 0.085, 0.09, 12, 1, true), new THREE.Matrix4().setPosition(x + nx * 0.13, y + 0.1, z + nz * 0.13));
  }
  /** Bilderrahmen um eine Fläche an einer z-Wand (Wandfläche zf, s = Richtung in den Raum) */
  function frameZ(zf, s, x0, x1, y0, y1, mat = M.woodDark, w = 0.045) {
    const za = Math.min(zf, zf + s * 0.03), zc = Math.max(zf, zf + s * 0.03), zl = zf + s * 0.022;
    b.bb(mat, x0 - w, x1 + w, y1, y1 + w, za, zc); b.bb(mat, x0 - w, x1 + w, y0 - w, y0, za, zc);
    b.bb(mat, x0 - w, x0, y0, y1, za, zc); b.bb(mat, x1, x1 + w, y0, y1, za, zc);
    const la = Math.min(zl, zl + s * 0.004), lc = Math.max(zl, zl + s * 0.004);           // Goldleiste innen
    b.bb(M.brass, x0, x1, y1 - 0.01, y1, la, lc); b.bb(M.brass, x0, x1, y0, y0 + 0.01, la, lc);
    b.bb(M.brass, x0, x0 + 0.01, y0 + 0.01, y1 - 0.01, la, lc); b.bb(M.brass, x1 - 0.01, x1, y0 + 0.01, y1 - 0.01, la, lc);
  }
  function frameX(xf, s, z0, z1, y0, y1, mat = M.woodDark, w = 0.045) {
    const xa = Math.min(xf, xf + s * 0.03), xc = Math.max(xf, xf + s * 0.03), xl = xf + s * 0.022;
    b.bb(mat, xa, xc, y1, y1 + w, z0 - w, z1 + w); b.bb(mat, xa, xc, y0 - w, y0, z0 - w, z1 + w);
    b.bb(mat, xa, xc, y0, y1, z0 - w, z0); b.bb(mat, xa, xc, y0, y1, z1, z1 + w);
    const la = Math.min(xl, xl + s * 0.004), lc = Math.max(xl, xl + s * 0.004);
    b.bb(M.brass, la, lc, y1 - 0.01, y1, z0, z1); b.bb(M.brass, la, lc, y0, y0 + 0.01, z0, z1);
    b.bb(M.brass, la, lc, y0 + 0.01, y1 - 0.01, z0, z0 + 0.01); b.bb(M.brass, la, lc, y0 + 0.01, y1 - 0.01, z1 - 0.01, z1);
  }
  /** Messingschild mit Text auf einer z-Wand */
  function plaqueZ(text, x, y, zf, s, w = 0.26, h = 0.06) {
    const za = Math.min(zf, zf + s * 0.006), zc = Math.max(zf, zf + s * 0.006);
    b.bb(M.brass, x - w / 2, x + w / 2, y - h / 2, y + h / 2, za, zc);
    C.sign(text, x, y, zf + s * 0.011, h * 0.7, s > 0 ? 'z+' : 'z-', 'brass');
  }
  /** Ring um Deckenleuchten (Messing) */
  const ring = (x, z) => b.torus(M.brass, 0.245, 0.009, x, AC - 0.03, z, 'y', 20);
  /** Wanduhr mit Holzrahmen */
  function clock(x, y, z, dir) {
    const [nx, nz] = DIR[dir], ax = nx ? 'x' : 'z';
    b.cyl(M.woodDark, V(x + nx * 0.002, y, z + nz * 0.002), V(x + nx * 0.014, y, z + nz * 0.014), 0.175, 20);
    b.torus(M.brass, 0.155, 0.012, x + nx * 0.022, y, z + nz * 0.022, ax, 20);
    C.gauge(x + nx * 0.02, y, z + nz * 0.02, 0.27, dir, 'Bordzeit', 4, '#f4efe0');
    b.sph(M.brass, 0.012, x + nx * 0.03, y, z + nz * 0.03, 1, 1, 1, 6);
  }
  /** Pflanzkübel mit Blattpflanze */
  function planter(x, z, r = 0.18, h = 0.42, seed = 1, spread = 1) {
    const q = rng(seed), y0 = AY + h;
    b.vcyl(M.woodDark, r * 0.85, h, x, AY, z, 12, r);
    for (const yy of [0.07, h - 0.07]) b.torus(M.brass, r * (0.85 + 0.15 * yy / h) + 0.003, 0.008, x, AY + yy, z, 'y', 16);
    b.vcyl(M.black, r - 0.02, 0.008, x, y0, z, 12);
    b.sph(M.plant, 0.1, x, y0 + 0.12, z, 1, 1.3, 1, 8);
    for (let k = 0; k < 7; k++) {
      const a = k * 2 * PI / 7 + q() * 0.5, L = (0.14 + q() * 0.1) * spread, H = 0.3 + q() * 0.3;
      const tip = V(x + Math.cos(a) * L, y0 + H, z + Math.sin(a) * L);
      b.cyl(M.plant, V(x, y0 + 0.02, z), tip, 0.007, 4);
      b.sph(M.plant, 0.07 * spread, tip.x, tip.y, tip.z, 1.3, 0.28, 1.3, 8);
    }
    b.shadow(M.shadow, x, AY, z, 2 * r + 0.3, 2 * r + 0.3);
    nav.block(x - r, x + r, z - r, z + r, AY, AY + 1);
  }
  /** Tasse mit Untertasse */
  function cup(x, y, z, mat = M.enamel) {
    b.vcyl(mat, 0.055, 0.007, x, y, z, 12);
    b.vcyl(mat, 0.03, 0.05, x, y + 0.007, z, 10, 0.037);
    b.torus(mat, 0.018, 0.004, x + 0.04, y + 0.033, z, 'z', 8);
  }
  /** Kaffee- bzw. Teekanne (Silber) */
  function pot(x, y, z, tea = false, sp = -1) {
    if (tea) b.sph(M.alu, 0.075, x, y + 0.06, z, 1, 0.8, 1, 12);
    else b.vcyl(M.alu, 0.062, 0.17, x, y, z, 12, 0.045);
    const top = tea ? y + 0.115 : y + 0.17;
    b.vcyl(M.alu, 0.047, 0.018, x, top, z, 12, 0.03); b.sph(M.woodDark, 0.014, x, top + 0.028, z, 1, 1, 1, 6);
    b.cyl(M.alu, V(x, y + (tea ? 0.05 : 0.06), z + sp * 0.04), V(x, y + (tea ? 0.12 : 0.16), z + sp * 0.11), 0.012, 6, 0.007);
    b.torus(M.woodDark, 0.045, 0.007, x, y + (tea ? 0.07 : 0.1), z - sp * 0.05, 'x', 10);
  }
  /** Tellerstapel mit Randlinien */
  function stack(x, y, z, r = 0.12, n = 8) {
    const h = n * 0.012;
    b.vcyl(M.enamel, r * 0.8, h, x, y, z, 14, r);
    for (let k = 2; k <= n; k += 3) b.torus(M.enamel, r * (0.8 + 0.2 * k / n) - 0.002, 0.004, x, y + k * 0.012, z, 'y', 14);
    b.torus(M.brass, r - 0.012, 0.0025, x, y + h + 0.001, z, 'y', 14);
  }
  /** Weinglas (Fuß, Stiel, Kelch) */
  function wine(x, y, z) {
    b.vcyl(M.glassClear, 0.028, 0.004, x, y, z, 10);
    b.vcyl(M.glassClear, 0.004, 0.07, x, y + 0.004, z, 5);
    b.vcyl(M.glassClear, 0.018, 0.06, x, y + 0.074, z, 10, 0.033);
  }
  /** Korbsessel (blickt lokal nach +z) */
  function korb(x, z, ry, cushion) {
    b.at(x, AY, z, ry, () => {
      b.vcyl(M.rope, 0.25, 0.36, 0, 0, 0, 14, 0.27);
      b.vcyl(M.woodLight, 0.256, 0.03, 0, 0, 0, 14);
      b.vcyl(cushion, 0.235, 0.07, 0, 0.36, 0, 14);
      const n = 9; let prev = null;
      for (let k = 0; k < n; k++) {
        const th = PI * (0.55 + 0.9 * k / (n - 1)), sx = Math.sin(th) * 0.255, sz = Math.cos(th) * 0.255;
        const hk = 0.64 + 0.16 * Math.sin(PI * k / (n - 1));
        b.box(M.rope, 0.075, hk - 0.36, 0.03, sx, (0.36 + hk) / 2, sz, th);
        const top = V(sx, hk + 0.01, sz);
        if (prev) b.cyl(M.woodLight, prev, top, 0.016, 5);
        prev = top;
      }
      b.shadow(M.shadow, 0, 0, 0, 0.75, 0.75);
    });
  }
  /** Lampenschirm (offener Kegel) */
  const lampShade = (mat, x, y, z, r0, r1_, h) => b.add(mat, new THREE.CylinderGeometry(r1_, r0, h, 14, 1, true), new THREE.Matrix4().setPosition(x, y + h / 2, z));

  // =====================================================================
  // SPEISESAAL (Backbord)
  // =====================================================================
  const TZ = -7.25, TABLES = [[175.0, 0], [177.2, 1], [179.3, 0], [182.2, 0], [184.4, 1], [186.6, 0]]; // Lage aus decks.js
  const occ = [];                                    // belegte Kreise auf den Tischen (Prüfung)
  const O = (x, z, r, tag) => occ.push({ x, z, r, tag });
  for (const [tx, round] of TABLES) {
    const ys = AY + (round ? 0.745 : 0.7575);        // Oberfläche (Tischtuch bzw. Platte)
    const yp = AY + (round ? 0.745 : 0.762);         // Unterkante der vorhandenen Teller
    const places = round ? Array.from({ length: 6 }, (_, k) => { const a = k * PI / 3 + PI / 6; return [Math.sin(a), Math.cos(a)]; }) : [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const dp = round ? 0.45 : 0.301, dc = round ? 0 : 0.018, cf = round ? -0.15 : -0.135, ck = round ? 0.18 : 0.135, cs = round ? 0.205 : 0.16;
    for (const [ux, uz] of places) {
      const tx_ = uz, tz_ = -ux;                     // Tangente
      const P = (u, t, y) => V(tx + ux * u + tx_ * t, y, TZ + uz * u + tz_ * t);
      const pc = P(dp, 0, 0), top = yp + 0.012;
      O(pc.x, pc.z, 0.11, 'Teller');
      b.torus(M.enamel, 0.1, 0.006, pc.x, top, pc.z, 'y', 16);                       // Tellerrand
      b.torus(M.brass, 0.085, 0.002, pc.x, top + 0.001, pc.z, 'y', 16);              // Goldrand
      b.vcyl(M.enamel, 0.074, 0.008, pc.x, top, pc.z, 14);                           // Vorspeisenteller
      b.vcyl(M.linen, 0.042, 0.085, pc.x, top + 0.008, pc.z, 4, 0.006);              // Serviette (Bischofsmütze)
      // Besteck: Gabel links, Messer und Löffel rechts
      const yc = ys + 0.003;
      const dq = dp + dc;
      b.beam(M.alu, P(dq - 0.08, cf, yc), P(dq + 0.07, cf, yc), 0.011, 0.004); b.beam(M.alu, P(dq - 0.118, cf, yc), P(dq - 0.08, cf, yc), 0.022, 0.003);
      b.beam(M.alu, P(dq, ck, yc + 0.002), P(dq + 0.075, ck, yc + 0.002), 0.013, 0.008); b.beam(M.alu, P(dq - 0.1, ck, yc), P(dq, ck, yc), 0.016, 0.002);
      b.beam(M.alu, P(dq - 0.045, cs, yc), P(dq + 0.075, cs, yc), 0.008, 0.003); const sp = P(dq - 0.07, cs, yc); b.sph(M.alu, 0.02, sp.x, sp.y, sp.z, 1, 0.3, 1, 8);
      for (const [t, u0, u1] of [[cf, dq - 0.118, dq + 0.07], [ck, dq - 0.1, dq + 0.075], [cs, dq - 0.09, dq + 0.075]]) for (let u = u0; u <= u1 + 1e-6; u += 0.03) { const p = P(u, t, 0); O(p.x, p.z, 0.011, 'Besteck'); }
      // Weinglas und Brotteller mit Buttermesser
      const wg = round ? P(0.3, 0.1, 0) : P(dp + 0.1, 0.2, 0); wine(wg.x, ys, wg.z); O(wg.x, wg.z, 0.033, 'Weinglas');
      const bp = round ? P(0.26, -0.12, 0) : P(dp, -0.22, 0);
      b.vcyl(M.enamel, 0.055, 0.008, bp.x, ys, bp.z, 12); O(bp.x, bp.z, 0.055, 'Brotteller');
      b.beam(M.alu, V(bp.x - tx_ * 0.04, ys + 0.01, bp.z - tz_ * 0.04), V(bp.x + tx_ * 0.04, ys + 0.01, bp.z + tz_ * 0.04), 0.01, 0.003);
      // vorhandenes Wasserglas aus decks.js (nur zur Kollisionsprüfung)
      const g0 = round ? (() => { const a = Math.atan2(ux, uz) + 0.35; return [tx + Math.sin(a) * 0.4, TZ + Math.cos(a) * 0.4]; })()
        : [tx + ux * 0.7 * 0.43 + 0.15 * Math.sign(uz * 0.7 || 1), TZ + uz * 0.7 * 0.43 + 0.15 * Math.sign(ux * 0.7 || 1)];
      O(g0[0], g0[1], 0.03, 'Wasserglas');
    }
    O(tx, TZ, 0.035, 'Vase');
    // Tischmitte: Menage, Blumen, Menükarte
    for (const [dx, dz, m] of [[0.08, 0.045, M.white], [0.045, 0.08, M.black]]) {
      b.vcyl(M.enamel, 0.013, 0.045, tx + dx, ys, TZ + dz, 8); b.sph(m === M.white ? M.alu : M.aluDark, 0.013, tx + dx, ys + 0.047, TZ + dz, 1, 0.8, 1, 6);
      O(tx + dx, TZ + dz, 0.014, 'Menage');
    }
    b.box(M.paper, 0.08, 0.105, 0.004, tx - 0.06, ys + 0.053, TZ + 0.1); O(tx - 0.06, TZ + 0.1, 0.045, 'Karte');
    for (const s of [1, -1]) C.panel('adk_menu', (g, w, h) => {
      g.fillStyle = '#f3ecd8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9a7a3a'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#3a2a18'; g.font = 'bold 15px Georgia'; g.textAlign = 'center'; g.fillText('Speisenfolge', w / 2, 30);
      g.font = '9px Georgia'; ['Kraftbrühe', 'Rheinsalm', 'Rehrücken', 'Eisbombe', 'Mokka'].forEach((t, i) => g.fillText(t, w / 2, 52 + i * 14));
    }, tx - 0.06, ys + 0.053, TZ + 0.1 + s * 0.004, 0.072, 0.096, s > 0 ? 'z+' : 'z-');
    for (let k = 0; k < 6; k++) { const a = k * PI / 3 + 0.3; b.sph(blossoms[(k + (round ? 1 : 0)) % 4], 0.02, tx + Math.cos(a) * 0.05, AY + 0.985 + (k % 2) * 0.02, TZ + Math.sin(a) * 0.05, 1, 0.8, 1, 6); }
  }
  // Buffets an der Kabinenwand: Schubladen, Türen, Geschirr, Kannen
  const BUF = [[174.9, 176.5], [177.4, 179.0], [182.6, 184.2], [185.1, 186.7]], FZ = ZWS - 0.46, YB = AY + 0.91; // Front bei z −5,70
  BUF.forEach(([x0, x1], i) => {
    const nd = 3, wd = (x1 - x0 - 0.06) / nd;
    for (let k = 0; k < nd; k++) {
      const a = x0 + 0.03 + k * wd + 0.006, c = a + wd - 0.012, m = (a + c) / 2;
      b.bb(M.wood, a, c, AY + 0.7, AY + 0.84, FZ - 0.012, FZ);                         // Schublade
      b.cyl(M.brass, V(m - 0.06, AY + 0.77, FZ - 0.032), V(m + 0.06, AY + 0.77, FZ - 0.032), 0.006, 6);
      for (const dx of [-0.055, 0.055]) b.cyl(M.brass, V(m + dx, AY + 0.77, FZ - 0.012), V(m + dx, AY + 0.77, FZ - 0.032), 0.004, 5);
      b.bb(M.wood, a, c, AY + 0.14, AY + 0.66, FZ - 0.01, FZ);                         // Tür
      b.bb(M.trim, a + 0.04, c - 0.04, AY + 0.19, AY + 0.61, FZ - 0.016, FZ - 0.01);    // Füllung
      b.sph(M.brass, 0.013, k % 2 ? a + 0.05 : c - 0.05, AY + 0.55, FZ - 0.024, 1, 1, 1, 8);
      b.bb(M.black, m - 0.004, m + 0.004, AY + 0.62, AY + 0.645, FZ - 0.018, FZ - 0.014);
    }
    const zc = ZWS - 0.24;
    stack(x0 + 0.22, YB, zc, 0.12, 9); stack(x0 + 0.5, YB, zc + 0.03, 0.09, 6);
    pot(x0 + 0.78, YB, zc - 0.02, i % 2 === 1); pot(x0 + 0.98, YB, zc + 0.02, i % 2 === 0);
    if (i % 2 === 0) { // Tablett mit Gläsern
      b.vcyl(M.brass, 0.16, 0.012, x1 - 0.32, YB, zc, 16);
      for (let k = 0; k < 7; k++) { const a = k * 2 * PI / 6, rr = k === 6 ? 0 : 0.09; b.vcyl(M.glassClear, 0.028, 0.09, x1 - 0.32 + Math.cos(a) * rr, YB + 0.012, zc + Math.sin(a) * rr, 8, 0.032); }
    } else {           // Obstschale und Tassen
      b.vcyl(M.enamel, 0.07, 0.06, x1 - 0.36, YB, zc, 12, 0.14);
      const q = rng(40 + i);
      for (let k = 0; k < 6; k++) b.sph([M.red, M.pigskin, M.plant, M.red][k % 4], 0.035, x1 - 0.36 + (q() - 0.5) * 0.12, YB + 0.08 + (k > 3 ? 0.04 : 0), zc + (q() - 0.5) * 0.12, 1, 1, 1, 8);
      cup(x1 - 0.14, YB, zc - 0.08); cup(x1 - 0.14, YB, zc + 0.08);
    }
  });
  // Bilderrahmen, Messingschilder, Wanduhr, Wandleuchten
  for (const [cx, t] of [[176.95, 'Rio de Janeiro · Otto Arpke'], [184.65, 'Pernambuco · Otto Arpke']]) {
    frameZ(ZWS, -1, cx - 2.0, cx + 2.0, AY + 1.045, AY + 2.195);
    plaqueZ(t, cx, AY + 0.96, ZWS, -1, 0.3, 0.06);
  }
  clock(179.75, AY + 1.75, ZWS, 'z-');
  for (const x of [174.6, 182.12, 187.3]) sconce(x, AY + 1.7, ZWS, 'z-');
  sconce(XA, AY + 1.7, -7.25, 'x+');
  for (const [tx] of TABLES) ring(tx, TZ);
  for (const x of [176.05, 178.25, 183.4, 185.6]) { lamp(C, x, AC, -6.0); ring(x, -6.0); }
  // Servierwagen in der Achterecke
  {
    const x0 = XA + 0.07, x1 = XA + 0.57, z0 = -6.95, z1 = -6.2, h = 0.78;
    for (const x of [x0 + 0.03, x1 - 0.03]) for (const z of [z0 + 0.03, z1 - 0.03]) { b.vcyl(M.alu, 0.012, h + 0.02 - 0.05, x, AY + 0.05, z, 6); b.sph(M.black, 0.035, x, AY + 0.035, z, 0.6, 1, 1, 8); }
    for (const y of [0.3, h - 0.02]) b.bb(M.woodLight, x0, x1, AY + y, AY + y + 0.02, z0, z1);
    for (const [a, c] of [[V(x0 + 0.03, AY + h + 0.05, z0 + 0.03), V(x1 - 0.03, AY + h + 0.05, z0 + 0.03)], [V(x0 + 0.03, AY + h + 0.05, z1 - 0.03), V(x1 - 0.03, AY + h + 0.05, z1 - 0.03)],
      [V(x0 + 0.03, AY + h + 0.05, z0 + 0.03), V(x0 + 0.03, AY + h + 0.05, z1 - 0.03)]]) b.cyl(M.alu, a, c, 0.008, 5);
    for (const z of [z0 + 0.03, z1 - 0.03]) { b.vcyl(M.alu, 0.012, 0.05, x0 + 0.03, AY + h, z, 6); b.vcyl(M.alu, 0.012, 0.05, x1 - 0.03, AY + h, z, 6); b.cyl(M.alu, V(x1 - 0.03, AY + h + 0.05, z), V(x1 + 0.05, AY + h + 0.1, z), 0.01, 6); }
    b.cyl(M.woodDark, V(x1 + 0.05, AY + h + 0.1, z0 + 0.03), V(x1 + 0.05, AY + h + 0.1, z1 - 0.03), 0.016, 8);
    const yt = AY + h;
    b.vcyl(M.enamel, 0.12, 0.1, x0 + 0.25, yt, -6.75, 14, 0.1); b.sph(M.enamel, 0.1, x0 + 0.25, yt + 0.1, -6.75, 1, 0.45, 1, 12); b.sph(M.alu, 0.018, x0 + 0.25, yt + 0.15, -6.75, 1, 1, 1, 6);
    b.cyl(M.alu, V(x0 + 0.34, yt + 0.08, -6.75), V(x0 + 0.42, yt + 0.22, -6.68), 0.006, 5);
    stack(x0 + 0.25, yt, -6.38, 0.1, 6);
    stack(x0 + 0.25, AY + 0.32, -6.7, 0.12, 10);
    b.bb(M.linen, x0 + 0.12, x0 + 0.4, AY + 0.32, AY + 0.4, -6.47, -6.25);
    b.shadow(M.shadow, (x0 + x1) / 2 + 0.03, AY, (z0 + z1) / 2, 0.6, 1.0);
    nav.block(x0, x1 + 0.07, z0, z1, AY, AY + 1);
  }

  // =====================================================================
  // ANRICHTE mit Speiseaufzug
  // =====================================================================
  {
    const xw = PAN.x0, yc = AY + 0.93, xm = 180.53;              // Arbeitsplatte aus decks.js: x 180,34–180,74, Oberkante +0,93
    // Wärmeplatte mit zwei Kochplatten
    b.bb(M.steel, xw + 0.04, 180.68, yc, yc + 0.06, -4.05, -3.55);
    for (const z of [-3.92, -3.68]) { b.vcyl(M.black, 0.085, 0.008, xm, yc + 0.06, z, 14); b.cyl(M.black, V(180.68, yc + 0.03, z), V(180.7, yc + 0.03, z), 0.013, 8); }
    b.sph(M.navRed, 0.008, 180.685, yc + 0.045, -3.8, 1, 1, 1, 6);
    b.cyl(M.black, V(xw + 0.06, yc + 0.03, -3.58), V(xw + 0.005, yc + 0.03, -3.5), 0.006, 4);
    b.vcyl(M.alu, 0.075, 0.12, xm, yc + 0.068, -3.92, 12); b.vcyl(M.alu, 0.077, 0.01, xm, yc + 0.188, -3.92, 12); b.sph(M.black, 0.012, xm, yc + 0.2, -3.92, 1, 1, 1, 6);
    for (const s of [-1, 1]) b.cyl(M.black, V(xm, yc + 0.16, -3.92 + s * 0.075), V(xm, yc + 0.16, -3.92 + s * 0.1), 0.008, 5);
    pot(xm, yc + 0.068, -3.68, false, -1);
    stack(xm, yc, -4.95, 0.11, 10); stack(xm, yc, -4.68, 0.09, 7);
    for (const dx of [-0.09, 0.06]) for (const z of [-4.48, -4.34]) cup(xm + dx, yc, z);
    for (let k = 0; k < 3; k++) b.bb(M.alu, xw + 0.05, 180.66, yc + k * 0.012, yc + k * 0.012 + 0.008, -4.27, -4.1);
    // Wandregal über der Arbeitsplatte
    for (const yb of [AY + 1.38, AY + 1.76]) {
      b.bb(M.woodLight, xw, xw + 0.26, yb - 0.025, yb, -5.1, -3.42);
      for (const z of [-5.0, -4.26, -3.52]) b.bb(M.alu, xw, xw + 0.2, yb - 0.1, yb - 0.025, z - 0.01, z + 0.01);
      b.cyl(M.alu, V(xw + 0.245, yb + 0.06, -5.1), V(xw + 0.245, yb + 0.06, -3.42), 0.006, 5);
      for (const z of [-5.08, -3.44]) b.cyl(M.alu, V(xw + 0.245, yb, z), V(xw + 0.245, yb + 0.06, z), 0.005, 4);
    }
    for (let k = 0; k < 7; k++) cup(xw + 0.12, AY + 1.38, -5.02 + k * 0.11);
    for (let k = 0; k < 6; k++) b.vcyl(M.glassClear, 0.03, 0.1, xw + 0.12, AY + 1.38, -4.15 + k * 0.12, 8, 0.034);
    for (let k = 0; k < 14; k++) { const z = -5.02 + k * 0.045; b.cyl(M.enamel, V(xw + 0.12, AY + 1.866, z), V(xw + 0.12, AY + 1.866, z + 0.012), 0.1, 14); }
    for (let k = 0; k < 4; k++) stack(xw + 0.13, AY + 1.76, -4.25 + k * 0.22, 0.08, 4);
    // Speiseaufzug: Rahmen, Griff, Schild, Klingel (Tür aus decks.js: x 181,0–181,6, z −4,115)
    const zd = -4.115;
    for (const [a, c, y0, y1] of [[180.975, 181.0, 0.38, 1.0], [181.6, 181.625, 0.38, 1.0], [180.975, 181.625, 0.98, 1.0], [180.975, 181.625, 0.38, 0.4]]) b.bb(M.aluDark, a, c, AY + y0, AY + y1, zd - 0.012, zd);
    for (const y of [0.55, 0.8]) b.bb(M.aluDark, 181.02, 181.58, AY + y, AY + y + 0.01, zd - 0.006, zd);
    b.cyl(M.brass, V(181.52, AY + 0.6, zd - 0.04), V(181.52, AY + 0.78, zd - 0.04), 0.009, 6);
    for (const y of [0.62, 0.76]) b.cyl(M.brass, V(181.52, AY + y, zd), V(181.52, AY + y, zd - 0.04), 0.006, 5);
    C.sign('Speiseaufzug', 181.3, AY + 1.022, -4.106, 0.04, 'z-', 'brass');
    b.bb(M.brass, 181.635, 181.685, AY + 0.7, AY + 0.8, -4.108, -4.1); b.cyl(M.red, V(181.655, AY + 0.765, -4.108), V(181.655, AY + 0.765, -4.12), 0.01, 8);
    b.cyl(M.black, V(181.655, AY + 0.725, -4.108), V(181.655, AY + 0.725, -4.116), 0.007, 6);
    // auf dem Schacht: Tablett mit Gläsern
    b.bb(M.alu, 181.0, 181.6, AY + 1.05, AY + 1.06, -3.98, -3.58);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) b.vcyl(M.glassClear, 0.028, 0.1, 181.08 + i * 0.145, AY + 1.06, -3.88 + k * 0.2, 8, 0.032);
    // Unterschrank unter den Borden (x 181,58–181,76)
    const xs = PAN.x1;
    b.bb(M.woodLight, 181.6, xs, AY, AY + 0.85, -5.1, -4.22);
    b.bb(M.alu, 181.58, xs, AY + 0.85, AY + 0.87, -5.12, -4.2);
    for (const [z0, z1] of [[-5.08, -4.67], [-4.65, -4.24]]) { b.bb(M.wood, 181.588, 181.6, AY + 0.1, AY + 0.8, z0, z1); b.sph(M.brass, 0.012, 181.578, AY + 0.7, z0 > -4.7 ? z0 + 0.05 : z1 - 0.05, 1, 1, 1, 6); }
    for (let k = 0; k < 2; k++) b.bb(M.alu, 181.6, 181.74, AY + 0.87 + k * 0.012, AY + 0.878 + k * 0.012, -4.95, -4.4);
  }

  // =====================================================================
  // PROMENADEN (beide Seiten)
  // =====================================================================
  const RINGS = [178, 183];                          // Hilfsringe (Spantträger reichen 0,4 m nach innen)
  const nearRing = (x, d) => RINGS.some((r) => Math.abs(x - r) < d);
  for (const s of [-1, 1]) {
    const zs = (x, y, d) => s * (hw(x, y) - d);
    const xEnd = XF - 0.35;
    // Vorhänge an den Fensterpfosten (zusammengebunden) und Vorhangstange
    // (entfernt: Die Vorhänge lagen wie Bretter quer über den Schrägfenstern)
    for (let x = 174; x < 174; x++) {
      if (nearRing(x, 0.3)) continue;
      const yT = AC - 0.1, yK = AY + 1.6, yU = AY + 1.15, cm = s < 0 ? M.curtain : M.curtainBlue;
      const pT = V(x, yT, zs(x, yT, 0.08)), pK = V(x, yK, zs(x, yK, 0.08)), pU = V(x, yU, zs(x, yU, 0.08));
      b.beam(cm, pT, pK, 0.1, 0.035); b.beam(cm, pK, pU, 0.13, 0.04);
      b.beam(M.brass, V(x, yK + 0.02, pK.z - s * 0.025), V(x, yK - 0.02, pK.z - s * 0.025), 0.12, 0.012);
      b.cyl(M.brass, V(x, yK, zs(x, yK, 0.014)), V(x, yK, zs(x, yK, 0.06)), 0.006, 4);
    }
    for (let x = 173.4; x < XF - 0.3; x += 1) {
      const xb = Math.min(XF - 0.25, x + 1), y = AC - 0.06;
      for (const [a, c] of [[x, xb]]) {
        let a2 = a, c2 = c;
        for (const r of RINGS) { if (a2 < r + 0.25 && c2 > r - 0.25) { if (a2 < r - 0.25) c2 = r - 0.25; else a2 = r + 0.25; } }
        if (c2 - a2 > 0.1) b.cyl(M.alu, V(a2, y, zs(a2, y, 0.06)), V(c2, y, zs(c2, y, 0.06)), 0.01, 6);
      }
    }
    // Handlauf-Konsolen und Streben zum Fensterrahmen, Fußleiste an der Hülle
    const yr = AY + 0.95, pts = [];
    for (let x = 173.4; x <= 187.61; x += 0.71) pts.push(x);
    pts.forEach((x, i) => {
      const p = V(x, yr, zs(x, yr, 0.1));
      if (i % 3) { b.cyl(M.alu, p, V(x, yr, zs(x, yr, 0.025)), 0.01, 5); b.cyl(M.alu, V(x, yr, zs(x, yr - 0.03, 0.02)), V(x, yr, zs(x, yr - 0.03, 0.006)), 0.025, 8); }
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const xa = pts[i], xb = pts[i + 1];
      b.beam(M.trim, V(xa, AY + 0.06, zs(xa, AY, 0.022)), V(xb, AY + 0.06, zs(xb, AY, 0.022)), 0.025, 0.12);
    }
    if (pts[pts.length - 1] < xEnd) b.beam(M.trim, V(pts[pts.length - 1], AY + 0.06, zs(pts[pts.length - 1], AY, 0.022)), V(xEnd, AY + 0.06, zs(xEnd, AY, 0.022)), 0.025, 0.12);
  }
  // Tischchen mit Korbsesseln (Laufweg zum Fenster ≥ 0,7 m), Pflanzkübel, Schilder
  const promGroup = (x, s, seed) => {
    const z = s * 9.3, q = rng(seed);
    table(C, x, AY, z, 0.5, 0.5, M.woodLight, 0.62, true);
    korb(x - 0.53, z, PI / 2, s < 0 ? M.upRed : M.upGreen); korb(x + 0.53, z, -PI / 2, s < 0 ? M.upRed : M.upGreen);
    const yt = AY + 0.6375;
    cup(x - 0.1, yt, z - 0.08); cup(x + 0.12, yt, z + 0.09);
    b.vcyl(M.glassClear, 0.02, 0.12, x, yt, z + 0.12, 8, 0.026); b.sph(blossoms[seed % 4], 0.025, x, yt + 0.14, z + 0.12, 1, 0.8, 1, 6); b.sph(M.plant, 0.02, x + 0.015, yt + 0.12, z + 0.11, 1, 1, 1, 6);
    // Fernglas
    for (const dz of [-0.025, 0.025]) b.cyl(M.black, V(x + 0.05 - q() * 0.01, yt + 0.025, z - 0.15 + dz), V(x + 0.17, yt + 0.025, z - 0.15 + dz), 0.022, 8, 0.018);
    b.bb(M.paper, x - 0.23, x - 0.04, yt, yt + 0.006, z, z + 0.2);
  };
  promGroup(174.45, -1, 1); promGroup(182.0, -1, 2); promGroup(181.35, 1, 3);
  planter(173.75, 9.25, 0.17, 0.42, 6); planter(XF - 0.4, -9.18, 0.16, 0.4, 7);
  const winNote = 'Fenster nur vom Personal zu öffnen';
  for (const [x, s] of [[177.45, -1], [184.0, -1], [182.32, 1]]) C.sign(winNote, x, AY + 0.6, s * (ZBR + 0.056), 0.05, s > 0 ? 'z+' : 'z-', 'plate');
  C.sign('Speisesaal', 179.95, AY + 0.6, -(ZBR + 0.056), 0.055, 'z-', 'brass');
  C.sign('Gesellschaftsraum', 177.05, AY + 0.6, ZBR + 0.056, 0.055, 'z+', 'brass');
  C.sign('Schreib- und Lesezimmer', XQL - 0.006, AY + 2.17, 8.75, 0.075, 'x-', 'brass');

  // =====================================================================
  // GESELLSCHAFTSRAUM (Steuerbord achtern)
  // =====================================================================
  const rug = (x0, x1, z0, z1, mat = M.carpetRed, edge = M.carpetBlue) => {
    b.bb(mat, x0, x1, AY + 0.0005, AY + 0.005, z0, z1);
    for (const [a, c, d, e] of [[x0, x1, z0, z0 + 0.08], [x0, x1, z1 - 0.08, z1], [x0, x0 + 0.08, z0 + 0.08, z1 - 0.08], [x1 - 0.08, x1, z0 + 0.08, z1 - 0.08]]) b.bb(edge, a, c, AY + 0.0005, AY + 0.0055, d, e);
  };
  const GROUPS = [[175.6, 7.0], [178.1, 7.0]];                     // Sitzgruppen aus decks.js (Tisch r 0,38, Platte +0,60)
  for (const [gx, gz] of GROUPS) rug(gx - 1.05, gx + 1.05, gz - 0.95, gz + 0.95);
  const magazines = (x, y, z, n, seed, ry = 0) => {
    const q = rng(seed);
    for (let k = 0; k < n; k++) b.box([M.upRed, M.paper, M.upBlue, M.white][k % 4], 0.21, 0.006, 0.28, x + (q() - 0.5) * 0.03, y + 0.003 + k * 0.006, z + (q() - 0.5) * 0.03, ry + (q() - 0.5) * 0.4);
  };
  const cards = (x, y, z, seed) => {
    const q = rng(seed);
    b.box(M.white, 0.06, 0.012, 0.09, x, y + 0.006, z, 0.2);
    for (let k = 0; k < 9; k++) { const a = q() * PI * 2, rr = 0.04 + q() * 0.06; b.box(k % 3 ? M.white : M.red, 0.058, 0.002, 0.088, x + Math.cos(a) * rr, y + 0.001 + k * 0.0005, z + Math.sin(a) * rr, q() * PI); }
  };
  {
    const y = AY + 0.6;
    cup(175.6 + Math.sin(0.4) * 0.24, y, 7.0 + Math.cos(0.4) * 0.24); cup(175.6 + Math.sin(3.54) * 0.24, y, 7.0 + Math.cos(3.54) * 0.24);
    magazines(175.42, y, 7.08, 3, 11, 0.2);
    cards(177.93, y, 7.05, 12);
    cup(178.1 + Math.sin(1.97) * 0.25, y, 7.0 + Math.cos(1.97) * 0.25); cup(178.1 + Math.sin(5.11) * 0.25, y, 7.0 + Math.cos(5.11) * 0.25);
  }
  // Weltkarte: Rahmen und Messingschild
  frameZ(ZWL, 1, 174.6, 180.6, AY + 0.85, AY + 2.35);
  plaqueZ('Weltkarte · Otto Arpke', 177.6, AY + 0.765, ZWL, 1, 0.3, 0.055);
  // Bücherbord unter dem Kartenende
  {
    const x0 = 179.3, x1 = 180.5, z0 = ZWL, z1 = ZWL + 0.34, h = 0.62;
    b.bb(M.woodDark, x0, x1, AY + h - 0.03, AY + h, z0, z1 + 0.01);
    for (const x of [x0, x1 - 0.03]) b.bb(M.woodDark, x, x + 0.03, AY, AY + h - 0.03, z0, z1);
    b.bb(M.woodDark, x0 + 0.03, x1 - 0.03, AY, AY + 0.08, z0, z1); b.bb(M.woodDark, x0 + 0.03, x1 - 0.03, AY + 0.31, AY + 0.33, z0, z1);
    b.bb(M.trim, x0 + 0.03, x1 - 0.03, AY + 0.08, AY + h - 0.03, z0, z0 + 0.012);
    const q = rng(77), cs = [M.upRed, M.upBlue, M.upGreen, M.upBrown, M.paper, M.woodDark];
    for (const [yb, hm] of [[0.08, 0.2], [0.33, 0.24]]) for (let x = x0 + 0.04; x < x1 - 0.08;) {
      const w = 0.025 + q() * 0.03; if (q() < 0.06) { x += 0.05; continue; }
      b.bb(cs[Math.floor(q() * 6)], x, x + w, AY + yb, AY + yb + hm * (0.75 + q() * 0.25), z0 + 0.04, z0 + 0.04 + 0.18 + q() * 0.08); x += w + 0.003;
    }
    for (let k = 0; k < 3; k++) b.box(cs[k], 0.24, 0.035, 0.18, 179.55, AY + h + 0.0175 + k * 0.035, z0 + 0.17, 0.15 * k);
    b.vcyl(M.enamel, 0.05, 0.1, 180.2, AY + h, z0 + 0.17, 10, 0.035); b.sph(blossoms[1], 0.05, 180.2, AY + h + 0.12, z0 + 0.17, 1, 0.7, 1, 8);
    b.shadow(M.shadow, (x0 + x1) / 2, AY, z0 + 0.2, x1 - x0 + 0.3, 0.6);
    nav.block(x0, x1, z0 - 0.04, z1 + 0.01, AY, AY + 1);
  }
  planter(XA + 0.4, ZBR - 0.45, 0.17, 0.42, 8);
  planter(XQL - 0.31, ZWL + 0.38, 0.15, 0.4, 9, 0.7);
  for (const z of [5.75, 7.85]) sconce(XQL, AY + 1.72, z, 'x-');
  for (const z of [6.1, 7.7]) sconce(XA, AY + 1.72, z, 'x+');
  clock(XQL, AY + 1.8, 6.8, 'x-');
  for (const x of [175.6, 178.1, 181.4]) ring(x, 7.0);
  // kleines Bild an der Achterwand (Graf Zeppelin über dem Zuckerhut)
  C.panel('adk_bild', (g, w, h) => {
    const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#e9c79a'); sk.addColorStop(1, '#f3e2c0'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5d6e5a'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, 90); g.lineTo(30, 70); g.lineTo(44, 36); g.lineTo(56, 72); g.lineTo(90, 84); g.lineTo(w, 78); g.lineTo(w, h); g.fill();
    g.fillStyle = '#4a7a8a'; g.fillRect(0, 104, w, 24);
    g.fillStyle = '#d9d4c8'; g.strokeStyle = '#6a655a'; g.beginPath(); g.ellipse(74, 30, 34, 7, -0.05, 0, 7); g.fill(); g.stroke();
  }, XA + 0.006, AY + 1.6, 6.9, 0.9, 0.6, 'x+');
  frameX(XA, 1, 6.45, 7.35, AY + 1.3, AY + 1.9);
  // Flügel 1936 (Blüthner, Aluminium mit Schweinsleder): Tasten, Notenpult, Pedale, Hocker – Lage wie in decks.js
  const PX = 181.8, PZ = 6.95;
  C.only(1936, () => {
    b.at(PX, AY, PZ, 0, () => {
      const nW = 52, kw = 1.26 / nW, letters = 'ABCDEFG';
      for (let i = 0; i < nW; i++) {
        const x = -0.63 + (i + 0.5) * kw;
        b.box(ivory, kw - 0.0025, 0.008, 0.075, x, 0.759, 0.4225);
        const L = letters[i % 7];
        if (i < nW - 1 && 'ACDFG'.includes(L)) b.box(M.black, 0.013, 0.013, 0.05, x + kw / 2, 0.7685, 0.41);
      }
      b.box(M.pigskin, 1.36, 0.05, 0.03, 0, 0.715, 0.475);                  // Tastenleiste vorn
      for (const sx of [-1, 1]) b.box(M.pigskin, 0.04, 0.09, 0.2, sx * 0.665, 0.79, 0.39);   // Backen
      // Notenpult mit Noten
      const a = V(0, 1.0, 0.2), c = V(0, 1.32, 0.16), n = new THREE.Vector3(0, 0.04, 0.32).normalize();
      b.beam(M.pigskin, a, c, 0.62, 0.014); b.box(M.pigskin, 0.62, 0.02, 0.04, 0, 1.01, 0.225);
      for (const dx of [-0.115, 0.115]) b.beam(M.paper, a.clone().addScaledVector(n, 0.01).add(V(dx, 0.03, 0)), c.clone().addScaledVector(n, 0.01).add(V(dx, -0.02, 0)), 0.21, 0.003);
      b.beam(M.alu, V(0, 1.0, 0.02), V(0, 1.2, 0.165), 0.012, 0.012);
      // Zarge: Kante oben und unten entlang des Umrisses
      const s = new THREE.Shape(); s.moveTo(-0.75, -0.3); s.lineTo(0.75, -0.3); s.lineTo(0.75, 0.5); s.quadraticCurveTo(0.7, 1.3, 0.1, 1.45); s.quadraticCurveTo(-0.5, 1.5, -0.75, 0.6); s.closePath();
      const pp = s.getPoints(5).map((p) => [p.x, -p.y]);
      for (let i = 0; i < pp.length - 1; i++) {
        const [x0, z0] = pp[i], [x1, z1] = pp[i + 1]; if (Math.hypot(x1 - x0, z1 - z0) < 0.02) continue;
        if (z0 > 0.29 && z1 > 0.29) continue;           // Vorderkante mit Tastatur
        b.beam(M.alu, V(x0, 1.003, z0), V(x1, 1.003, z1), 0.02, 0.012);
        b.beam(M.alu, V(x0, 0.7, z0), V(x1, 0.7, z1), 0.02, 0.02);
      }
      // Beine mit Rollen, Lyra mit drei Pedalen
      for (const [lx, lz] of [[-0.6, 0.15], [0.6, 0.15], [0, -1.2]]) { b.sph(M.brass, 0.035, lx, 0.035, lz, 1, 1, 1, 8); b.torus(M.brass, 0.04, 0.008, lx, 0.66, lz, 'y', 12); b.vcyl(M.alu, 0.05, 0.05, lx, 0.62, lz, 10, 0.038); }
      for (const dx of [-0.05, 0.05]) b.cyl(M.alu, V(dx, 0.7, 0.05), V(dx, 0.09, 0.08), 0.012, 6);
      b.box(M.pigskin, 0.24, 0.06, 0.08, 0, 0.06, 0.09);
      for (const dx of [-0.065, 0, 0.065]) b.box(M.brass, 0.026, 0.012, 0.09, dx, 0.055, 0.17);
      C.sign('Blüthner', PX, AY + 0.86, PZ + 0.311, 0.035, 'z+', 'dark');
      b.bb(M.black, -0.13, 0.13, 0.84, 0.88, 0.3, 0.305);
      // Noten auf dem Deckel
      b.box(M.paper, 0.3, 0.012, 0.22, 0.25, 1.006, -0.7, 0.2); b.box(M.upRed, 0.31, 0.006, 0.23, 0.25, 1.015, -0.7, 0.2);
      // Klavierhocker: Polster mit Knöpfen, Streben
      b.box(M.pigskin, 0.56, 0.045, 0.28, 0, 0.532, 0.85);
      for (const dx of [-0.18, 0, 0.18]) b.sph(M.brass, 0.008, dx, 0.556, 0.85, 1, 0.6, 1, 6);
      for (const sx of [-1, 1]) {
        for (const dz of [-0.12, 0.12]) b.cyl(M.alu, V(sx * 0.25, 0.46, 0.85 + dz * 0.4), V(sx * 0.27, 0.0, 0.85 + dz), 0.011, 6);
        b.cyl(M.alu, V(sx * 0.26, 0.12, 0.73), V(sx * 0.26, 0.12, 0.97), 0.008, 5);
        b.sph(M.rubber, 0.015, sx * 0.27, 0.01, 0.73, 1, 0.6, 1, 6); b.sph(M.rubber, 0.015, sx * 0.27, 0.01, 0.97, 1, 0.6, 1, 6);
      }
      b.cyl(M.alu, V(-0.26, 0.12, 0.85), V(0.26, 0.12, 0.85), 0.008, 5);
    });
    C.panel('adk_noten', (g, w, h) => {
      g.fillStyle = '#f4eedc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2520'; g.lineWidth = 1;
      for (let st = 0; st < 5; st++) for (let l = 0; l < 5; l++) { const y = 18 + st * 22 + l * 3; g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); }
      g.fillStyle = '#2a2520'; for (let i = 0; i < 60; i++) { const st = i % 5, x = 14 + ((i * 37) % 104); g.beginPath(); g.ellipse(x, 18 + st * 22 + ((i * 7) % 12), 2.2, 1.6, -0.4, 0, 7); g.fill(); }
    }, PX, AY + 1.16, PZ + 0.215, 0.4, 0.24, 'z+');
  });
  // 1937: Sitzgruppe am Platz des Flügels ergänzen (Tisch aus decks.js bei 181,6/6,9)
  C.only(1937, () => {
    rug(180.55, 182.65, 5.95, 7.85);
    const y = AY + 0.6;
    cup(181.6 + Math.sin(0.4) * 0.24, y, 6.9 + Math.cos(0.4) * 0.24); cup(181.6 + Math.sin(2.49) * 0.24, y, 6.9 + Math.cos(2.49) * 0.24);
    magazines(181.42, y, 6.9, 2, 21, -0.2);
    // Stehlampe neben der Gruppe
    const lx = 182.75, lz = 7.75;
    b.vcyl(M.brass, 0.13, 0.03, lx, AY, lz, 14, 0.1); b.vcyl(M.brass, 0.014, 1.45, lx, AY + 0.03, lz, 6);
    b.sph(M.lamp, 0.05, lx, AY + 1.45, lz, 1, 1.2, 1, 8); lampShade(shadeRed, lx, AY + 1.38, lz, 0.2, 0.12, 0.22);
    b.shadow(M.shadow, lx, AY, lz, 0.45, 0.45);
    nav.block(lx - 0.13, lx + 0.13, lz - 0.13, lz + 0.13, AY, AY + 1.6);
  });

  // =====================================================================
  // SCHREIB- UND LESEZIMMER (Steuerbord vorn)
  // =====================================================================
  for (const x of [184.3, 186.3]) {                              // Schreibtische aus decks.js (z 9,1–9,6, Platte +0,7575)
    const y = AY + 0.7575, z = 9.35;
    b.bb(M.leather, x - 0.33, x + 0.13, y, y + 0.003, z - 0.16, z + 0.14);                  // Schreibunterlage
    for (const xe of [x - 0.35, x + 0.13]) b.bb(M.woodDark, xe, xe + 0.022, y, y + 0.012, z - 0.16, z + 0.14);
    b.bb(M.woodDark, x - 0.48, x - 0.28, y, y + 0.1, z + 0.12, z + 0.2);                    // Briefständer
    for (let k = 0; k < 3; k++) b.bb(k === 1 ? M.upBlue : M.paper, x - 0.46 + k * 0.01, x - 0.3 - k * 0.01, y + 0.1, y + 0.13 + k * 0.01, z + 0.135 + k * 0.02, z + 0.139 + k * 0.02);
    b.bb(M.brass, x + 0.06, x + 0.22, y, y + 0.012, z - 0.22, z - 0.17);                    // Federschale
    for (const dz of [-0.205, -0.188]) b.cyl(M.black, V(x + 0.07, y + 0.018, z + dz), V(x + 0.21, y + 0.018, z + dz), 0.005, 5);
    b.vcyl(M.brass, 0.024, 0.012, x + 0.25, y + 0.07, z - 0.1, 8);                          // Deckel auf dem Tintenfass
    b.cyl(M.black, V(x + 0.25, y + 0.06, z - 0.1), V(x + 0.2, y + 0.2, z - 0.06), 0.004, 4);
    b.vcyl(M.brass, 0.07, 0.012, x + 0.38, y, z + 0.1, 12);                                 // Lampenfuß und Schirm
    lampShade(shade, x + 0.38, AY + 1.05, z + 0.1, 0.13, 0.065, 0.14);
    b.vcyl(M.cork, 0.03, 0.012, x - 0.25, y, z - 0.21, 8);                                  // Stempelkissen / Löscher
    b.cyl(M.woodDark, V(x - 0.13, y + 0.035, z - 0.2), V(x - 0.01, y + 0.035, z - 0.2), 0.03, 10);
    b.vcyl(M.woodDark, 0.012, 0.05, x - 0.07, y + 0.035, z - 0.2, 6);
    // Papierkorb
    const px = x + 0.63, pz = 9.38;
    b.vcyl(M.rope, 0.1, 0.32, px, AY, pz, 12, 0.13); b.torus(M.woodLight, 0.13, 0.01, px, AY + 0.32, pz, 'y', 14);
    for (const [dx, dz] of [[0.03, 0.02], [-0.04, -0.01], [0.0, -0.05]]) b.sph(M.paper, 0.035, px + dx, AY + 0.33, pz + dz, 1, 0.8, 1, 7);
  }
  // Lesetisch (aus decks.js, r 0,42, Platte +0,62): Zeitschriften, Atlas, Zeitung
  {
    const y = AY + 0.62;
    magazines(185.05, y, 6.65, 3, 31, 0.3);
    b.box(M.upGreen, 0.32, 0.04, 0.24, 185.3, y + 0.02, 6.98, -0.4);
    b.box(M.paper, 0.3, 0.008, 0.21, 185.4, y + 0.004, 6.62, 0.8);
  }
  // Briefkasten „Luftschiffpost“ (aus decks.js: x 183,14–183,26, z 5,9–6,3)
  C.sign('Luftschiffpost', XQS + 0.128, AY + 1.055, 6.1, 0.045, 'x+', 'brass');
  C.sign('Leerung vor jeder Landung', XQS + 0.128, AY + 0.975, 6.1, 0.03, 'x+', 'plate');
  b.bb(M.brass, XQS, XQS + 0.14, AY + 1.25, AY + 1.27, 5.88, 6.32);
  b.bb(M.black, XQS + 0.12, XQS + 0.125, AY + 0.92, AY + 0.94, 6.22, 6.24);
  // Zeitungshalter an der Wand
  {
    const x0 = 183.45, x1 = 184.2, zw = ZWL;
    b.bb(M.woodDark, x0, x1, AY + 0.5, AY + 1.1, zw, zw + 0.02);
    [[1.06, 0.06], [0.96, 0.1], [0.86, 0.14]].forEach(([yy, dz], k) => {
      b.cyl(M.brass, V(x0 + 0.05, AY + yy, zw + dz), V(x1 - 0.05, AY + yy, zw + dz), 0.008, 6);
      for (const x of [x0 + 0.06, x1 - 0.06]) b.cyl(M.brass, V(x, AY + yy, zw + 0.02), V(x, AY + yy, zw + dz), 0.005, 4);
      b.bb(M.paper, x0 + 0.12, x1 - 0.12, AY + yy - 0.33, AY + yy - 0.005, zw + dz + 0.009, zw + dz + 0.014);
      b.bb(M.paper, x0 + 0.12, x1 - 0.12, AY + yy - 0.06, AY + yy - 0.005, zw + dz - 0.014, zw + dz - 0.009);
      if (k === 2) C.panel('adk_zeitung', (g, w, h) => {
        g.fillStyle = '#efe8d2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e1a16'; g.font = 'bold 13px Georgia'; g.textAlign = 'center'; g.fillText('Frankfurter Zeitung', w / 2, 16);
        g.fillRect(6, 21, w - 12, 1.5); g.font = 'bold 10px Georgia'; g.fillText('LZ 129 über dem Atlantik', w / 2, 34);
        g.fillStyle = 'rgba(30,26,22,0.6)'; for (let c = 0; c < 3; c++) for (let i = 0; i < 11; i++) g.fillRect(8 + c * 39, 42 + i * 7.5, 34 - ((i * 13 + c * 7) % 10), 2);
      }, (x0 + x1) / 2, AY + yy - 0.17, zw + dz + 0.019, x1 - x0 - 0.26, 0.31, 'z+');
    });
  }
  // Bilderrahmen um die Wandbilder aus decks.js
  frameZ(ZWL, 1, 183.4, 185.4, AY + 1.2, AY + 2.0);
  frameX(XQS, 1, 6.1, 7.7, AY + 1.25, AY + 1.95);
  // Stich an der Vorderwand, Wandleuchten, Stehlampe
  C.panel('adk_stich', (g, w, h) => {
    g.fillStyle = '#ece2c6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a3e2a'; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(0, 70 + i * 1.5); g.lineTo(w, 66 + i * 1.5); g.stroke(); }
    g.fillStyle = '#6a5a3a'; g.beginPath(); g.ellipse(64, 40, 44, 9, 0, 0, 7); g.fill(); g.fillRect(54, 47, 16, 5);
    g.fillStyle = '#2a2218'; g.font = 'italic 10px Georgia'; g.textAlign = 'center'; g.fillText('Erste Luftschiffpost 1912', 64, 120);
  }, XF - 0.006, AY + 1.6, 8.15, 0.5, 0.4, 'x-');
  frameX(XF, -1, 7.9, 8.4, AY + 1.4, AY + 1.8);
  for (const z of [7.0, 9.3]) sconce(XF, AY + 1.72, z, 'x-');
  {
    const lx = XF - 0.24, lz = 5.92;
    b.vcyl(M.brass, 0.12, 0.03, lx, AY, lz, 14, 0.09); b.vcyl(M.brass, 0.013, 1.42, lx, AY + 0.03, lz, 6);
    b.sph(M.lamp, 0.05, lx, AY + 1.42, lz, 1, 1.2, 1, 8); lampShade(shade, lx, AY + 1.35, lz, 0.17, 0.1, 0.2);
    b.shadow(M.shadow, lx, AY, lz, 0.4, 0.4);
    nav.block(lx - 0.12, lx + 0.12, lz - 0.12, lz + 0.12, AY, AY + 1.6);
  }
  for (const [x, z] of [[184.8, 7.2], [186.6, 8.6]]) ring(x, z);

  // =====================================================================
  // TREPPENHALLE / FOYER (Ring 173)
  // =====================================================================
  // Büste: Sockelschild, Profile, Bronzedetails (Sockel aus decks.js: x 173,12–173,5, z ±0,28)
  C.sign('Paul von Hindenburg', 173.516, AY + 0.912, 0, 0.032, 'x+', 'brass');
  C.sign('1847 – 1934', 173.516, AY + 0.882, 0, 0.022, 'x+', 'brass');
  b.bb(M.trim, XA + 0.04, 173.53, AY, AY + 0.12, -0.31, 0.31);
  b.bb(M.trim, 173.5, 173.53, AY + 0.12, AY + 0.15, -0.3, 0.3);
  for (const [y0, y1, z0, z1] of [[0.25, 0.27, -0.2, 0.2], [0.75, 0.77, -0.2, 0.2], [0.27, 0.75, -0.2, -0.18], [0.27, 0.75, 0.18, 0.2]]) b.bb(M.trim, 173.5, 173.508, AY + y0, AY + y1, z0, z1);
  for (const s of [-1, 1]) for (const [y0, y1, x0, x1] of [[0.25, 0.27, 173.18, 173.44], [0.75, 0.77, 173.18, 173.44], [0.27, 0.75, 173.18, 173.2], [0.27, 0.75, 173.42, 173.44]]) {
    const za = s * 0.28, zb = s * 0.288; b.bb(M.trim, x0, x1, AY + y0, AY + y1, Math.min(za, zb), Math.max(za, zb));
  }
  b.vcyl(M.bronze, 0.13, 0.02, 173.3, AY + 1.16, 0, 14, 0.12);
  b.sph(M.bronze, 0.03, 173.31 + 0.118, AY + 1.52, 0, 0.5, 0.45, 1.7, 8);                   // Schnurrbart
  for (const s of [-1, 1]) b.box(M.brass, 0.1, 0.025, 0.09, 173.3, AY + 1.425, s * 0.17);   // Epauletten
  b.sph(M.bronze, 0.06, 173.3, AY + 1.4, 0, 1, 0.6, 1, 8);                                  // Hals
  // Anschlagbretter: Rahmen, Überschriften, Reißzwecken, Zettel
  for (const s of [-1, 1]) {
    const zc = s * 2.0, za = s * 1.25, zb = s * 2.75, z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    for (const [y0, y1, a, c] of [[1.02, 1.05, z0 - 0.03, z1 + 0.03], [1.95, 1.98, z0 - 0.03, z1 + 0.03], [1.05, 1.95, z0 - 0.03, z0], [1.05, 1.95, z1, z1 + 0.03]]) b.bb(M.trim, XA, XA + 0.025, AY + y0, AY + y1, a, c);
    C.sign(s < 0 ? 'Standort des Schiffes' : 'Funknachrichten', XA + 0.012, AY + 2.06, zc, 0.075, 'x+', 'brass');
    for (const dz of [-0.68, 0.68]) for (const y of [1.12, 1.88]) b.sph(s < 0 ? M.red : M.brass, 0.008, XA + 0.022, AY + y, zc + dz, 0.6, 1, 1, 6);
    const notes = s < 0 ? [['Wetterbericht', -0.45], ['Landung 6 Uhr', 0.35]] : [['Postschluss 18 Uhr', -0.42], ['Bordzeitung', 0.38]];
    for (const [t, dz] of notes) { C.sign(t, XA + 0.024, AY + 1.11, zc + dz, 0.04, 'x+', 'plate'); b.sph(M.red, 0.006, XA + 0.026, AY + 1.135, zc + dz, 0.6, 1, 1, 5); }
  }
  // Aushänge neben der Büste
  for (const [key, z, title, lines] of [['adk_ordnung', -0.78, 'Bordordnung', 9], ['adk_tisch', 0.78, 'Tischzeiten', 6]]) {
    C.panel(key, (g, w, h) => {
      g.fillStyle = '#f1ead4'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2520'; g.font = 'bold 15px Georgia'; g.textAlign = 'center'; g.fillText(title, w / 2, 20);
      g.fillRect(14, 27, w - 28, 1.5); g.fillStyle = 'rgba(40,35,30,0.6)';
      if (key === 'adk_tisch') { g.font = '11px Georgia'; ['Frühstück 8 Uhr', 'Mittag 12.30 Uhr', 'Tee 16 Uhr', 'Abend 19 Uhr'].forEach((t, i) => g.fillText(t, w / 2, 48 + i * 18)); }
      else for (let i = 0; i < lines; i++) g.fillRect(12, 38 + i * 9, 80 + ((i * 29) % 24), 2.2);
    }, XA + 0.008, AY + 1.5, z, 0.32, 0.42, 'x+');
    frameX(XA, 1, z - 0.16, z + 0.16, AY + 1.29, AY + 1.71, M.woodDark, 0.025);
  }
  // Feuerlöscher an der Achterwand und am Ende des Mittelgangs
  const extinguisher = (x, z, dir) => {
    const [nx, nz] = DIR[dir], cx = x + nx * 0.1, cz = z + nz * 0.1;
    b.bb(M.steel, Math.min(x, x + nx * 0.02), Math.max(x, x + nx * 0.02), AY + 0.4, AY + 0.85, nz ? z - 0.04 : z - 0.04, nz ? z + 0.04 : z + 0.04);
    b.vcyl(M.red, 0.075, 0.5, cx, AY + 0.3, cz, 12); b.sph(M.red, 0.075, cx, AY + 0.8, cz, 1, 0.5, 1, 12);
    for (const y of [0.45, 0.7]) b.torus(M.steel, 0.079, 0.008, cx, AY + y, cz, 'y', 14);
    b.vcyl(M.brass, 0.025, 0.07, cx, AY + 0.83, cz, 8); b.cyl(M.brass, V(cx, AY + 0.89, cz), V(cx + nz * 0.08, AY + 0.89, cz - nx * 0.08), 0.008, 5);
    b.cyl(M.black, V(cx + nz * 0.03, AY + 0.86, cz - nx * 0.03), V(cx + nz * 0.09, AY + 0.5, cz - nx * 0.09), 0.01, 5);
    C.sign('Feuerlöscher', x + nx * 0.008, AY + 1.0, z, 0.05, dir, 'red');
  };
  extinguisher(XA, -4.7, 'x+'); extinguisher(XA, 4.7, 'x+'); extinguisher(MG.x1, 0, 'x-');
  // Wegweiser an den Stirnwänden des Kabinenblocks (zur Halle)
  const cabRange = (pred) => {
    const ns = ROOMS.filter((r) => r.cabin && r.deck === 'A' && pred(r.corridorZ)).flatMap((r) => r.name.replace('Kabine ', '').split('/').map(Number));
    return `Kabinen ${Math.min(...ns)}–${Math.max(...ns)}`;
  };
  const cabS = cabRange((z) => z > 2), cabM = cabRange((z) => Math.abs(z) < 2), cabB = cabRange((z) => z < -2), cabAll = cabRange(() => true);
  C.sign('Gesellschaftsraum →', XK0 - 0.006, AY + 1.62, 4.25, 0.065, 'x-', 'brass');
  C.sign('Schreibzimmer →', XK0 - 0.006, AY + 1.5, 4.25, 0.065, 'x-', 'brass');
  C.sign('← Speisesaal', XK0 - 0.006, AY + 1.62, -4.25, 0.065, 'x-', 'brass');
  C.sign('← Promenade', XK0 - 0.006, AY + 1.5, -4.25, 0.065, 'x-', 'brass');
  // Hängeschild über dem Durchgang zwischen den Treppen
  {
    const x = STS.x0, y = AY + 2.17;
    b.bb(M.woodDark, x - 0.012, x + 0.012, y - 0.07, y + 0.07, -0.26, 0.26);
    for (const z of [-0.2, 0.2]) b.cyl(M.brass, V(x, y + 0.07, z), V(x, AC, z), 0.005, 4);
    C.sign(cabAll, x - 0.017, y, 0, 0.08, 'x-', 'dark');
    C.sign('Zur Treppe', x + 0.017, y, 0, 0.08, 'x+', 'dark');
  }
  // Treppenläufer mit Messingstangen, Handlaufknäufe
  {
    const xa = STS.x0, xc = STS.x1, zin = STS.z0, zout = STS.z1, n = 15, run = (zout - zin) / n, rise = (AY - B_Y) / n;
    for (const s of [-1, 1]) {
      const Zr = (a, c) => (s > 0 ? [a, c] : [-c, -a]);
      for (let k = 1; k < n; k++) {
        const zm = zin + k * run, yk = AY - k * rise;
        const [ta, tc] = Zr(zm - run / 2 + 0.03, zm + run / 2); b.bb(M.carpetRed, xa + 0.2, xc - 0.2, yk, yk + 0.006, ta, tc);
        const [ra, rc] = Zr(zm - run / 2, zm - run / 2 + 0.006); b.bb(M.carpetRed, xa + 0.2, xc - 0.2, yk + 0.006, yk + rise - 0.036, ra, rc);
        b.cyl(M.brass, V(xa + 0.17, yk + 0.013, s * (zm - run / 2 + 0.013)), V(xc - 0.17, yk + 0.013, s * (zm - run / 2 + 0.013)), 0.006, 6);
        for (const x of [xa + 0.17, xc - 0.17]) b.sph(M.brass, 0.01, x, yk + 0.013, s * (zm - run / 2 + 0.013), 1, 1, 1, 6);
      }
      for (const x of [xa + 0.06, xc - 0.06]) b.sph(M.brass, 0.03, x, AY + 0.9, s * zin, 1, 1, 1, 10);
      for (const x of [xa, xc]) for (let i = 0; i <= 3; i++) b.sph(M.brass, 0.026, x, AY + 0.915, s * (0.62 + (3.25 - 0.62) * i / 3), 1, 0.8, 1, 8);
    }
  }
  lamp(C, 173.75, AC, 0); ring(173.75, 0); ring(173.7, -3.0); ring(173.7, 3.0);

  // =====================================================================
  // GÄNGE: Leuchten, Wegweiser, Handläufe
  // =====================================================================
  for (let x = 176.8; x < XF; x += 2.5) for (const z of [0, -2.85, 2.85]) ring(x, z);
  for (const z of [-1.6, 1.6]) { lamp(C, (QG.x0 + QG.x1) / 2, AC, z); ring((QG.x0 + QG.x1) / 2, z); }
  C.sign(cabS + ' →', XK2 - 0.006, AY + 1.72, 1.85, 0.06, 'x-', 'brass');
  C.sign('← ' + cabM, XK2 - 0.006, AY + 1.72, 1.0, 0.06, 'x-', 'brass');
  C.sign(cabM + ' →', XK2 - 0.006, AY + 1.72, -1.0, 0.06, 'x-', 'brass');
  C.sign('← ' + cabB, XK2 - 0.006, AY + 1.72, -1.85, 0.06, 'x-', 'brass');
  // Hängeschilder in den drei Längsgängen
  for (const [z, w, t] of [[(KGB.z0 + KGB.z1) / 2, 0.36, cabB], [0, 0.4, cabM], [(KGS.z0 + KGS.z1) / 2, 0.36, cabS]]) {
    const x = 183.05, y = AY + 2.2;
    b.bb(M.woodDark, x - 0.012, x + 0.012, y - 0.06, y + 0.06, z - w / 2, z + w / 2);
    for (const dz of [-w / 2 + 0.05, w / 2 - 0.05]) b.cyl(M.brass, V(x, y + 0.06, z + dz), V(x, AC, z + dz), 0.004, 4);
    C.sign('Zur Treppenhalle', x + 0.017, y, z, 0.07, 'x+', 'dark');
    C.sign(t, x - 0.017, y, z, 0.07, 'x-', 'dark');
  }
  // Handläufe an den türlosen Innenwänden der seitlichen Kabinengänge
  for (const s of [-1, 1]) {
    const zr = s * (ZGI + 0.055), zw = s * (ZGI + 0.004), x0 = XK2 + 0.15, x1 = XF - 0.12, y = AY + 0.92;
    b.cyl(M.alu, V(x0, y, zr), V(x1, y, zr), 0.016, 8);
    for (const x of [x0, x1]) { b.cyl(M.alu, V(x, y, zr), V(x, y, zw), 0.016, 6); }
    for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.4) {
      b.cyl(M.alu, V(x, y - 0.012, zr), V(x, y - 0.05, zw), 0.008, 5);
      b.cyl(M.alu, V(x, y - 0.05, zw), V(x, y - 0.05, s * (ZGI + 0.012)), 0.022, 8);
    }
  }

  if (globalThis.__ADECK_DEBUG) globalThis.__ADECK_DEBUG.occ = occ;
}
