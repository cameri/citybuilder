import { createSystem, type System } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Simple pollution accumulation & decay:
// - Each industrial tile adds emissions
// - Service power plant adds higher emissions
// - Diffusion: 4-neighbor average blend each tick
// - Decay: slight global decay
export const pollutionSystem: System = createSystem('pollution', 50, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  const w = map[0].length; const h = map.length;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const t = map[y][x];
    let src = 0;
    if (t.zone === 'I' && t.developed) src += 0.6; // industrial developed tile
    if (t.building && t.building.startsWith('svc.power')) src += 1.5; // power plant
    const current = t.pollution ?? 0;
    let next = current + src;
    let neighborSum = 0; let count = 0;
    if (y>0) { neighborSum += map[y-1][x].pollution||0; count++; }
    if (y<h-1) { neighborSum += map[y+1][x].pollution||0; count++; }
    if (x>0) { neighborSum += map[y][x-1].pollution||0; count++; }
    if (x<w-1) { neighborSum += map[y][x+1].pollution||0; count++; }
    if (count>0) next = next * 0.85 + (neighborSum / count) * 0.15;
    next *= 0.995; // decay
    if (next < 0.01) next = 0;
    t.pollution = Math.min(100, next);
  }
});

export default pollutionSystem;
