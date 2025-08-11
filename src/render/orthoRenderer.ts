import * as THREE from 'three';

export interface OrthoRendererOptions {
  tileSize?: number; // world units per tile
}

export interface PanState {
  isPanning: boolean;
  lastX: number;
  lastY: number;
}

export class OrthoRenderer {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  tileSize: number;
  container: HTMLElement;
  needsResize = true;
  gridGroup = new THREE.Group();
  highlightGroup = new THREE.Group();
  selectionGroup = new THREE.Group();
  initializedView = false;
  hoveredTile: { x: number; y: number } | null = null;
  // Track the currently active tool so highlight visuals can adapt (e.g., bulldoze = red)
  private activeTool: string | null = null;
  private selectionRect: { x: number; y: number; w: number; h: number; zone?: 'R'|'C'|'I' } | null = null;
  private roadLine: { x0: number; y0: number; x1: number; y1: number; blocked?: boolean } | null = null;
  panState: PanState = { isPanning: false, lastX: 0, lastY: 0 };
  mapSize = { width: 16, height: 16 };
  onCameraChange?: () => void;
  private cameraTarget = new THREE.Vector3(0, 0, 0); // persistent target to avoid orientation drift
  private debugCamera = false;
  private lastDebugLog = 0;

  constructor(container: HTMLElement, opts: OrthoRendererOptions = {}) {
    this.container = container;
    this.tileSize = opts.tileSize ?? 1;
    const aspect = container.clientWidth / container.clientHeight || 1;
    const half = 10; // view half-height
    this.camera = new THREE.OrthographicCamera(-half*aspect, half*aspect, half, -half, -100, 100);
  this.camera.position.set(10, 10, 10);
  this.camera.up.set(0,1,0);
  this.camera.lookAt(this.cameraTarget);
  // Enable camera debug logging if localStorage flag set
  try { this.debugCamera = localStorage.getItem('simcity-debug-camera') === '1'; } catch {}
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(5,10,7);
    this.scene.add(dir);
    this.scene.add(this.gridGroup);
    this.scene.add(this.highlightGroup);
  this.scene.add(this.selectionGroup);

    this.bindPanEvents();
    window.addEventListener('resize', () => this.onResize());
  }

  private bindPanEvents() {
    // Only handle zoom with mouse wheel - panning is handled by mouseHandler.ts
    this.container.addEventListener('wheel', (e) => {
      const zoomSpeed = 0.1;
      const zoom = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      this.zoomCamera(zoom);
      if (this.onCameraChange) {
        this.onCameraChange();
      }
      e.preventDefault();
    });
  }

  panCamera(deltaX: number, deltaY: number) {
    // Interpret deltaX / deltaY as raw pixel movement on the canvas.
    // Convert pixel movement into world-space translation in the XZ plane
    // so that the map drags naturally (mouse drag right -> world appears to move right).

    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const frustumWidth = this.camera.right - this.camera.left;   // world units across screen
    const frustumHeight = this.camera.top - this.camera.bottom;  // world units vertically

    const worldPerPixelX = frustumWidth / w;
    const worldPerPixelY = frustumHeight / h;

  // Camera basis vectors: right and a ground-plane 'up' (perpendicular in XZ)
  const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
  right.y = 0; right.normalize();
  // Derive ground-plane up perpendicular to right in XZ
  const upGround = new THREE.Vector3(-right.z, 0, right.x).normalize();

  // Pixel deltas to world deltas (grab semantics: drag right -> map follows pointer, so camera moves opposite drag)
  const move = new THREE.Vector3();
  move.addScaledVector(right,  -deltaX * worldPerPixelX);
  move.addScaledVector(upGround, -deltaY * worldPerPixelY);

  this.camera.position.add(move);
  this.cameraTarget.add(move); // keep target fixed relative to camera
  this.realignCamera();
  this.onCameraMoved('pan');
  }

  // Direct world translation helper (dx,dz in world units on ground plane)
  translateCameraWorld(dx: number, dz: number) {
    this.camera.position.x += dx;
    this.camera.position.z += dz;
    this.cameraTarget.x += dx;
    this.cameraTarget.z += dz;
    this.realignCamera();
    this.onCameraMoved('translate');
  }

  zoomCamera(factor: number) {
    const frustumHeight = (this.camera.top - this.camera.bottom);
    const newHeight = frustumHeight * factor;
    const halfHeight = newHeight / 2;
    const aspect = (this.camera.right - this.camera.left) / frustumHeight;

    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
  this.camera.updateProjectionMatrix();
  this.onCameraMoved('zoom');
  }

