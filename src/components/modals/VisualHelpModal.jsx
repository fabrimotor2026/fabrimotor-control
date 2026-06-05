import { X } from "lucide-react";
import { Button } from "../ui/button";
import { VISUAL_HELP_IMAGES } from "../../data/constants";

export default function VisualHelpModal({ item, onClose }) {
  const showVideo = item?.id === "c30" || item?.id === "c40";

  const toleranceText =
    item.type === "number"
      ? item.id === "c30" || item.id === "c40"
        ? `+${item.min} → +${item.max}`
        : item.displayMin && item.displayMax
        ? `${item.displayMin} → ${item.displayMax}`
        : `${item.min} → ${item.max}`
      : "Verificación OK / NO OK";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ayuda visual de la cota"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "24px",
          backgroundColor: "#ffffff",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            borderBottom: "1px solid #bfdbfe",
            backgroundColor: "#eff6ff",
            padding: "18px 22px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 900,
                color: "#1e3a8a",
              }}
            >
              Ayuda visual de la cota
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "14px",
                color: "#1d4ed8",
              }}
            >
              {item.maquina} · {item.control}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar ayuda visual"
            style={{
              border: 0,
              borderRadius: "999px",
              backgroundColor: "transparent",
              cursor: "pointer",
              padding: "8px",
              color: "#0f172a",
            }}
          >
            <X style={{ width: "26px", height: "26px" }} />
          </button>
        </div>

        <div style={{ overflow: "auto", padding: "24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 340px)",
              gap: "20px",
            }}
          >
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                backgroundColor: "#f8fafc",
                padding: "20px",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {item.control}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  fontSize: "14px",
                  color: "#334155",
                }}
              >
                <div style={{ borderRadius: "12px", backgroundColor: "white", padding: "12px" }}>
                  <strong>Tipo de registro: </strong>
                  {item.type === "number" ? "Valor numérico" : "OK / NO OK"}
                </div>

                <div style={{ borderRadius: "12px", backgroundColor: "white", padding: "12px" }}>
                  <strong>Tolerancia / criterio: </strong>
                  {toleranceText}
                </div>

                {item.comentario && (
                  <div style={{ borderRadius: "12px", backgroundColor: "white", padding: "12px" }}>
                    <strong>Útil / comentario: </strong>
                    {item.comentario}
                  </div>
                )}

                {item.frecuencia && (
                  <div
                    style={{
                      borderRadius: "12px",
                      backgroundColor: "#dbeafe",
                      padding: "12px",
                      color: "#1e3a8a",
                    }}
                  >
                    <strong>Frecuencia: </strong>
                    {item.frecuencia}
                  </div>
                )}

                <div
                  style={{
                    border: "1px solid #fcd34d",
                    borderRadius: "12px",
                    backgroundColor: "#fffbeb",
                    padding: "12px",
                    color: "#92400e",
                  }}
                >
                  Verifica que la pieza corresponde a esta cota antes de introducir el dato.
                  En caso de duda, avisar al encargado.
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "18px",
                backgroundColor: "white",
                padding: "16px",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                Esquema orientativo
              </div>

              <div
                style={{
                  height: "290px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "18px",
                  backgroundColor: "#f1f5f9",
                  padding: "12px",
                }}
              >
                {VISUAL_HELP_IMAGES[item.id] ? (
                  <img
                    src={VISUAL_HELP_IMAGES[item.id]}
                    alt={`Ayuda visual ${item.control}`}
                    style={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                      borderRadius: "12px",
                    }}
                  />
                ) : (
                  <svg viewBox="0 0 320 260" style={{ height: "100%", width: "100%" }}>
                    <rect x="45" y="75" width="230" height="110" rx="20" fill="#e2e8f0" stroke="#334155" strokeWidth="3" />
                    <circle cx="110" cy="130" r="36" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
                    <circle cx="210" cy="130" r="36" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
                    <line x1="110" y1="48" x2="110" y2="90" stroke="#dc2626" strokeWidth="4" markerEnd="url(#arrow)" />
                    <line x1="210" y1="48" x2="210" y2="90" stroke="#dc2626" strokeWidth="4" markerEnd="url(#arrow)" />
                    <line x1="70" y1="210" x2="250" y2="210" stroke="#2563eb" strokeWidth="4" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
                    <text x="160" y="35" textAnchor="middle" fontSize="18" fontWeight="700" fill="#dc2626">
                      Punto de control
                    </text>
                    <text x="160" y="238" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2563eb">
                      Localizar zona indicada en plano
                    </text>
                    <defs>
                      <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 Z" fill="#dc2626" />
                      </marker>
                      <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 Z" fill="#2563eb" />
                      </marker>
                    </defs>
                  </svg>
                )}
              </div>

              {showVideo && (
                <div
                  style={{
                    marginTop: "16px",
                    borderRadius: "16px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "10px",
                      fontSize: "14px",
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    Vídeo de ayuda
                  </div>

                  <video
                    src="/videos/ayuda-cota.mp4"
                    controls
                    preload="metadata"
                    style={{
                      width: "100%",
                      maxHeight: "420px",
                      borderRadius: "14px",
                      backgroundColor: "#000000",
                      display: "block",
                    }}
                  >
                    Tu navegador no puede reproducir este vídeo.
                  </video>

                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    Coloca el archivo de vídeo en: public/videos/ayuda-cota.mp4
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  padding: "12px",
                  fontSize: "12px",
                  color: "#475569",
                }}
              >
                Este esquema es orientativo. Puede sustituirse por una imagen real del plano o fotografía de la zona de medición.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid #e2e8f0",
            padding: "16px",
          }}
        >
          <Button
  onClick={onClose}
  className="rounded-xl bg-[#1f6f73] text-white font-bold hover:bg-[#18595d]"
>
  Cerrar
</Button>
        </div>
      </div>
    </div>
  );
}
