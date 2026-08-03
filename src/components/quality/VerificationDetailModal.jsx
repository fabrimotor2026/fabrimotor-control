import React, { useEffect, useMemo } from "react";

const textValue = (value) => String(value ?? "").trim();

const numericValue = (value) => {
  const parsed = Number(textValue(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const isEmptyValue = (value) =>
  value === undefined || value === null || value === "";

const formatDate = (value) => {
  const text = textValue(value);
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  return text || "—";
};

const shiftLabel = (value) => {
  const shift = textValue(value).toUpperCase();
  const labels = {
    M: "M · Mañana",
    T: "T · Tarde",
    N: "N · Noche",
  };

  return labels[shift] || textValue(value) || "—";
};

const getReasonText = (reason) => {
  if (!reason) return "";
  if (typeof reason === "string") return reason;

  const type = textValue(reason.tipo || reason.type);
  const detail = textValue(reason.detalle || reason.detail);

  if (type === "Otro" && detail) return `Otro · ${detail}`;
  return [type, detail].filter(Boolean).join(" · ");
};

const getCriterion = (check) => {
  if (check.type === "oknok") return "Debe ser OK";

  const minimum =
    check.displayMin !== undefined ? check.displayMin : check.min;
  const maximum =
    check.displayMax !== undefined ? check.displayMax : check.max;

  if (minimum === undefined && maximum === undefined) return "Según plano";
  return `${minimum} a ${maximum}`;
};

const getCheckResult = (check, value) => {
  if (isEmptyValue(value)) return "SIN DATO";

  if (check.type === "oknok") {
    return textValue(value).toUpperCase() === "OK" ? "OK" : "NO OK";
  }

  if (check.type === "number") {
    const numeric = numericValue(value);

    if (numeric === null) return "NO OK";
    return numeric >= Number(check.min) && numeric <= Number(check.max)
      ? "OK"
      : "NO OK";
  }

  return "REGISTRADO";
};

const FALLBACK_EXCLUDED_KEYS = new Set([
  "rechazoMotivos",
  "controlTurno",
  "observaciones",
]);

export default function VerificationDetailModal({
  open,
  onClose,
  record,
  normalizedRecord,
  checks = [],
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const measurementRows = useMemo(() => {
    if (!record) return [];

    const measurements = record.mediciones || record.measurements || {};
    const reasons =
      measurements.rechazoMotivos ||
      measurements.rejectionReasons ||
      record.rechazoMotivos ||
      {};
    const knownIds = new Set();
    const rows = [];

    for (const check of checks || []) {
      knownIds.add(check.id);
      const value = measurements[check.id];

      if (isEmptyValue(value)) continue;

      rows.push({
        id: check.id,
        control: check.control || check.label || check.id,
        tool: check.comentario || check.comment || "",
        criterion: getCriterion(check),
        value,
        result: getCheckResult(check, value),
        reason: getReasonText(reasons?.[check.id]),
      });
    }

    if (!isEmptyValue(measurements.controlTurno)) {
      rows.unshift({
        id: "controlTurno",
        control: "Control Ecoroll / Refrigerante",
        tool: "Comprobación de presión y presencia de flujo",
        criterion: "Debe ser OK",
        value: measurements.controlTurno,
        result:
          textValue(measurements.controlTurno).toUpperCase() === "OK"
            ? "OK"
            : "NO OK",
        reason: getReasonText(reasons?.controlTurno),
      });
    }

    for (const [id, value] of Object.entries(measurements)) {
      if (
        knownIds.has(id) ||
        FALLBACK_EXCLUDED_KEYS.has(id) ||
        isEmptyValue(value) ||
        typeof value === "object"
      ) {
        continue;
      }

      rows.push({
        id,
        control: id,
        tool: "",
        criterion: "Dato histórico",
        value,
        result:
          textValue(value).toUpperCase() === "NO OK" ? "NO OK" : "REGISTRADO",
        reason: getReasonText(reasons?.[id]),
      });
    }

    return rows;
  }, [checks, record]);

  if (!open || !record || !normalizedRecord) return null;

  const result = normalizedRecord.result;
  const rejectionText = textValue(
    record.rechazoTipo ||
      record.rejectionType ||
      record.motivoRechazo ||
      record.rejectionReason
  );
  const observations = textValue(
    record.observaciones ||
      record.observations ||
      record.comentarioCalidad ||
      record.qualityComment
  );

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/70 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
              Trazabilidad de la verificación · V2.44
            </div>
            <h2
              id="verification-detail-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Pieza {normalizedRecord.piece || "sin identificar"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Registro original realizado por el operario. Consulta sin
              posibilidad de modificación.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${
                result === "OK"
                  ? "bg-emerald-100 text-emerald-700"
                  : result === "NO OK"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {result}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-2xl text-slate-700 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Referencia", normalizedRecord.reference],
              ["Máquina", normalizedRecord.machineDisplay || normalizedRecord.machine],
              ["Fecha", formatDate(normalizedRecord.date)],
              ["Hora", normalizedRecord.time || "—"],
              ["Turno", shiftLabel(normalizedRecord.shift)],
              ["Operario", normalizedRecord.operator || "—"],
              ["Número de pieza", normalizedRecord.piece || "—"],
              [
                "Hoja de verificación",
                record.hojaNombre || record.sheetName || record.hojaId || "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {label}
                </div>
                <div className="mt-1 break-words font-black text-slate-900">
                  {value}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Controles registrados
                </div>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Lecturas y resultado por cota
                </h3>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-600">
                {measurementRows.length} controles
              </div>
            </div>

            <div className="max-h-[440px] overflow-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3">Control / cota</th>
                    <th className="px-4 py-3">Útil o método</th>
                    <th className="px-4 py-3">Criterio</th>
                    <th className="px-4 py-3">Lectura</th>
                    <th className="px-4 py-3">Resultado</th>
                    <th className="px-4 py-3">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {measurementRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-12 text-center font-semibold text-slate-500"
                      >
                        Este registro histórico no contiene mediciones
                        desglosadas.
                      </td>
                    </tr>
                  ) : (
                    measurementRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t border-slate-200 ${
                          row.result === "NO OK" ? "bg-red-50" : "bg-white"
                        }`}
                      >
                        <td className="max-w-[320px] px-4 py-3 font-black text-slate-900">
                          {row.control}
                        </td>
                        <td className="max-w-[280px] px-4 py-3 text-xs font-semibold text-slate-600">
                          {row.tool || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                          {row.criterion}
                        </td>
                        <td className="px-4 py-3 text-lg font-black text-slate-950">
                          {textValue(row.value) || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              row.result === "OK"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.result === "NO OK"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.result}
                          </span>
                        </td>
                        <td className="max-w-[260px] px-4 py-3 font-semibold text-red-700">
                          {row.reason || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {(result === "NO OK" || rejectionText || observations) && (
            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <div
                className={`rounded-3xl border p-5 ${
                  result === "NO OK"
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                  Motivo general del rechazo
                </div>
                <div className="mt-2 font-bold text-slate-900">
                  {rejectionText || "No se indicó un motivo general."}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Observaciones
                </div>
                <div className="mt-2 whitespace-pre-wrap font-semibold text-slate-800">
                  {observations || "Sin observaciones."}
                </div>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Auditoría del registro
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-bold text-slate-500">
                  Usuario del sistema
                </div>
                <div className="font-black text-slate-900">
                  {record.usuarioSistema || record.systemUser || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">
                  Rol del usuario
                </div>
                <div className="font-black text-slate-900">
                  {record.rolUsuarioSistema || record.systemUserRole || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">
                  Fecha de creación
                </div>
                <div className="font-black text-slate-900">
                  {record.createdAt || record.created_at
                    ? new Date(
                        record.createdAt || record.created_at
                      ).toLocaleString("es-ES")
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">
                  Identificador
                </div>
                <div className="break-all font-mono text-xs font-bold text-slate-700">
                  {record.id || "—"}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="text-xs font-bold text-slate-500">
            Pulsa Esc para cerrar.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
