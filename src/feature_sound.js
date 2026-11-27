// Klangkulisse, vollständig mit der Web Audio API synthetisiert (keine Audiodateien):
// vier Dieselmotoren als räumliche Quellen, Fahrtwind, Schritte je Untergrund, Raumklang (Speisesaal, Halle, Bar,
// Küche, Funkraum, Elektrozentrale, Gaszellen), der Blüthner-Flügel (nur 1936) und Platzgeräusche am Ankermast.
// Quellen, die gerade unhörbar sind, werden vom Ausgang getrennt, damit der Browser sie nicht weiterrechnet.
import { ENG, A_Y, B_Y, GROUND_Y, keelY, hw } from './hull.js';
import { ROOMS as DROOMS } from './decks.js';
import { ROOMS as KROOMS, AXIAL } from './keel.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let seed = 129;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; // deterministischer Zufall
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
const VC = 34.7, RPM_REISE = 1350;
const TELE = [1, 0, 3, 2]; // ENG-Reihenfolge → Telegraf (0 vorn Bb, 1 vorn Stb, 2 achtern Bb, 3 achtern Stb)
const DNAMES = new Set(DROOMS.map((r) => r.name));
const MAST_GROUND = { 'Landefeld Lakehurst': 'grass', 'Landeplatz am Ankermast': 'grass', 'Hangar No. 1': 'concrete', 'Mastkopf-Plattform': 'alu' };

let A = null; // gesamter Audiozustand, entsteht in onAudio

// ---------- Hilfen ----------
function voice(dest) { const g = A.ctx.createGain(); g.gain.value = 0; return { g, dest, on: false, lvl: 0, off: 0 }; }
/** Pegel weich nachführen; nach langem Schweigen vom Ausgang trennen (spart Rechenzeit) */
function setV(v, lvl, dt, tc = 0.25) {
  lvl = lvl < 2e-4 ? 0 : lvl;
  if (lvl > 0 && !v.on) { v.g.connect(v.dest); v.on = true; }
  if (Math.abs(lvl - v.lvl) > Math.max(1e-4, v.lvl * 0.03)) { v.g.gain.setTargetAtTime(lvl, A.ctx.currentTime, tc); v.lvl = lvl; }
  if (lvl === 0 && v.on) { v.off += dt; if (v.off > tc * 8 + 0.3) { v.g.disconnect(); v.on = false; } } else v.off = 0;
}
const osc = (type, f) => { const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };
const gn = (v = 1) => { const g = A.ctx.createGain(); g.gain.value = v; return g; };
const filt = (type, f, q = 0.7) => { const b = A.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const panner = () => (A.ctx.createStereoPanner ? A.ctx.createStereoPanner() : gn(1));
// Zielwert nur setzen, wenn er sich seit dem letzten Setzen um mehr als 1 % geändert hat (spart Web-Audio-Aufrufe)
const lastF = new WeakMap();
const setF = (p, v, tc = 0.2) => {
  const l = lastF.get(p);
  if (l !== undefined && Math.abs(v - l) <= Math.max(1e-3, Math.abs(l) * 0.01)) return;
  lastF.set(p, v); p.setTargetAtTime(v, A.ctx.currentTime, tc);
};
/** Abstand eines Punkts zu einem Raumquader (Boden y, Höhe 2,5 m) */
const boxD = (b, p) => Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y - p.y, 0, p.y - b.y - 2.5), Math.max(b.z0 - p.z, 0, p.z - b.z1));
/** Gewicht eines Raums: drinnen 1, draußen durch Wand gedämpft und nach ~6 m ausgeblendet */
const roomW = (b, p) => { const d = boxD(b, p); return d <= 0 ? 1 : 0.7 * Math.max(0, 1 - d / 6) ** 2; };

