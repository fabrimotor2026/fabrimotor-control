export const CALENDAR_VIEW_MODES = {
  MONTH: "MONTH",
  WEEK: "WEEK",
};

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;

function normalizedReference(value) {
  return String(value || "F-1012").trim().toUpperCase();
}

function normalizedTruckNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : String(value || "").trim();
}

function truckKey(reference, truckNumber) {
  return `${normalizedReference(reference)}:${normalizedTruckNumber(
    truckNumber
  )}`;
}

function parseLocalDate(value) {
  const dateValue = String(value || "").slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;

  const date = new Date(`${dateValue}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLocalIsoDate(value) {
  const date =
    value instanceof Date
      ? value
      : parseLocalDate(value);

  if (!date || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(value, amount) {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : parseLocalDate(value);

  if (!date) return null;

  date.setDate(date.getDate() + Number(amount || 0));
  return date;
}

function startOfWeek(value) {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : parseLocalDate(value);

  if (!date) return null;

  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

export function buildCalendarPeriod({
  anchorDate = toLocalIsoDate(new Date()),
  viewMode = CALENDAR_VIEW_MODES.MONTH,
} = {}) {
  const anchor = parseLocalDate(anchorDate) || new Date();
  anchor.setHours(12, 0, 0, 0);
  const normalizedMode =
    viewMode === CALENDAR_VIEW_MODES.WEEK
      ? CALENDAR_VIEW_MODES.WEEK
      : CALENDAR_VIEW_MODES.MONTH;
  let start;
  let end;
  let numberOfDays;

  if (normalizedMode === CALENDAR_VIEW_MODES.WEEK) {
    start = startOfWeek(anchor);
    numberOfDays = 7;
    end = addCalendarDays(start, 6);
  } else {
    const firstOfMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      1,
      12
    );
    start = startOfWeek(firstOfMonth);
    numberOfDays = 42;
    end = addCalendarDays(start, numberOfDays - 1);
  }

  const days = Array.from(
    { length: numberOfDays },
    (_, index) => {
      const date = addCalendarDays(start, index);

      return {
        date: toLocalIsoDate(date),
        dateObject: date,
        isCurrentMonth:
          date.getMonth() === anchor.getMonth() &&
          date.getFullYear() === anchor.getFullYear(),
        isToday:
          toLocalIsoDate(date) === toLocalIsoDate(new Date()),
      };
    }
  );

  const title =
    normalizedMode === CALENDAR_VIEW_MODES.MONTH
      ? anchor.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        })
      : `${start.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })} – ${end.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;

  return {
    viewMode: normalizedMode,
    anchorDate: toLocalIsoDate(anchor),
    startDate: toLocalIsoDate(start),
    endDate: toLocalIsoDate(end),
    title,
    days,
  };
}

function actualStatus(truck) {
  const shipmentStatus = String(
    truck?.shipment_status || ""
  ).toUpperCase();
  const productionStatus = String(
    truck?.status || ""
  ).toUpperCase();

  if (shipmentStatus === "SHIPPED") return "SHIPPED";
  if (productionStatus === "CLOSED") return "CLOSED";
  if (productionStatus === "OPEN") return "OPEN";

  return productionStatus || "CLOSED";
}

function normalizedCalendarEntry(actual, planned) {
  const row = actual || planned || {};
  const isActual = Boolean(actual);
  const firstValue = (...values) =>
    values.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    ) ?? "";

  return {
    id: row.id,
    key: truckKey(row.reference, row.truck_number),
    source: isActual ? "ACTUAL" : "PLANNED",
    status: isActual ? actualStatus(actual) : "PLANNED",
    reference: normalizedReference(row.reference),
    truckNumber: normalizedTruckNumber(row.truck_number),
    plannedDate: firstValue(
      actual?.planned_expedition_date,
      planned?.planned_expedition_date
    ),
    actualDate: firstValue(
      actual?.actual_expedition_date,
      planned?.actual_expedition_date
    ),
    calendarDate: firstValue(
      actual?.planned_expedition_date,
      planned?.planned_expedition_date,
      actual?.actual_expedition_date,
      planned?.actual_expedition_date
    ),
    customer: firstValue(
      actual?.customer_name,
      planned?.customer_name
    ),
    destination: firstValue(
      actual?.destination,
      planned?.destination
    ),
    carrier: firstValue(
      actual?.carrier_name,
      planned?.carrier_name
    ),
    tractorPlate: firstValue(
      actual?.tractor_plate,
      actual?.vehicle_plate,
      planned?.tractor_plate,
      planned?.vehicle_plate
    ),
    trailerPlate: firstValue(
      actual?.trailer_plate,
      planned?.trailer_plate
    ),
    shipmentStatus: firstValue(
      actual?.shipment_status,
      planned?.shipment_status,
      "PENDING"
    ),
    raw: row,
  };
}

