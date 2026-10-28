const AUDIO_SETTINGS_KEY = 'indoor-jungle-audio';

// Eight 8-step phrases form a spacious lo-fi loop. Rests and a varied second
// half keep the 64-step sequence atmospheric without losing its Atari voice.
const ARCADE_MELODY = [
  67, null, 72, 74, null, 72, 67, null,
  64, null, 69, 72, null, 69, 67, null,
  65, null, 69, 72, 74, null, 69, null,
  67, null, 71, 74, null, 72, 71, null,
  67, 72, null, 76, 74, null, 72, null,
  64, 69, null, 72, 71, null, 67, null,
  65, null, 69, 74, null, 72, 69, null,
  67, null, 71, 74, 72, null, 67, null,
] as const;
const ARCADE_BASS_ROOTS = [36, 33, 29, 31, 36, 33, 29, 31] as const;
const ARCADE_STEP_SECONDS = 0.32;

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

  playCrash(strength = 1): void {
    if (!this.settings.sfxEnabled) return;
    const context = this.prepareSound();
    if (!context || !this.sfxGain) return;
    const start = context.currentTime;
    const impact = Math.max(0.35, Math.min(1, strength));
    const duration = 0.16 + impact * 0.14;

    const thud = context.createOscillator();
    const thudGain = context.createGain();
    thud.type = 'square';
    thud.frequency.setValueAtTime(105 + impact * 35, start);
    thud.frequency.exponentialRampToValueAtTime(38, start + duration);
    thudGain.gain.setValueAtTime(0.0001, start);
    thudGain.gain.exponentialRampToValueAtTime(0.12 * impact, start + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(start);
    thud.stop(start + duration + 0.02);

    const noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noise.length; index += 1) {
      const envelope = 1 - index / noise.length;
      noise[index] = (Math.random() * 2 - 1) * envelope;
    }
    const crack = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const crackGain = context.createGain();
    crack.buffer = noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + impact * 700, start);
    crackGain.gain.setValueAtTime(0.08 * impact, start);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    crack.connect(filter);
    filter.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crack.start(start);
    crack.stop(start + duration);
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
    this.musicGain.gain.value = 0.21;
    this.sfxGain.gain.value = 0.22;
    this.musicGain.connect(this.context.destination);
    this.sfxGain.connect(this.context.destination);
    return this.context;
  }

  private startMusic(): void {
    const context = this.ensureContext();
    if (!context || !this.musicGain || this.musicTimer !== null) return;
    this.musicGain.gain.setTargetAtTime(0.21, context.currentTime, 0.025);
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
    const now = context.currentTime;
    if (this.musicNextTime < now) this.musicNextTime = now + 0.04;
    while (this.musicNextTime < now + 0.4) {
      const loopStep = this.musicStep % ARCADE_MELODY.length;
      const note = ARCADE_MELODY[loopStep];
      const phrase = Math.floor(loopStep / 8);
      const phraseStep = loopStep % 8;
      if (note !== null) {
        this.scheduleTone(this.midiToFrequency(note), this.musicNextTime, 0.28, phraseStep === 0 ? 0.029 : 0.022, 'triangle', this.musicGain);
        if (phraseStep === 3 || phraseStep === 6) {
          this.scheduleTone(this.midiToFrequency(note + 12), this.musicNextTime + 0.035, 0.14, 0.008, 'square', this.musicGain);
        }
      }
      if (phraseStep === 0) {
        this.scheduleTone(this.midiToFrequency(ARCADE_BASS_ROOTS[phrase]), this.musicNextTime, 0.92, 0.022, 'sine', this.musicGain);
      } else if (phraseStep === 4) {
        this.scheduleTone(this.midiToFrequency(ARCADE_BASS_ROOTS[phrase] + 7), this.musicNextTime, 0.58, 0.014, 'sine', this.musicGain);
      }
      this.musicStep += 1;
      this.musicNextTime += ARCADE_STEP_SECONDS;
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
