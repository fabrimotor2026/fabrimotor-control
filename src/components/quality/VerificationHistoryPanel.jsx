import React, { useMemo, useState } from "react";
import VerificationDetailModal from "./VerificationDetailModal";

const EMPTY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  reference: "",
  machine: "",
  shift: "",
  operator: "",
  piece: "",
  result: "",
};

const textValue = (value) => String(value ?? "").trim();

const normalizeReference = (value) => {
  const text = textValue(value).toUpperCase();
  const match = text.match(/F-?101[23]/);

  if (match) {
    return match[0].replace(/^F(?=\d)/, "F-");
  }

  return text || "F-1012";
};

const normalizeResult = (value) => {
  const text = textValue(value).toUpperCase().replaceAll("_", " ");

  if (["OK", "CONFORME"].includes(text)) return "OK";
  if (["NO OK", "NOK", "NO CONFORME"].includes(text)) return "NO OK";
  return text || "Sin resultado";
};

const normalizeDate = (value) => {
  const text = textValue(value);
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoMatch) return isoMatch[1];

  const localMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (localMatch) {
    return `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}`;
  }

  return "";
};

const formatDate = (value) => {
  const normalized = normalizeDate(value);
  if (!normalized) return textValue(value) || "—";

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
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

const uniqueSorted = (rows, key) =>
  [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "es", {
      numeric: true,
      sensitivity: "base",
    })
  );

const normalizeRecord = (record, index) => {
  const date =
    record?.fecha ||
    record?.date ||
    record?.fechaControl ||
    record?.createdAt ||
    record?.created_at ||
    "";
  const operator =
    record?.operario ||
    record?.operator ||
    record?.usuarioSistema ||
    record?.usuario ||
    "";

  return {
    id:
      record?.id ||
      `${normalizeDate(date)}-${textValue(operator)}-${index}`,
    date: normalizeDate(date),
    reference: normalizeReference(
      record?.referencia ||
        record?.reference ||
        record?.referenceId ||
        record?.referenciaNombre
    ),
    machine: textValue(
      record?.maquina ||
        record?.machine ||
        record?.maquinaNombre ||
        record?.machineName
    ),
    machineDisplay: textValue(
      record?.maquinaNombre ||
        record?.machineName ||
        record?.maquina ||
        record?.machine
    ),
    shift: textValue(record?.turno || record?.shift),
    operator: textValue(operator),
    piece: textValue(
      record?.numeroPieza ||
        record?.pieceNumber ||
        record?.numero_pieza ||
        record?.pieza
    ),
    time: textValue(
      record?.horaGuardado ||
        record?.savedTime ||
        record?.hora ||
        record?.time
    ),
    result: normalizeResult(record?.resultado || record?.result),
    raw: record,
  };
};

