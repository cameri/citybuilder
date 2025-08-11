import { createEntity, type EntityRecord } from './entity';
import type { System } from './system';
import type { ComponentStore, SystemContext, World } from './types';

// Simple map / zoning model kept lightweight for Phase 1 scaffold
export type ZoneType = 'R' | 'C' | 'I' | null;
export interface Tile {
  x: number; y: number; zone: ZoneType; developed: boolean; progress?: number; // 0..1 construction
  road: boolean;
  // Building footprint support
  building?: string; // blueprint id if this tile is part of (root of) a building
  buildingRoot?: { x: number; y: number }; // for multi-tile buildings every tile stores the root coord
  // Phase 2 scalar fields baked onto tile for renderer simplicity (could be separated later)
  pollution?: number; // 0..100
  landValue?: number; // 0..100
  level?: 1|2|3; // development level (auto evolves)
  // Service coverage fields
  coverage?: {
    power?: boolean;
    education?: number;
    health?: number;
    safety?: number;
    gas?: boolean;
    water?: boolean;
    sewage?: boolean;
    garbage?: boolean;
  };
  powered?: boolean;
  trafficLoad?: number;
  // Underground / infrastructure flags
  waterPipe?: boolean; // water pipe present (underground)
  gasPipe?: boolean;   // gas pipe present (underground)
  powerPole?: boolean; // power pole structure (above ground)
}

export interface WorldOptions {
  maxEntities?: number;
}

export interface WorldImpl extends World {
  entities: EntityRecord[];
  systems: System[];
  componentStores: ComponentStore<any>[];
  tick: number;
  simTimeSec: number; // accumulated simulated seconds
  timeAccumulator: number;
  fixedDelta: number; // current seconds per tick (affected by speed)
  baseFixedDelta: number; // base seconds per tick (speed=1)
  speed: 0 | 1 | 2 | 4; // simulation speed
  map: Tile[][]; // simple 2D tile grid
  actionQueue: any[]; // will be refined by action type definitions
  treasury: number;
  taxRate: number; // 0..0.25
  population: { residents: number; jobs: number; employmentRate: number };
  // Phase 2 fields
  overlayMode: 'none' | 'pollution' | 'landValue' | 'power';
  rngSeed?: number; // deterministic seed for RNG
}

export function createWorld(_options: WorldOptions = {}): WorldImpl {
  const width = 48; const height = 48;
  const map: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
  for (let x = 0; x < width; x++) row.push({ x, y, zone: null, developed: false, progress: 0, road: false, pollution: 0, landValue: 30, level: 1 });
    map.push(row);
  }
  return {
    entities: [],
    systems: [],
    componentStores: [],
    tick: 0,
  simTimeSec: 0,
    timeAccumulator: 0,
  fixedDelta: 1 / 2,
  baseFixedDelta: 1 / 2,
  speed: 1,
    map,
    actionQueue: [],
  treasury: 1000,
  taxRate: 0.1,
  population: { residents: 0, jobs: 0, employmentRate: 0 },
  overlayMode: 'none',
  rngSeed: undefined,
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
  // Adjust dynamic fixedDelta based on speed (pause if speed=0)
  if (world.speed === 0) return; // paused
  world.fixedDelta = world.baseFixedDelta / world.speed;
  world.timeAccumulator += deltaSec;
  while (world.timeAccumulator >= world.fixedDelta) {
    world.timeAccumulator -= world.fixedDelta;
    world.tick++;
    const ctx: SystemContext = { world, delta: world.fixedDelta, tick: world.tick };
    for (const system of world.systems) {
      system.update(ctx);
    }
    // Advance in-game clock: 1 real second at speed=1 => +1 sim second (minute mapping handled in UI)
    // Scale linearly with speed so higher speeds accelerate the clock.
    world.simTimeSec += world.baseFixedDelta * world.speed;
  }
}
