// Look at each .glb in zoo/models: node tree, size after transforms, clips, and two pictures (from +Z and from +X)
// so the facing and the scale for the manifest can be read off. Needs `node serve.cjs`.
const { chromium } = require('D:/Desktop/duy-gioi-qa/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', '.qa', 'models'); require('fs').mkdirSync(out, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['lion', 'elephant', 'giraffe', 'zebra', 'penguin', 'panda', 'redpanda', 'bear'];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 520, height: 360 }, bypassCSP: true })).newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('http://127.0.0.1:4173/zoo/credits.html');
  await page.evaluate(async () => {
    const THREE = await import('../vendor/three.module.min.js');
    const { GLTFLoader } = await import('./vendor/GLTFLoader.js');
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(520, 360); r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
    window.__show = async (id, view) => {
      const gltf = window.__cache?.[id] || await new Promise((ok, bad) => new GLTFLoader().load(`./models/${id}.glb`, ok, undefined, bad));
      (window.__cache ||= {})[id] = gltf;
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdde8ee);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 2)); const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(3, 5, 4); scene.add(d);
      const m = gltf.scene; scene.add(m); m.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(m); const size = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3());
      const dist = Math.max(size.x, size.y, size.z) * 1.6;
      const cam = new THREE.PerspectiveCamera(40, 520 / 360, dist / 100, dist * 10);
      cam.position.copy(c).add(view === 'z' ? new THREE.Vector3(0, size.y * 0.2, dist) : new THREE.Vector3(dist, size.y * 0.2, 0)); cam.lookAt(c);
      // A red stick along +Z from the model's feet shows which way +Z is.
      const stick = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.04 + 0.001, size.y * 0.04 + 0.001, Math.max(size.x, size.z) * 0.8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      stick.position.set(c.x, bb.min.y, c.z + Math.max(size.x, size.z) * 0.4); scene.add(stick);
      r.render(scene, cam); scene.remove(m);
      const tree = []; const walk = (o, dep) => { if (dep > 3) return; tree.push(`${'  '.repeat(dep)}${o.type}:${o.name}${o.isSkinnedMesh ? ' [skinned]' : ''}`); o.children.forEach((k) => walk(k, dep + 1)); }; walk(m, 0);
      return { size: size.toArray().map((v) => +v.toFixed(3)), min: bb.min.toArray().map((v) => +v.toFixed(3)), clips: gltf.animations.map((a) => `${a.name} (${a.duration.toFixed(1)}s)`), tree: tree.slice(0, 40) };
    };
  });
  for (const id of ids) {
    const info = await page.evaluate(([i]) => window.__show(i, 'z'), [id]);
    await page.screenshot({ path: `${out}/${id}-z.png` });
    await page.evaluate(([i]) => window.__show(i, 'x'), [id]);
    await page.screenshot({ path: `${out}/${id}-x.png` });
    console.log(`\n== ${id} size ${info.size.join(' x ')} min ${info.min.join(',')}\nclips: ${info.clips.join(' | ')}\n${info.tree.join('\n')}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
