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
  onHover?: (pos: MousePosition | null) => void; // null when not hovering over valid tile
}

export class MouseHandler {
  private container: HTMLElement;
  private mapSize: { width: number; height: number };
  private interaction?: MouseInteraction;
  private isMouseDown = false;
  private lastMousePos?: MousePosition;
  private camera?: THREE.OrthographicCamera;
  private scene?: THREE.Scene;
  private isPanning = false;
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

  setCamera(camera: THREE.OrthographicCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  setOnCameraPan(callback: (deltaX: number, deltaY: number) => void) {
    this.onCameraPan = callback;
  }

  setInteraction(interaction: MouseInteraction) {
    this.interaction = interaction;
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

    // Handle camera panning with left-click drag
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastPanX;
      const deltaY = e.clientY - this.lastPanY;

      if (this.onCameraPan) {
        this.onCameraPan(-deltaX * 0.03, deltaY * 0.03);
      }

      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      return; // Don't process normal mouse move when panning
    }

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

    // Check if this should start camera panning (left-click + Alt key)
    if (e.button === 0 && e.altKey) {
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.container.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (this.lastMousePos) {
      this.interaction?.onMouseDown?.(this.lastMousePos, e.button);
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      this.container.style.cursor = 'default';
      e.preventDefault();
      return;
    }

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
  onHover?: (pos: MousePosition | null, tile?: any) => void,
  mapSize: { width: number; height: number } = { width: 16, height: 16 }
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
          handleToolAction(activeTool, pos, onAction, mapSize);
        }
      }
    },

    onMouseMove: (pos) => {
      if (isDragging && dragStart) {
        // Continue action for drawing tools
        if (activeTool === 'road' || activeTool === 'bulldoze') {
          handleToolAction(activeTool, pos, onAction, mapSize);
        }
      }
    },

    onMouseUp: (pos, button) => {
      if (button === 0 && isDragging && dragStart) {
        isDragging = false;

        // Handle area tools (zoning)
        if (activeTool.startsWith('zone_')) {
          handleZoneAction(activeTool, dragStart, pos, onAction, mapSize);
        }

        dragStart = undefined;
      }
    },

    onMouseClick: (pos, button) => {
      if (button === 0) { // Left click
        // Handle single-click tools
        if (activeTool === 'inspect') {
          // Clamp coordinates for inspect action
          const clampedX = Math.max(0, Math.min(mapSize.width - 1, pos.tileX));
          const clampedY = Math.max(0, Math.min(mapSize.height - 1, pos.tileY));
          onAction({ type: 'INSPECT_TILE', x: clampedX, y: clampedY });
        }
      }
    },

    onHover: (pos) => {
      if (onHover) {
        onHover(pos, pos ? { x: pos.tileX, y: pos.tileY } : null);
      }
    }
  };
}function handleToolAction(
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
