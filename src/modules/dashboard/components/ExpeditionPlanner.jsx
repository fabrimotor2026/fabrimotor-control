import { useEffect, useState } from "react";

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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            Planificador de Expediciones
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Próximos camiones planificados por administración.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreatePlannedTruck}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
        >
          + Nuevo camión
        </button>
      </div>

      {truckSchedule.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
          No hay expediciones planificadas.
        </div>
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
              {truckSchedule.map((truck) => {
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
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {truck.status}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="date"
                        className="rounded-xl border border-slate-200 px-3 py-2 font-bold"
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
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold"
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
                        <button
                          type="button"
                          onClick={() => saveTruck(truck)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-700"
                        >
                          Guardar
                        </button>

                        {truck.status === "PLANNED" && (
                          <button
                            type="button"
                            onClick={() => onDeletePlannedTruck(truck)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
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
    </div>
  );
}