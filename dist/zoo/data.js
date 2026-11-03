// Third's Zoo: the world's numbers. One place to tune the game. Days are zoo days (60 s at 1×).

export const START_MONEY = 15000;
export const START_CC = 40; // conservation points: earned by releasing animals, spent on endangered ones
export const DAY_SECONDS = 60;
export const PLOT_SIZE = 12; // a habitat is a 12 × 12 grid of cells
export const GATE = { x: 0, z: 36 };
export const RING = 8.5;

export const BIOMES = {
  savanna: { name: 'Thảo nguyên', ground: 0xd9b46a, edge: 0xa98444, water: 0x5aa7c7, note: 'Nắng, cỏ khô, cây keo' },
  bamboo: { name: 'Rừng tre', ground: 0x7fae5c, edge: 0x4d7a3a, water: 0x4fa3a0, note: 'Ẩm, mát, nhiều tre' },
  polar: { name: 'Băng giá', ground: 0xeaf3fa, edge: 0xa9c9e0, water: 0x2f7fb8, note: 'Băng, đá và hồ lạnh' },
  forest: { name: 'Rừng ôn đới', ground: 0x5f8f4c, edge: 0x3a5a2e, water: 0x3f86a8, note: 'Cây thông, suối và đá' },
};

// IUCN-style status: how threatened in the wild. Releasing one earns that many conservation points.
export const STATUS = {
  LC: { name: 'Ít lo ngại', release: 15 },
  VU: { name: 'Sắp nguy cấp', release: 40 },
  EN: { name: 'Nguy cấp', release: 80 },
};

/*
 * area: land cells each animal needs. water: share of the habitat that should be water. plants: biome plants the
 * habitat needs. shelter: room it takes in a shelter (a shelter holds 4). barrier: fence grade it cannot escape.
 * group: [min, max] it likes to live with; males: most adult males that get along. likes: enrichment it enjoys,
 * enrich: how many different of those it wants. food: coins a day to feed one. Ages in days.
 * cc: endangered ones are bought with conservation points instead of coins.
 */
