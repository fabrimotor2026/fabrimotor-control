const INVOICE_STATUS_LABELS = {
  PENDING: "Pendiente",
  RECEIVED: "Recibida",
  VERIFIED: "Verificada",
  PAID: "Pagada",
  NOT_REQUIRED: "No necesaria",
};

export const INVOICE_STATUS_OPTIONS = [
  { value: "ALL", label: "Todos los estados" },
  { value: "PENDING", label: "Pendiente" },
  { value: "RECEIVED", label: "Recibida" },
  { value: "VERIFIED", label: "Verificada" },
  { value: "PAID", label: "Pagada" },
  { value: "NOT_REQUIRED", label: "No necesaria" },
];

export const COST_RESULT_OPTIONS = [
  { value: "ALL", label: "Todos los resultados" },
  { value: "OVER_BUDGET", label: "Con sobrecoste" },
  { value: "ON_BUDGET", label: "Dentro de previsión" },
  { value: "WITHOUT_ESTIMATE", label: "Sin coste previsto" },
  { value: "WITHOUT_ACTUAL", label: "Sin coste real" },
  { value: "INVOICE_PENDING", label: "Factura pendiente" },
];

const COST_FIELDS = [
  "estimatedCost",
  "actualBaseCost",
  "fuelSurcharge",
  "tollsCost",
  "waitingCost",
  "returnCost",
  "otherCost",
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeReference(value) {
  return normalizeText(value || "F-1012").toUpperCase();
}

function normalizeStatus(value, fallback = "") {
  return normalizeText(value || fallback).toUpperCase();
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return Math.round((numberOrZero(value) + Number.EPSILON) * 100) / 100;
}

function percentage(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numberOrZero(numerator) / denominator) * 100);
}

function localDateParts(value) {
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
  if (!value) return "";

  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10))) {
    return raw.slice(0, 10);
  }

  const parts = localDateParts(value);
  return parts
    ? `${parts.year}-${parts.month}-${parts.day}`
    : "";
}

function monthKey(value) {
  return localDateKey(value).slice(0, 7);
}

function groupBy(rows, reader) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = normalizeText(reader(row)) || "Sin indicar";
    const previous = groups.get(key) || [];
    previous.push(row);
    groups.set(key, previous);
  });

  return groups;
}

function sum(rows, reader) {
  return money(
    rows.reduce(
      (total, row) => total + numberOrZero(reader(row)),
      0
    )
  );
}

function average(values) {
  const numbers = values.filter(Number.isFinite);
  if (!numbers.length) return null;

  return money(
    numbers.reduce((total, value) => total + value, 0) /
      numbers.length
  );
}

