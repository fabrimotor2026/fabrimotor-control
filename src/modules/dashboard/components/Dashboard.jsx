import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDashboard } from "../hooks/useDashboard";
import { useTruckSelection } from "../hooks/useTruckSelection";
import { DEFAULT_TRUCK_CAPACITY } from "../../../config/constants";
import DashboardHeader from "./DashboardHeader";
import KPIGrid from "./KPIGrid";
import TruckProgress from "./TruckProgress";
import TruckHistory from "./TruckHistory";
import BoxMapPanel from "./BoxMapPanel";
import JointShipmentBoxMaps, {
  jointBoxKey,
} from "./JointShipmentBoxMaps";
import BoxDetail from "./BoxDetail";
import ExpeditionPlanner from "./ExpeditionPlanner";
import ExpeditionTrackingPanel from "./ExpeditionTrackingPanel";
import ExpeditionAlertCenter from "./ExpeditionAlertCenter";
import ExpeditionArchiveModal from "./ExpeditionArchiveModal";
import ExpeditionPerformanceModal from "./ExpeditionPerformanceModal";
import ExpeditionForecastModal from "./ExpeditionForecastModal";
import ExpeditionCalendarModal from "./ExpeditionCalendarModal";
import ExpeditionSimulationModal from "./ExpeditionSimulationModal";
import ExpeditionLoadingPlanModal from "./ExpeditionLoadingPlanModal";
import DockLoadingModal from "./DockLoadingModal";
import JointShipmentProgress from "./JointShipmentProgress";
import TruckAuditTimeline from "./TruckAuditTimeline";
import { supabase } from "../../../lib/supabaseClient";
import {
  createTruckDocumentDownloadUrl,
  deleteTruckDocument,
  fetchTruckDocuments,
  uploadTruckDocument,
} from "../../../services/truckDocumentService";
import {
  buildExpeditionChecklist,
} from "../../../services/expeditionChecklist";
import {
  recordTruckAuditEventSafely,
} from "../../../services/truckAuditService";
import {
  getJointDocumentReference,
} from "../../../services/jointShipmentService";

function formatExpeditionDate(value) {
  if (!value) return "Sin fecha";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizeShipmentStatusForTruck(truck) {
  const shipmentStatus =
    truck?.shipment_status || "PENDING";

  if (
    shipmentStatus === "SHIPPED" &&
    truck?.status !== "CLOSED"
  ) {
    return "PENDING";
  }

  return shipmentStatus;
}

function activeTruckDraftFromTruck(truck) {
  return {
    plannedExpeditionDate: truck?.planned_expedition_date || "",
    actualExpeditionDate: truck?.actual_expedition_date || "",
    customerName: truck?.customer_name || "",
    destination: truck?.destination || "",
    carrierName: truck?.carrier_name || "",
    tractorPlate: truck?.tractor_plate || truck?.vehicle_plate || "",
    trailerPlate: truck?.trailer_plate || "",
    sealNumber: truck?.seal_number || "",
    deliveryNoteNumber: truck?.delivery_note_number || "",
    shipmentStatus: normalizeShipmentStatusForTruck(truck),
    notes: truck?.notes || "",
  };
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "DELIVERY_NOTE", label: "Albarán" },
  { value: "CMR", label: "CMR" },
  { value: "PHOTO", label: "Fotografía de carga" },
  { value: "OTHER", label: "Otro documento" },
];

const REPRINT_REASON_OPTIONS = [
  "Etiqueta dañada",
  "Fallo de impresora",
  "Datos no legibles",
  "Copia autorizada",
  "Otro motivo",
];

function documentTypeLabel(value) {
  return (
    DOCUMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    "Otro documento"
  );
}

