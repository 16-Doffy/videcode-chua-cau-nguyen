// Animals and scenery. Each species listed in models/manifest.json is drawn from its .glb with its own animation;
// the low-poly shape models stand in for a species with no .glb, or when one fails to load.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { clone as cloneSkinned } from './vendor/SkeletonUtils.js';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = `${color}-${opts.rough ?? 0.85}-${opts.emissive ?? 0}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: 0, flatShading: true, emissive: opts.emissive ?? 0x000000 }));
  return mats.get(key);
}
const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
const sphere = (r, color, seg = 7) => new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0 + (seg > 7 ? 1 : 0)), mat(color));
const cyl = (rt, rb, h, color, seg = 6) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
const at = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; return m; };

// A four-legged body: torso, neck, head, legs that swing when it walks, a tail.
function quadruped({ body, belly, leg, head = body, len = 1.4, height = 1, thick = 0.7, neck = 0.3, neckUp = 0.2, headSize = 0.38, legLen = 0.7, tail = true, extras }) {
  const g = new THREE.Group();
  const torso = at(box(thick, height * 0.6, len, body), 0, legLen + height * 0.3, 0); g.add(torso);
  if (belly) g.add(at(box(thick * 0.8, height * 0.12, len * 0.8, belly), 0, legLen + 0.04, 0));
  const neckM = at(box(thick * 0.45, neck + 0.2, thick * 0.45, body), 0, legLen + height * 0.6 + neckUp, len * 0.45); neckM.rotation.x = -0.35; g.add(neckM);
  const headG = new THREE.Group(); headG.position.set(0, legLen + height * 0.6 + neckUp + neck * 0.6, len * 0.5 + headSize * 0.6); g.add(headG);
  headG.add(at(box(headSize * 1.1, headSize, headSize * 1.5, head), 0, 0, 0));
  headG.add(at(box(0.06, 0.06, 0.06, 0x111111), headSize * 0.4, headSize * 0.18, headSize * 0.5));
  headG.add(at(box(0.06, 0.06, 0.06, 0x111111), -headSize * 0.4, headSize * 0.18, headSize * 0.5));
  const legs = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(x * thick * 0.32, legLen, z * len * 0.36);
    pivot.add(at(box(thick * 0.24, legLen, thick * 0.24, leg), 0, -legLen / 2, 0));
    g.add(pivot); legs.push(pivot);
  }
  let tailM = null;
  if (tail) { tailM = at(box(0.08, 0.08, 0.45, body), 0, legLen + height * 0.45, -len * 0.6); tailM.rotation.x = 0.6; g.add(tailM); }
  if (extras) extras(g, headG, { len, height, legLen, thick });
  return { group: g, legs, head: headG, tail: tailM };
}

function biped({ body, belly, beak, size = 1 }) {
  const g = new THREE.Group();
  g.add(at(sphere(0.32 * size, body), 0, 0.5 * size, 0));
  const front = at(sphere(0.26 * size, belly), 0, 0.48 * size, 0.1 * size); front.scale.set(0.9, 1.1, 0.6); g.add(front);
  const headG = new THREE.Group(); headG.position.set(0, 0.88 * size, 0.02); g.add(headG);
  headG.add(at(sphere(0.18 * size, body), 0, 0, 0));
  headG.add(at(box(0.08 * size, 0.06 * size, 0.18 * size, beak), 0, -0.02, 0.17 * size));
  const legs = [];
  for (const x of [1, -1]) {
    const p = new THREE.Group(); p.position.set(x * 0.12 * size, 0.2 * size, 0.02);
    p.add(at(box(0.12 * size, 0.06 * size, 0.2 * size, beak), 0, -0.17 * size, 0.06 * size));
    g.add(p); legs.push(p);
  }
  for (const x of [1, -1]) { const w = at(box(0.06 * size, 0.36 * size, 0.2 * size, body), x * 0.3 * size, 0.55 * size, -0.02); w.rotation.z = x * 0.25; g.add(w); }
  return { group: g, legs, head: headG, tail: null, waddle: true };
}

