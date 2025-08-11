// Blueprint system for buildings and infrastructure
export interface Blueprint {
  id: string;
  name: string;
  type: 'building' | 'road' | 'infrastructure';
  category: 'residential' | 'commercial' | 'industrial' | 'road' | 'service';
  densityTier?: 1|2|3; // Phase 2 auto leveling
  service?: { type: 'power'|'education'|'health'|'safety'|'gas'|'water'|'sewage'|'garbage'; capacity: number; range: number };
  upgradeTo?: string; // next density blueprint id

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
  densityTier: 1,
  upgradeTo: 'res.plot.med',
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
  densityTier: 1,
  upgradeTo: 'com.plot.med',
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
  densityTier: 1,
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
  },
  // Medium density examples (auto-upgrade targets)
  'res.plot.med': {
    id: 'res.plot.med', name: 'Residential (Med)', type: 'building', category: 'residential', densityTier: 2, upgradeTo: 'res.plot.high', cost: 80,
    requirements: { zone: 'R', road: true },
    effects: { residents: 9, upkeep: 0.07, taxRevenue: 1.1 }, size: { w:1, h:1 }, color: 0x66bb6a
  },
  'res.plot.high': {
    id: 'res.plot.high', name: 'Residential (High)', type: 'building', category: 'residential', densityTier: 3, cost: 120,
    requirements: { zone: 'R', road: true },
    effects: { residents: 14, upkeep: 0.1, taxRevenue: 1.2 }, size: { w:1, h:1 }, color: 0x81c784
  },
  'com.plot.med': {
    id: 'com.plot.med', name: 'Commercial (Med)', type: 'building', category: 'commercial', densityTier: 2, upgradeTo: 'com.plot.high', cost: 110,
    requirements: { zone: 'C', road: true },
    effects: { jobs: 7, upkeep: 0.07, taxRevenue: 0.6 }, size: { w:1, h:1 }, color: 0x42a5f5
  },
  'com.plot.high': {
    id: 'com.plot.high', name: 'Commercial (High)', type: 'building', category: 'commercial', densityTier: 3, cost: 160,
    requirements: { zone: 'C', road: true },
    effects: { jobs: 11, upkeep: 0.1, taxRevenue: 0.75 }, size: { w:1, h:1 }, color: 0x64b5f6
  },
  'ind.plot.heavy': {
    id: 'ind.plot.heavy', name: 'Industrial (Heavy)', type: 'building', category: 'industrial', densityTier: 2, cost: 160,
    requirements: { zone: 'I', road: true },
    effects: { jobs: 10, pollution: 2.0, upkeep: 0.12, taxRevenue: 0.65 }, size: { w:1, h:1 }, color: 0xffd54f
  },
  // Service buildings (Phase 2)
  'infra.powerpole': {
    id: 'infra.powerpole', name: 'Power Pole', type: 'infrastructure', category: 'service', cost: 20,
  service: { type: 'power', capacity: 10, range: 5 }, effects: { upkeep: 0.02 }, size: { w:1, h:1 }, color: 0xbdbdbd
  },
  'infra.powerstation': {
    id: 'infra.powerstation', name: 'Power Station', type: 'infrastructure', category: 'service', cost: 1200,
    service: { type: 'power', capacity: 1000, range: 12 }, effects: { pollution: 8.0, upkeep: 2.5 }, size: { w:3, h:3 }, color: 0x616161
  },
  'infra.landfill': {
    id: 'infra.landfill', name: 'Landfill Zone', type: 'infrastructure', category: 'service', cost: 300,
    service: { type: 'garbage', capacity: 500, range: 8 }, effects: { pollution: 4.0, upkeep: 0.8 }, size: { w:2, h:2 }, color: 0xfff176
  },
  'infra.watertower': {
    id: 'infra.watertower', name: 'Water Tower', type: 'infrastructure', category: 'service', cost: 400,
    service: { type: 'water', capacity: 200, range: 6 }, effects: { upkeep: 0.5 }, size: { w:2, h:2 }, color: 0x4fc3f7
  },
  'infra.waterpipe': {
    id: 'infra.waterpipe', name: 'Water Pipe', type: 'infrastructure', category: 'service', cost: 10,
    service: { type: 'water', capacity: 20, range: 2 }, effects: { upkeep: 0.01 }, size: { w:1, h:1 }, color: 0x0288d1
  },
  'infra.gaspipeline': {
    id: 'infra.gaspipeline', name: 'Gas Pipeline', type: 'infrastructure', category: 'service', cost: 15,
    service: { type: 'gas', capacity: 20, range: 2 }, effects: { upkeep: 0.01 }, size: { w:1, h:1 }, color: 0xff9800
  },
  'infra.refinery': {
    id: 'infra.refinery', name: 'Refinery', type: 'infrastructure', category: 'service', cost: 1500,
    service: { type: 'gas', capacity: 500, range: 10 }, effects: { pollution: 10.0, upkeep: 3.0 }, size: { w:4, h:3 }, color: 0xf57c00
  },
  'svc.firestation': {
    id: 'svc.firestation', name: 'Fire Station', type: 'building', category: 'service', cost: 400,
    service: { type: 'safety', capacity: 150, range: 6 }, effects: { upkeep: 1.0 }, size: { w:2, h:2 }, color: 0xd32f2f
  },
  'svc.hospital': {
    id: 'svc.hospital', name: 'Hospital', type: 'building', category: 'service', cost: 900,
    service: { type: 'health', capacity: 300, range: 8 }, effects: { upkeep: 2.0 }, size: { w:3, h:3 }, color: 0xc5e1a5
  },
  'svc.preschool': {
    id: 'svc.preschool', name: 'Preschool', type: 'building', category: 'service', cost: 200,
    service: { type: 'education', capacity: 60, range: 4 }, effects: { upkeep: 0.4 }, size: { w:1, h:1 }, color: 0xffb74d
  },
  'svc.middleschool': {
    id: 'svc.middleschool', name: 'Middle School', type: 'building', category: 'service', cost: 350,
    service: { type: 'education', capacity: 120, range: 5 }, effects: { upkeep: 0.7 }, size: { w:2, h:2 }, color: 0x64b5f6
  },
  'svc.highschool': {
    id: 'svc.highschool', name: 'High School', type: 'building', category: 'service', cost: 500,
    service: { type: 'education', capacity: 200, range: 6 }, effects: { upkeep: 1.0 }, size: { w:2, h:2 }, color: 0x1976d2
  },
  'svc.university': {
    id: 'svc.university', name: 'University', type: 'building', category: 'service', cost: 1200,
    service: { type: 'education', capacity: 400, range: 10 }, effects: { upkeep: 2.5 }, size: { w:3, h:3 }, color: 0x512da8
  },
  'svc.library': {
    id: 'svc.library', name: 'Library', type: 'building', category: 'service', cost: 250,
    service: { type: 'education', capacity: 80, range: 4 }, effects: { upkeep: 0.5 }, size: { w:1, h:2 }, color: 0x8d6e63
  },
  'svc.power.small': {
    id: 'svc.power.small', name: 'Small Power Plant', type: 'building', category: 'service', cost: 500,
    service: { type: 'power', capacity: 200, range: 6 },
    effects: { pollution: 3.0, upkeep: 1.0 }, size: { w:2, h:2 }, color: 0xff7043
  },
  'svc.school.basic': {
    id: 'svc.school.basic', name: 'Basic School', type: 'building', category: 'service', cost: 300,
    service: { type: 'education', capacity: 150, range: 5 },
    effects: { upkeep: 0.8 }, size: { w:2, h:2 }, color: 0x9575cd
  },
  'svc.clinic.basic': {
    id: 'svc.clinic.basic', name: 'Clinic', type: 'building', category: 'service', cost: 300,
    service: { type: 'health', capacity: 120, range: 5 },
    effects: { upkeep: 0.9 }, size: { w:2, h:2 }, color: 0xba68c8
  },
  'svc.police.small': {
    id: 'svc.police.small', name: 'Police Station', type: 'building', category: 'service', cost: 350,
    service: { type: 'safety', capacity: 120, range: 5 },
    effects: { upkeep: 0.9 }, size: { w:2, h:2 }, color: 0x90a4ae
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
