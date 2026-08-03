export const JOINT_SHIPMENT_REFERENCES = ["F-1012", "F-1013"];
export const JOINT_BOX_TARGET_PER_REFERENCE = 49;
export const JOINT_BOX_TARGET_TOTAL =
  JOINT_BOX_TARGET_PER_REFERENCE * JOINT_SHIPMENT_REFERENCES.length;
export const JOINT_DOCUMENT_REFERENCE = "F1012+F1013";

function normalizeReference(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^F(\d)/, "F-$1");
}

function normalizeTruckNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function jointSchemaError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST205" ||
    message.includes("fmcontrol_joint_shipments") ||
    message.includes("fmcontrol_get_or_create_joint_truck") ||
    message.includes("fmcontrol_joint_shipment_progress")
  );
}

function throwJointQueryError(error) {
  if (!error) return;

  if (jointSchemaError(error)) {
    throw new Error(
      "Falta instalar la V2.38 en Supabase. Ejecuta FMCONTROL_V2_38_EXPEDICION_CONJUNTA.sql."
    );
  }

  throw error;
}

export function isJointShipmentReference(value) {
  return JOINT_SHIPMENT_REFERENCES.includes(
    normalizeReference(value)
  );
}

export function buildJointShipmentProgress(row = {}) {
  const f1012 = Math.max(
    0,
    Number(row.boxes_f1012 || row.f1012 || 0)
  );
  const f1013 = Math.max(
    0,
    Number(row.boxes_f1013 || row.f1013 || 0)
  );
  const targetF1012 = Number(
    row.target_f1012 || JOINT_BOX_TARGET_PER_REFERENCE
  );
  const targetF1013 = Number(
    row.target_f1013 || JOINT_BOX_TARGET_PER_REFERENCE
  );
  const total = f1012 + f1013;
  const targetTotal = targetF1012 + targetF1013;
  const readyF1012 = f1012 >= targetF1012;
  const readyF1013 = f1013 >= targetF1013;
  const ready = readyF1012 && readyF1013;

  return {
    shipmentId: row.shipment_id || row.id || null,
    truckNumber: normalizeTruckNumber(row.truck_number),
    status: String(row.status || (ready ? "READY" : "OPEN")),
    f1012,
    f1013,
    targetF1012,
    targetF1013,
    total,
    targetTotal,
    pendingF1012: Math.max(0, targetF1012 - f1012),
    pendingF1013: Math.max(0, targetF1013 - f1013),
    pendingTotal: Math.max(0, targetTotal - total),
    percentF1012: targetF1012
      ? Math.min(100, Math.round((f1012 / targetF1012) * 100))
      : 0,
    percentF1013: targetF1013
      ? Math.min(100, Math.round((f1013 / targetF1013) * 100))
      : 0,
    percentTotal: targetTotal
      ? Math.min(100, Math.round((total / targetTotal) * 100))
      : 0,
    readyF1012,
    readyF1013,
    ready,
    actualExpeditionDate: row.actual_expedition_date || "",
    tractorPlate: row.tractor_plate || "",
    trailerPlate: row.trailer_plate || "",
    sealNumber: row.seal_number || "",
  };
}

export async function getActiveJointTruck(
  supabase,
  reference,
  actor = ""
) {
  const normalizedReference = normalizeReference(reference);

  if (!isJointShipmentReference(normalizedReference)) {
    throw new Error(
      "La expedición conjunta solo admite F-1012 y F-1013."
    );
  }

  const { data, error } = await supabase.rpc(
    "fmcontrol_get_or_create_joint_truck",
    {
      p_reference: normalizedReference,
      p_actor: String(actor || "").trim(),
    }
  );

  throwJointQueryError(error);

  const truck = firstRow(data);

  if (!truck?.id) {
    throw new Error(
      `No se ha podido abrir el camión conjunto para ${normalizedReference}.`
    );
  }

  return truck;
}

export async function fetchJointShipmentProgress(
  supabase,
  {
    shipmentId = null,
    truckNumber = null,
  } = {}
) {
  let query = supabase
    .from("fmcontrol_joint_shipment_progress")
    .select("*");

  if (shipmentId) {
    query = query.eq("shipment_id", shipmentId);
  } else {
    const normalizedTruckNumber = normalizeTruckNumber(truckNumber);

    if (!normalizedTruckNumber) return null;

    query = query.eq("truck_number", normalizedTruckNumber);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  throwJointQueryError(error);

  return data ? buildJointShipmentProgress(data) : null;
}

export async function fetchJointShipmentBoxes(
  supabase,
  shipmentId
) {
  if (!shipmentId) return [];

  const { data, error } = await supabase
    .from("f1012_box_labels")
    .select("*")
    .eq("joint_shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  throwJointQueryError(error);

  return data || [];
}

export async function saveJointShipmentDetails(
  supabase,
  shipmentId,
  {
    plannedExpeditionDate = null,
    actualExpeditionDate = null,
    tractorPlate = "",
    trailerPlate = "",
    sealNumber = "",
    notes = "",
    updatedBy = "",
  } = {}
) {
  if (!shipmentId) {
    throw new Error("No se ha podido identificar la expedición conjunta.");
  }

  const payload = {
    planned_expedition_date: plannedExpeditionDate || null,
    actual_expedition_date: actualExpeditionDate || null,
    tractor_plate: String(tractorPlate || "").trim().toUpperCase(),
    trailer_plate: String(trailerPlate || "").trim().toUpperCase(),
    seal_number: String(sealNumber || "").trim(),
    notes: String(notes || "").trim(),
    updated_by: String(updatedBy || "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("fmcontrol_joint_shipments")
    .update(payload)
    .eq("id", shipmentId)
    .select("id")
    .single();

  throwJointQueryError(error);

  const truckPayload = {
    planned_expedition_date: payload.planned_expedition_date,
    actual_expedition_date: payload.actual_expedition_date,
    tractor_plate: payload.tractor_plate,
    trailer_plate: payload.trailer_plate,
    vehicle_plate: payload.tractor_plate,
    seal_number: payload.seal_number,
    notes: payload.notes,
    updated_at: payload.updated_at,
  };

  const { error: truckError } = await supabase
    .from("f1012_trucks")
    .update(truckPayload)
    .eq("joint_shipment_id", shipmentId);

  if (truckError) throw truckError;

  const { error: refreshError } = await supabase.rpc(
    "fmcontrol_refresh_joint_shipment",
    { p_shipment_id: shipmentId }
  );

  throwJointQueryError(refreshError);

  const { data: refreshed, error: refreshedError } = await supabase
    .from("fmcontrol_joint_shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  throwJointQueryError(refreshedError);

  return refreshed;
}

export function getJointDocumentReference(truck) {
  return truck?.joint_shipment_id
    ? JOINT_DOCUMENT_REFERENCE
    : normalizeReference(truck?.reference || "F-1012");
}
