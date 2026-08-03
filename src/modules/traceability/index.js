export { default as TraceabilityPanel } from "./TraceabilityPanel.jsx";
export { default as TraceabilitySearch } from "./components/TraceabilitySearch.jsx";
export { default as TraceabilityStatus } from "./components/TraceabilityStatus.jsx";
export { default as TraceabilityTimeline } from "./components/TraceabilityTimeline.jsx";
export { default as TraceabilityCard } from "./components/TraceabilityCard.jsx";

export { getTraceability } from "./services/traceabilityService.js";

export {
  RELATION_CONFIDENCE,
  buildTimeline,
  createEmptyTraceability,
  getIncidentFields,
  getLabelFields,
  getRecordFields,
  getTruckFields,
  hasTraceabilityCriteria,
  normalizeReference,
  normalizeSearchCriteria,
} from "./utils/traceabilityModel.js";
