import * as THREE from 'three';
import { BLUEPRINTS } from '../blueprints/index.js';
import { GLTFCache } from './gltfCache.js';
import { fileForVariant, urlForFile, type RoadVariant } from './roadModels.js';

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
  infraGroup = new THREE.Group(); // infrastructure (poles, pipes, lines)
  buildingGroup = new THREE.Group(); // static buildings and service structures
  groundGroup = new THREE.Group(); // static ground tiles
  boundaryGroup = new THREE.Group(); // map boundary lines
  roadsGroup = new THREE.Group(); // GLB-rendered road tiles
  private groundBuilt = false;
  private buildingsBuilt = false;
  private gltfCache: GLTFCache;
  private lastRoadSignature: string | null = null;
  initializedView = false;
  hoveredTile: { x: number; y: number; } | null = null;
  // Track the currently active tool so highlight visuals can adapt (e.g., bulldoze = red)
  private activeTool: string | null = null;
  private selectionRect: { x: number; y: number; w: number; h: number; zone?: 'R' | 'C' | 'I'; } | null = null;
  // Bulldoze rectangle (separate from selectionRect used for zoning to allow different coloring)
  private bulldozeRect: { x: number; y: number; w: number; h: number; } | null = null;
  private roadLine: { x0: number; y0: number; x1: number; y1: number; blocked?: boolean; } | null = null;
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
    const half = 25; // Expanded view half-height to show more of the map
    this.camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, -100, 100);
    this.camera.position.set(10, 10, 10);
    this.camera.up.set(0, 1, 0);
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
    dir.position.set(5, 10, 7);
    this.scene.add(dir);
  this.scene.add(this.groundGroup);
    this.scene.add(this.gridGroup);
    this.scene.add(this.highlightGroup);
    this.scene.add(this.selectionGroup);
    this.scene.add(this.infraGroup);
  this.scene.add(this.roadsGroup);
    this.scene.add(this.buildingGroup);
  this.scene.add(this.boundaryGroup);
  this.gltfCache = new GLTFCache(this.tileSize, '/textures/');

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
    move.addScaledVector(right, -deltaX * worldPerPixelX);
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

  setCameraState(state: { position: { x: number; y: number; z: number; }, lookAt: { x: number; y: number; z: number; }, zoom: number; }) {
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

    // Bulldoze rectangle preview (draw after zoning so it visually overrides)
    if (this.bulldozeRect) {
      const { x, y, w, h } = this.bulldozeRect;
      const color = 0xff0000;
      const geom = new THREE.BoxGeometry(w * this.tileSize * 1.08, 0.34, h * this.tileSize * 1.08);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 });
      const mesh = new THREE.Mesh(geom, mat);
      const cx = x + (w - 1) / 2;
      const cy = y + (h - 1) / 2;
      mesh.position.set(cx * this.tileSize, 0.17, cy * this.tileSize);
      this.selectionGroup.add(mesh);
      // Outline
      const edgeGeom = new THREE.BoxGeometry(w * this.tileSize * 1.08, 0.35, h * this.tileSize * 1.08);
      const edges = new THREE.EdgesGeometry(edgeGeom as any);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(mesh.position);
      this.selectionGroup.add(line);
    }

    // Road / infrastructure line preview
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
        tiles.push({ x, y });
        if (x === x1 && y === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
      }
      // Draw each tile as a semi-transparent box
      let color = blocked ? 0xff2222 : 0x646cff; // default road preview
      if (this.activeTool === 'infra_powerpole') color = 0xdddddd;
      else if (this.activeTool === 'infra_waterpipe') color = 0x00bcd4;
      else if (this.activeTool === 'infra_gaspipeline') color = 0xff9800;
      const roadMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
  // Use full tile size for preview so adjacent preview tiles visually connect without gaps
  const roadGeom = new THREE.BoxGeometry(this.tileSize * 1.0, 0.09, this.tileSize * 1.0);
      for (const t of tiles) {
        const mesh = new THREE.Mesh(roadGeom, roadMat);
        mesh.position.set(t.x * this.tileSize, 0.045, t.y * this.tileSize);
        this.selectionGroup.add(mesh);
      }
    }
  }

  setSelectionRect(rect: { x: number; y: number; w: number; h: number; zone?: 'R' | 'C' | 'I'; } | null) {
    this.selectionRect = rect;
    this.updateHighlight();
  }

  setBulldozeRect(rect: { x: number; y: number; w: number; h: number; } | null) {
    this.bulldozeRect = rect;
    this.updateHighlight();
  }

  setRoadLine(line: { x0: number; y0: number; x1: number; y1: number; blocked?: boolean; } | null) {
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
      // Build ground tile layer (only once per map size)
      this.buildGround(w, h);
      this.buildingsBuilt = false; // Reset buildings flag for new map
      this.initializedView = true;
    }
    // If a saved camera state skipped initialization earlier, ensure ground exists
    if (!this.groundBuilt && map.length && map[0].length) {
      const h = map.length; const w = map[0].length;
      this.buildGround(w, h);
    }
    // Simple rebuild each frame for now (small maps); optimize later.
  this.gridGroup.clear();
    this.infraGroup.clear(); // Only clear dynamic infrastructure (poles, pipes, power lines)

    // Clear and rebuild buildings only when needed (not every frame)
    if (!this.buildingsBuilt) {
      this.buildingGroup.clear();
    }

  const geom = new THREE.BoxGeometry(this.tileSize * 0.95, 0.25, this.tileSize * 0.95);
    // Road marking materials & geometries (simple white paint)
  // Markings disabled when using GLB-based roads; can be reintroduced if needed
    // Crosswalk stripe geometry (short thin strip across approach) created per direction
  // Crosswalk stripe base geometries (we'll clone & scale as needed)
    // Helper to build road tile variants with sidewalks & markings
  const buildRoadTile = (tile: any, mapRef: any[][]) => {
      const { x, y } = tile;
      const h = mapRef.length; const w = mapRef[0].length;
      const n = y > 0 && mapRef[y - 1][x].road;
      const s = y < h - 1 && mapRef[y + 1][x].road;
      const wR = x > 0 && mapRef[y][x - 1].road;
      const e = x < w - 1 && mapRef[y][x + 1].road;
      const connections = (n ? 1 : 0) + (s ? 1 : 0) + (wR ? 1 : 0) + (e ? 1 : 0);
      const group = new THREE.Group();
      group.position.set(x * this.tileSize, 0, y * this.tileSize);
  // Sidewalks removed – Kenney models include appropriate geometry
      // Determine variant type affects model selection and markings
      let variant: RoadVariant;
      if (connections === 0) variant = 'isolated';
      else if (connections === 1) variant = 'deadend';
      else if (connections === 4) variant = 'intersection';
      else if (connections === 3) variant = 't';
      else { // connections === 2
        if ((n && s) || (wR && e)) variant = 'straight'; else variant = 'curve';
      }
      // Place the GLB model for the core road surface
      const file = fileForVariant(variant);
  const url = urlForFile(file);
  this.gltfCache.load(url).then((mesh: THREE.Group) => {
        // rotate based on connection orientation
        // For straight: if vertical (N+S), rotate 90deg
        // For curve: rotate to match which two directions connect
        // For T: rotate so the missing side points outwards
        const rotY = this.rotationForVariant(variant, { n, s, w: wR, e });
  mesh.rotation.y = rotY;
  // Group already positioned at tile center, so add mesh at local origin
        // Ensure only one instance per tile key; clear any previous pending child
        group.add(mesh);
  }).catch((err: unknown) => {
        console.error('Failed to load road model', file, err);
      });

      // Optional extra markings can still be added later if desired.
      return group;
    };

    // Build persistent road models only if the road layout changed
    const computeRoadSignature = (m: any[][]) => m.map(r => r.map(t => (t.road ? '1' : '0')).join('')).join('|');
    const roadSig = computeRoadSignature(map);
    if (roadSig !== this.lastRoadSignature) {
      this.roadsGroup.clear();
      for (const row of map) {
        for (const tile of row) {
          if (tile.road) {
            const rt = buildRoadTile(tile, map);
            this.roadsGroup.add(rt);
          }
        }
      }
      this.lastRoadSignature = roadSig;
    }
    const overlaySel = (document.getElementById('hudOverlay') as HTMLSelectElement);
    const overlayMode = ((window as any).SIMCITY_OVERLAY_MODE ?? (overlaySel ? overlaySel.value : undefined)) || 'none';
    // Collect poles first for power line connection rendering
    const polePositions: { x: number; y: number; }[] = [];
    for (const row of map) for (const tile of row) if (tile.powerPole) polePositions.push({ x: tile.x, y: tile.y });

    for (const row of map) {
      for (const tile of row) {
  // Roads are handled by roadsGroup above

        // Zone tile rendering (skip only the zone mesh if no zone, but still allow infra below)
        if (tile.zone) {
          let color = 0x222222;
          if (tile.zone === 'R') color = tile.developed ? 0x4caf50 : 0x2e7d32;
          if (tile.zone === 'C') color = tile.developed ? 0x2196f3 : 0x1565c0;
          if (tile.zone === 'I') color = tile.developed ? 0xffc107 : 0xb28704;
          // Overlay tint modifications
          if (overlayMode === 'pollution') {
            const p = Math.min(100, tile.pollution || 0);
            const intensity = p / 100; // 0..1
            // Blend toward red
            const r = ((color >> 16) & 0xff);
            const g = ((color >> 8) & 0xff);
            const b = (color & 0xff);
            const nr = Math.min(255, Math.round(r + (255 - r) * intensity));
            const ng = Math.round(g * (1 - 0.5 * intensity));
            const nb = Math.round(b * (1 - 0.5 * intensity));
            color = (nr << 16) | (ng << 8) | nb;
          } else if (overlayMode === 'landValue') {
            const lv = Math.min(100, tile.landValue || 0);
            const tVal = lv / 100; // 0..1
            // Gradient blue (low) -> green (mid) -> yellow (high)
            let rC = 0, gC = 0, bC = 0;
            if (tVal < 0.5) { // blue->green
              const tt = tVal / 0.5; // 0..1
              rC = 0;
              gC = Math.round(128 * tt + 64);
              bC = Math.round(200 - 200 * tt);
            } else { // green -> yellow
              const tt = (tVal - 0.5) / 0.5;
              rC = Math.round(0 + 200 * tt);
              gC = 192;
              bC = Math.round(0 + 0 * tt);
            }
            color = (rC << 16) | (gC << 8) | bC;
          } else if (overlayMode === 'service') {
            // Service coverage: green if covered, gray if not
            if (tile.coverage && (tile.coverage.power || tile.coverage.education || tile.coverage.health || tile.coverage.safety)) {
              color = 0x00ff00;
            } else {
              color = 0x444444;
            }
          } else if (overlayMode === 'education') {
            const c = tile.coverage?.education || 0;
            if (c === 0) color = 0x222222; else {
              // scale 1..5+ into gradient blue->green->yellow
              const t = Math.min(1, c / 5);
              let rC = 0, gC = 0, bC = 0;
              if (t < 0.5) { // blue->green
                const tt = t / 0.5;
                rC = 0;
                gC = Math.round(200 * tt);
                bC = Math.round(200 - 150 * tt);
              } else { // green->yellow
                const tt = (t - 0.5) / 0.5;
                rC = Math.round(200 * tt);
                gC = 200;
                bC = 50 - Math.round(50 * tt);
              }
              color = (rC << 16) | (gC << 8) | bC;
            }
          } else if (overlayMode === 'health') {
            const c = tile.coverage?.health || 0;
            if (c === 0) color = 0x222222; else {
              const t = Math.min(1, c / 5);
              // gradient red->pink->white
              const rC = 150 + Math.round(105 * t);
              const gC = Math.round(80 + 150 * t);
              const bC = Math.round(80 + 150 * t);
              color = (rC << 16) | (gC << 8) | bC;
            }
          } else if (overlayMode === 'safety') {
            const c = tile.coverage?.safety || 0;
            if (c === 0) color = 0x222222; else {
              const t = Math.min(1, c / 5);
              // gradient dark red -> orange -> bright yellow
              let rC = Math.round(120 + 135 * t);
              let gC = Math.round(20 + 200 * t);
              let bC = Math.round(20 * (1 - t));
              color = (rC << 16) | (gC << 8) | bC;
            }
          } else if (overlayMode === 'gas') {
            // Gas coverage: orange if covered, gray if not
            color = tile.coverage?.gas ? 0xff9800 : 0x444444;
          } else if (overlayMode === 'water') {
            // Water coverage: cyan if covered, gray if not
            color = tile.coverage?.water ? 0x00bcd4 : 0x444444;
          } else if (overlayMode === 'sewage') {
            // Sewage coverage: purple if covered, gray if not
            color = tile.coverage?.sewage ? 0x8e24aa : 0x444444;
          } else if (overlayMode === 'garbage') {
            // Garbage coverage: yellow if covered, gray if not
            color = tile.coverage?.garbage ? 0xffeb3b : 0x444444;
          } else if (overlayMode === 'power') {
            // Power overlay: blue if powered, dark if not
            color = tile.powered ? 0x2196f3 : 0x222233;
          } else if (overlayMode === 'traffic') {
            // Traffic overlay: yellow/red for high load
            const load = Math.min(100, tile.trafficLoad || 0);
            if (load > 0) {
              const intensity = Math.min(1, load / 10);
              // Blend yellow to red
              const r = Math.round(255 * intensity);
              const g = Math.round(255 * (1 - intensity));
              color = (r << 16) | (g << 8);
            }
          }
          const mat = new THREE.MeshStandardMaterial({ color });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(tile.x * this.tileSize, 0.125, tile.y * this.tileSize);
          mesh.userData.tile = tile;
          this.gridGroup.add(mesh);
        }

        // Power pole (simple cylinder) above tile regardless of zone
        if (tile.powerPole) {
          const poleGeom = new THREE.CylinderGeometry(0.08, 0.1, 1.1, 8);
          const poleMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.1, roughness: 0.8 });
          const pole = new THREE.Mesh(poleGeom, poleMat);
          pole.position.set(tile.x * this.tileSize, 0.55, tile.y * this.tileSize);
          this.infraGroup.add(pole);
          // Crossarm
          const armGeom = new THREE.BoxGeometry(0.5, 0.05, 0.05);
          const arm = new THREE.Mesh(armGeom, poleMat);
          arm.position.set(tile.x * this.tileSize, 1.05, tile.y * this.tileSize);
          this.infraGroup.add(arm);
          // Insulator nubs
          const nubGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6);
          const nubMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
          const offsets = [-0.2, 0, 0.2];
          for (const off of offsets) {
            const nub = new THREE.Mesh(nubGeom, nubMat);
            nub.rotation.z = Math.PI / 2;
            nub.position.set(tile.x * this.tileSize + off, 1.05, tile.y * this.tileSize);
            this.infraGroup.add(nub);
          }
        }

        // Underground pipes visibility (water -> cyan, gas -> orange) regardless of zone
        const showWater = tile.waterPipe && (overlayMode === 'water' || this.activeTool === 'infra_waterpipe');
        const showGas = tile.gasPipe && (overlayMode === 'gas' || this.activeTool === 'infra_gaspipeline');
        if (showWater || showGas) {
          const pipeHeight = 0.03;
          if (showWater) {
            const matW = new THREE.MeshBasicMaterial({ color: 0x00bcd4 });
            const eastGeom = new THREE.BoxGeometry(this.tileSize * 0.5, pipeHeight, 0.08);
            const east = new THREE.Mesh(eastGeom, matW);
            east.position.set(tile.x * this.tileSize + this.tileSize * 0.25, 0.015, tile.y * this.tileSize + this.tileSize * 0.45);
            this.infraGroup.add(east);
            const southGeom = new THREE.BoxGeometry(0.08, pipeHeight, this.tileSize * 0.5);
            const south = new THREE.Mesh(southGeom, matW);
            south.position.set(tile.x * this.tileSize + this.tileSize * 0.45, 0.015, tile.y * this.tileSize + this.tileSize * 0.25);
            this.infraGroup.add(south);
          }
          if (showGas) {
            const matG = new THREE.MeshBasicMaterial({ color: 0xff9800 });
            const westGeom = new THREE.BoxGeometry(this.tileSize * 0.5, pipeHeight, 0.08);
            const west = new THREE.Mesh(westGeom, matG);
            west.position.set(tile.x * this.tileSize - this.tileSize * 0.25, 0.015, tile.y * this.tileSize - this.tileSize * 0.45);
            this.infraGroup.add(west);
            const northGeom = new THREE.BoxGeometry(0.08, pipeHeight, this.tileSize * 0.5);
            const north = new THREE.Mesh(northGeom, matG);
            north.position.set(tile.x * this.tileSize - this.tileSize * 0.45, 0.015, tile.y * this.tileSize - this.tileSize * 0.25);
            this.infraGroup.add(north);
          }
        }

        // Service buildings and infrastructure buildings (render only at the root tile)
        if (!this.buildingsBuilt && tile.building && tile.buildingRoot && tile.buildingRoot.x === tile.x && tile.buildingRoot.y === tile.y) {
          const bp = BLUEPRINTS[tile.building];
          if (bp && bp.color) {
            const buildingHeight = Math.max(0.5, bp.size.w * bp.size.h * 0.3); // Height scales with size

            let buildingGeom: THREE.BufferGeometry;

            // Check if this is a power station - render as dome
            if (tile.building === 'infra.powerstation' || tile.building === 'svc.power.small') {
              // Create dome geometry for power stations
              const radius = Math.min(bp.size.w, bp.size.h) * this.tileSize * 0.4;
              const heightScale = 0.8; // Make dome slightly flattened
              buildingGeom = new THREE.SphereGeometry(
                radius,
                16, // widthSegments
                8,  // heightSegments
                0,  // phiStart
                Math.PI * 2, // phiLength (full circle)
                0,  // thetaStart
                Math.PI * 0.5 // thetaLength (half sphere for dome)
              );
              buildingGeom.scale(1, heightScale, 1); // Flatten the dome
            } else {
              // Default box geometry for other buildings
              buildingGeom = new THREE.BoxGeometry(
                bp.size.w * this.tileSize * 0.9,
                buildingHeight,
                bp.size.h * this.tileSize * 0.9
              );
            }

            const buildingMat = new THREE.MeshStandardMaterial({
              color: bp.color,
              roughness: 0.8,
              metalness: 0.1
            });
            const building = new THREE.Mesh(buildingGeom, buildingMat);

            // Position at the center of the building footprint
            const centerX = tile.x + (bp.size.w - 1) / 2;
            const centerY = tile.y + (bp.size.h - 1) / 2;

            if (tile.building === 'infra.powerstation' || tile.building === 'svc.power.small') {
              // Position dome on ground level
              const radius = Math.min(bp.size.w, bp.size.h) * this.tileSize * 0.4;
              const heightScale = 0.8;
              building.position.set(
                centerX * this.tileSize,
                radius * heightScale + 0.25, // Position dome base slightly above tile level
                centerY * this.tileSize
              );
            } else {
              building.position.set(
                centerX * this.tileSize,
                buildingHeight / 2 + 0.25, // Slightly above tile level
                centerY * this.tileSize
              );
            }

            building.userData.building = tile.building;
            this.buildingGroup.add(building);
          }
        }
      }
    }

    // Mark buildings as built after first pass
    if (!this.buildingsBuilt) {
      this.buildingsBuilt = true;
    }

    // Power line connections (horizontal & vertical within 5 tiles) with sagging catenary-like curve
    if (polePositions.length) {
      const maxGap = 5;
      const poleSet = new Set(polePositions.map(p => p.x + ',' + p.y));
      const drawn = new Set<string>(); // avoid duplicate both directions
      const makeKey = (a: { x: number; y: number; }, b: { x: number; y: number; }) => a.x < b.x || (a.x === b.x && a.y < b.y) ? `${a.x},${a.y}-${b.x},${b.y}` : `${b.x},${b.y}-${a.x},${a.y}`;
      const logged = new Set<string>(); // track logged connections this frame

      const addSagLine = (ax: number, ay: number, bx: number, by: number) => {
        const start = new THREE.Vector3(ax * this.tileSize, 0.9, ay * this.tileSize);
        const end = new THREE.Vector3(bx * this.tileSize, 0.9, by * this.tileSize);
        const span = start.distanceTo(end);
        const sag = Math.min(0.35, 0.08 * span); // mild sag proportional to span
        const points: THREE.Vector3[] = [];
        const segments = Math.max(8, Math.floor(span * 6));
        for (let i = 0; i <= segments; i++) {
          const t = i / segments; // 0..1
          // simple parabolic sag y = base - sag * 4t(1-t)
          const yOffset = sag * 4 * t * (1 - t); // 0..sag
          const x = THREE.MathUtils.lerp(start.x, end.x, t);
          const z = THREE.MathUtils.lerp(start.z, end.z, t);
          points.push(new THREE.Vector3(x, start.y - yOffset, z));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0xe0e0e0 });
        const line = new THREE.Line(geo, mat);
        this.infraGroup.add(line);
      };

      for (const p of polePositions) {
        // Rightward search
        for (let dx = 1; dx <= maxGap; dx++) {
          const qx = p.x + dx, qy = p.y;
          if (poleSet.has(qx + ',' + qy)) {
            const key = makeKey(p, { x: qx, y: qy });
            if (!drawn.has(key)) { drawn.add(key); addSagLine(p.x, p.y, qx, qy); if (!logged.has(key)) { console.debug('[power] connect line', { from: p, to: { x: qx, y: qy } }); logged.add(key); } }
            break; // only connect nearest in this direction
          }
        }
        // Downward search
        for (let dy = 1; dy <= maxGap; dy++) {
          const qx = p.x, qy = p.y + dy;
          if (poleSet.has(qx + ',' + qy)) {
            const key = makeKey(p, { x: qx, y: qy });
            if (!drawn.has(key)) { drawn.add(key); addSagLine(p.x, p.y, qx, qy); if (!logged.has(key)) { console.debug('[power] connect line', { from: p, to: { x: qx, y: qy } }); logged.add(key); } }
            break;
          }
        }
      }
    }
  }

  private buildGround(w: number, h: number) {
    if (this.groundBuilt) return;
    this.groundGroup.clear();
    const tileGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    // Natural grass-like color palette (moderate saturation, slight value differences)
    // Picked to avoid overly neon greens while giving readable variation under different overlays.
    const palette = [0x2f5d26, 0x35662b, 0x3b6f30, 0x417735, 0x477f3a];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // deterministic pseudo-random pick based on coordinates
        const hash = (x * 73856093) ^ (y * 19349663);
        let color = palette[Math.abs(hash) % palette.length];
        // Apply a tiny brightness jitter (deterministic) for a less tiled look
        const jitter = ((hash >> 8) & 0xff) / 255; // 0..1
        const shade = 0.92 + (jitter * 0.06);      // 0.92 .. 1.08
        const r = Math.min(255, Math.round(((color >> 16) & 0xff) * shade));
        const g = Math.min(255, Math.round(((color >> 8) & 0xff) * shade));
        const b = Math.min(255, Math.round((color & 0xff) * shade));
        color = (r << 16) | (g << 8) | b;
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
        const quad = new THREE.Mesh(tileGeom, mat);
        quad.rotation.x = -Math.PI / 2;
        quad.position.set(x * this.tileSize, -0.02, y * this.tileSize);
        this.groundGroup.add(quad);
      }
    }
    // Add a subtle hemisphere light for ambient sky/ground contrast if not already present
    const hasHemi = this.scene.children.some(c => (c as any).isHemisphereLight);
    if (!hasHemi) {
      const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x223311, 0.35);
      this.scene.add(hemi);
    }
    this.groundBuilt = true;
    // Build map boundaries
    this.buildBoundaries(w, h);
  }

  private buildBoundaries(w: number, h: number) {
    this.boundaryGroup.clear();

    // Create dashed white line material
    const boundaryMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      linewidth: 2,
      scale: 1,
      dashSize: 0.3,
      gapSize: 0.1,
    });

    const height = 1.0; // Height above ground to avoid z-fighting

    // Helper function to create line
    const createLine = (points: THREE.Vector3[]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, boundaryMaterial);
      line.computeLineDistances(); // Required for dashed lines
      return line;
    };

    // Top boundary (north edge)
    const topPoints = [
      new THREE.Vector3(-0.5 * this.tileSize, height, -0.5 * this.tileSize),
      new THREE.Vector3((w - 0.5) * this.tileSize, height, -0.5 * this.tileSize)
    ];
    this.boundaryGroup.add(createLine(topPoints));

    // Bottom boundary (south edge)
    const bottomPoints = [
      new THREE.Vector3(-0.5 * this.tileSize, height, (h - 0.5) * this.tileSize),
      new THREE.Vector3((w - 0.5) * this.tileSize, height, (h - 0.5) * this.tileSize)
    ];
    this.boundaryGroup.add(createLine(bottomPoints));

    // Left boundary (west edge)
    const leftPoints = [
      new THREE.Vector3(-0.5 * this.tileSize, height, -0.5 * this.tileSize),
      new THREE.Vector3(-0.5 * this.tileSize, height, (h - 0.5) * this.tileSize)
    ];
    this.boundaryGroup.add(createLine(leftPoints));

    // Right boundary (east edge)
    const rightPoints = [
      new THREE.Vector3((w - 0.5) * this.tileSize, height, -0.5 * this.tileSize),
      new THREE.Vector3((w - 0.5) * this.tileSize, height, (h - 0.5) * this.tileSize)
    ];
    this.boundaryGroup.add(createLine(rightPoints));
  }

  frame(map: any[][]) {
    if (this.needsResize) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.renderer.setSize(w, h, false);
      const aspect = w / h;
      const frustumHeight = (this.camera.top - this.camera.bottom);
      this.camera.left = -frustumHeight / 2 * aspect;
      this.camera.right = frustumHeight / 2 * aspect;
      this.camera.updateProjectionMatrix();
      this.needsResize = false;
    }
    this.updateGrid(map);
    this.renderer.render(this.scene, this.camera);
  }

  private realignCamera() {
    this.camera.up.set(0, 1, 0); // enforce consistent up
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
      this.camera.up.set(0, 1, 0);
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

  // Compute Y-rotation for a road model variant based on which sides connect
  // Returns radians
  private rotationForVariant(variant: RoadVariant, conn: { n: any; s: any; w: any; e: any; }): number {
    const { n, s, w, e } = conn;
    switch (variant) {
      case 'straight':
        // If vertical (N and S), rotate 90deg, otherwise default (E-W)
        return (n && s && !w && !e) ? Math.PI / 2 : 0;
      case 'curve': {
        // Map which two directions connect to rotation so the curve bends between them
        // North-east and south-west curves are rotated an additional 180°
        if (n && e) return 0 + Math.PI;       // north-east: 0° + 180° = 180°
        if (e && s) return Math.PI / 2;       // east-south: no change
        if (s && w) return Math.PI + Math.PI; // south-west: 180° + 180° = 360° (0°)
        if (w && n) return -Math.PI / 2;      // west-north: no change
        return 0;
      }
      case 'deadend': {
        // Dead end points toward the open direction; rotate so the open side aligns
        // North and south facing roads are rotated 90° clockwise
        // East and west facing roads are rotated 90° counter-clockwise
        if (n) return Math.PI - Math.PI / 2;  // open to north: 180° - 90° = 90°
        if (e) return -Math.PI / 2 + Math.PI / 2;  // open to east: -90° + 90° = 0°
        if (s) return 0 - Math.PI / 2;        // open to south: 0° - 90° = -90°
        if (w) return Math.PI / 2 + Math.PI / 2;   // open to west: 90° + 90° = 180°
        return 0;
      }
      case 't': {
        // T intersection missing one side; rotate so the missing side points outward
        // North-South-West and North-South-East intersections are rotated an additional 180°
        if (!n) return 0;                           // missing north -> default
        if (!e) return Math.PI / 2 + Math.PI;       // missing east (N-S-W): 90° + 180° = 270°
        if (!s) return Math.PI;                     // missing south -> no change
        if (!w) return -Math.PI / 2 + Math.PI;      // missing west (N-S-E): -90° + 180° = 90°
        return 0;
      }
      case 'intersection':
      case 'isolated':
      default:
        return 0; // symmetric
    }
  }
}
