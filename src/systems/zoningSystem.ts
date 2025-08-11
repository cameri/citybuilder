import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';
import { drainActions } from '../ecs/world';

// Placeholder zoning system: processes zone actions then marks development occasionally.
export const zoningSystem: System = createSystem('zoning', 10, (ctx: SystemContext) => {
  // Handle queued actions
  const actions = drainActions(ctx.world as any);
  for (const a of actions) {
    if (a.type === 'SET_ZONE') {
      const { x, y, zone } = a;
      const map = (ctx.world as any).map;
      if (map[y] && map[y][x]) {
        map[y][x].zone = zone;
        map[y][x].developed = false; // reset development when rezoned
        map[y][x].progress = 0;
      }
    } else if (a.type === 'SET_TIME_SCALE') {
      (ctx.world as any).fixedDelta = 1 / a.speed / 2; // naive scaling (base 2 tps)
    }
  }

  // Remove auto-develop; handled by developmentSystem now.
});

export default zoningSystem;
