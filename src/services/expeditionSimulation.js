import {
  addCalendarDays,
  buildCalendarPeriod,
  buildCapacityCalendar,
  CALENDAR_VIEW_MODES,
  toLocalIsoDate,
} from "./expeditionCapacity";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

function validPriority(value) {
  const priority = Number(value);

  return Number.isInteger(priority) && priority > 0
    ? priority
    : null;
}

function validDate(value) {
  const date = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function sortPlannedRows(rows = []) {
  return [...rows]
    .filter((row) => row?.status === "PLANNED")
    .sort((first, second) => {
      const firstPriority = validPriority(
        first?.planning_priority
      );
      const secondPriority = validPriority(
        second?.planning_priority
      );

      if (
        firstPriority !== null ||
        secondPriority !== null
      ) {
        return (
          (firstPriority ?? Number.MAX_SAFE_INTEGER) -
            (secondPriority ?? Number.MAX_SAFE_INTEGER) ||
          String(
            first?.planned_expedition_date || "9999-12-31"
          ).localeCompare(
            String(
              second?.planned_expedition_date || "9999-12-31"
            )
          ) ||
          Number(first?.truck_number || 0) -
            Number(second?.truck_number || 0)
        );
      }

      return (
        String(
          first?.planned_expedition_date || "9999-12-31"
        ).localeCompare(
          String(
            second?.planned_expedition_date || "9999-12-31"
          )
        ) ||
        Number(first?.truck_number || 0) -
          Number(second?.truck_number || 0)
      );
    });
}

export function createSimulationDrafts(plannedTrucks = []) {
  return sortPlannedRows(plannedTrucks).map(
    (truck, index) => ({
      id: truck.id,
      truckNumber: truck.truck_number,
      date: validDate(truck.planned_expedition_date),
      priority: index + 1,
      originalDate: validDate(
        truck.planned_expedition_date
      ),
      originalPriority: index + 1,
    })
  );
}

function normalizeDraftPriorities(drafts) {
  return drafts.map((draft, index) => ({
    ...draft,
    priority: index + 1,
  }));
}

export function moveSimulationDraft(
  drafts = [],
  draftId,
  direction
) {
  const currentIndex = drafts.findIndex(
    (draft) => String(draft.id) === String(draftId)
  );
  const targetIndex = currentIndex + Number(direction || 0);

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= drafts.length
  ) {
    return drafts;
  }

  const result = [...drafts];
  const [moved] = result.splice(currentIndex, 1);
  result.splice(targetIndex, 0, moved);

  return normalizeDraftPriorities(result);
}

export function updateSimulationDraftDate(
  drafts = [],
  draftId,
  date
) {
  return drafts.map((draft) =>
    String(draft.id) === String(draftId)
      ? {
          ...draft,
          date: validDate(date),
        }
      : draft
  );
}

function reliableRate(forecast) {
  return Number(forecast?.sampleSize || 0) >= 3 &&
    Number(forecast?.currentRate || 0) > 0
    ? Number(forecast.currentRate)
    : null;
}

