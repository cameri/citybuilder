import { createEntity, type EntityRecord } from './entity';
import type { System } from './system';
import type { ComponentStore, SystemContext, World } from './types';

export interface WorldOptions {
  maxEntities?: number;
}

export interface WorldImpl extends World {
  entities: EntityRecord[];
  systems: System[];
  componentStores: ComponentStore<any>[];
  tick: number;
  timeAccumulator: number;
  fixedDelta: number; // seconds per tick
}

export function createWorld(_options: WorldOptions = {}): WorldImpl {
  return {
    entities: [],
    systems: [],
    componentStores: [],
    tick: 0,
    timeAccumulator: 0,
    fixedDelta: 1 / 2, // 2 ticks per second initial
  };
}

export function addSystem(world: WorldImpl, system: System) {
  world.systems.push(system);
  world.systems.sort((a, b) => a.order - b.order);
}

export function spawnEntity(world: WorldImpl): EntityRecord {
  const e = createEntity();
  world.entities.push(e);
  return e;
}

export function updateWorld(world: WorldImpl, deltaSec: number) {
  world.timeAccumulator += deltaSec;
  while (world.timeAccumulator >= world.fixedDelta) {
    world.timeAccumulator -= world.fixedDelta;
    world.tick++;
    const ctx: SystemContext = { world, delta: world.fixedDelta, tick: world.tick };
    for (const system of world.systems) {
      system.update(ctx);
    }
  }
}
