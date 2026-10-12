import type { GameScene } from '../game/GameScene';
import type { ZoomMode } from '../game/world';

type TaskState = 'find' | 'sell' | 'complete';

export class HudController {
  private scene: GameScene | null = null;
  private zoomOutHandler: (() => void) | null = null;
  private zoomInHandler: (() => void) | null = null;
  private readonly coinCount = document.querySelector<HTMLElement>('#coin-count')!;
  private readonly objectiveText = document.querySelector<HTMLElement>('#objective-text')!;
  private readonly zoomLabel = document.querySelector<HTMLElement>('#zoom-label')!;
  private readonly zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!;
  private readonly zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!;
  private readonly interactButton = document.querySelector<HTMLButtonElement>('#interact-button')!;
  private readonly interactLabel = document.querySelector<HTMLElement>('#interact-label')!;
  private readonly toast = document.querySelector<HTMLElement>('#toast')!;
  private readonly panelBackdrop = document.querySelector<HTMLElement>('#panel-backdrop')!;
  private readonly panelTitle = document.querySelector<HTMLElement>('#panel-title')!;
  private readonly panelBody = document.querySelector<HTMLElement>('#panel-body')!;
  private activeTask: TaskState = 'find';
  private hasPot = false;
  private mapPositionRatio = 0.15;
  private cityMapPanCleanup: (() => void) | null = null;

  constructor() {
    document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((button) => {
      this.bindButtonActivation(button, () => this.openPanel(button.dataset.panel ?? 'more'));
    });
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#settings-button')!, () => this.openPanel('settings'));
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#close-panel')!, () => this.closePanel());
    this.panelBackdrop.addEventListener('click', (event) => {
      if (event.target === this.panelBackdrop) this.closePanel();
    });
    this.bindButtonActivation(this.zoomOutButton, () => this.zoomOutHandler?.());
    this.bindButtonActivation(this.zoomInButton, () => this.zoomInHandler?.());
    this.bindButtonActivation(this.interactButton, () => this.scene?.tryInteract());
  }

  bindScene(scene: GameScene): void {
    this.scene = scene;
  }

  setPhoneOrientationBlocked(_blocked: boolean): void {
    // The current shell has no separate orientation control to toggle.
  }

  bindZoomControls(zoomOut: () => void, zoomIn: () => void): void {
    this.zoomOutHandler = zoomOut;
    this.zoomInHandler = zoomIn;
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
    const atMinimum = mode === 'normal';
    const atMaximum = mode === 'close';
    this.zoomOutButton.disabled = atMinimum;
    this.zoomInButton.disabled = atMaximum;
    this.zoomOutButton.setAttribute('aria-disabled', String(atMinimum));
    this.zoomInButton.setAttribute('aria-disabled', String(atMaximum));
  }

  setMapPosition(ratio: number): void {
    this.mapPositionRatio = ratio;
    const mapPlayer = document.querySelector<HTMLElement>('#map-player');
    if (mapPlayer) mapPlayer.style.left = `${Math.round(ratio * 100)}%`;
  }

  showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.toggle('is-visible', Boolean(message));
  }

  private bindButtonActivation(button: HTMLButtonElement, action: () => void): void {
    let lastActivationAt = 0;
    const activate = (event: Event): void => {
      const now = performance.now();
      if (now - lastActivationAt < 350) return;
      lastActivationAt = now;
      event.preventDefault();
      event.stopPropagation();
      action();
    };
    button.addEventListener('pointerdown', activate, { passive: false });
    button.addEventListener('mousedown', activate);
    button.addEventListener('touchstart', activate, { passive: false });
    button.addEventListener('click', activate);
  }

  openPanel(kind: string): void {
    this.cityMapPanCleanup?.();
    this.cityMapPanCleanup = null;
    const content = this.panelContent(kind);
    this.panelTitle.textContent = content.title;
    this.panelBody.innerHTML = content.body;
    if (kind === 'map') {
      this.bindCityMapPan();
      this.setMapPosition(this.mapPositionRatio);
    }
    this.panelBackdrop.hidden = false;
    requestAnimationFrame(() => this.panelBackdrop.classList.add('is-open'));
    this.scene?.setModalOpen(true);
    this.panelBody.querySelector<HTMLButtonElement>('[data-restart]')?.addEventListener('click', () => {
      this.scene?.restartPrototype();
      this.closePanel();
    });
  }

  closePanel(): void {
    this.cityMapPanCleanup?.();
    this.cityMapPanCleanup = null;
    this.panelBackdrop.classList.remove('is-open');
    window.setTimeout(() => { this.panelBackdrop.hidden = true; }, 160);
    this.scene?.setModalOpen(false);
  }

  private bindCityMapPan(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const surface = frame.querySelector<HTMLElement>('.city-map-surface');
    if (!surface) return;

    let activePointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = frame.scrollLeft;
      startScrollTop = frame.scrollTop;
      frame.classList.add('is-panning');
      frame.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== activePointerId) return;
      frame.scrollLeft = startScrollLeft - (event.clientX - startX);
      frame.scrollTop = startScrollTop - (event.clientY - startY);
      event.preventDefault();
    };
    const endPointer = (event: PointerEvent): void => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = null;
      frame.classList.remove('is-panning');
      frame.releasePointerCapture?.(event.pointerId);
    };

    frame.addEventListener('pointerdown', onPointerDown, { passive: false });
    frame.addEventListener('pointermove', onPointerMove, { passive: false });
    frame.addEventListener('pointerup', endPointer);
    frame.addEventListener('pointercancel', endPointer);

    this.cityMapPanCleanup = () => {
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', endPointer);
      frame.removeEventListener('pointercancel', endPointer);
      frame.classList.remove('is-panning');
    };

    requestAnimationFrame(() => {
      frame.scrollLeft = Math.max(0, 440 - frame.clientWidth / 2);
      frame.scrollTop = Math.max(0, 300 - frame.clientHeight / 2);
    });
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
        title: 'City map',
        body: '<div class="city-map-frame" role="img" aria-label="City map. Drag to pan."><div class="city-map-surface"><span class="city-map-road city-road-main"></span><span class="city-map-road city-road-cross"></span><span class="city-map-road city-road-west"></span><span class="city-map-road city-road-east"></span><span class="city-map-district starting-district"><strong>STARTING<br>NEIGHBOURHOOD</strong><small>YOU ARE HERE</small></span><span class="city-map-district locked-district willow-district"><strong>WILLOW RESERVE</strong><small>▣ LOCKED</small></span><span class="city-map-district locked-district east-district"><strong>EAST GARDENS</strong><small>▣ LOCKED</small></span><span class="city-map-district locked-district north-district"><strong>NORTH WORKS</strong><small>▣ LOCKED</small></span><span class="city-map-district locked-district south-district"><strong>SOUTH PLOTS</strong><small>▣ LOCKED</small></span><span id="map-player" class="city-map-player" aria-label="Alex"></span><span class="city-map-north">N</span></div></div><p class="panel-note">Drag to inspect the connected city. Alex is marked inside the starting neighbourhood; locked districts are not playable yet.</p>',
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
