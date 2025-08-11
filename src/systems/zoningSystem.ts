import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Placeholder zoning system: in future it will process an action queue.
export const zoningSystem: System = createSystem('zoning', 10, (ctx: SystemContext) => {
  // For now, auto-develop any zoned but undeveloped tile every 120 ticks as a demo.
  if (ctx.tick % 120 !== 0) return;
  const map = (ctx.world as any).map as { zone: string | null; developed: boolean }[][];
  for (const row of map) {
    for (const tile of row) {
      if (tile.zone && !tile.developed) {
  tile.developed = true; // instant develop placeholder
      }
    }
  }
});

export default zoningSystem;
