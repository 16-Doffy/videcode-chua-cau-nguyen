// Plays Third's Zoo in a real browser through its screens: buys a habitat, places items on cells, hires staff,
// buys animals at the market, builds guest facilities, starts research, runs time fast; then opens an animal,
// the books and the goals. Prints the state and any page errors; pictures in .qa/. Needs `node serve.cjs`.
// Usage: node tests/zoo-play.cjs [width height]
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const [w, h] = [Number(process.argv[2] || 1366), Number(process.argv[3] || 820)];
  const phone = w <= 720;
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  await page.goto('http://127.0.0.1:4173/zoo/');
  await page.evaluate(() => localStorage.removeItem('thirds-zoo-v2'));
  await page.reload();
  await page.waitForSelector('#loading.hide', { timeout: 90000 });
  await page.click('#tips-close');
  const tapAt = async (pt) => { await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(120); };
  const drawer = async (name) => { if ((await page.getAttribute(`[data-drawer=${name}]`, 'aria-pressed')) !== 'true') await page.click(`[data-drawer=${name}]`); await page.waitForSelector('#drawer:not([hidden])'); };

  // A habitat.
  await tapAt(await page.evaluate(() => window.__zoo.plotOnScreen(5)));
  await page.waitForSelector('#panel:not([hidden]) [data-biome]');
  await page.screenshot({ path: `${out}/play-buy-${w}.png` });
  await page.click('[data-act=buy-plot][data-biome=savanna]');
  // Items on cells: pick the item, then tap cells of plot 5.
  await drawer('build');
  const place = async (type, cells) => {
    await page.click(`[data-act=item-mode][data-type=${type}]`);
    for (const [cx, cz] of cells) { await tapAt(await page.evaluate(([x, z]) => window.__zoo.cellOnScreen(5, x, z), [cx, cz])); }
    if (phone) await drawer('build');
  };
  await place('pool', [[1, 1], [1, 4]]);
  await place('shelter', [[9, 1]]);
  await place('plant', [[6, 6], [7, 9], [3, 9]]);
  await place('ball', [[10, 10]]);
  await page.screenshot({ path: `${out}/play-placing-${w}.png` });
  await page.click('[data-act=mode-done]');
  // Staff.
  await drawer('staff');
  await page.click('[data-act=hire][data-role=keeper]'); await page.click('[data-act=hire][data-role=vet]'); await page.click('[data-act=hire][data-role=mechanic]');
  // Animals: a herd of zebras put on the market for the test.
  await page.evaluate(() => { const s = window.__zoo.sim.state; for (const sex of ['M', 'F', 'F', 'F']) s.market.unshift({ id: s.nextId++, species: 'zebra', sex, age: 12 }); });
  await drawer('market'); await page.waitForTimeout(600);
  for (let k = 0; k < 4; k++) { await page.click('[data-act=buy-animal] >> nth=0'); await page.waitForTimeout(150); }
  await page.screenshot({ path: `${out}/play-market-${w}.png` });
  // Guest facilities on the yellow spots.
  await drawer('services');
  for (const [type, slot] of [['food', 0], ['drink', 1], ['toilet', 2], ['bin', 3], ['bench', 8]]) {
    await page.click(`[data-act=fac-mode][data-type=${type}]`);
    await tapAt(await page.evaluate((k) => window.__zoo.slotOnScreen(k), slot));
    await page.click('[data-act=mode-done]');
    if (phone) await drawer('services');
  }
  await drawer('research'); await page.click('[data-act=research][data-id=herb]');
  await page.click('[data-drawer=research]');
  // Time.
  await page.click('[data-speed="4"]');
  await page.waitForTimeout(20000);
  const st = await page.evaluate(() => { const s = window.__zoo.sim.state; return { money: Math.round(s.money), guests: Math.round(s.guests), happy: Math.round(s.happy), rating: window.__zoo.sim.info.rating.toFixed(2), animals: s.animals.length, items: s.plots[5].items.length, facilities: s.facilities.length, staff: s.staff, days: s.ledger.days.length, goals: Object.keys(s.goals.done), research: s.research }; });
  // An animal's welfare.
  await page.evaluate(() => window.__zoo.focusPlot(5, 18));
  await tapAt(await page.evaluate(() => window.__zoo.plotOnScreen(5)));
  await page.waitForSelector('#panel:not([hidden]) [data-act=sel-animal]');
  await page.screenshot({ path: `${out}/play-habitat-${w}.png` });
  await page.click('[data-act=sel-animal] >> nth=0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/play-animal-${w}.png` });
  await drawer('finance'); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/play-finance-${w}.png` });
  await drawer('goals'); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/play-goals-${w}.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  console.log(JSON.stringify(st), '\noverflow:', overflow, '\nerrors:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
