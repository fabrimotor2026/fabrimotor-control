import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Gauge, X } from "lucide-react";

import { Button } from "../ui/button";
import { VISUAL_HELP_IMAGES } from "../../modules/VisualHelp/VisualHelpImages.js";

function InfoCard({ label, children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-300 bg-amber-50 text-amber-950",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        tones[tone] || tones.slate
      }`}
    >
      <div className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>

      <div className="mt-2 text-base font-bold leading-relaxed">{children}</div>
    </div>
  );
}

export default function VisualHelpModal({ item, onClose }) {
  const isComparatorHelp = item?.id === "c30" || item?.id === "c40";

  const showVideo = isComparatorHelp;

  const toleranceText =
    item?.type === "number"
      ? isComparatorHelp
        ? `+${item.min} a +${item.max}`
        : item.displayMin && item.displayMax
          ? `${item.displayMin} a ${item.displayMax}`
          : `${item.min} a ${item.max}`
      : "Verificación OK / NO OK";

  const subtitle = [item?.maquina, item?.control].filter(Boolean).join(" · ");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ayuda visual de la cota"
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        style={{
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-5 border-b border-blue-200 bg-gradient-to-r from-blue-950 to-blue-800 px-6 py-5 text-white">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              Control de proceso
            </div>

            <h2 className="mt-1 text-3xl font-black tracking-tight">
              Ayuda visual de la cota
            </h2>

            <p className="mt-2 truncate text-base font-bold text-blue-100">
              {subtitle || "Información del control seleccionado"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ayuda visual"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus:outline-none focus:ring-4 focus:ring-white/40"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isComparatorHelp && (
            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-700" />

                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-emerald-800">
                      Lectura válida del comparador
                    </div>

                    <div className="mt-1 text-4xl font-black text-emerald-950">
                      +{item.min} a +{item.max}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-3xl border-2 border-red-300 bg-red-50 px-6 py-5 text-red-950">
                <AlertTriangle className="h-8 w-8 shrink-0 text-red-700" />

                <div className="max-w-sm text-base font-black leading-snug">
                  Fuera de este intervalo: registrar NO OK y avisar al
                  responsable.
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-800">
                  <Gauge className="h-6 w-6" />
                </div>

                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    Control seleccionado
                  </div>

                  <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">
                    {item?.control}
                  </h3>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <InfoCard label="Tipo de registro">
                  {item?.type === "number"
                    ? "Lectura numérica del comparador"
                    : "Selección OK / NO OK"}
                </InfoCard>

                {!isComparatorHelp && (
                  <InfoCard label="Tolerancia / criterio" tone="blue">
                    <span className="text-2xl font-black">{toleranceText}</span>
                  </InfoCard>
                )}

                {item?.comentario && (
                  <InfoCard label="Útil y método" tone="blue">
                    {item.comentario}
                  </InfoCard>
                )}

                {item?.comentarioExtra && !isComparatorHelp && (
                  <InfoCard label="Indicación importante" tone="amber">
                    {item.comentarioExtra}
                  </InfoCard>
                )}

                {item?.frecuencia && (
                  <InfoCard label="Frecuencia de control" tone="blue">
                    {item.frecuencia}
                  </InfoCard>
                )}

                <InfoCard label="Antes de registrar" tone="amber">
                  Verifica que la pieza y el punto de medición corresponden a
                  esta cota. En caso de duda, avisa al responsable.
                </InfoCard>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-center text-sm font-black uppercase tracking-[0.18em] text-slate-600">
                Esquema de medición
              </div>

              <div
                className="mt-4 flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3"
                style={{
                  minHeight: isComparatorHelp ? "390px" : "320px",
                }}
              >
                {VISUAL_HELP_IMAGES[item?.id] ? (
                  <img
                    src={VISUAL_HELP_IMAGES[item.id]}
                    alt={`Ayuda visual ${item.control}`}
                    className="max-h-[440px] w-full rounded-xl object-contain"
                  />
                ) : (
                  <svg
                    viewBox="0 0 320 260"
                    className="h-full min-h-[300px] w-full"
                    aria-label="Esquema orientativo del punto de control"
                  >
                    <rect
                      x="45"
                      y="75"
                      width="230"
                      height="110"
                      rx="20"
                      fill="#e2e8f0"
                      stroke="#334155"
                      strokeWidth="3"
                    />
                    <circle
                      cx="110"
                      cy="130"
                      r="36"
                      fill="#f8fafc"
                      stroke="#334155"
                      strokeWidth="3"
                    />
                    <circle
                      cx="210"
                      cy="130"
                      r="36"
                      fill="#f8fafc"
                      stroke="#334155"
                      strokeWidth="3"
                    />
                    <line
                      x1="110"
                      y1="48"
                      x2="110"
                      y2="90"
                      stroke="#dc2626"
                      strokeWidth="4"
                      markerEnd="url(#arrow)"
                    />
                    <line
                      x1="210"
                      y1="48"
                      x2="210"
                      y2="90"
                      stroke="#dc2626"
                      strokeWidth="4"
                      markerEnd="url(#arrow)"
                    />
                    <line
                      x1="70"
                      y1="210"
                      x2="250"
                      y2="210"
                      stroke="#2563eb"
                      strokeWidth="4"
                      markerStart="url(#arrowBlue)"
                      markerEnd="url(#arrowBlue)"
                    />
                    <text
                      x="160"
                      y="35"
                      textAnchor="middle"
                      fontSize="18"
                      fontWeight="700"
                      fill="#dc2626"
                    >
                      Punto de control
                    </text>
                    <text
                      x="160"
                      y="238"
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="700"
                      fill="#2563eb"
                    >
                      Localizar zona indicada en plano
                    </text>
                    <defs>
                      <marker
                        id="arrow"
                        markerWidth="10"
                        markerHeight="10"
                        refX="5"
                        refY="5"
                        orient="auto"
                      >
                        <path d="M0,0 L10,5 L0,10 Z" fill="#dc2626" />
                      </marker>
                      <marker
                        id="arrowBlue"
                        markerWidth="10"
                        markerHeight="10"
                        refX="5"
                        refY="5"
                        orient="auto"
                      >
                        <path d="M0,0 L10,5 L0,10 Z" fill="#2563eb" />
                      </marker>
                    </defs>
                  </svg>
                )}
              </div>

              {showVideo && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-base font-black text-slate-950">
                    Vídeo de ayuda
                  </div>

                  <video
                    src="/videos/ayuda-cota.mp4"
                    controls
                    preload="metadata"
                    className="block max-h-[420px] w-full rounded-xl bg-black"
                  >
                    Tu navegador no puede reproducir este vídeo.
                  </video>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
          <div className="text-sm font-bold text-slate-500">
            También puedes cerrar esta ventana pulsando Esc.
          </div>

          <Button
            onClick={onClose}
            className="min-w-36 rounded-xl bg-[#1f6f73] px-6 py-5 text-base font-black text-white hover:bg-[#18595d]"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
