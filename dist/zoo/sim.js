// Third's Zoo simulation: the zoo as numbers, no drawing. main.js shows it; tests/zoo-sim.mjs runs it in Node.
// The player draws paths and fences freely; guests are people walking the path network to what they need.
// Whole seconds of zoo time run tick(), zoo days newDay(); the world hears about changes through emit(type, data).
import {
  START_MONEY, START_CC, DAY_SECONDS, MAP, ENTRANCE, STARTER_PATH, PATH_WIDTH, PATH_COST, MAX_GUESTS, TERRAIN, TERRAIN_INDEX,
  PLANTS, SPECIES, SPECIES_BY_ID, STATUS, ITEMS, BARRIERS, MIN_HABITAT, FACILITIES, STAFF, RESEARCH, BOARD_COST, GOALS,
  NAMES, GUEST_NAMES,
} from './data.js';
import { dist, nearestOnSegment, pointInPoly, polyArea, polyPerimeter, polyCentre, distToPoly, segmentToPoly, polySelfCrosses } from './geom.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const N = Math.round((MAP.half * 2) / MAP.cell); // terrain cells a side
const snap = (v) => Math.round(v * 2) / 2;
const keyOf = (p) => `${Math.round(p[0] * 10) / 10},${Math.round(p[1] * 10) / 10}`;
export const NEED_LABELS = { food: 'Thức ăn', water: 'Nước uống', social: 'Bầy đàn', habitat: 'Môi trường sống', shelter: 'Chỗ trú', enrich: 'Vui chơi', health: 'Sức khỏe', clean: 'Vệ sinh', stress: 'Độ yên tĩnh' };
export const GUEST_NEEDS = { hunger: 'Đói', thirst: 'Khát', toilet: 'Cần vệ sinh', energy: 'Sức lực' };
const NEED_WEIGHTS = { food: 0.16, water: 0.12, social: 0.13, habitat: 0.15, shelter: 0.10, enrich: 0.11, health: 0.09, clean: 0.07, stress: 0.07 };

export function freshState() {
  return {
    v: 3, money: START_MONEY, cc: START_CC, time: 0, speed: 1, nextId: 10, seenTips: false,
    entry: 12, prices: { food: FACILITIES.food.price, drink: FACILITIES.drink.price, gift: FACILITIES.gift.price },
    terrain: null, paths: [{ id: 1, a: STARTER_PATH[0], b: STARTER_PATH[1] }], habitats: [], animals: [], facilities: [], litter: [],
    visitors: [], happy: 70,
    staff: { keeper: 0, vet: 0, mechanic: 0, janitor: 0, security: 0 },
    research: { bank: { vet: 0, mech: 0 }, active: { vet: null, mech: null }, progress: {}, done: [] },
    market: [], marketDay: -1,
    ledger: { today: blankDay(), days: [] },
    goals: { done: {}, tiers: [false, false, false] },
    stats: { births: 0, releases: 0, maxGuests: 0, bestProfit: -1e9 },
  };
}
function blankDay() { return { tickets: 0, shops: 0, donations: 0, sales: 0, salaries: 0, food: 0, upkeep: 0, build: 0, animals: 0 }; }

