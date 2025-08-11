import { BLUEPRINTS } from '../blueprints';
import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Economy: simple per-tick revenue and upkeep.
// Revenue = (residents * 1 + jobs * 0.5) * taxRate per tick
// Upkeep = (roadTiles * 0.1) + (developedTiles * 0.05)
export const economySystem: System = createSystem('economy', 40, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  let roadTiles = 0; let upkeepSum = 0;
  for (const row of map) for (const tile of row) {
    if (tile.road) { roadTiles++; upkeepSum += 0.1 * ctx.delta; }
    if (tile.building) {
      const bp = (BLUEPRINTS as any)[tile.building];
      if (bp?.effects?.upkeep) upkeepSum += bp.effects.upkeep * ctx.delta;
    } else if (tile.developed) {
      upkeepSum += 0.05 * ctx.delta;
    }
  }
  const revenue = (world.population.residents * 1 + world.population.jobs * 0.5) * world.taxRate * ctx.delta;
  const upkeep = upkeepSum;
  world.treasury += (revenue - upkeep);
});

export default economySystem;
