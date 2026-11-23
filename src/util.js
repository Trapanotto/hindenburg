import * as THREE from 'three';

const ZA = new THREE.Vector3(0, 0, 1), YA = new THREE.Vector3(0, 1, 0);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Sammelt Dreiecke mit flachen Normalen (für Sonderflächen: Hülle, Träger, Böden). */
export class QuadBuf {
  constructor() { this.p = []; this.n = []; this.u = []; }
  tri(a, b, c, ua, ub, uc) {
    // Flächennormale ohne Hilfsobjekte (fällt bei zehntausenden Dreiecken ins Gewicht)
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l > 0) { nx /= l; ny /= l; nz /= l; }
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
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
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, uv = geo.attributes.uv.array, k = 1 / scale;
  for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
    const ax = Math.abs(n[i]), ay = Math.abs(n[i + 1]), az = Math.abs(n[i + 2]);
    if (ay >= ax && ay >= az) { uv[j] = p[i] * k; uv[j + 1] = p[i + 2] * k; }
    else if (ax >= az) { uv[j] = p[i + 2] * k; uv[j + 1] = p[i + 1] * k; }
    else { uv[j] = p[i] * k; uv[j + 1] = p[i + 1] * k; }
  }
}

// Vorlagen der Grundkörper (nicht indiziert). Quader, Zylinder, Kugeln und Ringe werden aus einer Einheitsform
// skaliert: dieselben Dreiecke, Normalen und UVs wie eine jeweils neu erzeugte Geometrie, aber ohne deren Aufbaukosten.
const TPL = new Map();
function tpl(key, make) {
  let t = TPL.get(key);
  if (!t) {
    let g = make(); if (g.index) g = g.toNonIndexed();
    t = { p: g.attributes.position.array, n: g.attributes.normal.array, u: g.attributes.uv.array };
    TPL.set(key, t);
  }
  return t;
}
const _m = new THREE.Matrix4(), _l = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3(), _nm = new THREE.Matrix3();
const NEED_UV = ['map', 'alphaMap', 'aoMap', 'lightMap', 'bumpMap', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'specularMap', 'displacementMap'];
/** Materialien ohne Textur brauchen keine UV-Koordinaten (spart ein Viertel des Geometriespeichers). */
const needsUV = (mat) => !!mat.userData.wuv || !!mat.userData.keepUV || NEED_UV.some((k) => mat[k]);

