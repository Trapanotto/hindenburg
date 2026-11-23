// Bedienbare Elemente im ganzen Schiff (außer den Steuerständen der Führergondel, die feature_controls.js baut):
// Promenadenfenster, Flügel (1936), Briefkasten, Lampen, Speiseaufzug, Kabinen- und Schleusentüren, Anzünder, Zapfhahn,
// Herd, Dusche, Kartenlampe, Bordtelefon, Landescheinwerfer, Morsetaste, Kielgangbeleuchtung, Hilfssteuerstand.
// Alles Bewegliche sind eigene kleine Meshes an C.root; Lagen stammen aus decks.js, detail_*.js und keel.js (dort jeweils vermerkt).
// Lampen schalten über Material/Farbe (keine zusätzlichen Lichter). Töne nur über C.audio, wenn der Ton eingeschaltet ist.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { V, rng } from './util.js';
import { hp, A_Y, B_Y, G_Y, G_YC, keelY, ST } from './hull.js';
import { ROOMS } from './decks.js';
import { KEEL_RANGES, FIN_STAND } from './keel.js';

const D = Math.PI / 180;
const AY = A_Y, BY = B_Y, YP = B_Y + 0.3;                    // Podest im vorderen B-Deck wie decks.js
const F = (h) => G_Y + h, RY = (h) => keelY(205) + h;      // Gondelboden, Funkraumboden (wie detail_gondola.js)
const toward = (v, t, r) => (Math.abs(t - v) <= r ? t : v + Math.sign(t - v) * r);
const sm = (v) => v * v * (3 - 2 * v);                        // weicher Verlauf 0…1

let E = null;   // Modulzustand
let CA = null;  // C.audio

// ---------- Töne (nur wenn Ton eingeschaltet) ----------
const ac = () => (CA && CA.ctx && CA.out && CA.on ? CA : null);
/** kurzer Ton: gate = gleichmäßig an/aus, sonst ausklingend */
function tone(f, at, dur, o = {}) {
  const a = ac(); if (!a) return;
  const c = a.ctx, t = c.currentTime + at, g = c.createGain(), os = c.createOscillator();
  os.type = o.type || 'sine'; os.frequency.value = f; if (o.det) os.detune.value = o.det;
  const v = o.vol ?? 0.12, atk = o.atk ?? 0.005;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + atk);
  if (o.gate) { g.gain.setValueAtTime(v, t + Math.max(atk, dur - 0.008)); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
  else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  os.connect(g); g.connect(a.out); os.start(t); os.stop(t + dur + 0.05);
}
let noiseBuf = null;
function noiseSrc(c) {
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0), r = rng(4711); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
}
/** gefiltertes Rauschen; dur = 0 → Dauerton, Rückgabe: Stoppfunktion */
function hiss(at, dur, o = {}) {
  const a = ac(); if (!a) return null;
  const c = a.ctx, t = c.currentTime + at, s = noiseSrc(c), fl = c.createBiquadFilter(), g = c.createGain(), v = o.vol ?? 0.05;
  fl.type = o.type || 'bandpass'; fl.frequency.value = o.f || 2500; fl.Q.value = o.q ?? 0.7;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.atk ?? 0.01));
  if (dur > 0) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(a.out); s.start(t); if (dur > 0) s.stop(t + dur + 0.05);
  return () => { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.4); s.stop(n + 0.5); };
}
const click = (at = 0, f = 1800) => hiss(at, 0.04, { f, q: 2, vol: 0.06, atk: 0.002 });
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
function pianoNote(n, at, vol = 0.07) { tone(midi(n), at, 1.9, { type: 'triangle', vol }); tone(midi(n) * 2, at, 0.9, { vol: vol * 0.35, det: 4 }); }