function readPieces(label, piecesPerBox) {
  const directKeys = [
    "total_piezas",
    "totalPiezas",
    "piece_count",
    "pieces",
    "piezas",
    "cantidad_total",
    "cantidadTotal",
  ];

  for (const key of directKeys) {
    const value = Number(label?.[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }

  if (Array.isArray(label?.cantidades)) {
    const total = label.cantidades.reduce(
      (accumulator, value) =>
        accumulator + Math.max(0, numberOrZero(value)),
      0
    );
    if (total > 0) return total;
  }

  const numberedQuantities = Object.entries(label || {})
    .filter(([key]) => /^cantidad_?\d+$/i.test(key))
    .map(([, value]) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (numberedQuantities.length) {
    const total = numberedQuantities.reduce(
      (accumulator, value) => accumulator + value,
      0
    );
    if (total > 0) return total;
  }

  return Math.max(0, Number(piecesPerBox || 16));
}

function costSchemaError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("f1012_truck_logistics_costs")
  );
}

function throwCostQueryError(error) {
  if (!error) return;

  if (costSchemaError(error)) {
    throw new Error(
      "Falta instalar la V2.37 en Supabase. Ejecuta FMCONTROL_V2_37_COSTES_LOGISTICOS.sql."
    );
  }

  throw error;
}

export function invoiceStatusLabel(value) {
  const status = normalizeStatus(value, "PENDING");
  return INVOICE_STATUS_LABELS[status] || status;
}

export function formatCostCurrency(
  value,
  currency = "EUR"
) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: normalizeStatus(currency, "EUR"),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCostDate(value) {
  const key = localDateKey(value);
  if (!key) return "-";
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function createEmptyCostDraft() {
  return {
    estimatedCost: "",
    actualBaseCost: "",
    fuelSurcharge: "",
    tollsCost: "",
    waitingCost: "",
    returnCost: "",
    otherCost: "",
    otherCostDescription: "",
    invoiceNumber: "",
    invoiceDate: "",
    invoiceStatus: "PENDING",
    notes: "",
  };
}

export function costDraftFromRow(row) {
  const cost = row?.cost || {};
  const displayNumber = (value) =>
    numberOrZero(value) ? String(money(value)) : "";

  return {
    estimatedCost: displayNumber(cost.estimated_cost),
    actualBaseCost: displayNumber(cost.actual_base_cost),
    fuelSurcharge: displayNumber(cost.fuel_surcharge),
    tollsCost: displayNumber(cost.tolls_cost),
    waitingCost: displayNumber(cost.waiting_cost),
    returnCost: displayNumber(cost.return_cost),
    otherCost: displayNumber(cost.other_cost),
    otherCostDescription: normalizeText(
      cost.other_cost_description
    ),
    invoiceNumber: normalizeText(cost.invoice_number),
    invoiceDate: localDateKey(cost.invoice_date),
    invoiceStatus: normalizeStatus(
      cost.invoice_status,
      "PENDING"
    ),
    notes: normalizeText(cost.notes),
  };
}

export function calculateDraftActualTotal(draft) {
  return money(
    COST_FIELDS.slice(1).reduce(
      (total, field) => total + numberOrZero(draft?.[field]),
      0
    )
  );
}

export function validateCostDraft(draft) {
  for (const field of COST_FIELDS) {
    const rawValue = draft?.[field];
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      continue;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      return {
        valid: false,
        message:
          "Los importes deben ser números positivos o cero.",
      };
    }

    if (value > 999_999_999.99) {
      return {
        valid: false,
        message: "Uno de los importes supera el límite permitido.",
      };
    }
  }

  const invoiceStatus = normalizeStatus(
    draft?.invoiceStatus,
    "PENDING"
  );

  if (
    ["RECEIVED", "VERIFIED", "PAID"].includes(invoiceStatus) &&
    !normalizeText(draft?.invoiceNumber)
  ) {
    return {
      valid: false,
      message:
        "Indica el número de factura para el estado seleccionado.",
    };
  }

  if (
    ["RECEIVED", "VERIFIED", "PAID"].includes(invoiceStatus) &&
    !localDateKey(draft?.invoiceDate)
  ) {
    return {
      valid: false,
      message:
        "Indica la fecha de factura para el estado seleccionado.",
    };
  }

  return { valid: true, message: "" };
}

export function costRecordMatchesPayload(record, payload) {
  if (!record || !payload) return false;

  const numericFields = [
    "estimated_cost",
    "actual_base_cost",
    "fuel_surcharge",
    "tolls_cost",
    "waiting_cost",
    "return_cost",
    "other_cost",
  ];
  const textFields = [
    "other_cost_description",
    "invoice_number",
    "notes",
  ];

  if (
    normalizeReference(record.reference) !==
      normalizeReference(payload.reference) ||
    Number(record.truck_number) !== Number(payload.truck_number) ||
    normalizeStatus(record.currency, "EUR") !==
      normalizeStatus(payload.currency, "EUR") ||
    normalizeStatus(record.invoice_status, "PENDING") !==
      normalizeStatus(payload.invoice_status, "PENDING") ||
    localDateKey(record.invoice_date) !==
      localDateKey(payload.invoice_date)
  ) {
    return false;
  }

  if (
    numericFields.some(
      (field) => money(record[field]) !== money(payload[field])
    )
  ) {
    return false;
  }

  return textFields.every(
    (field) =>
      normalizeText(record[field]) === normalizeText(payload[field])
  );
}

export async function saveTruckLogisticsCost(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
    draft,
    actor = "",
  }
) {
  const normalizedTruckNumber = Number(truckNumber);
  if (
    !Number.isInteger(normalizedTruckNumber) ||
    normalizedTruckNumber <= 0
  ) {
    throw new Error("El número de camión no es válido.");
  }

  const validation = validateCostDraft(draft);
  if (!validation.valid) throw new Error(validation.message);

  const payload = {
    reference: normalizeReference(reference),
    truck_number: normalizedTruckNumber,
    currency: "EUR",
    estimated_cost: money(draft.estimatedCost),
    actual_base_cost: money(draft.actualBaseCost),
    fuel_surcharge: money(draft.fuelSurcharge),
    tolls_cost: money(draft.tollsCost),
    waiting_cost: money(draft.waitingCost),
    return_cost: money(draft.returnCost),
    other_cost: money(draft.otherCost),
    other_cost_description: normalizeText(
      draft.otherCostDescription
    ),
    invoice_number: normalizeText(draft.invoiceNumber),
    invoice_date: localDateKey(draft.invoiceDate) || null,
    invoice_status: normalizeStatus(
      draft.invoiceStatus,
      "PENDING"
    ),
    notes: normalizeText(draft.notes),
    updated_by: normalizeText(actor) || "Sistema",
  };

  const { error } = await supabase
    .from("f1012_truck_logistics_costs")
    .upsert(payload, {
      onConflict: "reference,truck_number",
    })
    .select("*")
    .single();

  throwCostQueryError(error);

  const { data: persistedCost, error: persistedError } =
    await supabase
      .from("f1012_truck_logistics_costs")
      .select("*")
      .eq("reference", payload.reference)
      .eq("truck_number", payload.truck_number)
      .single();

  throwCostQueryError(persistedError);

  if (!costRecordMatchesPayload(persistedCost, payload)) {
    throw new Error(
      "Supabase no ha confirmado todos los importes. Vuelve a guardar después de ejecutar la corrección V2.37.1."
    );
  }

  return persistedCost;
}

