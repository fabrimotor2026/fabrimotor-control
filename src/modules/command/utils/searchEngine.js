const RESULT_LIMIT = 18;

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value) {
  return normalize(value).replace(/\s+/g, "");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function getBoxNumber(box) {
  return pickFirst(box?.numeroCaja, box?.numero_caja, box?.box_number, box?.boxNumber, box?.id);
}

function getTruckCode(truck) {
  return pickFirst(truck?.truck_code, truck?.truck_number, truck?.codigoCamion, truck?.codigo_camion, truck?.code, truck?.id);
}

function getOperatorLabel(user) {
  const code = pickFirst(user?.username, user?.codigoOperario, user?.codigo_operario, user?.id);
  const name = pickFirst(user?.name, user?.nombre, user?.displayName, "Operario");
  return code && name && code !== name ? `${code} · ${name}` : code || name;
}

function getBoxOperators(box) {
  return [
    box?.operario,
    box?.operario1,
    box?.operario2,
    box?.operator,
    box?.operator_name,
    box?.usuario,
  ].filter(Boolean);
}

function getBoxFabrications(box) {
  const direct = [box?.fabricacion, box?.fabrication, box?.manufacturing, box?.manufacturing_order].filter(Boolean);
  const combinations = asArray(box?.combinaciones).flatMap((item) => {
    const match = String(item).match(/FAB\s*([^·|,-]+)/i);
    return match ? [match[1].trim()] : [];
  });
  return [...direct, ...combinations].filter(Boolean);
}

function getBoxHeats(box) {
  const direct = [box?.colada, box?.heat, box?.heat_number].filter(Boolean);
  const combinations = asArray(box?.combinaciones).flatMap((item) => {
    const match = String(item).match(/COL\s*([^·|,-]+)/i);
    return match ? [match[1].trim()] : [];
  });
  return [...direct, ...combinations].filter(Boolean);
}

function getBoxPieces(box) {
  return Number(pickFirst(box?.totalPiezas, box?.cantidad, box?.pieces, box?.piezas, 0)) || 0;
}

function scoreValues(values, query, options = {}) {
  const q = normalize(query);
  const qc = compact(query);
  const cleanValues = values.filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!q || !cleanValues.length) return 0;

  let best = 0;

  cleanValues.forEach((value) => {
    const n = normalize(value);
    const c = compact(value);
    if (!n) return;

    if (n === q || c === qc) best = Math.max(best, 120);
    else if (n.startsWith(q) || c.startsWith(qc)) best = Math.max(best, 95);
    else if (n.split(" ").some((part) => part.startsWith(q))) best = Math.max(best, 82);
    else if (n.includes(q) || c.includes(qc)) best = Math.max(best, 68);
  });

  const joined = normalize(cleanValues.join(" "));
  const joinedCompact = compact(cleanValues.join(" "));
  if (joined.includes(q) || joinedCompact.includes(qc)) best = Math.max(best, 54);

  return best + (options.boost || 0);
}

