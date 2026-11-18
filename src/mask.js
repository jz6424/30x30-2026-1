// Scroll-driven 3D LED face mask.
//
// Loads the Blender model named by <canvas data-model>, and falls back to a
// procedural stand-in (a face-shaped shell with eye and mouth openings). Either
// way the LEDs sit only on the inside (face side) and change color as the
// visitor scrolls through each light chapter.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, BufferGeometry,
  Float32BufferAttribute, MeshPhysicalMaterial, Mesh, DoubleSide, Color,
  Points, PointsMaterial, AdditiveBlending, CanvasTexture, PMREMGenerator,
  DirectionalLight, PointLight, InstancedMesh, CircleGeometry,
  MeshBasicMaterial, Object3D, Vector3, ACESFilmicToneMapping, SRGBColorSpace, Box3,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('mask-canvas');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}


/* ---------- face shell geometry ---------- */

const H = 1.32;                       // half height of the mask
const EYES = [[-0.34, 0.2], [0.34, 0.2]];
const holeEye = (x, y) => EYES.some(([ex, ey]) => ((x - ex) / 0.17) ** 2 + ((y - ey) / 0.085) ** 2 < 1);
const holeMouth = (x, y) => (x / 0.21) ** 2 + ((y + 0.7) / 0.06) ** 2 < 1;
const isHole = (x, y) => holeEye(x, y) || holeMouth(x, y);

function halfWidth(t) {               // t in [-1, 1] bottom..top
  const base = 0.94 * Math.pow(Math.max(0, 1 - Math.abs(t) ** 3.2), 0.5);
  return t < 0 ? base * (1 - 0.22 * t * t) : base;
}

function depth(x, y) {
  const nx = x / 0.98;
  let z = 0.85 * Math.pow(Math.max(0, 1 - nx * nx), 0.6) - 0.22 * (y / H) ** 2;
  // nose ridge rising towards the tip
  const ridge = Math.exp(-(((y + 0.12) / 0.3) ** 2)) * (1 - Math.max(0, (y - 0.1)) * 1.4);
  z += 0.2 * Math.exp(-((x / 0.11) ** 2)) * Math.max(0, ridge);
  // eye sockets and brow
  for (const [ex, ey] of EYES) {
    z -= 0.06 * Math.exp(-(((x - ex) / 0.2) ** 2 + ((y - ey) / 0.14) ** 2));
    z += 0.03 * Math.exp(-(((x - ex) / 0.24) ** 2 + ((y - ey - 0.2) / 0.07) ** 2));
  }
  // cheeks and lips
  z += 0.04 * Math.exp(-(((Math.abs(x) - 0.42) / 0.2) ** 2 + ((y + 0.15) / 0.2) ** 2));
  z += 0.035 * Math.exp(-((x / 0.22) ** 2 + ((y + 0.7) / 0.1) ** 2));
  return z;
}

function surfacePoint(s, t, out) {
  const y = t * H;
  const x = s * halfWidth(t);
  out.set(x, y, depth(x, y));
  return out;
}