// kurzes Ereignis: Teiltöne mit eigenem Abklingen (Geschirr, Glas, Topf, Klavier, Knarren …)
function ping(t, dest, parts, pan = 0) {
  const ctx = A.ctx, p = panner(); if (p.pan) p.pan.value = pan; p.connect(dest);
  let end = t;
  for (const [f, amp, tau, type = 'sine'] of parts) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, tau);
    o.connect(g); g.connect(p); o.start(t); o.stop(t + tau * 6 + 0.01); end = Math.max(end, t + tau * 6);
    o.onended = () => { g.disconnect(); };
  }
  setTimeout(() => p.disconnect(), (end - ctx.currentTime) * 1000 + 300);
}
// Rauschstoß durch ein Filter (Schritte, Klappern)
function burst(t, dest, type, f, q, amp, tau, att = 0.003) {
  const ctx = A.ctx, s = ctx.createBufferSource(), b = filt(type, f, q), g = ctx.createGain();
  s.buffer = A.nb; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + att); g.gain.setTargetAtTime(0, t + att, tau);
  s.connect(b); b.connect(g); g.connect(dest); s.start(t, rnd() * 1.6, tau * 6 + att + 0.02);
  s.onended = () => g.disconnect();
}

// ---------- Aufbau ----------
export function onAudio(C) {
  const ctx = C.audio.ctx; if (!ctx || A) return;
  A = { ctx, acc: 1, t: 0, lastPos: C.player.pos.clone(), lastPhase: null, rpm: [0, 0, 0, 0], gust: 0.3, gustT: 0, gustTo: 0.4, w: {} };
  // gemeinsamer Ausgang mit sanftem Begrenzer
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.3;
  A.bus = gn(1); A.bus.connect(comp); comp.connect(C.audio.out);
  // weißes Rauschen: ein Puffer (2 s), eine laufende Quelle für alle Dauergeräusche
  const n = ctx.sampleRate * 2, nb = ctx.createBuffer(1, n, ctx.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
  A.nb = nb; A.noise = ctx.createBufferSource(); A.noise.buffer = nb; A.noise.loop = true; A.noise.start();

  // Motoren: Zündfrequenz (16 Zyl., Viertakt: n/60·8), halbe Ordnung, Propeller-Blattfrequenz (Getriebe 2:1, 4 Blätter = n/60·2),
  // Kurbelwellen-Takt als Amplitudenmodulation (Tuckern), dazu gefiltertes Rauschen (Verbrennung, Ventiltrieb)
  A.engBus = gn(0.55); A.engBus.connect(A.bus);
  A.eng = ENG.map((e, i) => {
    const pan = panner(); pan.connect(A.engBus);
    const v = voice(pan), lp = filt('lowpass', 400, 0.9), am = gn(0.7);
    const a = osc('sawtooth', 180), h = osc('sawtooth', 90), p = osc('sine', 45), l = osc('sine', 22.5);
    const ga = gn(0.16), gh = gn(0.3), gp = gn(0.9), gl = gn(0.3), gz = gn(0.5);
    a.connect(ga); ga.connect(am); h.connect(gh); gh.connect(am); A.noise.connect(gz); gz.connect(am);
    l.connect(gl); gl.connect(am.gain); am.connect(lp); p.connect(gp); gp.connect(lp); lp.connect(v.g);
    return { e, v, lp, pan, a, h, p, l, gz, det: 1 + (i - 1.5) * 0.0045 };
  });
  // Fahrtwind: breitbandiges Rauschen und tiefes Böenrumpeln
  A.wind = voice(A.bus); A.wbp = filt('bandpass', 700, 0.5); A.wlo = filt('lowpass', 90, 0.7);
  const wlg = gn(2.2); A.noise.connect(A.wbp); A.wbp.connect(A.wind.g); A.noise.connect(A.wlo); A.wlo.connect(wlg); wlg.connect(A.wind.g);

  // Ereignisse (Geschirr, Klappern, Platzgeräusche): gemeinsames Dämpfungsfilter
  A.evLp = filt('lowpass', 6000, 0.5); A.evLp.connect(A.bus); A.ev = gn(1); A.ev.connect(A.evLp);
  // Stimmengemurmel: vier „Sprecher“ (Sägezahn durch zwei Formantfilter, Silbenhüllkurve) und etwas Rauschen
  A.murLp = filt('lowpass', 900, 0.6); A.murLp.connect(A.bus); A.mur = voice(A.murLp);
  A.spk = [118, 205, 142, 230].map((f0) => {
    const o = osc('sawtooth', f0), f1 = filt('bandpass', 600, 4), f2 = filt('bandpass', 1400, 5), g = gn(0), g2 = gn(0.6);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(A.mur.g);
    return { o, f1, f2, g, f0, next: 0 };
  });
  { const b = filt('bandpass', 500, 0.8), g = gn(0.05); A.noise.connect(b); b.connect(g); g.connect(A.mur.g); }
  // Küche: Brutzeln
  A.siz = voice(A.bus); { const hp = filt('highpass', 2800, 0.7), g = gn(0.6); A.noise.connect(hp); hp.connect(g); g.connect(A.siz.g); }
  // Funkraum: Tastton 820 Hz mit Rauschen des Empfängers
  A.mor = voice(A.bus); A.key = gn(0); { const o = osc('sine', 820); o.connect(A.key); A.key.connect(A.mor.g); }
  { const b = filt('bandpass', 1800, 1.2), g = gn(0.12); A.noise.connect(b); b.connect(g); g.connect(A.mor.g); }
  A.morT = 0; A.morQ = [];
  // Elektrozentrale: Umformer-/Generatorsummen
  A.hum = voice(A.bus);
  { const lp = filt('lowpass', 900, 0.7); lp.connect(A.hum.g); for (const [t, f, g] of [['sine', 100, 0.7], ['sine', 300, 0.25], ['sawtooth', 1180, 0.035], ['triangle', 50, 0.4]]) { const o = osc(t, f), gg = gn(g); o.connect(gg); gg.connect(lp); } }
  // Gaszellen: Stoffrascheln (Dauerton) und vereinzeltes Knarren des Gerippes (Ereignisse)
  A.rus = voice(A.bus); A.rusBp = filt('bandpass', 2600, 0.6); A.noise.connect(A.rusBp); A.rusBp.connect(A.rus.g);
  A.crk = gn(1); A.crk.connect(A.bus);
  // Flügel
  A.pnoLp = filt('lowpass', 3200, 0.5); A.pnoLp.connect(A.bus); A.pno = voice(A.pnoLp); A.pin = gn(1); A.pin.connect(A.pno.g);
  A.beat = 0; A.pT = 0; A.mel = 72;
  A.steps = gn(1); A.steps.connect(A.bus);

  // Räume mit Klangquellen (Grenzen aus decks.js/keel.js)
  const D = (n) => DROOMS.find((r) => r.name === n), K = (id) => { const r = KROOMS.find((q) => q.id === id); if (!r) return null; const z0 = r.s * 0.65, z1 = r.s * r.zo, xm = (r.x0 + r.x1) / 2; return { x0: r.x0, x1: r.x1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), y: keelY(xm) }; };
  A.rooms = [
    { b: D('Speisesaal'), mur: 1, clk: 1.6, kinds: ['tasse', 'besteck', 'tasse', 'glas'] },
    { b: D('Gesellschaftsraum'), mur: 0.45, clk: 0.15, kinds: ['tasse'], piano: true },
    { b: D('Schreib- und Lesezimmer'), mur: 0.08 },
    { b: D('Bar'), mur: 0.5, clk: 0.45, kinds: ['glas'] },
    { b: D('Rauchsalon'), mur: 0.4, clk: 0.1, kinds: ['glas'] },
    { b: D('Anrichte'), clk: 0.7, kinds: ['tasse', 'besteck'] },
    { b: D('Küche'), clk: 1.1, kinds: ['topf', 'besteck', 'topf'], siz: 1 },
    { b: D('Mannschaftsmesse'), mur: 0.3, clk: 0.3, kinds: ['tasse', 'besteck'] },
    { b: D('Offiziersmesse'), mur: 0.25, clk: 0.2, kinds: ['tasse'] },
    { b: { x0: 203.6, x1: 206.4, z0: 0.6, z1: 3.0, y: keelY(205) }, mor: 1 },
    { b: K('elektro'), hum: 1 },
  ].filter((r) => r.b);
  A.eRight = C.camera.position.clone(); A.tmp = C.camera.position.clone();
}

