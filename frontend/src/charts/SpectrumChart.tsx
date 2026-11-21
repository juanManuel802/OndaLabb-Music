import { useEffect, useLayoutEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { formatHz } from "../lib/utils";

interface SpectrumChartProps {
  frequencies: number[];
  inputDb: number[];
  outputDb: number[];
  height?: number;
}

const TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000];

export function SpectrumChart({ frequencies, inputDb, outputDb, height = 320 }: SpectrumChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxFrequency = frequencies.length ? frequencies[frequencies.length - 1] : 20_000;
    const ticks = TICKS.filter((value) => value <= maxFrequency);
    if (!ticks.length) ticks.push(maxFrequency);

    const xValues = frequencies.length ? frequencies.map((value) => Math.log10(Math.max(1, value))) : [0];
    const data = [xValues, inputDb.length ? inputDb : [0], outputDb.length ? outputDb : [0]] as unknown as uPlot.AlignedData;

    const options: uPlot.Options = {
      width: container.clientWidth,
      height,
      padding: [8, 12, 8, 12],
      legend: { show: true, live: true, isolate: true },
      cursor: { sync: { key: "spectrum" }, points: { size: 5, width: 1, stroke: "#22d3ee", fill: "#22d3ee" } },
      scales: {
        x: { range: [Math.log10(Math.max(10, frequencies[0] ?? 20)), Math.log10(Math.max(20, maxFrequency))] },
        y: { range: [-90, 6] },
      },
      axes: [
        {
          scale: "x",
          stroke: "#64748b",
          font: "10px ui-monospace, monospace",
          labelFont: "10px ui-monospace, monospace",
          grid: { stroke: "rgba(148,163,184,0.08)", width: 1 },
          ticks: { stroke: "rgba(148,163,184,0.16)", width: 1 },
          label: "frecuencia (Hz)",
          labelSize: 16,
          splits: () => ticks.map((value) => Math.log10(value)),
          values: (_u, splits) => splits.map((value) => formatHz(Math.pow(10, Number(value)))),
        },
        {
          scale: "y",
          stroke: "#64748b",
          font: "10px ui-monospace, monospace",
          labelFont: "10px ui-monospace, monospace",
          grid: { stroke: "rgba(148,163,184,0.08)", width: 1 },
          ticks: { stroke: "rgba(148,163,184,0.16)", width: 1 },
          label: "magnitud (dB)",
          labelSize: 16,
        },
      ],
      series: [
        {},
        { label: "Entrada", stroke: "#22d3ee", width: 2, points: { show: false } },
        { label: "Salida", stroke: "#f59e0b", width: 2.2, points: { show: false } },
      ],
    };

    const plot = new uPlot(options, data, container);
    plotRef.current = plot;
    return () => {
      plot.destroy();
      plotRef.current = null;
    };
  }, [frequencies, inputDb, outputDb, height]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot || !frequencies.length) return;
    const n = Math.min(frequencies.length, inputDb.length, outputDb.length);
    plot.setData([
      frequencies.slice(0, n).map((value) => Math.log10(Math.max(1, value))),
      inputDb.slice(0, n),
      outputDb.slice(0, n),
    ] as unknown as uPlot.AlignedData);
  }, [frequencies, inputDb, outputDb]);

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
