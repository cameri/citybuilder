import { OrthoRenderer } from './render/orthoRenderer';
import './style.css';
// ECS scaffold imports
import type { System } from './ecs/system';
import { addSystem, createWorld, enqueueAction, updateWorld } from './ecs/world';
import { developmentSystem } from './systems/developmentSystem';
import { economySystem } from './systems/economySystem';
import { manualLoad, manualSave, persistenceSystem } from './systems/persistenceSystem';
import { populationSystem } from './systems/populationSystem';
import { zoningSystem } from './systems/zoningSystem';
// New imports for Phase 1 completion
import { MouseHandler, createToolMouseHandler } from './ui/mouseHandler';
import { ToolsPalette } from './ui/toolsPalette';
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
addSystem(world, persistenceSystem);

// Demo: enqueue a couple of zone actions
if (!world._demoSeeded) {
  enqueueAction(world, { type: 'SET_ZONE', x: 2, y: 2, zone: 'R' });
  enqueueAction(world, { type: 'SET_ZONE', x: 3, y: 2, zone: 'R' });
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
  <div id="viewport" style="width:640px;height:640px;position:relative;border:1px solid #333;background:#111;"></div>
  <div id="hud" style="position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#222;padding:6px 10px;font:12px/1.2 monospace;color:#fff;border:1px solid #444;border-radius:4px;display:flex;gap:12px;align-items:center;">
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
  </div>`

// Three.js orthographic renderer
const rendererContainer = document.getElementById('viewport')!;
const ortho = new OrthoRenderer(rendererContainer, { tileSize: 1 });

// Tools palette and mouse interaction
const toolsPaletteContainer = document.createElement('div');
document.body.appendChild(toolsPaletteContainer);
const toolsPalette = new ToolsPalette(toolsPaletteContainer);

// Mouse handler for tool interaction
const mouseHandler = new MouseHandler(rendererContainer, { width: 16, height: 16 });

// Connect tools palette to mouse handler
let currentTool = toolsPalette.getActiveTool();
toolsPalette.setOnToolChange((tool) => {
  currentTool = tool;
  mouseHandler.setInteraction(createToolMouseHandler(tool, (action) => {
    enqueueAction(world, action);
    // Force immediate processing for responsive UI
    (world as any).timeAccumulator += (world as any).fixedDelta;
    updateWorld(world, 0);
  }));
});

// Initialize with default tool
mouseHandler.setInteraction(createToolMouseHandler(currentTool, (action) => {
  enqueueAction(world, action);
  (world as any).timeAccumulator += (world as any).fixedDelta;
  updateWorld(world, 0);
}));
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
const hudSaveBtn = () => document.getElementById('hudSave') as HTMLButtonElement | null;
const hudLoadBtn = () => document.getElementById('hudLoad') as HTMLButtonElement | null;
function bindHud() {
  hudSpeedSel()?.addEventListener('change', e => {
    const val = parseInt((e.target as HTMLSelectElement).value, 10) as 0|1|2|4;
    world.speed = val;
  });
  hudTaxInput()?.addEventListener('change', e => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    world.taxRate = Math.max(0, Math.min(0.25, v));
  });
  hudSaveBtn()?.addEventListener('click', () => manualSave(world));
  hudLoadBtn()?.addEventListener('click', () => { manualLoad(world); });
}
bindHud();
function render3D() {
  ortho.frame(world.map);
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
    fpsFrames = 0;
    fpsLast = now;
  }
  requestAnimationFrame(render3D);
}
render3D();

// Debug UI wiring (deterministic creation & binding)
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as (T | null);
function ensureDebugUI() {
  // Deduplicate stale debug panels (keep first) in case of HMR stacking
  const panels = Array.from(document.querySelectorAll('#debug')) as HTMLElement[];
  if (panels.length > 1) {
    panels.slice(1).forEach(p => p.remove());
  }
  if (!$('#dbgSetZone')) {
    // Rebuild (idempotent) debug panel if missing
    const debugHtml = `
    <div id="debug" style="position:fixed;top:8px;right:8px;background:#222;padding:6px 8px 8px;font:12px/1.2 monospace;color:#fff;max-width:260px;border:1px solid #444;border-radius:4px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
        <strong style="font-size:12px;">Debug</strong>
        <button id="dbgToggle" type="button" style="background:#333;color:#fff;padding:2px 6px;font:11px;border:1px solid #555;cursor:pointer;">+</button>
      </div>
      <div id="dbgBody" style="display:none;">
      <div style="margin-bottom:4px;font-weight:bold;">Actions</div>
      <label>Zone Type:
        <select id="dbgZone">
          <option value="R">R</option>
          <option value="C">C</option>
          <option value="I">I</option>
          <option value="">(clear)</option>
        </select>
      </label><br/>
      <label>X:<input id="dbgX" type="number" value="4" style="width:48px;"/></label>
      <label>Y:<input id="dbgY" type="number" value="4" style="width:48px;"/></label>
      <button id="dbgSetZone" type="button">Set Zone</button>
      <hr style="margin:6px 0;border:none;border-top:1px solid #444;"/>
      <label>Speed:
        <select id="dbgSpeed">
          <option>1</option>
          <option>2</option>
          <option>4</option>
          <option>8</option>
        </select>
      </label>
      <button id="dbgSetSpeed" type="button">Set Speed</button>
      <div id="dbgInspect" style="margin-top:6px;white-space:pre;overflow:auto;max-height:160px;"></div>
      </div>
    </div>`;
    const appEl = document.getElementById('app');
    if (appEl) appEl.insertAdjacentHTML('beforeend', debugHtml);
  }
  const setZoneBtn = $('#dbgSetZone');
  const setSpeedBtn = $('#dbgSetSpeed');
  const toggleBtn = $('#dbgToggle');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const body = $('#dbgBody');
      if (!body) return;
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? '' : 'none';
      toggleBtn.textContent = hidden ? '−' : '+';
    };
  }
  if (setZoneBtn && !setZoneBtn.onclick) {
    setZoneBtn.onclick = () => {
      const xInput = $('#dbgX') as HTMLInputElement | null;
      const yInput = $('#dbgY') as HTMLInputElement | null;
      const zoneSel = $('#dbgZone') as HTMLSelectElement | null;
      if (!xInput || !yInput || !zoneSel) return;
      const x = parseInt(xInput.value, 10);
      const y = parseInt(yInput.value, 10);
      const zoneVal = zoneSel.value || null;
  console.debug('[debug-ui] enqueue SET_ZONE', { x, y, zone: zoneVal });
  enqueueAction(world, { type: 'SET_ZONE', x, y, zone: zoneVal as any });
  // Force immediate processing so user sees result without waiting half-tick
  (world as any).timeAccumulator += (world as any).fixedDelta;
  // Run an immediate flush update (zero real delta) so zoning applies instantly
  updateWorld(world, 0);
    };
  }
  if (setSpeedBtn && !setSpeedBtn.onclick) {
    setSpeedBtn.onclick = () => {
      const speedSel = $('#dbgSpeed') as HTMLSelectElement | null;
      if (!speedSel) return;
      const speed = parseInt(speedSel.value, 10) as 1 | 2 | 4 | 8;
      enqueueAction(world, { type: 'SET_TIME_SCALE', speed });
    };
  }
}
ensureDebugUI();

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
