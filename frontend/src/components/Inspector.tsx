import { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Filter,
  Gauge,
  Layers,
  Music2,
  Power,
  SlidersHorizontal,
  Trash2,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import { useProjectStore } from "../store/useProjectStore";
import type { Layer, NoteEvent, SourceConfig, Stage } from "../types";
import { cn, formatDb, formatHz, formatMs, formatSeconds, LAYER_COLORS, midiToFrequency, midiToName, sourceLabel, STAGE_LABELS, stageSummary } from "../lib/utils";
import { InfoCard, ParamControl, Section, Select, Slider, Toggle } from "./controls";
import { EnvelopePreview } from "../charts/EnvelopePreview";
import { MiniResponseChart } from "../charts/MiniResponseChart";
import { SourceTypeIcon } from "./LayersPanel";

const LFO_TARGET_OPTIONS = [
  { value: "pitch", label: "Pitch (vibrato)" },
  { value: "amplitude", label: "Amplitud (tremolo)" },
  { value: "cutoff", label: "Corte del filtro" },
];

function updateSource(layer: Layer, partial: Partial<SourceConfig>): Layer {
  return { ...layer, source: { ...layer.source, ...partial } };
}

function sourceParams(layer: Layer) {
  const source = layer.source;
  return (
    <div className="space-y-3">
      <InfoCard
        icon={<Waves size={13} />}
        title="Fuente"
        text={
          source.type === "pluck"
            ? "El modelo Karplus-Strong no tiene un oscilador fijo: la afinación depende de la nota y la duración del retardo."
            : "El oscilador genera la forma de onda. Con trigger en 'nota', el pitch viene de la secuencia."
        }
      />

      {source.type !== "noise" && layer.trigger === "always" ? (
        <Slider
          label="Frecuencia"
          value={source.frequency}
          min={20}
          max={4000}
          scale="log"
          step={1}
          unit="Hz"
          color={layer.color}
          format={formatHz}
          onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { frequency: value }))}
        />
      ) : null}

      {source.type === "pluck" ? (
        <div className="rounded-xl border border-lab-cyan/15 bg-lab-cyan/[0.04] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-cyan">Lazo físico</div>
          <div className="flex items-center gap-1 font-mono text-[9px] text-slate-400">
            <span className="rounded bg-white/[0.05] px-1.5 py-1">excitación</span>
            <span>→</span>
            <span className="rounded bg-white/[0.05] px-1.5 py-1">retardo</span>
            <span>→</span>
            <span className="rounded bg-white/[0.05] px-1.5 py-1">filtro</span>
            <span>→</span>
            <span className="rounded bg-white/[0.05] px-1.5 py-1">feedback</span>
          </div>
        </div>
      ) : null}

      <Slider
        label="Amplitud"
        value={source.amplitude}
        min={0}
        max={1}
        step={0.01}
        color={layer.color}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { amplitude: value }))}
      />

      {source.type !== "noise" && source.type !== "pluck" ? (
        <Slider
          label="Fase"
          value={source.phase}
          min={-180}
          max={180}
          step={1}
          unit="°"
          color={layer.color}
          onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { phase: value }))}
        />
      ) : null}

      {source.type === "partials" ? (
        <div className="space-y-2 rounded-xl border border-white/7 bg-white/[0.02] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Armónicos
          </div>
          {source.partials.slice(0, 8).map((amplitude, index) => (
            <Slider
              key={index}
              label={`H${index + 1}`}
              value={amplitude}
              min={0}
              max={1}
              step={0.01}
              color={layer.color}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => {
                const partials = [...source.partials];
                partials[index] = value;
                updateLayerValue(layer.id, updateSource(layer, { partials }));
              }}
            />
          ))}
          <p className="text-[10px] text-slate-500">H1 es el fundamental. El pico del espectro aparece en ese armónico.</p>
        </div>
      ) : null}

      {source.type === "pluck" ? (
        <div className="space-y-3 rounded-xl border border-white/7 bg-white/[0.02] p-3">
          <Slider
            label="Decaimiento (T60)"
            value={source.decay}
            min={0.2}
            max={8}
            scale="log"
            step={0.1}
            unit="s"
            color={layer.color}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { decay: value }))}
          />
          <Slider
            label="Brillo del lazo"
            value={source.brightness}
            min={0}
            max={0.85}
            step={0.01}
            color={layer.color}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { brightness: value }))}
          />
          <Slider
            label="Punto del pellizco"
            value={source.pluck_position}
            min={0}
            max={0.9}
            step={0.01}
            color={layer.color}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { pluck_position: value }))}
          />
          <Select
            label="Excitación"
            value={source.excitation}
            options={[
              { value: "noise", label: "Ruido (pellizco suave)" },
              { value: "impulse", label: "Impulso (ataque directo)" },
            ]}
            onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { excitation: value as SourceConfig["excitation"] }))}
          />
          <Toggle
            label="Amortiguar al soltar"
            description="Corta la cola natural al terminar la nota."
            checked={source.damp_on_release}
            color={layer.color}
            onChange={(value) => updateLayerValue(layer.id, updateSource(layer, { damp_on_release: value }))}
          />
        </div>
      ) : null}
    </div>
  );
}

