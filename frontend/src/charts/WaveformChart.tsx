import { useEffect, useLayoutEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export interface WaveSeries {
  label: string;
  data: number[];
  color: string;
  width?: number;
  fill?: string;
  dash?: number[];
  hideInLegend?: boolean;
}

interface WaveformChartProps {
  timeMs: number[];
  series: WaveSeries[];
  height?: number;
  syncKey?: string;
  legend?: boolean;
  yLabel?: string;
}

function buildData(timeMs: number[], series: WaveSeries[]): uPlot.AlignedData {
  const columns: Array<number[]> = [timeMs];
  for (const item of series) {
    columns.push(item.data);
  }
  return columns as unknown as uPlot.AlignedData;
}

export function WaveformChart({
  timeMs,
  series,
  height = 220,
  syncKey,
  legend = true,
  yLabel = "Amplitud",
}: WaveformChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const seriesSignature = series
    .map((item) => `${item.label}:${item.color}:${item.width ?? 2}:${item.fill ?? ""}:${item.dash?.join(",") ?? ""}`)
    .join("|");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const initialData = buildData(timeMs, series);
    const options: uPlot.Options = {
      width,
      height,
      padding: [8, 12, 8, 10],
      legend: { show: legend, live: true, isolate: true },
      cursor: {
        sync: syncKey ? { key: syncKey } : undefined,
        drag: { x: true, y: false, setScale: true },
        points: { size: 5, width: 1, stroke: "#22d3ee", fill: "#22d3ee" },
      },
      scales: {
        x: { time: false },
        y: {
          range: (_u, min, max) => {
            if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1];
            if (max - min < 0.005) return [min - 0.05, max + 0.05];
            return [min, max];
          },
        },
      },
      axes: [
        {
          scale: "x",
          stroke: "#64748b",
          font: "10px ui-monospace, monospace",
          labelFont: "10px ui-monospace, monospace",
          grid: { stroke: "rgba(148,163,184,0.08)", width: 1 },
          ticks: { stroke: "rgba(148,163,184,0.16)", width: 1 },
          label: "tiempo (ms)",
          labelSize: 16,
          values: (_u, splits) => splits.map((value) => value.toFixed(value < 100 ? 1 : 0)),
        },
        {
          scale: "y",
          stroke: "#64748b",
          font: "10px ui-monospace, monospace",
          labelFont: "10px ui-monospace, monospace",
          grid: { stroke: "rgba(148,163,184,0.07)", width: 1 },
          ticks: { stroke: "rgba(148,163,184,0.16)", width: 1 },
          label: yLabel,
          labelSize: 16,
        },
      ],
      series: [
        {},
        ...series.map((item) => ({
          label: item.label,
          stroke: item.color,
          width: item.width ?? 1.8,
          fill: item.fill,
          dash: item.dash,
          points: { show: false },
          hideInLegend: item.hideInLegend,
        })),
      ],
    };

    const plot = new uPlot(options, initialData, container);
    plotRef.current = plot;
    return () => {
      plot.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesSignature, height, legend, syncKey, yLabel]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const maxLength = Math.min(timeMs.length, ...series.map((item) => item.data.length));
    if (maxLength <= 0) return;
    const data = buildData(timeMs.slice(0, maxLength), series.map((item) => ({ ...item, data: item.data.slice(0, maxLength) })));
    plot.setData(data);
  }, [timeMs, series]);

  useEffect(() => {
    const container = containerRef.current;
    const plot = plotRef.current;
    if (!container || !plot) return;
    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      if (width > 0) plot.setSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [height]);

  return <div ref={containerRef} className="w-full" />;
}
