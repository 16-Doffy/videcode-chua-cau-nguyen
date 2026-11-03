// Third's Zoo: the world's numbers. One place to tune the game. Lengths in metres, days are zoo days (60 s at 1×).

export const START_MONEY = 30000;
export const START_CC = 40; // conservation points: earned by releasing animals, spent on endangered ones
export const DAY_SECONDS = 60;
export const MAP = { half: 70, build: 64, cell: 0.5 }; // land from −70 to 70; building stays inside ±64
export const ENTRANCE = { x: 0, z: 63 };
export const STARTER_PATH = [[0, 63], [0, 44]];
export const PATH_WIDTH = 3;
export const PATH_COST = 6; // coins a metre
export const MAX_GUESTS = 220;

// Ground a habitat can be painted with. Index = the value stored in the terrain grid.
export const TERRAIN = [
  { id: 'grass', name: 'Cỏ', color: 0x78b155 },
  { id: 'soil', name: 'Đất khô', color: 0xa27f52 },
  { id: 'sand', name: 'Cát', color: 0xdcc38c },
  { id: 'snow', name: 'Tuyết', color: 0xeef4f8 },
  { id: 'rock', name: 'Sỏi đá', color: 0x8f9298 },
];
export const TERRAIN_INDEX = Object.fromEntries(TERRAIN.map((t, i) => [t.id, i]));

// Plants by the kind of land they come from; a species wants its own kind.
export const PLANTS = {
  savanna: { name: 'Cây keo', land: 'Thảo nguyên' },
  bamboo: { name: 'Bụi tre', land: 'Rừng tre' },
  forest: { name: 'Cây thông', land: 'Rừng ôn đới' },
  polar: { name: 'Khối băng', land: 'Băng giá' },
};

export const STATUS = {
  LC: { name: 'Ít lo ngại', release: 15 },
  VU: { name: 'Sắp nguy cấp', release: 40 },
  EN: { name: 'Nguy cấp', release: 80 },
};

/*
 * area: m² of land each adult needs. water: share of the habitat that should be water. terrain: [ground, share of
 * the land it likes]. plants: [kind, how many per 100 m²]. shelter: room it takes (a shelter holds 4).
 * barrier: fence grade it cannot get over. group: [min, max]; males: most adult males that get along.
 * likes: enrichment it enjoys, enrich: how many different it wants. food: coins a day. Ages in days.
 * cc: endangered ones are bought with conservation points instead of coins.
 */
