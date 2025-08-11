// Mouse interaction system for tool usage and tile interaction
import * as THREE from 'three';
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
  // Extended hover signature supports optional preview data (tile, drag rect, drag line, blocked flag)
  onHover?: (
    pos: MousePosition | null,
    tile?: { x: number; y: number } | null,
    dragRect?: { x: number; y: number; w: number; h: number },
    dragLine?: { x0: number; y0: number; x1: number; y1: number },
    dragBlocked?: boolean
  ) => void; // null when not hovering over valid tile
  onCancel?: () => void; // Escape to cancel area selection
}

export class MouseHandler {
  private container: HTMLElement;
  private mapSize: { width: number; height: number };
  private interaction?: MouseInteraction;
  private isMouseDown = false;
  private lastMousePos?: MousePosition;
  private camera?: THREE.OrthographicCamera;
  private isPanning = false;
  private wasPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private onCameraPan?: (deltaX: number, deltaY: number) => void;

  constructor(
    container: HTMLElement,
    mapSize: { width: number; height: number } = { width: 16, height: 16 }
  ) {
    this.container = container;
    this.mapSize = mapSize;

    this.bindEvents();
  }

  setCamera(camera: THREE.OrthographicCamera, _scene: THREE.Scene) {
    this.camera = camera;
    // scene currently unused (reserved for future ray-based picking)
  }

  setOnCameraPan(callback: (deltaX: number, deltaY: number) => void) {
    this.onCameraPan = callback;
  }

  setInteraction(interaction: MouseInteraction) {
    this.interaction = interaction;
  }

  getInteraction(): MouseInteraction | undefined {
    return this.interaction;
  }

  cancelCurrentInteraction() {
    this.interaction?.onCancel?.();
  }

  private bindEvents() {
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('click', this.onMouseClick.bind(this));
    this.container.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    // Prevent context menu on right click
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseLeave(_e: MouseEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      this.container.style.cursor = 'default';
    }
  }

  private screenToWorld(clientX: number, clientY: number): MousePosition {
    const rect = this.container.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    if (!this.camera) {
      // Fallback to simplified conversion if camera not set
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (canvasX - centerX) * 0.02;
      const worldY = (canvasY - centerY) * 0.02;
      const tileX = Math.floor(worldX + this.mapSize.width / 2);
      const tileY = Math.floor(worldY + this.mapSize.height / 2);

      return {
        x: worldX,
        y: worldY,
        tileX: tileX, // Don't clamp here - let onMouseMove handle bounds checking
        tileY: tileY
      };
    }

    // Convert canvas coordinates to normalized device coordinates (NDC)
    const ndcX = (canvasX / rect.width) * 2 - 1;
    const ndcY = -(canvasY / rect.height) * 2 + 1;

    // Create a vector in camera space
    const vector = new THREE.Vector3(ndcX, ndcY, 0);

    // Unproject to world coordinates
    vector.unproject(this.camera);

    // For orthographic camera, we need to raycast to the ground plane (y=0)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    // Intersect with ground plane at y=0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersection);

    const worldX = intersection.x;
    const worldZ = intersection.z;

    // Convert world coordinates to tile coordinates (don't clamp here)
    // Since tiles are centered at integer coordinates (5,5) means the tile occupies [4.5,5.5)
    // We need to add 0.5 before flooring to get the correct tile
    const tileX = Math.floor(worldX + 0.5);
    const tileY = Math.floor(worldZ + 0.5);

    return {
      x: worldX,
      y: worldZ,
      tileX: tileX, // Return raw tile coordinates
      tileY: tileY  // Return raw tile coordinates
    };
  }

  private onMouseMove(e: MouseEvent) {
    const pos = this.screenToWorld(e.clientX, e.clientY);
    this.lastMousePos = pos;

    // Handle camera panning with Alt+left-click drag
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastPanX;
      const deltaY = e.clientY - this.lastPanY;

      if (this.onCameraPan) {
        // Pass raw pixel deltas; renderer converts to world units.
        this.onCameraPan(deltaX, deltaY);
      }

      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      return; // Don't process normal mouse move when panning - no highlighting during pan
    }

    this.interaction?.onMouseMove?.(pos);