function formatFileSize(value) {
  const bytes = Number(value || 0);

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function formatReprintUser(reprint) {
  return (
    [
      reprint?.requested_by,
      reprint?.requested_by_name,
    ]
      .filter(Boolean)
      .join(" - ") ||
    "Usuario no identificado"
  );
}

function createEmptyDocumentDraft(inputVersion = 0) {
  return {
    documentType: "DELIVERY_NOTE",
    files: [],
    inputVersion,
  };
}

function LogisticsFieldLabel({ children }) {
  return (
    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
      {children}
    </span>
  );
}

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
  onUpdateActiveTruck,
  closeActiveTruck,
  onSelectTruck,
  onSearchBox,
  onLoadBoxReprints,
  onReprintBoxLabel,
  highlightBoxNumber,
  highlightBoxReference,
  onClose,
  truckSchedule = [],
  onCreatePlannedTruck,
  onUpdatePlannedTruck,
  onDeletePlannedTruck,
  currentUser,
  isAdminUser,
}) {
  const [searchValue, setSearchValue] = useState(highlightBoxNumber || "");
  const [newExpeditionDate, setNewExpeditionDate] = useState(
    (displayTruck || activeTruck)?.planned_expedition_date || ""
  );
  const [activeTruckDraft, setActiveTruckDraft] = useState(() =>
    activeTruckDraftFromTruck(displayTruck || activeTruck)
  );
  const [savingActiveTruck, setSavingActiveTruck] = useState(false);
  const [activeTruckSaveError, setActiveTruckSaveError] = useState("");
  const [activeTruckSaved, setActiveTruckSaved] = useState(false);
  const [currentTruckDocuments, setCurrentTruckDocuments] = useState([]);
  const [currentTruckDocumentDraft, setCurrentTruckDocumentDraft] =
    useState(createEmptyDocumentDraft);
  const [currentTruckDocumentsLoading, setCurrentTruckDocumentsLoading] =
    useState(false);
  const [activeTrackingDocuments, setActiveTrackingDocuments] =
    useState([]);
  const [plannedExpeditionTracking, setPlannedExpeditionTracking] =
    useState([]);
  const [currentTruckDocumentBusy, setCurrentTruckDocumentBusy] =
    useState(false);
  const [currentTruckDocumentError, setCurrentTruckDocumentError] =
    useState("");
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [reprintReason, setReprintReason] = useState("");
  const [reprintOtherReason, setReprintOtherReason] = useState("");
  const [reprintHistory, setReprintHistory] = useState([]);
  const [reprintHistoryLoading, setReprintHistoryLoading] = useState(false);
  const [reprintBusy, setReprintBusy] = useState(false);
  const [reprintError, setReprintError] = useState("");
  const [reprintSuccess, setReprintSuccess] = useState("");
  const [showExpeditionArchive, setShowExpeditionArchive] =
    useState(false);
  const [
    showExpeditionPerformance,
    setShowExpeditionPerformance,
  ] = useState(false);
  const [showExpeditionForecast, setShowExpeditionForecast] =
    useState(false);
  const [showExpeditionCalendar, setShowExpeditionCalendar] =
    useState(false);
  const [
    showExpeditionSimulation,
    setShowExpeditionSimulation,
  ] = useState(false);
  const [
    showExpeditionLoadingPlan,
    setShowExpeditionLoadingPlan,
  ] = useState(false);
  const [showDockLoading, setShowDockLoading] = useState(false);
  const [expeditionAlertSummary, setExpeditionAlertSummary] =
    useState({
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
    });
  const [jointShipmentProgress, setJointShipmentProgress] =
    useState(null);

  const currentTruck = displayTruck || activeTruck;
  const isJointTruck = Boolean(currentTruck?.joint_shipment_id);
  const currentDocumentReference =
    getJointDocumentReference(currentTruck);

useEffect(() => {
  setNewExpeditionDate(
    currentTruck?.planned_expedition_date || ""
  );
}, [currentTruck?.id, currentTruck?.planned_expedition_date]);

useEffect(() => {
  setActiveTruckDraft(activeTruckDraftFromTruck(currentTruck));
  setActiveTruckSaveError("");
  setActiveTruckSaved(false);
}, [currentTruck]);

useEffect(() => {
  let cancelled = false;

  const loadCurrentTruckDocuments = async () => {
    if (!currentTruck?.truck_number) {
      setCurrentTruckDocuments([]);
      return;
    }

    setCurrentTruckDocumentsLoading(true);
    setCurrentTruckDocumentError("");
    setCurrentTruckDocumentDraft(createEmptyDocumentDraft());

    try {
      const documents = await fetchTruckDocuments(supabase, {
        reference: currentDocumentReference,
        truckNumber: currentTruck.truck_number,
      });

      if (!cancelled) {
        setCurrentTruckDocuments(documents);
      }
    } catch (error) {
      if (!cancelled) {
        setCurrentTruckDocuments([]);
        setCurrentTruckDocumentError(
          error?.message || "No se han podido cargar los documentos."
        );
      }
    } finally {
      if (!cancelled) {
        setCurrentTruckDocumentsLoading(false);
      }
    }
  };

  loadCurrentTruckDocuments();

  return () => {
    cancelled = true;
  };
}, [
  currentTruck?.id,
  currentTruck?.reference,
  currentTruck?.truck_number,
  currentDocumentReference,
]);

useEffect(() => {
  let cancelled = false;

  const loadActiveTrackingDocuments = async () => {
    if (!activeTruck?.truck_number) {
      setActiveTrackingDocuments([]);
      return;
    }

    if (currentTruck?.id === activeTruck.id) {
      setActiveTrackingDocuments(currentTruckDocuments);
      return;
    }

    try {
      const documents = await fetchTruckDocuments(supabase, {
        reference: getJointDocumentReference(activeTruck),
        truckNumber: activeTruck.truck_number,
      });

      if (!cancelled) {
        setActiveTrackingDocuments(documents);
      }
    } catch (error) {
      if (!cancelled) {
        setActiveTrackingDocuments([]);
      }
    }
  };

  loadActiveTrackingDocuments();

  return () => {
    cancelled = true;
  };
}, [
  activeTruck?.id,
  activeTruck?.reference,
  activeTruck?.truck_number,
  currentTruck?.id,
  currentTruckDocuments,
]);

const targetBoxes = isJointTruck
  ? 98
  : Number(
      appConfig.boxesPerTruck ||
        truckProgress?.targetBoxes ||
        DEFAULT_TRUCK_CAPACITY
    );
  const dashboardAppConfig = isJointTruck
    ? {
        ...appConfig,
        reference: "F-1013 + F-1012",
        boxesPerTruck: 98,
      }
    : appConfig;
  const stats = useDashboard({ boxLabels, boxLabelsSummary, targetBoxes });
  const {
    selectedBox: standardSelectedBox,
    setSelectedBoxNumber,
  } = useTruckSelection({
    boxLabelsSummary,
    highlightBoxNumber,
  });
  const [jointSelectedBoxKey, setJointSelectedBoxKey] = useState("");
  const jointSelectedBox = useMemo(
    () =>
      boxLabelsSummary.find(
        (box) => jointBoxKey(box) === jointSelectedBoxKey
      ) || null,
    [boxLabelsSummary, jointSelectedBoxKey]
  );
  const selectedBox = isJointTruck
    ? jointSelectedBox
    : standardSelectedBox;
  const selectedBoxNumber =
    selectedBox?.numeroCaja ||
    selectedBox?.numero_caja ||
    "";
  const selectedBoxReference = String(
    selectedBox?.reference || ""
  ).replace("-", "");

  useEffect(() => {
    setSearchValue(highlightBoxNumber || "");
  }, [highlightBoxNumber]);

  useEffect(() => {
    if (!isJointTruck) {
      setJointSelectedBoxKey("");
      return;
    }

    const normalizedHighlightReference = String(
      highlightBoxReference || ""
    )
      .trim()
      .toUpperCase()
      .replace(/^F(\d)/, "F-$1");
    const highlightedBox = boxLabelsSummary.find((box) => {
      const boxNumber = box?.numeroCaja || box?.numero_caja || "";
      const boxReference = String(box?.reference || "")
        .trim()
        .toUpperCase()
        .replace(/^F(\d)/, "F-$1");

      return (
        String(boxNumber).toUpperCase() ===
          String(highlightBoxNumber || "").toUpperCase() &&
        (!normalizedHighlightReference ||
          boxReference === normalizedHighlightReference)
      );
    });

    if (highlightedBox) {
      setJointSelectedBoxKey(jointBoxKey(highlightedBox));
      return;
    }

    setJointSelectedBoxKey((previous) => {
      const previousExists = boxLabelsSummary.some(
        (box) => jointBoxKey(box) === previous
      );

      if (previousExists) return previous;

      const lastBox =
        boxLabelsSummary[boxLabelsSummary.length - 1] || null;
      return lastBox ? jointBoxKey(lastBox) : "";
    });
  }, [
    isJointTruck,
    boxLabelsSummary,
    highlightBoxNumber,
    highlightBoxReference,
  ]);

  const openReprintModal = async () => {
    if (!selectedBoxNumber || !onReprintBoxLabel) return;

    setShowReprintModal(true);
    setReprintReason("");
    setReprintOtherReason("");
    setReprintError("");
    setReprintSuccess("");
    setReprintHistory([]);

    if (!onLoadBoxReprints) return;

    setReprintHistoryLoading(true);

    try {
      const history = await onLoadBoxReprints(selectedBox);
      setReprintHistory(
        Array.isArray(history) ? history : []
      );
    } catch (error) {
      setReprintError(
        error?.message ||
        "No se ha podido cargar el historial de reimpresiones."
      );
    } finally {
      setReprintHistoryLoading(false);
    }
  };

  const closeReprintModal = () => {
    if (reprintBusy) return;
    setShowReprintModal(false);
  };

  const confirmLabelReprint = async () => {
    if (!selectedBox || !onReprintBoxLabel || reprintBusy) {
      return;
    }

    const selectedReason =
      reprintReason === "Otro motivo"
        ? reprintOtherReason.trim()
        : reprintReason;

    if (!selectedReason) {
      setReprintError("Selecciona o escribe el motivo de la reimpresión.");
      return;
    }

    setReprintBusy(true);
    setReprintError("");

    try {
      const result = await onReprintBoxLabel(
        selectedBox,
        selectedReason
      );
      const audit = result?.audit;

      if (audit) {
        setReprintHistory((previous) => [
          audit,
          ...previous.filter(
            (item) => item?.id !== audit?.id
          ),
        ]);
      }

      setShowReprintModal(false);
      setReprintSuccess(
        `Etiqueta ${selectedBoxNumber} enviada a impresión sin crear una caja nueva.`
      );
    } catch (error) {
      setReprintError(
        error?.message ||
        "No se ha podido reimprimir la etiqueta."
      );
    } finally {
      setReprintBusy(false);
    }
  };

  const canManageExpeditions = Boolean(isAdminUser?.(currentUser));

  const openArchivedActualTruck = async (truck) => {
    if (!truck?.id || !onSelectTruck) return;

    await onSelectTruck(truck);

    window.setTimeout(() => {
      window.document
        .getElementById("active-truck-logistics")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const openArchivedPlannedTruck = (truck) => {
    if (!truck?.id) return;

    window.setTimeout(() => {
      window.document
        .getElementById(`expedition-truck-${truck.id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const openExpeditionArchive = () => {
    setShowExpeditionPerformance(false);
    setShowExpeditionForecast(false);
    setShowExpeditionCalendar(false);
    setShowExpeditionSimulation(false);
    setShowExpeditionLoadingPlan(false);
    setShowDockLoading(false);
    setShowExpeditionArchive(true);
  };

  const openExpeditionPerformance = () => {
    setShowExpeditionArchive(false);
    setShowExpeditionForecast(false);
    setShowExpeditionCalendar(false);
    setShowExpeditionSimulation(false);
    setShowExpeditionLoadingPlan(false);
    setShowDockLoading(false);
    setShowExpeditionPerformance(true);
  };

  const openExpeditionForecast = () => {
    setShowExpeditionArchive(false);
    setShowExpeditionPerformance(false);
    setShowExpeditionCalendar(false);
    setShowExpeditionSimulation(false);
    setShowExpeditionLoadingPlan(false);
    setShowDockLoading(false);
    setShowExpeditionForecast(true);
  };

  const openExpeditionCalendar = () => {
    setShowExpeditionArchive(false);
    setShowExpeditionPerformance(false);
    setShowExpeditionForecast(false);
    setShowExpeditionSimulation(false);
    setShowExpeditionLoadingPlan(false);
    setShowDockLoading(false);
    setShowExpeditionCalendar(true);
  };

  const openExpeditionSimulation = () => {
    setShowExpeditionArchive(false);
    setShowExpeditionPerformance(false);
    setShowExpeditionForecast(false);
    setShowExpeditionCalendar(false);
    setShowExpeditionLoadingPlan(false);
    setShowDockLoading(false);
    setShowExpeditionSimulation(true);
  };

  const openExpeditionLoadingPlan = () => {
    setShowExpeditionArchive(false);
    setShowExpeditionPerformance(false);
    setShowExpeditionForecast(false);
    setShowExpeditionCalendar(false);
    setShowExpeditionSimulation(false);
    setShowDockLoading(false);
    setShowExpeditionLoadingPlan(true);
  };

  const openDockLoading = () => {
    setShowExpeditionArchive(false);
    setShowExpeditionPerformance(false);
    setShowExpeditionForecast(false);
    setShowExpeditionCalendar(false);
    setShowExpeditionSimulation(false);
    setShowExpeditionLoadingPlan(false);
    setShowDockLoading(true);
  };

  const scrollToExpeditionAlerts = () => {
    window.document
      .getElementById("expedition-alert-center")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  useEffect(() => {
    setReprintSuccess("");
  }, [selectedBoxNumber, currentTruck?.id]);

  const expeditionChecklist = buildExpeditionChecklist({
    truck: currentTruck,
    draft: activeTruckDraft,
    documents: currentTruckDocuments,
    requireProductionClosed: true,
    jointProgress: currentTruck?.joint_shipment_id
      ? jointShipmentProgress
      : null,
  });
  const shipmentRequirements =
    expeditionChecklist.requiredItems;
  const optionalShipmentItems =
    expeditionChecklist.optionalItems;
  const isShipmentConfirmed =
    currentTruck?.status === "CLOSED" &&
    currentTruck?.shipment_status === "SHIPPED";
  const activeExpeditionTracking = activeTruck
    ? {
        kind: "active",
        truck: activeTruck,
        checklist: buildExpeditionChecklist({
          truck: activeTruck,
          documents: activeTrackingDocuments,
          requireProductionClosed: true,
        }),
      }
    : null;

  const filteredBoxes = useMemo(() => {
    return boxLabelsSummary.filter((box) => {
      const text = [box.numeroCaja, box.operario, box.fecha, box.combinaciones?.join(" ")]
        .concat(box.reference || "")
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !searchValue || text.includes(searchValue.toLowerCase());
    });
  }, [boxLabelsSummary, searchValue]);

  const plannedExpeditions = useMemo(() => {
    return [...truckSchedule]
      .filter((truck) => truck?.status === "PLANNED")
      .sort((first, second) => {
        const firstPriority = Number(
          first?.planning_priority
        );
        const secondPriority = Number(
          second?.planning_priority
        );
        const hasFirstPriority =
          Number.isInteger(firstPriority) &&
          firstPriority > 0;
        const hasSecondPriority =
          Number.isInteger(secondPriority) &&
          secondPriority > 0;

        if (hasFirstPriority || hasSecondPriority) {
          const priorityDifference =
            (hasFirstPriority
              ? firstPriority
              : Number.MAX_SAFE_INTEGER) -
            (hasSecondPriority
              ? secondPriority
              : Number.MAX_SAFE_INTEGER);

          if (priorityDifference) return priorityDifference;
        }

        const firstDate = first?.planned_expedition_date || "9999-12-31";
        const secondDate = second?.planned_expedition_date || "9999-12-31";

        return (
          firstDate.localeCompare(secondDate) ||
          Number(first?.truck_number || 0) - Number(second?.truck_number || 0)
        );
      });
  }, [truckSchedule]);

  const upcomingExpeditions = useMemo(
    () => plannedExpeditions.slice(0, 6),
    [plannedExpeditions]
  );

  const handleSaveExpeditionDate = async () => {
    if (!currentTruck?.id || !updateTruckExpeditionDate) return;
    await updateTruckExpeditionDate(currentTruck.id, newExpeditionDate);
  };

  const updateActiveTruckDraft = (field, value) => {
    setActiveTruckDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    setActiveTruckSaveError("");
    setActiveTruckSaved(false);
  };

  const handleSaveActiveTruck = async (event) => {
    event.preventDefault();

    if (!currentTruck?.id || !onUpdateActiveTruck || savingActiveTruck) {
      return;
    }

    setSavingActiveTruck(true);
    setActiveTruckSaveError("");
    setActiveTruckSaved(false);

    try {
      const updatedTruck = await onUpdateActiveTruck(
        currentTruck,
        activeTruckDraft
      );

      if (!updatedTruck) {
        throw new Error("No se ha podido actualizar el camión.");
      }

      setActiveTruckDraft(activeTruckDraftFromTruck(updatedTruck));
      setNewExpeditionDate(
        updatedTruck.planned_expedition_date || ""
      );

      setActiveTruckSaved(true);
    } catch (error) {
      setActiveTruckSaveError(
        error?.message || "No se han podido guardar los datos del camión."
      );
    } finally {
      setSavingActiveTruck(false);
    }
  };

  const updateCurrentTruckDocumentDraft = (field, value) => {
    setCurrentTruckDocumentDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    setCurrentTruckDocumentError("");
  };

  const refreshCurrentTruckDocuments = async () => {
    if (!currentTruck?.truck_number) {
      setCurrentTruckDocuments([]);
      return [];
    }

    const documents = await fetchTruckDocuments(supabase, {
      reference: currentDocumentReference,
      truckNumber: currentTruck.truck_number,
    });

    setCurrentTruckDocuments(documents);
    return documents;
  };

  const addCurrentTruckDocuments = async () => {
    const files = Array.from(currentTruckDocumentDraft.files || []);

    if (!currentTruck?.id || !files.length || currentTruckDocumentBusy) {
      setCurrentTruckDocumentError("Selecciona al menos un archivo.");
      return;
    }

    setCurrentTruckDocumentBusy(true);
    setCurrentTruckDocumentError("");

    try {
      for (const file of files) {
        await uploadTruckDocument(supabase, {
          reference: currentDocumentReference,
          truckNumber: currentTruck.truck_number,
          truckId: currentTruck.id,
          documentType: currentTruckDocumentDraft.documentType,
          file,
          uploadedBy:
            currentUser?.username ||
            currentUser?.name ||
            "Sistema",
        });

        await recordTruckAuditEventSafely(supabase, {
          truck: currentTruck,
          truckId: currentTruck.id,
          eventType: "DOCUMENT_ADDED",
          eventLabel: "Documento añadido",
          actor: currentUser,
          metadata: {
            file_name: file.name,
            file_size: file.size,
            document_type:
              currentTruckDocumentDraft.documentType,
            document_type_label: documentTypeLabel(
              currentTruckDocumentDraft.documentType
            ),
          },
          source: "ACTIVE",
        });
      }

      await refreshCurrentTruckDocuments();
      setCurrentTruckDocumentDraft((previous) =>
        createEmptyDocumentDraft(previous.inputVersion + 1)
      );
    } catch (error) {
      setCurrentTruckDocumentError(
        error?.message || "No se han podido añadir los documentos."
      );
    } finally {
      setCurrentTruckDocumentBusy(false);
    }
  };

  const openCurrentTruckDocument = async (document) => {
    setCurrentTruckDocumentError("");

    try {
      const signedUrl = await createTruckDocumentDownloadUrl(
        supabase,
        document
      );

      if (!signedUrl) {
        throw new Error("No se ha podido obtener el enlace del documento.");
      }

      const link = window.document.createElement("a");
      link.href = signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setCurrentTruckDocumentError(
        error?.message || "No se ha podido abrir el documento."
      );
    }
  };

  const removeCurrentTruckDocument = async (document) => {
    if (
      !window.confirm(
        `¿Eliminar el documento "${document.file_name}" del camión ${currentTruck?.truck_number}?`
      )
    ) {
      return;
    }

    setCurrentTruckDocumentBusy(true);
    setCurrentTruckDocumentError("");

    try {
      await deleteTruckDocument(supabase, document);

      await recordTruckAuditEventSafely(supabase, {
        truck: currentTruck,
        truckId: currentTruck.id,
        eventType: "DOCUMENT_DELETED",
        eventLabel: "Documento eliminado",
        actor: currentUser,
        metadata: {
          file_name: document.file_name,
          file_size: document.file_size,
          document_type: document.document_type,
          document_type_label: documentTypeLabel(
            document.document_type
          ),
        },
        source: "ACTIVE",
      });

      await refreshCurrentTruckDocuments();
    } catch (error) {
      setCurrentTruckDocumentError(
        error?.message || "No se ha podido eliminar el documento."
      );
    } finally {
      setCurrentTruckDocumentBusy(false);
    }
  };

  

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 sm:p-4 lg:pt-10">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl">
        <DashboardHeader
          currentTruck={currentTruck}
          appConfig={dashboardAppConfig}
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

        <div className="min-w-0 overflow-x-hidden overflow-y-auto p-3 sm:p-6">
          <KPIGrid stats={stats} />
          <TruckProgress percent={stats.percent} />

          {currentTruck?.joint_shipment_id && (
            <JointShipmentProgress
              supabase={supabase}
              truck={currentTruck}
              onProgress={setJointShipmentProgress}
            />
          )}

          {canManageExpeditions && (
            <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                  Logística · V2.38
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Expedición conjunta F1013 + F1012
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Un solo camión: 49 cajas F1013 + 49 cajas F1012. El control termina al registrar su salida.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openDockLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Muelle de carga
                </button>
                <button
                  type="button"
                  onClick={openExpeditionLoadingPlan}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
                >
                  Plan de carga
                </button>
                <button
                  type="button"
                  onClick={openExpeditionSimulation}
                  className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-violet-700"
                >
                  Simular plan
                </button>
                <button
                  type="button"
                  onClick={openExpeditionCalendar}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
                >
                  Calendario
                </button>
                <button
                  type="button"
                  onClick={scrollToExpeditionAlerts}
                  className={`rounded-xl px-5 py-3 font-black shadow-sm transition ${
                    expeditionAlertSummary.critical
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : expeditionAlertSummary.warning
                        ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                        : expeditionAlertSummary.total
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  Alertas · {expeditionAlertSummary.total}
                </button>
                <button
                  type="button"
                  onClick={openExpeditionForecast}
                  className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white shadow-sm transition hover:bg-slate-800"
                >
                  Previsión de carga
                </button>
                <button
                  type="button"
                  onClick={openExpeditionPerformance}
                  className="rounded-xl bg-white px-5 py-3 font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Rendimiento de preparación
                </button>
                <button
                  type="button"
                  onClick={openExpeditionArchive}
                  className="rounded-xl bg-white px-5 py-3 font-black text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50"
                >
                  Abrir archivo histórico
                </button>
              </div>
            </section>
          )}

          {canManageExpeditions && (
            <ExpeditionAlertCenter
              activeEntry={activeExpeditionTracking}
              plannedEntries={plannedExpeditionTracking}
              currentTruck={currentTruck}
              activeTruck={activeTruck}
              nextPlannedTruck={plannedExpeditions[0] || null}
              targetBoxes={targetBoxes}
              piecesPerBox={Number(appConfig.piecesPerBox || 16)}
              onOpenActualTruck={openArchivedActualTruck}
              onOpenPlannedTruck={openArchivedPlannedTruck}
              onOpenForecast={openExpeditionForecast}
              onSummaryChange={setExpeditionAlertSummary}
            />
          )}

          {canManageExpeditions && (
            <ExpeditionTrackingPanel
              activeEntry={activeExpeditionTracking}
              plannedEntries={plannedExpeditionTracking}
              currentTruckId={currentTruck?.id}
              onSelectTruck={onSelectTruck}
            />
          )}

          {canManageExpeditions && currentTruck && (
            <form
              id="active-truck-logistics"
              onSubmit={handleSaveActiveTruck}
              className="mt-6 rounded-[1.5rem] border border-blue-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                    Datos del camión seleccionado
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Camión {currentTruck.truck_number}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Edita las fechas, matrículas y datos reales de esta expedición.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                    currentTruck.status === "OPEN"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {currentTruck.status === "OPEN" ? "Camión activo" : "Histórico"}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
                Estos datos pertenecen al mismo camión conjunto y se comparten entre F1012 y F1013.
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <LogisticsFieldLabel>Día real de expedición</LogisticsFieldLabel>
                  <input
                    type="date"
                    value={activeTruckDraft.actualExpeditionDate}
                    onChange={(event) =>
                      updateActiveTruckDraft(
                        "actualExpeditionDate",
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <LogisticsFieldLabel>Matrícula tractora</LogisticsFieldLabel>
                  <input
                    value={activeTruckDraft.tractorPlate}
                    onChange={(event) =>
                      updateActiveTruckDraft(
                        "tractorPlate",
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="0000 ABC"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <LogisticsFieldLabel>Matrícula remolque</LogisticsFieldLabel>
                  <input
                    value={activeTruckDraft.trailerPlate}
                    onChange={(event) =>
                      updateActiveTruckDraft(
                        "trailerPlate",
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="R-0000-ABC"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <LogisticsFieldLabel>Brida / precinto</LogisticsFieldLabel>
                  <input
                    value={activeTruckDraft.sealNumber}
                    onChange={(event) =>
                      updateActiveTruckDraft(
                        "sealNumber",
                        event.target.value
                      )
                    }
                    placeholder="Número de brida"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block md:col-span-2 xl:col-span-3">
                  <LogisticsFieldLabel>Observaciones</LogisticsFieldLabel>
                  <textarea
                    rows={2}
                    value={activeTruckDraft.notes}
                    onChange={(event) =>
                      updateActiveTruckDraft("notes", event.target.value)
                    }
                    placeholder="Información adicional de la expedición"
                    className="min-h-[5rem] w-full resize-y rounded-2xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={savingActiveTruck}
                    className="h-12 w-full rounded-2xl bg-blue-600 px-5 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {savingActiveTruck ? "Guardando..." : "Guardar datos"}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                No se registran costes, facturas de transporte ni datos de llegada a destino.
              </p>

              {activeTruckSaveError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {activeTruckSaveError}
                </div>
              )}

              {activeTruckSaved && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  Datos del camión guardados correctamente.
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      Control de salida
                    </div>
                    <h4 className="mt-1 text-xl font-black text-slate-950">
                      Confirmación de expedición
                    </h4>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      El cierre de producción y la salida real del camión se registran por separado.
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                      isShipmentConfirmed
                        ? "bg-emerald-100 text-emerald-800"
                        : expeditionChecklist.isReady
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {expeditionChecklist.statusLabel}
                  </span>
                </div>

                {expeditionChecklist.dateAlert && (
                  <div
                    className={`mt-4 rounded-2xl border px-4 py-3 ${
                      expeditionChecklist.dateAlert.level === "danger"
                        ? "border-red-300 bg-red-50 text-red-800"
                        : expeditionChecklist.dateAlert.level === "warning"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-blue-200 bg-blue-50 text-blue-800"
                    }`}
                  >
                    <div className="text-sm font-black">
                      {expeditionChecklist.dateAlert.label}
                    </div>
                    <div className="mt-1 text-xs font-bold">
                      {expeditionChecklist.dateAlert.message}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-600">
                    <span>
                      {expeditionChecklist.completedRequired}/
                      {expeditionChecklist.totalRequired} requisitos
                    </span>
                    <span>{expeditionChecklist.percent}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        expeditionChecklist.isReady
                          ? "bg-emerald-500"
                          : "bg-blue-600"
                      }`}
                      style={{
                        width: `${expeditionChecklist.percent}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {shipmentRequirements.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-2xl border px-4 py-3 ${
                        item.complete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-800">
                          {item.label}
                        </span>
                        <span
                          className={`text-lg font-black ${
                            item.complete
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {item.complete ? "✓" : "!"}
                        </span>
                      </div>
                      <div
                        className={`mt-1 text-xs font-bold ${
                          item.complete
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {item.complete ? "Completado" : "Obligatorio"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {optionalShipmentItems.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-2xl border px-4 py-3 ${
                        item.complete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-800">
                          {item.label}
                        </span>
                        <span
                          className={`text-xs font-black uppercase ${
                            item.complete
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }`}
                        >
                          {item.complete ? "Adjunto" : "Opcional"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {isShipmentConfirmed ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <div>
                      <div className="text-sm font-black text-emerald-800">
                        Expedición confirmada correctamente
                      </div>
                      <div className="mt-1 text-xs font-bold text-emerald-700">
                        {currentTruck.shipped_by || "Sistema"}
                        {" · "}
                        {formatDateTime(currentTruck.shipped_at)}
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-black uppercase text-emerald-800">
                      Control finalizado en Fabrimotor
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">
                    Completa las 49 cajas F1012 y las 49 cajas F1013, registra
                    las dos matrículas, la brida y el día real de expedición.
                    Después de la salida no se realizará seguimiento hasta destino.
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      Documentos del camión
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-500">
                      Albaranes, CMR, fotografías de carga y otros archivos.
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {currentTruckDocumentsLoading
                      ? "Cargando..."
                      : `${currentTruckDocuments.length} documentos`}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                  <select
                    value={currentTruckDocumentDraft.documentType}
                    onChange={(event) =>
                      updateCurrentTruckDocumentDraft(
                        "documentType",
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <input
                    key={currentTruckDocumentDraft.inputVersion}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,image/*"
                    onChange={(event) =>
                      updateCurrentTruckDocumentDraft(
                        "files",
                        Array.from(event.target.files || [])
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-black file:text-blue-700"
                  />

                  <button
                    type="button"
                    onClick={addCurrentTruckDocuments}
                    disabled={
                      currentTruckDocumentBusy ||
                      !currentTruckDocumentDraft.files?.length
                    }
                    className="h-12 rounded-2xl bg-blue-600 px-5 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {currentTruckDocumentBusy ? "Procesando..." : "Añadir"}
                  </button>
                </div>

                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Puedes seleccionar varios archivos. Tamaño máximo: 25 MB por archivo.
                </div>

                {currentTruckDocumentError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {currentTruckDocumentError}
                  </div>
                )}

                {currentTruckDocuments.length ? (
                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                    {currentTruckDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase text-blue-700">
                            {documentTypeLabel(document.document_type)}
                          </div>
                          <div className="mt-1 truncate text-sm font-black text-slate-900">
                            {document.file_name}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            {formatFileSize(document.file_size)}
                            {document.uploaded_by
                              ? ` · ${document.uploaded_by}`
                              : ""}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openCurrentTruckDocument(document)
                            }
                            disabled={currentTruckDocumentBusy}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeCurrentTruckDocument(document)
                            }
                            disabled={currentTruckDocumentBusy}
                            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !currentTruckDocumentsLoading ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-500">
                    Todavía no hay documentos asociados a este camión.
                  </div>
                ) : null}
              </div>
            </form>
          )}

          {canManageExpeditions && currentTruck && (
            <TruckAuditTimeline truck={currentTruck} />
          )}

          {canManageExpeditions ? (
            <div className="mt-6">
              <ExpeditionPlanner
                truckSchedule={plannedExpeditions}
                onCreatePlannedTruck={onCreatePlannedTruck}
                onUpdatePlannedTruck={onUpdatePlannedTruck}
                onDeletePlannedTruck={onDeletePlannedTruck}
                currentUser={currentUser}
                onTrackingChange={setPlannedExpeditionTracking}
              />
            </div>
          ) : (
            <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                    Expediciones
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Próximos camiones
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    La planificación se edita desde una sesión de Administrador.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                  Solo consulta
                </span>
              </div>

              {upcomingExpeditions.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {upcomingExpeditions.map((truck) => (
                    <div
                      key={truck.id || truck.truck_number}
                      className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-lg font-black text-slate-950">
                          Camión {truck.truck_number}
                        </span>
                        <span className="shrink-0 rounded-full bg-blue-700 px-2.5 py-1 text-[11px] font-black uppercase text-white">
                          {truck.status === "OPEN" ? "Abierto" : "Planificado"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-600">
                        Expedición: {formatExpeditionDate(truck.planned_expedition_date)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
                  No hay camiones planificados pendientes.
                </div>
              )}
            </section>
          )}

          <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <TruckHistory trucks={trucks} selectedTruckId={selectedTruckId} onSelectTruck={onSelectTruck} />
            </div>
            <div className="min-w-0">
              {isJointTruck ? (
                <JointShipmentBoxMaps
                  boxes={boxLabelsSummary}
                  targetBoxesPerReference={49}
                  selectedBox={selectedBox}
                  searchValue={searchValue}
                  setSearchValue={setSearchValue}
                  onSearchBox={onSearchBox}
                  onSelectBox={(box) =>
                    setJointSelectedBoxKey(
                      box ? jointBoxKey(box) : ""
                    )
                  }
                  highlightBoxNumber={highlightBoxNumber}
                  highlightBoxReference={highlightBoxReference}
                />
              ) : (
                <BoxMapPanel
                  filteredBoxes={filteredBoxes}
                  targetBoxes={targetBoxes}
                  selectedBox={selectedBox}
                  searchValue={searchValue}
                  setSearchValue={setSearchValue}
                  onSearchBox={onSearchBox}
                  setSelectedBoxNumber={setSelectedBoxNumber}
                />
              )}
            </div>
            <div className="min-w-0 xl:col-span-2 2xl:col-span-1">
              {isJointTruck && selectedBox && (
                <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    Referencia seleccionada
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {selectedBoxReference}
                  </p>
                </div>
              )}

              <BoxDetail
                selectedBox={selectedBox}
                currentTruck={currentTruck}
                newExpeditionDate={newExpeditionDate}
                setNewExpeditionDate={setNewExpeditionDate}
                handleSaveExpeditionDate={handleSaveExpeditionDate}
                canEditExpeditionDate={
                  canManageExpeditions &&
                  !currentTruck?.joint_shipment_id
                }
              />

              {selectedBox && (
                <section className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                    Etiqueta de caja
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    Reimpresión controlada
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Reimprime {selectedBoxNumber} con sus datos originales.
                    No crea otra caja ni modifica el camión.
                  </p>

                  <button
                    type="button"
                    onClick={openReprintModal}
                    className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!onReprintBoxLabel}
                  >
                    Reimprimir etiqueta
                  </button>

                  {reprintSuccess && (
                    <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                      {reprintSuccess}
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExpeditionArchive && (
        <ExpeditionArchiveModal
          reference={appConfig.reference || "F-1012"}
          onOpenActualTruck={openArchivedActualTruck}
          onOpenPlannedTruck={openArchivedPlannedTruck}
          onOpenPerformance={openExpeditionPerformance}
          onOpenForecast={openExpeditionForecast}
          onClose={() => setShowExpeditionArchive(false)}
        />
      )}

      {showExpeditionPerformance && (
        <ExpeditionPerformanceModal
          reference={appConfig.reference || "F-1012"}
          onOpenTruck={openArchivedActualTruck}
          onOpenArchive={openExpeditionArchive}
          onOpenForecast={openExpeditionForecast}
          onClose={() => setShowExpeditionPerformance(false)}
        />
      )}

      {showExpeditionForecast && (
        <ExpeditionForecastModal
          reference={appConfig.reference || "F-1012"}
          activeTruck={activeTruck}
          nextPlannedTruck={plannedExpeditions[0] || null}
          targetBoxes={targetBoxes}
          piecesPerBox={Number(appConfig.piecesPerBox || 16)}
          onOpenTruck={openArchivedActualTruck}
          onOpenPlannedTruck={openArchivedPlannedTruck}
          onOpenArchive={openExpeditionArchive}
          onOpenPerformance={openExpeditionPerformance}
          onClose={() => setShowExpeditionForecast(false)}
        />
      )}

      {showExpeditionCalendar && (
        <ExpeditionCalendarModal
          reference={appConfig.reference || "F-1012"}
          activeTruck={activeTruck}
          targetBoxes={targetBoxes}
          piecesPerBox={Number(appConfig.piecesPerBox || 16)}
          onOpenActualTruck={openArchivedActualTruck}
          onOpenPlannedTruck={openArchivedPlannedTruck}
          onOpenForecast={openExpeditionForecast}
          onOpenSimulation={openExpeditionSimulation}
          onClose={() => setShowExpeditionCalendar(false)}
        />
      )}

      {showExpeditionSimulation && (
        <ExpeditionSimulationModal
          reference={appConfig.reference || "F-1012"}
          activeTruck={activeTruck}
          targetBoxes={targetBoxes}
          piecesPerBox={Number(appConfig.piecesPerBox || 16)}
          onUpdatePlannedTruck={onUpdatePlannedTruck}
          onOpenCalendar={openExpeditionCalendar}
          onClose={() => setShowExpeditionSimulation(false)}
        />
      )}

      {showExpeditionLoadingPlan && (
        <ExpeditionLoadingPlanModal
          reference={appConfig.reference || "F-1012"}
          targetBoxes={targetBoxes}
          currentUser={currentUser}
          onOpenActualTruck={openArchivedActualTruck}
          onOpenPlannedTruck={openArchivedPlannedTruck}
          onOpenCalendar={openExpeditionCalendar}
          onClose={() => setShowExpeditionLoadingPlan(false)}
        />
      )}

      {showDockLoading && (
        <DockLoadingModal
          reference={appConfig.reference || "F-1012"}
          targetBoxes={targetBoxes}
          currentUser={currentUser}
          onOpenActualTruck={openArchivedActualTruck}
          onOpenLoadingPlan={openExpeditionLoadingPlan}
          onClose={() => setShowDockLoading(false)}
        />
      )}

      {showReprintModal && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reprint-label-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                  FM Control · V2.21
                </p>
                <h2
                  id="reprint-label-title"
                  className="mt-1 text-2xl font-black text-slate-950"
                >
                  Reimprimir {selectedBoxNumber}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Se utilizarán exactamente los datos originales de la caja.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReprintModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xl font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                disabled={reprintBusy}
                aria-label="Cerrar reimpresión"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-950">
                Esta operación no incrementa el contador, no genera un registro
                de caja nuevo y no cambia la ocupación del camión.
              </div>

              <div>
                <label
                  htmlFor="reprint-reason"
                  className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600"
                >
                  Motivo de la reimpresión *
                </label>
                <select
                  id="reprint-reason"
                  value={reprintReason}
                  onChange={(event) => {
                    setReprintReason(event.target.value);
                    setReprintError("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  disabled={reprintBusy}
                >
                  <option value="">Seleccionar motivo</option>
                  {REPRINT_REASON_OPTIONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {reprintReason === "Otro motivo" && (
                <div>
                  <label
                    htmlFor="reprint-other-reason"
                    className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600"
                  >
                    Detalle del motivo *
                  </label>
                  <textarea
                    id="reprint-other-reason"
                    value={reprintOtherReason}
                    onChange={(event) => {
                      setReprintOtherReason(event.target.value);
                      setReprintError("");
                    }}
                    rows={3}
                    maxLength={300}
                    placeholder="Describe brevemente el motivo"
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    disabled={reprintBusy}
                  />
                </div>
              )}

              {reprintError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {reprintError}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-slate-950">
                    Historial de reimpresiones
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-700">
                    {reprintHistory.length}
                  </span>
                </div>

                {reprintHistoryLoading ? (
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Cargando historial...
                  </p>
                ) : reprintHistory.length ? (
                  <div className="mt-3 space-y-2">
                    {reprintHistory.slice(0, 8).map((reprint, index) => (
                      <div
                        key={reprint?.id || `${reprint?.created_at}-${index}`}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-black text-slate-950">
                            {reprint?.reason || "Sin motivo"}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {formatDateTime(reprint?.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          {formatReprintUser(reprint)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Esta caja todavía no tiene reimpresiones registradas.
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeReprintModal}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={reprintBusy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmLabelReprint}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={reprintBusy || reprintHistoryLoading}
                >
                  {reprintBusy
                    ? "Preparando impresión..."
                    : "Confirmar y reimprimir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
