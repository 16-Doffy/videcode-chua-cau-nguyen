// Third's Zoo: build habitats, keep every animal well, look after the guests and the books. This file starts the
// game and joins the simulation (sim.js), the 3D world (world.js) and the screens (ui.js).
import { createSim } from './sim.js';
import { createWorld } from './world.js';
import { createUI } from './ui.js';
import { loadManifest, preload } from './models3d.js';
import { SPECIES, PLOTS, SLOTS } from './data.js';

const $ = (s) => document.querySelector(s);
// Admin mode (zoo/?admin) tests the game with everything free and unlocked, on its own save.
const ADMIN = new URLSearchParams(location.search).has('admin');
const SAVE_KEY = ADMIN ? 'thirds-zoo-admin-v2' : 'thirds-zoo-v2';
let saving = true;
const store = {
  get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } },
  set(v) { if (!saving) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch { /* private mode: play without saving */ } },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to clear */ } },
};

let world = null; let ui = null;
// What the simulation says happened, passed on to the world and the screens.
function onEvent(type, d) {
  if (!world || !ui) return;
  switch (type) {
    case 'toast': ui.toast(d.text, d.kind); break;
    case 'income': if (d.amount > 0) ui.floatText(`+${d.amount.toLocaleString('vi-VN')}`); break;
    case 'plots': world.rebuildPlots(); break;
    case 'plot': world.buildPlot(d.plot); break;
    case 'item-add': world.addItem(d.plot, d.item); break;
    case 'item-remove': world.removeItem(d.plot, d.id); break;
    case 'facilities': world.buildFacilities(); world.showSlots(ui.ui.mode?.kind === 'facility'); break;
    case 'animal-add': world.addAnimal(d.animal); break;
    case 'animal-remove': world.removeAnimal(d.id); break;
    case 'animal-move': world.moveAnimal(d.animal); break;
    case 'escaped': world.setEscaped(d.id, true); break;
    case 'recaptured': world.setEscaped(d.id, false); break;
    case 'keeper': world.keeperVisit(d.plot); break;
    case 'day': world.refreshGrowth(); break;
    default: break;
  }
}
const sim = createSim({ admin: ADMIN, emit: onEvent });
sim.load(store.get());

function save() { store.set({ ...sim.state, speed: 1 }); }
setInterval(save, 5000);
addEventListener('visibilitychange', () => { if (document.hidden) save(); });

(async () => {
  await loadManifest();
  // Animals already in the zoo load before the first frame; the rest load behind, ready when bought.
  await preload([...new Set(sim.state.animals.map((a) => a.species))]);
  preload(SPECIES.map((sp) => sp.id));
  world = createWorld($('#world'), sim);
  ui = createUI({ sim, world, onReset: () => { saving = false; store.clear(); location.reload(); } });
  world.buildAll(); world.resize();

  // A tap that did not turn into a drag picks what is under it; while placing, the pointer moves the placing box.
  const canvas = world.renderer.domElement; let down = null; let hoverAt = 0;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null; ui.onTap(world.pick(e.clientX, e.clientY, { slots: ui.ui.mode?.kind === 'facility' }));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ui.ui.mode || e.pointerType === 'touch' || performance.now() - hoverAt < 40) return;
    hoverAt = performance.now(); ui.onHover(world.pick(e.clientX, e.clientY));
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (sim.state.speed > 0) sim.step(dt * sim.state.speed);
    world.frame(dt); ui.tick(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  $('#loading').classList.add('hide');
  if (!sim.state.plots.some((p) => p.owned)) ui.toast('Bấm vào một khu đất trống để mua chuồng đầu tiên.');

  // For the browser tests (tests/zoo-play.cjs, tests/zoo-admin.cjs).
  window.__zoo = {
    sim, world, ui,
    plotOnScreen: (i) => world.screenOf(PLOTS[i].x, PLOTS[i].z),
    cellOnScreen: (i, cx, cz) => world.screenOf(PLOTS[i].x + cx + 0.5 - 6, PLOTS[i].z + cz + 0.5 - 6),
    slotOnScreen: (k) => world.screenOf(SLOTS[k].x, SLOTS[k].z),
    focusPlot: (i, dist) => world.focus(PLOTS[i].x, PLOTS[i].z, dist),
    focusAt: (x, z, dist) => world.focus(x, z, dist),
  };
})();
