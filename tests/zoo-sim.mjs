// Runs the zoo simulation in Node with no drawing: paths and fences drawn freely, guests walking them.
// A sensible zoo should thrive, a neglected one suffer. Usage: node tests/zoo-sim.mjs
import { createSim } from '../dist/zoo/sim.js';
let fails = 0;
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) fails += 1; };
const listing = (sim, species, sex, age) => { const m = { id: sim.state.nextId++, species, sex, age }; sim.state.market.push(m); return m.id; };
const paintRect = (sim, x0, z0, x1, z1, type) => { for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) sim.actions.paint(x, z, 1.6, type); };

// 1. A well-kept zebra habitat beside a path, with facilities and staff.
{
  const toasts = []; const sim = createSim({ emit: (t, d) => { if (t === 'toast') toasts.push(d.text); } }); sim.load(null); const A = sim.actions;
  check(!!A.addPath([0, 44], [0, 20]), 'draw a path north from the starter path');
  check(!!A.addPath([0, 30], [-20, 30]), 'branch west, splitting the path at (0, 30)');
  check(sim.state.paths.length === 4 && sim.graph().reach.size === 5, `path network: ${sim.state.paths.length} segments, ${sim.graph().reach.size} nodes reached`);
  check(!A.createHabitat([[-3, 33], [-20, 33], [-20, 20], [-3, 20]]), 'a fence across a path is refused');
  const h = A.createHabitat([[-3, 27], [-20, 27], [-20, 12], [-3, 12]]);
  check(!!h && !!sim.hInfo(h).gate, `habitat of ${Math.round(sim.hInfo(h).area)} m² with a gate on the path`);
  paintRect(sim, -19, 13, -4, 26, 'soil');
  console.log('   soil share', sim.hInfo(h).share.soil.toFixed(2));
  check(A.placeItem(h.id, 'bigpool', -15, 17), 'place a big pool');
  check(!A.placeItem(h.id, 'pool', -15, 17), 'cannot place over the pool');
  A.placeItem(h.id, 'shelter', -7, 15); for (const [x, z] of [[-10, 23], [-16, 23], [-6, 22]]) A.placeItem(h.id, 'plant_savanna', x, z); A.placeItem(h.id, 'ball', -11, 15);
  for (const [sex, age] of [['M', 12], ['F', 12], ['F', 12], ['F', 12]]) A.buyAnimal(listing(sim, 'zebra', sex, age), h.id);
  A.hire('keeper'); A.hire('vet');
  check(!!A.buildFacility('food', 3, 40), 'build a food stall beside the path');
  check(!A.buildFacility('drink', 15, 40), 'a facility far from any path is refused');
  A.buildFacility('drink', 3, 36); A.buildFacility('toilet', 3, 52); A.buildFacility('bin', -3, 40); A.buildFacility('bench', -3, 50);
  A.startResearch('herb');
  const m0 = sim.state.money;
  sim.runDays(6);
  const z = sim.state.animals.filter((a) => a.species === 'zebra'); const w = z.reduce((s, a) => s + a.welfare, 0) / z.length;
  const v = sim.state.visitors;
  console.log(`   zebras ${z.length}, welfare ${w.toFixed(0)}, guests ${v.length}, happy ${sim.state.happy.toFixed(0)}, rating ${sim.info.rating.toFixed(2)}, money ${m0} → ${Math.round(sim.state.money)}`);
  console.log('   days:', sim.state.ledger.days.map((d) => `${d.day}: +${d.income} −${d.expense} (shops ${d.detail.shops}, gifts ${d.detail.donations})`).join(' | '));
  console.log('   needs:', Object.entries(z[0].needs).map(([k, x]) => `${k} ${Math.round(x)}`).join(', '), JSON.stringify(z[0].why));
  console.log('   a guest:', v[0] && JSON.stringify({ name: v[0].name, happy: Math.round(v[0].happy), needs: Object.fromEntries(Object.entries(v[0].needs).map(([k, x]) => [k, Math.round(x)])), thought: v[0].thought, at: [v[0].x.toFixed(1), v[0].z.toFixed(1)] }));
  check(w > 70, 'well-kept zebras are happy (welfare > 70)');
  check(v.length > 15, 'guests walk in');
  check(sim.state.ledger.days.at(-1).detail.shops > 0, 'guests buy at the stalls');
  check(sim.state.ledger.days.at(-1).profit > 0, 'the zoo makes a profit');
  check(sim.state.research.done.includes('herb'), 'the vet finished herbivore research');
  check(v.every((g) => Math.abs(g.x) < 25 && g.z > 5 && g.z < 65), 'guests stay on the paths area');
  sim.runDays(12);
  check(sim.state.stats.births > 0, `zebras had babies (${sim.state.stats.births})`);
  const snap = sim.snapshot(); const sim2 = createSim(); sim2.load(JSON.parse(JSON.stringify(snap)));
  check(Math.abs(sim2.hInfo(sim2.state.habitats[0]).share.soil - sim.hInfo(sim.state.habitats[0]).share.soil) < 1e-9, 'save and load keep the painted ground');
}
// 2. Neglect: no path to the habitat, lions with zebras.
{
  const sim = createSim(); sim.load(null); const A = sim.actions;
  const h = A.createHabitat([[20, 20], [40, 20], [40, 5], [20, 5]]);
  check(!!h && !sim.hInfo(h).gate, 'a habitat away from paths has no gate');
  for (const s of ['zebra', 'zebra', 'lion', 'lion']) A.buyAnimal(listing(sim, s, 'F', 12), h.id);
  A.hire('keeper');
  sim.runDays(3);
  const z = sim.state.animals.filter((a) => a.species === 'zebra'); const w = z.length ? z.reduce((s, a) => s + a.welfare, 0) / z.length : 0;
  console.log(`   neglected zebras welfare ${w.toFixed(0)}; why: ${JSON.stringify(z[0]?.why)}`);
  check(w < 50, 'zebras without access and with lions are unhappy');
  check(sim.state.visitors.length < 5, 'nobody comes to see a habitat they cannot reach');
}
// 3. Escapes, release, admin.
{
  const events = []; const sim = createSim({ emit: (t) => events.push(t) }); sim.load(null); const A = sim.actions;
  A.addPath([0, 44], [0, 30]); const h = A.createHabitat([[3, 42], [20, 42], [20, 30], [3, 30]]);
  A.buyAnimal(listing(sim, 'bear', 'M', 12), h.id); A.buyAnimal(listing(sim, 'bear', 'F', 12), h.id);
  sim.runDays(8);
  check(events.includes('escaped'), 'bears get out over a low wooden fence');
  const cc0 = sim.state.cc; const bear = sim.state.animals.find((a) => a.species === 'bear' && !a.escaped && !a.sick && a.health >= 60 && !a.pregnant);
  if (bear) { A.releaseAnimal(bear.id); check(sim.state.cc === cc0 + 15, 'releasing a bear earns 15 conservation points'); }
  const adm = createSim({ admin: true }); adm.load(null);
  const m0 = adm.state.money; const h2 = adm.actions.createHabitat([[3, 50], [20, 50], [20, 40], [3, 40]], 3);
  adm.actions.placeItem(h2.id, 'climb', 10, 45); adm.actions.buyAnimal(listing(adm, 'elephant', 'F', 20), h2.id);
  check(adm.state.money === m0 && h2.items.length === 1 && adm.state.animals.length === 1, 'admin: everything free and unlocked, steel fence allowed');
}
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