export function createSim({ admin = false, emit = () => {} } = {}) {
  let state = freshState();
  let grid = new Uint8Array(N * N);
  let secAcc = 0; let dayAcc = 0; let spawnAcc = 0; let incomeAcc = 0; let incomeTimer = 0;
  const warned = new Set();
  const toast = (text, kind = '') => emit('toast', { text, kind });
  const fmt = (n) => `${Math.round(n).toLocaleString('vi-VN')} xu`;
  const day = () => Math.floor(state.time / DAY_SECONDS) + 1;
  const done = (id) => admin || state.research.done.includes(id);
  const isAdult = (a) => a.age >= SPECIES_BY_ID[a.species].adult;
  const habById = (id) => state.habitats.find((h) => h.id === id);
  const animalsIn = (id) => state.animals.filter((a) => a.hab === id && !a.escaped);

  // ---------- Terrain grid ----------
  const cellOf = (x, z) => [Math.floor((x + MAP.half) / MAP.cell), Math.floor((z + MAP.half) / MAP.cell)];
  const cellCentre = (ix, iz) => [-MAP.half + (ix + 0.5) * MAP.cell, -MAP.half + (iz + 0.5) * MAP.cell];
  function encodeGrid() { let s = ''; let v = grid[0]; let n = 0; for (let i = 0; i < grid.length; i++) { if (grid[i] === v) n++; else { s += `${v}:${n},`; v = grid[i]; n = 1; } } return s + `${v}:${n}`; }
  function decodeGrid(s) { const g = new Uint8Array(N * N); let i = 0; for (const run of s.split(',')) { const [v, n] = run.split(':').map(Number); g.fill(v, i, i + n); i += n; } return g; }
  function paintCells(x, z, r, t) {
    const [x0, z0] = cellOf(x - r, z - r); const [x1, z1] = cellOf(x + r, z + r);
    for (let iz = Math.max(0, z0); iz <= Math.min(N - 1, z1); iz++) for (let ix = Math.max(0, x0); ix <= Math.min(N - 1, x1); ix++) {
      const c = cellCentre(ix, iz); if (Math.hypot(c[0] - x, c[1] - z) <= r) grid[iz * N + ix] = t;
    }
  }

  // ---------- Paths as a graph ----------
  let G = null;
  function graph() {
    if (G) return G;
    const nodes = new Map();
    const add = (p) => { const k = keyOf(p); if (!nodes.has(k)) nodes.set(k, { k, x: p[0], z: p[1], adj: [] }); return nodes.get(k); };
    for (const s of state.paths) { const a = add(s.a); const b = add(s.b); const len = dist(s.a, s.b); a.adj.push({ to: b.k, len, seg: s.id }); b.adj.push({ to: a.k, len, seg: s.id }); }
    const entrance = keyOf([ENTRANCE.x, ENTRANCE.z]);
    const reach = new Set(); const stack = nodes.has(entrance) ? [entrance] : [];
    while (stack.length) { const k = stack.pop(); if (reach.has(k)) continue; reach.add(k); for (const e of nodes.get(k).adj) stack.push(e.to); }
    G = { nodes, entrance, reach };
    return G;
  }
  /** Shortest walk between two path nodes, as the list of nodes after the first; null if not connected. */
  function route(from, to) {
    const { nodes } = graph(); if (!nodes.has(from) || !nodes.has(to)) return null; if (from === to) return [];
    const d = new Map([[from, 0]]); const prev = new Map(); const open = new Set([from]);
    while (open.size) {
      let k = null; for (const o of open) if (k === null || d.get(o) < d.get(k)) k = o;
      open.delete(k); if (k === to) break;
      for (const e of nodes.get(k).adj) { const nd = d.get(k) + e.len; if (nd < (d.get(e.to) ?? Infinity)) { d.set(e.to, nd); prev.set(e.to, k); open.add(e.to); } }
    }
    if (!prev.has(to)) return null;
    const out = []; for (let k = to; k !== from; k = prev.get(k)) out.unshift(k); return out;
  }
  function routeLength(from, path) { let s = 0; let p = graph().nodes.get(from); for (const k of path) { const q = graph().nodes.get(k); s += Math.hypot(p.x - q.x, p.z - q.z); p = q; } return s; }
  function nearestNode(p, reachOnly = true) {
    const g = graph(); let best = null; let bd = Infinity;
    for (const n of g.nodes.values()) { if (reachOnly && !g.reach.has(n.k)) continue; const d = Math.hypot(n.x - p[0], n.z - p[1]); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  /** Where on the path network a point is closest: the point, its segment and how far. */
  function nearestPath(p) {
    let best = { d: Infinity }; const g = graph();
    for (const s of state.paths) { const n = nearestOnSegment(p, s.a, s.b); if (n.d < best.d) best = { ...n, seg: s, reach: g.reach.has(keyOf(s.a)) }; }
    return best;
  }
  const inBounds = (p) => Math.abs(p[0]) <= MAP.build && Math.abs(p[1]) <= MAP.build + 1;

  // ---------- Derived numbers per habitat (cached until something changes) ----------
  const hCache = new Map();
  const dirty = () => { hCache.clear(); };
  function hInfo(h) {
    if (hCache.has(h.id)) return hCache.get(h.id);
    const area = polyArea(h.pts); const perimeter = polyPerimeter(h.pts); const centre = polyCentre(h.pts);
    // Its gate: the point of the fence nearest a path the guests can reach, if close enough.
    let gate = null; const g = graph();
    for (const s of state.paths) {
      if (!g.reach.has(keyOf(s.a))) continue;
      const r = segmentToPoly(s.a, s.b, h.pts);
      if (r.d <= PATH_WIDTH / 2 + 2.2 && (!gate || r.d < gate.d)) gate = { d: r.d, point: r.point, seg: s.id };
    }
    // Ground: share of each terrain over the habitat's cells.
    const xs = h.pts.map((p) => p[0]); const zs = h.pts.map((p) => p[1]);
    const [x0, z0] = cellOf(Math.min(...xs), Math.min(...zs)); const [x1, z1] = cellOf(Math.max(...xs), Math.max(...zs));
    const counts = new Array(TERRAIN.length).fill(0); let cells = 0;
    for (let iz = Math.max(0, z0); iz <= Math.min(N - 1, z1); iz++) for (let ix = Math.max(0, x0); ix <= Math.min(N - 1, x1); ix++) {
      if (pointInPoly(cellCentre(ix, iz), h.pts)) { counts[grid[iz * N + ix]] += 1; cells += 1; }
    }
    const share = Object.fromEntries(TERRAIN.map((t, k) => [t.id, cells ? counts[k] / cells : 0]));
    const hi = { area, perimeter, centre, gate, share };
    hCache.set(h.id, hi); return hi;
  }

  function habitatStats(h) {
    const hi = hInfo(h);
    const s = {
      ...hi, water: 0, shelterArea: 0, shelters: 0, plants: {}, plantTotal: 0, rocks: 0,
      feeders: 0, donationBoxes: 0, speakers: 0,
      types: new Set(), animals: animalsIn(h.id), landNeed: 0, shelterNeed: 0
    };
    for (const it of h.items) {
      const def = ITEMS[it.type]; const a = def.w * def.d;
      if (def.kind === 'water') s.water += a;
      if (def.kind === 'shelter') { s.shelters += 1; s.shelterArea += a; }
      if (def.kind === 'plant') { s.plants[def.plant] = (s.plants[def.plant] || 0) + 1; s.plantTotal += 1; }
      if (def.kind === 'deco') s.rocks += 1;
      if (def.kind === 'enrich') s.types.add(it.type);
      if (def.kind === 'feeder') s.feeders += 1;
      if (def.kind === 'donation') s.donationBoxes += 1;
      if (def.kind === 'speaker') s.speakers += 1;
    }
    s.land = Math.max(0, hi.area - s.water - s.shelterArea);
    for (const a of s.animals) { const sp = SPECIES_BY_ID[a.species]; const k = isAdult(a) ? 1 : 0.5; s.landNeed += sp.area * k; s.shelterNeed += sp.shelter * k; }
    s.predators = s.animals.some((a) => SPECIES_BY_ID[a.species].predator);
    return s;
  }
  function groupScore(count, [min, max]) { if (!count) return 0; if (count < min) return count / min; if (count > max) return max / count; return 1; }

  /** Each need of one animal (0–100) and a word on what to fix. */
  function needsOf(a, h, st) {
    const sp = SPECIES_BY_ID[a.species];
    const same = st.animals.filter((x) => x.species === a.species);
    const males = same.filter((x) => x.sex === 'M' && isAdult(x)).length;
    let social = groupScore(same.length, sp.group); const why = {};
    if (same.length < sp.group[0]) why.social = `Cô đơn: loài này thích ${sp.group[0]}–${sp.group[1]} con`;
    if (same.length > sp.group[1]) why.social = 'Quá đông, nên chuyển bớt đi';
    if (males > sp.males) { social *= 0.55; why.social = `Quá nhiều con đực trưởng thành (${males}), chúng hay đánh nhau`; }
    if (!sp.predator && st.predators) { social *= 0.3; why.social = 'Sợ hãi vì ở chung với thú săn mồi'; }
    if (sp.compatible?.length) {
      const friends = st.animals.filter((x) => sp.compatible.includes(x.species));
      if (friends.length > 0) {
        social = clamp(social * 1.15, 0, 1.25);
        const friendNames = [...new Set(friends.map((x) => SPECIES_BY_ID[x.species].name))].join(', ');
        why.socialFriend = `Thích sống cùng ${friendNames}`;
      }
    }
    const land = st.landNeed ? clamp(st.land / st.landNeed, 0, 1) : 1;
    const water = sp.water ? clamp(st.water / st.area / sp.water, 0, 1) : 1;
    const [ground, want] = sp.terrain; const terrain = clamp((st.share[ground] || 0) / want, 0, 1);
    const [kind, per100] = sp.plants; const plantNeed = Math.max(1, Math.round((st.area / 100) * per100));
    const have = st.plants[kind] || 0; const wrong = st.plantTotal - have;
    const plants = clamp(have / plantNeed, 0, 1) * (1 - Math.min(0.4, wrong * 0.08));
    const climb = sp.climber && !st.types.has('climb') ? 0.75 : 1;
    const habitat = (0.35 * land + 0.25 * water + 0.2 * terrain + 0.2 * plants) * climb;
    if (land < 0.8) why.habitat = `Chật chội: đất trống ${Math.round(st.land)} m², bầy cần ${Math.round(st.landNeed)} m²`;
    else if (water < 0.8) why.habitat = `Thiếu nước: cần ${Math.round(sp.water * 100)}% mặt nước, đang ${Math.round((st.water / st.area) * 100)}%`;
    else if (terrain < 0.8) why.habitat = `Cần ${TERRAIN[TERRAIN_INDEX[ground]].name.toLowerCase()} phủ ${Math.round(want * 100)}% chuồng (đang ${Math.round((st.share[ground] || 0) * 100)}%): dùng Tô địa hình`;
    else if (plants < 0.8) why.habitat = have < plantNeed ? `Cần ${plantNeed} ${PLANTS[kind].name.toLowerCase()} (đang có ${have})` : 'Có cây không hợp môi trường, nên dỡ bớt';
    else if (climb < 1) why.habitat = 'Cần chỗ leo trèo: đặt khung leo';
    const shelter = st.shelterNeed ? clamp((st.shelters * 4) / st.shelterNeed, 0, 1) : 1;
    if (shelter < 0.8) why.shelter = st.shelters ? 'Nhà trú chật, xây thêm' : 'Chưa có nhà trú';
    const liked = sp.likes.filter((t) => st.types.has(t)).length; const enrich = clamp(liked / sp.enrich, 0, 1);
    if (enrich < 1) why.enrich = `Thích: ${sp.likes.map((t) => ITEMS[t].name.toLowerCase()).join(', ')}`;

    // Planet Zoo Stress & Crowd Noise:
    let stress = 100;
    const isOneWayGlass = h.barrier === 4;
    const coverPoints = st.shelters * 3 + st.rocks * 0.8 + st.plantTotal * 0.4;
    if (isOneWayGlass) {
      stress = 100;
    } else {
      const nearGuests = state.visitors.filter((v) => distToPoly([v.x, v.z], h.pts) < 7).length;
      const sensitivity = sp.stressSensitivity || 0.4;
      if (nearGuests > 3) {
        const reduction = Math.max(0, (nearGuests - 3) * 4 * sensitivity - coverPoints * 2);
        stress = clamp(100 - reduction, 20, 100);
        if (stress < 65) {
          why.stress = `Bị căng thẳng do ${nearGuests} khách đứng gần: nâng rào lên Kính 1 chiều hoặc thêm cây cối, nhà trú để ẩn nấp.`;
        }
      }
    }

    const feederBonus = st.feeders > 0 ? 10 : 0;
    const foodScore = clamp(h.food + feederBonus, 0, 100);
    const waterScore = clamp(h.water + (st.water > 0 ? 10 : 0), 0, 100);
    const needs = {
      food: foodScore,
      water: waterScore,
      social: social * 100,
      habitat: habitat * 100,
      shelter: shelter * 100,
      enrich: enrich * 100,
      health: a.health,
      clean: h.clean,
      stress: stress
    };
    if (h.food < 40) why.food = info.covered.has(h.id) ? 'Đang chờ nhân viên cho ăn' : st.gate ? 'Không có nhân viên chăm chuồng này: hãy bấm Gọi người chăm sóc' : 'Chuồng chưa có lối vào: làm lối đi sát rào';
    if (h.water < 40) why.water = 'Cần nước: đặt thêm máng nước hoặc hồ nước';
    if (a.sick) why.health = state.staff.vet ? 'Đang ốm, bác sĩ sẽ chữa' : 'Đang ốm: thuê bác sĩ thú y hoặc bấm Gọi bác sĩ';
    if (h.clean < 40) why.clean = 'Chuồng bẩn: bấm Gọi người chăm sóc để dọn dẹp';
    return { needs, why };
  }

  // ---------- Zoo-wide numbers (every second, never saved) ----------
  let info = { stats: new Map(), rating: 0, appeal: 0, avgWelfare: 0, variety: 0, cover: {}, covered: new Set(), escaped: 0, education: 0, fairEntry: 6, happy: 70 };
  function recompute() {
    info.stats = new Map(state.habitats.map((h) => [h.id, habitatStats(h)]));
    const open = state.habitats.filter((h) => info.stats.get(h.id).gate && info.stats.get(h.id).animals.length);
    info.covered = new Set(open.slice(0, state.staff.keeper * STAFF.keeper.per).map((h) => h.id));
    const live = state.animals.filter((a) => !a.escaped);
    info.escaped = state.animals.length - live.length;
    info.avgWelfare = live.length ? live.reduce((s, a) => s + a.welfare, 0) / live.length / 100 : 0;
    info.variety = new Set(live.map((a) => a.species)).size;
    for (const f of state.facilities) { const np = nearestPath([f.x, f.z]); f.reach = !!np.reach && np.d < 5; f.stand = np.point; }
    const guests = Math.max(state.visitors.length, 8);
    const working = (type) => state.facilities.filter((f) => f.type === type && (f.condition ?? 100) >= 15 && f.reach).length;
    info.cover = {}; for (const t of ['food', 'drink', 'toilet', 'bench', 'gift']) info.cover[t] = clamp((working(t) * FACILITIES[t].serves) / guests, 0, 1.5);
    info.education = open.length ? open.filter((h) => h.board).length / open.length : 0;
    info.happy = state.visitors.length ? state.visitors.reduce((s, v) => s + v.happy, 0) / state.visitors.length : state.happy;
    state.happy = info.happy;
    const facCover = (Math.min(1, info.cover.food) + Math.min(1, info.cover.drink) + Math.min(1, info.cover.toilet)) / 3;
    info.rating = live.length ? clamp(2 * info.avgWelfare + Math.min(1, info.variety / 6) + info.happy / 100 + 0.5 * facCover + 0.5 * info.education, 0, 5) : 0;
    // Only habitats guests can walk to and see draw them in.
    info.appeal = open.reduce((s, h) => { const st = info.stats.get(h.id); return s + st.animals.reduce((t, a) => { const sp = SPECIES_BY_ID[a.species]; return t + sp.appeal * (0.35 + (a.welfare / 100) * 0.9) * (isAdult(a) ? 1 : 1.4); }, 0)
      + st.rocks * 0.3 + st.plantTotal * 0.2 + (h.board ? 2 : 0); }, 0);
    info.fairEntry = 6 + info.rating * 4;
  }

  // ---------- Guests ----------
  function spawnGuest() {
    const g = graph(); if (!g.nodes.has(g.entrance)) return;
    const r = state.entry / info.fairEntry; const pricePenalty = clamp((r - 1) * 30, 0, 30);
    const v = { id: state.nextId++, name: pick(GUEST_NAMES), x: ENTRANCE.x + (Math.random() - 0.5), z: ENTRANCE.z, node: g.entrance, prev: null, route: [], target: null, final: null, goal: null,
      needs: { hunger: Math.random() * 40, thirst: Math.random() * 40, toilet: Math.random() * 30, energy: 70 + Math.random() * 30 },
      happy: 75 - pricePenalty, spent: state.entry, age: 0, stay: 60 + Math.random() * 60, seen: [], refused: {}, thought: pricePenalty > 8 ? 'Vé vào cổng hơi đắt.' : 'Vào xem thú thôi!', side: (Math.random() - 0.5) * 1.6, shirt: Math.floor(Math.random() * 7) };
    state.visitors.push(v); state.money += state.entry; state.ledger.today.tickets += state.entry; incomeAcc += state.entry;
  }
  function setRoute(v, toKey, final = null) { const r = route(v.node, toKey); if (!r) return false; v.route = r; v.final = final; nextTarget(v); return true; }
  function nextTarget(v) {
    const n = v.route.length ? graph().nodes.get(v.route[0]) : null;
    if (n) { v.target = [n.x, n.z]; return; }
    v.target = v.final; v.final = null; v.atFinal = !!v.target;
  }
  function decide(v) {
    const g = graph();
    if (!g.nodes.has(v.node)) { const n = nearestNode([v.x, v.z]); if (!n) return; v.node = n.k; v.target = [n.x, n.z]; v.route = []; return; }
    if (v.goal?.kind === 'exit') { if (v.node === g.entrance) { v.gone = true; return; } if (setRoute(v, g.entrance)) return; v.goal = null; }
    if (v.age > v.stay || v.happy < 18 || v.needs.energy < 3) { v.goal = { kind: 'exit' }; v.thought = v.happy < 18 ? 'Chán quá, về thôi.' : 'Hôm nay vui ghê, về nhà thôi.'; if (v.node === g.entrance) { v.gone = true; return; } if (setRoute(v, g.entrance)) return; }
    // The most pressing need sends them to the nearest facility for it.
    const wants = [['toilet', 'toilet', 70], ['thirst', 'drink', 62], ['hunger', 'food', 65]].filter(([n, , at]) => v.needs[n] >= at);
    if (v.needs.energy < 30) wants.push(['energy', 'bench', 0]);
    for (const [need, type] of wants) {
      if ((v.refused[type] || 0) > state.time) continue;
      let best = null; let bl = Infinity;
      for (const f of state.facilities) {
        if (f.type !== type || !f.reach) continue;
        const n = nearestNode(f.stand); if (!n) continue; const r = route(v.node, n.k); if (!r) continue;
        const l = routeLength(v.node, r) + dist([n.x, n.z], f.stand); if (l < bl) { bl = l; best = { f, n }; }
      }
      if (best) { v.goal = { kind: 'facility', id: best.f.id, need }; setRoute(v, best.n.k, best.f.stand); return; }
      v.refused[type] = state.time + 20; v.happy -= 4;
      v.thought = { hunger: 'Đói quá mà không thấy quầy ăn nào.', thirst: 'Khát quá, quầy nước ở đâu?', toilet: 'Nhà vệ sinh ở đâu vậy trời!', energy: 'Mỏi chân quá mà chẳng có ghế.' }[need];
    }
    // Otherwise stroll on to a neighbouring node, not straight back if there is a choice.
    const node = g.nodes.get(v.node); const next = node.adj.filter((e) => e.to !== v.prev);
    const e = pick(next.length ? next : node.adj); if (!e) return;
    v.route = [e.to]; v.final = null; nextTarget(v);
  }
  function useFacility(v) {
    const f = state.facilities.find((x) => x.id === v.goal.id); const need = v.goal.need; v.goal = null;
    if (!f) return;
    if ((f.condition ?? 100) < 15) { v.happy -= 4; v.thought = `${FACILITIES[f.type].name} hỏng rồi!`; v.refused[f.type] = state.time + 25; return; }
    const def = FACILITIES[f.type]; const price = state.prices[f.type] ?? 0;
    if (def.price && price > def.price * 1.8) { v.happy -= 3; v.thought = `${def.name} bán đắt quá, thôi khỏi.`; v.refused[f.type] = state.time + 30; return; }
    if (def.price) { state.money += price; state.ledger.today.shops += price; incomeAcc += price; v.spent += price; }
    if (need === 'hunger') { v.needs.hunger = 0; v.thought = 'Đồ ăn ngon quá!'; if (!state.facilities.some((x) => x.type === 'bin' && dist([x.x, x.z], [v.x, v.z]) < 12) && Math.random() < 0.6) dropLitter(v); }
    if (need === 'thirst') { v.needs.thirst = 0; v.needs.toilet += 25; v.thought = 'Mát cả người.'; }
    if (need === 'toilet') { v.needs.toilet = 0; v.thought = 'Nhẹ cả người.'; }
    if (need === 'energy') { v.needs.energy = 100; v.thought = 'Ngồi nghỉ chút cho đỡ mỏi.'; }
    v.happy += 3;
  }
  function arrive(v) {
    if (v.atFinal) { v.atFinal = false; if (v.goal?.kind === 'facility') useFacility(v); decide(v); return; }
    if (v.route.length) { v.prev = v.node; v.node = v.route.shift(); }
    nextTarget(v); if (v.target) return;
    decide(v);
  }
  function dropLitter(v) { if (state.litter.length < 300) { state.litter.push({ id: state.nextId++, x: v.x + (Math.random() - 0.5) * 2, z: v.z + (Math.random() - 0.5) * 2 }); emit('litter', {}); } }
  function moveVisitors(dt) {
    for (const v of state.visitors) {
      if (!v.target) { decide(v); if (!v.target) continue; }
      const dx = v.target[0] - v.x; const dz = v.target[1] - v.z; const d = Math.hypot(dx, dz); const stepLen = 1.4 * dt;
      if (d <= stepLen) { v.x = v.target[0]; v.z = v.target[1]; v.target = null; arrive(v); }
      else { v.x += (dx / d) * stepLen; v.z += (dz / d) * stepLen; }
    }
    if (state.visitors.some((v) => v.gone)) state.visitors = state.visitors.filter((v) => !v.gone);
  }
  function guestsSecond() {
    const open = state.habitats.filter((h) => info.stats.get(h.id).gate && info.stats.get(h.id).animals.length);
    const r = state.entry / info.fairEntry;
    const priceFactor = r <= 1 ? 1 + (1 - r) * 0.25 : Math.max(0.12, 1 - (r - 1) * 0.9);
    const target = open.length ? Math.min(MAX_GUESTS, (6 + info.appeal * 1.4 * (0.6 + info.rating * 0.15)) * priceFactor * (0.55 + (info.happy / 100) * 0.6) * (info.escaped ? 0.7 : 1)) : 2;
    spawnAcc += target / 85;
    while (spawnAcc >= 1) { spawnAcc -= 1; if (state.visitors.length < MAX_GUESTS) spawnGuest(); }
    for (const v of state.visitors) {
      v.age += 1;
      v.needs.hunger = clamp(v.needs.hunger + 1.0, 0, 100); v.needs.thirst = clamp(v.needs.thirst + 1.3, 0, 100);
      v.needs.toilet = clamp(v.needs.toilet + 0.6, 0, 100); v.needs.energy = clamp(v.needs.energy - 0.55, 0, 100);
      if (v.needs.hunger > 92 || v.needs.thirst > 92 || v.needs.toilet > 92 || v.needs.energy < 8) v.happy -= 0.5;
      // Seeing a habitat from the path: happy animals please, unhappy ones upset; an education board may bring a donation.
      for (const h of open) {
        if (v.seen.includes(h.id) || distToPoly([v.x, v.z], h.pts) > 7) continue;
        v.seen.push(h.id);
        const st = info.stats.get(h.id); const w = st.animals.reduce((s, a) => s + a.welfare, 0) / st.animals.length;
        const star = st.animals.reduce((m, a) => (SPECIES_BY_ID[a.species].appeal > SPECIES_BY_ID[m.species].appeal ? a : m), st.animals[0]);
        const name = SPECIES_BY_ID[star.species].name;
        v.happy += clamp((w - 45) / 55, -1, 1) * 9 + Math.min(4, SPECIES_BY_ID[star.species].appeal / 5);
        v.thought = w >= 65 ? `${name} trông vui quá!` : `${name} trông tội nghiệp quá.`;
        const hasDonation = (st.donationBoxes || 0) > 0;
        const hasSpeaker = (st.speakers || 0) > 0;
        const chance = (h.board ? 0.5 : 0.15) + (hasDonation ? 0.3 : 0) + (hasSpeaker ? 0.15 : 0);
        if (Math.random() < Math.min(0.9, chance * (v.happy / 100))) {
          const baseGift = (h.board ? 6 : 3) + (hasDonation ? 5 : 0) + (hasSpeaker ? 4 : 0);
          const gift = Math.round(baseGift * (0.5 + v.happy / 100));
          state.money += gift; state.ledger.today.donations += gift; incomeAcc += gift; v.spent += gift;
          if (hasDonation) v.thought = `Thả ${gift} xu vào thùng quyên góp ủng hộ ${name.toLowerCase()}!`;
          else if (hasSpeaker) v.thought = `Nghe loa thuyết minh về ${name.toLowerCase()} hay quá, mình góp chút tiền.`;
          else if (h.board) v.thought = `Học được nhiều điều về ${name.toLowerCase()}, mình góp chút tiền.`;
        }
      }
      for (const f of state.facilities) {
        if (f.type !== 'gift' || v.boughtGift || (f.condition ?? 100) < 15 || Math.abs(f.x - v.x) > 5 || Math.abs(f.z - v.z) > 5) continue;
        if (v.happy > 60 && Math.random() < 0.25 && state.prices.gift <= FACILITIES.gift.price * 1.8) { v.boughtGift = true; state.money += state.prices.gift; state.ledger.today.shops += state.prices.gift; incomeAcc += state.prices.gift; v.spent += state.prices.gift; v.thought = 'Mua được món quà xinh quá.'; }
      }
      let near = 0; for (const l of state.litter) if (Math.abs(l.x - v.x) < 6 && Math.abs(l.z - v.z) < 6) near += 1;
      if (near >= 3) { v.happy -= 0.3; if (Math.random() < 0.05) v.thought = 'Lối đi bẩn quá.'; }
      if (info.escaped) { v.happy -= 0.35; if (Math.random() < 0.05) v.thought = 'Có thú xổng chuồng! Sợ quá.'; }
      v.happy = clamp(v.happy, 0, 100);
    }
    // Janitors pick up litter, about one each every four seconds.
    for (let k = 0; k < state.staff.janitor; k++) if (state.litter.length && Math.random() < 0.25) { state.litter.shift(); emit('litter', {}); }
    state.stats.maxGuests = Math.max(state.stats.maxGuests, state.visitors.length);
    incomeTimer += 1; if (incomeTimer >= 10) { emit('income', { amount: Math.round(incomeAcc) }); incomeAcc = 0; incomeTimer = 0; }
  }

  // ---------- One second ----------
  function tick() {
    recompute();
    for (const h of state.habitats) {
      const st = info.stats.get(h.id); const n = st.animals.reduce((s, a) => s + (isAdult(a) ? 1 : 0.5), 0);
      h.food = clamp(h.food - 0.22 * n, 0, 100); h.water = clamp(h.water - 0.28 * n, 0, 100); h.clean = clamp(h.clean - 0.05 * n, 0, 100);
      if (info.covered.has(h.id)) {
        if (h.food < 65) { h.food = 100; emit('keeper', { hab: h.id }); }
        if (h.water < 60) h.water = st.water ? 100 : 80;
        if (h.clean < 60) h.clean = 100;
      }
      if (n && h.food < 25 && !warned.has(`food${h.id}`)) { warned.add(`food${h.id}`); toast(`${h.name}: thú đang đói. ${!st.gate ? 'Chuồng chưa có lối đi tới, nhân viên không vào được.' : state.staff.keeper ? 'Cần thêm nhân viên chăm thú.' : 'Thuê nhân viên chăm thú ở mục Nhân viên.'}`, 'warn'); }
      if (h.food > 60) warned.delete(`food${h.id}`);
    }
    for (const a of state.animals) {
      if (a.escaped) continue;
      const h = habById(a.hab); const { needs, why } = needsOf(a, h, info.stats.get(h.id));
      a.needs = needs; a.why = why;
      const target = Object.entries(NEED_WEIGHTS).reduce((s, [k, w]) => s + needs[k] * w, 0);
      a.welfare = clamp(a.welfare + (target - a.welfare) * 0.05, 0, 100);
      a.health = clamp(a.health + (a.sick ? -0.35 : 0.2), 0, 100);
    }
    const sick = state.animals.filter((a) => a.sick && !a.escaped);
    if (sick.length && state.staff.vet && Math.random() < (state.staff.vet * STAFF.vet.per * (done('medicine') ? 1.6 : 1)) / DAY_SECONDS) {
      const a = sick.sort((x, y) => x.health - y.health)[0]; a.sick = false; toast(`Bác sĩ đã chữa khỏi cho ${a.name} (${SPECIES_BY_ID[a.species].name}).`, 'good');
    }
    for (const a of [...state.animals]) if (a.health <= 0) dies(a, 'vì ốm không được chữa');
    for (const a of state.animals) {
      if (!a.escaped) continue;
      a.escaped -= 1;
      if (a.escaped <= 0) { a.escaped = 0; emit('recaptured', { id: a.id }); toast(`Đã bắt được ${a.name} (${SPECIES_BY_ID[a.species].name}) đưa về chuồng.`, 'good'); }
    }
    const wear = done('durable') ? 0.12 : 0.25; let fixable = state.staff.mechanic * STAFF.mechanic.per;
    for (const f of state.facilities) {
      if (f.type === 'bench' || f.type === 'bin') continue;
      f.condition = clamp((f.condition ?? 100) - wear, 0, 100);
      if (fixable > 0) { fixable -= 1; if (f.condition < 70) f.condition = clamp(f.condition + 3, 0, 100); }
      if (f.condition < 15 && !f.warned) { f.warned = true; toast(`${FACILITIES[f.type].name} bị hỏng. ${state.staff.mechanic ? 'Cần thêm thợ máy.' : 'Thuê thợ máy để sửa.'}`, 'warn'); }
      if (f.condition > 40) f.warned = false;
    }
    guestsSecond();
    checkGoals();
  }

  // ---------- One day ----------
  function newDay() {
    recompute();
    const t = state.ledger.today;
    const salaries = Object.entries(state.staff).reduce((s, [role, n]) => s + n * STAFF[role].salary, 0);
    const food = state.animals.reduce((s, a) => s + SPECIES_BY_ID[a.species].food, 0);
    const upkeep = state.facilities.reduce((s, f) => s + FACILITIES[f.type].upkeep, 0);
    t.salaries += salaries; t.food += food; t.upkeep += upkeep;
    if (!admin) state.money -= salaries + food + upkeep;
    const medicine = done('medicine') ? 0.5 : 1;
    for (const a of [...state.animals]) {
      const sp = SPECIES_BY_ID[a.species]; a.age += 1;
      if (a.age === sp.adult) toast(`${a.name} (${sp.name}) đã trưởng thành.`, 'good');
      if (a.age > sp.life && Math.random() < 0.3) { dies(a, 'vì tuổi già'); continue; }
      const h = habById(a.hab);
      if (!a.sick && Math.random() < (0.025 + (1 - a.welfare / 100) * 0.12 + (h.clean < 40 ? 0.05 : 0)) * medicine) { a.sick = true; toast(`${a.name} (${sp.name}) bị ốm.${state.staff.vet ? '' : ' Thuê bác sĩ thú y để chữa.'}`, 'warn'); }
      if (a.pregnant > 0) { a.pregnant -= 1; if (a.pregnant === 0) birth(a); }
    }
    for (const h of state.habitats) breed(h);
    for (const h of state.habitats) {
      const risky = info.stats.get(h.id).animals.filter((a) => SPECIES_BY_ID[a.species].barrier > h.barrier && isAdult(a));
      if (risky.length && Math.random() < 0.35) {
        const a = pick(risky); a.escaped = state.staff.security ? 12 : state.staff.keeper ? 35 : 60;
        emit('escaped', { id: a.id }); toast(`${a.name} (${SPECIES_BY_ID[a.species].name}) đã xổng ${h.name.toLowerCase()}! Rào quá thấp, cần ${BARRIERS[SPECIES_BY_ID[a.species].barrier].name.toLowerCase()}.`, 'warn');
      }
    }
    researchPoints('vet', state.staff.vet * 10); researchPoints('mech', state.staff.mechanic * 8);
    const income = t.tickets + t.shops + t.donations + t.sales;
    const expense = t.salaries + t.food + t.upkeep + t.build + t.animals;
    const profit = income - expense;
    state.ledger.days.push({ day: day() - 1, income: Math.round(income), expense: Math.round(expense), profit: Math.round(profit), detail: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])) });
    while (state.ledger.days.length > 7) state.ledger.days.shift();
    state.stats.bestProfit = Math.max(state.stats.bestProfit, profit);
    state.ledger.today = blankDay();
    toast(`Ngày ${day() - 1}: thu ${fmt(income)}, chi ${fmt(expense)}, ${profit >= 0 ? 'lãi' : 'lỗ'} ${fmt(Math.abs(profit))}.`, profit >= 0 ? '' : 'warn');
    refreshMarket(false);
    emit('day', {});
  }
  function breed(h) {
    const st = habitatStats(h); const bySpecies = {}; st.animals.forEach((a) => (bySpecies[a.species] ||= []).push(a));
    for (const [sid, list] of Object.entries(bySpecies)) {
      const sp = SPECIES_BY_ID[sid]; const avg = list.reduce((s, a) => s + a.welfare, 0) / list.length;
      const male = list.find((a) => a.sex === 'M' && isAdult(a) && !a.contraception);
      if (!male || avg < 65 || list.length >= sp.group[1] + 1) continue;
      for (const f of list) {
        if (f.sex !== 'F' || !isAdult(f) || f.contraception || f.pregnant > 0 || f.age > sp.life * 0.85) continue;
        if (Math.random() < 0.3) { f.pregnant = sp.gestation; toast(`${f.name} (${sp.name}) đang mang thai, sẽ sinh sau ${sp.gestation} ngày.`, 'good'); }
      }
    }
  }
  function birth(mother) {
    const sp = SPECIES_BY_ID[mother.species]; const n = sp.litter[0] + Math.floor(Math.random() * (sp.litter[1] - sp.litter[0] + 1));
    for (let k = 0; k < n; k++) { const baby = newAnimal(mother.species, mother.hab, { age: 0 }); state.stats.births += 1; emit('animal-add', { animal: baby }); }
    toast(`Tin vui: ${mother.name} (${sp.name}) vừa sinh ${n} con!`, 'good');
  }
  function dies(a, cause) { state.animals = state.animals.filter((x) => x.id !== a.id); emit('animal-remove', { id: a.id }); toast(`${a.name} (${SPECIES_BY_ID[a.species].name}) đã chết ${cause}.`, 'warn'); }
  function researchPoints(track, pts) {
    if (admin) return;
    const r = state.research; r.bank[track] += pts; const id = r.active[track]; if (!id) return;
    const use = Math.min(RESEARCH[id].cost - (r.progress[id] || 0), r.bank[track]);
    r.progress[id] = (r.progress[id] || 0) + use; r.bank[track] -= use;
    if (r.progress[id] >= RESEARCH[id].cost) { r.done.push(id); r.active[track] = null; toast(`Nghiên cứu xong: ${RESEARCH[id].name}. Mở khóa ${RESEARCH[id].unlocks.toLowerCase()}.`, 'good'); emit('research', { id }); }
  }
  function newAnimal(species, hab, opts = {}) {
    const a = { id: state.nextId++, species, hab, name: pick(NAMES), sex: opts.sex || (Math.random() < 0.5 ? 'M' : 'F'), age: opts.age ?? SPECIES_BY_ID[species].adult,
      health: 100, sick: false, pregnant: 0, contraception: false, welfare: 65, escaped: 0, needs: {}, why: {} };
    state.animals.push(a); return a;
  }
  function refreshMarket(paid) {
    if (paid && !spend(150, 'build')) return;
    const weights = SPECIES.map((sp) => [sp, sp.cc ? 1 : 3 - Math.min(2, sp.price / 2000)]); const total = weights.reduce((s, [, w]) => s + w, 0);
    state.market = Array.from({ length: 6 }, () => {
      let r = Math.random() * total; let sp = SPECIES[0]; for (const [s, w] of weights) { r -= w; if (r <= 0) { sp = s; break; } }
      const young = Math.random() < 0.35;
      return { id: state.nextId++, species: sp.id, sex: Math.random() < 0.5 ? 'M' : 'F', age: young ? Math.max(1, Math.round(sp.adult * 0.6)) : sp.adult + Math.floor(Math.random() * sp.life * 0.3) };
    });
    state.marketDay = day(); if (paid) emit('market', {});
  }
  function checkGoals() {
    const live = state.animals.filter((a) => !a.escaped); const has = (type) => state.facilities.some((f) => f.type === type);
    const test = {
      herd: () => state.habitats.some((h) => info.stats.get(h.id).animals.length >= 3), keeper: () => state.staff.keeper > 0, guests40: () => state.visitors.length >= 40,
      species3: () => info.variety >= 3, basics: () => has('food') && has('drink') && has('toilet'), research1: () => state.research.done.length > 0, profit: () => state.stats.bestProfit >= 1000,
      birth: () => state.stats.births > 0, release: () => state.stats.releases > 0, welfare75: () => live.length >= 3 && info.avgWelfare >= 0.75, guests150: () => state.visitors.length >= 150,
    };
    for (const g of GOALS) for (const it of g.items) if (!state.goals.done[it.id] && test[it.id]()) { state.goals.done[it.id] = true; toast(`Mục tiêu xong: ${it.text}.`, 'good'); }
    GOALS.forEach((g, k) => {
      if (state.goals.tiers[k] || (k > 0 && !state.goals.tiers[k - 1])) return;
      if (g.items.every((it) => state.goals.done[it.id])) { state.goals.tiers[k] = true; state.money += g.reward.money; state.cc += g.reward.cc; toast(`Đạt ${'★'.repeat(g.tier)}! Thưởng ${fmt(g.reward.money)} và ${g.reward.cc} điểm bảo tồn.`, 'good'); emit('tier', { tier: g.tier }); }
    });
  }

  // ---------- Building checks ----------
  function spend(cost, kind = 'build', cc = false) {
    if (admin) return true;
    if (cc) { if (state.cc < cost) { toast(`Không đủ điểm bảo tồn: cần ${cost}.`, 'warn'); return false; } state.cc -= cost; return true; }
    if (state.money < cost) { toast(`Không đủ xu: cần ${fmt(cost)}.`, 'warn'); return false; }
    state.money -= cost; state.ledger.today[kind] += cost; return true;
  }
  /** Where a click would put a path end: onto a node near it, onto a path near it (splitting it), or the half-metre grid. */
  function snapPathPoint(p) {
    const g = graph();
    for (const n of g.nodes.values()) if (Math.hypot(n.x - p[0], n.z - p[1]) < 1.6) return { p: [n.x, n.z] };
    for (const s of state.paths) { const n = nearestOnSegment(p, s.a, s.b); if (n.d < 1.6 && n.t > 0.04 && n.t < 0.96) return { p: [Math.round(n.point[0] * 10) / 10, Math.round(n.point[1] * 10) / 10], split: s }; }
    return { p: [snap(p[0]), snap(p[1])] };
  }
  function previewPath(a, b) {
    const sa = snapPathPoint(a); const sb = snapPathPoint(b);
    const len = dist(sa.p, sb.p); const out = { a: sa.p, b: sb.p, len, cost: Math.round(len * PATH_COST), ok: true, why: '', sa, sb };
    const fail = (why) => Object.assign(out, { ok: false, why });
    if (len < 1.5) return fail('Lối đi quá ngắn.');
    if (!inBounds(sa.p) || !inBounds(sb.p)) return fail('Ra ngoài khu đất xây được.');
    for (const h of state.habitats) if (pointInPoly(sa.p, h.pts) || pointInPoly(sb.p, h.pts) || segmentToPoly(sa.p, sb.p, h.pts).d < PATH_WIDTH / 2 + 0.2) return fail(`Lối đi cắt qua ${h.name.toLowerCase()}.`);
    for (const f of state.facilities) if (nearestOnSegment([f.x, f.z], sa.p, sb.p).d < 1.7) return fail(`Vướng ${FACILITIES[f.type].name.toLowerCase()}.`);
    if (state.paths.some((s) => (keyOf(s.a) === keyOf(sa.p) && keyOf(s.b) === keyOf(sb.p)) || (keyOf(s.b) === keyOf(sa.p) && keyOf(s.a) === keyOf(sb.p)))) return fail('Đã có lối đi ở đây.');
    return out;
  }
  function splitPath(s, p) {
    state.paths = state.paths.filter((x) => x.id !== s.id);
    state.paths.push({ id: state.nextId++, a: s.a, b: p }, { id: state.nextId++, a: p, b: s.b }); return p;
  }
  function previewHabitat(pts, grade = 1) {
    const p = pts.map(([x, z]) => [snap(x), snap(z)]);
    const out = { pts: p, area: p.length >= 3 ? polyArea(p) : 0, perimeter: p.length >= 2 ? polyPerimeter(p) : 0, ok: true, why: '' };
    out.cost = Math.round(out.perimeter * BARRIERS[grade].perM);
    const fail = (why) => Object.assign(out, { ok: false, why });
    if (p.length < 3) return fail('Cần ít nhất 3 điểm.');
    if (out.area < MIN_HABITAT) return fail(`Chuồng nhỏ quá: tối thiểu ${MIN_HABITAT} m².`);
    if (polySelfCrosses(p)) return fail('Hàng rào tự cắt nhau.');
    if (!p.every(inBounds)) return fail('Ra ngoài khu đất xây được.');
    for (const s of state.paths) if (segmentToPoly(s.a, s.b, p).d < PATH_WIDTH / 2 + 0.2 || pointInPoly(s.a, p)) return fail('Hàng rào cắt qua lối đi.');
    for (const h of state.habitats) if (h.pts.some((q) => pointInPoly(q, p)) || p.some((q) => pointInPoly(q, h.pts)) || p.some((q, i) => segmentToPoly(q, p[(i + 1) % p.length], h.pts).d < 0.6)) return fail(`Chồng lên ${h.name.toLowerCase()}.`);
    for (const f of state.facilities) if (pointInPoly([f.x, f.z], p) || distToPoly([f.x, f.z], p) < 1.8) return fail(`Vướng ${FACILITIES[f.type].name.toLowerCase()}.`);
    if (BARRIERS[grade].research && !done(BARRIERS[grade].research)) return fail(`Cần nghiên cứu “${RESEARCH[BARRIERS[grade].research].name}”.`);
    return out;
  }
  const itemRadius = (type) => Math.max(ITEMS[type].w, ITEMS[type].d) * 0.5;
  function itemFits(h, type, x, z) {
    if (!h || !pointInPoly([x, z], h.pts) || distToPoly([x, z], h.pts) < itemRadius(type) * 0.8) return false;
    const small = (t) => ['plant', 'deco'].includes(ITEMS[t].kind);
    return !h.items.some((it) => Math.hypot(it.x - x, it.z - z) < (itemRadius(type) + itemRadius(it.type)) * (small(type) && small(it.type) ? 0.6 : 0.85));
  }
  function facilitySpot(x, z) {
    const np = nearestPath([x, z]); const out = { ok: false, why: '', x, z, rot: 0 };
    if (!np.seg) return { ...out, why: 'Chưa có lối đi.' };
    if (np.d > 6) return { ...out, why: 'Phải đặt sát lối đi.' };
    // Stand it beside the path, facing it.
    const dx = x - np.point[0]; const dz = z - np.point[1]; const dd = Math.hypot(dx, dz) || 1;
    const off = PATH_WIDTH / 2 + 1.4;
    const px = Math.round((np.point[0] + (dx / dd) * off) * 10) / 10; const pz = Math.round((np.point[1] + (dz / dd) * off) * 10) / 10;
    const spot = { ...out, x: px, z: pz, rot: Math.atan2(np.point[0] - px, np.point[1] - pz) };
    if (!np.reach) return { ...spot, why: 'Lối đi này chưa nối tới cổng vào.' };
    if (!inBounds([px, pz])) return { ...spot, why: 'Ra ngoài khu đất xây được.' };
    for (const s of state.paths) if (nearestOnSegment([px, pz], s.a, s.b).d < PATH_WIDTH / 2 + 1.1) return { ...spot, why: 'Đè lên lối đi.' };
    for (const h of state.habitats) if (pointInPoly([px, pz], h.pts) || distToPoly([px, pz], h.pts) < 1.6) return { ...spot, why: `Sát ${h.name.toLowerCase()} quá.` };
    for (const f of state.facilities) if (Math.hypot(f.x - px, f.z - pz) < 2.6) return { ...spot, why: `Vướng ${FACILITIES[f.type].name.toLowerCase()}.` };
    return { ...spot, ok: true };
  }
  const habitatAt = (p) => state.habitats.find((h) => pointInPoly(p, h.pts)) || null;

  // ---------- Actions ----------
  const actions = {
    addPath(a, b) {
      const pv = previewPath(a, b); if (!pv.ok) { toast(pv.why, 'warn'); return null; }
      if (!spend(pv.cost)) return null;
      if (pv.sa.split) splitPath(pv.sa.split, pv.sa.p);
      if (pv.sb.split) { const s = state.paths.find((x) => nearestOnSegment(pv.sb.p, x.a, x.b).d < 0.05 && keyOf(x.a) !== keyOf(pv.sb.p) && keyOf(x.b) !== keyOf(pv.sb.p)); if (s) splitPath(s, pv.sb.p); }
      state.paths.push({ id: state.nextId++, a: pv.a, b: pv.b }); G = null; dirty(); recompute(); emit('paths', {});
      return pv.b;
    },
    removePath(id) {
      const s = state.paths.find((x) => x.id === id); if (!s) return;
      const gateKey = keyOf([ENTRANCE.x, ENTRANCE.z]);
      if (keyOf(s.a) === gateKey || keyOf(s.b) === gateKey) { toast('Không dỡ đoạn lối đi ở cổng vào.', 'warn'); return; }
      state.paths = state.paths.filter((x) => x.id !== id); if (!admin) state.money += Math.round(dist(s.a, s.b) * PATH_COST * 0.5);
      G = null; dirty(); recompute(); emit('paths', {}); toast('Đã dỡ đoạn lối đi.');
    },
    createHabitat(pts, grade = 1) {
      const pv = previewHabitat(pts, grade); if (!pv.ok) { toast(pv.why, 'warn'); return null; }
      if (!spend(pv.cost)) return null;
      const n = state.habitats.length ? Math.max(...state.habitats.map((h) => Number(h.name.replace(/\D/g, '')) || 0)) + 1 : 1;
      const h = { id: state.nextId++, name: `Chuồng ${n}`, pts: pv.pts, barrier: grade, items: [], board: false, food: 100, water: 100, clean: 100 };
      state.habitats.push(h); dirty(); recompute(); emit('habitats', {});
      const gate = hInfo(h).gate;
      toast(`Đã dựng ${h.name.toLowerCase()} rộng ${Math.round(pv.area)} m². ${gate ? 'Tô địa hình, đặt hồ, nhà trú, cây rồi mua thú.' : 'Chuồng chưa sát lối đi: làm lối đi tới sát rào để nhân viên vào được và khách xem được.'}`, gate ? 'good' : 'warn');
      return h;
    },
    removeHabitat(id) {
      const h = habById(id); if (!h) return;
      if (state.animals.some((a) => a.hab === id)) { toast('Chuyển hết thú ra trước khi dỡ chuồng.', 'warn'); return; }
      if (!admin) state.money += Math.round(polyPerimeter(h.pts) * BARRIERS[h.barrier].perM * 0.5 + h.items.reduce((s, it) => s + ITEMS[it.type].cost * 0.5, 0));
      state.habitats = state.habitats.filter((x) => x.id !== id); dirty(); recompute(); emit('habitats', {}); toast(`Đã dỡ ${h.name.toLowerCase()}.`);
    },
    upgradeBarrier(id) {
      const h = habById(id); const next = BARRIERS[h.barrier + 1]; if (!next) return;
      if (next.research && !done(next.research)) { toast(`Cần nghiên cứu “${RESEARCH[next.research].name}” trước.`, 'warn'); return; }
      if (!spend(actions.upgradeCost(id))) return;
      h.barrier += 1; emit('habitat', { id }); toast(`${h.name} đã có ${next.name.toLowerCase()}.`, 'good');
    },
    upgradeCost(id) { const h = habById(id); const next = BARRIERS[h.barrier + 1]; return next ? Math.round(polyPerimeter(h.pts) * (next.perM - BARRIERS[h.barrier].perM)) : 0; },
    buildBoard(id) {
      const h = habById(id); if (h.board) return;
      if (!done('board')) { toast('Cần nghiên cứu “Bảng giáo dục” trước.', 'warn'); return; }
      if (!hInfo(h).gate) { toast('Bảng giáo dục đặt cạnh lối đi: làm lối đi tới sát chuồng trước.', 'warn'); return; }
      if (!spend(BOARD_COST)) return; h.board = true; emit('habitat', { id }); toast('Đã dựng bảng giáo dục: khách hiểu thêm về thú và quyên góp nhiều hơn.', 'good');
    },
    callKeeper(id) {
      const h = habById(id); if (!h) return;
      const n = animalsIn(id).length;
      const free = state.staff.keeper > 0;
      const cost = free ? 0 : 40 + 15 * n;
      if (!free && !spend(cost, 'upkeep')) return;
      h.food = 100; h.water = 100; h.clean = 100;
      emit('keeper', { hab: id });
      toast(`🔔 Đã gọi người chăm sóc tới ${h.name}! Thức ăn, nước và chuồng đã được chăm sóc.${free ? ' (Miễn phí vì đã thuê nhân viên)' : ` (Phí khẩn cấp: ${cost} xu)`}`, 'good');
    },
    careNow(id) { actions.callKeeper(id); },
    callVet(animalId) {
      const a = state.animals.find((x) => x.id === animalId); if (!a) return;
      const sp = SPECIES_BY_ID[a.species];
      const free = state.staff.vet > 0;
      const cost = free ? 0 : 80;
      if (!free && !spend(cost, 'upkeep')) return;
      a.sick = false;
      a.health = clamp(a.health + 35, 0, 100);
      toast(`🩺 Bác sĩ thú y đã khám và điều trị kịp thời cho ${a.name} (${sp.name})!${free ? ' (Miễn phí)' : ` (Phí khẩn cấp: ${cost} xu)`}`, 'good');
    },
    canPlace: (hid, type, x, z) => itemFits(habById(hid), type, x, z),
    placeItem(hid, type, x, z, rot = 0) {
      const h = habById(hid); const def = ITEMS[type];
      if (!h) { toast('Đặt đồ bên trong một chuồng.', 'warn'); return false; }
      if (def.research && !done(def.research)) { toast(`Cần nghiên cứu “${RESEARCH[def.research].name}” trước.`, 'warn'); return false; }
      if (!itemFits(h, type, x, z)) { toast('Chỗ này không đặt được: vướng đồ khác hoặc sát rào quá.', 'warn'); return false; }
      if (!spend(def.cost)) return false;
      const it = { id: state.nextId++, type, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, rot }; h.items.push(it); dirty(); emit('item-add', { hab: hid, item: it }); return true;
    },
    removeItem(hid, id) {
      const h = habById(hid); const it = h?.items.find((x) => x.id === id); if (!it) return;
      h.items = h.items.filter((x) => x.id !== id); if (!admin) state.money += Math.round(ITEMS[it.type].cost * 0.5);
      dirty(); emit('item-remove', { hab: hid, id }); toast(`Đã dỡ ${ITEMS[it.type].name.toLowerCase()}.`);
    },
    paint(x, z, r, type) { paintCells(x, z, r, TERRAIN_INDEX[type]); dirty(); emit('terrain', { x, z, r }); },
    buyAnimal(listingId, hid) {
      const k = state.market.findIndex((m) => m.id === listingId); if (k < 0) return null;
      const m = state.market[k]; const sp = SPECIES_BY_ID[m.species]; const h = habById(hid);
      if (!h) { toast('Chọn chuồng để đưa thú vào.', 'warn'); return null; }
      if (!(sp.cc ? spend(sp.cc, 'animals', true) : spend(sp.price, 'animals'))) return null;
      state.market.splice(k, 1); const a = newAnimal(m.species, hid, { sex: m.sex, age: m.age }); emit('animal-add', { animal: a });
      toast(`Chào mừng ${a.name} (${sp.name}) đến ${h.name.toLowerCase()}!`, 'good'); return a;
    },
    sellAnimal(id) {
      const a = state.animals.find((x) => x.id === id); if (!a) return; const sp = SPECIES_BY_ID[a.species];
      if (!admin) { if (sp.cc) state.cc += Math.round(sp.cc * 0.4); else { const got = Math.round(sp.price * 0.5); state.money += got; state.ledger.today.sales += got; } }
      state.animals = state.animals.filter((x) => x.id !== id); emit('animal-remove', { id }); toast(`Đã chuyển ${a.name} (${sp.name}) sang vườn thú khác.`);
    },
    releaseAnimal(id) {
      const a = state.animals.find((x) => x.id === id); if (!a) return; const sp = SPECIES_BY_ID[a.species];
      if (!isAdult(a) || a.health < 60 || a.sick || a.pregnant) { toast('Chỉ thả được con trưởng thành, khỏe mạnh và không mang thai.', 'warn'); return; }
      const gain = STATUS[sp.status].release; state.cc += gain; state.stats.releases += 1;
      state.animals = state.animals.filter((x) => x.id !== id); emit('animal-remove', { id }); toast(`${a.name} đã về với tự nhiên. Nhận ${gain} điểm bảo tồn.`, 'good');
    },
    moveAnimal(id, hid) { const a = state.animals.find((x) => x.id === id); const h = habById(hid); if (!a || !h || a.hab === hid) return; a.hab = hid; emit('animal-move', { animal: a }); toast(`Đã chuyển ${a.name} sang ${h.name.toLowerCase()}.`); },
    toggleContraception(id) { const a = state.animals.find((x) => x.id === id); if (a) a.contraception = !a.contraception; },
    buildFacility(type, x, z) {
      const def = FACILITIES[type];
      if (def.research && !done(def.research)) { toast(`Cần nghiên cứu “${RESEARCH[def.research].name}” trước.`, 'warn'); return null; }
      const s = facilitySpot(x, z); if (!s.ok) { toast(s.why, 'warn'); return null; }
      if (!spend(def.cost)) return null;
      const f = { id: state.nextId++, type, x: s.x, z: s.z, rot: s.rot, condition: 100 }; state.facilities.push(f); recompute(); emit('facilities', {}); toast(`Đã xây ${def.name.toLowerCase()}.`, 'good'); return f;
    },
    demolish(id) {
      const f = state.facilities.find((x) => x.id === id); if (!f) return;
      state.facilities = state.facilities.filter((x) => x !== f); if (!admin) state.money += Math.round(FACILITIES[f.type].cost * 0.5);
      emit('facilities', {}); toast(`Đã dỡ ${FACILITIES[f.type].name.toLowerCase()}.`);
    },
    hire(role) { if (!spend(STAFF[role].salary, 'salaries')) return; state.staff[role] += 1; emit('staff', {}); },
    fire(role) { if (state.staff[role] > 0) { state.staff[role] -= 1; emit('staff', {}); } },
    setEntry(v) { state.entry = clamp(Math.round(v), 0, 60); },
    setPrice(type, v) { state.prices[type] = clamp(Math.round(v), 0, 60); },
    startResearch(id) { const r = state.research; const def = RESEARCH[id]; if (r.done.includes(id)) return; r.active[def.track] = id; toast(`Bắt đầu nghiên cứu: ${def.name}.`); researchPoints(def.track, 0); },
    refreshMarket: () => refreshMarket(true),
  };

  // ---------- Run ----------
  function step(simDt) {
    state.time += simDt; secAcc += simDt; dayAcc += simDt;
    // People walk in small steps so a fast zoo does not jump them past corners.
    let left = simDt; while (left > 1e-6) { const d = Math.min(left, 0.25); moveVisitors(d); left -= d; }
    while (secAcc >= 1) { secAcc -= 1; tick(); }
    if (dayAcc >= DAY_SECONDS) { dayAcc -= DAY_SECONDS; newDay(); }
  }
  function load(saved) {
    if (saved && saved.v === 3) state = { ...freshState(), ...saved, speed: 1, visitors: [] };
    else state = freshState();
    grid = state.terrain ? decodeGrid(state.terrain) : new Uint8Array(N * N);
    if (admin) state.research.done = Object.keys(RESEARCH);
    dayAcc = state.time % DAY_SECONDS; G = null; dirty();
    if (state.marketDay < 0) refreshMarket(false);
    recompute();
  }
  /** What to save: the state without the guests walking now, the ground packed small. */
  function snapshot() { return { ...state, visitors: [], terrain: encodeGrid(), speed: 1 }; }

  return {
    get state() { return state; },
    get info() { return info; },
    admin, step, load, snapshot, actions, recompute, day, done, isAdult, fmt,
    habitatStats, hInfo, habitatAt, habById, graph, nearestPath, previewPath, previewHabitat, facilitySpot, itemFits,
    terrainGrid: () => grid, terrainSize: N,
    runDays(n) { for (let k = 0; k < n * DAY_SECONDS; k++) step(1); },
  };
}
