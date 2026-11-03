// Developer Showcase Zoo: a thriving, beautifully designed 3D zoo layout.
// Created by the game developer with full habitats, paths, facilities, staff, and animals.

export function buildShowcase(sim) {
  const A = sim.actions;
  // Temporarily supply dev builder funds
  sim.state.money = 1000000;
  sim.state.cc = 1000;

  // 1. Walkable circular grid path network
  A.addPath([0, 44], [0, 22]);
  A.addPath([0, 22], [0, 0]);
  A.addPath([0, 22], [24, 22]);
  A.addPath([0, 22], [-24, 22]);
  A.addPath([0, 44], [24, 44]);
  A.addPath([0, 44], [-24, 44]);
  A.addPath([24, 44], [24, 22]);
  A.addPath([-24, 44], [-24, 22]);
  A.addPath([0, 0], [24, 0]);
  A.addPath([0, 0], [-24, 0]);
  A.addPath([24, 22], [24, 0]);
  A.addPath([-24, 22], [-24, 0]);

  // 2. Unlocked researches
  ['herb', 'carn', 'climb', 'board', 'gift', 'medicine', 'steel', 'durable'].forEach((r) => {
    if (!sim.state.research.done.includes(r)) sim.state.research.done.push(r);
  });

  // 3. Four custom habitats
  // North-East: Savanna
  const h1 = A.createHabitat([[3, 41], [21, 41], [21, 25], [3, 25]], 2);
  // North-West: Bamboo Forest
  const h2 = A.createHabitat([[-3, 41], [-21, 41], [-21, 25], [-3, 25]], 2);
  // South-East: Temperate Forest
  const h3 = A.createHabitat([[3, 19], [21, 19], [21, 3], [3, 3]], 3);
  // South-West: Polar Region
  const h4 = A.createHabitat([[-3, 19], [-21, 19], [-21, 3], [-3, 3]], 1);

  // 4. Paint biome ground
  const paintBox = (x0, z0, x1, z1, t) => {
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) A.paint(x, z, 1.8, t);
  };
  paintBox(4, 26, 20, 40, 'soil');
  paintBox(14, 26, 20, 34, 'sand');
  paintBox(-20, 26, -4, 40, 'grass');
  paintBox(4, 4, 20, 18, 'soil');
  paintBox(14, 4, 20, 12, 'rock');
  paintBox(-20, 4, -4, 18, 'snow');
  paintBox(-10, 4, -4, 10, 'rock');

  // 5. Items, shelters, enrichment
  if (h1) {
    A.placeItem(h1.id, 'bigpool', 15, 33);
    A.placeItem(h1.id, 'shelter', 7, 36);
    A.placeItem(h1.id, 'feeder', 7, 28);
    A.placeItem(h1.id, 'hayball', 17, 38);
    A.placeItem(h1.id, 'mud', 11, 28);
    A.placeItem(h1.id, 'plant_savanna', 11, 38);
    A.buildBoard(h1.id);
  }
  if (h2) {
    A.placeItem(h2.id, 'pool', -15, 33);
    A.placeItem(h2.id, 'shelter', -7, 36);
    A.placeItem(h2.id, 'climb', -16, 28);
    A.placeItem(h2.id, 'ball', -10, 36);
    A.placeItem(h2.id, 'plant_bamboo', -7, 28);
    A.placeItem(h2.id, 'plant_bamboo', -11, 29);
    A.buildBoard(h2.id);
  }
  if (h3) {
    A.placeItem(h3.id, 'pool', 15, 11);
    A.placeItem(h3.id, 'shelter', 7, 15);
    A.placeItem(h3.id, 'scratch', 17, 15);
    A.placeItem(h3.id, 'rock', 16, 6);
    A.placeItem(h3.id, 'plant_forest', 7, 7);
    A.placeItem(h3.id, 'plant_forest', 11, 16);
    A.buildBoard(h3.id);
  }
  if (h4) {
    A.placeItem(h4.id, 'bigpool', -14, 11);
    A.placeItem(h4.id, 'shelter', -7, 15);
    A.placeItem(h4.id, 'icetreat', -16, 15);
    A.placeItem(h4.id, 'ball', -16, 6);
    A.placeItem(h4.id, 'plant_polar', -7, 7);
    A.buildBoard(h4.id);
  }

  // 6. Guest facilities along perimeter paths
  A.buildFacility('food', 12, 46);
  A.buildFacility('drink', -12, 46);
  A.buildFacility('toilet', -26, 22);
  A.buildFacility('gift', 26, 22);
  A.buildFacility('bench', -26, 33);
  A.buildFacility('bench', 26, 33);
  A.buildFacility('bin', -26, 26);
  A.buildFacility('bin', 26, 26);
  A.buildFacility('toilet', 12, -2);
  A.buildFacility('food', -12, -2);

  // 7. Full professional staff
  A.hire('keeper');
  A.hire('keeper');
  A.hire('vet');
  A.hire('mechanic');
  A.hire('janitor');
  A.hire('security');

  // 8. Animals
  const addA = (species, sex, age, hid) => {
    if (!hid) return;
    const m = { id: sim.state.nextId++, species, sex, age };
    sim.state.market.push(m);
    A.buyAnimal(m.id, hid);
  };
  if (h1) {
    addA('zebra', 'M', 12, h1.id);
    addA('zebra', 'F', 12, h1.id);
    addA('zebra', 'F', 10, h1.id);
    addA('giraffe', 'M', 14, h1.id);
    addA('giraffe', 'F', 12, h1.id);
  }
  if (h2) {
    addA('panda', 'F', 10, h2.id);
    addA('redpanda', 'M', 8, h2.id);
    addA('redpanda', 'F', 8, h2.id);
  }
  if (h3) {
    addA('bear', 'M', 12, h3.id);
    addA('bear', 'F', 10, h3.id);
  }
  if (h4) {
    addA('penguin', 'M', 6, h4.id);
    addA('penguin', 'F', 6, h4.id);
    addA('penguin', 'M', 5, h4.id);
    addA('penguin', 'F', 5, h4.id);
  }

  // Set player wallet balance to healthy starting funds
  sim.state.money = 25000;
  sim.state.cc = 60;
  sim.state.seenTips = true;
  sim.recompute();
}
