import { useEffect, useState } from "react";
import FmButton from "../../../components/ui/FmButton";
import FmCard from "../../../components/ui/FmCard";
import FmSectionTitle from "../../../components/ui/FmSectionTitle";
import FmBadge from "../../../components/ui/FmBadge";
import FmInput from "../../../components/ui/FmInput";
import FmTextarea from "../../../components/ui/FmTextarea";
import FmEmptyState from "../../../components/ui/FmEmptyState";

function formatDate(date) {
  if (!date) return "Sin fecha";
  return String(date).split("-").reverse().join("/");
}

export default function ExpeditionPlanner({
  truckSchedule = [],
  onCreatePlannedTruck,
  onUpdatePlannedTruck,
  onDeletePlannedTruck,
  currentUser,
}) {
  const [draftRows, setDraftRows] = useState({});

  useEffect(() => {
    const nextDraftRows = {};

    truckSchedule.forEach((truck) => {
      nextDraftRows[truck.id] = {
        plannedExpeditionDate: truck.planned_expedition_date || "",
        notes: truck.notes || "",
        status: truck.status,
      };
    });

    setDraftRows(nextDraftRows);
  }, [truckSchedule]);

  const updateDraft = (truckId, field, value) => {
    setDraftRows((previous) => ({
      ...previous,
      [truckId]: {
        ...(previous[truckId] || {}),
        [field]: value,
      },
    }));
  };

  const saveTruck = async (truck) => {
    const draft = draftRows[truck.id];

    if (!draft) return;

    await onUpdatePlannedTruck(truck, {
      plannedExpeditionDate: draft.plannedExpeditionDate,
      notes: draft.notes,
      status: draft.status,
    });
  };

  const orderedSchedule = [...truckSchedule].sort((a, b) => {
  if (!a.planned_expedition_date) return 1;
  if (!b.planned_expedition_date) return -1;

  return a.planned_expedition_date.localeCompare(
    b.planned_expedition_date
  );
});

  return (
    <FmCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <FmSectionTitle
          eyebrow="Logística"
          title="Planificador de Expediciones"
          description="Próximos camiones planificados por administración."
        />

        <FmButton onClick={onCreatePlannedTruck}>
          + Nuevo camión
        </FmButton>
        </div>

      {truckSchedule.length === 0 ? (
        <FmEmptyState
          title="No hay expediciones planificadas"
          description="Añade un nuevo camión para comenzar la planificación."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-3">Camión</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Expedición prevista</th>
                <th className="px-3 py-3">Observaciones</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {orderedSchedule.map((truck) => {
                const draft = draftRows[truck.id] || {
                  plannedExpeditionDate: truck.planned_expedition_date || "",
                  notes: truck.notes || "",
                  status: truck.status,
                };

                return (
                  <tr key={truck.id} className="border-t border-slate-200 bg-white">
                    <td className="px-3 py-3 font-black text-slate-900">
                      {truck.truck_number}
                    </td>

                    <td className="px-3 py-3">
                      <FmBadge
                        color={
                          truck.status === "OPEN"
                            ? "green"
                            : truck.status === "PLANNED"
                            ? "blue"
                            : "slate"
                        }
                      >
                        {truck.status}
                      </FmBadge>
                    </td>

                    <td className="px-3 py-3">
                      <FmInput
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        className="font-bold"
                        value={draft.plannedExpeditionDate || ""}
                        onChange={(e) =>
                          updateDraft(
                            truck.id,
                            "plannedExpeditionDate",
                            e.target.value
                          )
                        }
                        onBlur={() => saveTruck(truck)}
                      />
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {formatDate(draft.plannedExpeditionDate)}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <FmTextarea
                        rows={2}
                        value={draft.notes || ""}
                        onChange={(e) =>
                          updateDraft(truck.id, "notes", e.target.value)
                        }
                        onBlur={() => saveTruck(truck)}
                        placeholder="Observaciones"
                      />
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <FmButton
                          variant="dark"
                          className="text-xs px-3 py-2 min-h-0"
                          onClick={() => saveTruck(truck)}
                        >
                          Guardar
                        </FmButton>
                        


                        {truck.status === "PLANNED" && (
                          <FmButton
                            variant="danger"
                            className="text-xs px-3 py-2 min-h-0"
                            onClick={() => onDeletePlannedTruck(truck)}
                          >
                            Eliminar
                          </FmButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs font-semibold text-slate-400">
        Usuario: {currentUser?.name || currentUser?.username || "-"}
      </div>
    </FmCard>
  );
}