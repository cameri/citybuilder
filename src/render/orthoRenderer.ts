import * as THREE from 'three';

export interface OrthoRendererOptions {
  tileSize?: number; // world units per tile
}

export class OrthoRenderer {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  tileSize: number;
  container: HTMLElement;
  needsResize = true;
  gridGroup = new THREE.Group();

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

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.needsResize = true;
  }

  updateGrid(map: any[][]) {
    // Simple rebuild each frame for now (small maps); optimize later.
    this.gridGroup.clear();
    const geom = new THREE.BoxGeometry(this.tileSize*0.95, 0.1, this.tileSize*0.95);
    for (const row of map) {
      for (const tile of row) {
        if (!tile.zone) continue;
        let color = 0x222222;
        if (tile.zone === 'R') color = tile.developed ? 0x4caf50 : 0x2e7d32;
        if (tile.zone === 'C') color = tile.developed ? 0x2196f3 : 0x1565c0;
        if (tile.zone === 'I') color = tile.developed ? 0xffc107 : 0xb28704;
        const mat = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(tile.x * this.tileSize, 0, tile.y * this.tileSize);
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
