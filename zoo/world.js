// Third's Zoo world: everything drawn in 3D. It reads the simulation and never changes it; main.js tells it
// what changed (an item placed, an animal born) and asks it what is under the pointer.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { BIOMES, SPECIES_BY_ID, PLOT_SIZE, PLOTS, ITEMS, BARRIERS, FACILITIES, SLOTS, GATE, RING, DAY_SECONDS } from './data.js';
import { makeAnimal, acacia, pine, person, itemModel, facilityModel, boardModel, mat } from './models3d.js';

const HALF = PLOT_SIZE / 2;
const STAFF_LOOK = { keeper: [0x2f6b3a, 0xf2b134], vet: [0xf5f5f5, 0xd9534f], mechanic: [0xff8c42, 0x56606a], janitor: [0x1abc9c, 0x0f5f50], security: [0x1f2f4f, 0x111111] };

export function createWorld(host, sim) {
  const lowPower = matchMedia('(max-width: 720px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3f2);
  scene.fog = new THREE.Fog(0xbfe3f2, 90, 190);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 2); controls.enableDamping = true; controls.maxPolarAngle = 1.25; controls.minDistance = 8; controls.maxDistance = 115; controls.screenSpacePanning = false;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x5f7f45, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dc, 1.5); sun.position.set(40, 70, 30); sun.castShadow = true;
  sun.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 180 });
  scene.add(sun);

  // Island, sea, paths, plaza, gate, trees on the shore.
  const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: 0x5ab4dc, roughness: 0.3 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7; scene.add(sea);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(46, 49, 1.6, 56), mat(0x7cc05a)); island.position.y = -0.8; island.receiveShadow = true; scene.add(island);
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(49.5, 51, 0.8, 56), mat(0xf0dca8)); beach.position.y = -1.1; scene.add(beach);
  const stone = mat(0xe3dccd);
  const flat = (w, d, x, z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), stone); p.position.set(x, 0.02, z); p.receiveShadow = true; scene.add(p); };
  flat(RING * 2 + 2.6, 2.6, 0, -RING); flat(RING * 2 + 2.6, 2.6, 0, RING); flat(2.6, RING * 2, -RING, 0); flat(2.6, RING * 2, RING, 0);
  flat(3, GATE.z - RING, 0, (GATE.z + RING) / 2);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.06, 28), stone); plaza.position.y = 0.03; plaza.receiveShadow = true; scene.add(plaza);
  const fountain = new THREE.Group();
  fountain.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.6, 18), mat(0xcfc6b4)), { castShadow: true }));
  const fw = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.1, 18), new THREE.MeshStandardMaterial({ color: 0x7cc6e6, roughness: 0.1 })); fw.position.y = 0.32; fountain.add(fw);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xbfe8f7, transparent: true, opacity: 0.7 })); jet.position.y = 1; fountain.add(jet);
  fountain.position.y = 0.3; scene.add(fountain);
  const gate = new THREE.Group();
  for (const x of [-2.6, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4, 0.7), mat(0x8a5a32)); p.position.set(x, 2, 0); p.castShadow = true; gate.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.2, 0.5), mat(0x2f6b3a)); beam.position.y = 4.3; beam.castShadow = true; gate.add(beam);
  const gateSign = label('THIRD’S ZOO', '#fff7df', 'rgba(0,0,0,0)', 40); gateSign.position.set(0, 4.3, 0.3); gate.add(gateSign);
  gate.position.set(GATE.x, 0, GATE.z - 2); scene.add(gate);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2; const r = 41 + Math.random() * 3;
    if (Math.abs(a - Math.PI / 2) < 0.18) continue;
    const t = Math.random() < 0.5 ? pine() : acacia(); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); t.rotation.y = Math.random() * 6; t.scale.setScalar(0.9 + Math.random() * 0.5); scene.add(t);
  }

  /** A flat text board drawn on a canvas. */
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
    return new THREE.Mesh(new THREE.PlaneGeometry(c.width * scale * 0.5, c.height * scale * 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  }

  // ---------- Habitats ----------
  const plotViews = PLOTS.map((p, i) => {
    const root = new THREE.Group(); root.position.set(p.x, 0, p.z); scene.add(root);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.2, PLOT_SIZE), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.1; hit.userData.plot = i; root.add(hit);
    return { root, hit, content: null, items: new Map() };
  });
  const selectFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PLOT_SIZE + 0.4, 0.3, PLOT_SIZE + 0.4)), new THREE.LineBasicMaterial({ color: 0xffe066 }));
  selectFrame.visible = false; scene.add(selectFrame);
  // The grid shows while placing items, so cells are easy to aim at.
  const grid = new THREE.GridHelper(PLOT_SIZE, PLOT_SIZE, 0xffffff, 0xffffff); grid.material.transparent = true; grid.material.opacity = 0.35; grid.position.y = 0.13; grid.visible = false; scene.add(grid);

  function buildPlot(i) {
    const view = plotViews[i]; const st = sim.state.plots[i];
    if (view.content) view.root.remove(view.content);
    view.items.clear();
    const g = new THREE.Group(); view.content = g; view.root.add(g);
    if (!st.owned) {
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.05, PLOT_SIZE), mat(0x92cc6c)); lawn.position.y = 0.03; lawn.receiveShadow = true; g.add(lawn);
      for (const [x, z] of [[HALF, HALF], [-HALF, HALF], [HALF, -HALF], [-HALF, -HALF]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), mat(0xf2f2f2)); post.position.set(x, 0.45, z); post.castShadow = true; g.add(post); }
      const sign = label('Đất trống', '#14202b', 'rgba(255,255,255,0.94)', 34, sim.admin ? 'Miễn phí' : `Mua: ${sim.fmt(sim.plotCost())}`);
      sign.scale.setScalar(3.2); sign.position.set(0, 2.2, 0); sign.rotation.x = -0.75; g.add(sign);
      return;
    }
    const b = BIOMES[st.biome];
    const ground = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.1, PLOT_SIZE), mat(b.ground)); ground.position.y = 0.05; ground.receiveShadow = true; g.add(ground);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE + 0.3, 0.06, PLOT_SIZE + 0.3), mat(b.edge)); edge.position.y = 0.02; g.add(edge);
    // Fence by grade: taller and darker as it gets stronger.
    const bar = BARRIERS[st.barrier]; const postMat = mat(bar.post); const railMat = mat(bar.rail);
    for (let k = -HALF; k <= HALF + 0.01; k += 1.5) {
      for (const [x, z] of [[k, HALF], [k, -HALF], [HALF, k], [-HALF, k]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, bar.height, 0.18), postMat); post.position.set(x, bar.height / 2, z); post.castShadow = true; g.add(post); }
    }
    const rails = st.barrier === 3 ? [0.4, 1.0, 1.6, 2.2, 2.55] : st.barrier === 2 ? [0.5, 1.1, 1.7, 1.95] : [0.55, 1.0];
    for (const y of rails) {
      for (const [w, d, x, z] of [[PLOT_SIZE, 0.08, 0, HALF], [PLOT_SIZE, 0.08, 0, -HALF], [0.08, PLOT_SIZE, HALF, 0], [0.08, PLOT_SIZE, -HALF, 0]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), railMat); r.position.set(x, y, z); g.add(r); }
    }
    for (const it of st.items) addItem(i, it);
    if (st.board) {
      // On the side that faces the plaza, outside the fence.
      const toCentre = new THREE.Vector3(-PLOTS[i].x, 0, -PLOTS[i].z).normalize();
      const along = Math.abs(toCentre.x) > Math.abs(toCentre.z) ? new THREE.Vector3(Math.sign(toCentre.x), 0, 0) : new THREE.Vector3(0, 0, Math.sign(toCentre.z));
      const board = boardModel(); board.position.copy(along.clone().multiplyScalar(HALF + 0.9)).add(new THREE.Vector3(along.z * 3, 0, along.x * 3));
      board.rotation.y = Math.atan2(along.x, along.z); g.add(board);
    }
  }
  const itemCentre = (it) => { const d = ITEMS[it.type]; return new THREE.Vector3(it.x + d.w / 2 - HALF, 0.1, it.z + d.d / 2 - HALF); };
  function addItem(i, it) {
    const st = sim.state.plots[i]; const d = ITEMS[it.type];
    const m = itemModel(it.type, st.biome, BIOMES[st.biome].water, d.w, d.d); m.position.copy(itemCentre(it));
    plotViews[i].content.add(m); plotViews[i].items.set(it.id, m);
  }
  function removeItem(i, id) { const m = plotViews[i].items.get(id); if (m) { m.parent.remove(m); plotViews[i].items.delete(id); } }

  // ---------- Facilities ----------
  const slotViews = SLOTS.map((s, k) => {
    const root = new THREE.Group(); root.position.set(s.x, 0, s.z); scene.add(root);
    // Face the nearest path: the gate road, the ring from inside, or the ring from outside.
    const road = Math.abs(s.x) < 4 && s.z > 10; const inner = Math.abs(s.x) < 7 && Math.abs(s.z) < 7;
    root.rotation.y = road ? (s.x > 0 ? -Math.PI / 2 : Math.PI / 2) : inner ? Math.atan2(s.x, s.z)
      : Math.abs(s.x) > Math.abs(s.z) ? (s.x > 0 ? -Math.PI / 2 : Math.PI / 2) : (s.z > 0 ? Math.PI : 0);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 1.9), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55 }));
    marker.position.y = 0.06; marker.visible = false; marker.userData.slot = k; root.add(marker);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.1; hit.userData.slot = k; root.add(hit);
    return { root, marker, hit, model: null, type: null };
  });
  function buildFacilities() {
    slotViews.forEach((v, k) => {
      const f = sim.state.facilities.find((x) => x.slot === k);
      if ((f?.type || null) === v.type) return;
      if (v.model) { v.root.remove(v.model); v.model = null; }
      v.type = f?.type || null;
      if (f) { v.model = facilityModel(f.type, FACILITIES[f.type].color); v.root.add(v.model); }
    });
  }
  function showSlots(on) { slotViews.forEach((v, k) => { v.marker.visible = on && sim.slotFree(k); }); }

  // ---------- Animals ----------
  const animalViews = new Map();
  const growth = (a) => { const sp = SPECIES_BY_ID[a.species]; return 1.3 * (a.age >= sp.adult ? 1 : 0.5 + 0.5 * (a.age / sp.adult)); };
  const freeSpot = () => new THREE.Vector3((Math.random() - 0.5) * (PLOT_SIZE - 2.4), 0.1, (Math.random() - 0.5) * (PLOT_SIZE - 2.4));
  function addAnimal(a) {
    const sp = SPECIES_BY_ID[a.species]; const model = makeAnimal(a.species, growth(a));
    const v = { a, model, target: freeSpot(), wait: Math.random() * 3, speed: 0.6 + sp.size * 0.35, route: null };
    model.group.traverse((o) => { o.userData.animal = a.id; });
    model.group.userData.animal = a.id;
    placeInPlot(v); animalViews.set(a.id, v);
    if (a.escaped) setEscaped(a.id, true);
  }
  function placeInPlot(v) { v.route = null; v.model.group.position.copy(freeSpot()); v.model.group.rotation.y = Math.random() * 6; plotViews[v.a.plot].root.add(v.model.group); }
  function removeAnimal(id) { const v = animalViews.get(id); if (v) { v.model.group.parent?.remove(v.model.group); animalViews.delete(id); } }
  function moveAnimal(a) { const v = animalViews.get(a.id); if (v) { v.a = a; placeInPlot(v); } }
  // Loose: it runs along the guests' path until caught.
  function setEscaped(id, loose) {
    const v = animalViews.get(id); if (!v) return;
    if (loose) {
      v.route = { seg: 1 + Math.floor(Math.random() * 4), t: 0 };
      scene.add(v.model.group);
    } else placeInPlot(v);
  }
  function refreshGrowth() { for (const v of animalViews.values()) v.model.group.scale.setScalar(growth(v.a)); }

  // ---------- People ----------
  const route = [[GATE.x, GATE.z - 1], [0, RING], [RING, RING], [RING, -RING], [-RING, -RING], [-RING, RING], [0, RING], [GATE.x, GATE.z - 1]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const walkers = []; const staffWalkers = []; const visits = [];
  const shirts = [0xe94b5b, 0x3a7bd5, 0xf2b134, 0x2fa36b, 0x9b59b6, 0xff8c42, 0x1abc9c];
  const newWalker = (p, speed) => ({ p, seg: Math.floor(Math.random() * (route.length - 1)), t: Math.random(), speed, side: (Math.random() - 0.5) * 1.6 });
  function syncPeople() {
    const want = Math.max(0, Math.min(Math.round(sim.state.guests / 2), lowPower ? 26 : 50));
    while (walkers.length < want) { const p = person(shirts[walkers.length % shirts.length]); p.scale.setScalar(0.9 + Math.random() * 0.2); scene.add(p); walkers.push(newWalker(p, 1.4 + Math.random() * 0.8)); }
    while (walkers.length > want) scene.remove(walkers.pop().p);
    const roles = Object.entries(sim.state.staff).flatMap(([role, n]) => Array(Math.min(n, 4)).fill(role));
    const key = roles.join(',');
    if (staffWalkers.key !== key) {
      staffWalkers.forEach((w) => scene.remove(w.p)); staffWalkers.length = 0;
      for (const role of roles) { const [shirt, cap] = STAFF_LOOK[role]; const p = person(shirt, cap); scene.add(p); staffWalkers.push(newWalker(p, 1.1)); }
      staffWalkers.key = key;
    }
  }
  function walk(list, dt) {
    for (const w of list) {
      const a = route[w.seg]; const b = route[w.seg + 1]; const len = a.distanceTo(b) || 1;
      w.t += (w.speed * dt) / len;
      if (w.t >= 1) { w.t = 0; w.seg = (w.seg + 1) % (route.length - 1); }
      const pos = a.clone().lerp(b, w.t); const dir = b.clone().sub(a).normalize();
      pos.x += -dir.z * w.side; pos.z += dir.x * w.side;
      w.p.position.copy(pos); w.p.rotation.y = Math.atan2(dir.x, dir.z);
      w.p.position.y = Math.abs(Math.sin(performance.now() / 160 + w.side * 5)) * 0.06;
    }
  }
  /** A keeper steps into a habitat for a few seconds to feed and clean. */
  function keeperVisit(i) {
    if (visits.some((v) => v.plot === i)) return;
    const p = person(...STAFF_LOOK.keeper); p.position.set(HALF - 1.2, 0, HALF - 1.2); plotViews[i].root.add(p);
    visits.push({ plot: i, p, left: 4 });
  }

  // ---------- Selection, placing ----------
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  let selectedAnimal = null;
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.45, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), ghostMat); ghost.visible = false; scene.add(ghost);
  function selectPlot(i) { selectFrame.visible = i !== null; if (i !== null) selectFrame.position.set(PLOTS[i].x, 0.2, PLOTS[i].z); }
  function selectAnimal(id) { selectedAnimal = id; ring.visible = id !== null; }
  function setGrid(i) { grid.visible = i !== null && i !== undefined; if (grid.visible) grid.position.set(PLOTS[i].x, 0.13, PLOTS[i].z); }
  /** Puts the placing box where an item would go; returns that spot. */
  function showGhost(type, hit) {
    if (!type || !hit || hit.plot === undefined || !sim.state.plots[hit.plot].owned) { ghost.visible = false; setGrid(null); return null; }
    const d = ITEMS[type]; const cx = hit.cell.x - Math.floor((d.w - 1) / 2); const cz = hit.cell.z - Math.floor((d.d - 1) / 2);
    ghost.scale.set(d.w, 1, d.d); ghost.position.set(PLOTS[hit.plot].x + cx + d.w / 2 - HALF, 0.3, PLOTS[hit.plot].z + cz + d.d / 2 - HALF);
    const ok = sim.actions.canPlace(hit.plot, type, cx, cz); ghostMat.color.set(ok ? 0x4caf50 : 0xe53935); ghost.visible = true; setGrid(hit.plot);
    return { plot: hit.plot, x: cx, z: cz, ok };
  }
  function hideGhost() { ghost.visible = false; setGrid(null); }

  // What is under a point on screen: an animal, a facility or empty spot, or a habitat cell.
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  function pick(clientX, clientY, { slots = false } = {}) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets = [...plotViews.map((v) => v.hit), ...slotViews.map((v) => (slots ? v.marker : v.hit)).filter((m) => slots ? m.visible : true), ...[...animalViews.values()].map((v) => v.model.group)];
    for (const h of ray.intersectObjects(targets, true)) {
      const u = h.object.userData;
      if (u.animal !== undefined) return { animal: u.animal };
      if (u.slot !== undefined) { if (!slots && sim.slotFree(u.slot)) continue; return { slot: u.slot }; }
      if (u.plot !== undefined) {
        const local = h.point.clone().sub(plotViews[u.plot].root.position);
        return { plot: u.plot, cell: { x: Math.max(0, Math.min(PLOT_SIZE - 1, Math.floor(local.x + HALF))), z: Math.max(0, Math.min(PLOT_SIZE - 1, Math.floor(local.z + HALF))) } };
      }
    }
    return null;
  }

  // ---------- Run ----------
  let fitted = false;
  function resize() {
    const w = host.clientWidth; const h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!fitted) {
      fitted = true; const dist = 78 * Math.max(1, 1.15 / camera.aspect);
      controls.maxDistance = Math.max(115, dist + 20);
      camera.position.copy(controls.target).add(new THREE.Vector3(0, 52, 56).normalize().multiplyScalar(dist));
    }
  }
  addEventListener('resize', resize);

  function frame(dt) {
    const speed = sim.state.speed;
    const animDt = dt * Math.max(speed, 0.0001) ** 0.5;
    for (const v of animalViews.values()) {
      const g = v.model.group; let moving = false;
      if (v.route) {
        // Loose on the path: trot along it.
        const a = route[v.route.seg]; const b = route[v.route.seg + 1]; const len = a.distanceTo(b) || 1;
        v.route.t += (v.speed * 1.6 * animDt) / len;
        if (v.route.t >= 1) { v.route.t = 0; v.route.seg = (v.route.seg + 1) % (route.length - 1); }
        const dir = b.clone().sub(a).normalize(); g.position.copy(a.clone().lerp(b, v.route.t)); g.rotation.y = Math.atan2(dir.x, dir.z); moving = true;
      } else if (v.wait > 0) { v.wait -= animDt; } else {
        const d = v.target.clone().sub(g.position); d.y = 0; const dist = d.length();
        if (dist < 0.15) { v.wait = 1.5 + Math.random() * 4; v.target = freeSpot(); }
        else { d.normalize(); g.position.addScaledVector(d, Math.min(dist, v.speed * animDt * (v.a.welfare > 40 && !v.a.sick ? 1 : 0.5))); const ang = Math.atan2(d.x, d.z); g.rotation.y += ((ang - g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, animDt * 6); moving = true; }
      }
      v.model.update(animDt, moving);
      if (v.a.id === selectedAnimal) { const wp = g.getWorldPosition(new THREE.Vector3()); ring.position.set(wp.x, 0.15, wp.z); ring.scale.setScalar(Math.max(0.8, g.scale.x * 0.9)); }
    }
    syncPeople();
    const walkDt = dt * Math.max(1, speed * 0.7) * (speed ? 1 : 0);
    walk(walkers, walkDt); walk(staffWalkers, walkDt * 0.8);
    for (const v of [...visits]) { v.left -= dt; if (v.left <= 0) { v.p.parent?.remove(v.p); visits.splice(visits.indexOf(v), 1); } }
    const phase = (sim.state.time % DAY_SECONDS) / DAY_SECONDS; const light = 0.75 + Math.sin(phase * Math.PI) * 0.45;
    sun.intensity = 1.0 + light * 0.6; hemi.intensity = 0.65 + light * 0.4;
    jet.scale.y = 0.9 + Math.sin(performance.now() / 300) * 0.1;
    const camDist = camera.position.distanceTo(controls.target); scene.fog.near = camDist + 20; scene.fog.far = camDist * 1.4 + 90;
    controls.update(); renderer.render(scene, camera);
  }

  return {
    renderer, camera, controls, resize, frame, pick, buildPlot, addItem, removeItem, buildFacilities, showSlots,
    addAnimal, removeAnimal, moveAnimal, setEscaped, refreshGrowth, keeperVisit, selectPlot, selectAnimal, showGhost, hideGhost,
    buildAll() { sim.state.plots.forEach((_, i) => buildPlot(i)); buildFacilities(); for (const a of sim.state.animals) addAnimal(a); },
    rebuildPlots() { sim.state.plots.forEach((_, i) => buildPlot(i)); },
    // For the browser tests: where a plot or a spot is on screen, and close-ups.
    screenOf(x, z) { const v = new THREE.Vector3(x, 0.2, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; },
    // shiftPx moves the spot right on screen by that much, to centre it in the space beside an open drawer.
    focus(x, z, dist = 16, shiftPx = 0) {
      controls.target.set(x, 1, z); camera.position.set(x + dist * 0.5, dist * 0.55, z + dist); camera.lookAt(controls.target); camera.updateMatrixWorld();
      if (shiftPx) {
        const unitsPerPx = (2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / renderer.domElement.clientHeight;
        const shift = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-shiftPx * unitsPerPx);
        controls.target.add(shift); camera.position.add(shift);
      }
      controls.update();
    },
  };
}
