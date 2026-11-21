import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, Music2, Piano, Plus } from "lucide-react";
import { useProjectStore } from "../store/useProjectStore";
import type { NoteEvent } from "../types";
import { cn, isBlackKey, midiToName } from "../lib/utils";

const LEFT = 54;
const ROW_H = 13;
const RULER_H = 18;
const MIN_PITCH = 48;
const MAX_PITCH = 72;
const ROWS = Array.from({ length: MAX_PITCH - MIN_PITCH + 1 }, (_, index) => MAX_PITCH - index);

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  original: NoteEvent;
}

export function Timeline({ currentTime }: { currentTime: number }) {
  const duration = useProjectStore((state) => state.project.sequence.duration);
  const events = useProjectStore((state) => state.project.sequence.events);
  const addNote = useProjectStore((state) => state.addNote);
  const updateNote = useProjectStore((state) => state.updateNote);
  const removeNote = useProjectStore((state) => state.removeNote);
  const clearNotes = useProjectStore((state) => state.clearNotes);
  const setDuration = useProjectStore((state) => state.setDuration);
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(700);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setGridWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(200, gridWidth - LEFT);
  const pxPerSecond = plotWidth / Math.max(0.001, duration);
  const gridHeight = ROWS.length * ROW_H;
  const timeStep = duration > 8 ? 1 : duration > 4 ? 0.5 : 0.25;

  const handleAdd = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const start = Math.min(duration - 0.05, Math.max(0, Math.round((x / pxPerSecond) * 20) / 20));
    const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, MAX_PITCH - Math.floor(y / ROW_H)));
    const noteDuration = Math.min(0.5, Math.max(0.05, duration - start));
    addNote(start, pitch, noteDuration, 0.8);
  };

  const beginDrag = (event: PointerEvent<HTMLElement>, note: NoteEvent, mode: DragState["mode"]) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id: note.id, mode, startX: event.clientX, startY: event.clientY, original: { ...note } });
    select({ kind: "note", id: note.id });
  };

  const handleDrag = (event: PointerEvent<HTMLElement>, mode: DragState["mode"]) => {
    if (!drag || drag.mode !== mode) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const original = drag.original;
    if (mode === "move") {
      const nextStart = Math.min(duration - original.duration, Math.max(0, Math.round((original.start + dx / pxPerSecond) * 20) / 20));
      const nextPitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, original.pitch - Math.round(dy / ROW_H)));
      updateNote(original.id, (current) => ({ ...current, start: nextStart, pitch: nextPitch }));
    } else {
      const nextDuration = Math.min(duration - original.start, Math.max(0.05, original.duration + dx / pxPerSecond));
      updateNote(original.id, (current) => ({ ...current, duration: Math.round(nextDuration * 100) / 100 }));
    }
  };

  const endDrag = () => setDrag(null);

  return (
    <section className="panel mt-3 overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <div>
            <div className="eyebrow">Secuencia</div>
            <h2 className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Piano size={15} className="text-lab-amber" /> Notas y eventos
            </h2>
          </div>
          <span className="badge">{events.length} notas</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] text-slate-500">
            duración
            <input
              type="range"
              className="slider w-28"
              min={0}
              max={1000}
              value={Math.round(((duration - 0.5) / 11.5) * 1000)}
              onChange={(event) => setDuration(0.5 + (Number(event.target.value) / 1000) * 11.5)}
            />
            <span className="mono w-10 text-slate-400">{duration.toFixed(2)} s</span>
          </label>
          <button
            type="button"
            className="soft-button hover:text-lab-rose"
            onClick={clearNotes}
            disabled={events.length === 0}
          >
            <Eraser size={13} /> Limpiar
          </button>
        </div>
      </div>

      <div className="p-3">
        <div ref={containerRef} className="overflow-x-auto rounded-xl border border-white/7 bg-ink-900/70">
          <div className="relative" style={{ width: LEFT + plotWidth, height: RULER_H + gridHeight }}>
            <div className="absolute left-0 top-0 flex h-[18px] items-center border-b border-white/7 text-[9px] text-slate-600" style={{ width: LEFT }}>
              <span className="px-2">tecla</span>
            </div>
            <div className="absolute top-0" style={{ left: LEFT, width: plotWidth, height: RULER_H }}>
              {Array.from({ length: Math.floor(duration / timeStep) + 1 }, (_, index) => {
                const time = index * timeStep;
                const left = time * pxPerSecond;
                if (left > plotWidth) return null;
                return (
                  <div key={time} className="absolute top-0 h-full border-l border-white/7" style={{ left }}>
                    <span className="ml-0.5 font-mono text-[8px] text-slate-600">{time.toFixed(timeStep < 1 ? 2 : 1)}s</span>
                  </div>
                );
              })}
            </div>

            <div className="absolute left-0" style={{ top: RULER_H, width: LEFT, height: gridHeight }}>
              {ROWS.map((pitch) => (
                <div key={pitch} className={cn("piano-key", isBlackKey(pitch) && "black")} style={{ height: ROW_H }}>
                  {pitch % 12 === 0 ? midiToName(pitch) : ""}
                </div>
              ))}
            </div>

            <div
              className="absolute cursor-crosshair"
              style={{ left: LEFT, top: RULER_H, width: plotWidth, height: gridHeight }}
              onPointerDown={handleAdd}
            >
              {ROWS.map((pitch) => (
                <div key={pitch} className={cn("border-b", isBlackKey(pitch) ? "border-white/[0.06]" : "border-white/[0.04]")} style={{ height: ROW_H }} />
              ))}
              {Array.from({ length: Math.floor(duration / timeStep) + 1 }, (_, index) => {
                const time = index * timeStep;
                const left = time * pxPerSecond;
                if (left > plotWidth) return null;
                return <div key={time} className="pointer-events-none absolute top-0 h-full border-l border-white/[0.05]" style={{ left }} />;
              })}

              {events.map((note) => {
                if (note.pitch < MIN_PITCH || note.pitch > MAX_PITCH) return null;
                const selected = selection?.kind === "note" && selection.id === note.id;
                const left = note.start * pxPerSecond;
                const width = Math.max(3, note.duration * pxPerSecond);
                const top = (MAX_PITCH - note.pitch) * ROW_H + 1;
                return (
                  <div
                    key={note.id}
                    className={cn("note-block group", selected && "z-10")}
                    style={{
                      left,
                      top,
                      width,
                      color: selected ? "#f59e0b" : "#a78bfa",
                      background: selected ? "rgba(245,158,11,0.75)" : `rgba(167,139,250,${0.35 + note.velocity * 0.45})`,
                    }}
                    onPointerDown={(event) => beginDrag(event, note, "move")}
                    onPointerMove={(event) => handleDrag(event, "move")}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      removeNote(note.id);
                    }}
                    title={`${midiToName(note.pitch)} · ${note.start.toFixed(2)} s · ${note.duration.toFixed(2)} s`}
                  >
                    {width > 34 ? <span className="truncate px-1 font-mono text-[8px] text-white/90">{midiToName(note.pitch)}</span> : null}
                    <span
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize rounded-r"
                      onPointerDown={(event) => beginDrag(event, note, "resize")}
                      onPointerMove={(event) => handleDrag(event, "resize")}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  </div>
                );
              })}

              <div
                className="pointer-events-none absolute top-0 h-full w-px bg-lab-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                style={{ left: Math.min(plotWidth, Math.max(0, currentTime * pxPerSecond)) }}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <Music2 size={12} className="text-lab-amber" />
            <span>Haz clic en una casilla vacía para añadir una nota. Arrastra para moverla; arrastra el borde derecho para cambiar su duración. Doble clic para eliminarla.</span>
          </div>
          <span className="font-mono">{Math.min(currentTime, duration).toFixed(2)} / {duration.toFixed(2)} s</span>
        </div>
      </div>
    </section>
  );
}
