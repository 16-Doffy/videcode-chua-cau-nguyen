// Third's Zoo: buy land, choose a habitat, bring animals, keep them fed, clean and happy; guests come to see them.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { START_MONEY, DAY_SECONDS, TICKET, BIOMES, SPECIES, SPECIES_BY_ID, PLOT_SIZE, PLOTS, plotPrice, CARE, GATE, RING } from './data.js';
import { makeAnimal, loadManifest, acacia, bamboo, pine, rock, iceBlock, pool, person, toyBall, mat } from './models3d.js';

const $ = (s) => document.querySelector(s);
const SAVE_KEY = 'thirds-zoo-v1';
const money = (n) => `${Math.round(n).toLocaleString('vi-VN')} xu`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch { /* private mode: play without saving */ } },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to clear */ } },
};

// ---------- State ----------
function freshState() {
  return { money: START_MONEY, time: 0, guests: 6, speed: 1, plots: PLOTS.map(() => ({ owned: false })), nextId: 1, seenTips: false, bestStars: 0 };
}
let state = freshState();
const saved = store.get();
if (saved && saved.plots?.length === PLOTS.length) state = { ...freshState(), ...saved, speed: 1 };

// ---------- Scene ----------
const host = $('#world');
const lowPower = matchMedia('(max-width: 720px)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const sky = new THREE.Color(0xbfe3f2);
scene.background = sky;
scene.fog = new THREE.Fog(0xbfe3f2, 90, 190);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
camera.position.set(0, 52, 58);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 2);
controls.enableDamping = true;
controls.maxPolarAngle = 1.2;
controls.minDistance = 16;
controls.maxDistance = 115;
controls.screenSpacePanning = false;

const hemi = new THREE.HemisphereLight(0xffffff, 0x5f7f45, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dc, 1.5);
sun.position.set(40, 70, 30);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 180 });
scene.add(sun);

// Island, sea, paths, plaza, gate.
const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: 0x5ab4dc, roughness: 0.3 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7; scene.add(sea);
const island = new THREE.Mesh(new THREE.CylinderGeometry(46, 49, 1.6, 56), mat(0x7cc05a));
island.position.y = -0.8; island.receiveShadow = true; scene.add(island);
const beach = new THREE.Mesh(new THREE.CylinderGeometry(49.5, 51, 0.8, 56), mat(0xf0dca8));
beach.position.y = -1.1; scene.add(beach);
const stone = mat(0xe3dccd);
function flat(w, d, x, z, m = stone, y = 0.02) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), m); p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); return p; }
flat(RING * 2 + 2.6, 2.6, 0, -RING); flat(RING * 2 + 2.6, 2.6, 0, RING); flat(2.6, RING * 2, -RING, 0); flat(2.6, RING * 2, RING, 0);
flat(3, GATE.z - RING, 0, (GATE.z + RING) / 2);
const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.06, 28), stone); plaza.position.y = 0.03; plaza.receiveShadow = true; scene.add(plaza);
const fountain = new THREE.Group();
fountain.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.6, 18), mat(0xcfc6b4)), { castShadow: true }));
const fw = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.1, 18), new THREE.MeshStandardMaterial({ color: 0x7cc6e6, roughness: 0.1 })); fw.position.y = 0.32; fountain.add(fw);
const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xbfe8f7, transparent: true, opacity: 0.7 })); jet.position.y = 1; fountain.add(jet);
fountain.position.y = 0.3; scene.add(fountain);
// Gate: two pillars and a sign board.
const gate = new THREE.Group();
for (const x of [-2.6, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4, 0.7), mat(0x8a5a32)); p.position.set(x, 2, 0); p.castShadow = true; gate.add(p); }
const beam = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.2, 0.5), mat(0x2f6b3a)); beam.position.y = 4.3; beam.castShadow = true; gate.add(beam);
const gateSign = label('THIRD’S ZOO', '#fff7df', 'rgba(0,0,0,0)', 40);
gateSign.position.set(0, 4.3, 0.3); gate.add(gateSign);
gate.position.set(GATE.x, 0, GATE.z - 2); scene.add(gate);
// Trees along the shore so the island does not look empty.
for (let i = 0; i < 26; i++) {
  const a = (i / 26) * Math.PI * 2; const r = 41 + Math.random() * 3;
  if (Math.abs(a - Math.PI / 2) < 0.18) continue; // keep the gate road clear
  const t = Math.random() < 0.5 ? pine() : acacia(); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); t.rotation.y = Math.random() * 6; t.scale.setScalar(0.9 + Math.random() * 0.5); scene.add(t);
}

