import { BLUEPRINTS } from '../blueprints';
import { createSystem, type System } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Mark powered status for tiles within power coverage
export const powerDistributionSystem: System = createSystem('powerDistribution', 70, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  const w = map[0].length; const h = map.length;
  // Reset powered
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    map[y][x].powered = false;
  }
  // For each power service, mark powered tiles
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const t = map[y][x];
    if (!t.building) continue;
    const bp = BLUEPRINTS[t.building];
    if (!bp?.service || bp.service.type !== 'power') continue;
    const { range, capacity } = bp.service;
    let poweredCount = 0;
    for (let dy=-range; dy<=range; dy++) {
      for (let dx=-range; dx<=range; dx++) {
        const nx = x+dx, ny = y+dy;
        if (nx<0||ny<0||nx>=w||ny>=h) continue;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist > range) continue;
        const tile = map[ny][nx];
        if (poweredCount < capacity) {
          tile.powered = true;
          poweredCount++;
        }
      }
    }
  }
});

export default powerDistributionSystem;
