import type { GameScene } from '../game/GameScene';
import type { AudioController } from '../game/AudioController';
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
import type { InventoryItem, PotCondition, TaskState, EquippedTool } from '../game/progress';

export class HudController {
  private scene: GameScene | null = null;
  private readonly audio: AudioController;
  private zoomOutHandler: (() => void) | null = null;
  private zoomInHandler: (() => void) | null = null;
  private readonly coinCount = document.querySelector<HTMLElement>('#coin-count')!;
  private readonly objectiveText = document.querySelector<HTMLElement>('#objective-text')!;
  private readonly zoomToggleButton = document.querySelector<HTMLButtonElement>('#zoom-toggle')!;
  private readonly zoomGlyph = document.querySelector<HTMLElement>('#zoom-glyph')!;
  private readonly zoomCaption = document.querySelector<HTMLElement>('#zoom-caption')!;
  private readonly interactButton = document.querySelector<HTMLButtonElement>('#interact-button')!;
  private readonly interactLabel = document.querySelector<HTMLElement>('#interact-label')!;
  private readonly toast = document.querySelector<HTMLElement>('#toast')!;
  private readonly panelBackdrop = document.querySelector<HTMLElement>('#panel-backdrop')!;
  private readonly panelTitle = document.querySelector<HTMLElement>('#panel-title')!;
  private readonly panelBody = document.querySelector<HTMLElement>('#panel-body')!;
  private readonly mapCentreButton = document.querySelector<HTMLButtonElement>('#map-centre')!;
  private readonly rotateOverlay = document.querySelector<HTMLElement>('#rotate-overlay')!;
  private readonly joystick = document.querySelector<HTMLElement>('#joystick')!;
  private readonly joystickKnob = document.querySelector<HTMLElement>('#joystick-knob')!;
  private readonly controlPanel = document.querySelector<HTMLElement>('#phone-control-panel')!;
  private readonly arcadeA = document.querySelector<HTMLButtonElement>('#arcade-a')!;
  private readonly arcadeB = document.querySelector<HTMLButtonElement>('#arcade-b')!;
  private readonly toolSelector = document.querySelector<HTMLButtonElement>('#tool-selector')!;
  private readonly toolSelectorIcon = document.querySelector<HTMLElement>('#tool-selector-icon')!;
  private readonly toolPopupBackdrop = document.querySelector<HTMLElement>('#tool-popup-backdrop')!;
  private readonly toolPopupClose = document.querySelector<HTMLButtonElement>('#tool-popup-close')!;
  private readonly toolSlots = document.querySelector<HTMLElement>('#tool-slots')!;
  private activeTask: TaskState = 'find';
  private activePanelKind: string | null = null;
  private shopTab: 'sell' | 'buy' = 'sell';
  private shopFeedback = '';
  private coins = 0;
  private hasPot = false;
  private inventoryItem: InventoryItem | null = null;
  private potCondition: PotCondition | null = null;
  private equippedTool: EquippedTool = null;
  private repairToolOwned = false;
  private cleanerOwned = false;
  private glueCharges = 0;
  private brokenPotPieceSelected = false;
  private mapPositionRatio = START_POSITION.x / WORLD_WIDTH;
  private mapPositionY = START_POSITION.y;
  private cityMapZoom = 0.72;
  private cityMapPanCleanup: (() => void) | null = null;
  private joystickPointerId: number | null = null;
  private phoneHybridLayout = false;
  private zoomMode: ZoomMode = 'normal';
  private toolPointerId: number | null = null;
  private joystickSide: 'left' | 'right' = this.loadJoystickSide();

