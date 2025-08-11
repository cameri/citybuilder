// Zone Inspector Panel - Shows detailed information about hovered tiles
export interface ZoneData {
  x: number;
  y: number;
  zone: 'R' | 'C' | 'I' | null;
  developed: boolean;
  progress?: number;
  road: boolean;
  building?: string;
}

export class ZoneInspector {
  private container: HTMLElement;
  private panel: HTMLElement | null = null;

  constructor() {
    this.container = document.body;
    this.createPanel();
  }

  private createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'zone-inspector';
    this.panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 220px;
      background: rgba(34, 34, 34, 0.95);
      border: 1px solid #444;
      border-radius: 6px;
      padding: 12px;
      color: #fff;
      font: 12px/1.4 monospace;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      display: none;
      z-index: 1000;
    `;
    this.container.appendChild(this.panel);
  }

  showTile(tile: ZoneData, map: any[][]) {
    if (!this.panel) return;

    const mapTile = map[tile.y]?.[tile.x];
    if (!mapTile) return;

    const zoneNames: Record<string, string> = {
      'R': 'Residential',
      'C': 'Commercial',
      'I': 'Industrial'
    };

    const zoneName = mapTile.zone ? (zoneNames[mapTile.zone] || 'Unknown') : 'Unzoned';
    const devStatus = mapTile.developed ? 'Developed' :
                     mapTile.zone ? `${Math.round((mapTile.progress || 0) * 100)}% Built` : 'Empty';

    this.panel.innerHTML = `
      <div style="font-weight: bold; color: #64b5f6; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
        📍 Tile (${tile.x}, ${tile.y})
      </div>

      <div style="margin-bottom: 6px;">
        <span style="color: #aaa;">Zone:</span>
        <span style="color: ${this.getZoneColor(mapTile.zone)}; font-weight: bold;">
          ${zoneName}
        </span>
      </div>

      <div style="margin-bottom: 6px;">
        <span style="color: #aaa;">Status:</span>
        <span style="color: ${mapTile.developed ? '#4caf50' : '#ff9800'};">
          ${devStatus}
        </span>
      </div>

      ${mapTile.road ? '<div style="margin-bottom: 6px; color: #666;"><span style="color: #aaa;">Infrastructure:</span> Road Access ✓</div>' : ''}

      ${mapTile.building ? `<div style="margin-bottom: 6px;"><span style="color: #aaa;">Building:</span> ${mapTile.building}</div>` : ''}

      ${this.getZoneDetails(mapTile)}
    `;

    this.panel.style.display = 'block';
  }

  private getZoneColor(zone: string | null): string {
    switch (zone) {
      case 'R': return '#4caf50';
      case 'C': return '#2196f3';
      case 'I': return '#ffc107';
      default: return '#666';
    }
  }

  private getZoneDetails(tile: any): string {
    if (!tile.zone) return '';

    if (!tile.developed) {
      return `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #333; font-size: 11px; color: #888;">Building in progress...</div>`;
    }

    let details = '<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #333; font-size: 11px;">';

    switch (tile.zone) {
      case 'R':
        details += '<div style="color: #4caf50;">🏠 Provides: 5 residents</div>';
        details += '<div style="color: #aaa;">Tax revenue: $1.0/tick</div>';
        break;
      case 'C':
        details += '<div style="color: #2196f3;">🏢 Provides: 4 jobs</div>';
        details += '<div style="color: #aaa;">Tax revenue: $0.5/tick</div>';
        break;
      case 'I':
        details += '<div style="color: #ffc107;">🏭 Provides: 6 jobs</div>';
        details += '<div style="color: #aaa;">Tax revenue: $0.5/tick</div>';
        details += '<div style="color: #f44336;">⚠️ Pollution: Low</div>';
        break;
    }

    details += '</div>';
    return details;
  }

  hideTile() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}