function envelopeParams(layer: Layer) {
  const envelope = layer.envelope;
  return (
    <div className="space-y-3">
      <Toggle
        label="Usar ADSR"
        description={layer.source.type === "pluck" ? "Desactivado deja la caída natural del modelo." : "Envolvente de amplitud por capa."}
        checked={envelope.enabled}
        color={layer.color}
        onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, envelope: { ...current.envelope, enabled: value } }))}
      />
      <EnvelopePreview envelope={envelope} />
      {envelope.enabled ? (
        <>
          <Slider
            label="Ataque"
            value={envelope.attack}
            min={0}
            max={2}
            step={0.005}
            unit="s"
            color={layer.color}
            format={(value) => `${Math.round(value * 1000)} ms`}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, envelope: { ...current.envelope, attack: value } }))}
          />
          <Slider
            label="Decaimiento"
            value={envelope.decay}
            min={0}
            max={4}
            step={0.01}
            unit="s"
            color={layer.color}
            format={(value) => `${Math.round(value * 1000)} ms`}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, envelope: { ...current.envelope, decay: value } }))}
          />
          <Slider
            label="Sosten"
            value={envelope.sustain}
            min={0}
            max={1}
            step={0.01}
            color={layer.color}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, envelope: { ...current.envelope, sustain: value } }))}
          />
          <Slider
            label="Relajación"
            value={envelope.release}
            min={0}
            max={5}
            step={0.01}
            unit="s"
            color={layer.color}
            format={(value) => `${Math.round(value * 1000)} ms`}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, envelope: { ...current.envelope, release: value } }))}
          />
        </>
      ) : null}
    </div>
  );
}

