const FINAL_STATUSES = new Set([
  "DELIVERED",
  "DELIVERED_WITH_INCIDENT",
  "RETURNED",
]);

const SUCCESS_STATUSES = new Set([
  "DELIVERED",
  "DELIVERED_WITH_INCIDENT",
]);

export const PERFORMANCE_RESULT_OPTIONS = [
  { value: "ALL", label: "Todos los resultados" },
  { value: "ON_TIME", label: "Entregas puntuales" },
  { value: "LATE", label: "Entregas retrasadas" },
  { value: "IN_TRANSIT", label: "En tránsito" },
  { value: "DELIVERED", label: "Entregado" },
  {
    value: "DELIVERED_WITH_INCIDENT",
    label: "Entregado con incidencia",
  },
  { value: "RETURNED", label: "Devuelto" },
];

const STATUS_LABELS = {
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregado",
  DELIVERED_WITH_INCIDENT: "Entregado con incidencia",
  RETURNED: "Devuelto",
};

const INCIDENT_LABELS = {
  DELAY: "Retraso",
  DAMAGE: "Daño",
  SHORTAGE: "Falta de material",
  REJECTION: "Rechazo",
  OTHER: "Otra incidencia",
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeReference(value) {
  return normalizeText(value || "F-1012").toUpperCase();
}

function normalizeStatus(value, fallback = "") {
  return normalizeText(value || fallback).toUpperCase();
}

function normalizeTruckNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function toTimestamp(value) {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
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

function average(values) {
  const numericValues = values.filter(Number.isFinite);

  if (!numericValues.length) return null;

  return Math.round(
    numericValues.reduce((total, value) => total + value, 0) /
      numericValues.length
  );
}

function percentage(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((Number(numerator || 0) / denominator) * 100);
}

function dateParts(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function localDateKey(value) {
  const parts = dateParts(value);

  return parts
    ? `${parts.year}-${parts.month}-${parts.day}`
    : "";
}

function monthKey(value) {
  const parts = dateParts(value);
  return parts ? `${parts.year}-${parts.month}` : "";
}

function groupBy(rows, keyReader) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = normalizeText(keyReader(row)) || "Sin indicar";
    const previous = groups.get(key) || [];
    previous.push(row);
    groups.set(key, previous);
  });

  return groups;
}

function missingDeliverySchemaError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("f1012_truck_deliveries") ||
    message.includes("f1012_delivery_incidents")
  );
}

function throwQueryError(error) {
  if (!error) return;

  if (missingDeliverySchemaError(error)) {
    throw new Error(
      "Falta instalar la V2.35 en Supabase antes de utilizar este informe."
    );
  }

  throw error;
}

function scoreLabel(score) {
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Correcto";
  if (score >= 60) return "A mejorar";
  return "Crítico";
}

function aggregateRows(rows) {
  const finalRows = rows.filter((row) => row.isFinal);
  const deliveredRows = rows.filter((row) => row.isDelivered);
  const punctualityRows = deliveredRows.filter(
    (row) => row.punctualityMinutes !== null
  );
  const onTimeRows = punctualityRows.filter((row) => row.onTime);
  const lateRows = punctualityRows.filter((row) => row.isLate);
  const incidentRows = finalRows.filter((row) => row.hasIncident);
  const returnedRows = finalRows.filter(
    (row) => row.status === "RETURNED"
  );
  const onTimePercentage = percentage(
    onTimeRows.length,
    punctualityRows.length
  );
  const cleanPercentage = percentage(
    finalRows.length - incidentRows.length,
    finalRows.length
  );
  const successPercentage = percentage(
    deliveredRows.length,
    finalRows.length
  );
  const score =
    finalRows.length && onTimePercentage !== null
      ? Math.round(
          onTimePercentage * 0.6 +
            (cleanPercentage || 0) * 0.25 +
            (successPercentage || 0) * 0.15
        )
      : null;

  return {
    total: rows.length,
    inTransit: rows.filter(
      (row) => row.status === "IN_TRANSIT"
    ).length,
    final: finalRows.length,
    delivered: deliveredRows.length,
    evaluated: punctualityRows.length,
    onTime: onTimeRows.length,
    late: lateRows.length,
    withIncident: incidentRows.length,
    returned: returnedRows.length,
    onTimePercentage,
    incidentRate: percentage(
      incidentRows.length,
      finalRows.length
    ),
    returnRate: percentage(returnedRows.length, finalRows.length),
    averageTransitMinutes: average(
      deliveredRows.map((row) => row.transitMinutes)
    ),
    averageDelayMinutes: average(
      lateRows.map((row) => row.punctualityMinutes)
    ),
    score,
    scoreLabel: score === null ? "Sin muestra" : scoreLabel(score),
  };
}