function aggregateCostRows(rows) {
  const estimatedTotal = sum(rows, (row) => row.estimatedCost);
  const actualTotal = sum(rows, (row) => row.actualTotal);
  const boxes = rows.reduce(
    (total, row) => total + row.boxCount,
    0
  );
  const pieces = rows.reduce(
    (total, row) => total + row.pieceCount,
    0
  );
  const surchargeTotal = sum(rows, (row) => row.surchargeTotal);
  const withActual = rows.filter((row) => row.actualTotal > 0);
  const withEstimate = rows.filter((row) => row.estimatedCost > 0);
  const overBudget = rows.filter((row) => row.isOverBudget);
  const invoicePending = rows.filter((row) => row.invoicePending);

  return {
    total: rows.length,
    withActual: withActual.length,
    withEstimate: withEstimate.length,
    estimatedTotal,
    actualTotal,
    varianceTotal: money(actualTotal - estimatedTotal),
    variancePercentage:
      estimatedTotal > 0
        ? Math.round(
            ((actualTotal - estimatedTotal) / estimatedTotal) * 100
          )
        : null,
    surchargeTotal,
    overBudget: overBudget.length,
    invoicePending: invoicePending.length,
    boxes,
    pieces,
    costPerBox: boxes > 0 ? money(actualTotal / boxes) : null,
    costPerPiece:
      pieces > 0 ? money(actualTotal / pieces) : null,
    averageCost:
      withActual.length > 0
        ? average(withActual.map((row) => row.actualTotal))
        : null,
  };
}

function buildCarrierRows(rows) {
  return [...groupBy(rows, (row) => row.carrier).entries()]
    .map(([carrier, groupedRows]) => ({
      carrier,
      ...aggregateCostRows(groupedRows),
    }))
    .sort(
      (first, second) =>
        second.actualTotal - first.actualTotal ||
        first.carrier.localeCompare(second.carrier)
    );
}

function buildCustomerRows(rows) {
  return [
    ...groupBy(
      rows,
      (row) => `${row.customer}|||${row.destination}`
    ).entries(),
  ]
    .map(([key, groupedRows]) => {
      const [customer, destination] = key.split("|||");
      return {
        customer,
        destination,
        ...aggregateCostRows(groupedRows),
      };
    })
    .sort(
      (first, second) =>
        second.actualTotal - first.actualTotal ||
        first.customer.localeCompare(second.customer)
    );
}

