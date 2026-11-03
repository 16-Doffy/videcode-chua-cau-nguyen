// Third's Zoo simulation: the zoo as numbers, no drawing. main.js shows it; tests/zoo-sim.mjs runs it in Node.
// Everything happens in whole seconds of zoo time (tick) and zoo days (newDay); the world hears about changes
// through emit(type, data).
import {
  START_MONEY, START_CC, DAY_SECONDS, PLOT_SIZE, SPECIES, SPECIES_BY_ID, STATUS, ITEMS, BARRIERS, FACILITIES, SHOPS,
  SLOTS, STAFF, RESEARCH, BOARD_COST, GOALS, PLOTS, plotPrice, NAMES,
} from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CELLS = PLOT_SIZE * PLOT_SIZE;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const NEED_LABELS = { food: 'Thức ăn', water: 'Nước uống', social: 'Bầy đàn', habitat: 'Môi trường sống', shelter: 'Chỗ trú', enrich: 'Vui chơi', health: 'Sức khỏe', clean: 'Vệ sinh' };
const NEED_WEIGHTS = { food: 0.17, water: 0.12, social: 0.14, habitat: 0.17, shelter: 0.1, enrich: 0.12, health: 0.1, clean: 0.08 };

export function freshState() {
  return {
    v: 2, money: START_MONEY, cc: START_CC, time: 0, speed: 1, nextId: 1, seenTips: false,
    entry: 12, prices: { food: FACILITIES.food.price, drink: FACILITIES.drink.price, gift: FACILITIES.gift.price },
    guests: 0, happy: 60,
    plots: PLOTS.map(() => ({ owned: false })),
    animals: [], facilities: [],
    staff: { keeper: 0, vet: 0, mechanic: 0, janitor: 0, security: 0 },
    research: { bank: { vet: 0, mech: 0 }, active: { vet: null, mech: null }, progress: {}, done: [] },
    market: [], marketDay: -1,
    ledger: { today: blankDay(), days: [] },
    goals: { done: {}, tiers: [false, false, false] },
    stats: { births: 0, releases: 0, maxGuests: 0, bestProfit: -1e9 },
  };
}
function blankDay() { return { tickets: 0, shops: 0, donations: 0, sales: 0, salaries: 0, food: 0, upkeep: 0, build: 0, animals: 0 }; }

