import * as THREE from 'three';
import { QuadBuf, V, rng } from './util.js';

/** Texturatlas: viele Schilder/Instrumente in einer Textur und einem Mesh. */
class Atlas {
  constructor(W, H, cw, ch) {
    this.W = W; this.H = H; this.cw = cw; this.ch = ch; this.n = 0; this.cols = W / cw; this.max = this.cols * (H / ch);
    this.c = document.createElement('canvas'); this.c.width = W; this.c.height = H; this.g = this.c.getContext('2d');
    this.g.fillStyle = '#222'; this.g.fillRect(0, 0, W, H);
    this.qbs = new Map([['', new QuadBuf()]]); this.qb = this.qbs.get('');
  }
  cell(draw) {
    const i = Math.min(this.n++, this.max - 1), cx = (i % this.cols) * this.cw, cy = Math.floor(i / this.cols) * this.ch, g = this.g;
    g.save(); g.translate(cx, cy); g.beginPath(); g.rect(0, 0, this.cw, this.ch); g.clip(); draw(g, this.cw, this.ch); g.restore();
    return [cx, cy];
  }
  uv(cx, cy, w, h) { return [(cx + 1) / this.W, 1 - (cy + h - 1) / this.H, (cx + w - 1) / this.W, 1 - (cy + 1) / this.H]; }
  tag(t) { t = String(t || ''); if (!this.qbs.has(t)) this.qbs.set(t, new QuadBuf()); this.qb = this.qbs.get(t); }
  addTo(root, groups) {
    const t = new THREE.CanvasTexture(this.c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const mat = new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    for (const [tag, qb] of this.qbs) if (!qb.empty) (tag ? groups[tag] || root : root).add(new THREE.Mesh(qb.geo(), mat));
  }
}

const AX = { 'z+': [V(1, 0, 0), V(0, 1, 0)], 'z-': [V(-1, 0, 0), V(0, 1, 0)], 'x+': [V(0, 0, -1), V(0, 1, 0)], 'x-': [V(0, 0, 1), V(0, 1, 0)], 'y+': [V(0, 0, 1), V(1, 0, 0)], 'y-': [V(0, 0, 1), V(-1, 0, 0)], 'yx': [V(1, 0, 0), V(0, 0, -1)] };
function place(qb, uv, x, y, z, w, h, dir) {
  const [R, U] = AX[dir], c = V(x, y, z);
  const p = (sr, su) => c.clone().addScaledVector(R, sr * w / 2).addScaledVector(U, su * h / 2);
  qb.quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), uv[0], uv[1], uv[2], uv[3]);
}

export function makeSigns() {
  const A = new Atlas(2048, 4096, 256, 64), G = new Atlas(2048, 2048, 128, 128), cache = new Map();
  const STY = {
    plate: ['#efe6cf', '#2a2520', '#8a7a58'], brass: ['#b9954a', '#2a1d0c', '#6a5020'], red: ['#a3261c', '#fff3dc', '#5a130d'],
    dark: ['#23262a', '#e9e2cc', '#6a6f75'], alu: ['#c6ccd2', '#20242a', '#7a828a'],
  };
  /** Textschild; h = Höhe in m, Breite ergibt sich aus der Textlänge. */
  function sign(text, x, y, z, h, dir, style = 'plate') {
    const key = style + '|' + text; let e = cache.get(key);
    if (!e) {
      const [bg, fg, bd] = STY[style];
      const ratio = Math.max(1.3, Math.min(4, 0.52 * text.length + 0.9)), pw = Math.round(64 * ratio);
      const [cx, cy] = A.cell((g) => {
        g.fillStyle = bg; g.fillRect(0, 0, pw, 64); g.strokeStyle = bd; g.lineWidth = 4; g.strokeRect(2, 2, pw - 4, 60);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 36; g.font = `${fs}px Georgia,serif`;
        while (g.measureText(text).width > pw - 18 && fs > 10) { fs -= 2; g.font = `${fs}px Georgia,serif`; }
        g.fillText(text, pw / 2, 34);
      });
      e = { uv: A.uv(cx, cy, pw, 64), ratio }; cache.set(key, e);
    }
    place(A.qb, e.uv, x, y, z, h * e.ratio, h, dir);
  }
  /** Rundinstrument mit Skala, Zeiger und Beschriftung. */
  function gauge(x, y, z, d, dir, label = '', seed = 1, face = '#f1ead6') {
    const key = 'g|' + label + seed + face; let uv = cache.get(key);
    if (!uv) {
      const r = rng(seed * 7 + label.length);
      const [cx, cy] = G.cell((g, w) => {
        g.fillStyle = '#17181a'; g.fillRect(0, 0, w, w);
        g.fillStyle = '#b9954a'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
        g.fillStyle = face; g.beginPath(); g.arc(64, 64, 55, 0, 7); g.fill();
        g.strokeStyle = '#1a1a1a';
        for (let k = 0; k <= 30; k++) { const a = 2.3 + k / 30 * 4.8, l = k % 5 ? 6 : 12; g.lineWidth = k % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); g.lineTo(64 + Math.cos(a) * (52 - l), 64 + Math.sin(a) * (52 - l)); g.stroke(); }
        g.fillStyle = '#1a1a1a'; g.font = 'bold 11px Arial'; g.textAlign = 'center';
        for (let k = 0; k <= 6; k++) { const a = 2.3 + k / 6 * 4.8; g.fillText(String(k * (seed % 3 + 1)), 64 + Math.cos(a) * 33, 68 + Math.sin(a) * 33); }
        g.font = '10px Arial'; g.fillText(label, 64, 96);
        const a = 2.3 + r() * 4.8; g.strokeStyle = '#a3261c'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(64 - Math.cos(a) * 10, 64 - Math.sin(a) * 10); g.lineTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); g.stroke();
        g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(64, 64, 5, 0, 7); g.fill();
      });
      uv = G.uv(cx, cy, 128, 128); cache.set(key, uv);
    }
    place(G.qb, uv, x, y, z, d, d, dir);
  }
  /** frei gezeichnete Fläche (Karte, Schalttafel …) in einer 128er-Zelle */
  function panel(key, draw, x, y, z, w, h, dir) {
    let uv = cache.get('p|' + key);
    if (!uv) { const [cx, cy] = G.cell(draw); uv = G.uv(cx, cy, 128, 128); cache.set('p|' + key, uv); }
    place(G.qb, uv, x, y, z, w, h, dir);
  }
  return { sign, gauge, panel, tag(t) { A.tag(t); G.tag(t); }, finish(root, groups = {}) { A.addTo(root, groups); G.addTo(root, groups); } };
}
