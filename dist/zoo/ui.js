// Third's Zoo screens: the top bar, the tools on the left with their drawer, the details panel on the right and
// the banner that says what a building tool is doing. main.js passes taps, hovers and brush strokes in.
import {
  TERRAIN, PLANTS, SPECIES, SPECIES_BY_ID, STATUS, ITEMS, BUILD_ORDER, BARRIERS, FACILITIES, FACILITY_ORDER, SHOPS, STAFF, STAFF_ORDER,
  RESEARCH, RESEARCH_ORDER, BOARD_COST, GOALS, PATH_COST,
} from './data.js';
import { NEED_LABELS, GUEST_NEEDS } from './sim.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (v) => `${Math.round(v)}%`;
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
function bar(v, label) { const c = v > 65 ? 'good' : v > 35 ? 'mid' : 'bad'; return `<span class="bar" role="meter" aria-label="${esc(label || '')}" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"><i class="${c}" style="width:${Math.round(Math.max(0, Math.min(100, v)))}%"></i></span>`; }
function mood(w) { return w >= 85 ? ['Rất vui', 'good'] : w >= 65 ? ['Vui', 'good'] : w >= 40 ? ['Tạm ổn', 'mid'] : ['Khổ sở', 'bad']; }
const BRUSHES = [['Nhỏ', 1], ['Vừa', 2.5], ['Lớn', 4.5]];

