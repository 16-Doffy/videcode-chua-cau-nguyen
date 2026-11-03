// Plays the zoo in a real browser: buys a plot and animals, feeds them, runs time fast; screenshots and errors.
// Needs the local server (node serve.cjs). Usage: node tests/zoo-play.cjs [width height]
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const [w, h] = [Number(process.argv[2] || 1366), Number(process.argv[3] || 820)];
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4173/zoo/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#loading.hide', { timeout: 60000 });
  await page.screenshot({ path: `${out}/zoo-start-${w}.png` });
  await page.click('#tips-close');
  // Tap the plot nearest the camera on the left (centre of the canvas area for plot 6 is found by projecting).
  const tapPlot = async (i) => {
    if (await page.locator('#panel:not([hidden]) [data-close]').count()) await page.click('#panel [data-close]');
    const pt = await page.evaluate((k) => window.__zoo.screenOf(k), i);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForSelector('#panel:not([hidden])');
  };
  await tapPlot(5);
  await page.screenshot({ path: `${out}/zoo-plot-${w}.png` });
  await page.click('[data-biome=savanna]');
  for (let k = 0; k < 3; k += 1) await page.click('[data-buy=zebra]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/zoo-zebras-${w}.png` });
  await tapPlot(3);
  await page.click('[data-biome=polar]');
  for (let k = 0; k < 4; k += 1) await page.click('[data-buy=penguin]');
  await page.click('[data-speed="4"]');
  await page.waitForTimeout(9000);
  await tapPlot(5);
  await page.click('[data-care=feed]');
  await page.click('[data-care=toy]');
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({ money: document.querySelector('#money').textContent, guests: document.querySelector('#guests').textContent, stars: document.querySelector('#stars').getAttribute('aria-label'), animals: document.querySelectorAll('.animals li').length }));
  await page.screenshot({ path: `${out}/zoo-play-${w}.png` });
  console.log(JSON.stringify(st), 'errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