// ---------- Ort und Untergrund ----------
function where(C) {
  const P = C.player, z = P.zone, name = z ? z.name : '', p = P.pos, mast = C.sim.mode === 'mast';
  let env = 'keel', surf = 'alu';
  if (P.fly) return { env: 'out', surf: '' };
  // außerhalb der Hülle (Laufstegende, Trittplatte an der Maschinengondel)
  const hz = p.x > 20 && p.x < 240 ? hw(p.x, p.y + 1) : 0; // unterhalb der Hülle ist hz ≤ 0 (Führergondel, Flosse)
  if (name.startsWith('Trittplatte') || (hz > 0.3 && Math.abs(p.z) > hz + 0.2)) return { env: 'eng', surf: 'alu' };
  if (mast && (MAST_GROUND[name] || p.y < GROUND_Y + 3)) return { env: 'ground', surf: MAST_GROUND[name] || 'grass' };
  const pax = DNAMES.has(name) || (z && z.plan) || (p.x > 168 && p.x < 190 && p.y > B_Y - 0.7 && p.y < A_Y + 2.6 && !/Kielgang|Laufsteg/.test(name));
  if (name.startsWith('Führergondel') || name === 'Treppe zur Führergondel') { env = 'ctrl'; surf = 'wood'; }
  else if (pax) {
    env = 'pax';
    if (/Kielgang/.test(name)) surf = 'alu';
    else if (p.y > A_Y - 0.6) surf = /Anrichte|Promenade|Treppe zum B/.test(name) ? 'lino' : 'carpet';
    else surf = /Bar|Rauchsalon/.test(name) ? 'wood' : 'lino';
  } else if (p.y > AXIAL.y - 3 && Math.abs(p.z) < 1.2) env = 'axial';
  else if (name === 'Funkraum' || /Mannschaftsraum|Offiziersraum|Kapitän|Postraum/.test(name)) surf = 'wood';
  return { env, surf };
}

