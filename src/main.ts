import { OrthoRenderer } from './render/orthoRenderer';
import './style.css';
// ECS scaffold imports
import type { System } from './ecs/system';
import { addSystem, createWorld, enqueueAction, updateWorld } from './ecs/world';
import { developmentSystem } from './systems/developmentSystem';
import { economySystem } from './systems/economySystem';
import { landValueSystem } from './systems/landValueSystem';
import { levelingSystem } from './systems/levelingSystem';
import { manualLoad, manualSave, persistenceSystem } from './systems/persistenceSystem';
import { pollutionSystem } from './systems/pollutionSystem';
import { populationSystem } from './systems/populationSystem';
import { powerDistributionSystem } from './systems/powerDistributionSystem';
import { serviceCoverageSystem } from './systems/serviceCoverageSystem';
import { trafficAggregationSystem } from './systems/trafficAggregationSystem';
import { zoningSystem } from './systems/zoningSystem';
// New imports for Phase 1 completion
import { Compass } from './ui/compass';
import { Minimap } from './ui/minimap';
import { MouseHandler, createToolMouseHandler } from './ui/mouseHandler';
import { ToolsPalette } from './ui/toolsPalette';
import { ViewControls } from './ui/viewControls';
import { ZoneInspector } from './ui/zoneInspector';
import { initializeRNG } from './utils/seededRng';

// HMR world preservation
interface PersistedState { world: any }
const hotData: any = (import.meta as any).hot?.data || {};
let world: any;
if ((import.meta as any).hot && hotData.world) {
  world = hotData.world;
  // Restore RNG state if available
  if (world.rngSeed !== undefined) {
    initializeRNG(world.rngSeed);
  }
} else {
  world = createWorld();
  // Initialize deterministic RNG for new worlds
  const seed = world.rngSeed || Date.now();
  world.rngSeed = seed;
  initializeRNG(seed);
}
addSystem(world, zoningSystem);
addSystem(world, developmentSystem);
addSystem(world, populationSystem);
addSystem(world, economySystem);
addSystem(world, pollutionSystem);
addSystem(world, landValueSystem);
addSystem(world, levelingSystem);
addSystem(world, serviceCoverageSystem);
addSystem(world, powerDistributionSystem);
addSystem(world, trafficAggregationSystem);
addSystem(world, persistenceSystem);

// Expose world for debugging / automated tests
;(window as any).__world = world;
console.debug('[debug] world exposed as __world');

// Demo: enqueue a comprehensive demo city with all zone types
if (!world._demoSeeded) {
  // Main road infrastructure (north-south and east-west)
  for (let i = 0; i < 16; i++) {
    enqueueAction(world, { type: 'PLACE_ROAD', x: 8, y: i }); // Vertical main road
    enqueueAction(world, { type: 'PLACE_ROAD', x: i, y: 8 }); // Horizontal main road
  }

  // Residential district (northwest quadrant)
  enqueueAction(world, { type: 'ZONE_RECT', rect: { x: 2, y: 2, w: 4, h: 4 }, zone: 'R' });
  enqueueAction(world, { type: 'ZONE_RECT', rect: { x: 10, y: 2, w: 4, h: 4 }, zone: 'R' });

  // Commercial district (city center - around main intersection)
  enqueueAction(world, { type: 'ZONE_RECT', rect: { x: 6, y: 6, w: 4, h: 4 }, zone: 'C' });

  // Industrial district (southeast quadrant)
  enqueueAction(world, { type: 'ZONE_RECT', rect: { x: 11, y: 11, w: 4, h: 4 }, zone: 'I' });

  // Additional roads for access
  for (let i = 2; i < 7; i++) {
    enqueueAction(world, { type: 'PLACE_ROAD', x: i, y: 5 }); // Residential access road
    enqueueAction(world, { type: 'PLACE_ROAD', x: 5, y: i }); // Residential access road
  }
  for (let i = 10; i < 15; i++) {
    enqueueAction(world, { type: 'PLACE_ROAD', x: i, y: 10 }); // Industrial access road
    enqueueAction(world, { type: 'PLACE_ROAD', x: 10, y: i }); // Industrial access road
  }

  world._demoSeeded = true;
}

