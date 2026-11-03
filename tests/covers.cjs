// The library cover for the zoo: a zoo built in admin mode, without screens.
// Needs local server (node serve.cjs). Writes dist/hub/covers/zoo.jpg.
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 600 }, deviceScaleFactor: 1 })).newPage();
  await page.goto('http://127.0.0.1:4173/zoo/?admin&blank=1');
  await page.evaluate(() => localStorage.removeItem('thirds-zoo-admin-v3'));
  await page.reload();
  await page.waitForSelector('#loading.hide', { timeout: 90000 });
  await page.addStyleTag({ content: '.hud,.foot,.toasts,.tips,.panel,.tools,.drawer,.mode{display:none!important}' });
  await page.evaluate(() => {
    const { sim } = window.__zoo; const A = sim.actions;
    A.addPath([0, 44], [0, 0]);
    A.addPath([0, 22], [-24, 22]);
    A.addPath([0, 22], [24, 22]);

    const herd = (habId, species, count) => {
      for (let i = 0; i < count; i++) {
        const m = { id: sim.state.nextId++, species, sex: i % 2 === 0 ? 'M' : 'F', age: 20 };
        sim.state.market.push(m);
        A.buyAnimal(m.id, habId);
      }
    };

    // East habitat: Savanna (Zebras, Giraffes)
    const h1 = A.createHabitat([[3, 42], [24, 42], [24, 25], [3, 25]], 3);
    A.placeItem(h1.id, 'bigpool', 14, 33);
    A.placeItem(h1.id, 'shelter', 8, 35);
    A.placeItem(h1.id, 'feeder', 8, 28);
    herd(h1.id, 'zebra', 3);
    herd(h1.id, 'giraffe', 2);

    // West habitat: Bamboo (Pandas, Red Pandas)
    const h2 = A.createHabitat([[-3, 42], [-24, 42], [-24, 25], [-3, 25]], 2);
    A.placeItem(h2.id, 'pool', -14, 33);
    A.placeItem(h2.id, 'shelter', -8, 35);
    herd(h2.id, 'panda', 1);
    herd(h2.id, 'redpanda', 2);

    // South-East habitat: Forest (Bears)
    const h3 = A.createHabitat([[3, 19], [24, 19], [24, 2], [3, 2]], 3);
    A.placeItem(h3.id, 'pool', 14, 10);
    A.placeItem(h3.id, 'shelter', 8, 12);
    herd(h3.id, 'bear', 2);

    // South-West habitat: Polar (Penguins)
    const h4 = A.createHabitat([[-3, 19], [-24, 19], [-24, 2], [-3, 2]], 1);
    A.placeItem(h4.id, 'pool', -14, 10);
    A.placeItem(h4.id, 'shelter', -8, 12);
    herd(h4.id, 'penguin', 4);

    for (const r of ['keeper', 'keeper', 'vet', 'janitor']) A.hire(r);
    A.buildFacility('food', -2, 44);
    A.buildFacility('drink', 2, 44);
    A.buildFacility('toilet', -2, 0);
    A.buildFacility('gift', 2, 0);

    sim.state.seenTips = true; sim.state.speed = 4;
  });
  await page.waitForTimeout(9000);
  await page.evaluate(() => window.__zoo.focusAt(0, 18, 55));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, '..', 'dist', 'hub', 'covers', 'zoo.jpg'), type: 'jpeg', quality: 82 });
  await browser.close();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
