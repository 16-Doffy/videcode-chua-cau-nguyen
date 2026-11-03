// Admin mode (zoo/?admin): every plot and animal free. Builds one plot per habitat with all eight species, waits for
// the .glb models, then pictures the whole zoo and each plot up close. Needs `node serve.cjs`.
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
  await page.evaluate(() => localStorage.removeItem('thirds-zoo-admin-v1'));
  await page.reload();
  await page.waitForSelector('#loading.hide', { timeout: 90000 });
  await page.click('#tips-close');
  const tapPlot = async (i) => {
    if (await page.locator('#panel:not([hidden]) [data-close]').count()) await page.click('#panel [data-close]');
    const pt = await page.evaluate((k) => window.__zoo.screenOf(k), i);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForSelector('#panel:not([hidden])');
  };
  const plan = [[5, 'savanna', { zebra: 3, giraffe: 2, lion: 2, elephant: 2 }], [6, 'bamboo', { redpanda: 3, panda: 2 }], [3, 'polar', { penguin: 5 }], [4, 'forest', { bear: 2 }]];
  for (const [i, biome, buy] of plan) {
    await tapPlot(i);
    await page.click(`[data-biome=${biome}]`);
    for (const [sid, n] of Object.entries(buy)) for (let k = 0; k < n; k += 1) await page.click(`[data-buy=${sid}]`);
  }
  const hud = await page.evaluate(() => ({ money: document.querySelector('#money').textContent, tag: getComputedStyle(document.querySelector('.admin-tag')).display, buyLabel: document.querySelector('[data-buy]')?.textContent }));
  await page.click('#panel [data-close]');
  await page.waitForTimeout(6000); // models in, animals walking
  await page.screenshot({ path: `${out}/admin-all-${w}.png` });
  const sizes = {}; for (const a of await page.evaluate(() => window.__zoo.animals())) sizes[a.species] ||= `${a.size.join('x')} y${a.y} kids${a.kids}`;
  console.log(sizes);
  for (const [i] of plan) { await page.evaluate((k) => window.__zoo.focus(k, 13), i); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/admin-plot${i}-${w}.png` }); }
  console.log(JSON.stringify(hud), '\nerrors:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
