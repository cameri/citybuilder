import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

const STORAGE_KEY_V1 = 'sc4like.save.v1';
const STORAGE_KEY_V2 = 'sc4like.save.v2';

function snapshot(world: any) {
  return {
    version: 2,
    tick: world.tick,
    speed: world.speed,
    treasury: world.treasury,
    taxRate: world.taxRate,
    population: world.population,
    rngSeed: world.rngSeed,
    overlayMode: world.overlayMode,
  simTimeSec: world.simTimeSec,
    map: world.map.map((row: any[]) => row.map(t => ({
      x: t.x,
      y: t.y,
      zone: t.zone,
      developed: t.developed,
      progress: t.progress||0,
      road: t.road,
      building: t.building,
      pollution: t.pollution||0,
      landValue: t.landValue||30,
      level: t.level||1
    })))
  };
}

function migrateV1toV2(v1: any) {
  // Add defaults for new fields
  for (const row of v1.map) for (const t of row) {
    t.pollution = 0; t.landValue = 30; t.level = 1;
  }
  v1.version = 2;
  v1.overlayMode = 'none';
  return v1;
}

function restore(world: any, data: any) {
  if (!data) return false;
  if (data.version === 1) data = migrateV1toV2(data);
  if (data.version !== 2) return false;
  world.tick = data.tick;
  world.speed = data.speed;
  world.treasury = data.treasury;
  world.taxRate = data.taxRate;
  world.population = data.population;
  world.rngSeed = data.rngSeed;
  world.overlayMode = data.overlayMode || 'none';
  world.simTimeSec = data.simTimeSec || 0;
  for (let y=0; y<world.map.length; y++) {
    for (let x=0; x<world.map[0].length; x++) {
      const s = data.map[y][x];
      if (!s) continue;
      const t = world.map[y][x];
      t.zone = s.zone;
      t.developed = s.developed;
      t.progress = s.progress;
      t.road = s.road;
      t.building = s.building;
      t.pollution = s.pollution || 0;
      t.landValue = s.landValue ?? 30;
      t.level = s.level || 1;
    }
  }
  return true;
}

let lastAutosave = 0;
export const persistenceSystem: System = createSystem('persistence', 90, (ctx: SystemContext) => {
  const world: any = ctx.world;
  // Poll actions queue for SAVE/LOAD (they'll be no-op in other systems)
  // (Assuming persistenceSystem runs after actions consumed; could integrate earlier if needed.)
  // Autosave every 600 ticks (~5 min at 2 tps base * speed) simplified
  if (world.tick - lastAutosave >= 600) {
    try { localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(snapshot(world))); lastAutosave = world.tick; } catch {}
  }
  if (!world._loadedOnce) {
    try {
      let raw = localStorage.getItem(STORAGE_KEY_V2);
      if (!raw) raw = localStorage.getItem(STORAGE_KEY_V1); // attempt legacy
      if (raw) { restore(world, JSON.parse(raw)); }
    } catch {}
    world._loadedOnce = true;
  }
});

export function manualSave(world: any) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(snapshot(world)));
}
export function manualLoad(world: any) {
  let raw = localStorage.getItem(STORAGE_KEY_V2);
  if (!raw) raw = localStorage.getItem(STORAGE_KEY_V1);
  if (raw) restore(world, JSON.parse(raw));
}

export default persistenceSystem;
