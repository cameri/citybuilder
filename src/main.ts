import { setupCounter } from './counter.ts';
import './style.css';
import typescriptLogo from './typescript.svg';
import viteLogo from '/vite.svg';
// ECS scaffold imports
import type { System } from './ecs/system';
import { addSystem, createWorld, enqueueAction, updateWorld } from './ecs/world';
import { developmentSystem } from './systems/developmentSystem';
import { zoningSystem } from './systems/zoningSystem';

const world = createWorld();
addSystem(world, zoningSystem);
addSystem(world, developmentSystem);

// Demo: enqueue a couple of zone actions
enqueueAction(world, { type: 'SET_ZONE', x: 2, y: 2, zone: 'R' });
enqueueAction(world, { type: 'SET_ZONE', x: 3, y: 2, zone: 'R' });

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

// existing DOM bootstrap

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
  <div id="debug" style="position:fixed;top:8px;right:8px;background:#222;padding:8px;font:12px/1.2 monospace;color:#fff;max-width:260px;border:1px solid #444;border-radius:4px;">
    <strong>Debug Actions</strong><br/>
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
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

// Debug UI wiring
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
$('#dbgSetZone').onclick = () => {
  const x = parseInt(($('#dbgX') as HTMLInputElement).value, 10);
  const y = parseInt(($('#dbgY') as HTMLInputElement).value, 10);
  const zoneSel = $('#dbgZone') as HTMLSelectElement;
  const zoneVal = zoneSel.value || null;
  enqueueAction(world, { type: 'SET_ZONE', x, y, zone: zoneVal as any });
};
$('#dbgSetSpeed').onclick = () => {
  const speed = parseInt(($('#dbgSpeed') as HTMLSelectElement).value, 10) as 1 | 2 | 4 | 8;
  enqueueAction(world, { type: 'SET_TIME_SCALE', speed });
};

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
  $('#dbgInspect').textContent = sample.join('\n');
  requestAnimationFrame(refreshDebug);
}
refreshDebug();
