import { BLUEPRINTS } from '../blueprints';
import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';
import { drainActions } from '../ecs/world';
import { random } from '../utils/seededRng';

// Zoning & placement system including bulldoze with refund mechanics
export const zoningSystem: System = createSystem('zoning', 10, (ctx: SystemContext) => {
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
      case 'SAVE_GAME':
      case 'LOAD_GAME': {
        // handled by persistence system
        break; }
      case 'PLACE_BUILDING':
      case 'PLACE_SERVICE': {
        const { x, y, blueprintId } = a as any;
        const bp = BLUEPRINTS[blueprintId];
        if (!bp) break;
        // Validate footprint
        let can = true;
        for (let dy=0; dy<bp.size.h; dy++) {
          for (let dx=0; dx<bp.size.w; dx++) {
            const tx = x+dx, ty = y+dy;
            if (!map[ty] || !map[ty][tx]) { can = false; break; }
            const t = map[ty][tx];
            if (t.building) { can = false; break; }
          }
          if (!can) break;
        }
        if (!can) { console.debug('[building] footprint blocked', {blueprintId,x,y}); break; }
        for (let dy=0; dy<bp.size.h; dy++) {
          for (let dx=0; dx<bp.size.w; dx++) {
            const tx = x+dx, ty = y+dy;
            const t = map[ty][tx];
            t.building = blueprintId;
            t.buildingRoot = { x, y };
            if (a.type === 'PLACE_SERVICE') { t.developed = true; }
          }
        }
        console.debug('[building] placed', { x, y, blueprintId, w: bp.size.w, h: bp.size.h });
        break; }
      case 'PLACE_POWER_POLE_LINE': {
        const { line } = a as any; // {x0,y0,x1,y1}
        if (line.x0 !== line.x1 && line.y0 !== line.y1) break; // straight only
        const length = Math.max(Math.abs(line.x1 - line.x0), Math.abs(line.y1 - line.y0));
        const maxSpacing = 5;
        const neededPoles = Math.floor(length / maxSpacing) + 2; // ensure endpoints
        for (let i=0; i<neededPoles; i++) {
          const t = i / (neededPoles - 1);
          const px = Math.round(line.x0 + (line.x1 - line.x0) * t);
          const py = Math.round(line.y0 + (line.y1 - line.y0) * t);
          if (map[py] && map[py][px]) {
            const tile = map[py][px];
            tile.powerPole = true;
            tile.building = 'infra.powerpole';
            tile.buildingRoot = { x: px, y: py };
            tile.developed = true;
          }
        }
        console.debug('[power] poles placed line', line);
        break; }
      case 'PLACE_WATER_PIPE_LINE': {
        const { line } = a as any;
        if (line.x0 !== line.x1 && line.y0 !== line.y1) break;
        let xCur = line.x0, yCur = line.y0;
        const stepX = line.x0 === line.x1 ? 0 : (line.x1 > line.x0 ? 1 : -1);
        const stepY = line.y0 === line.y1 ? 0 : (line.y1 > line.y0 ? 1 : -1);
        while (true) {
          if (map[yCur] && map[yCur][xCur]) map[yCur][xCur].waterPipe = true;
          if (xCur === line.x1 && yCur === line.y1) break;
          xCur += stepX; yCur += stepY;
        }
        console.debug('[water] pipe line', line);
        break; }
      case 'PLACE_GAS_PIPE_LINE': {
        const { line } = a as any;
        if (line.x0 !== line.x1 && line.y0 !== line.y1) break;
        let xCur = line.x0, yCur = line.y0;
        const stepX = line.x0 === line.x1 ? 0 : (line.x1 > line.x0 ? 1 : -1);
        const stepY = line.y0 === line.y1 ? 0 : (line.y1 > line.y0 ? 1 : -1);
        while (true) {
          if (map[yCur] && map[yCur][xCur]) map[yCur][xCur].gasPipe = true;
          if (xCur === line.x1 && yCur === line.y1) break;
          xCur += stepX; yCur += stepY;
        }
        console.debug('[gas] pipe line', line);
        break; }
      case 'BULLDOZE': {
        const { x, y } = a;
        if (map[y] && map[y][x]) {
          const tile = map[y][x];
          let refundBase = 0;
          if (tile.building) {
            const root = tile.buildingRoot || { x, y };
            const bp = BLUEPRINTS[tile.building];
            if (bp) refundBase += bp.cost;
            // remove full footprint
            if (bp) {
              for (let dy=0; dy<bp.size.h; dy++) for (let dx=0; dx<bp.size.w; dx++) {
                const tx = root.x+dx, ty = root.y+dy;
                if (map[ty] && map[ty][tx]) {
                  const tt = map[ty][tx];
                  if (tt.building === tile.building && tt.buildingRoot && tt.buildingRoot.x === root.x && tt.buildingRoot.y === root.y) {
                    tt.building = undefined; tt.buildingRoot = undefined; tt.powerPole = false;
                  }
                }
              }
            } else {
              tile.building = undefined; tile.buildingRoot = undefined; tile.powerPole = false;
            }
            console.debug('[bulldoze] removed building', { x, y, root });
          }
          // Handle all other tile types independently (not else if)
          if (tile.road) { refundBase += 10; tile.road = false; console.debug('[bulldoze] removed road', { x, y }); }
          if (tile.zone) { tile.zone = null; tile.developed=false; tile.progress=0; console.debug('[bulldoze] removed zone',{x,y}); }
          if (tile.waterPipe) { refundBase += 10; tile.waterPipe=false; }
          if (tile.gasPipe) { refundBase += 15; tile.gasPipe=false; }
          if (tile.powerPole && tile.building !== 'infra.powerpole') { refundBase += 20; tile.powerPole=false; }
          if (tile.building === 'infra.powerpole' && !tile.powerPole) { tile.building=undefined; tile.buildingRoot=undefined; }
          if (refundBase > 0) {
            const factor = 0.7 + random()*0.1;
            (ctx.world as any).treasury += refundBase * factor;
          }
        }
        break; }
      case 'BULLDOZE_RECT': {
        const { rect } = a as any;
        let refundBaseTotal = 0;
        for (let yy = rect.y; yy < rect.y + rect.h; yy++) {
          for (let xx = rect.x; xx < rect.x + rect.w; xx++) {
            if (!map[yy] || !map[yy][xx]) continue;
            const t = map[yy][xx];
            // Buildings (count cost only at root)
            if (t.building) {
              const root = t.buildingRoot || { x: xx, y: yy };
              const isRoot = !t.buildingRoot || (t.buildingRoot.x === xx && t.buildingRoot.y === yy);
              const bp = BLUEPRINTS[t.building];
              if (bp && isRoot) refundBaseTotal += bp.cost;
              if (bp) {
                for (let dy=0; dy<bp.size.h; dy++) for (let dx=0; dx<bp.size.w; dx++) {
                  const tx = root.x+dx, ty = root.y+dy;
                  if (map[ty] && map[ty][tx]) {
                    const tt = map[ty][tx];
                    if (tt.building === t.building && tt.buildingRoot && tt.buildingRoot.x === root.x && tt.buildingRoot.y === root.y) {
                      tt.building = undefined; tt.buildingRoot = undefined; tt.powerPole = false;
                    }
                  }
                }
              } else {
                t.building = undefined; t.buildingRoot = undefined; t.powerPole = false;
              }
            }
            if (t.road) { refundBaseTotal += 10; t.road = false; }
            if (t.zone) { t.zone = null; t.developed=false; t.progress=0; }
            if (t.waterPipe) { refundBaseTotal += 10; t.waterPipe=false; }
            if (t.gasPipe) { refundBaseTotal += 15; t.gasPipe=false; }
            if (t.powerPole && t.building !== 'infra.powerpole') { refundBaseTotal += 20; t.powerPole=false; }
            if (t.building === 'infra.powerpole' && !t.powerPole) { t.building=undefined; t.buildingRoot=undefined; }
          }
        }
        if (refundBaseTotal > 0) {
          const factor = 0.7 + random()*0.1;
          (ctx.world as any).treasury += refundBaseTotal * factor;
        }
        console.debug('[bulldoze] rect', rect);
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
            building: tile.building,
            pollution: tile.pollution,
            landValue: tile.landValue,
            level: tile.level
          });
        }
        break; }
      case 'TOGGLE_OVERLAY': {
        (ctx.world as any).overlayMode = a.overlay;
        console.debug('[overlay] mode', a.overlay);
        break; }
      default: break;
    }
  }
});

export default zoningSystem;
