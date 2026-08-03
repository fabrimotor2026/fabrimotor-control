const TRUCK_AUDIT_FIELDS = [
  {
    key: "planning_priority",
    aliases: ["planningPriority"],
    label: "Prioridad de planificación",
  },
  {
    key: "planned_expedition_date",
    aliases: ["plannedExpeditionDate"],
    label: "Fecha prevista",
  },
  {
    key: "actual_expedition_date",
    aliases: ["actualExpeditionDate"],
    label: "Fecha real de expedición",
  },
  {
    key: "customer_name",
    aliases: ["customerName"],
    label: "Cliente",
  },
  {
    key: "destination",
    aliases: [],
    label: "Destino",
  },
  {
    key: "carrier_name",
    aliases: ["carrierName"],
    label: "Transportista",
  },
  {
    key: "tractor_plate",
    aliases: ["tractorPlate", "vehicle_plate", "vehiclePlate"],
    label: "Matrícula tractora",
  },
  {
    key: "trailer_plate",
    aliases: ["trailerPlate"],
    label: "Matrícula remolque",
  },
  {
    key: "seal_number",
    aliases: ["sealNumber"],
    label: "Brida / precinto",
  },
  {
    key: "delivery_note_number",
    aliases: ["deliveryNoteNumber"],
    label: "Número de albarán",
  },
  {
    key: "notes",
    aliases: [],
    label: "Observaciones",
  },
  {
    key: "status",
    aliases: [],
    label: "Estado de producción",
  },
  {
    key: "shipment_status",
    aliases: ["shipmentStatus"],
    label: "Estado logístico",
  },
];

function hasOwn(source, key) {
  return Boolean(
    source &&
      Object.prototype.hasOwnProperty.call(source, key)
  );
}

function readField(source, field) {
  const candidates = [field.key, ...(field.aliases || [])];

  for (const candidate of candidates) {
    if (hasOwn(source, candidate)) {
      return source[candidate];
    }
  }

  return "";
}

function normalizeComparableValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value).trim();
}

export function buildTruckAuditChanges(before = {}, after = {}) {
  return TRUCK_AUDIT_FIELDS.reduce((changes, field) => {
    const beforeValue = normalizeComparableValue(
      readField(before, field)
    );
    const afterValue = normalizeComparableValue(
      readField(after, field)
    );

    if (beforeValue === afterValue) return changes;

    changes.push({
      field: field.key,
      label: field.label,
      before: beforeValue || null,
      after: afterValue || null,
    });

    return changes;
  }, []);
}

export function normalizeAuditActor(user) {
  if (typeof user === "string") {
    const value = user.trim() || "Sistema";

    return {
      username: value,
      name: "",
      display: value,
    };
  }

  const username = String(
    user?.username ||
      user?.code ||
      user?.employee_code ||
      ""
  ).trim();
  const name = String(
    user?.name ||
      user?.full_name ||
      ""
  ).trim();

  return {
    username,
    name,
    display:
      [username, name].filter(Boolean).join(" - ") ||
      "Sistema",
  };
}

export async function recordTruckAuditEvent(
  supabase,
  {
    truck = null,
    truckId = null,
    scheduleId = null,
    reference = "",
    truckNumber = null,
    eventType,
    eventLabel,
    actor = null,
    changes = [],
    metadata = {},
    source = "",
  }
) {
  if (!supabase) {
    throw new Error("Supabase no está disponible.");
  }

  const normalizedTruckNumber = Number(
    truckNumber ?? truck?.truck_number
  );

  if (
    !Number.isInteger(normalizedTruckNumber) ||
    normalizedTruckNumber <= 0
  ) {
    throw new Error(
      "No se ha podido identificar el número del camión para la auditoría."
    );
  }

  const normalizedActor = normalizeAuditActor(actor);
  const normalizedReference = String(
    reference ||
      truck?.reference ||
      "F-1012"
  ).trim();
  const normalizedSource = String(source || "").trim();
  const normalizedTruckId =
    truckId ||
    (normalizedSource === "PLANNED" ? null : truck?.id) ||
    null;

  const { data, error } = await supabase
    .from("f1012_truck_audit_events")
    .insert({
      reference: normalizedReference,
      truck_number: normalizedTruckNumber,
      truck_id: normalizedTruckId,
      schedule_id: scheduleId || null,
      event_type: String(eventType || "ACTIVITY").trim(),
      event_label: String(
        eventLabel || "Actividad registrada"
      ).trim(),
      actor_username: normalizedActor.username || null,
      actor_name: normalizedActor.name || null,
      actor_display: normalizedActor.display,
      changes: Array.isArray(changes) ? changes : [],
      metadata:
        metadata && typeof metadata === "object"
          ? metadata
          : {},
      source: normalizedSource || null,
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function recordTruckAuditEventSafely(
  supabase,
  event
) {
  try {
    return await recordTruckAuditEvent(supabase, event);
  } catch (error) {
    console.error(
      "No se ha podido registrar la auditoría de expedición:",
      error
    );
    return null;
  }
}

export async function fetchTruckAuditEvents(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
    limit = 100,
  }
) {
  const normalizedTruckNumber = Number(truckNumber);

  if (
    !Number.isInteger(normalizedTruckNumber) ||
    normalizedTruckNumber <= 0
  ) {
    return [];
  }

  const { data, error } = await supabase
    .from("f1012_truck_audit_events")
    .select("*")
    .eq("reference", reference || "F-1012")
    .eq("truck_number", normalizedTruckNumber)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 250));

  if (error) {
    if (
      error?.code === "42P01" ||
      String(error?.message || "").includes(
        "f1012_truck_audit_events"
      )
    ) {
      throw new Error(
        "Falta crear el historial de expediciones en Supabase. Ejecuta el archivo FMCONTROL_V2_25_HISTORIAL_AUDITORIA.sql."
      );
    }

    throw error;
  }

  return data || [];
}
