import { X } from "lucide-react";
import { APP_VERSION } from "../../config/constants";

export default function DashboardHeader({
  currentTruck,
  appConfig = {},
  stats,
  printBoxLabelsReport,
  exportBoxLabelsExcel,
  boxLabels = [],
  boxLabelsSummary = [],
  activeTruck,
  displayTruck,
  closeActiveTruck,
  onClose,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          Dashboard inteligente del camión · v{APP_VERSION}
        </div>
        <h2 className="mt-1 text-3xl font-black text-slate-950">
          {currentTruck?.truck_code || currentTruck?.truck_number
            ? `Camión ${currentTruck.truck_code || currentTruck.truck_number}`
            : "Camión activo"}
        </h2>
        <p className="text-sm font-semibold text-slate-500">
          {appConfig.reference || "F-1012"} · {stats.completedBoxes}/{stats.targetBoxes} cajas · {stats.remainingBoxes} huecos libres
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={printBoxLabelsReport} disabled={!boxLabelsSummary.length} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm disabled:bg-slate-300">PDF</button>
        <button type="button" onClick={exportBoxLabelsExcel} disabled={!boxLabels.length} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm disabled:bg-slate-300">Excel</button>
        {activeTruck && !displayTruck && (
          <button type="button" onClick={closeActiveTruck} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm">Cerrar camión</button>
        )}
        <button type="button" onClick={onClose} className="rounded-full p-3 text-slate-700 hover:bg-slate-200" aria-label="Cerrar">
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
