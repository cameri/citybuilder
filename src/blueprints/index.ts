// Blueprint system for buildings and infrastructure
export interface Blueprint {
  id: string;
  name: string;
  type: 'building' | 'road' | 'infrastructure';
  category: 'residential' | 'commercial' | 'industrial' | 'road' | 'service';

  // Requirements
  cost: number;
  requirements?: {
    power?: boolean;
    water?: boolean;
    road?: boolean; // needs road access
    zone?: 'R' | 'C' | 'I'; // must be placed on this zone type
  };

  // Game effects
  effects: {
    residents?: number; // population capacity
    jobs?: number; // job capacity
    pollution?: number; // pollution factor
    upkeep?: number; // ongoing cost per tick
    taxRevenue?: number; // tax revenue multiplier
  };

  // Visual/placement
  size: { w: number; h: number }; // tile footprint
  model?: string; // 3D model reference (future)
  color?: number; // hex color for simple rendering
}

// Phase 1 minimal blueprints as defined in the plan
export const BLUEPRINTS: Record<string, Blueprint> = {
  'road.basic': {
    id: 'road.basic',
    name: 'Basic Road',
    type: 'road',
    category: 'road',
    cost: 10,
    effects: {
      upkeep: 0.1
    },
    size: { w: 1, h: 1 },
    color: 0x555555
  },

  'res.plot': {
    id: 'res.plot',
    name: 'Residential Plot',
    type: 'building',
    category: 'residential',
    cost: 50,
    requirements: {
      zone: 'R',
      road: true
    },
    effects: {
      residents: 5, // baseResidents as per plan
      upkeep: 0.05,
      taxRevenue: 1.0
    },
    size: { w: 1, h: 1 },
    color: 0x4caf50
  },

  'com.plot': {
    id: 'com.plot',
    name: 'Commercial Plot',
    type: 'building',
    category: 'commercial',
    cost: 75,
    requirements: {
      zone: 'C',
      road: true
    },
    effects: {
      jobs: 4, // baseJobs as per plan
      upkeep: 0.05,
      taxRevenue: 0.5
    },
    size: { w: 1, h: 1 },
    color: 0x2196f3
  },

  'ind.plot': {
    id: 'ind.plot',
    name: 'Industrial Plot',
    type: 'building',
    category: 'industrial',
    cost: 100,
    requirements: {
      zone: 'I',
      road: true
    },
    effects: {
      jobs: 6, // baseJobs as per plan
      pollution: 1.0, // pollutionFactor placeholder
      upkeep: 0.05,
      taxRevenue: 0.5
    },
    size: { w: 1, h: 1 },
    color: 0xffc107
  }
};

export function getBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINTS[id];
}

export function getAllBlueprints(): Blueprint[] {
  return Object.values(BLUEPRINTS);
}

export function getBlueprintsByCategory(category: Blueprint['category']): Blueprint[] {
  return getAllBlueprints().filter(bp => bp.category === category);
}

export function getBlueprintsByType(type: Blueprint['type']): Blueprint[] {
  return getAllBlueprints().filter(bp => bp.type === type);
}

// Validation function to check if a blueprint can be placed at a location
export function canPlaceBlueprint(
  blueprint: Blueprint,
  x: number,
  y: number,
  map: any[][]
): { canPlace: boolean; reason?: string } {
  // Check bounds
  if (y + blueprint.size.h > map.length || x + blueprint.size.w > map[0].length) {
    return { canPlace: false, reason: 'Out of bounds' };
  }

  // Check if all tiles in footprint are valid
  for (let dy = 0; dy < blueprint.size.h; dy++) {
    for (let dx = 0; dx < blueprint.size.w; dx++) {
      const tile = map[y + dy][x + dx];

      // Check zone requirement
      if (blueprint.requirements?.zone && tile.zone !== blueprint.requirements.zone) {
        return { canPlace: false, reason: `Requires ${blueprint.requirements.zone} zone` };
      }

      // Check if tile is already occupied by a building
      if (tile.building && blueprint.type === 'building') {
        return { canPlace: false, reason: 'Tile already occupied' };
      }

      // Road access check (simplified - just check if any adjacent tile has a road)
      if (blueprint.requirements?.road) {
        const hasRoadAccess = checkRoadAccess(x + dx, y + dy, map);
        if (!hasRoadAccess) {
          return { canPlace: false, reason: 'No road access' };
        }
      }
    }
  }

  return { canPlace: true };
}

// Simple road access check - looks for roads in adjacent tiles
function checkRoadAccess(x: number, y: number, map: any[][]): boolean {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // N, S, E, W

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length) {
      if (map[ny][nx].road) {
        return true;
      }
    }
  }

  return false;
}