function projectedRisk({
  date,
  completionTimestamp,
  nowMs,
}) {
  const deadlineTimestamp = date
    ? new Date(`${date}T23:59:59.999`).getTime()
    : null;

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

function projectDrafts({
  drafts,
  forecast,
  targetBoxes,
  nowMs,
}) {
  const rate = reliableRate(forecast);
  let cursor = forecast?.estimatedCompletionAt
    ? new Date(forecast.estimatedCompletionAt).getTime()
    : nowMs;

  return drafts.map((draft) => {
    const completionTimestamp = rate
      ? cursor +
        (Number(targetBoxes || 49) / rate) *
          HOUR_IN_MILLISECONDS
      : null;
    const risk = projectedRisk({
      date: draft.date,
      completionTimestamp,
      nowMs,
    });

    if (completionTimestamp) {
      cursor = completionTimestamp;
    }

    return {
      ...draft,
      risk,
      estimatedCompletionAt: completionTimestamp
        ? new Date(completionTimestamp).toISOString()
        : null,
    };
  });
}

function simulationPeriod({
  baseDrafts,
  scenarioDrafts,
  nowMs,
}) {
  const dates = [...baseDrafts, ...scenarioDrafts]
    .map((draft) => draft.date)
    .filter(Boolean)
    .sort();

  if (!dates.length) {
    return buildCalendarPeriod({
      anchorDate: toLocalIsoDate(new Date(nowMs)),
      viewMode: CALENDAR_VIEW_MODES.MONTH,
    });
  }

  const start = addCalendarDays(dates[0], -2);
  const end = addCalendarDays(dates.at(-1), 2);
  const numberOfDays = Math.min(
    370,
    Math.max(
      1,
      Math.round(
        (end.getTime() - start.getTime()) /
          (24 * HOUR_IN_MILLISECONDS)
      ) + 1
    )
  );
  const days = Array.from(
    { length: numberOfDays },
    (_, index) => {
      const dateObject = addCalendarDays(start, index);

      return {
        date: toLocalIsoDate(dateObject),
        dateObject,
        isCurrentMonth: true,
        isToday:
          toLocalIsoDate(dateObject) ===
          toLocalIsoDate(new Date(nowMs)),
      };
    }
  );

  return {
    viewMode: "SIMULATION",
    anchorDate: dates[0],
    startDate: days[0].date,
    endDate: days.at(-1).date,
    title: `${days[0].date} – ${days.at(-1).date}`,
    days,
  };
}

function scenarioRows(plannedTrucks, drafts) {
  const truckById = new Map(
    plannedTrucks.map((truck) => [
      String(truck.id),
      truck,
    ])
  );

  return drafts
    .map((draft) => {
      const truck = truckById.get(String(draft.id));

      if (!truck) return null;

      return {
        ...truck,
        planned_expedition_date: draft.date || null,
        planning_priority: draft.priority,
      };
    })
    .filter(Boolean);
}

function riskScore(risk) {
  const scores = {
    DELAYED: 5,
    AT_RISK: 3,
    NO_DATA: 2,
    NO_DEADLINE: 2,
    ON_TRACK: 0,
  };

  return scores[risk] ?? 0;
}

function latestCompletion(projectedDrafts) {
  return projectedDrafts
    .map((draft) => draft.estimatedCompletionAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

function projectedSummary(projectedDrafts) {
  return {
    delayed: projectedDrafts.filter(
      (draft) => draft.risk === "DELAYED"
    ).length,
    atRisk: projectedDrafts.filter(
      (draft) => draft.risk === "AT_RISK"
    ).length,
    noData: projectedDrafts.filter((draft) =>
      ["NO_DATA", "NO_DEADLINE"].includes(draft.risk)
    ).length,
    onTrack: projectedDrafts.filter(
      (draft) => draft.risk === "ON_TRACK"
    ).length,
    latestCompletionAt: latestCompletion(projectedDrafts),
    riskPoints: projectedDrafts.reduce(
      (total, draft) => total + riskScore(draft.risk),
      0
    ),
  };
}

function dayMap(days) {
  return new Map(days.map((day) => [day.date, day]));
}

function buildDayComparison(baseDays, scenarioDays) {
  const baseByDate = dayMap(baseDays);
  const scenarioByDate = dayMap(scenarioDays);
  const dates = [
    ...new Set([
      ...baseDays
        .filter((day) => day.demandBoxes)
        .map((day) => day.date),
      ...scenarioDays
        .filter((day) => day.demandBoxes)
        .map((day) => day.date),
    ]),
  ].sort();

  return dates.map((date) => {
    const base = baseByDate.get(date);
    const scenario = scenarioByDate.get(date);

    return {
      date,
      baseDemand: Number(base?.demandBoxes || 0),
      scenarioDemand: Number(
        scenario?.demandBoxes || 0
      ),
      demandDelta:
        Number(scenario?.demandBoxes || 0) -
        Number(base?.demandBoxes || 0),
      baseLoadPercent: base?.loadPercent ?? 0,
      scenarioLoadPercent:
        scenario?.loadPercent ?? 0,
      baseStatus: base?.capacityStatus || "EMPTY",
      scenarioStatus:
        scenario?.capacityStatus || "EMPTY",
      scenarioTrucks:
        scenario?.entries
          ?.filter((entry) =>
            ["PLANNED", "OPEN"].includes(entry.status)
          )
          .map((entry) => entry.truckNumber) || [],
    };
  });
}

function scoreScenario(calendar, projection) {
  return (
    calendar.summary.overloadDays * 10 +
    calendar.summary.tightDays * 3 +
    projection.riskPoints
  );
}

export function buildSimulationComparison({
  actualTrucks = [],
  plannedTrucks = [],
  activeTruck = null,
  forecast = null,
  targetBoxes = 49,
  piecesPerBox = 16,
  drafts = createSimulationDrafts(plannedTrucks),
  nowMs = Date.now(),
} = {}) {
  const baseDrafts = createSimulationDrafts(plannedTrucks);
  const normalizedDrafts = normalizeDraftPriorities(drafts);
  const period = simulationPeriod({
    baseDrafts,
    scenarioDrafts: normalizedDrafts,
    nowMs,
  });
  const simulatedRows = scenarioRows(
    plannedTrucks,
    normalizedDrafts
  );
  const baseCalendar = buildCapacityCalendar({
    actualTrucks,
    plannedTrucks,
    activeTruck,
    forecast,
    targetBoxes,
    piecesPerBox,
    period,
    nowMs,
  });
  const scenarioCalendar = buildCapacityCalendar({
    actualTrucks,
    plannedTrucks: simulatedRows,
    activeTruck,
    forecast,
    targetBoxes,
    piecesPerBox,
    period,
    nowMs,
  });
  const baseProjection = projectDrafts({
    drafts: baseDrafts,
    forecast,
    targetBoxes,
    nowMs,
  });
  const scenarioProjection = projectDrafts({
    drafts: normalizedDrafts,
    forecast,
    targetBoxes,
    nowMs,
  });
  const baseProjectionById = new Map(
    baseProjection.map((draft) => [
      String(draft.id),
      draft,
    ])
  );
  const scenarioProjectionById = new Map(
    scenarioProjection.map((draft) => [
      String(draft.id),
      draft,
    ])
  );
  const baseSummary = projectedSummary(baseProjection);
  const scenarioSummary = projectedSummary(
    scenarioProjection
  );
  const comparisons = normalizedDrafts.map((draft) => {
    const base = baseProjectionById.get(String(draft.id));
    const scenario = scenarioProjectionById.get(
      String(draft.id)
    );

    return {
      ...draft,
      originalDate: base?.date || draft.originalDate,
      originalPriority:
        base?.priority || draft.originalPriority,
      originalRisk: base?.risk || "NO_DATA",
      scenarioRisk: scenario?.risk || "NO_DATA",
      originalCompletionAt:
        base?.estimatedCompletionAt || null,
      scenarioCompletionAt:
        scenario?.estimatedCompletionAt || null,
      dateChanged:
        String(base?.date || "") !==
        String(scenario?.date || ""),
      priorityChanged:
        Number(base?.priority || 0) !==
        Number(scenario?.priority || 0),
    };
  });
  const changedDrafts = comparisons.filter(
    (draft) =>
      draft.dateChanged || draft.priorityChanged
  );
  const baseScore = scoreScenario(
    baseCalendar,
    baseSummary
  );
  const scenarioScore = scoreScenario(
    scenarioCalendar,
    scenarioSummary
  );

  return {
    base: {
      calendar: baseCalendar,
      projection: baseProjection,
      summary: baseSummary,
      score: baseScore,
    },
    scenario: {
      calendar: scenarioCalendar,
      projection: scenarioProjection,
      summary: scenarioSummary,
      score: scenarioScore,
    },
    comparisons,
    changedDrafts,
    changedCount: changedDrafts.length,
    dayComparison: buildDayComparison(
      baseCalendar.days,
      scenarioCalendar.days
    ),
    result:
      scenarioScore < baseScore
        ? "IMPROVED"
        : scenarioScore > baseScore
          ? "WORSE"
          : "UNCHANGED",
    hasReliableRate: Boolean(reliableRate(forecast)),
    validationErrors: normalizedDrafts
      .filter((draft) => !draft.date)
      .map(
        (draft) =>
          `El camión ${draft.truckNumber} no tiene fecha prevista.`
      ),
  };
}

export function suggestDatesFromCurrentRate({
  drafts = [],
  forecast,
  targetBoxes = 49,
  nowMs = Date.now(),
}) {
  const rate = reliableRate(forecast);

  if (!rate) {
    return {
      applied: false,
      drafts,
      message:
        "Se necesitan al menos 3 cajas recientes para proponer fechas según el ritmo actual.",
    };
  }

  let cursor = forecast?.estimatedCompletionAt
    ? new Date(forecast.estimatedCompletionAt).getTime()
    : nowMs;
  const suggestedDrafts = normalizeDraftPriorities(
    drafts
  ).map((draft) => {
    cursor +=
      (Number(targetBoxes || 49) / rate) *
      HOUR_IN_MILLISECONDS;

    return {
      ...draft,
      date: toLocalIsoDate(new Date(cursor)),
    };
  });

  return {
    applied: true,
    drafts: suggestedDrafts,
    message:
      "Fechas propuestas según el orden de prioridad y el ritmo reciente.",
  };
}

export function buildPlannedTruckUpdatePayload(
  truck,
  draft
) {
  return {
    plannedExpeditionDate: draft.date,
    actualExpeditionDate:
      truck?.actual_expedition_date || "",
    customerName: truck?.customer_name || "",
    destination: truck?.destination || "",
    carrierName: truck?.carrier_name || "",
    tractorPlate:
      truck?.tractor_plate ||
      truck?.vehicle_plate ||
      "",
    trailerPlate: truck?.trailer_plate || "",
    sealNumber: truck?.seal_number || "",
    deliveryNoteNumber:
      truck?.delivery_note_number || "",
    shipmentStatus: truck?.shipment_status || "PENDING",
    notes: truck?.notes || "",
    status: truck?.status || "PLANNED",
    planningPriority: draft.priority,
  };
}