function filterParams(layer: Layer, responses: Array<{ id: string; frequencies: number[]; db: number[] }>) {
  const filter = layer.filter;
  const response = responses.find((item) => item.id === `layer:${layer.id}`);
  return (
    <div className="space-y-3">
      <Toggle
        label="Filtro de capa"
        description="Se aplica antes de la envolvente de amplitud."
        checked={filter.enabled}
        color={layer.color}
        onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, filter: { ...current.filter, enabled: value } }))}
      />
      {filter.enabled ? (
        <>
          <Select
            label="Tipo"
            value={filter.type}
            options={[
              { value: "lowpass", label: "Paso bajo" },
              { value: "highpass", label: "Paso alto" },
              { value: "bandpass", label: "Paso banda" },
              { value: "notch", label: "Notch" },
            ]}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, filter: { ...current.filter, type: value as Layer["filter"]["type"] } }))}
          />
          <Slider
            label="Corte"
            value={filter.cutoff}
            min={40}
            max={16000}
            scale="log"
            step={1}
            unit="Hz"
            color={layer.color}
            format={formatHz}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, filter: { ...current.filter, cutoff: value } }))}
          />
          <Slider
            label="Resonancia"
            value={filter.resonance}
            min={0.1}
            max={12}
            step={0.05}
            unit="Q"
            color={layer.color}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, filter: { ...current.filter, resonance: value } }))}
          />
          {response ? <MiniResponseChart frequencies={response.frequencies} db={response.db} color={layer.color} title="Respuesta del filtro de capa" /> : null}
          {layer.lfo.enabled && layer.lfo.target === "cutoff" ? (
            <InfoCard title="LFO activo" text="El LFO está moviendo este corte. Ver la pestaña Modulación." />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function lfoParams(layer: Layer) {
  const lfo = layer.lfo;
  return (
    <div className="space-y-3">
      <Toggle
        label="LFO"
        description="Modulación cíclica de la capa."
        checked={lfo.enabled}
        color={layer.color}
        onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, lfo: { ...current.lfo, enabled: value } }))}
      />
      {lfo.enabled ? (
        <>
          <Select
            label="Destino"
            value={lfo.target}
            options={LFO_TARGET_OPTIONS}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, lfo: { ...current.lfo, target: value as Layer["lfo"]["target"] } }))}
          />
          <Select
            label="Forma"
            value={lfo.waveform}
            options={[
              { value: "sine", label: "Seno" },
              { value: "triangle", label: "Triángulo" },
            ]}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, lfo: { ...current.lfo, waveform: value as Layer["lfo"]["waveform"] } }))}
          />
          <Slider
            label="Velocidad"
            value={lfo.rate}
            min={0.05}
            max={20}
            scale="log"
            step={0.05}
            unit="Hz"
            color={layer.color}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, lfo: { ...current.lfo, rate: value } }))}
          />
          <Slider
            label="Profundidad"
            value={lfo.depth}
            min={0}
            max={1}
            step={0.01}
            color={layer.color}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) => updateLayerValue(layer.id, (current) => ({ ...current, lfo: { ...current.lfo, depth: value } }))}
          />
          <InfoCard
            title="Destino"
            text={
              lfo.target === "pitch"
                ? "Vibrato de ±2 semitonos. No se aplica al modelo de cuerda."
                : lfo.target === "amplitude"
                  ? "Tremolo entre el 0 % y el 100 % de la amplitud."
                  : "Barrido del filtro de capa entre ±2 octavas."
            }
          />
        </>
      ) : null}
    </div>
  );
}