function buildMonthlyRows(rows) {
  return [
    ...groupBy(
      rows.filter((row) => row.month),
      (row) => row.month
    ).entries(),
  ]
    .filter(([month]) => month !== "Sin indicar")
    .map(([month, groupedRows]) => ({
      month,
      ...aggregateCostRows(groupedRows),
    }))
    .sort((first, second) => first.month.localeCompare(second.month));
}

function buildAlerts(rows) {
  return rows
    .flatMap((row) => {
      const alerts = [];

      if (row.isOverBudget) {
        alerts.push({
          id: `over-${row.truckNumber}`,
          severity:
            row.variancePercentage !== null &&
            row.variancePercentage >= 10
              ? "CRITICAL"
              : "WARNING",
          type: "OVER_BUDGET",
          truckNumber: row.truckNumber,
          title: `Camión ${row.truckNumber} con sobrecoste`,
          message: `${formatCostCurrency(
            row.variance
          )} sobre la previsión${
            row.variancePercentage !== null
              ? ` (${row.variancePercentage}%)`
              : ""
          }.`,
        });
      }

      if (row.invoicePending) {
        alerts.push({
          id: `invoice-${row.truckNumber}`,
          severity: "WARNING",
          type: "INVOICE_PENDING",
          truckNumber: row.truckNumber,
          title: `Factura pendiente · Camión ${row.truckNumber}`,
          message: `Coste real ${formatCostCurrency(
            row.actualTotal
          )} sin factura recibida.`,
        });
      }

      if (row.isFinal && row.estimatedCost <= 0) {
        alerts.push({
          id: `estimate-${row.truckNumber}`,
          severity: "INFO",
          type: "WITHOUT_ESTIMATE",
          truckNumber: row.truckNumber,
          title: `Sin previsión · Camión ${row.truckNumber}`,
          message:
            "La expedición ha finalizado sin coste previsto registrado.",
        });
      }

      if (row.isFinal && row.actualTotal <= 0) {
        alerts.push({
          id: `actual-${row.truckNumber}`,
          severity: "INFO",
          type: "WITHOUT_ACTUAL",
          truckNumber: row.truckNumber,
          title: `Sin coste real · Camión ${row.truckNumber}`,
          message:
            "La expedición ha finalizado y todavía no tiene coste real.",
        });
      }

      return alerts;
    })
    .sort((first, second) => {
      const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return (
        order[first.severity] - order[second.severity] ||
        second.truckNumber - first.truckNumber
      );
    });
}

