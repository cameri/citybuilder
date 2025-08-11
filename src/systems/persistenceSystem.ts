import type { System } from '../ecs/system';
import { createSystem } from '../ecs/system';
import type { SystemContext } from '../ecs/types';

const STORAGE_KEY = 'sc4like.save.v1';

function snapshot(world: any) {
  return {
    version: 1,
    tick: world.tick,
    speed: world.speed,
    treasury: world.treasury,
    taxRate: world.taxRate,
    population: world.population,
    rngSeed: world.rngSeed, // Include RNG seed for determinism
    map: world.map.map((row: any[]) => row.map(t => ({
      x:t.x,
      y:t.y,
      zone:t.zone,
      developed:t.developed,
      progress:t.progress||0,
      road:t.road,
      building:t.building
    })))
  };
}

function restore(world: any, data: any) {
  if (!data || data.version !== 1) return false;
  world.tick = data.tick;
  world.speed = data.speed;
  world.treasury = data.treasury;
  world.taxRate = data.taxRate;
  world.population = data.population;
  world.rngSeed = data.rngSeed; // Restore RNG seed
  for (let y=0; y<world.map.length; y++) {
    for (let x=0; x<world.map[0].length; x++) {
      const s = data.map[y][x];
      const t = world.map[y][x];
      t.zone = s.zone;
      t.developed = s.developed;
      t.progress = s.progress;
      t.road = s.road;
      t.building = s.building; // Restore building data
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(world))); lastAutosave = world.tick; } catch {}
  }
  if (!world._loadedOnce) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { restore(world, JSON.parse(raw)); }
    } catch {}
    world._loadedOnce = true;
  }
});

export function manualSave(world: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(world)));
}
export function manualLoad(world: any) {
  const raw = localStorage.getItem(STORAGE_KEY); if (raw) restore(world, JSON.parse(raw));
}

export default persistenceSystem;
