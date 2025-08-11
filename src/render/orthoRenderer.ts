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
  initializedView = false;
  hoveredTile: { x: number; y: number } | null = null;
  panState: PanState = { isPanning: false, lastX: 0, lastY: 0 };
  mapSize = { width: 16, height: 16 };
  onCameraChange?: () => void;

  constructor(container: HTMLElement, opts: OrthoRendererOptions = {}) {
    this.container = container;
    this.tileSize = opts.tileSize ?? 1;
    const aspect = container.clientWidth / container.clientHeight || 1;
    const half = 10; // view half-height
    this.camera = new THREE.OrthographicCamera(-half*aspect, half*aspect, half, -half, -100, 100);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0,0,0);
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

    this.bindPanEvents();
    window.addEventListener('resize', () => this.onResize());
  }

  private bindPanEvents() {
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+Left
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        this.container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    this.container.addEventListener('mousemove', (e) => {
      if (isPanning) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        this.panCamera(-deltaX * 0.03, deltaY * 0.03);

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.preventDefault();
      }
    });

    this.container.addEventListener('mouseup', (e) => {
      if (isPanning) {
        isPanning = false;
        this.container.style.cursor = 'default';
        e.preventDefault();
      }
    });

    this.container.addEventListener('mouseleave', () => {
      if (isPanning) {
        isPanning = false;
        this.container.style.cursor = 'default';
      }
    });

    // Zoom with mouse wheel
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
    // Pan the camera by moving its position and lookAt target
    const panVector = new THREE.Vector3(deltaX, 0, deltaY);
    this.camera.position.add(panVector);

    // Update the camera's lookAt target to maintain the same view direction
    const lookAtTarget = new THREE.Vector3();
    this.camera.getWorldDirection(lookAtTarget);
    lookAtTarget.multiplyScalar(-10); // distance to look at
    lookAtTarget.add(this.camera.position);
    this.camera.lookAt(lookAtTarget);
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
  }

  centerCameraOnTile(tileX: number, tileY: number) {
    const worldX = tileX * this.tileSize;
    const worldZ = tileY * this.tileSize;

    // Maintain the current camera height and angle
    const currentHeight = this.camera.position.y;
    const offset = new THREE.Vector3(8, 0, 8); // Maintain isometric offset

    this.camera.position.set(worldX + offset.x, currentHeight, worldZ + offset.z);
    this.camera.lookAt(worldX, 0, worldZ);
  }

  centerCameraOnMap() {
    const centerX = (this.mapSize.width - 1) / 2;
    const centerY = (this.mapSize.height - 1) / 2;
    this.centerCameraOnTile(centerX, centerY);
  }

  getCameraState() {
    const frustumHeight = this.camera.top - this.camera.bottom;

    // Calculate current lookAt target
    const lookAtTarget = new THREE.Vector3();
    this.camera.getWorldDirection(lookAtTarget);
    lookAtTarget.multiplyScalar(-10); // distance to look at
    lookAtTarget.add(this.camera.position);

    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      lookAt: {
        x: lookAtTarget.x,
        y: lookAtTarget.y,
        z: lookAtTarget.z
      },
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

    // Set camera lookAt
    this.camera.lookAt(state.lookAt.x, state.lookAt.y, state.lookAt.z);
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

  private updateHighlight() {
    this.highlightGroup.clear();

    if (this.hoveredTile) {
      const highlightGeom = new THREE.BoxGeometry(this.tileSize * 1.1, 0.3, this.tileSize * 1.1);
      const highlightMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
      });
      const highlight = new THREE.Mesh(highlightGeom, highlightMat);
      highlight.position.set(
        this.hoveredTile.x * this.tileSize,
        0.15,
        this.hoveredTile.y * this.tileSize
      );
      this.highlightGroup.add(highlight);
    }
  }

  updateGrid(map: any[][]) {
    // One-time camera centering based on map dimensions
    if (!this.initializedView && map.length && map[0].length) {
      const h = map.length; const w = map[0].length;
      const cx = (w - 1) / 2;
      const cz = (h - 1) / 2;
      // Place camera on a diagonal above center
      this.camera.position.set(cx + 8, Math.max(w, h) * 0.9, cz + 8);
      this.camera.lookAt(cx, 0, cz);
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
}
