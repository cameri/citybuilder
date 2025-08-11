// Action type definitions for Phase 1
export type Action =
  | { type: 'SET_ZONE'; x: number; y: number; zone: 'R' | 'C' | 'I' | null }
  | { type: 'ZONE_RECT'; rect: { x: number; y: number; w: number; h: number }; zone: 'R' | 'C' | 'I' }
  | { type: 'PLACE_ROAD'; x: number; y: number }
  | { type: 'PLACE_BUILDING'; x: number; y: number; blueprintId: string }
  | { type: 'SET_TAX_RATE'; value: number }
  | { type: 'SET_SPEED'; speed: 0 | 1 | 2 | 4 }
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME' }
  | { type: 'SET_TIME_SCALE'; speed: 1 | 2 | 4 | 8 } // legacy, will fold into SET_SPEED later
  | { type: 'BULLDOZE'; x: number; y: number } // new Phase 1 action
  | { type: 'BULLDOZE_RECT'; rect: { x: number; y: number; w: number; h: number } }
  | { type: 'INSPECT_TILE'; x: number; y: number } // new Phase 1 action
  // Phase 2
  | { type: 'TOGGLE_OVERLAY'; overlay: 'none' | 'pollution' | 'landValue' | 'power' }
  | { type: 'PLACE_SERVICE'; x: number; y: number; blueprintId: string }
  // Infrastructure line tools
  | { type: 'PLACE_POWER_POLE_LINE'; line: { x0: number; y0: number; x1: number; y1: number } }
  | { type: 'PLACE_WATER_PIPE_LINE'; line: { x0: number; y0: number; x1: number; y1: number } }
  | { type: 'PLACE_GAS_PIPE_LINE'; line: { x0: number; y0: number; x1: number; y1: number } };

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
