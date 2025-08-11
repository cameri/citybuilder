# Phase 2 Plan – City Services, Traffic, Land Value & Environmental Simulation (PLANNING)

## Status: 🟡 PLANNING / NOT IMPLEMENTED

Phase 2 expands the minimal core loop from Phase 1 by introducing deeper simulation layers that create **feedback dynamics** and **player-driven strategic tradeoffs**: traffic & accessibility, public services (power, education, health, safety), land value & desirability gradients, pollution, and building growth/leveling.

This phase focuses on interconnected systems that influence zoning development, economic performance, and spatial differentiation across the map.

---

## 🎯 Primary Objectives

- Introduce **traffic & accessibility** as a gating factor for development quality and jobs/residents matching.
- Add **public service systems** (power grid, education, health, safety) affecting land value & growth.
- Implement **land value & desirability** layers influenced by services, pollution, distance, congestion.
- Simulate **pollution & negative externalities** (industrial, traffic) spreading via diffusion/decay.
- Add **building leveling / density evolution** driven by demand + desirability thresholds.
- Extend **UI overlays** (traffic heat, pollution, land value, service coverage) and inspectors.
- Expand **blueprint taxonomy** (low/med/high density R/C/I; service buildings; utility infrastructure).
- Maintain deterministic simulation & persistence compatibility (save version bump + migrations).

---

## 🧱 Scope

### In

- Road graph & basic path cost (Manhattan + congestion modifier)
- Per-tile traffic load accumulation, decay, and overlay visualization
- Service building types: power plant, school, clinic, police (abstracted single-effect for now)
- Power distribution (simplified: range-based radius or network adjacency)
- Land value scalar field (0–100) updated periodically from contributing factors
- Pollution scalar field (0–100) with diffusion & exponential decay
- Building leveling (Level 1→3) with capacity scaling & upgraded mesh/visual tag
- Demand model refinement (R/C/I) using land value & service satisfaction
- Action & blueprint additions (place service, place utility, bulldoze upgrades)
- Save format v2 with migration from v1
- Performance optimizations for new scalar fields (chunked grid diffs)

### Out (Deferred)

- Detailed agent (citizen/vehicle) simulation (use aggregate flows only)
- Complex electrical network topology (simple radius / adjacency this phase)
- Fire/firespread, disasters (future phase)
- Water / sewage systems (future)
- Zoning density selection (auto-leveling only this phase)
- Multi-lane traffic modeling / pathfinding heuristics beyond simple cost + breadth
- Mod loader & scripting (Phase 3+)

---

## 🗺️ High-Level Milestones

1. Save v2 & Migration Harness (version bump, compatibility layer)
2. Road Graph Extraction & Traffic Accumulation (tick-based flow estimation)
3. Pollution Field (industrial + traffic sources; diffusion & decay kernel)
4. Service Buildings Framework (blueprints + coverage evaluation)
5. Land Value Computation Pass (services, pollution, distance to road, congestion)
6. Demand Model Upgrade (desirability & saturation curves)
7. Building Leveling System (threshold checks, blueprint upgrade, capacity scaling)
8. UI Overlays (toggle layers: Traffic, Pollution, Land Value, Service Coverage)
9. Expanded Inspector (shows all influences & next level requirements)
10. Performance & Memory Pass (field compression, dirty-region updates)
11. QA + Balancing (tuning curves, verifying player feedback loops)

---

## 🧩 New / Expanded ECS Components

- TrafficComponent { load:number; lastTickUpdated:number }
- ServiceComponent { type:'power'|'education'|'health'|'safety'; range:number; capacity:number }
- PowerConsumerComponent { demand:number; powered:boolean }
- PollutionSourceComponent { rate:number }
- PollutionField (singleton grid) Float32Array
- LandValueField (singleton grid) Float32Array
- DesirabilityCache (singleton; per-zone-type arrays)
- LevelComponent { level:1|2|3; progress:number }
- CoverageComponent { power:boolean; education:number; health:number; safety:number }
- BlueprintRef (extend existing BuildingComponent to include densityTier / serviceType)

