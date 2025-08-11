// UI Tools palette for city building
export type ToolType = 'inspect' | 'road' | 'zone_residential' | 'zone_commercial' | 'zone_industrial' | 'bulldoze';

export interface Tool {
  id: ToolType;
  name: string;
  icon: string; // emoji or text icon for now
  category: 'info' | 'infrastructure' | 'zoning' | 'demolish';
  cost?: number;
  description: string;
}

export const TOOLS: Record<ToolType, Tool> = {
  inspect: {
    id: 'inspect',
    name: 'Inspect',
    icon: '🔍',
    category: 'info',
    description: 'Click tiles to view information'
  },
  road: {
    id: 'road',
    name: 'Road',
    icon: '🛣️',
    category: 'infrastructure',
    cost: 10,
    description: 'Build roads for transportation'
  },
  zone_residential: {
    id: 'zone_residential',
    name: 'Residential Zone',
    icon: '🏠',
    category: 'zoning',
    description: 'Zone areas for housing'
  },
  zone_commercial: {
    id: 'zone_commercial',
    name: 'Commercial Zone',
    icon: '🏢',
    category: 'zoning',
    description: 'Zone areas for businesses'
  },
  zone_industrial: {
    id: 'zone_industrial',
    name: 'Industrial Zone',
    icon: '🏭',
    category: 'zoning',
    description: 'Zone areas for industry'
  },
  bulldoze: {
    id: 'bulldoze',
    name: 'Bulldoze',
    icon: '🚜',
    category: 'demolish',
    description: 'Remove buildings and roads'
  }
};

export class ToolsPalette {
  private container: HTMLElement;
  private activeTool: ToolType = 'inspect';
  private onToolChange?: (tool: ToolType) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setOnToolChange(callback: (tool: ToolType) => void) {
    this.onToolChange = callback;
  }

  getActiveTool(): ToolType {
    return this.activeTool;
  }

  setActiveTool(tool: ToolType) {
    this.activeTool = tool;
    this.updateActiveState();
    this.onToolChange?.(tool);
  }

  private render() {
    this.container.innerHTML = `
      <div id="tools-palette" style="
        position: fixed;
        left: 8px;
        top: 60px;
        background: #222;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 8px;
        width: 60px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="font: 11px/1.2 monospace; color: #ccc; text-align: center; margin-bottom: 6px;">Tools</div>
        ${Object.values(TOOLS).map(tool => this.renderToolButton(tool)).join('')}
      </div>
    `;

    // Bind click events
    Object.keys(TOOLS).forEach(toolId => {
      const btn = this.container.querySelector(`[data-tool="${toolId}"]`) as HTMLButtonElement;
      if (btn) {
        btn.addEventListener('click', () => this.setActiveTool(toolId as ToolType));
      }
    });

    this.updateActiveState();
  }

  private renderToolButton(tool: Tool): string {
    const costText = tool.cost ? `$${tool.cost}` : '';
    return `
      <button
        data-tool="${tool.id}"
        title="${tool.name}${costText ? ' - ' + costText : ''}\n${tool.description}"
        style="
          display: block;
          width: 44px;
          height: 44px;
          margin: 2px 0;
          background: #333;
          border: 2px solid #555;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          position: relative;
        "
      >
        <div style="line-height: 1;">${tool.icon}</div>
        ${tool.cost ? `<div style="position: absolute; bottom: 2px; right: 2px; font-size: 8px; background: #000; padding: 1px 2px; border-radius: 2px;">${tool.cost}</div>` : ''}
      </button>
    `;
  }

  private updateActiveState() {
    // Remove active state from all buttons
    this.container.querySelectorAll('[data-tool]').forEach(btn => {
      (btn as HTMLElement).style.borderColor = '#555';
      (btn as HTMLElement).style.background = '#333';
    });

    // Add active state to current tool
    const activeBtn = this.container.querySelector(`[data-tool="${this.activeTool}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.style.borderColor = '#646cff';
      activeBtn.style.background = '#444';
    }
  }
}

// Tool state management
export interface ToolState {
  activeTool: ToolType;
  brushSize: number; // for future rectangular brush
  isDrawing: boolean;
  startPos?: { x: number; y: number };
  endPos?: { x: number; y: number };
}

export function createToolState(): ToolState {
  return {
    activeTool: 'inspect',
    brushSize: 1,
    isDrawing: false
  };
}
