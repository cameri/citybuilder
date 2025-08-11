import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Increment tile construction progress for zoned, undeveloped tiles.
// When progress reaches 1, mark developed.
export const developmentSystem: System = createSystem('development', 20, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as { zone: string | null; developed: boolean; progress?: number }[][];
  for (const row of map) {
    for (const tile of row) {
      if (tile.zone && !tile.developed) {
        tile.progress = Math.min(1, (tile.progress || 0) + ctx.delta * 0.25); // 4 seconds to develop at base speed
        if (tile.progress >= 1) {
          tile.developed = true;
        }
      }
    }
  }
});

export default developmentSystem;
