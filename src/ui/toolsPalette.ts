// UI Tools palette for city building
// Expanded ToolType to include all available tools
export type ToolType =
  | 'inspect'
  | 'road'
  | 'zone_residential'
  | 'zone_commercial'
  | 'zone_industrial'
  | 'bulldoze'
  | 'infra_powerpole'
  | 'infra_powerstation'
  | 'infra_landfill'
  | 'infra_watertower'
  | 'infra_waterpipe'
  | 'infra_gaspipeline'
  | 'infra_refinery'
  | 'svc_firestation'
  | 'svc_hospital'
  | 'svc_preschool'
  | 'svc_middleschool'
  | 'svc_highschool'
  | 'svc_university'
  | 'svc_library'
  | 'svc_power_small'
  | 'svc_school_basic'
  | 'svc_clinic_basic'
  | 'svc_police_small';


export interface Tool {
  id: ToolType;
  name: string;
  icon: string; // emoji or text icon for now
  category: 'info' | 'infrastructure' | 'zoning' | 'demolish' | 'service' | 'education' | 'health' | 'safety';
  cost?: number;
  description: string;
}

// Expanded TOOLS with all available tools and grouped categories
export const TOOLS: Record<ToolType, Tool> = {
  inspect: { id: 'inspect', name: 'Inspect', icon: '🔍', category: 'info', description: 'Click tiles to view information' },
  road: { id: 'road', name: 'Road', icon: '🛣️', category: 'infrastructure', cost: 10, description: 'Build roads for transportation' },
  zone_residential: { id: 'zone_residential', name: 'Residential Zone', icon: '🏠', category: 'zoning', description: 'Zone areas for housing' },
  zone_commercial: { id: 'zone_commercial', name: 'Commercial Zone', icon: '🏢', category: 'zoning', description: 'Zone areas for businesses' },
  zone_industrial: { id: 'zone_industrial', name: 'Industrial Zone', icon: '🏭', category: 'zoning', description: 'Zone areas for industry' },
  bulldoze: { id: 'bulldoze', name: 'Bulldoze', icon: '🚜', category: 'demolish', description: 'Remove buildings and roads' },
  infra_powerpole: { id: 'infra_powerpole', name: 'Power Pole', icon: '⚡', category: 'infrastructure', cost: 20, description: 'Distribute power locally' },
  infra_powerstation: { id: 'infra_powerstation', name: 'Power Station', icon: '🏭⚡', category: 'infrastructure', cost: 1200, description: 'Generate power for the city' },
  infra_landfill: { id: 'infra_landfill', name: 'Landfill Zone', icon: '🗑️', category: 'infrastructure', cost: 300, description: 'Garbage collection and disposal' },
  infra_watertower: { id: 'infra_watertower', name: 'Water Tower', icon: '🚰', category: 'infrastructure', cost: 400, description: 'Water supply for the city' },
  infra_waterpipe: { id: 'infra_waterpipe', name: 'Water Pipe', icon: '🧵', category: 'infrastructure', cost: 10, description: 'Distribute water locally' },
  infra_gaspipeline: { id: 'infra_gaspipeline', name: 'Gas Pipeline', icon: '🛢️', category: 'infrastructure', cost: 15, description: 'Distribute gas locally' },
  infra_refinery: { id: 'infra_refinery', name: 'Refinery', icon: '🏭🔥', category: 'infrastructure', cost: 1500, description: 'Produce gas for the city' },
  svc_firestation: { id: 'svc_firestation', name: 'Fire Station', icon: '🚒', category: 'safety', cost: 400, description: 'Fire safety coverage' },
  svc_hospital: { id: 'svc_hospital', name: 'Hospital', icon: '🏥', category: 'health', cost: 900, description: 'Health coverage for citizens' },
  svc_preschool: { id: 'svc_preschool', name: 'Preschool', icon: '�', category: 'education', cost: 200, description: 'Early education' },
  svc_middleschool: { id: 'svc_middleschool', name: 'Middle School', icon: '🏫', category: 'education', cost: 350, description: 'Education for children' },
  svc_highschool: { id: 'svc_highschool', name: 'High School', icon: '🎓', category: 'education', cost: 500, description: 'Education for teens' },
  svc_university: { id: 'svc_university', name: 'University', icon: '🏛️', category: 'education', cost: 1200, description: 'Higher education' },
  svc_library: { id: 'svc_library', name: 'Library', icon: '📚', category: 'education', cost: 250, description: 'Public library' },
  svc_power_small: { id: 'svc_power_small', name: 'Small Power Plant', icon: '⚡', category: 'infrastructure', cost: 500, description: 'Small power generation' },
  svc_school_basic: { id: 'svc_school_basic', name: 'Basic School', icon: '🏫', category: 'education', cost: 300, description: 'Basic education' },
  svc_clinic_basic: { id: 'svc_clinic_basic', name: 'Clinic', icon: '🏥', category: 'health', cost: 300, description: 'Basic health coverage' },
  svc_police_small: { id: 'svc_police_small', name: 'Police Station', icon: '🚓', category: 'safety', cost: 350, description: 'Police coverage' }
};

export class ToolsPalette {
  private container: HTMLElement;
  private activeTool: ToolType = 'inspect';
  private onToolChange?: (tool: ToolType) => void;

  private categories: Array<{ key: string; name: string }> = [
    { key: 'info', name: 'Info' },
    { key: 'zoning', name: 'Zoning' },
    { key: 'infrastructure', name: 'Infrastructure' },
    { key: 'service', name: 'Services' },
    { key: 'education', name: 'Education' },
    { key: 'health', name: 'Health' },
    { key: 'safety', name: 'Safety' },
    { key: 'demolish', name: 'Demolish' }
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.bindGlobalDeselect();
  }

  setOnToolChange(callback: (tool: ToolType) => void) {
    this.onToolChange = callback;
  }

  getActiveTool(): ToolType {
    return this.activeTool;
  }

  setActiveTool(tool: ToolType) {
    if (this.activeTool === tool) {
      // Deselect if clicking the active tool again
      this.activeTool = 'inspect';
    } else {
      this.activeTool = tool;
    }
    this.updateActiveState();
    this.onToolChange?.(this.activeTool);
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
        width: 80px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        max-height: 90vh;
        overflow-y: auto;
      ">
        <div style="font: 11px/1.2 monospace; color: #ccc; text-align: center; margin-bottom: 6px;">Tools</div>
        ${this.categories.map(cat => this.renderCategory(cat)).join('')}
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

  private renderCategory(cat: { key: string; name: string }): string {
    const tools = Object.values(TOOLS).filter(t => t.category === cat.key);
    if (tools.length === 0) return '';
    return `
      <div style="margin-bottom: 8px;">
        <div style="font-size: 10px; color: #aaa; margin-bottom: 2px; text-align: left;">${cat.name}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 2px;">
          ${tools.map(tool => this.renderToolButton(tool)).join('')}
        </div>
      </div>
    `;
  }

  private renderToolButton(tool: Tool): string {
    const costText = tool.cost ? `$${tool.cost}` : '';
    return `
      <button
        data-tool="${tool.id}"
        title="${tool.name}${costText ? ' - ' + costText : ''}\n${tool.description}"
        style="
          display: inline-block;
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

  private bindGlobalDeselect() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setActiveTool('inspect');
      }
    });
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