    // Check if hovering over a valid tile (only when not panning)
    if (pos.tileX >= 0 && pos.tileX < this.mapSize.width &&
        pos.tileY >= 0 && pos.tileY < this.mapSize.height) {
      this.interaction?.onHover?.(pos);
    } else {
      this.interaction?.onHover?.(null);
    }
  }

  private onMouseDown(e: MouseEvent) {
    this.isMouseDown = true;

    // Check if this should start camera panning (left-click + Alt key)
    if (e.button === 0 && e.altKey) {
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.container.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // Don't process tool interactions during panning
    if (this.isPanning) {
      return;
    }

    if (this.lastMousePos) {
      this.interaction?.onMouseDown?.(this.lastMousePos, e.button);
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      this.wasPanning = true;
      this.container.style.cursor = 'default';
      e.preventDefault();

      // Clear the wasPanning flag after a short delay to prevent immediate clicks
      setTimeout(() => {
        this.wasPanning = false;
      }, 50);
      return;
    }

    this.isMouseDown = false;

    // Don't process tool interactions if we were panning
    if (this.lastMousePos) {
      this.interaction?.onMouseUp?.(this.lastMousePos, e.button);
    }
  }

  private onMouseClick(e: MouseEvent) {
    // Don't process click events if we were panning or just finished panning
    if (this.isPanning || this.wasPanning) {
      return;
    }

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
  onHover?: (pos: MousePosition | null, tile?: any, dragRect?: { x: number; y: number; w: number; h: number }, dragLine?: { x0: number; y0: number; x1: number; y1: number }, dragBlocked?: boolean) => void,
  mapSize: { width: number; height: number } = { width: 16, height: 16 }
): MouseInteraction {
  let isDragging = false;
  let dragStart: MousePosition | undefined;
  let lastDragRect: { x: number; y: number; w: number; h: number } | null = null;
  let lastDragLine: { x0: number; y0: number; x1: number; y1: number } | null = null;

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  function computeRect(start: MousePosition, current: MousePosition) {
    const sx = clamp(start.tileX, 0, mapSize.width - 1);
    const sy = clamp(start.tileY, 0, mapSize.height - 1);
    const cx = clamp(current.tileX, 0, mapSize.width - 1);
    const cy = clamp(current.tileY, 0, mapSize.height - 1);
    const minX = Math.min(sx, cx);
    const maxX = Math.max(sx, cx);
    const minY = Math.min(sy, cy);
    const maxY = Math.max(sy, cy);
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function computeLine(start: MousePosition, current: MousePosition) {
    const x0 = clamp(start.tileX, 0, mapSize.width - 1);
    const y0 = clamp(start.tileY, 0, mapSize.height - 1);
    let x1 = clamp(current.tileX, 0, mapSize.width - 1);
    let y1 = clamp(current.tileY, 0, mapSize.height - 1);
    // Lock to straight line: horizontal or vertical, whichever is longer
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    if (dx >= dy) {
      y1 = y0; // horizontal
    } else {
      x1 = x0; // vertical
    }
    return { x0, y0, x1, y1 };
  }

  let dragBlocked: boolean = false;
  return {
    onMouseDown: (pos, button) => {
      if (button === 0) { // Left click
        isDragging = true;
        dragStart = pos;
        lastDragRect = null;
        lastDragLine = null;
        dragBlocked = false;
        if (activeTool === 'road' || activeTool === 'bulldoze') {
          handleToolAction(activeTool, pos, onAction, mapSize);
        }
      }
    },
    onMouseMove: (pos) => {
      if (isDragging && dragStart) {
        if (activeTool === 'road') {
          lastDragLine = computeLine(dragStart, pos);
          // dragBlocked will be set by main.ts hover callback
          onHover?.(pos, { x: pos.tileX, y: pos.tileY }, undefined, lastDragLine, dragBlocked);
          return;
        } else if (activeTool === 'bulldoze') {
          handleToolAction(activeTool, pos, onAction, mapSize);
        } else if (activeTool.startsWith('zone_')) {
          lastDragRect = computeRect(dragStart, pos);
          onHover?.(pos, { x: pos.tileX, y: pos.tileY }, lastDragRect);
          return;
        }
      }
      onHover?.(pos, pos ? { x: pos.tileX, y: pos.tileY } : null, lastDragRect || undefined, lastDragLine || undefined, dragBlocked);
    },
    onMouseUp: (pos, button) => {
      if (button === 0 && isDragging && dragStart) {
        isDragging = false;
        if (activeTool === 'road') {
          if (lastDragLine && !dragBlocked) {
            handleRoadLineAction(lastDragLine, onAction);
          }
          lastDragLine = null;
          dragBlocked = false;
          onHover?.(pos, { x: pos.tileX, y: pos.tileY }, undefined, undefined, false);
        } else if (activeTool.startsWith('zone_')) {
          if (lastDragRect) {
            handleZoneActionRect(activeTool, lastDragRect, onAction);
          } else {
            handleZoneAction(activeTool, dragStart, pos, onAction, mapSize);
          }
          lastDragRect = null;
          onHover?.(pos, { x: pos.tileX, y: pos.tileY }, undefined);
        }
        dragStart = undefined;
      }
    },
    onMouseClick: (pos, button) => {
      if (button === 0 && activeTool === 'inspect') {
        const clampedX = clamp(pos.tileX, 0, mapSize.width - 1);
        const clampedY = clamp(pos.tileY, 0, mapSize.height - 1);
        onAction({ type: 'INSPECT_TILE', x: clampedX, y: clampedY });
      }
    },
    onHover: (pos: MousePosition | null, _tile?: {x:number;y:number}|null, _rect?: {x:number;y:number;w:number;h:number}, _line?: {x0:number;y0:number;x1:number;y1:number}, blocked?: boolean) => {
      dragBlocked = !!blocked;
      onHover?.(pos, pos && pos.tileX !== undefined ? { x: pos.tileX, y: pos.tileY } : null, lastDragRect || undefined, lastDragLine || undefined, dragBlocked);
    },
    onCancel: () => {
      if (isDragging && activeTool === 'road') {
        isDragging = false;
        dragStart = undefined;
        lastDragLine = null;
        dragBlocked = false;
        onHover?.(null, null, undefined, undefined, false);
      }
      if (isDragging && activeTool.startsWith('zone_')) {
        isDragging = false;
        dragStart = undefined;
        lastDragRect = null;
        onHover?.(null, null, undefined);
      }
    }
  };
}
function handleToolAction(
  tool: ToolType,
  pos: MousePosition,
  onAction: (action: any) => void,
  mapSize: { width: number; height: number }
) {
  // Clamp coordinates for actions to ensure they're within bounds
  const clampedX = Math.max(0, Math.min(mapSize.width - 1, pos.tileX));
  const clampedY = Math.max(0, Math.min(mapSize.height - 1, pos.tileY));

  switch (tool) {
    case 'road':
      onAction({ type: 'PLACE_ROAD', x: clampedX, y: clampedY });
      break;
    case 'bulldoze':
      onAction({ type: 'BULLDOZE', x: clampedX, y: clampedY });
      break;
  }
}

function handleZoneAction(
  tool: ToolType,
  start: MousePosition,
  end: MousePosition,
  onAction: (action: any) => void,
  mapSize: { width: number; height: number }
) {
  // Clamp coordinates for actions to ensure they're within bounds
  const clampedStartX = Math.max(0, Math.min(mapSize.width - 1, start.tileX));
  const clampedStartY = Math.max(0, Math.min(mapSize.height - 1, start.tileY));
  const clampedEndX = Math.max(0, Math.min(mapSize.width - 1, end.tileX));
  const clampedEndY = Math.max(0, Math.min(mapSize.height - 1, end.tileY));

  const minX = Math.min(clampedStartX, clampedEndX);
  const maxX = Math.max(clampedStartX, clampedEndX);
  const minY = Math.min(clampedStartY, clampedEndY);
  const maxY = Math.max(clampedStartY, clampedEndY);

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

function handleZoneActionRect(
  tool: ToolType,
  rect: { x: number; y: number; w: number; h: number },
  onAction: (action: any) => void
) {
  let zone: 'R' | 'C' | 'I';
  switch (tool) {
    case 'zone_residential': zone = 'R'; break;
    case 'zone_commercial': zone = 'C'; break;
    case 'zone_industrial': zone = 'I'; break;
    default: return;
  }
  onAction({ type: 'ZONE_RECT', rect, zone });
}

// Helper: Bresenham's line algorithm for tile coordinates
function getLineTiles(x0: number, y0: number, x1: number, y1: number): Array<{x:number,y:number}> {
  const tiles = [];
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  while (true) {
    tiles.push({x, y});
    if (x === x1 && y === y1) break;
    let e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return tiles;
}

function handleRoadLineAction(line: { x0: number; y0: number; x1: number; y1: number }, onAction: (action: any) => void) {
  const tiles = getLineTiles(line.x0, line.y0, line.x1, line.y1);
  for (const t of tiles) {
    onAction({ type: 'PLACE_ROAD', x: t.x, y: t.y });
  }
}