/** A flat text board facing the camera's side, drawn on a canvas. */
function label(text, color = '#14202b', bg = 'rgba(255,255,255,0.92)', px = 34, sub) {
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  ctx.font = `700 ${px}px Manrope, "Be Vietnam Pro", system-ui, sans-serif`;
  const subPx = Math.round(px * 0.62);
  const w = Math.max(ctx.measureText(text).width, sub ? (ctx.font = `600 ${subPx}px Manrope, system-ui`, ctx.measureText(sub).width) : 0) + px * 1.2;
  c.width = Math.ceil(w); c.height = Math.ceil(px * (sub ? 2.3 : 1.6));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, px * 0.35); ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${px}px Manrope, "Be Vietnam Pro", system-ui, sans-serif`; ctx.fillText(text, c.width / 2, sub ? px * 0.85 : c.height / 2);
  if (sub) { ctx.font = `600 ${subPx}px Manrope, system-ui, sans-serif`; ctx.fillStyle = '#2f6b3a'; ctx.fillText(sub, c.width / 2, px * 1.72); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const scale = 0.022 * (px / 34);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(c.width * scale * 0.5, c.height * scale * 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  return m;
}

// ---------- Plots ----------
const plotViews = PLOTS.map((p, i) => {
  const root = new THREE.Group(); root.position.set(p.x, 0, p.z); scene.add(root);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.2, PLOT_SIZE), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.1; hit.userData.plot = i; root.add(hit);
  return { root, hit, content: null, animals: [], toy: null, sign: null };
});
const selectFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PLOT_SIZE + 0.4, 0.3, PLOT_SIZE + 0.4)), new THREE.LineBasicMaterial({ color: 0xffe066 }));
selectFrame.visible = false; scene.add(selectFrame);

function buildPlot(i) {
  const view = plotViews[i]; const st = state.plots[i];
  if (view.content) view.root.remove(view.content);
  const g = new THREE.Group(); view.content = g; view.root.add(g);
  const half = PLOT_SIZE / 2;
  if (!st.owned) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.05, PLOT_SIZE), mat(0x92cc6c)); lawn.position.y = 0.03; lawn.receiveShadow = true; g.add(lawn);
    for (const [x, z] of [[half, half], [-half, half], [half, -half], [-half, -half]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), mat(0xf2f2f2)); post.position.set(x, 0.45, z); post.castShadow = true; g.add(post); }
    const sign = label('Khu đất trống', '#14202b', 'rgba(255,255,255,0.94)', 34, `Mua: ${money(plotPrice(ownedCount()))}`);
    sign.scale.setScalar(3.2); sign.position.set(0, 2.2, 0); sign.rotation.x = -0.75; g.add(sign); view.sign = sign;
    return;
  }
  const b = BIOMES[st.biome];
  const ground = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.1, PLOT_SIZE), mat(b.ground)); ground.position.y = 0.05; ground.receiveShadow = true; g.add(ground);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE + 0.3, 0.06, PLOT_SIZE + 0.3), mat(b.edge)); edge.position.y = 0.02; g.add(edge);
  // Fence: posts and two rails all round.
  const postMat = mat(0x7a5232); const railMat = mat(0x9a6b41);
  for (let k = -half; k <= half + 0.01; k += 1.5) {
    for (const [x, z] of [[k, half], [k, -half], [half, k], [-half, k]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), postMat); post.position.set(x, 0.6, z); post.castShadow = true; g.add(post); }
  }
  for (const y of [0.55, 1.0]) {
    for (const [w, d, x, z] of [[PLOT_SIZE, 0.08, 0, half], [PLOT_SIZE, 0.08, 0, -half], [0.08, PLOT_SIZE, half, 0], [0.08, PLOT_SIZE, -half, 0]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), railMat); r.position.set(x, y, z); g.add(r); }
  }
  // Habitat by biome; the same seed each load so a plot keeps its look.
  let seed = i * 97 + 13; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const spot = (m = 1.6) => [(rnd() - 0.5) * (PLOT_SIZE - m * 2), (rnd() - 0.5) * (PLOT_SIZE - m * 2)];
  const place = (obj, [x, z]) => { obj.position.x = x; obj.position.z = z; obj.rotation.y = rnd() * 6; g.add(obj); };
  const water = pool(st.biome === 'polar' ? 5 : 3.6, st.biome === 'polar' ? 3.4 : 2.4, b.water); water.position.set(-2.4, 0.08, 2.6); g.add(water);
  if (st.biome === 'savanna') { place(acacia(), [3.5, -3]); place(acacia(), [-3.8, -3.6]); place(rock(0xb59a6d), spot()); place(rock(0xb59a6d, 0.7), spot()); }
  if (st.biome === 'bamboo') { place(bamboo(), [3.6, -3.4]); place(bamboo(), [-3.6, -3.8]); place(bamboo(), [3.8, 3.2]); place(rock(0x7e8a70), spot()); }
  if (st.biome === 'polar') { place(iceBlock(), [3.4, -3]); place(iceBlock(), [-3.6, -3.4]); place(rock(0xc9d6df), spot()); place(rock(0xc9d6df, 0.6), spot()); }
  if (st.biome === 'forest') { place(pine(), [3.6, -3.4]); place(pine(), [-3.8, -3.2]); place(pine(), [3.8, 3]); place(rock(), spot()); }
  view.toy = toyBall(); view.toy.position.set(2.4, 0, 2.6); view.toy.visible = isToyActive(st); g.add(view.toy);
}

// ---------- Animals ----------
const ownedCount = () => state.plots.filter((p) => p.owned).length;
const isToyActive = (st) => (st.toyUntil ?? 0) > state.time;
function spawnAnimalView(i, a) {
  const sp = SPECIES_BY_ID[a.species];
  const model = makeAnimal(a.species, (a.baby ? 0.6 : 1) * 1.3);
  const half = PLOT_SIZE / 2 - 1.2;
  const pos = new THREE.Vector3((Math.random() - 0.5) * half * 2, 0.1, (Math.random() - 0.5) * half * 2);
  model.group.position.copy(pos); model.group.rotation.y = Math.random() * 6;
  model.group.userData.plot = i; model.group.traverse((o) => { o.userData.plot = i; });
  plotViews[i].root.add(model.group);
  const v = { a, model, target: pos.clone(), wait: Math.random() * 3, speed: 0.6 + sp.size * 0.35, half };
  plotViews[i].animals.push(v);
  return v;
}
function removeAnimalView(i, id) {
  const view = plotViews[i]; const k = view.animals.findIndex((v) => v.a.id === id);
  if (k >= 0) { view.root.remove(view.animals[k].model.group); view.animals.splice(k, 1); }
}
function moveAnimals(dt) {
  for (const view of plotViews) {
    for (const v of view.animals) {
      const g = v.model.group; let moving = false;
      if (v.wait > 0) { v.wait -= dt; } else {
        const d = v.target.clone().sub(g.position); d.y = 0; const dist = d.length();
        if (dist < 0.15) { v.wait = 1.5 + Math.random() * 4; v.target.set((Math.random() - 0.5) * v.half * 2, 0.1, (Math.random() - 0.5) * v.half * 2); }
        else { d.normalize(); const step = Math.min(dist, v.speed * dt * (v.a.happy > 40 ? 1 : 0.55)); g.position.addScaledVector(d, step); const ang = Math.atan2(d.x, d.z); g.rotation.y += ((ang - g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6); moving = true; }
      }
      v.model.update(dt, moving);
    }
  }
}

// ---------- Guests ----------
const route = [[GATE.x, GATE.z - 1], [0, RING], [RING, RING], [RING, -RING], [-RING, -RING], [-RING, RING], [0, RING], [GATE.x, GATE.z - 1]].map(([x, z]) => new THREE.Vector3(x, 0, z));
const walkers = [];
const shirts = [0xe94b5b, 0x3a7bd5, 0xf2b134, 0x2fa36b, 0x9b59b6, 0xff8c42, 0x1abc9c];
function syncWalkers() {
  const want = clamp(Math.round(state.guests / 2), 2, lowPower ? 24 : 44);
  while (walkers.length < want) {
    const p = person(shirts[walkers.length % shirts.length]); p.scale.setScalar(0.9 + Math.random() * 0.2);
    const w = { p, seg: Math.floor(Math.random() * (route.length - 1)), t: Math.random(), speed: 1.4 + Math.random() * 0.8, side: (Math.random() - 0.5) * 1.6 };
    scene.add(p); walkers.push(w);
  }
  while (walkers.length > want) scene.remove(walkers.pop().p);
}
function moveWalkers(dt) {
  for (const w of walkers) {
    const a = route[w.seg]; const b = route[w.seg + 1]; const len = a.distanceTo(b) || 1;
    w.t += (w.speed * dt) / len;
    if (w.t >= 1) { w.t = 0; w.seg = (w.seg + 1) % (route.length - 1); }
    const pos = a.clone().lerp(b, w.t); const dir = b.clone().sub(a).normalize();
    pos.x += -dir.z * w.side; pos.z += dir.x * w.side;
    w.p.position.copy(pos); w.p.rotation.y = Math.atan2(dir.x, dir.z);
    w.p.position.y = Math.abs(Math.sin(performance.now() / 160 + w.side * 5)) * 0.06;
  }
}

// ---------- Simulation ----------
function groupScore(count, [min, max]) { if (!count) return 0; if (count < min) return count / min; if (count > max) return max / count; return 1; }
// Stars: happy animals count most, but a few animals cannot make a five-star zoo: size, variety and land add up.
function stars() {
  const all = state.plots.flatMap((p) => (p.owned ? p.animals : []));
  if (!all.length) return 0;
  const avgHappy = all.reduce((s, a) => s + a.happy, 0) / all.length;
  const variety = new Set(all.map((a) => a.species)).size;
  return clamp(Math.min(1, all.length / 10) * (avgHappy / 100) * 3 + Math.min(1.5, variety * 0.3) + Math.min(0.5, ownedCount() * 0.1), 0, 5);
}
let secAcc = 0; let incomeAcc = 0; let dayAcc = state.time % DAY_SECONDS; const warned = new Set();
function stepSim(simDt) {
  state.time += simDt; secAcc += simDt; incomeAcc += simDt; dayAcc += simDt;
  while (secAcc >= 1) { secAcc -= 1; tickSecond(); }
  if (incomeAcc >= 10) { incomeAcc -= 10; const earned = Math.round(state.guests * TICKET); state.money += earned; floatText(`+${earned}`); }
  if (dayAcc >= DAY_SECONDS) { dayAcc -= DAY_SECONDS; newDay(); }
}
function tickSecond() {
  let appeal = 0;
  state.plots.forEach((p, i) => {
    if (!p.owned) return;
    const n = p.animals.length;
    p.clean = clamp((p.clean ?? 100) - 0.045 * n, 0, 100);
    const toy = isToyActive(p) ? 12 : 0;
    plotViews[i].toy && (plotViews[i].toy.visible = isToyActive(p));
    const counts = {}; p.animals.forEach((a) => { counts[a.species] = (counts[a.species] || 0) + 1; });
    for (const a of p.animals) {
      const sp = SPECIES_BY_ID[a.species];
      a.food = clamp(a.food - 0.16, 0, 100);
      const target = 0.38 * a.food + 0.27 * p.clean + 0.25 * 100 * groupScore(counts[a.species], sp.group) + toy;
      a.happy = clamp(a.happy + (target - a.happy) * 0.05, 0, 100);
      appeal += sp.appeal * (0.4 + (a.happy / 100) * 0.8) * (a.baby ? 1.3 : 1);
    }
    const hungry = n && p.animals.reduce((s, a) => s + a.food, 0) / n < 25;
    if (hungry && !warned.has(`food${i}`)) { warned.add(`food${i}`); toast(`Khu ${i + 1}: thú đang đói, bấm vào khu để cho ăn.`, 'warn'); }
    if (p.clean < 25 && !warned.has(`clean${i}`)) { warned.add(`clean${i}`); toast(`Khu ${i + 1} bẩn rồi, cần dọn chuồng.`, 'warn'); }
  });
  const s = stars();
  const target = 4 + appeal * (0.65 + s * 0.17);
  state.guests += (target - state.guests) * 0.06;
  if (Math.floor(s) > state.bestStars) {
    state.bestStars = Math.floor(s);
    const opened = SPECIES.filter((sp) => sp.unlock === state.bestStars).map((sp) => sp.name);
    toast(`Vườn thú đạt ${state.bestStars} sao!${opened.length ? ` Mở khóa: ${opened.join(', ')}.` : ''}`, 'good');
  }
}
function newDay() {
  let upkeep = 0;
  state.plots.forEach((p, i) => {
    if (!p.owned) return;
    for (const a of p.animals) {
      upkeep += SPECIES_BY_ID[a.species].upkeep;
      a.age = (a.age || 0) + 1;
      if (a.baby && a.age >= 2) { a.baby = false; removeAnimalView(i, a.id); spawnAnimalView(i, a); toast(`Một bé ${SPECIES_BY_ID[a.species].name} ở khu ${i + 1} đã lớn.`, 'good'); }
    }
    // A happy pair may have a baby, up to the group size they like.
    const bySpecies = {}; p.animals.forEach((a) => (bySpecies[a.species] ||= []).push(a));
    for (const [sid, list] of Object.entries(bySpecies)) {
      const sp = SPECIES_BY_ID[sid]; const adults = list.filter((a) => !a.baby);
      const avg = list.reduce((s, a) => s + a.happy, 0) / list.length;
      if (adults.length >= 2 && avg > 72 && list.length < sp.group[1] && Math.random() < 0.4) {
        const baby = { id: state.nextId++, species: sid, food: 80, happy: 80, age: 0, baby: true };
        p.animals.push(baby); spawnAnimalView(i, baby);
        toast(`Tin vui: ${sp.name} ở khu ${i + 1} vừa sinh con!`, 'good');
      }
    }
  });
  if (upkeep) { state.money -= upkeep; toast(`Ngày ${day()} — chi phí nuôi thú: ${money(upkeep)}.`); }
  renderPanel();
}
const day = () => Math.floor(state.time / DAY_SECONDS) + 1;

// ---------- Actions ----------
function spend(cost) { if (state.money < cost) { toast(`Không đủ xu: cần ${money(cost)}.`, 'warn'); return false; } state.money -= cost; return true; }
function buyPlot(i, biome) {
  const cost = plotPrice(ownedCount());
  if (!spend(cost)) return;
  state.plots[i] = { owned: true, biome, clean: 100, toyUntil: 0, animals: [] };
  buildPlot(i); plotViews.forEach((v, k) => { if (!state.plots[k].owned) buildPlot(k); });
  toast(`Đã mua khu ${i + 1}: ${BIOMES[biome].name}. Giờ thêm thú vào nhé.`, 'good'); renderPanel(); save();
}
function buyAnimal(i, sid) {
  const sp = SPECIES_BY_ID[sid];
  if (Math.floor(stars()) < sp.unlock && state.bestStars < sp.unlock) { toast(`Cần ${sp.unlock} sao để mua ${sp.name}.`, 'warn'); return; }
  if (!spend(sp.price)) return;
  const a = { id: state.nextId++, species: sid, food: 90, happy: 70, age: 3, baby: false };
  state.plots[i].animals.push(a); spawnAnimalView(i, a);
  const n = state.plots[i].animals.filter((x) => x.species === sid).length;
  toast(n < sp.group[0] ? `${sp.name} thích sống ${sp.group[0]}–${sp.group[1]} con. Thêm bạn cho nó để nó vui hơn.` : `Chào mừng ${sp.name} đến khu ${i + 1}!`, n < sp.group[0] ? 'warn' : 'good');
  renderPanel(); save();
}
function releaseAnimal(i, id) {
  const p = state.plots[i]; const a = p.animals.find((x) => x.id === id); if (!a) return;
  p.animals = p.animals.filter((x) => x.id !== id); removeAnimalView(i, id);
  const refund = Math.round(SPECIES_BY_ID[a.species].price * 0.5); state.money += refund;
  toast(`Đã chuyển ${SPECIES_BY_ID[a.species].name} sang vườn thú khác, nhận lại ${money(refund)}.`); renderPanel(); save();
}
function care(i, kind) {
  const p = state.plots[i]; const n = p.animals.length;
  if (kind === 'feed') { if (!n) return; if (!spend(CARE.feed.cost * n)) return; p.animals.forEach((a) => { a.food = 100; }); warned.delete(`food${i}`); toast(`Đã cho ${n} con ở khu ${i + 1} ăn no.`, 'good'); }
  if (kind === 'clean') { if (!spend(CARE.clean.cost)) return; p.clean = 100; warned.delete(`clean${i}`); toast(`Khu ${i + 1} đã sạch sẽ.`, 'good'); }
  if (kind === 'toy') { if (!spend(CARE.toy.cost)) return; p.toyUntil = state.time + DAY_SECONDS * 2; plotViews[i].toy.visible = true; toast('Có đồ chơi mới, thú vui hơn trong 2 ngày.', 'good'); }
  renderPanel(); save();
}

// ---------- UI ----------
let selected = null;
const panel = $('#panel');
// The panel is drawn again four times a second for its bars: not while a finger or the mouse is on it, so a tap
// lands on the button it started on, and the list keeps its scroll.
let panelTouched = 0;
panel.addEventListener('pointerdown', () => { panelTouched = performance.now(); });
const panelBusy = () => performance.now() - panelTouched < 900 || panel.matches(':hover');
function bar(v, kind) { const c = v > 60 ? 'good' : v > 30 ? 'mid' : 'bad'; return `<span class="bar ${kind || ''}" role="meter" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"><i class="${c}" style="width:${Math.round(v)}%"></i></span>`; }
function renderPanel() {
  if (selected === null) { panel.hidden = true; selectFrame.visible = false; return; }
  const i = selected; const p = state.plots[i]; panel.hidden = false;
  selectFrame.visible = true; selectFrame.position.set(PLOTS[i].x, 0.2, PLOTS[i].z);
  if (!p.owned) {
    const cost = plotPrice(ownedCount());
    panel.innerHTML = `<header><div><small>Khu ${i + 1} · 12 × 12</small><h2>Khu đất trống</h2></div><button class="x" data-close aria-label="Đóng">×</button></header>
      <p class="lead">Chọn môi trường sống cho khu này. Mỗi loài thú hợp với một môi trường.</p>
      <div class="biomes">${Object.entries(BIOMES).map(([id, b]) => `<button data-biome="${id}"><span class="chip" style="background:#${b.ground.toString(16).padStart(6, '0')}"></span><b>${b.name}</b><small>${b.note}</small><em>${SPECIES.filter((s) => s.biome === id).map((s) => s.name).join(', ')}</em></button>`).join('')}</div>
      <p class="cost">Giá khu đất: <b>${money(cost)}</b>${state.money < cost ? ' · <span class="warn">chưa đủ xu</span>' : ''}</p>`;
    return;
  }
  const b = BIOMES[p.biome]; const n = p.animals.length;
  const counts = {}; p.animals.forEach((a) => { counts[a.species] = (counts[a.species] || 0) + 1; });
  const s = Math.max(Math.floor(stars()), state.bestStars);
  panel.innerHTML = `<header><div><small>Khu ${i + 1} · ${b.name}</small><h2>${n ? `${n} con thú` : 'Chưa có thú'}</h2></div><button class="x" data-close aria-label="Đóng">×</button></header>
    <div class="row"><span>Độ sạch</span>${bar(p.clean)}<b>${Math.round(p.clean)}%</b></div>
    <div class="care">
      <button data-care="feed" ${n ? '' : 'disabled'}>Cho ăn<small>${money(CARE.feed.cost * n)}</small></button>
      <button data-care="clean">Dọn chuồng<small>${money(CARE.clean.cost)}</small></button>
      <button data-care="toy" ${isToyActive(p) ? 'class="on"' : ''}>${isToyActive(p) ? 'Đang chơi' : 'Đồ chơi'}<small>${money(CARE.toy.cost)}</small></button>
    </div>
    ${n ? `<ul class="animals">${p.animals.map((a) => { const sp = SPECIES_BY_ID[a.species]; const g = groupScore(counts[a.species], sp.group); return `<li><div><b>${sp.name}${a.baby ? ' <em class="baby">bé</em>' : ''}</b><small>${g < 1 ? (counts[a.species] < sp.group[0] ? `cô đơn, thích ${sp.group[0]}–${sp.group[1]} con` : 'quá đông') : 'vui với bầy'}</small></div><div class="meters"><span>Ăn</span>${bar(a.food)}<span>Vui</span>${bar(a.happy)}</div><button class="ghost" data-release="${a.id}" title="Chuyển sang vườn khác, nhận lại 50%">Chuyển đi</button></li>`; }).join('')}</ul>` : '<p class="lead">Khu này còn trống. Chọn một loài bên dưới để mua.</p>'}
    <h3>Thêm thú</h3>
    <ul class="shop">${SPECIES.filter((sp) => sp.biome === p.biome).map((sp) => { const locked = s < sp.unlock; return `<li class="${locked ? 'locked' : ''}"><div><b>${sp.name}</b><small>${sp.blurb} Thích ${sp.group[0]}–${sp.group[1]} con.</small></div><button data-buy="${sp.id}" ${locked ? 'disabled' : ''}>${locked ? `Cần ${sp.unlock} sao` : money(sp.price)}</button></li>`; }).join('')}</ul>`;
}
panel.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t || selected === null) return;
  if (t.dataset.close !== undefined) { selected = null; renderPanel(); return; }
  if (t.dataset.biome) buyPlot(selected, t.dataset.biome);
  if (t.dataset.care) care(selected, t.dataset.care);
  if (t.dataset.buy) buyAnimal(selected, t.dataset.buy);
  if (t.dataset.release) releaseAnimal(selected, Number(t.dataset.release));
});

