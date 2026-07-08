import { useEffect, useMemo, useState } from "react";

export default function TruckListModal({
  boxLabels,
  boxLabelsSummary,
  exportBoxLabelsExcel,
  printBoxLabelsReport,
  appConfig,
  onClose,
  truckProgress,
  activeTruck,
  trucks = [],
  closeActiveTruck,
  displayTruck,
  selectedTruckId,
  onSelectTruck,
  onSearchBox,
  highlightBoxNumber,
}) {
  const currentTruck = displayTruck || activeTruck;
  const selectedId = String(selectedTruckId || currentTruck?.id || "");
  const capacity = Number(appConfig.boxesPerTruck || 49);

  const safeTruckProgress = truckProgress || {
    completedBoxes: boxLabelsSummary.length,
    targetBoxes: capacity,
    remainingBoxes: Math.max(capacity - boxLabelsSummary.length, 0),
    percent: capacity > 0 ? Math.min((boxLabelsSummary.length / capacity) * 100, 100) : 0,
    isComplete: boxLabelsSummary.length >= capacity,
    lastBox: boxLabelsSummary.length > 0 ? boxLabelsSummary[boxLabelsSummary.length - 1] : null,
  };

  const truckStats = useMemo(
    () => ({
      lineas: boxLabels.length,
      cajas: new Set(boxLabels.map((row) => row.numero_caja).filter(Boolean)).size,
      piezas: boxLabels.reduce((sum, row) => sum + Number(row.cantidad || 0), 0),
      operarios: new Set(
        boxLabels.flatMap((row) => [row.operario1, row.operario2]).filter(Boolean)
      ).size,
      fabricaciones: new Set(boxLabels.map((row) => row.fabricacion).filter(Boolean)).size,
      coladas: new Set(boxLabels.map((row) => row.colada).filter(Boolean)).size,
    }),
    [boxLabels]
  );

  const [boxSearch, setBoxSearch] = useState("");
  const [selectedBox, setSelectedBox] = useState(null);

  useEffect(() => {
    if (!selectedBox && boxLabelsSummary.length > 0) {
      setSelectedBox(boxLabelsSummary[boxLabelsSummary.length - 1]);
    }
  }, [boxLabelsSummary, selectedBox]);

  useEffect(() => {
    const target = String(highlightBoxNumber || "").trim().toUpperCase();
    if (!target) return;
    const found = boxLabelsSummary.find(
      (box) => String(box.numeroCaja || "").trim().toUpperCase() === target
    );
    if (found) setSelectedBox(found);
  }, [highlightBoxNumber, boxLabelsSummary]);

  const boxesByNumber = useMemo(() => {
    const map = new Map();
    boxLabelsSummary.forEach((box) => map.set(String(box.numeroCaja), box));
    return map;
  }, [boxLabelsSummary]);

  const gridColumns = Math.max(5, Math.ceil(Math.sqrt(capacity)));
  const positions = Array.from({ length: capacity }, (_, index) => boxLabelsSummary[index] || null);

  const selectedBoxNumber = selectedBox?.numeroCaja ? String(selectedBox.numeroCaja) : "";

  const kpiClass = "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex h-[92vh] w-[94vw] max-w-none flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              RC1-002 · Workspace camión sin scroll
            </div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              🚚 Camión {currentTruck?.truck_number ?? "-"}
            </h2>
            <div className="mt-1 text-sm font-bold text-slate-600">
              Referencia {appConfig.reference} · {boxLabelsSummary.length} / {capacity} cajas
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-2xl px-4 py-2 text-sm font-black ${
                currentTruck?.status === "CLOSED"
                  ? "bg-slate-700 text-white"
                  : safeTruckProgress.isComplete
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-700 text-white"
              }`}
            >
              {currentTruck?.status === "CLOSED"
                ? "CERRADO"
                : safeTruckProgress.isComplete
                  ? "CAMIÓN COMPLETO"
                  : "EN CARGA"}
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition hover:bg-slate-700"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="grid gap-3 xl:grid-cols-7">
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Ocupación</div>
              <div className="mt-1 text-3xl font-black text-blue-700">
                {Math.round(safeTruckProgress.percent)}%
              </div>
            </div>
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Cajas</div>
              <div className="mt-1 text-3xl font-black text-slate-950">{truckStats.cajas}</div>
            </div>
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Piezas</div>
              <div className="mt-1 text-3xl font-black text-slate-950">{truckStats.piezas}</div>
            </div>
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Líneas</div>
              <div className="mt-1 text-3xl font-black text-slate-950">{truckStats.lineas}</div>
            </div>
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Operarios</div>
              <div className="mt-1 text-3xl font-black text-slate-950">{truckStats.operarios}</div>
            </div>
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Fabricaciones</div>
              <div className="mt-1 text-3xl font-black text-slate-950">{truckStats.fabricaciones}</div>
            </div>
            <div className={kpiClass}>
              <div className="text-xs font-black uppercase text-slate-500">Coladas</div>
              <div className="mt-1 text-3xl font-black text-slate-950">{truckStats.coladas}</div>
            </div>
          </div>
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${safeTruckProgress.isComplete ? "bg-emerald-600" : "bg-blue-600"}`}
              style={{ width: `${safeTruckProgress.percent}%` }}
            />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 p-5 xl:grid-cols-[22%_53%_25%]">
          <aside className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-xs font-black uppercase text-slate-500">Historial</div>
              <div className="text-xl font-black text-slate-950">Camiones y cajas</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-black uppercase text-slate-500">Buscar caja</div>
              <div className="flex gap-2">
                <input
                  value={boxSearch}
                  onChange={(e) => setBoxSearch(e.target.value)}
                  placeholder="FB-26-00001"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => onSearchBox(boxSearch)}
                  className="rounded-xl bg-blue-700 px-3 py-2 font-black text-white"
                >
                  🔎
                </button>
              </div>
            </div>

            <div className="mt-3 grid max-h-36 shrink-0 gap-2 overflow-auto pr-1">
              {trucks.map((truck) => {
                const isSelected = String(truck.id) === selectedId;
                return (
                  <button
                    type="button"
                    key={truck.id}
                    onClick={() => onSelectTruck(truck)}
                    className={`rounded-2xl border px-3 py-2 text-left transition hover:shadow ${
                      isSelected
                        ? "border-blue-700 bg-blue-100 ring-2 ring-blue-200"
                        : truck.status === "OPEN"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900">🚚 {truck.truck_number}</span>
                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                        {truck.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {truck.planned_expedition_date || "Sin fecha"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-black uppercase text-slate-500">
                Cajas del camión
              </div>
              <div className="space-y-2">
                {boxLabelsSummary.map((box) => {
                  const isSelected = String(box.numeroCaja) === selectedBoxNumber;
                  const isHighlighted =
                    String(highlightBoxNumber || "").trim().toUpperCase() ===
                    String(box.numeroCaja || "").trim().toUpperCase();

                  return (
                    <button
                      key={box.numeroCaja}
                      type="button"
                      onClick={() => setSelectedBox(box)}
                      className={`w-full rounded-2xl border px-3 py-2 text-left transition hover:bg-blue-50 ${
                        isSelected
                          ? "border-blue-700 bg-blue-100 ring-2 ring-blue-200"
                          : isHighlighted
                            ? "border-yellow-400 bg-yellow-100"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-950">📦 {box.numeroCaja}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-black ${
                            Number(box.totalPiezas) === Number(appConfig.piecesPerBox)
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {box.totalPiezas} uds
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {box.operario || "Sin operario"} · {box.fecha || "-"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase text-slate-500">Mapa visual</div>
                <div className="text-2xl font-black text-slate-950">Distribución del camión</div>
              </div>
              <div className="flex items-center gap-3 text-sm font-black">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Completa</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400" /> Seleccionada</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-200" /> Libre</span>
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-3xl bg-slate-100 p-4">
              <div
                className="grid h-full gap-2"
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >
                {positions.map((box, index) => {
                  const key = box?.numeroCaja || `empty-${index}`;
                  const isSelected = box && String(box.numeroCaja) === selectedBoxNumber;
                  const isHighlighted =
                    box &&
                    String(highlightBoxNumber || "").trim().toUpperCase() ===
                      String(box.numeroCaja || "").trim().toUpperCase();

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!box}
                      onClick={() => box && setSelectedBox(box)}
                      className={`min-h-[58px] rounded-2xl border-2 p-2 text-center transition ${
                        !box
                          ? "border-dashed border-slate-300 bg-white text-slate-300"
                          : isSelected
                            ? "scale-[1.03] border-yellow-500 bg-yellow-300 text-slate-950 shadow-lg"
                            : isHighlighted
                              ? "border-yellow-500 bg-yellow-100 text-slate-950"
                              : "border-emerald-600 bg-emerald-500 text-white hover:scale-[1.02] hover:bg-emerald-600"
                      }`}
                    >
                      {box ? (
                        <>
                          <div className="truncate text-sm font-black">{box.numeroCaja}</div>
                          <div className="mt-1 text-xs font-black opacity-90">{box.totalPiezas} uds</div>
                        </>
                      ) : (
                        <div className="text-xs font-black uppercase">Libre</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </main>

          <aside className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-xs font-black uppercase text-slate-500">Detalle</div>
              <div className="text-2xl font-black text-slate-950">
                {selectedBox ? `📦 ${selectedBox.numeroCaja}` : "Sin caja"}
              </div>
            </div>

            {selectedBox ? (
              <div className="min-h-0 flex-1 overflow-auto pr-1">
                <div className="grid gap-3">
                  <Detail label="Fecha" value={selectedBox.fecha || "-"} />
                  <Detail label="Operario" value={selectedBox.operario || "-"} />
                  <Detail label="Semana" value={selectedBox.semana || "-"} />
                  <Detail label="Día" value={selectedBox.dia || "-"} />
                  <div className="rounded-2xl bg-slate-900 p-4 text-white">
                    <div className="text-xs font-black uppercase text-slate-300">Total piezas</div>
                    <div className="mt-1 text-5xl font-black">{selectedBox.totalPiezas ?? "-"}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3 text-sm font-black uppercase text-emerald-800">
                    Fabricaciones / Coladas
                  </div>
                  <div className="space-y-2">
                    {(selectedBox.combinaciones || []).map((item, index) => (
                      <div key={index} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-900 shadow-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-black uppercase text-slate-500">Historial</div>
                  <div className="mt-3 space-y-3 text-sm font-bold text-slate-700">
                    <div>✅ Caja creada · {selectedBox.fecha || "-"}</div>
                    <div>🚚 Asignada al camión {currentTruck?.truck_number || "-"}</div>
                    <div>🖨 Etiqueta impresa · {selectedBox.numeroCaja}</div>
                    <div>{currentTruck?.status === "CLOSED" ? "🔒 Camión cerrado" : "🟢 Camión en carga"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-3xl bg-white text-center text-sm font-black text-slate-500">
                Selecciona una caja del historial o del mapa visual.
              </div>
            )}
          </aside>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="text-sm font-black text-slate-600">
            Faltan {safeTruckProgress.remainingBoxes} cajas · {safeTruckProgress.remainingBoxes * appConfig.piecesPerBox} piezas
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={printBoxLabelsReport}
              disabled={boxLabelsSummary.length === 0}
              className="rounded-2xl bg-red-600 px-5 py-3 font-black text-white disabled:bg-slate-300"
            >
              📄 PDF
            </button>
            <button
              onClick={exportBoxLabelsExcel}
              disabled={boxLabels.length === 0}
              className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:bg-slate-300"
            >
              📊 Excel
            </button>
            <button
              onClick={closeActiveTruck}
              disabled={
                !activeTruck ||
                !currentTruck ||
                currentTruck?.id !== activeTruck?.id ||
                currentTruck?.status !== "OPEN"
              }
              className="rounded-2xl bg-orange-600 px-5 py-3 font-black text-white hover:bg-orange-700 disabled:bg-slate-300"
            >
              🔒 Cerrar camión
            </button>
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"
            >
              ❌ Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}
