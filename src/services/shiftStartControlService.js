export const SHIFT_START_CONTROL_IDS = Object.freeze([
  "controlTurno",
  "c70",
  "c80",
  "c90",
  "c340",
  "c370",
]);

function normalizeReference(value) {
  return String(value || "F-1012")
    .trim()
    .toUpperCase()
    .replace(/^F(\d)/, "F-$1");
}

function normalizeValue(value) {
  return String(value || "").trim();
}

export function isEmptyShiftStartValue(value) {
  return value === undefined || value === null || value === "";
}

export function isSameVerificationShift(record, context) {
  if (!record || !context) return false;

  return (
    normalizeReference(record.referencia || record.reference) ===
      normalizeReference(context.referencia || context.reference) &&
    normalizeValue(record.maquina || record.machine) ===
      normalizeValue(context.maquina || context.machine) &&
    normalizeValue(record.fecha || record.date) ===
      normalizeValue(context.fecha || context.date) &&
    normalizeValue(record.turno || record.shift) ===
      normalizeValue(context.turno || context.shift)
  );
}

export function getVerificationTimestamp(record) {
  const savedAtMs = Number(record?.savedAtMs);

  if (Number.isFinite(savedAtMs) && savedAtMs > 0) {
    return savedAtMs;
  }

  const createdAt = Date.parse(record?.createdAt || "");

  if (!Number.isNaN(createdAt)) {
    return createdAt;
  }

  if (record?.fecha && record?.horaGuardado) {
    const dateTime = Date.parse(
      `${record.fecha}T${record.horaGuardado}`
    );

    if (!Number.isNaN(dateTime)) {
      return dateTime;
    }
  }

  return 0;
}

export function hasPreviousShiftVerification(
  records,
  context,
  { excludeRecordId = "", beforeMs = null } = {}
) {
  const maximumTimestamp =
    Number.isFinite(Number(beforeMs)) && Number(beforeMs) > 0
      ? Number(beforeMs)
      : null;

  return (records || []).some((record) => {
    if (
      excludeRecordId &&
      String(record?.id || "") === String(excludeRecordId)
    ) {
      return false;
    }

    if (!isSameVerificationShift(record, context)) {
      return false;
    }

    if (maximumTimestamp === null) {
      return true;
    }

    const recordTimestamp = getVerificationTimestamp(record);
    return recordTimestamp > 0 && recordTimestamp < maximumTimestamp;
  });
}

export function isShiftStartValueOptional(
  controlId,
  value,
  hasPreviousVerification
) {
  return (
    Boolean(hasPreviousVerification) &&
    SHIFT_START_CONTROL_IDS.includes(controlId) &&
    isEmptyShiftStartValue(value)
  );
}