// ---------- Schritte ----------
function footstep(surf, run) {
  A.nSteps = (A.nSteps || 0) + 1;
  const t = A.ctx.currentTime + 0.01, k = (run ? 1 : 0.72) * (0.85 + rnd() * 0.3), s = A.steps, j = 0.92 + rnd() * 0.16;
  switch (surf) {
    case 'carpet': burst(t, s, 'lowpass', 380 * j, 0.5, 0.35 * k, 0.05, 0.008); ping(t, s, [[68 * j, 0.22 * k, 0.06]]); break;
    case 'lino': burst(t, s, 'bandpass', 950 * j, 0.9, 0.42 * k, 0.04); ping(t, s, [[115 * j, 0.18 * k, 0.05]]); break;
    case 'wood': burst(t, s, 'bandpass', 620 * j, 1.2, 0.45 * k, 0.06); ping(t, s, [[92 * j, 0.28 * k, 0.09], [184 * j, 0.06 * k, 0.05]]); break;
    case 'alu': burst(t, s, 'bandpass', 2700 * j, 2.5, 0.34 * k, 0.045); ping(t, s, [[480 * j, 0.06 * k, 0.16], [1235 * j, 0.045 * k, 0.12], [2890 * j, 0.025 * k, 0.07], [130 * j, 0.12 * k, 0.05]]); break;
    case 'grass': burst(t, s, 'bandpass', 2400 * j, 0.5, 0.16 * k, 0.09, 0.025); break;
    case 'concrete': burst(t, s, 'bandpass', 1500 * j, 0.8, 0.4 * k, 0.025); break;
    default: break;
  }
}

