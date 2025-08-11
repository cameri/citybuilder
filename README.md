
# CityBuilder (Orthographic 3D, Browser)

CityBuilder is a city-building simulation game that allows players to design, build, and manage their own virtual city. The game offers a rich experience with various aspects of urban planning, including zoning, infrastructure, public services, and economic management.

## Installation

1. Clone the repository:

   ```shell
   git clone https://github.com/cameri/citybuilder.git
   ```

2. Navigate to the project directory:

   ```shell
   cd citybuilder
   ```

3. Install dependencies:

   ```shell
   npm install
   ```

4. Start the development server:

   ```shell
   npm run dev
   ```

5. Build the project (production):

   ```shell
   npm run build
   ```

6. Preview the production build:

   ```shell
   npm run preview
   ```

## Quickstart

- **Node:** v18+ recommended (works on v20+).
- **Browsers:** Latest Chrome, Edge, Firefox; Safari 16+ (WebGL2).
- **Run:** `npm run dev` then open the printed localhost URL.
- **Reset save:** Clear localStorage key `sc4like.save.v1`.

## Features

- **City Planning:** Design your city layout with residential, commercial, and industrial zones.
- **Infrastructure:** Build roads, power plants, water systems, and public transportation.
- **Public Services:** Manage police, fire departments, hospitals, and schools to keep your citizens happy and safe.
- **Economy:** Balance the city budget, set tax rates, and attract businesses.
- **Disasters:** Handle natural disasters like earthquakes and fires.
- **Growth:** Watch your city grow and evolve based on your decisions.

## Usage

- **Pan/Zoom:** Drag to pan; mouse wheel or trackpad to zoom.
- **Tools:** Use the toolbar to paint zones, draw roads, bulldoze.
- **Speed:** Pause / 1× / 2× / 4× / 8× via the time controls in the HUD.
- **Inspect:** Click a tile/building to view details.
- **Save/Load:** Autosaves periodically; manual Save/Load in the menu.

## Screenshots

*(Coming soon)*
![City overview](./docs/images/overview.png)
![Zoning tool](./docs/images/zoning.png)

This project is licensed under the MIT License. See the LICENSE file for details.

## Vision

SimCity aims to provide an immersive and realistic city-building experience that balances complexity and accessibility. We want players to feel empowered to create unique cities while engaging deeply with urban planning challenges, sustainability, and socio-economic dynamics.

## Core Pillars

- **Player Empowerment:** Provide intuitive tools for city design and management.
- **Realism and Depth:** Simulate realistic city dynamics including traffic, economy, and public services.
- **Modularity:** Use a flexible architecture that allows easy extension and modding.
- **Performance:** Ensure smooth gameplay even with large, complex cities.
- **Replayability:** Offer diverse scenarios and challenges to keep players engaged.

## Time Model

The game operates on a discrete time-step model where the simulation advances in fixed intervals (ticks). Each tick processes updates for all entities and systems, such as population growth, resource consumption, and infrastructure status. This approach allows for consistent and manageable simulation progression while enabling features like pausing, fast-forwarding, and time scaling.

## High-Level Architecture

SimCity is built using an Entity-Component-System (ECS) architecture:

- **Entities:** Represent individual objects in the game world (e.g., buildings, vehicles, citizens).
- **Components:** Hold data attributes for entities (e.g., position, health, zoning type).
- **Systems:** Contain logic that operates on entities with specific components (e.g., traffic system, economy system).

This architecture promotes separation of concerns, modularity, and scalability, making it easier to maintain and extend the game.

### Rendering Strategy

The game uses an **orthographic camera** in Three.js to achieve an isometric, SimCity‑like visual style. Key aspects include:
- OrthographicCamera with a fixed isometric tilt for a classic city‑builder perspective.
- Chunked mesh rendering: the map is divided into chunks that are rebuilt only when changes occur, improving performance.
- InstancedMesh for repeating elements (trees, windows, vehicles) to minimize draw calls.
- Lightweight day/night and seasonal tinting without heavy dynamic shadows.
- All rendering logic is separated from the simulation code for maintainability.

## Tech Stack

The project leverages modern web technologies including:

