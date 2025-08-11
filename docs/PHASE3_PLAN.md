# Phase 3 Plan – Agents, Disasters, Utilities Networks, Scenarios & Modding (PLANNING)

## Status: 🟡 PLANNING / NOT IMPLEMENTED

Phase 3 deepens simulation fidelity and player agency by introducing **explicit agent flows (commuters & service vehicles)**, **disaster & emergency response loops**, **utility networks (water, power grid refinement, sewage)**, and **the first iteration of modding & scenario systems**. It layers event-driven gameplay on top of the strategic gradients (traffic, land value, pollution, services) established in Phases 1–2.

---

## 🎯 Primary Objectives

- Implement an aggregate → sampled **agent commuting model** (vehicles/commuters) to refine traffic realism.
- Add **fire & disaster events** (fire outbreaks, industrial accidents) with containment & economic impact.
- Introduce **water & sewage network simulation** (coverage, capacity, contamination).
- Refine **power network** from radius model to graph (substations, transmission loss).
- Add **emergency services** (fire, ambulance) with dispatch logic & response time metrics.
- Provide **Scenario / Objective framework** (win/fail conditions, scripted triggers).
- Launch **Modding v1**: data pack loader (blueprints, tuning JSON, overlays), safe sandbox.
- Implement **economic depth**: separate residential vs. commercial tax rates, service upkeep scaling.
- Add **citizen well-being metrics** (health, education, safety index) feeding demand & migration.
- Enhance **UI dashboards & analytics** (trend graphs, event log, system metrics).
- Maintain deterministic replay (seed + deterministic event schedule) for tests.

---

## 🧱 Scope

### In

- Agent representation: pooled commuters (sampled subset) with path caching.
- Pathfinding: hierarchical A* / multi-source BFS over road graph with congestion weighting.
- Fire disaster model: ignition chance, spread probability, suppression by fire coverage & response time.
- Water & sewage: pipe network (graph), capacity flow, service coverage & contamination penalty.
- Power network refinement: substation nodes, capacity routing, blackout risk on overload.
- Emergency dispatch system: queue events → assign nearest available unit → resolve.
- Scenario engine: JSON scenario definition (objectives, triggers, rewards, fail states).
- Modding data packs: load external JSON (blueprints, curves) via drag/drop or input element (no remote fetch by default).
- Event log system & timeline (disasters, upgrades, service outages).
- Expanded economy: differentiated tax sliders (res/com/ind), service cost modifiers, disaster recovery costs.
- Graph / chart components (rolling averages, time-series) for population, treasury, pollution, traffic.
- Save format v3 + migration (adds agents, networks, scenarios state).

### Out (Deferred)

- Multiplayer / shared simulation.
- Full scripting runtime (only declarative JSON this phase).
- Weather & climate systems (future phase).
- Complex crime simulation (basic safety index only now).
- Complex logistics (freight routing) – future.

---

## 🗺️ High-Level Milestones

1. Save v3 & Migration Harness (v1/v2 → v3 stack, tests).
2. Road Graph Upgrade (adjacency caching, hierarchical regions, path cost API).
3. Commuter Agent Layer & Pathfinding (sampled flows + synthetic expansion to load).
4. Power Network Graph (substations, load balancing, overload states).
5. Water & Sewage Network (pipes placement, flow capacity, contamination source diffusion).
6. Emergency Services Entities (fire station, clinic upgrade path, dispatch system).
7. Fire & Disaster Event System (ignition logic, spread, suppression, damage + rebuild costs).
8. Scenario / Objective Engine (definitions, progress tracking, UI panel).
9. Modding v1 (data pack ingestion, validation, hot-reload, sandbox guards).
10. Economic Enhancements (separate tax rates, disaster costs, service scaling curve).
11. Citizen Well-being Metrics & Demand Integration.
12. UI Analytics Layer (charts, event log, overlay legend improvements).
13. Performance & Profiling Pass (agents & networks scaling).
14. QA, Balancing & Deterministic Regression Suite.

---

## 🧩 New / Expanded ECS Components

