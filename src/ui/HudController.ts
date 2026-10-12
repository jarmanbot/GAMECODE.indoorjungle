import type { GameScene } from '../game/GameScene';
import type { FutureZone, ZoomMode } from '../game/world';

type TaskState = 'find' | 'sell' | 'complete';

export class HudController {
  private scene: GameScene | null = null;
  private zoomOutHandler: (() => void) | null = null;
  private zoomInHandler: (() => void) | null = null;
  private overviewReturnHandler: (() => void) | null = null;
  private overviewSelectHandler: ((key: string) => void) | null = null;
  private readonly coinCount = document.querySelector<HTMLElement>('#coin-count')!;
  private readonly objectiveText = document.querySelector<HTMLElement>('#objective-text')!;
  private readonly zoomLabel = document.querySelector<HTMLElement>('#zoom-label')!;
  private readonly interactButton = document.querySelector<HTMLButtonElement>('#interact-button')!;
  private readonly interactLabel = document.querySelector<HTMLElement>('#interact-label')!;
  private readonly toast = document.querySelector<HTMLElement>('#toast')!;
  private readonly overviewOverlay = document.querySelector<HTMLElement>('#overview-overlay')!;
  private readonly overviewSelection = document.querySelector<HTMLElement>('#overview-selection')!;
  private readonly overviewSelectionName = document.querySelector<HTMLElement>('#overview-selection-name')!;
  private readonly overviewSelectionCondition = document.querySelector<HTMLElement>('#overview-selection-condition')!;
  private readonly panelBackdrop = document.querySelector<HTMLElement>('#panel-backdrop')!;
  private readonly panelTitle = document.querySelector<HTMLElement>('#panel-title')!;
  private readonly panelBody = document.querySelector<HTMLElement>('#panel-body')!;
  private activeTask: TaskState = 'find';
  private hasPot = false;

  constructor() {
    document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((button) => {
      button.addEventListener('click', () => this.openPanel(button.dataset.panel ?? 'more'));
    });
    document.querySelector<HTMLButtonElement>('#settings-button')!.addEventListener('click', () => this.openPanel('settings'));
    document.querySelector<HTMLButtonElement>('#close-panel')!.addEventListener('click', () => this.closePanel());
    this.panelBackdrop.addEventListener('click', (event) => {
      if (event.target === this.panelBackdrop) this.closePanel();
    });
    document.querySelector<HTMLButtonElement>('#zoom-out')!.addEventListener('click', () => this.zoomOutHandler?.());
    document.querySelector<HTMLButtonElement>('#zoom-in')!.addEventListener('click', () => this.zoomInHandler?.());
    document.querySelector<HTMLButtonElement>('#overview-return')!.addEventListener('click', () => this.overviewReturnHandler?.());
    document.querySelectorAll<HTMLButtonElement>('[data-overview-zone]').forEach((button) => {
      button.addEventListener('click', () => this.overviewSelectHandler?.(button.dataset.overviewZone ?? ''));
    });
    this.interactButton.addEventListener('click', () => this.scene?.tryInteract());
  }

  bindScene(scene: GameScene): void {
    this.scene = scene;
  }

  bindZoomControls(zoomOut: () => void, zoomIn: () => void): void {
    this.zoomOutHandler = zoomOut;
    this.zoomInHandler = zoomIn;
  }

  bindOverviewControls(onReturn: () => void, onSelect: (key: string) => void): void {
    this.overviewReturnHandler = onReturn;
    this.overviewSelectHandler = onSelect;
  }

  setGameState(state: { coins: number; inventoryHasPot: boolean; task: TaskState }): void {
    this.coinCount.textContent = String(state.coins);
    this.hasPot = state.inventoryHasPot;
    this.activeTask = state.task;
    const labels: Record<TaskState, string> = {
      find: 'Find a loose empty pot',
      sell: 'Sell the pot at BUY / SELL',
      complete: 'Prototype task complete',
    };
    this.objectiveText.textContent = labels[state.task];
  }

  setAction(label: string | null): void {
    this.interactButton.hidden = label === null;
    if (label) this.interactLabel.textContent = label;
  }

  setZoomMode(mode: ZoomMode): void {
    this.zoomLabel.textContent = mode.toUpperCase();
  }

  setOverviewMode(active: boolean): void {
    this.overviewOverlay.hidden = !active;
    if (!active) this.setOverviewSelection(null);
  }

