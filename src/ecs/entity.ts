import type { ComponentStore, EntityId } from './types';

let nextEntityId: EntityId = 1;

export interface EntityRecord {
  id: EntityId;
  mask: Set<ComponentStore<any>>; // which component stores this entity uses
}

export function createEntity(): EntityRecord {
  return { id: nextEntityId++, mask: new Set() };
}

export function addComponent<T>(entity: EntityRecord, store: ComponentStore<T>, value?: Partial<T>) {
  if (!store.data[entity.id]) {
    store.data[entity.id] = store.schema.create();
  }
  const target = store.data[entity.id] as any as T; // relaxed for initial scaffold
  Object.assign(target as any, value || {});
  entity.mask.add(store);
}

export function getComponent<T>(entity: EntityRecord, store: ComponentStore<T>): T | undefined {
  return store.data[entity.id] as T | undefined;
}