// ---------- Geschirr und andere Kurzereignisse ----------
const KIND = {
  tasse: () => { const f = 2100 + rnd() * 900; return [[f, 0.05, 0.09], [f * 2.27, 0.03, 0.06], [f * 3.4, 0.015, 0.04]]; },
  glas: () => { const f = 2900 + rnd() * 1400; return [[f, 0.035, 0.28], [f * 1.93, 0.018, 0.18]]; },
  besteck: () => { const f = 3800 + rnd() * 2000; return [[f, 0.025, 0.035], [f * 1.6, 0.015, 0.025]]; },
  topf: () => { const f = 420 + rnd() * 380; return [[f, 0.05, 0.25], [f * 2.41, 0.035, 0.16], [f * 4.1, 0.02, 0.08]]; },
};
function event(kind, amp) {
  const t = A.ctx.currentTime + 0.02, parts = KIND[kind]().map(([f, a, tau]) => [f, a * amp, tau]);
  ping(t, A.ev, parts, (rnd() - 0.5) * 1.2);
  if (kind === 'topf' || kind === 'besteck') burst(t, A.ev, 'highpass', 3000, 0.7, 0.05 * amp, 0.03);
  if (rnd() < 0.3) ping(t + 0.06 + rnd() * 0.1, A.ev, KIND[kind]().map(([f, a, tau]) => [f * 1.02, a * amp * 0.5, tau]), (rnd() - 0.5)); // Nachklirren
}
// Knarren: Klicktrain (Rechteck 30–70 Hz) durch ein schmales, gleitendes Bandpassfilter
function creak(amp) {
  const ctx = A.ctx, t = ctx.currentTime + 0.02, dur = 0.4 + rnd() * 1.1;
  const o = ctx.createOscillator(), b = filt('bandpass', 300 + rnd() * 400, 9), g = ctx.createGain(), p = panner();
  o.type = 'square'; o.frequency.setValueAtTime(28 + rnd() * 30, t); o.frequency.linearRampToValueAtTime(40 + rnd() * 35, t + dur);
  b.frequency.setValueAtTime(b.frequency.value, t); b.frequency.linearRampToValueAtTime(b.frequency.value * (1.2 + rnd() * 0.5), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur);
  if (p.pan) p.pan.value = (rnd() - 0.5) * 1.6;
  o.connect(b); b.connect(g); g.connect(p); p.connect(A.crk); o.start(t); o.stop(t + dur + 0.05);
  o.onended = () => p.disconnect();
}

// ---------- Morsezeichen ----------
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
const LETTERS = Object.keys(MORSE);
function morseMsg() {
  if (rnd() < 0.3) return ['VVV', 'QRK', 'K'];
  const g = []; for (let i = 0, n = 2 + Math.floor(rnd() * 4); i < n; i++) g.push(Array.from({ length: 5 }, () => pick(LETTERS)).join(''));
  return [...g, 'AR'];
}
function morseRun(t) {
  const u = 0.06 + rnd() * 0.004; // Punktlänge ≈ 20 Wörter/min
  if (A.morT < t) A.morT = t + 0.1;
  while (A.morT < t + 0.5) {
    if (!A.morQ.length) { A.morQ = morseMsg(); A.morT += 1.5 + rnd() * 4; continue; }
    const w = A.morQ.shift();
    for (const ch of w) {
      for (const s of MORSE[ch] || '') { const len = s === '.' ? u : 3 * u; A.key.gain.setTargetAtTime(1, A.morT, 0.003); A.key.gain.setTargetAtTime(0, A.morT + len, 0.003); A.morT += len + u; }
      A.morT += 2 * u;
    }
    A.morT += 4 * u;
  }
}

// ---------- Gemurmel: Silben der vier Sprecher ----------
const VOW = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [640, 1190], [440, 1020], [490, 1350]];
function murmurRun(t) {
  for (const s of A.spk) {
    if (s.next < t) s.next = t + rnd() * 0.3;
    while (s.next < t + 0.25) {
      const T = s.next, talk = rnd() < 0.82;
      if (talk) {
        const [f1, f2] = pick(VOW), dur = 0.07 + rnd() * 0.17;
        s.g.gain.setTargetAtTime(0.25 + rnd() * 0.75, T, 0.025); s.g.gain.setTargetAtTime(0.05, T + dur * 0.8, 0.03);
        s.f1.frequency.setTargetAtTime(f1 * (s.f0 > 180 ? 1.15 : 1), T, 0.03); s.f2.frequency.setTargetAtTime(f2 * (s.f0 > 180 ? 1.15 : 1), T, 0.03);
        s.o.frequency.setTargetAtTime(s.f0 * (0.88 + rnd() * 0.28), T, 0.06);
        s.next = T + dur;
      } else { s.g.gain.setTargetAtTime(0, T, 0.05); s.next = T + 0.2 + rnd() * 0.9; } // Atempause / Zuhören
    }
  }
}

