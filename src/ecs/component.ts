import type { ComponentSchema, ComponentStore } from './types';

export function createComponentStore<T>(schema: ComponentSchema<T>): ComponentStore<T> {
  return { schema, data: [] };
}
