import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';
import { drainActions } from '../ecs/world';

// Placeholder zoning system: processes zone actions then marks development occasionally.
export const zoningSystem: System = createSystem('zoning', 10, (ctx: SystemContext) => {
  // Handle queued actions
  const actions = drainActions(ctx.world as any);
  for (const a of actions) {
    const map = (ctx.world as any).map as any[][];
    switch (a.type) {
      case 'SET_ZONE': {
        const { x, y, zone } = a;
        if (map[y] && map[y][x]) {
          map[y][x].zone = zone;
          map[y][x].developed = false; map[y][x].progress = 0;
          console.debug('[zoning] set zone', { x, y, zone });
        }
        break; }
      case 'ZONE_RECT': {
        const { rect, zone } = a;
        for (let yy = rect.y; yy < rect.y + rect.h; yy++) {
          for (let xx = rect.x; xx < rect.x + rect.w; xx++) {
            if (map[yy] && map[yy][xx]) {
              map[yy][xx].zone = zone;
              map[yy][xx].developed = false; map[yy][xx].progress = 0;
            }
          }
        }
        console.debug('[zoning] zone rect', a);
        break; }
      case 'PLACE_ROAD': {
        const { x, y } = a;
        if (map[y] && map[y][x]) {
          map[y][x].road = true;
          console.debug('[road] placed', { x, y });
        }
        break; }
      case 'SET_TAX_RATE': {
        (ctx.world as any).taxRate = Math.max(0, Math.min(0.25, a.value));
        console.debug('[economy] taxRate', (ctx.world as any).taxRate);
        break; }
      case 'SET_SPEED': {
        (ctx.world as any).speed = a.speed;
        console.debug('[time] speed', a.speed);
        break; }
      case 'SET_TIME_SCALE': { // legacy mapping
        (ctx.world as any).speed = a.speed as any;
        console.debug('[time] legacy speed', a.speed);
        break; }
      case 'SAVE_GAME': {
        // handled by persistence system later
        break; }
      case 'LOAD_GAME': {
        // handled by persistence system later
        break; }
      case 'PLACE_BUILDING': {
        const { x, y, blueprintId } = a;
        if (map[y] && map[y][x]) {
          map[y][x].building = blueprintId;
          console.debug('[building] placed', { x, y, blueprintId });
        }
        break; }
      case 'BULLDOZE': {
        const { x, y } = a;
        if (map[y] && map[y][x]) {
          const tile = map[y][x];
          if (tile.building) {
            tile.building = undefined;
            console.debug('[bulldoze] removed building', { x, y });
          } else if (tile.road) {
            tile.road = false;
            console.debug('[bulldoze] removed road', { x, y });
          } else if (tile.zone) {
            tile.zone = null;
            tile.developed = false;
            tile.progress = 0;
            console.debug('[bulldoze] removed zone', { x, y });
          }
        }
        break; }
      case 'INSPECT_TILE': {
        const { x, y } = a;
        if (map[y] && map[y][x]) {
          const tile = map[y][x];
          console.log('[inspect]', {
            position: { x, y },
            zone: tile.zone,
            developed: tile.developed,
            progress: tile.progress,
            road: tile.road,
            building: tile.building
          });
        }
        break; }
      default: break;
    }
  }

  // Remove auto-develop; handled by developmentSystem now.
});

export default zoningSystem;
