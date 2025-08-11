import * as THREE from 'three';

export class Compass {
  private container: HTMLDivElement;
  private needle: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'compass';
    this.container.style.cssText = `
      position: fixed;
      left: 16px;
      bottom: 16px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: radial-gradient(closest-side, #222 0%, #111 70%);
      border: 1px solid #444;
      box-shadow: 0 0 8px #0008 inset, 0 2px 8px #0008;
      z-index: 1000;
      display: grid;
      place-items: center;
      user-select: none;
      pointer-events: none;
    `;

    // Dial markings for cardinal directions in isometric view
    // In isometric view: North is toward top-right, East is toward bottom-right
    const north = document.createElement('div');
    north.textContent = 'N';
    north.style.cssText = `
      position: absolute; top: 2px; right: 2px;
      font: 8px/1 monospace; color: #e0e0e0; letter-spacing: 1px;
      text-shadow: 0 1px 2px #000c;
    `;
    this.container.appendChild(north);

    const east = document.createElement('div');
    east.textContent = 'E';
    east.style.cssText = `
      position: absolute; bottom: 2px; right: 2px;
      font: 8px/1 monospace; color: #e0e0e0; letter-spacing: 1px;
      text-shadow: 0 1px 2px #000c;
    `;
    this.container.appendChild(east);

    const south = document.createElement('div');
    south.textContent = 'S';
    south.style.cssText = `
      position: absolute; bottom: 2px; left: 2px;
      font: 8px/1 monospace; color: #e0e0e0; letter-spacing: 1px;
      text-shadow: 0 1px 2px #000c;
    `;
    this.container.appendChild(south);

    const west = document.createElement('div');
    west.textContent = 'W';
    west.style.cssText = `
      position: absolute; top: 2px; left: 2px;
      font: 8px/1 monospace; color: #e0e0e0; letter-spacing: 1px;
      text-shadow: 0 1px 2px #000c;
    `;
    this.container.appendChild(west);

    // Needle - points toward north (top-right in isometric view)
    this.needle = document.createElement('div');
    this.needle.style.cssText = `
      width: 0; height: 0; position: relative;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 16px solid #ff5252; /* red triangle pointing up by default */
      filter: drop-shadow(0 1px 2px #000a);
      transform-origin: 50% 12px; /* pivot near base of triangle */
      transition: transform 80ms linear;
      transform: rotate(45deg); /* point to top-right (north in isometric view) */
    `;
    this.container.appendChild(this.needle);

    // Tick marks aligned with isometric directions
    const directions = [45, 135, 225, 315]; // N, E, S, W in isometric view
    directions.forEach((angle) => {
      const tick = document.createElement('div');
      tick.style.cssText = `
        position: absolute; inset: 0; margin: auto;
        width: 2px; height: 8px; background: #666;
        transform-origin: 50% 32px; border-radius: 1px;
        opacity: 0.8;
      `;
      tick.style.transform = `rotate(${angle}deg) translateY(-24px)`;
      this.container.appendChild(tick);
    });

    document.body.appendChild(this.container);
  }

  // Update the compass needle to match camera rotation in isometric view
  // The compass is drawn in the same perspective as the map
  updateWithCamera(camera: THREE.Camera) {
    // Get the camera's rotation around the Y axis (world up)
    // In isometric view, we only care about horizontal rotation
    const cameraRotationY = camera.rotation.y;

    // Convert to degrees and add base offset
    // The needle starts pointing to top-right (45°) which represents north in isometric view
    // We rotate it based on camera's Y rotation to maintain correct orientation
    const rotationDegrees = 45 - (cameraRotationY * 180 / Math.PI);

    this.needle.style.transform = `rotate(${rotationDegrees}deg)`;
  }

  destroy() {
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
