import type { GameScene } from '../game/GameScene';
import {
  CITY_DISTRICTS,
  CITY_MAP_SIZE,
  CITY_ROADS,
  FRONT_PAVEMENT_MIN_Y,
  OPPOSITE_PAVEMENT_MAX_Y,
  START_POSITION,
  STARTING_WALKABLE_MAX_X,
  STARTING_WALKABLE_MIN_X,
  WORLD_WIDTH,
  type ZoomMode,
} from '../game/world';

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
  private readonly mapCentreButton = document.querySelector<HTMLButtonElement>('#map-centre')!;
  private readonly rotateOverlay = document.querySelector<HTMLElement>('#rotate-overlay')!;
  private activeTask: TaskState = 'find';
  private activePanelKind: string | null = null;
  private shopTab: 'sell' | 'buy' = 'sell';
  private shopFeedback = '';
  private coins = 0;
  private hasPot = false;
  private mapPositionRatio = START_POSITION.x / WORLD_WIDTH;
  private mapPositionY = START_POSITION.y;
  private cityMapZoom = 0.72;
  private cityMapPanCleanup: (() => void) | null = null;

  constructor() {
    document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((button) => {
      this.bindButtonActivation(button, () => this.openPanel(button.dataset.panel ?? 'more'));
    });
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#settings-button')!, () => this.openPanel('settings'));
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#close-panel')!, () => this.closePanel());
    this.bindButtonActivation(this.mapCentreButton, () => this.centreCityMap());
    this.panelBackdrop.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target === this.panelBackdrop) this.closePanel();
    });
    this.bindButtonActivation(this.zoomOutButton, () => this.zoomOutHandler?.());
    this.bindButtonActivation(this.zoomInButton, () => this.zoomInHandler?.());
    this.bindButtonActivation(this.interactButton, () => this.scene?.tryInteract());
    window.addEventListener('resize', () => this.refreshCityMapLayout());
    window.visualViewport?.addEventListener('resize', () => this.refreshCityMapLayout());
  }

  bindScene(scene: GameScene): void {
    this.scene = scene;
  }

  setPhoneOrientationBlocked(blocked: boolean): void {
    this.rotateOverlay.hidden = !blocked;
  }

  bindZoomControls(zoomOut: () => void, zoomIn: () => void): void {
    this.zoomOutHandler = zoomOut;
    this.zoomInHandler = zoomIn;
  }

  setGameState(state: { coins: number; inventoryHasPot: boolean; task: TaskState }): void {
    this.coins = state.coins;
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

  highlightBag(): void {
    const bagButton = document.querySelector<HTMLButtonElement>('[data-panel="bag"]');
    if (!bagButton) return;
    bagButton.classList.add('is-highlighted');
    window.setTimeout(() => bagButton.classList.remove('is-highlighted'), 1200);
  }

  refreshShopPanel(feedback = ''): void {
    if (feedback) this.shopFeedback = feedback;
    if (this.activePanelKind !== 'shop') return;
    this.panelBody.innerHTML = this.shopPanelMarkup();
    this.bindShopPanel();
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

  setMapPosition(ratio: number, worldY = this.mapPositionY): void {
    this.mapPositionRatio = ratio;
    this.mapPositionY = worldY;
    const mapPlayer = document.querySelector<HTMLElement>('#map-player');
    if (!mapPlayer) return;
    const startingDistrict = CITY_DISTRICTS.find((district) => district.id === 'starting-neighbourhood');
    if (!startingDistrict) return;
    const streetX = ratio * WORLD_WIDTH;
    const progress = Math.max(0, Math.min(1,
      (streetX - STARTING_WALKABLE_MIN_X) / (STARTING_WALKABLE_MAX_X - STARTING_WALKABLE_MIN_X),
    ));
    mapPlayer.style.left = `${startingDistrict.x + progress * startingDistrict.width}px`;
    const verticalProgress = Math.max(0, Math.min(1,
      (worldY - FRONT_PAVEMENT_MIN_Y) / (OPPOSITE_PAVEMENT_MAX_Y - FRONT_PAVEMENT_MIN_Y),
    ));
    mapPlayer.style.top = `${startingDistrict.y + startingDistrict.height * (0.48 + verticalProgress * 0.34)}px`;
  }

  showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.toggle('is-visible', Boolean(message));
  }

  private bindButtonActivation(button: HTMLButtonElement, action: () => void): void {
    let lastActivationAt = 0;
    const activate = (event: MouseEvent): void => {
      const now = performance.now();
      if (now - lastActivationAt < 350) return;
      lastActivationAt = now;
      event.preventDefault();
      event.stopPropagation();
      action();
    };
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', activate);
  }

  openPanel(kind: string): void {
    this.cityMapPanCleanup?.();
    this.cityMapPanCleanup = null;
    const content = this.panelContent(kind);
    this.activePanelKind = kind;
    if (kind === 'shop') {
      this.shopTab = 'sell';
      this.shopFeedback = '';
    }
    this.panelTitle.textContent = content.title;
    this.panelBody.innerHTML = content.body;
    if (kind === 'map') {
      this.bindCityMapPan();
      this.setMapPosition(this.mapPositionRatio);
    }
    if (kind === 'shop') this.bindShopPanel();
    this.panelBackdrop.classList.toggle('is-city-map', kind === 'map');
    this.mapCentreButton.hidden = kind !== 'map';
    this.panelBackdrop.hidden = false;
    requestAnimationFrame(() => this.panelBackdrop.classList.add('is-open'));
    this.scene?.setModalOpen(true, kind === 'map');
    this.panelBody.querySelector<HTMLButtonElement>('[data-restart]')?.addEventListener('click', () => {
      this.scene?.restartPrototype();
      this.closePanel();
    });
  }

  closePanel(): void {
    this.cityMapPanCleanup?.();
    this.cityMapPanCleanup = null;
    this.panelBackdrop.classList.remove('is-city-map');
    this.mapCentreButton.hidden = true;
    this.activePanelKind = null;
    this.panelBackdrop.classList.remove('is-open');
    window.setTimeout(() => { this.panelBackdrop.hidden = true; }, 160);
    this.scene?.setModalOpen(false);
  }

  private bindCityMapPan(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const layer = frame.querySelector<HTMLElement>('.city-map-layer');
    if (!layer) return;
    this.renderCityMapZoom();

    const pointers = new Map<number, { x: number; y: number }>();
    let lastPoint: { x: number; y: number } | null = null;
    let pinchStartDistance = 0;
    let pinchStartZoom = this.cityMapZoom;
    let pinchWorldPoint = { x: 0, y: 0 };

    const midpoint = (): { x: number; y: number } => {
      const values = [...pointers.values()];
      return {
        x: (values[0].x + values[1].x) / 2,
        y: (values[0].y + values[1].y) / 2,
      };
    };
    const distance = (): number => {
      const values = [...pointers.values()];
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('button')) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      frame.setPointerCapture?.(event.pointerId);
      if (pointers.size === 1) {
        lastPoint = { x: event.clientX, y: event.clientY };
        frame.classList.add('is-panning');
      } else if (pointers.size === 2) {
        const centre = midpoint();
        const rect = frame.getBoundingClientRect();
        pinchStartDistance = Math.max(1, distance());
        pinchStartZoom = this.cityMapZoom;
        pinchWorldPoint = {
          x: (frame.scrollLeft + centre.x - rect.left) / this.cityMapZoom,
          y: (frame.scrollTop + centre.y - rect.top) / this.cityMapZoom,
        };
        lastPoint = null;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const centre = midpoint();
        const nextZoom = pinchStartZoom * (distance() / pinchStartDistance);
        this.setCityMapZoom(nextZoom, { clientX: centre.x, clientY: centre.y, worldPoint: pinchWorldPoint });
      } else if (lastPoint) {
        frame.scrollLeft -= event.clientX - lastPoint.x;
        frame.scrollTop -= event.clientY - lastPoint.y;
        lastPoint = { x: event.clientX, y: event.clientY };
        this.clampCityMapScroll(frame);
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const endPointer = (event: PointerEvent): void => {
      pointers.delete(event.pointerId);
      frame.releasePointerCapture?.(event.pointerId);
      if (pointers.size === 1) {
        const remaining = [...pointers.values()][0];
        lastPoint = { x: remaining.x, y: remaining.y };
      } else if (pointers.size === 0) {
        lastPoint = null;
        frame.classList.remove('is-panning');
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const onWheel = (event: WheelEvent): void => {
      const rect = frame.getBoundingClientRect();
      const anchor = {
        clientX: event.clientX,
        clientY: event.clientY,
        worldPoint: {
          x: (frame.scrollLeft + event.clientX - rect.left) / this.cityMapZoom,
          y: (frame.scrollTop + event.clientY - rect.top) / this.cityMapZoom,
        },
      };
      this.setCityMapZoom(this.cityMapZoom * (event.deltaY > 0 ? 0.9 : 1.1), anchor);
      event.preventDefault();
      event.stopPropagation();
    };
    const zoomOut = (): void => this.adjustCityMapZoom(0.9);
    const zoomIn = (): void => this.adjustCityMapZoom(1.1);
    const zoomOutButton = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="out"]');
    const zoomInButton = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="in"]');
    zoomOutButton?.addEventListener('click', zoomOut);
    zoomInButton?.addEventListener('click', zoomIn);
    frame.addEventListener('pointerdown', onPointerDown, { passive: false });
    frame.addEventListener('pointermove', onPointerMove, { passive: false });
    frame.addEventListener('pointerup', endPointer, { passive: false });
    frame.addEventListener('pointercancel', endPointer, { passive: false });
    frame.addEventListener('wheel', onWheel, { passive: false });

    this.cityMapPanCleanup = () => {
      zoomOutButton?.removeEventListener('click', zoomOut);
      zoomInButton?.removeEventListener('click', zoomIn);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', endPointer);
      frame.removeEventListener('pointercancel', endPointer);
      frame.removeEventListener('wheel', onWheel);
      frame.classList.remove('is-panning');
      pointers.clear();
    };

    requestAnimationFrame(() => this.centreCityDistrict());
  }

  private renderCityMapZoom(): void {
    const layer = this.panelBody.querySelector<HTMLElement>('.city-map-layer');
    const world = this.panelBody.querySelector<HTMLElement>('.city-map-world');
    if (!layer || !world) return;
    layer.style.width = `${CITY_MAP_SIZE.width * this.cityMapZoom}px`;
    layer.style.height = `${CITY_MAP_SIZE.height * this.cityMapZoom}px`;
    world.style.transform = `scale(${this.cityMapZoom})`;
  }

  private setCityMapZoom(
    zoom: number,
    anchor?: { clientX: number; clientY: number; worldPoint: { x: number; y: number } },
  ): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const oldZoom = this.cityMapZoom;
    const localX = anchor ? anchor.clientX - rect.left : frame.clientWidth / 2;
    const localY = anchor ? anchor.clientY - rect.top : frame.clientHeight / 2;
    const worldPoint = anchor?.worldPoint ?? {
      x: (frame.scrollLeft + localX) / oldZoom,
      y: (frame.scrollTop + localY) / oldZoom,
    };
    this.cityMapZoom = Math.max(0.26, Math.min(1.45, zoom));
    this.renderCityMapZoom();
    frame.scrollLeft = worldPoint.x * this.cityMapZoom - localX;
    frame.scrollTop = worldPoint.y * this.cityMapZoom - localY;
    this.clampCityMapScroll(frame);
    this.updateCityMapZoomButtons();
  }

  private adjustCityMapZoom(multiplier: number): void {
    this.setCityMapZoom(this.cityMapZoom * multiplier);
  }

  private clampCityMapScroll(frame: HTMLElement): void {
    frame.scrollLeft = Math.max(0, Math.min(frame.scrollWidth - frame.clientWidth, frame.scrollLeft));
    frame.scrollTop = Math.max(0, Math.min(frame.scrollHeight - frame.clientHeight, frame.scrollTop));
  }

  private updateCityMapZoomButtons(): void {
    const zoomOut = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="out"]');
    const zoomIn = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="in"]');
    if (zoomOut) zoomOut.disabled = this.cityMapZoom <= 0.26;
    if (zoomIn) zoomIn.disabled = this.cityMapZoom >= 1.45;
  }

  private refreshCityMapLayout(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    this.renderCityMapZoom();
    this.clampCityMapScroll(frame);
  }

  private centreCityMap(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const startingDistrict = CITY_DISTRICTS.find((district) => district.id === 'starting-neighbourhood');
    if (!startingDistrict) return;
    const streetX = this.mapPositionRatio * WORLD_WIDTH;
    const progress = Math.max(0, Math.min(1,
      (streetX - STARTING_WALKABLE_MIN_X) / (STARTING_WALKABLE_MAX_X - STARTING_WALKABLE_MIN_X),
    ));
    const mapX = startingDistrict.x + progress * startingDistrict.width;
    const verticalProgress = Math.max(0, Math.min(1,
      (this.mapPositionY - FRONT_PAVEMENT_MIN_Y) / (OPPOSITE_PAVEMENT_MAX_Y - FRONT_PAVEMENT_MIN_Y),
    ));
    const mapY = startingDistrict.y + startingDistrict.height * (0.48 + verticalProgress * 0.34);
    frame.scrollLeft = mapX * this.cityMapZoom - frame.clientWidth / 2;
    frame.scrollTop = mapY * this.cityMapZoom - frame.clientHeight / 2;
    this.clampCityMapScroll(frame);
  }

  private centreCityDistrict(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    const district = CITY_DISTRICTS.find((candidate) => candidate.id === 'starting-neighbourhood');
    if (!frame || !district) return;
    frame.scrollLeft = (district.x + district.width / 2) * this.cityMapZoom - frame.clientWidth / 2;
    frame.scrollTop = (district.y + district.height / 2) * this.cityMapZoom - frame.clientHeight / 2;
    this.clampCityMapScroll(frame);
    this.updateCityMapZoomButtons();
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
        body: this.cityMapMarkup(),
      };
    }
    if (kind === 'shop') {
      return {
        title: 'BUY / SELL',
        body: this.shopPanelMarkup(),
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

  private bindShopPanel(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-tab]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        this.shopTab = button.dataset.shopTab === 'buy' ? 'buy' : 'sell';
        this.refreshShopPanel();
      });
    });
    const sellButton = this.panelBody.querySelector<HTMLButtonElement>('[data-shop-sell]');
    if (sellButton) this.bindButtonActivation(sellButton, () => this.scene?.sellOpeningPot());
  }

  private shopPanelMarkup(): string {
    const sellContent = this.hasPot
      ? '<div class="shop-offer"><div class="inventory-art">▱</div><div class="shop-offer-copy"><strong>Loose empty pot</strong><small>Eligible item in Alex’s bag</small></div><strong class="shop-price">5 COINS</strong><button class="shop-sell-button" type="button" data-shop-sell>SELL FOR 5 COINS</button></div>'
      : '<div class="empty-state"><span class="empty-mark">—</span><strong>No eligible items</strong><small>Collect a loose pot before selling.</small></div>';
    const buyContent = '<div class="empty-state"><span class="empty-mark">—</span><strong>No stock available yet</strong><small>Buying is not available in this prototype.</small></div>';
    return `<div class="shop-balance"><span>COINS</span><strong>${this.coins}</strong></div><div class="shop-tabs" role="tablist"><button type="button" data-shop-tab="sell" class="${this.shopTab === 'sell' ? 'is-active' : ''}" role="tab" aria-selected="${this.shopTab === 'sell'}">SELL</button><button type="button" data-shop-tab="buy" class="${this.shopTab === 'buy' ? 'is-active' : ''}" role="tab" aria-selected="${this.shopTab === 'buy'}">BUY</button></div><div class="shop-panel-content">${this.shopTab === 'sell' ? sellContent : buyContent}</div><p class="shop-feedback" aria-live="polite">${this.escapeHtml(this.shopFeedback)}</p>`;
  }

  private cityMapMarkup(): string {
    const roadMarkup = CITY_ROADS.map((road) => {
      const angle = road.angle ? ` transform:rotate(${road.angle}deg);` : '';
      return `<span class="city-map-road" style="left:${road.x}px;top:${road.y}px;width:${road.width}px;height:${road.height}px;${angle}"></span>`;
    }).join('');
    const districtMarkup = CITY_DISTRICTS.map((district) => `<div class="city-map-district ${district.unlocked ? 'starting-district' : 'locked-district'}" data-district="${this.escapeHtml(district.id)}" style="left:${district.x}px;top:${district.y}px;width:${district.width}px;height:${district.height}px"><strong>${this.escapeHtml(district.label)}</strong><small>${district.unlocked ? 'YOU ARE HERE' : '▣ LOCKED'}</small></div>`).join('');
    const detailMarkup = [
      [285, 75, 150, 52, 'PARK'], [640, 68, 150, 42, 'VACANT BLOCK'], [300, 385, 180, 38, 'UNDEVELOPED'],
      [715, 385, 180, 38, 'CONSTRUCTION'], [1010, 365, 84, 32, 'PARK'], [80, 230, 120, 34, 'LOTS'],
    ].map(([x, y, width, height, label]) => `<span class="city-map-detail" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px">${label}</span>`).join('');
    return `<div class="city-map-stage"><div class="city-map-frame" role="application" aria-label="City map. Drag to pan, pinch or use the controls to zoom."><div class="city-map-layer"><div class="city-map-world" style="width:${CITY_MAP_SIZE.width}px;height:${CITY_MAP_SIZE.height}px">${roadMarkup}${detailMarkup}${districtMarkup}<span id="map-player" class="city-map-player" aria-label="Alex"></span><span class="city-map-north">N</span></div></div></div><div class="city-map-controls" aria-label="Map controls"><button type="button" data-map-zoom="out" aria-label="Map zoom out">−</button><button type="button" data-map-zoom="in" aria-label="Map zoom in">＋</button></div><div class="city-map-hint">DRAG TO PAN · PINCH OR WHEEL TO ZOOM</div></div>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character] ?? character));
  }
}
