// Synthesized audio retained from the supplied Desert Dash game.
export class SoundEffects {
  constructor() {
    this.enabled = true;
    this.audioContext = null;
  }

  beep(
    startFrequency,
    endFrequency,
    duration,
    volume = 0.07,
    wave = "square",
    delay = 0,
  ) {
    if (!this.enabled) return;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioContext) this.audioContext = new AudioContextClass();
      if (this.audioContext.state === "suspended")
        this.audioContext.resume().catch(() => {});

      const context = this.audioContext;
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(startFrequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFrequency),
        start + duration,
      );
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, volume),
        start + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    } catch (_) {
      /* Audio is optional; never break gameplay. */
    }
  }

  jump() {
    this.beep(330, 690, 0.12, 0.035, "triangle");
  }
  crash() {
    this.beep(240, 65, 0.3, 0.085, "sawtooth");
  }
  start() {
    this.beep(510, 710, 0.13, 0.03, "sine");
  }
  milestone() {
    this.beep(700, 700, 0.1, 0.025, "sine");
    this.beep(940, 940, 0.13, 0.025, "sine", 0.12);
  }
}

export const sounds = new SoundEffects();
