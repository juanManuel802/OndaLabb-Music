import { useState } from "react";
import {
  Activity,
  AudioWaveform,
  Guitar,
  Layers,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from "lucide-react";
import { useProjectStore } from "../store/useProjectStore";
import type { Layer, SourceType } from "../types";
import { cn, formatHz, layerSummary, sourceLabel } from "../lib/utils";
import { Slider } from "./controls";

const SOURCE_ICONS: Record<SourceType, typeof Activity> = {
  sine: Activity,
  square: Waves,
  triangle: Waves,
  sawtooth: Waves,
  noise: Wind,
  partials: Layers,
  pluck: Guitar,
};

export function SourceTypeIcon({ type, size = 14 }: { type: SourceType; size?: number }) {
  const Icon = SOURCE_ICONS[type] ?? Activity;
  return <Icon size={size} />;
}

function LayerCard({ layer, index }: { layer: Layer; index: number }) {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const updateLayer = useProjectStore((state) => state.updateLayer);
  const removeLayer = useProjectStore((state) => state.removeLayer);
  const selected = selection?.kind === "layer" && selection.id === layer.id;

  return (
    <button
      type="button"
      onClick={() => select({ kind: "layer", id: layer.id })}
      className={cn(
        "group w-full rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lab-cyan/50",
        selected
          ? "border-lab-cyan/45 bg-lab-cyan/[0.07]"
          : "border-white/7 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]",
        !layer.enabled && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          style={{ color: layer.color, borderColor: `${layer.color}55`, background: `${layer.color}18` }}
        >
          <SourceTypeIcon type={layer.source.type} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-semibold text-slate-200">{layer.name}</div>
            <span className="badge">{layer.trigger === "note" ? "nota" : "drone"}</span>
          </div>
          <div className="mt-0.5 truncate text-[10px] text-slate-500">
            {sourceLabel(layer.source)} · {layerSummary(layer)}
          </div>
        </div>
        <span className="mt-0.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              updateLayer(layer.id, (current) => ({ ...current, enabled: !current.enabled }));
            }}
            className="icon-button h-7 w-7"
            title={layer.enabled ? "Silenciar" : "Activar"}
          >
            {layer.enabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              removeLayer(layer.id);
            }}
            className="icon-button h-7 w-7 hover:text-lab-rose"
            title="Eliminar capa"
          >
            <Trash2 size={13} />
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="w-7 font-mono text-[9px] text-slate-500">{index + 1}</span>
        <Slider
          label=""
          value={layer.gain}
          min={0}
          max={1.6}
          step={0.01}
          color={layer.color}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) => updateLayer(layer.id, (current) => ({ ...current, gain: value }))}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-slate-500">
        <span
          role="button"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            updateLayer(layer.id, (current) => ({ ...current, solo: !current.solo }));
          }}
          className={cn(
            "cursor-pointer rounded px-1.5 py-0.5 transition hover:bg-white/10",
            layer.solo ? "bg-lab-amber/15 text-lab-amber" : "bg-white/[0.04] text-slate-500",
          )}
          title="Escuchar solo esta capa"
        >
          solo
        </span>
        <span className="truncate font-mono">
          {layer.source.type === "noise"
            ? "ruido"
            : layer.trigger === "note"
              ? "pitch de nota"
              : formatHz(layer.source.frequency)}
        </span>
      </div>
    </button>
  );
}

export function LayersPanel() {
  const layers = useProjectStore((state) => state.project.patch.layers);
  const addLayer = useProjectStore((state) => state.addLayer);
  const updateLayer = useProjectStore((state) => state.updateLayer);
  const [menuOpen, setMenuOpen] = useState(false);

  const options: Array<{ type: SourceType; label: string }> = [
    { type: "sine", label: "Seno" },
    { type: "square", label: "Cuadrada" },
    { type: "triangle", label: "Triangular" },
    { type: "sawtooth", label: "Sierra" },
    { type: "noise", label: "Ruido" },
    { type: "partials", label: "Parciales" },
    { type: "pluck", label: "Cuerda pulsada" },
  ];

  return (
    <section className="panel flex min-h-[420px] flex-col overflow-hidden">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Capas</div>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-100">Fuentes de sonido</h2>
        </div>
        <span className="badge">{layers.length}/8</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {layers.map((layer, index) => (
          <LayerCard key={layer.id} layer={layer} index={index} />
        ))}
        {layers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[11px] text-slate-500">
            Añade una fuente para empezar.
          </div>
        ) : null}
      </div>

      <div className="relative border-t border-white/7 p-3">
        <button type="button" className="soft-button w-full" onClick={() => setMenuOpen((value) => !value)}>
          <Plus size={14} /> Añadir capa
        </button>
        {menuOpen ? (
          <div className="absolute bottom-12 left-3 right-3 z-20 animate-fade-in rounded-xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
            {options.map((option) => {
              const Icon = SOURCE_ICONS[option.type];
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    addLayer(option.type);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon size={14} className="text-lab-cyan" />
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/7 p-3 text-[10px] leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-400">Capa nota</span> se dispara desde la secuencia.{" "}
        <span className="font-semibold text-slate-400">Capa drone</span> suena durante toda la secuencia.
      </div>
    </section>
  );
}
