import type { Stage, Layer, SourceType, StageType } from "../types";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

let counter = 0;

export function uid(prefix = "id"): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${random}`;
}

export function midiToName(pitch: number): string {
  const names = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  const octave = Math.floor(pitch / 12) - 1;
  return `${names[((pitch % 12) + 12) % 12]}${octave}`;
}

export function midiToFrequency(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

export function isBlackKey(pitch: number): boolean {
  return [1, 3, 6, 8, 10].includes(((pitch % 12) + 12) % 12);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatHz(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 Hz";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 1 : 2)} kHz`;
  return `${value.toFixed(value >= 100 ? 0 : 1)} Hz`;
}

export function formatMs(value: number): string {
  return `${value.toFixed(value < 10 ? 2 : 1)} ms`;
}

export function formatSeconds(value: number): string {
  return `${value.toFixed(2)} s`;
}

export function formatDb(value: number): string {
  if (!Number.isFinite(value)) return "-∞";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export const LAYER_COLORS = [
  "#22d3ee",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#60a5fa",
  "#f472b6",
  "#facc15",
];

export function nextColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  sine: "Seno",
  square: "Cuadrada",
  triangle: "Triangular",
  sawtooth: "Sierra",
  noise: "Ruido",
  partials: "Parciales",
  pluck: "Cuerda pulsada",
};

export const STAGE_LABELS: Record<StageType, string> = {
  filter: "Filtro",
  gain: "Ganancia",
  drive: "Saturación",
  delay: "Eco",
};

export function sourceLabel(source: Layer["source"]): string {
  return SOURCE_LABELS[source.type];
}

export function layerSummary(layer: Layer): string {
  if (layer.trigger === "note") {
    if (layer.source.type === "pluck") return "modelo físico · nota";
    return "sigue las notas";
  }
  if (layer.source.type === "noise") return "drone continuo";
  return `${formatHz(layer.source.frequency)} · drone`;
}

export function stageSummary(stage: Stage): string {
  switch (stage.type) {
    case "filter":
      return `${stage.filter_type} · ${formatHz(stage.cutoff)}`;
    case "gain":
      return formatDb(stage.gain_db);
    case "drive":
      return `${stage.drive.toFixed(1)}×`;
    case "delay":
      return `${formatMs(stage.delay_ms)} · ${Math.round(stage.mix * 100)}%`;
    default:
      return "";
  }
}

export function envelopeSummary(layer: Layer): string {
  if (!layer.envelope.enabled) return layer.source.type === "pluck" ? "natural" : "fija";
  return `A ${layer.envelope.attack.toFixed(2)} · D ${layer.envelope.decay.toFixed(2)} · S ${layer.envelope.sustain.toFixed(2)} · R ${layer.envelope.release.toFixed(2)}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, mime = "application/json"): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
