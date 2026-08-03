export const QUALITY_DAILY_CONTROL_TABLE =
  "fmcontrol_quality_daily_controls";

export const QUALITY_DAILY_REFERENCES = Object.freeze([
  "F-1013",
  "F-1012",
]);

export const QUALITY_DAILY_MACHINE = "Torno Hyundai";

export const QUALITY_DAILY_CONTROL_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "c120",
    number: "Nº120",
    label: "Rugosidad Rz 1,2",
    unit: "µm",
    minimum: 0,
    maximum: 1.2,
    decimals: 2,
  }),
  Object.freeze({
    id: "c280",
    number: "Nº280",
    label: "Rugosidad Rz 6,3",
    unit: "µm",
    minimum: 0,
    maximum: 6.3,
    decimals: 2,
  }),
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeQualityReference(value) {
  const normalized = normalizeText(value || "F-1012")
    .toUpperCase()
    .replace(/^F(\d)/, "F-$1");

  if (!QUALITY_DAILY_REFERENCES.includes(normalized)) {
    throw new Error(
      "Los controles diarios de Calidad solo admiten F-1012 y F-1013."
    );
  }

  return normalized;
}

export function getQualityDailyControlDefinition(controlId) {
  return (
    QUALITY_DAILY_CONTROL_DEFINITIONS.find(
      (definition) => definition.id === controlId
    ) || null
  );
}

export function calculateQualityDailyResult(controlId, rawValue) {
  const definition = getQualityDailyControlDefinition(controlId);

  if (!definition) {
    throw new Error("El control diario de Calidad no es válido.");
  }

  if (
    rawValue === "" ||
    rawValue === null ||
    rawValue === undefined
  ) {
    return {
      valid: false,
      value: null,
      result: "PENDING",
      message: "Introduce una lectura.",
    };
  }

  const value = Number(
    String(rawValue).trim().replace(",", ".")
  );

  if (!Number.isFinite(value) || value < definition.minimum) {
    return {
      valid: false,
      value: null,
      result: "PENDING",
      message: "Introduce una lectura numérica igual o superior a cero.",
    };
  }

  return {
    valid: true,
    value,
    result:
      value >= definition.minimum && value <= definition.maximum
        ? "OK"
        : "NO OK",
    message: "",
  };
}

function isMissingQualityDailySchema(error) {
  const detail = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    detail.includes(QUALITY_DAILY_CONTROL_TABLE)
  );
}

function throwQualityDailyError(error) {
  if (!error) return;

  if (isMissingQualityDailySchema(error)) {
    throw new Error(
      "Falta instalar la V2.43 en Supabase. Ejecuta " +
        "FMCONTROL_V2_43_CONTROLES_DIARIOS_CALIDAD.sql."
    );
  }

  throw error;
}

export function mapQualityDailyControlRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    reference: normalizeQualityReference(row.reference),
    machine: row.machine || QUALITY_DAILY_MACHINE,
    controlId: row.control_id,
    measurementDate: row.measurement_date,
    value: Number(row.value),
    result: row.result,
    notes: row.notes || "",
    recordedBy: row.recorded_by || "",
    recordedByName: row.recorded_by_name || "",
    recordedAt: row.recorded_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export async function fetchQualityDailyControls(
  supabase,
  {
    reference,
    machine = QUALITY_DAILY_MACHINE,
    measurementDate,
  }
) {
  const normalizedReference =
    normalizeQualityReference(reference);

  let query = supabase
    .from(QUALITY_DAILY_CONTROL_TABLE)
    .select(
      "id, reference, machine, control_id, measurement_date, value, result, notes, recorded_by, recorded_by_name, recorded_at, created_at, updated_at"
    )
    .eq("reference", normalizedReference)
    .eq("machine", machine)
    .order("control_id", { ascending: true });

  if (measurementDate) {
    query = query.eq("measurement_date", measurementDate);
  }

  const { data, error } = await query;
  throwQualityDailyError(error);

  return (data || []).map(mapQualityDailyControlRow);
}

export async function fetchLatestQualityDailyControls(
  supabase,
  {
    reference,
    machine = QUALITY_DAILY_MACHINE,
  }
) {
  const normalizedReference =
    normalizeQualityReference(reference);
  const { data, error } = await supabase
    .from(QUALITY_DAILY_CONTROL_TABLE)
    .select(
      "id, reference, machine, control_id, measurement_date, value, result, notes, recorded_by, recorded_by_name, recorded_at, created_at, updated_at"
    )
    .eq("reference", normalizedReference)
    .eq("machine", machine)
    .order("measurement_date", { ascending: false })
    .order("recorded_at", { ascending: false })
    .limit(40);

  throwQualityDailyError(error);

  const latestByControl = new Map();

  for (const row of data || []) {
    if (!latestByControl.has(row.control_id)) {
      latestByControl.set(
        row.control_id,
        mapQualityDailyControlRow(row)
      );
    }
  }

  return Object.fromEntries(latestByControl);
}

export async function saveQualityDailyControl(
  supabase,
  {
    reference,
    machine = QUALITY_DAILY_MACHINE,
    controlId,
    measurementDate,
    value,
    notes = "",
    currentUser,
  }
) {
  const normalizedReference =
    normalizeQualityReference(reference);
  const validation = calculateQualityDailyResult(
    controlId,
    value
  );

  if (!measurementDate) {
    throw new Error("Selecciona la fecha del control.");
  }

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const username = normalizeText(currentUser?.username);
  const userName = normalizeText(currentUser?.name);

  if (!username && !userName) {
    throw new Error(
      "No se ha podido identificar al responsable del control."
    );
  }

  const recordedAt = new Date().toISOString();
  const payload = {
    reference: normalizedReference,
    machine,
    control_id: controlId,
    measurement_date: measurementDate,
    value: validation.value,
    result: validation.result,
    notes: normalizeText(notes),
    recorded_by: username || userName,
    recorded_by_name: userName || username,
    recorded_at: recordedAt,
    updated_at: recordedAt,
  };

  const { data, error } = await supabase
    .from(QUALITY_DAILY_CONTROL_TABLE)
    .upsert(payload, {
      onConflict:
        "reference,machine,control_id,measurement_date",
    })
    .select(
      "id, reference, machine, control_id, measurement_date, value, result, notes, recorded_by, recorded_by_name, recorded_at, created_at, updated_at"
    )
    .single();

  throwQualityDailyError(error);
  return mapQualityDailyControlRow(data);
}

