import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Simple population model: each developed residential tile adds residents; commercial/industrial add jobs.
export const populationSystem: System = createSystem('population', 30, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  let residents = 0; let jobs = 0;
  for (const row of map) {
    for (const tile of row) {
      if (!tile.developed) continue;
      if (tile.zone === 'R') residents += 5; // base inhabitants per residential tile
      if (tile.zone === 'C') jobs += 4; // base jobs per commercial tile
      if (tile.zone === 'I') jobs += 6; // industrial jobs
    }
  }
  world.population.residents = residents;
  world.population.jobs = jobs;
  world.population.employmentRate = residents === 0 ? 0 : Math.min(1, jobs / residents);
});

export default populationSystem;