/** Fasst alle Teile je Material zu einem einzigen Mesh zusammen (wenige Draw-Calls). */
export class Builder {
  constructor() { this.m = new Map(); this.maps = new Map([['', this.m]]); this.stack = [new THREE.Matrix4()]; this.calls = 0; }
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
    this.stack.push(this.M.clone().multiply(m)); try { fn(); } finally { this.stack.pop(); }
  }
  /** Dreiecke t (Arrays p, n, u) mit der Matrix local im aktuellen at()-System übernehmen; Positionen und Normalen werden sofort umgerechnet. */
  _put(mat, t, local) {
    const m = local ? _m.multiplyMatrices(this.M, local) : _m.copy(this.M), e = m.elements;
    const P = t.p, N = t.n, cnt = P.length, p = new Float32Array(cnt);
    let n = N, x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < cnt; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
      p[i] = X; p[i + 1] = Y; p[i + 2] = Z;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z;
    }
    const pure = e[0] === 1 && e[5] === 1 && e[10] === 1 && e[1] === 0 && e[2] === 0 && e[4] === 0 && e[6] === 0 && e[8] === 0 && e[9] === 0;
    if (!pure) { // Normalen mit der Normalenmatrix (richtig auch bei ungleichmäßiger Skalierung)
      const ne = _nm.getNormalMatrix(m).elements; n = new Float32Array(cnt);
      for (let i = 0; i < cnt; i += 3) {
        const x = N[i], y = N[i + 1], z = N[i + 2];
        let X = ne[0] * x + ne[3] * y + ne[6] * z, Y = ne[1] * x + ne[4] * y + ne[7] * z, Z = ne[2] * x + ne[5] * y + ne[8] * z;
        const l = Math.hypot(X, Y, Z); if (l > 0) { X /= l; Y /= l; Z /= l; }
        n[i] = X; n[i + 1] = Y; n[i + 2] = Z;
      }
    }
    let list = this.m.get(mat); if (!list) this.m.set(mat, list = []);
    list.push({ p, n, u: t.u, x0, x1, y0, y1, z0, z1 });
    this.calls++;
    return this;
  }
  add(mat, geo, local) {
    const g = geo.index ? geo.toNonIndexed() : geo, A = g.attributes;
    const u = A.uv ? A.uv.array : new Float32Array(A.position.count * 2);
    const n = A.normal ? A.normal.array : (g.computeVertexNormals(), g.attributes.normal.array);
    return this._put(mat, { p: A.position.array, n, u }, local);
  }
  box(mat, sx, sy, sz, x, y, z, ry = 0) {
    _l.makeRotationY(ry).scale(_s.set(sx, sy, sz)).setPosition(x, y, z);
    return this._put(mat, tpl('box', () => new THREE.BoxGeometry(1, 1, 1)), _l);
  }
  bb(mat, x0, x1, y0, y1, z0, z1) {
    return this.box(mat, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }
  beam(mat, a, b, w = 0.05, h = w) {
    const len = _d.subVectors(b, a).length(); if (len < 1e-5) return this;
    _q.setFromUnitVectors(ZA, _d.multiplyScalar(1 / len));
    _l.compose(_v.addVectors(a, b).multiplyScalar(0.5), _q, _s.set(w, h, len));
    return this._put(mat, tpl('box', () => new THREE.BoxGeometry(1, 1, 1)), _l);
  }
  cyl(mat, a, b, r = 0.03, seg = 8, r2 = r) {
    const len = _d.subVectors(b, a).length(); if (len < 1e-5) return this;
    _q.setFromUnitVectors(YA, _d.multiplyScalar(1 / len));
    // Einheitskegel: Radius 1 unten (bei a), k oben; läuft er unten spitz zu, wird über den oberen Radius skaliert
    let t, R;
    if (r !== 0) { R = r; const k = r2 / r; t = tpl('cyl|' + seg + '|' + k, () => new THREE.CylinderGeometry(k, 1, 1, seg)); }
    else if (r2 !== 0) { R = r2; t = tpl('cone0|' + seg, () => new THREE.CylinderGeometry(1, 0, 1, seg)); }
    else return this;
    _l.compose(_v.addVectors(a, b).multiplyScalar(0.5), _q, _s.set(R, len, R));
    return this._put(mat, t, _l);
  }
  vcyl(mat, r, h, x, y, z, seg = 12, r2 = r) { // stehender Zylinder, y = Unterkante
    return this.cyl(mat, V(x, y, z), V(x, y + h, z), r, seg, r2);
  }
  /** weicher Bodenschatten unter Möbeln */
  shadow(mat, x, y, z, w, d) {
    const t = tpl('shadow', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    return this._put(mat, t, _l.makeScale(w, 1, d).setPosition(x, y + 0.006, z));
  }
  torus(mat, R, r, x, y, z, axis = 'y', seg = 16) {
    const m = _l.identity();
    if (axis === 'y') m.makeRotationX(Math.PI / 2); else if (axis === 'x') m.makeRotationY(Math.PI / 2);
    m.scale(_s.setScalar(R)).setPosition(x, y, z);
    return this._put(mat, tpl('torus|' + seg + '|' + r / R, () => new THREE.TorusGeometry(1, r / R, 6, seg)), m);
  }
  sph(mat, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) {
    _l.makeScale(sx * r, sy * r, sz * r).setPosition(x, y, z);
    return this._put(mat, tpl('sph|' + seg, () => new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1))), _l);
  }
  /** groups: { tag: THREE.Group } für die Varianten; alles Übrige kommt nach parent. */
  build(parent, groups = {}) { for (const _ of this.steps(parent, groups)); } // eslint-disable-line no-unused-vars
  /** wie build, aber als Generator: liefert nach jedem Material den Anteil der erledigten Arbeit (0…1), damit der Aufbau gestaffelt werden kann */
  *steps(parent, groups = {}) {
    let total = 0, done = 0;
    for (const map of this.maps.values()) total += map.size;
    for (const [tag, map] of this.maps) {
      for (const k of this._build(map, tag ? groups[tag] || parent : parent, parent)) { done++; yield done / Math.max(1, total); }
      map.clear();
    }
  }
  *_build(map, parent, lodRoot) {
    // Je Material in 15-m-Abschnitte längs des Schiffs teilen (Sichtfeld-Auslese) und nach Größe staffeln:
    // Kleinteile (Klasse 2) und mittlere Teile (Klasse 1) werden ab einer Entfernung ausgeblendet.
    const BIN = 15, lod = lodRoot.userData.lod || (lodRoot.userData.lod = []);
    for (const [mat, list] of map) {
      const bins = new Map(), uv = needsUV(mat);
      const put = (k, item, verts) => { let b = bins.get(k); if (!b) bins.set(k, b = { items: [], n: 0 }); b.items.push(item); b.n += verts; };
      const cls = (d, fine, mid) => (mat.transparent ? 0 : d < fine ? 2 : d < mid ? 1 : 0);
      for (const e of list) {
        const dx = e.x1 - e.x0, dy = e.y1 - e.y0, dz = e.z1 - e.z0;
        if (dx <= BIN * 1.5) { put(Math.floor((e.x0 + e.x1) / 2 / BIN) + '|' + cls(Math.hypot(dx, dy, dz), 0.4, 2.2), { e }, e.p.length / 3); continue; }
        // lange, bereits zusammengefasste Geometrie dreiecksweise aufteilen
        const P = e.p, parts = new Map();
        for (let t = 0, nt = P.length / 9; t < nt; t++) {
          const o = t * 9;
          const ext = Math.max(Math.abs(P[o] - P[o + 3]), Math.abs(P[o + 1] - P[o + 4]), Math.abs(P[o + 2] - P[o + 5]), Math.abs(P[o] - P[o + 6]), Math.abs(P[o + 1] - P[o + 7]), Math.abs(P[o + 2] - P[o + 8]));
          const k = Math.floor((P[o] + P[o + 3] + P[o + 6]) / 3 / BIN) + '|' + cls(ext, 0.1, 0.9);
          let a = parts.get(k); if (!a) parts.set(k, a = []); a.push(t);
        }
        for (const [k, tris] of parts) put(k, { e, tris }, tris.length * 3);
      }
      for (const [key, bin] of bins) {
        if (!bin.n) continue;
        // direkt in die Zielpuffer kopieren (statt Zwischengeometrien und mergeGeometries)
        const pos = new Float32Array(bin.n * 3), nor = new Float32Array(bin.n * 3), uvs = uv ? new Float32Array(bin.n * 2) : null;
        let o3 = 0, o2 = 0;
        for (const { e, tris } of bin.items) {
          if (!tris) {
            pos.set(e.p, o3); nor.set(e.n, o3); if (uvs) uvs.set(e.u, o2);
            o3 += e.p.length; o2 += e.p.length / 3 * 2; continue;
          }
          for (const t of tris) {
            pos.set(e.p.subarray(t * 9, t * 9 + 9), o3); nor.set(e.n.subarray(t * 9, t * 9 + 9), o3); o3 += 9;
            if (uvs) uvs.set(e.u.subarray(t * 6, t * 6 + 6), o2); o2 += 6;
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        if (uvs) { g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); if (mat.userData.wuv) worldUV(g, mat.userData.wuv); }
        const mesh = new THREE.Mesh(g, mat), c = +key.split('|')[1];
        if (mat.transparent) mesh.renderOrder = 2;
        mesh.userData.built = true; // statische Builder-Geometrie (darf nach dem Hochladen aus dem Arbeitsspeicher)
        g.computeBoundingSphere(); g.computeBoundingBox();
        if (c > 0) { mesh.userData.lodC = g.boundingSphere.center.clone(); mesh.userData.lodR = g.boundingSphere.radius; mesh.userData.lodK = c; lod.push(mesh); }
        parent.add(mesh);
      }
      list.length = 0;
      yield mat;
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
