// Runs the zoo simulation in Node with no drawing: a sensible zoo should thrive, a neglected one should suffer.
// Usage: node tests/zoo-sim.mjs
import { createSim } from '../dist/zoo/sim.js';
let fails = 0;
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) fails += 1; };
const listing = (sim, species, sex, age) => { const m = { id: sim.state.nextId++, species, sex, age }; sim.state.market.push(m); return m.id; };

// 1. A well-kept savanna of zebras with a keeper, facilities and research.
{
  const toasts = []; const sim = createSim({ emit: (t, d) => { if (t === 'toast') toasts.push(d.text); } });
  sim.load(null);
  const A = sim.actions;
  check(A.buyPlot(5, 'savanna'), 'buy a savanna habitat');
  check(A.placeItem(5, 'pool', 0, 0), 'place a pool');
  check(!A.placeItem(5, 'pool', 1, 1), 'cannot place over the pool');
  A.placeItem(5, 'shelter', 8, 0); A.placeItem(5, 'plant', 5, 5); A.placeItem(5, 'plant', 6, 8); A.placeItem(5, 'ball', 9, 9);
  for (const [sex, age] of [['M', 12], ['F', 12], ['F', 12], ['F', 12]]) A.buyAnimal(listing(sim, 'zebra', sex, age), 5);
  A.hire('keeper'); A.hire('vet');
  sim.actions.buildFacility(0, 'food'); sim.actions.buildFacility(1, 'drink'); sim.actions.buildFacility(2, 'toilet'); sim.actions.buildFacility(3, 'bin');
  A.startResearch('herb');
  const money0 = sim.state.money;
  sim.runDays(6);
  const z = sim.state.animals.filter((a) => a.species === 'zebra');
  const w = z.reduce((s, a) => s + a.welfare, 0) / z.length;
  console.log(`   zebras ${z.length}, welfare ${w.toFixed(0)}, guests ${sim.state.guests.toFixed(0)}, happy ${sim.state.happy.toFixed(0)}, rating ${sim.info.rating.toFixed(2)}, money ${money0} → ${Math.round(sim.state.money)}`);
  console.log('   days:', sim.state.ledger.days.map((d) => `${d.day}: +${d.income} −${d.expense}`).join(' | '));
  console.log('   needs of one:', Object.entries(z[0].needs).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '), JSON.stringify(z[0].why));
  check(w > 70, 'well-kept zebras are happy (welfare > 70)');
  check(sim.state.guests > 20, 'guests come');
  check(sim.state.ledger.days.at(-1).profit > 0, 'the zoo makes a profit');
  check(sim.state.research.done.includes('herb'), 'the vet finished herbivore research');
  check(sim.state.goals.done.herd && sim.state.goals.done.keeper, 'first goals are done');
  sim.runDays(12);
  check(sim.state.stats.births > 0, `zebras had babies (${sim.state.stats.births})`);
}
// 2. Neglect: no keeper, lions behind a low fence with zebras.
{
  const sim = createSim(); sim.load(null); const A = sim.actions;
  A.buyPlot(5, 'savanna');
  for (const s of ['zebra', 'zebra', 'lion', 'lion']) A.buyAnimal(listing(sim, s, 'F', 12), 5);
  let escapes = 0; const sim2 = sim;
  sim2.runDays(4);
  const z = sim.state.animals.filter((a) => a.species === 'zebra');
  const w = z.length ? z.reduce((s, a) => s + a.welfare, 0) / z.length : 0;
  console.log(`   neglected zebras welfare ${w.toFixed(0)}; why: ${JSON.stringify(z[0]?.why)}`);
  check(w < 50, 'neglected zebras with lions are unhappy (welfare < 50)');
}
// 3. Escapes, release, admin.
{
  const events = []; const sim = createSim({ emit: (t) => events.push(t) }); sim.load(null); const A = sim.actions;
  A.buyPlot(4, 'forest'); A.buyAnimal(listing(sim, 'bear', 'M', 12), 4); A.buyAnimal(listing(sim, 'bear', 'F', 12), 4);
  sim.runDays(8);
  check(events.includes('escaped'), 'bears get out over a low wooden fence');
  const cc0 = sim.state.cc; const bear = sim.state.animals.find((a) => a.species === 'bear' && !a.escaped && !a.sick && a.health >= 60 && !a.pregnant);
  if (bear) { A.releaseAnimal(bear.id); check(sim.state.cc === cc0 + 15, 'releasing a bear earns 15 conservation points'); }
  const adm = createSim({ admin: true }); adm.load(null);
  const m0 = adm.state.money; adm.actions.buyPlot(0, 'bamboo'); adm.actions.placeItem(0, 'climb', 0, 0); adm.actions.buyAnimal(listing(adm, 'elephant', 'F', 20), 0);
  check(adm.state.money === m0 && adm.state.plots[0].items.length === 1 && adm.state.animals.length === 1, 'admin: everything free and unlocked');
}
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
