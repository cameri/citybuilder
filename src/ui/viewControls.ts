export interface ViewControlsOptions {
  mapSize: { width: number; height: number };
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  zoom: number; // frustum height
}

export class ViewControls {
  private container: HTMLDivElement;
  private mapSize: { width: number; height: number };
  private onCenter?: () => void;
  private onZoomIn?: () => void;
  private onZoomOut?: () => void;
  private onResetZoom?: () => void;
  private onPan?: (dx: number, dz: number) => void;
  private storageKey = 'simcity-camera-state';

  constructor(options: ViewControlsOptions) {
    this.mapSize = options.mapSize;
    this.container = this.createControls();
    this.setupEventListeners();
    document.body.appendChild(this.container);
  }

  private createControls(): HTMLDivElement {
    const controls = document.createElement('div');
    controls.id = 'view-controls';
    controls.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #222;
      border: 1px solid #444;
      border-radius: 6px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font: 11px/1.2 monospace;
      color: #fff;
      z-index: 1000;
    `;

    controls.innerHTML = `
      <div style="text-align: center; margin-bottom: 4px; font-size: 10px; color: #aaa;">View</div>
      <button id="view-center" style="
        background: #333;
        border: 1px solid #555;
        color: #fff;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 3px;
        font: 11px monospace;
        min-width: 40px;
      ">🎯</button>
      <div style="display:grid;grid-template-columns:repeat(3,28px);grid-gap:2px;justify-content:center;margin:2px 0 4px 0;">
        <button id="view-pan-up" style="grid-column:2;background:#333;border:1px solid #555;color:#fff;cursor:pointer;border-radius:3px;">⬆️</button>
        <button id="view-pan-left" style="grid-column:1;background:#333;border:1px solid #555;color:#fff;cursor:pointer;border-radius:3px;">⬅️</button>
        <button id="view-pan-right" style="grid-column:3;background:#333;border:1px solid #555;color:#fff;cursor:pointer;border-radius:3px;">➡️</button>
        <button id="view-pan-down" style="grid-column:2;background:#333;border:1px solid #555;color:#fff;cursor:pointer;border-radius:3px;">⬇️</button>
      </div>
      <button id="view-zoom-in" style="
        background: #333;
        border: 1px solid #555;
        color: #fff;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 3px;
        font: 11px monospace;
        min-width: 40px;
      ">🔍+</button>
      <button id="view-zoom-out" style="
        background: #333;
        border: 1px solid #555;
        color: #fff;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 3px;
        font: 11px monospace;
        min-width: 40px;
      ">🔍-</button>
      <button id="view-reset-zoom" style="
        background: #333;
        border: 1px solid #555;
        color: #fff;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 3px;
        font: 11px monospace;
        min-width: 40px;
      ">🔍⚪</button>
    `;

    return controls;
  }

  private setupEventListeners() {
  const centerBtn = this.container.querySelector('#view-center') as HTMLButtonElement;
  const panUpBtn = this.container.querySelector('#view-pan-up') as HTMLButtonElement;
  const panDownBtn = this.container.querySelector('#view-pan-down') as HTMLButtonElement;
  const panLeftBtn = this.container.querySelector('#view-pan-left') as HTMLButtonElement;
  const panRightBtn = this.container.querySelector('#view-pan-right') as HTMLButtonElement;
    const zoomInBtn = this.container.querySelector('#view-zoom-in') as HTMLButtonElement;
    const zoomOutBtn = this.container.querySelector('#view-zoom-out') as HTMLButtonElement;
    const resetZoomBtn = this.container.querySelector('#view-reset-zoom') as HTMLButtonElement;

    centerBtn.addEventListener('click', () => {
      if (this.onCenter) {
        this.onCenter();
      }
    });

    zoomInBtn.addEventListener('click', () => {
      if (this.onZoomIn) {
        this.onZoomIn();
      }
    });

    zoomOutBtn.addEventListener('click', () => {
      if (this.onZoomOut) {
        this.onZoomOut();
      }
    });

    resetZoomBtn.addEventListener('click', () => {
      if (this.onResetZoom) {
        this.onResetZoom();
      }
    });

    // Pan buttons
    const panStep = 2; // world units per click
    const doPan = (dx: number, dz: number) => {
      if (this.onPan) this.onPan(dx, dz);
    };
    panUpBtn.addEventListener('click', () => doPan(0, -panStep));
    panDownBtn.addEventListener('click', () => doPan(0, panStep));
    panLeftBtn.addEventListener('click', () => doPan(-panStep, 0));
    panRightBtn.addEventListener('click', () => doPan(panStep, 0));

    // Add hover effects (include new buttons)
    [centerBtn, zoomInBtn, zoomOutBtn, resetZoomBtn, panUpBtn, panDownBtn, panLeftBtn, panRightBtn].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#444';
        btn.style.borderColor = '#666';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#333';
        btn.style.borderColor = '#555';
      });
    });
  }

  setOnCenter(callback: () => void) {
    this.onCenter = callback;
  }

  setOnPan(callback: (dx: number, dz: number) => void) {
    this.onPan = callback;
  }

  setOnZoomIn(callback: () => void) {
    this.onZoomIn = callback;
  }

  setOnZoomOut(callback: () => void) {
    this.onZoomOut = callback;
  }

  setOnResetZoom(callback: () => void) {
    this.onResetZoom = callback;
  }

  saveCameraState(state: CameraState) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save camera state to localStorage:', error);
    }
  }

  loadCameraState(): CameraState | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored) as CameraState;
      }
    } catch (error) {
      console.warn('Failed to load camera state from localStorage:', error);
    }
    return null;
  }

  getCenterPosition(): { x: number; y: number } {
    return {
      x: (this.mapSize.width - 1) / 2,
      y: (this.mapSize.height - 1) / 2
    };
  }

  destroy() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
