import { create } from "zustand";
import type {
  Analysis,
  AnalysisTab,
  Capabilities,
  Layer,
  NoteEvent,
  Preset,
  Project,
  RenderOptions,
  RenderStatus,
  Selection,
  Stage,
  StageType,
  SourceType,
} from "../types";
import {
  DEFAULT_RENDER_OPTIONS,
  fallbackProject,
  loadStoredProject,
  makeLayer,
  makeNote,
  makeStage,
} from "../lib/defaults";

export type SpectrogramChannel = "input" | "output";

interface ViewState {
  tab: AnalysisTab;
  windowStart: number;
  windowSeconds: number;
  showLayers: boolean;
  showInputGhost: boolean;
  normalize: boolean;
  spectrogramChannel: SpectrogramChannel;
  autoScrollToFirstNote: boolean;
}

interface ProjectState {
  project: Project;
  selection: Selection;
  view: ViewState;
  renderOptions: RenderOptions;
  capabilities: Capabilities | null;
  activePresetId: string | null;
  status: RenderStatus;
  analysis: Analysis | null;
  renderId: string | null;
  error: string | null;
  lastComputeMs: number | null;
  isPlaying: boolean;
  loop: boolean;
  volume: number;

  setCapabilities: (capabilities: Capabilities) => void;
  loadPreset: (preset: Preset) => void;
  setProject: (project: Project) => void;
  resetProject: () => void;
  select: (selection: Selection) => void;
  setView: (partial: Partial<ViewState>) => void;
  setRenderOptions: (partial: Partial<RenderOptions>) => void;
  setStatus: (status: RenderStatus) => void;
  setAnalysis: (analysis: Analysis, renderId: string, computeMs: number) => void;
  setError: (error: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setLoop: (loop: boolean) => void;
  setVolume: (volume: number) => void;

  addLayer: (type: SourceType) => void;
  updateLayer: (id: string, updater: (layer: Layer) => Layer) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;

  addStage: (type: StageType) => void;
  updateStage: (id: string, updater: (stage: Stage) => Stage) => void;
  removeStage: (id: string) => void;
  moveStage: (id: string, direction: -1 | 1) => void;

  addNote: (start: number, pitch: number, duration?: number, velocity?: number) => void;
  updateNote: (id: string, updater: (event: NoteEvent) => NoteEvent) => void;
  removeNote: (id: string) => void;
  clearNotes: () => void;
  setDuration: (duration: number) => void;
}

const initialProject = loadStoredProject() ?? fallbackProject();

function replaceLayer(project: Project, id: string, updater: (layer: Layer) => Layer): Project {
  return {
    ...project,
    patch: {
      ...project.patch,
      layers: project.patch.layers.map((layer) => (layer.id === id ? updater(layer) : layer)),
    },
  };
}

function replaceStage(project: Project, id: string, updater: (stage: Stage) => Stage): Project {
  return {
    ...project,
    patch: {
      ...project.patch,
      master_chain: project.patch.master_chain.map((stage) => (stage.id === id ? updater(stage) : stage)),
    },
  };
}

function replaceNote(project: Project, id: string, updater: (event: NoteEvent) => NoteEvent): Project {
  return {
    ...project,
    sequence: {
      ...project.sequence,
      events: project.sequence.events.map((event) => (event.id === id ? updater(event) : event)),
    },
  };
}

export const useProjectStore = create<ProjectState>()((set) => ({
  project: initialProject,
  selection: { kind: "layer", id: initialProject.patch.layers[0]?.id ?? "" },
  view: {
    tab: "waves",
    windowStart: 0,
    windowSeconds: 0.12,
    showLayers: false,
    showInputGhost: true,
    normalize: false,
    spectrogramChannel: "output",
    autoScrollToFirstNote: true,
  },
  renderOptions: { ...DEFAULT_RENDER_OPTIONS },
  capabilities: null,
  activePresetId: null,
  status: "idle",
  analysis: null,
  renderId: null,
  error: null,
  lastComputeMs: null,
  isPlaying: false,
  loop: true,
  volume: 0.85,

  setCapabilities: (capabilities) => set({ capabilities }),
  loadPreset: (preset) =>
    set({
      project: structuredClone({
        patch: preset.patch,
        sequence: preset.sequence,
      } as Project),
      selection: { kind: "layer", id: preset.patch.layers[0]?.id ?? "" },
      activePresetId: preset.id,
      error: null,
      view: {
        ...useProjectStore.getState().view,
        windowStart: 0,
        tab: "waves",
      },
    }),
  setProject: (project) => set({ project, activePresetId: null, error: null }),
  resetProject: () => {
    const fallback = fallbackProject();
    set({
      project: fallback,
      selection: { kind: "layer", id: fallback.patch.layers[0]?.id ?? "" },
      activePresetId: null,
      view: { ...useProjectStore.getState().view, windowStart: 0 },
    });
  },
  select: (selection) => set({ selection }),
  setView: (partial) => set((state) => ({ view: { ...state.view, ...partial } })),
  setRenderOptions: (partial) => set((state) => ({ renderOptions: { ...state.renderOptions, ...partial } })),
  setStatus: (status) => set({ status }),
  setAnalysis: (analysis, renderId, computeMs) =>
    set({ analysis, renderId, status: "ready", lastComputeMs: computeMs }),
  setError: (error) => set({ error, status: error ? "error" : "ready" }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setLoop: (loop) => set({ loop }),
  setVolume: (volume) => set({ volume }),

  addLayer: (type) =>
    set((state) => {
      if (state.project.patch.layers.length >= 8) return state;
      const layer = makeLayer(type, state.project.patch.layers.length);
      return {
        project: {
          ...state.project,
          patch: { ...state.project.patch, layers: [...state.project.patch.layers, layer] },
        },
        selection: { kind: "layer", id: layer.id },
      };
    }),
  updateLayer: (id, updater) =>
    set((state) => ({ project: replaceLayer(state.project, id, updater), activePresetId: null })),
  removeLayer: (id) =>
    set((state) => {
      const layers = state.project.patch.layers.filter((layer) => layer.id !== id);
      const selection: Selection =
        state.selection?.kind === "layer" && state.selection.id === id
          ? layers[0]
            ? { kind: "layer", id: layers[0].id }
            : null
          : state.selection;
      return {
        project: { ...state.project, patch: { ...state.project.patch, layers } },
        selection,
      };
    }),
  duplicateLayer: (id) =>
    set((state) => {
      const index = state.project.patch.layers.findIndex((layer) => layer.id === id);
      if (index < 0 || state.project.patch.layers.length >= 8) return state;
      const source = state.project.patch.layers[index];
      const copy: Layer = structuredClone(source);
      copy.id = `${source.id}-copy-${Math.random().toString(36).slice(2, 7)}`;
      copy.name = `${source.name} copia`;
      copy.solo = false;
      const layers = [...state.project.patch.layers];
      layers.splice(index + 1, 0, copy);
      return {
        project: { ...state.project, patch: { ...state.project.patch, layers } },
        selection: { kind: "layer", id: copy.id },
      };
    }),
  moveLayer: (id, direction) =>
    set((state) => {
      const layers = [...state.project.patch.layers];
      const index = layers.findIndex((layer) => layer.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= layers.length) return state;
      [layers[index], layers[target]] = [layers[target], layers[index]];
      return { project: { ...state.project, patch: { ...state.project.patch, layers } } };
    }),

  addStage: (type) =>
    set((state) => {
      if (state.project.patch.master_chain.length >= 8) return state;
      const stage = makeStage(type);
      return {
        project: {
          ...state.project,
          patch: { ...state.project.patch, master_chain: [...state.project.patch.master_chain, stage] },
        },
        selection: { kind: "stage", id: stage.id },
      };
    }),
  updateStage: (id, updater) =>
    set((state) => ({ project: replaceStage(state.project, id, updater), activePresetId: null })),
  removeStage: (id) =>
    set((state) => {
      const chain = state.project.patch.master_chain.filter((stage) => stage.id !== id);
      const selection: Selection =
        state.selection?.kind === "stage" && state.selection.id === id ? null : state.selection;
      return {
        project: { ...state.project, patch: { ...state.project.patch, master_chain: chain } },
        selection,
      };
    }),
  moveStage: (id, direction) =>
    set((state) => {
      const chain = [...state.project.patch.master_chain];
      const index = chain.findIndex((stage) => stage.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= chain.length) return state;
      [chain[index], chain[target]] = [chain[target], chain[index]];
      return { project: { ...state.project, patch: { ...state.project.patch, master_chain: chain } } };
    }),

  addNote: (start, pitch, duration = 0.6, velocity = 0.8) =>
    set((state) => {
      const note = makeNote(start, pitch, duration, velocity);
      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, events: [...state.project.sequence.events, note] },
        },
        selection: { kind: "note", id: note.id },
      };
    }),
  updateNote: (id, updater) =>
    set((state) => ({ project: replaceNote(state.project, id, updater), activePresetId: null })),
  removeNote: (id) =>
    set((state) => {
      const events = state.project.sequence.events.filter((event) => event.id !== id);
      const selection: Selection = state.selection?.kind === "note" && state.selection.id === id ? null : state.selection;
      return {
        project: { ...state.project, sequence: { ...state.project.sequence, events } },
        selection,
      };
    }),
  clearNotes: () =>
    set((state) => ({
      project: { ...state.project, sequence: { ...state.project.sequence, events: [] } },
      selection: state.selection?.kind === "note" ? null : state.selection,
    })),
  setDuration: (duration) =>
    set((state) => {
      const clamped = Math.min(12, Math.max(0.5, duration));
      const events = state.project.sequence.events.map((event) => ({
        ...event,
        start: Math.min(event.start, Math.max(0, clamped - 0.05)),
        duration: Math.min(event.duration, Math.max(0.05, clamped - Math.min(event.start, clamped))),
      }));
      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, duration: clamped, events },
        },
      };
    }),
}));
