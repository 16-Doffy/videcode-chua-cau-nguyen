// Browser check for the free-build zoo. Run with `node serve.cjs` on port 4173.
const assert = require('node:assert/strict');
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/zoo/?blank=1');
    await page.evaluate(() => localStorage.removeItem('thirds-zoo-v3'));
    await page.reload();
    await page.waitForSelector('#loading.hide', { timeout: 30000 });
    await page.click('#tips-close');
    await page.evaluate(() => window.__zoo.focusAt(-8, 25, 60, 180));
    const point = (x, z) => page.evaluate(([a, b]) => window.__zoo.pointOnScreen(a, b), [x, z]);
    const tap = async (x, z) => { const p = await point(x, z); await page.mouse.click(p.x, p.y); };
    await page.click('[data-drawer=path]');
    for (const p of [[0, 44], [0, 30], [0, 15]]) await tap(...p);
    assert.equal(await page.evaluate(() => window.__zoo.sim.state.paths.length), 3, 'path drawn from the entrance');
    await page.click('[data-drawer=fence]');
    for (const p of [[3, 27], [17, 27], [17, 12], [3, 12], [3, 27]]) await tap(...p);
    const habitat = await page.evaluate(() => { const s = window.__zoo.sim; const h = s.state.habitats[0]; return { id: h?.id, corners: h?.pts.length, gate: !!(h && s.hInfo(h).gate) }; });
    assert.equal(habitat.corners, 4, 'four-sided habitat drawn by clicks');
    assert.ok(habitat.gate, 'habitat has access from the path');
    await page.click('#panel [data-act=close]');
    await page.click('[data-drawer=paint]');
    await page.click('[data-act=paint-type][data-t=soil]');
    const a = await point(9, 19); const b = await point(12, 19);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
    assert.ok(await page.evaluate(() => { const s = window.__zoo.sim; return s.hInfo(s.state.habitats[0]).share.soil > 0; }), 'drag paints the ground');
    await page.click('[data-drawer=build]');
    await page.click('[data-act=item-mode][data-type=pool]');
    await tap(8, 18);
    assert.equal(await page.evaluate(() => window.__zoo.sim.state.habitats[0].items.length), 1, 'pool placed inside habitat');
    await page.click('[data-act=mode-done]');
    await page.click('[data-drawer=market]');
    await page.evaluate(() => { const s = window.__zoo.sim.state; s.market.unshift({ id: s.nextId++, species: 'zebra', sex: 'F', age: 12 }); window.__zoo.ui.renderDrawer(); });
    await page.click('[data-act=buy-animal] >> nth=0');
    assert.equal(await page.evaluate(() => window.__zoo.sim.state.animals.length), 1, 'animal bought into habitat');
    await page.evaluate(() => localStorage.setItem('thirds-zoo-v3', JSON.stringify(window.__zoo.sim.snapshot())));
    await page.reload();
    await page.waitForSelector('#loading.hide', { timeout: 30000 });
    assert.equal(await page.evaluate(() => window.__zoo.sim.state.habitats[0].items.length), 1, 'habitat items persist');
    assert.ok(await page.evaluate(() => { const s = window.__zoo.sim; return s.hInfo(s.state.habitats[0]).share.soil > 0; }), 'painted terrain persists');
    assert.deepEqual(errors, [], 'no page errors');
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    phone.on('pageerror', (e) => errors.push(e.message));
    await phone.goto('http://127.0.0.1:4173/zoo/?blank=1');
    await phone.waitForSelector('#loading.hide', { timeout: 30000 });
    await phone.click('#tips-close');
    await phone.click('[data-drawer=path]');
    await phone.click('[data-act=tool-start]');
    for (const [x, z] of [[0, 44], [0, 30]]) {
      const q = await phone.evaluate(([a, b]) => window.__zoo.pointOnScreen(a, b), [x, z]);
      await phone.touchscreen.tap(q.x, q.y);
    }
    assert.equal(await phone.evaluate(() => window.__zoo.sim.state.paths.length), 2, 'path drawing works on touch');
    assert.ok(await phone.locator('#drawer').isHidden(), 'tool options close for touch drawing');
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no mobile horizontal overflow');
    assert.deepEqual(errors, [], 'no mobile page errors');
    console.log('Free-build browser flow passed:', JSON.stringify(habitat));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
