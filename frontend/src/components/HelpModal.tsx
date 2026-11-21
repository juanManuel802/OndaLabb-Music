import { Activity, Guitar, Waves, X } from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="eyebrow">Guía rápida</div>
            <h2 className="mt-1 text-lg font-bold text-white">Cómo funciona OndaLab</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-lab-cyan"><Waves size={15} /> Flujo de la señal</h3>
            <p>
              Las <strong>capas</strong> generan la <strong>ENTRADA</strong>. La <strong>cadena maestra</strong> (filtro, ganancia,
              saturación, eco) procesa esa mezcla y produce la <strong>SALIDA</strong>. Cambia el orden de los bloques y observa cómo
              cambian la onda, el espectro y el espectrograma.
            </p>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-lab-amber"><Activity size={15} /> Notas y drones</h3>
            <p>
              Una capa <strong>nota</strong> se dispara desde la secuencia de abajo. Una capa <strong>drone</strong> suena de forma
              continua. Puedes mezclar ambas y dibujar acordes o arpegios con el ratón.
            </p>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-lab-violet"><Guitar size={15} /> Modelado físico</h3>
            <p>
              La <strong>cuerda pulsada</strong> usa Karplus-Strong: un ruido recorre una línea de retardo que define la afinación. Un
              filtro interno amortigua los agudos en cada vuelta, y la realimentación mantiene la vibración. Prueba a cambiar el
              <strong> brillo</strong>, el <strong>punto del pellizco</strong> y el <strong>decaimiento</strong>.
            </p>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <h3 className="mb-2 font-semibold text-slate-100">Análisis</h3>
            <ul className="list-disc space-y-1 pl-5 text-slate-400">
              <li><strong>Ondas</strong>: entrada y salida sincronizadas; puedes mostrar las capas por separado.</li>
              <li><strong>Espectro</strong>: magnitud de entrada y salida en escala logarítmica.</li>
              <li><strong>Espectrograma</strong>: evolución temporal de las frecuencias; ideal para ver ataques y caídas.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <h3 className="mb-2 font-semibold text-slate-100">Atajos</h3>
            <p className="text-slate-400">Espacio: reproducir/pausar · Supr: eliminar nota seleccionada · Doble clic sobre nota: eliminar.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
