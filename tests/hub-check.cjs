// The library and both games open with no page errors; screenshots of the library at desktop and phone width.
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const report = [];
  for (const [w, h] of [[1366, 860], [390, 844]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:4173/'); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/hub-${w}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    await page.click('a.card[href="./chua.html"]'); await page.waitForURL('**/chua.html');
    await page.waitForSelector('#loading.hide', { timeout: 60000 }).catch(() => errors.push('temple did not finish loading'));
    await page.goto('http://127.0.0.1:4173/'); await page.click('a.card[href="./zoo/"]'); await page.waitForURL('**/zoo/');
    await page.waitForSelector('#loading.hide', { timeout: 60000 });
    await page.click('.back'); await page.waitForURL('http://127.0.0.1:4173/');
    report.push(`${w}px: overflow=${overflow} errors=${errors.length ? errors.join(' | ') : 'none'}`);
  }
  console.log(report.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
