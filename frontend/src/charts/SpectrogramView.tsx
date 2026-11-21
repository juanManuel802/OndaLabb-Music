import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { SpectrogramData } from "../types";
import { cn, formatHz } from "../lib/utils";

interface SpectrogramViewProps {
  data: SpectrogramData | null;
  channel: "input" | "output";
  onChannelChange: (channel: "input" | "output") => void;
  height?: number;
}

const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 18_000];

function colorForDb(db: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, (db + 80) / 80));
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [7, 11, 16]],
    [0.25, [30, 64, 175]],
    [0.55, [34, 211, 238]],
    [0.8, [250, 204, 21]],
    [1.0, [255, 255, 255]],
  ];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const [from, start] = stops[index];
    const [to, end] = stops[index + 1];
    if (t <= to) {
      const local = (t - from) / (to - from);
      return [
        Math.round(start[0] + (end[0] - start[0]) * local),
        Math.round(start[1] + (end[1] - start[1]) * local),
        Math.round(start[2] + (end[2] - start[2]) * local),
      ];
    }
  }
  return [255, 255, 255];
}

export function SpectrogramView({ data, channel, onChannelChange, height = 380 }: SpectrogramViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<{ time: number; frequency: number; db: number } | null>(null);

  const matrix = channel === "input" ? data?.input_db : data?.output_db;
  const frequencies = data?.frequencies ?? [];
  const times = data?.times ?? [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix || !frequencies.length || !times.length) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const left = 48;
    const right = 10;
    const top = 10;
    const bottom = 24;
    const plotWidth = Math.max(20, width - left - right);
    const plotHeight = Math.max(20, height - top - bottom);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#070d14";
    ctx.fillRect(left, top, plotWidth, plotHeight);

    const timeBins = times.length;
    const freqBins = frequencies.length;
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.max(1, timeBins);
    offscreen.height = Math.max(1, freqBins);
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    const image = offCtx.createImageData(offscreen.width, offscreen.height);
    for (let timeIndex = 0; timeIndex < timeBins; timeIndex += 1) {
      const row = matrix[timeIndex];
      for (let freqIndex = 0; freqIndex < freqBins; freqIndex += 1) {
        const db = Number(row?.[freqIndex] ?? -80);
        const [red, green, blue] = colorForDb(db);
        const imageY = freqBins - 1 - freqIndex;
        const offset = (imageY * offscreen.width + timeIndex) * 4;
        image.data[offset] = red;
        image.data[offset + 1] = green;
        image.data[offset + 2] = blue;
        image.data[offset + 3] = 255;
      }
    }
    offCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, left, top, plotWidth, plotHeight);

    // Grid and axes.
    ctx.strokeStyle = "rgba(148,163,184,0.12)";
    ctx.fillStyle = "#64748b";
    ctx.font = "9px ui-monospace, monospace";
    ctx.lineWidth = 1;

    const duration = Math.max(0.001, times[times.length - 1] ?? 1);
    const timeStep = duration > 6 ? 1 : duration > 3 ? 0.5 : 0.25;
    for (let time = 0; time <= duration + 1e-6; time += timeStep) {
      const x = left + (time / duration) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + plotHeight);
      ctx.stroke();
      ctx.fillText(`${time.toFixed(timeStep < 1 ? 2 : 1)} s`, x - 12, height - 8);
    }

    const minFreq = frequencies[0];
    const maxFreq = frequencies[frequencies.length - 1];
    const logMin = Math.log10(Math.max(1, minFreq));
    const logMax = Math.log10(Math.max(logMin + 0.01, maxFreq));
    for (const frequency of FREQ_TICKS) {
      if (frequency < minFreq || frequency > maxFreq) continue;
      const y = top + plotHeight - ((Math.log10(frequency) - logMin) / (logMax - logMin)) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(formatHz(frequency), 4, y + 3);
    }

    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.strokeRect(left, top, plotWidth, plotHeight);
  }, [data, matrix, frequencies, times, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleHover = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!matrix || !frequencies.length || !times.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const left = 48;
    const right = 10;
    const top = 10;
    const bottom = 24;
    const plotWidth = Math.max(20, rect.width - left - right);
    const plotHeight = Math.max(20, rect.height - top - bottom);
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < left || x > left + plotWidth || y < top || y > top + plotHeight) {
      setHover(null);
      return;
    }
    const duration = Math.max(0.001, times[times.length - 1] ?? 1);
    const time = ((x - left) / plotWidth) * duration;
    const minFreq = frequencies[0];
    const maxFreq = frequencies[frequencies.length - 1];
    const logMin = Math.log10(Math.max(1, minFreq));
    const logMax = Math.log10(Math.max(logMin + 0.01, maxFreq));
    const frequency = Math.pow(10, logMin + (1 - (y - top) / plotHeight) * (logMax - logMin));
    const timeIndex = Math.min(times.length - 1, Math.max(0, Math.round((time / duration) * (times.length - 1))));
    const freqIndex = Math.min(frequencies.length - 1, Math.max(0, Math.round(((Math.log10(frequency) - logMin) / (logMax - logMin)) * (frequencies.length - 1))));
    const db = Number(matrix[timeIndex]?.[freqIndex] ?? -80);
    setHover({ time, frequency, db });
  };

  const gradient = useMemo(
    () => "linear-gradient(90deg, #070b10, #1e40af, #22d3ee, #facc15, #ffffff)",
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/7 bg-white/[0.025] p-1">
          <button
            type="button"
            onClick={() => onChannelChange("input")}
            className={cn("tab-button", channel === "input" && "tab-button-active")}
          >
            Entrada
          </button>
          <button
            type="button"
            onClick={() => onChannelChange("output")}
            className={cn("tab-button", channel === "output" && "tab-button-active")}
          >
            Salida
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">-80 dB</span>
          <div className="h-2 w-32 rounded-full" style={{ background: gradient }} />
          <span className="font-mono text-[10px] text-slate-500">0 dB</span>
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-white/7 bg-ink-900">
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          onMouseMove={handleHover}
          onMouseLeave={() => setHover(null)}
          className="block"
        />
        {hover ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-white/10 bg-ink-950/90 px-2.5 py-1.5 font-mono text-[10px] text-slate-300 shadow-xl">
            <div>{hover.time.toFixed(2)} s</div>
            <div>{formatHz(hover.frequency)}</div>
            <div>{hover.db.toFixed(1)} dB</div>
          </div>
        ) : null}
        {!data ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            Sin datos de espectrograma
          </div>
        ) : null}
      </div>
    </div>
  );
}
