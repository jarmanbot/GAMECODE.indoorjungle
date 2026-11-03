export interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class DevAccessGate {
  constructor(private readonly requested: boolean, private readonly accessCode: string, private readonly storage: SessionStore | null, private readonly key = 'indoor-jungle-dev-tools-unlocked') {}

  get enabled(): boolean { return this.requested && this.accessCode.length > 0; }

  isUnlocked(): boolean {
    if (!this.enabled || !this.storage) return false;
    try { return this.storage.getItem(this.key) === '1'; } catch { return false; }
  }

  unlock(candidate: string): boolean {
    if (!this.enabled || !this.storage || candidate !== this.accessCode) return false;
    try { this.storage.setItem(this.key, '1'); } catch { return false; }
    return true;
  }

  lock(): void {
    try { this.storage?.removeItem(this.key); } catch { /* storage failure remains fail-closed */ }
  }
}

export class DevUnlockTapTracker {
  private count = 0;
  private startedAt = 0;
  constructor(private readonly requiredTaps = 7, private readonly intervalMs = 10_000) {}

  tap(now: number): boolean {
    if (!this.startedAt || now - this.startedAt > this.intervalMs) {
      this.startedAt = now;
      this.count = 0;
    }
    this.count += 1;
    if (this.count < this.requiredTaps) return false;
    this.reset();
    return true;
  }

  reset(): void { this.count = 0; this.startedAt = 0; }
}