function LayerInspector({ layer, responses }: { layer: Layer; responses: Array<{ id: string; frequencies: number[]; db: number[] }> }) {
  const updateLayer = useProjectStore((state) => state.updateLayer);
  const removeLayer = useProjectStore((state) => state.removeLayer);
  const duplicateLayer = useProjectStore((state) => state.duplicateLayer);
  const moveLayer = useProjectStore((state) => state.moveLayer);
  const [tab, setTab] = useState<"source" | "envelope" | "filter" | "lfo">("source");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border" style={{ color: layer.color, borderColor: `${layer.color}55`, background: `${layer.color}18` }}>
          <SourceTypeIcon type={layer.source.type} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={layer.name}
            onChange={(event) => updateLayer(layer.id, (current) => ({ ...current, name: event.target.value.slice(0, 60) }))}
            className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-100 outline-none transition hover:border-white/10 focus:border-lab-cyan/50 focus:bg-ink-900"
          />
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span className="badge">{sourceLabel(layer.source)}</span>
            <span className="badge">{layer.trigger === "note" ? "capa nota" : "capa drone"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {LAYER_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => updateLayer(layer.id, (current) => ({ ...current, color }))}
            className={cn("h-5 w-5 rounded-full border transition", layer.color === color ? "scale-110 border-white" : "border-white/20 hover:scale-105")}
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          label="Disparo"
          value={layer.trigger}
          options={[
            { value: "always", label: "Drone (continua)" },
            { value: "note", label: "Nota (secuencia)" },
          ]}
          onChange={(value) => updateLayer(layer.id, (current) => ({ ...current, trigger: value as Layer["trigger"] }))}
        />
        <Select
          label="Estado"
          value={layer.enabled ? "on" : "off"}
          options={[
            { value: "on", label: "Activa" },
            { value: "off", label: "Silenciada" },
          ]}
          onChange={(value) => updateLayer(layer.id, (current) => ({ ...current, enabled: value === "on" }))}
        />
      </div>

      <Slider
        label="Ganancia de capa"
        value={layer.gain}
        min={0}
        max={1.6}
        step={0.01}
        color={layer.color}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(value) => updateLayer(layer.id, (current) => ({ ...current, gain: value }))}
      />

      <div className="flex gap-1 rounded-lg border border-white/7 bg-white/[0.025] p-1">
        {[
          { id: "source", label: "Fuente", icon: Waves },
          { id: "envelope", label: "ADSR", icon: Activity },
          { id: "filter", label: "Filtro", icon: Filter },
          { id: "lfo", label: "LFO", icon: Wind },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={cn("tab-button flex-1 justify-center", tab === item.id && "tab-button-active")}
            >
              <Icon size={12} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "source" ? sourceParams(layer) : null}
      {tab === "envelope" ? envelopeParams(layer) : null}
      {tab === "filter" ? filterParams(layer, responses) : null}
      {tab === "lfo" ? lfoParams(layer) : null}

      <div className="flex items-center justify-between gap-2 border-t border-white/7 pt-3">
        <div className="flex gap-1">
          <button type="button" className="icon-button" title="Subir capa" onClick={() => moveLayer(layer.id, -1)}>
            <ChevronUp size={14} />
          </button>
          <button type="button" className="icon-button" title="Bajar capa" onClick={() => moveLayer(layer.id, 1)}>
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="flex gap-1">
          <button type="button" className="soft-button" onClick={() => duplicateLayer(layer.id)}>
            <Copy size={13} /> Duplicar
          </button>
          <button type="button" className="soft-button hover:text-lab-rose" onClick={() => removeLayer(layer.id)}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function StageInspector({ stage, responses }: { stage: Stage; responses: Array<{ id: string; frequencies: number[]; db: number[] }> }) {
  const updateStage = useProjectStore((state) => state.updateStage);
  const removeStage = useProjectStore((state) => state.removeStage);
  const moveStage = useProjectStore((state) => state.moveStage);
  const response = responses.find((item) => item.id === `stage:${stage.id}`);
  const icon = stage.type === "filter" ? Filter : stage.type === "gain" ? Gauge : stage.type === "drive" ? Zap : Clock3;
  const Icon = icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200">
          <Icon size={16} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-100">{STAGE_LABELS[stage.type]}</div>
          <div className="font-mono text-[10px] text-slate-500">{stageSummary(stage)}</div>
        </div>
        <button
          type="button"
          className="icon-button"
          title={stage.enabled ? "Saltar" : "Activar"}
          onClick={() => updateStage(stage.id, (current) => ({ ...current, enabled: !current.enabled }))}
        >
          <Power size={14} className={stage.enabled ? "text-lab-emerald" : "text-slate-500"} />
        </button>
      </div>

      <Section title="Parámetros">
        {stage.type === "filter" ? (
          <>
            <Select
              label="Tipo"
              value={stage.filter_type}
              options={[
                { value: "lowpass", label: "Paso bajo" },
                { value: "highpass", label: "Paso alto" },
                { value: "bandpass", label: "Paso banda" },
                { value: "notch", label: "Notch" },
              ]}
              onChange={(value) => updateStage(stage.id, (current) => ({ ...current, filter_type: value as Stage["filter_type"] }))}
            />
            <Slider
              label="Corte"
              value={stage.cutoff}
              min={40}
              max={16000}
              scale="log"
              step={1}
              unit="Hz"
              format={formatHz}
              onChange={(value) => updateStage(stage.id, (current) => ({ ...current, cutoff: value }))}
            />
            <Slider
              label="Resonancia"
              value={stage.resonance}
              min={0.1}
              max={12}
              step={0.05}
              unit="Q"
              onChange={(value) => updateStage(stage.id, (current) => ({ ...current, resonance: value }))}
            />
            {response ? <MiniResponseChart frequencies={response.frequencies} db={response.db} title="Respuesta del filtro" /> : null}
          </>
        ) : null}

        {stage.type === "gain" ? (
          <Slider
            label="Ganancia"
            value={stage.gain_db}
            min={-36}
            max={24}
            step={0.5}
            unit="dB"
            format={formatDb}
            onChange={(value) => updateStage(stage.id, (current) => ({ ...current, gain_db: value }))}
          />
        ) : null}

        {stage.type === "drive" ? (
          <Slider
            label="Drive"
            value={stage.drive}
            min={0.1}
            max={20}
            scale="log"
            step={0.1}
            format={(value) => `${value.toFixed(1)}×`}
            onChange={(value) => updateStage(stage.id, (current) => ({ ...current, drive: value }))}
          />
        ) : null}

        {stage.type === "delay" ? (
          <>
            <Slider
              label="Tiempo"
              value={stage.delay_ms}
              min={1}
              max={1000}
              scale="log"
              step={1}
              unit="ms"
              format={formatMs}
              onChange={(value) => updateStage(stage.id, (current) => ({ ...current, delay_ms: value }))}
            />
            <Slider
              label="Realimentación"
              value={stage.feedback}
              min={0}
              max={0.9}
              step={0.01}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => updateStage(stage.id, (current) => ({ ...current, feedback: value }))}
            />
            <Slider
              label="Mezcla"
              value={stage.mix}
              min={0}
              max={1}
              step={0.01}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => updateStage(stage.id, (current) => ({ ...current, mix: value }))}
            />
          </>
        ) : null}
      </Section>

      <div className="flex items-center justify-between border-t border-white/7 pt-3">
        <div className="flex gap-1">
          <button type="button" className="icon-button" title="Subir" onClick={() => moveStage(stage.id, -1)}>
            <ChevronUp size={14} />
          </button>
          <button type="button" className="icon-button" title="Bajar" onClick={() => moveStage(stage.id, 1)}>
            <ChevronDown size={14} />
          </button>
        </div>
        <button type="button" className="soft-button hover:text-lab-rose" onClick={() => removeStage(stage.id)}>
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  );
}