export const SPECIES = [
  { id: 'penguin', name: 'Chim cánh cụt', price: 600, status: 'LC', appeal: 6, size: 0.7,
    area: 6, water: 0.3, terrain: ['snow', 0.6], plants: ['polar', 1], shelter: 0.5, barrier: 1, group: [4, 14], males: 7,
    likes: ['ball', 'icetreat'], enrich: 1, food: 4, life: 40, adult: 6, gestation: 3, litter: [1, 2],
    blurb: 'Sống theo đàn đông, cần nhiều nước lạnh để bơi và nền tuyết.' },
  { id: 'zebra', name: 'Ngựa vằn', price: 900, status: 'LC', appeal: 8, size: 1.2,
    area: 25, water: 0.06, terrain: ['soil', 0.4], plants: ['savanna', 0.8], shelter: 1, barrier: 1, group: [3, 9], males: 1,
    likes: ['hayball', 'ball', 'feeder'], enrich: 1, food: 6, life: 60, adult: 8, gestation: 5, litter: [1, 1],
    blurb: 'Hiền, sống theo bầy một đực nhiều cái, thích đất khô.' },
  { id: 'redpanda', name: 'Gấu trúc đỏ', price: 0, cc: 50, status: 'EN', appeal: 10, size: 0.6, climber: true,
    area: 12, water: 0.03, terrain: ['grass', 0.5], plants: ['bamboo', 2], shelter: 0.5, barrier: 2, group: [1, 3], males: 1,
    likes: ['climb', 'ball'], enrich: 2, food: 4, life: 45, adult: 6, gestation: 4, litter: [1, 2],
    blurb: 'Nhút nhát, leo trèo giỏi: cần khung leo, nhiều tre và rào cao.' },
  { id: 'giraffe', name: 'Hươu cao cổ', price: 1600, status: 'VU', appeal: 11, size: 1.6,
    area: 35, water: 0.05, terrain: ['soil', 0.4], plants: ['savanna', 0.8], shelter: 1.5, barrier: 2, group: [2, 8], males: 1,
    likes: ['feeder', 'hayball'], enrich: 1, food: 9, life: 70, adult: 10, gestation: 7, litter: [1, 1],
    blurb: 'Cao nhất vườn, cần rào cao và giỏ lá treo.' },
  { id: 'bear', name: 'Gấu nâu', price: 2200, status: 'LC', appeal: 12, size: 1.3, predator: true,
    area: 40, water: 0.12, terrain: ['grass', 0.4], plants: ['forest', 1], shelter: 1.5, barrier: 3, group: [1, 3], males: 1,
    likes: ['scratch', 'icetreat', 'climb'], enrich: 2, food: 10, life: 70, adult: 9, gestation: 6, litter: [1, 2],
    blurb: 'Khỏe, thích suối và rừng thông. Phải có rào thép.' },
  { id: 'lion', name: 'Sư tử', price: 2600, status: 'VU', appeal: 15, size: 1.3, predator: true,
    area: 35, water: 0.05, terrain: ['sand', 0.4], plants: ['savanna', 0.6], shelter: 1.2, barrier: 3, group: [2, 7], males: 1,
    likes: ['scratch', 'ball', 'icetreat'], enrich: 2, food: 12, life: 60, adult: 8, gestation: 4, litter: [1, 3],
    blurb: 'Vua thảo nguyên. Ăn thịt: đừng nhốt chung thú khác.' },
  { id: 'panda', name: 'Gấu trúc', price: 3800, status: 'VU', appeal: 18, size: 1.2, climber: true,
    area: 30, water: 0.05, terrain: ['grass', 0.5], plants: ['bamboo', 2], shelter: 1.5, barrier: 2, group: [1, 2], males: 1,
    likes: ['climb', 'ball'], enrich: 2, food: 10, life: 80, adult: 10, gestation: 6, litter: [1, 1],
    blurb: 'Ngôi sao của vườn, sống một mình, ăn tre suốt ngày.' },
  { id: 'elephant', name: 'Voi châu Phi', price: 0, cc: 140, status: 'EN', appeal: 22, size: 2.0,
    area: 60, water: 0.12, terrain: ['soil', 0.5], plants: ['savanna', 0.5], shelter: 3, barrier: 3, group: [2, 6], males: 1,
    likes: ['mud', 'hayball', 'feeder'], enrich: 2, food: 18, life: 120, adult: 14, gestation: 10, litter: [1, 1],
    blurb: 'Thông minh, cần đất rộng, nước và vũng bùn.' },
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// Things placed inside a habitat. w × d in metres; kind tells which need they meet; research: what unlocks it.
export const ITEMS = {
  pool: { name: 'Hồ nước', w: 4, d: 3, cost: 350, kind: 'water', note: 'Chỗ uống và tắm, 12 m² mặt nước.' },
  bigpool: { name: 'Hồ lớn', w: 6, d: 5, cost: 800, kind: 'water', note: '30 m² mặt nước, cho voi, gấu, chim cánh cụt.' },
  shelter: { name: 'Nhà trú', w: 3, d: 3, cost: 450, kind: 'shelter', note: 'Chỗ nghỉ tránh nắng mưa, chứa khoảng 4 con cỡ vừa.' },
  plant_savanna: { name: 'Cây keo', w: 1.5, d: 1.5, cost: 60, kind: 'plant', plant: 'savanna', note: 'Cây của thảo nguyên.' },
  plant_bamboo: { name: 'Bụi tre', w: 1.5, d: 1.5, cost: 60, kind: 'plant', plant: 'bamboo', note: 'Cây của rừng tre.' },
  plant_forest: { name: 'Cây thông', w: 1.5, d: 1.5, cost: 60, kind: 'plant', plant: 'forest', note: 'Cây của rừng ôn đới.' },
  plant_polar: { name: 'Khối băng', w: 1.5, d: 1.5, cost: 60, kind: 'plant', plant: 'polar', note: 'Vật trang trí vùng băng giá.' },
  rock: { name: 'Tảng đá', w: 1.2, d: 1.2, cost: 40, kind: 'deco', note: 'Trang trí, khách thích chuồng có đá.' },
  ball: { name: 'Bóng lớn', w: 1, d: 1, cost: 120, kind: 'enrich', note: 'Đồ chơi cho nhiều loài.' },
  hayball: { name: 'Bóng cỏ khô', w: 1, d: 1, cost: 150, kind: 'enrich', research: 'herb', note: 'Thú ăn cỏ vừa chơi vừa ăn.' },
  feeder: { name: 'Giỏ lá treo cao', w: 1, d: 1, cost: 180, kind: 'enrich', research: 'herb', note: 'Hươu, voi, ngựa vằn thích vươn lấy lá.' },
  mud: { name: 'Vũng bùn', w: 3, d: 3, cost: 200, kind: 'enrich', research: 'herb', note: 'Voi tắm bùn cho mát da.' },
  scratch: { name: 'Cột cào móng', w: 1, d: 1, cost: 140, kind: 'enrich', research: 'carn', note: 'Sư tử, gấu mài móng.' },
  icetreat: { name: 'Khối đá có cá', w: 1, d: 1, cost: 160, kind: 'enrich', research: 'carn', note: 'Món mát lạnh cho gấu, sư tử, chim cánh cụt.' },
  climb: { name: 'Khung leo', w: 2.5, d: 2.5, cost: 260, kind: 'enrich', research: 'climb', note: 'Cho thú leo trèo: gấu trúc, gấu trúc đỏ, gấu.' },
};
export const BUILD_ORDER = ['pool', 'bigpool', 'shelter', 'plant_savanna', 'plant_bamboo', 'plant_forest', 'plant_polar', 'rock', 'ball', 'hayball', 'feeder', 'mud', 'scratch', 'icetreat', 'climb'];

// Fence grades: price a metre. Drawn round a habitat; a grade lower than an animal's lets it get out.
export const BARRIERS = [
  null,
  { name: 'Rào gỗ thấp', perM: 12, height: 1.2, post: 0x7a5232, rail: 0x9a6b41 },
  { name: 'Rào gỗ cao', perM: 25, height: 2.0, post: 0x6a4428, rail: 0x8a5c36 },
  { name: 'Rào thép', perM: 45, height: 2.6, post: 0x56606a, rail: 0x7d8893, research: 'steel' },
];
export const MIN_HABITAT = 40; // m²

// Guest facilities, built beside a path. serves: about how many guests one can look after.
export const FACILITIES = {
  food: { name: 'Quầy đồ ăn', cost: 900, upkeep: 40, serves: 45, price: 8, color: 0xe94b5b, note: 'Khách đói thì tìm đến mua.' },
  drink: { name: 'Quầy nước', cost: 600, upkeep: 25, serves: 45, price: 4, color: 0x3a7bd5, note: 'Nước mát, bán chạy ngày nắng.' },
  toilet: { name: 'Nhà vệ sinh', cost: 700, upkeep: 30, serves: 55, note: 'Thiếu là khách khó chịu nhất.' },
  bench: { name: 'Ghế nghỉ', cost: 150, upkeep: 2, serves: 30, note: 'Khách đi lâu cần ngồi nghỉ.' },
  bin: { name: 'Thùng rác', cost: 80, upkeep: 1, serves: 25, note: 'Khách gần thùng rác thì không xả rác.' },
  gift: { name: 'Cửa hàng lưu niệm', cost: 1500, upkeep: 50, serves: 60, price: 15, color: 0x9b59b6, research: 'gift', note: 'Khách vui đi ngang thì mua quà.' },
};
export const FACILITY_ORDER = ['food', 'drink', 'toilet', 'bench', 'bin', 'gift'];
export const SHOPS = ['food', 'drink', 'gift'];

export const STAFF = {
  keeper: { name: 'Nhân viên chăm thú', salary: 70, note: 'Cho ăn, thay nước, dọn chuồng. Mỗi người lo 2 chuồng có lối vào.', per: 2 },
  vet: { name: 'Bác sĩ thú y', salary: 120, note: 'Chữa thú ốm (3 con một ngày) và nghiên cứu về thú.', per: 3 },
  mechanic: { name: 'Thợ máy', salary: 90, note: 'Bảo trì quầy và nhà vệ sinh (5 chỗ), nghiên cứu về cơ sở.', per: 5 },
  janitor: { name: 'Lao công', salary: 45, note: 'Nhặt rác trên lối đi.', per: 1 },
  security: { name: 'Bảo vệ', salary: 80, note: 'Bắt thú xổng chuồng nhanh, khách đỡ hoảng.', per: 1 },
};
export const STAFF_ORDER = ['keeper', 'vet', 'mechanic', 'janitor', 'security'];

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

export const NAMES = ['Bơ', 'Mít', 'Na', 'Su', 'Bin', 'Tít', 'Mây', 'Nắng', 'Gạo', 'Cốm', 'Kem', 'Đậu', 'Mochi', 'Sún', 'Bông', 'Tiêu',
  'Gừng', 'Khoai', 'Ổi', 'Mận', 'Sóc', 'Bột', 'Xoài', 'Nhím', 'Mèo', 'Cam', 'Chanh', 'Lúa', 'Sen', 'Bắp', 'Vừng', 'Me', 'Cà Phê', 'Muối'];
export const GUEST_NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hoa', 'Hùng', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai',
  'Minh', 'Nam', 'Ngọc', 'Nhung', 'Phong', 'Phúc', 'Quang', 'Quyên', 'Sơn', 'Tâm', 'Thảo', 'Thắng', 'Trang', 'Trung', 'Tú', 'Tuấn', 'Vy', 'Yến'];
