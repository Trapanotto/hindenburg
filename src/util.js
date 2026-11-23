import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ZA = new THREE.Vector3(0, 0, 1), YA = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Sammelt Dreiecke mit flachen Normalen (für Sonderflächen: Hülle, Träger, Böden). */
export class QuadBuf {
  constructor() { this.p = []; this.n = []; this.u = []; }
  tri(a, b, c, ua, ub, uc) {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const [v, uv] of [[a, ua], [b, ub], [c, uc]]) {
      this.p.push(v.x, v.y, v.z); this.n.push(n.x, n.y, n.z); this.u.push(uv[0], uv[1]);
    }
  }
  quad(a, b, c, d, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    this.tri(a, b, c, [u0, v0], [u1, v0], [u1, v1]);
    this.tri(a, c, d, [u0, v0], [u1, v1], [u0, v1]);
  }
  get empty() { return this.p.length === 0; }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    return g;
  }
}

/** UVs aus Weltkoordinaten (damit Texturen überall gleich groß erscheinen). */
export function worldUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv, k = 1 / scale;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) * k, p.getZ(i) * k);
    else if (ax >= az) uv.setXY(i, p.getZ(i) * k, p.getY(i) * k);
    else uv.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
}

/** Fasst alle Teile je Material zu einem einzigen Mesh zusammen (wenige Draw-Calls). */
export class Builder {
  constructor() { this.m = new Map(); this.maps = new Map([['', this.m]]); this.stack = [new THREE.Matrix4()]; }
  /** Alles, was in fn gebaut wird, gehört nur zur Variante tag (z. B. 1936 oder 1937). */
  only(tag, fn) {
    const prev = this.m; tag = String(tag);
    if (!this.maps.has(tag)) this.maps.set(tag, new Map());
    this.m = this.maps.get(tag);
    try { fn(); } finally { this.m = prev; }
  }
  get M() { return this.stack[this.stack.length - 1]; }
  at(x, y, z, ry, fn) {
    const m = new THREE.Matrix4().makeRotationY(ry || 0); m.setPosition(x, y, z);
    this.stack.push(this.M.clone().multiply(m)); fn(); this.stack.pop();
  }
  add(mat, geo, local) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (local) g.applyMatrix4(local);
    g.applyMatrix4(this.M);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    if (!this.m.has(mat)) this.m.set(mat, []);
    this.m.get(mat).push(g);
    return this;
  }
  box(mat, sx, sy, sz, x, y, z, ry = 0) {
    const m = new THREE.Matrix4().makeRotationY(ry); m.setPosition(x, y, z);
    return this.add(mat, new THREE.BoxGeometry(sx, sy, sz), m);
  }
  bb(mat, x0, x1, y0, y1, z0, z1) {
    return this.box(mat, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }
  beam(mat, a, b, w = 0.05, h = w) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(); if (len < 1e-5) return this;
    const q = new THREE.Quaternion().setFromUnitVectors(ZA, d.normalize());
    const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, ONE);
    return this.add(mat, new THREE.BoxGeometry(w, h, len), m);
  }
  cyl(mat, a, b, r = 0.03, seg = 8, r2 = r) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(); if (len < 1e-5) return this;
    const q = new THREE.Quaternion().setFromUnitVectors(YA, d.normalize());
    const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, ONE);
    return this.add(mat, new THREE.CylinderGeometry(r2, r, len, seg), m);
  }
  vcyl(mat, r, h, x, y, z, seg = 12, r2 = r) { // stehender Zylinder, y = Unterkante
    return this.cyl(mat, V(x, y, z), V(x, y + h, z), r, seg, r2);
  }
  /** weicher Bodenschatten unter Möbeln */
  shadow(mat, x, y, z, w, d) {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    return this.add(mat, g, new THREE.Matrix4().setPosition(x, y + 0.006, z));
  }
  torus(mat, R, r, x, y, z, axis = 'y', seg = 16) {
    const m = new THREE.Matrix4();
    if (axis === 'y') m.makeRotationX(Math.PI / 2); else if (axis === 'x') m.makeRotationY(Math.PI / 2);
    m.setPosition(x, y, z);
    return this.add(mat, new THREE.TorusGeometry(R, r, 6, seg), m);
  }
  sph(mat, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) {
    const m = new THREE.Matrix4().makeScale(sx, sy, sz); m.setPosition(x, y, z);
    return this.add(mat, new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), m);
  }
  /** groups: { tag: THREE.Group } für die Varianten; alles Übrige kommt nach parent. */
  build(parent, groups = {}) {
    for (const [tag, map] of this.maps) { this._build(map, tag ? groups[tag] || parent : parent, parent); map.clear(); }
  }
  _build(map, parent, lodRoot) {
    // Je Material in 15-m-Abschnitte längs des Schiffs teilen (Sichtfeld-Auslese) und nach Größe staffeln:
    // Kleinteile (Klasse 2) und mittlere Teile (Klasse 1) werden ab einer Entfernung ausgeblendet.
    const BIN = 15, lod = lodRoot.userData.lod || (lodRoot.userData.lod = []);
    for (const [mat, list] of map) {
      const bins = new Map();
      const put = (k, g) => { if (!bins.has(k)) bins.set(k, []); bins.get(k).push(g); };
      const cls = (d, fine, mid) => (mat.transparent ? 0 : d < fine ? 2 : d < mid ? 1 : 0);
      for (const g of list) {
        g.computeBoundingBox();
        const bb = g.boundingBox, dx = bb.max.x - bb.min.x, dy = bb.max.y - bb.min.y, dz = bb.max.z - bb.min.z;
        if (dx <= BIN * 1.5) { put(Math.floor((bb.min.x + bb.max.x) / 2 / BIN) + '|' + cls(Math.hypot(dx, dy, dz), 0.4, 2.2), g); continue; }
        // lange, bereits zusammengefasste Geometrie dreiecksweise aufteilen
        const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv.array, parts = new Map();
        for (let t = 0; t < P.length / 9; t++) {
          const o = t * 9;
          const ext = Math.max(Math.abs(P[o] - P[o + 3]), Math.abs(P[o + 1] - P[o + 4]), Math.abs(P[o + 2] - P[o + 5]), Math.abs(P[o] - P[o + 6]), Math.abs(P[o + 1] - P[o + 7]), Math.abs(P[o + 2] - P[o + 8]));
          const k = Math.floor((P[o] + P[o + 3] + P[o + 6]) / 3 / BIN) + '|' + cls(ext, 0.1, 0.9);
          let a = parts.get(k); if (!a) parts.set(k, a = { p: [], n: [], u: [] });
          for (let i = 0; i < 9; i++) { a.p.push(P[o + i]); a.n.push(N[o + i]); }
          for (let i = 0; i < 6; i++) a.u.push(U[t * 6 + i]);
        }
        for (const [k, a] of parts) {
          const sg = new THREE.BufferGeometry();
          sg.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); sg.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(a.u, 2));
          put(k, sg);
        }
      }
      for (const [key, part] of bins) {
        const g = mergeGeometries(part, false);
        if (!g) continue;
        if (mat.userData.wuv) worldUV(g, mat.userData.wuv);
        const mesh = new THREE.Mesh(g, mat), c = +key.split('|')[1];
        if (mat.transparent) mesh.renderOrder = 2;
        if (c > 0) { g.computeBoundingSphere(); mesh.userData.lodC = g.boundingSphere.center.clone(); mesh.userData.lodR = g.boundingSphere.radius; mesh.userData.lodK = c; lod.push(mesh); }
        parent.add(mesh);
      }
      list.forEach((x) => x.dispose());
    }
  }
}

export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Deterministischer Zufall, damit die Szene bei jedem Laden gleich aussieht. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Ebenes Bild an der Wand. dir: 'x+','x-','z+','z-' = Blickrichtung der Bildfläche. */
export function picture(parent, tex, x, y, z, w, h, dir) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  m.position.set(x, y, z);
  m.rotation.y = { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 }[dir];
  parent.add(m);
  return m;
}
