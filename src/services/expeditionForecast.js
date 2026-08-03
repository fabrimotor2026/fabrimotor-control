export const FORECAST_SAMPLE_SIZE = 12;
export const FORECAST_MINIMUM_SAMPLE = 3;
export const FORECAST_RISK_MARGIN_HOURS = 12;
export const INACTIVITY_WARNING_HOURS = 1;
export const INACTIVITY_STOPPED_HOURS = 2;

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

function validTimestamp(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function plannedDeadlineTimestamp(value) {
  const dateValue = String(value || "").slice(0, 10);

  if (!dateValue) return null;

  const timestamp = new Date(
    `${dateValue}T23:59:59.999`
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function round(value, decimals = 1) {
  const multiplier = 10 ** decimals;
  return (
    Math.round((Number(value) || 0) * multiplier) /
    multiplier
  );
}

function normalizeLabels(labels = []) {
  const validLabels = labels
    .map((label) => ({
      ...label,
      forecast_timestamp: validTimestamp(label?.created_at),
    }))
    .filter((label) => label.forecast_timestamp !== null)
    .sort(
      (first, second) =>
        first.forecast_timestamp -
        second.forecast_timestamp
    );
  const uniqueBoxes = new Map();

  validLabels.forEach((label) => {
    const boxNumber = String(label?.numero_caja || "").trim();
    const key = boxNumber || `id:${label?.id}`;

    if (!uniqueBoxes.has(key)) {
      uniqueBoxes.set(key, label);
    }
  });

  return [...uniqueBoxes.values()].sort(
    (first, second) =>
      first.forecast_timestamp -
      second.forecast_timestamp
  );
}

function calculateRecentRate(normalizedLabels) {
  const sample = normalizedLabels.slice(
    -FORECAST_SAMPLE_SIZE
  );

  if (sample.length < 2) {
    return {
      rate: null,
      sample,
      elapsedHours: 0,
    };
  }

  const elapsedHours =
    (sample.at(-1).forecast_timestamp -
      sample[0].forecast_timestamp) /
    HOUR_IN_MILLISECONDS;

  if (elapsedHours <= 1 / 60) {
    return {
      rate: null,
      sample,
      elapsedHours,
    };
  }

  return {
    rate: round((sample.length - 1) / elapsedHours, 2),
    sample,
    elapsedHours: round(elapsedHours, 2),
  };
}

function forecastReliability(sampleLength, elapsedHours) {
  if (
    sampleLength >= 8 &&
    Number(elapsedHours || 0) >= 1
  ) {
    return "HIGH";
  }

  if (sampleLength >= FORECAST_MINIMUM_SAMPLE) {
    return "MEDIUM";
  }

  return "LOW";
}

function calculateInactivity(lastTimestamp, nowMs) {
  if (!lastTimestamp) {
    return {
      status: "NO_DATA",
      hours: null,
    };
  }

  const hours = Math.max(
    0,
    (nowMs - lastTimestamp) / HOUR_IN_MILLISECONDS
  );

  if (hours >= INACTIVITY_STOPPED_HOURS) {
    return {
      status: "STOPPED",
      hours: round(hours, 1),
    };
  }

  if (hours >= INACTIVITY_WARNING_HOURS) {
    return {
      status: "WARNING",
      hours: round(hours, 1),
    };
  }

  return {
    status: "ACTIVE",
    hours: round(hours, 1),
  };
}

function forecastRisk({
  remainingBoxes,
  deadlineTimestamp,
  estimatedCompletionTimestamp,
  sampleLength,
  currentRate,
  requiredRate,
  inactivityStatus,
  nowMs,
}) {
  if (remainingBoxes <= 0) return "COMPLETE";
  if (!deadlineTimestamp) return "NO_DEADLINE";
  if (deadlineTimestamp <= nowMs) return "DELAYED";

  if (
    sampleLength < FORECAST_MINIMUM_SAMPLE ||
    !currentRate ||
    !estimatedCompletionTimestamp
  ) {
    return "INSUFFICIENT_DATA";
  }

  const marginHours =
    (deadlineTimestamp - estimatedCompletionTimestamp) /
    HOUR_IN_MILLISECONDS;

  if (marginHours < 0) return "DELAYED";
  if (inactivityStatus === "STOPPED") return "AT_RISK";

  if (
    marginHours <= FORECAST_RISK_MARGIN_HOURS ||
    (requiredRate &&
      currentRate < requiredRate * 1.1)
  ) {
    return "AT_RISK";
  }

  return "ON_TRACK";
}

function buildHourlySeries(
  normalizedLabels,
  nowMs,
  numberOfHours = 12
) {
  const currentHour =
    Math.floor(nowMs / HOUR_IN_MILLISECONDS) *
    HOUR_IN_MILLISECONDS;

  return Array.from(
    { length: numberOfHours },
    (_, index) => {
      const start =
        currentHour -
        (numberOfHours - 1 - index) *
          HOUR_IN_MILLISECONDS;
      const end = start + HOUR_IN_MILLISECONDS;
      const date = new Date(start);

      return {
        start_at: new Date(start).toISOString(),
        label: date.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        boxes: normalizedLabels.filter(
          (label) =>
            label.forecast_timestamp >= start &&
            label.forecast_timestamp < end
        ).length,
      };
    }
  );
}

function calculateDeadlineMetrics({
  remainingBoxes,
  deadlineTimestamp,
  nowMs,
}) {
  if (!deadlineTimestamp) {
    return {
      deadlineAt: null,
      hoursToDeadline: null,
      requiredRate: null,
    };
  }

  const hoursToDeadline =
    (deadlineTimestamp - nowMs) /
    HOUR_IN_MILLISECONDS;

  return {
    deadlineAt: new Date(deadlineTimestamp).toISOString(),
    hoursToDeadline: round(hoursToDeadline, 1),
    requiredRate:
      remainingBoxes > 0 && hoursToDeadline > 0
        ? round(remainingBoxes / hoursToDeadline, 2)
        : 0,
  };
}

function buildNextTruckForecast({
  nextPlannedTruck,
  currentEstimatedCompletionTimestamp,
  currentRate,
  sampleLength,
  targetBoxes,
  nowMs,
}) {
  if (!nextPlannedTruck) return null;

  const deadlineTimestamp = plannedDeadlineTimestamp(
    nextPlannedTruck.planned_expedition_date
  );
  const startTimestamp =
    currentEstimatedCompletionTimestamp || nowMs;
  const estimatedCompletionTimestamp =
    currentRate && sampleLength >= FORECAST_MINIMUM_SAMPLE
      ? startTimestamp +
        (targetBoxes / currentRate) *
          HOUR_IN_MILLISECONDS
      : null;
  const requiredWindowHours = deadlineTimestamp
    ? (deadlineTimestamp - startTimestamp) /
      HOUR_IN_MILLISECONDS
    : null;
  const requiredRate =
    requiredWindowHours && requiredWindowHours > 0
      ? round(targetBoxes / requiredWindowHours, 2)
      : 0;
  const risk = forecastRisk({
    remainingBoxes: targetBoxes,
    deadlineTimestamp,
    estimatedCompletionTimestamp,
    sampleLength,
    currentRate,
    requiredRate,
    nowMs: startTimestamp,
  });

  return {
    truck: nextPlannedTruck,
    targetBoxes,
    estimatedStartAt: new Date(startTimestamp).toISOString(),
    estimatedCompletionAt: estimatedCompletionTimestamp
      ? new Date(estimatedCompletionTimestamp).toISOString()
      : null,
    deadlineAt: deadlineTimestamp
      ? new Date(deadlineTimestamp).toISOString()
      : null,
    requiredRate,
    risk,
  };
}

export function buildExpeditionForecast({
  activeTruck,
  labels = [],
  targetBoxes = 49,
  piecesPerBox = 16,
  nextPlannedTruck = null,
  nowMs = Date.now(),
}) {
  const normalizedTarget = Math.max(
    1,
    Number(targetBoxes || 49)
  );
  const normalizedPiecesPerBox = Math.max(
    1,
    Number(piecesPerBox || 16)
  );

  if (!activeTruck?.id) {
    return {
      hasActiveTruck: false,
      risk: "NO_ACTIVE_TRUCK",
      labels: [],
      hourly: [],
      nextTruck: null,
    };
  }

  const normalizedLabels = normalizeLabels(labels);
  const completedBoxes = Math.min(
    normalizedTarget,
    normalizedLabels.length
  );
  const remainingBoxes = Math.max(
    0,
    normalizedTarget - completedBoxes
  );
  const rateResult = calculateRecentRate(normalizedLabels);
  const currentRate = rateResult.rate;
  const estimatedHoursRemaining =
    remainingBoxes <= 0
      ? 0
      : currentRate
        ? remainingBoxes / currentRate
        : null;
  const estimatedCompletionTimestamp =
    estimatedHoursRemaining === null
      ? null
      : nowMs +
        estimatedHoursRemaining * HOUR_IN_MILLISECONDS;
  const deadlineTimestamp = plannedDeadlineTimestamp(
    activeTruck.planned_expedition_date
  );
  const deadlineMetrics = calculateDeadlineMetrics({
    remainingBoxes,
    deadlineTimestamp,
    nowMs,
  });
  const lastTimestamp =
    normalizedLabels.at(-1)?.forecast_timestamp || null;
  const inactivity = calculateInactivity(lastTimestamp, nowMs);
  const risk = forecastRisk({
    remainingBoxes,
    deadlineTimestamp,
    estimatedCompletionTimestamp,
    sampleLength: rateResult.sample.length,
    currentRate,
    requiredRate: deadlineMetrics.requiredRate,
    inactivityStatus: inactivity.status,
    nowMs,
  });
  const marginHours =
    deadlineTimestamp && estimatedCompletionTimestamp
      ? round(
          (deadlineTimestamp -
            estimatedCompletionTimestamp) /
            HOUR_IN_MILLISECONDS,
          1
        )
      : null;
  return {
    hasActiveTruck: true,
    truck: activeTruck,
    labels: normalizedLabels,
    completedBoxes,
    remainingBoxes,
    remainingPieces:
      remainingBoxes * normalizedPiecesPerBox,
    targetBoxes: normalizedTarget,
    piecesPerBox: normalizedPiecesPerBox,
    progressPercent: Math.round(
      (completedBoxes / normalizedTarget) * 100
    ),
    currentRate,
    sampleSize: rateResult.sample.length,
    sampleElapsedHours: rateResult.elapsedHours,
    reliability: forecastReliability(
      rateResult.sample.length,
      rateResult.elapsedHours
    ),
    estimatedHoursRemaining:
      estimatedHoursRemaining === null
        ? null
        : round(estimatedHoursRemaining, 1),
    estimatedCompletionAt: estimatedCompletionTimestamp
      ? new Date(estimatedCompletionTimestamp).toISOString()
      : null,
    marginHours,
    risk,
    ...deadlineMetrics,
    inactivity,
    lastBoxAt: lastTimestamp
      ? new Date(lastTimestamp).toISOString()
      : null,
    hourly: buildHourlySeries(normalizedLabels, nowMs),
    nextTruck: buildNextTruckForecast({
      nextPlannedTruck,
      currentEstimatedCompletionTimestamp:
        estimatedCompletionTimestamp,
      currentRate,
      sampleLength: rateResult.sample.length,
      targetBoxes: normalizedTarget,
      nowMs,
    }),
  };
}

export async function fetchForecastTruckLabels(
  supabase,
  truckId
) {
  if (!supabase || !truckId) return [];

  const { data, error } = await supabase
    .from("f1012_box_labels")
    .select("id, camion_id, numero_caja, created_at")
    .eq("camion_id", truckId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) throw error;

  return data || [];
}
