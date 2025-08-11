// Mouse interaction system for tool usage and tile interaction
import type { ToolType } from './toolsPalette';

export interface MousePosition {
  x: number;
  y: number;
  tileX: number;
  tileY: number;
}

export interface MouseInteraction {
  onMouseMove?: (pos: MousePosition) => void;
  onMouseDown?: (pos: MousePosition, button: number) => void;
  onMouseUp?: (pos: MousePosition, button: number) => void;
  onMouseClick?: (pos: MousePosition, button: number) => void;
  onHover?: (pos: MousePosition | null) => void; // null when not hovering over valid tile
}

export class MouseHandler {
  private container: HTMLElement;
  private mapOffset: { x: number; y: number };
  private mapSize: { width: number; height: number };
  private interaction?: MouseInteraction;
  private isMouseDown = false;
  private lastMousePos?: MousePosition;

  constructor(
    container: HTMLElement,
    mapSize: { width: number; height: number } = { width: 16, height: 16 }
  ) {
    this.container = container;
    this.mapSize = mapSize;
    this.mapOffset = {
      x: -(mapSize.width - 1) / 2,
      y: -(mapSize.height - 1) / 2
    };

    this.bindEvents();
  }

  setInteraction(interaction: MouseInteraction) {
    this.interaction = interaction;
  }

  private bindEvents() {
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('click', this.onMouseClick.bind(this));

    // Prevent context menu on right click
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private screenToWorld(clientX: number, clientY: number): MousePosition {
    const rect = this.container.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Convert canvas coordinates to world coordinates
    // This is a simplified conversion - in a real implementation you'd use
    // the camera's projection matrix for accurate world coordinates
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Rough conversion assuming orthographic view
    const worldX = (canvasX - centerX) * 0.02; // scale factor
    const worldY = (canvasY - centerY) * 0.02;

    // Convert world coordinates to tile coordinates
    const tileX = Math.floor(worldX - this.mapOffset.x);
    const tileY = Math.floor(worldY - this.mapOffset.y);

    return {
      x: worldX,
      y: worldY,
      tileX: Math.max(0, Math.min(this.mapSize.width - 1, tileX)),
      tileY: Math.max(0, Math.min(this.mapSize.height - 1, tileY))
    };
  }

  private onMouseMove(e: MouseEvent) {
    const pos = this.screenToWorld(e.clientX, e.clientY);
    this.lastMousePos = pos;
    this.interaction?.onMouseMove?.(pos);

    // Check if hovering over a valid tile
    if (pos.tileX >= 0 && pos.tileX < this.mapSize.width &&
        pos.tileY >= 0 && pos.tileY < this.mapSize.height) {
      this.interaction?.onHover?.(pos);
    } else {
      this.interaction?.onHover?.(null);
    }
  }

  private onMouseDown(e: MouseEvent) {
    this.isMouseDown = true;
    if (this.lastMousePos) {
      this.interaction?.onMouseDown?.(this.lastMousePos, e.button);
    }
  }

  private onMouseUp(e: MouseEvent) {
    this.isMouseDown = false;
    if (this.lastMousePos) {
      this.interaction?.onMouseUp?.(this.lastMousePos, e.button);
    }
  }

  private onMouseClick(e: MouseEvent) {
    const pos = this.screenToWorld(e.clientX, e.clientY);
    this.interaction?.onMouseClick?.(pos, e.button);
  }

  isPressed(): boolean {
    return this.isMouseDown;
  }

  getLastPosition(): MousePosition | undefined {
    return this.lastMousePos;
  }
}

// Tool-specific mouse behaviors
export function createToolMouseHandler(
  activeTool: ToolType,
  onAction: (action: any) => void,
  onHover?: (pos: MousePosition | null, tile?: any) => void
): MouseInteraction {
  let isDragging = false;
  let dragStart: MousePosition | undefined;

  return {
    onMouseDown: (pos, button) => {
      if (button === 0) { // Left click
        isDragging = true;
        dragStart = pos;

        // Immediate action for some tools
        if (activeTool === 'road' || activeTool === 'bulldoze') {
          handleToolAction(activeTool, pos, onAction);
        }
      }
    },

    onMouseMove: (pos) => {
      if (isDragging && dragStart) {
        // Continue action for drawing tools
        if (activeTool === 'road' || activeTool === 'bulldoze') {
          handleToolAction(activeTool, pos, onAction);
        }
      }
    },

    onMouseUp: (pos, button) => {
      if (button === 0 && isDragging && dragStart) {
        isDragging = false;

        // Handle area tools (zoning)
        if (activeTool.startsWith('zone_')) {
          handleZoneAction(activeTool, dragStart, pos, onAction);
        }

        dragStart = undefined;
      }
    },

    onMouseClick: (pos, button) => {
      if (button === 0) { // Left click
        // Handle single-click tools
        if (activeTool === 'inspect') {
          onAction({ type: 'INSPECT_TILE', x: pos.tileX, y: pos.tileY });
        }
      }
    },

    onHover: (pos) => {
      if (onHover) {
        onHover(pos, pos ? { x: pos.tileX, y: pos.tileY } : null);
      }
    }
  };
}function handleToolAction(tool: ToolType, pos: MousePosition, onAction: (action: any) => void) {
  switch (tool) {
    case 'road':
      onAction({ type: 'PLACE_ROAD', x: pos.tileX, y: pos.tileY });
      break;
    case 'bulldoze':
      onAction({ type: 'BULLDOZE', x: pos.tileX, y: pos.tileY });
      break;
  }
}

function handleZoneAction(
  tool: ToolType,
  start: MousePosition,
  end: MousePosition,
  onAction: (action: any) => void
) {
  const minX = Math.min(start.tileX, end.tileX);
  const maxX = Math.max(start.tileX, end.tileX);
  const minY = Math.min(start.tileY, end.tileY);
  const maxY = Math.max(start.tileY, end.tileY);

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  let zone: 'R' | 'C' | 'I';
  switch (tool) {
    case 'zone_residential': zone = 'R'; break;
    case 'zone_commercial': zone = 'C'; break;
    case 'zone_industrial': zone = 'I'; break;
    default: return;
  }

  onAction({
    type: 'ZONE_RECT',
    rect: { x: minX, y: minY, w, h },
    zone
  });
}