const BUILDERS = {
  penguin: () => biped({ body: 0x22262e, belly: 0xf3f3f0, beak: 0xf2a33a }),
  zebra: () => quadruped({ body: 0xf4f2ec, belly: 0xffffff, leg: 0xe8e4da, head: 0xf4f2ec, len: 1.5, height: 0.9, thick: 0.6, legLen: 0.8,
    extras: (g, h, s) => {
      for (let i = -3; i <= 3; i++) g.add(at(box(s.thick + 0.02, s.height * 0.62, 0.07, 0x1c1c1c), 0, s.legLen + s.height * 0.3, i * 0.2));
      h.add(at(box(0.08, 0.2, 0.5, 0x1c1c1c), 0, 0.22, -0.1));
    } }),
  giraffe: () => quadruped({ body: 0xe6b25b, belly: 0xf3dcae, leg: 0xe0a94f, len: 1.3, height: 0.9, thick: 0.6, legLen: 1.3, neck: 1.6, neckUp: 0.7, headSize: 0.34,
    extras: (g, h, s) => {
      for (let i = 0; i < 9; i++) g.add(at(box(0.18, 0.16, 0.02, 0x8a5a24), (i % 2 ? 1 : -1) * (s.thick / 2 + 0.005), s.legLen + 0.2 + (i % 3) * 0.18, -0.5 + i * 0.12));
      h.add(at(cyl(0.03, 0.03, 0.2, 0x6b4518), 0.1, 0.28, -0.1)); h.add(at(cyl(0.03, 0.03, 0.2, 0x6b4518), -0.1, 0.28, -0.1));
    } }),
  lion: () => quadruped({ body: 0xd8a24f, belly: 0xe8c68a, leg: 0xcf9945, len: 1.4, height: 0.75, thick: 0.62, legLen: 0.6, neck: 0.1, neckUp: 0, headSize: 0.42,
    extras: (g, h) => { const mane = at(sphere(0.36, 0x8a4f1d, 8), 0, 0, -0.12); mane.scale.set(1.2, 1.15, 0.8); h.add(mane); } }),
  elephant: () => quadruped({ body: 0x8d8f96, leg: 0x85878e, len: 2.0, height: 1.4, thick: 1.3, legLen: 0.9, neck: 0.1, neckUp: 0, headSize: 0.75,
    extras: (g, h) => {
      const trunk = at(cyl(0.12, 0.08, 0.9, 0x85878e), 0, -0.45, 0.55); trunk.rotation.x = 0.25; h.add(trunk);
      for (const x of [1, -1]) { const ear = at(box(0.08, 0.6, 0.55, 0x9a9ca3), x * 0.5, 0.05, -0.05); ear.rotation.y = x * 0.5; h.add(ear); }
      for (const x of [1, -1]) { const tusk = at(cyl(0.035, 0.02, 0.4, 0xf3efe2), x * 0.18, -0.3, 0.5); tusk.rotation.x = -1.1; h.add(tusk); }
    } }),
  panda: () => quadruped({ body: 0xf5f5f2, belly: 0xf5f5f2, leg: 0x1f1f22, head: 0xf7f7f4, len: 1.2, height: 0.85, thick: 0.85, legLen: 0.45, neck: 0.05, neckUp: 0, headSize: 0.5, tail: false,
    extras: (g, h, s) => {
      g.add(at(box(s.thick + 0.02, 0.32, 0.4, 0x1f1f22), 0, s.legLen + s.height * 0.42, 0.3));
      for (const x of [1, -1]) { h.add(at(box(0.15, 0.15, 0.08, 0x1f1f22), x * 0.15, 0.06, 0.38)); h.add(at(sphere(0.1, 0x1f1f22), x * 0.24, 0.3, -0.05)); }
    } }),
  redpanda: () => quadruped({ body: 0xc4502a, belly: 0x2b1a14, leg: 0x2b1a14, head: 0xd56a3c, len: 0.9, height: 0.45, thick: 0.4, legLen: 0.3, neck: 0.05, neckUp: 0, headSize: 0.3,
    extras: (g, h) => {
      const tail = at(cyl(0.11, 0.08, 0.7, 0xc4502a), 0, 0.5, -0.65); tail.rotation.x = 1.0; g.add(tail);
      for (let i = 0; i < 3; i++) { const r = at(cyl(0.115, 0.115, 0.07, 0xf0e2c8), 0, 0.5 + Math.cos(1.0) * (i * 0.18 - 0.1), -0.65 - Math.sin(1.0) * (i * 0.18 - 0.1)); r.rotation.x = 1.0; g.add(r); }
      for (const x of [1, -1]) h.add(at(box(0.1, 0.1, 0.04, 0xf3f0e8), x * 0.12, 0.17, 0.16));
    } }),
  bear: () => quadruped({ body: 0x6b4527, belly: 0x5a3a20, leg: 0x553620, len: 1.5, height: 0.9, thick: 0.85, legLen: 0.55, neck: 0.05, neckUp: 0, headSize: 0.5, tail: false,
    extras: (g, h) => { h.add(at(box(0.22, 0.16, 0.2, 0xb08a64), 0, -0.08, 0.38)); for (const x of [1, -1]) h.add(at(sphere(0.1, 0x6b4527), x * 0.22, 0.28, -0.08)); } }),
};