  constructor(audio: AudioController) {
    this.audio = audio;
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
    this.bindButtonActivation(this.zoomToggleButton, () => this.toggleZoom());
    this.bindButtonActivation(this.toolSelector, () => this.toggleToolPopup());
    this.bindButtonActivation(this.toolPopupClose, () => this.closeToolPopup());
    this.toolPopupBackdrop.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target === this.toolPopupBackdrop) this.closeToolPopup();
    }, { passive: false });
    this.toolPopupBackdrop.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target === this.toolPopupBackdrop) this.closeToolPopup();
    });
    this.bindButtonActivation(this.interactButton, () => this.scene?.tryInteract());
    this.bindJoystickControls();
    this.bindArcadeControls();
    this.applyJoystickSide();
    window.addEventListener('resize', () => {
      this.refreshCityMapLayout();
      this.refreshPhoneLayout();
    });
    window.visualViewport?.addEventListener('resize', () => {
      this.refreshCityMapLayout();
      this.refreshPhoneLayout();
    });
    window.addEventListener('orientationchange', () => {
      this.resetHeldInputs();
      this.refreshPhoneLayout();
    });
    window.addEventListener('blur', () => this.resetHeldInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetHeldInputs();
    });
  }

  bindScene(scene: GameScene): void {
    this.scene = scene;
    this.refreshPhoneLayout();
  }

  setPhoneHybridLayout(enabled: boolean): void {
    if (this.phoneHybridLayout !== enabled) {
      this.phoneHybridLayout = enabled;
      document.documentElement.classList.toggle('phone-hybrid', enabled);
      if (!enabled) this.resetHeldInputs();
    }
    this.refreshPhoneLayout();
  }

  resetJoystick(): void {
    const pointerId = this.joystickPointerId;
    this.joystickPointerId = null;
    if (pointerId !== null) this.joystick.releasePointerCapture?.(pointerId);
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.scene?.setJoystickInput(0, 0, false);
  }

  resetHeldInputs(): void {
    this.resetJoystick();
    const pointerId = this.toolPointerId;
    this.toolPointerId = null;
    if (pointerId !== null) this.arcadeB.releasePointerCapture?.(pointerId);
    this.arcadeB.classList.remove('is-held');
    this.scene?.releaseTool();
  }

  setPhoneOrientationBlocked(blocked: boolean): void {
    this.rotateOverlay.hidden = !blocked;
  }

  bindZoomControls(zoomOut: () => void, zoomIn: () => void): void {
    this.zoomOutHandler = zoomOut;
    this.zoomInHandler = zoomIn;
  }

  setGameState(state: { coins: number; inventoryHasPot: boolean; inventoryPotCondition?: PotCondition | null; inventoryItem?: InventoryItem | null; task: TaskState; equippedTool?: EquippedTool; repairToolOwned?: boolean; cleanerOwned?: boolean; glueCharges?: number; brokenPotPieceSelected?: boolean }): void {
    this.coins = state.coins;
    this.coinCount.textContent = String(state.coins);
    this.hasPot = state.inventoryHasPot;
    this.potCondition = state.inventoryPotCondition ?? (state.inventoryHasPot ? 'ordinary' : null);
    this.inventoryItem = state.inventoryItem ?? (this.potCondition === 'ordinary' ? 'small-golden-pothos' : this.potCondition ? 'special-repair-pot' : null);
    this.brokenPotPieceSelected = state.brokenPotPieceSelected ?? false;
    this.setEquippedTool(state.equippedTool ?? null);
    this.repairToolOwned = state.repairToolOwned ?? this.repairToolOwned;
    this.cleanerOwned = state.cleanerOwned ?? this.cleanerOwned;
    this.glueCharges = state.glueCharges ?? this.glueCharges;
    this.activeTask = state.task;
    this.refreshToolPopup();
    const labels: Record<TaskState, string> = {
      find: 'Find a Small Golden Pothos',
      sell: 'Sell the Small Golden Pothos at BUY / SELL',
      clean: 'Clean the HOMES estate-agent window',
      repair: 'Repair the broken pot',
      'sell-repaired': 'Sell the repaired pot at BUY / SELL',
      complete: 'Prototype task complete',
    };
    this.objectiveText.textContent = labels[state.task];
  }

  setEquippedTool(tool: EquippedTool): void {
    this.equippedTool = tool;
    const label = tool === 'cleaner' ? 'CLEANER' : tool === 'repair' ? 'REPAIR TOOL' : 'NO TOOL EQUIPPED';
    this.toolSelectorIcon.textContent = tool === 'cleaner' ? '▱' : tool === 'repair' ? '⚒' : '—';
    this.toolSelector.classList.toggle('is-equipped', Boolean(tool));
    this.toolSelector.setAttribute('aria-label', tool ? `Open tool selector. Equipped ${label.toLowerCase()}` : 'Open tool selector. No tool equipped');
    this.arcadeB.disabled = !tool && !this.brokenPotPieceSelected;
    this.arcadeB.setAttribute('aria-label', this.brokenPotPieceSelected ? 'Pick up selected broken pot piece' : tool ? `Use ${label.toLowerCase()}` : 'No tool equipped');
    this.refreshToolPopup();
  }

  setJoystickSide(side: 'left' | 'right'): void {
    this.joystickSide = side;
    this.applyJoystickSide();
    this.resetHeldInputs();
    try { localStorage.setItem('indoor-jungle-controls', JSON.stringify({ joystickSide: side })); } catch { /* storage can be unavailable */ }
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-joystick-side]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.joystickSide === side);
    });
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
    this.zoomMode = mode;
    const zoomingIn = mode === 'normal';
    const glyph = zoomingIn ? '＋' : '−';
    const caption = zoomingIn ? 'IN' : 'OUT';
    const label = zoomingIn ? 'Zoom in (period key)' : 'Zoom out (comma key)';
    this.zoomGlyph.textContent = glyph;
    this.zoomCaption.textContent = caption;
    this.zoomToggleButton.setAttribute('aria-label', label);
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
      this.audio.unlock();
      action();
    };
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', activate);
  }

  private toggleZoom(): void {
    if (this.zoomMode === 'normal') this.zoomInHandler?.();
    else this.zoomOutHandler?.();
  }

  private toggleToolPopup(): void {
    if (this.toolPopupBackdrop.hidden) this.openToolPopup();
    else this.closeToolPopup();
  }

  private openToolPopup(): void {
    this.resetHeldInputs();
    this.refreshToolPopup();
    this.toolPopupBackdrop.hidden = false;
    this.toolPopupBackdrop.classList.add('is-open');
    this.toolSelector.setAttribute('aria-expanded', 'true');
    this.scene?.setModalOpen(true, true);
  }

  private closeToolPopup(): void {
    if (this.toolPopupBackdrop.hidden) return;
    this.toolPopupBackdrop.classList.remove('is-open');
    this.toolPopupBackdrop.hidden = true;
    this.toolSelector.setAttribute('aria-expanded', 'false');
    this.scene?.setModalOpen(false, true);
  }

  private refreshToolPopup(): void {
    if (!this.toolSlots) return;
    const slots: Array<{ key: 'cleaner' | 'repair' | null; label: string; icon: string; owned: boolean }> = [
      { key: 'cleaner', label: 'CLEANER', icon: '▱', owned: this.cleanerOwned },
      { key: 'repair', label: 'REPAIR TOOL', icon: '⚒', owned: this.repairToolOwned },
      { key: null, label: 'EMPTY', icon: '—', owned: false },
    ];
    this.toolSlots.innerHTML = slots.map((slot) => {
      const active = slot.key !== null && slot.key === this.equippedTool;
      const disabled = slot.owned ? '' : ' disabled';
      const classes = `tool-slot${slot.owned ? ' is-owned' : ''}${active ? ' is-active' : ''}`;
      const key = slot.key ? ` data-tool="${slot.key}"` : '';
      return `<button class="${classes}" type="button"${key}${disabled} aria-label="${slot.owned ? `Equip ${slot.label.toLowerCase()}` : 'Empty tool slot'}"><strong>${slot.icon}</strong><span>${active ? 'ACTIVE' : slot.label}</span></button>`;
    }).join('');
    this.toolSlots.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const tool = button.dataset.tool;
        if (tool !== 'cleaner' && tool !== 'repair') return;
        this.scene?.equipTool(tool);
        this.closeToolPopup();
      });
    });
  }

  private loadJoystickSide(): 'left' | 'right' {
    try {
      const raw = localStorage.getItem('indoor-jungle-controls');
      const value = raw ? JSON.parse(raw) as { joystickSide?: string } : {};
      return value.joystickSide === 'right' ? 'right' : 'left';
    } catch {
      return 'left';
    }
  }

  private applyJoystickSide(): void {
    this.controlPanel.classList.toggle('is-joystick-right', this.joystickSide === 'right');
    requestAnimationFrame(() => this.alignJoystickToMapTab());
  }

  private bindArcadeControls(): void {
    let aPointerId: number | null = null;
    const pressA = (event: PointerEvent): void => {
      if (aPointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      aPointerId = event.pointerId;
      this.arcadeA.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
      this.scene?.pressHop();
    };
    const releaseA = (event: PointerEvent): void => {
      if (aPointerId !== event.pointerId) return;
      aPointerId = null;
      this.arcadeA.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };
    this.arcadeA.addEventListener('pointerdown', pressA, { passive: false });
    this.arcadeA.addEventListener('pointerup', releaseA, { passive: false });
    this.arcadeA.addEventListener('pointercancel', releaseA, { passive: false });
    this.arcadeA.addEventListener('lostpointercapture', releaseA, { passive: false });

    const pressB = (event: PointerEvent): void => {
      if (this.toolPointerId !== null || this.arcadeB.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      this.toolPointerId = event.pointerId;
      this.arcadeB.setPointerCapture?.(event.pointerId);
      this.arcadeB.classList.add('is-held');
      event.preventDefault();
      event.stopPropagation();
      this.scene?.pressTool();
    };
    const releaseB = (event: PointerEvent): void => {
      if (this.toolPointerId !== event.pointerId) return;
      this.toolPointerId = null;
      this.arcadeB.releasePointerCapture?.(event.pointerId);
      this.arcadeB.classList.remove('is-held');
      event.preventDefault();
      event.stopPropagation();
      this.scene?.releaseTool();
    };
    this.arcadeB.addEventListener('pointerdown', pressB, { passive: false });
    this.arcadeB.addEventListener('pointerup', releaseB, { passive: false });
    this.arcadeB.addEventListener('pointercancel', releaseB, { passive: false });
    this.arcadeB.addEventListener('lostpointercapture', releaseB, { passive: false });
  }

  private bindJoystickControls(): void {
    const updateJoystick = (event: PointerEvent): void => {
      if (this.joystickPointerId !== event.pointerId) return;
      const rect = this.joystick.getBoundingClientRect();
      const centreX = rect.left + rect.width / 2;
      const centreY = rect.top + rect.height / 2;
      const dx = event.clientX - centreX;
      const dy = event.clientY - centreY;
      const distance = Math.hypot(dx, dy);
      const radius = Math.max(1, rect.width / 2 - 17);
      const deadZone = radius * 0.2;
      const active = distance > deadZone;
      const visualDistance = Math.min(distance, radius);
      const visualX = active ? dx / distance * visualDistance : 0;
      const visualY = active ? dy / distance * visualDistance : 0;
      this.joystickKnob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
      this.scene?.setJoystickInput(active ? dx / distance : 0, active ? dy / distance : 0, true);
      event.preventDefault();
      event.stopPropagation();
    };
    const endJoystick = (event: PointerEvent): void => {
      if (this.joystickPointerId !== event.pointerId) return;
      this.resetJoystick();
      event.preventDefault();
      event.stopPropagation();
    };

    this.joystick.addEventListener('pointerdown', (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0) return;
      if (this.joystickPointerId !== null) {
        pointerEvent.preventDefault();
        pointerEvent.stopPropagation();
        return;
      }
      this.joystickPointerId = pointerEvent.pointerId;
      this.audio.unlock();
      this.joystick.setPointerCapture?.(pointerEvent.pointerId);
      updateJoystick(pointerEvent);
    }, { passive: false });
    this.joystick.addEventListener('pointermove', (event) => updateJoystick(event as PointerEvent), { passive: false });
    this.joystick.addEventListener('pointerup', (event) => endJoystick(event as PointerEvent), { passive: false });
    this.joystick.addEventListener('pointercancel', (event) => endJoystick(event as PointerEvent), { passive: false });
    this.joystick.addEventListener('lostpointercapture', (event) => endJoystick(event as PointerEvent), { passive: false });
  }

  private refreshPhoneLayout(): void {
    const shell = document.querySelector<HTMLElement>('#app-shell');
    const stage = document.querySelector<HTMLElement>('#game-stage');
    if (!shell || !stage) return;
    if (!this.phoneHybridLayout) {
      stage.style.removeProperty('width');
      stage.style.removeProperty('height');
      this.controlPanel.style.removeProperty('--joystick-align-shift');
      requestAnimationFrame(() => this.scene?.resizeViewportToStage());
      return;
    }

    const topHud = document.querySelector<HTMLElement>('.hud-top');
    const controlPanel = document.querySelector<HTMLElement>('#phone-control-panel');
    const bottomHud = document.querySelector<HTMLElement>('.hud-bottom');
    const viewportHeight = Math.min(
      shell.getBoundingClientRect().height,
      window.visualViewport?.height ?? window.innerHeight,
    );
    const reservedHeight = (topHud?.getBoundingClientRect().height ?? 0)
      + (controlPanel?.getBoundingClientRect().height ?? 0)
      + (bottomHud?.getBoundingClientRect().height ?? 0);
    const availableHeight = Math.max(1, viewportHeight - reservedHeight);
    const size = Math.max(1, Math.min(shell.getBoundingClientRect().width, availableHeight));
    stage.style.width = `${Math.round(size)}px`;
    stage.style.height = `${Math.round(size)}px`;
    requestAnimationFrame(() => {
      this.scene?.resizeViewportToStage();
      this.alignJoystickToMapTab();
    });
  }

  private alignJoystickToMapTab(): void {
    if (!this.phoneHybridLayout || this.joystickSide !== 'left') {
      this.controlPanel.style.removeProperty('--joystick-align-shift');
      return;
    }
    const mapButton = document.querySelector<HTMLElement>('.nav-button[data-panel="map"]');
    const console = this.controlPanel.querySelector<HTMLElement>('.control-console');
    if (!mapButton || !console) return;
    const panelRect = this.controlPanel.getBoundingClientRect();
    const joystickRect = this.joystick.getBoundingClientRect();
    const mapRect = mapButton.getBoundingClientRect();
    const consoleRect = console.getBoundingClientRect();
    const halfJoystick = joystickRect.width / 2;
    const desiredCenter = mapRect.left + mapRect.width / 2;
    const minimumCenter = panelRect.left + halfJoystick + 8;
    const maximumCenter = consoleRect.left - halfJoystick - 10;
    const safeCenter = maximumCenter >= minimumCenter
      ? Math.max(minimumCenter, Math.min(maximumCenter, desiredCenter))
      : joystickRect.left + halfJoystick;
    this.controlPanel.style.setProperty('--joystick-align-shift', `${safeCenter - (joystickRect.left + halfJoystick)}px`);
  }

  openPanel(kind: string): void {
    this.closeToolPopup();
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
    if (kind === 'settings') this.bindSettingsPanel();
    if (kind === 'bag') {
      const repairButton = this.panelBody.querySelector<HTMLButtonElement>('[data-repair-pot]');
      if (repairButton) this.bindButtonActivation(repairButton, () => {
        this.closePanel();
        this.scene?.beginPortableRepair();
      });
      this.panelBody.querySelectorAll<HTMLButtonElement>('[data-equip-tool]').forEach((button) => {
        this.bindButtonActivation(button, () => this.scene?.equipTool(button.dataset.equipTool === 'repair' ? 'repair' : 'cleaner'));
      });
    }
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
      const potLabel = this.potCondition === 'broken' ? 'Broken special collectible pot' : this.potCondition === 'repaired' ? 'Repaired special collectible pot' : 'Small Golden Pothos';
      const potNote = this.potCondition === 'broken'
        ? 'Collect the pieces, then repair this special empty pot.'
        : this.potCondition === 'repaired'
          ? 'Empty and ready to sell at BUY / SELL for 10 coins.'
          : 'Opening delivery. Sell it at BUY / SELL for 5 coins.';
      const repairButton = this.potCondition === 'broken'
        ? '<div class="inventory-actions"><button class="inventory-action" type="button" data-repair-pot>REPAIR</button></div>'
        : '';
      const toolNote = [
        this.cleanerOwned ? `<div class="inventory-item"><span class="inventory-art">▱</span><div><strong>Borrowed cleaner</strong><small>${this.equippedTool === 'cleaner' ? 'Equipped for B / USE.' : 'Hold B near the HOMES estate-agent window.'}</small></div><div class="inventory-actions"><button class="inventory-action" type="button" data-equip-tool="cleaner">${this.equippedTool === 'cleaner' ? 'EQUIPPED' : 'EQUIP'}</button></div></div>` : '',
        this.repairToolOwned ? `<div class="inventory-item"><span class="inventory-art">⚒</span><div><strong>Repair tool</strong><small>${this.glueCharges} glue charge${this.glueCharges === 1 ? '' : 's'} remaining. Tap B 10 times beside a broken pot.</small></div><div class="inventory-actions"><button class="inventory-action" type="button" data-equip-tool="repair">${this.equippedTool === 'repair' ? 'EQUIPPED' : 'EQUIP'}</button></div></div>` : '',
      ].join('');
      return {
        title: 'Bag',
        body: `${this.hasPot ? `<div class="inventory-item"><span class="inventory-art">${this.potCondition === 'broken' ? '◈' : '▱'}</span><div><strong>${potLabel}</strong><small>${potNote}</small></div>${repairButton}</div>` : '<div class="empty-state"><span class="empty-mark">—</span><strong>Inventory empty</strong><small>Find the Small Golden Pothos near BUY / SELL.</small></div>'}${toolNote}`,
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
      const taskLabel: Record<TaskState, string> = {
        find: 'Find a Small Golden Pothos', sell: 'Sell the Small Golden Pothos at BUY / SELL', clean: 'Clean the HOMES estate-agent window',
        repair: 'Repair the broken pot', 'sell-repaired': 'Sell the repaired pot at BUY / SELL', complete: 'Prototype jobs complete',
      };
      return {
        title: 'Tasks',
        body: `<div class="task-card ${complete ? 'is-complete' : ''}"><span class="task-check">${complete ? '✓' : '○'}</span><div><strong>${taskLabel[this.activeTask]}</strong><small>${complete ? 'The opening jobs are complete.' : 'The next objective updates as Alex works.'}</small></div></div>`,
      };
    }
    if (kind === 'home') {
      return {
        title: 'Home',
        body: '<div class="empty-state"><span class="home-outline">⌂</span><strong>Alex has not rented a home yet</strong><small>The nearby starter apartment is advertised TO LET at HOMES. Renting is outside this prototype.</small></div>',
      };
    }
    if (kind === 'settings') {
      const musicOn = this.audio.musicEnabled;
      const sfxOn = this.audio.sfxEnabled;
      return {
        title: 'Settings',
        body: `<div class="settings-list"><div class="settings-choice"><strong>Joystick position</strong><small>Choose which side holds the joystick. Switching sides clears held input.</small><div class="settings-choice-row"><button type="button" data-joystick-side="left" class="${this.joystickSide === 'left' ? 'is-selected' : ''}">LEFT</button><button type="button" data-joystick-side="right" class="${this.joystickSide === 'right' ? 'is-selected' : ''}">RIGHT</button></div></div><div class="settings-choice"><strong>Music</strong><small>Toggle the looping arcade soundtrack.</small><div class="settings-choice-row"><button type="button" data-audio="music-on" class="${musicOn ? 'is-selected' : ''}">ON</button><button type="button" data-audio="music-off" class="${!musicOn ? 'is-selected' : ''}">OFF</button></div></div><div class="settings-choice"><strong>Sound effects</strong><small>Toggle jump and tool-use sounds.</small><div class="settings-choice-row"><button type="button" data-audio="sfx-on" class="${sfxOn ? 'is-selected' : ''}">ON</button><button type="button" data-audio="sfx-off" class="${!sfxOn ? 'is-selected' : ''}">OFF</button></div></div><div><strong>Controls</strong><small>WASD / arrows to walk · A / Space to hop · B / Q to use the equipped tool · tap or click pavement to walk · mouse wheel, −/+, comma, or period to zoom</small></div><div><strong>Display</strong><small>Black and white Atari prototype · crisp pixel edges · responsive viewport</small></div></div>`,
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
    if (sellButton) this.bindButtonActivation(sellButton, () => {
      if (sellButton.dataset.shopSell === 'repaired') this.scene?.sellRepairedPot();
      else this.scene?.sellOpeningPot();
    });
    const acceptJob = this.panelBody.querySelector<HTMLButtonElement>('[data-accept-window-job]');
    if (acceptJob) this.bindButtonActivation(acceptJob, () => this.scene?.acceptWindowJob());
  }

  private bindSettingsPanel(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-joystick-side]').forEach((button) => {
      this.bindButtonActivation(button, () => this.setJoystickSide(button.dataset.joystickSide === 'right' ? 'right' : 'left'));
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-audio]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const setting = button.dataset.audio;
        if (setting === 'music-on' || setting === 'music-off') this.audio.setMusicEnabled(setting === 'music-on');
        if (setting === 'sfx-on' || setting === 'sfx-off') this.audio.setSfxEnabled(setting === 'sfx-on');
        this.refreshAudioSettingsButtons();
      });
    });
  }

  private refreshAudioSettingsButtons(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-audio]').forEach((button) => {
      const setting = button.dataset.audio;
      const selected = setting === 'music-on' ? this.audio.musicEnabled
        : setting === 'music-off' ? !this.audio.musicEnabled
          : setting === 'sfx-on' ? this.audio.sfxEnabled
            : !this.audio.sfxEnabled;
      button.classList.toggle('is-selected', selected);
    });
  }

  private shopPanelMarkup(): string {
    const shop = this.scene?.getShopPanelState() ?? { inventoryPot: this.potCondition, inventoryItem: this.inventoryItem, saleComplete: false, windowJobAccepted: false, windowJobComplete: false };
    const sellContent = shop.inventoryPot === 'ordinary'
      ? '<div class="shop-offer"><div class="inventory-art">▱</div><div class="shop-offer-copy"><strong>Small Golden Pothos</strong><small>Opening delivery in Alex’s bag</small></div><strong class="shop-price">5 COINS</strong><button class="shop-sell-button" type="button" data-shop-sell="ordinary">SELL FOR 5 COINS</button></div>'
      : shop.inventoryPot === 'repaired'
        ? '<div class="shop-offer"><div class="inventory-art">◈</div><div class="shop-offer-copy"><strong>Repaired collectible pot</strong><small>Eligible item in Alex’s bag</small></div><strong class="shop-price">10 COINS</strong><button class="shop-sell-button" type="button" data-shop-sell="repaired">SELL FOR 10 COINS</button></div>'
        : '<div class="empty-state"><span class="empty-mark">—</span><strong>No eligible items</strong><small>Collect or repair a pot before selling.</small></div>';
    const buyContent = '<div class="empty-state"><span class="empty-mark">—</span><strong>No stock available yet</strong><small>Shop displays are previews only; buying is not available.</small></div>';
    const openingPotCollected = shop.inventoryPot === 'ordinary' || shop.saleComplete;
    const jobContent = openingPotCollected && !shop.windowJobAccepted && !shop.windowJobComplete
      ? '<div class="job-card"><strong>OPENING JOB: CLEAN THE HOMES WINDOW</strong><small>Borrow a cleaning bottle, tap the HOMES estate-agent display, then tap B eight times.</small><button class="shop-sell-button" type="button" data-accept-window-job>ACCEPT JOB</button></div>' : '';
    const activeJob = shop.windowJobAccepted ? '<div class="job-card"><strong>HOMES WINDOW JOB ACTIVE</strong><small>Tap the estate-agent display, then tap B eight times. Each spray is counted.</small></div>' : shop.windowJobComplete ? '<div class="job-card"><strong>WINDOW JOB COMPLETE</strong><small>Return to the street to find the broken collectible pot.</small></div>' : '';
    return `<div class="shop-balance"><span>COINS</span><strong>${this.coins}</strong></div><div class="shop-tabs" role="tablist"><button type="button" data-shop-tab="sell" class="${this.shopTab === 'sell' ? 'is-active' : ''}" role="tab" aria-selected="${this.shopTab === 'sell'}">SELL</button><button type="button" data-shop-tab="buy" class="${this.shopTab === 'buy' ? 'is-active' : ''}" role="tab" aria-selected="${this.shopTab === 'buy'}">BUY</button></div><div class="shop-panel-content">${this.shopTab === 'sell' ? sellContent : buyContent}${jobContent}${activeJob}</div><p class="shop-feedback" aria-live="polite">${this.escapeHtml(this.shopFeedback)}</p>`;
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
