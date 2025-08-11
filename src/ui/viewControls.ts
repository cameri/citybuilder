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

    // Add hover effects
    [centerBtn, zoomInBtn, zoomOutBtn, resetZoomBtn].forEach(btn => {
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