// Models that exist as .glb, read once from models/manifest.json. An entry:
//   { "file": "lion.glb", "height": 1.4, "walk": "Walk" | [from, to], "idle": "Idle" | [from, to], "hideMaterial": "ring", "rotY": 0 }
// A clip given as [from, to] is that stretch, in seconds, of the file's first clip (some models pack every move in one).
// With no walk clip the idle keeps playing and the body bobs as it moves; with no idle the walk pauses when it stops.
let manifest = {};
const gltfCache = new Map();
const loader = new GLTFLoader();
export async function loadManifest() {
  try { const r = await fetch('./models/manifest.json', { cache: 'no-cache' }); if (r.ok) manifest = await r.json(); } catch { manifest = {}; }
  return manifest;
}
function loadGltf(id) {
  if (!gltfCache.has(id)) gltfCache.set(id, new Promise((resolve) => loader.load(`./models/${manifest[id].file}`, resolve, undefined, () => resolve(null))));
  return gltfCache.get(id);
}
/** Starts loading these species' models; resolves when they are in (or failed, then the shape model stands in). */
export function preload(ids) { return Promise.all(ids.filter((id) => manifest[id]).map(loadGltf)); }
/** The box around a model as it is posed now, skinned meshes included. */
function poseBox(obj) {
  obj.updateMatrixWorld(true);
  obj.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
  return new THREE.Box3().setFromObject(obj, true);
}
const sizeOf = (obj) => poseBox(obj).getSize(new THREE.Vector3());
const clipCache = new Map();
function clipFor(id, gltf, want) {
  if (!want) return null;
  const key = `${id}:${Array.isArray(want) ? want.join('-') : want}`;
  if (!clipCache.has(key)) {
    clipCache.set(key, Array.isArray(want)
      ? THREE.AnimationUtils.subclip(gltf.animations[0], key, Math.round(want[0] * 30), Math.round(want[1] * 30), 30)
      : gltf.animations.find((a) => a.name === want) || null);
  }
  return clipCache.get(key);
}

/**
 * An animal ready to place: { group, update(dt, moving) }. A species with a .glb shows it once loaded (at once if
 * preloaded); the shape model is drawn only when there is no .glb or it failed to load.
 */