- AgentComponent { type:'commuter'; homeEntity:number; workEntity:number; path?:number[]; progress:number }
- VehicleComponent { speed:number; state:'moving'|'waiting' }
- FireRiskComponent { ignitionChance:number; burning:boolean; intensity:number }
- DamageComponent { damageLevel:0..1; needsRepair:boolean }
- PowerNodeComponent { capacity:number; load:number; kind:'plant'|'substation'|'consumer' }
- PowerEdge (graph registry, not per-entity component; adjacency list)
- WaterNodeComponent { capacity:number; flow:number; kind:'source'|'junction'|'consumer' }
- SewageNodeComponent { capacity:number; effluent:number }
- PipeComponent { type:'water'|'sewage'; throughput:number }
- DispatchableComponent { service:'fire'|'medical'; available:boolean }
- IncidentComponent { kind:'fire'|'medical'; severity:number; createdTick:number; handled:boolean }
- ScenarioState (singleton: objective progress, active events)
- ModRegistry (singleton: loadedPacks:string[], blueprintOverrides:Map, curves:Map )
- WellBeingComponent { health:number; education:number; safety:number; happiness:number }
- TrendBuffer (singleton: rolling arrays metrics)

---

## 🛠️ Systems (Phase 3 Additions)

- PathfindingSystem: batch or incremental solve, caching results with congestion invalidation.
- AgentSpawnSystem: sample commuter agents proportionally to aggregate R↔C/I flows.
- AgentMovementSystem: advance along path; update traffic load contributions in finer granularity.
- FireRiskSystem: compute ignition; escalate burning tiles; request dispatch.
- FireSpreadSystem: propagate based on neighbors, wind placeholder (later real weather), apply damage.
- DisasterResolutionSystem: apply repair costs, mark rebuild states, trigger economic penalties.
- PowerDistributionGraphSystem: recompute load flows, detect overload, blackout fallback.
- WaterFlowSystem: compute water distribution & pressure; mark coverage.
- SewageFlowSystem: compute effluent routing & contamination index.
- DispatchSystem: match incidents to nearest available dispatchable units (A* distance) and route.
- ScenarioSystem: evaluate triggers, update objectives, emit events to log.
- ModLoadingSystem: validate packs, inject blueprint / curve overrides; maintain deterministic order.
- WellBeingSystem: derive well-being indexes from services, pollution, response times.
- DemandAdjustmentSystem (Phase 3 refinement): integrate well-being & scenario modifiers.
- TrendRecordingSystem: push metrics (population, treasury, traffic, pollution, fires, outages) to ring buffers.
- AnalyticsUISystem: prepare chart data snapshots / overlays.

---

## 🔁 Extended Simulation Scheduling (Draft)

1. Base Phase 2 flow (time, zoning, development, environment, leveling, economy).
2. ScenarioSystem (early triggers each cycle).
3. AgentSpawnSystem (periodic) → PathfindingSystem (queue solves).
4. AgentMovementSystem (per tick / substep) → feeds fine traffic increments.
5. FireRiskSystem / FireSpreadSystem / Incident creation.
6. DispatchSystem & movement of service vehicles.
7. PowerDistributionGraphSystem / WaterFlowSystem / SewageFlowSystem.
8. DisasterResolutionSystem (if incidents resolved or expired).
9. WellBeingSystem & DemandAdjustmentSystem.
10. TrendRecordingSystem / AnalyticsUISystem.
11. Persistence checkpoint.

Heavy systems (pathfinding, flow recomputation) may run on interval ticks (e.g. every 4–8) with interpolation or carry-over caches.

---

## 🧮 Core Formulas & Models (Draft)

Traffic Link Cost (for pathfinding):

```txt
cost = baseLength * (1 + congestionFactor * (load / capacity)^alpha)
```

Fire Ignition Probability (per tile with risk):

```txt
P(ignite) = baseRisk * (1 + pollutionBoost) * (1 - safetyCoverage)
```

Fire Spread Probability (tile A → neighbor B):

```txt
P(spread) = intensity_A * spreadCoeff * (1 - moisture) * (1 - safetyCoverage_B)
```

Power Flow Overload Check:

```txt
overloadRatio = totalLoad / totalCapacity
if overloadRatio > threshold -> blackoutPenalty = (overloadRatio - threshold) * penaltyScale
```

Well-being Index (health example):

```txt
healthIndex = clamp( base + clinicCoverage*0.5 - pollution*0.002 - responseTimePenalty, 0, 1 )
```

Scenario Objective Progress (generic):

```txt
progress = clamp( (currentMetric - startMetric) / (targetMetric - startMetric), 0, 1 )
```

---

## 💾 Persistence (v3)

- version: 3
- Add: agents (sampled state), incidents, power/water/sewage graphs, scenario state, mod registry.
- Trend buffers (optionally truncated or aggregated for save size).
- Migration: initialize new structures empty; reconstruct graphs from placed infrastructure.
- Deterministic ordering: serialize entities sorted by id; graphs adjacency lists sorted.

Migration Steps (v2→v3):

