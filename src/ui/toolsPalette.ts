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
  private currentHoverMenu: HTMLElement | null = null;
  private pinnedMenuCategory: string | null = null;

  private categories: Array<{ key: string; name: string; icon: string }> = [
    { key: 'info', name: 'Info', icon: '🔍' },
    { key: 'zoning', name: 'Zoning', icon: '🏘️' },
    { key: 'infrastructure', name: 'Infrastructure', icon: '🏗️' },
    { key: 'education', name: 'Education', icon: '🎓' },
    { key: 'health', name: 'Health', icon: '🏥' },
    { key: 'safety', name: 'Safety', icon: '🚒' },
    { key: 'demolish', name: 'Demolish', icon: '🚜' }
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
        width: 60px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1000;
      ">
        <div style="font: 11px/1.2 monospace; color: #ccc; text-align: center; margin-bottom: 6px;">Tools</div>
        ${this.categories.map(cat => this.renderCategoryButton(cat)).join('')}
      </div>
    `;

    // Bind category click events for toggling
    this.categories.forEach(cat => {
      const categoryBtn = this.container.querySelector(`[data-category="${cat.key}"]`) as HTMLElement;
      if (categoryBtn) {
        categoryBtn.addEventListener('click', () => this.toggleCategoryMenu(cat.key, categoryBtn));
      }
    });

    this.updateActiveState();
  }

  private renderCategoryButton(cat: { key: string; name: string; icon: string }): string {
    return `
      <button
        data-category="${cat.key}"
        title="${cat.name}"
        style="
          display: block;
          width: 44px;
          height: 44px;
          margin: 4px 0;
          background: #333;
          border: 2px solid #555;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          position: relative;
        "
      >
        <div style="line-height: 1;">${cat.icon}</div>
      </button>
    `;
  }

  private toggleCategoryMenu(categoryKey: string, categoryBtn: HTMLElement) {
    // If this category menu is already pinned, hide it
    if (this.pinnedMenuCategory === categoryKey) {
      this.hideCategoryMenu();
      this.pinnedMenuCategory = null;
      return;
    }

    // Hide any existing menu and show the new one
    this.hideCategoryMenu();
    this.showCategoryMenu(categoryKey, categoryBtn);
    this.pinnedMenuCategory = categoryKey;
  }

  private showCategoryMenu(categoryKey: string, categoryBtn: HTMLElement) {
    this.hideCategoryMenu();

    const tools = Object.values(TOOLS).filter(t => t.category === categoryKey);
    if (tools.length === 0) return;

    const rect = categoryBtn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'category-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.right + 8}px;
      top: ${rect.top}px;
      background: #222;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 1001;
      display: flex;
      gap: 4px;
      max-width: 400px;
      flex-wrap: wrap;
    `;

    menu.innerHTML = tools.map(tool => this.renderToolButton(tool)).join('');

    // Bind tool click events
    tools.forEach(tool => {
      const btn = menu.querySelector(`[data-tool="${tool.id}"]`) as HTMLButtonElement;
      if (btn) {
        btn.addEventListener('click', () => {
          this.setActiveTool(tool.id);
          // Don't hide the menu when selecting a tool - keep it pinned
        });
      }
    });

    document.body.appendChild(menu);
    this.currentHoverMenu = menu;
  }

  private hideCategoryMenu() {
    if (this.currentHoverMenu) {
      this.currentHoverMenu.remove();
      this.currentHoverMenu = null;
    }
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
    // Remove active state from all category buttons
    this.container.querySelectorAll('[data-category]').forEach(btn => {
      (btn as HTMLElement).style.borderColor = '#555';
      (btn as HTMLElement).style.background = '#333';
    });

    // Add active state to category of current tool
    const activeToolCategory = TOOLS[this.activeTool]?.category;
    if (activeToolCategory) {
      const activeCategoryBtn = this.container.querySelector(`[data-category="${activeToolCategory}"]`) as HTMLElement;
      if (activeCategoryBtn) {
        activeCategoryBtn.style.borderColor = '#646cff';
        activeCategoryBtn.style.background = '#444';
      }
    }

    // Add pinned state to pinned category
    if (this.pinnedMenuCategory) {
      const pinnedCategoryBtn = this.container.querySelector(`[data-category="${this.pinnedMenuCategory}"]`) as HTMLElement;
      if (pinnedCategoryBtn) {
        pinnedCategoryBtn.style.borderColor = '#ff6464';
        pinnedCategoryBtn.style.background = '#554';
      }
    }

    // Update active state in any open menu
    const openMenu = document.querySelector('.category-menu');
    if (openMenu) {
      openMenu.querySelectorAll('[data-tool]').forEach(btn => {
        (btn as HTMLElement).style.borderColor = '#555';
        (btn as HTMLElement).style.background = '#333';
      });

      const activeToolBtn = openMenu.querySelector(`[data-tool="${this.activeTool}"]`) as HTMLElement;
      if (activeToolBtn) {
        activeToolBtn.style.borderColor = '#646cff';
        activeToolBtn.style.background = '#444';
      }
    }
  }

  private bindGlobalDeselect() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setActiveTool('inspect');
        this.hideCategoryMenu();
        this.pinnedMenuCategory = null;
      }
    });

    // Close menu when clicking outside
    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const clickedOnPalette = target.closest('#tools-palette');
      const clickedOnMenu = target.closest('.category-menu');

      if (!clickedOnPalette && !clickedOnMenu) {
        this.hideCategoryMenu();
        this.pinnedMenuCategory = null;
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