function buildCarrierRanking(rows) {
  const finalRows = rows.filter((row) => row.isFinal);

  return [...groupBy(finalRows, (row) => row.carrier).entries()]
    .map(([carrier, carrierRows]) => ({
      carrier,
      ...aggregateRows(carrierRows),
    }))
    .sort(
      (first, second) =>
        (second.score ?? -1) - (first.score ?? -1) ||
        second.final - first.final ||
        first.carrier.localeCompare(second.carrier)
    )
    .map((carrier, index) => ({
      ...carrier,
      rank: index + 1,
    }));
}

function buildCustomerDestinationRows(rows) {
  const deliveredRows = rows.filter((row) => row.isFinal);

  return [
    ...groupBy(
      deliveredRows,
      (row) => `${row.customer}|||${row.destination}`
    ).entries(),
  ]
    .map(([key, groupedRows]) => {
      const [customer, destination] = key.split("|||");

      return {
        customer,
        destination,
        ...aggregateRows(groupedRows),
      };
    })
    .sort(
      (first, second) =>
        second.final - first.final ||
        (second.onTimePercentage ?? -1) -
          (first.onTimePercentage ?? -1) ||
        first.customer.localeCompare(second.customer)
    );
}

function buildMonthlyRows(rows) {
  return [
    ...groupBy(
      rows.filter((row) => row.isFinal && row.deliveredAt),
      (row) => monthKey(row.deliveredAt)
    ).entries(),
  ]
    .filter(([month]) => month && month !== "Sin indicar")
    .map(([month, groupedRows]) => ({
      month,
      ...aggregateRows(groupedRows),
    }))
    .sort((first, second) => first.month.localeCompare(second.month));
}

function buildIncidentRows(rows) {
  const incidents = rows.flatMap((row) =>
    row.incidents.map((incident) => ({
      ...incident,
      truckNumber: row.truckNumber,
      carrier: row.carrier,
      customer: row.customer,
      destination: row.destination,
      deliveryStatus: row.status,
    }))
  );
  const total = incidents.length;

  return [
    ...groupBy(
      incidents,
      (incident) => incident.incident_type
    ).entries(),
  ]
    .map(([type, groupedIncidents]) => ({
      type,
      label: incidentTypeLabel(type),
      count: groupedIncidents.length,
      open: groupedIncidents.filter(
        (incident) =>
          normalizeStatus(incident.status) === "OPEN"
      ).length,
      percentage: percentage(groupedIncidents.length, total) || 0,
    }))
    .sort(
      (first, second) =>
        second.count - first.count ||
        first.label.localeCompare(second.label)
    );
}

export function performanceStatusLabel(value) {
  const status = normalizeStatus(value);
  return STATUS_LABELS[status] || status || "-";
}

export function incidentTypeLabel(value) {
  const type = normalizeStatus(value);
  return INCIDENT_LABELS[type] || type || "Otra incidencia";
}

export function formatPerformanceDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatPerformanceDuration(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes < 0) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return `${hours} h${remainder ? ` ${remainder} min` : ""}`;
}

