import { useRef } from "react";
import {
  Activity,
  CircleHelp,
  Download,
  FolderOpen,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Save,
  Volume2,
  Waves,
} from "lucide-react";
import { useProjectStore } from "../store/useProjectStore";
import { cn, downloadText, formatMs, readFileAsText } from "../lib/utils";
import { downloadAudio } from "../lib/api";

interface TopBarProps {
  isPlaying: boolean;
  channel: "input" | "output";
  onTogglePlay: () => void;
  onChannelChange: (channel: "input" | "output") => void;
  onHelp: () => void;
}

export function TopBar({ isPlaying, channel, onTogglePlay, onChannelChange, onHelp }: TopBarProps) {
  const capabilities = useProjectStore((state) => state.capabilities);
  const activePresetId = useProjectStore((state) => state.activePresetId);
  const loadPreset = useProjectStore((state) => state.loadPreset);
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const status = useProjectStore((state) => state.status);
  const renderId = useProjectStore((state) => state.renderId);
  const lastComputeMs = useProjectStore((state) => state.lastComputeMs);
  const loop = useProjectStore((state) => state.loop);
  const setLoop = useProjectStore((state) => state.setLoop);
  const volume = useProjectStore((state) => state.volume);
  const setVolume = useProjectStore((state) => state.setVolume);
  const setError = useProjectStore((state) => state.setError);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    downloadText(JSON.stringify(project, null, 2), "ondalab-proyecto.json");
  };

  const handleLoadFile = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text) as typeof project;
      if (!parsed?.patch || !parsed?.sequence || parsed.patch.version !== 1) {
        throw new Error("formato no válido");
      }
      setProject(parsed);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo cargar el proyecto");
    }
  };

  const handleExport = async () => {
    if (!renderId) return;
    try {
      await downloadAudio(renderId, channel);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo exportar");
    }
  };

  const statusColor = status === "ready" ? "bg-lab-emerald" : status === "rendering" ? "bg-lab-amber animate-pulse-soft" : status === "error" ? "bg-lab-rose" : "bg-slate-500";

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lab-cyan to-lab-violet text-ink-950 shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)]">
            <Waves size={18} strokeWidth={2.4} />
          </span>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">OndaLab</div>
            <div className="hidden text-[9px] uppercase tracking-[0.18em] text-slate-500 sm:block">laboratorio de sonido</div>
          </div>
        </div>

        <div className="ml-2 hidden items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-1.5 md:flex">
          <Activity size={13} className="text-slate-500" />
          <span className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
          <span className="font-mono text-[10px] text-slate-400">
            {status === "ready" && lastComputeMs ? `${formatMs(lastComputeMs)}` : status === "rendering" ? "renderizando…" : status === "error" ? "error" : "listo"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <select
            className="select max-w-md"
            value={activePresetId ?? ""}
            disabled={!capabilities}
            onChange={(event) => {
              const preset = capabilities?.presets.find((item) => item.id === event.target.value);
              if (preset) loadPreset(preset);
            }}
            title={capabilities?.presets.find((item) => item.id === activePresetId)?.description}
          >
            {!activePresetId ? <option value="">Personalizado</option> : null}
            {capabilities?.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="primary-button h-9" onClick={onTogglePlay} disabled={!renderId} title="Reproducir / pausar (Espacio)">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span className="hidden sm:inline">{isPlaying ? "Pausar" : "Reproducir"}</span>
          </button>
          <button
            type="button"
            className={cn("icon-button", loop && "border-lab-cyan/30 bg-lab-cyan/10 text-lab-cyan")}
            onClick={() => setLoop(!loop)}
            title={loop ? "Bucle activado" : "Bucle desactivado"}
          >
            <Repeat size={14} />
          </button>
          <label className="hidden items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2 py-1.5 sm:flex">
            <Volume2 size={14} className="text-slate-400" />
            <input
              type="range"
              className="slider w-20"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
            />
          </label>
          <select className="select w-24" value={channel} onChange={(event) => onChannelChange(event.target.value as "input" | "output")} title="Señal que se reproduce">
            <option value="output">Salida</option>
            <option value="input">Entrada</option>
          </select>

          <button type="button" className="soft-button" onClick={handleExport} disabled={!renderId} title="Exportar WAV">
            <Download size={13} /> <span className="hidden lg:inline">WAV</span>
          </button>
          <button type="button" className="icon-button" onClick={handleSave} title="Guardar proyecto JSON">
            <Save size={14} />
          </button>
          <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()} title="Cargar proyecto JSON">
            <FolderOpen size={14} />
          </button>
          <button type="button" className="icon-button" onClick={resetProject} title="Restablecer preset inicial">
            <RotateCcw size={14} />
          </button>
          <button type="button" className="icon-button" onClick={onHelp} title="Ayuda">
            <CircleHelp size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleLoadFile(file);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </header>
  );
}