function uniqueByKey(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = String(getKey(item) || "").trim();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function buildBoxResults({ query, boxes, rawBoxRows, appConfig }) {
  const rowsByBox = groupBy(rawBoxRows, (row) => getBoxNumber(row));

  return boxes
    .map((box) => {
      const boxNumber = getBoxNumber(box);
      const rows = rowsByBox[boxNumber] || [];
      const operators = [...getBoxOperators(box), ...rows.flatMap(getBoxOperators)];
      const fabrications = [...getBoxFabrications(box), ...rows.flatMap(getBoxFabrications)];
      const heats = [...getBoxHeats(box), ...rows.flatMap(getBoxHeats)];
      const pieces = getBoxPieces(box) || rows.reduce((sum, row) => sum + getBoxPieces(row), 0);
      const values = [
        boxNumber,
        box?.fecha,
        box?.semana,
        box?.dia,
        pieces,
        appConfig?.reference,
        appConfig?.customer,
        ...operators,
        ...fabrications,
        ...heats,
        ...asArray(box?.combinaciones),
      ];

      const score = scoreValues(values, query, { boost: 12 });
      if (!score) return null;

      const operatorLabel = operators.filter(Boolean).join(" / ") || "Sin operario";
      const fabLabel = fabrications[0] ? `FAB ${fabrications[0]}` : "Sin fabricación";
      const heatLabel = heats[0] ? `COL ${heats[0]}` : "Sin colada";

      return {
        id: boxNumber || `${box?.fecha}-${operatorLabel}`,
        type: "box",
        icon: "📦",
        title: `Caja ${boxNumber || "-"}`,
        subtitle: `${operatorLabel} · ${pieces || 0} piezas · ${fabLabel} · ${heatLabel}`,
        meta: box?.fecha || "Caja",
        payload: box,
        score,
        matchText: [boxNumber, operatorLabel, fabLabel, heatLabel].filter(Boolean).join(" · "),
      };
    })
    .filter(Boolean);
}

function buildTruckResults({ query, trucks }) {
  return trucks
    .map((truck) => {
      const code = getTruckCode(truck);
      const values = [code, truck?.status, truck?.estado, truck?.planned_expedition_date, truck?.created_at, truck?.destination, truck?.destino];
      const score = scoreValues(values, query, { boost: 6 });
      if (!score) return null;

      return {
        id: truck?.id || code,
        type: "truck",
        icon: "🚚",
        title: `Camión ${code || "-"}`,
        subtitle: truck?.status || truck?.estado || "Histórico de camión",
        meta: truck?.planned_expedition_date ? `Expedición ${truck.planned_expedition_date}` : "Camión",
        payload: truck,
        score,
      };
    })
    .filter(Boolean);
}

function buildOperatorResults({ query, users, boxes, rawBoxRows }) {
  const allBoxes = [...boxes, ...rawBoxRows];

  return users
    .map((user) => {
      const label = getOperatorLabel(user);
      const values = [user?.username, user?.name, user?.nombre, user?.role, label];
      const score = scoreValues(values, query, { boost: 4 });
      if (!score) return null;

      const userKeys = [user?.username, user?.name, user?.nombre].map(normalize).filter(Boolean);
      const userBoxes = allBoxes.filter((box) =>
        getBoxOperators(box).some((operator) => userKeys.some((key) => normalize(operator).includes(key) || key.includes(normalize(operator))))
      );
      const uniqueBoxes = new Set(userBoxes.map(getBoxNumber).filter(Boolean));
      const pieces = userBoxes.reduce((sum, box) => sum + getBoxPieces(box), 0);

      return {
        id: user?.username || user?.id || label,
        type: "operator",
        icon: "👤",
        title: label,
        subtitle: `${uniqueBoxes.size} cajas localizadas · ${pieces || 0} piezas registradas`,
        meta: user?.role || "Operario",
        payload: user,
        score,
      };
    })
    .filter(Boolean);
}

function buildFabricationResults({ query, boxes, rawBoxRows }) {
  const allRows = [...boxes, ...rawBoxRows];
  const grouped = groupBy(allRows.flatMap((box) => getBoxFabrications(box).map((fab) => ({ fab, box }))), (item) => item.fab);

  return Object.entries(grouped)
    .map(([fab, items]) => {
      const relatedBoxes = items.map((item) => item.box);
      const boxNumbers = new Set(relatedBoxes.map(getBoxNumber).filter(Boolean));
      const operators = new Set(relatedBoxes.flatMap(getBoxOperators).filter(Boolean));
      const heats = new Set(relatedBoxes.flatMap(getBoxHeats).filter(Boolean));
      const pieces = relatedBoxes.reduce((sum, box) => sum + getBoxPieces(box), 0);
      const values = [fab, `FAB ${fab}`, ...boxNumbers, ...operators, ...heats];
      const score = scoreValues(values, query, { boost: 2 });
      if (!score) return null;

      return {
        id: fab,
        type: "fabrication",
        icon: "🏭",
        title: `Fabricación ${fab}`,
        subtitle: `${boxNumbers.size} cajas · ${pieces || 0} piezas · ${operators.size} operarios`,
        meta: heats.size ? `${heats.size} coladas` : "Fabricación",
        payload: { fabricacion: fab, boxes: relatedBoxes },
        score,
      };
    })
    .filter(Boolean);
}

function buildHeatResults({ query, boxes, rawBoxRows }) {
  const allRows = [...boxes, ...rawBoxRows];
  const grouped = groupBy(allRows.flatMap((box) => getBoxHeats(box).map((heat) => ({ heat, box }))), (item) => item.heat);

  return Object.entries(grouped)
    .map(([heat, items]) => {
      const relatedBoxes = items.map((item) => item.box);
      const boxNumbers = new Set(relatedBoxes.map(getBoxNumber).filter(Boolean));
      const fabrications = new Set(relatedBoxes.flatMap(getBoxFabrications).filter(Boolean));
      const pieces = relatedBoxes.reduce((sum, box) => sum + getBoxPieces(box), 0);
      const values = [heat, `COL ${heat}`, ...boxNumbers, ...fabrications];
      const score = scoreValues(values, query, { boost: 2 });
      if (!score) return null;

      return {
        id: heat,
        type: "heat",
        icon: "🔩",
        title: `Colada ${heat}`,
        subtitle: `${boxNumbers.size} cajas · ${pieces || 0} piezas · ${fabrications.size} fabricaciones`,
        meta: "Colada",
        payload: { colada: heat, boxes: relatedBoxes },
        score,
      };
    })
    .filter(Boolean);
}

function buildRecordResults({ query, productionRecords }) {
  return productionRecords
    .map((record) => {
      const values = [
        record?.numeroPieza,
        record?.referencia,
        record?.operario,
        record?.fecha,
        record?.turno,
        record?.resultado,
        record?.maquina,
        record?.machine,
      ];
      const score = scoreValues(values, query);
      if (!score) return null;

      return {
        id: record?.id || `${record?.numeroPieza}-${record?.fecha}`,
        type: "verification",
        icon: "✅",
        title: `Verificación ${record?.numeroPieza || record?.referencia || "-"}`,
        subtitle: `${record?.operario || "Sin operario"} · ${record?.resultado || "Sin resultado"} · ${record?.fecha || "Sin fecha"}`,
        meta: "Calidad",
        payload: record,
        score,
      };
    })
    .filter(Boolean);
}

function buildActionResults({ query }) {
  const actions = [
    {
      id: "open-truck-dashboard",
      type: "action",
      icon: "🚚",
      title: "Abrir dashboard del camión",
      subtitle: "Ver mapa visual, KPIs y detalle de cajas",
      meta: "Acción",
      keywords: ["dashboard", "camion", "camión", "cajas", "mapa", "truck"],
      action: "openDashboard",
    },

    {
      id: "open-production",
      type: "action",
      icon: "🏭",
      title: "Abrir módulo de producción",
      subtitle: "Ver fabricaciones, cajas, coladas y operarios asociados",
      meta: "Acción",
      keywords: ["produccion", "producción", "fabricacion", "fabricación", "orden", "ordenes", "órdenes", "op"],
      action: "openProduction",
    },
    {
      id: "open-config",
      type: "action",
      icon: "⚙️",
      title: "Abrir configuración",
      subtitle: "Parámetros generales de FM Control",
      meta: "Acción",
      keywords: ["config", "configuracion", "configuración", "ajustes"],
      action: "openConfig",
    },
    {
      id: "new-label",
      type: "action",
      icon: "🏷️",
      title: "Crear / imprimir etiqueta",
      subtitle: "Abrir formulario de etiqueta de caja",
      meta: "Acción",
      keywords: ["etiqueta", "imprimir", "caja", "nueva caja", "label"],
      action: "openLabel",
    },
  ];

  return actions
    .map((action) => {
      const values = [action.title, action.subtitle, ...(action.keywords || [])];
      const score = scoreValues(values, query, { boost: 5 });
      return score ? { ...action, payload: action, score } : null;
    })
    .filter(Boolean);
}

export function buildCommandResults({
  query,
  boxes = [],
  rawBoxRows = [],
  trucks = [],
  users = [],
  productionRecords = [],
  appConfig = {},
}) {
  const q = String(query || "").trim();
  if (!q) return [];

  const results = [
    ...buildBoxResults({ query: q, boxes, rawBoxRows, appConfig }),
    ...buildTruckResults({ query: q, trucks }),
    ...buildOperatorResults({ query: q, users, boxes, rawBoxRows }),
    ...buildFabricationResults({ query: q, boxes, rawBoxRows }),
    ...buildHeatResults({ query: q, boxes, rawBoxRows }),
    ...buildRecordResults({ query: q, productionRecords }),
    ...buildActionResults({ query: q }),
  ];

  return uniqueByKey(results)
    .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)))
    .slice(0, RESULT_LIMIT);
}

export const commandSearchInternals = {
  normalize,
  compact,
  scoreValues,
  getBoxNumber,
  getTruckCode,
};
