import { createEntity, type EntityRecord } from './entity';
import type { System } from './system';
import type { ComponentStore, SystemContext, World } from './types';

// Simple map / zoning model kept lightweight for Phase 1 scaffold
export type ZoneType = 'R' | 'C' | 'I' | null;
export interface Tile {
  x: number; y: number; zone: ZoneType; developed: boolean; progress?: number; // 0..1 construction
}

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
  map: Tile[][]; // simple 2D tile grid
  actionQueue: any[]; // will be refined by action type definitions
}

export function createWorld(_options: WorldOptions = {}): WorldImpl {
  const width = 16; const height = 16;
  const map: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
  for (let x = 0; x < width; x++) row.push({ x, y, zone: null, developed: false, progress: 0 });
    map.push(row);
  }
  return {
    entities: [],
    systems: [],
    componentStores: [],
    tick: 0,
    timeAccumulator: 0,
    fixedDelta: 1 / 2, // 2 ticks per second initial
    map,
    actionQueue: [],
  };
}

// Basic action queue operations (generic any until actions module defines types)
export function enqueueAction(world: WorldImpl, action: any) {
  world.actionQueue.push(action);
}

export function drainActions(world: WorldImpl): any[] {
  const q = world.actionQueue;
  world.actionQueue = [];
  return q;
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
