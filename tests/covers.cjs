// The library's cover for the zoo: a zoo built in admin mode (so it costs nothing), without the screens.
// Needs the local server (node serve.cjs). Writes dist/hub/covers/zoo.jpg.
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 600 }, deviceScaleFactor: 1 })).newPage();
  await page.goto('http://127.0.0.1:4173/zoo/?admin');
  await page.evaluate(() => localStorage.removeItem('thirds-zoo-admin-v2'));
  await page.reload();
  await page.waitForSelector('#loading.hide', { timeout: 90000 });
  await page.addStyleTag({ content: '.hud,.foot,.toasts,.tips,.panel,.tools,.drawer,.mode{display:none!important}' });
  await page.evaluate(() => {
    const { sim } = window.__zoo; const A = sim.actions;
    const herd = (plot, species, sexes) => { for (const sex of sexes) { const m = { id: sim.state.nextId++, species, sex, age: 20 }; sim.state.market.push(m); A.buyAnimal(m.id, plot); } };
    const build = (plot, biome, items, barrier) => { A.buyPlot(plot, biome); for (const [t, x, z] of items) A.placeItem(plot, t, x, z); while (sim.state.plots[plot].barrier < barrier) A.upgradeBarrier(plot); A.buildBoard(plot); };
    const base = [['pool', 0, 0], ['shelter', 10, 0], ['plant', 5, 1], ['plant', 7, 9], ['plant', 3, 8]];
    build(5, 'savanna', [...base, ['feeder', 8, 5], ['mud', 2, 10]], 3); herd(5, 'zebra', ['M', 'F', 'F']); herd(5, 'giraffe', ['M', 'F']); herd(5, 'elephant', ['F']);
    build(6, 'bamboo', [...base, ['climb', 5, 5]], 2); herd(6, 'panda', ['F']); herd(6, 'redpanda', ['M', 'F']);
    build(3, 'polar', [...base, ['pool', 3, 3], ['icetreat', 8, 8]], 1); herd(3, 'penguin', ['M', 'F', 'M', 'F', 'F']);
    build(4, 'forest', [...base, ['scratch', 6, 6]], 3); herd(4, 'bear', ['M', 'F']);
    build(0, 'savanna', [...base, ['scratch', 6, 6]], 3); herd(0, 'lion', ['M', 'F']);
    build(1, 'bamboo', base, 1); build(2, 'forest', base, 1);
    for (const r of ['keeper', 'keeper', 'keeper', 'vet', 'mechanic', 'janitor']) A.hire(r);
    [['food', 0], ['drink', 1], ['toilet', 2], ['gift', 3], ['bench', 8], ['bin', 9], ['food', 12], ['drink', 14]].forEach(([t, k]) => A.buildFacility(k, t));
    sim.state.seenTips = true; sim.state.speed = 4;
  });
  await page.waitForTimeout(9000);
  await page.evaluate(() => window.__zoo.focusAt(0, 6, 40));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, '..', 'dist', 'hub', 'covers', 'zoo.jpg'), type: 'jpeg', quality: 82 });
  await browser.close();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
