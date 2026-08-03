const clean = (value) => String(value ?? "").trim();
const upper = (value) => clean(value).toUpperCase();
const digits = (value) => clean(value).replace(/\D/g, "");

export const RELATION_CONFIDENCE = Object.freeze({
  EXACT: "EXACT",
  STRONG: "STRONG",
  COMPATIBLE: "COMPATIBLE",
  NONE: "NONE",
});

export function normalizeReference(value) {
  const normalized = upper(value).replace(/[\s-]+/g, "");
  if (["F1012", "1012"].includes(normalized)) return "F-1012";
  if (["F1013", "1013"].includes(normalized)) return "F-1013";
  return upper(value);
}

export function normalizeSearchCriteria(criteria = {}) {
  return {
    boxNumber: upper(
      criteria.boxNumber ||
        criteria.numeroCaja ||
        criteria.labelCode ||
        criteria.codigoEtiqueta
    ),
    pieceNumber: upper(
      criteria.pieceNumber ||
        criteria.numeroPieza ||
        criteria.pieza
    ),
    workOrder: upper(
      criteria.workOrder ||
        criteria.fabricacion ||
        criteria.numeroFabricacion ||
        criteria.ordenFabricacion
    ),
    lot: upper(
      criteria.lot ||
        criteria.colada ||
        criteria.lote ||
        criteria.numeroColada
    ),
    reference: normalizeReference(
      criteria.reference || criteria.referencia
    ),
    operator: upper(
      criteria.operator || criteria.operario || criteria.usuario
    ),
    truckNumber: digits(
      criteria.truckNumber || criteria.numeroCamion
    ),
  };
}

export function hasTraceabilityCriteria(criteria = {}) {
  return Object.values(normalizeSearchCriteria(criteria)).some(Boolean);
}

export function getRecordFields(record = {}) {
  return {
    id: clean(record.id || record._rowId),
    reference: normalizeReference(
      record.referencia || record.reference
    ),
    pieceNumber: upper(
      record.numeroPieza ||
        record.numero_pieza ||
        record.piece_number ||
        record.pieza
    ),
    workOrder: upper(
      record.ordenFabricacion ||
        record.orden_fabricacion ||
        record.numeroFabricacion ||
        record.fabricacion ||
        record.work_order
    ),
    lot: upper(
      record.lote ||
        record.numeroColada ||
        record.numero_colada ||
        record.colada ||
        record.lot
    ),
    operator: upper(
      record.operario ||
        record.operario1 ||
        record.operator_name ||
        record.usuarioSistema ||
        record.usuario
    ),
    savedAtMs: Number(
      record.savedAtMs ||
        record.saved_at_ms ||
        record._savedAtMs ||
        Date.parse(
          record.createdAt ||
            record.created_at ||
            record.fecha ||
            ""
        ) ||
        0
    ),
  };
}

export function getIncidentFields(incident = {}) {
  return {
    id: clean(incident.id || incident._rowId),
    reference: normalizeReference(
      incident.referencia || incident.reference
    ),
    pieceNumber: upper(
      incident.codigoEtiqueta ||
        incident.numeroPieza ||
        incident.numero_pieza ||
        incident.label_code
    ),
    workOrder: upper(
      incident.ordenFabricacion ||
        incident.orden_fabricacion ||
        incident.numeroFabricacion ||
        incident.fabricacion ||
        incident.work_order
    ),
    lot: upper(
      incident.numeroColada ||
        incident.numero_colada ||
        incident.colada ||
        incident.lote ||
        incident.lot
    ),
    operator: upper(
      incident.operario ||
        incident.operario1 ||
        incident.operator_name ||
        incident.usuario
    ),
    savedAtMs: Number(
      incident.savedAtMs ||
        incident.saved_at_ms ||
        incident._savedAtMs ||
        Date.parse(
          incident.createdAt ||
            incident.created_at ||
            incident.fecha ||
            ""
        ) ||
        0
    ),
  };
}

export function getLabelFields(label = {}) {
  const embedded =
    label.data && typeof label.data === "object" ? label.data : {};

  return {
    id: clean(label.id || label._rowId),
    labelId: upper(
      label.label_id || embedded.labelId || embedded.numeroCaja
    ),
    boxNumber: upper(
      label.numero_caja || label.numeroCaja || embedded.numeroCaja
    ),
    truckId: clean(
      label.camion_id || label.camionId || embedded.camionId
    ),
    reference: normalizeReference(
      label.reference ||
        label.referencia ||
        embedded.referencia ||
        embedded.reference
    ),
    workOrder: upper(
      label.fabricacion ||
        label.orden_fabricacion ||
        embedded.fabricacion ||
        embedded.ordenFabricacion ||
        embedded.numeroFabricacion
    ),
    lot: upper(
      label.colada ||
        label.lote ||
        embedded.colada ||
        embedded.lote ||
        embedded.numeroColada
    ),
    operator: upper(
      label.operario1 ||
        label.operario ||
        embedded.operario1 ||
        embedded.operario
    ),
    savedAtMs: Number(
      label.saved_at_ms ||
        Date.parse(
          label.created_at || label.fecha || embedded.fecha || ""
        ) ||
        0
    ),
  };
}

