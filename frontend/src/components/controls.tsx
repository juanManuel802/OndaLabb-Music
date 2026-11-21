import type { CSSProperties, ReactNode } from "react";
import { Info } from "lucide-react";
import type { ParamSpec } from "../types";
import { clamp, cn } from "../lib/utils";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  scale?: "linear" | "log";
  unit?: string;
  color?: string;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  scale = "linear",
  unit = "",
  color = "#22d3ee",
  disabled = false,
  format,
  onChange,
}: SliderProps) {
  const safeMin = scale === "log" ? Math.max(1e-9, min) : min;
  const progress =
    scale === "log"
      ? clamp(Math.log(Math.max(value, safeMin) / safeMin) / Math.log(max / safeMin), 0, 1)
      : clamp((value - min) / (max - min), 0, 1);
  const display = format ? format(value) : `${value.toFixed(step < 1 ? 2 : 0)}${unit ? ` ${unit}` : ""}`;

  const handle = (raw: number) => {
    const t = raw / 1000;
    let next = scale === "log" ? safeMin * Math.pow(max / safeMin, t) : min + t * (max - min);
    next = Math.round(next / step) * step;
    next = clamp(next, min, max);
    onChange(next);
  };

  return (
    <label className={cn("block", disabled && "opacity-40")}>
      <span className="field-label">
        <span>{label}</span>
        <span className="mono text-slate-300">{display}</span>
      </span>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        disabled={disabled}
        onChange={(event) => handle(Number(event.target.value))}
        className="slider"
        style={
          {
            "--slider-color": color,
            "--slider-progress": `${progress * 100}%`,
          } as CSSProperties
        }
        aria-label={label}
      />
    </label>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, color = "#22d3ee", description, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border border-white/7 bg-white/[0.025] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-white/15 disabled:opacity-40",
      )}
    >
      <span>
        <span className="block font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-[10px] text-slate-500">{description}</span> : null}
      </span>
      <span
        className="relative h-4 w-7 shrink-0 rounded-full border transition"
        style={{
          background: checked ? `${color}33` : "rgba(148,163,184,0.12)",
          borderColor: checked ? `${color}88` : "rgba(148,163,184,0.2)",
        }}
      >
        <span
          className="absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all"
          style={{ left: checked ? 14 : 2, background: checked ? color : "#64748b" }}
        />
      </span>
    </button>
  );
}

interface SelectProps {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Select({ label, value, options, onChange, disabled }: SelectProps) {
  return (
    <label className={cn("block", disabled && "opacity-40")}>
      {label ? <span className="field-label">{label}</span> : null}
      <select className="select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</h4>
          {description ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InfoCard({ icon, title, text }: { icon?: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-lab-cyan/15 bg-lab-cyan/[0.05] p-3 text-[11px] leading-relaxed text-slate-300">
      <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-lab-cyan">
        {icon ?? <Info size={13} />}
        <span>{title}</span>
      </div>
      <p>{text}</p>
    </div>
  );
}

interface ParamControlProps {
  spec: ParamSpec;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  color?: string;
}

export function ParamControl({ spec, values, onChange, color = "#22d3ee" }: ParamControlProps) {
  if (spec.type === "range" && spec.min !== undefined && spec.max !== undefined) {
    return (
      <Slider
        label={spec.label}
        value={Number(values[spec.key] ?? spec.min)}
        min={spec.min}
        max={spec.max}
        step={spec.step ?? 0.01}
        scale={spec.scale ?? "linear"}
        unit={spec.unit}
        color={color}
        onChange={(value) => onChange(spec.key, value)}
      />
    );
  }
  if (spec.type === "select" && spec.options) {
    return (
      <Select
        label={spec.label}
        value={String(values[spec.key] ?? "")}
        options={spec.options}
        onChange={(value) => onChange(spec.key, value)}
      />
    );
  }
  if (spec.type === "boolean") {
    return (
      <Toggle
        label={spec.label}
        checked={Boolean(values[spec.key])}
        onChange={(value) => onChange(spec.key, value)}
        color={color}
      />
    );
  }
  return null;
}
