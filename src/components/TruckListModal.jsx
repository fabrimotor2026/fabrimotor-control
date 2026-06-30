export default function TruckListModal({
  boxLabels,
  boxLabelsSummary,
  exportBoxLabelsExcel,
  printBoxLabelsReport,
  appConfig,
  onClose,
  truckProgress,
}) {
  
 const safeTruckProgress = truckProgress || {
  completedBoxes: boxLabelsSummary.length,
  targetBoxes: appConfig.boxesPerTruck || 49,
  remainingBoxes: Math.max((appConfig.boxesPerTruck || 49) - boxLabelsSummary.length, 0),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Listado cajas camión · {appConfig.reference}
            </h2>

            <p className="text-sm text-slate-500">
              {boxLabels.length} líneas registradas
            </p>

            <p className="text-sm font-bold text-emerald-700">
              {boxLabelsSummary.length} / {appConfig.boxesPerTruck} cajas completadas
            </p>
          </div>

          <div className="flex gap-2">
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
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {safeTruckProgress && (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-blue-900">
                  Camión {appConfig.reference}
                </div>
                <div className="text-sm text-blue-700">
                  Última caja: {safeTruckProgress.lastBox?.numeroCaja || "-"}
                </div>
              </div>
              
              <div
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  safeTruckProgress.isComplete
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-700 text-white"
                 }`}
              >
                 {safeTruckProgress.isComplete ? "CAMIÓN COMPLETO" : "EN PREPARACIÓN"}
              </div>
            </div>
            
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-blue-900">
              <span>
                {safeTruckProgress.completedBoxes} / {safeTruckProgress.targetBoxes} cajas
              </span>
              <span>
                Faltan {safeTruckProgress.remainingBoxes} cajas
              </span>
            </div>
            
            <div className="h-4 overflow-hidden rounded-full bg-white">
              <div
                className={`h-full ${
                  safeTruckProgress.isComplete ? "bg-emerald-600" : "bg-blue-600"
                }`}
                style={{ width: `${safeTruckProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {boxLabelsSummary.length > 0 && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 text-lg font-black text-emerald-900">
              Resumen por caja
            </div>

            <div className="overflow-auto rounded-2xl border border-emerald-200 bg-white">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-emerald-700 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº Caja</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Operario</th>
                    <th className="px-3 py-2 text-right">Piezas</th>
                    <th className="px-3 py-2 text-left">
                      Combinaciones FAB/COL
                    </th>
                    <th className="px-3 py-2 text-right">Semana</th>
                    <th className="px-3 py-2 text-right">Día</th>
                  </tr>
                </thead>

                <tbody>
                  {boxLabelsSummary.map((box) => (
                    <tr
                      key={box.numeroCaja}
                      className="border-t border-emerald-100"
                    >
                      <td className="px-3 py-2 font-black">
                        {box.numeroCaja}
                      </td>
                      <td className="px-3 py-2">{box.fecha}</td>
                      <td className="px-3 py-2">{box.operario}</td>
                      <td
                        className={`px-3 py-2 text-right font-black ${
                          box.totalPiezas === 16
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {box.totalPiezas}
                      </td>
                      <td className="px-3 py-2">
                        {box.combinaciones.join(" | ")}
                      </td>
                      <td className="px-3 py-2 text-right">{box.semana}</td>
                      <td className="px-3 py-2 text-right">{box.dia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {boxLabels.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
            No hay cajas registradas todavía.
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Operario</th>
                  <th className="px-3 py-2 text-left">Nº Caja</th>
                  <th className="px-3 py-2 text-left">Línea</th>
                  <th className="px-3 py-2 text-left">Fabricación</th>
                  <th className="px-3 py-2 text-left">Colada</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Semana</th>
                  <th className="px-3 py-2 text-right">Día</th>
                </tr>
              </thead>

              <tbody>
                {boxLabels.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{row.fecha}</td>
                    <td className="px-3 py-2">
                      {row.operario1}
                      {row.operario2 ? ` / ${row.operario2}` : ""}
                    </td>
                    <td className="px-3 py-2 font-black">
                      {row.numero_caja}
                    </td>
                    <td className="px-3 py-2">{row.linea}</td>
                    <td className="px-3 py-2">{row.fabricacion}</td>
                    <td className="px-3 py-2">{row.colada}</td>
                    <td className="px-3 py-2 text-right font-black">
                      {row.cantidad}
                    </td>
                    <td className="px-3 py-2 text-right">{row.semana}</td>
                    <td className="px-3 py-2 text-right">{row.dia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          Cajas completas estimadas:{" "}
          <strong>
            {new Set(boxLabels.map((row) => row.numero_caja)).size}
          </strong>{" "}
          / {appConfig.boxesPerTruck}
        </div>
      </div>
    </div>
  );
}