export function mergeCalendarTrucks(
  actualTrucks = [],
  plannedTrucks = []
) {
  const entries = new Map();

  plannedTrucks.forEach((truck) => {
    const key = truckKey(truck?.reference, truck?.truck_number);
    entries.set(key, {
      actual: null,
      planned: truck,
    });
  });

  actualTrucks.forEach((truck) => {
    const key = truckKey(truck?.reference, truck?.truck_number);
    const previous = entries.get(key) || {};

    entries.set(key, {
      actual: truck,
      planned: previous.planned || null,
    });
  });

  return [...entries.values()]
    .map(({ actual, planned }) =>
      normalizedCalendarEntry(actual, planned)
    )
    .sort(
      (first, second) =>
        String(first.calendarDate || "9999-12-31").localeCompare(
          String(second.calendarDate || "9999-12-31")
        ) ||
        Number(first.truckNumber || 0) -
          Number(second.truckNumber || 0)
    );
}

function dateDeadlineTimestamp(value) {
  const date = String(value || "").slice(0, 10);
  const timestamp = new Date(`${date}T23:59:59.999`).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function projectionRisk({
  deadlineTimestamp,
  completionTimestamp,
  nowMs,
}) {
  if (!deadlineTimestamp) return "NO_DEADLINE";
  if (deadlineTimestamp < nowMs) return "DELAYED";
  if (!completionTimestamp) return "NO_DATA";

  const marginHours =
    (deadlineTimestamp - completionTimestamp) /
    HOUR_IN_MILLISECONDS;

  if (marginHours < 0) return "DELAYED";
  if (marginHours <= 12) return "AT_RISK";

  return "ON_TRACK";
}

function decorateEntries({
  entries,
  activeTruck,
  forecast,
  targetBoxes,
  nowMs,
}) {
  const currentRate =
    Number(forecast?.sampleSize || 0) >= 3 &&
    Number(forecast?.currentRate || 0) > 0
      ? Number(forecast.currentRate)
      : null;
  const activeKey = activeTruck?.id
    ? String(activeTruck.id)
    : "";
  let projectionCursor = forecast?.estimatedCompletionAt
    ? new Date(forecast.estimatedCompletionAt).getTime()
    : nowMs;

  return entries.map((entry) => {
    const isActive =
      entry.status === "OPEN" &&
      String(entry.raw?.id || "") === activeKey;
    const isFinished =
      entry.status === "CLOSED" ||
      entry.status === "SHIPPED";
    let progressPercent = isFinished ? 100 : 0;
    let completedBoxes = isFinished ? targetBoxes : 0;
    let remainingBoxes = isFinished ? 0 : targetBoxes;
    let estimatedCompletionAt = null;
    let risk = isFinished ? "COMPLETE" : "NO_DATA";

    if (isActive) {
      progressPercent = Number(forecast?.progressPercent || 0);
      completedBoxes = Number(forecast?.completedBoxes || 0);
      remainingBoxes = Number(
        forecast?.remainingBoxes ?? targetBoxes
      );
      estimatedCompletionAt =
        forecast?.estimatedCompletionAt || null;
      risk = forecast?.risk || "NO_DATA";
    } else if (entry.status === "PLANNED") {
      const completionTimestamp = currentRate
        ? projectionCursor +
          (targetBoxes / currentRate) *
            HOUR_IN_MILLISECONDS
        : null;

      estimatedCompletionAt = completionTimestamp
        ? new Date(completionTimestamp).toISOString()
        : null;
      risk = projectionRisk({
        deadlineTimestamp: dateDeadlineTimestamp(
          entry.plannedDate
        ),
        completionTimestamp,
        nowMs,
      });

      if (completionTimestamp) {
        projectionCursor = completionTimestamp;
      }
    } else if (entry.status === "OPEN") {
      risk = "NO_DATA";
    }

    return {
      ...entry,
      isActive,
      progressPercent,
      completedBoxes,
      remainingBoxes,
      estimatedCompletionAt,
      risk,
    };
  });
}

function capacityStatus({
  demandBoxes,
  boxesPerDay,
  pendingTrucks,
}) {
  if (!demandBoxes) return "EMPTY";
  if (!boxesPerDay) return "NO_DATA";
  if (demandBoxes > boxesPerDay) return "OVERLOAD";

  if (
    demandBoxes >= boxesPerDay * 0.8 ||
    pendingTrucks > 1
  ) {
    return "TIGHT";
  }

  return "AVAILABLE";
}

export function buildCapacityCalendar({
  actualTrucks = [],
  plannedTrucks = [],
  activeTruck = null,
  forecast = null,
  targetBoxes = 49,
  piecesPerBox = 16,
  period = buildCalendarPeriod(),
  nowMs = Date.now(),
} = {}) {
  const normalizedTarget = Math.max(
    1,
    Number(targetBoxes || 49)
  );
  const normalizedPieces = Math.max(
    1,
    Number(piecesPerBox || 16)
  );
  const mergedEntries = mergeCalendarTrucks(
    actualTrucks,
    plannedTrucks
  );
  const entries = decorateEntries({
    entries: mergedEntries,
    activeTruck,
    forecast,
    targetBoxes: normalizedTarget,
    nowMs,
  });
  const reliableRate =
    Number(forecast?.sampleSize || 0) >= 3 &&
    Number(forecast?.currentRate || 0) > 0
      ? Number(forecast.currentRate)
      : null;
  const boxesPerDay = reliableRate
    ? Math.round(reliableRate * 24 * 10) / 10
    : null;
  const piecesPerDay = boxesPerDay
    ? Math.round(boxesPerDay * normalizedPieces)
    : null;
  const days = period.days.map((day) => {
    const dayEntries = entries.filter(
      (entry) => entry.calendarDate === day.date
    );
    const pendingEntries = dayEntries.filter(
      (entry) =>
        entry.status === "PLANNED" ||
        entry.status === "OPEN"
    );
    const demandBoxes = pendingEntries.reduce(
      (total, entry) =>
        total +
        (entry.isActive
          ? Number(entry.remainingBoxes || 0)
          : normalizedTarget),
      0
    );
    const loadPercent =
      boxesPerDay && demandBoxes
        ? Math.round((demandBoxes / boxesPerDay) * 100)
        : demandBoxes
          ? null
          : 0;

    return {
      ...day,
      entries: dayEntries,
      pendingTrucks: pendingEntries.length,
      demandBoxes,
      demandPieces: demandBoxes * normalizedPieces,
      boxesPerDay,
      piecesPerDay,
      loadPercent,
      capacityStatus: capacityStatus({
        demandBoxes,
        boxesPerDay,
        pendingTrucks: pendingEntries.length,
      }),
    };
  });
  const visibleEntries = entries.filter(
    (entry) =>
      entry.calendarDate >= period.startDate &&
      entry.calendarDate <= period.endDate
  );

  return {
    period,
    entries,
    visibleEntries,
    days,
    rate: reliableRate,
    boxesPerDay,
    piecesPerDay,
    targetBoxes: normalizedTarget,
    piecesPerBox: normalizedPieces,
    summary: {
      total: visibleEntries.length,
      planned: visibleEntries.filter(
        (entry) => entry.status === "PLANNED"
      ).length,
      active: visibleEntries.filter(
        (entry) => entry.status === "OPEN"
      ).length,
      closed: visibleEntries.filter(
        (entry) => entry.status === "CLOSED"
      ).length,
      shipped: visibleEntries.filter(
        (entry) => entry.status === "SHIPPED"
      ).length,
      atRisk: visibleEntries.filter((entry) =>
        ["AT_RISK", "DELAYED"].includes(entry.risk)
      ).length,
      overloadDays: days.filter(
        (day) => day.capacityStatus === "OVERLOAD"
      ).length,
      tightDays: days.filter(
        (day) => day.capacityStatus === "TIGHT"
      ).length,
    },
  };
}

export async function fetchExpeditionCalendarData(
  supabase,
  reference = "F-1012"
) {
  if (!supabase) {
    throw new Error("Supabase no está disponible.");
  }

  const normalized = normalizedReference(reference);
  const [actualResult, plannedResult] = await Promise.all([
    supabase
      .from("f1012_trucks")
      .select("*")
      .eq("reference", normalized)
      .order("truck_number", { ascending: false })
      .limit(500),
    supabase
      .from("f1012_truck_schedule")
      .select("*")
      .eq("reference", normalized)
      .order("truck_number", { ascending: false })
      .limit(500),
  ]);

  if (actualResult.error) throw actualResult.error;
  if (plannedResult.error) throw plannedResult.error;

  return {
    actualTrucks: actualResult.data || [],
    plannedTrucks: plannedResult.data || [],
  };
}

export function shiftCalendarAnchor(
  anchorDate,
  viewMode,
  direction
) {
  const anchor = parseLocalDate(anchorDate) || new Date();
  const amount = Number(direction || 0);

  if (viewMode === CALENDAR_VIEW_MODES.WEEK) {
    return toLocalIsoDate(addCalendarDays(anchor, amount * 7));
  }

  anchor.setMonth(anchor.getMonth() + amount);
  return toLocalIsoDate(anchor);
}

export function calendarExportFileBase({
  reference = "F-1012",
  period,
} = {}) {
  const normalized = normalizedReference(reference)
    .replaceAll(/[^A-Z0-9]+/g, "");

  if (period?.viewMode === CALENDAR_VIEW_MODES.WEEK) {
    return `${normalized}_Calendario_Expediciones_Semana_${period.startDate}`;
  }

  return `${normalized}_Calendario_Expediciones_${
    String(period?.anchorDate || "").slice(0, 7) ||
    toLocalIsoDate(new Date()).slice(0, 7)
  }`;
}

export const CAPACITY_DAY_MILLISECONDS = DAY_IN_MILLISECONDS;
