function valueOf(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function getBoxNumber(box) {
  return valueOf(box?.numeroCaja, box?.numero_caja, box?.box_number, box?.boxNumber, box?.id);
}

function getPieces(box) {
  return Number(valueOf(box?.totalPiezas, box?.cantidad, box?.pieces, box?.piezas, 0)) || 0;
}

function getOperators(box) {
  return [box?.operario, box?.operario1, box?.operario2, box?.operator, box?.operator_name, box?.usuario].filter(Boolean);
}

function parseFromCombinations(box, prefix) {
  return asArray(box?.combinaciones).flatMap((item) => {
    const match = String(item).match(new RegExp(`${prefix}\\s*([^·|,-]+)`, "i"));
    return match ? [match[1].trim()] : [];
  });
}

function getFabrications(box) {
  return [
    box?.fabricacion,
    box?.fabrication,
    box?.manufacturing,
    box?.manufacturing_order,
    ...parseFromCombinations(box, "FAB"),
  ].filter(Boolean);
}

function getHeats(box) {
  return [box?.colada, box?.heat, box?.heat_number, ...parseFromCombinations(box, "COL")].filter(Boolean);
}

function getDate(box) {
  return valueOf(box?.fecha, box?.created_at, box?.createdAt, box?.date);
}

function getReference(box, appConfig = {}) {
  return valueOf(box?.referencia, box?.reference, box?.ref, appConfig?.reference);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
}

function sortByLastDateDesc(a, b) {
  return String(b.lastDate || "").localeCompare(String(a.lastDate || ""));
}

export function buildProductionOrders({ boxLabels = [], boxLabelsSummary = [], activeTruck, displayTruck, appConfig = {} }) {
  const allBoxes = [...boxLabelsSummary, ...boxLabels];
  const groups = new Map();
  const truck = displayTruck || activeTruck || {};
  const truckCode = valueOf(truck?.truck_number, truck?.truck_code, truck?.codigoCamion, truck?.id);

  allBoxes.forEach((box) => {
    const fabrications = getFabrications(box);
    if (!fabrications.length) return;

    fabrications.forEach((fabrication) => {
      const key = String(fabrication).trim();
      if (!key) return;

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          fabrication: key,
          reference: getReference(box, appConfig),
          customer: valueOf(box?.cliente, box?.customer, appConfig?.customer, "FABRIMOTOR"),
          boxes: [],
          boxNumbers: new Set(),
          heats: new Set(),
          operators: new Set(),
          trucks: new Set(),
          pieces: 0,
          firstDate: "",
          lastDate: "",
        });
      }

      const order = groups.get(key);
      const boxNumber = getBoxNumber(box);
      const pieces = getPieces(box);
      const date = getDate(box);

      order.boxes.push({ ...box, numeroCaja: boxNumber || box?.numeroCaja, piezas: pieces, fecha: date });
      if (boxNumber) order.boxNumbers.add(boxNumber);
      getHeats(box).forEach((heat) => order.heats.add(heat));
      getOperators(box).forEach((operator) => order.operators.add(operator));
      if (truckCode) order.trucks.add(truckCode);
      if (box?.truckNumber || box?.truck_number) order.trucks.add(valueOf(box?.truckNumber, box?.truck_number));
      order.pieces += pieces;
      if (date && (!order.firstDate || String(date) < String(order.firstDate))) order.firstDate = date;
      if (date && (!order.lastDate || String(date) > String(order.lastDate))) order.lastDate = date;
    });
  });

  return Array.from(groups.values())
    .map((order) => ({
      ...order,
      boxNumbers: unique(Array.from(order.boxNumbers)),
      heats: unique(Array.from(order.heats)),
      operators: unique(Array.from(order.operators)),
      trucks: unique(Array.from(order.trucks)),
      status: "en_produccion",
      progressPercent: null,
    }))
    .sort(sortByLastDateDesc);
}

export function getProductionSummary(orders = []) {
  const boxes = new Set();
  const heats = new Set();
  const operators = new Set();
  let pieces = 0;

  orders.forEach((order) => {
    order.boxNumbers?.forEach((box) => boxes.add(box));
    order.heats?.forEach((heat) => heats.add(heat));
    order.operators?.forEach((operator) => operators.add(operator));
    pieces += Number(order.pieces || 0);
  });

  return {
    orders: orders.length,
    boxes: boxes.size,
    pieces,
    heats: heats.size,
    operators: operators.size,
  };
}
