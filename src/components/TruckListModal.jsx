import { useState } from "react";
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
  updateTruckExpeditionDate,
  closeActiveTruck,
  displayTruck,
  selectedTruckId,
  onSelectTruck,
  onSearchBox,
  highlightBoxNumber,
}) {
  const safeTruckProgress = truckProgress || {
    completedBoxes: boxLabelsSummary.length,
    targetBoxes: appConfig.boxesPerTruck || 49,
    remainingBoxes: Math.max(
      (appConfig.boxesPerTruck || 49) - boxLabelsSummary.length,
      0
    ),
    percent:
      appConfig.boxesPerTruck > 0
        ? Math.min((boxLabelsSummary.length / appConfig.boxesPerTruck) * 100, 100)
        : 0,
    isComplete: boxLabelsSummary.length >= (appConfig.boxesPerTruck || 49),
    lastBox:
      boxLabelsSummary.length > 0
        ? boxLabelsSummary[boxLabelsSummary.length - 1]
        : null,
  };

  
  
  const currentTruck = displayTruck || activeTruck;
  const selectedId = String(selectedTruckId || currentTruck?.id || "");

  const truckStats = {
  lineas: boxLabels.length,
  cajas: new Set(boxLabels.map((row) => row.numero_caja).filter(Boolean)).size,
  piezas: boxLabels.reduce((sum, row) => sum + Number(row.cantidad || 0), 0),
  operarios: new Set(
    boxLabels
      .flatMap((row) => [row.operario1, row.operario2])
      .filter(Boolean)
  ).size,
  fabricaciones: new Set(
    boxLabels.map((row) => row.fabricacion).filter(Boolean)
  ).size,
  coladas: new Set(
    boxLabels.map((row) => row.colada).filter(Boolean)
  ).size,
};

const dashboardStats = {
  totalTrucks: trucks.length,
  openTrucks: trucks.filter((truck) => truck.status === "OPEN").length,
  closedTrucks: trucks.filter((truck) => truck.status === "CLOSED").length,
  totalBoxes: truckStats.cajas,
  totalPieces: truckStats.piezas,
  lastBox:
  boxLabelsSummary.length > 0
    ? boxLabelsSummary[boxLabelsSummary.length - 1].numeroCaja
    : "-",
};

  
  const [boxSearch, setBoxSearch] = useState("");
  const [selectedBox, setSelectedBox] = useState(null);
  const scrollToBoxes = () => {
  document
    .getElementById("box-summary-section")
    ?.scrollIntoView({ behavior: "smooth" });
};

const openLastBox = () => {
  const box = boxLabelsSummary.find(
    (b) => b.numeroCaja === dashboardStats.lastBox
  );

  if (box) {
    setSelectedBox(box);
  }
};

const dashboardCardClass =
  "cursor-pointer rounded-2xl p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-95";
    

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="max-h-[90vh] w-full max-w-7xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">

      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
  <div className="mb-4 text-lg font-black text-blue-900">
    📈 Dashboard de expediciones
  </div>

  <div className="mb-3 text-sm font-black uppercase text-blue-800">
    🌍 Resumen general
  </div>

  <div className="grid gap-4 md:grid-cols-3">
    <div className={`${dashboardCardClass} bg-blue-100`}>
      <div className="text-xs font-bold uppercase text-slate-500">🚚 Camiones</div>
      <div className="mt-1 text-3xl font-black text-slate-900">
        {dashboardStats.totalTrucks}
      </div>
    </div>

<div className={`${dashboardCardClass} bg-emerald-100`}>
  <div className="text-xs font-bold uppercase text-slate-500">
    🟢 Abiertos
  </div>

  <div className="mt-1 text-3xl font-black text-emerald-700">
    {dashboardStats.openTrucks}
  </div>
</div>

    <div className={`${dashboardCardClass} bg-slate-200`}>
      <div className="text-xs font-bold uppercase text-slate-500">⚫ Cerrados</div>
      <div className="mt-1 text-3xl font-black text-slate-700">
        {dashboardStats.closedTrucks}
      </div>
    </div>
  </div>
<div className="mb-3 mt-6 text-sm font-black uppercase text-blue-800">
  🚚 Camión seleccionado
</div>

<div className="grid gap-4 md:grid-cols-4">

  <div
  onClick={scrollToBoxes}
  className={`${dashboardCardClass} bg-amber-100`}
>
  <div className="text-xs font-bold uppercase text-slate-500">
    📦 Cajas
  </div>

  <div className="mt-1 text-3xl font-black text-slate-900">
    {truckStats.cajas}
  </div>
</div>

    <div className={`${dashboardCardClass} bg-violet-100`}>
      <div className="text-xs font-bold uppercase text-slate-500">🧩 Piezas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.piezas}</div>
    </div>

    <div className={`${dashboardCardClass} bg-orange-100`}>
      <div className="text-xs font-bold uppercase text-slate-500">📋 Líneas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.lineas}</div>
    </div>

    <div className={`${dashboardCardClass} bg-teal-100`}>
      <div className="text-xs font-bold uppercase text-slate-500">👥 Operarios</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.operarios}</div>
    </div>

    <div className={`${dashboardCardClass} bg-rose-100`}>
      <div className="text-xs font-bold uppercase text-slate-500">🏭 Fabricaciones</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.fabricaciones}</div>
    </div>

    <div className={`${dashboardCardClass} bg-indigo-100`}>
      <div className="text-xs font-bold uppercase text-slate-500">🔩 Coladas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.coladas}</div>
    </div>
    
      <div
        onClick={openLastBox}
        className={`${dashboardCardClass} bg-cyan-100`}
      >
        <div className="text-xs font-bold uppercase text-slate-500">
          Última caja
        </div>
        
        <div className="mt-1 text-2xl font-black text-slate-900">
          {dashboardStats.lastBox}
        </div>
      </div>
    </div>
  </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[280px_1fr]">

  {/* PANEL IZQUIERDO */}

  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">

    <div className="mb-4">
      <div className="text-sm font-black uppercase tracking-wide text-slate-500">
        Expediciones
      </div>

      <div className="text-xl font-black text-slate-900">
        Histórico
      </div>
    </div>

    {/* BUSCADOR */}

    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-xs font-black uppercase text-slate-500">
        🔍 Buscar caja
      </div>

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

    {/* HISTÓRICO */}

    <div className="space-y-3">

      {trucks.map((truck) => {
        const isSelected = String(truck.id) === selectedId;

        return (
          <div
            key={truck.id}
            onClick={() => onSelectTruck(truck)}
            className={`cursor-pointer rounded-2xl border-4 p-3 transition-all duration-200 hover:shadow-lg ${
              isSelected
                ? truck.status === "OPEN"
                  ? "border-emerald-700 bg-emerald-200 shadow-xl ring-4 ring-emerald-300"
                  : "border-blue-800 bg-blue-200 shadow-xl ring-4 ring-blue-300"
                : truck.status === "OPEN"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-black text-slate-900">
                🚚 Camión {truck.truck_number}
              </div>

              <div
                className={`rounded-full px-2 py-1 text-[11px] font-black ${
                  truck.status === "OPEN"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-500 text-white"
                }`}
              >
                {truck.status}
              </div>
            </div>

            <div className="mt-2 text-xs font-bold text-slate-600">
              Fecha prevista
            </div>

            <div className="text-sm font-black text-slate-900">
              {truck.planned_expedition_date || "-"}
            </div>
          </div>
        );
      })}

    </div>

  </div>

  {/* PANEL DERECHO */}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-slate-500">
                Gestión de expedición
              </div>

              <h2 className="mt-1 text-3xl font-black text-slate-900">
                🚚 Camión {currentTruck?.truck_number ?? "-"}
              </h2>

              <div className="mt-2 text-sm font-bold text-slate-600">
                Referencia {appConfig.reference}
              </div>
            </div>     
            <div
              className={`rounded-full px-4 py-2 text-sm font-black ${
                safeTruckProgress.isComplete
                  ? "bg-emerald-600 text-white"
                  : currentTruck?.status === "CLOSED"
                    ? "bg-slate-600 text-white"
                    : "bg-blue-700 text-white"
              }`}
            >
              {currentTruck?.status === "CLOSED"
                ? "CERRADO"
                : safeTruckProgress.isComplete
                  ? "CAMIÓN COMPLETO"
                  : "EN PREPARACIÓN"}
            </div>
          </div>

{/* BLOQUE 1: INFORMACIÓN DEL CAMIÓN */}
<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-lg font-black text-slate-900">
      ℹ Información del camión
    </h3>
  </div>

  <div className="grid gap-y-3 md:grid-cols-2">
    <div>
      <div className="text-xs font-bold uppercase text-slate-500">
        👤 Creado por
      </div>
      <div className="font-black text-slate-900">
        {currentTruck?.created_by || "-"}
      </div>
    </div>

    <div>
      <div className="text-xs font-bold uppercase text-slate-500">
        📅 Fecha creación
      </div>
      <div className="font-black text-slate-900">
        {currentTruck?.created_at
          ? new Date(currentTruck.created_at).toLocaleString("es-ES")
          : "-"}
      </div>
    </div>

    <div>
      <div className="text-xs font-bold uppercase text-slate-500">
        🏁 Fecha cierre
      </div>
      <div className="font-black text-slate-900">
        {currentTruck?.closed_at
          ? new Date(currentTruck.closed_at).toLocaleString("es-ES")
          : currentTruck?.status === "CLOSED"
            ? "No registrada"
            : "Pendiente"}
      </div>
    </div>

    <div>
      <div className="text-xs font-bold uppercase text-slate-500">
        🚚 Nº Camión
      </div>
      <div className="font-black text-slate-900">
        {currentTruck?.truck_number || "-"}
      </div>
    </div>
  </div>
</div>

{/* BLOQUE 2: RESUMEN DE TRAZABILIDAD */}
<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-lg font-black text-slate-900">
      📊 Resumen de trazabilidad
    </h3>
  </div>

  <div className="grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-xs font-bold uppercase text-slate-500">📦 Cajas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.cajas}</div>
    </div>

    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-xs font-bold uppercase text-slate-500">🧩 Piezas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.piezas}</div>
    </div>

    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-xs font-bold uppercase text-slate-500">📋 Líneas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.lineas}</div>
    </div>

    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-xs font-bold uppercase text-slate-500">👥 Operarios</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.operarios}</div>
    </div>

    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-xs font-bold uppercase text-slate-500">🏭 Fabricaciones</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.fabricaciones}</div>
    </div>

    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-xs font-bold uppercase text-slate-500">🔩 Coladas</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{truckStats.coladas}</div>
    </div>
  </div>
</div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Progreso expedición</span>
              <span>{Math.round(safeTruckProgress.percent)} %</span>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-white">
              <div
                className={`h-full ${
                  safeTruckProgress.isComplete ? "bg-emerald-600" : "bg-blue-600"
                }`}
                style={{ width: `${safeTruckProgress.percent}%` }}
              />
            </div>

            <div className="mt-2 text-sm font-bold text-slate-600">
              Faltan {safeTruckProgress.remainingBoxes} cajas ·{" "}
              {safeTruckProgress.remainingBoxes * appConfig.piecesPerBox} piezas
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={exportBoxLabelsExcel}
              disabled={boxLabels.length === 0}
              className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white disabled:bg-slate-300"
            >
              Exportar Excel
            </button>

            <button
              onClick={printBoxLabelsReport}
              disabled={boxLabelsSummary.length === 0}
              className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:bg-slate-300"
            >
              Exportar PDF
            </button>

            <button
              onClick={closeActiveTruck}
              disabled={
                !activeTruck ||
                !currentTruck ||
                currentTruck?.id !== activeTruck?.id ||
                currentTruck?.status !== "OPEN"
              }
              className="rounded-xl bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700 disabled:bg-slate-300"
            >
              🚚 Cerrar camión
            </button>

            <button
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700"
            >
              Salir
            </button>
          </div>
        </div>
      </div>



        {boxLabelsSummary.length > 0 && (
          <div
            id="box-summary-section"
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="mb-3 text-lg font-black text-emerald-900">
              Resumen por caja ({boxLabelsSummary.length})
            </div>

            <div className="overflow-auto rounded-2xl border border-emerald-200 bg-white">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-emerald-700 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº Caja</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Operario</th>
                    <th className="px-3 py-2 text-right">Piezas</th>
                    <th className="px-3 py-2 text-left">Combinaciones FAB/COL</th>
                    <th className="px-3 py-2 text-right">Semana</th>
                    <th className="px-3 py-2 text-right">Día</th>
                  </tr>
                </thead>

                <tbody>
                  {boxLabelsSummary.map((box) => {
                    const isHighlighted =
                    String(highlightBoxNumber || "").trim().toUpperCase() ===
                    String(box.numeroCaja || "").trim().toUpperCase();

                    
                    
                    return (
                      <tr
                        key={box.numeroCaja}
                        onClick={() => setSelectedBox(box)}
                        className={`border-t border-emerald-100 transition hover:bg-emerald-50 cursor-pointer ${
                          isHighlighted ? "ring-2 ring-yellow-400" : ""
                        }`}
                      >
                        
                        <td className={`px-3 py-2 font-black ${isHighlighted ? "bg-yellow-300" : ""}`}>
                          {box.numeroCaja}
                        </td>
                        
                        <td className={`px-3 py-2 ${isHighlighted ? "bg-yellow-300" : ""}`}>
                          {box.fecha}
                        </td>
                        
                        <td className={`px-3 py-2 ${isHighlighted ? "bg-yellow-300" : ""}`}>
                          {box.operario}
                        </td>
                        
                        <td
                          className={`px-3 py-2 text-right font-black ${
                            isHighlighted
                              ? "bg-yellow-300"
                              : box.totalPiezas === 16
                                ? "text-emerald-700"
                                : "text-red-600"
                              }`}
                            >
                              {box.totalPiezas}
                            </td>
                            
                            <td className={`px-3 py-2 ${isHighlighted ? "bg-yellow-300" : ""}`}>
                              <div className="space-y-1">
                                {box.combinaciones.map((combinacion, index) => (
                                  <div key={index} className="font-medium">
                                    {combinacion}
                                  </div>
                                ))}
                              </div>
                            </td>
                            
                            <td className={`px-3 py-2 text-right ${isHighlighted ? "bg-yellow-300" : ""}`}>
                              {box.semana}
                            </td>
                            
                            <td className={`px-3 py-2 text-right ${isHighlighted ? "bg-yellow-300" : ""}`}>
                              {box.dia}
                            </td>
                          
                          </tr>
                        );
                      })}
                    </tbody>
              </table>
            </div>
          </div>
        )}

        

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
  Cajas registradas:{" "}
  <span className="text-emerald-700">
    {truckStats.cajas}
  </span>{" "}
  de {appConfig.boxesPerTruck}
</div>

{selectedBox && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
      
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-slate-500">
            Ficha de caja
          </div>

          <h2 className="mt-1 text-3xl font-black text-slate-900">
            📦 {selectedBox.numeroCaja}
          </h2>
          
          <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-600">
            <span>🚚 Camión {currentTruck?.truck_number}</span>     
            
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                currentTruck?.status === "OPEN"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-600 text-white"
                }`}
              >
                {currentTruck?.status}
              </span>
            </div>
          </div>

          <button
            onClick={() => setSelectedBox(null)}
            className="rounded-xl bg-slate-100 px-4 py-2 font-black text-slate-700"
          >
            Cerrar
          </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            📅 Fecha
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {selectedBox.fecha || "-"}
          </div>
        </div>
        
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            👤 Operarios
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {selectedBox.operario || "-"}
          </div>
        </div>
        
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            📆 Semana
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {selectedBox.semana || "-"}
          </div>
        </div>
        
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            🗓 Día
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {selectedBox.dia || "-"}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-3 text-lg font-black text-emerald-900">
          Fabricaciones / Coladas
        </div>

        <div className="space-y-2">
          {selectedBox.combinaciones.map((item, index) => (
            <div
              key={index}
              className="rounded-xl bg-white px-4 py-3 font-bold text-slate-900 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-5 rounded-2xl p-4"
        style={{ backgroundColor: "#0f172a", color: "white" }}
      >
        <div className="text-xs font-bold uppercase" style={{ color: "#cbd5e1" }}>
          Total piezas
        </div>

        <div className="mt-1 text-5xl font-black" style={{ color: "white" }}>
          {selectedBox?.totalPiezas ?? "-"}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-4 text-lg font-black text-slate-900">
          🕘 Historial de la caja
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="mt-1 h-3 w-3 rounded-full bg-emerald-600" />
            <div>
              <div className="font-black text-slate-900">Caja creada</div>
              <div className="text-sm font-bold text-slate-500">
                {selectedBox.fecha || "-"}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-1 h-3 w-3 rounded-full bg-blue-600" />
            <div>
              <div className="font-black text-slate-900">
                Asignada al camión {currentTruck?.truck_number || "-"}
              </div>
              <div className="text-sm font-bold text-slate-500">
                Referencia {appConfig.reference}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-1 h-3 w-3 rounded-full bg-orange-500" />
            <div>
              <div className="font-black text-slate-900">Etiqueta impresa</div>
              <div className="text-sm font-bold text-slate-500">
                Nº caja {selectedBox.numeroCaja}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div
              className={`mt-1 h-3 w-3 rounded-full ${
                currentTruck?.status === "CLOSED"
                  ? "bg-slate-700"
                  : "bg-slate-300"
              }`}
            />
            <div>
              <div className="font-black text-slate-900">
                {currentTruck?.status === "CLOSED"
                  ? "Camión cerrado"
                  : "Camión pendiente de cierre"}
              </div>
              <div className="text-sm font-bold text-slate-500">
                {currentTruck?.closed_at
                  ? new Date(currentTruck.closed_at).toLocaleString("es-ES")
                  : "Pendiente"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
}
