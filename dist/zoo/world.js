// Third's Zoo world: everything drawn in 3D. It reads the simulation and never changes it; main.js tells it what
// changed (a path drawn, an animal born) and asks it what is under the pointer.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { MAP, ENTRANCE, PATH_WIDTH, TERRAIN, SPECIES_BY_ID, ITEMS, BARRIERS, FACILITIES, DAY_SECONDS } from './data.js';
import { makeAnimal, acacia, pine, person, itemModel, facilityModel, boardModel, mat } from './models3d.js';
import { randomInPoly, edges, nearestOnSegment, pointInPoly } from './geom.js';

const STAFF_LOOK = { keeper: [0x2f6b3a, 0xf2b134], vet: [0xf5f5f5, 0xd9534f], mechanic: [0xff8c42, 0x56606a], janitor: [0x1abc9c, 0x0f5f50], security: [0x1f2f4f, 0x111111] };
const SHIRTS = [0xe94b5b, 0x3a7bd5, 0xf2b134, 0x2fa36b, 0x9b59b6, 0xff8c42, 0x1abc9c];
const v3 = (p, y = 0) => new THREE.Vector3(p[0], y, p[1]);

export function createWorld(host, sim) {
  const lowPower = matchMedia('(max-width: 720px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3f2);
  scene.fog = new THREE.Fog(0xbfe3f2, 90, 220);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 42); controls.enableDamping = true; controls.maxPolarAngle = 1.42; controls.minDistance = 5; controls.maxDistance = 170; controls.screenSpacePanning = false;
  camera.position.set(lowPower ? 0 : 26, 45, 102);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x5f7f45, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dc, 1.6); sun.position.set(50, 80, 35); sun.castShadow = true;
  sun.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 220 });
  scene.add(sun); scene.add(sun.target);

  // ---------- Land: painted ground in a ring of beach and sea ----------
  const N = sim.terrainSize; const texData = new Uint8Array(N * N * 4);
  const noise = new Float32Array(N * N).map(() => 0.9 + Math.random() * 0.14);
  const tex = new THREE.DataTexture(texData, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  const colours = TERRAIN.map((t) => new THREE.Color(t.color));
  function refreshTerrain() {
    const g = sim.terrainGrid();
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const c = colours[g[iz * N + ix]]; const n = noise[iz * N + ix]; const o = ((N - 1 - iz) * N + ix) * 4; // texture rows run from the north edge
      texData[o] = Math.min(255, c.r * 255 * n); texData[o + 1] = Math.min(255, c.g * 255 * n); texData[o + 2] = Math.min(255, c.b * 255 * n); texData[o + 3] = 255;
    }
    tex.needsUpdate = true;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP.half * 2, MAP.half * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(500, 48), new THREE.MeshStandardMaterial({ color: 0x5ab4dc, roughness: 0.3 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.8; scene.add(sea);
  const beach = new THREE.Mesh(new THREE.BoxGeometry(MAP.half * 2 + 10, 1, MAP.half * 2 + 10), mat(0xf0dca8)); beach.position.y = -0.52; scene.add(beach);
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(MAP.half * 2, 0.6, MAP.half * 2), mat(0x6b8f45)); cliff.position.y = -0.31; scene.add(cliff);
  // Trees round the edge, outside the land you can build on.
  for (let k = 0; k < 90; k++) {
    const side = k % 4; const t = Math.random() * 2 - 1; const edge = MAP.build + 2 + Math.random() * 3.5;
    const [x, z] = side === 0 ? [t * MAP.half, -edge] : side === 1 ? [t * MAP.half, edge] : side === 2 ? [-edge, t * MAP.half] : [edge, t * MAP.half];
    if (side === 1 && Math.abs(x) < 9) continue;
    const tree = Math.random() < 0.6 ? pine() : acacia(); tree.position.set(x, 0, z); tree.rotation.y = Math.random() * 6; tree.scale.setScalar(0.9 + Math.random() * 0.7); scene.add(tree);
  }
  // The entrance: an arch over the start of the path and a ticket booth.
  const gate = new THREE.Group();
  for (const x of [-2.8, 2.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), mat(0x8a5a32)); p.position.set(x, 2.25, 0); p.castShadow = true; gate.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 1.3, 0.6), mat(0x2f6b3a)); beam.position.y = 4.7; beam.castShadow = true; gate.add(beam);
  const gateSign = label('THIRD’S ZOO', '#fff7df', 'rgba(0,0,0,0)', 40); gateSign.position.set(0, 4.7, 0.35); gate.add(gateSign);
  const booth = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2), mat(0xf5ecd8)); booth.position.set(5, 1.1, 1.5); booth.castShadow = true; gate.add(booth);
  const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.4), mat(0x2f6b3a)); boothRoof.position.set(5, 2.3, 1.5); gate.add(boothRoof);
  gate.position.set(ENTRANCE.x, 0, ENTRANCE.z + 1); scene.add(gate);

  function label(text, color = '#14202b', bg = 'rgba(255,255,255,0.92)', px = 34) {
    const c = document.createElement('canvas'); const ctx = c.getContext('2d');
    ctx.font = `700 ${px}px Manrope, "Be Vietnam Pro", system-ui, sans-serif`;
    c.width = Math.ceil(ctx.measureText(text).width + px * 1.2); c.height = Math.ceil(px * 1.6);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, px * 0.35); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${px}px Manrope, "Be Vietnam Pro", system-ui, sans-serif`; ctx.fillText(text, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const s = 0.011 * (px / 34);
    return new THREE.Mesh(new THREE.PlaneGeometry(c.width * s, c.height * s), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }

  // ---------- Paths ----------
  const pathGroup = new THREE.Group(); scene.add(pathGroup);
  const pathMat = mat(0xd9cfb9); const kerbMat = mat(0xb8ac94);
  function rebuildPaths() {
    pathGroup.clear();
    const nodes = new Map();
    for (const s of sim.state.paths) {
      const a = v3(s.a); const b = v3(s.b); const len = a.distanceTo(b); const mid = a.clone().add(b).multiplyScalar(0.5); const ang = Math.atan2(b.x - a.x, b.z - a.z);
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(PATH_WIDTH + 0.3, 0.05, len), kerbMat); kerb.position.set(mid.x, 0.025, mid.z); kerb.rotation.y = ang; kerb.receiveShadow = true; pathGroup.add(kerb);
      const p = new THREE.Mesh(new THREE.BoxGeometry(PATH_WIDTH, 0.07, len), pathMat); p.position.set(mid.x, 0.04, mid.z); p.rotation.y = ang; p.receiveShadow = true; pathGroup.add(p);
      for (const q of [s.a, s.b]) nodes.set(`${q[0]},${q[1]}`, q);
    }
    for (const q of nodes.values()) { const j = new THREE.Mesh(new THREE.CylinderGeometry(PATH_WIDTH / 2, PATH_WIDTH / 2, 0.07, 20), pathMat); j.position.set(q[0], 0.041, q[1]); j.receiveShadow = true; pathGroup.add(j); }
  }

  // ---------- Habitats ----------
  const habViews = new Map(); // id → { root, items: Map }
  function buildHabitat(h) {
    const old = habViews.get(h.id); if (old) scene.remove(old.root);
    const root = new THREE.Group(); scene.add(root); const view = { root, items: new Map() }; habViews.set(h.id, view);
    const bar = BARRIERS[h.barrier]; const postMat = mat(bar.post); const railMat = mat(bar.rail);
    const rails = h.barrier === 4 ? [0.4, 1.2, 2.0, 2.7] : h.barrier === 3 ? [0.4, 1.0, 1.6, 2.2, 2.55] : h.barrier === 2 ? [0.5, 1.1, 1.7, 1.95] : [0.55, 1.0];
    const gateAt = sim.hInfo(h).gate?.point;
    for (const [a, b] of edges(h.pts)) {
      const A = v3(a); const B = v3(b); const len = A.distanceTo(B); const ang = Math.atan2(B.x - A.x, B.z - A.z); const steps = Math.max(1, Math.round(len / 1.6));
      for (let k = 0; k <= steps; k++) { const p = A.clone().lerp(B, k / steps); const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, bar.height, 0.18), postMat); post.position.set(p.x, bar.height / 2, p.z); post.castShadow = true; root.add(post); }
      for (const y of rails) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), railMat); r.position.set((A.x + B.x) / 2, y, (A.z + B.z) / 2); r.rotation.y = ang; root.add(r); }
      if (bar.glass) {
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x8ecae6, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.45, depthWrite: false });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, bar.height - 0.2, len), glassMat);
        glass.position.set((A.x + B.x) / 2, bar.height / 2, (A.z + B.z) / 2);
        glass.rotation.y = ang;
        root.add(glass);
      }
    }
    if (gateAt) {
      // A keeper gate: two tall posts where the fence meets the path; the education board beside it.
      for (const s of [-0.9, 0.9]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, bar.height + 0.6, 0.3), mat(0x56606a)); p.position.set(gateAt[0] + s * 0.7, (bar.height + 0.6) / 2, gateAt[1] + s * 0.7); root.add(p); }
      if (h.board) {
        const c = sim.hInfo(h).centre; const out = new THREE.Vector3(gateAt[0] - c[0], 0, gateAt[1] - c[1]).normalize();
        const board = boardModel(); board.position.set(gateAt[0] + out.x * 0.9 + out.z * 2.2, 0, gateAt[1] + out.z * 0.9 - out.x * 2.2); board.rotation.y = Math.atan2(out.x, out.z); root.add(board);
      }
    }
    for (const it of h.items) addItem(h.id, it);
  }
  function addItem(hid, it) {
    const view = habViews.get(hid); if (!view) return; const d = ITEMS[it.type];
    const m = d.kind === 'plant' ? itemModel('plant', d.plant) : itemModel(it.type === 'bigpool' ? 'pool' : it.type, null, 0x4f9fc4, d.w, d.d);
    m.position.set(it.x, 0.06, it.z); m.rotation.y = it.rot || 0; view.root.add(m); view.items.set(it.id, m);
  }
  function removeItem(hid, id) { const view = habViews.get(hid); const m = view?.items.get(id); if (m) { view.root.remove(m); view.items.delete(id); } }
  function rebuildHabitats() { for (const [id, v] of habViews) if (!sim.state.habitats.some((h) => h.id === id)) { scene.remove(v.root); habViews.delete(id); } for (const h of sim.state.habitats) buildHabitat(h); }

  // ---------- Facilities ----------
  const facViews = new Map();
  function rebuildFacilities() {
    for (const [id, m] of facViews) if (!sim.state.facilities.some((f) => f.id === id)) { scene.remove(m); facViews.delete(id); }
    for (const f of sim.state.facilities) {
      if (facViews.has(f.id)) continue;
      const m = facilityModel(f.type, FACILITIES[f.type].color); m.position.set(f.x, 0, f.z); m.rotation.y = f.rot; m.traverse((o) => { o.userData.facility = f.id; });
      scene.add(m); facViews.set(f.id, m);
    }
  }

  // ---------- Animals ----------
  const animalViews = new Map();
  const growth = (a) => { const sp = SPECIES_BY_ID[a.species]; return 1.3 * (a.age >= sp.adult ? 1 : 0.5 + 0.5 * (a.age / sp.adult)); };
  const habOf = (a) => sim.habById(a.hab);
  function spotFor(v) {
    const h = habOf(v.a); if (!h) return { pos: [v.model.group.position.x, v.model.group.position.z], kind: 'idle' };
    const night = (sim.state.time % DAY_SECONDS) / DAY_SECONDS > 0.8;
    if (night) {
      const shelters = h.items.filter((it) => ITEMS[it.type]?.kind === 'shelter');
      if (shelters.length) {
        const it = shelters[Math.floor(Math.random() * shelters.length)];
        return { pos: [it.x + (Math.random() - 0.5) * 1.2, it.z + (Math.random() - 0.5) * 1.2], kind: 'shelter' };
      }
    }
    const needs = v.a.needs || {};
    // FSM: Hungry -> seek feeder or plants
    if (needs.food < 45 || Math.random() < 0.28) {
      const feeders = h.items.filter((it) => {
        const k = ITEMS[it.type]?.kind;
        return k === 'feeder' || it.type === 'feeder' || it.type === 'hayball';
      });
      if (feeders.length) {
        const it = feeders[Math.floor(Math.random() * feeders.length)];
        return { pos: [it.x + (Math.random() - 0.5) * 1.2, it.z + (Math.random() - 0.5) * 1.2], kind: 'plant' };
      }
      const plants = h.items.filter((it) => ITEMS[it.type]?.kind === 'plant');
      if (plants.length && Math.random() < 0.5) {
        const it = plants[Math.floor(Math.random() * plants.length)];
        return { pos: [it.x + (Math.random() - 0.5) * 1.2, it.z + (Math.random() - 0.5) * 1.2], kind: 'plant' };
      }
    }
    // FSM: Thirsty -> seek water trough or pool
    if (needs.water < 45 || Math.random() < 0.28) {
      const waters = h.items.filter((it) => ITEMS[it.type]?.kind === 'water');
      if (waters.length) {
        const it = waters[Math.floor(Math.random() * waters.length)];
        return { pos: [it.x + (Math.random() - 0.5) * 1.5, it.z + (Math.random() - 0.5) * 1.5], kind: 'water' };
      }
    }
    // FSM: Bored -> seek enrichment toy
    if (needs.enrich < 55 || Math.random() < 0.3) {
      const toys = h.items.filter((it) => ITEMS[it.type]?.kind === 'enrich');
      if (toys.length) {
        const it = toys[Math.floor(Math.random() * toys.length)];
        return { pos: [it.x + (Math.random() - 0.5) * 1.2, it.z + (Math.random() - 0.5) * 1.2], kind: 'enrich' };
      }
    }
    // FSM: Wander inside habitat
    return { pos: randomInPoly(h.pts, 1.2), kind: Math.random() < 0.35 ? 'plant' : 'idle' };
  }
  function addAnimal(a) {
    const sp = SPECIES_BY_ID[a.species]; const model = makeAnimal(a.species, growth(a));
    const v = { a, model, target: null, destKind: 'idle', act: 'idle', wait: Math.random() * 3, speed: 0.6 + sp.size * 0.35, loose: false, walker: null };
    model.group.userData.animal = a.id;
    animalViews.set(a.id, v); placeInHabitat(v);
    if (a.escaped) setEscaped(a.id, true);
  }
  function placeInHabitat(v) {
    const h = habOf(v.a); v.loose = false; v.walker = null;
    const p = h ? randomInPoly(h.pts, 1.2) : [0, 0];
    v.model.group.position.set(p[0], 0.06, p[1]);
    v.model.group.rotation.y = Math.random() * 6;
    v.target = null; v.act = 'idle';
    scene.add(v.model.group);
  }
  function removeAnimal(id) { const v = animalViews.get(id); if (v) { scene.remove(v.model.group); animalViews.delete(id); } }
  function moveAnimal(a) { const v = animalViews.get(a.id); if (v) { v.a = a; placeInHabitat(v); } }
  function setEscaped(id, loose) {
    const v = animalViews.get(id); if (!v) return;
    if (!loose) { placeInHabitat(v); return; }
    const gp = sim.hInfo(habOf(v.a)).gate?.point;
    const start = gp ? sim.nearestPath(gp) : null; if (start?.point) v.model.group.position.set(start.point[0], 0.06, start.point[1]);
    const n = start?.seg ? sim.graph().nodes.get(`${Math.round(start.seg.a[0] * 10) / 10},${Math.round(start.seg.a[1] * 10) / 10}`) : null;
    v.loose = true; v.walker = { obj: v.model.group, node: n?.k ?? sim.graph().entrance, target: n ? [n.x, n.z] : null, next: n?.k };
  }
  function refreshGrowth() { for (const v of animalViews.values()) v.model.group.scale.setScalar(growth(v.a)); }
  // The model's own children carry the id too, once its .glb has replaced the stand-in.
  function tagAnimal(v) { if (v.tagged === v.model.group.children.length) return; v.model.group.traverse((o) => { o.userData.animal = v.a.id; }); v.tagged = v.model.group.children.length; }

  // ---------- Guests and staff ----------
  const guestViews = new Map(); let heat = false;
  const heatColour = (h) => new THREE.Color().setHSL((h / 100) * 0.33, 0.8, 0.5);
  function syncGuests(dt) {
    const seen = new Set();
    for (const g of sim.state.visitors) {
      seen.add(g.id); let m = guestViews.get(g.id);
      if (!m) { m = person(SHIRTS[g.shirt % SHIRTS.length]); m.scale.setScalar(0.9 + (g.id % 5) * 0.05); m.position.set(g.x, 0, g.z); m.traverse((o) => { o.userData.guest = g.id; }); scene.add(m); guestViews.set(g.id, m); }
      // Keep to one side of the path's middle, smoothly behind the simulated point.
      const dx = g.x - m.position.x; const dz = g.z - m.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.02) m.rotation.y = Math.atan2(dx, dz);
      const side = g.side || 0; const nx = Math.cos(m.rotation.y) * side * 0.5; const nz = -Math.sin(m.rotation.y) * side * 0.5;
      m.position.x += (g.x + nx - m.position.x) * Math.min(1, dt * 8); m.position.z += (g.z + nz - m.position.z) * Math.min(1, dt * 8);
      m.position.y = Math.abs(Math.sin(performance.now() / 160 + g.id)) * 0.06;
      const body = m.children[0];
      if (heat) { if (!body.userData.own) { body.userData.own = body.material; body.material = body.material.clone(); } body.material.color.copy(heatColour(g.happy)); }
      else if (body.userData.own) { body.material = body.userData.own; body.userData.own = null; }
    }
    for (const [id, m] of guestViews) if (!seen.has(id)) { scene.remove(m); guestViews.delete(id); }
  }
  // Staff stroll the path network from node to node.
  const staffWalkers = []; let staffKey = '';
  function syncStaff() {
    const roles = Object.entries(sim.state.staff).flatMap(([role, n]) => Array(Math.min(n, 5)).fill(role)); const key = roles.join(',');
    if (staffKey === key) return;
    staffWalkers.forEach((w) => scene.remove(w.obj)); staffWalkers.length = 0; staffKey = key;
    const nodes = [...sim.graph().nodes.values()];
    for (const role of roles) { const p = person(...STAFF_LOOK[role]); const n = nodes[Math.floor(Math.random() * nodes.length)]; p.position.set(n.x, 0, n.z); scene.add(p); staffWalkers.push({ obj: p, node: n.k, target: null }); }
  }
  function walkGraph(w, dt, speed) {
    const g = sim.graph(); const o = w.obj.position;
    if (!w.target) {
      const n = g.nodes.get(w.node) || g.nodes.get(g.entrance); if (!n) return; w.node = n.k;
      const e = n.adj[Math.floor(Math.random() * n.adj.length)]; if (!e) return; w.next = e.to; const t = g.nodes.get(e.to); w.target = [t.x, t.z];
    }
    const dx = w.target[0] - o.x; const dz = w.target[1] - o.z; const d = Math.hypot(dx, dz);
    if (d <= speed * dt) { o.x = w.target[0]; o.z = w.target[1]; w.node = w.next; w.target = null; return; }
    o.x += (dx / d) * speed * dt; o.z += (dz / d) * speed * dt; w.obj.rotation.y = Math.atan2(dx, dz);
  }
  const visits = [];
  function keeperVisit(hid) {
    const h = sim.habById(hid); const gp = h && sim.hInfo(h).gate?.point; if (!gp || visits.some((v) => v.hid === hid)) return;
    const c = sim.hInfo(h).centre; const p = person(...STAFF_LOOK.keeper); p.position.set(gp[0] + (c[0] - gp[0]) * 0.15, 0, gp[1] + (c[1] - gp[1]) * 0.15); scene.add(p); visits.push({ hid, p, left: 4 });
  }

  // ---------- Litter ----------
  const litterMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: 0xf4f1e6 }), 300);
  litterMesh.count = 0; scene.add(litterMesh);
  function refreshLitter() {
    const m = new THREE.Matrix4(); const L = sim.state.litter; litterMesh.count = L.length;
    L.forEach((l, k) => { m.makeRotationY(l.id); m.setPosition(l.x, 0.1, l.z); litterMesh.setMatrixAt(k, m); });
    litterMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- Selection and previews ----------
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 32), new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const outline = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffe066 })); outline.visible = false; scene.add(outline);
  let selected = null;
  function select(sel) {
    selected = sel; outline.visible = false; ring.visible = false;
    if (sel?.kind === 'habitat') { const h = sim.habById(sel.id); if (h) { outline.geometry.dispose(); outline.geometry = new THREE.BufferGeometry().setFromPoints(h.pts.map((p) => v3(p, 0.35))); outline.visible = true; } }
    if (sel?.kind === 'animal' || sel?.kind === 'guest') ring.visible = true;
  }
  const okMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.5, depthWrite: false });
  const badMat = new THREE.MeshBasicMaterial({ color: 0xe53935, transparent: true, opacity: 0.5, depthWrite: false });
  const preview = new THREE.Group(); scene.add(preview);
  const clearPreview = () => { preview.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); preview.clear(); };
  const previews = {
    clear: clearPreview,
    path(a, b, ok) {
      clearPreview(); const A = v3(a); const B = v3(b || a); const len = Math.max(0.3, A.distanceTo(B));
      const m = new THREE.Mesh(new THREE.BoxGeometry(PATH_WIDTH, 0.12, len), ok ? okMat : badMat); m.position.copy(A.clone().add(B).multiplyScalar(0.5)).setY(0.12); m.rotation.y = Math.atan2(B.x - A.x, B.z - A.z); preview.add(m);
      for (const p of [A, B]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), ok ? okMat : badMat); c.position.copy(p).setY(0.6); preview.add(c); }
    },
    habitat(pts, cursor, ok) {
      clearPreview(); const all = cursor ? [...pts, cursor] : pts;
      if (all.length >= 2) preview.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(all.map((p) => v3(p, 0.6))), new THREE.LineBasicMaterial({ color: ok ? 0x4caf50 : 0xe53935 })));
      all.forEach((p, k) => { const r = k === 0 ? 0.55 : 0.3; const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.6, 10), ok ? okMat : badMat); c.position.copy(v3(p, 0.8)); preview.add(c); });
    },
    brush(p, r) { clearPreview(); const c = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.1, r - 0.18), r, 40), new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.position.copy(v3(p, 0.2)); preview.add(c); },
    footprint(w, d, p, rot, ok) { clearPreview(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), ok ? okMat : badMat); m.position.copy(v3(p, 0.3)); m.rotation.y = rot || 0; preview.add(m); },
  };

  // ---------- Picking ----------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function setRay(clientX, clientY) { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function groundAt(clientX, clientY) { setRay(clientX, clientY); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? [p.x, p.z] : null; }
  /** What is under a point on screen: an animal, a guest or a facility, and the ground point with its habitat. */
  function pick(clientX, clientY, { things = true } = {}) {
    setRay(clientX, clientY); const out = {};
    if (things) {
      for (const v of animalViews.values()) tagAnimal(v);
      const targets = [...[...animalViews.values()].map((v) => v.model.group), ...guestViews.values(), ...facViews.values()];
      for (const h of ray.intersectObjects(targets, true)) {
        const u = h.object.userData;
        if (u.animal !== undefined) { out.animal = u.animal; break; } if (u.guest !== undefined) { out.guest = u.guest; break; } if (u.facility !== undefined) { out.facility = u.facility; break; }
      }
    }
    const p = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, p)) { out.point = [p.x, p.z]; const h = sim.habitatAt(out.point); if (h) out.habitat = h.id; }
    return out;
  }

  // ---------- Camera keys: WASD or arrows move, Q/E turn ----------
  const keys = new Set();
  addEventListener('keydown', (e) => { if (e.target.closest?.('input, select, textarea')) return; keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  function moveCamera(dt) {
    if (!keys.size) return;
    const d = camera.position.distanceTo(controls.target); const speed = Math.max(8, d * 0.9) * dt;
    const fwd = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize(); const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3();
    if (keys.has('w') || keys.has('arrowup')) move.add(fwd); if (keys.has('s') || keys.has('arrowdown')) move.sub(fwd);
    if (keys.has('d') || keys.has('arrowright')) move.add(right); if (keys.has('a') || keys.has('arrowleft')) move.sub(right);
    if (move.lengthSq()) { move.normalize().multiplyScalar(speed); controls.target.add(move); camera.position.add(move); }
    const turn = (keys.has('q') ? 1 : 0) - (keys.has('e') ? 1 : 0);
    if (turn) { const off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn * dt * 1.4); camera.position.copy(controls.target).add(off); }
    controls.target.x = Math.max(-MAP.half, Math.min(MAP.half, controls.target.x)); controls.target.z = Math.max(-MAP.half, Math.min(MAP.half, controls.target.z));
  }

  // ---------- Run ----------
  function resize() { const w = host.clientWidth; const h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);
  let litterDirty = true; let terrainDirty = true;
  function frame(dt) {
    const speed = sim.state.speed; const animDt = dt * Math.max(speed, 0.0001) ** 0.5;
    moveCamera(dt);
    for (const v of animalViews.values()) {
      const g = v.model.group; let act = 'idle';
      if (v.loose && v.walker) {
        walkGraph(v.walker, animDt, v.speed * 1.6);
        act = 'run';
      } else if (v.wait > 0) {
        v.wait -= animDt;
        act = v.act || 'idle';
      } else {
        if (!v.target) {
          const s = spotFor(v);
          v.target = s.pos;
          v.destKind = s.kind;
        }
        const dx = v.target[0] - g.position.x; const dz = v.target[1] - g.position.z; const d = Math.hypot(dx, dz);
        if (d < 0.25) {
          v.wait = 2.0 + Math.random() * 5;
          v.target = null;
          if (v.destKind === 'water') v.act = 'water';
          else if (v.destKind === 'plant') v.act = 'eat';
          else if (v.destKind === 'enrich') v.act = 'play';
          else if (v.destKind === 'shelter') v.act = 'sleep';
          else v.act = 'idle';
          act = v.act;
        } else {
          const step = Math.min(d, v.speed * animDt * (v.a.welfare > 40 && !v.a.sick ? 1 : 0.5));
          g.position.x += (dx / d) * step; g.position.z += (dz / d) * step;
          const ang = Math.atan2(dx, dz);
          g.rotation.y += ((ang - g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, animDt * 6);
          act = 'walk';
        }
      }
      v.model.update(animDt, act);
      if (selected?.kind === 'animal' && selected.id === v.a.id) { ring.position.set(g.position.x, 0.15, g.position.z); ring.scale.setScalar(Math.max(0.8, g.scale.x)); }
    }
    syncGuests(dt); syncStaff();
    for (const w of staffWalkers) walkGraph(w, dt * (speed ? Math.max(1, speed * 0.7) : 0), 1.2);
    if (selected?.kind === 'guest') { const m = guestViews.get(selected.id); if (m) ring.position.set(m.position.x, 0.15, m.position.z); else ring.visible = false; }
    for (const v of [...visits]) { v.left -= dt; if (v.left <= 0) { scene.remove(v.p); visits.splice(visits.indexOf(v), 1); } }
    if (terrainDirty) { terrainDirty = false; refreshTerrain(); }
    if (litterDirty) { litterDirty = false; refreshLitter(); }
    const phase = (sim.state.time % DAY_SECONDS) / DAY_SECONDS; const light = 0.75 + Math.sin(phase * Math.PI) * 0.45;
    sun.intensity = 1.05 + light * 0.6; hemi.intensity = 0.65 + light * 0.4;
    sun.target.position.copy(controls.target); sun.position.copy(controls.target).add(new THREE.Vector3(50, 80, 35));
    const camDist = camera.position.distanceTo(controls.target); scene.fog.near = camDist + 40; scene.fog.far = camDist * 1.6 + 140;
    controls.update(); renderer.render(scene, camera);
  }

  return {
    renderer, camera, controls, resize, frame, pick, groundAt, previews, select,
    rebuildPaths, rebuildHabitats, buildHabitat: (id) => { const h = sim.habById(id); if (h) buildHabitat(h); }, addItem, removeItem, rebuildFacilities,
    addAnimal, removeAnimal, moveAnimal, setEscaped, refreshGrowth, keeperVisit,
    terrainChanged() { terrainDirty = true; }, litterChanged() { litterDirty = true; },
    setHeatmap(on) { heat = on; },
    buildAll() { rebuildPaths(); rebuildHabitats(); rebuildFacilities(); for (const a of sim.state.animals) addAnimal(a); terrainDirty = true; litterDirty = true; },
    screenOf(x, z) { const v = new THREE.Vector3(x, 0.1, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; },
    // shiftPx moves the spot right on screen by that much, to centre it in the space beside an open drawer.
    focus(x, z, dist = 30, shiftPx = 0) {
      controls.target.set(x, 0, z); camera.position.set(x + dist * 0.35, dist * 0.6, z + dist * 0.8); camera.lookAt(controls.target); camera.updateMatrixWorld();
      if (shiftPx) {
        const unitsPerPx = (2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / renderer.domElement.clientHeight;
        const shift = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-shiftPx * unitsPerPx); controls.target.add(shift); camera.position.add(shift);
      }
      controls.update();
    },
    nearestItem(hid, p) { const h = sim.habById(hid); if (!h) return null; let best = null; let bd = Infinity; for (const it of h.items) { const d = Math.hypot(it.x - p[0], it.z - p[1]); const r = Math.max(ITEMS[it.type].w, ITEMS[it.type].d) / 2 + 0.4; if (d < r && d < bd) { bd = d; best = it; } } return best; },
    nearestPathSeg(p) { let best = null; let bd = Infinity; for (const s of sim.state.paths) { const n = nearestOnSegment(p, s.a, s.b); if (n.d < bd) { bd = n.d; best = s; } } return bd < PATH_WIDTH / 2 + 0.4 ? best : null; },
    inHabitat: (p) => sim.state.habitats.some((h) => pointInPoly(p, h.pts)),
  };
}