export function makeAnimal(speciesId, size = 1) {
  const built = BUILDERS[speciesId]();
  const holder = new THREE.Group();
  holder.scale.setScalar(size);
  let phase = Math.random() * 6;
  let real = null; // { model, gait, mixer, actions, currentAction, state }
  const api = {
    group: holder,
    update(dt, state = 'idle') {
      const wantAct = typeof state === 'string' ? state : state ? 'walk' : 'idle';
      phase += dt * (wantAct === 'run' ? 14 : wantAct === 'walk' ? 9 : 2);
      if (real) {
        if (wantAct !== real.state) {
          real.state = wantAct;
          const targetAction = real.actions[wantAct]
            || (wantAct === 'run' ? real.actions.walk : null)
            || ((wantAct === 'walk' || wantAct === 'run') ? (real.actions.walk || real.actions.idle) : (real.actions.idle || real.actions.walk));
          if (targetAction && targetAction !== real.currentAction) {
            targetAction.reset().play();
            if (real.currentAction) real.currentAction.crossFadeTo(targetAction, 0.25, false);
            real.currentAction = targetAction;
          }
        }
        real.mixer?.update(dt);
        const moving = wantAct === 'walk' || wantAct === 'run';
        if (!real.actions.walk) {
          const bob = wantAct === 'run' ? 0.08 : 0.05;
          real.gait.position.y = moving ? Math.abs(Math.sin(phase)) * bob : 0;
          real.gait.rotation.x = moving ? Math.sin(phase) * 0.03 : 0;
        } else {
          real.gait.position.y = 0;
          real.gait.rotation.x = 0;
        }
        return;
      }
      const moving = wantAct === 'walk' || wantAct === 'run';
      const swing = moving ? Math.sin(phase) * 0.55 : 0;
      built.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? swing : -swing); });
      if (built.waddle) built.group.rotation.z = moving ? Math.sin(phase) * 0.12 : 0;
      if (built.head) built.head.rotation.x = moving ? 0 : (wantAct === 'eat' ? -0.35 : Math.sin(phase * 0.5) * 0.12);
      if (built.tail) built.tail.rotation.y = Math.sin(phase * 1.5) * 0.4;
      built.group.position.y = moving ? Math.abs(Math.sin(phase)) * 0.04 : 0;
    },
  };
  const spec = manifest[speciesId];
  if (!spec) { holder.add(built.group); return api; }
  const useShape = () => { if (!built.group.parent) holder.add(built.group); };
  loadGltf(speciesId).then((gltf) => {
    if (!gltf) { useShape(); return; }
    const model = cloneSkinned(gltf.scene);
    const drop = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (spec.hideMaterial && o.material?.name === spec.hideMaterial) { drop.push(o); return; }
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; // skinned parts move outside their rest bounds
    });
    drop.forEach((o) => o.parent.remove(o));
    model.rotation.y = spec.rotY ?? 0;
    const gait = new THREE.Group(); gait.add(model);
    real = { model, gait, mixer: null, actions: {}, currentAction: null, state: 'idle' };
    if (gltf.animations?.length) {
      real.mixer = new THREE.AnimationMixer(model);
      const actionNames = ['idle', 'walk', 'run', 'eat', 'water', 'play', 'sleep'];
      for (const act of actionNames) {
        const clip = clipFor(speciesId, gltf, spec[act]);
        if (clip) real.actions[act] = real.mixer.clipAction(clip);
      }
      if (!real.actions.walk && spec.walk) {
        const clip = clipFor(speciesId, gltf, spec.walk);
        if (clip) real.actions.walk = real.mixer.clipAction(clip);
      }
      if (!real.actions.idle && spec.idle) {
        const clip = clipFor(speciesId, gltf, spec.idle);
        if (clip) real.actions.idle = real.mixer.clipAction(clip);
      }
      const initial = real.actions.idle || real.actions.walk;
      if (initial) {
        initial.play();
        real.currentAction = initial;
        real.mixer.update(0);
        initial.time = Math.random() * initial.getClip().duration;
      }
    }
    // Fit to the species' height, centred on the spot, feet on the ground. Measured in the clip's pose, not the
    // rest pose: some rigs are scaled by their animation.
    const k = (spec.height ?? sizeOf(built.group).y) / (sizeOf(gait).y || 1);
    model.scale.multiplyScalar(k);
    const fit = poseBox(gait); const c = fit.getCenter(new THREE.Vector3());
    model.position.x -= c.x; model.position.z -= c.z; model.position.y -= fit.min.y;
    holder.add(gait);
  });
  return api;
}

