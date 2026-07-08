import TruckMap from "./TruckMap";

export default function BoxMapPanel({
  filteredBoxes = [],
  targetBoxes,
  selectedBox,
  searchValue,
  setSearchValue,
  onSearchBox,
  setSelectedBoxNumber,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Cajas del camión</h3>
          <p className="text-xs font-semibold text-slate-500">Pulsa una caja para ver su trazabilidad.</p>
        </div>
        <div className="flex gap-2">
          <input
            className="w-52 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold outline-none focus:border-slate-900"
            placeholder="Buscar caja, FAB, COL..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <button type="button" onClick={() => onSearchBox?.(searchValue)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white">
            Buscar
          </button>
        </div>
      </div>

      {filteredBoxes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
          No hay cajas que coincidan con la búsqueda.
        </div>
      ) : (
        <TruckMap
          boxes={filteredBoxes}
          capacity={targetBoxes}
          selectedBoxNumber={selectedBox?.numeroCaja || ""}
          searchValue={searchValue}
          onSelectBox={setSelectedBoxNumber}
        />
      )}
    </div>
  );
}
