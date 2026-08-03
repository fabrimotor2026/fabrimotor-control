const FINAL_DELIVERY_STATUSES = new Set([
  "DELIVERED",
  "DELIVERED_WITH_INCIDENT",
  "RETURNED",
]);

export const DELIVERY_STATUS_OPTIONS = [
  { value: "DELIVERED", label: "Entregado" },
  {
    value: "DELIVERED_WITH_INCIDENT",
    label: "Entregado con incidencia",
  },
  { value: "RETURNED", label: "Devuelto" },
];

export const DELIVERY_INCIDENT_OPTIONS = [
  { value: "DELAY", label: "Retraso" },
  { value: "DAMAGE", label: "Daño" },
  { value: "SHORTAGE", label: "Falta de material" },
  { value: "REJECTION", label: "Rechazo" },
  { value: "OTHER", label: "Otra incidencia" },
];

export const DELIVERY_DOCUMENT_OPTIONS = [
  {
    value: "SIGNED_DELIVERY_NOTE",
    label: "Albarán firmado",
  },
  { value: "SIGNED_CMR", label: "CMR firmado" },
  { value: "POD", label: "Justificante de entrega (POD)" },
  {
    value: "DELIVERY_PHOTO",
    label: "Fotografía de entrega",
  },
  { value: "OTHER", label: "Otro documento" },
];

export const DELIVERY_PROOF_TYPES = new Set([
  "SIGNED_DELIVERY_NOTE",
  "SIGNED_CMR",
  "POD",
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value, fallback = "IN_TRANSIT") {
  return normalizeText(value || fallback).toUpperCase();
}

function normalizeReference(value) {
  return normalizeText(value || "F-1012").toUpperCase();
}

function normalizeTruckNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function toTimestamp(value) {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function rowKey(reference, truckNumber) {
  return `${normalizeReference(reference)}:${normalizeTruckNumber(
    truckNumber
  )}`;
}

function durationMinutes(startValue, endValue) {
  const start = toTimestamp(startValue);
  const end = toTimestamp(endValue);

  if (start === null || end === null || end < start) return null;
  return Math.round((end - start) / 60_000);
}

function punctualityMinutes(expectedValue, deliveredValue) {
  const expected = toTimestamp(expectedValue);
  const delivered = toTimestamp(deliveredValue);

  if (expected === null || delivered === null) return null;
  return Math.round((delivered - expected) / 60_000);
}

function missingDeliverySchemaError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("f1012_truck_deliveries") ||
    message.includes("f1012_delivery_incidents") ||
    message.includes("delivery_status")
  );
}

function throwQueryError(error) {
  if (!error) return;

  if (missingDeliverySchemaError(error)) {
    throw new Error(
      "Falta ejecutar FMCONTROL_V2_35_CONFIRMACION_ENTREGA.sql en Supabase."
    );
  }

  throw error;
}

function actorDisplay(user) {
  if (typeof user === "string") {
    return normalizeText(user) || "Sistema";
  }

  return (
    [
      user?.username || user?.code || user?.employee_code,
      user?.name || user?.full_name,
    ]
      .map(normalizeText)
      .filter(Boolean)
      .join(" - ") || "Sistema"
  );
}

export function isFinalDeliveryStatus(value) {
  return FINAL_DELIVERY_STATUSES.has(normalizeStatus(value));
}

export function localDateTimeInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return local.toISOString().slice(0, 16);
}

export function formatDeliveryDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDeliveryDuration(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes < 0) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return `${hours} h${remainder ? ` ${remainder} min` : ""}`;
}

export function deliveryStatusLabel(value) {
  const status = normalizeStatus(value);

  return (
    {
      IN_TRANSIT: "En tránsito",
      DELIVERED: "Entregado",
      DELIVERED_WITH_INCIDENT: "Entregado con incidencia",
      RETURNED: "Devuelto",
    }[status] || status
  );
}

export function deliveryIncidentLabel(value) {
  return (
    DELIVERY_INCIDENT_OPTIONS.find(
      (option) => option.value === normalizeStatus(value, "")
    )?.label || "Otra incidencia"
  );
}

export function deliveryDocumentLabel(value) {
  return (
    DELIVERY_DOCUMENT_OPTIONS.find(
      (option) => option.value === normalizeStatus(value, "")
    )?.label ||
    {
      DELIVERY_NOTE: "Albarán",
      CMR: "CMR",
      PHOTO: "Fotografía de carga",
    }[normalizeStatus(value, "")] ||
    "Otro documento"
  );
}

