import * as THREE from 'three';
import { canvasTex, rng } from './util.js';

function speckle(base, n, lo, hi, seed, len = 1) {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const v = Math.floor(lo + r() * (hi - lo));
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.fillRect(r() * w, r() * h, 1 + r() * len, 1);
    }
  });
}

export function makeMats() {
  const weave = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,110,95,0.07)'; g.lineWidth = 1;
    for (let i = 0; i < w; i += 4) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, h); g.stroke(); g.beginPath(); g.moveTo(0, i + .5); g.lineTo(w, i + .5); g.stroke(); }
  });
  const lino = speckle('#f4f4f4', 900, 190, 255, 3, 3);
  const carpet = speckle('#e6e6e6', 2600, 150, 255, 5, 1);
  const wood = canvasTex(128, 128, (g, w, h) => {
    const r = rng(9); g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const v = 170 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(0, r() * h, w, 1 + r() * 2); }
  });
  const plank = canvasTex(128, 128, (g, w, h) => {
    const r = rng(4); g.fillStyle = '#eee'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { const v = 180 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(0, r() * h, w, 1); }
    g.fillStyle = 'rgba(40,30,20,0.55)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32, w, 2);
  });
  const hullTex = canvasTex(256, 128, (g, w, h) => {
    const r = rng(7); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const v = 215 + r() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(r() * w, r() * h, 2 + r() * 10, 1); }
    g.fillStyle = 'rgba(90,90,95,0.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
    g.fillStyle = 'rgba(90,90,95,0.18)'; g.fillRect(0, 0, 2, h); g.fillRect(w / 2, 0, 1, h);
  });
  const truss = canvasTex(128, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#c3cbd3'; g.lineCap = 'square';
    g.lineWidth = 9; g.beginPath(); g.moveTo(0, 5); g.lineTo(w, 5); g.moveTo(0, h - 5); g.lineTo(w, h - 5); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(0, h - 5); g.lineTo(w / 4, 5); g.lineTo(w / 2, h - 5); g.lineTo(3 * w / 4, 5); g.lineTo(w, h - 5); g.stroke();
  });

  const L = (color, map, wuv, o = {}) => { const m = new THREE.MeshLambertMaterial({ color, map: map || null, ...o }); if (wuv) m.userData.wuv = wuv; return m; };
  // Metalle und glänzende Flächen: spiegeln den Himmel (scene.environment), Rauheit bestimmt die Schärfe
  const P = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.5, envMapIntensity: 0.2, ...o });
  const G = (color, map, wuv, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, map: map || null, metalness: 0, roughness: 0.6, envMapIntensity: 0.12, ...o }); if (wuv) m.userData.wuv = wuv; return m; };

  const M = {
    // Wände, Böden, Decken
    wallCream: L(0xe9dfc6, weave, 0.35), wallBlue: L(0xbfcfd6, weave, 0.35), wallGrey: L(0xcfcfc6, weave, 0.35),
    wallPeach: L(0xe6cdb0, weave, 0.35), wallGreen: L(0xc4d0b8, weave, 0.35), wallLeather: L(0xb98a4a, weave, 0.6),
    wallWhite: L(0xe6e6e0, weave, 0.35), tile: L(0xdfe6e6, plank, 0.6),
    ceil: L(0xf1ece0, null, 0, { emissive: 0x3a3832 }),
    linoLight: G(0xb9a98a, lino, 2), linoGreen: G(0x7f8f7c, lino, 2), linoRed: G(0x8a4a3a, lino, 2),
    carpetRed: L(0x7a3b33, carpet, 1), carpetBrown: L(0x6f5a44, carpet, 1), carpetBlue: L(0x3d5568, carpet, 1),
    canvas: L(0xcdbf9f, weave, 0.6, { side: THREE.DoubleSide }),
    // Möbel
    alu: P(0xc2c8cf, { roughness: 0.38 }), aluDark: P(0x8a8f8c, { metalness: 0, roughness: 0.85, envMapIntensity: 0.06 }) /* gestrichene Wandflächen: matt, nicht spiegelnd */, steel: P(0x4b5157, { roughness: 0.5 }), brass: P(0xb9954a, { roughness: 0.3, metalness: 0.85, envMapIntensity: 0.6 }),
    bronze: P(0x6b4a2a, { roughness: 0.45 }),
    wood: G(0x9a6a3c, wood, 1.2, { roughness: 0.55 }), woodDark: G(0x5a3a22, wood, 1.2, { roughness: 0.5 }), woodLight: G(0xc9a26b, wood, 1.2, { roughness: 0.55 }),
    upRed: G(0x9c3a2e, null, 0, { roughness: 0.75, envMapIntensity: 0.2 }), upBrown: G(0x6a4a34, null, 0, { roughness: 0.6, envMapIntensity: 0.3 }), upBlue: G(0x28384e, null, 0, { roughness: 0.5, envMapIntensity: 0.4 }), upGreen: G(0x4f6648, null, 0, { roughness: 0.75, envMapIntensity: 0.2 }),
    linen: L(0xf2efe6), blanket: L(0x8894a0), black: L(0x18181a), white: L(0xf4f4f0),
    crate: L(0xa58555, plank, 0.8), paper: L(0xefe8d2), rope: L(0xb7a57c), rubber: L(0x222222),
    pigskin: G(0xd9b96a, null, 0, { roughness: 0.6 }), enamel: G(0xf3f3ee, null, 0, { roughness: 0.3, envMapIntensity: 0.25 }),
    trim: G(0x6e5c46, wood, 1.2, { roughness: 0.5 }), frame: P(0xaeb5bc, { roughness: 0.4 }), curtain: L(0xb59a68, weave, 0.12), curtainBlue: L(0x6f8494, weave, 0.12),
    plant: L(0x3f6a3a), pot: L(0x9a5a3a), red: G(0xb3261c, null, 0, { roughness: 0.35, envMapIntensity: 0.6 }), cork: L(0xa9895c), tarp: L(0x6f7466, weave, 0.3), leather: G(0x2a2420, null, 0, { roughness: 0.45, envMapIntensity: 0.5 }),
    glassClear: new THREE.MeshStandardMaterial({ color: 0xdfeef2, transparent: true, opacity: 0.25, metalness: 0, roughness: 0.1, envMapIntensity: 0.5, depthWrite: false }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, { repeat: false }) }),
    navRed: new THREE.MeshBasicMaterial({ color: 0xff2a1a }), navGreen: new THREE.MeshBasicMaterial({ color: 0x22ff55 }), navWhite: new THREE.MeshBasicMaterial({ color: 0xffffee }),
    // Schiff
    plank: L(0xb89a6a, plank, 0.8), tank: P(0xaab2b9, { roughness: 0.5 }), sack: L(0x7a6a4c), hullSeam: L(0x8a8f96),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff1cc }),
    glass: new THREE.MeshStandardMaterial({ color: 0xcfe2ea, transparent: true, opacity: 0.12, metalness: 0, roughness: 0.08, envMapIntensity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    hullOut: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, map: hullTex, metalness: 0.35, roughness: 0.62, envMapIntensity: 0.3 }),
    hullOutDS: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, metalness: 0.35, roughness: 0.62, envMapIntensity: 0.3, side: THREE.DoubleSide }),
    hullIn: new THREE.MeshLambertMaterial({ color: 0xc9b891, map: hullTex, emissive: 0x574a34, side: THREE.BackSide }),
    truss: new THREE.MeshLambertMaterial({ color: 0xffffff, map: truss, alphaTest: 0.35, side: THREE.DoubleSide }),
    cell: new THREE.MeshLambertMaterial({ color: 0xdccb9e, emissive: 0x3a3222, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    wire: new THREE.LineBasicMaterial({ color: 0xa9b2ba, transparent: true, opacity: 0.45 }),
  };
  // world.js ändert die Farbe der Lampen je Tageszeit: nicht mit anderen Materialien zusammenlegen (siehe util.js)
  M.lamp.userData.noMerge = true;
  return M;
}
