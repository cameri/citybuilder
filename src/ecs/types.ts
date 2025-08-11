// Basic ECS type declarations
export type EntityId = number;
export type ComponentTypeId = number;

export interface ComponentSchema<T> {
  name: string;
  create: () => T;
  reset?: (value: T) => void;
}

export interface ComponentStore<T> {
  schema: ComponentSchema<T>;
  data: (T | undefined)[];
}

export interface SystemContext {
  world: World;
  delta: number; // seconds
  tick: number;
}

// Forward declaration (actual interface extended after World defined)
export interface World {
  tick: number;
}
