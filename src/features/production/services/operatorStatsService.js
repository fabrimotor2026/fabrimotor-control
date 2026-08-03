function normalizeCode(value) {
  return String(value || "").trim();
}

function getBoxTimestamp(box) {
  const timestamp = new Date(
    box?.created_at || box?.fecha || 0
  ).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getBoxPieces(box) {
  return Number(box?.totalPiezas || 0);
}

function createEmptyPeriodStats() {
  return {
    totalBoxes: 0,
    totalPieces: 0,
    principalBoxes: 0,
    secondaryBoxes: 0,
    averagePiecesPerBox: 0,
    firstBox: null,
    lastBox: null,
    boxes: [],
  };
}

/**
 * Devuelve todas las cajas en las que participa un operario,
 * tanto como principal como segundo operario.
 */
export function getOperatorBoxes(
  operatorCode,
  boxLabelsSummary = []
) {
  const code = normalizeCode(operatorCode);

  if (!code || !Array.isArray(boxLabelsSummary)) {
    return [];
  }

  return boxLabelsSummary
    .filter((box) => {
      const operator1 = normalizeCode(box?.operario1);
      const operator2 = normalizeCode(box?.operario2);

      return operator1 === code || operator2 === code;
    })
    .sort((a, b) => getBoxTimestamp(b) - getBoxTimestamp(a));
}

/**
 * Calcula las estadísticas de un conjunto de cajas
 * para un operario concreto.
 */
export function calculateOperatorPeriodStats(
  operatorCode,
  boxes = []
) {
  const code = normalizeCode(operatorCode);

  if (!code || !boxes.length) {
    return createEmptyPeriodStats();
  }

  const sortedBoxes = [...boxes].sort(
    (a, b) => getBoxTimestamp(b) - getBoxTimestamp(a)
  );

  const principalBoxes = sortedBoxes.filter(
    (box) => normalizeCode(box?.operario1) === code
  ).length;

  const secondaryBoxes = sortedBoxes.filter(
    (box) => normalizeCode(box?.operario2) === code
  ).length;

  const totalPieces = sortedBoxes.reduce(
    (total, box) => total + getBoxPieces(box),
    0
  );

  return {
    totalBoxes: sortedBoxes.length,
    totalPieces,
    principalBoxes,
    secondaryBoxes,
    averagePiecesPerBox:
      sortedBoxes.length > 0
        ? totalPieces / sortedBoxes.length
        : 0,
    firstBox: sortedBoxes[sortedBoxes.length - 1] || null,
    lastBox: sortedBoxes[0] || null,
    boxes: sortedBoxes,
  };
}

/**
 * Estadísticas generales acumuladas del operario.
 */
export function getOperatorStats(
  operatorCode,
  boxLabelsSummary = []
) {
  const code = normalizeCode(operatorCode);
  const boxes = getOperatorBoxes(code, boxLabelsSummary);
  const totals = calculateOperatorPeriodStats(code, boxes);
  const lastBox = totals.lastBox;

  return {
    code,
    ...totals,
    lastManufacturing: lastBox?.fabricacion || "-",
    lastHeat: lastBox?.colada || "-",
    lastActivity:
      lastBox?.created_at ||
      lastBox?.fecha ||
      null,
  };
}

/**
 * Estadísticas del operario para una fecha concreta.
 * Si no se indica fecha, utiliza el día actual.
 */
export function getOperatorTodayStats(
  operatorCode,
  boxLabelsSummary = [],
  targetDate = new Date()
) {
  const code = normalizeCode(operatorCode);

  const dateKey =
    targetDate instanceof Date
      ? [
          targetDate.getFullYear(),
          String(targetDate.getMonth() + 1).padStart(2, "0"),
          String(targetDate.getDate()).padStart(2, "0"),
        ].join("-")
      : String(targetDate || "").slice(0, 10);

  const boxes = getOperatorBoxes(code, boxLabelsSummary).filter(
    (box) => String(box?.fecha || "").slice(0, 10) === dateKey
  );

  return {
    date: dateKey,
    ...calculateOperatorPeriodStats(code, boxes),
  };
}

/**
 * Estadísticas semanales del operario.
 * Usa los campos semana y año de las cajas.
 */
export function getOperatorWeekStats(
  operatorCode,
  boxLabelsSummary = [],
  weekNumber,
  year
) {
  const code = normalizeCode(operatorCode);

  const currentDate = new Date();
  const selectedYear = Number(year || currentDate.getFullYear());

  const operatorBoxes = getOperatorBoxes(code, boxLabelsSummary);

  const availableWeeks = operatorBoxes
    .map((box) => Number(box?.semana))
    .filter((week) => Number.isFinite(week) && week > 0);

  const selectedWeek =
    Number(weekNumber) ||
    (availableWeeks.length > 0
      ? Math.max(...availableWeeks)
      : null);

  if (!selectedWeek) {
    return {
      week: null,
      year: selectedYear,
      ...createEmptyPeriodStats(),
    };
  }

  const boxes = operatorBoxes.filter((box) => {
    const boxWeek = Number(box?.semana);

    const boxYear = box?.fecha
      ? Number(String(box.fecha).slice(0, 4))
      : selectedYear;

    return boxWeek === selectedWeek && boxYear === selectedYear;
  });

  return {
    week: selectedWeek,
    year: selectedYear,
    ...calculateOperatorPeriodStats(code, boxes),
  };
}

/**
 * Devuelve la última actividad conocida del operario.
 */
export function getOperatorLastActivity(
  operatorCode,
  boxLabelsSummary = []
) {
  const lastBox =
    getOperatorBoxes(operatorCode, boxLabelsSummary)[0] || null;

  if (!lastBox) {
    return null;
  }

  return {
    numeroCaja: lastBox.numeroCaja || "-",
    fecha: lastBox.fecha || null,
    createdAt: lastBox.created_at || null,
    fabricacion: lastBox.fabricacion || "-",
    colada: lastBox.colada || "-",
    totalPiezas: getBoxPieces(lastBox),
    role:
      normalizeCode(lastBox.operario1) ===
      normalizeCode(operatorCode)
        ? "principal"
        : "segundo",
    box: lastBox,
  };
}

/**
 * Devuelve las estadísticas de todos los operarios
 * encontrados en las cajas.
 */
export function getAllOperatorsStats(
  boxLabelsSummary = []
) {
  const operatorCodes = new Set();

  boxLabelsSummary.forEach((box) => {
    const operator1 = normalizeCode(box?.operario1);
    const operator2 = normalizeCode(box?.operario2);

    if (operator1) {
      operatorCodes.add(operator1);
    }

    if (operator2) {
      operatorCodes.add(operator2);
    }
  });

  return [...operatorCodes]
    .map((code) => getOperatorStats(code, boxLabelsSummary))
    .sort((a, b) => {
      if (b.totalPieces !== a.totalPieces) {
        return b.totalPieces - a.totalPieces;
      }

      if (b.totalBoxes !== a.totalBoxes) {
        return b.totalBoxes - a.totalBoxes;
      }

      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
      });
    });
}