export default function (C) {
  const { M } = C;
  CA = C.audio;
  E = { areas: [], acts: [], upd: [] };
  const mk = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.lodK = 2; /* kein Schattenwurf (main.js) */ parent.add(m); return m; };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  /** Bereichsgruppe: nur in der Nähe sichtbar (spart Zeichenaufrufe) */
  const area = (name, x, y, z, r) => { const g = new THREE.Group(); g.name = 'Bedienbar – ' + name; g.userData.c = V(x, y, z); g.userData.r = r; C.root.add(g); E.areas.push(g); return g; };
  /** Bedienelement; year: nur in diesem Jahr vorhanden (sonst Reichweite ≈ 0, erscheint nicht) */
  const act = (label, pos, onUse, range = 1.5, year = 0) => {
    const a = C.action({ label, pos, range, onUse: () => { if (!year || year === C.sim.year) onUse(); } });
    a._r = range; a._y = year; E.acts.push(a); return a;
  };
  const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const cylY = (r, h, seg = 8, y0 = 0) => new THREE.CylinderGeometry(r, r, h, seg).translate(0, y0 + h / 2, 0);
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const glowMat = (c, op = 0) => basic(c, { transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 });
  const mDark = new THREE.MeshLambertMaterial({ color: 0x4a443a }), mBeer = new THREE.MeshStandardMaterial({ color: 0xc8861e, transparent: true, opacity: 0.88, roughness: 0.2 });
  const mBlack = basic(0x0b0b0c);
  const disc = (r) => new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2);

  const gA = area('A-Deck', 180.5, AY + 1.2, 0, 32), gB = area('B-Deck', 180.5, BY + 1, 0, 26), gG = area('Führergondel und Funkraum', 204, F(1.2), 0.8, 24);

  // ===================== Lampen: Glühkörper überdecken (an = M.lamp, aus = dunkel), Lichtfleck auf dem Tisch =====================
  const lampEl = (name, parent, [bx, by, bz, br, sy = 1], pool, apos, range = 1.5) => {
    const bulb = mk(new THREE.SphereGeometry(br, 10, 8), M.lamp, parent, bx, by, bz); bulb.scale.y = sy;
    const pm = glowMat(0xffd9a0); const pl = pool ? mk(disc(pool[3]), pm, parent, pool[0], pool[1], pool[2]) : null;
    const s = { on: 1, v: 1 };
    act(() => `${name} ${s.on ? 'ausschalten' : 'einschalten'}`, apos, () => { s.on ^= 1; click(0, 2600); }, range);
    E.upd.push((dt) => { s.v = toward(s.v, s.on, dt * 6); bulb.material = s.v > 0.5 ? M.lamp : mDark; if (pl) { pm.opacity = 0.16 * s.v; pl.visible = s.v > 0.01; } });
  };

  // ===================== A-DECK =====================
  // ---- Promenadenfenster: Schrägfenster im Fensterfeld 30–40° (untere Scheibe 35–40°), oben angeschlagen, kippt nach außen
  // (Fensterbänder aus hull.js: Pfosten je 1 m ab Ring 173, Riegel bei 35°/45°)
  const WINS = [[176, -1, 'Speisesaal'], [180, -1, 'Speisesaal'], [175, 1, 'Gesellschaftsraum'], [179, 1, 'Gesellschaftsraum']];
  for (const [xa, s] of WINS) {
    const P = (x, a) => hp(x, s * a, 1, -0.02);
    const T0 = P(xa + 0.04, 39.6), T1 = P(xa + 0.96, 39.6), B0 = P(xa + 0.04, 35.4), B1 = P(xa + 0.96, 35.4);
    const tm = T0.clone().add(T1).multiplyScalar(0.5), bm = B0.clone().add(B1).multiplyScalar(0.5);
    const ex = T1.clone().sub(T0).normalize(), ey = tm.clone().sub(bm); ey.addScaledVector(ex, -ey.dot(ex)).normalize();
    const out = V(0, tm.y, tm.z).normalize();
    if (new THREE.Vector3().crossVectors(ex, ey).dot(out) < 0) ex.negate();
    const ez = new THREE.Vector3().crossVectors(ex, ey);
    const W = T0.distanceTo(T1), L = tm.distanceTo(bm), f = 0.035;
    const piv = grp(gA); piv.position.copy(tm); piv.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez));
    const rot = grp(piv);
    mk(mergeGeometries([box(W, f, 0.025, 0, -f / 2), box(W, f, 0.025, 0, -L + f / 2), box(f, L, 0.025, -W / 2 + f / 2, -L / 2), box(f, L, 0.025, W / 2 - f / 2, -L / 2),
      box(0.14, 0.022, 0.03, 0, -L + 0.07, -0.03), box(0.02, 0.022, 0.03, -0.06, -L + 0.07, -0.015), box(0.02, 0.022, 0.03, 0.06, -L + 0.07, -0.015)]), M.alu, rot);
    mk(new THREE.PlaneGeometry(W - 0.05, L - 0.05).translate(0, -L / 2, 0), M.glass, rot).renderOrder = 3;
    const st = { o: 0, v: 0 };
    act(() => `Fenster ${st.o ? 'schließen' : 'öffnen'}`, tm.clone().lerp(bm, 0.6).addScaledVector(out, -0.12), () => { st.o ^= 1; click(0, 900); }, 2.1);
    E.upd.push((dt) => { st.v = toward(st.v, st.o, dt * 0.9); rot.rotation.x = -sm(st.v) * 22 * D; });
  }

  // ---- Flügel 1936 (decks.js: b.at(181.8, AY, 6.95), Korpus-Oberkante +1.0; Notenpult bei z +0.16…+0.2)
  {
    const pg = grp(gA, 181.8, AY, 6.95); E.piano = pg;
    const s = new THREE.Shape(); s.moveTo(-0.75, 0); s.lineTo(0.75, 0); s.lineTo(0.75, 0.5); s.quadraticCurveTo(0.7, 1.3, 0.1, 1.45); s.quadraticCurveTo(-0.5, 1.5, -0.75, 0.6); s.closePath();
    const lg = new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: false, curveSegments: 8 }); lg.rotateX(-Math.PI / 2); lg.translate(0.75, 0, 0);
    const lid = grp(pg, -0.75, 1.02, 0); mk(lg, M.pigskin, lid);
    const stick = mk(new THREE.CylinderGeometry(0.009, 0.009, 1, 6).translate(0, 0.5, 0), M.alu, pg, 0.3, 1.0, -0.45);
    const st = { o: 0, v: 0, k: 0 }, tmp = V(0, 0, 0), up = V(0, 1, 0);
    act(() => `Flügeldeckel ${st.o ? 'schließen' : 'öffnen'}`, V(181.6, AY + 1.06, 6.6), () => { st.o ^= 1; }, 2.1, 1936);
    const PHR = [[[60, 0], [64, 0.16], [67, 0.32], [72, 0.48], [48, 0.9], [60, 0.9], [64, 0.9], [67, 0.9]],
      [[67, 0], [72, 0.3], [71, 0.45], [72, 0.6], [74, 0.9], [76, 1.2], [55, 0], [64, 0.3], [64, 0.6], [59, 0.9], [65, 1.2]],
      [[57, 0], [60, 0.12], [64, 0.24], [69, 0.36], [72, 0.6], [45, 0.6], [64, 0.6]]];
    act(() => 'Flügel anschlagen' + (ac() ? '' : ' (Ton ist aus)'), V(181.8, AY + 0.8, 7.38), () => { for (const [n, t] of PHR[st.k]) pianoNote(n, t, st.o ? 0.08 : 0.055); st.k = (st.k + 1) % PHR.length; }, 1.4, 1936);
    E.upd.push((dt) => {
      st.v = toward(st.v, st.o, dt * 0.7); const a = sm(st.v) * 38 * D; lid.rotation.z = a;
      stick.visible = a > 3 * D;
      if (stick.visible) { tmp.set(-0.75 + 0.95 * Math.cos(a) - 0.3, 0.02 + 0.95 * Math.sin(a), 0); stick.scale.y = tmp.length(); stick.quaternion.setFromUnitVectors(up, tmp.normalize()); }
    });
  }

  // ---- Schreibzimmer: Briefkasten „Luftschiffpost“ (decks.js: Messingkasten x 183.14–183.26, Schlitz y AY+1.15…1.18, z 6.0–6.2)
  {
    const xf = 183.266, yS = AY + 1.165;
    const flap = grp(gA, xf + 0.002, AY + 1.19, 6.1); mk(box(0.004, 0.045, 0.21, 0, -0.0225, 0), M.brass, flap);
    const letter = mk(box(0.12, 0.004, 0.15), M.paper, gA, xf + 0.1, yS, 6.1); letter.visible = false;
    const st = { t: -1, n: 0 };
    act(() => (st.t >= 0 ? 'Brief wird eingeworfen …' : `Brief einwerfen (Luftschiffpost${st.n ? `, ${st.n} eingeworfen` : ''})`), V(xf + 0.03, AY + 1.1, 6.1), () => { if (st.t < 0) { st.t = 0; st.n++; click(0.35, 700); } }, 1.5);
    E.upd.push((dt) => {
      if (st.t < 0) return; st.t += dt;
      const u = Math.min(1, st.t / 1.3); letter.visible = u < 1; letter.position.x = xf + 0.16 - sm(u) * 0.3;
      flap.rotation.z = -Math.sin(Math.min(1, st.t / 1.5) * Math.PI) * 65 * D;
      if (st.t > 1.6) { st.t = -1; flap.rotation.z = 0; }
    });
  }
  // Schreibtischlampen (decks.js: Kugel bei x+0.38, AY+1.1, z 9.45; Schirm detail_adeck.js)
  for (const x of [184.3, 186.3]) lampEl('Schreibtischlampe', gA, [x + 0.38, AY + 1.1, 9.45, 0.064, 0.62], [x + 0.25, AY + 0.765, 9.38, 0.21], V(x + 0.38, AY + 1.05, 9.4), 1.6);

  // ===================== Speiseaufzug Küche (B) ↔ Anrichte (A) =====================
  // Türen: decks.js (A: x 181.0–181.6, y AY+0.4…0.98, Front z −4.115; B: y YP+0.9…1.5, Front z −3.45), Beschläge in detail_adeck/detail_bdeck.
  // Eigene Klappen (unten angeschlagen) davor; geöffnet zeigen sie eine dunkle Öffnung und den Aufzugskasten mit Tablett.
  {
    const L = { pos: 0, tgt: 0, run: false, d: [0, 0], dv: [0, 0] }; E.lift = L;
    const lvl = [{ y: YP + 0.9, z: -3.396, n: 1, h: 0.6 }, { y: AY + 0.4, z: -4.176, n: -1, h: 0.58 }];
    const parts = lvl.map((q) => {
      const g = grp(q.n > 0 ? gB : gA);
      const flap = grp(g, 181.3, q.y, q.z); mk(box(0.6, q.h, 0.008, 0, q.h / 2, q.n * 0.004), M.alu, flap);
      mk(box(0.16, 0.022, 0.02, 0, q.h - 0.08, q.n * 0.018), M.brass, flap);
      const hole = mk(box(0.58, q.h - 0.02, 0.002), mBlack, g, 181.3, q.y + q.h / 2, q.z - q.n * 0.006);
      const tray = grp(g, 181.3, q.y + 0.012, q.z + q.n * 0.05);
      mk(box(0.46, 0.012, 0.09), M.alu, tray); for (const dx of [-0.12, 0.12]) { mk(cylY(0.035, 0.065, 10, 0.006), M.enamel, tray, dx, 0, 0); mk(cylY(0.06, 0.006, 12), M.enamel, tray, dx, 0.006, 0); }
      return { flap, hole, tray, n: q.n };
    });
    const ring = () => { tone(1320, 0, 1.2, { vol: 0.06 }); tone(990, 0.25, 1.4, { vol: 0.05 }); };
    const lab = (k) => () => {
      if (L.run) return 'Speiseaufzug fährt …';
      if (L.pos === k) return `Speiseaufzug: Klappe ${L.d[k] ? 'schließen' : 'öffnen'}`;
      return k ? 'Speiseaufzug aus der Küche heraufholen' : 'Speiseaufzug aus der Anrichte herunterholen';
    };
    const use = (k) => () => { if (L.run) return; if (L.pos === k) { L.d[k] ^= 1; click(0, 1100); } else { L.d = [0, 0]; L.tgt = k; L.run = true; ring(); } };
    act(lab(1), V(181.3, AY + 0.7, -4.2), use(1), 1.5);
    act(lab(0), V(181.3, YP + 1.2, -3.37), use(0), 1.5);
    E.upd.push((dt) => {
      for (let k = 0; k < 2; k++) { L.dv[k] = toward(L.dv[k], L.d[k], dt * 1.6); const p = parts[k], a = sm(L.dv[k]); p.flap.rotation.x = p.n * a * 88 * D; p.hole.visible = a > 0.01; p.tray.visible = a > 0.01 && L.pos === k && !L.run; }
      if (L.run && L.dv[0] < 0.01 && L.dv[1] < 0.01) {
        L.pos = toward(L.pos, L.tgt, dt / 4);   // Fahrt ≈ 4 s
        if (L.pos === L.tgt) { L.run = false; L.d[L.tgt] = 1; ring(); }
      }
    });
  }

  // ===================== Kabinentüren (Schiebetüren auf der Gangseite; decks.js buildCabin: offen u d0−0.72…d0−0.02, v −0.075…−0.055) =====================
  {
    const COLS = ['wallBlue', 'wallGrey', 'wallCream'], ROW = { '3.3': 4, '0.5': 3, '-0.5': 2, '-3.3': 1, '3.25': 5 };
    const list = ROOMS.filter((r) => r.cabin && r.door).map((r) => {
      const su = r.bedAt === 'x0' ? 1 : -1, zc = r.corridorZ, sv = Math.sign((r.z0 + r.z1) / 2 - zc), [d0, d1] = r.door;
      const n = parseInt(r.name.replace(/\D+/, ''), 10), col = r.name.startsWith('Steward') ? 'wallGrey' : COLS[(n * 5 + (ROW[String(zc)] ?? 1)) % 3];
      return { r, su, zc, sv, col, xo: su > 0 ? d0 - 0.72 : d1 + 0.02, xc: su > 0 ? d0 + 0.01 : d1 - 0.71, y: r.y, year: r.year || 0, o: 1, v: 1, name: r.name.replace('Kabine ', '').replace('-Kabine', '') };
    });
    const dGeo = box(0.7, 1.97, 0.02, 0.35, 0.995, 0), hGeo = box(0.03, 0.15, 0.012);
    const gD = area('Kabinentüren', 172.5, AY, 0, 36), inst = {};
    for (const c of COLS) { const cs = list.filter((d) => d.col === c); if (!cs.length) continue; const im = new THREE.InstancedMesh(dGeo, M[c] || M.wallCream, cs.length); im.userData.lodK = 2; im.frustumCulled = false; gD.add(im); inst[c] = { im, cs }; cs.forEach((d, i) => { d.im = im; d.i = i; }); }
    const hIm = new THREE.InstancedMesh(hGeo, M.alu, list.length); hIm.userData.lodK = 2; hIm.frustumCulled = false; gD.add(hIm);
    const m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const place = (d, k) => {
      const live = !d.year || d.year === C.sim.year, x = d.xo + (d.xc - d.xo) * sm(d.v);
      d.im.setMatrixAt(d.i, live ? m4.makeTranslation(x, d.y, d.zc - d.sv * 0.065) : zero);
      hIm.setMatrixAt(k, live ? m4.makeTranslation(x + (d.su > 0 ? 0.675 : 0.025), d.y + 1.025, d.zc - d.sv * 0.081) : zero);
    };
    E.doors = { list, inst, hIm, place, dirty: true };
    list.forEach((d) => {
      d.o = 0; d.v = 0;
      act(() => `Kabinentür ${d.name} ${d.o ? 'öffnen' : 'schließen'}`, V((d.r.door[0] + d.r.door[1]) / 2, d.y + 1.05, d.zc - d.sv * 0.12), () => { d.o ^= 1; hiss(0, 0.5, { f: 900, vol: 0.025, atk: 0.1 }); }, 1.4, d.year);
    });
    E.upd.push((dt) => {
      let ch = E.doors.full; E.doors.full = false;
      list.forEach((d, k) => { if (d.v !== d.o) { d.v = toward(d.v, d.o, dt * 1.4); ch = true; place(d, k); } else if (ch) place(d, k); });
      if (ch) { for (const c in inst) inst[c].im.instanceMatrix.needsUpdate = true; hIm.instanceMatrix.needsUpdate = true; }
    });
    E.doors.full = true;
  }

  // ===================== B-DECK =====================
  // ---- Luftschleuse: zwei Drehtüren (decks.js: Querwände XSL 180.6 und XBAR 181.5, Lücke z 2.27…3.12; Zargen detail_bdeck.js ±0.075)
  {
    const z1 = 3.115, w = 0.84;
    [[180.6 - 0.095, BY + 0.02, BY + 1.98, 1, 'zum Flur'], [181.5 + 0.095, YP + 0.01, BY + 1.98, -1, 'zur Bar']].forEach(([x, y0, y1, sg, nm]) => {
      const piv = grp(gB, x, y0, z1), h = y1 - y0;
      mk(box(0.03, h, w, 0, h / 2, -w / 2), M.wallBlue, piv);
      mk(mergeGeometries([box(0.1, 0.03, 0.03, 0, 1.0 - (y0 - BY), -w + 0.08), box(0.008, 0.16, 0.06, 0.05, 1.0 - (y0 - BY), -w + 0.08), box(0.008, 0.16, 0.06, -0.05, 1.0 - (y0 - BY), -w + 0.08)]), M.brass, piv);
      const st = { o: 0, v: 0 };
      act(() => `Schleusentür ${nm} ${st.o ? 'schließen' : 'öffnen'}`, V(x, BY + 1.1, 2.7), () => { st.o ^= 1; hiss(0.1, 0.18, { f: 400, vol: 0.05, type: 'lowpass' }); }, 1.5);
      E.upd.push((dt) => { st.v = toward(st.v, st.o, dt * 1.2); piv.rotation.y = sg * sm(st.v) * 88 * D; });
    });
  }
  // ---- Rauchsalon: elektrischer Anzünder (detail_bdeck.js: Bakelitgriff 183.7, YP+0.9…1.02, z 0.635; Glühspitze unten)
  {
    const gm = glowMat(0xff6a1e), glow = mk(new THREE.SphereGeometry(0.016, 10, 8), gm, gB, 183.7, YP + 0.893, 0.635);
    const st = { t: -1 };
    act(() => (st.t >= 0 ? 'Anzünder glüht …' : 'Elektrischen Anzünder drücken'), V(183.7, YP + 0.96, 0.66), () => { if (st.t < 0) { st.t = 0; click(0, 1500); hiss(0.05, 4, { f: 5000, vol: 0.012, atk: 0.4 }); } }, 1.4);
    E.upd.push((dt) => {
      if (st.t < 0) { glow.visible = false; return; }
      st.t += dt; const k = Math.min(1, st.t / 0.8) * Math.min(1, Math.max(0, (5 - st.t) / 1.2));
      glow.visible = true; gm.opacity = 0.9 * k * (0.85 + 0.15 * Math.sin(st.t * 23)); glow.scale.setScalar(0.7 + 0.5 * k);
      if (st.t > 5) st.t = -1;
    });
  }
  // ---- Bar: Zapfhahn (detail_bdeck.js: Säule 182.85, Theke yt = YP+1.06, Hebel ab yt+0.36, Auslauf bis z 1.34/yt+0.24, Tropfblech yt+0.015)
  {
    const yt = YP + 1.06, x = 182.85;
    const lev = grp(gB, x, yt + 0.36, 1.25);
    mk(new THREE.CylinderGeometry(0.0135, 0.0135, 0.145, 8).translate(0, 0.0725, 0), M.black, lev); mk(new THREE.SphereGeometry(0.024, 10, 8).scale(1, 1.4, 1).translate(0, 0.15, 0), M.black, lev);
    const glass = grp(gB, x, yt + 0.015, 1.34);
    mk(new THREE.CylinderGeometry(0.036, 0.032, 0.13, 12, 1, true).translate(0, 0.065, 0), M.glassClear, glass).renderOrder = 2;
    mk(new THREE.CylinderGeometry(0.032, 0.032, 0.006, 12).translate(0, 0.003, 0), M.glassClear, glass);
    const beer = mk(new THREE.CylinderGeometry(0.031, 0.029, 1, 12).translate(0, 0.5, 0), mBeer, glass, 0, 0.006, 0);
    const foam = mk(new THREE.CylinderGeometry(0.032, 0.031, 0.016, 12), M.white, glass);
    const jet = mk(new THREE.CylinderGeometry(0.004, 0.004, 1, 6).translate(0, -0.5, 0), mBeer, gB, x, yt + 0.24, 1.34);
    const st = { s: 0, f: 0, lv: 0 }; glass.visible = false;
    act(() => (st.s === 1 ? 'Bier läuft …' : st.s === 2 ? 'Glas abnehmen' : 'Bier zapfen'), V(x, yt + 0.3, 1.36), () => {
      if (st.s === 0) { st.s = 1; st.f = 0; glass.visible = true; hiss(0.3, 3.6, { f: 1400, vol: 0.03, atk: 0.3 }); }
      else if (st.s === 2) { st.s = 0; glass.visible = false; click(0, 2200); }
    }, 1.4);
    E.upd.push((dt) => {
      if (st.s === 1) { st.f = Math.min(1, st.f + dt / 4); if (st.f >= 1) st.s = 2; }
      st.lv = toward(st.lv, st.s === 1 ? 1 : 0, dt * 4); lev.rotation.x = -12 * D - sm(st.lv) * 32 * D;
      const h = 0.002 + 0.105 * st.f; beer.scale.y = h; beer.visible = st.f > 0.01;
      foam.position.y = 0.006 + h + 0.006; foam.visible = st.f > 0.2;
      jet.visible = st.s === 1 && st.f > 0.04; jet.scale.y = 0.24 - 0.015 - 0.006 - h;
    });
  }
  // ---- Küche: Kochplatten des Elektroherds (decks.js: Platten r 0.12 auf YP+0.9…0.912; die beiden ohne Topf); Schalterleiste detail_bdeck.js
  {
    const mats = [], off = new THREE.Color(0x141414), on = new THREE.Color(0xff4a1a);
    for (const [px, pz] of [[185.05, -2.2], [184.75, -1.35]]) { const m = basic(0x141414); mats.push(m); mk(disc(0.105), m, gB, px, YP + 0.9135, pz); }
    const st = { o: 0, v: 0 };
    act(() => `Herd: zwei Kochplatten ${st.o ? 'ausschalten' : 'einschalten'}`, V(184.52, YP + 0.79, -1.85), () => { st.o ^= 1; click(0, 1200); }, 1.6);
    E.upd.push((dt) => { st.v = toward(st.v, st.o, dt / (st.o ? 7 : 12)); const k = sm(st.v); for (const m of mats) m.color.lerpColors(off, on, k); });
  }
  // ---- Dusche (decks.js: Brause 177.4, BY+1.97, z −0.85; Wanne bis BY+0.1; Ventile detail_bdeck.js bei 176.86/177.14, BY+1.2, z −0.6)
  {
    const N = 48, r = rng(77), top = BY + 1.955, bot = BY + 0.11, drops = [];
    for (let i = 0; i < N; i++) drops.push({ p: r(), a: r() * Math.PI * 2, d: 0.01 + r() * 0.05, s: 0.9 + r() * 0.3 });
    const pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const lm = new THREE.LineBasicMaterial({ color: 0xd6e8f2, transparent: true, opacity: 0, depthWrite: false });
    const water = new THREE.LineSegments(geo, lm); water.frustumCulled = false; gB.add(water);
    const st = { o: 0, v: 0, stop: null };
    act(() => `Dusche ${st.o ? 'zudrehen' : 'aufdrehen'}`, V(177.0, BY + 1.2, -0.62), () => {
      st.o ^= 1; if (st.stop) { st.stop(); st.stop = null; }
      if (st.o) st.stop = hiss(0, 0, { f: 3200, q: 0.4, vol: 0.035, atk: 0.4 });
    }, 1.8);
    E.upd.push((dt) => {
      st.v = toward(st.v, st.o, dt * 2); lm.opacity = 0.55 * st.v; water.visible = st.v > 0.01; if (!water.visible) return;
      drops.forEach((q, i) => {
        q.p = (q.p + dt * 1.6 * q.s) % 1; const y = top - q.p * (top - bot), sp = q.d * (1 + 1.6 * q.p);
        const x = 177.4 + Math.cos(q.a) * sp, z = -0.85 + Math.sin(q.a) * sp, l = Math.min(0.14, top - y + 0.001);
        pos.set([x, y, z, x, y + l, z], i * 6);
      });
      geo.attributes.position.needsUpdate = true;
    });
  }

  // ===================== FÜHRERGONDEL, NAVIGATIONSRAUM, FUNKRAUM (feature_controls.js bedient Räder, Telegrafen, Ballast) =====================
  // Pendelleuchte über dem Kartentisch (detail_gondola.js: Kugel 203.45, G_YC−0.32, z −0.9; Karte auf F(0.913))
  lampEl('Kartenlampe', gG, [203.45, G_YC - 0.32, -0.9, 0.038], [203.45, F(0.932), -0.9, 0.38], V(203.45, G_YC - 0.3, -0.9), 1.6);
  // Tischlampe des Funkers (detail_gondola.js: Kugel 205.995, R(1.065), z 2.45)
  lampEl('Tischlampe', gG, [205.995, RY(1.065), 2.45, 0.028], [205.85, RY(0.785), 2.45, 0.24], V(206.0, RY(1.08), 2.45), 1.5);
  // ---- Bordtelefon im Navigationsraum (detail_gondola.js: Kasten an der Trennwand x 204.21–204.28, Wählschalter Y(0.74) = F(1.19), z −1.02, Blick −x)
  {
    const SP = ['Funkraum', 'Kommandant', 'Maschinengondel 1 (Bb, achtern)', 'Maschinengondel 2 (Stb, achtern)', 'Maschinengondel 3 (Bb, vorn)', 'Maschinengondel 4 (Stb, vorn)',
      'Elektrozentrale', 'Hilfssteuerstand', 'Bugraum', 'Takelmeister (Axialgang)', 'Zahlmeister', 'Küche', 'Postraum'];   // Belegung der 14 Sprechstellen: Annahme
    const piv = grp(gG, 204.192, F(1.19), -1.02); mk(box(0.004, 0.026, 0.006, 0, 0.008, 0), M.brass, piv);
    const st = { k: -1, a: 0 };
    const ringT = () => { for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++) { const t = 0.25 + i * 1.6 + j * 0.07; tone(j % 2 ? 525 : 420, t, 0.07, { type: 'square', vol: 0.018, gate: true }); } };
    act(() => `Bordtelefon: ${SP[(st.k + 1) % SP.length]} anrufen`, V(204.2, F(1.15), -1.05), () => { st.k = (st.k + 1) % SP.length; click(0, 1400); ringT(); }, 1.4);
    E.upd.push((dt) => { piv.rotation.x = toward(piv.rotation.x, -st.k * (300 / SP.length) * D, dt * 4); });
  }
  // ---- Landescheinwerfer unter dem Gondelbug (detail_gondola.js: Glas bei 207.48, F(−0.29), Achse 207.22/F(−0.22) → 207.48/F(−0.29));
  //      Schalter: Drehschalter an der Trennwand zum Steuerraum (switchBox 204.32, F(0.82), z −0.6, Knebel bei x 204.358)
  {
    const p0 = V(207.22, F(-0.22), 0), p1 = V(207.48, F(-0.29), 0), dir = p1.clone().sub(p0).normalize(), up = V(0, 1, 0);
    const knob = grp(gG, 204.359, F(0.82), -0.6); mk(box(0.014, 0.014, 0.044), M.black, knob);
    const lens = mk(new THREE.CircleGeometry(0.112, 18), M.enamel, C.root); lens.position.copy(p1).addScaledVector(dir, 0.009); lens.quaternion.setFromUnitVectors(V(0, 0, 1), dir); lens.userData.lodK = 2;
    const bm = glowMat(0xfff0c8, 0); bm.side = THREE.DoubleSide; bm.polygonOffset = false;
    const beam = mk(new THREE.CylinderGeometry(3.2, 0.11, 40, 18, 1, true).translate(0, 20, 0), bm, C.root); beam.position.copy(p1); beam.quaternion.setFromUnitVectors(up, dir); beam.renderOrder = 4;
    const st = { o: 0, v: 0 };
    act(() => `Landescheinwerfer ${st.o ? 'ausschalten' : 'einschalten'}`, V(204.36, F(0.82), -0.6), () => { st.o ^= 1; click(0, 1000); }, 1.4);
    E.upd.push((dt) => { st.v = toward(st.v, st.o, dt * 3); knob.rotation.x = sm(st.v) * 90 * D; lens.material = st.v > 0.5 ? M.lamp : M.enamel; bm.opacity = 0.075 * st.v; beam.visible = st.v > 0.01; });
  }
  // ---- Morsetaste im Funkraum (detail_gondola.js: Hebel 204.95 → 205.06 auf R(0.76)+0.035…0.04, Drehpunkt x 204.98, Knopf x 205.06, z 2.44)
  {
    const y = RY(0.76), piv = grp(gG, 204.98, y + 0.037, 2.44);
    mk(box(0.115, 0.01, 0.014, 0.025, 0.0015, 0), M.brass, piv); mk(new THREE.CylinderGeometry(0.0215, 0.0215, 0.014, 12).translate(0.08, 0.013, 0), M.black, piv);
    // DEKAH = −·· · −·− ·− ····  (Einheit 80 ms)
    const ivs = []; { let t = 0; const u = 0.08; for (const w of ['-..', '.', '-.-', '.-', '....']) { for (const c of w) { const d = c === '-' ? 3 * u : u; ivs.push([t, d]); t += d + u; } t += 2 * u; } }
    const st = { t: -1 };
    act(() => (st.t >= 0 ? 'Morsetaste: sende DEKAH …' : 'Morsetaste: Rufzeichen DEKAH geben'), V(205.06, y + 0.06, 2.44), () => { if (st.t >= 0) return; st.t = 0; for (const [t, d] of ivs) tone(760, t, d, { vol: 0.07, gate: true }); }, 1.3);
    const end = ivs[ivs.length - 1][0] + ivs[ivs.length - 1][1] + 0.1;
    E.upd.push((dt) => { if (st.t < 0) return; st.t += dt; const dn = ivs.some(([t, d]) => st.t >= t && st.t < t + d); piv.rotation.z = dn ? -4.5 * D : 0; if (st.t > end) { st.t = -1; piv.rotation.z = 0; } });
  }

  // ===================== KIELGANG =====================
  // ---- Elektrozentrale: Messerschalter „Kielgangbeleuchtung“ (detail_keel.js: Schalttafel zf 3.42, yE = keelY(194.75), Schalter x 195.09, Fuß yE+0.88)
  //      schaltet die Leuchten unter den Kielgang-Stationen (detail_keel.js: Kugel r 0.045 bei x+0.3, keelY+2.6, z 0)
  {
    const yE = keelY(194.75), zf = 3.42, xs = 195.09;
    const gE = area('Elektrozentrale', 194.75, yE + 1, 2.6, 18);
    const blade = grp(gE, xs, yE + 0.88, zf - 0.03);
    mk(box(0.014, 0.142, 0.032, 0, 0.071, 0), new THREE.MeshPhongMaterial({ color: 0xb06a3a, specular: 0x555555, shininess: 35 }), blade);
    mk(new THREE.SphereGeometry(0.021, 8, 6).translate(0, 0.142, 0), M.black, blade);
    const STK = ST.filter((x) => KEEL_RANGES.some(([a, c]) => x >= a && x <= c));
    const dark = new THREE.InstancedMesh(new THREE.SphereGeometry(0.049, 8, 6), mDark, STK.length); dark.userData.lodK = 2; dark.frustumCulled = false;
    const m4 = new THREE.Matrix4(); STK.forEach((x, i) => dark.setMatrixAt(i, m4.makeTranslation(x + 0.3, keelY(x + 0.3) + 2.6, 0)));
    C.root.add(dark);
    const st = { o: 1, v: 1 };
    act(() => `Kielgangbeleuchtung ${st.o ? 'ausschalten' : 'einschalten'}`, V(xs, yE + 0.98, zf - 0.1), () => { st.o ^= 1; }, 1.5);
    E.upd.push((dt) => {
      const was = st.v > 0.5; st.v = toward(st.v, st.o, dt * 2.5); const k = sm(st.v);
      blade.rotation.x = -(4 + (1 - k) * 69.6) * D; dark.visible = st.v < 0.5;
      if (was !== st.v > 0.5) hiss(0, 0.12, { f: 3000, vol: 0.06, atk: 0.003 });
    });
  }
  // ---- Hilfssteuerstand in der unteren Flosse (detail_keel.js: Seitenrad bei x1−0.5, z 0, Achse x; Höhenrad x 39.4, z −0.24, Achse z; Mitte FIN_STAND.y+1.05)
  //      8 Griffe, 4 durchgehende Speichen → Drehung in 90°-Schritten deckt sich in Ruhe mit dem festen Rad
  {
    const S = FIN_STAND, wy = S.y + 1.05, gF = area('Hilfssteuerstand', 40.6, wy, 0, 16);
    const wheel = (() => {
      const parts = [];
      for (let k = 0; k < 8; k++) {
        const rz = new THREE.Matrix4().makeRotationZ(-k * Math.PI / 4);
        if (k < 4) parts.push(new THREE.CylinderGeometry(0.0135, 0.0135, 0.66, 6).applyMatrix4(rz));
        parts.push(new THREE.CylinderGeometry(0.0165, 0.0165, 0.08, 6).translate(0, 0.37, 0).applyMatrix4(rz));
      }
      return mergeGeometries(parts.map((g) => g.toNonIndexed()));
    })();
    const wS = grp(gF, S.x1 - 0.5, wy, 0); mk(wheel.clone().rotateY(-Math.PI / 2), M.woodLight, wS);
    const wH = grp(gF, 39.4, wy, -0.24); mk(wheel, M.woodLight, wH);
    const rs = (d) => (d === 0 ? 'mittschiffs' : `${Math.abs(d)}° ${d < 0 ? 'Bb' : 'Stb'}`), hs = (d) => (d === 0 ? '0°' : `${Math.abs(d)}° ${d > 0 ? 'hoch' : 'tief'}`);
    const mkSt = () => ({ d: 0, dir: 1, a: 0 }), sS = mkSt(), sH = mkSt();
    const nxt = (s) => { let n = s.d + 5 * s.dir; if (Math.abs(n) > 15) { s.dir = -s.dir; n = s.d + 5 * s.dir; } return n; };
    act(() => `Notseitenrad: Ruder ${rs(sS.d)} → ${rs(nxt(sS))}`, V(S.x1 - 0.5, wy + 0.2, 0.25), () => { sS.d = nxt(sS); }, 1.6);
    act(() => `Nothöhenrad: ${hs(sH.d)} → ${hs(nxt(sH))}`, V(39.4, wy + 0.2, -0.24), () => { sH.d = nxt(sH); }, 1.6);
    E.upd.push((dt) => {
      for (const [s, g, ax] of [[sS, wS, 'x'], [sH, wH, 'z']]) { s.a = toward(s.a, s.d / 5 * 90 * D, dt * 3); g.rotation[ax] = -s.a; }
    });
  }

  refresh(C);
}

/** Jahr/Modus: Elemente, die es im Zustand nicht gibt, ausblenden und ihre Bedienung abschalten */
function refresh(C) {
  if (!E) return;
  for (const a of E.acts) a.range = !a._y || a._y === C.sim.year ? a._r : 1e-4;
  if (E.piano) E.piano.visible = C.sim.year === 1936;
  if (E.doors) E.doors.full = true;
}
export function onYear(y, C) { refresh(C); }
export function onMode(m, C) { refresh(C); }

export function update(dt, C) {
  if (!E) return;
  dt = Math.min(Math.max(dt, 0), 0.1);
  const cam = C.camera && C.camera.position;
  if (cam) for (const g of E.areas) g.visible = cam.distanceTo(g.userData.c) < g.userData.r;
  for (const f of E.upd) f(dt, C);
}
