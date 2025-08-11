import { createSystem, type System } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

// Land value influenced by road adjacency, nearby service building, pollution penalty
export const landValueSystem: System = createSystem('landValue', 55, (ctx: SystemContext) => {
  const world: any = ctx.world;
  const map = world.map as any[][];
  const w = map[0].length; const h = map.length;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const t = map[y][x];
    let base = 20;
    let roadAdj = 0;
    if (y>0 && map[y-1][x].road) roadAdj++;
    if (y<h-1 && map[y+1][x].road) roadAdj++;
    if (x>0 && map[y][x-1].road) roadAdj++;
    if (x<w-1 && map[y][x+1].road) roadAdj++;
    const roadBoost = roadAdj * 2;
    let serviceBoost = 0;
    outer: for (let dy=-5; dy<=5; dy++) {
      for (let dx=-5; dx<=5; dx++) {
        const nx = x+dx, ny=y+dy;
        if (nx<0||ny<0||nx>=w||ny>=h) continue;
        const nt = map[ny][nx];
        if (nt.building && nt.building.startsWith('svc.')) { serviceBoost += 6; break outer; }
      }
    }
    const pollution = t.pollution||0;
    const pollutionPenalty = -pollution * 0.3;
    let lv = base + roadBoost + serviceBoost + pollutionPenalty;
    const prev = t.landValue ?? 30;
    lv = prev * 0.8 + lv * 0.2; // smoothing
    if (lv < 0) lv = 0; if (lv > 100) lv = 100;
    t.landValue = lv;
  }
});

export default landValueSystem;
