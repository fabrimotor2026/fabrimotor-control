import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

function pad(value) {
  return String(value).padStart(2, "0");
}

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function weekStartIso() {
  const date = new Date();
  const day = date.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  date.setDate(date.getDate() - daysFromMonday);
  return localIsoDate(date);
}

function normalizeDate(value) {
  if (!value) return "";

  const text = String(value);
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoMatch) return isoMatch[1];

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : localIsoDate(parsed);
}

function formatDate(value) {
  const iso = normalizeDate(value);

  if (!iso) return "-";

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function recordOperatorCodes(value) {
  return String(value || "")
    .split(/\s*\/\s*/)
    .map((part) => part.trim().split(/\s*-\s*/)[0])
    .filter(Boolean);
}

function matchesOperator(value, username) {
  return recordOperatorCodes(value).includes(String(username || ""));
}

function labelMatchesOperator(label, username) {
  const code = String(username || "");

  return (
    String(label?.operario1 || "") === code ||
    String(label?.operario2 || "") === code
  );
}

function labelOperatorCodes(label) {
  return [...new Set(
    [label?.operario1, label?.operario2]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function rowTimestamp(row) {
  const direct = Number(row?.savedAtMs);

  if (Number.isFinite(direct) && direct > 0) return direct;

  const parsed = Date.parse(
    row?.created_at ||
    row?.createdAt ||
    row?.fecha ||
    ""
  );

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getBoxNumber(row) {
  return row?.numero_caja || row?.numeroCaja || "";
}

function buildBoxes(labels) {
  const grouped = new Map();

  [...labels]
    .sort((first, second) => rowTimestamp(second) - rowTimestamp(first))
    .forEach((row) => {
      const boxNumber = getBoxNumber(row);

      if (!boxNumber) return;

      const current = grouped.get(boxNumber) || {
        numeroCaja: boxNumber,
        fecha: row.fecha || row.created_at || "",
        piezas: 0,
        timestamp: rowTimestamp(row),
        operators: new Set(),
      };

      current.piezas += Number(row.cantidad || 0);
      current.timestamp = Math.max(current.timestamp, rowTimestamp(row));
      labelOperatorCodes(row).forEach((code) => current.operators.add(code));
      grouped.set(boxNumber, current);
    });

  return [...grouped.values()]
    .map((box) => ({
      ...box,
      operators: [...box.operators],
    }))
    .sort((first, second) => second.timestamp - first.timestamp);
}

function buildOperatorBoxes(labels, username) {
  const code = String(username || "");

  return buildBoxes(labels)
    .filter((box) => box.operators.includes(code))
    .map((box) => {
      const participants = Math.max(box.operators.length, 1);
      const share = 1 / participants;

      return {
        ...box,
        share,
        allocatedPieces: box.piezas * share,
      };
    });
}

function formatAllocation(value) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function KpiCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{detail}</div>
    </div>
  );
}

export default function OperatorDashboardModal({
  users = [],
  records = [],
  boxLabels = [],
  loading = false,
  onRefresh,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const today = localIsoDate();
  const weekStart = weekStartIso();

  const operatorStats = useMemo(() => {
    return users
      .filter((user) => user?.role === "Operario")
      .map((user) => {
        const username = String(user.username || "");
        const operatorRecords = records
          .filter((record) => matchesOperator(record.operario, username))
          .sort((first, second) => rowTimestamp(second) - rowTimestamp(first));
        const boxes = buildOperatorBoxes(boxLabels, username);
        const recordsToday = operatorRecords.filter(
          (record) => normalizeDate(record.fecha || record.createdAt) === today
        );
        const recordsWeek = operatorRecords.filter((record) => {
          const date = normalizeDate(record.fecha || record.createdAt);
          return date >= weekStart && date <= today;
        });
        const boxesToday = boxes.filter(
          (box) => normalizeDate(box.fecha) === today
        );
        const boxesWeek = boxes.filter((box) => {
          const date = normalizeDate(box.fecha);
          return date >= weekStart && date <= today;
        });
        const weekOk = recordsWeek.filter(
          (record) => record.resultado === "OK"
        ).length;
        const boxesTodayTotal = boxesToday.reduce(
          (total, box) => total + box.share,
          0
        );
        const boxesWeekTotal = boxesWeek.reduce(
          (total, box) => total + box.share,
          0
        );
        const weekPieces = boxesWeek.reduce(
          (total, box) => total + box.allocatedPieces,
          0
        );
        const totalBoxes = boxes.reduce(
          (total, box) => total + box.share,
          0
        );

        return {
          user,
          username,
          name: user.name || username,
          records: operatorRecords,
          boxes,
          recordsToday: recordsToday.length,
          recordsWeek: recordsWeek.length,
          boxesToday: boxesTodayTotal,
          boxesWeek: boxesWeekTotal,
          totalBoxes,
          weekPieces,
          okRate:
            recordsWeek.length > 0
              ? Math.round((weekOk / recordsWeek.length) * 100)
              : 0,
          lastRecord: operatorRecords[0] || null,
          lastBox: boxes[0] || null,
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name, "es"));
  }, [users, records, boxLabels, today, weekStart]);

  const filteredOperators = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return operatorStats;

    return operatorStats.filter((operator) =>
      `${operator.username} ${operator.name}`.toLowerCase().includes(term)
    );
  }, [operatorStats, search]);

  const selectedOperator =
    operatorStats.find(
      (operator) => operator.username === selectedUsername
    ) ||
    filteredOperators[0] ||
    operatorStats[0] ||
    null;

  const initials = selectedOperator?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-2 sm:p-4 lg:pt-8">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">
              FM Control · v2.15
            </div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Fichas de operarios
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Producción, cajas y verificaciones por operario.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label="Cerrar fichas de operarios"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar operario..."
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="mt-4 space-y-2">
              {filteredOperators.map((operator) => {
                const active =
                  selectedOperator?.username === operator.username;

                return (
                  <button
                    key={operator.username}
                    type="button"
                    onClick={() => setSelectedUsername(operator.username)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-700 bg-slate-950 text-white shadow-lg"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wide opacity-70">
                          {operator.username}
                        </div>
                        <div className="mt-1 truncate text-base font-black">
                          {operator.name}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        active
                          ? "bg-emerald-400/20 text-emerald-200"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {operator.recordsToday} hoy
                      </span>
                    </div>
                  </button>
                );
              })}

              {!filteredOperators.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500">
                  No se han encontrado operarios.
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0 overflow-y-auto p-4 sm:p-6">
            {selectedOperator ? (
              <>
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black">
                      {initials || <UserRound className="h-7 w-7" />}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                        Operario {selectedOperator.username}
                      </div>
                      <h3 className="mt-1 text-2xl font-black">
                        {selectedOperator.name}
                      </h3>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-right ring-1 ring-white/15">
                    <div className="text-xs font-black uppercase text-slate-300">
                      Última actividad
                    </div>
                    <div className="mt-1 text-sm font-black">
                      {selectedOperator.lastRecord
                        ? formatDate(
                            selectedOperator.lastRecord.fecha ||
                            selectedOperator.lastRecord.createdAt
                          )
                        : "Sin verificaciones"}
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    icon={ClipboardCheck}
                    label="Controles hoy"
                    value={selectedOperator.recordsToday}
                    detail={`${selectedOperator.recordsWeek} durante esta semana`}
                  />
                  <KpiCard
                    icon={Boxes}
                    label="Cajas semana"
                    value={formatAllocation(selectedOperator.boxesWeek)}
                    detail={`${formatAllocation(selectedOperator.boxesToday)} imputadas hoy`}
                    tone="green"
                  />
                  <KpiCard
                    icon={CheckCircle2}
                    label="Resultado OK"
                    value={`${selectedOperator.okRate}%`}
                    detail="sobre controles de esta semana"
                    tone="green"
                  />
                  <KpiCard
                    icon={Clock3}
                    label="Piezas semana"
                    value={formatAllocation(selectedOperator.weekPieces)}
                    detail="piezas imputadas"
                    tone="amber"
                  />
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                          Calidad
                        </div>
                        <h4 className="mt-1 text-xl font-black text-slate-950">
                          Últimas verificaciones
                        </h4>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {selectedOperator.records.length} total
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {selectedOperator.records.slice(0, 6).map((record, index) => (
                        <div
                          key={record.id || `${record.numeroPieza}-${index}`}
                          className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">
                              Pieza {record.numeroPieza || "-"} · {record.maquina || "-"}
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {formatDate(record.fecha || record.createdAt)} · Turno {record.turno || "-"}
                            </div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${
                            record.resultado === "OK"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {record.resultado || "-"}
                          </span>
                        </div>
                      ))}

                      {!selectedOperator.records.length && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500">
                          Sin verificaciones registradas.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                          Producción
                        </div>
                        <h4 className="mt-1 text-xl font-black text-slate-950">
                          Últimas cajas
                        </h4>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {formatAllocation(selectedOperator.totalBoxes)} cajas imputadas
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {selectedOperator.boxes.slice(0, 6).map((box) => (
                        <div
                          key={box.numeroCaja}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div>
                            <div className="text-sm font-black text-slate-950">
                              {box.numeroCaja}
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {formatDate(box.fecha)}
                            </div>
                            <div className="mt-1 text-xs font-black text-blue-700">
                              {box.operators.length > 1
                                ? `${formatAllocation(box.share * 100)}% de caja compartida`
                                : "Caja completa"}
                            </div>
                          </div>
                          <span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-700">
                            {formatAllocation(box.allocatedPieces)} uds imputadas
                          </span>
                        </div>
                      ))}

                      {!selectedOperator.boxes.length && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500">
                          Sin cajas registradas.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <div>
                  <UserRound className="mx-auto h-12 w-12 text-slate-300" />
                  <div className="mt-4 text-xl font-black text-slate-900">
                    No hay operarios disponibles
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>,
    document.body
  );
}