export function createUI({ sim, world, onReset, onShowcase }) {
  const S = () => sim.state;
  const fmt = sim.fmt;
  const price = (n) => (sim.admin ? 'Miễn phí' : fmt(n));
  const phone = () => matchMedia('(max-width: 720px)').matches;
  const ui = { drawer: null, sel: null, mode: null, marketHab: null, heat: false, fenceGrade: 1, paintType: 'soil', brush: 2.5 };
  const panel = $('#panel'); const drawer = $('#drawer'); const modeBar = $('#mode');
  const habs = () => S().habitats;
  const ageText = (a) => { const sp = SPECIES_BY_ID[a.species]; return a.age < sp.adult ? 'con non' : a.age > sp.life * 0.85 ? 'già' : 'trưởng thành'; };

  let touched = 0;
  for (const el of [panel, drawer, modeBar]) el.addEventListener('pointerdown', () => { touched = performance.now(); });
  const busy = (el) => performance.now() - touched < 900 || el.matches(':hover') || (el.contains(document.activeElement) && document.activeElement.tagName === 'SELECT');
  const head = (small, title) => `<header><div><small>${small}</small><h2>${title}</h2></div><button class="x" data-act="close" aria-label="Đóng">×</button></header>`;
  const dhead = (title, sub) => `<header><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div><button class="x" data-act="close-drawer" aria-label="Đóng">×</button></header>`;

  // ---------- Details panel ----------
  function renderPanel() {
    const sel = ui.sel;
    if (!sel) { panel.hidden = true; world.select(null); document.body.classList.remove('panel-open'); return; }
    let html = '';
    if (sel.kind === 'habitat') { const h = sim.habById(sel.id); if (!h) return close(); html = habitatHtml(h); }
    if (sel.kind === 'animal') { const a = S().animals.find((x) => x.id === sel.id); if (!a) return close(); html = animalHtml(a); }
    if (sel.kind === 'guest') { const g = S().visitors.find((x) => x.id === sel.id); if (!g) return close(); html = guestHtml(g); }
    if (sel.kind === 'facility') { const f = S().facilities.find((x) => x.id === sel.id); if (!f) return close(); html = facilityHtml(f); }
    panel.innerHTML = html; panel.hidden = false; document.body.classList.add('panel-open');
  }
  function close() { ui.sel = null; renderPanel(); }
  function select(sel) { ui.sel = sel; world.select(sel); if (sel?.kind === 'habitat') ui.marketHab = sel.id; if (sel && phone()) { ui.drawer = null; renderDrawer(); } renderPanel(); }

  function habitatHtml(h) {
    const st = sim.info.stats.get(h.id) || sim.habitatStats(h); const n = st.animals.length;
    const covered = sim.info.covered.has(h.id); const needBarrier = Math.max(0, ...st.animals.map((a) => SPECIES_BY_ID[a.species].barrier)); const next = BARRIERS[h.barrier + 1];
    const types = [...st.types].map((t) => ITEMS[t].name).join(', ') || 'chưa có';
    const plants = Object.entries(st.plants).map(([k, c]) => `${c} ${PLANTS[k].name.toLowerCase()}`).join(', ') || 'chưa có';
    const ground = TERRAIN.map((t) => `<i style="width:${(st.share[t.id] || 0) * 100}%;background:${hex(t.color)}" title="${t.name} ${pct((st.share[t.id] || 0) * 100)}"></i>`).join('');
    const legend = TERRAIN.filter((t) => st.share[t.id] > 0.01).map((t) => `<span><b style="background:${hex(t.color)}"></b>${t.name} ${pct(st.share[t.id] * 100)}</span>`).join('');
    const status = !st.gate ? '<span class="warn">Chưa có lối vào: làm lối đi tới sát rào để nhân viên vào được và khách xem được.</span>' : n ? (covered ? 'Có nhân viên chăm thú phụ trách.' : '<span class="warn">Chưa có nhân viên chăm chuồng này.</span>') : 'Có lối vào. Chuẩn bị chuồng rồi mua thú.';
    return `${head(`${Math.round(st.area)} m² · chu vi ${Math.round(st.perimeter)} m`, esc(h.name))}
      <div class="rows">
        <div class="row"><span>Thức ăn</span>${bar(h.food, 'Thức ăn')}<b>${pct(h.food)}</b></div>
        <div class="row"><span>Nước</span>${bar(h.water, 'Nước')}<b>${pct(h.water)}</b></div>
        <div class="row"><span>Vệ sinh</span>${bar(h.clean, 'Vệ sinh')}<b>${pct(h.clean)}</b></div>
      </div>
      <p class="note">${status}</p>
      <div class="actions"><button data-act="open" data-to="build">Đặt đồ</button><button data-act="open" data-to="paint">Tô địa hình</button><button data-act="open" data-to="market">Mua thú</button><button class="soft" data-act="care">Tự chăm · ${price(40 + 15 * n)}</button></div>
      <h3>Hàng rào</h3>
      <p class="note">${BARRIERS[h.barrier].name}${needBarrier > h.barrier ? ` · <span class="warn">thú ở đây cần ${BARRIERS[needBarrier].name.toLowerCase()}, chúng có thể xổng chuồng</span>` : ''}</p>
      ${next ? `<button class="soft" data-act="barrier" ${next.research && !sim.done(next.research) ? 'disabled' : ''}>Nâng lên ${next.name.toLowerCase()} · ${price(sim.actions.upgradeCost(h.id))}${next.research && !sim.done(next.research) ? ' (cần nghiên cứu)' : ''}</button>` : ''}
      <h3>Địa hình</h3>
      <div class="ground" role="img" aria-label="Tỉ lệ địa hình">${ground}</div><div class="legend">${legend}</div>
      <h3>Môi trường sống</h3>
      <dl class="facts">
        <dt>Đất trống</dt><dd>${Math.round(st.land)} m²${st.landNeed ? ` / thú cần ${Math.round(st.landNeed)} m²` : ''}</dd>
        <dt>Mặt nước</dt><dd>${Math.round((st.water / st.area) * 100)}% (${Math.round(st.water)} m²)</dd>
        <dt>Cây</dt><dd>${esc(plants)}</dd>
        <dt>Nhà trú</dt><dd>${st.shelters ? `${st.shelters * 4} chỗ` : 'chưa có'}${st.shelterNeed ? ` / cần ${Math.ceil(st.shelterNeed)}` : ''}</dd>
        <dt>Đồ chơi</dt><dd>${esc(types)}</dd>
      </dl>
      <h3>Bảng giáo dục</h3>
      ${h.board ? '<p class="note">Đã có: khách quyên góp nhiều hơn.</p>' : `<button class="soft" data-act="board" ${sim.done('board') ? '' : 'disabled'}>Dựng bảng · ${price(BOARD_COST)}${sim.done('board') ? '' : ' (cần nghiên cứu)'}</button>`}
      <h3>Thú trong chuồng</h3>
      ${n ? `<ul class="list">${st.animals.map((a) => { const [m, c] = mood(a.welfare); const sp = SPECIES_BY_ID[a.species]; return `<li><button class="pick" data-act="sel-animal" data-id="${a.id}"><span><b>${esc(a.name)}</b> <small>${sp.name} · ${a.sex === 'M' ? 'đực' : 'cái'} · ${ageText(a)}${a.sick ? ' · <em class="warn">ốm</em>' : ''}${a.pregnant ? ' · mang thai' : ''}</small></span><span class="mood ${c}">${m}</span></button></li>`; }).join('')}</ul>` : '<p class="note">Chưa có con nào.</p>'}
      <button class="link-btn danger" data-act="remove-hab">${ui.armRemove === h.id ? 'Bấm lần nữa để dỡ chuồng' : 'Dỡ chuồng này'}</button>`;
  }
  function animalHtml(a) {
    const sp = SPECIES_BY_ID[a.species]; const [m, c] = mood(a.welfare); const h = sim.habById(a.hab);
    const others = habs().filter((x) => x.id !== a.hab);
    const needs = Object.keys(NEED_LABELS).map((k) => `<div class="need"><div class="row"><span>${NEED_LABELS[k]}</span>${bar(a.needs[k] ?? 0, NEED_LABELS[k])}<b>${pct(a.needs[k] ?? 0)}</b></div>${a.why?.[k] ? `<small>${esc(a.why[k])}</small>` : ''}</div>`).join('');
    return `${head(`${sp.name} · ${a.escaped ? 'đang xổng chuồng!' : esc(h?.name || '')}`, esc(a.name))}
      <p class="lead">${a.sex === 'M' ? 'Đực' : 'Cái'} · ${a.age} ngày tuổi (${ageText(a)}) · ${STATUS[sp.status].name}${a.sick ? ' · <span class="warn">đang ốm</span>' : ''}${a.pregnant ? ` · mang thai, còn ${a.pregnant} ngày` : ''}</p>
      <div class="welfare"><span>Phúc lợi</span>${bar(a.welfare, 'Phúc lợi')}<b class="mood ${c}">${m} · ${pct(a.welfare)}</b></div>
      <div class="needs">${needs}</div>
      <label class="check"><input type="checkbox" data-act="contra" ${a.contraception ? 'checked' : ''}> Ngừa thai (không sinh con)</label>
      <div class="actions">
        ${others.length ? `<label class="move">Chuyển sang <select data-act="move"><option value="">chọn chuồng…</option>${others.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>` : ''}
        <button class="soft" data-act="sell">${sp.cc ? `Chuyển vườn khác (+${Math.round(sp.cc * 0.4)} điểm)` : `Bán sang vườn khác (+${fmt(sp.price * 0.5)})`}</button>
        <button class="soft" data-act="release">Thả về tự nhiên (+${STATUS[sp.status].release} điểm bảo tồn)</button>
      </div>
      ${h ? `<button class="link-btn" data-act="sel-hab" data-id="${h.id}">‹ Về ${esc(h.name.toLowerCase())}</button>` : ''}`;
  }
  function guestHtml(g) {
    const sat = { hunger: 100 - g.needs.hunger, thirst: 100 - g.needs.thirst, toilet: 100 - g.needs.toilet, energy: g.needs.energy };
    const labels = { hunger: 'No bụng', thirst: 'Đủ nước', toilet: 'Thoải mái', energy: GUEST_NEEDS.energy };
    const seen = g.seen.map((id) => sim.habById(id)?.name).filter(Boolean).join(', ') || 'chưa xem chuồng nào';
    return `${head('Khách tham quan', esc(g.name))}
      <blockquote class="thought">“${esc(g.thought || '…')}”</blockquote>
      <div class="welfare"><span>Độ vui</span>${bar(g.happy, 'Độ vui')}<b class="mood ${mood(g.happy)[1]}">${pct(g.happy)}</b></div>
      <div class="needs">${Object.keys(sat).map((k) => `<div class="row"><span>${labels[k]}</span>${bar(sat[k], labels[k])}<b>${pct(sat[k])}</b></div>`).join('')}</div>
      <dl class="facts"><dt>Đã tiêu</dt><dd>${fmt(g.spent)}</dd><dt>Đã xem</dt><dd>${esc(seen)}</dd><dt>Ở vườn</dt><dd>${Math.round(g.age)} giây</dd></dl>`;
  }
  function facilityHtml(f) {
    const def = FACILITIES[f.type]; const cond = f.condition ?? 100; const shop = SHOPS.includes(f.type);
    return `${head('Dịch vụ khách', def.name)}
      <p class="lead">${esc(def.note)} Phục vụ khoảng ${def.serves} khách. Duy trì ${fmt(def.upkeep)}/ngày.${f.reach ? '' : ' <span class="warn">Lối đi ở đây chưa nối tới cổng.</span>'}</p>
      ${f.type === 'bench' || f.type === 'bin' ? '' : `<div class="row"><span>Tình trạng</span>${bar(cond, 'Tình trạng')}<b>${pct(cond)}</b></div><p class="note ${cond < 15 ? 'warn' : ''}">${cond < 15 ? 'Đã hỏng: thuê thêm thợ máy.' : 'Thợ máy giữ cho quầy hoạt động.'}</p>`}
      ${shop ? `<h3>Giá bán</h3>${priceRow(f.type)}` : ''}
      <div class="actions"><button class="soft danger" data-act="demolish">Dỡ bỏ (nhận lại ${fmt(def.cost * 0.5)})</button></div>`;
  }
  function priceRow(type) {
    const def = FACILITIES[type];
    return `<div class="stepper"><span>${def.name}</span><button class="soft" data-act="price" data-type="${type}" data-d="-1" aria-label="Giảm giá">−</button><b>${fmt(S().prices[type])}</b><button class="soft" data-act="price" data-type="${type}" data-d="1" aria-label="Tăng giá">+</button><small>gợi ý ${fmt(def.price)}</small></div>`;
  }

  // ---------- Drawers ----------
  const DRAWERS = {
    path: () => `${dhead('Lối đi', `Rộng 3 m, ${fmt(PATH_COST)} một mét.`)}
      <ol class="steps"><li>Bấm điểm đầu, rồi bấm điểm cuối: một đoạn lối đi được làm.</li><li>Bấm tiếp để vẽ nối đoạn sau. Bấm gần lối có sẵn để nối vào đó.</li><li>Lối đi phải nối về cổng vào thì khách mới đi tới được.</li></ol>
      <p class="note">Chuồng và quầy phải nằm sát lối đi: nhân viên vào chuồng qua cổng rào, khách đứng trên lối đi xem thú.</p>`,
    fence: () => `${dhead('Rào chuồng', 'Bấm từng góc của chuồng, bấm lại góc đầu để khép rào.')}
      <ul class="list">${[1, 2, 3].map((g) => { const b = BARRIERS[g]; const locked = b.research && !sim.done(b.research); return `<li class="card ${ui.fenceGrade === g ? 'on' : ''} ${locked ? 'locked' : ''}"><div><b>${b.name}</b><small>Cao ${b.height} m · ${fmt(b.perM)} một mét${locked ? ` · cần nghiên cứu “${RESEARCH[b.research].name}”` : ''}</small><small>Giữ được thú cần rào cấp ${g} trở xuống.</small></div><button data-act="grade" data-g="${g}" ${locked ? 'disabled' : ''}>${ui.fenceGrade === g ? 'Đang chọn' : 'Chọn'}</button></li>`; }).join('')}</ul>
      <p class="note">Chuồng tối thiểu 40 m², không cắt qua lối đi hay chuồng khác. Rào nên sát lối đi để có cổng vào.</p>`,
    paint: () => `${dhead('Tô địa hình', 'Kéo trên mặt đất để tô. Mỗi loài thích một loại nền.')}
      <div class="swatches">${TERRAIN.map((t) => `<button class="swatch ${ui.paintType === t.id ? 'on' : ''}" data-act="paint-type" data-t="${t.id}"><b style="background:${hex(t.color)}"></b>${t.name}</button>`).join('')}</div>
      <h3>Cỡ cọ</h3><div class="seg">${BRUSHES.map(([n, r]) => `<button class="soft ${ui.brush === r ? 'on' : ''}" data-act="brush" data-r="${r}">${n}</button>`).join('')}</div>
      <p class="note">Tô miễn phí. Loài nào thích nền gì: xem ở Bách khoa thú.</p>`,
    build: () => `${dhead('Đồ trong chuồng', 'Chọn một món rồi bấm vào chỗ trong chuồng. Phím R để xoay.')}
      <ul class="list">${BUILD_ORDER.map((t) => { const d = ITEMS[t]; const locked = d.research && !sim.done(d.research);
        return `<li class="card ${locked ? 'locked' : ''} ${ui.mode?.type === t ? 'on' : ''}"><div><b>${d.name}</b><small>${d.w} × ${d.d} m · ${esc(d.note)}${locked ? ` Cần nghiên cứu “${RESEARCH[d.research].name}”.` : ''}</small></div><button data-act="item-mode" data-type="${t}" ${locked ? 'disabled' : ''}>${locked ? 'Khóa' : price(d.cost)}</button></li>`; }).join('')}</ul>`,
    services: () => {
      const c = sim.info.cover; const line = (label, v) => `<div class="row"><span>${label}</span>${bar(Math.min(1, v) * 100, label)}<b>${pct(Math.min(1, v) * 100)}</b></div>`;
      return `${dhead('Dịch vụ khách', `Đang có ${S().visitors.length} khách. Chọn một loại rồi bấm cạnh lối đi.`)}
        <div class="rows">${line('Đồ ăn', c.food)}${line('Nước', c.drink)}${line('Vệ sinh', c.toilet)}${line('Chỗ ngồi', c.bench)}</div>
        <ul class="list">${FACILITY_ORDER.map((t) => { const d = FACILITIES[t]; const locked = d.research && !sim.done(d.research);
          return `<li class="card ${locked ? 'locked' : ''} ${ui.mode?.type === t ? 'on' : ''}"><div><b>${d.name}</b><small>${esc(d.note)} Phục vụ ${d.serves} khách, duy trì ${fmt(d.upkeep)}/ngày.</small></div><button data-act="fac-mode" data-type="${t}" ${locked ? 'disabled' : ''}>${locked ? 'Cần nghiên cứu' : price(d.cost)}</button></li>`; }).join('')}</ul>`;
    },
    remove: () => `${dhead('Dỡ bỏ', 'Bấm vào một đoạn lối đi, một quầy hoặc một món đồ trong chuồng để dỡ, nhận lại một nửa tiền.')}<p class="note">Muốn dỡ cả chuồng: mở chuồng đó, chuyển hết thú đi rồi bấm “Dỡ chuồng này”.</p>`,
    staff: () => {
      const st = S().staff; const open = habs().filter((h) => sim.info.stats.get(h.id)?.gate && sim.info.stats.get(h.id)?.animals.length).length;
      const sick = S().animals.filter((a) => a.sick).length; const fac = S().facilities.filter((f) => f.type !== 'bench' && f.type !== 'bin').length;
      const status = { keeper: `Lo được ${Math.min(open, st.keeper * 2)}/${open} chuồng có thú và lối vào`, vet: `${sick} con đang ốm · nghiên cứu +${st.vet * 10}/ngày`, mechanic: `Bảo trì ${Math.min(fac, st.mechanic * 5)}/${fac} quầy · nghiên cứu +${st.mechanic * 8}/ngày`, janitor: `${S().litter.length} mẩu rác trên lối đi`, security: sim.info.escaped ? `${sim.info.escaped} con đang xổng chuồng!` : 'Không có thú xổng chuồng' };
      return `${dhead('Nhân viên', 'Lương trả mỗi ngày. Thuê người mới mất một ngày lương.')}
        <ul class="list">${STAFF_ORDER.map((r) => `<li class="card staff"><div><b>${STAFF[r].name}</b><small>${esc(STAFF[r].note)} Lương ${fmt(STAFF[r].salary)}/ngày.</small><small class="status">${status[r]}</small></div>
          <div class="stepper"><button class="soft" data-act="fire" data-role="${r}" aria-label="Cho nghỉ một ${STAFF[r].name}" ${st[r] ? '' : 'disabled'}>−</button><b>${st[r]}</b><button class="soft" data-act="hire" data-role="${r}" aria-label="Thuê thêm ${STAFF[r].name}">+</button></div></li>`).join('')}</ul>`;
    },
    market: () => {
      if (!habs().some((h) => h.id === ui.marketHab)) ui.marketHab = habs()[0]?.id ?? null;
      return `${dhead('Chợ thú', 'Hàng mới mỗi ngày. Loài nguy cấp mua bằng điểm bảo tồn.')}
        ${habs().length ? `<label class="move">Đưa vào <select data-act="market-hab">${habs().map((h) => `<option value="${h.id}" ${h.id === ui.marketHab ? 'selected' : ''}>${esc(h.name)} · ${Math.round(sim.hInfo(h).area)} m²</option>`).join('')}</select></label>` : '<p class="note warn">Dựng một chuồng trước đã: dùng công cụ Rào chuồng.</p>'}
        <ul class="list">${S().market.map((m) => { const sp = SPECIES_BY_ID[m.species];
          return `<li class="card"><div><b>${sp.name}</b><small>${m.sex === 'M' ? 'Đực' : 'Cái'} · ${m.age} ngày tuổi${m.age < sp.adult ? ' (con non)' : ''} · ${STATUS[sp.status].name}</small><small>${esc(sp.blurb)} Bầy ${sp.group[0]}–${sp.group[1]}, ${sp.area} m²/con, cần ${BARRIERS[sp.barrier].name.toLowerCase()}.</small></div>
            <button data-act="buy-animal" data-id="${m.id}" ${habs().length ? '' : 'disabled'}>${sim.admin ? 'Miễn phí' : sp.cc ? `${sp.cc} điểm` : fmt(sp.price)}</button></li>`; }).join('') || '<li class="note">Hết hàng, đợi ngày mai hoặc làm mới.</li>'}</ul>
        <button class="soft wide" data-act="refresh-market">Làm mới hàng · ${price(150)}</button>
        <p class="note">Bạn có ${sim.admin ? 'vô hạn' : S().cc} điểm bảo tồn. Thả thú trưởng thành, khỏe mạnh về tự nhiên để nhận thêm.</p>`;
    },
    zoo: () => `${dhead('Bách khoa thú', 'Mỗi loài cần gì để sống vui trong chuồng.')}
      ${SPECIES.map((sp) => `<section class="species"><h3>${sp.name} <small>${STATUS[sp.status].name}</small></h3><p class="note">${esc(sp.blurb)}</p>
        <dl class="facts">
          <dt>Bầy</dt><dd>${sp.group[0]}–${sp.group[1]} con${sp.males < sp.group[1] ? `, tối đa ${sp.males} đực` : ''}</dd>
          <dt>Đất mỗi con</dt><dd>${sp.area} m²</dd>
          <dt>Mặt nước</dt><dd>${pct(sp.water * 100)} chuồng</dd>
          <dt>Nền đất</dt><dd>${TERRAIN.find((t) => t.id === sp.terrain[0]).name} ${pct(sp.terrain[1] * 100)}</dd>
          <dt>Cây</dt><dd>${PLANTS[sp.plants[0]].name}, ${sp.plants[1]} cây/100 m²</dd>
          <dt>Hàng rào</dt><dd>${BARRIERS[sp.barrier].name}</dd>
          <dt>Thích chơi</dt><dd>${sp.likes.map((t) => ITEMS[t].name).join(', ')}</dd>
          <dt>Giá</dt><dd>${sp.cc ? `${sp.cc} điểm bảo tồn` : fmt(sp.price)}</dd>
        </dl></section>`).join('')}`,
    research: () => {
      const r = S().research;
      const track = (t) => `<p class="note">${t === 'vet' ? `Bác sĩ thú y: ${S().staff.vet} người · +${S().staff.vet * 10} điểm/ngày` : `Thợ máy: ${S().staff.mechanic} người · +${S().staff.mechanic * 8} điểm/ngày`}${r.bank[t] ? ` · có ${r.bank[t]} điểm chưa dùng` : ''}</p>`;
      const item = (id) => { const d = RESEARCH[id]; const isDone = sim.done(id); const active = r.active[d.track] === id; const prog = r.progress[id] || 0;
        return `<li class="card ${isDone ? 'done' : ''}"><div><b>${d.name}</b><small>Mở khóa: ${esc(d.unlocks)}</small>${!isDone ? `<div class="row slim">${bar((prog / d.cost) * 100, d.name)}<b>${prog}/${d.cost}</b></div>` : ''}</div>${isDone ? '<span class="tag good">Xong</span>' : active ? '<span class="tag">Đang làm</span>' : `<button data-act="research" data-id="${id}">Nghiên cứu</button>`}</li>`; };
      return `${dhead('Nghiên cứu', 'Mỗi nhóm làm một đề tài một lúc. Điểm có được mỗi ngày.')}
        <h3>Về thú</h3>${track('vet')}<ul class="list">${RESEARCH_ORDER.filter((id) => RESEARCH[id].track === 'vet').map(item).join('')}</ul>
        <h3>Về cơ sở</h3>${track('mech')}<ul class="list">${RESEARCH_ORDER.filter((id) => RESEARCH[id].track === 'mech').map(item).join('')}</ul>`;
    },
    finance: () => {
      const t = S().ledger.today; const days = S().ledger.days; const max = Math.max(1, ...days.flatMap((d) => [d.income, d.expense]));
      return `${dhead('Tài chính', `Hôm nay (ngày ${sim.day()}) đến giờ`)}
        <dl class="facts money"><dt>Vé vào cổng</dt><dd>+${fmt(t.tickets)}</dd><dt>Quầy bán hàng</dt><dd>+${fmt(t.shops)}</dd><dt>Quyên góp</dt><dd>+${fmt(t.donations)}</dd><dt>Bán thú</dt><dd>+${fmt(t.sales)}</dd><dt>Xây dựng</dt><dd>−${fmt(t.build)}</dd><dt>Mua thú</dt><dd>−${fmt(t.animals)}</dd><dt>Lương, thức ăn, duy trì</dt><dd>trả cuối ngày</dd></dl>
        <h3>Giá vé</h3>
        <div class="stepper"><span>Vé vào cổng</span><button class="soft" data-act="entry" data-d="-1" aria-label="Giảm giá vé">−</button><b>${fmt(S().entry)}</b><button class="soft" data-act="entry" data-d="1" aria-label="Tăng giá vé">+</button><small>khách thấy hợp lý ≤ ${fmt(sim.info.fairEntry)}</small></div>
        <h3>Giá ở quầy</h3>${SHOPS.map(priceRow).join('')}
        <h3>7 ngày gần đây</h3>
        ${days.length ? `<div class="chart" role="img" aria-label="Thu và chi 7 ngày gần đây">${days.map((d) => `<div class="day"><div class="bars"><i class="in" style="height:${(d.income / max) * 100}%"></i><i class="out" style="height:${(d.expense / max) * 100}%"></i></div><small>N${d.day}</small><small class="${d.profit >= 0 ? 'pos' : 'warn'}">${d.profit >= 0 ? '+' : '−'}${Math.abs(d.profit).toLocaleString('vi-VN')}</small></div>`).join('')}</div><p class="note"><i class="key in"></i> thu <i class="key out"></i> chi</p>` : '<p class="note">Chưa hết ngày đầu tiên.</p>'}`;
    },
    goals: () => `${dhead('Mục tiêu', 'Xong cả một bậc để nhận thưởng và mở bậc tiếp theo.')}
      ${GOALS.map((g, k) => { const open = k === 0 || S().goals.tiers[k - 1];
        return `<section class="tier ${S().goals.tiers[k] ? 'done' : ''} ${open ? '' : 'locked'}"><h3>${'★'.repeat(g.tier)} <small>thưởng ${fmt(g.reward.money)} + ${g.reward.cc} điểm bảo tồn</small></h3><ul>${g.items.map((it) => `<li class="${S().goals.done[it.id] ? 'ok' : ''}">${S().goals.done[it.id] ? '✓' : '○'} ${it.text}</li>`).join('')}</ul></section>`; }).join('')}
      <p class="note">Đánh giá vườn thú tính từ phúc lợi thú, số loài, độ vui của khách, dịch vụ và bảng giáo dục.</p>`,
  };
  function renderDrawer() {
    document.querySelectorAll('[data-drawer]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.drawer === ui.drawer)));
    document.body.classList.toggle('drawer-open', !!ui.drawer);
    if (!ui.drawer) { drawer.hidden = true; return; }
    drawer.hidden = false;
    drawer.innerHTML = DRAWERS[ui.drawer]() + (phone() && ['path', 'fence', 'paint', 'remove'].includes(ui.drawer) ? '<button class="wide" data-act="tool-start">Bắt đầu vẽ trên bản đồ</button>' : '');
  }
  // Building drawers start their tool at once.
  function openDrawer(name) {
    ui.drawer = ui.drawer === name ? null : name;
    const tool = { path: { kind: 'path', start: null }, fence: { kind: 'fence', pts: [] }, paint: { kind: 'paint' }, remove: { kind: 'remove' } }[ui.drawer];
    if (tool && ui.mode?.kind !== tool.kind) setMode(tool);
    else if (!tool && ui.mode && !['build', 'services'].includes(ui.drawer)) setMode(null);
    if (ui.drawer && phone()) { ui.sel = null; renderPanel(); }
    renderDrawer();
  }

  // ---------- Tools ----------
  let hoverPoint = null;
  function setMode(m) {
    const wide = !phone();
    if (m && !ui.mode && wide) { ui.prevSel = ui.sel; ui.sel = null; renderPanel(); }
    const back = !m && ui.mode ? ui.prevSel : null; if (!m) ui.prevSel = null;
    ui.mode = m; world.previews.clear(); document.body.classList.toggle('placing', !!m);
    renderMode(); if (ui.drawer) renderDrawer();
    if (back && !ui.sel) select(back);
  }
  function renderMode() {
    const m = ui.mode; if (!m) { modeBar.hidden = true; return; }
    let text = ''; let extra = '';
    if (m.kind === 'path') { const pv = m.start && hoverPoint ? sim.previewPath(m.start, hoverPoint) : null; text = m.start ? `Bấm điểm cuối${pv ? ` · ${Math.round(pv.len)} m · ${price(pv.cost)}${pv.ok ? '' : ` · ${pv.why}`}` : ''}` : 'Bấm điểm đầu của lối đi'; if (m.start) extra = '<button class="soft" data-act="path-stop">Ngắt</button>'; }
    if (m.kind === 'fence') { const pv = sim.previewHabitat(hoverPoint ? [...m.pts, hoverPoint] : m.pts, ui.fenceGrade); text = m.pts.length ? `${m.pts.length} góc · ${Math.round(pv.area)} m² · ${price(pv.cost)}${m.pts.length >= 2 && !pv.ok ? ` · ${pv.why}` : ''}` : `Bấm góc đầu tiên của chuồng (${BARRIERS[ui.fenceGrade].name.toLowerCase()})`; if (m.pts.length) extra = `<button class="soft" data-act="fence-undo">Bỏ góc cuối</button>${m.pts.length >= 3 ? '<button class="soft" data-act="fence-close">Khép rào</button>' : ''}`; }
    if (m.kind === 'paint') text = `Kéo trên mặt đất để tô ${TERRAIN.find((t) => t.id === ui.paintType).name.toLowerCase()}`;
    if (m.kind === 'item') { text = `Đặt ${ITEMS[m.type].name.toLowerCase()} (${price(ITEMS[m.type].cost)}): bấm trong chuồng`; extra = '<button class="soft" data-act="rotate">Xoay</button>'; }
    if (m.kind === 'facility') text = `Xây ${FACILITIES[m.type].name.toLowerCase()} (${price(FACILITIES[m.type].cost)}): bấm cạnh lối đi`;
    if (m.kind === 'remove') text = 'Bấm vào lối đi, quầy hoặc món đồ trong chuồng để dỡ';
    modeBar.innerHTML = `<span>${text}</span>${extra}<button data-act="mode-done">Xong</button>`; modeBar.hidden = false;
  }
  function finishFence() {
    const m = ui.mode; if (m?.kind !== 'fence' || m.pts.length < 3) return;
    const h = sim.actions.createHabitat(m.pts, ui.fenceGrade);
    if (h) { m.pts = []; ui.prevSel = null; setMode(null); ui.drawer = null; renderDrawer(); select({ kind: 'habitat', id: h.id }); } else renderMode();
  }
  /** A tap on the 3D world: the things under it and the ground point. */
  function onTap(hit) {
    const m = ui.mode; const p = hit.point;
    if (m && !p) return;
    if (m?.kind === 'path') {
      if (!m.start) { m.start = sim.previewPath(p, p).a; onHover(p); return; }
      const end = sim.actions.addPath(m.start, p); if (end) m.start = end; world.previews.clear(); renderMode(); return;
    }
    if (m?.kind === 'fence') {
      if (m.pts.length >= 3 && Math.hypot(m.pts[0][0] - p[0], m.pts[0][1] - p[1]) < 1.8) { finishFence(); return; }
      m.pts.push([Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2]); onHover(p); return;
    }
    if (m?.kind === 'paint') { sim.actions.paint(p[0], p[1], ui.brush, ui.paintType); return; }
    if (m?.kind === 'item') { if (hit.habitat === undefined) { toast('Đặt đồ bên trong một chuồng.', 'warn'); return; } sim.actions.placeItem(hit.habitat, m.type, p[0], p[1], m.rot || 0); onHover(p); return; }
    if (m?.kind === 'facility') { sim.actions.buildFacility(m.type, p[0], p[1]); onHover(p); return; }
    if (m?.kind === 'remove') {
      if (hit.facility !== undefined) { sim.actions.demolish(hit.facility); return; }
      if (hit.habitat !== undefined) { const it = world.nearestItem(hit.habitat, p); if (it) sim.actions.removeItem(hit.habitat, it.id); return; }
      const s = world.nearestPathSeg(p); if (s) sim.actions.removePath(s.id); return;
    }
    if (hit.animal !== undefined) select({ kind: 'animal', id: hit.animal });
    else if (hit.guest !== undefined) select({ kind: 'guest', id: hit.guest });
    else if (hit.facility !== undefined) select({ kind: 'facility', id: hit.facility });
    else if (hit.habitat !== undefined) select({ kind: 'habitat', id: hit.habitat });
    else select(null);
  }
  function onHover(p) {
    const m = ui.mode; hoverPoint = p; if (!m || !p) return;
    if (m.kind === 'path') { const pv = m.start ? sim.previewPath(m.start, p) : sim.previewPath(p, p); world.previews.path(pv.a, m.start ? pv.b : pv.a, m.start ? pv.ok : true); }
    if (m.kind === 'fence') { const pv = sim.previewHabitat([...m.pts, p], ui.fenceGrade); world.previews.habitat(m.pts, [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2], m.pts.length < 2 || pv.ok); }
    if (m.kind === 'paint') world.previews.brush(p, ui.brush);
    if (m.kind === 'item') { const h = sim.habitatAt(p); const d = ITEMS[m.type]; world.previews.footprint(d.w, d.d, p, m.rot || 0, !!h && sim.itemFits(h, m.type, p[0], p[1])); }
    if (m.kind === 'facility') { const s = sim.facilitySpot(p[0], p[1]); world.previews.footprint(2, 2, [s.x, s.z], s.rot, s.ok); }
    renderMode();
  }
  const painting = () => ui.mode?.kind === 'paint';
  function onPaint(p) { if (painting() && p) { sim.actions.paint(p[0], p[1], ui.brush, ui.paintType); world.previews.brush(p, ui.brush); } }

  // ---------- Clicks inside the panel, drawer and banner ----------
  function act(e) {
    const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'SELECT' || t.type === 'checkbox') return;
    const A = sim.actions; const sel = ui.sel; const d = t.dataset;
    switch (d.act) {
      case 'close': ui.sel = null; break;
      case 'close-drawer': ui.drawer = null; if (!phone()) setMode(null); break;
      case 'tool-start': ui.drawer = null; renderDrawer(); return;
      case 'mode-done': if (['path', 'fence', 'paint', 'remove'].includes(ui.drawer)) ui.drawer = null; setMode(null); break;
      case 'path-stop': if (ui.mode) ui.mode.start = null; world.previews.clear(); renderMode(); return;
      case 'fence-undo': ui.mode.pts.pop(); if (hoverPoint) onHover(hoverPoint); renderMode(); return;
      case 'fence-close': finishFence(); return;
      case 'rotate': if (ui.mode) { ui.mode.rot = ((ui.mode.rot || 0) + Math.PI / 4) % (Math.PI * 2); if (hoverPoint) onHover(hoverPoint); } return;
      case 'grade': ui.fenceGrade = Number(d.g); renderMode(); break;
      case 'paint-type': ui.paintType = d.t; renderMode(); break;
      case 'brush': ui.brush = Number(d.r); break;
      case 'open': if (d.to === 'market' && sel) ui.marketHab = sel.id; openDrawer(d.to); return;
      case 'care': A.careNow(sel.id); break;
      case 'barrier': A.upgradeBarrier(sel.id); break;
      case 'board': A.buildBoard(sel.id); break;
      case 'remove-hab': if (ui.armRemove === sel.id) { A.removeHabitat(sel.id); ui.armRemove = null; if (!sim.habById(sel.id)) ui.sel = null; } else { ui.armRemove = sel.id; setTimeout(() => { ui.armRemove = null; }, 3000); } break;
      case 'sel-animal': select({ kind: 'animal', id: Number(d.id) }); return;
      case 'sel-hab': select({ kind: 'habitat', id: Number(d.id) }); return;
      case 'sell': A.sellAnimal(sel.id); ui.sel = null; break;
      case 'release': A.releaseAnimal(sel.id); if (!S().animals.some((a) => a.id === sel.id)) ui.sel = null; break;
      case 'demolish': A.demolish(sel.id); ui.sel = null; break;
      case 'item-mode': setMode({ kind: 'item', type: d.type, rot: 0 }); if (phone()) { ui.drawer = null; renderDrawer(); } return;
      case 'fac-mode': setMode({ kind: 'facility', type: d.type }); if (phone()) { ui.drawer = null; renderDrawer(); } return;
      case 'hire': A.hire(d.role); break;
      case 'fire': A.fire(d.role); break;
      case 'buy-animal': if (ui.marketHab !== null) A.buyAnimal(Number(d.id), ui.marketHab); break;
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
    if (t.dataset.act === 'market-hab') { ui.marketHab = Number(t.value); t.blur(); }
    renderDrawer(); renderPanel();
  }
  for (const el of [panel, drawer, modeBar]) { el.addEventListener('click', act); el.addEventListener('change', change); }
  document.querySelectorAll('[data-drawer]').forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.drawer)));
  $('#heat').addEventListener('click', () => { ui.heat = !ui.heat; world.setHeatmap(ui.heat); $('#heat').setAttribute('aria-pressed', String(ui.heat)); });
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, select, textarea')) return;
    if (e.key === 'Escape') {
      if (ui.mode?.kind === 'fence' && ui.mode.pts.length) { ui.mode.pts = []; world.previews.clear(); renderMode(); }
      else if (ui.mode?.kind === 'path' && ui.mode.start) { ui.mode.start = null; world.previews.clear(); renderMode(); }
      else if (ui.mode) setMode(null); else if (ui.sel) close(); else if (ui.drawer) { ui.drawer = null; renderDrawer(); }
    }
    if ((e.key === 'r' || e.key === 'R') && ui.mode?.kind === 'item') { ui.mode.rot = ((ui.mode.rot || 0) + Math.PI / 4) % (Math.PI * 2); if (hoverPoint) onHover(hoverPoint); }
    if (e.key === 'Enter' && ui.mode?.kind === 'fence') finishFence();
  });

  // ---------- Top bar, toasts ----------
  function renderHud() {
    const s = sim.info.rating;
    $('#money').textContent = sim.admin ? 'Vô hạn' : fmt(S().money); $('#money').classList.toggle('neg', !sim.admin && S().money < 0);
    $('#cc').textContent = sim.admin ? 'Vô hạn' : String(S().cc);
    $('#guests').textContent = S().visitors.length.toLocaleString('vi-VN');
    $('#happy').textContent = pct(sim.info.happy ?? S().happy);
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
  $('#showcase-btn')?.addEventListener('click', () => {
    const b = $('#showcase-btn'); if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Bấm lần nữa để nạp mẫu'; setTimeout(() => { delete b.dataset.armed; b.textContent = '✨ Vườn thú mẫu của Dev'; }, 3000); return; }
    onShowcase?.();
  });
  $('#tips-close').addEventListener('click', () => { $('#tips').hidden = true; S().seenTips = true; });
  if (S().seenTips) $('#tips').hidden = true;
  if (sim.admin) { document.body.classList.add('admin'); $('#admin-exit').hidden = false; }

  // Redraw: the top bar four times a second, panels twice (not while being touched; build lists only when asked).
  let acc = 0; let slow = 0;
  function tick(dt) {
    acc += dt; slow += dt;
    if (acc > 0.25) { acc = 0; renderHud(); }
    if (slow > 0.5) {
      slow = 0;
      if (ui.sel && !busy(panel)) { const top = panel.scrollTop; renderPanel(); panel.scrollTop = top; }
      if (ui.drawer && !busy(drawer) && !['build', 'services', 'fence', 'paint', 'path', 'remove', 'zoo'].includes(ui.drawer)) { const top = drawer.scrollTop; renderDrawer(); drawer.scrollTop = top; }
    }
  }
  return { ui, onTap, onHover, onPaint, painting, renderPanel, renderDrawer, renderHud, toast, floatText, tick, setMode, openDrawer, select };
}
