import * as THREE from 'three';
import { canvasTex, rng } from './util.js';

export const TIMES = [
  { name: 'Morgen', sun: [0.75, 0.22, -0.6], sunCol: 0xffd2a0, sunI: 2.2, top: 0x3f74b8, hor: 0xf0c08c, hemi: 1.5, fill: 0.8, hemiSky: 0xffe9cf, sea: 0x2c4f66, sea2: 0x6f8f9a, glow: 0.55, cloud: 0xffe6d0, exp: 1.0 },
  { name: 'Mittag', sun: [0.25, 0.9, -0.35], sunCol: 0xfff4e0, sunI: 2.8, top: 0x1b57b0, hor: 0x9cc3e6, hemi: 1.75, fill: 0.95, hemiSky: 0xf4f6ff, sea: 0x1f4f72, sea2: 0x4f86a6, glow: 0.7, cloud: 0xffffff, exp: 1.0 },
  { name: 'Abend', sun: [-0.8, 0.12, 0.55], sunCol: 0xff9a55, sunI: 2.0, top: 0x3b4f8a, hor: 0xf2a064, hemi: 1.3, fill: 0.75, hemiSky: 0xffd0a8, sea: 0x2a3a55, sea2: 0x9a6a55, glow: 0.4, cloud: 0xffc09a, exp: 1.0 },
  { name: 'Nacht', sun: [0.3, 0.6, 0.6], sunCol: 0x8fa6d8, sunI: 0.35, top: 0x05070f, hor: 0x16203a, hemi: 0.8, fill: 0.2, hemiSky: 0xffdca8, sea: 0x050b16, sea2: 0x13233a, glow: 0.05, cloud: 0x2a344a, exp: 0.95 },
];