export function createSim({ admin = false, emit = () => {} } = {}) {
  let state = freshState();
  let secAcc = 0; let dayAcc = 0; let incomeAcc = 0; let incomeTimer = 0;
  const warned = new Set();
  const toast = (text, kind = '') => emit('toast', { text, kind });

  // ---------- Derived numbers (recomputed every second, never saved) ----------
  let info = { plots: [], rating: 0, appeal: 0, avgWelfare: 0, variety: 0, cover: {}, litter: 0, covered: new Set(), broken: 0, escaped: 0 };
  const day = () => Math.floor(state.time / DAY_SECONDS) + 1;
  const ownedPlots = () => state.plots.map((p, i) => [p, i]).filter(([p]) => p.owned);
  const animalsIn = (i) => state.animals.filter((a) => a.plot === i && !a.escaped);
  const isAdult = (a) => a.age >= SPECIES_BY_ID[a.species].adult;
  const done = (id) => admin || state.research.done.includes(id);

  function plotStats(i) {
    const p = state.plots[i];
    const s = { water: 0, shelterCells: 0, shelters: 0, plants: 0, rocks: 0, types: new Set(), land: CELLS, animals: animalsIn(i), landNeed: 0, shelterNeed: 0 };
    if (!p.owned) return s;
    for (const it of p.items) {
      const def = ITEMS[it.type]; const cells = def.w * def.d;
      if (def.kind === 'water') { s.water += cells; s.land -= cells; }
      if (def.kind === 'shelter') { s.shelters += 1; s.land -= cells; }
      if (def.kind === 'plant') s.plants += 1;
      if (def.kind === 'deco') s.rocks += 1;
      if (def.kind === 'enrich') s.types.add(it.type);
    }
    for (const a of s.animals) { const sp = SPECIES_BY_ID[a.species]; const k = isAdult(a) ? 1 : 0.5; s.landNeed += sp.area * k; s.shelterNeed += sp.shelter * k; }
    s.predators = s.animals.some((a) => SPECIES_BY_ID[a.species].predator);
    s.prey = s.animals.some((a) => !SPECIES_BY_ID[a.species].predator);
    return s;
  }

  function groupScore(count, [min, max]) { if (!count) return 0; if (count < min) return count / min; if (count > max) return max / count; return 1; }

  /** What each need of one animal is (0–100) and a word on the worst thing about it. */
  function needsOf(a, st) {
    const sp = SPECIES_BY_ID[a.species]; const p = state.plots[a.plot];
    const same = st.animals.filter((x) => x.species === a.species);
    const males = same.filter((x) => x.sex === 'M' && isAdult(x)).length;
    let social = groupScore(same.length, sp.group);
    const why = {};
    if (same.length < sp.group[0]) why.social = `Cô đơn: loài này thích ${sp.group[0]}–${sp.group[1]} con`;
    if (same.length > sp.group[1]) why.social = 'Quá đông, nên chuyển bớt đi';
    if (males > sp.males) { social *= 0.55; why.social = `Quá nhiều con đực trưởng thành (${males}), chúng hay đánh nhau`; }
    if (!sp.predator && st.predators) { social *= 0.3; why.social = 'Sợ hãi vì ở chung với thú săn mồi'; }
    const landScore = st.landNeed ? clamp(st.land / st.landNeed, 0, 1) : 1;
    const waterScore = sp.water ? clamp(st.water / CELLS / sp.water, 0, 1) : 1;
    const plantScore = sp.plants ? clamp(st.plants / sp.plants, 0, 1) : 1;
    const biome = p.biome === sp.biome ? 1 : 0.45;
    const climb = sp.climber && !st.types.has('climb') ? 0.75 : 1;
    const habitat = (0.45 * landScore + 0.3 * waterScore + 0.25 * plantScore) * biome * climb;
    if (biome < 1) why.habitat = 'Sai môi trường sống: nên chuyển sang chuồng hợp loài';
    else if (landScore < 0.8) why.habitat = 'Chật chội: cần thêm đất hoặc bớt thú';
    else if (waterScore < 0.8) why.habitat = 'Thiếu nước: đặt thêm hồ';
    else if (plantScore < 0.8) why.habitat = 'Thiếu cây: trồng thêm cây hợp môi trường';
    else if (climb < 1) why.habitat = 'Cần chỗ leo trèo';
    const shelter = st.shelterNeed ? clamp((st.shelters * 4) / st.shelterNeed, 0, 1) : 1;
    if (shelter < 0.8) why.shelter = st.shelters ? 'Nhà trú chật, xây thêm' : 'Chưa có nhà trú';
    const liked = sp.likes.filter((t) => st.types.has(t)).length;
    const enrich = clamp(liked / sp.enrich, 0, 1);
    if (enrich < 1) why.enrich = `Thích: ${sp.likes.map((t) => ITEMS[t].name.toLowerCase()).join(', ')}`;
    const needs = { food: p.food, water: p.water, social: social * 100, habitat: habitat * 100, shelter: shelter * 100, enrich: enrich * 100, health: a.health, clean: p.clean };
    if (p.food < 40) why.food = info.covered.has(a.plot) ? 'Đang chờ nhân viên cho ăn' : 'Không có nhân viên chăm chuồng này';
    if (p.water < 40) why.water = 'Cần nước';
    if (a.sick) why.health = state.staff.vet ? 'Đang ốm, bác sĩ sẽ chữa' : 'Đang ốm: thuê bác sĩ thú y';
    if (p.clean < 40) why.clean = 'Chuồng bẩn';
    return { needs, why };
  }

  function recompute() {
    const owned = ownedPlots();
    // Keepers go to habitats with animals first, in order.
    const withAnimals = owned.filter(([, i]) => animalsIn(i).length).map(([, i]) => i);
    info.covered = new Set(withAnimals.slice(0, state.staff.keeper * STAFF.keeper.per));
    info.plots = state.plots.map((_, i) => plotStats(i));
    const live = state.animals.filter((a) => !a.escaped);
    info.escaped = state.animals.length - live.length;
    info.avgWelfare = live.length ? live.reduce((s, a) => s + a.welfare, 0) / live.length / 100 : 0;
    info.variety = new Set(live.map((a) => a.species)).size;
    const working = (type) => state.facilities.filter((f) => f.type === type && (f.condition ?? 100) >= 15).length;
    const crowd = Math.max(state.guests, 8);
    info.cover = {};
    for (const type of ['food', 'drink', 'toilet', 'bench']) info.cover[type] = clamp((working(type) * FACILITIES[type].serves) / crowd, 0, 1.5);
    info.cover.gift = clamp((working('gift') * FACILITIES.gift.serves) / crowd, 0, 1.5);
    const absorb = state.staff.janitor * STAFF.janitor.per + working('bin') * FACILITIES.bin.serves;
    info.litter = state.guests > 10 ? clamp(1 - absorb / state.guests, 0, 1) : 0;
    info.broken = state.facilities.filter((f) => (f.condition ?? 100) < 15).length;
    const plotsWithAnimals = withAnimals.length;
    info.education = plotsWithAnimals ? withAnimals.filter((i) => state.plots[i].board).length / plotsWithAnimals : 0;
    const facCover = (Math.min(1, info.cover.food) + Math.min(1, info.cover.drink) + Math.min(1, info.cover.toilet)) / 3;
    info.rating = live.length ? clamp(2 * info.avgWelfare + Math.min(1, info.variety / 6) + state.happy / 100 + 0.5 * facCover + 0.5 * info.education, 0, 5) : 0;
    info.appeal = live.reduce((s, a) => { const sp = SPECIES_BY_ID[a.species]; return s + sp.appeal * (0.35 + (a.welfare / 100) * 0.9) * (isAdult(a) ? 1 : 1.4); }, 0)
      + owned.reduce((s, [, i]) => s + info.plots[i].rocks * 0.3 + info.plots[i].plants * 0.2 + (state.plots[i].board ? 2 : 0), 0);
    info.fairEntry = 6 + info.rating * 4;
  }

  // ---------- One second ----------
  function tick() {
    recompute();
    // Habitats: animals eat, drink and dirty them; keepers top them up.
    for (const [p, i] of ownedPlots()) {
      const n = info.plots[i].animals.reduce((s, a) => s + (isAdult(a) ? 1 : 0.5), 0);
      p.food = clamp(p.food - 0.22 * n, 0, 100); p.water = clamp(p.water - 0.28 * n, 0, 100); p.clean = clamp(p.clean - 0.05 * n, 0, 100);
      if (info.covered.has(i)) {
        if (p.food < 65) { p.food = 100; emit('keeper', { plot: i }); }
        const waterMax = info.plots[i].water ? 100 : 80;
        if (p.water < 60) p.water = waterMax;
        if (p.clean < 60) p.clean = 100;
      }
      if (n && p.food < 25 && !warned.has(`food${i}`)) { warned.add(`food${i}`); toast(`Chuồng ${i + 1}: thú đang đói. ${state.staff.keeper ? 'Cần thêm nhân viên chăm thú.' : 'Thuê nhân viên chăm thú ở mục Nhân viên.'}`, 'warn'); }
      if (p.food > 60) warned.delete(`food${i}`);
    }
    // Animals: needs and welfare, health.
    for (const a of state.animals) {
      if (a.escaped) continue;
      const { needs, why } = needsOf(a, info.plots[a.plot]);
      a.needs = needs; a.why = why;
      const target = Object.entries(NEED_WEIGHTS).reduce((s, [k, w]) => s + needs[k] * w, 0);
      a.welfare = clamp(a.welfare + (target - a.welfare) * 0.05, 0, 100);
      if (a.sick) a.health = clamp(a.health - 0.35, 0, 100); else a.health = clamp(a.health + 0.2, 0, 100);
    }
    // Vets treat the sick: three a day each, quicker with better medicine.
    const sick = state.animals.filter((a) => a.sick && !a.escaped);
    if (sick.length && state.staff.vet && Math.random() < (state.staff.vet * STAFF.vet.per * (done('medicine') ? 1.6 : 1)) / DAY_SECONDS) {
      const a = sick.sort((x, y) => x.health - y.health)[0]; a.sick = false;
      toast(`Bác sĩ đã chữa khỏi cho ${a.name} (${SPECIES_BY_ID[a.species].name}).`, 'good');
    }
    for (const a of [...state.animals]) if (a.health <= 0) dies(a, 'vì ốm không được chữa');
    // Escaped animals: caught after a while, sooner with security.
    for (const a of state.animals) {
      if (!a.escaped) continue;
      a.escaped -= 1;
      if (a.escaped <= 0) { a.escaped = 0; emit('recaptured', { id: a.id }); toast(`Đã bắt được ${a.name} (${SPECIES_BY_ID[a.species].name}) đưa về chuồng.`, 'good'); }
    }
    // Facilities wear out; mechanics keep up to five each in repair.
    const wear = done('durable') ? 0.12 : 0.25; let fixable = state.staff.mechanic * STAFF.mechanic.per;
    for (const f of state.facilities) {
      if (f.type === 'bench' || f.type === 'bin') continue;
      f.condition = clamp((f.condition ?? 100) - wear, 0, 100);
      if (fixable > 0) { fixable -= 1; if (f.condition < 70) f.condition = clamp(f.condition + 3, 0, 100); }
      if (f.condition < 15 && !f.warned) { f.warned = true; toast(`${FACILITIES[f.type].name} bị hỏng, không phục vụ được. ${state.staff.mechanic ? 'Cần thêm thợ máy.' : 'Thuê thợ máy để sửa.'}`, 'warn'); }
      if (f.condition > 40) f.warned = false;
    }
    guestsSecond();
    checkGoals();
  }

  function guestsSecond() {
    const live = state.animals.length - info.escaped;
    const r = state.entry / info.fairEntry;
    const priceFactor = r <= 1 ? 1 + (1 - r) * 0.25 : Math.max(0.12, 1 - (r - 1) * 0.9);
    const target = live ? (8 + info.appeal * 2.4 * (0.6 + info.rating * 0.15)) * priceFactor * (0.55 + (state.happy / 100) * 0.6) * (info.escaped ? 0.7 : 1) : 2;
    const stay = 25; const arrivals = Math.max(0, target) / stay;
    state.guests = Math.max(0, state.guests + arrivals - state.guests / stay);
    state.stats.maxGuests = Math.max(state.stats.maxGuests, Math.round(state.guests));
    const today = state.ledger.today; let earned = arrivals * state.entry; today.tickets += earned;
    for (const type of SHOPS) {
      const def = FACILITIES[type]; const served = Math.min(1, info.cover[type]);
      if (!served) continue;
      const demand = clamp(1.6 - 0.6 * (state.prices[type] / def.price), 0, 1.3);
      const mood = type === 'gift' ? (state.happy / 100) * 1.5 : 1;
      const got = arrivals * def.buy * served * demand * mood * state.prices[type]; today.shops += got; earned += got;
    }
    const donation = arrivals * 1.6 * info.education * (state.happy / 100); today.donations += donation; earned += donation;
    state.money += earned; incomeAcc += earned; incomeTimer += 1;
    if (incomeTimer >= 10) { emit('income', { amount: Math.round(incomeAcc) }); incomeAcc = 0; incomeTimer = 0; }
    // Happiness: animals to see, food, drink, toilets, rest, clean paths, a fair price, no loose lion.
    const c = info.cover;
    const pricePenalty = clamp((state.entry - info.fairEntry) / info.fairEntry, 0, 1) * 25;
    const target2 = 30 + 30 * info.avgWelfare + 6 * Math.min(1, info.variety / 5) + 10 * Math.min(1, c.food) + 8 * Math.min(1, c.drink)
      + 10 * Math.min(1, c.toilet) + 6 * Math.min(1, c.bench) - 15 * info.litter - pricePenalty - (info.escaped ? 20 : 0) - Math.min(15, info.broken * 5);
    state.happy = clamp(state.happy + (clamp(target2, 0, 100) - state.happy) * 0.03, 0, 100);
  }

  // ---------- One day ----------
  function newDay() {
    recompute();
    const t = state.ledger.today;
    // The day's bills (hiring fees and builds were paid when made).
    const salaries = Object.entries(state.staff).reduce((s, [role, n]) => s + n * STAFF[role].salary, 0);
    const food = state.animals.reduce((s, a) => s + SPECIES_BY_ID[a.species].food, 0);
    const upkeep = state.facilities.reduce((s, f) => s + FACILITIES[f.type].upkeep, 0);
    t.salaries += salaries; t.food += food; t.upkeep += upkeep;
    if (!admin) state.money -= salaries + food + upkeep;
    // Animals age, fall ill, have babies, grow old.
    const medicine = done('medicine') ? 0.5 : 1;
    for (const a of [...state.animals]) {
      const sp = SPECIES_BY_ID[a.species];
      a.age += 1;
      if (a.age === sp.adult) toast(`${a.name} (${sp.name}) đã trưởng thành.`, 'good');
      if (a.age > sp.life && Math.random() < 0.3) { dies(a, 'vì tuổi già'); continue; }
      const p = state.plots[a.plot];
      if (!a.sick && Math.random() < (0.025 + (1 - a.welfare / 100) * 0.12 + (p.clean < 40 ? 0.05 : 0)) * medicine) { a.sick = true; toast(`${a.name} (${sp.name}) bị ốm.${state.staff.vet ? '' : ' Thuê bác sĩ thú y để chữa.'}`, 'warn'); }
      if (a.pregnant > 0) { a.pregnant -= 1; if (a.pregnant === 0) birth(a); }
    }
    for (const [, i] of ownedPlots()) breed(i);
    // Escapes from fences too low for what lives inside.
    for (const [p, i] of ownedPlots()) {
      const risky = info.plots[i].animals.filter((a) => SPECIES_BY_ID[a.species].barrier > p.barrier && isAdult(a));
      if (risky.length && Math.random() < 0.35) {
        const a = pick(risky); a.escaped = state.staff.security ? 12 : state.staff.keeper ? 35 : 60;
        emit('escaped', { id: a.id }); toast(`${a.name} (${SPECIES_BY_ID[a.species].name}) đã xổng chuồng ${i + 1}! Rào quá thấp, cần ${BARRIERS[SPECIES_BY_ID[a.species].barrier].name.toLowerCase()}.`, 'warn');
      }
    }
    // Research.
    researchPoints('vet', state.staff.vet * 10); researchPoints('mech', state.staff.mechanic * 8);
    // The day's books.
    const income = t.tickets + t.shops + t.donations + t.sales;
    const expense = t.salaries + t.food + t.upkeep + t.build + t.animals;
    const profit = income - expense;
    state.ledger.days.push({ day: day() - 1, income: Math.round(income), expense: Math.round(expense), profit: Math.round(profit), detail: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])) });
    while (state.ledger.days.length > 7) state.ledger.days.shift();
    state.stats.bestProfit = Math.max(state.stats.bestProfit, profit);
    state.ledger.today = blankDay();
    toast(`Ngày ${day() - 1}: thu ${fmt(income)}, chi ${fmt(expense)}, ${profit >= 0 ? 'lãi' : 'lỗ'} ${fmt(Math.abs(profit))}.`, profit >= 0 ? '' : 'warn');
    refreshMarket(false);
    emit('day', {});
  }
  const fmt = (n) => `${Math.round(n).toLocaleString('vi-VN')} xu`;

  function breed(i) {
    const st = plotStats(i);
    const bySpecies = {}; st.animals.forEach((a) => (bySpecies[a.species] ||= []).push(a));
    for (const [sid, list] of Object.entries(bySpecies)) {
      const sp = SPECIES_BY_ID[sid];
      const avg = list.reduce((s, a) => s + a.welfare, 0) / list.length;
      const male = list.find((a) => a.sex === 'M' && isAdult(a) && !a.contraception);
      if (!male || avg < 65 || list.length >= sp.group[1] + 1) continue;
      for (const f of list) {
        if (f.sex !== 'F' || !isAdult(f) || f.contraception || f.pregnant > 0 || f.age > sp.life * 0.85) continue;
        if (Math.random() < 0.3) { f.pregnant = sp.gestation; toast(`${f.name} (${sp.name}) đang mang thai, sẽ sinh sau ${sp.gestation} ngày.`, 'good'); }
      }
    }
  }
  function birth(mother) {
    const sp = SPECIES_BY_ID[mother.species];
    const n = sp.litter[0] + Math.floor(Math.random() * (sp.litter[1] - sp.litter[0] + 1));
    for (let k = 0; k < n; k++) { const baby = newAnimal(mother.species, mother.plot, { age: 0 }); state.stats.births += 1; emit('animal-add', { animal: baby }); }
    toast(`Tin vui: ${mother.name} (${sp.name}) vừa sinh ${n} con!`, 'good');
  }
  function dies(a, cause) {
    state.animals = state.animals.filter((x) => x.id !== a.id); emit('animal-remove', { id: a.id });
    toast(`${a.name} (${SPECIES_BY_ID[a.species].name}) đã chết ${cause}.`, 'warn');
  }
  function researchPoints(track, pts) {
    if (admin) return;
    const r = state.research; r.bank[track] += pts;
    const id = r.active[track]; if (!id) return;
    const need = RESEARCH[id].cost - (r.progress[id] || 0); const use = Math.min(need, r.bank[track]);
    r.progress[id] = (r.progress[id] || 0) + use; r.bank[track] -= use;
    if (r.progress[id] >= RESEARCH[id].cost) { r.done.push(id); r.active[track] = null; toast(`Nghiên cứu xong: ${RESEARCH[id].name}. Mở khóa ${RESEARCH[id].unlocks.toLowerCase()}.`, 'good'); emit('research', { id }); }
  }

  function newAnimal(species, plot, opts = {}) {
    const a = { id: state.nextId++, species, plot, name: pick(NAMES), sex: opts.sex || (Math.random() < 0.5 ? 'M' : 'F'), age: opts.age ?? SPECIES_BY_ID[species].adult,
      health: 100, sick: false, pregnant: 0, contraception: false, welfare: 65, escaped: 0, needs: {}, why: {} };
    state.animals.push(a); return a;
  }

  function refreshMarket(paid) {
    if (paid && !spend(150, 'build')) return;
    const weights = SPECIES.map((sp) => [sp, sp.cc ? 1 : 3 - Math.min(2, sp.price / 2000)]);
    const total = weights.reduce((s, [, w]) => s + w, 0);
    state.market = Array.from({ length: 6 }, () => {
      let r = Math.random() * total; let sp = SPECIES[0];
      for (const [s, w] of weights) { r -= w; if (r <= 0) { sp = s; break; } }
      const young = Math.random() < 0.35;
      return { id: state.nextId++, species: sp.id, sex: Math.random() < 0.5 ? 'M' : 'F', age: young ? Math.max(1, Math.round(sp.adult * 0.6)) : sp.adult + Math.floor(Math.random() * sp.life * 0.3) };
    });
    state.marketDay = day();
    if (paid) emit('market', {});
  }

  // ---------- Goals ----------
  function checkGoals() {
    const live = state.animals.filter((a) => !a.escaped);
    const has = (type) => state.facilities.some((f) => f.type === type);
    const test = {
      herd: () => ownedPlots().some(([, i]) => info.plots[i].animals.length >= 3),
      keeper: () => state.staff.keeper > 0,
      guests40: () => state.guests >= 40,
      species3: () => info.variety >= 3,
      basics: () => has('food') && has('drink') && has('toilet'),
      research1: () => state.research.done.length > 0,
      profit: () => state.stats.bestProfit >= 1000,
      birth: () => state.stats.births > 0,
      release: () => state.stats.releases > 0,
      welfare75: () => live.length >= 3 && info.avgWelfare >= 0.75,
      guests150: () => state.guests >= 150,
    };
    for (const g of GOALS) for (const it of g.items) if (!state.goals.done[it.id] && test[it.id]()) { state.goals.done[it.id] = true; toast(`Mục tiêu xong: ${it.text}.`, 'good'); }
    GOALS.forEach((g, k) => {
      if (state.goals.tiers[k] || (k > 0 && !state.goals.tiers[k - 1])) return;
      if (g.items.every((it) => state.goals.done[it.id])) {
        state.goals.tiers[k] = true; state.money += g.reward.money; state.cc += g.reward.cc;
        toast(`Đạt ${'★'.repeat(g.tier)}! Thưởng ${fmt(g.reward.money)} và ${g.reward.cc} điểm bảo tồn.`, 'good'); emit('tier', { tier: g.tier });
      }
    });
  }

  // ---------- Actions ----------
  function spend(cost, kind = 'build', cc = false) {
    if (admin) return true;
    if (cc) { if (state.cc < cost) { toast(`Không đủ điểm bảo tồn: cần ${cost}.`, 'warn'); return false; } state.cc -= cost; return true; }
    if (state.money < cost) { toast(`Không đủ xu: cần ${fmt(cost)}.`, 'warn'); return false; }
    state.money -= cost; state.ledger.today[kind] += cost; return true;
  }
  const fits = (p, type, cx, cz, ignore) => {
    const d = ITEMS[type]; if (cx < 0 || cz < 0 || cx + d.w > PLOT_SIZE || cz + d.d > PLOT_SIZE) return false;
    return !p.items.some((it) => it.id !== ignore && cx < it.x + ITEMS[it.type].w && it.x < cx + d.w && cz < it.z + ITEMS[it.type].d && it.z < cz + d.d);
  };
  const actions = {
    buyPlot(i, biome) {
      if (state.plots[i].owned) return false;
      if (!spend(plotPrice(ownedPlots().length))) return false;
      state.plots[i] = { owned: true, biome, barrier: 1, items: [], board: false, food: 100, water: 100, clean: 100 };
      emit('plots', {}); toast(`Đã mua chuồng ${i + 1}: ${({ savanna: 'thảo nguyên', bamboo: 'rừng tre', polar: 'băng giá', forest: 'rừng ôn đới' })[biome]}. Đặt hồ, nhà trú, cây rồi mua thú.`, 'good');
      return true;
    },
    canPlace(i, type, cx, cz) { const p = state.plots[i]; return p?.owned && fits(p, type, cx, cz); },
    placeItem(i, type, cx, cz) {
      const p = state.plots[i]; const def = ITEMS[type];
      if (!p?.owned) return false;
      if (def.research && !done(def.research)) { toast(`Cần nghiên cứu “${RESEARCH[def.research].name}” trước.`, 'warn'); return false; }
      if (!fits(p, type, cx, cz)) { toast('Chỗ này không đặt được: vướng đồ khác hoặc ra ngoài chuồng.', 'warn'); return false; }
      if (!spend(def.cost)) return false;
      const it = { id: state.nextId++, type, x: cx, z: cz }; p.items.push(it); emit('item-add', { plot: i, item: it }); return true;
    },
    removeItem(i, id) {
      const p = state.plots[i]; const it = p.items.find((x) => x.id === id); if (!it) return;
      p.items = p.items.filter((x) => x.id !== id); if (!admin) state.money += Math.round(ITEMS[it.type].cost * 0.5);
      emit('item-remove', { plot: i, id }); toast(`Đã dỡ ${ITEMS[it.type].name.toLowerCase()}, nhận lại một nửa tiền.`);
    },
    upgradeBarrier(i) {
      const p = state.plots[i]; const next = BARRIERS[p.barrier + 1]; if (!next) return;
      if (next.research && !done(next.research)) { toast(`Cần nghiên cứu “${RESEARCH[next.research].name}” trước.`, 'warn'); return; }
      if (!spend(next.cost)) return;
      p.barrier += 1; emit('plot', { plot: i }); toast(`Chuồng ${i + 1} đã có ${next.name.toLowerCase()}.`, 'good');
    },
    buildBoard(i) {
      const p = state.plots[i]; if (p.board) return;
      if (!done('board')) { toast('Cần nghiên cứu “Bảng giáo dục” trước.', 'warn'); return; }
      if (!spend(BOARD_COST)) return; p.board = true; emit('plot', { plot: i }); toast('Đã dựng bảng giáo dục: khách hiểu thêm về thú và quyên góp nhiều hơn.', 'good');
    },
    careNow(i) {
      const p = state.plots[i]; const n = animalsIn(i).length;
      if (!spend(40 + 15 * n, 'upkeep')) return;
      p.food = 100; p.water = 100; p.clean = 100; toast(`Đã tự tay chăm chuồng ${i + 1}.`, 'good');
    },
    buyAnimal(listingId, plot) {
      const k = state.market.findIndex((m) => m.id === listingId); if (k < 0) return null;
      const m = state.market[k]; const sp = SPECIES_BY_ID[m.species];
      if (!state.plots[plot]?.owned) { toast('Chọn chuồng để đưa thú vào.', 'warn'); return null; }
      if (!(sp.cc ? spend(sp.cc, 'animals', true) : spend(sp.price, 'animals'))) return null;
      state.market.splice(k, 1);
      const a = newAnimal(m.species, plot, { sex: m.sex, age: m.age }); emit('animal-add', { animal: a });
      const p = state.plots[plot];
      toast(p.biome !== sp.biome ? `${a.name} đã về chuồng ${plot + 1}, nhưng ${sp.name} không hợp môi trường này.` : `Chào mừng ${a.name} (${sp.name}) đến chuồng ${plot + 1}!`, p.biome !== sp.biome ? 'warn' : 'good');
      return a;
    },
    sellAnimal(id) {
      const a = state.animals.find((x) => x.id === id); if (!a) return;
      const sp = SPECIES_BY_ID[a.species];
      if (!admin) { if (sp.cc) state.cc += Math.round(sp.cc * 0.4); else { const got = Math.round(sp.price * 0.5); state.money += got; state.ledger.today.sales += got; } }
      state.animals = state.animals.filter((x) => x.id !== id); emit('animal-remove', { id });
      toast(`Đã chuyển ${a.name} (${sp.name}) sang vườn thú khác.`);
    },
    releaseAnimal(id) {
      const a = state.animals.find((x) => x.id === id); if (!a) return;
      const sp = SPECIES_BY_ID[a.species];
      if (!isAdult(a) || a.health < 60 || a.sick || a.pregnant) { toast('Chỉ thả được con trưởng thành, khỏe mạnh và không mang thai.', 'warn'); return; }
      const gain = STATUS[sp.status].release; state.cc += gain; state.stats.releases += 1;
      state.animals = state.animals.filter((x) => x.id !== id); emit('animal-remove', { id });
      toast(`${a.name} đã về với tự nhiên. Nhận ${gain} điểm bảo tồn.`, 'good');
    },
    moveAnimal(id, plot) {
      const a = state.animals.find((x) => x.id === id); if (!a || !state.plots[plot]?.owned || a.plot === plot) return;
      a.plot = plot; emit('animal-move', { animal: a }); toast(`Đã chuyển ${a.name} sang chuồng ${plot + 1}.`);
    },
    toggleContraception(id) { const a = state.animals.find((x) => x.id === id); if (a) a.contraception = !a.contraception; },
    buildFacility(slot, type) {
      const def = FACILITIES[type]; if (state.facilities.some((f) => f.slot === slot)) return false;
      if (def.research && !done(def.research)) { toast(`Cần nghiên cứu “${RESEARCH[def.research].name}” trước.`, 'warn'); return false; }
      if (!spend(def.cost)) return false;
      state.facilities.push({ slot, type, condition: 100 }); emit('facilities', {}); toast(`Đã xây ${def.name.toLowerCase()}.`, 'good'); return true;
    },
    demolish(slot) {
      const f = state.facilities.find((x) => x.slot === slot); if (!f) return;
      state.facilities = state.facilities.filter((x) => x !== f); if (!admin) state.money += Math.round(FACILITIES[f.type].cost * 0.5);
      emit('facilities', {}); toast(`Đã dỡ ${FACILITIES[f.type].name.toLowerCase()}.`);
    },
    hire(role) { if (!spend(STAFF[role].salary, 'salaries')) return; state.staff[role] += 1; emit('staff', {}); },
    fire(role) { if (state.staff[role] > 0) { state.staff[role] -= 1; emit('staff', {}); } },
    setEntry(v) { state.entry = clamp(Math.round(v), 0, 60); },
    setPrice(type, v) { state.prices[type] = clamp(Math.round(v), 0, 60); },
    startResearch(id) {
      const r = state.research; const def = RESEARCH[id];
      if (r.done.includes(id)) return;
      r.active[def.track] = id; toast(`Bắt đầu nghiên cứu: ${def.name}.`);
      researchPoints(def.track, 0);
    },
    refreshMarket: () => refreshMarket(true),
  };

  // ---------- Run ----------
  function step(simDt) {
    state.time += simDt; secAcc += simDt; dayAcc += simDt;
    while (secAcc >= 1) { secAcc -= 1; tick(); }
    if (dayAcc >= DAY_SECONDS) { dayAcc -= DAY_SECONDS; newDay(); }
  }
  function load(saved) {
    if (saved && saved.v === 2 && saved.plots?.length === PLOTS.length) state = { ...freshState(), ...saved, speed: 1 };
    else state = freshState();
    if (admin) state.research.done = Object.keys(RESEARCH);
    dayAcc = state.time % DAY_SECONDS;
    if (state.marketDay < 0) refreshMarket(false);
    recompute();
  }

  return {
    get state() { return state; },
    get info() { return info; },
    admin, step, load, actions, recompute, day, done, isAdult, plotStats, fmt,
    needWeights: NEED_WEIGHTS,
    slotFree: (k) => !state.facilities.some((f) => f.slot === k),
    plotCost: () => plotPrice(ownedPlots().length),
    /** For tests: run whole days fast with no drawing. */
    runDays(n) { for (let k = 0; k < n * DAY_SECONDS; k++) step(1); },
    SLOTS,
  };
}