- **TypeScript:** For type-safe, maintainable code.
- **Vite:** Fast development build tool and bundler.
- **Three.js:** For 3D rendering and visualization.
- **ECS Architecture:** To structure game logic and data efficiently.
- **bitECS:** ECS implementation for high-performance, data-oriented game logic.

## Project Structure

```plaintext
.
├── assets/                # Game assets (textures, models, sounds)
├── docs/                  # Documentation and images
│   └── images/
├── public/                # Static files served as-is
│   └── favicon.ico
├── scripts/               # Build and deployment scripts
├── src/                   # All source code
│   ├── components/        # UI and React/Vue/Svelte/Preact components (if applicable)
│   ├── ecs/               # Entity-Component-System framework code
│   ├── systems/           # Game systems (simulation, rendering, etc.)
│   ├── blueprints/        # Data-driven definitions for buildings, roads, etc.
│   ├── utils/             # Utility functions and helpers
│   ├── main.ts            # Entry point
│   └── ...                # Other feature folders/files
├── tests/                 # Unit and integration tests
├── package.json           # Project dependencies and scripts
├── README.md              # Project documentation
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite build configuration
```

## Actions & Blueprints

- **Actions:** Represent player or system-initiated commands (e.g., place building, upgrade road).
- **Blueprints:** Templates defining the properties and requirements for buildings and infrastructure.

Actions are validated against blueprints to ensure consistency and feasibility before execution. This system supports undo/redo functionality and enables complex interactions.

## Serialization Format (Save)

Game state is serialized into a JSON-based format capturing:

- Entity states with their components.
- Current simulation time and tick count.
- Player progress and settings.
- World configuration and active scenarios.

This format is designed for easy saving, loading, and potential sharing of city states.

**Example save (v1)**
```json
{
  "version": 1,
  "seed": 1337,
  "calendar": { "ticks": 123456, "speed": 4 },
  "world": { "entities": [], "components": {} },
  "rulesVersion": "2025-08-11"
}
```
- **Storage key:** `sc4like.save.v1`
- To reset: open DevTools → Application → Local Storage → delete the key.

## Hot-Reload Behavior

During development, the game supports hot-reloading of code and assets without losing the current simulation state. This accelerates iteration by preserving the city state while applying code changes, minimizing downtime and improving developer productivity.

### HMR caveats
- Simulation state (world + clock) is serialized on module dispose and restored on accept.
- Three.js scene/renderer are **recreated** on update and all GPU resources are disposed.
- If you observe rising GPU memory after multiple edits, please file an issue with steps.

## Roadmap

- **Phase 1:** Core simulation mechanics, basic UI, and essential systems (zoning, economy, traffic).
- **Phase 2:** Advanced features like disasters, public services, and detailed citizen behavior.
- **Phase 3:** Modding support, multiplayer modes, and scenario editor.
- **Phase 4:** Performance optimizations, AI enhancements, and mobile support.

## Non-Goals (Early Stage)

- Multiplayer.
- Full mod loader (basic data-driven blueprints only for now).
- Ultra-realistic dynamic shadows; we use lightweight lighting initially.
- Mobile optimization beyond basic support.

## Contribution Guide

- Fork & PR with small, focused changes.
- Use TypeScript; keep simulation code rendering-agnostic.
- Lint/format: (TBD) ESLint + Prettier.
- Tests live in `/tests`; add tests for time math, serialization, and ECS systems.

## Testing

- Run unit tests: `npm test` (TBD initial setup).
- Determinism: use seeded RNG for reproducible results in tests.

## LLM / Agent API (Experimental)

- **Actions (input):** JSON messages like `{ "type": "ZONE_RECT", "zone": "residential", "rect": {"x":10,"y":12,"w":6,"h":4} }`
- **Observations (output):** JSON snapshot of relevant city metrics and a minimap/chunk summary.
- Schemas will live under `/data/schemas` (TBD).

## Performance Targets (Initial)

- 60 FPS @ 1080p on mid‑range laptops with a 256×256 tile map.
- Dirty-chunk rebuilds only; extensive use of InstancedMesh for props.

## Security & Privacy

- No network telemetry; all saves live in localStorage on your machine.
- Clearing your browser storage removes saves and settings.

## Third‑Party Licenses & Attributions

- Core code licensed under MIT.
- Any external art/audio must be CC0 or CC‑BY and credited in `/ATTRIBUTIONS.md`.