export function buildLogisticsCostRows({
  actualTrucks = [],
  plannedTrucks = [],
  costs = [],
  deliveries = [],
  labels = [],
  piecesPerBox = 16,
} = {}) {
  const costByNumber = new Map(
    costs.map((cost) => [Number(cost.truck_number), cost])
  );
  const deliveryByNumber = new Map(
    deliveries.map((delivery) => [
      Number(delivery.truck_number),
      delivery,
    ])
  );
  const labelsByTruck = new Map();

  labels.forEach((label) => {
    const truckId = String(label?.camion_id || "");
    const previous = labelsByTruck.get(truckId) || [];
    previous.push(label);
    labelsByTruck.set(truckId, previous);
  });

  const actualByNumber = new Map(
    actualTrucks
      .filter((truck) => Number(truck?.truck_number) > 0)
      .map((truck) => [Number(truck.truck_number), truck])
  );
  const expeditionByNumber = new Map();

  plannedTrucks.forEach((truck) => {
    const truckNumber = Number(truck?.truck_number);
    if (truckNumber > 0) {
      expeditionByNumber.set(truckNumber, {
        truck,
        kind: "PLANNED",
      });
    }
  });

  actualByNumber.forEach((truck, truckNumber) => {
    expeditionByNumber.set(truckNumber, {
      truck,
      kind: "ACTUAL",
    });
  });

  costs.forEach((cost) => {
    const truckNumber = Number(cost?.truck_number);
    if (
      truckNumber > 0 &&
      !expeditionByNumber.has(truckNumber)
    ) {
      expeditionByNumber.set(truckNumber, {
        truck: {
          reference: cost.reference,
          truck_number: truckNumber,
        },
        kind: "HISTORICAL",
      });
    }
  });

  return [...expeditionByNumber.entries()]
    .map(([truckNumber, expedition]) => {
      const truck = expedition.truck;
      const cost = costByNumber.get(truckNumber) || null;
      const delivery = deliveryByNumber.get(truckNumber) || null;
      const truckLabels =
        labelsByTruck.get(String(truck?.id || "")) || [];
      const boxCount = truckLabels.length;
      const pieceCount = truckLabels.reduce(
        (total, label) =>
          total + readPieces(label, piecesPerBox),
        0
      );
      const estimatedCost = money(cost?.estimated_cost);
      const actualBaseCost = money(cost?.actual_base_cost);
      const fuelSurcharge = money(cost?.fuel_surcharge);
      const tollsCost = money(cost?.tolls_cost);
      const waitingCost = money(cost?.waiting_cost);
      const returnCost = money(cost?.return_cost);
      const otherCost = money(cost?.other_cost);
      const surchargeTotal = money(
        fuelSurcharge +
          tollsCost +
          waitingCost +
          returnCost +
          otherCost
      );
      const actualTotal = money(
        cost?.actual_total ??
          actualBaseCost + surchargeTotal
      );
      const variance = money(actualTotal - estimatedCost);
      const variancePercentage =
        estimatedCost > 0
          ? Math.round((variance / estimatedCost) * 100)
          : null;
      const invoiceStatus = normalizeStatus(
        cost?.invoice_status,
        "PENDING"
      );
      const deliveryStatus = normalizeStatus(
        delivery?.status,
        ""
      );
      const isFinal = [
        "DELIVERED",
        "DELIVERED_WITH_INCIDENT",
        "RETURNED",
      ].includes(deliveryStatus);
      const performanceDate =
        delivery?.delivered_at ||
        truck?.actual_expedition_date ||
        truck?.planned_expedition_date ||
        truck?.created_at ||
        cost?.invoice_date ||
        cost?.created_at;
      const accountingDate =
        cost?.invoice_date || performanceDate;
      const hasActualCost = actualTotal > 0;
      const invoicePending =
        hasActualCost &&
        !["RECEIVED", "VERIFIED", "PAID", "NOT_REQUIRED"].includes(
          invoiceStatus
        );

      return {
        id: cost?.id || `${expedition.kind}-${truckNumber}`,
        reference: normalizeReference(
          truck?.reference || cost?.reference
        ),
        truckNumber,
        kind: expedition.kind,
        truck,
        cost,
        delivery,
        carrier:
          normalizeText(truck?.carrier_name) ||
          "Sin transportista",
        customer:
          normalizeText(truck?.customer_name) || "Sin cliente",
        destination:
          normalizeText(truck?.destination) || "Sin destino",
        plannedDate: localDateKey(
          truck?.planned_expedition_date
        ),
        actualDate: localDateKey(
          truck?.actual_expedition_date
        ),
        performanceDate,
        dateKey: localDateKey(performanceDate),
        month: monthKey(accountingDate),
        status: normalizeStatus(truck?.status, expedition.kind),
        deliveryStatus,
        isFinal,
        boxCount,
        pieceCount,
        estimatedCost,
        actualBaseCost,
        fuelSurcharge,
        tollsCost,
        waitingCost,
        returnCost,
        otherCost,
        surchargeTotal,
        actualTotal,
        variance,
        variancePercentage,
        isOverBudget:
          estimatedCost > 0 && actualTotal > estimatedCost,
        isOnBudget:
          estimatedCost > 0 &&
          actualTotal > 0 &&
          actualTotal <= estimatedCost,
        costPerBox:
          boxCount > 0 && actualTotal > 0
            ? money(actualTotal / boxCount)
            : null,
        costPerPiece:
          pieceCount > 0 && actualTotal > 0
            ? money(actualTotal / pieceCount)
            : null,
        invoiceNumber: normalizeText(cost?.invoice_number),
        invoiceDate: localDateKey(cost?.invoice_date),
        invoiceStatus,
        invoiceStatusLabel: invoiceStatusLabel(invoiceStatus),
        invoicePending,
      };
    })
    .sort(
      (first, second) =>
        second.dateKey.localeCompare(first.dateKey) ||
        second.truckNumber - first.truckNumber
    );
}

