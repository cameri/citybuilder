// Maps our logical road variants to specific Kenney City Kit Roads GLB filenames.
// Reference: models/roads/Overview.html

export type RoadVariant = 'isolated' | 'deadend' | 'straight' | 'curve' | 't' | 'intersection';

export function fileForVariant(variant: RoadVariant): string {
  switch (variant) {
    case 'isolated':
      return 'road-square.glb';
    case 'deadend':
      return 'road-end.glb';
    case 'straight':
      return 'road-straight.glb';
    case 'curve':
      return 'road-bend.glb'; // Use road-bend for corner roads
    case 't':
      return 'road-intersection.glb'; // 3-way
    case 'intersection':
      return 'road-crossroad.glb'; // 4-way
  }
}

export function urlForFile(file: string): string {
  // Served from Vite public/ at runtime under root
  return `/models/roads/${file}`;
}