1. Detect version < 3.
2. Allocate network graph structures.
3. Infer existing power coverage into initial substation nodes (if needed).
4. Initialize scenario state (no active objectives unless scenario save flag present).
5. Initialize trend buffers with baseline metrics.
6. Set version = 3.

---

## 📦 Modding v1 – Data Packs

Format: zipped or folder JSON bundle (user-provided via file input) with manifest:

```json
{
  "id": "example.pack.basic",
  "version": 1,
  "blueprints": [ { "id":"res.high.alt","baseCapacity":45,... } ],
  "curves": { "resDemand": [ [0,0.2],[1000,0.8] ] },
  "overrides": { "tax.max": 0.35 }
}
```

Validation Rules:

- Disallow executable code (JSON only).
- Size limits (e.g. < 512 KB) this phase.
- Deterministic load order: alphabetical by pack id.
- Hash manifest to include in save for reproducibility.

Failure Handling:

- On validation failure: reject pack, log error entry, do not mutate state.

---

## 📊 UI Enhancements

- Scenario panel (objectives list, progress bars, rewards countdown).
- Event log (chronological feed with filters: economy, disasters, services, mods).
- Charts: population, treasury, traffic avg, pollution avg, active incidents.
- Network overlays: power load, water pressure, sewage flow, fire risk.
- Agent density heatmap (sampled occupancy) toggle.

---

## ⚙️ Performance & Scaling Targets

- 128×128 map with 2–3k sampled agents (representing larger aggregate) ≥ 55–60 FPS.
- Pathfinding budget: < 4 ms per interval batch (coalesced queries, cache hits ≥ 70%).
- Disaster step (spread + suppression) < 1 ms average.
- Network recompute intervals: power/water/sewage each < 2 ms at target size.
- Memory growth bounded; no unbounded agent accumulation (cap + recycling pool).

Optimizations:

- Path cache invalidation by localized dirty road segments.
- Agent pooling & component reuse.
- Sparse incident sets; early exit if no active fires.
- Graph precomputation (node coordinates, heuristic distances).
- Incremental flow update when only local edge changes occur.

---

## 🧪 Testing & Validation Focus

- Deterministic pathfinding results (same seed & layout).
- Fire spread statistical bounds (Monte Carlo test harness) stay within confidence interval.
- Migration integrity: v2 save → v3 load preserves economy & zoning hashes.
- Mod pack collision resolution deterministic (tie-break by id order).
- Performance regression guards (microbench tasks for pathfinding & network flows).
- Scenario objective completion correctness vs. scripted test scenario JSON.

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Pathfinding cost explosion | Hierarchical graph + caching + interval solves |
| Agent visual clutter | Sampled subset + density heatmap overlay |
| Disaster difficulty spikes | Adaptive ignition scaling & cap concurrent incidents |
| Mod pack abuse / malformed data | Strict JSON schema validation + size limits |
| Network simulation complexity | Start coarse (no pressure waves), refine later |
| Determinism drift (floating ops) | Use integer / fixed-point where feasible for critical loops |
| Save bloat from trend buffers | Downsample / store deltas / cap length |

---

## ✅ Definition of Done (Phase 3)

- Agent commuting layer actively influences congestion & accessibility metrics.
- Fire/disaster system with ignition, spread, suppression, damage & economic effects.
- Power, water, sewage networks operational with load / capacity logic & coverage impact.
- Emergency dispatch functioning with measurable response times affecting well-being.
- Scenario framework supports at least: population target, treasury goal, time limit, disaster survival objective.
- Modding v1 loads external JSON packs (blueprints, curves) safely & deterministically.
- UI: scenario panel, event log, charts, and at least 3 new network overlays.
- Save version v3 migration passes automated regression tests; prior saves load without corruption.
- Performance targets met under benchmark scenario (profiling report captured).
- Deterministic replay test (seed + action script) produces identical summary metrics.
- Comprehensive tests for pathfinding, disaster spread, network flow, migration, mod validation.

---

## 📌 Phase 4 Seeds (Preview)

- Advanced AI behaviors (household relocation, business profit simulation).
- Climate & weather systems (wind affecting pollution/fire, rainfall recharging water).
- Crime, policing depth, and justice system metrics.
- UI theming & accessibility improvements; localization.
- Mobile performance optimization & adaptive LOD.
- Deeper mod API (scripted logic with sandboxed WASM or DSL).

---

## 🟡 Current Status

This document delineates the **Phase 3 blueprint**. No Phase 3 implementation merged yet. Milestones should be decomposed into incremental, test-backed PRs.

---

Prepared: 2025-08-11
