import type { SystemContext } from './types';

export interface System {
  name: string;
  order: number; // lower runs earlier
  update(ctx: SystemContext): void;
}

export function createSystem(name: string, order: number, update: (ctx: SystemContext) => void): System {
  return { name, order, update };
}
