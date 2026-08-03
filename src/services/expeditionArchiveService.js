const PAGE_SIZE = 1000;

async function fetchAllPages(buildQuery) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(
      from,
      from + PAGE_SIZE - 1
    );

    if (error) throw error;

    const page = data || [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchOptionalRows(buildQuery, warningLabel) {
  try {
    return {
      rows: await fetchAllPages(buildQuery),
      warning: "",
    };
  } catch (error) {
    console.warn(
      `No se ha podido cargar ${warningLabel}:`,
      error
    );

    return {
      rows: [],
      warning: `No se ha podido cargar ${warningLabel}.`,
    };
  }
}

function normalizedReference(value) {
  return String(value || "F-1012").trim() || "F-1012";
}

function truckKey(reference, truckNumber) {
  return `${normalizedReference(reference)}::${Number(truckNumber)}`;
}

function actualArchiveStatus(truck) {
  if (
    truck?.status === "CLOSED" &&
    truck?.shipment_status === "SHIPPED"
  ) {
    return "SHIPPED";
  }

  if (truck?.status === "OPEN") return "OPEN";
  return "CLOSED";
}

function effectiveDate(truck) {
  return (
    truck?.actual_expedition_date ||
    truck?.planned_expedition_date ||
    String(truck?.updated_at || truck?.created_at || "").slice(0, 10)
  );
}

function compareArchiveEntries(first, second) {
  const firstDate = effectiveDate(first) || "0000-00-00";
  const secondDate = effectiveDate(second) || "0000-00-00";

  return (
    secondDate.localeCompare(firstDate) ||
    Number(second?.truck_number || 0) -
      Number(first?.truck_number || 0)
  );
}

function buildSupportingIndex(rows, keyFactory) {
  return rows.reduce((index, row) => {
    const key = keyFactory(row);

    if (!key) return index;

    const current = index.get(key) || [];
    current.push(row);
    index.set(key, current);

    return index;
  }, new Map());
}

export async function fetchExpeditionArchive(
  supabase,
  reference = "F-1012"
) {
  if (!supabase) {
    throw new Error("Supabase no está disponible.");
  }

  const normalized = normalizedReference(reference);

  const [actualTrucks, plannedTrucks, boxesResult, documentsResult, auditResult] =
    await Promise.all([
      fetchAllPages((from, to) =>
        supabase
          .from("f1012_trucks")
          .select("*")
          .eq("reference", normalized)
          .order("truck_number", { ascending: false })
          .range(from, to)
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("f1012_truck_schedule")
          .select("*")
          .eq("reference", normalized)
          .eq("status", "PLANNED")
          .order("truck_number", { ascending: false })
          .range(from, to)
      ),
      fetchOptionalRows(
        (from, to) =>
          supabase
            .from("f1012_box_labels")
            .select("id, camion_id")
            .range(from, to),
        "el recuento de cajas"
      ),
      fetchOptionalRows(
        (from, to) =>
          supabase
            .from("f1012_truck_documents")
            .select(
              "id, reference, truck_number, document_type, file_name, created_at"
            )
            .eq("reference", normalized)
            .order("created_at", { ascending: false })
            .range(from, to),
        "los documentos"
      ),
      fetchOptionalRows(
        (from, to) =>
          supabase
            .from("f1012_truck_audit_events")
            .select(
              "id, reference, truck_number, event_type, event_label, actor_display, created_at"
            )
            .eq("reference", normalized)
            .order("created_at", { ascending: false })
            .range(from, to),
        "la auditoría"
      ),
    ]);

  const boxesByTruckId = buildSupportingIndex(
    boxesResult.rows,
    (box) => (box?.camion_id ? String(box.camion_id) : "")
  );
  const documentsByTruck = buildSupportingIndex(
    documentsResult.rows,
    (document) =>
      truckKey(document?.reference, document?.truck_number)
  );
  const auditByTruck = buildSupportingIndex(
    auditResult.rows,
    (event) => truckKey(event?.reference, event?.truck_number)
  );

  const actualEntries = actualTrucks.map((truck) => {
    const key = truckKey(truck.reference, truck.truck_number);

    return {
      ...truck,
      archive_kind: "ACTUAL",
      archive_status: actualArchiveStatus(truck),
      archive_date: effectiveDate(truck),
      box_count: (boxesByTruckId.get(String(truck.id)) || []).length,
      documents: documentsByTruck.get(key) || [],
      audit_events: auditByTruck.get(key) || [],
    };
  });

  const plannedEntries = plannedTrucks.map((truck) => {
    const key = truckKey(truck.reference, truck.truck_number);

    return {
      ...truck,
      archive_kind: "PLANNED",
      archive_status: "PLANNED",
      archive_date: effectiveDate(truck),
      box_count: 0,
      documents: documentsByTruck.get(key) || [],
      audit_events: auditByTruck.get(key) || [],
    };
  });

  return {
    entries: [...actualEntries, ...plannedEntries].sort(
      compareArchiveEntries
    ),
    warnings: [
      boxesResult.warning,
      documentsResult.warning,
      auditResult.warning,
    ].filter(Boolean),
  };
}
