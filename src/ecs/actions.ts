// Action type definitions for Phase 1
export type Action =
  | { type: 'SET_ZONE'; x: number; y: number; zone: 'R' | 'C' | 'I' | null }
  | { type: 'SET_TIME_SCALE'; speed: 1 | 2 | 4 | 8 };

export type ActionHandler = (action: Action, ctx: { world: any }) => void;

export interface ActionRegistryEntry {
  type: Action['type'];
  handler: ActionHandler;
}

const registry = new Map<Action['type'], ActionHandler>();

export function registerAction(type: Action['type'], handler: ActionHandler) {
  registry.set(type, handler);
}

export function handleAction(action: Action, ctx: { world: any }) {
  const h = registry.get(action.type);
  if (h) h(action as any, ctx);
}
