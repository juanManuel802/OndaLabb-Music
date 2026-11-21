export type SourceType =
  | "sine"
  | "square"
  | "triangle"
  | "sawtooth"
  | "noise"
  | "partials"
  | "pluck";

export type TriggerType = "always" | "note";
export type FilterType = "lowpass" | "highpass" | "bandpass" | "notch";
export type StageType = "filter" | "gain" | "drive" | "delay";
export type LfoWaveform = "sine" | "triangle";
export type LfoTarget = "pitch" | "amplitude" | "cutoff";
export type ExcitationType = "noise" | "impulse";
export type AnalysisTab = "waves" | "spectrum" | "spectrogram";

export interface SourceConfig {
  type: SourceType;
  frequency: number;
  amplitude: number;
  phase: number;
  partials: number[];
  decay: number;
  brightness: number;
  pluck_position: number;
  excitation: ExcitationType;
  damp_on_release: boolean;
}

export interface AmpEnvelope {
  enabled: boolean;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LayerFilter {
  enabled: boolean;
  type: FilterType;
  cutoff: number;
  resonance: number;
}

export interface LfoConfig {
  enabled: boolean;
  waveform: LfoWaveform;
  rate: number;
  depth: number;
  target: LfoTarget;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  solo: boolean;
  trigger: TriggerType;
  gain: number;
  source: SourceConfig;
  envelope: AmpEnvelope;
  filter: LayerFilter;
  lfo: LfoConfig;
}

export interface Stage {
  id: string;
  type: StageType;
  enabled: boolean;
  filter_type: FilterType;
  cutoff: number;
  resonance: number;
  gain_db: number;
  drive: number;
  delay_ms: number;
  feedback: number;
  mix: number;
}

export interface NoteEvent {
  id: string;
  start: number;
  duration: number;
  pitch: number;
  velocity: number;
}

export interface Patch {
  version: number;
  sample_rate: number;
  layers: Layer[];
  master_chain: Stage[];
  master_gain_db: number;
}

export interface Sequence {
  duration: number;
  events: NoteEvent[];
}

export interface Project {
  patch: Patch;
  sequence: Sequence;
}

export interface RenderOptions {
  window_start: number;
  window_seconds: number;
  max_points: number;
  spectrogram: boolean;
  spectrogram_time_bins: number;
  spectrogram_freq_bins: number;
  spectrum_points: number;
}

export interface MetricSet {
  peak: number;
  rms: number;
  peak_db: number;
  rms_db: number;
  crest_db: number;
  clip_percent: number;
  dominant_hz: number;
  brightness_hz: number;
}

export interface LayerTrace {
  id: string;
  name: string;
  color: string;
  samples: number[];
}

export interface SpectrumData {
  frequencies: number[];
  input_db: number[];
  output_db: number[];
}

export interface SpectrogramData {
  times: number[];
  frequencies: number[];
  input_db: number[][];
  output_db: number[][];
}

export interface FilterResponse {
  id: string;
  label: string;
  frequencies: number[];
  db: number[];
}

export interface RenderMeta {
  sample_rate: number;
  render_seconds: number;
  render_ms: number;
  analysis_ms: number;
  compute_ms: number;
  voices: number;
  active_layers: number;
  active_stages: number;
  input_peak: number;
  output_peak: number;
  window_ms: number;
  points: number;
}

export interface Analysis {
  time_ms: number[];
  window: { start: number; duration: number };
  input: number[];
  output: number[];
  layers: LayerTrace[];
  spectrum: SpectrumData;
  spectrogram: SpectrogramData | null;
  metrics: { input: MetricSet; output: MetricSet };
  responses: FilterResponse[];
  meta: RenderMeta;
}

export interface RenderResponse {
  render_id: string;
  analysis: Analysis;
}

export interface ParamSpec {
  key: string;
  label: string;
  type: "range" | "select" | "boolean" | "partials";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  scale?: "linear" | "log";
  options?: { value: string; label: string }[];
}

export interface SourceSpec {
  type: SourceType;
  label: string;
  short: string;
  description: string;
  formula: string;
  default_trigger: TriggerType;
  defaults: Partial<SourceConfig>;
  params: string[];
}

export interface ProcessorSpec {
  type: StageType;
  label: string;
  short: string;
  color: string;
  description: string;
  params: ParamSpec[];
}

export interface LfoTargetSpec {
  value: LfoTarget;
  label: string;
  description: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  patch: Patch;
  sequence: Sequence;
}

export interface Capabilities {
  version: number;
  sources: SourceSpec[];
  params: Record<string, ParamSpec>;
  processors: ProcessorSpec[];
  lfo_targets: LfoTargetSpec[];
  note_range: { min: number; max: number };
  sample_rates: number[];
  presets: Preset[];
}

export type Selection =
  | { kind: "layer"; id: string }
  | { kind: "stage"; id: string }
  | { kind: "note"; id: string }
  | null;

export type RenderStatus = "idle" | "rendering" | "ready" | "error";
