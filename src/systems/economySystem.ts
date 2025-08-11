import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Economy: simple per-tick revenue and upkeep.
// Revenue = (residents * 1 + jobs * 0.5) * taxRate per tick
// Upkeep = (roadTiles * 0.1) + (developedTiles * 0.05)
export const economySystem: System = createSystem('economy', 40, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  let roadTiles = 0; let developedTiles = 0;
  for (const row of map) {
    for (const tile of row) {
      if (tile.road) roadTiles++;
      if (tile.developed) developedTiles++;
    }
  }
  const revenue = (world.population.residents * 1 + world.population.jobs * 0.5) * world.taxRate * ctx.delta;
  const upkeep = (roadTiles * 0.1 + developedTiles * 0.05) * ctx.delta;
  world.treasury += (revenue - upkeep);
});

export default economySystem;
