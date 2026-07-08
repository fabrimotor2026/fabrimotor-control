export function getBoxTimestamp(box) {
  if (!box) return 0;

  const rawDate = box.created_at || box.fecha_iso || box.fechaCompleta;
  if (rawDate) {
    const parsed = new Date(rawDate).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  const date = box.fecha || box.fechaGuardado;
  const time = box.hora || box.horaGuardado;
  if (date && time) {
    const parsed = new Date(`${date}T${time}`).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

export function formatElapsedFromTimestamp(timestamp) {
  if (!timestamp) return "-";

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? "1 día" : `${days} días`;
}

export function buildTruckDashboardStats({ boxes = [], summary = [], targetBoxes = 49 }) {
  const safeBoxes = Array.isArray(boxes) ? boxes : [];
  const safeSummary = Array.isArray(summary) ? summary : [];
  const completedBoxes = safeSummary.length;
  const totalPieces = safeSummary.reduce((acc, box) => acc + Number(box.totalPiezas || 0), 0);
  const target = Number(targetBoxes || 49);
  const percent = target > 0 ? Math.min(Math.round((completedBoxes / target) * 100), 100) : 0;

  const lastRawBox = [...safeBoxes].sort((a, b) => getBoxTimestamp(b) - getBoxTimestamp(a))[0] || null;
  const lastSummaryBox = [...safeSummary].sort((a, b) => {
    const byTimestamp = getBoxTimestamp(b) - getBoxTimestamp(a);
    if (byTimestamp !== 0) return byTimestamp;
    return String(b.numeroCaja || "").localeCompare(String(a.numeroCaja || ""));
  })[0] || null;
  const lastBox = lastRawBox || lastSummaryBox;
  const lastTimestamp = getBoxTimestamp(lastBox);

  return {
    completedBoxes,
    targetBoxes: target,
    remainingBoxes: Math.max(target - completedBoxes, 0),
    percent,
    averagePieces: completedBoxes ? (totalPieces / completedBoxes).toFixed(1).replace(".0", "") : "-",
    lastOperator: lastBox?.operario2
      ? `${lastBox.operario1 || "-"} / ${lastBox.operario2}`
      : lastBox?.operario1 || lastSummaryBox?.operario || "-",
    lastManufacturing: lastBox?.fabricacion || "-",
    lastHeat: lastBox?.colada || "-",
    lastBoxNumber: lastBox?.numero_caja || lastSummaryBox?.numeroCaja || "-",
    lastBoxTime: lastBox?.hora || lastBox?.horaGuardado || "-",
    elapsed: formatElapsedFromTimestamp(lastTimestamp),
  };
}
