import {
  fetchExpeditionCalendarData,
  mergeCalendarTrucks,
  toLocalIsoDate,
} from "./expeditionCapacity";

export const LOADING_STATUSES = [
  {
    value: "PENDING",
    label: "Pendiente",
    description: "Todavía no se ha iniciado la preparación.",
  },
  {
    value: "PREPARING",
    label: "En preparación",
    description: "El equipo está preparando la carga.",
  },
  {
    value: "READY",
    label: "Lista para cargar",
    description: "Cajas, documentación y controles completados.",
  },
  {
    value: "LOADED",
    label: "Cargada",
    description: "La carga física del camión ha finalizado.",
  },
];

export const LOADING_CHECKLIST_ITEMS = [
  {
    key: "boxes_verified",
    label: "Cantidad de cajas verificada",
  },
  {
    key: "loading_order_defined",
    label: "Orden de carga definido",
  },
  {
    key: "tractor_verified",
    label: "Tractora identificada",
  },
  {
    key: "trailer_verified",
    label: "Remolque identificado",
  },
  {
    key: "load_condition_checked",
    label: "Estado de la carga revisado",
  },
  {
    key: "load_secured",
    label: "Carga asegurada",
  },
  {
    key: "seal_fitted",
    label: "Brida / precinto colocado",
  },
  {
    key: "documents_checked",
    label: "Documentación contrastada",
  },
];

function normalizeReference(value) {
  return String(value || "F-1012").trim().toUpperCase();
}

function normalizeTruckNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizedDate(value) {
  const date = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function normalizedTime(value) {
  const time = String(value || "").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(time) ? time : "";
}

function rowKey(reference, truckNumber) {
  return `${normalizeReference(reference)}:${normalizeTruckNumber(
    truckNumber
  )}`;
}

function normalizeChecklist(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return Object.fromEntries(
    LOADING_CHECKLIST_ITEMS.map((item) => [
      item.key,
      Boolean(source[item.key]),
    ])
  );
}

function documentType(document) {
  return String(document?.document_type || "").toUpperCase();
}

function uniqueBoxCount(labels = []) {
  const keys = new Set();

  labels.forEach((label) => {
    const key =
      normalizeText(label?.numero_caja) ||
      normalizeText(label?.id);

    if (key) keys.add(key);
  });

  return keys.size;
}

function safePriority(value) {
  const priority = Number(value);
  return Number.isInteger(priority) && priority > 0
    ? priority
    : Number.MAX_SAFE_INTEGER;
}

function daysFromToday(value, nowMs = Date.now()) {
  const date = normalizedDate(value);

  if (!date) return null;

  const today = new Date(nowMs);
  today.setHours(12, 0, 0, 0);
  const target = new Date(`${date}T12:00:00`);

  if (Number.isNaN(target.getTime())) return null;

  return Math.round(
    (target.getTime() - today.getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

function isOperationalEntry(entry, plan, nowMs) {
  if (entry.status === "PLANNED") return true;
  if (entry.status === "OPEN") return true;
  if (plan && plan.loading_status !== "LOADED") return true;

  if (
    entry.status === "CLOSED" &&
    entry.shipmentStatus !== "SHIPPED"
  ) {
    const days = daysFromToday(
      entry.actualDate || entry.plannedDate,
      nowMs
    );

    return days !== null && days >= -14;
  }

  return false;
}

function buildDraft(entry, plan) {
  return {
    sourceType: entry.source,
    loadingStatus: [
      "PENDING",
      "PREPARING",
      "READY",
      "LOADED",
    ].includes(plan?.loading_status)
      ? plan.loading_status
      : "PENDING",
    preparationResponsible:
      plan?.preparation_responsible || "",
    loadingDate:
      normalizedDate(plan?.loading_date) ||
      normalizedDate(entry.calendarDate),
    loadingStartTime: normalizedTime(
      plan?.loading_start_time
    ),
    loadingEndTime: normalizedTime(plan?.loading_end_time),
    checklist: normalizeChecklist(plan?.checklist),
    notes: plan?.notes || "",
  };
}

function missingTransportData(entry) {
  const fields = [
    [entry.tractorPlate, "Matrícula tractora"],
    [entry.trailerPlate, "Matrícula remolque"],
    [entry.raw?.seal_number, "Brida / precinto"],
  ];

  return fields
    .filter(([value]) => !normalizeText(value))
    .map(([, label]) => label);
}

function missingDocumentation(entry, documents) {
  const missing = [];
  const hasDeliveryNote = documents.some(
    (document) => documentType(document) === "DELIVERY_NOTE"
  );

  if (!normalizeText(entry.raw?.delivery_note_number)) {
    missing.push("Número de albarán");
  }

  if (!hasDeliveryNote) {
    missing.push("Albarán adjunto");
  }

  return missing;
}

export function evaluateLoadingReadiness(row, draft = row?.draft) {
  const normalizedDraft = {
    ...row?.draft,
    ...draft,
    checklist: normalizeChecklist(
      draft?.checklist || row?.draft?.checklist
    ),
  };
  const missingPlanning = [
    [
      normalizedDraft.preparationResponsible,
      "Responsable de preparación",
    ],
    [normalizedDraft.loadingDate, "Fecha de carga"],
    [normalizedDraft.loadingStartTime, "Hora de inicio"],
  ]
    .filter(([value]) => !normalizeText(value))
    .map(([, label]) => label);
  const missingChecklist = LOADING_CHECKLIST_ITEMS.filter(
    (item) => !normalizedDraft.checklist[item.key]
  ).map((item) => item.label);
  const missingBoxes =
    row?.source === "ACTUAL"
      ? Math.max(0, Number(row?.pendingBoxes || 0))
      : Number(row?.targetBoxes || 0);
  const blockers = [];

  if (row?.source !== "ACTUAL") {
    blockers.push(
      "El camión debe estar abierto en producción para asignar y verificar sus cajas"
    );
  } else if (missingBoxes > 0) {
    blockers.push(
      `Faltan ${missingBoxes} cajas para completar la carga`
    );
  }

  blockers.push(
    ...missingPlanning,
    ...(row?.missingTransport || []),
    ...(row?.missingDocuments || []),
    ...missingChecklist
  );

  return {
    isReady: blockers.length === 0,
    blockers,
    missingBoxes,
    missingPlanning,
    missingChecklist,
  };
}

function buildAlerts(row) {
  const alerts = [];
  const days = daysFromToday(row.loadingDate || row.calendarDate);

  if (row.source !== "ACTUAL") {
    alerts.push({
      severity: "INFO",
      message: "Pendiente de abrir el camión en producción.",
    });
  } else if (row.pendingBoxes > 0) {
    alerts.push({
      severity:
        days !== null && days <= 1 ? "CRITICAL" : "WARNING",
      message: `Faltan ${row.pendingBoxes} cajas.`,
    });
  }

  if (row.missingTransport.length) {
    alerts.push({
      severity: "WARNING",
      message: `Datos de transporte: ${row.missingTransport.join(
        ", "
      )}.`,
    });
  }

  if (row.missingDocuments.length) {
    alerts.push({
      severity: "WARNING",
      message: `Documentación: ${row.missingDocuments.join(
        ", "
      )}.`,
    });
  }

  if (!row.draft.preparationResponsible) {
    alerts.push({
      severity: "INFO",
      message: "Responsable de preparación sin asignar.",
    });
  }

  if (!row.draft.loadingStartTime) {
    alerts.push({
      severity: "INFO",
      message: "Franja horaria de carga sin definir.",
    });
  }

  return alerts;
}

export function buildLoadingPlanRows({
  actualTrucks = [],
  plannedTrucks = [],
  labels = [],
  documents = [],
  plans = [],
  targetBoxes = 49,
  nowMs = Date.now(),
} = {}) {
  const normalizedTarget = Math.max(
    1,
    Number(targetBoxes || 49)
  );
  const planByTruck = new Map(
    plans.map((plan) => [
      rowKey(plan.reference, plan.truck_number),
      plan,
    ])
  );
  const labelsByTruckId = new Map();
  const documentsByTruck = new Map();

  labels.forEach((label) => {
    const truckId = normalizeText(label?.camion_id);

    if (!truckId) return;

    const previous = labelsByTruckId.get(truckId) || [];
    previous.push(label);
    labelsByTruckId.set(truckId, previous);
  });

  documents.forEach((document) => {
    const key = rowKey(
      document?.reference,
      document?.truck_number
    );
    const previous = documentsByTruck.get(key) || [];
    previous.push(document);
    documentsByTruck.set(key, previous);
  });

  return mergeCalendarTrucks(actualTrucks, plannedTrucks)
    .map((entry) => {
      const key = rowKey(entry.reference, entry.truckNumber);
      const plan = planByTruck.get(key) || null;

      if (!isOperationalEntry(entry, plan, nowMs)) return null;

      const truckLabels =
        entry.source === "ACTUAL"
          ? labelsByTruckId.get(
              normalizeText(entry.raw?.id)
            ) || []
          : [];
      const truckDocuments =
        documentsByTruck.get(key) || [];
      const completedBoxes = uniqueBoxCount(truckLabels);
      const pendingBoxes = Math.max(
        0,
        normalizedTarget - completedBoxes
      );
      const draft = buildDraft(entry, plan);
      const row = {
        ...entry,
        planId: plan?.id || null,
        actualTruckId:
          entry.source === "ACTUAL" ? entry.raw?.id : null,
        scheduleId:
          entry.source === "PLANNED" ? entry.raw?.id : null,
        targetBoxes: normalizedTarget,
        completedBoxes,
        pendingBoxes,
        documents: truckDocuments,
        missingTransport: missingTransportData(entry),
        missingDocuments: missingDocumentation(
          entry,
          truckDocuments
        ),
        draft,
        planningPriority: safePriority(
          entry.raw?.planning_priority
        ),
        daysUntilLoading: daysFromToday(
          draft.loadingDate || entry.calendarDate,
          nowMs
        ),
      };
      const readiness = evaluateLoadingReadiness(row, draft);
      const alerts = buildAlerts(row);

      return {
        ...row,
        readiness,
        alerts,
      };
    })
    .filter(Boolean)
    .sort(
      (first, second) =>
        String(
          first.draft.loadingDate ||
            first.calendarDate ||
            "9999-12-31"
        ).localeCompare(
          String(
            second.draft.loadingDate ||
              second.calendarDate ||
              "9999-12-31"
          )
        ) ||
        first.planningPriority - second.planningPriority ||
        Number(first.truckNumber || 0) -
          Number(second.truckNumber || 0)
    )
    .map((row, index) => ({
      ...row,
      queuePosition: index + 1,
    }));
}

export function summarizeLoadingPlan(rows = []) {
  const alertCounts = rows.reduce(
    (summary, row) => {
      row.alerts.forEach((alert) => {
        const severity = String(alert.severity || "INFO");
        summary[severity] = (summary[severity] || 0) + 1;
      });
      return summary;
    },
    { CRITICAL: 0, WARNING: 0, INFO: 0 }
  );

  return {
    total: rows.length,
    pending: rows.filter(
      (row) => row.draft.loadingStatus === "PENDING"
    ).length,
    preparing: rows.filter(
      (row) => row.draft.loadingStatus === "PREPARING"
    ).length,
    ready: rows.filter(
      (row) => row.draft.loadingStatus === "READY"
    ).length,
    loaded: rows.filter(
      (row) => row.draft.loadingStatus === "LOADED"
    ).length,
    boxesReady: rows.reduce(
      (total, row) => total + row.completedBoxes,
      0
    ),
    boxesPending: rows.reduce(
      (total, row) => total + row.pendingBoxes,
      0
    ),
    alertCounts,
  };
}

export function validateLoadingStatus(row, draft) {
  if (!["READY", "LOADED"].includes(draft.loadingStatus)) {
    return {
      valid: true,
      message: "",
    };
  }

  const readiness = evaluateLoadingReadiness(row, draft);

  if (!readiness.isReady) {
    return {
      valid: false,
      message: `No se puede marcar como ${
        draft.loadingStatus === "LOADED"
          ? "cargada"
          : "lista para cargar"
      }. Falta: ${readiness.blockers.join(", ")}.`,
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export async function fetchExpeditionLoadingPlanData(
  supabase,
  reference = "F-1012"
) {
  if (!supabase) {
    throw new Error("Supabase no está disponible.");
  }

  const normalized = normalizeReference(reference);
  const calendarData = await fetchExpeditionCalendarData(
    supabase,
    normalized
  );
  const actualIds = calendarData.actualTrucks
    .map((truck) => truck?.id)
    .filter(Boolean);
  const labelsQuery = actualIds.length
    ? supabase
        .from("f1012_box_labels")
        .select("id, camion_id, numero_caja, created_at")
        .in("camion_id", actualIds)
        .limit(10000)
    : Promise.resolve({ data: [], error: null });
  const [labelsResult, documentsResult, plansResult] =
    await Promise.all([
      labelsQuery,
      supabase
        .from("f1012_truck_documents")
        .select("*")
        .eq("reference", normalized)
        .limit(2000),
      supabase
        .from("f1012_truck_loading_plan")
        .select("*")
        .eq("reference", normalized)
        .limit(500),
    ]);

  if (labelsResult.error) throw labelsResult.error;
  if (documentsResult.error) throw documentsResult.error;

  if (plansResult.error) {
    const error = new Error(
      "Falta crear el plan de carga V2.32 en Supabase. Ejecuta el archivo FMCONTROL_V2_32_PLAN_CARGA.sql."
    );
    error.cause = plansResult.error;
    throw error;
  }

  return {
    ...calendarData,
    labels: labelsResult.data || [],
    documents: documentsResult.data || [],
    plans: plansResult.data || [],
  };
}

export async function saveExpeditionLoadingPlan(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
    draft,
    updatedBy = "",
  }
) {
  const normalizedNumber = normalizeTruckNumber(truckNumber);

  if (!normalizedNumber) {
    throw new Error("El número de camión no es válido.");
  }

  const payload = {
    reference: normalizeReference(reference),
    truck_number: normalizedNumber,
    source_type:
      draft?.sourceType === "ACTUAL" ? "ACTUAL" : "PLANNED",
    loading_status: [
      "PENDING",
      "PREPARING",
      "READY",
      "LOADED",
    ].includes(draft?.loadingStatus)
      ? draft.loadingStatus
      : "PENDING",
    preparation_responsible: normalizeText(
      draft?.preparationResponsible
    ),
    loading_date: normalizedDate(draft?.loadingDate) || null,
    loading_start_time:
      normalizedTime(draft?.loadingStartTime) || null,
    loading_end_time:
      normalizedTime(draft?.loadingEndTime) || null,
    checklist: normalizeChecklist(draft?.checklist),
    notes: normalizeText(draft?.notes),
    updated_by: normalizeText(updatedBy),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("f1012_truck_loading_plan")
    .upsert(payload, {
      onConflict: "reference,truck_number",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export function loadingPlanFileBase(
  reference = "F-1012",
  date = toLocalIsoDate(new Date())
) {
  const normalized = normalizeReference(reference).replaceAll(
    /[^A-Z0-9]+/g,
    ""
  );

  return `${normalized}_Plan_Carga_${normalizedDate(date) || toLocalIsoDate(new Date())}`;
}

export function loadingStatusLabel(value) {
  return (
    LOADING_STATUSES.find((status) => status.value === value)
      ?.label || "Pendiente"
  );
}
