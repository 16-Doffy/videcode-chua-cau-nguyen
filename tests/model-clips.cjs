// A contact sheet per model: one row per clip (or, with "every", one frame each step of a long clip), side view,
// so the walk and the idle clip can be picked by eye. Needs `node serve.cjs`. Usage: node tests/model-clips.cjs lion every=0.6
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa', 'models');
const [id, opt, fromArg] = process.argv.slice(2); const every = opt?.startsWith("every=") ? Number(opt.slice(6)) : 0; const from = fromArg?.startsWith("from=") ? Number(fromArg.slice(5)) : 0;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, bypassCSP: true })).newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('http://127.0.0.1:4173/zoo/credits.html');
  const info = await page.evaluate(async ([id, every, from]) => {
    const THREE = await import('../vendor/three.module.min.js');
    const { GLTFLoader } = await import('./vendor/GLTFLoader.js');
    const gltf = await new Promise((ok, bad) => new GLTFLoader().load(`./models/${id}.glb`, ok, undefined, bad));
    const W = 200, H = 140; const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdde8ee);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 2)); const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(3, 5, 4); scene.add(d);
    const m = gltf.scene; scene.add(m); m.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(m); const size = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.5; const cam = new THREE.PerspectiveCamera(40, W / H, dist / 100, dist * 10);
    cam.position.copy(c).add(new THREE.Vector3(dist, size.y * 0.15, 0)); cam.lookAt(c);
    const mixer = new THREE.AnimationMixer(m);
    const rows = every ? [{ clip: gltf.animations[0], times: Array.from({ length: Math.ceil((gltf.animations[0].duration - from) / every) }, (_, k) => from + k * every) }]
      : gltf.animations.map((clip) => ({ clip, times: [0, 0.25, 0.5, 0.75].map((f) => f * clip.duration) }));
    const cols = every ? 6 : 4; const cells = rows.flatMap((row) => row.times.map((t) => ({ clip: row.clip, t })));
    const sheet = document.createElement('canvas'); sheet.width = cols * W; sheet.height = Math.ceil(cells.length / cols) * (H + 16); const g = sheet.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, sheet.width, sheet.height); g.font = '12px sans-serif'; g.fillStyle = '#000';
    cells.forEach((cell, k) => {
      mixer.stopAllAction(); const act = mixer.clipAction(cell.clip); act.reset().play(); mixer.setTime(cell.t);
      r.render(scene, cam); const x = (k % cols) * W; const y = Math.floor(k / cols) * (H + 16);
      g.drawImage(r.domElement, x, y + 16); g.fillText(`${cell.clip.name.slice(0, 18)} t=${cell.t.toFixed(1)}`, x + 4, y + 12);
    });
    document.body.innerHTML = ''; document.body.style.margin = '0'; document.body.appendChild(sheet);
    return { w: sheet.width, h: sheet.height };
  }, [id, every, from]);
  await page.setViewportSize({ width: info.w, height: Math.min(info.h, 4000) });
  await page.screenshot({ path: `${out}/${id}-clips.png` });
  console.log(`${out}/${id}-clips.png`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
