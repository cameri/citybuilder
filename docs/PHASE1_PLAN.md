# Phase 1 Plan – Core Simulation Foundation

## Objective

Establish the minimal playable city simulation loop: zoning, building placement, time progression, population & basic economy feedback.

## Scope (In / Out)

- In: Map grid, zoning (R/C/I), basic road placement, tick-based simulation, population growth model (abstract), tax & treasury adjustments, simple UI panels.
- Out: Disasters, advanced traffic pathfinding, detailed citizen simulation, public services (police/fire/health), mods, multiplayer.

## High-Level Milestones

1. Project & Architecture Setup (ECS scaffolding, directories)
2. Core Data Structures (map grid, tiles, components)
3. Zoning & Placement (actions, validation, rendering placeholders)
4. Simulation Loop (tick scheduler, time scaling, pause/resume)
5. Population & Economy (simplified formulas, treasury updates)
6. Basic UI (HUD: funds, population, time controls; build palette)
7. Persistence (serialize & load minimal state)
8. Performance & QA (profiling small/medium cities)

## ECS Components (Initial)

- PositionComponent { x, y }
- TileComponent { zoneType: 'R'|'C'|'I'|null, developed:boolean }
- RoadComponent { capacity:number }
- BuildingComponent { blueprintId, level }
- PopulationComponent { residents:number, jobs:number }
- EconomyComponent { treasury:number, taxRate:number }
- RenderComponent { spriteId }

## Systems (Phase 1)

- InputSystem: translate UI actions -> placement commands
- ZoningSystem: process zoning actions -> mark tiles
- DevelopmentSystem: advance tile development over time
- PopulationSystem: adjust residents/jobs based on developed tiles
- EconomySystem: compute tax revenue & upkeep per tick
- TimeSystem: manage tick cadence & speed modifiers
- RenderSystem: update visual layer (placeholder graphics)
- PersistenceSystem: save/load snapshot

## Actions

- PLACE_ROAD { x,y }
- SET_ZONE { x,y, zoneType }
- PLACE_BUILDING { x,y, blueprintId }
- ADJUST_TAX { value }
- SET_TIME_SCALE { speed }
- SAVE_GAME / LOAD_GAME

## Blueprints (Minimal)

- road.basic
- res.plot (capacity: baseResidents)
- com.plot (capacity: baseJobs)
- ind.plot (capacity: baseJobs, pollutionFactor placeholder)

## Simulation Tick Order

1. TimeSystem increments tick
2. Input actions queue consumed
3. ZoningSystem updates tiles
4. DevelopmentSystem progresses construction
5. PopulationSystem recalculates population & employment
6. EconomySystem updates treasury
7. RenderSystem diffs & redraws
8. Persistence checkpoint (periodic)

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
  tick:number;
  timeScale:1|2|4|8;
  treasury:number;
  taxRate:number; // 0..0.25
  population:{ residents:number; jobs:number; employmentRate:number; };
  map: Tile[][];
}
```

## Formulas (Initial Simple)

- Residential demand = `(jobs - residents) * demandFactor`
- Commercial/Industrial demand = `clamp(population.residents * ratio - jobsExisting, 0, max)`
- Tax Revenue per tick = `(residents * resTaxUnit + jobs * busTaxUnit) * taxRate`
- Upkeep per tick = `roadTiles * roadCostUnit + developedTiles * zoneCostUnit`

## UI Panels

- Top Bar: Funds | Population | Employment% | Time controls (pause/1x/2x/4x)
- Left Palette: Road tool, R/C/I zoning brushes, bulldoze (later), buildings
- Modal: Save / Load JSON

## Persistence

- JSON export with version tag `{ version:1, state:GameState }`
- Backward compatibility strategy: migration map later (not Phase 1)

## Performance Targets

- 64x64 grid smooth at 60 FPS (placeholder rendering)
- Tick processing < 5ms average on mid-tier laptop

## Risks & Mitigations

- ECS Overhead: keep components minimal; batch iteration.
- Feature Creep: enforce out-of-scope list.
- Rendering Churn: diff tiles; only redraw changed.

## Definition of Done (Phase 1)

- User can zone areas, place roads, run time, see population & treasury change.
- Save & load returns identical state (hash compare core fields).
- No uncaught runtime errors for core flows.

## Next Phase Seeds

- Traffic pathfinding
- Public services impact modifiers
- Pollution & land value gradients
- Blueprint leveling
