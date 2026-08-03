export const LABEL_REFERENCES = ["F-1012", "F-1013"];

export function normalizeLabelReference(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^F(\d)/, "F-$1");

  if (!LABEL_REFERENCES.includes(normalized)) {
    throw new Error(
      "El contador de etiquetas solo admite las referencias F-1012 y F-1013."
    );
  }

  return normalized;
}

function firstValue(data) {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}

function counterSchemaError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST205" ||
    message.includes("fmcontrol_reference_box_counters") ||
    message.includes("fmcontrol_reserve_reference_box_number") ||
    message.includes("fmcontrol_set_reference_box_counter")
  );
}

function throwCounterError(error, operation = "consultar") {
  if (!error) return;

  if (counterSchemaError(error)) {
    throw new Error(
      operation === "modificar"
        ? "Falta instalar la V2.40.1 en Supabase. Ejecuta " +
            "FMCONTROL_V2_40_1_CONTADORES_CONFIGURACION.sql."
        : "Falta instalar la tabla de contadores independientes. Ejecuta " +
            "FMCONTROL_V2_38_1_CONTADORES_ETIQUETAS.sql."
    );
  }

  throw error;
}

export async function fetchReferenceBoxCounter(
  supabase,
  reference
) {
  const normalizedReference = normalizeLabelReference(reference);
  const { data, error } = await supabase
    .from("fmcontrol_reference_box_counters")
    .select("reference, next_value, updated_by, updated_at")
    .eq("reference", normalizedReference)
    .maybeSingle();

  throwCounterError(error);

  if (!data) {
    throw new Error(
      `No existe el contador de ${normalizedReference}.`
    );
  }

  return {
    reference: normalizedReference,
    nextNumber: Number(data.next_value),
    updatedBy: data.updated_by || "",
    updatedAt: data.updated_at || "",
  };
}

export async function setReferenceBoxCounter(
  supabase,
  reference,
  nextNumber,
  updatedBy = ""
) {
  const normalizedReference = normalizeLabelReference(reference);
  const numericNextNumber = Number(nextNumber);

  if (
    !Number.isInteger(numericNextNumber) ||
    numericNextNumber < 1
  ) {
    throw new Error(
      "El siguiente número de caja debe ser un número entero mayor que cero."
    );
  }

  const { data, error } = await supabase.rpc(
    "fmcontrol_set_reference_box_counter",
    {
      p_reference: normalizedReference,
      p_next_value: numericNextNumber,
      p_updated_by: String(updatedBy || "").trim(),
    }
  );

  throwCounterError(error, "modificar");

  const result = firstValue(data);
  const savedNextNumber = Number(
    result?.next_value ?? result ?? numericNextNumber
  );

  return {
    reference: normalizedReference,
    nextNumber: savedNextNumber,
    updatedBy: result?.updated_by || updatedBy || "",
    updatedAt: result?.updated_at || "",
  };
}

export async function reserveReferenceBoxNumber(
  supabase,
  reference,
  updatedBy = ""
) {
  const normalizedReference = normalizeLabelReference(reference);
  const { data, error } = await supabase.rpc(
    "fmcontrol_reserve_reference_box_number",
    {
      p_reference: normalizedReference,
      p_updated_by: String(updatedBy || "").trim(),
    }
  );

  throwCounterError(error);

  const reserved = Number(firstValue(data));

  if (!Number.isInteger(reserved) || reserved < 1) {
    throw new Error(
      `No se ha podido reservar el siguiente número de caja de ${normalizedReference}.`
    );
  }

  return {
    reference: normalizedReference,
    number: reserved,
    nextNumber: reserved + 1,
  };
}