export function buildDeliveryTrackingOverview({
  trucks = [],
  departures = [],
  deliveries = [],
  incidents = [],
  documents = [],
  now = new Date(),
} = {}) {
  const nowTimestamp = toTimestamp(now) || Date.now();
  const truckById = new Map(
    trucks
      .filter((truck) => truck?.id)
      .map((truck) => [String(truck.id), truck])
  );
  const deliveryByTruck = new Map(
    deliveries.map((delivery) => [
      String(delivery?.truck_id || ""),
      delivery,
    ])
  );
  const incidentsByDelivery = new Map();
  const documentsByTruck = new Map();

  incidents.forEach((incident) => {
    const deliveryId = String(incident?.delivery_id || "");
    const previous = incidentsByDelivery.get(deliveryId) || [];
    previous.push(incident);
    incidentsByDelivery.set(deliveryId, previous);
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

  const rows = departures
    .filter(
      (departure) =>
        normalizeStatus(departure?.status, "") === "SHIPPED"
    )
    .map((departure) => {
      const truck = truckById.get(String(departure?.truck_id || ""));
      if (!truck) return null;

      const delivery =
        deliveryByTruck.get(String(truck.id)) || {
          reference: departure.reference || truck.reference,
          truck_number:
            departure.truck_number || truck.truck_number,
          truck_id: truck.id,
          departure_id: departure.id,
          status: "IN_TRANSIT",
          expected_delivery_at: truck.expected_delivery_at,
        };
      const status = normalizeStatus(delivery.status);
      const rowIncidents =
        incidentsByDelivery.get(String(delivery?.id || "")) || [];
      const rowDocuments =
        documentsByTruck.get(
          rowKey(
            delivery.reference || truck.reference,
            delivery.truck_number || truck.truck_number
          )
        ) || [];
      const expectedTimestamp = toTimestamp(
        delivery.expected_delivery_at ||
          truck.expected_delivery_at
      );
      const deliveredTimestamp = toTimestamp(
        delivery.delivered_at || truck.delivered_at
      );
      const isFinal = isFinalDeliveryStatus(status);
      const isOverdue =
        status === "IN_TRANSIT" &&
        expectedTimestamp !== null &&
        expectedTimestamp < nowTimestamp;
      const minutesUntilExpected =
        expectedTimestamp === null
          ? null
          : Math.round(
              (expectedTimestamp - nowTimestamp) / 60_000
            );
      const proofDocuments = rowDocuments.filter((document) =>
        DELIVERY_PROOF_TYPES.has(
          normalizeStatus(document?.document_type, "")
        )
      );
      const transitMinutes = durationMinutes(
        departure.departure_at,
        delivery.delivered_at
      );
      const deliveryPunctualityMinutes = punctualityMinutes(
        delivery.expected_delivery_at,
        delivery.delivered_at
      );

      return {
        key: rowKey(
          delivery.reference || truck.reference,
          delivery.truck_number || truck.truck_number
        ),
        truck,
        departure,
        delivery,
        status,
        isFinal,
        isOverdue,
        isDueSoon:
          status === "IN_TRANSIT" &&
          minutesUntilExpected !== null &&
          minutesUntilExpected >= 0 &&
          minutesUntilExpected <= 24 * 60,
        minutesUntilExpected,
        incidents: rowIncidents.sort(
          (first, second) =>
            (toTimestamp(second?.created_at) || 0) -
            (toTimestamp(first?.created_at) || 0)
        ),
        openIncidents: rowIncidents.filter(
          (incident) =>
            normalizeStatus(incident?.status, "") === "OPEN"
        ),
        documents: rowDocuments,
        proofDocuments,
        transitMinutes,
        punctualityMinutes: deliveryPunctualityMinutes,
        onTime:
          isFinal &&
          deliveredTimestamp !== null &&
          deliveryPunctualityMinutes !== null &&
          deliveryPunctualityMinutes <= 0,
      };
    })
    .filter(Boolean)
    .sort((first, second) => {
      if (first.isFinal !== second.isFinal) {
        return first.isFinal ? 1 : -1;
      }

      if (first.isOverdue !== second.isOverdue) {
        return first.isOverdue ? -1 : 1;
      }

      const firstDate =
        toTimestamp(
          first.delivery.expected_delivery_at ||
            first.delivery.delivered_at ||
            first.departure.departure_at
        ) || Number.MAX_SAFE_INTEGER;
      const secondDate =
        toTimestamp(
          second.delivery.expected_delivery_at ||
            second.delivery.delivered_at ||
            second.departure.departure_at
        ) || Number.MAX_SAFE_INTEGER;

      return firstDate - secondDate;
    });

  const finalDelivered = rows.filter(
    (row) =>
      row.status === "DELIVERED" ||
      row.status === "DELIVERED_WITH_INCIDENT"
  );
  const punctualitySample = finalDelivered.filter(
    (row) => row.punctualityMinutes !== null
  );
  const onTimeCount = punctualitySample.filter(
    (row) => row.onTime
  ).length;
  const transitSamples = finalDelivered
    .map((row) => row.transitMinutes)
    .filter((value) => Number.isFinite(value));

  return {
    rows,
    summary: {
      total: rows.length,
      inTransit: rows.filter(
        (row) => row.status === "IN_TRANSIT"
      ).length,
      overdue: rows.filter((row) => row.isOverdue).length,
      delivered: finalDelivered.length,
      withIncident: rows.filter(
        (row) =>
          row.status === "DELIVERED_WITH_INCIDENT" ||
          row.openIncidents.length > 0
      ).length,
      returned: rows.filter(
        (row) => row.status === "RETURNED"
      ).length,
      onTimePercentage: punctualitySample.length
        ? Math.round(
            (onTimeCount / punctualitySample.length) * 100
          )
        : null,
      averageTransitMinutes: transitSamples.length
        ? Math.round(
            transitSamples.reduce(
              (total, value) => total + value,
              0
            ) / transitSamples.length
          )
        : null,
    },
  };
}

export async function fetchDeliveryTrackingData(
  supabase,
  { reference = "F-1012", now = new Date() } = {}
) {
  const normalizedReference = normalizeReference(reference);
  const [
    trucksResult,
    departuresResult,
    deliveriesResult,
    incidentsResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("f1012_trucks")
      .select("*")
      .eq("reference", normalizedReference)
      .eq("shipment_status", "SHIPPED"),
    supabase
      .from("f1012_truck_departures")
      .select("*")
      .eq("reference", normalizedReference)
      .eq("status", "SHIPPED")
      .order("departure_at", { ascending: false }),
    supabase
      .from("f1012_truck_deliveries")
      .select("*")
      .eq("reference", normalizedReference)
      .order("created_at", { ascending: false }),
    supabase
      .from("f1012_delivery_incidents")
      .select("*")
      .eq("reference", normalizedReference)
      .order("created_at", { ascending: false }),
    supabase
      .from("f1012_truck_documents")
      .select("*")
      .eq("reference", normalizedReference)
      .order("created_at", { ascending: false }),
  ]);

  [
    trucksResult,
    departuresResult,
    deliveriesResult,
    incidentsResult,
    documentsResult,
  ].forEach((result) => throwQueryError(result.error));

  return buildDeliveryTrackingOverview({
    trucks: trucksResult.data || [],
    departures: departuresResult.data || [],
    deliveries: deliveriesResult.data || [],
    incidents: incidentsResult.data || [],
    documents: documentsResult.data || [],
    now,
  });
}

export async function updateExpectedDelivery(
  supabase,
  { truckId, expectedDeliveryAt, actor }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_update_expected_delivery",
    {
      p_truck_id: truckId,
      p_expected_delivery_at: expectedDeliveryAt,
      p_actor: actorDisplay(actor),
    }
  );

  throwQueryError(error);
  return Array.isArray(data) ? data[0] : data;
}

