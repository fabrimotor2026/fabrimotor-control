const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDateParts(value) {
  const [year, month, day] = String(value || "")
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    timestamp,
    iso: [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-"),
  };
}

export function calculateExpeditionDeviationDays(
  plannedDate,
  actualDate
) {
  const planned = parseDateParts(plannedDate);
  const actual = parseDateParts(actualDate);

  if (!planned || !actual) return null;

  return Math.round(
    (actual.timestamp - planned.timestamp) /
      DAY_IN_MILLISECONDS
  );
}

function punctualityFromDeviation(deviationDays) {
  if (deviationDays < 0) return "EARLY";
  if (deviationDays > 0) return "DELAYED";
  return "ON_TIME";
}

function isCompletedActualExpedition(entry) {
  return (
    entry?.archive_kind === "ACTUAL" &&
    (entry?.archive_status === "CLOSED" ||
      entry?.archive_status === "SHIPPED")
  );
}

function normalizeFilterText(value) {
  return String(value || "").trim();
}

function entryMatchesFilters(entry, filters) {
  const actualDate = String(
    entry?.actual_expedition_date || ""
  ).slice(0, 10);
  const customer = normalizeFilterText(filters?.customer);
  const carrier = normalizeFilterText(filters?.carrier);
  const destination = normalizeFilterText(filters?.destination);

  if (
    filters?.from &&
    (!actualDate || actualDate < filters.from)
  ) {
    return false;
  }

  if (
    filters?.to &&
    (!actualDate || actualDate > filters.to)
  ) {
    return false;
  }

  if (
    customer &&
    customer !== "ALL" &&
    normalizeFilterText(entry?.customer_name) !== customer
  ) {
    return false;
  }

  if (
    carrier &&
    carrier !== "ALL" &&
    normalizeFilterText(entry?.carrier_name) !== carrier
  ) {
    return false;
  }

  if (
    destination &&
    destination !== "ALL" &&
    normalizeFilterText(entry?.destination) !== destination
  ) {
    return false;
  }

  return true;
}

function roundToOneDecimal(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / total) * 100);
}

function buildGroupSummary(entries, keyGetter) {
  const groups = new Map();

  entries.forEach((entry) => {
    const key =
      normalizeFilterText(keyGetter(entry)) || "Sin indicar";
    const current = groups.get(key) || {
      name: key,
      total: 0,
      onSchedule: 0,
      punctual: 0,
      early: 0,
      delayed: 0,
      totalDelayDays: 0,
      maxDelayDays: 0,
    };

    current.total += 1;

    if (entry.punctuality === "DELAYED") {
      current.delayed += 1;
      current.totalDelayDays += entry.deviation_days;
      current.maxDelayDays = Math.max(
        current.maxDelayDays,
        entry.deviation_days
      );
    } else {
      current.onSchedule += 1;

      if (entry.punctuality === "EARLY") {
        current.early += 1;
      } else {
        current.punctual += 1;
      }
    }

    groups.set(key, current);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      compliancePercent: percentage(
        group.onSchedule,
        group.total
      ),
      averageDelayDays: group.delayed
        ? roundToOneDecimal(
            group.totalDelayDays / group.delayed
          )
        : 0,
    }))
    .sort(
      (first, second) =>
        second.total - first.total ||
        second.compliancePercent -
          first.compliancePercent ||
        first.name.localeCompare(second.name, "es")
    );
}

function monthLabel(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);

  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
}

function buildMonthlySummary(entries) {
  const groups = new Map();

  entries.forEach((entry) => {
    const monthKey = String(
      entry.actual_expedition_date || ""
    ).slice(0, 7);

    if (!monthKey) return;

    const current = groups.get(monthKey) || {
      key: monthKey,
      label: monthLabel(monthKey),
      total: 0,
      onSchedule: 0,
      punctual: 0,
      early: 0,
      delayed: 0,
      totalDelayDays: 0,
    };

    current.total += 1;

    if (entry.punctuality === "DELAYED") {
      current.delayed += 1;
      current.totalDelayDays += entry.deviation_days;
    } else {
      current.onSchedule += 1;

      if (entry.punctuality === "EARLY") {
        current.early += 1;
      } else {
        current.punctual += 1;
      }
    }

    groups.set(monthKey, current);
  });

  return [...groups.values()]
    .sort((first, second) =>
      first.key.localeCompare(second.key)
    )
    .map((month) => ({
      ...month,
      compliancePercent: percentage(
        month.onSchedule,
        month.total
      ),
      averageDelayDays: month.delayed
        ? roundToOneDecimal(
            month.totalDelayDays / month.delayed
          )
        : 0,
    }));
}

