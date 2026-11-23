/** Begehbare Flächen als Rechteckzonen (eben oder Rampe) plus Hindernisquader. */
export class Nav {
  constructor() { this.zones = []; this.blocks = []; this._h = 0; this.tag = null; this.year = 1936; this.mtag = null; this.mode = 'flug'; }
  zone(name, x0, x1, z0, z1, y, o = {}) { this.zones.push({ name, x0, x1, z0, z1, ya: y, yb: y, ax: 'x', only: this.tag, mode: this.mtag, ...o }); }
  ramp(name, x0, x1, z0, z1, ya, yb, ax = 'x', o = {}) { this.zones.push({ name, x0, x1, z0, z1, ya, yb, ax, only: this.tag, mode: this.mtag, ...o }); }
  block(x0, x1, z0, z1, y0, y1) { this.blocks.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, only: this.tag, mode: this.mtag }); }
  h(zn, x, z) {
    const t = zn.ax === 'x' ? (x - zn.x0) / (zn.x1 - zn.x0) : (z - zn.z0) / (zn.z1 - zn.z0);
    return zn.ya + (zn.yb - zn.ya) * t;
  }
  /** höchste Fläche, die mit einem Schritt (0,5 m hoch / 0,75 m tief) erreichbar ist */
  floor(x, z, y) {
    let best = null, bh = -1e9;
    for (const zn of this.zones) {
      if ((zn.only && zn.only !== this.year) || (zn.mode && zn.mode !== this.mode)) continue;
      if (x < zn.x0 || x > zn.x1 || z < zn.z0 || z > zn.z1) continue;
      const h = this.h(zn, x, z);
      if (h - y > 0.5 || y - h > 0.75) continue;
      if (h > bh) { bh = h; best = zn; }
    }
    if (best) this._h = bh;
    return best;
  }
  blocked(x, z, y, r) {
    for (const b of this.blocks) {
      if ((b.only && b.only !== this.year) || (b.mode && b.mode !== this.mode)) continue;
      if (y < b.y0 - 0.3 || y > b.y1) continue;
      if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true;
    }
    return false;
  }
  /** Prüft Standfläche; liefert {zn,h} oder null. */
  ok(x, z, y, r = 0.25, ignoreBlocks = false) {
    for (const [dx, dz] of [[r, r], [r, -r], [-r, r], [-r, -r]]) if (!this.floor(x + dx, z + dz, y)) return null;
    const zn = this.floor(x, z, y); if (!zn) return null;
    const h = this._h;
    if (!ignoreBlocks && this.blocked(x, z, y, r * 0.7)) return null;
    return { zn, h };
  }
}