export function getTruckFields(truck = {}) {
  return {
    id: clean(truck.id),
    reference: normalizeReference(
      truck.reference || truck.referencia
    ),
    truckNumber: digits(
      truck.truck_number || truck.numeroCamion || truck.numero_camion
    ),
    savedAtMs: Number(
      Date.parse(
        truck.closed_at ||
          truck.created_at ||
          truck.planned_expedition_date ||
          truck.fecha ||
          ""
      ) || 0
    ),
  };
}

function exactCriteriaMatch(fields, criteria) {
  const checks = [];

  if (criteria.reference) {
    checks.push(fields.reference === criteria.reference);
  }
  if (criteria.pieceNumber) {
    checks.push(fields.pieceNumber === criteria.pieceNumber);
  }
  if (criteria.workOrder) {
    checks.push(fields.workOrder === criteria.workOrder);
  }
  if (criteria.lot) {
    checks.push(fields.lot === criteria.lot);
  }
  if (criteria.operator) {
    checks.push(
      Boolean(fields.operator) &&
        fields.operator.includes(criteria.operator)
    );
  }
  if (criteria.boxNumber) {
    checks.push(
      fields.boxNumber === criteria.boxNumber ||
        fields.labelId === criteria.boxNumber ||
        fields.pieceNumber === criteria.boxNumber
    );
  }
  if (criteria.truckNumber) {
    checks.push(fields.truckNumber === criteria.truckNumber);
  }

  return checks.length > 0 && checks.every(Boolean);
}

export function matchesRecord(record, criteria) {
  return exactCriteriaMatch(
    getRecordFields(record),
    normalizeSearchCriteria(criteria)
  );
}

export function matchesIncident(incident, criteria) {
  return exactCriteriaMatch(
    getIncidentFields(incident),
    normalizeSearchCriteria(criteria)
  );
}

export function matchesLabel(label, criteria) {
  return exactCriteriaMatch(
    getLabelFields(label),
    normalizeSearchCriteria(criteria)
  );
}

export function matchesTruck(truck, criteria) {
  return exactCriteriaMatch(
    getTruckFields(truck),
    normalizeSearchCriteria(criteria)
  );
}

function evaluateContextRelation(a, b) {
  if (!a.reference || !b.reference || a.reference !== b.reference) {
    return { confidence: RELATION_CONFIDENCE.NONE, reasons: [] };
  }

  const reasons = ["misma referencia"];
  let score = 1;

  if (a.workOrder && b.workOrder && a.workOrder === b.workOrder) {
    score += 2;
    reasons.push("misma fabricación/OF");
  }

  if (a.lot && b.lot && a.lot === b.lot) {
    score += 2;
    reasons.push("misma colada/lote");
  }

  if (
    a.pieceNumber &&
    b.pieceNumber &&
    a.pieceNumber === b.pieceNumber
  ) {
    score += 3;
    reasons.push("mismo número de pieza");
  }

  if (
    a.operator &&
    b.operator &&
    (a.operator.includes(b.operator) || b.operator.includes(a.operator))
  ) {
    score += 1;
    reasons.push("operario compatible");
  }

  if (score >= 6) {
    return { confidence: RELATION_CONFIDENCE.STRONG, reasons };
  }
  if (score >= 3) {
    return { confidence: RELATION_CONFIDENCE.COMPATIBLE, reasons };
  }

  return { confidence: RELATION_CONFIDENCE.NONE, reasons: [] };
}

export function evaluateRecordLabelRelation(record, label) {
  return evaluateContextRelation(
    getRecordFields(record),
    getLabelFields(label)
  );
}

export function evaluateIncidentLabelRelation(incident, label) {
  return evaluateContextRelation(
    getIncidentFields(incident),
    getLabelFields(label)
  );
}

export function evaluateIncidentRecordRelation(incident, record) {
  return evaluateContextRelation(
    getIncidentFields(incident),
    getRecordFields(record)
  );
}

export function buildTimeline({
  records = [],
  incidents = [],
  labels = [],
  trucks = [],
} = {}) {
  return [
    ...records.map((item) => ({
      type: "VERIFICATION",
      at: getRecordFields(item).savedAtMs,
      item,
    })),
    ...incidents.map((item) => ({
      type: "INCIDENT",
      at: getIncidentFields(item).savedAtMs,
      item,
    })),
    ...labels.map((item) => ({
      type: "LABEL",
      at: getLabelFields(item).savedAtMs,
      item,
    })),
    ...trucks.map((item) => ({
      type: "TRUCK",
      at: getTruckFields(item).savedAtMs,
      item,
    })),
  ].sort((a, b) => a.at - b.at);
}

export function createEmptyTraceability(criteria = {}) {
  return {
    criteria: normalizeSearchCriteria(criteria),
    records: [],
    incidents: [],
    labels: [],
    trucks: [],
    relations: [],
    timeline: [],
    summary: {
      records: 0,
      incidents: 0,
      labels: 0,
      trucks: 0,
      exactRelations: 0,
      strongRelations: 0,
      compatibleRelations: 0,
      hasExactTruckLink: false,
    },
  };
}
