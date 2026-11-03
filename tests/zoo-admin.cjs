// Admin browser check for the free-build zoo. Run with `node serve.cjs` on port 4173.
const assert = require('node:assert/strict');
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/zoo/?admin&blank=1');
    await page.evaluate(() => localStorage.removeItem('thirds-zoo-admin-v3'));
    await page.reload();
    await page.waitForSelector('#loading.hide', { timeout: 30000 });
    await page.click('#tips-close');
    const result = await page.evaluate(() => {
      const { sim } = window.__zoo; const A = sim.actions; const money = sim.state.money;
      A.addPath([0, 44], [0, 20]);
      const h = A.createHabitat([[3, 35], [20, 35], [20, 20], [3, 20]], 3);
      A.placeItem(h.id, 'bigpool', 16, 24);
      A.placeItem(h.id, 'shelter', 7, 24);
      const m = { id: sim.state.nextId++, species: 'zebra', sex: 'F', age: 12 };
      sim.state.market.push(m); A.buyAnimal(m.id, h.id);
      A.buildFacility('food', -3, 40);
      A.hire('keeper');
      return { money, after: sim.state.money, habitat: h.id, gate: !!sim.hInfo(h).gate, animals: sim.state.animals.length, facilities: sim.state.facilities.length, items: h.items.length };
    });
    assert.equal(result.after, result.money, 'admin construction is free');
    assert.ok(result.gate, 'admin habitat connects to the path');
    assert.equal(result.animals, 1);
    assert.equal(result.facilities, 1);
    assert.equal(result.items, 2);
    assert.deepEqual(errors, [], 'no page errors');
    console.log('Admin browser flow passed:', JSON.stringify(result));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