// ---------- Flügel: schlichter, generativ variierter Satz im 3/4-Takt (F-Dur), eigene Tonfolge ----------
const CH = { F: [53, 57, 60], Dm: [50, 53, 57], B: [46, 50, 53], C: [48, 52, 55], Gm: [43, 46, 50], C7: [48, 52, 58], Am: [45, 48, 52] };
const PROG = ['F', 'Dm', 'B', 'C', 'F', 'Gm', 'C7', 'F', 'Am', 'Dm', 'Gm', 'C', 'F', 'B', 'C7', 'F'];
const SCALE = [65, 67, 69, 70, 72, 74, 76, 77, 79, 81];
const BPM = 69, SPB = 60 / BPM;
function pnote(t, m, vel, dur) {
  const f = 440 * 2 ** ((m - 69) / 12), tau = 1.6 * Math.sqrt(262 / f), ctx = A.ctx;
  [[1, 1], [2, 0.42], [3, 0.16]].forEach(([k, a]) => {
    const fk = f * k * Math.sqrt(1 + 0.0004 * k * k); if (fk > 7000) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), amp = a * vel, tk = tau / k ** 0.8;
    o.frequency.value = fk; o.detune.value = (rnd() - 0.5) * 4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.setTargetAtTime(amp * 0.35, t + 0.005, 0.1); g.gain.setTargetAtTime(0, t + 0.3, tk);
    g.gain.setTargetAtTime(0, t + dur, 0.12); // Dämpfer
    o.connect(g); g.connect(A.pin); o.start(t); o.stop(t + Math.min(dur + 0.8, 0.3 + tk * 5));
    o.onended = () => g.disconnect();
  });
}
const FOURTHS = SCALE.filter((x) => x % 12 === 5); // Quarten-/Grundtöne der Skala, einmal berechnet
const TONES_OF = new Map(); // Skalentöne je Akkord, einmal berechnet
function chordTones(ch) {
  let t = TONES_OF.get(ch);
  if (!t) { t = SCALE.filter((m) => ch.some((c) => (m - c) % 12 === 0)); TONES_OF.set(ch, t); }
  return t;
}
function pianoRun(t) {
  if (A.pT < t) A.pT = t + 0.1;
  while (A.pT < t + 0.3) {
    const T = A.pT, bar = Math.floor(A.beat / 3), bt = A.beat % 3, ch = CH[PROG[bar % PROG.length]], last = bar % 8 === 7;
    const sw = (rnd() - 0.5) * 0.02; // etwas menschliche Ungenauigkeit
    if (bt === 0) {
      pnote(T + sw, ch[0] - (rnd() < 0.5 ? 12 : 0), 0.32, SPB * 3);
      // Melodie: Akkordton nahe dem letzten Ton, am Phrasenende Grundton
      const tones = chordTones(ch);
      let m = tones.reduce((a, b) => (Math.abs(b - A.mel) < Math.abs(a - A.mel) ? b : a), tones[0]);
      if (last) m = FOURTHS.reduce((a, b) => (Math.abs(b - A.mel) < Math.abs(a - A.mel) ? b : a));
      else if (rnd() < 0.35) m = tones[clamp(tones.indexOf(m) + (rnd() < 0.5 ? 1 : -1), 0, tones.length - 1)];
      A.mel = m; pnote(T + sw * 0.5, m, 0.5 + rnd() * 0.12, last ? SPB * 3 : SPB * (rnd() < 0.5 ? 2 : 1));
    } else {
      pnote(T + sw, ch[1] + 12, 0.17, SPB * 0.9); pnote(T + sw + 0.01, ch[2] + 12, 0.15, SPB * 0.9);
      if (!last && rnd() < (bt === 1 ? 0.45 : 0.6)) { // Durchgangston auf Zählzeit 2/3
        const i = SCALE.indexOf(A.mel), j = clamp((i < 0 ? 4 : i) + (rnd() < 0.5 ? 1 : -1), 0, SCALE.length - 1);
        A.mel = SCALE[j]; pnote(T + sw * 0.5, A.mel, 0.38 + rnd() * 0.1, SPB);
      }
    }
    A.beat++; A.pT += SPB * (bt === 2 && last ? 1.6 : 1); // kleines Atmen am Phrasenende
    if (A.beat % 48 === 0) A.pT += SPB * 2;
  }
}

// Lautstärke-/Filtertabellen je Umgebung (Modulebene, damit die Schleife keine Objekte je Pegelschritt anlegt)
const OCC_T = { out: 1, eng: 1, keel: 0.6, axial: 0.3, ctrl: 0.35, pax: 0.18, ground: 1 };
const LPMAX_T = { out: 5000, eng: 5000, keel: 1500, axial: 650, ctrl: 1400, pax: 150, ground: 3000 };
const PANK_T = { out: 0.9, eng: 0.9, keel: 0.75, axial: 0.5, ctrl: 0.6, pax: 0.25, ground: 0.9 };
const WK_T = { out: 0.5, eng: 0.6, keel: 0.05, axial: 0.025, ctrl: 0.12, pax: 0.012, ground: 0 };
const WF_T = { out: 900, eng: 1100, keel: 320, axial: 260, ctrl: 600, pax: 220, ground: 600 };

