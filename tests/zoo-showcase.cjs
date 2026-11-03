// Verifies that visiting http://127.0.0.1:4173/zoo/ without ?empty automatically loads
// the Developer Showcase Zoo with full habitats, animals, facilities, and staff.
const assert = require('node:assert/strict');
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:4173/zoo/');
    await page.evaluate(() => localStorage.removeItem('thirds-zoo-v3'));
    await page.reload();
    await page.waitForSelector('#loading.hide', { timeout: 30000 });

    const info = await page.evaluate(() => {
      const { sim } = window.__zoo;
      const s = sim.state;
      const avgWelfare = s.animals.reduce((acc, a) => acc + a.welfare, 0) / (s.animals.length || 1);
      return {
        habitats: s.habitats.length,
        animals: s.animals.length,
        facilities: s.facilities.length,
        paths: s.paths.length,
        staff: s.staff,
        rating: Number(sim.info.rating.toFixed(2)),
        avgWelfare: Math.round(avgWelfare),
        species: [...new Set(s.animals.map((a) => a.species))],
      };
    });

    console.log('Showcase Zoo verified:', JSON.stringify(info));
    assert.equal(info.habitats, 4, '4 developer designed habitats');
    assert.equal(info.animals, 14, '14 healthy animals living in habitats');
    assert.equal(info.facilities, 10, '10 guest facilities placed along paths');
    assert.ok(info.paths >= 12, 'network of paths connecting all habitats');
    assert.ok(info.staff.keeper >= 2, 'professional keepers on duty');
    assert.ok(info.rating >= 3.5, 'high star rating');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('Developer Showcase Zoo check PASSED!');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
