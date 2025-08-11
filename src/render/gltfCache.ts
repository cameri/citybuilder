import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class GLTFCache {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<THREE.Group>>();
  private tileSize: number;
  private resourcePath?: string;

  constructor(tileSize: number = 1, resourcePath?: string) {
    this.tileSize = tileSize;
    this.resourcePath = resourcePath;
  }

  // Load a GLB and return a cloneable container. We avoid re-centering to keep authored pivots/origins.
  load(url: string): Promise<THREE.Group> {
    if (!this.cache.has(url)) {
      const p = new Promise<THREE.Group>((resolve, reject) => {
  if (this.resourcePath) this.loader.setResourcePath(this.resourcePath);
  this.loader.load(url, (gltf) => {
          const root = gltf.scene || gltf.scenes?.[0];
          if (!root) { reject(new Error('GLTF has no scene: ' + url)); return; }
          // Compute bounds for scaling only
          const box = new THREE.Box3().setFromObject(root);
          const size = new THREE.Vector3();
          box.getSize(size);

          // Wrap in container to allow per-tile rotation/position safely
          const container = new THREE.Group();
          const model = root.clone(true);
          // Scale uniformly to fit tile footprint (prioritize X/Z average), but only if not already ~tileSize
          const foot = Math.max(1e-6, (size.x + size.z) / 2);
          if (foot > 0) {
            const scale = this.tileSize / foot;
            // Avoid extreme scaling if already close to expected size
            if (Math.abs(1 - scale) > 0.05) {
              model.scale.setScalar(scale);
            }
          }

          // Slightly lift so it sits on ground plane
          model.position.y += 0.02;

          container.add(model);
          resolve(container);
        }, undefined, (err) => reject(err));
      });
      this.cache.set(url, p);
    }
    // Return a cloned instance so multiple tiles can share the source
    return this.cache.get(url)!.then((templ) => templ.clone(true));
  }
}