// Example no-op system to demonstrate ticking
const logSystem: System = {
  name: 'log',
  order: 100,
  update: ({ tick }) => {
    if (tick % 60 === 0) console.log(`[world] tick=${tick}`)
  }
}
addSystem(world, logSystem)

let last = performance.now();
function frame(now: number) {
  const deltaSec = (now - last) / 1000;
  last = now;
  updateWorld(world, deltaSec);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Game DOM bootstrap: dedicated 3D viewport container (removes legacy 2D canvas)
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="viewport" style="position:fixed;inset:0;background:#111;z-index:0;overflow:hidden;"></div>
  <div id="hud" style="position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#222;padding:6px 10px;font:12px/1.2 monospace;color:#fff;border:1px solid #444;border-radius:4px;display:flex;gap:12px;align-items:center;z-index:10;">
    <span id="hudFunds">$----</span>
    <span id="hudPop">Pop -- (Emp --)</span>
    <label>Speed:
      <select id="hudSpeed">
        <option value="0">⏸</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
        <option value="4">4x</option>
      </select>
    </label>
    <label>Tax:
      <input id="hudTax" type="number" min="0" max="0.25" step="0.01" value="0.10" style="width:52px;"/>
    </label>
    <button id="hudSave" type="button">Save</button>
    <button id="hudLoad" type="button">Load</button>
  <button id="hudNew" type="button">New</button>
  <span id="hudClock">--:-- ☀️</span>
    <label>Overlay:
      <select id="hudOverlay">
        <option value="none">None</option>
        <option value="pollution">Pollution</option>
        <option value="landValue">Land Value</option>
        <option value="service">Service Coverage</option>
  <option value="education">Education</option>
  <option value="health">Health</option>
  <option value="safety">Safety</option>
        <option value="power">Power</option>
        <option value="traffic">Traffic</option>
        <option value="gas">Gas</option>
        <option value="water">Water</option>
        <option value="sewage">Sewage</option>
        <option value="garbage">Garbage</option>
      </select>
    </label>
  </div>`

// Three.js orthographic renderer
const rendererContainer = document.getElementById('viewport')!;
const ortho = new OrthoRenderer(rendererContainer, { tileSize: 1 });
// Force an initial resize so camera/frustum match full-screen container
ortho.onResize();

// View controls for camera manipulation
const viewControls = new ViewControls({ mapSize: { width: 48, height: 48 } });

// Set up view control callbacks
viewControls.setOnCenter(() => {
  ortho.centerCameraOnMap();
  // Save camera state after centering
  viewControls.saveCameraState(ortho.getCameraState());
});

viewControls.setOnZoomIn(() => {
  ortho.zoomIn();
  // Save camera state after zooming
  viewControls.saveCameraState(ortho.getCameraState());
});

viewControls.setOnZoomOut(() => {
  ortho.zoomOut();
  // Save camera state after zooming
  viewControls.saveCameraState(ortho.getCameraState());
});

viewControls.setOnResetZoom(() => {
  ortho.resetZoom();
  // Save camera state after reset zoom
  viewControls.saveCameraState(ortho.getCameraState());
});

// Pan buttons
viewControls.setOnPan((dx, dz) => {
  ortho.translateCameraWorld(dx, dz);
  viewControls.saveCameraState(ortho.getCameraState());
});

// Restore camera state from local storage on startup
const savedCameraState = viewControls.loadCameraState();
if (savedCameraState) {
  // Set a flag to skip the default camera initialization
  ortho.initializedView = true;
  ortho.setCameraState(savedCameraState);
}

// Set up camera change callback for mouse wheel zoom
ortho.setOnCameraChange(() => {
  viewControls.saveCameraState(ortho.getCameraState());
});

// Tools palette and mouse interaction
const toolsPaletteContainer = document.createElement('div');
document.body.appendChild(toolsPaletteContainer);
const toolsPalette = new ToolsPalette(toolsPaletteContainer);

// Zone inspector and minimap
const zoneInspector = new ZoneInspector();
const minimap = new Minimap({ width: 48, height: 48 });
const compass = new Compass();

// Connect minimap click-to-pan to camera
minimap.setOnPanToTile((tileX, tileY) => {
  ortho.centerCameraOnTile(tileX, tileY);
  // Save camera state after minimap panning
  viewControls.saveCameraState(ortho.getCameraState());
});

// Mouse handler for tool interaction
const mouseHandler = new MouseHandler(rendererContainer, { width: 48, height: 48 });
mouseHandler.setCamera(ortho.camera, ortho.scene);
mouseHandler.setOnCameraPan((deltaX, deltaY) => {
  ortho.panCamera(deltaX, deltaY);
  // Save camera state after panning
  viewControls.saveCameraState(ortho.getCameraState());
});

// Active tool persistence key
const ACTIVE_TOOL_KEY = 'simcity-active-tool';

// Helper to apply a tool selection everywhere
function applyActiveTool(tool: any) {
  currentTool = tool;
  ortho.setActiveTool(tool);
  // Persist selection
  try { localStorage.setItem(ACTIVE_TOOL_KEY, tool); } catch {}

  // Reverted: no road collision detection / blocked preview for performance simplicity

  mouseHandler.setInteraction(createToolMouseHandler(tool,
    (action) => {
      enqueueAction(world, action);
      (world as any).timeAccumulator += (world as any).fixedDelta;
      updateWorld(world, 0);
    },
    (pos, tile, dragRect, dragLine, _dragBlocked) => {
      if (pos && tile) {
        ortho.setHoveredTile(tile.x, tile.y);
        zoneInspector.showTile(tile, world.map);
      } else {
        ortho.setHoveredTile(null, null);
        zoneInspector.hideTile();
      }
      // Simple road line preview (no collision detection)
  if ((tool === 'road' || tool === 'infra_powerpole' || tool === 'infra_waterpipe' || tool === 'infra_gaspipeline') && dragLine) {
        ortho.setRoadLine(dragLine);
      } else {
        ortho.setRoadLine(null);
      }
      if (dragRect && tool.startsWith && tool.startsWith('zone_')) {
        let zone: 'R'|'C'|'I' = 'R';
        if (tool === 'zone_commercial') zone = 'C'; else if (tool === 'zone_industrial') zone = 'I';
        ortho.setSelectionRect({ ...dragRect, zone });
        ortho.setBulldozeRect(null);
      } else {
        ortho.setSelectionRect(null);
      }
      if (dragRect && tool === 'bulldoze') {
        ortho.setBulldozeRect(dragRect);
      } else if (tool === 'bulldoze') {
        // clear only if bulldoze tool active but no rect
        ortho.setBulldozeRect(null);
      }
    },
    { width: 16, height: 16 }
  ));
}

// Connect tools palette to mouse handler with persistence
let currentTool = toolsPalette.getActiveTool();
toolsPalette.setOnToolChange((tool) => {
  applyActiveTool(tool);
});

// Load persisted tool if available, else use default
try {
  const savedTool = localStorage.getItem(ACTIVE_TOOL_KEY);
  if (savedTool && savedTool !== currentTool) {
    // setActiveTool will trigger callback which calls applyActiveTool
    toolsPalette.setActiveTool(savedTool as any);
  } else {
    // No saved or same as default; apply manually
    applyActiveTool(currentTool);
  }
} catch {
  applyActiveTool(currentTool);
}

// Global Escape key to cancel zoning drag
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Clear selection preview
    ortho.setSelectionRect(null);
  ortho.setRoadLine(null);
  ortho.setBulldozeRect(null);
  mouseHandler.cancelCurrentInteraction();
  }
});
// FPS counter setup
let fpsLast = performance.now();
let fpsFrames = 0;
let fps = 0;
function ensureFpsOverlay() {
  let el = document.getElementById('fps');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fps';
    el.style.cssText = 'position:fixed;left:8px;top:8px;background:#000a;color:#0f0;padding:4px 6px;font:11px/1 monospace;border:1px solid #060;border-radius:3px;';
    el.textContent = 'FPS --';
    document.body.appendChild(el);
  }
  return el as HTMLDivElement;
}
const fpsEl = ensureFpsOverlay();
// HUD updates
const hudFunds = () => document.getElementById('hudFunds') as HTMLSpanElement | null;
const hudPop = () => document.getElementById('hudPop') as HTMLSpanElement | null;
const hudSpeedSel = () => document.getElementById('hudSpeed') as HTMLSelectElement | null;
const hudTaxInput = () => document.getElementById('hudTax') as HTMLInputElement | null;
const hudOverlaySel = () => document.getElementById('hudOverlay') as HTMLSelectElement | null;
const hudSaveBtn = () => document.getElementById('hudSave') as HTMLButtonElement | null;
const hudLoadBtn = () => document.getElementById('hudLoad') as HTMLButtonElement | null;
const hudNewBtn = () => document.getElementById('hudNew') as HTMLButtonElement | null;
const hudClock = () => document.getElementById('hudClock') as HTMLSpanElement | null;
function bindHud() {
  hudSpeedSel()?.addEventListener('change', e => {
    const val = parseInt((e.target as HTMLSelectElement).value, 10) as 0|1|2|4;
    world.speed = val;
  });
  hudTaxInput()?.addEventListener('change', e => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    world.taxRate = Math.max(0, Math.min(0.25, v));
  });
  hudOverlaySel()?.addEventListener('change', e => {
    const val = (e.target as HTMLSelectElement).value as any;
    world.overlayMode = val;
  });
  hudSaveBtn()?.addEventListener('click', () => manualSave(world));
  hudLoadBtn()?.addEventListener('click', () => { manualLoad(world); });
  hudNewBtn()?.addEventListener('click', () => {
    // Create a fresh world with new seed while preserving UI state (camera, tool, overlay)
    const prevCamera = ortho.getCameraState();
    const prevTool = currentTool;
    const prevOverlay = (hudOverlaySel()?.value) || 'none';
    const newWorld = createWorld();
    // New deterministic seed
    const seed = Date.now();
    newWorld.rngSeed = seed;
    initializeRNG(seed);
    // Transfer systems
    newWorld.systems = world.systems; // reuse existing systems list
    // Replace global world reference
    world = newWorld;
    // Recenter / restore camera
    ortho.initializedView = true;
    ortho.setCameraState(prevCamera);
    world.overlayMode = prevOverlay as any;
    applyActiveTool(prevTool);
  });
}
bindHud();
function render3D() {
  ortho.frame(world.map);
  minimap.updateMap(world.map);
  // Update compass heading based on current camera
  compass.updateWithCamera(ortho.camera);
  fpsFrames++;
  const now = performance.now();
  const dt = now - fpsLast;
  if (dt >= 500) { // update twice a second for stability
    fps = Math.round((fpsFrames * 1000) / dt);
    fpsEl.textContent = `FPS ${fps}`;
    const fundsEl = hudFunds();
    if (fundsEl) fundsEl.textContent = `$${world.treasury.toFixed(2)}`;
    const popEl = hudPop();
    if (popEl) {
      const p = world.population;
      popEl.textContent = `Pop ${p.residents} (Emp ${(p.employmentRate*100).toFixed(0)}%)`;
    }
    const clockEl = hudClock();
    if (clockEl) {
      // New rule: 1 real simulation second = 1 in-game minute.
      // simTimeSec already accumulates simulation seconds (after speed scaling).
      const totalMinutes = Math.floor(world.simTimeSec); // 1 sec -> 1 minute
      const minutesInDay = 24 * 60;
      const dayMinutes = totalMinutes % minutesInDay;
      const hours = Math.floor(dayMinutes / 60);
      const minutes = dayMinutes % 60;
      const hh = hours.toString().padStart(2,'0');
      const mm = minutes.toString().padStart(2,'0');
      const isNight = hours < 6 || hours >= 18;
      clockEl.textContent = `${hh}:${mm} ${isNight ? '🌙' : '☀️'}`;
    }
    fpsFrames = 0;
    fpsLast = now;
  }
  requestAnimationFrame(render3D);
}
render3D();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as (T | null);

function refreshDebug() {
  const map: any[][] = (world as any).map;
  const sample: string[] = [];
  for (let y = 0; y < 8; y++) {
    const row = map[y].slice(0, 16).map(t => {
      if (!t.zone) return '.';
      if (!t.developed) return (t.zone + (t.progress !== undefined ? Math.floor((t.progress||0)*9) : '0'));
      return t.zone + 'D';
    }).join(' ');
    sample.push(row);
  }
  const inspectEl = $('#dbgInspect');
  if (inspectEl) inspectEl.textContent = sample.join('\n');
  requestAnimationFrame(refreshDebug);
}
refreshDebug();

// HMR disposal: save world
if ((import.meta as any).hot) {
  (import.meta as any).hot.dispose((data: PersistedState) => {
    data.world = world;
  });
}
