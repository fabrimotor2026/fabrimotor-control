import { X } from "lucide-react";

import FmBadge from "../../../components/ui/FmBadge";
import FmButton from "../../../components/ui/FmButton";
import FmSectionTitle from "../../../components/ui/FmSectionTitle";

import { APP_VERSION } from "../../../config/constants";

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
      <div className="flex items-start gap-4">

  <FmSectionTitle
    eyebrow={`Dashboard · v${APP_VERSION}`}
    title={
      currentTruck?.truck_code || currentTruck?.truck_number
        ? `Camión ${currentTruck.truck_code || currentTruck.truck_number}`
        : "Camión activo"
    }
    description={`${appConfig.reference || "F-1012"} · ${stats.completedBoxes}/${stats.targetBoxes} cajas · ${stats.remainingBoxes} huecos libres`}
  />

  {currentTruck && (
    <FmBadge
      color={
        currentTruck.status === "OPEN"
          ? "green"
          : currentTruck.status === "PLANNED"
          ? "blue"
          : "slate"
      }
    >
      {currentTruck.status || "OPEN"}
    </FmBadge>
  )}

</div>

      <div className="flex flex-wrap items-center gap-2">
        <FmButton
          variant="danger"
          disabled={!boxLabelsSummary.length}
          onClick={printBoxLabelsReport}
        >
          PDF
        </FmButton>

        <FmButton
          variant="success"
          disabled={!boxLabels.length}
          onClick={exportBoxLabelsExcel}
        >
          Excel
        </FmButton>

        {activeTruck && !displayTruck && (
          <FmButton
            variant="dark"
            onClick={closeActiveTruck}
          >
            Cerrar camión
          </FmButton>
          
        )}
        <button type="button" onClick={onClose} className="rounded-full p-3 text-slate-700 hover:bg-slate-200" aria-label="Cerrar">
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
