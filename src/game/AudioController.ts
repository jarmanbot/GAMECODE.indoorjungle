const AUDIO_SETTINGS_KEY = 'indoor-jungle-audio';

interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

type BrowserWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioController {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicNextTime = 0;
  private musicStep = 0;
  private settings: AudioSettings = this.loadSettings();

  get musicEnabled(): boolean {
    return this.settings.musicEnabled;
  }

  get sfxEnabled(): boolean {
    return this.settings.sfxEnabled;
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;
    void context.resume().then(() => {
      if (this.settings.musicEnabled) this.startMusic();
    });
  }

  setMusicEnabled(enabled: boolean): void {
    this.settings.musicEnabled = enabled;
    this.saveSettings();
    if (enabled) {
      this.unlock();
      return;
    }
    this.stopMusic();
  }

  setSfxEnabled(enabled: boolean): void {
    this.settings.sfxEnabled = enabled;
    this.saveSettings();
  }

  playJump(): void {
    if (!this.settings.sfxEnabled) return;
    const context = this.prepareSound();
    if (!context || !this.sfxGain) return;
    const start = context.currentTime;
    this.scheduleTone(523.25, start, 0.08, 0.08, 'square', this.sfxGain);
    this.scheduleTone(783.99, start + 0.055, 0.13, 0.06, 'square', this.sfxGain);
  }

  playToolUse(): void {
    if (!this.settings.sfxEnabled) return;
    const context = this.prepareSound();
    if (!context || !this.sfxGain) return;
    const start = context.currentTime;
    this.scheduleTone(196, start, 0.055, 0.08, 'square', this.sfxGain);
    this.scheduleTone(293.66, start + 0.045, 0.09, 0.06, 'square', this.sfxGain);
  }

  private prepareSound(): AudioContext | null {
    const context = this.ensureContext();
    if (!context) return null;
    void context.resume();
    return context;
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    this.context = new AudioContextConstructor();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain.gain.value = 0.16;
    this.sfxGain.gain.value = 0.22;
    this.musicGain.connect(this.context.destination);
    this.sfxGain.connect(this.context.destination);
    return this.context;
  }

  private startMusic(): void {
    const context = this.ensureContext();
    if (!context || !this.musicGain || this.musicTimer !== null) return;
    this.musicGain.gain.setTargetAtTime(0.16, context.currentTime, 0.025);
    this.musicNextTime = Math.max(context.currentTime + 0.04, this.musicNextTime);
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 120);
    this.scheduleMusic();
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.context && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
    }
  }

  private scheduleMusic(): void {
    const context = this.context;
    if (!context || !this.musicGain || !this.settings.musicEnabled) return;
    const melody = [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65, 60, 64, 67, 71];
    const now = context.currentTime;
    if (this.musicNextTime < now) this.musicNextTime = now + 0.04;
    while (this.musicNextTime < now + 0.4) {
      const note = melody[this.musicStep % melody.length];
      this.scheduleTone(this.midiToFrequency(note), this.musicNextTime, 0.24, 0.035, 'square', this.musicGain);
      if (this.musicStep % 4 === 0) {
        this.scheduleTone(this.midiToFrequency(note - 24), this.musicNextTime, 0.3, 0.022, 'triangle', this.musicGain);
      }
      this.musicStep += 1;
      this.musicNextTime += 0.28;
    }
  }

  private scheduleTone(
    frequency: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    output: GainNode,
  ): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return { musicEnabled: true, sfxEnabled: true };
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      return {
        musicEnabled: parsed.musicEnabled !== false,
        sfxEnabled: parsed.sfxEnabled !== false,
      };
    } catch {
      return { musicEnabled: true, sfxEnabled: true };
    }
  }

  private saveSettings(): void {
    try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* storage can be unavailable */ }
  }
}
