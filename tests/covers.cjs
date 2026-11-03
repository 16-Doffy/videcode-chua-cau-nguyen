// The library's cover for the zoo: a zoo already built (a saved game put in localStorage), without the HUD.
// Needs the local server (node serve.cjs). Writes dist/hub/covers/zoo.jpg (via a PNG in .qa).
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa');
const a = (id, species, n, baby = 0) => Array.from({ length: n }, (_, k) => ({ id: id + k, species, food: 95, happy: 92, age: 4, baby: k < baby }));
const save = {
  money: 12850, time: 410, guests: 64, speed: 1, nextId: 200, seenTips: true, bestStars: 3,
  plots: [
    { owned: true, biome: 'bamboo', clean: 96, toyUntil: 900, animals: [...a(1, 'panda', 2), ...a(5, 'redpanda', 2)] },
    { owned: true, biome: 'forest', clean: 92, toyUntil: 0, animals: a(10, 'bear', 2) },
    { owned: true, biome: 'savanna', clean: 95, toyUntil: 0, animals: [...a(20, 'giraffe', 3, 1)] },
    { owned: true, biome: 'polar', clean: 97, toyUntil: 0, animals: a(30, 'penguin', 7, 2) },
    { owned: true, biome: 'savanna', clean: 90, toyUntil: 900, animals: a(40, 'lion', 3, 1) },
    { owned: true, biome: 'savanna', clean: 94, toyUntil: 0, animals: [...a(50, 'zebra', 4), ...a(60, 'elephant', 2)] },
    { owned: false },
  ],
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  // Before the page's own script runs: a reload would let the game save its fresh state over this on the way out.
  await page.addInitScript((s) => localStorage.setItem('thirds-zoo-v1', JSON.stringify(s)), save);
  await page.goto('http://127.0.0.1:4173/zoo/');
  await page.waitForSelector('#loading.hide', { timeout: 60000 });
  await page.addStyleTag({ content: '.hud,.foot,.toasts,.tips,.panel{display:none!important}' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/zoo-cover.png` });
  await browser.close();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