(Where practical, singleton field components can be plain module-managed caches rather than attached to entities.)

---

## 🛠️ Systems (Phase 2 Additions)

- TrafficAggregationSystem: estimate per-road tile load from zone pairs (OD demand approximation)
- AccessibilitySystem: compute travel accessibility scores (distance / congestion) feeding desirability
- PollutionSimulationSystem: add emissions, diffuse (kernel), decay
- ServiceCoverageSystem: mark tiles within service range & track satisfaction ratios
- PowerDistributionSystem: mark powered status; throttle if capacity < demand
- LandValueSystem: recompute scalar field using weighted factors
- DemandRefinementSystem: update R/C/I demand curves w/ desirability feedback & caps
- LevelingSystem: evaluate upgrade/downgrade conditions; adjust capacity & visuals
- OverlayGenerationSystem: produce render-layer data for active overlay mode
- MigrationSystem (v1→v2): on load, initialize new fields with defaults

---

## 🔁 Simulation Tick Order (Extended)

1. Time / Action intake (unchanged base)
2. Zoning & Development (Phase 1)
3. TrafficAggregationSystem (coarse; maybe every N ticks)
4. PollutionSimulationSystem (every tick or every 2 ticks configurable)
5. ServiceCoverageSystem & PowerDistributionSystem
6. LandValueSystem (every M ticks; cached) → DesirabilityCache
7. DemandRefinementSystem adjusts global demand indices
8. LevelingSystem applies upgrades/downgrades
9. EconomySystem (include service upkeep + power costs)
10. Rendering + Overlays diff
11. Persistence checkpoint

Many heavy systems (traffic, land value) run at lower frequency to reduce cost (configurable intervals). Determinism preserved by fixed scheduling cadence.

---
## 🧮 Core Formulas (Draft)

Let:

- lv = land value (0..100)
- poll = pollution (0..100)
- acc = accessibility score (0..1) from road distance & congestion penalty
- svc_x = service satisfaction per domain (0..1)

Land Value:

```txt
base = 20
serviceBoost = (svc_power*10 + svc_education*20 + svc_health*15 + svc_safety*15)
pollutionPenalty = - (poll * 0.3)
accessBoost = acc * 25
congestionPenalty = - (trafficNorm * 15)
landValue = clamp(base + serviceBoost + accessBoost + pollutionPenalty + congestionPenalty, 0, 100)
```

Desirability (per zone type) example for Residential:

```txt
R_desirability = sigmoid((landValue - 40)/10) * (1 - pollutionFactor) * acc
pollutionFactor = poll / 100
```

Level Up Thresholds (Residential):

- L1→L2: landValue ≥ 45, acc ≥ 0.4, svc_power & education ≥ 0.5
- L2→L3: landValue ≥ 65, acc ≥ 0.6, pollution ≤ 25, education ≥ 0.7

Traffic Load Update (approx):

```txt
roadLoad[tile] = Σ ( flow_ij * pathShare(tile, i→j) ) * decay
```

(Using aggregated OD demand from zone groups; heuristic path splitting.)

Pollution Diffusion (each step):

```txt
new[i] = (src[i] + Σ neighbor[i]*k) * (1 - decay)
```

---
## 🧾 Actions (New)


- PLACE_SERVICE { blueprintId, x, y }
- PLACE_UTILITY { type:'power', x,y } (if distinct from service)
- TOGGLE_OVERLAY { overlay:'traffic'|'pollution'|'landValue'|'power'|'education'|'none' }
- SET_TAX_RATE (may split into resTax / busTax after balancing – optional stretch)
- BULLDOZE { x,y } (extended: handles service buildings & resets fields)

---

## 🧬 Blueprint Extensions