export function buildDeliveryPerformanceRows({
  trucks = [],
  departures = [],
  deliveries = [],
  incidents = [],
} = {}) {
  const truckById = new Map(
    trucks
      .filter((truck) => truck?.id)
      .map((truck) => [String(truck.id), truck])
  );
  const departureById = new Map(
    departures
      .filter((departure) => departure?.id)
      .map((departure) => [String(departure.id), departure])
  );
  const incidentsByDelivery = new Map();

  incidents.forEach((incident) => {
    const deliveryId = String(incident?.delivery_id || "");
    const previous = incidentsByDelivery.get(deliveryId) || [];
    previous.push(incident);
    incidentsByDelivery.set(deliveryId, previous);
  });

  return deliveries
    .map((delivery) => {
      const truck = truckById.get(String(delivery?.truck_id || ""));
      const departure = departureById.get(
        String(delivery?.departure_id || "")
      );

      if (!truck || !departure) return null;

      const status = normalizeStatus(
        delivery.status,
        "IN_TRANSIT"
      );
      const deliveredAt = delivery.delivered_at || truck.delivered_at;
      const expectedAt =
        delivery.expected_delivery_at ||
        truck.expected_delivery_at;
      const rowIncidents =
        incidentsByDelivery.get(String(delivery.id)) || [];
      const rowPunctualityMinutes = punctualityMinutes(
        expectedAt,
        deliveredAt
      );
      const isDelivered = SUCCESS_STATUSES.has(status);
      const isFinal = FINAL_STATUSES.has(status);
      const performanceDate =
        deliveredAt ||
        expectedAt ||
        departure.departure_at ||
        delivery.created_at;

      return {
        id: delivery.id,
        reference: normalizeReference(
          delivery.reference || truck.reference
        ),
        truckNumber: normalizeTruckNumber(
          delivery.truck_number || truck.truck_number
        ),
        truck,
        departure,
        delivery,
        status,
        statusLabel: performanceStatusLabel(status),
        carrier:
          normalizeText(truck.carrier_name) ||
          "Sin transportista",
        customer:
          normalizeText(truck.customer_name) || "Sin cliente",
        destination:
          normalizeText(truck.destination) || "Sin destino",
        tractorPlate:
          normalizeText(
            truck.tractor_plate || truck.vehicle_plate
          ) || "-",
        trailerPlate:
          normalizeText(truck.trailer_plate) || "-",
        driver: normalizeText(departure.driver_name) || "-",
        departureAt: departure.departure_at,
        expectedAt,
        deliveredAt,
        performanceDate,
        performanceDateKey: localDateKey(performanceDate),
        month: monthKey(performanceDate),
        isFinal,
        isDelivered,
        isInTransit: status === "IN_TRANSIT",
        punctualityMinutes: rowPunctualityMinutes,
        onTime:
          isDelivered &&
          rowPunctualityMinutes !== null &&
          rowPunctualityMinutes <= 0,
        isLate:
          isDelivered &&
          rowPunctualityMinutes !== null &&
          rowPunctualityMinutes > 0,
        transitMinutes: durationMinutes(
          departure.departure_at,
          deliveredAt
        ),
        incidents: rowIncidents,
        incidentCount: rowIncidents.length,
        openIncidentCount: rowIncidents.filter(
          (incident) =>
            normalizeStatus(incident.status) === "OPEN"
        ).length,
        hasIncident:
          status === "DELIVERED_WITH_INCIDENT" ||
          status === "RETURNED" ||
          rowIncidents.length > 0,
      };
    })
    .filter(Boolean)
    .sort(
      (first, second) =>
        (toTimestamp(second.performanceDate) || 0) -
          (toTimestamp(first.performanceDate) || 0) ||
        (second.truckNumber || 0) - (first.truckNumber || 0)
    );
}

export function filterDeliveryPerformanceRows(
  rows,
  {
    dateFrom = "",
    dateTo = "",
    carrier = "ALL",
    customer = "ALL",
    destination = "ALL",
    result = "ALL",
  } = {}
) {
  return rows.filter((row) => {
    if (dateFrom && row.performanceDateKey < dateFrom) return false;
    if (dateTo && row.performanceDateKey > dateTo) return false;
    if (carrier !== "ALL" && row.carrier !== carrier) return false;
    if (customer !== "ALL" && row.customer !== customer) return false;
    if (
      destination !== "ALL" &&
      row.destination !== destination
    ) {
      return false;
    }

    if (result === "ON_TIME" && !row.onTime) return false;
    if (result === "LATE" && !row.isLate) return false;
    if (
      !["ALL", "ON_TIME", "LATE"].includes(result) &&
      row.status !== result
    ) {
      return false;
    }

    return true;
  });
}

