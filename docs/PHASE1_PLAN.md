# Phase 1 Plan – Core Simulation Foundation

## Objective

Establish the minimal playable city simulation loop with an orthographic 3D view: zoning, road/building placement, fixed-step time progression, seeded determinism, local saves, and basic economy feedback.

## Scope (In / Out)

- In:
  - Map grid and tile helpers
  - Zoning (Residential/Commercial/Industrial) with rectangular brush
  - Basic road placement
  - Fixed-step tick-based simulation + speed (pause/1x/2x/4x)
  - Orthographic Three.js scene (camera, lighting) with simple tile/road meshes
  - Seeded RNG for deterministic runs
  - Local persistence (versioned JSON in `localStorage`), autosave
  - Simple UI panels (HUD for funds/population/time controls; zoning/road tools)
  - HMR-safe boot/shutdown (state preserved across edits)
- Out:
  - Disasters, advanced traffic/pathfinding
  - Detailed citizen simulation, public services
  - Mods/multiplayer
  - Complex shadows/postprocessing

## High-Level Milestones

1. Project & Architecture Setup (directories, bitECS world scaffolding)
2. Three.js boot: renderer, orthographic camera (isometric tilt), basic lighting
3. Core Data Structures (map grid, tiles, components)
4. Zoning & Placement (actions, rectangular brush, render placeholders)
5. Simulation Loop (fixed-step scheduler, time scaling, pause/resume, seeded RNG)
6. Population & Economy (simplified formulas, treasury updates)
7. Persistence (serialize & load minimal state to `localStorage` key `sc4like.save.v1`; autosave)
8. HMR glue (snapshot on dispose, rehydrate on accept; dispose GPU resources)
9. Basic UI (HUD: funds, population, time controls; build palette)
10. Performance & QA (profiling small/medium cities; no leaks under HMR)

## ECS Components (Initial)

- PositionComponent { x:number, y:number }
- TileComponent { zone: 'R'|'C'|'I'|null, developed:boolean, road:boolean }
- BuildingComponent { blueprintId?: string, level?: number }
- RoadComponent { capacity:number }
- PopulationComponent { residents:number, jobs:number }
- EconomyComponent { treasury:number, taxRate:number }
- RenderTag { } // marker for tiles/entities that need a visual

## Systems (Phase 1)

- ActionSystem: translate UI actions -> placement commands
- ZoningSystem: process zoning actions -> mark tiles
- DevelopmentSystem: advance tile development over time
- PopulationSystem: adjust residents/jobs based on developed tiles
- EconomySystem: compute tax revenue & upkeep per tick
- TimeSystem: manage fixed tick cadence & speed modifiers
- ThreeRenderSystem: update orthographic scene (tile/road meshes; diff & rebuild)
- PersistenceSystem: save/load snapshot to `localStorage` and HMR hot data

## Actions

- PLACE_ROAD { x,y }
- ZONE_RECT { rect:{ x,y,w,h }, zone:'R'|'C'|'I' }
- PLACE_BUILDING { x,y, blueprintId }
- SET_TAX_RATE { value }
- SET_SPEED { speed:0|1|2|4 }
- SAVE_GAME / LOAD_GAME

## Blueprints (Minimal)

- road.basic
- res.plot (capacity: baseResidents)
- com.plot (capacity: baseJobs)
- ind.plot (capacity: baseJobs, pollutionFactor placeholder)

## Simulation Tick Order

1. TimeSystem advances fixed ticks
2. Input actions queue consumed
3. ZoningSystem updates tiles
4. DevelopmentSystem progresses construction
5. PopulationSystem recalculates population & employment
6. EconomySystem updates treasury
7. ThreeRenderSystem diffs & redraws (dirty chunks/tiles)
8. Persistence checkpoint (periodic and on visibility change/HMR dispose)

## Data Model (Draft)

```ts
interface Tile {
  x:number; y:number;
  zone: 'R'|'C'|'I'|null;
  developed:boolean;
  road:boolean;
  building?: string; // blueprintId
}
interface GameState {
  version: 1;
  seed: number;
  tick: number;
  speed: 0|1|2|4;
  treasury: number;
  taxRate: number; // 0..0.25
  population:{ residents:number; jobs:number; employmentRate:number; };
  map: Tile[][];
}
```

## Formulas (Initial Simple)

- Residential demand = `(jobs - residents) * demandFactor`
- Commercial/Industrial demand = `clamp(population.residents * ratio - jobsExisting, 0, max)`
- Tax Revenue per tick = `(residents * resTaxUnit + jobs * busTaxUnit) * taxRate`
- Upkeep per tick = `roadTiles * roadCostUnit + developedTiles * zoneCostUnit`

## UI Panels (orthographic canvas + HUD overlay)

- Top Bar: Funds | Population | Employment% | Time controls (pause/1x/2x/4x)
- Left Palette: Road tool, R/C/I zoning brushes, bulldoze (later), buildings
- Modal: Save / Load JSON

## Persistence

- Versioned JSON `{ version:1, state:GameState }` stored under `localStorage` key `sc4like.save.v1`
- Autosave every N ticks and on `visibilitychange`
- HMR: snapshot stored in `import.meta.hot.data` on dispose; rehydrate on accept
- Migration map to be added post‑Phase 1

## Performance Targets

- 64x64 grid smooth at 60 FPS (placeholder rendering)
- Tick processing < 5ms average on mid-tier laptop
- No GPU/heap leaks after 25 consecutive HMR edits

## Risks & Mitigations

- ECS Overhead: keep components minimal; batch iteration.
- Feature Creep: enforce out-of-scope list.
- Rendering Churn: diff tiles; only redraw changed.
- HMR/Three.js resource leaks → strict dispose() for geometries/materials/renderer
- Main-thread stalls from large diffs → dirty-tile batching; defer to next frame

## Definition of Done (Phase 1)

- User can zone areas, place roads, run time, see population & treasury change.
- Save & load returns identical state (hash compare core fields).
- No uncaught runtime errors for core flows.
- HMR edit preserves city state; scene is disposed/recreated without leaks
- Given a fixed seed, SAVE → LOAD returns identical hash for core state

## Next Phase Seeds

- Traffic pathfinding
- Public services impact modifiers
- Pollution & land value gradients
- Blueprint leveling
