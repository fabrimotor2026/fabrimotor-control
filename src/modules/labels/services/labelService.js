import {
  fetchBoxLabels,
  saveBoxLabel,
} from "../../../services/boxLabelService";
import {
  normalizeLabelReference,
  reserveReferenceBoxNumber,
} from "../../../services/referenceBoxCounterService";

import { printLabelDocument } from "../utils/labelPrinter";

function validateFourDigitOperator(
  operator,
  operatorName,
  required
) {
  const value = String(operator || "").trim();

  if (!value && !required) {
    return;
  }

  if (!/^\d{4}$/.test(value)) {
    throw new Error(
      `${operatorName} debe tener exactamente 4 cifras.`
    );
  }
}

function validateLabel({
  labelForm,
  totalCaja,
  piecesPerBox,
}) {
  const numericTotal = Number(totalCaja);
  const numericPiecesPerBox = Number(piecesPerBox);

  if (numericTotal !== numericPiecesPerBox) {
    throw new Error(
      `La suma de piezas debe ser exactamente ${numericPiecesPerBox}.`
    );
  }

  validateFourDigitOperator(
    labelForm?.operario1,
    "El Operario 1",
    true
  );

  validateFourDigitOperator(
    labelForm?.operario2,
    "El Operario 2",
    false
  );
}

function getUpdatedBy(currentUser) {
  if (!currentUser) return "";

  return [
    currentUser.username,
    currentUser.name,
  ]
    .filter(Boolean)
    .join(" - ");
}

function getBoxNumber(row) {
  return String(
    row?.numero_caja ||
    row?.numeroCaja ||
    ""
  ).trim();
}

function getAssignedBoxNumber(
  completeBoxNumber,
  boxPrefix
) {
  const prefix = String(boxPrefix || "").trim();
  const complete = String(completeBoxNumber || "").trim();
  const expectedStart = prefix ? `${prefix}-` : "";

  if (
    expectedStart &&
    complete.toUpperCase().startsWith(expectedStart.toUpperCase())
  ) {
    return complete.slice(expectedStart.length);
  }

  return complete.split("-").pop() || complete;
}

function buildReprintLabelData(boxRows) {
  const rows = [...boxRows].sort((first, second) => {
    const firstCreated = first?.created_at || first?.createdAt || "";
    const secondCreated = second?.created_at || second?.createdAt || "";

    return String(firstCreated).localeCompare(String(secondCreated));
  });

  const first = rows[0] || {};
  const second = rows[1] || {};

  return {
    labelForm: {
      fab1: first.fabricacion || first.fab1 || "",
      col1: first.colada || first.col1 || "",
      cant1: first.cantidad ?? first.cant1 ?? "",
      fab2: second.fabricacion || second.fab2 || "",
      col2: second.colada || second.col2 || "",
      cant2: second.cantidad ?? second.cant2 ?? "",
      operario1: first.operario1 || "",
      operario2: first.operario2 || "",
    },
    totalCaja: rows.reduce(
      (total, row) =>
        total + Number(row?.cantidad ?? row?.cant1 ?? 0),
      0
    ),
    numeroSemana: first.semana || "",
    numeroDia: first.dia || "",
  };
}

function reprintDatabaseError(error) {
  if (
    error?.code === "42P01" ||
    String(error?.message || "").includes("f1012_label_reprints")
  ) {
    return new Error(
      "Falta crear el historial de reimpresiones en Supabase. " +
      "Ejecuta primero el archivo FMCONTROL_V2_21_REIMPRESION_ETIQUETAS.sql."
    );
  }

  return new Error(
    error?.message ||
    "No se ha podido registrar la reimpresión."
  );
}

