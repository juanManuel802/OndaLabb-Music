import type {
  Layer,
  NoteEvent,
  Patch,
  Project,
  RenderOptions,
  SourceType,
  Stage,
  StageType,
  TriggerType,
} from "../types";
import { nextColor, uid } from "./utils";

export const STORAGE_KEY = "ondalab.project.v2";

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  window_start: 0,
  window_seconds: 0.12,
  max_points: 2600,
  spectrogram: true,
  spectrogram_time_bins: 192,
  spectrogram_freq_bins: 96,
  spectrum_points: 256,
};

export function makeLayer(sourceType: SourceType, index = 0): Layer {
  const trigger: TriggerType = sourceType === "pluck" || sourceType === "partials" ? "note" : "always";
  const base = {
    id: uid("layer"),
    color: nextColor(index),
    enabled: true,
    solo: false,
    trigger,
    gain: sourceType === "pluck" ? 0.9 : 0.65,
    envelope: {
      enabled: sourceType !== "pluck",
      attack: 0.02,
      decay: 0.25,
      sustain: sourceType === "partials" ? 0.2 : 0.75,
      release: sourceType === "partials" ? 1.8 : 0.45,
    },
    filter: {
      enabled: false,
      type: "lowpass" as const,
      cutoff: 2400,
      resonance: 0.8,
    },
    lfo: {
      enabled: false,
      waveform: "sine" as const,
      rate: 4.5,
      depth: 0.35,
      target: "pitch" as const,
    },
  };

  const source = {
    type: sourceType,
    frequency: 220,
    amplitude: 0.55,
    phase: 0,
    partials: [0.85, 0.45, 0.28, 0.18, 0.12, 0.08, 0.05, 0.03],
    decay: 2.8,
    brightness: 0.35,
    pluck_position: 0.18,
    excitation: "noise" as const,
    damp_on_release: false,
  };

  if (sourceType === "pluck") {
    source.frequency = 220;
    source.amplitude = 0.95;
    return { ...base, name: "Cuerda pulsada", source };
  }
  if (sourceType === "noise") {
    source.amplitude = 0.25;
    return { ...base, name: "Ruido", source };
  }
  if (sourceType === "partials") {
    source.amplitude = 0.6;
    return { ...base, name: "Parciales", source };
  }
  if (sourceType === "sawtooth") {
    source.amplitude = 0.34;
    return { ...base, name: "Sierra", source };
  }
  if (sourceType === "square") {
    source.amplitude = 0.36;
    return { ...base, name: "Cuadrada", source };
  }
  if (sourceType === "triangle") {
    source.amplitude = 0.48;
    return { ...base, name: "Triangular", source };
  }
  return { ...base, name: "Seno", source };
}

export function makeStage(type: StageType): Stage {
  return {
    id: uid("stage"),
    type,
    enabled: true,
    filter_type: "lowpass",
    cutoff: type === "filter" ? 2400 : 2400,
    resonance: 0.9,
    gain_db: 0,
    drive: 2.5,
    delay_ms: 220,
    feedback: 0.25,
    mix: 0.22,
  };
}

export function makeNote(start: number, pitch: number, duration = 0.6, velocity = 0.8): NoteEvent {
  return {
    id: uid("note"),
    start: Math.max(0, Math.round(start * 200) / 200),
    duration: Math.max(0.05, Math.round(duration * 100) / 100),
    pitch,
    velocity,
  };
}

export function fallbackProject(): Project {
  const layer = makeLayer("pluck", 0);
  layer.name = "Cuerda";
  layer.source.decay = 3.0;
  layer.source.brightness = 0.35;
  layer.source.pluck_position = 0.18;
  layer.filter = { enabled: true, type: "lowpass", cutoff: 6200, resonance: 0.7 };
  layer.gain = 0.9;

  return {
    patch: {
      version: 1,
      sample_rate: 48000,
      layers: [layer],
      master_chain: [
        { ...makeStage("filter"), filter_type: "lowpass", cutoff: 8200, resonance: 0.6 },
        { ...makeStage("delay"), delay_ms: 170, feedback: 0.22, mix: 0.18 },
      ],
      master_gain_db: -2,
    },
    sequence: {
      duration: 4.8,
      events: [
        makeNote(0, 48, 1.8, 0.85),
        makeNote(0.35, 55, 1.5, 0.72),
        makeNote(0.7, 60, 1.4, 0.78),
        makeNote(1.05, 64, 1.4, 0.66),
        makeNote(1.4, 67, 1.6, 0.62),
        makeNote(2.3, 60, 1.6, 0.76),
        makeNote(2.65, 64, 1.4, 0.7),
        makeNote(3.0, 67, 1.8, 0.64),
      ],
    },
  };
}

export function emptyProject(): Project {
  const layer = makeLayer("sine", 0);
  layer.name = "Seno";
  return {
    patch: {
      version: 1,
      sample_rate: 48000,
      layers: [layer],
      master_chain: [{ ...makeStage("gain"), gain_db: 0 }],
      master_gain_db: -2,
    },
    sequence: { duration: 3, events: [] },
  };
}

export function loadStoredProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    if (!parsed?.patch || !parsed?.sequence || parsed.patch.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredProject(project: Project): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Storage can be disabled; the editor keeps working in memory.
  }
}
