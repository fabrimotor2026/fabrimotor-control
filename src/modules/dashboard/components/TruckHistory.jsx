import { memo } from "react";
import FmBadge from "../../../components/ui/FmBadge";
import FmCard from "../../../components/ui/FmCard";
import FmEmptyState from "../../../components/ui/FmEmptyState";
import FmSectionTitle from "../../../components/ui/FmSectionTitle";

function TruckHistory({
  trucks = [],
  selectedTruckId,
  onSelectTruck,
}) {
  return (
    <FmCard className="p-4">
      <FmSectionTitle
        eyebrow="Camiones"
        title="Historial rápido"
        description="Camiones recientes de la referencia actual."
      />

      <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1">
        {trucks.length === 0 ? (
          <FmEmptyState
            title="Sin historial cargado"
            description="Todavía no hay camiones disponibles para esta referencia."
          />
        ) : (
          trucks.map((truck) => {
            const selected =
              String(selectedTruckId) === String(truck.id);

            const status =
              truck.status || truck.estado || "HISTÓRICO";

            const badgeColor =
              status === "OPEN"
                ? "green"
                : status === "PLANNED"
                ? "blue"
                : "slate";

            return (
              <button
                key={truck.id || truck.truck_number}
                type="button"
                onClick={() => onSelectTruck?.(truck)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : status === "OPEN"
                    ? "border-emerald-200 bg-emerald-50 text-slate-900 hover:bg-emerald-100"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black">
                    Camión {truck.truck_code || truck.truck_number || "-"}
                  </div>

                  <FmBadge
                    color={badgeColor}
                    className={selected ? "ring-1 ring-white/20" : ""}
                  >
                    {status}
                  </FmBadge>
                </div>

                {truck.planned_expedition_date && (
                  <div
                    className={`mt-2 text-xs font-semibold ${
                      selected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Expedición:{" "}
                    {String(truck.planned_expedition_date)
                      .split("-")
                      .reverse()
                      .join("/")}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </FmCard>
  );
}

export default memo(TruckHistory);