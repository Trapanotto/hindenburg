import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Ich-Perspektive mit Tastatur/Maus und Touch (Joystick + Wischen), dazu freie Flugkamera. */
export class Player {
  constructor(camera, nav, canvas, joyEl) {
    this.cam = camera; this.nav = nav; this.canvas = canvas;
    this.pos = new THREE.Vector3(); this.h = 0; this.pitch = 0; this.eye = 1.65;
    this.fly = false; this.flyPos = new THREE.Vector3(); this.flyH = 0; this.flyPitch = 0;
    this.keys = {}; this.joy = { x: 0, y: 0 }; this.vert = 0; this.travel = null; this.enabled = false; this.zone = null; this.walked = 0;
    this.onKey = null;

    addEventListener('keydown', (e) => { if (e.repeat) return; this.keys[e.code] = true; if (this.onKey) this.onKey(e); });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });

    const ptr = new Map();
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (e.pointerType === 'mouse' && document.pointerLockElement !== canvas) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* ohne Zeigersperre: Ziehen zum Umsehen */ } }
      else if (e.pointerType !== 'mouse') canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === canvas) { this.look(e.movementX, e.movementY, 0.0022); return; }
      const p = ptr.get(e.pointerId); if (!p) return;
      this.look(e.clientX - p[0], e.clientY - p[1], e.pointerType === 'mouse' ? 0.004 : 0.0055);
      p[0] = e.clientX; p[1] = e.clientY;
    });
    const up = (e) => ptr.delete(e.pointerId);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', up);

    if (joyEl) {
      const knob = joyEl.firstElementChild; let id = null;
      const set = (e) => {
        const r = joyEl.getBoundingClientRect(), R = r.width / 2;
        let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        this.joy.x = x; this.joy.y = y; knob.style.transform = `translate(${x * R * 0.6}px,${y * R * 0.6}px)`;
      };
      joyEl.addEventListener('pointerdown', (e) => { id = e.pointerId; joyEl.setPointerCapture(id); set(e); e.preventDefault(); });
      joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
      const end = (e) => { if (e.pointerId !== id) return; id = null; this.joy.x = this.joy.y = 0; knob.style.transform = ''; };
      joyEl.addEventListener('pointerup', end); joyEl.addEventListener('pointercancel', end);
    }
  }
  look(dx, dy, k) {
    if (this.travel) return;
    if (this.fly) { this.flyH += dx * k; this.flyPitch = clamp(this.flyPitch - dy * k, -1.5, 1.5); }
    else { this.h += dx * k; this.pitch = clamp(this.pitch - dy * k, -1.45, 1.45); }
  }
  teleport(x, y, z, h) {
    this.fly = false; this.travel = null; this.pos.set(x, y, z);
    if (h != null) { this.h = h; this.pitch = 0; }
    const r = this.nav.ok(x, z, y, 0.25, true); if (r) { this.pos.y = r.h; this.zone = r.zn; }
  }
  climb(to) {
    const d = this.pos.distanceTo(to);
    this.travel = { from: this.pos.clone(), to: to.clone(), t: 0, dur: clamp(d / 3.2, 1.2, 7) };
  }
  setFly(on) {
    this.fly = on; this.travel = null;
    if (on) { this.flyPos.set(clamp(this.pos.x, 60, 190) + 25, 8, 150); this.flyH = -Math.PI / 2 - 0.25; this.flyPitch = -0.05; }
  }
  update(dt) {
    const K = this.keys;
    let f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) - this.joy.y;
    let s = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + this.joy.x;
    if (!this.enabled) f = s = 0;
    const run = K.ShiftLeft || K.ShiftRight || Math.hypot(this.joy.x, this.joy.y) > 0.92;

    if (this.fly) {
      const h = this.flyH, p = this.flyPitch, sp = (run ? 70 : 20) * dt;
      const v = (K.Space ? 1 : 0) - (K.KeyC ? 1 : 0) + this.vert;
      this.flyPos.x += (Math.cos(h) * Math.cos(p) * f - Math.sin(h) * s) * sp;
      this.flyPos.z += (Math.sin(h) * Math.cos(p) * f + Math.cos(h) * s) * sp;
      this.flyPos.y = clamp(this.flyPos.y + (Math.sin(p) * f + v) * sp, -285, 900);
      this.cam.position.copy(this.flyPos); this.cam.rotation.set(p, -h - Math.PI / 2, 0, 'YXZ');
      return;
    }
    if (this.travel) {
      const tr = this.travel; tr.t += dt / tr.dur; const k = Math.min(1, tr.t), e = k * k * (3 - 2 * k);
      this.pos.lerpVectors(tr.from, tr.to, e);
      if (k >= 1) { this.travel = null; const r = this.nav.ok(this.pos.x, this.pos.z, this.pos.y, 0.25, true); if (r) this.zone = r.zn; }
    } else {
      const sp = (run ? 4.6 : 2.3) * dt, l = Math.hypot(f, s) || 1, m = Math.min(1, Math.hypot(f, s));
      const dx = (Math.cos(this.h) * f - Math.sin(this.h) * s) / l * m * sp, dz = (Math.sin(this.h) * f + Math.cos(this.h) * s) / l * m * sp;
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-6) {
        const n = Math.ceil(dist / 0.04), stuck = !this.nav.ok(this.pos.x, this.pos.z, this.pos.y);
        for (let i = 0; i < n; i++) {
          const sx = dx / n, sz = dz / n, p = this.pos;
          // erst die volle Bewegung, sonst an der Wand entlanggleiten
          for (const [mx, mz] of [[sx, sz], [sx, 0], [0, sz]]) {
            const r = this.nav.ok(p.x + mx, p.z + mz, p.y, 0.25, stuck);
            if (r) { p.x += mx; p.z += mz; p.y = r.h; this.zone = r.zn; break; }
          }
        }
        this.walked += dist;
      }
    }
    this._ey = this._ey == null ? this.pos.y : this._ey + (this.pos.y - this._ey) * Math.min(1, dt * 14);
    if (Math.abs(this._ey - this.pos.y) > 3) this._ey = this.pos.y;
    const bob = Math.sin(this.walked * 5.2) * 0.022;
    this.cam.position.set(this.pos.x, this._ey + this.eye + bob, this.pos.z);
    this.cam.rotation.set(this.pitch, -this.h - Math.PI / 2, 0, 'YXZ');
  }
}
