import { createSystem, type System } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Estimate per-road tile load from zone pairs (OD demand approximation, simple)
export const trafficAggregationSystem: System = createSystem('trafficAggregation', 75, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  const w = map[0].length; const h = map.length;
  // Reset traffic load
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    map[y][x].trafficLoad = 0;
  }
  // For each developed zone, increment traffic on nearest road
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const t = map[y][x];
    if (!t.developed || !t.zone) continue;
    // Find nearest road (Manhattan)
    let minDist = 99, rx = -1, ry = -1;
    for (let yy=0; yy<h; yy++) for (let xx=0; xx<w; xx++) {
      const r = map[yy][xx];
      if (!r.road) continue;
      const dist = Math.abs(x-xx) + Math.abs(y-yy);
      if (dist < minDist) { minDist = dist; rx = xx; ry = yy; }
    }
    if (rx >= 0 && ry >= 0) map[ry][rx].trafficLoad += 1;
  }
});

export default trafficAggregationSystem;
