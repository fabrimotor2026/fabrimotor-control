import {
  buildTimeline,
  createEmptyTraceability,
  evaluateIncidentLabelRelation,
  evaluateIncidentRecordRelation,
  evaluateRecordLabelRelation,
  getLabelFields,
  getTruckFields,
  hasTraceabilityCriteria,
  matchesIncident,
  matchesLabel,
  matchesRecord,
  matchesTruck,
  normalizeSearchCriteria,
  RELATION_CONFIDENCE,
} from "../utils/traceabilityModel.js";

async function fetchTable(supabase, table, select = "*") {
  const { data, error } = await supabase.from(table).select(select);

  if (error) {
    throw new Error(
      `No se pudo consultar ${table}: ${error.message || "error desconocido"}`
    );
  }

  return data || [];
}

function unwrapDataRows(rows = []) {
  return rows
    .map((row) => {
      if (!row) return null;
      if (!row.data || typeof row.data !== "object") return row;

      return {
        ...row.data,
        _rowId: row.id,
        _savedAtMs: row.saved_at_ms,
      };
    })
    .filter(Boolean);
}

function itemKey(item = {}) {
  return String(
    item.id ||
      item._rowId ||
      item.numero_caja ||
      item.label_id ||
      JSON.stringify(item)
  );
}

function uniqueById(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pushRelation(result, relation) {
  const key = [
    relation.fromType,
    relation.fromId,
    relation.toType,
    relation.toId,
    relation.confidence,
  ].join("|");

  if (result._relationKeys.has(key)) return;

  result._relationKeys.add(key);
  result.relations.push(relation);
}

function addRelatedRecords(result, allRecords) {
  for (const label of result.labels) {
    const labelFields = getLabelFields(label);

    for (const record of allRecords) {
      const relation = evaluateRecordLabelRelation(record, label);
      if (relation.confidence === RELATION_CONFIDENCE.NONE) continue;

      result.records.push(record);
      pushRelation(result, {
        fromType: "VERIFICATION",
        fromId: itemKey(record),
        toType: "LABEL",
        toId: labelFields.id || labelFields.boxNumber,
        ...relation,
      });
    }
  }
}

function addRelatedIncidents(result, allIncidents) {
  for (const label of result.labels) {
    const labelFields = getLabelFields(label);

    for (const incident of allIncidents) {
      const relation = evaluateIncidentLabelRelation(incident, label);
      if (relation.confidence === RELATION_CONFIDENCE.NONE) continue;

      result.incidents.push(incident);
      pushRelation(result, {
        fromType: "INCIDENT",
        fromId: itemKey(incident),
        toType: "LABEL",
        toId: labelFields.id || labelFields.boxNumber,
        ...relation,
      });
    }
  }

  for (const record of result.records) {
    for (const incident of allIncidents) {
      const relation = evaluateIncidentRecordRelation(incident, record);
      if (relation.confidence === RELATION_CONFIDENCE.NONE) continue;

      result.incidents.push(incident);
      pushRelation(result, {
        fromType: "INCIDENT",
        fromId: itemKey(incident),
        toType: "VERIFICATION",
        toId: itemKey(record),
        ...relation,
      });
    }
  }
}

export async function getTraceability(supabase, rawCriteria = {}) {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  if (!hasTraceabilityCriteria(rawCriteria)) {
    throw new Error("Indica al menos un criterio de búsqueda.");
  }

  const criteria = normalizeSearchCriteria(rawCriteria);
  const result = createEmptyTraceability(criteria);
  result._relationKeys = new Set();

  const [recordRows, incidentRows, allLabels, allTrucks] =
    await Promise.all([
      fetchTable(
        supabase,
        "fabrimotor_records",
        "id,data,saved_at_ms"
      ),
      fetchTable(
        supabase,
        "fabr_motor_incidents",
        "id,data,saved_at_ms"
      ),
      fetchTable(supabase, "f1012_box_labels", "*"),
      fetchTable(supabase, "f1012_trucks", "*"),
    ]);

  const allRecords = unwrapDataRows(recordRows);
  const allIncidents = unwrapDataRows(incidentRows);

  result.records = allRecords.filter((item) =>
    matchesRecord(item, criteria)
  );
  result.incidents = allIncidents.filter((item) =>
    matchesIncident(item, criteria)
  );
  result.labels = allLabels.filter((item) =>
    matchesLabel(item, criteria)
  );
  result.trucks = allTrucks.filter((item) =>
    matchesTruck(item, criteria)
  );

  // Búsqueda inversa: camión encontrado -> todas sus cajas.
  const matchedTruckIds = new Set(
    result.trucks.map((truck) => String(truck.id)).filter(Boolean)
  );

  if (matchedTruckIds.size > 0) {
    result.labels.push(
      ...allLabels.filter((label) =>
        matchedTruckIds.has(String(getLabelFields(label).truckId))
      )
    );
  }

  result.labels = uniqueById(result.labels);

  // Relación exacta caja -> camión mediante la FK real camion_id.
  const labelTruckIds = new Set(
    result.labels
      .map((label) => getLabelFields(label).truckId)
      .filter(Boolean)
  );

  result.trucks.push(
    ...allTrucks.filter((truck) =>
      labelTruckIds.has(String(truck.id))
    )
  );
  result.trucks = uniqueById(result.trucks);

  for (const label of result.labels) {
    const fields = getLabelFields(label);
    if (!fields.truckId) continue;

    const truck = allTrucks.find(
      (item) => String(item.id) === String(fields.truckId)
    );
    if (!truck) continue;

    pushRelation(result, {
      fromType: "LABEL",
      fromId: fields.id || fields.boxNumber,
      toType: "TRUCK",
      toId: getTruckFields(truck).id,
      confidence: RELATION_CONFIDENCE.EXACT,
      reasons: [
        "f1012_box_labels.camion_id = f1012_trucks.id",
      ],
    });
  }

  addRelatedRecords(result, allRecords);
  result.records = uniqueById(result.records);

  addRelatedIncidents(result, allIncidents);
  result.incidents = uniqueById(result.incidents);

  result.timeline = buildTimeline(result);
  result.summary = {
    records: result.records.length,
    incidents: result.incidents.length,
    labels: result.labels.length,
    trucks: result.trucks.length,
    exactRelations: result.relations.filter(
      (relation) =>
        relation.confidence === RELATION_CONFIDENCE.EXACT
    ).length,
    strongRelations: result.relations.filter(
      (relation) =>
        relation.confidence === RELATION_CONFIDENCE.STRONG
    ).length,
    compatibleRelations: result.relations.filter(
      (relation) =>
        relation.confidence === RELATION_CONFIDENCE.COMPATIBLE
    ).length,
    hasExactTruckLink: result.relations.some(
      (relation) =>
        relation.toType === "TRUCK" &&
        relation.confidence === RELATION_CONFIDENCE.EXACT
    ),
  };

  delete result._relationKeys;
  return result;
}