// ---------- Hauptschleife ----------
export function update(dt, C) {
  if (!A || !C.audio.on) return;
  const ctx = A.ctx, t = ctx.currentTime, P = C.player, sim = C.sim, mast = sim.mode === 'mast';

  // Schritte: nur bei tatsächlicher Ortsänderung, im Takt des Kamerawippens (player.walked)
  const p = P.pos, mv = Math.hypot(p.x - A.lastPos.x, p.z - A.lastPos.z) + Math.abs(p.y - A.lastPos.y) * 0.5; A.lastPos.copy(p);
  const ph = Math.floor(((P.walked || 0) * 5.2 + Math.PI / 2) / (2 * Math.PI));
  if (!P.fly && !P.travel && mv > 1e-4 && mv < 1 && A.lastPhase != null && ph !== A.lastPhase) footstep(A.where ? A.where.surf : 'lino', mv / Math.max(dt, 1e-3) > 3.4);
  A.lastPhase = ph;

  // Böen: geglätteter Zufallsverlauf
  A.gustT -= dt; if (A.gustT <= 0) { A.gustT = 1.5 + rnd() * 4; A.gustTo = rnd() ** 1.5; }
  A.gust += (A.gustTo - A.gust) * Math.min(1, dt / 1.2);

  // Ereignisse (zufällig nach Rate)
  const W = A.w;
  if (W.clk > 0 && rnd() < W.clk * dt) { const r = pick(W.clkL); event(pick(r.kinds), r.amp); }
  if (W.crk > 0 && rnd() < W.crk * dt) creak(0.05 + rnd() * 0.1);
  if (A.mur.on) murmurRun(t);
  if (A.mor.on) morseRun(t);
  if (A.pno.on && A.pno.lvl > 0 && sim.year === 1936) pianoRun(t); else A.pT = 0;

  // Pegel nur zehnmal je Sekunde nachführen
  A.acc += dt; if (A.acc < 0.1) return;
  const dT = A.acc; A.acc = 0;
  const wh = A.where = where(C), env = wh.env, cam = C.camera.position, spd = clamp(Math.abs(sim.speed) / VC, 0, 1.2);

  // Motoren
  const OCC = OCC_T[env], LPMAX = LPMAX_T[env], PANK = PANK_T[env];
  const e3 = C.camera.matrixWorld.elements, rx = e3[0], ry = e3[1], rz = e3[2]; // rechte Kamera-Achse
  for (let i = 0; i < A.eng.length; i++) {
    const E = A.eng[i];
    const R = sim.rpm, tgt = Array.isArray(R) && Number.isFinite(R[TELE[i]]) ? Math.abs(R[TELE[i]]) : (mast ? 0 : RPM_REISE * clamp(Math.abs(sim.speed) / VC, 0, 1.15));
    const rpm = A.rpm[i] += (tgt - A.rpm[i]) * Math.min(1, dT / 1.2);
    const c = E.e.c, dx = c.x - cam.x, dy = c.y - cam.y, dz = c.z - cam.z, d = Math.hypot(dx, dy, dz) || 1;
    const load = rpm < 40 ? 0 : (0.3 + 0.7 * (rpm / RPM_REISE) ** 1.3) * clamp((rpm - 40) / 160, 0, 1);
    setV(E.v, OCC * load / (1 + d / (env === 'out' ? 18 : 6)), dT, 0.3); // im Freien trägt der Schall weiter
    if (!E.v.on) continue;
    const f = Math.max(5, rpm / 60 * 8) * E.det, tc = 0.4;
    setF(E.a.frequency, f, tc); setF(E.h.frequency, f / 2, tc); setF(E.p.frequency, f / 4, tc); setF(E.l.frequency, f / 8, tc);
    setF(E.lp.frequency, Math.min(LPMAX, 250 + 4500 / (1 + d / 4)), 0.3);
    setF(E.gz.gain, 0.25 + 0.5 * (rpm / RPM_REISE), 0.5);
    if (E.pan.pan) setF(E.pan.pan, clamp((dx * rx + dy * ry + dz * rz) / d, -1, 1) * PANK, 0.15);
  }

  // Fahrtwind bzw. Wind am Mast
  const WK = WK_T[env], WF = WF_T[env];
  let wl = WK * spd * spd * (0.85 + 0.3 * A.gust);
  if (mast) wl = env === 'ground' || env === 'out' ? 0.06 + 0.22 * A.gust : 0.012 + 0.03 * A.gust;
  setV(A.wind, wl, dT, 0.4);
  if (A.wind.on) { setF(A.wbp.frequency, WF * (0.8 + 0.5 * (mast ? A.gust : spd)), 0.5); setF(A.wlo.frequency, 60 + 60 * A.gust, 0.5); }

  // Raumklang
  let mur = 0, inMur = false, siz = 0, mor = 0, hum = 0, piano = 0, clk = 0; const clkL = [];
  for (const r of A.rooms) {
    const w = roomW(r.b, cam); if (w <= 0) continue;
    if (r.mur) { mur += w * r.mur; if (w === 1) inMur = true; }
    if (r.clk) { clk += w * r.clk; clkL.push({ kinds: r.kinds, amp: w }); }
    if (r.siz) siz += w; if (r.mor) mor += w; if (r.hum) hum += w;
    if (r.piano && sim.year === 1936) piano = Math.max(piano, w);
  }
  if (env === 'ground') { mur += 0.35; clk += 0.25; clkL.push({ kinds: ['topf'], amp: 0.35 }); } // Haltemannschaft, Geräte am Platz
  W.clk = clk; W.clkL = clkL;
  setV(A.mur, Math.min(1, mur) * 0.2, dT, 0.5);
  setF(A.murLp.frequency, env === 'ground' ? 650 : inMur ? 2200 : 750, 0.3);
  setF(A.evLp.frequency, env === 'ground' ? 1800 : inMur || siz >= 1 ? 7000 : 2200, 0.3);
  setV(A.siz, Math.min(1, siz) * 0.03 * (0.7 + 0.6 * A.gust), dT, 0.3);
  setV(A.mor, Math.min(1, mor) * 0.12, dT, 0.2);
  setV(A.hum, Math.min(1, hum) * 0.06, dT, 0.3);
  setV(A.pno, piano * 0.26, dT, 0.6);
  // Gaszellen: im Axialgang deutlich, im Kielgang leise (Zellen hängen darüber)
  const cell = env === 'axial' ? 1 : env === 'keel' ? 0.3 : 0;
  W.crk = cell * (0.12 + 0.2 * spd + (mast ? 0.15 * A.gust : 0));
  setV(A.rus, cell * 0.035 * (0.4 + 0.6 * (mast ? A.gust : spd * (0.8 + 0.4 * A.gust))), dT, 0.6);
}

