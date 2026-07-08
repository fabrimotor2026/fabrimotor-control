import { useMemo, useState } from "react";
import { useDashboard } from "../../hooks/useDashboard";
import { useTruckSelection } from "../../hooks/useTruckSelection";
import { DEFAULT_TRUCK_CAPACITY } from "../../config/constants";
import DashboardHeader from "./DashboardHeader";
import KPIGrid from "./KPIGrid";
import TruckProgress from "./TruckProgress";
import TruckHistory from "./TruckHistory";
import BoxMapPanel from "./BoxMapPanel";
import BoxDetail from "./BoxDetail";

export default function SmartTruckDashboardModal({
  boxLabels = [],
  boxLabelsSummary = [],
  exportBoxLabelsExcel,
  printBoxLabelsReport,
  activeTruck,
  displayTruck,
  selectedTruckId,
  trucks = [],
  appConfig = {},
  truckProgress,
  updateTruckExpeditionDate,
  closeActiveTruck,
  onSelectTruck,
  onSearchBox,
  highlightBoxNumber,
  onClose,
}) {
  const [searchValue, setSearchValue] = useState(highlightBoxNumber || "");
  const [newExpeditionDate, setNewExpeditionDate] = useState(
    (displayTruck || activeTruck)?.planned_expedition_date || ""
  );

  const currentTruck = displayTruck || activeTruck;
  const targetBoxes = Number(appConfig.boxesPerTruck || truckProgress?.targetBoxes || DEFAULT_TRUCK_CAPACITY);
  const stats = useDashboard({ boxLabels, boxLabelsSummary, targetBoxes });
  const { selectedBox, setSelectedBoxNumber } = useTruckSelection({ boxLabelsSummary, highlightBoxNumber });

  const filteredBoxes = useMemo(() => {
    return boxLabelsSummary.filter((box) => {
      const text = [box.numeroCaja, box.operario, box.fecha, box.combinaciones?.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !searchValue || text.includes(searchValue.toLowerCase());
    });
  }, [boxLabelsSummary, searchValue]);

  const handleSaveExpeditionDate = async () => {
    if (!currentTruck?.id || !updateTruckExpeditionDate) return;
    await updateTruckExpeditionDate(currentTruck.id, newExpeditionDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl">
        <DashboardHeader
          currentTruck={currentTruck}
          appConfig={appConfig}
          stats={stats}
          printBoxLabelsReport={printBoxLabelsReport}
          exportBoxLabelsExcel={exportBoxLabelsExcel}
          boxLabels={boxLabels}
          boxLabelsSummary={boxLabelsSummary}
          activeTruck={activeTruck}
          displayTruck={displayTruck}
          closeActiveTruck={closeActiveTruck}
          onClose={onClose}
        />

        <div className="overflow-y-auto p-6">
          <KPIGrid stats={stats} />
          <TruckProgress percent={stats.percent} />

          <div className="mt-6 grid gap-6 xl:grid-cols-[300px_1fr_360px]">
            <TruckHistory trucks={trucks} selectedTruckId={selectedTruckId} onSelectTruck={onSelectTruck} />
            <BoxMapPanel
              filteredBoxes={filteredBoxes}
              targetBoxes={targetBoxes}
              selectedBox={selectedBox}
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              onSearchBox={onSearchBox}
              setSelectedBoxNumber={setSelectedBoxNumber}
            />
            <BoxDetail
              selectedBox={selectedBox}
              currentTruck={currentTruck}
              newExpeditionDate={newExpeditionDate}
              setNewExpeditionDate={setNewExpeditionDate}
              handleSaveExpeditionDate={handleSaveExpeditionDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
