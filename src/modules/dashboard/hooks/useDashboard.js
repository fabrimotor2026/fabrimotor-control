import { useMemo } from "react";
import { buildTruckDashboardStats } from "../utils/truckStats";

export function useDashboard({ boxLabels = [], boxLabelsSummary = [], targetBoxes = 49 }) {
  return useMemo(
    () => buildTruckDashboardStats({ boxes: boxLabels, summary: boxLabelsSummary, targetBoxes }),
    [boxLabels, boxLabelsSummary, targetBoxes]
  );
}