export async function createDeliveryIncident(
  supabase,
  { truckId, incidentType, description, actor }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_create_delivery_incident",
    {
      p_truck_id: truckId,
      p_incident_type: incidentType,
      p_description: description,
      p_actor: actorDisplay(actor),
    }
  );

  throwQueryError(error);
  return Array.isArray(data) ? data[0] : data;
}

export async function resolveDeliveryIncident(
  supabase,
  { incidentId, resolution, actor }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_resolve_delivery_incident",
    {
      p_incident_id: incidentId,
      p_resolution: resolution,
      p_actor: actorDisplay(actor),
    }
  );

  throwQueryError(error);
  return Array.isArray(data) ? data[0] : data;
}

export async function confirmTruckDelivery(
  supabase,
  {
    truckId,
    deliveryStatus,
    deliveredAt,
    receiverName,
    deliveryNotes,
    actor,
  }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_confirm_truck_delivery",
    {
      p_truck_id: truckId,
      p_delivery_status: deliveryStatus,
      p_delivered_at: deliveredAt,
      p_receiver_name: receiverName,
      p_delivery_notes: deliveryNotes || "",
      p_actor: actorDisplay(actor),
    }
  );

  throwQueryError(error);
  return Array.isArray(data) ? data[0] : data;
}

export async function reopenTruckDelivery(
  supabase,
  { truckId, actor, actorRole, reason }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_reopen_truck_delivery",
    {
      p_truck_id: truckId,
      p_actor: actorDisplay(actor),
      p_actor_role: actorRole || "",
      p_reason: reason,
    }
  );

  throwQueryError(error);
  return Array.isArray(data) ? data[0] : data;
}