function renderHud() {
  const s = stars();
  $('#money').textContent = money(state.money);
  $('#money').classList.toggle('neg', state.money < 0);
  $('#guests').textContent = Math.round(state.guests).toLocaleString('vi-VN');
  $('#day').textContent = `Ngày ${day()}`;
  $('#stars').innerHTML = [1, 2, 3, 4, 5].map((k) => `<i class="${s >= k ? 'on' : s >= k - 0.5 ? 'half' : ''}">★</i>`).join('');
  $('#stars').setAttribute('aria-label', `Đánh giá ${s.toFixed(1)} trên 5 sao`);
  document.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === state.speed)));
}
document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { state.speed = Number(b.dataset.speed); renderHud(); }));
$('#reset').addEventListener('click', () => {
  if (!$('#reset').dataset.armed) { $('#reset').dataset.armed = '1'; $('#reset').textContent = 'Bấm lần nữa để chơi lại'; setTimeout(() => { delete $('#reset').dataset.armed; $('#reset').textContent = 'Chơi lại từ đầu'; }, 3000); return; }
  store.clear(); location.reload();
});
$('#tips-close').addEventListener('click', () => { $('#tips').hidden = true; state.seenTips = true; save(); });
if (state.seenTips) $('#tips').hidden = true;

const toasts = $('#toasts');
function toast(text, kind = '') { const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = text; toasts.prepend(el); setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800); while (toasts.children.length > 4) toasts.lastChild.remove(); }
function floatText(text) { const el = document.createElement('div'); el.className = 'coin'; el.textContent = text; $('#hud-money').appendChild(el); setTimeout(() => el.remove(), 1400); }