// ---------- Ton-Schalter, Jahr, Modus ----------
export function onSound(on, C) {
  if (!A) return;
  clearTimeout(A.susp);
  if (!on) A.susp = setTimeout(() => { if (!C.audio.on && A.ctx.state === 'running') A.ctx.suspend(); }, 900); // ausgeblendet: Kontext anhalten
  else { A.pT = 0; A.morT = 0; A.lastPhase = null; A.acc = 1; }
}
export function onYear(year) { if (A && year !== 1936) A.pT = 0; }
export function onMode() { if (A) A.acc = 1; }

/** für Tests in der Konsole: aktuelle Pegel und Ort */
export function soundState() {
  if (!A) return null;
  const v = (x) => +x.lvl.toFixed(4);
  return { state: A.ctx.state, where: A.where, rpm: A.rpm.map(Math.round), eng: A.eng.map((e) => v(e.v)), wind: v(A.wind), mur: v(A.mur), siz: v(A.siz),
    mor: v(A.mor), hum: v(A.hum), piano: v(A.pno), rus: v(A.rus), clk: +(A.w.clk || 0).toFixed(2), crk: +(A.w.crk || 0).toFixed(2), steps: A.nSteps || 0, bus: A.bus };
}
// Standard-Export: Aufbau läuft erst in onAudio (AudioContext entsteht nach dem ersten Klick)
export default function () {}
