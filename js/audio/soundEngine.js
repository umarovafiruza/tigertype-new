/**
 * High-performance Web Audio API mechanical switch synthesizer.
 * Provides microsecond latency playback with realistic mechanical switch physics
 * and zero external audio assets.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.currentProfile = "blue"; // "off" | "blue" | "red" | "brown"
    this.volume = 0.7;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx({ latencyHint: "interactive" });

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Pre-generate reusable noise buffer for mechanical click texture
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setProfile(profileId) {
    this.currentProfile = profileId;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  playKeystroke(key = "a") {
    if (this.currentProfile === "off") return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    const isSpaceOrEnter = key === " " || key === "Enter";
    const now = this.ctx.currentTime;

    switch (this.currentProfile) {
      case "blue":
        this._playClickyBlue(now, isSpaceOrEnter);
        break;
      case "red":
        this._playLinearRed(now, isSpaceOrEnter);
        break;
      case "brown":
        this._playTactileBrown(now, isSpaceOrEnter);
        break;
      default:
        break;
    }
  }

  _playClickyBlue(now, isSpace) {
    if (!this.ctx || !this.masterGain) return;

    // 1. Sharp mechanical click snap (noise transient)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(isSpace ? 2800 : 4200, now);
      noiseFilter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.55, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.02);
    }

    // 2. High-pitch click transient
    const oscClick = this.ctx.createOscillator();
    const gainClick = this.ctx.createGain();
    oscClick.type = "triangle";
    oscClick.frequency.setValueAtTime(isSpace ? 2400 : 3200, now);
    oscClick.frequency.exponentialRampToValueAtTime(1200, now + 0.025);

    gainClick.gain.setValueAtTime(0.45, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    oscClick.connect(gainClick);
    gainClick.connect(this.masterGain);

    oscClick.start(now);
    oscClick.stop(now + 0.035);

    // 3. Resonant plastic housing thud (clack body)
    const oscThud = this.ctx.createOscillator();
    const gainThud = this.ctx.createGain();
    oscThud.type = "triangle";
    oscThud.frequency.setValueAtTime(isSpace ? 340 : 480, now + 0.004);
    oscThud.frequency.exponentialRampToValueAtTime(160, now + 0.06);

    gainThud.gain.setValueAtTime(0.4, now + 0.004);
    gainThud.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    oscThud.connect(gainThud);
    gainThud.connect(this.masterGain);

    oscThud.start(now + 0.004);
    oscThud.stop(now + 0.07);
  }

  _playLinearRed(now, isSpace) {
    if (!this.ctx || !this.masterGain) return;

    // Soft, deep, smooth thock (housing collision without the sharp click)
    // 1. Soft impact noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(isSpace ? 1100 : 1600, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.025);
    }

    // 2. Warm plastic body thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isSpace ? 300 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.055);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  _playTactileBrown(now, isSpace) {
    if (!this.ctx || !this.masterGain) return;

    // Tactile bump + medium bottom-out clack
    // 1. Moderate transient
    const oscBump = this.ctx.createOscillator();
    const gainBump = this.ctx.createGain();
    oscBump.type = "triangle";
    oscBump.frequency.setValueAtTime(isSpace ? 1400 : 1900, now);
    oscBump.frequency.exponentialRampToValueAtTime(700, now + 0.02);

    gainBump.gain.setValueAtTime(0.35, now);
    gainBump.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    oscBump.connect(gainBump);
    gainBump.connect(this.masterGain);

    oscBump.start(now);
    oscBump.stop(now + 0.03);

    // 2. Solid bottom-out
    const oscThud = this.ctx.createOscillator();
    const gainThud = this.ctx.createGain();
    oscThud.type = "triangle";
    oscThud.frequency.setValueAtTime(isSpace ? 320 : 450, now + 0.003);
    oscThud.frequency.exponentialRampToValueAtTime(150, now + 0.06);

    gainThud.gain.setValueAtTime(0.4, now + 0.003);
    gainThud.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    oscThud.connect(gainThud);
    gainThud.connect(this.masterGain);

    oscThud.start(now + 0.003);
    oscThud.stop(now + 0.07);
  }
}