export function buildWorld(scene, mobile) {
  const U = {
    top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() },
    sea: { value: new THREE.Color() }, sea2: { value: new THREE.Color() }, time: { value: 0 }, night: { value: 0 }, drift: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `precision highp float; varying vec3 vD; uniform vec3 top,hor,sunDir,sunCol; uniform float night;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      void main(){ vec3 d=normalize(vD); float t=pow(clamp(d.y*1.15+0.03,0.0,1.0),0.42);
        vec3 c=mix(hor,top,t); if(d.y<0.0) c=mix(hor,hor*0.85,clamp(-d.y*4.0,0.0,1.0));
        float s=max(dot(d,normalize(sunDir)),0.0); c+=sunCol*(pow(s,900.0)*3.0+pow(s,12.0)*0.25*(1.0-night));
        if(night>0.5 && d.y>0.0){ vec2 g=floor(d.xz/(abs(d.y)+0.25)*90.0); float r=h21(g); c+=vec3(step(0.992,r))*(0.5+0.5*h21(g+3.1)); }
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  // Umgebung (Meer, Wolken) als Gruppe um die Schiffsmitte: lässt sich für die Längsneigung kippen
  const env = new THREE.Group(); env.position.set(122, 0, 0); scene.add(env);

  // depthWrite aus: das Meer liegt ohnehin hinter allem; so bleibt seine Fläche in der Tiefe „leer“ und bekommt
  // (wie bisher) keine Umgebungsverschattung, seit GTAO die Tiefe des normalen Durchgangs mitbenutzt
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.ShaderMaterial({
    uniforms: U, fog: false, depthWrite: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform vec3 sea,sea2,hor,sunDir,sunCol; uniform float time,night,drift;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p=vW.xz+vec2(drift,time*3.0);
        float n=vn(p*0.004)*0.5+vn(p*0.013+7.0)*0.3+vn(p*0.05+time*0.15)*0.2;
        float w=vn(p*vec2(0.11,0.3)+time*0.5);
        vec3 c=mix(sea,sea2,smoothstep(0.25,0.8,n));
        c+=vec3(1.0)*smoothstep(0.8,0.92,w*n*1.6)*0.35*(1.0-night);
        vec3 v=normalize(vW-cameraPosition); vec3 r=reflect(v,vec3(0,1,0)); float s=max(dot(r,normalize(sunDir)),0.0);
        c+=sunCol*pow(s,60.0)*(0.25+0.5*w);
        float d=length(vW.xz-cameraPosition.xz); c=mix(c,hor*0.92,1.0-exp(-d*0.00022));
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -300; ocean.frustumCulled = false; env.add(ocean);

  // Wolken
  const puff = canvasTex(256, 128, (g, w, h) => {
    const r = rng(11); g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = 40 + r() * (w - 80), y = h * 0.62 - r() * h * 0.3 * (1 - Math.abs(x - w / 2) / (w / 2)), rad = 18 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
  }, { repeat: false });
  // Alle Wolken in EINEM Mesh (ein Zeichenaufruf statt einem je Sprite): je Wolke ein zur Kamera gedrehtes Rechteck,
  // jedes Bild von hinten nach vorn sortiert wie zuvor die einzelnen Sprites. Aussehen wie SpriteMaterial (Farbe × Textur).
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: puff }, color: { value: new THREE.Color(0xffffff) } }, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'attribute vec3 ctr; attribute vec2 ofs; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(ctr, 1.0); mv.xy += ofs; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform sampler2D map; uniform vec3 color; varying vec2 vUv;
      void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(color * t.rgb, t.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const clouds = [], r = rng(77), N = mobile ? 60 : 150, SPAN = 6000;
  for (let i = 0; i < N; i++) {
    const high = r() < 0.2, sc = high ? 400 + r() * 700 : 180 + r() * 330;
    let z = (r() - 0.5) * SPAN; if (!high && Math.abs(z) < 160) z += Math.sign(z || 1) * 220;
    const c = { position: new THREE.Vector3((r() - 0.5) * SPAN, high ? 500 + r() * 900 : -215 + r() * 100, z), scale: new THREE.Vector2(sc, sc * (high ? 0.28 : 0.32)), visible: true, userData: {}, d: 0 };
    c.userData.y0 = c.position.y; clouds.push(c);
  }
  const cg = new THREE.BufferGeometry(), cCtr = new Float32Array(N * 12), cOfs = new Float32Array(N * 8), cUv = new Float32Array(N * 8), cIdx = [];
  for (let i = 0; i < N; i++) { cUv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); const v = i * 4; cIdx.push(v, v + 1, v + 2, v, v + 2, v + 3); }
  cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 12), 3)); // nur für three.js; gezeichnet wird über ctr/ofs
  cg.setAttribute('ctr', new THREE.BufferAttribute(cCtr, 3).setUsage(THREE.DynamicDrawUsage));
  cg.setAttribute('ofs', new THREE.BufferAttribute(cOfs, 2).setUsage(THREE.DynamicDrawUsage));
  cg.setAttribute('uv', new THREE.BufferAttribute(cUv, 2)); cg.setIndex(cIdx);
  const cloudMesh = new THREE.Mesh(cg, cloudMat); cloudMesh.frustumCulled = false; cloudMesh.renderOrder = -5; env.add(cloudMesh);
  const order = [], _cp = new THREE.Vector3();
  function writeClouds(cam) {
    // Kameraposition im System der Umgebungsgruppe; Abstand fürs Sortieren (hinten zuerst)
    env.updateMatrixWorld(); _cp.copy(cam.position); env.worldToLocal(_cp);
    order.length = 0; for (const c of clouds) if (c.visible) { c.d = c.position.distanceToSquared(_cp); order.push(c); }
    order.sort((a, b) => b.d - a.d);
    for (let i = 0; i < order.length; i++) {
      const c = order[i], p = c.position, w = c.scale.x / 2, h = c.scale.y / 2;
      for (let k = 0; k < 4; k++) { cCtr[i * 12 + k * 3] = p.x; cCtr[i * 12 + k * 3 + 1] = p.y; cCtr[i * 12 + k * 3 + 2] = p.z; }
      cOfs.set([-w, -h, w, -h, w, h, -w, h], i * 8);
    }
    cg.attributes.ctr.needsUpdate = true; cg.attributes.ofs.needsUpdate = true; cg.setDrawRange(0, order.length * 6);
    cloudMesh.visible = order.length > 0;
  }

  // Spiegelungsumgebung aus dem Himmel (für Metall, Glas, polierte Böden); je Tageszeit neu erzeugt
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(sky.geometry, sky.material));
  let pmrem = null, envRT = null;
  const makeEnv = (renderer) => {
    if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0, 1, 20000);
    scene.environment = rt.texture; if (envRT) envRT.dispose(); envRT = rt;
  };
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb5a68c, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); scene.add(sun);
  // ein Schattenbild für das ganze Schiff; es wird nur beim Wechsel der Tageszeit neu berechnet
  const CEN = new THREE.Vector3(122, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
  { const c = sun.shadow.camera; c.left = -85; c.right = 85; c.top = 150; c.bottom = -132; /* breit genug für Mast, Fahrzeuge und Boden in der Mastszene */ c.near = 20; c.far = 460; c.up.set(1, 0, 0); }
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.1; sun.target.position.copy(CEN); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); scene.add(fill);

  const api = {
    idx: 1, sun, clouds,
    set(i, M, renderer) {
      api.idx = i; const t = TIMES[i];
      U.top.value.set(t.top); U.hor.value.set(t.hor); api._base = new THREE.Vector3(...t.sun).normalize(); U.sunDir.value.copy(api._base); U.sunCol.value.set(t.sunCol);
      U.sea.value.set(t.sea); U.sea2.value.set(t.sea2); U.night.value = i === 3 ? 1 : 0;
      sun.color.set(t.sunCol); sun.intensity = t.sunI; 
      fill.intensity = i === 3 ? 0.2 : t.fill;
      hemi.intensity = t.hemi; hemi.color.set(t.hemiSky);
      cloudMat.uniforms.color.value.set(t.cloud);
      M.hullIn.emissive.set(0x574a34).multiplyScalar(t.glow / 0.7);
      M.cell.emissive.set(0x3a3222).multiplyScalar(t.glow / 0.7);
      M.lamp.color.set(i === 3 || i === 2 ? 0xfff1cc : 0xf2ead8);
      renderer.toneMappingExposure = t.exp;
      api.applySun(api._h || 0, renderer);
      makeEnv(renderer); scene.environmentIntensity = i === 3 ? 0.25 : 0.55;
    },
    /** sim: { speed m/s, alt m, pitch rad, heading rad, mode 'flug'|'mast' } */
    update(dt, cam, sim = { speed: 34, alt: 300, pitch: 0, heading: 0, mode: 'flug' }) {
      U.time.value += dt; U.drift.value += sim.speed * dt;
      sky.position.copy(cam.position);
      const fly = sim.mode !== 'mast', lx = cam.position.x - 122;
      ocean.visible = fly; ocean.position.set(lx, -sim.alt, cam.position.z);
      env.rotation.z = fly ? -sim.pitch : 0;
      for (const c of clouds) {
        c.position.x -= sim.speed * dt; if (c.position.x < lx - SPAN / 2) c.position.x += SPAN;
        c.position.y = c.userData.y0 + (300 - sim.alt); c.visible = fly ? c.position.y < -40 || c.position.y > 200 : c.userData.y0 > 200;
      }
      writeClouds(cam);
      // Kursänderung dreht den Sonnenstand; das Schattenbild wird dabei nur gelegentlich erneuert
      api._t = (api._t || 0) + dt;
      if (api._r && Math.abs(sim.heading - api._h) > 0.035 && api._t > 0.5) { api._t = 0; api.applySun(sim.heading, api._r); }
    },
    applySun(h, renderer) {
      api._h = h; api._r = renderer;
      const b = api._base, c = Math.cos(h), s = Math.sin(h);
      U.sunDir.value.set(b.x * c - b.z * s, b.y, b.x * s + b.z * c);
      sun.position.copy(CEN).addScaledVector(U.sunDir.value, 240);
      fill.position.set(-U.sunDir.value.x, 0.4, -U.sunDir.value.z).multiplyScalar(100);
      renderer.shadowMap.needsUpdate = true; if (api.onShadow) api.onShadow();
    },
  };
  return api;
}
