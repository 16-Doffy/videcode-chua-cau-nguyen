// Admin mode (zoo/?admin): everything free and unlocked. Builds a habitat for every species with what it needs,
// staff and facilities, then pictures the zoo and each habitat up close. Needs `node serve.cjs`.
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa');
(async () => {
  const [w, h] = [Number(process.argv[2] || 1366), Number(process.argv[3] || 820)];
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  await page.goto('http://127.0.0.1:4173/zoo/?admin');
  await page.evaluate(() => localStorage.removeItem('thirds-zoo-admin-v2'));
  await page.reload();
  await page.waitForSelector('#loading.hide', { timeout: 90000 });
  await page.click('#tips-close');
  const hud = await page.evaluate(() => {
    const { sim } = window.__zoo; const A = sim.actions;
    const herd = (plot, species, sexes) => { for (const sex of sexes) { const m = { id: sim.state.nextId++, species, sex, age: 20 }; sim.state.market.push(m); A.buyAnimal(m.id, plot); } };
    const build = (plot, biome, items, barrier) => { A.buyPlot(plot, biome); for (const [t, x, z] of items) A.placeItem(plot, t, x, z); while (sim.state.plots[plot].barrier < barrier) A.upgradeBarrier(plot); A.buildBoard(plot); };
    const base = [['pool', 0, 0], ['pool', 0, 3], ['shelter', 10, 0], ['shelter', 10, 3], ['plant', 5, 1], ['plant', 7, 9], ['plant', 3, 8], ['plant', 9, 7]];
    build(5, 'savanna', [...base, ['hayball', 6, 5], ['feeder', 8, 5], ['mud', 2, 10], ['scratch', 5, 10], ['pool', 0, 6], ['shelter', 10, 6]], 3);
    herd(5, 'zebra', ['M', 'F', 'F']); herd(5, 'giraffe', ['M', 'F']); herd(5, 'elephant', ['M', 'F']);
    build(6, 'bamboo', [...base, ['climb', 5, 5], ['ball', 8, 5]], 2); herd(6, 'panda', ['F']); herd(6, 'redpanda', ['M', 'F']);
    build(3, 'polar', [...base, ['pool', 3, 0], ['pool', 3, 3], ['ball', 6, 6], ['icetreat', 8, 8]], 1); herd(3, 'penguin', ['M', 'F', 'M', 'F', 'F']);
    build(4, 'forest', [...base, ['scratch', 6, 6], ['icetreat', 8, 5], ['climb', 4, 4]], 3); herd(4, 'bear', ['M', 'F']);
    build(0, 'savanna', [...base, ['scratch', 6, 6], ['ball', 8, 5]], 3); herd(0, 'lion', ['M', 'F', 'F']);
    for (const r of ['keeper', 'keeper', 'keeper', 'vet', 'mechanic', 'janitor', 'security']) A.hire(r);
    [['food', 0], ['drink', 1], ['toilet', 2], ['gift', 3], ['bench', 8], ['bin', 9], ['food', 12], ['drink', 14], ['toilet', 16]].forEach(([t, k]) => A.buildFacility(k, t));
    return { money: document.querySelector('#money').textContent, tag: getComputedStyle(document.querySelector('.admin-tag')).display, animals: sim.state.animals.length, facilities: sim.state.facilities.length };
  });
  await page.click('[data-speed="4"]');
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${out}/admin-all-${w}.png` });
  const state = await page.evaluate(() => { const { sim } = window.__zoo; const by = {}; for (const a of sim.state.animals) (by[a.species] ||= []).push(Math.round(a.welfare)); return { guests: Math.round(sim.state.guests), happy: Math.round(sim.state.happy), rating: sim.info.rating.toFixed(2), welfare: by }; });
  await page.evaluate(() => window.__zoo.focusAt(0, 14, 26)); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/admin-paths-${w}.png` });
  for (const i of [5, 6, 3, 4, 0]) { await page.evaluate((k) => window.__zoo.focusPlot(k, 15), i); await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/admin-plot${i}-${w}.png` }); }
  console.log(JSON.stringify(hud), '\n', JSON.stringify(state), '\nerrors:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
