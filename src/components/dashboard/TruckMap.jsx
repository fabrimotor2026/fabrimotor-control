import React, { useMemo } from "react";

function buildSlots(boxes, capacity) {
  const safeBoxes = Array.isArray(boxes) ? boxes : [];
  const targetCapacity = Math.max(Number(capacity || 0), safeBoxes.length, 1);

  return Array.from({ length: targetCapacity }, (_, index) => ({
    index,
    box: safeBoxes[index] || null,
  }));
}

function shortBoxNumber(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  const parts = text.split("-");
  if (parts.length >= 3) {
    return `${parts[0]}-${parts[1]}\n${parts.slice(2).join("-")}`;
  }
  return text;
}

function getTooltip(box) {
  if (!box) return "Hueco libre";
  return [
    `Caja ${box.numeroCaja || "-"}`,
    `Operario: ${box.operario || "-"}`,
    `Fecha: ${box.fecha || "-"}`,
    `Piezas: ${box.totalPiezas || 0}`,
    ...(box.combinaciones || []),
  ]
    .filter(Boolean)
    .join("\n");
}

export default function TruckMap({
  boxes = [],
  capacity = 49,
  selectedBoxNumber = "",
  onSelectBox,
  searchValue = "",
}) {
  const slots = useMemo(() => buildSlots(boxes, capacity), [boxes, capacity]);
  const columns = Math.max(4, Math.ceil(Math.sqrt(Math.max(Number(capacity || 49), 1))));
  const normalizedSearch = String(searchValue || "").trim().toLowerCase();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Mapa visual del camión</h3>
          <p className="text-xs font-semibold text-slate-500">
            Pulsa una posición para ver la trazabilidad de la caja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" />Completa</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-400" />Seleccionada</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />Libre</span>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-300 bg-slate-900 p-4 shadow-inner">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(78px, 1fr))` }}
        >
          {slots.map(({ index, box }) => {
            const selected = box && String(box.numeroCaja) === String(selectedBoxNumber);
            const searchableText = box
              ? [box.numeroCaja, box.operario, box.fecha, box.combinaciones?.join(" ")]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase()
              : "";
            const searchMatch = normalizedSearch && searchableText.includes(normalizedSearch);

            if (!box) {
              return (
                <div
                  key={`empty-${index}`}
                  title="Hueco libre"
                  className="flex min-h-[76px] items-center justify-center rounded-2xl border border-dashed border-slate-500 bg-slate-800/70 text-xs font-black uppercase tracking-wide text-slate-400"
                >
                  Libre
                </div>
              );
            }

            return (
              <button
                key={box.numeroCaja || index}
                type="button"
                title={getTooltip(box)}
                onClick={() => onSelectBox?.(box.numeroCaja)}
                className={`relative min-h-[76px] rounded-2xl border p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  selected
                    ? "scale-[1.03] border-amber-300 bg-amber-100 text-amber-950 shadow-lg ring-2 ring-amber-300"
                    : searchMatch
                      ? "border-blue-300 bg-blue-100 text-blue-950 ring-2 ring-blue-300"
                      : "border-emerald-400/60 bg-emerald-500 text-white shadow-sm"
                }`}
              >
                <span
                  className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${
                    selected ? "bg-amber-500" : searchMatch ? "bg-blue-500" : "bg-emerald-100"
                  }`}
                />
                <div className="whitespace-pre-line pr-4 text-sm font-black leading-tight">
                  {shortBoxNumber(box.numeroCaja)}
                </div>
                <div className={`mt-2 text-xs font-black ${selected || searchMatch ? "text-slate-700" : "text-emerald-50"}`}>
                  {box.totalPiezas || 0} uds
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
