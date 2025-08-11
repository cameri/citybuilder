import { setupCounter } from './counter.ts'
import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
// ECS scaffold imports
import type { System } from './ecs/system'
import { addSystem, createWorld, updateWorld } from './ecs/world'
import { zoningSystem } from './systems/zoningSystem'

const world = createWorld()
addSystem(world, zoningSystem)

// Demo: zone a few tiles residential to see development flag update later
;(world as any).map[2][2].zone = 'R'
;(world as any).map[2][3].zone = 'R'

// Example no-op system to demonstrate ticking
const logSystem: System = {
  name: 'log',
  order: 100,
  update: ({ tick }) => {
    if (tick % 60 === 0) console.log(`[world] tick=${tick}`)
  }
}
addSystem(world, logSystem)

let last = performance.now()
function frame(now: number) {
  const deltaSec = (now - last) / 1000
  last = now
  updateWorld(world, deltaSec)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

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
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