// Pick a plot: a tap that did not turn into a drag.
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null; const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(plotViews.flatMap((v) => [v.hit, ...v.animals.map((a) => a.model.group)]), true);
  const hit = hits.find((h) => h.object.userData.plot !== undefined);
  selected = hit ? hit.object.userData.plot : null;
  renderPanel();
});

function save() { store.set({ ...state, speed: 1 }); }
setInterval(save, 5000);
addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------- Run ----------
// On a tall phone screen the camera stands farther back so every plot fits; after that the player's zoom is kept.
let fitted = false;
function resize() {
  const w = host.clientWidth; const h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (!fitted) {
    fitted = true;
    const dist = 78 * Math.max(1, 1.15 / camera.aspect);
    controls.maxDistance = Math.max(115, dist + 20);
    camera.position.copy(controls.target).add(new THREE.Vector3(0, 52, 56).normalize().multiplyScalar(dist));
  }
}
addEventListener('resize', resize);
const clock = new THREE.Clock(); let hudAcc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (state.speed > 0) stepSim(dt * state.speed);
  moveAnimals(dt * Math.max(state.speed, 0.0001) ** 0.5);
  syncWalkers(); moveWalkers(dt * Math.max(1, state.speed * 0.7) * (state.speed ? 1 : 0));
  // A day passes in light: noon bright, evening warm.
  const phase = (state.time % DAY_SECONDS) / DAY_SECONDS; const light = 0.75 + Math.sin(phase * Math.PI) * 0.45;
  sun.intensity = 1.0 + light * 0.6; hemi.intensity = 0.65 + light * 0.4;
  jet.scale.y = 0.9 + Math.sin(performance.now() / 300) * 0.1;
  hudAcc += dt;
  if (hudAcc > 0.25) {
    hudAcc = 0; renderHud();
    if (selected !== null && !panelBusy()) { const top = panel.scrollTop; renderPanel(); panel.scrollTop = top; }
  }
  controls.update(); renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// For the browser test (tests/zoo-play.cjs): where a plot's centre is on screen.
window.__zoo = {
  screenOf(i) {
    const v = new THREE.Vector3(PLOTS[i].x, 0.2, PLOTS[i].z).project(camera); const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  },
};

(async () => {
  await loadManifest();
  state.plots.forEach((p, i) => { buildPlot(i); if (p.owned) p.animals.forEach((a) => spawnAnimalView(i, a)); });
  resize(); renderHud(); frame();
  $('#loading').classList.add('hide');
  if (!ownedCount()) toast('Bấm vào một khu đất trống để bắt đầu xây vườn thú.');
})();