export function buildExpeditionPerformance(
  archiveEntries = [],
  filters = {}
) {
  const completedEntries = archiveEntries.filter(
    isCompletedActualExpedition
  );
  const scopedCompletedEntries = completedEntries.filter(
    (entry) => entryMatchesFilters(entry, filters)
  );
  const evaluatedEntries = scopedCompletedEntries
    .map((entry) => {
      const deviationDays =
        calculateExpeditionDeviationDays(
          entry.planned_expedition_date,
          entry.actual_expedition_date
        );

      if (deviationDays === null) return null;

      return {
        ...entry,
        deviation_days: deviationDays,
        punctuality:
          punctualityFromDeviation(deviationDays),
      };
    })
    .filter(Boolean);
  const punctual = evaluatedEntries.filter(
    (entry) => entry.punctuality === "ON_TIME"
  );
  const early = evaluatedEntries.filter(
    (entry) => entry.punctuality === "EARLY"
  );
  const delayed = evaluatedEntries
    .filter((entry) => entry.punctuality === "DELAYED")
    .sort(
      (first, second) =>
        second.deviation_days - first.deviation_days ||
        String(second.actual_expedition_date).localeCompare(
          String(first.actual_expedition_date)
        )
    );
  const onSchedule = punctual.length + early.length;
  const totalDelayDays = delayed.reduce(
    (total, entry) => total + entry.deviation_days,
    0
  );
  const totalDeviationDays = evaluatedEntries.reduce(
    (total, entry) => total + entry.deviation_days,
    0
  );

  return {
    entries: evaluatedEntries,
    delayedEntries: delayed,
    summary: {
      completed: scopedCompletedEntries.length,
      evaluated: evaluatedEntries.length,
      unevaluated:
        scopedCompletedEntries.length -
        evaluatedEntries.length,
      onSchedule,
      punctual: punctual.length,
      early: early.length,
      delayed: delayed.length,
      compliancePercent: percentage(
        onSchedule,
        evaluatedEntries.length
      ),
      averageDelayDays: delayed.length
        ? roundToOneDecimal(
            totalDelayDays / delayed.length
          )
        : 0,
      maximumDelayDays: delayed.length
        ? Math.max(
            ...delayed.map((entry) => entry.deviation_days)
          )
        : 0,
      averageDeviationDays: evaluatedEntries.length
        ? roundToOneDecimal(
            totalDeviationDays / evaluatedEntries.length
          )
        : 0,
    },
    monthly: buildMonthlySummary(evaluatedEntries),
    byCarrier: buildGroupSummary(
      evaluatedEntries,
      (entry) => entry.carrier_name
    ),
    byCustomer: buildGroupSummary(
      evaluatedEntries,
      (entry) => entry.customer_name
    ),
    byDestination: buildGroupSummary(
      evaluatedEntries,
      (entry) => entry.destination
    ),
  };
}

export function buildPerformanceFilterOptions(
  archiveEntries = []
) {
  const uniqueSortedValues = (field) =>
    [
      ...new Set(
        archiveEntries
          .filter(isCompletedActualExpedition)
          .map((entry) =>
            normalizeFilterText(entry?.[field])
          )
          .filter(Boolean)
      ),
    ].sort((first, second) =>
      first.localeCompare(second, "es")
    );

  return {
    customers: uniqueSortedValues("customer_name"),
    carriers: uniqueSortedValues("carrier_name"),
    destinations: uniqueSortedValues("destination"),
  };
}
