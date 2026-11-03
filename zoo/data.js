// Third's Zoo: the world's numbers. One place to tune the game.

export const START_MONEY = 6000;
export const DAY_SECONDS = 60; // one zoo day, at 1×
export const TICKET = 3; // coins a guest pays each 10 s while in the zoo

export const BIOMES = {
  savanna: { name: 'Thảo nguyên', ground: 0xd9b46a, edge: 0xa98444, water: 0x5aa7c7, note: 'Nắng, cỏ khô, cây keo' },
  bamboo: { name: 'Rừng tre', ground: 0x7fae5c, edge: 0x4d7a3a, water: 0x4fa3a0, note: 'Ẩm, mát, nhiều tre' },
  polar: { name: 'Băng giá', ground: 0xeaf3fa, edge: 0xa9c9e0, water: 0x2f7fb8, note: 'Băng, đá và hồ lạnh' },
  forest: { name: 'Rừng ôn đới', ground: 0x5f8f4c, edge: 0x3a5a2e, water: 0x3f86a8, note: 'Cây thông, suối và đá' },
};

// group: how many it likes to live with [min, max]. appeal: how much guests come to see one.
// unlock: zoo rating (stars) needed to buy. upkeep: coins each zoo day.
export const SPECIES = [
  { id: 'penguin', name: 'Chim cánh cụt', biome: 'polar', price: 700, upkeep: 20, appeal: 7, group: [4, 12], unlock: 0, size: 0.7,
    blurb: 'Thích sống theo đàn đông, cần nước lạnh.' },
  { id: 'zebra', name: 'Ngựa vằn', biome: 'savanna', price: 900, upkeep: 25, appeal: 6, group: [3, 8], unlock: 0, size: 1.2,
    blurb: 'Hiền, sống theo bầy, ăn cỏ cả ngày.' },
  { id: 'redpanda', name: 'Gấu trúc đỏ', biome: 'bamboo', price: 1200, upkeep: 30, appeal: 8, group: [1, 4], unlock: 1, size: 0.6,
    blurb: 'Nhút nhát, thích leo cây và lá tre non.' },
  { id: 'giraffe', name: 'Hươu cao cổ', biome: 'savanna', price: 1600, upkeep: 40, appeal: 9, group: [2, 6], unlock: 1, size: 1.6,
    blurb: 'Cao nhất vườn, ăn lá trên ngọn cây keo.' },
  { id: 'bear', name: 'Gấu nâu', biome: 'forest', price: 2200, upkeep: 55, appeal: 12, group: [1, 3], unlock: 1, size: 1.3,
    blurb: 'Khỏe, thích suối và bắt cá.' },
  { id: 'lion', name: 'Sư tử', biome: 'savanna', price: 2500, upkeep: 60, appeal: 14, group: [2, 5], unlock: 2, size: 1.3,
    blurb: 'Vua thảo nguyên, ngủ nhiều, sống theo bầy nhỏ.' },
  { id: 'panda', name: 'Gấu trúc', biome: 'bamboo', price: 3500, upkeep: 70, appeal: 16, group: [1, 3], unlock: 2, size: 1.2,
    blurb: 'Ngôi sao của mọi vườn thú, ăn tre suốt ngày.' },
  { id: 'elephant', name: 'Voi châu Phi', biome: 'savanna', price: 4000, upkeep: 90, appeal: 18, group: [2, 6], unlock: 3, size: 2.0,
    blurb: 'Thông minh, cần nhiều chỗ và nước để tắm.' },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// Seven plots around the plaza, each 12 × 12, centre (x, z). The south side is the entrance.
// The first is cheap so the start is easy.
export const PLOT_SIZE = 12;
export const PLOTS = [
  { x: -17, z: -17 }, { x: 0, z: -19 }, { x: 17, z: -17 },
  { x: -19, z: 0 }, { x: 19, z: 0 },
  { x: -17, z: 17 }, { x: 17, z: 17 },
];
export const plotPrice = (owned) => [800, 1500, 2200, 3000, 4000, 5200, 6500][owned] ?? 8000;

// Where guests walk: in at the gate, round the ring by the plots, back out.
export const GATE = { x: 0, z: 36 };
export const RING = 8.5;

export const CARE = {
  feed: { cost: 15, label: 'Cho ăn', perAnimal: true },
  clean: { cost: 40, label: 'Dọn chuồng' },
  toy: { cost: 120, label: 'Đồ chơi' },
};
