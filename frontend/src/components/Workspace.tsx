import {
  Activity,
  AudioLines,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  Waves,
} from "lucide-react";
import { useProjectStore } from "../store/useProjectStore";
import type { AnalysisTab } from "../types";
import { cn, formatMs } from "../lib/utils";
import { ChainRow } from "./ChainRow";
import { WaveformChart, type WaveSeries } from "../charts/WaveformChart";
import { SpectrumChart } from "../charts/SpectrumChart";
import { SpectrogramView } from "../charts/SpectrogramView";

function normalizeSeries(series: WaveSeries[], enabled: boolean): WaveSeries[] {
  if (!enabled) return series;
  const peak = Math.max(1e-6, ...series.map((item) => Math.max(...item.data.map(Math.abs))));
  return series.map((item) => ({
    ...item,
    data: item.data.map((value) => value / peak),
  }));
}

const WINDOW_OPTIONS = [0.05, 0.1, 0.2, 0.5, 1.0];

export function Workspace() {
  const analysis = useProjectStore((state) => state.analysis);
  const view = useProjectStore((state) => state.view);
  const setView = useProjectStore((state) => state.setView);
  const renderOptions = useProjectStore((state) => state.renderOptions);
  const setRenderOptions = useProjectStore((state) => state.setRenderOptions);

  const duration = analysis?.meta.render_seconds ?? 4.8;
  const windowSeconds = Math.min(renderOptions.window_seconds, duration);
  const windowStart = Math.min(renderOptions.window_start, Math.max(0, duration - windowSeconds));

  const tabs: Array<{ id: AnalysisTab; label: string; icon: typeof Activity }> = [
    { id: "waves", label: "Ondas", icon: AudioLines },
    { id: "spectrum", label: "Espectro", icon: Activity },
    { id: "spectrogram", label: "Espectrograma", icon: Waves },
  ];

  const inputSeries: WaveSeries[] = analysis
    ? [
        {
          label: "Entrada",
          data: analysis.input,
          color: "#22d3ee",
          width: 2,
          fill: "rgba(34,211,238,0.10)",
        },
        ...(view.showLayers
          ? analysis.layers.map((layer) => ({
              label: layer.name,
              data: layer.samples,
              color: layer.color,
              width: 1,
              hideInLegend: false,
            }))
          : []),
      ]
    : [];

  const outputSeries: WaveSeries[] = analysis
    ? normalizeSeries(
        [
          {
            label: "Salida",
            data: analysis.output,
            color: "#f59e0b",
            width: 2.2,
            fill: "rgba(245,158,11,0.10)",
          },
          ...(view.showInputGhost
            ? [
                {
                  label: "Entrada (fantasma)",
                  data: analysis.input,
                  color: "#22d3ee",
                  width: 1,
                  dash: [4, 4],
                  hideInLegend: false,
                },
              ]
            : []),
        ],
        view.normalize,
      )
    : [];

  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/7 bg-white/[0.025] p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView({ tab: tab.id })}
                className={cn("tab-button", view.tab === tab.id && "tab-button-active")}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {view.tab === "waves" ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10px] text-slate-500">
              inicio
              <input
                type="range"
                className="slider w-28"
                min={0}
                max={1000}
                value={Math.round((windowStart / Math.max(0.001, duration - windowSeconds)) * 1000)}
                onChange={(event) => {
                  const ratio = Number(event.target.value) / 1000;
                  setRenderOptions({ window_start: ratio * Math.max(0, duration - windowSeconds) });
                }}
              />
              <span className="mono w-14 text-slate-400">{formatMs(windowStart * 1000)}</span>
            </label>
            <select
              className="select w-20"
              value={windowSeconds}
              onChange={(event) => setRenderOptions({ window_seconds: Number(event.target.value) })}
              title="Ancho de la ventana de visualización"
            >
              {WINDOW_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatMs(value * 1000)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-button"
              title={view.showLayers ? "Ocultar capas" : "Mostrar capas"}
              onClick={() => setView({ showLayers: !view.showLayers })}
            >
              {view.showLayers ? <Layers size={14} className="text-lab-cyan" /> : <Layers size={14} />}
            </button>
            <button
              type="button"
              className="icon-button"
              title={view.showInputGhost ? "Ocultar entrada en la salida" : "Mostrar entrada en la salida"}
              onClick={() => setView({ showInputGhost: !view.showInputGhost })}
            >
              {view.showInputGhost ? <Eye size={14} className="text-lab-cyan" /> : <EyeOff size={14} />}
            </button>
            <button
              type="button"
              className="icon-button"
              title={view.normalize ? "Ver amplitud real" : "Normalizar a pico"}
              onClick={() => setView({ normalize: !view.normalize })}
            >
              {view.normalize ? <Minimize2 size={14} className="text-lab-cyan" /> : <Maximize2 size={14} />}
            </button>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <span className="badge">{analysis ? `${analysis.meta.points} puntos` : "—"}</span>
          <span className="badge">{analysis ? `${Math.round(analysis.meta.sample_rate / 1000)} kHz` : "—"}</span>
        </div>
      </div>

      <div className="border-b border-white/7 px-4 py-3">
        <ChainRow />
      </div>

      <div className="p-4">
        {view.tab === "waves" ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Entrada · mezcla de capas
                </h3>
                <span className="font-mono text-[10px] text-slate-500">{formatMs(windowSeconds * 1000)}</span>
              </div>
              <div className="rounded-xl border border-white/7 bg-ink-900/60 p-2">
                {analysis ? (
                  <WaveformChart timeMs={analysis.time_ms} series={inputSeries} height={230} syncKey="waveform" />
                ) : (
                  <div className="flex h-[230px] items-center justify-center text-xs text-slate-500">Renderizando…</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em]">sistema</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Salida · después de la cadena maestra
                </h3>
                {analysis ? (
                  <span className={cn("font-mono text-[10px]", analysis.metrics.output.clip_percent > 0.01 ? "text-lab-rose" : "text-slate-500")}>
                    clip {analysis.metrics.output.clip_percent.toFixed(2)}%
                  </span>
                ) : null}
              </div>
              <div className="rounded-xl border border-white/7 bg-ink-900/60 p-2">
                {analysis ? (
                  <WaveformChart timeMs={analysis.time_ms} series={outputSeries} height={230} syncKey="waveform" />
                ) : (
                  <div className="flex h-[230px] items-center justify-center text-xs text-slate-500">Renderizando…</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {view.tab === "spectrum" ? (
          <div className="rounded-xl border border-white/7 bg-ink-900/60 p-2">
            {analysis ? (
              <SpectrumChart
                frequencies={analysis.spectrum.frequencies}
                inputDb={analysis.spectrum.input_db}
                outputDb={analysis.spectrum.output_db}
                height={440}
              />
            ) : (
              <div className="flex h-[440px] items-center justify-center text-xs text-slate-500">Renderizando…</div>
            )}
          </div>
        ) : null}

        {view.tab === "spectrogram" ? (
          <div className="rounded-xl border border-white/7 bg-ink-900/60 p-3">
            {analysis ? (
              <SpectrogramView
                data={analysis.spectrogram}
                channel={view.spectrogramChannel}
                onChannelChange={(channel) => setView({ spectrogramChannel: channel })}
                height={440}
              />
            ) : (
              <div className="flex h-[440px] items-center justify-center text-xs text-slate-500">Renderizando…</div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