export function filterLogisticsCostRows(
  rows,
  {
    dateFrom = "",
    dateTo = "",
    carrier = "ALL",
    customer = "ALL",
    destination = "ALL",
    invoiceStatus = "ALL",
    result = "ALL",
  } = {}
) {
  return rows.filter((row) => {
    if (dateFrom && row.dateKey < dateFrom) return false;
    if (dateTo && row.dateKey > dateTo) return false;
    if (carrier !== "ALL" && row.carrier !== carrier) return false;
    if (customer !== "ALL" && row.customer !== customer) return false;
    if (
      destination !== "ALL" &&
      row.destination !== destination
    ) {
      return false;
    }
    if (
      invoiceStatus !== "ALL" &&
      row.invoiceStatus !== invoiceStatus
    ) {
      return false;
    }

    if (result === "OVER_BUDGET" && !row.isOverBudget) return false;
    if (result === "ON_BUDGET" && !row.isOnBudget) return false;
    if (
      result === "WITHOUT_ESTIMATE" &&
      row.estimatedCost > 0
    ) {
      return false;
    }
    if (result === "WITHOUT_ACTUAL" && row.actualTotal > 0) {
      return false;
    }
    if (
      result === "INVOICE_PENDING" &&
      !row.invoicePending
    ) {
      return false;
    }

    return true;
  });
}

