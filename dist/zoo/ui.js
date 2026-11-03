// Third's Zoo screens: the top bar, the tool drawers on the left and the details panel on the right.
// They read the simulation and call its actions; main.js passes taps on the 3D world to onTap.
import {
  BIOMES, SPECIES_BY_ID, STATUS, ITEMS, BUILD_ORDER, BARRIERS, FACILITIES, FACILITY_ORDER, SHOPS, STAFF, STAFF_ORDER,
  RESEARCH, RESEARCH_ORDER, BOARD_COST, GOALS, SPECIES, PLOTS,
} from './data.js';
import { NEED_LABELS } from './sim.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (v) => `${Math.round(v)}%`;
function bar(v, label) { const c = v > 65 ? 'good' : v > 35 ? 'mid' : 'bad'; return `<span class="bar" role="meter" aria-label="${esc(label || '')}" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"><i class="${c}" style="width:${Math.round(Math.max(0, Math.min(100, v)))}%"></i></span>`; }
function mood(w) { return w >= 85 ? ['Rất vui', 'good'] : w >= 65 ? ['Vui', 'good'] : w >= 40 ? ['Tạm ổn', 'mid'] : ['Khổ sở', 'bad']; }

export function createUI({ sim, world, onReset }) {
  const S = () => sim.state;
  const fmt = sim.fmt;
  const price = (n) => (sim.admin ? 'Miễn phí' : fmt(n));
  const ui = { drawer: null, sel: null, mode: null, marketPlot: null };
  const panel = $('#panel'); const drawer = $('#drawer'); const modeBar = $('#mode');
  const ownedList = () => S().plots.map((p, i) => [p, i]).filter(([p]) => p.owned);
  const plotName = (i) => `Chuồng ${i + 1} · ${BIOMES[S().plots[i].biome].name}`;
  const ageText = (a) => { const sp = SPECIES_BY_ID[a.species]; return a.age < sp.adult ? 'con non' : a.age > sp.life * 0.85 ? 'già' : 'trưởng thành'; };

  // A tap on the panel or drawer starts a short quiet spell, so the redraw does not swap the button under a finger.
  let touched = 0;
  for (const el of [panel, drawer]) el.addEventListener('pointerdown', () => { touched = performance.now(); });
  const busy = (el) => performance.now() - touched < 900 || el.matches(':hover') || el.contains(document.activeElement) && document.activeElement.tagName === 'SELECT';

  // ---------- Details panel ----------
  function renderPanel() {
    const sel = ui.sel;
    if (!sel) { panel.hidden = true; world.selectPlot(null); world.selectAnimal(null); document.body.classList.remove('panel-open'); return; }
    panel.hidden = false; document.body.classList.add('panel-open');
    if (sel.kind === 'plot') { world.selectPlot(sel.i); world.selectAnimal(null); panel.innerHTML = S().plots[sel.i].owned ? habitatHtml(sel.i) : buyPlotHtml(sel.i); }
    if (sel.kind === 'animal') {
      const a = S().animals.find((x) => x.id === sel.id);
      if (!a) { ui.sel = null; renderPanel(); return; }
      world.selectAnimal(a.id); world.selectPlot(a.escaped ? null : a.plot); panel.innerHTML = animalHtml(a);
    }
    if (sel.kind === 'facility') { world.selectPlot(null); world.selectAnimal(null); const f = S().facilities.find((x) => x.slot === sel.slot); if (!f) { ui.sel = { kind: 'slot', slot: sel.slot }; renderPanel(); return; } panel.innerHTML = facilityHtml(f); }
    if (sel.kind === 'slot') { world.selectPlot(null); world.selectAnimal(null); panel.innerHTML = slotHtml(sel.slot); }
  }
  const head = (small, title) => `<header><div><small>${small}</small><h2>${title}</h2></div><button class="x" data-act="close" aria-label="Đóng">×</button></header>`;

  function buyPlotHtml(i) {
    const cost = sim.plotCost();
    return `${head(`Khu đất ${i + 1} · 12 × 12 ô`, 'Đất trống')}
      <p class="lead">Chọn môi trường sống để mua và rào thành chuồng. Mỗi loài thú hợp với một môi trường.</p>
      <div class="biomes">${Object.entries(BIOMES).map(([id, b]) => `<button data-act="buy-plot" data-biome="${id}"><span class="chip" style="background:#${b.ground.toString(16).padStart(6, '0')}"></span><b>${b.name}</b><small>${b.note}</small><em>${SPECIES.filter((s) => s.biome === id).map((s) => s.name).join(', ')}</em></button>`).join('')}</div>
      <p class="cost">Giá: <b>${price(cost)}</b>${!sim.admin && S().money < cost ? ' · <span class="warn">chưa đủ xu</span>' : ''}</p>`;
  }

  function habitatHtml(i) {
    const p = S().plots[i]; const st = sim.plotStats(i); const n = st.animals.length;
    const covered = sim.info.covered.has(i);
    const needBarrier = Math.max(0, ...st.animals.map((a) => SPECIES_BY_ID[a.species].barrier));
    const next = BARRIERS[p.barrier + 1];
    const types = [...st.types].map((t) => ITEMS[t].name).join(', ') || 'chưa có';
    return `${head(`Chuồng ${i + 1} · ${BIOMES[p.biome].name}`, n ? `${n} con thú` : 'Chưa có thú')}
      <div class="rows">
        <div class="row"><span>Thức ăn</span>${bar(p.food, 'Thức ăn')}<b>${pct(p.food)}</b></div>
        <div class="row"><span>Nước</span>${bar(p.water, 'Nước')}<b>${pct(p.water)}</b></div>
        <div class="row"><span>Vệ sinh</span>${bar(p.clean, 'Vệ sinh')}<b>${pct(p.clean)}</b></div>
      </div>
      <p class="note ${n && !covered ? 'warn' : ''}">${n ? (covered ? 'Có nhân viên chăm thú phụ trách.' : 'Chưa có nhân viên chăm chuồng này: thức ăn và nước sẽ cạn.') : 'Chuồng trống: đặt đồ rồi mua thú.'}</p>
      <div class="actions"><button data-act="open-build">Đặt đồ vào chuồng</button><button data-act="open-market">Mua thú cho chuồng</button><button class="soft" data-act="care">Tự chăm ngay · ${price(40 + 15 * n)}</button></div>
      <h3>Hàng rào</h3>
      <p class="note">${BARRIERS[p.barrier].name}${needBarrier > p.barrier ? ` · <span class="warn">thú ở đây cần ${BARRIERS[needBarrier].name.toLowerCase()}, chúng có thể xổng chuồng</span>` : ''}</p>
      ${next ? `<button class="soft" data-act="barrier" ${next.research && !sim.done(next.research) ? 'disabled' : ''}>Nâng lên ${next.name.toLowerCase()} · ${price(next.cost)}${next.research && !sim.done(next.research) ? ' (cần nghiên cứu)' : ''}</button>` : ''}
      <h3>Môi trường sống</h3>
      <dl class="facts">
        <dt>Đất trống</dt><dd>${st.land} ô${st.landNeed ? ` / thú cần ${Math.round(st.landNeed)} ô` : ''}</dd>
        <dt>Mặt nước</dt><dd>${Math.round((st.water / 144) * 100)}% diện tích</dd>
        <dt>Cây</dt><dd>${st.plants}</dd>
        <dt>Nhà trú</dt><dd>${st.shelters ? `${st.shelters * 4} chỗ` : 'chưa có'}${st.shelterNeed ? ` / cần ${Math.ceil(st.shelterNeed)}` : ''}</dd>
        <dt>Đồ chơi</dt><dd>${esc(types)}</dd>
      </dl>
      <h3>Bảng giáo dục</h3>
      ${p.board ? '<p class="note">Đã có: khách quyên góp nhiều hơn.</p>' : `<button class="soft" data-act="board" ${sim.done('board') ? '' : 'disabled'}>Dựng bảng · ${price(BOARD_COST)}${sim.done('board') ? '' : ' (cần nghiên cứu)'}</button>`}
      <h3>Thú trong chuồng</h3>
      ${n ? `<ul class="list">${st.animals.map((a) => { const [m, c] = mood(a.welfare); const sp = SPECIES_BY_ID[a.species]; return `<li><button class="pick" data-act="sel-animal" data-id="${a.id}"><span><b>${esc(a.name)}</b> <small>${sp.name} · ${a.sex === 'M' ? 'đực' : 'cái'} · ${ageText(a)}${a.sick ? ' · <em class="warn">ốm</em>' : ''}${a.pregnant ? ' · mang thai' : ''}</small></span><span class="mood ${c}">${m}</span></button></li>`; }).join('')}</ul>` : '<p class="note">Chưa có con nào.</p>'}`;
  }

  function animalHtml(a) {
    const sp = SPECIES_BY_ID[a.species]; const [m, c] = mood(a.welfare);
    const others = ownedList().filter(([, i]) => i !== a.plot);
    const needs = Object.keys(NEED_LABELS).map((k) => `<div class="need"><div class="row"><span>${NEED_LABELS[k]}</span>${bar(a.needs[k] ?? 0, NEED_LABELS[k])}<b>${pct(a.needs[k] ?? 0)}</b></div>${a.why?.[k] ? `<small>${esc(a.why[k])}</small>` : ''}</div>`).join('');
    return `${head(`${sp.name} · ${a.escaped ? 'đang xổng chuồng!' : `chuồng ${a.plot + 1}`}`, esc(a.name))}
      <p class="lead">${a.sex === 'M' ? 'Đực' : 'Cái'} · ${a.age} ngày tuổi (${ageText(a)}) · ${STATUS[sp.status].name}${a.sick ? ' · <span class="warn">đang ốm</span>' : ''}${a.pregnant ? ` · mang thai, còn ${a.pregnant} ngày` : ''}</p>
      <div class="welfare"><span>Phúc lợi</span>${bar(a.welfare, 'Phúc lợi')}<b class="mood ${c}">${m} · ${pct(a.welfare)}</b></div>
      <div class="needs">${needs}</div>
      <p class="note">${esc(sp.blurb)}</p>
      <label class="check"><input type="checkbox" data-act="contra" ${a.contraception ? 'checked' : ''}> Ngừa thai (không sinh con)</label>
      <div class="actions">
        ${others.length ? `<label class="move">Chuyển sang <select data-act="move"><option value="">chọn chuồng…</option>${others.map(([, i]) => `<option value="${i}">${plotName(i)}</option>`).join('')}</select></label>` : ''}
        <button class="soft" data-act="sell">${sp.cc ? `Chuyển vườn khác (+${Math.round(sp.cc * 0.4)} điểm)` : `Bán sang vườn khác (+${fmt(sp.price * 0.5)})`}</button>
        <button class="soft" data-act="release">Thả về tự nhiên (+${STATUS[sp.status].release} điểm bảo tồn)</button>
      </div>
      <button class="link-btn" data-act="back-plot" data-i="${a.plot}">‹ Về chuồng ${a.plot + 1}</button>`;
  }

  function facilityHtml(f) {
    const def = FACILITIES[f.type]; const cond = f.condition ?? 100; const shop = SHOPS.includes(f.type);
    return `${head('Dịch vụ khách', def.name)}
      <p class="lead">${esc(def.note)} Phục vụ khoảng ${def.serves} khách. Phí duy trì ${fmt(def.upkeep)} mỗi ngày.</p>
      ${f.type === 'bench' || f.type === 'bin' ? '' : `<div class="row"><span>Tình trạng</span>${bar(cond, 'Tình trạng')}<b>${pct(cond)}</b></div><p class="note ${cond < 15 ? 'warn' : ''}">${cond < 15 ? 'Đã hỏng, không phục vụ được: thuê thêm thợ máy.' : 'Thợ máy giữ cho quầy hoạt động.'}</p>`}
      ${shop ? `<h3>Giá bán</h3>${priceRow(f.type)}` : ''}
      <div class="actions"><button class="soft danger" data-act="demolish">Dỡ bỏ (nhận lại ${fmt(def.cost * 0.5)})</button></div>`;
  }
  function slotHtml(k) {
    return `${head('Chỗ trống cạnh lối đi', 'Xây dịch vụ')}<p class="lead">Chọn một loại để xây ở đây.</p>${facilityList(k)}`;
  }
  function facilityList(slot) {
    return `<ul class="list">${FACILITY_ORDER.map((t) => { const d = FACILITIES[t]; const locked = d.research && !sim.done(d.research);
      return `<li class="card ${locked ? 'locked' : ''}"><div><b>${d.name}</b><small>${esc(d.note)} Phục vụ ${d.serves} khách, duy trì ${fmt(d.upkeep)}/ngày.</small></div><button data-act="${slot === undefined ? 'fac-mode' : 'fac-build'}" data-type="${t}" ${slot !== undefined ? `data-slot="${slot}"` : ''} ${locked ? 'disabled' : ''}>${locked ? 'Cần nghiên cứu' : price(d.cost)}</button></li>`; }).join('')}</ul>`;
  }
  function priceRow(type) {
    const def = FACILITIES[type];
    return `<div class="stepper"><span>${def.name}</span><button class="soft" data-act="price" data-type="${type}" data-d="-1" aria-label="Giảm giá">−</button><b>${fmt(S().prices[type])}</b><button class="soft" data-act="price" data-type="${type}" data-d="1" aria-label="Tăng giá">+</button><small>gợi ý ${fmt(def.price)}</small></div>`;
  }

  // ---------- Drawers ----------
  function renderDrawer() {
    document.querySelectorAll('[data-drawer]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.drawer === ui.drawer)));
    document.body.classList.toggle('drawer-open', !!ui.drawer);
    if (!ui.drawer) { drawer.hidden = true; return; }
    drawer.hidden = false;
    drawer.innerHTML = ({ build: buildHtml, services: servicesHtml, staff: staffHtml, market: marketHtml, research: researchHtml, finance: financeHtml, goals: goalsHtml })[ui.drawer]();
  }
  const dhead = (title, sub) => `<header><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div><button class="x" data-act="close-drawer" aria-label="Đóng">×</button></header>`;

  function buildHtml() {
    return `${dhead('Đồ trong chuồng', 'Chọn một món rồi bấm vào ô trong chuồng để đặt. Bấm Xong khi đặt đủ.')}
      <ul class="list">${BUILD_ORDER.map((t) => { const d = ITEMS[t]; const locked = d.research && !sim.done(d.research);
        return `<li class="card ${locked ? 'locked' : ''} ${ui.mode?.type === t ? 'on' : ''}"><div><b>${d.name}</b><small>${d.w}×${d.d} ô · ${esc(d.note)}${locked ? ` Cần nghiên cứu “${RESEARCH[d.research].name}”.` : ''}</small></div><button data-act="item-mode" data-type="${t}" ${locked ? 'disabled' : ''}>${locked ? 'Khóa' : price(d.cost)}</button></li>`; }).join('')}</ul>
      <button class="soft wide" data-act="remove-mode">Dỡ đồ đã đặt (nhận lại một nửa)</button>`;
  }
  function servicesHtml() {
    const c = sim.info.cover; const g = Math.round(S().guests);
    const line = (label, v) => `<div class="row"><span>${label}</span>${bar(Math.min(1, v) * 100, label)}<b>${pct(Math.min(1, v) * 100)}</b></div>`;
    return `${dhead('Dịch vụ khách', `Đang có ${g} khách. Chọn một loại rồi bấm chỗ trống màu vàng cạnh lối đi.`)}
      <div class="rows">${line('Đồ ăn', c.food)}${line('Nước', c.drink)}${line('Vệ sinh', c.toilet)}${line('Chỗ ngồi', c.bench)}<div class="row"><span>Sạch sẽ</span>${bar((1 - sim.info.litter) * 100, 'Sạch sẽ')}<b>${pct((1 - sim.info.litter) * 100)}</b></div></div>
      ${facilityList()}`;
  }
  function staffHtml() {
    const st = S().staff; const withAnimals = ownedList().filter(([, i]) => sim.plotStats(i).animals.length).length;
    const sick = S().animals.filter((a) => a.sick).length; const fac = S().facilities.filter((f) => f.type !== 'bench' && f.type !== 'bin').length;
    const status = {
      keeper: `Lo được ${Math.min(withAnimals, st.keeper * 2)}/${withAnimals} chuồng có thú`,
      vet: `${sick} con đang ốm · điểm nghiên cứu +${st.vet * 10}/ngày`,
      mechanic: `Bảo trì ${Math.min(fac, st.mechanic * 5)}/${fac} quầy · điểm nghiên cứu +${st.mechanic * 8}/ngày`,
      janitor: `Lối đi sạch ${pct((1 - sim.info.litter) * 100)}`,
      security: sim.info.escaped ? `${sim.info.escaped} con đang xổng chuồng!` : 'Không có thú xổng chuồng',
    };
    return `${dhead('Nhân viên', 'Lương trả mỗi ngày. Thuê người mới mất một ngày lương.')}
      <ul class="list">${STAFF_ORDER.map((r) => `<li class="card staff"><div><b>${STAFF[r].name}</b><small>${esc(STAFF[r].note)} Lương ${fmt(STAFF[r].salary)}/ngày.</small><small class="status">${status[r]}</small></div>
        <div class="stepper"><button class="soft" data-act="fire" data-role="${r}" aria-label="Cho nghỉ một ${STAFF[r].name}" ${st[r] ? '' : 'disabled'}>−</button><b>${st[r]}</b><button class="soft" data-act="hire" data-role="${r}" aria-label="Thuê thêm ${STAFF[r].name}">+</button></div></li>`).join('')}</ul>`;
  }
  function marketHtml() {
    const owned = ownedList();
    if (ui.marketPlot === null || !S().plots[ui.marketPlot]?.owned) ui.marketPlot = owned[0]?.[1] ?? null;
    return `${dhead('Chợ thú', 'Hàng mới mỗi ngày. Loài nguy cấp mua bằng điểm bảo tồn.')}
      ${owned.length ? `<label class="move">Đưa vào <select data-act="market-plot">${owned.map(([, i]) => `<option value="${i}" ${i === ui.marketPlot ? 'selected' : ''}>${plotName(i)}</option>`).join('')}</select></label>` : '<p class="note warn">Mua một chuồng trước đã: bấm vào khu đất trống.</p>'}
      <ul class="list">${S().market.map((m) => { const sp = SPECIES_BY_ID[m.species]; const fit = ui.marketPlot !== null && S().plots[ui.marketPlot].biome === sp.biome;
        return `<li class="card"><div><b>${sp.name}</b><small>${m.sex === 'M' ? 'Đực' : 'Cái'} · ${m.age} ngày tuổi${m.age < sp.adult ? ' (con non)' : ''} · ${STATUS[sp.status].name} · ${BIOMES[sp.biome].name}${ui.marketPlot !== null && !fit ? ' · <em class="warn">không hợp chuồng đang chọn</em>' : ''}</small><small>${esc(sp.blurb)} Bầy ${sp.group[0]}–${sp.group[1]}, cần ${BARRIERS[sp.barrier].name.toLowerCase()}.</small></div>
          <button data-act="buy-animal" data-id="${m.id}" ${owned.length ? '' : 'disabled'}>${sim.admin ? 'Miễn phí' : sp.cc ? `${sp.cc} điểm` : fmt(sp.price)}</button></li>`; }).join('') || '<li class="note">Hết hàng, đợi ngày mai hoặc làm mới.</li>'}</ul>
      <button class="soft wide" data-act="refresh-market">Làm mới hàng · ${price(150)}</button>
      <p class="note">Bạn có ${S().cc} điểm bảo tồn. Thả thú trưởng thành, khỏe mạnh về tự nhiên để nhận thêm.</p>`;
  }
  function researchHtml() {
    const r = S().research;
    const track = (t) => `<p class="note">${t === 'vet' ? `Bác sĩ thú y: ${S().staff.vet} người · +${S().staff.vet * 10} điểm/ngày` : `Thợ máy: ${S().staff.mechanic} người · +${S().staff.mechanic * 8} điểm/ngày`}${r.bank[t] ? ` · đang có ${r.bank[t]} điểm chưa dùng` : ''}</p>`;
    const item = (id) => { const d = RESEARCH[id]; const isDone = sim.done(id); const active = r.active[d.track] === id; const prog = r.progress[id] || 0;
      return `<li class="card ${isDone ? 'done' : ''}"><div><b>${d.name}</b><small>Mở khóa: ${esc(d.unlocks)}</small>${!isDone ? `<div class="row slim">${bar((prog / d.cost) * 100, d.name)}<b>${prog}/${d.cost}</b></div>` : ''}</div>
        ${isDone ? '<span class="tag good">Xong</span>' : active ? '<span class="tag">Đang làm</span>' : `<button data-act="research" data-id="${id}">Nghiên cứu</button>`}</li>`; };
    return `${dhead('Nghiên cứu', 'Mỗi nhóm làm một đề tài một lúc. Điểm có được mỗi ngày.')}
      <h3>Về thú</h3>${track('vet')}<ul class="list">${RESEARCH_ORDER.filter((id) => RESEARCH[id].track === 'vet').map(item).join('')}</ul>
      <h3>Về cơ sở</h3>${track('mech')}<ul class="list">${RESEARCH_ORDER.filter((id) => RESEARCH[id].track === 'mech').map(item).join('')}</ul>`;
  }
  function financeHtml() {
    const t = S().ledger.today; const days = S().ledger.days;
    const max = Math.max(1, ...days.flatMap((d) => [d.income, d.expense]));
    const fair = Math.round(sim.info.fairEntry);
    return `${dhead('Tài chính', `Hôm nay (ngày ${sim.day()}) đến giờ`)}
      <dl class="facts money">
        <dt>Vé vào cổng</dt><dd>+${fmt(t.tickets)}</dd><dt>Quầy bán hàng</dt><dd>+${fmt(t.shops)}</dd><dt>Quyên góp</dt><dd>+${fmt(t.donations)}</dd>
        <dt>Bán thú</dt><dd>+${fmt(t.sales)}</dd><dt>Xây dựng</dt><dd>−${fmt(t.build)}</dd><dt>Mua thú</dt><dd>−${fmt(t.animals)}</dd>
        <dt>Lương, thức ăn, duy trì</dt><dd>trả cuối ngày</dd>
      </dl>
      <h3>Giá vé</h3>
      <div class="stepper"><span>Vé vào cổng</span><button class="soft" data-act="entry" data-d="-1" aria-label="Giảm giá vé">−</button><b>${fmt(S().entry)}</b><button class="soft" data-act="entry" data-d="1" aria-label="Tăng giá vé">+</button><small>khách thấy hợp lý ≤ ${fmt(fair)}</small></div>
      <h3>Giá ở quầy</h3>${SHOPS.map(priceRow).join('')}
      <h3>7 ngày gần đây</h3>
      ${days.length ? `<div class="chart" role="img" aria-label="Thu và chi 7 ngày gần đây">${days.map((d) => `<div class="day"><div class="bars"><i class="in" style="height:${(d.income / max) * 100}%"></i><i class="out" style="height:${(d.expense / max) * 100}%"></i></div><small>N${d.day}</small><small class="${d.profit >= 0 ? 'pos' : 'warn'}">${d.profit >= 0 ? '+' : '−'}${Math.abs(d.profit).toLocaleString('vi-VN')}</small></div>`).join('')}</div><p class="note"><i class="key in"></i> thu <i class="key out"></i> chi</p>` : '<p class="note">Chưa hết ngày đầu tiên.</p>'}`;
  }
  function goalsHtml() {
    return `${dhead('Mục tiêu', 'Xong cả một bậc để nhận thưởng và mở bậc tiếp theo.')}
      ${GOALS.map((g, k) => { const open = k === 0 || S().goals.tiers[k - 1];
        return `<section class="tier ${S().goals.tiers[k] ? 'done' : ''} ${open ? '' : 'locked'}"><h3>${'★'.repeat(g.tier)} <small>thưởng ${fmt(g.reward.money)} + ${g.reward.cc} điểm bảo tồn</small></h3>
          <ul>${g.items.map((it) => `<li class="${S().goals.done[it.id] ? 'ok' : ''}">${S().goals.done[it.id] ? '✓' : '○'} ${it.text}</li>`).join('')}</ul></section>`; }).join('')}
      <p class="note">Đánh giá vườn thú (sao trên thanh trên cùng) tính từ phúc lợi thú, số loài, khách vui, dịch vụ và bảng giáo dục.</p>`;
  }

  // ---------- Modes: placing items, removing them, building facilities ----------
  function setMode(m) {
    // Starting to place: bring the habitat (or the paths, for facilities) to the middle of the screen, clear of the drawer.
    // On a wide screen the details panel steps aside while placing and comes back after.
    const wide = !matchMedia('(max-width: 720px)').matches; const shift = wide ? 200 : 0;
    if (m && !ui.mode) {
      if (m.kind === 'facility') world.focus(0, 10, 44, shift);
      else { const i = ui.sel?.kind === 'plot' && S().plots[ui.sel.i].owned ? ui.sel.i : ui.marketPlot ?? ownedList()[0]?.[1]; if (i !== undefined && i !== null) world.focus(PLOTS[i].x, PLOTS[i].z, 24, shift); }
      if (wide) { ui.prevSel = ui.sel; ui.sel = null; renderPanel(); }
    }
    if (!m && ui.mode && ui.prevSel) { ui.sel = ui.prevSel; ui.prevSel = null; renderPanel(); }
    ui.mode = m; world.hideGhost(); world.showSlots(m?.kind === 'facility');
    document.body.classList.toggle('placing', !!m);
    if (!m) { modeBar.hidden = true; renderDrawer(); return; }
    const text = m.kind === 'item' ? `Đặt ${ITEMS[m.type].name.toLowerCase()} (${price(ITEMS[m.type].cost)}): bấm vào ô trong chuồng`
      : m.kind === 'remove' ? 'Bấm vào món đồ trong chuồng để dỡ' : `Xây ${FACILITIES[m.type].name.toLowerCase()} (${price(FACILITIES[m.type].cost)}): bấm chỗ trống màu vàng`;
    modeBar.innerHTML = `<span>${text}</span><button data-act="mode-done">Xong</button>`; modeBar.hidden = false; renderDrawer();
  }
  modeBar.addEventListener('click', (e) => { if (e.target.closest('[data-act="mode-done"]')) setMode(null); });

  function onTap(hit) {
    const m = ui.mode;
    if (m?.kind === 'item') {
      if (hit?.plot === undefined || !S().plots[hit.plot].owned) { toast('Bấm vào ô trong một chuồng đã mua.', 'warn'); return; }
      const spot = world.showGhost(m.type, hit); if (spot) sim.actions.placeItem(spot.plot, m.type, spot.x, spot.z);
      return;
    }
    if (m?.kind === 'remove') {
      if (hit?.plot === undefined) return;
      const p = S().plots[hit.plot]; if (!p.owned) return;
      const it = p.items.find((x) => hit.cell.x >= x.x && hit.cell.x < x.x + ITEMS[x.type].w && hit.cell.z >= x.z && hit.cell.z < x.z + ITEMS[x.type].d);
      if (it) sim.actions.removeItem(hit.plot, it.id);
      return;
    }
    if (m?.kind === 'facility') {
      if (hit?.slot !== undefined && sim.slotFree(hit.slot)) { if (sim.actions.buildFacility(hit.slot, m.type)) world.showSlots(true); }
      return;
    }
    if (!hit) { ui.sel = null; }
    else if (hit.animal !== undefined) ui.sel = { kind: 'animal', id: hit.animal };
    else if (hit.slot !== undefined) ui.sel = { kind: sim.slotFree(hit.slot) ? 'slot' : 'facility', slot: hit.slot };
    else if (hit.plot !== undefined) { ui.sel = { kind: 'plot', i: hit.plot }; if (S().plots[hit.plot].owned) ui.marketPlot = hit.plot; }
    if (ui.sel && matchMedia('(max-width: 720px)').matches) ui.drawer = null;
    renderDrawer(); renderPanel();
  }
  function onHover(hit) { if (ui.mode?.kind === 'item') world.showGhost(ui.mode.type, hit); }

  // ---------- Clicks inside the panel and drawers ----------
  function act(e) {
    const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'SELECT' || t.type === 'checkbox') return;
    const A = sim.actions; const sel = ui.sel; const d = t.dataset;
    switch (d.act) {
      case 'close': ui.sel = null; break;
      case 'close-drawer': ui.drawer = null; setMode(null); break;
      case 'buy-plot': A.buyPlot(sel.i, d.biome); break;
      case 'open-build': openDrawer('build'); return;
      case 'open-market': ui.marketPlot = sel.i; openDrawer('market'); return;
      case 'care': A.careNow(sel.i); break;
      case 'barrier': A.upgradeBarrier(sel.i); break;
      case 'board': A.buildBoard(sel.i); break;
      case 'sel-animal': ui.sel = { kind: 'animal', id: Number(d.id) }; break;
      case 'back-plot': ui.sel = { kind: 'plot', i: Number(d.i) }; break;
      case 'sell': A.sellAnimal(sel.id); ui.sel = null; break;
      case 'release': A.releaseAnimal(sel.id); if (!S().animals.some((a) => a.id === sel.id)) ui.sel = null; break;
      case 'demolish': A.demolish(sel.slot); ui.sel = null; break;
      case 'fac-build': A.buildFacility(Number(d.slot), d.type); ui.sel = { kind: 'facility', slot: Number(d.slot) }; break;
      case 'fac-mode': setMode({ kind: 'facility', type: d.type }); if (matchMedia('(max-width: 720px)').matches) { ui.drawer = null; renderDrawer(); } return;
      case 'item-mode': setMode({ kind: 'item', type: d.type }); if (matchMedia('(max-width: 720px)').matches) { ui.drawer = null; renderDrawer(); } return;
      case 'remove-mode': setMode({ kind: 'remove' }); return;
      case 'hire': A.hire(d.role); break;
      case 'fire': A.fire(d.role); break;
      case 'buy-animal': if (ui.marketPlot !== null) A.buyAnimal(Number(d.id), ui.marketPlot); break;
      case 'refresh-market': A.refreshMarket(); break;
      case 'research': A.startResearch(d.id); break;
      case 'entry': A.setEntry(S().entry + Number(d.d)); break;
      case 'price': A.setPrice(d.type, S().prices[d.type] + Number(d.d)); break;
      default: return;
    }
    renderDrawer(); renderPanel();
  }
  function change(e) {
    const t = e.target; const A = sim.actions;
    if (t.dataset.act === 'move' && t.value !== '') { A.moveAnimal(ui.sel.id, Number(t.value)); t.blur(); }
    if (t.dataset.act === 'contra') A.toggleContraception(ui.sel.id);
    if (t.dataset.act === 'market-plot') { ui.marketPlot = Number(t.value); t.blur(); }
    renderDrawer(); renderPanel();
  }
  for (const el of [panel, drawer]) { el.addEventListener('click', act); el.addEventListener('change', change); }
  function openDrawer(name) {
    ui.drawer = ui.drawer === name ? null : name; if (ui.mode && ui.drawer !== 'build' && ui.drawer !== 'services') setMode(null);
    if (ui.drawer && matchMedia('(max-width: 720px)').matches) { ui.sel = null; renderPanel(); }
    renderDrawer();
  }
  document.querySelectorAll('[data-drawer]').forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.drawer)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (ui.mode) setMode(null); else if (ui.sel) { ui.sel = null; renderPanel(); } else if (ui.drawer) { ui.drawer = null; renderDrawer(); } } });

  // ---------- Top bar, toasts ----------
  function renderHud() {
    const s = sim.info.rating;
    $('#money').textContent = sim.admin ? 'Vô hạn' : fmt(S().money);
    $('#money').classList.toggle('neg', !sim.admin && S().money < 0);
    $('#cc').textContent = sim.admin ? 'Vô hạn' : String(S().cc);
    $('#guests').textContent = Math.round(S().guests).toLocaleString('vi-VN');
    $('#happy').textContent = pct(S().happy);
    $('#day').textContent = `Ngày ${sim.day()}`;
    $('#stars').innerHTML = [1, 2, 3, 4, 5].map((k) => `<i class="${s >= k ? 'on' : s >= k - 0.5 ? 'half' : ''}">★</i>`).join('');
    $('#stars').setAttribute('aria-label', `Đánh giá ${s.toFixed(1)} trên 5 sao`);
    document.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === S().speed)));
  }
  document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { S().speed = Number(b.dataset.speed); renderHud(); }));
  const toasts = $('#toasts');
  function toast(text, kind = '') { const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = text; toasts.prepend(el); setTimeout(() => el.classList.add('out'), 4600); setTimeout(() => el.remove(), 5200); while (toasts.children.length > 4) toasts.lastChild.remove(); }
  function floatText(text) { const el = document.createElement('div'); el.className = 'coin'; el.textContent = text; $('#hud-money').appendChild(el); setTimeout(() => el.remove(), 1400); }
  $('#reset').addEventListener('click', () => {
    const b = $('#reset'); if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Bấm lần nữa để chơi lại'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Chơi lại từ đầu'; }, 3000); return; }
    onReset();
  });
  $('#tips-close').addEventListener('click', () => { $('#tips').hidden = true; S().seenTips = true; });
  if (S().seenTips) $('#tips').hidden = true;
  if (sim.admin) { document.body.classList.add('admin'); $('#admin-exit').hidden = false; }

  // Redraw: the top bar four times a second, panels twice, but not while being touched.
  let acc = 0; let slow = 0;
  function tick(dt) {
    acc += dt; slow += dt;
    if (acc > 0.25) { acc = 0; renderHud(); }
    if (slow > 0.5) {
      slow = 0;
      if (ui.sel && !busy(panel)) { const top = panel.scrollTop; renderPanel(); panel.scrollTop = top; }
      if (ui.drawer && !busy(drawer)) { const top = drawer.scrollTop; renderDrawer(); drawer.scrollTop = top; }
    }
  }
  return { ui, onTap, onHover, renderPanel, renderDrawer, renderHud, toast, floatText, tick, setMode, openDrawer };
}
