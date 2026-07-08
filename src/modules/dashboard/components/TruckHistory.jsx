export default function TruckHistory({ trucks = [], selectedTruckId, onSelectTruck }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">Historial rápido</h3>
      <p className="mb-3 text-xs font-semibold text-slate-500">Camiones recientes de la referencia actual.</p>
      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
        {(trucks || []).length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Sin historial cargado.</div>
        ) : (
          trucks.map((truck) => (
            <button
              key={truck.id || truck.truck_number}
              type="button"
              onClick={() => onSelectTruck?.(truck)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                String(selectedTruckId) === String(truck.id)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div>Camión {truck.truck_code || truck.truck_number || "-"}</div>
              <div className="mt-1 text-xs font-semibold opacity-75">{truck.status || truck.estado || "Histórico"}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