function buildShell() {
  const NS = 140, NT = 180;
  const pos = [], idx = [];
  const p = new Vector3();
  for (let j = 0; j <= NT; j++) {
    for (let i = 0; i <= NS; i++) {
      surfacePoint(-1 + (2 * i) / NS, -0.985 + (1.97 * j) / NT, p);
      pos.push(p.x, p.y, p.z);
    }
  }
  const row = NS + 1;
  for (let j = 0; j < NT; j++) {
    for (let i = 0; i < NS; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function ledLayout() {
  // hex-ish grid of LED clusters across the shell, avoiding openings and edges
  const pts = [], normals = [];
  const p = new Vector3(), px = new Vector3(), py = new Vector3();
  const step = 0.085;
  let r = 0;
  for (let t = -0.88; t <= 0.9; t += step * 0.86, r++) {
    for (let s = -0.86 + (r % 2) * step / 2; s <= 0.86; s += step) {
      surfacePoint(s, t, p);
      if (isHole(p.x, p.y)) continue;
      // keep a margin around openings
      if (isHole(p.x * 0.92, p.y) || isHole(p.x, p.y + 0.04) || isHole(p.x, p.y - 0.04)) continue;
      surfacePoint(s + 0.01, t, px).sub(p);
      surfacePoint(s, t + 0.01, py).sub(p);
      const n = new Vector3().crossVectors(px, py).normalize();
      pts.push(p.clone().addScaledVector(n, 0.006));
      normals.push(n);
    }
  }
  return { pts, normals };
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

/* ---------- procedural stand-in ---------- */

function buildProcedural(shellMat, ledMat, glowMat) {
  const group = new Group();
  // cut eye and mouth openings per pixel so their edges stay smooth
  const mat = shellMat.clone();
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec2 vFace;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n vFace = position.xy;');
    sh.fragmentShader = 'varying vec2 vFace;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      vec2 l = (vFace - vec2(-0.34, 0.2)) / vec2(0.17, 0.085);
      vec2 r = (vFace - vec2(0.34, 0.2)) / vec2(0.17, 0.085);
      vec2 m = (vFace - vec2(0.0, -0.7)) / vec2(0.21, 0.06);
      if (min(min(dot(l, l), dot(r, r)), dot(m, m)) < 1.0) discard;`);
  };
  group.add(new Mesh(buildShell(), mat));

  // LEDs only on the inside (face side) of the shell, like the real mask
  const { pts, normals } = ledLayout();
  const leds = new InstancedMesh(new CircleGeometry(0.019, 10), ledMat, pts.length);
  const dummy = new Object3D();
  pts.forEach((p, i) => {
    dummy.position.copy(p).addScaledVector(normals[i], -0.018);
    dummy.lookAt(dummy.position.clone().addScaledVector(normals[i], -1));
    dummy.updateMatrix();
    leds.setMatrixAt(i, dummy.matrix);
  });
  group.add(leds);
  const glowGeo = new BufferGeometry().setFromPoints(pts.map((p, i) => p.clone().addScaledVector(normals[i], -0.04)));
  group.add(new Points(glowGeo, glowMat));
  return group;
}

/* ---------- Blender model ---------- */

function prepareModel(root, shellMat, ledMat, glowMat, rotY) {
  const group = new Group();
  root.updateMatrixWorld(true);
  const glowPts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const matName = [].concat(o.material).map((m) => m?.name || '').join(' ');
    if (/led/i.test(o.name) || /led/i.test(o.parent?.name || '') || /led_emissive/i.test(matName)) {
      o.material = ledMat;
      const pos = o.geometry.attributes.position;
      const stride = Math.max(1, Math.round(pos.count / 900));
      for (let i = 0; i < pos.count; i += stride) {
        glowPts.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
      }
    } else if (o.material && !o.material.isMeshStandardMaterial) {
      o.material = shellMat;   // keep the model's own PBR materials (white shell, gold visor)
    }
  });
  group.add(root);
  if (glowPts.length) {
    const g = new Points(new BufferGeometry().setFromPoints(glowPts), glowMat);
    group.add(g);
  }
  // normalise: centre the mask and make it 2.64 units tall like the stand-in
  const box = new Box3().setFromObject(group);
  const size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
  const k = 2.64 / size.y;
  const wrap = new Group();
  group.position.sub(centre);
  wrap.add(group);
  wrap.scale.setScalar(k);
  if (rotY) wrap.rotation.y = parseFloat(rotY);
  return wrap;
}

/* ---------- scene ---------- */

function init() {
  const isSmall = matchMedia('(max-width: 820px)').matches;
  const renderer = new WebGLRenderer({ canvas, antialias: !isSmall, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall ? 1.5 : 1.75));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const rig = new Group();          // scroll position / scale
  const mask = new Group();         // rotation
  rig.add(mask);
  scene.add(rig);

  const shellMat = new MeshPhysicalMaterial({
    color: 0xf4f0eb, roughness: 0.32, metalness: 0, clearcoat: 0.8,
    clearcoatRoughness: 0.18, side: DoubleSide, sheen: 0.4, sheenColor: new Color(0xffffff),
    emissive: 0xff3030, emissiveIntensity: 0.05,   // faint light bleeding through the silicone
  });
  const ledMat = new MeshBasicMaterial({ color: 0xff3030, toneMapped: false, side: DoubleSide });
  const glowMat = new PointsMaterial({
    size: isSmall ? 0.2 : 0.17, map: glowTexture(), color: 0xff3030, transparent: true,
    opacity: 0.55, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });

  const procedural = buildProcedural(shellMat, ledMat, glowMat);
  mask.add(procedural);

  // A real model (exported from Blender) replaces the coded stand-in when the
  // canvas names one: <canvas id="mask-canvas" data-model="assets/models/halo-mask.glb">
  if (canvas.dataset.model) {
    new GLTFLoader().load(new URL(canvas.dataset.model, document.baseURI).href, (gltf) => {
      mask.remove(procedural);
      mask.add(prepareModel(gltf.scene, shellMat, ledMat, glowMat, canvas.dataset.modelRot));
    }, undefined, () => { /* keep the stand-in */ });
  }

  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xffe6d6, 0.8);
  rim.position.set(-4, 1, -3);
  scene.add(rim);
  // the LEDs sit on the face side, so their light comes from inside the mask
  const bounce = new PointLight(0xff3030, 5, 4, 1.4);
  bounce.position.set(0, 0, -0.9);
  mask.add(bounce);

  /* ---------- scroll keyframes ---------- */

  const COLORS = {
    red: new Color('#ff2f3a'), orange: new Color('#ff8a2a'), blue: new Color('#3b6dff'),
    tri: new Color('#ff5a6e'), white: new Color('#fff1e6'),
  };
  const frames = [...document.querySelectorAll('[data-mask]')].map((el) => {
    const d = el.dataset;
    return {
      el,
      color: d.mask,
      x: parseFloat(d.maskX ?? 0),
      y: parseFloat(d.maskY ?? 0),
      rot: parseFloat(d.maskRot ?? 0),
      tilt: parseFloat(d.maskTilt ?? 0),
      scale: parseFloat(d.maskScale ?? 1),
      opacity: parseFloat(d.maskOpacity ?? 1),
    };
  });

  const state = { x: 0, y: 0, rot: 0, tilt: 0, scale: 1, opacity: 1, color: COLORS.red.clone() };
  const target = { ...state, color: COLORS.red.clone() };
  const tmpA = new Color(), tmpB = new Color();
  const smooth = (t) => t * t * (3 - 2 * t);

  function readScroll() {
    if (!frames.length) return;
    const mid = innerHeight * 0.5;
    const centers = frames.map((f) => {
      const r = f.el.getBoundingClientRect();
      return r.top + Math.min(r.height, innerHeight) * 0.5;
    });
    let i = 0;
    while (i < frames.length - 1 && centers[i + 1] <= mid) i++;
    const a = frames[i], b = frames[Math.min(i + 1, frames.length - 1)];
    let t = 0;
    if (a !== b) t = Math.min(1, Math.max(0, (mid - centers[i]) / (centers[i + 1] - centers[i] || 1)));
    if (centers[0] > mid) t = 0;
    t = smooth(t);
    const lerp = (k) => a[k] + (b[k] - a[k]) * t;
    target.x = lerp('x'); target.y = lerp('y'); target.rot = lerp('rot');
    target.tilt = lerp('tilt'); target.scale = lerp('scale'); target.opacity = lerp('opacity');
    tmpA.copy(COLORS[a.color] || COLORS.red);
    tmpB.copy(COLORS[b.color] || COLORS.red);
    target.color.copy(tmpA.lerp(tmpB, t));
  }

  let pointerX = 0, pointerY = 0;
  if (!reduceMotion) {
    addEventListener('pointermove', (e) => {
      pointerX = (e.clientX / innerWidth - 0.5) * 2;
      pointerY = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the mask a sensible size on portrait screens
    camera.fov = w / h < 0.8 ? 42 : 30;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });

  const root = document.documentElement;
  let last = performance.now();
  let running = false;
  function loop() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  function frame(now) {
    running = false;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readScroll();
    const k = 1 - Math.pow(0.0025, dt);   // frame-rate independent easing
    const mobile = innerWidth < 820;
    state.x += ((mobile ? 0 : target.x) - state.x) * k;
    state.y += ((mobile ? target.y * 0.3 + 0.95 : target.y) - state.y) * k;
    state.rot += (target.rot - state.rot) * k;
    state.tilt += (target.tilt - state.tilt) * k;
    state.scale += ((mobile ? target.scale * 0.75 : target.scale) - state.scale) * k;
    state.opacity += (target.opacity - state.opacity) * k;
    state.color.lerp(target.color, k);

    const idle = reduceMotion ? 0 : Math.sin(now / 1600) * 0.06;
    rig.position.set(state.x, state.y + idle * 0.3, 0);
    rig.scale.setScalar(state.scale);
    mask.rotation.set(state.tilt + pointerY * 0.08, state.rot + pointerX * 0.18 + idle, 0);

    ledMat.color.copy(state.color);
    glowMat.color.copy(state.color);
    bounce.color.copy(state.color);
    const pulse = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(now / 420);
    glowMat.opacity = 0.55 * pulse;
    canvas.style.opacity = state.opacity.toFixed(3);
    root.style.setProperty('--led', `#${state.color.getHexString()}`);

    if (state.opacity > 0.01) renderer.render(scene, camera);
    loop();
  }
  loop();
  canvas.classList.add('is-ready');
  document.documentElement.classList.add('has-webgl');
}

if (canvas && supportsWebGL()) init();
else document.documentElement.classList.add('no-webgl');