function NoteInspector({ note }: { note: NoteEvent }) {
  const updateNote = useProjectStore((state) => state.updateNote);
  const removeNote = useProjectStore((state) => state.removeNote);
  const duration = useProjectStore((state) => state.project.sequence.duration);
  const start = Math.min(note.start, Math.max(0, duration - note.duration));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-lab-amber/40 bg-lab-amber/10 text-lab-amber">
          <Music2 size={16} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-100">{midiToName(note.pitch)}</div>
          <div className="font-mono text-[10px] text-slate-500">{formatHz(midiToFrequency(note.pitch))}</div>
        </div>
      </div>

      <Select
        label="Altura (MIDI)"
        value={String(note.pitch)}
        options={Array.from({ length: 73 }, (_, index) => {
          const pitch = 24 + index;
          return { value: String(pitch), label: `${midiToName(pitch)} · ${pitch}` };
        })}
        onChange={(value) => updateNote(note.id, (current) => ({ ...current, pitch: Number(value) }))}
      />
      <Slider
        label="Inicio"
        value={start}
        min={0}
        max={Math.max(0.05, duration - note.duration)}
        step={0.01}
        unit="s"
        format={(value) => `${value.toFixed(2)} s`}
        onChange={(value) => updateNote(note.id, (current) => ({ ...current, start: value }))}
      />
      <Slider
        label="Duración"
        value={note.duration}
        min={0.05}
        max={Math.max(0.1, duration - start)}
        step={0.01}
        unit="s"
        format={formatSeconds}
        onChange={(value) => updateNote(note.id, (current) => ({ ...current, duration: value }))}
      />
      <Slider
        label="Velocity"
        value={note.velocity}
        min={0.05}
        max={1}
        step={0.01}
        color="#f59e0b"
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(value) => updateNote(note.id, (current) => ({ ...current, velocity: value }))}
      />

      <div className="border-t border-white/7 pt-3">
        <button type="button" className="soft-button hover:text-lab-rose" onClick={() => removeNote(note.id)}>
          <Trash2 size={13} /> Eliminar nota
        </button>
      </div>
    </div>
  );
}

