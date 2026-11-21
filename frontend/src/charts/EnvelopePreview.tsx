import type { AmpEnvelope } from "../types";

interface EnvelopePreviewProps {
  envelope: AmpEnvelope;
  height?: number;
}

export function EnvelopePreview({ envelope, height = 72 }: EnvelopePreviewProps) {
  const width = 320;
  const pad = 10;
  const plotWidth = width - pad * 2;
  const plotHeight = height - 20;

  if (!envelope.enabled) {
    return (
      <div className="rounded-xl border border-white/7 bg-white/[0.02] p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          <line x1={pad} y1={18} x2={width - pad} y2={18} stroke="#475569" strokeDasharray="4 4" />
          <text x={width - pad} y={height - 4} textAnchor="end" fontSize="8" fill="#64748b">
            envolvente desactivada
          </text>
        </svg>
      </div>
    );
  }

  const sustainDisplay = 1.0;
  const total = Math.max(0.08, envelope.attack + envelope.decay + sustainDisplay + envelope.release);
  const points: Array<[number, number]> = [
    [0, 0],
    [envelope.attack, 1],
    [envelope.attack + envelope.decay, envelope.sustain],
    [envelope.attack + envelope.decay + sustainDisplay, envelope.sustain],
    [total, 0],
  ];
  const toXY = ([time, level]: [number, number]): [number, number] => [
    pad + (time / total) * plotWidth,
    18 + (1 - level) * plotHeight,
  ];
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${toXY(point).join(",")}`).join(" ");
  const area = `${path} L${toXY(points[points.length - 1])[0]},${18 + plotHeight} L${pad},${18 + plotHeight} Z`;

  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.02] p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="env-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#env-fill)" />
        <path d={path} fill="none" stroke="#22d3ee" strokeWidth="2" />
        {points.map((point, index) => {
          const [x, y] = toXY(point);
          return <circle key={index} cx={x} cy={y} r="2.5" fill="#0d151f" stroke="#22d3ee" strokeWidth="1.5" />;
        })}
        <text x={pad} y={height - 4} fontSize="8" fill="#64748b">
          A {envelope.attack.toFixed(2)} s · D {envelope.decay.toFixed(2)} s · S {envelope.sustain.toFixed(2)} · R {envelope.release.toFixed(2)} s
        </text>
      </svg>
    </div>
  );
}