export function buildDeliveryPerformanceReport(
  rows,
  filters = {}
) {
  const filteredRows = filterDeliveryPerformanceRows(rows, filters);
  const unique = (field) =>
    [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort(
      (first, second) => first.localeCompare(second)
    );

  return {
    rows: filteredRows,
    summary: aggregateRows(filteredRows),
    carriers: buildCarrierRanking(filteredRows),
    customers: buildCustomerDestinationRows(filteredRows),
    months: buildMonthlyRows(filteredRows),
    incidents: buildIncidentRows(filteredRows),
    options: {
      carriers: unique("carrier"),
      customers: unique("customer"),
      destinations: unique("destination"),
    },
    filters,
  };
}

export async function fetchDeliveryPerformanceData(
  supabase,
  { reference = "F-1012" } = {}
) {
  const normalizedReference = normalizeReference(reference);
  const [
    trucksResult,
    departuresResult,
    deliveriesResult,
    incidentsResult,
  ] = await Promise.all([
    supabase
      .from("f1012_trucks")
      .select("*")
      .eq("reference", normalizedReference),
    supabase
      .from("f1012_truck_departures")
      .select("*")
      .eq("reference", normalizedReference)
      .eq("status", "SHIPPED"),
    supabase
      .from("f1012_truck_deliveries")
      .select("*")
      .eq("reference", normalizedReference),
    supabase
      .from("f1012_delivery_incidents")
      .select("*")
      .eq("reference", normalizedReference),
  ]);

  [
    trucksResult,
    departuresResult,
    deliveriesResult,
    incidentsResult,
  ].forEach((result) => throwQueryError(result.error));

  return buildDeliveryPerformanceRows({
    trucks: trucksResult.data || [],
    departures: departuresResult.data || [],
    deliveries: deliveriesResult.data || [],
    incidents: incidentsResult.data || [],
  });
}

function safeFileSegment(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function deliveryPerformanceFileBase(
  reference,
  date = new Date()
) {
  const referenceText =
    safeFileSegment(normalizeReference(reference).replaceAll("-", "")) ||
    "F1012";
  const dateKey = localDateKey(date) || "SIN-FECHA";

  return `${referenceText}_Rendimiento_Entregas_${dateKey}`;
}

export function buildDeliveryExportSheets(report) {
  const percentText = (value) =>
    value === null || value === undefined ? "-" : `${value}%`;
  const minuteText = (value) =>
    value === null || value === undefined
      ? "-"
      : formatPerformanceDuration(value);

  return {
    Resumen: [
      {
        Indicador: "Registros filtrados",
        Valor: report.summary.total,
      },
      {
        Indicador: "Entregas cerradas",
        Valor: report.summary.final,
      },
      {
        Indicador: "Entregas puntuales",
        Valor: report.summary.onTime,
      },
      {
        Indicador: "Puntualidad",
        Valor: percentText(report.summary.onTimePercentage),
      },
      {
        Indicador: "Entregas retrasadas",
        Valor: report.summary.late,
      },
      {
        Indicador: "Tiempo medio de transporte",
        Valor: minuteText(report.summary.averageTransitMinutes),
      },
      {
        Indicador: "Retraso medio",
        Valor: minuteText(report.summary.averageDelayMinutes),
      },
      {
        Indicador: "Con incidencia",
        Valor: report.summary.withIncident,
      },
      {
        Indicador: "Tasa de incidencias",
        Valor: percentText(report.summary.incidentRate),
      },
      {
        Indicador: "Devueltas",
        Valor: report.summary.returned,
      },
    ],
    Entregas: report.rows.map((row) => ({
      Camión: row.truckNumber,
      Transportista: row.carrier,
      Cliente: row.customer,
      Destino: row.destination,
      Resultado: row.statusLabel,
      Salida: formatPerformanceDateTime(row.departureAt),
      "Entrega prevista": formatPerformanceDateTime(row.expectedAt),
      "Entrega real": formatPerformanceDateTime(row.deliveredAt),
      Puntualidad:
        row.punctualityMinutes === null
          ? "-"
          : row.onTime
            ? `${Math.abs(row.punctualityMinutes)} min antes`
            : `${row.punctualityMinutes} min tarde`,
      "Tiempo de transporte": minuteText(row.transitMinutes),
      Incidencias: row.incidentCount,
      Tractora: row.tractorPlate,
      Remolque: row.trailerPlate,
      Conductor: row.driver,
    })),
    Transportistas: report.carriers.map((carrier) => ({
      Posición: carrier.rank,
      Transportista: carrier.carrier,
      Entregas: carrier.final,
      Puntuales: carrier.onTime,
      Retrasadas: carrier.late,
      "% puntualidad": percentText(carrier.onTimePercentage),
      "Tiempo medio": minuteText(carrier.averageTransitMinutes),
      "Retraso medio": minuteText(carrier.averageDelayMinutes),
      Incidencias: carrier.withIncident,
      "% incidencias": percentText(carrier.incidentRate),
      Devueltas: carrier.returned,
      Puntuación: carrier.score ?? "-",
      Valoración: carrier.scoreLabel,
    })),
    Clientes_Destinos: report.customers.map((customer) => ({
      Cliente: customer.customer,
      Destino: customer.destination,
      Entregas: customer.final,
      Puntuales: customer.onTime,
      Retrasadas: customer.late,
      "% puntualidad": percentText(customer.onTimePercentage),
      "Tiempo medio": minuteText(customer.averageTransitMinutes),
      Incidencias: customer.withIncident,
      Devueltas: customer.returned,
    })),
    Incidencias: report.incidents.map((incident) => ({
      Tipo: incident.label,
      Total: incident.count,
      Abiertas: incident.open,
      Porcentaje: `${incident.percentage}%`,
    })),
    Evolucion_Mensual: report.months.map((month) => ({
      Mes: month.month,
      Entregas: month.final,
      Puntuales: month.onTime,
      Retrasadas: month.late,
      "% puntualidad": percentText(month.onTimePercentage),
      "Tiempo medio": minuteText(month.averageTransitMinutes),
      Incidencias: month.withIncident,
      Devueltas: month.returned,
    })),
  };
}
