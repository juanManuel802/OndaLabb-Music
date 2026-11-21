import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useProjectStore } from "./store/useProjectStore";
import { fetchCapabilities, renderProject, audioUrl } from "./lib/api";
import { loadStoredProject, saveStoredProject } from "./lib/defaults";
import { TopBar } from "./components/TopBar";
import { LayersPanel } from "./components/LayersPanel";
import { Workspace } from "./components/Workspace";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { HelpModal } from "./components/HelpModal";

export default function App() {
  const project = useProjectStore((state) => state.project);
  const renderOptions = useProjectStore((state) => state.renderOptions);
  const status = useProjectStore((state) => state.status);
  const error = useProjectStore((state) => state.error);
  const renderId = useProjectStore((state) => state.renderId);
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const loop = useProjectStore((state) => state.loop);
  const volume = useProjectStore((state) => state.volume);
  const selection = useProjectStore((state) => state.selection);
  const setCapabilities = useProjectStore((state) => state.setCapabilities);
  const loadPreset = useProjectStore((state) => state.loadPreset);
  const setStatus = useProjectStore((state) => state.setStatus);
  const setAnalysis = useProjectStore((state) => state.setAnalysis);
  const setError = useProjectStore((state) => state.setError);
  const setPlaying = useProjectStore((state) => state.setPlaying);
  const removeNote = useProjectStore((state) => state.removeNote);
  const removeLayer = useProjectStore((state) => state.removeLayer);
  const removeStage = useProjectStore((state) => state.removeStage);

  const [helpOpen, setHelpOpen] = useState(false);
  const [channel, setChannel] = useState<"input" | "output">("output");
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initializedRef = useRef(false);
  const renderAbortRef = useRef<AbortController | null>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load capabilities once. If there is no saved project, start from the first preset.
  useEffect(() => {
    const controller = new AbortController();
    fetchCapabilities(controller.signal)
      .then((capabilities) => {
        setCapabilities(capabilities);
        const stored = loadStoredProject();
        if (!initializedRef.current && !stored && capabilities.presets.length) {
          loadPreset(capabilities.presets[0]);
        }
        initializedRef.current = true;
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "No se pudo conectar con el motor Python");
        }
      });
    return () => controller.abort();
  }, [setCapabilities, loadPreset, setError]);

  // Debounced offline render.
  useEffect(() => {
    if (!initializedRef.current) return;
    setStatus("rendering");
    const controller = new AbortController();
    renderAbortRef.current?.abort();
    renderAbortRef.current = controller;
    const timeout = window.setTimeout(() => {
      renderProject(project, renderOptions, controller.signal)
        .then((response) => {
          setAnalysis(response.analysis, response.render_id, response.analysis.meta.compute_ms);
          setCurrentTime(0);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "Error de render");
          }
        });
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [project, renderOptions, setAnalysis, setError, setStatus]);

  // Persist the project.
  useEffect(() => {
    const timeout = window.setTimeout(() => saveStoredProject(project), 250);
    return () => window.clearTimeout(timeout);
  }, [project]);

  // Audio source follows render and channel.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !renderId) return;
    audio.src = audioUrl(renderId, channel);
    audio.load();
    setCurrentTime(0);
    if (isPlayingRef.current) {
      audio.play().catch(() => setPlaying(false));
    }
  }, [renderId, channel, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // Smooth playhead.
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !renderId) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [renderId, setPlaying]);

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      if (event.code === "Space" && !typing) {
        event.preventDefault();
        togglePlay();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !typing && selection?.kind === "note") {
        event.preventDefault();
        removeNote(selection.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, selection, removeNote]);

  if (!useProjectStore.getState().capabilities && status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={18} className="animate-spin text-lab-cyan" />
          Conectando con el motor de OndaLab…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar
        isPlaying={isPlaying}
        channel={channel}
        onTogglePlay={togglePlay}
        onChannelChange={setChannel}
        onHelp={() => setHelpOpen(true)}
      />

      {error ? (
        <div className="mx-auto mt-3 flex max-w-[1800px] items-center gap-2 rounded-xl border border-lab-rose/30 bg-lab-rose/10 px-4 py-2.5 text-xs text-lab-rose">
          <AlertTriangle size={14} />
          <span className="flex-1">{error}</span>
          <button type="button" className="icon-button h-6 w-6" onClick={() => setError(null)} title="Cerrar">
            <X size={12} />
          </button>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1800px] px-4 py-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[290px_minmax(0,1fr)_330px]">
          <LayersPanel />
          <Workspace />
          <Inspector />
        </div>
        <Timeline currentTime={currentTime} />
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <audio ref={audioRef} loop={loop} preload="auto" className="hidden" />
    </div>
  );
}
