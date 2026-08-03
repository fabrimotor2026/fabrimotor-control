const SEVERITY_PRIORITY = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

const CATEGORY_PRIORITY = {
  DELAY: 0,
  SHIPMENT: 1,
  INACTIVITY: 2,
  DATE: 3,
  CHECKLIST: 4,
  FORECAST: 5,
};

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "sin fecha prevista";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : String(value);
}

function formatDateTime(value) {
  if (!value) return "sin estimación";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatHours(value) {
  const numericValue = Math.max(0, Number(value || 0));
  const totalMinutes = Math.round(numericValue * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours} h ${minutes} min`;
  if (hours) return `${hours} h`;
  return `${minutes} min`;
}

function severityForDateAlert(dateAlert) {
  if (dateAlert?.level === "danger") return "CRITICAL";
  if (dateAlert?.level === "warning") return "WARNING";
  return "INFO";
}

function entryActionType(entry) {
  return entry?.kind === "planned" ? "PLANNED" : "ACTIVE";
}

function missingItemsMessage(missingItems) {
  const labels = (missingItems || []).map((item) => item.label);
  const visible = labels.slice(0, 4);
  const hidden = labels.length - visible.length;

  if (!visible.length) return "";

  return `Falta completar: ${visible.join(", ")}${
    hidden > 0 ? ` y ${hidden} requisito${hidden === 1 ? "" : "s"} más` : ""
  }.`;
}

function checklistSeverity(entry) {
  const dateLevel = entry?.checklist?.dateAlert?.level;

  if (dateLevel === "danger" || dateLevel === "warning") {
    return "CRITICAL";
  }

  const missingKeys = new Set(
    (entry?.checklist?.missingItems || []).map((item) => item.key)
  );

  if (missingKeys.has("planned-date")) return "WARNING";
  return "INFO";
}

function addAlert(alerts, alert) {
  if (!alert?.id || alerts.some((item) => item.id === alert.id)) {
    return;
  }

  alerts.push({
    ...alert,
    severity: alert.severity || "INFO",
    dueDate:
      alert.dueDate ||
      alert.truck?.planned_expedition_date ||
      "",
  });
}

function buildForecastAlerts(alerts, forecast) {
  if (!forecast?.hasActiveTruck || !forecast?.truck) return;

  const truck = forecast.truck;
  const truckNumber = truck.truck_number || "activo";
  const base = {
    truck,
    actionType: "FORECAST",
    actionLabel: "Abrir previsión",
    dueDate: truck.planned_expedition_date || "",
  };

  if (forecast.risk === "DELAYED") {
    addAlert(alerts, {
      ...base,
      id: `forecast-delay-${truck.id}`,
      severity: "CRITICAL",
      category: "DELAY",
      title: `Retraso previsto · Camión ${truckNumber}`,
      message: `La carga terminaría el ${formatDateTime(
        forecast.estimatedCompletionAt
      )}, después de la expedición prevista del ${formatDate(
        truck.planned_expedition_date
      )}.`,
    });
  } else if (
    forecast.risk === "AT_RISK" &&
    forecast.inactivity?.status !== "STOPPED" &&
    forecast.inactivity?.status !== "WARNING"
  ) {
    addAlert(alerts, {
      ...base,
      id: `forecast-risk-${truck.id}`,
      severity: "WARNING",
      category: "FORECAST",
      title: `Carga en riesgo · Camión ${truckNumber}`,
      message: `Quedan ${forecast.remainingBoxes} cajas. El ritmo actual es ${
        forecast.currentRate ?? "-"
      } cajas/h y el mínimo necesario es ${
        forecast.requiredRate ?? "-"
      } cajas/h.`,
    });
  } else if (
    forecast.risk === "INSUFFICIENT_DATA" &&
    forecast.completedBoxes > 0
  ) {
    addAlert(alerts, {
      ...base,
      id: `forecast-sample-${truck.id}`,
      severity: "INFO",
      category: "FORECAST",
      title: `Previsión pendiente · Camión ${truckNumber}`,
      message: `Solo hay ${forecast.sampleSize} caja${
        forecast.sampleSize === 1 ? "" : "s"
      } con hora válida. Se necesitan al menos 3 para estimar el final.`,
    });
  }

  if (
    forecast.remainingBoxes > 0 &&
    forecast.completedBoxes > 0 &&
    forecast.inactivity?.status === "STOPPED"
  ) {
    addAlert(alerts, {
      ...base,
      id: `inactivity-stopped-${truck.id}`,
      severity: "CRITICAL",
      category: "INACTIVITY",
      title: `Posible parada · Camión ${truckNumber}`,
      message: `Han transcurrido ${formatHours(
        forecast.inactivity.hours
      )} desde la última caja registrada.`,
    });
  } else if (
    forecast.remainingBoxes > 0 &&
    forecast.completedBoxes > 0 &&
    forecast.inactivity?.status === "WARNING"
  ) {
    addAlert(alerts, {
      ...base,
      id: `inactivity-warning-${truck.id}`,
      severity: "WARNING",
      category: "INACTIVITY",
      title: `Producción sin cajas · Camión ${truckNumber}`,
      message: `No se registra una caja nueva desde hace ${formatHours(
        forecast.inactivity.hours
      )}.`,
    });
  }
}

function buildEntryAlerts(alerts, entry) {
  if (
    !entry?.truck ||
    !entry?.checklist ||
    entry.checklist.status === "SHIPPED"
  ) {
    return;
  }

  const truck = entry.truck;
  const truckNumber = truck.truck_number || "-";
  const actionType = entryActionType(entry);
  const actionLabel =
    actionType === "PLANNED"
      ? "Abrir planificación"
      : "Revisar camión";
  const base = {
    truck,
    actionType,
    actionLabel,
    dueDate: truck.planned_expedition_date || "",
  };
  const dateAlert = entry.checklist.dateAlert;

  if (dateAlert) {
    addAlert(alerts, {
      ...base,
      id: `date-${entry.kind}-${truck.id || truckNumber}`,
      severity: severityForDateAlert(dateAlert),
      category: "DATE",
      title: `${dateAlert.label} · Camión ${truckNumber}`,
      message: dateAlert.message,
    });
  }

  if (entry.checklist.status === "INCOMPLETE") {
    addAlert(alerts, {
      ...base,
      id: `checklist-${entry.kind}-${truck.id || truckNumber}`,
      severity: checklistSeverity(entry),
      category: "CHECKLIST",
      title: `Checklist incompleto · Camión ${truckNumber}`,
      message: missingItemsMessage(
        entry.checklist.missingItems
      ),
    });
  }
}

function buildClosedTruckAlert(alerts, currentTruck, today) {
  if (
    !currentTruck?.id ||
    currentTruck.status !== "CLOSED" ||
    currentTruck.shipment_status === "SHIPPED"
  ) {
    return;
  }

  const plannedDate = String(
    currentTruck.planned_expedition_date || ""
  ).slice(0, 10);
  const isDue = plannedDate && plannedDate <= today;

  addAlert(alerts, {
    id: `closed-not-shipped-${currentTruck.id}`,
    severity: isDue ? "CRITICAL" : "WARNING",
    category: "SHIPMENT",
    title: `Camión ${currentTruck.truck_number} cerrado sin expedir`,
    message:
      "La producción está cerrada, pero todavía no se ha confirmado la salida real del camión.",
    truck: currentTruck,
    actionType: "ACTIVE",
    actionLabel: "Confirmar expedición",
    dueDate: plannedDate,
  });
}

export function summarizeExpeditionAlerts(alerts = []) {
  return alerts.reduce(
    (summary, alert) => {
      summary.total += 1;

      if (alert.severity === "CRITICAL") {
        summary.critical += 1;
      } else if (alert.severity === "WARNING") {
        summary.warning += 1;
      } else {
        summary.info += 1;
      }

      return summary;
    },
    {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
    }
  );
}

export function buildExpeditionAlerts({
  activeEntry,
  plannedEntries = [],
  currentTruck,
  forecast,
  today = localIsoDate(),
}) {
  const alerts = [];

  buildForecastAlerts(alerts, forecast);
  buildEntryAlerts(alerts, activeEntry);
  (plannedEntries || []).forEach((entry) =>
    buildEntryAlerts(alerts, entry)
  );
  buildClosedTruckAlert(alerts, currentTruck, today);

  alerts.sort((first, second) => {
    const firstSeverity =
      SEVERITY_PRIORITY[first.severity] ??
      SEVERITY_PRIORITY.INFO;
    const secondSeverity =
      SEVERITY_PRIORITY[second.severity] ??
      SEVERITY_PRIORITY.INFO;
    const firstDate = first.dueDate || "9999-12-31";
    const secondDate = second.dueDate || "9999-12-31";
    const firstCategory =
      CATEGORY_PRIORITY[first.category] ?? 99;
    const secondCategory =
      CATEGORY_PRIORITY[second.category] ?? 99;

    return (
      firstSeverity - secondSeverity ||
      firstDate.localeCompare(secondDate) ||
      firstCategory - secondCategory ||
      Number(first.truck?.truck_number || 0) -
        Number(second.truck?.truck_number || 0)
    );
  });

  return {
    alerts,
    summary: summarizeExpeditionAlerts(alerts),
  };
}
