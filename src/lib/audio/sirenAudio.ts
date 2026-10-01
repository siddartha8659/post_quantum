/**
 * Synthesizes an authentic hospital emergency / Code Blue siren
 * using the browser Web Audio API (zero external assets or audio files required).
 */
class SirenAudioEngine {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private modulationInterval: any = null;
  private isMuted = false;

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    } catch (e) {
      console.warn('[SIREN] Could not initialize AudioContext:', e);
      return false;
    }
  }

  public start(): boolean {
    if (this.isPlaying) return true;
    if (!this.initContext() || !this.ctx) return false;

    try {
      const now = this.ctx.currentTime;

      // Primary tone oscillator (sawtooth produces the piercing, realistic emergency timbre)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(650, now);

      // Secondary harmonizing oscillator for hospital klaxon effect
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(780, now);

      // Master gain node
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.22, now);

      // Connect graph
      this.osc1.connect(this.gainNode);
      this.osc2.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.osc1.start();
      this.osc2.start();
      this.isPlaying = true;

      // Two-tone alternating emergency siren pitch modulation (640Hz <-> 960Hz)
      let pitchToggle = false;
      this.modulationInterval = setInterval(() => {
        if (!this.ctx || !this.osc1 || !this.osc2 || !this.isPlaying) return;
        pitchToggle = !pitchToggle;
        const t = this.ctx.currentTime;
        const freq1 = pitchToggle ? 960 : 640;
        const freq2 = pitchToggle ? 1150 : 770;

        this.osc1.frequency.cancelScheduledValues(t);
        this.osc1.frequency.exponentialRampToValueAtTime(freq1, t + 0.35);

        this.osc2.frequency.cancelScheduledValues(t);
        this.osc2.frequency.exponentialRampToValueAtTime(freq2, t + 0.35);
      }, 420);

      return true;
    } catch (err) {
      console.warn('[SIREN] Start failed:', err);
      return false;
    }
  }

  public stop(): void {
    if (!this.isPlaying) return;
    try {
      if (this.modulationInterval) {
        clearInterval(this.modulationInterval);
        this.modulationInterval = null;
      }
      if (this.osc1) {
        try {
          this.osc1.stop();
          this.osc1.disconnect();
        } catch {}
        this.osc1 = null;
      }
      if (this.osc2) {
        try {
          this.osc2.stop();
          this.osc2.disconnect();
        } catch {}
        this.osc2 = null;
      }
      if (this.gainNode) {
        try {
          this.gainNode.disconnect();
        } catch {}
        this.gainNode = null;
      }
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
        this.ctx = null;
      }
    } catch (e) {
      console.warn('[SIREN] Stop error:', e);
    }
    this.isPlaying = false;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(muted ? 0 : 0.22, this.ctx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

// Global singleton instance
export const sirenAudio = new SirenAudioEngine();
