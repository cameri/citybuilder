// Minimap component showing overview of the city
export class Minimap {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapSize: { width: number; height: number };
  private onPanToTile?: (tileX: number, tileY: number) => void;

  constructor(mapSize: { width: number; height: number }) {
    this.mapSize = mapSize;
    this.container = document.body;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    this.setupCanvas();
    this.setupContainer();
    this.bindEvents();
  }

  setOnPanToTile(callback: (tileX: number, tileY: number) => void) {
    this.onPanToTile = callback;
  }

  private bindEvents() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert canvas coordinates to tile coordinates
      const tileX = Math.floor((x / rect.width) * this.mapSize.width);
      const tileY = Math.floor((y / rect.height) * this.mapSize.height);

      // Clamp to valid range
      const clampedX = Math.max(0, Math.min(this.mapSize.width - 1, tileX));
      const clampedY = Math.max(0, Math.min(this.mapSize.height - 1, tileY));

      if (this.onPanToTile) {
        this.onPanToTile(clampedX, clampedY);
      }
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.canvas.style.cursor = 'pointer';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.canvas.style.cursor = 'default';
    });
  }

  private setupCanvas() {
    this.canvas.width = 120;
    this.canvas.height = 120;
    this.canvas.style.cssText = 'width: 120px; height: 120px; image-rendering: pixelated;';
  }

  private setupContainer() {
    const minimapContainer = document.createElement('div');
    minimapContainer.id = 'minimap';
    minimapContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 120px;
      height: 120px;
      background: rgba(34, 34, 34, 0.95);
      border: 2px solid #444;
      border-radius: 6px;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
    `;

    const title = document.createElement('div');
    title.textContent = 'Minimap';
    title.style.cssText = `
      color: #ccc;
      font: 10px/1 monospace;
      text-align: center;
      margin-bottom: 4px;
    `;

    minimapContainer.appendChild(title);
    minimapContainer.appendChild(this.canvas);
    this.container.appendChild(minimapContainer);
  }

  updateMap(map: any[][]) {
    if (!map.length) return;

    const tileWidth = this.canvas.width / this.mapSize.width;
    const tileHeight = this.canvas.height / this.mapSize.height;

    // Clear canvas
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiles
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
        const pixelX = x * tileWidth;
        const pixelY = y * tileHeight;

        let color = '#222'; // Empty land

        if (tile.road) {
          color = '#666'; // Roads
        } else if (tile.zone) {
          if (tile.developed) {
            // Developed zones
            switch (tile.zone) {
              case 'R': color = '#4caf50'; break; // Green for residential
              case 'C': color = '#2196f3'; break; // Blue for commercial
              case 'I': color = '#ffc107'; break; // Yellow for industrial
            }
          } else {
            // Undeveloped zones (darker versions)
            switch (tile.zone) {
              case 'R': color = '#2e7d32'; break;
              case 'C': color = '#1565c0'; break;
              case 'I': color = '#b28704'; break;
            }
          }
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, Math.ceil(tileWidth), Math.ceil(tileHeight));
      }
    }

    // Draw grid lines for better visibility
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x <= this.mapSize.width; x++) {
      const lineX = x * tileWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, 0);
      this.ctx.lineTo(lineX, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= this.mapSize.height; y++) {
      const lineY = y * tileHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, lineY);
      this.ctx.lineTo(this.canvas.width, lineY);
      this.ctx.stroke();
    }
  }

  destroy() {
    const minimapEl = document.getElementById('minimap');
    if (minimapEl) {
      minimapEl.remove();
    }
  }
}