export default function VerificationHistoryPanel({
  records = [],
  getMachineChecks,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const rows = useMemo(
    () => (Array.isArray(records) ? records : []).map(normalizeRecord),
    [records]
  );

  const options = useMemo(
    () => ({
      references: uniqueSorted(rows, "reference"),
      machines: uniqueSorted(rows, "machine"),
      shifts: uniqueSorted(rows, "shift"),
      operators: uniqueSorted(rows, "operator"),
    }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const pieceQuery = filters.piece.toLocaleLowerCase("es");

    return rows
      .filter((row) => {
        const matchesFrom = !filters.dateFrom || row.date >= filters.dateFrom;
        const matchesTo = !filters.dateTo || row.date <= filters.dateTo;
        const matchesReference =
          !filters.reference || row.reference === filters.reference;
        const matchesMachine =
          !filters.machine || row.machine === filters.machine;
        const matchesShift = !filters.shift || row.shift === filters.shift;
        const matchesOperator =
          !filters.operator || row.operator === filters.operator;
        const matchesPiece =
          !pieceQuery ||
          row.piece.toLocaleLowerCase("es").includes(pieceQuery);
        const matchesResult =
          !filters.result || row.result === filters.result;

        return (
          matchesFrom &&
          matchesTo &&
          matchesReference &&
          matchesMachine &&
          matchesShift &&
          matchesOperator &&
          matchesPiece &&
          matchesResult
        );
      })
      .sort((a, b) =>
        `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
      );
  }, [filters, rows]);

  const summary = useMemo(() => {
    const ok = filteredRows.filter((row) => row.result === "OK").length;
    const noOk = filteredRows.filter((row) => row.result === "NO OK").length;
    const evaluated = ok + noOk;

    return {
      total: filteredRows.length,
      ok,
      noOk,
      okPercent: evaluated ? Math.round((ok / evaluated) * 100) : 0,
    };
  }, [filteredRows]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const selectedChecks = useMemo(() => {
    if (!selectedRecord || typeof getMachineChecks !== "function") return [];

    return getMachineChecks(
      selectedRecord.reference,
      selectedRecord.machine
    );
  }, [getMachineChecks, selectedRecord]);

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
              Calidad · consulta
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Verificaciones de los operarios
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Histórico común para Administrador, Encargado y Calidad. Esta
              pantalla es solo de consulta.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
            {summary.total} resultados
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Desde
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Hasta
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Referencia
            <select
              value={filters.reference}
              onChange={(event) =>
                updateFilter("reference", event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              {options.references.map((reference) => (
                <option key={reference} value={reference}>
                  {reference}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Máquina
            <select
              value={filters.machine}
              onChange={(event) => updateFilter("machine", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              {options.machines.map((machine) => (
                <option key={machine} value={machine}>
                  {machine}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Turno
            <select
              value={filters.shift}
              onChange={(event) => updateFilter("shift", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos</option>
              {options.shifts.map((shift) => (
                <option key={shift} value={shift}>
                  {shiftLabel(shift)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Operario
            <select
              value={filters.operator}
              onChange={(event) => updateFilter("operator", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos</option>
              {options.operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Número de pieza
            <input
              type="search"
              value={filters.piece}
              onChange={(event) => updateFilter("piece", event.target.value)}
              placeholder="Buscar pieza…"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Resultado
            <select
              value={filters.result}
              onChange={(event) => updateFilter("result", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos</option>
              <option value="OK">OK</option>
              <option value="NO OK">NO OK</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-700"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-100 p-4">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Verificaciones
          </div>
          <div className="mt-1 text-3xl font-black text-slate-950">
            {summary.total}
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
            OK
          </div>
          <div className="mt-1 text-3xl font-black text-emerald-700">
            {summary.ok}
          </div>
        </div>
        <div className="rounded-2xl bg-red-50 p-4">
          <div className="text-xs font-black uppercase tracking-wide text-red-700">
            NO OK
          </div>
          <div className="mt-1 text-3xl font-black text-red-700">
            {summary.noOk}
          </div>
        </div>
        <div className="rounded-2xl bg-blue-50 p-4">
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">
            Resultado OK
          </div>
          <div className="mt-1 text-3xl font-black text-blue-700">
            {summary.okPercent}%
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 sm:px-6">
        <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Máquina</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Operario</th>
                <th className="px-4 py-3">Pieza</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-12 text-center font-semibold text-slate-500"
                  >
                    No hay verificaciones que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalle de la pieza ${row.piece || "sin identificar"}`}
                    onClick={() => setSelectedRecord(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedRecord(row);
                      }
                    }}
                    className="cursor-pointer border-t border-slate-200 bg-white transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 font-black text-blue-700">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {row.machine || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {shiftLabel(row.shift)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.operator || "—"}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900">
                      {row.piece || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {row.time || "—"}
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
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(row)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </section>

      <VerificationDetailModal
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord?.raw}
        normalizedRecord={selectedRecord}
        checks={selectedChecks}
      />
    </>
  );
}
