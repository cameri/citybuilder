import { BLUEPRINTS } from '../blueprints';
import { createSystem, type System } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Auto-upgrade buildings based on land value & pollution thresholds (simplified placeholder)
export const levelingSystem: System = createSystem('leveling', 60, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  for (const row of map) for (const t of row) {
    if (!t.building) continue;
    const bp = BLUEPRINTS[t.building];
    if (!bp) continue;
    if (bp.upgradeTo) {
      const lv = t.landValue || 0; const poll = t.pollution || 0;
      if (lv >= 45 && poll < 50) {
        if ((ctx.tick + t.x + t.y) % 120 === 0) { // periodic check
          t.building = bp.upgradeTo;
          t.level = (t.level||1) + 1 as any;
          console.debug('[leveling] upgrade', t.x, t.y, '->', t.building);
        }
      }
    }
  }
});

export default levelingSystem;
