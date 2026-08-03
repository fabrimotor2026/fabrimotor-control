import { X } from "lucide-react";

export default function VisualHelpModal({ item, onClose, imageSrc, videoSrc = "/videos/ayuda-cota.mp4" }) {
  const toleranceText =
    item?.type === "number"
      ? item.id === "c30" || item.id === "c40"
        ? `+${item.min} → +${item.max}`
        : item.displayMin && item.displayMax
        ? `${item.displayMin} → ${item.displayMax}`
        : `${item.min} → ${item.max}`
      : "Verificación OK / NO OK";

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,.65)" }}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-[min(980px,96vw)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-6 py-4">
          <div>
            <h2 className="text-2xl font-black text-blue-900">Ayuda visual de la cota</h2>
            <p className="text-sm text-white text-white font-bold">{item?.maquina} · {item?.control}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-blue-100" aria-label="Cerrar"><X /></button>
        </div>
        <div className="overflow-auto p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-3 text-lg font-black text-slate-900">{item?.control}</h3>
              <p className="text-sm text-slate-700"><strong>Tolerancia / criterio:</strong> {toleranceText}</p>
              {item?.comentario && <p className="mt-3 text-sm text-slate-700"><strong>Comentario:</strong> {item.comentario}</p>}
              {item?.frecuencia && <p className="mt-3 rounded-xl bg-blue-100 p-3 text-sm text-blue-900"><strong>Frecuencia:</strong> {item.frecuencia}</p>}
            </div>
            <div className="space-y-4">
              <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 p-3">
                {imageSrc ? <img src={imageSrc} alt="Ayuda visual" className="max-h-full max-w-full rounded-xl object-contain text-white font-bold" /> : <div className="text-center text-sm text-slate-500">Sin imagen configurada</div>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-bold text-slate-700">Vídeo de ayuda</div>
                <video src={videoSrc} controls preload="metadata" className="w-full rounded-xl bg-black" style={{ maxHeight: 420 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