// ---- Scenery ----
export function acacia() {
  const g = new THREE.Group();
  const trunk = at(cyl(0.12, 0.18, 2.2, 0x6b4a2b), 0, 1.1, 0); trunk.rotation.z = 0.1; g.add(trunk);
  const top = at(cyl(1.6, 1.2, 0.35, 0x7a9a3c, 7), 0.15, 2.3, 0); g.add(top);
  return g;
}
export function bamboo() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const h = 2.4 + Math.random() * 1.6; const s = at(cyl(0.06, 0.07, h, 0x8fb84a, 5), (Math.random() - 0.5) * 1.2, h / 2, (Math.random() - 0.5) * 1.2);
    s.rotation.z = (Math.random() - 0.5) * 0.15; g.add(s);
    const leaf = at(box(0.5, 0.04, 0.16, 0x5f9a35), s.position.x + 0.2, h * 0.85, s.position.z); leaf.rotation.y = Math.random() * 3; g.add(leaf);
  }
  return g;
}
export function pine() {
  const g = new THREE.Group();
  g.add(at(cyl(0.12, 0.16, 0.8, 0x5a3d24), 0, 0.4, 0));
  for (let i = 0; i < 3; i++) g.add(at(new THREE.Mesh(new THREE.ConeGeometry(1 - i * 0.25, 1.2, 7), mat(0x2f6b3a)), 0, 1.1 + i * 0.7, 0));
  return g;
}
export function rock(color = 0x8b8f93, s = 1) { const r = at(sphere(0.5 * s, color), 0, 0.25 * s, 0); r.scale.set(1.3, 0.7, 1); return r; }
export function iceBlock() { const r = at(box(1.2, 0.8, 1, 0xd9eef8), 0, 0.4, 0); r.material = new THREE.MeshStandardMaterial({ color: 0xd9eef8, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.92 }); return r; }
export function pool(w, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }));
  m.position.y = 0.06; m.receiveShadow = true; return m;
}
/** A guest, or (with a cap colour) a member of staff in uniform. */
export function person(color, cap) {
  const g = new THREE.Group();
  g.add(at(cyl(0.18, 0.22, 0.7, color, 6), 0, 0.55, 0));
  g.add(at(sphere(0.17, 0xf0c9a0), 0, 1.05, 0));
  if (cap) { g.add(at(cyl(0.19, 0.19, 0.1, cap, 8), 0, 1.2, 0)); g.add(at(box(0.2, 0.03, 0.16, cap), 0, 1.16, 0.16)); }
  return g;
}
export function toyBall(color = 0xe94b5b, r = 0.3) { return at(sphere(r, color, 8), 0, r, 0); }

/** A habitat item, sized to its footprint of w × d cells (one cell is one unit), centred on its group. */
export function itemModel(type, biome, waterColor, w = 1, d = 1) {
  const g = new THREE.Group();
  if (type === 'pool') { const p = pool(w - 0.1, d - 0.1, waterColor); g.add(p); g.add(at(box(w, 0.05, d, 0x8d7a5a), 0, 0.02, 0)); }
  if (type === 'mud') { const m = at(cyl(0.95, 0.95, 0.06, 0x6b4a2b, 10), 0, 0.05, 0); m.scale.set(w / 2, 1, d / 2); g.add(m); }
  if (type === 'plant') {
    const t = { savanna: acacia, bamboo, forest: pine, polar: iceBlock }[biome]();
    t.scale.setScalar(biome === 'savanna' ? 0.7 : biome === 'polar' ? 0.7 : 0.85); t.rotation.y = Math.random() * 6; g.add(t);
  }
  if (type === 'rock') { const r = rock(biome === 'polar' ? 0xc9d6df : 0x8b8f93, 1.2); g.add(r); }
  if (type === 'ball') g.add(toyBall(0xe94b5b, 0.32));
  if (type === 'hayball') g.add(toyBall(0xe0c060, 0.34));
  if (type === 'icetreat') {
    const ice = at(box(0.6, 0.6, 0.6, 0xd9eef8), 0, 0.3, 0); ice.material = new THREE.MeshStandardMaterial({ color: 0xcfe8f5, roughness: 0.1, transparent: true, opacity: 0.7 }); g.add(ice);
    g.add(at(box(0.32, 0.12, 0.08, 0xf08a3c), 0, 0.3, 0));
  }
  if (type === 'scratch') { g.add(at(cyl(0.12, 0.14, 1.4, 0x8a5a32, 8), 0, 0.7, 0)); g.add(at(cyl(0.16, 0.16, 0.7, 0xc9a66b, 8), 0, 0.7, 0)); g.add(at(box(0.6, 0.08, 0.6, 0x6b4a2b), 0, 0.04, 0)); }
  if (type === 'feeder') {
    g.add(at(cyl(0.07, 0.08, 3.2, 0x6b4a2b, 6), 0, 1.6, 0));
    const basket = at(cyl(0.32, 0.22, 0.35, 0x9a7b3c, 8), 0, 3.1, 0); g.add(basket); g.add(at(sphere(0.3, 0x5f9a35), 0, 3.35, 0));
  }
  if (type === 'climb') {
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) g.add(at(cyl(0.08, 0.09, 2.2, 0x7a5232, 6), x, 1.1, z));
    g.add(at(box(1.8, 0.1, 1.8, 0x9a6b41), 0, 1.5, 0));
    for (let k = 0; k < 4; k++) { const rung = at(cyl(0.04, 0.04, 1.6, 0x9a6b41, 5), 0.8, 0.3 + k * 0.32, 0); rung.rotation.x = Math.PI / 2; g.add(rung); }
    const log = at(cyl(0.12, 0.12, 2.2, 0x7a5232, 6), -0.1, 1.0, 0); log.rotation.z = 0.9; g.add(log);
  }
  if (type === 'shelter') {
    g.add(at(box(1.8, 1.2, 1.6, 0xb08a5a), 0, 0.6, -0.1));
    g.add(at(box(0.7, 0.9, 0.05, 0x3b2a1c), 0, 0.45, 0.71));
    const roof = at(new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.8, 4), mat(0x6b4a2b)), 0, 1.6, -0.1); roof.rotation.y = Math.PI / 4; g.add(roof);
  }
  return g;
}