export function buildLogisticsCostReport(rows, filters = {}) {
  const filteredRows = filterLogisticsCostRows(rows, filters);
  const unique = (field) =>
    [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort(
      (first, second) => first.localeCompare(second)
    );

  return {
    rows: filteredRows,
    summary: aggregateCostRows(filteredRows),
    carriers: buildCarrierRows(filteredRows),
    customers: buildCustomerRows(filteredRows),
    months: buildMonthlyRows(filteredRows),
    alerts: buildAlerts(filteredRows),
    options: {
      carriers: unique("carrier"),
      customers: unique("customer"),
      destinations: unique("destination"),
    },
    filters,
  };
}

export async function fetchLogisticsCostData(
  supabase,
  {
    reference = "F-1012",
    piecesPerBox = 16,
  } = {}
) {
  const normalizedReference = normalizeReference(reference);
  const [
    actualResult,
    plannedResult,
    costsResult,
    deliveriesResult,
  ] = await Promise.all([
    supabase
      .from("f1012_trucks")
      .select("*")
      .eq("reference", normalizedReference),
    supabase
      .from("f1012_truck_schedule")
      .select("*")
      .eq("reference", normalizedReference)
      .eq("status", "PLANNED"),
    supabase
      .from("f1012_truck_logistics_costs")
      .select("*")
      .eq("reference", normalizedReference),
    supabase
      .from("f1012_truck_deliveries")
      .select("*")
      .eq("reference", normalizedReference),
  ]);

  throwCostQueryError(costsResult.error);
  if (actualResult.error) throw actualResult.error;
  if (plannedResult.error) throw plannedResult.error;
  if (deliveriesResult.error) throw deliveriesResult.error;

  const actualTrucks = actualResult.data || [];
  const actualIds = actualTrucks
    .map((truck) => truck?.id)
    .filter(Boolean);
  const labelsResult = actualIds.length
    ? await supabase
        .from("f1012_box_labels")
        .select("*")
        .in("camion_id", actualIds)
        .limit(20_000)
    : { data: [], error: null };

  if (labelsResult.error) throw labelsResult.error;

  return buildLogisticsCostRows({
    actualTrucks,
    plannedTrucks: plannedResult.data || [],
    costs: costsResult.data || [],
    deliveries: deliveriesResult.data || [],
    labels: labelsResult.data || [],
    piecesPerBox,
  });
}

function safeFileSegment(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function logisticsCostFileBase(
  reference,
  date = new Date()
) {
  const referenceText =
    safeFileSegment(normalizeReference(reference).replaceAll("-", "")) ||
    "F1012";
  return `${referenceText}_Costes_Logisticos_${
    localDateKey(date) || "SIN-FECHA"
  }`;
}

export function buildLogisticsCostExportSheets(report) {
  return {
    Resumen: [
      {
        Indicador: "Expediciones filtradas",
        Valor: report.summary.total,
      },
      {
        Indicador: "Coste previsto",
        Valor: report.summary.estimatedTotal,
      },
      {
        Indicador: "Coste real",
        Valor: report.summary.actualTotal,
      },
      {
        Indicador: "Desviación",
        Valor: report.summary.varianceTotal,
      },
      {
        Indicador: "% desviación",
        Valor:
          report.summary.variancePercentage === null
            ? "-"
            : `${report.summary.variancePercentage}%`,
      },
      {
        Indicador: "Coste por caja",
        Valor: report.summary.costPerBox ?? "-",
      },
      {
        Indicador: "Coste por pieza",
        Valor: report.summary.costPerPiece ?? "-",
      },
      {
        Indicador: "Recargos",
        Valor: report.summary.surchargeTotal,
      },
      {
        Indicador: "Facturas pendientes",
        Valor: report.summary.invoicePending,
      },
    ],
    Expediciones: report.rows.map((row) => ({
      Camión: row.truckNumber,
      Fecha: formatCostDate(row.performanceDate),
      Estado: row.status,
      Transportista: row.carrier,
      Cliente: row.customer,
      Destino: row.destination,
      Cajas: row.boxCount,
      Piezas: row.pieceCount,
      "Coste previsto": row.estimatedCost,
      "Transporte base": row.actualBaseCost,
      Combustible: row.fuelSurcharge,
      Peajes: row.tollsCost,
      Esperas: row.waitingCost,
      Devolución: row.returnCost,
      Otros: row.otherCost,
      "Coste real": row.actualTotal,
      Desviación: row.variance,
      "% desviación":
        row.variancePercentage === null
          ? "-"
          : `${row.variancePercentage}%`,
      "Coste/caja": row.costPerBox ?? "-",
      "Coste/pieza": row.costPerPiece ?? "-",
      Factura: row.invoiceNumber || "-",
      "Fecha factura": formatCostDate(row.invoiceDate),
      "Estado factura": row.invoiceStatusLabel,
    })),
    Transportistas: report.carriers.map((carrier) => ({
      Transportista: carrier.carrier,
      Expediciones: carrier.total,
      "Coste previsto": carrier.estimatedTotal,
      "Coste real": carrier.actualTotal,
      Desviación: carrier.varianceTotal,
      Sobrecostes: carrier.overBudget,
      Recargos: carrier.surchargeTotal,
      "Coste medio": carrier.averageCost ?? "-",
      "Coste/caja": carrier.costPerBox ?? "-",
      "Coste/pieza": carrier.costPerPiece ?? "-",
      "Facturas pendientes": carrier.invoicePending,
    })),
    Clientes_Destinos: report.customers.map((customer) => ({
      Cliente: customer.customer,
      Destino: customer.destination,
      Expediciones: customer.total,
      "Coste previsto": customer.estimatedTotal,
      "Coste real": customer.actualTotal,
      Desviación: customer.varianceTotal,
      "Coste/caja": customer.costPerBox ?? "-",
      "Coste/pieza": customer.costPerPiece ?? "-",
    })),
    Evolucion_Mensual: report.months.map((month) => ({
      Mes: month.month,
      Expediciones: month.total,
      "Coste previsto": month.estimatedTotal,
      "Coste real": month.actualTotal,
      Desviación: month.varianceTotal,
      Recargos: month.surchargeTotal,
      "Facturas pendientes": month.invoicePending,
    })),
    Alertas: report.alerts.map((alert) => ({
      Nivel: alert.severity,
      Camión: alert.truckNumber,
      Alerta: alert.title,
      Detalle: alert.message,
    })),
  };
}
