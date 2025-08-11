import { BLUEPRINTS } from '../blueprints';
import { createSystem, type System } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Mark tiles within service range and track satisfaction ratios
export const serviceCoverageSystem: System = createSystem('serviceCoverage', 65, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  const w = map[0].length; const h = map.length;
  // Reset coverage
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    map[y][x].coverage = { power: false, education: 0, health: 0, safety: 0, gas: false, water: false, sewage: false, garbage: false };
  }
  // For each service building, mark coverage
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const t = map[y][x];
    if (!t.building) continue;
    const bp = BLUEPRINTS[t.building];
    if (!bp?.service) continue;
    const { type, range } = bp.service;
    for (let dy=-range; dy<=range; dy++) {
      for (let dx=-range; dx<=range; dx++) {
        const nx = x+dx, ny = y+dy;
        if (nx<0||ny<0||nx>=w||ny>=h) continue;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist > range) continue;
        const tile = map[ny][nx];
  if (type === 'power') tile.coverage.power = true;
  if (type === 'education') tile.coverage.education += 1;
  if (type === 'health') tile.coverage.health += 1;
  if (type === 'safety') tile.coverage.safety += 1;
  if (type === 'gas') tile.coverage.gas = true;
  if (type === 'water') tile.coverage.water = true;
  if (type === 'sewage') tile.coverage.sewage = true;
  if (type === 'garbage') tile.coverage.garbage = true;
      }
    }
  }
});

export default serviceCoverageSystem;