  centerCameraOnTile(tileX: number, tileY: number) {
    const worldX = tileX * this.tileSize;
    const worldZ = tileY * this.tileSize;

    // Maintain the current camera height and angle
    const currentHeight = this.camera.position.y;
    const offset = new THREE.Vector3(8, 0, 8); // Maintain isometric offset

  this.camera.position.set(worldX + offset.x, currentHeight, worldZ + offset.z);
  this.cameraTarget.set(worldX, 0, worldZ);
  this.realignCamera();
  this.onCameraMoved('centerTile');
  }

  centerCameraOnMap() {
    const centerX = (this.mapSize.width - 1) / 2;
    const centerY = (this.mapSize.height - 1) / 2;
  this.centerCameraOnTile(centerX, centerY);
  }

  getCameraState() {
    const frustumHeight = this.camera.top - this.camera.bottom;

    return {
      position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      lookAt: { x: this.cameraTarget.x, y: this.cameraTarget.y, z: this.cameraTarget.z },
      zoom: frustumHeight
    };
  }

  setCameraState(state: { position: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number }, zoom: number }) {
    // Set camera position
  this.camera.position.set(state.position.x, state.position.y, state.position.z);

    // Set camera zoom (frustum size)
    const halfHeight = state.zoom / 2;
    const aspect = (this.camera.right - this.camera.left) / (this.camera.top - this.camera.bottom);

    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
  this.camera.updateProjectionMatrix();
  this.cameraTarget.set(state.lookAt.x, state.lookAt.y, state.lookAt.z);
  this.realignCamera();
  this.onCameraMoved('setState');
  }

  zoomIn() {
    this.zoomCamera(0.8); // Zoom in by 20%
  }

  zoomOut() {
    this.zoomCamera(1.25); // Zoom out by 25%
  }

  resetZoom() {
    // Reset to default zoom level (20 units frustum height)
    const defaultZoom = 20;
    const halfHeight = defaultZoom / 2;
    const aspect = (this.camera.right - this.camera.left) / (this.camera.top - this.camera.bottom);

    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
  this.camera.updateProjectionMatrix();
  this.onCameraMoved('resetZoom');
  }

  setOnCameraChange(callback: () => void) {
    this.onCameraChange = callback;
  }

  onResize() {
    this.needsResize = true;
  }

  setHoveredTile(x: number | null, y: number | null) {
    if (x === null || y === null) {
      this.hoveredTile = null;
    } else {
      this.hoveredTile = { x, y };
    }
    this.updateHighlight();
  }

  // Allow external UI to inform renderer about current tool for contextual highlighting
  setActiveTool(tool: string) {
    this.activeTool = tool;
    // If a tile is currently hovered, refresh its highlight color immediately
    if (this.hoveredTile) this.updateHighlight();
  }

  private updateHighlight() {
    this.highlightGroup.clear();

    if (this.hoveredTile) {
      const highlightGeom = new THREE.BoxGeometry(this.tileSize * 1.1, 0.3, this.tileSize * 1.1);
  const color = this.activeTool === 'bulldoze' ? 0xff0000 : 0xffffff;
  const highlightMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
      const highlight = new THREE.Mesh(highlightGeom, highlightMat);
      highlight.position.set(
        this.hoveredTile.x * this.tileSize,
        0.15,
        this.hoveredTile.y * this.tileSize
      );
      this.highlightGroup.add(highlight);
    }

    // Selection rectangle (area zoning preview)
    this.selectionGroup.clear();
    if (this.selectionRect) {
      const { x, y, w, h, zone } = this.selectionRect;
      const colors: Record<string, number> = { R: 0x4caf50, C: 0x2196f3, I: 0xffc107 };
      const color = colors[zone || 'R'] || 0xffffff;
      const geom = new THREE.BoxGeometry(w * this.tileSize * 1.05, 0.31, h * this.tileSize * 1.05);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 });
      const mesh = new THREE.Mesh(geom, mat);
      // Center position of rectangle
      const cx = x + (w - 1) / 2;
      const cy = y + (h - 1) / 2;
      mesh.position.set(cx * this.tileSize, 0.155, cy * this.tileSize);
      this.selectionGroup.add(mesh);

      // Outline (edges)
      const edgeGeom = new THREE.BoxGeometry(w * this.tileSize * 1.05, 0.32, h * this.tileSize * 1.05);
      const edges = new THREE.EdgesGeometry(edgeGeom as any);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(mesh.position);
      this.selectionGroup.add(line);
    }

    // Road line preview
    if (this.roadLine) {
      const { x0, y0, x1, y1, blocked } = this.roadLine;
      // Bresenham's line algorithm
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
      // Draw each tile as a semi-transparent box
      const color = blocked ? 0xff2222 : 0x646cff;
      const roadMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
      const roadGeom = new THREE.BoxGeometry(this.tileSize*0.95, 0.09, this.tileSize*0.95);
      for (const t of tiles) {
        const mesh = new THREE.Mesh(roadGeom, roadMat);
        mesh.position.set(t.x * this.tileSize, 0.045, t.y * this.tileSize);
        this.selectionGroup.add(mesh);
      }
    }
  }

  setSelectionRect(rect: { x: number; y: number; w: number; h: number; zone?: 'R'|'C'|'I' } | null) {
    this.selectionRect = rect;
    this.updateHighlight();
  }

  setRoadLine(line: { x0: number; y0: number; x1: number; y1: number; blocked?: boolean } | null) {
    this.roadLine = line;
    this.updateHighlight();
  }

  updateGrid(map: any[][]) {
    // One-time camera centering based on map dimensions
    if (!this.initializedView && map.length && map[0].length) {
      const h = map.length; const w = map[0].length;
      const cx = (w - 1) / 2;
      const cz = (h - 1) / 2;
      // Place camera on a diagonal above center
  this.camera.position.set(cx + 8, Math.max(w, h) * 0.9, cz + 8);
  this.cameraTarget.set(cx, 0, cz);
  this.realignCamera();
  this.onCameraMoved('init');
      // Simple ground plane
      const planeGeom = new THREE.PlaneGeometry(w, h, w, h);
      const planeMat = new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true });
      const plane = new THREE.Mesh(planeGeom, planeMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(cx, -0.01, cz);
      this.scene.add(plane);
      this.initializedView = true;
    }
    // Simple rebuild each frame for now (small maps); optimize later.
    this.gridGroup.clear();
    const geom = new THREE.BoxGeometry(this.tileSize*0.95, 0.25, this.tileSize*0.95);
    const roadGeom = new THREE.BoxGeometry(this.tileSize*0.95, 0.05, this.tileSize*0.95);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    for (const row of map) {
      for (const tile of row) {
        if (tile.road) {
          const r = new THREE.Mesh(roadGeom, roadMat);
          r.position.set(tile.x * this.tileSize, 0.025, tile.y * this.tileSize);
          this.gridGroup.add(r);
        }
        if (!tile.zone) continue;
        let color = 0x222222;
        if (tile.zone === 'R') color = tile.developed ? 0x4caf50 : 0x2e7d32;
        if (tile.zone === 'C') color = tile.developed ? 0x2196f3 : 0x1565c0;
        if (tile.zone === 'I') color = tile.developed ? 0xffc107 : 0xb28704;
        const mat = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(tile.x * this.tileSize, 0.125, tile.y * this.tileSize);
        mesh.userData.tile = tile;
        this.gridGroup.add(mesh);
      }
    }
  }

  frame(map: any[][]) {
    if (this.needsResize) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.renderer.setSize(w, h, false);
      const aspect = w / h;
      const frustumHeight = (this.camera.top - this.camera.bottom);
      this.camera.left = -frustumHeight/2 * aspect;
      this.camera.right = frustumHeight/2 * aspect;
      this.camera.updateProjectionMatrix();
      this.needsResize = false;
    }
    this.updateGrid(map);
    this.renderer.render(this.scene, this.camera);
  }

  private realignCamera() {
    this.camera.up.set(0,1,0); // enforce consistent up
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateMatrixWorld();
  }

  private onCameraMoved(source: string) {
    this.onCameraChange?.();
    if (!this.debugCamera) return;
    const now = performance.now();
    if (now - this.lastDebugLog < 200) return; // throttle logs
    this.lastDebugLog = now;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = this.camera.up.clone();
    // Determine handedness (positive should remain stable)
    const handedness = right.dot(new THREE.Vector3().copy(up).cross(dir));
    if (handedness < 0) {
      console.warn('[camera] detected negative handedness (possible flip) – realigning', handedness);
      // Attempt corrective realign
      this.camera.up.set(0,1,0);
      this.camera.lookAt(this.cameraTarget);
      this.camera.updateMatrixWorld();
    }
    console.log('[camera]', source, {
      pos: { x: +this.camera.position.x.toFixed(3), y: +this.camera.position.y.toFixed(3), z: +this.camera.position.z.toFixed(3) },
      target: { x: +this.cameraTarget.x.toFixed(3), y: +this.cameraTarget.y.toFixed(3), z: +this.cameraTarget.z.toFixed(3) },
      dir: { x: +dir.x.toFixed(3), y: +dir.y.toFixed(3), z: +dir.z.toFixed(3) },
      up: { x: +up.x.toFixed(3), y: +up.y.toFixed(3), z: +up.z.toFixed(3) },
      handed: +handedness.toFixed(3)
    });
  }
}