- Residential: res.low, res.med, res.high (auto-evolve)
- Commercial: com.low, com.med, com.high
- Industrial: ind.light, ind.heavy (different pollution rates)
- Services: svc.power.small, svc.school.basic, svc.clinic.basic, svc.police.small

Blueprint fields (add):

```ts
{
  id:string;
  category:'res'|'com'|'ind'|'service';
  densityTier?:1|2|3;
  baseCapacity:number; // per tier scaled by level
  emissions?:number;   // pollution rate
  service?: { type:'power'|'education'|'health'|'safety'; capacity:number; range:number };
  upgradeTo?: string;  // next density blueprint
}
```

---

## 💾 Persistence (v2)


- version: 2
- Add landValueGrid (compressed RLE or base64 Float32 binary string) – optional optimization
- Add pollutionGrid
- Add per-building level
- Add service entities & power status
- Migration v1→v2: initialize grids to defaults (landValue=30, pollution=0), level=1

Migration Strategy:

1. Detect version===1
2. Allocate new grids sized to existing map
3. Initialize defaults
4. Recompute coverage & land value once post-load
5. Set version=2 before saving

---

## 📊 UI & UX Enhancements


- HUD overlay toggle control (dropdown or cycle button)
- Inspector panel additions: land value, pollution, level progress, service coverage bars
- Overlay legends (color ramp scales)
- Optional mini performance stats (ms per system) hidden behind a debug flag

---

## ⚙️ Performance Considerations


- Grids stored in contiguous Float32Array (width*height) – reuse buffers
- Diff-based overlay mesh updates (only dirty tiles since last overlay render)
- Run heavy recalculations (traffic, land value) every N ticks with interpolation if needed
- Precompute neighbor indices for diffusion kernel
- Use bit masks or Uint8Array for boolean service coverage layers

Target Costs (approx):

- Traffic aggregation (64x64, heuristic) < 2ms @ 500 flows
- Pollution diffusion (5-point stencil) < 1ms / pass
- Land value recompute < 2ms every 16 ticks

---

## 🧪 Testing Focus


- Deterministic migration: v1 save → load v2 → hash core entity & zoning state unchanged
- Level progression reproducibility under fixed seed
- Pollution spread bounded & decays to baseline
- Land value stable under steady inputs (no runaway oscillation)
- Performance budgets not exceeded (basic benchmarks)

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Traffic model complexity creep | Use aggregate OD + heuristic path splits; defer agents |
| Performance regression from grids | Interval updates + dirty regions + typed arrays |
| Land value instability (oscillation) | Apply smoothing / lerp when updating field |
| Save bloat from raw grids | Optional compression (RLE; only non-default values) |
| Upgrade thrash (flip-flopping levels) | Hysteresis: downgrade thresholds lower than upgrade |
| Service coverage expensive | Precompute BFS/radius once per placement/change |

---

## ✅ Definition of Done (Phase 2)


- Traffic, pollution, land value & service systems integrated and influencing development
- Buildings level up/down based on defined thresholds & reflected visually/data
- Overlays (traffic, pollution, land value, at least one service) toggleable & performant
- v1→v2 migration works; legacy save loads without loss (beyond new default fields)
- Performance: 128×128 map runs ≥ 55 FPS on mid-range laptop with overlays active
- Deterministic outcomes under fixed seed (no random divergence across reload)
- No uncaught errors across typical gameplay loop (1 hour simulation test)
- All new systems unit / integration tested for core formulas & edge conditions

---

## 📌 Next Phase Seeds (Phase 3 Preview)

- Agent-based commuting refinement (vehicle spawning & routing)
- Fire/disaster events & emergency services interplay
- Water/sewage & power network substations
- Modding/data pack loader
- Scenario objectives & win/fail conditions
- Dynamic pricing / market simulation

---

## 🟡 Current Status

This document defines the **Phase 2 implementation blueprint**. No Phase 2 code has been merged yet. Tasks should be broken down into incremental PRs aligned with the milestones above.

---

Prepared: 2025-08-11
