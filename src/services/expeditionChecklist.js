function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function getDocumentType(document) {
  return String(
    document?.document_type ||
    document?.documentType ||
    ""
  ).trim().toUpperCase();
}

function hasDocumentType(documents, documentType) {
  const expectedType = String(documentType || "").toUpperCase();

  return (documents || []).some(
    (document) => getDocumentType(document) === expectedType
  );
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateDifferenceInDays(firstDate, secondDate) {
  const [firstYear, firstMonth, firstDay] = firstDate
    .split("-")
    .map(Number);
  const [secondYear, secondMonth, secondDay] = secondDate
    .split("-")
    .map(Number);
  const firstUtc = Date.UTC(
    firstYear,
    firstMonth - 1,
    firstDay
  );
  const secondUtc = Date.UTC(
    secondYear,
    secondMonth - 1,
    secondDay
  );

  return Math.round(
    (firstUtc - secondUtc) / 86400000
  );
}

export function getExpeditionDateAlert({
  plannedExpeditionDate,
  shipmentStatus,
  today = localIsoDate(),
}) {
  const plannedDate = String(
    plannedExpeditionDate || ""
  ).slice(0, 10);

  if (
    !plannedDate ||
    shipmentStatus === "SHIPPED"
  ) {
    return null;
  }

  const daysUntil = dateDifferenceInDays(
    plannedDate,
    today
  );

  if (daysUntil < 0) {
    const overdueDays = Math.abs(daysUntil);

    return {
      level: "danger",
      label: "Expedición vencida",
      message:
        overdueDays === 1
          ? "La fecha prevista venció ayer."
          : `La fecha prevista venció hace ${overdueDays} días.`,
    };
  }

  if (daysUntil === 0) {
    return {
      level: "warning",
      label: "Expedición prevista hoy",
      message: "Revisa el checklist antes de confirmar la salida.",
    };
  }

  if (daysUntil === 1) {
    return {
      level: "warning",
      label: "Expedición prevista mañana",
      message: "Comprueba que los datos y el albarán estén preparados.",
    };
  }

  if (daysUntil <= 3) {
    return {
      level: "info",
      label: "Expedición próxima",
      message: `Quedan ${daysUntil} días para la fecha prevista.`,
    };
  }

  return null;
}

export function buildExpeditionChecklist({
  truck,
  draft,
  documents = [],
  requireProductionClosed = true,
  jointProgress = null,
  today,
}) {
  const source = draft || {};
  const shipmentStatus =
    source.shipmentStatus ||
    truck?.shipment_status ||
    "PENDING";
  const productionStatus =
    source.status ||
    truck?.status ||
    "";
  const isShipped = shipmentStatus === "SHIPPED";

  const requiredItems = [
    {
      key: "actual-date",
      label: "Día de expedición",
      complete: hasValue(
        source.actualExpeditionDate ||
        truck?.actual_expedition_date
      ),
    },
    {
      key: "tractor-plate",
      label: "Matrícula tractora",
      complete: hasValue(
        source.tractorPlate ||
        truck?.tractor_plate ||
        truck?.vehicle_plate
      ),
    },
    {
      key: "trailer-plate",
      label: "Matrícula remolque",
      complete: hasValue(
        source.trailerPlate ||
        truck?.trailer_plate
      ),
    },
    {
      key: "seal-number",
      label: "Brida / precinto",
      complete: hasValue(
        source.sealNumber ||
        truck?.seal_number
      ),
    },
  ];

  if (jointProgress) {
    requiredItems.unshift({
      key: "f1013-complete",
      label: "F1013 · 49 cajas",
      complete: Boolean(jointProgress.readyF1013),
    });
    requiredItems.unshift({
      key: "f1012-complete",
      label: "F1012 · 49 cajas",
      complete: Boolean(jointProgress.readyF1012),
    });
  } else if (requireProductionClosed) {
    requiredItems.unshift({
      key: "production-closed",
      label: "Carga de producción completa",
      complete: productionStatus === "CLOSED",
    });
  }

  const optionalItems = [
    {
      key: "delivery-note-document",
      label: "Albarán",
      complete: hasDocumentType(documents, "DELIVERY_NOTE"),
      optional: true,
    },
    {
      key: "cmr-document",
      label: "CMR",
      complete: hasDocumentType(documents, "CMR"),
      optional: true,
    },
    {
      key: "loading-photo",
      label: "Fotografías de carga",
      complete: hasDocumentType(documents, "PHOTO"),
      optional: true,
    },
    {
      key: "other-document",
      label: "Otros archivos",
      complete: hasDocumentType(documents, "OTHER"),
      optional: true,
    },
  ];
  const completedRequired = requiredItems.filter(
    (item) => item.complete
  ).length;
  const missingItems = requiredItems.filter(
    (item) => !item.complete
  );
  const isReady =
    requiredItems.length > 0 &&
    missingItems.length === 0;
  const status = isShipped
    ? "SHIPPED"
    : isReady
      ? "READY"
      : "INCOMPLETE";
  const percent = requiredItems.length
    ? Math.round(
        (completedRequired / requiredItems.length) * 100
      )
    : 0;
  const dateAlert = getExpeditionDateAlert({
    plannedExpeditionDate:
      source.plannedExpeditionDate ||
      truck?.planned_expedition_date,
    shipmentStatus,
    today,
  });

  return {
    requiredItems,
    optionalItems,
    missingItems,
    completedRequired,
    totalRequired: requiredItems.length,
    percent,
    isReady,
    isShipped,
    status,
    statusLabel:
      status === "SHIPPED"
        ? "Expedido"
        : status === "READY"
          ? "Preparado"
          : "Incompleto",
    dateAlert,
  };
}