/** A guest facility on its spot beside the path, about 2 × 2. */
export function facilityModel(type, color = 0x888888) {
  const g = new THREE.Group();
  if (type === 'food' || type === 'drink' || type === 'gift') {
    g.add(at(box(1.8, 1.3, 1.4, 0xf5ecd8), 0, 0.65, 0));
    g.add(at(box(1.9, 0.12, 0.5, 0xd9cfb8), 0, 0.85, 0.85));
    const roof = at(box(2.2, 0.16, 1.9, color), 0, 1.55, 0.1); g.add(roof);
    for (let k = -2; k <= 2; k++) g.add(at(box(0.22, 0.25, 0.04, k % 2 ? 0xffffff : color), k * 0.44, 1.38, 1.05));
    g.add(at(type === 'drink' ? cyl(0.18, 0.18, 0.5, 0x3a7bd5, 8) : type === 'gift' ? box(0.4, 0.4, 0.4, 0xf2b134) : sphere(0.25, 0xf2b134), 0, 1.95, 0.1));
  }
  if (type === 'toilet') {
    g.add(at(box(1.8, 1.6, 1.4, 0xdfe7ee), 0, 0.8, 0));
    g.add(at(box(0.5, 1.0, 0.05, 0x3a7bd5), -0.45, 0.5, 0.71)); g.add(at(box(0.5, 1.0, 0.05, 0xe06c9f), 0.45, 0.5, 0.71));
    g.add(at(box(2.0, 0.14, 1.6, 0x56606a), 0, 1.66, 0));
  }
  if (type === 'bench') {
    for (const x of [-0.5, 0.5]) { g.add(at(box(0.9, 0.08, 0.4, 0x9a6b41), x, 0.45, 0)); g.add(at(box(0.9, 0.35, 0.06, 0x9a6b41), x, 0.65, -0.2)); g.add(at(box(0.06, 0.45, 0.35, 0x56606a), x - 0.4, 0.22, 0)); g.add(at(box(0.06, 0.45, 0.35, 0x56606a), x + 0.4, 0.22, 0)); }
  }
  if (type === 'bin') { g.add(at(cyl(0.25, 0.22, 0.7, 0x2f6b3a, 10), 0, 0.35, 0)); g.add(at(cyl(0.27, 0.27, 0.06, 0x1f4a28, 10), 0, 0.72, 0)); }
  return g;
}

/** An education board on two posts. */
export function boardModel() {
  const g = new THREE.Group();
  for (const x of [-0.7, 0.7]) g.add(at(cyl(0.05, 0.05, 1.4, 0x6b4a2b, 6), x, 0.7, 0));
  g.add(at(box(1.7, 0.9, 0.08, 0x2f6b3a), 0, 1.2, 0)); g.add(at(box(1.5, 0.7, 0.02, 0xf5ecd8), 0, 1.2, 0.05));
  return g;
}
