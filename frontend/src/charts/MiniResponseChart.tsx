import { formatHz } from "../lib/utils";

interface MiniResponseChartProps {
  frequencies: number[];
  db: number[];
  color?: string;
  height?: number;
  title?: string;
}

export function MiniResponseChart({ frequencies, db, color = "#38bdf8", height = 92, title }: MiniResponseChartProps) {
  const width = 320;
  const left = 8;
  const right = 8;
  const top = 10;
  const bottom = 18;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  if (!frequencies.length || !db.length) {
    return <div className="rounded-lg border border-white/7 bg-white/[0.02] p-3 text-[11px] text-slate-500">Sin filtro activo</div>;
  }

  const logMin = Math.log10(Math.max(1, frequencies[0]));
  const logMax = Math.log10(Math.max(logMin + 0.01, frequencies[frequencies.length - 1]));
  const points: string[] = [];
  for (let index = 0; index < frequencies.length; index += 1) {
    const x = left + ((Math.log10(frequencies[index]) - logMin) / (logMax - logMin)) * plotWidth;
    const y = top + ((Math.max(-60, Math.min(6, db[index])) + 60) / 66) * plotHeight;
    points.push(`${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const area = `${points.join(" ")} L${left + plotWidth},${top + plotHeight} L${left},${top + plotHeight} Z`;

  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.02] p-2">
      {title ? <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{title}</div> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id={`response-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 18_000].map((tick) => {
          if (tick < frequencies[0] || tick > frequencies[frequencies.length - 1]) return null;
          const x = left + ((Math.log10(tick) - logMin) / (logMax - logMin)) * plotWidth;
          return (
            <g key={tick}>
              <line x1={x} y1={top} x2={x} y2={top + plotHeight} stroke="rgba(148,163,184,0.08)" />
              <text x={x} y={height - 5} textAnchor="middle" fontSize="7" fill="#64748b">
                {formatHz(tick).replace(" ", "")}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#response-${color.replace("#", "")})`} />
        <path d={points.join(" ")} fill="none" stroke={color} strokeWidth="1.8" />
      </svg>
    </div>
  );
}