export const SPECIES = [
  { id: 'penguin', name: 'Chim cánh cụt', biome: 'polar', price: 600, status: 'LC', appeal: 6, size: 0.7,
    area: 5, water: 0.25, plants: 2, shelter: 0.5, barrier: 1, group: [4, 14], males: 7, likes: ['ball', 'icetreat'], enrich: 1,
    food: 4, life: 40, adult: 6, gestation: 3, litter: [1, 2], blurb: 'Sống theo đàn đông, cần nhiều nước lạnh để bơi.' },
  { id: 'zebra', name: 'Ngựa vằn', biome: 'savanna', price: 900, status: 'LC', appeal: 8, size: 1.2,
    area: 14, water: 0.08, plants: 2, shelter: 1, barrier: 1, group: [3, 9], males: 1, likes: ['hayball', 'ball', 'feeder'], enrich: 1,
    food: 6, life: 60, adult: 8, gestation: 5, litter: [1, 1], blurb: 'Hiền, sống theo bầy một đực nhiều cái.' },
  { id: 'redpanda', name: 'Gấu trúc đỏ', biome: 'bamboo', price: 0, cc: 50, status: 'EN', appeal: 10, size: 0.6,
    area: 7, water: 0.03, plants: 3, shelter: 0.5, barrier: 2, group: [1, 3], males: 1, likes: ['climb', 'ball'], enrich: 2, climber: true,
    food: 4, life: 45, adult: 6, gestation: 4, litter: [1, 2], blurb: 'Nhút nhát, leo trèo giỏi: cần khung leo và rào cao.' },
  { id: 'giraffe', name: 'Hươu cao cổ', biome: 'savanna', price: 1600, status: 'VU', appeal: 11, size: 1.6,
    area: 20, water: 0.05, plants: 2, shelter: 1.5, barrier: 2, group: [2, 8], males: 1, likes: ['feeder', 'hayball'], enrich: 1,
    food: 9, life: 70, adult: 10, gestation: 7, litter: [1, 1], blurb: 'Cao nhất vườn, cần rào cao và giỏ lá treo.' },
  { id: 'bear', name: 'Gấu nâu', biome: 'forest', price: 2200, status: 'LC', appeal: 12, size: 1.3, predator: true,
    area: 24, water: 0.12, plants: 3, shelter: 1.5, barrier: 3, group: [1, 3], males: 1, likes: ['scratch', 'icetreat', 'climb'], enrich: 2,
    food: 10, life: 70, adult: 9, gestation: 6, litter: [1, 2], blurb: 'Khỏe, thích suối. Phải có rào thép.' },
  { id: 'lion', name: 'Sư tử', biome: 'savanna', price: 2600, status: 'VU', appeal: 15, size: 1.3, predator: true,
    area: 22, water: 0.05, plants: 2, shelter: 1.2, barrier: 3, group: [2, 7], males: 1, likes: ['scratch', 'ball', 'icetreat'], enrich: 2,
    food: 12, life: 60, adult: 8, gestation: 4, litter: [1, 3], blurb: 'Vua thảo nguyên. Ăn thịt: đừng nhốt chung thú khác.' },
  { id: 'panda', name: 'Gấu trúc', biome: 'bamboo', price: 3800, status: 'VU', appeal: 18, size: 1.2,
    area: 20, water: 0.05, plants: 4, shelter: 1.5, barrier: 2, group: [1, 2], males: 1, likes: ['climb', 'ball'], enrich: 2, climber: true,
    food: 10, life: 80, adult: 10, gestation: 6, litter: [1, 1], blurb: 'Ngôi sao của vườn, sống một mình, ăn tre suốt ngày.' },
  { id: 'elephant', name: 'Voi châu Phi', biome: 'savanna', price: 0, cc: 140, status: 'EN', appeal: 22, size: 2.0,
    area: 30, water: 0.15, plants: 2, shelter: 3, barrier: 3, group: [2, 6], males: 1, likes: ['mud', 'hayball', 'feeder'], enrich: 2,
    food: 18, life: 120, adult: 14, gestation: 10, litter: [1, 1], blurb: 'Thông minh, cần đất rộng, nước và vũng bùn.' },
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// Things placed on a habitat's cells. kind tells which need they meet; research: the project that unlocks it.
export const ITEMS = {
  pool: { name: 'Hồ nước', w: 3, d: 2, cost: 300, kind: 'water', note: 'Chỗ uống và tắm. Tính vào diện tích nước.' },
  shelter: { name: 'Nhà trú', w: 2, d: 2, cost: 450, kind: 'shelter', note: 'Chỗ nghỉ tránh nắng mưa, chứa khoảng 4 con cỡ vừa.' },
  plant: { name: 'Cây theo môi trường', w: 1, d: 1, cost: 60, kind: 'plant', note: 'Keo, tre, thông hay khối băng tùy chuồng.' },
  rock: { name: 'Tảng đá', w: 1, d: 1, cost: 40, kind: 'deco', note: 'Trang trí, khách thích chuồng có đá.' },
  ball: { name: 'Bóng lớn', w: 1, d: 1, cost: 120, kind: 'enrich', note: 'Đồ chơi cho nhiều loài.' },
  hayball: { name: 'Bóng cỏ khô', w: 1, d: 1, cost: 150, kind: 'enrich', research: 'herb', note: 'Thú ăn cỏ vừa chơi vừa ăn.' },
  feeder: { name: 'Giỏ lá treo cao', w: 1, d: 1, cost: 180, kind: 'enrich', research: 'herb', note: 'Hươu, voi, ngựa vằn thích vươn lấy lá.' },
  mud: { name: 'Vũng bùn', w: 2, d: 2, cost: 200, kind: 'enrich', research: 'herb', note: 'Voi tắm bùn cho mát da.' },
  scratch: { name: 'Cột cào móng', w: 1, d: 1, cost: 140, kind: 'enrich', research: 'carn', note: 'Sư tử, gấu mài móng.' },
  icetreat: { name: 'Khối đá có cá', w: 1, d: 1, cost: 160, kind: 'enrich', research: 'carn', note: 'Món mát lạnh cho gấu, sư tử, chim cánh cụt.' },
  climb: { name: 'Khung leo', w: 2, d: 2, cost: 260, kind: 'enrich', research: 'climb', note: 'Cho thú leo trèo: gấu trúc, gấu trúc đỏ, gấu.' },
};
export const BUILD_ORDER = ['pool', 'shelter', 'plant', 'rock', 'ball', 'hayball', 'feeder', 'mud', 'scratch', 'icetreat', 'climb'];

export const BARRIERS = [
  null,
  { name: 'Rào gỗ thấp', cost: 0, height: 1.2, post: 0x7a5232, rail: 0x9a6b41 },
  { name: 'Rào gỗ cao', cost: 700, height: 2.0, post: 0x6a4428, rail: 0x8a5c36 },
  { name: 'Rào thép', cost: 1400, height: 2.6, post: 0x56606a, rail: 0x7d8893, research: 'steel' },
];

// Guest facilities, built on the free spots beside the paths. serves: guests one can look after.
export const FACILITIES = {
  food: { name: 'Quầy đồ ăn', cost: 900, upkeep: 40, serves: 45, price: 8, buy: 0.45, color: 0xe94b5b, note: 'Khách đói thì mua ăn.' },
  drink: { name: 'Quầy nước', cost: 600, upkeep: 25, serves: 45, price: 4, buy: 0.6, color: 0x3a7bd5, note: 'Nước mát, bán chạy ngày nắng.' },
  toilet: { name: 'Nhà vệ sinh', cost: 700, upkeep: 30, serves: 55, note: 'Thiếu là khách khó chịu nhất.' },
  bench: { name: 'Ghế nghỉ', cost: 150, upkeep: 2, serves: 30, note: 'Khách đi lâu cần ngồi nghỉ.' },
  bin: { name: 'Thùng rác', cost: 80, upkeep: 1, serves: 25, note: 'Giảm rác, nhất là gần quầy ăn.' },
  gift: { name: 'Cửa hàng lưu niệm', cost: 1500, upkeep: 50, serves: 60, price: 15, buy: 0.15, color: 0x9b59b6, research: 'gift', note: 'Khách vui thì mua quà.' },
};
export const FACILITY_ORDER = ['food', 'drink', 'toilet', 'bench', 'bin', 'gift'];
export const SHOPS = ['food', 'drink', 'gift'];

// Free spots beside the paths where facilities go.
export const SLOTS = [
  [3.4, 14], [-3.4, 14], [3.4, 20], [-3.4, 20], [3.4, 26], [-3.4, 26], [3.4, 31], [-3.4, 31],
  [5.6, 5.6], [-5.6, 5.6], [5.6, -5.6], [-5.6, -5.6],
  [-11.4, -4], [-11.4, 4], [11.4, -4], [11.4, 4], [-4.5, -11.4], [4.5, -11.4],
].map(([x, z]) => ({ x, z }));

export const STAFF = {
  keeper: { name: 'Nhân viên chăm thú', salary: 70, note: 'Cho ăn, thay nước, dọn chuồng. Mỗi người lo 2 chuồng.', per: 2 },
  vet: { name: 'Bác sĩ thú y', salary: 120, note: 'Chữa thú ốm (3 con một ngày) và nghiên cứu về thú.', per: 3 },
  mechanic: { name: 'Thợ máy', salary: 90, note: 'Bảo trì quầy và nhà vệ sinh (5 chỗ), nghiên cứu về cơ sở.', per: 5 },
  janitor: { name: 'Lao công', salary: 45, note: 'Nhặt rác cho khoảng 60 khách.', per: 60 },
  security: { name: 'Bảo vệ', salary: 80, note: 'Bắt thú xổng chuồng nhanh, khách đỡ hoảng.', per: 1 },
};
export const STAFF_ORDER = ['keeper', 'vet', 'mechanic', 'janitor', 'security'];

// Research: vets earn points about animals, mechanics about buildings.
export const RESEARCH = {
  herb: { name: 'Đồ chơi cho thú ăn cỏ', track: 'vet', cost: 20, unlocks: 'Bóng cỏ khô, giỏ lá treo cao, vũng bùn' },
  carn: { name: 'Đồ chơi cho thú ăn thịt', track: 'vet', cost: 20, unlocks: 'Cột cào móng, khối đá có cá' },
  climb: { name: 'Khung leo', track: 'vet', cost: 25, unlocks: 'Khung leo cho thú leo trèo' },
  board: { name: 'Bảng giáo dục', track: 'vet', cost: 15, unlocks: 'Bảng thông tin cạnh chuồng, khách quyên góp nhiều hơn' },
  medicine: { name: 'Thuốc thú y tốt hơn', track: 'vet', cost: 35, unlocks: 'Thú ít ốm hơn, khỏi bệnh nhanh hơn' },
  steel: { name: 'Hàng rào thép', track: 'mech', cost: 25, unlocks: 'Rào thép cho sư tử, gấu, voi' },
  gift: { name: 'Cửa hàng lưu niệm', track: 'mech', cost: 20, unlocks: 'Cửa hàng lưu niệm' },
  durable: { name: 'Quầy bền hơn', track: 'mech', cost: 30, unlocks: 'Quầy và nhà vệ sinh hỏng chậm gấp đôi' },
};
export const RESEARCH_ORDER = ['herb', 'carn', 'climb', 'board', 'medicine', 'steel', 'gift', 'durable'];
export const BOARD_COST = 250;

// The career goals of this zoo, in three tiers. Each tier done pays a reward.
export const GOALS = [
  { tier: 1, reward: { money: 3000, cc: 20 }, items: [
    { id: 'herd', text: 'Có một chuồng nuôi ít nhất 3 con thú' },
    { id: 'keeper', text: 'Thuê một nhân viên chăm thú' },
    { id: 'guests40', text: 'Đón 40 khách cùng lúc' },
  ] },
  { tier: 2, reward: { money: 6000, cc: 40 }, items: [
    { id: 'species3', text: 'Nuôi 3 loài khác nhau' },
    { id: 'basics', text: 'Có quầy đồ ăn, quầy nước và nhà vệ sinh' },
    { id: 'research1', text: 'Hoàn thành một nghiên cứu' },
    { id: 'profit', text: 'Lãi ít nhất 1.000 xu trong một ngày' },
  ] },
  { tier: 3, reward: { money: 12000, cc: 80 }, items: [
    { id: 'birth', text: 'Có thú con chào đời' },
    { id: 'release', text: 'Thả một con thú về tự nhiên' },
    { id: 'welfare75', text: 'Phúc lợi trung bình của thú từ 75%' },
    { id: 'guests150', text: 'Đón 150 khách cùng lúc' },
  ] },
];

// Seven habitats round the plaza, centre (x, z). The south side is the entrance.
export const PLOTS = [
  { x: -17, z: -17 }, { x: 0, z: -19 }, { x: 17, z: -17 },
  { x: -19, z: 0 }, { x: 19, z: 0 },
  { x: -17, z: 17 }, { x: 17, z: 17 },
];
export const plotPrice = (owned) => [800, 1500, 2400, 3500, 5000, 6500, 8000][owned] ?? 9000;

export const NAMES = ['Bơ', 'Mít', 'Na', 'Su', 'Bin', 'Tít', 'Mây', 'Nắng', 'Gạo', 'Cốm', 'Kem', 'Đậu', 'Mochi', 'Sún', 'Bông', 'Tiêu',
  'Gừng', 'Khoai', 'Ổi', 'Mận', 'Sóc', 'Bột', 'Xoài', 'Nhím', 'Mèo', 'Cam', 'Chanh', 'Lúa', 'Sen', 'Bắp', 'Vừng', 'Me', 'Cà Phê', 'Muối'];
