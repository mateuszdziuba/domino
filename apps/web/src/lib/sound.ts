const SOUND_KEY = "domino-sound";

let audioContext: AudioContext | null = null;

export function soundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== "0";
}

export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioContext) {
      const Ctor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function blip(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  duration: number,
  gainValue: number,
  when: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

export function playDice(): void {
  if (!soundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    blip(ctx, "square", 880, 0.06, 0.04, now);
    blip(ctx, "square", 660, 0.06, 0.04, now + 0.08);
  } catch {
    return;
  }
}

export function playMessage(): void {
  if (!soundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    blip(ctx, "sine", 440, 0.12, 0.03, ctx.currentTime);
  } catch {
    return;
  }
}