  setOverviewSelection(zone: Pick<FutureZone, 'label' | 'condition'> | null): void {
    this.overviewSelection.hidden = zone === null;
    document.querySelectorAll<HTMLButtonElement>('[data-overview-zone]').forEach((button) => {
      button.classList.toggle('is-selected', zone !== null && button.dataset.overviewZone === this.zoneKeyForLabel(zone.label));
    });
    if (!zone) return;
    this.overviewSelectionName.textContent = zone.label;
    this.overviewSelectionCondition.textContent = `Not accessible yet · ${zone.condition}`;
  }

  setMapPosition(ratio: number): void {
    const mapPlayer = document.querySelector<HTMLElement>('#map-player');
    if (mapPlayer) mapPlayer.style.left = `${Math.round(ratio * 100)}%`;
  }

  showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.toggle('is-visible', Boolean(message));
  }

  private zoneKeyForLabel(label: string): string {
    return label.toLowerCase().replace(/\s+/g, '-');
  }

  openPanel(kind: string): void {
    const content = this.panelContent(kind);
    this.panelTitle.textContent = content.title;
    this.panelBody.innerHTML = content.body;
    this.panelBackdrop.hidden = false;
    requestAnimationFrame(() => this.panelBackdrop.classList.add('is-open'));
    this.scene?.setModalOpen(true);
    this.panelBody.querySelector<HTMLButtonElement>('[data-restart]')?.addEventListener('click', () => {
      this.scene?.restartPrototype();
      this.closePanel();
    });
  }

  closePanel(): void {
    this.panelBackdrop.classList.remove('is-open');
    window.setTimeout(() => { this.panelBackdrop.hidden = true; }, 160);
    this.scene?.setModalOpen(false);
  }

  private panelContent(kind: string): { title: string; body: string } {
    if (kind === 'bag') {
      return {
        title: 'Bag',
        body: this.hasPot
          ? '<div class="inventory-item"><span class="inventory-art">▱</span><div><strong>Loose empty pot</strong><small>Ready to sell at BUY / SELL</small></div></div>'
          : '<div class="empty-state"><span class="empty-mark">—</span><strong>Inventory empty</strong><small>Collect the loose pot near BUY / SELL.</small></div>',
      };
    }
    if (kind === 'map') {
      return {
        title: 'Neighbourhood map',
        body: '<div class="mini-map"><span class="map-road road-one"></span><span class="map-road road-two"></span><span class="map-lot lot-one"></span><span class="map-lot lot-two"></span><span class="map-block block-one">BUY / SELL</span><span class="map-block block-two">HOMES</span><span class="map-block block-three">PLANTS</span><span class="map-block block-four">TO LET</span><span id="map-player" class="map-player"></span></div><p class="panel-note">Alex is shown on the starting block. Overview zoom reveals the reserved future neighbourhoods.</p>',
      };
    }
    if (kind === 'tasks') {
      const complete = this.activeTask === 'complete';
      return {
        title: 'Tasks',
        body: `<div class="task-card ${complete ? 'is-complete' : ''}"><span class="task-check">${complete ? '✓' : '○'}</span><div><strong>${complete ? 'Prototype task complete' : this.activeTask === 'sell' ? 'Sell the pot at BUY / SELL' : 'Find a loose empty pot'}</strong><small>${complete ? 'The pot was sold once for 5 coins.' : 'One small action for this prototype.'}</small></div></div>`,
      };
    }
    if (kind === 'home') {
      return {
        title: 'Home',
        body: '<div class="empty-state"><span class="home-outline">⌂</span><strong>Alex has not rented a home yet</strong><small>The nearby starter apartment is advertised TO LET at HOMES. Renting is outside this prototype.</small></div>',
      };
    }
    if (kind === 'settings') {
      return {
        title: 'Settings',
        body: '<div class="settings-list"><div><strong>Controls</strong><small>WASD / arrows to walk · tap or click pavement to walk · mouse wheel, −/+, comma, or period to zoom</small></div><div><strong>Display</strong><small>Black and white Atari prototype · crisp pixel edges · responsive viewport</small></div></div>',
      };
    }
    return {
      title: 'More',
      body: '<div class="settings-list"><div><strong>Prototype help</strong><small>Stay on the pavement and use the contextual action button when Alex is close enough.</small></div><div><strong>Future features</strong><small>Growing plants, renting, bills, and additional districts are intentionally not implemented.</small></div><button class="restart-button" type="button" data-restart>RESTART PROTOTYPE</button></div>',
    };
  }
}