function MetricsPanel() {
  const analysis = useProjectStore((state) => state.analysis);
  if (!analysis) return null;
  const rows: Array<{ label: string; input: string; output: string }> = [
    { label: "Pico", input: `${analysis.metrics.input.peak.toFixed(3)} · ${formatDb(analysis.metrics.input.peak_db)}`, output: `${analysis.metrics.output.peak.toFixed(3)} · ${formatDb(analysis.metrics.output.peak_db)}` },
    { label: "RMS", input: `${analysis.metrics.input.rms.toFixed(3)} · ${formatDb(analysis.metrics.input.rms_db)}`, output: `${analysis.metrics.output.rms.toFixed(3)} · ${formatDb(analysis.metrics.output.rms_db)}` },
    { label: "Cresta", input: formatDb(analysis.metrics.input.crest_db), output: formatDb(analysis.metrics.output.crest_db) },
    { label: "Pico espectral", input: formatHz(analysis.metrics.input.dominant_hz), output: formatHz(analysis.metrics.output.dominant_hz) },
    { label: "Brillo", input: formatHz(analysis.metrics.input.brightness_hz), output: formatHz(analysis.metrics.output.brightness_hz) },
    { label: "Clip", input: `${analysis.metrics.input.clip_percent.toFixed(2)}%`, output: `${analysis.metrics.output.clip_percent.toFixed(2)}%` },
  ];
  return (
    <div className="space-y-2 border-t border-white/7 pt-3">
      <div className="eyebrow">Métricas</div>
      <div className="overflow-hidden rounded-xl border border-white/7">
        <div className="grid grid-cols-[1fr_1.2fr_1.2fr] gap-px bg-white/5 text-[10px] font-semibold text-slate-400">
          <div className="bg-ink-900 px-2.5 py-1.5" />
          <div className="bg-ink-900 px-2.5 py-1.5 text-lab-cyan">Entrada</div>
          <div className="bg-ink-900 px-2.5 py-1.5 text-lab-amber">Salida</div>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_1.2fr_1.2fr] gap-px bg-white/5 font-mono text-[10px]">
            <div className="bg-ink-900 px-2.5 py-1.5 text-slate-500">{row.label}</div>
            <div className="bg-ink-900 px-2.5 py-1.5 text-slate-300">{row.input}</div>
            <div className="bg-ink-900 px-2.5 py-1.5 text-slate-300">{row.output}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="space-y-3">
      <InfoCard
        title="Flujo de la señal"
        text="Las capas generan la ENTRADA. La cadena maestra (bloques) procesa esa mezcla y produce la SALIDA. Selecciona una capa, un bloque o una nota para editarlo."
      />
      <InfoCard
        title="Nota vs drone"
        text="Las capas 'nota' se disparan desde la secuencia de abajo; las capas 'drone' suenan de forma continua. Puedes mezclar ambas."
      />
      <InfoCard
        title="Modelado físico"
        text="La cuerda pulsada usa Karplus-Strong: el retardo define la afinación y el filtro interno amortigua los agudos en cada vuelta."
      />
      <div className="rounded-xl border border-white/7 bg-white/[0.02] p-3 text-[10px] leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-400">Atajos:</span> Espacio = reproducir/pausar · Supr = eliminar selección.
      </div>
    </div>
  );
}

export function Inspector() {
  const selection = useProjectStore((state) => state.selection);
  const project = useProjectStore((state) => state.project);
  const analysis = useProjectStore((state) => state.analysis);

  const layer = selection?.kind === "layer" ? project.patch.layers.find((item) => item.id === selection.id) : undefined;
  const stage = selection?.kind === "stage" ? project.patch.master_chain.find((item) => item.id === selection.id) : undefined;
  const note = selection?.kind === "note" ? project.sequence.events.find((item) => item.id === selection.id) : undefined;
  const responses = analysis?.responses ?? [];

  return (
    <aside className="panel flex min-h-[420px] flex-col overflow-hidden">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Inspector</div>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-100">Detalle</h2>
        </div>
        <SlidersHorizontal size={15} className="text-slate-500" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {layer ? <LayerInspector layer={layer} responses={responses} /> : null}
        {stage ? <StageInspector stage={stage} responses={responses} /> : null}
        {note ? <NoteInspector note={note} /> : null}
        {!layer && !stage && !note ? <EmptyInspector /> : null}
        <div className="mt-4">
          <MetricsPanel />
        </div>
      </div>
    </aside>
  );
}

function updateLayerValue(id: string, updater: ((layer: Layer) => Layer) | Layer) {
  const store = useProjectStore.getState();
  store.updateLayer(id, typeof updater === "function" ? updater : () => updater);
}