export async function createAndPrintBoxLabel({
  supabase,
  appConfig,
  currentUser,
  labelForm,
  totalCaja,
  numeroSemana,
  numeroDia,
  resolveActiveTruck,
}) {
  const piecesPerBox = Number(
    appConfig?.piecesPerBox || 16
  );

  validateLabel({
    labelForm,
    totalCaja,
    piecesPerBox,
  });

  const updatedBy = getUpdatedBy(currentUser);
  const reference = normalizeLabelReference(
    appConfig?.reference
  );

  const truck = await resolveActiveTruck(
    reference,
    updatedBy
  );

  if (!truck) {
    throw new Error(
      "No existe ningún camión abierto."
    );
  }

  const reservation = await reserveReferenceBoxNumber(
    supabase,
    reference,
    updatedBy
  );
  const counter = reservation.number;

  const numeroCajaAsignado = String(counter).padStart(
    5,
    "0"
  );

  const boxPrefix =
    appConfig?.boxPrefix || "FB-26";

  const numeroCajaCompleto =
    `${boxPrefix}-${numeroCajaAsignado}`;

  const labelData = {
    reference,
    fab1: labelForm.fab1,
    col1: labelForm.col1,
    cant1: labelForm.cant1,

    fab2: labelForm.fab2,
    col2: labelForm.col2,
    cant2: labelForm.cant2,

    operario1: labelForm.operario1,
    operario2: labelForm.operario2,

    numeroCaja: numeroCajaCompleto,

    camionId: truck.id,
    truckNumber: truck.truck_number,

    plannedExpeditionDate:
      truck.planned_expedition_date,

    semana: numeroSemana,
    dia: numeroDia,
    totalCaja,
  };

  const warnings = [];
  let labels = [];

  try {
    await saveBoxLabel(
      supabase,
      labelData
    );

    labels = await fetchBoxLabels(
      supabase,
      truck.id
    );
  } catch (error) {
    console.error(
      "Error guardando etiqueta de caja:",
      error
    );

    warnings.push(
      "La etiqueta se ha generado, pero no se ha podido " +
        `guardar en el listado de cajas.\n\n${
          error?.message || String(error)
        }`
    );
  }

  const nextCounter = reservation.nextNumber;

  await printLabelDocument({
    appConfig,
    labelForm,
    totalCaja,
    numeroSemana,
    numeroDia,
    numeroCajaAsignado,
    numeroCajaCompleto,
  });

  return {
    truck,
    labels,
    labelData,
    numeroCajaCompleto,
    nextCounter,
    warnings,
  };
}

export async function fetchLabelReprints({
  supabase,
  numeroCaja,
  reference = "",
}) {
  const boxNumber = String(numeroCaja || "").trim();
  const normalizedReference = reference
    ? normalizeLabelReference(reference)
    : "";

  if (!boxNumber) return [];

  let query = supabase
    .from("f1012_label_reprints")
    .select("*")
    .eq("numero_caja", boxNumber)
    .order("created_at", { ascending: false });

  if (normalizedReference) {
    query = query.eq("reference", normalizedReference);
  }

  const { data, error } = await query;

  if (error) {
    throw reprintDatabaseError(error);
  }

  return Array.isArray(data) ? data : [];
}

export async function reprintExistingBoxLabel({
  supabase,
  appConfig,
  currentUser,
  boxRows,
  reason,
}) {
  const rows = Array.isArray(boxRows) ? boxRows.filter(Boolean) : [];
  const cleanReason = String(reason || "").trim();

  if (!rows.length) {
    throw new Error(
      "No se han encontrado los datos originales de la caja."
    );
  }

  if (!cleanReason) {
    throw new Error(
      "Indica el motivo de la reimpresión."
    );
  }

  const numeroCajaCompleto = getBoxNumber(rows[0]);

  if (!numeroCajaCompleto) {
    throw new Error(
      "La caja seleccionada no tiene un número válido."
    );
  }

  const boxPrefix = appConfig?.boxPrefix || "FB-26";
  const numeroCajaAsignado = getAssignedBoxNumber(
    numeroCajaCompleto,
    boxPrefix
  );
  const {
    labelForm,
    totalCaja,
    numeroSemana,
    numeroDia,
  } = buildReprintLabelData(rows);

  const auditPayload = {
    reference:
      rows[0]?.reference ||
      appConfig?.reference ||
      "F-1012",
    camion_id:
      rows[0]?.camion_id ||
      rows[0]?.camionId ||
      null,
    numero_caja: numeroCajaCompleto,
    reason: cleanReason,
    requested_by:
      currentUser?.username ||
      currentUser?.name ||
      "Sistema",
    requested_by_name:
      currentUser?.name || "",
    label_snapshot: rows,
  };

  const { data: auditRows, error: auditError } = await supabase
    .from("f1012_label_reprints")
    .insert(auditPayload)
    .select("*");

  if (auditError) {
    throw reprintDatabaseError(auditError);
  }

  await printLabelDocument({
    appConfig,
    labelForm,
    totalCaja,
    numeroSemana,
    numeroDia,
    numeroCajaAsignado,
    numeroCajaCompleto,
  });

  return {
    audit: auditRows?.[0] || auditPayload,
    numeroCajaCompleto,
  };
}
