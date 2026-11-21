import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  Gauge,
  Plus,
  Power,
  Trash2,
  Zap,
} from "lucide-react";
import { useProjectStore } from "../store/useProjectStore";
import type { Stage, StageType } from "../types";
import { cn, stageSummary, STAGE_LABELS } from "../lib/utils";

const STAGE_ICONS: Record<StageType, typeof Filter> = {
  filter: Filter,
  gain: Gauge,
  drive: Zap,
  delay: Clock3,
};

const STAGE_COLORS: Record<StageType, string> = {
  filter: "#38bdf8",
  gain: "#34d399",
  drive: "#fb7185",
  delay: "#a78bfa",
};

function StageChip({ stage, index }: { stage: Stage; index: number }) {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const updateStage = useProjectStore((state) => state.updateStage);
  const removeStage = useProjectStore((state) => state.removeStage);
  const moveStage = useProjectStore((state) => state.moveStage);
  const selected = selection?.kind === "stage" && selection.id === stage.id;
  const color = STAGE_COLORS[stage.type];
  const Icon = STAGE_ICONS[stage.type];

  return (
    <div
      className={cn(
        "group relative flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 transition",
        selected ? "border-lab-cyan/45 bg-lab-cyan/[0.08]" : "border-white/8 bg-white/[0.03]",
        !stage.enabled && "opacity-45",
      )}
    >
      <button type="button" onClick={() => select({ kind: "stage", id: stage.id })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
          style={{ color, borderColor: `${color}55`, background: `${color}15` }}
        >
          <Icon size={13} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold text-slate-200">
            {index + 1}. {STAGE_LABELS[stage.type]}
          </span>
          <span className="block truncate font-mono text-[9px] text-slate-500">{stageSummary(stage)}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          className="icon-button h-6 w-6"
          title={stage.enabled ? "Saltar bloque" : "Activar bloque"}
          onClick={() => updateStage(stage.id, (current) => ({ ...current, enabled: !current.enabled }))}
        >
          <Power size={11} />
        </button>
        <button
          type="button"
          className="icon-button h-6 w-6"
          title="Subir"
          onClick={() => moveStage(stage.id, -1)}
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          className="icon-button h-6 w-6"
          title="Bajar"
          onClick={() => moveStage(stage.id, 1)}
        >
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          className="icon-button h-6 w-6 hover:text-lab-rose"
          title="Eliminar"
          onClick={() => removeStage(stage.id)}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export function ChainRow() {
  const chain = useProjectStore((state) => state.project.patch.master_chain);
  const addStage = useProjectStore((state) => state.addStage);
  const [open, setOpen] = useState(false);

  const options: StageType[] = ["filter", "gain", "drive", "delay"];

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Sistema</span>
      {chain.length === 0 ? <span className="text-[10px] text-slate-600">sin bloques · señal seca</span> : null}
      {chain.map((stage, index) => (
        <div key={stage.id} className="flex items-center gap-1.5">
          <StageChip stage={stage} index={index} />
          {index < chain.length - 1 ? <ArrowDown size={12} className="hidden rotate-270 text-slate-600 xl:block" /> : null}
        </div>
      ))}
      <div className="relative">
        <button type="button" className="soft-button px-2 py-1.5" onClick={() => setOpen((value) => !value)}>
          <Plus size={13} /> bloque
        </button>
        {open ? (
          <div className="absolute left-0 top-9 z-30 w-40 animate-fade-in rounded-xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
            {options.map((type) => {
              const Icon = STAGE_ICONS[type];
              const color = STAGE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    addStage(type);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon size={14} style={{ color }} />
                  {STAGE_LABELS[type]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
