import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  PERFORMANCE_RESULT_OPTIONS,
  buildDeliveryExportSheets,
  buildDeliveryPerformanceReport,
  deliveryPerformanceFileBase,
  fetchDeliveryPerformanceData,
  formatPerformanceDateTime,
  formatPerformanceDuration,
} from "../../../services/deliveryPerformanceService";

const EMPTY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  carrier: "ALL",
  customer: "ALL",
  destination: "ALL",
  result: "ALL",
};

function percentageText(value) {
  return value === null || value === undefined ? "-" : `${value}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filterLabel(value, options, fallback = "Todos") {
  if (!value || value === "ALL") return fallback;
  return (
    options.find((option) => option.value === value)?.label || value
  );
}

function resultTone(row) {
  if (row.status === "RETURNED") {
    return "bg-red-100 text-red-800";
  }
  if (row.status === "DELIVERED_WITH_INCIDENT") {
    return "bg-amber-100 text-amber-900";
  }
  if (row.status === "IN_TRANSIT") {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-emerald-100 text-emerald-800";
}

function scoreTone(score) {
  if (score === null || score === undefined) {
    return "bg-slate-100 text-slate-600";
  }
  if (score >= 90) return "bg-emerald-100 text-emerald-800";
  if (score >= 75) return "bg-blue-100 text-blue-800";
  if (score >= 60) return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-800";
}

function kpiCard(label, value, detail, tone = "slate") {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-900",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-white text-slate-950",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        tones[tone] || tones.slate
      }`}
    >
      <div className="text-xs font-black uppercase tracking-wide opacity-75">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold opacity-70">
        {detail}
      </div>
    </div>
  );
}

function filterDescription(filters) {
  return [
    filters.dateFrom ? `Desde ${filters.dateFrom}` : "Desde: inicio",
    filters.dateTo ? `Hasta ${filters.dateTo}` : "Hasta: hoy",
    filters.carrier === "ALL"
      ? "Todos los transportistas"
      : filters.carrier,
    filters.customer === "ALL"
      ? "Todos los clientes"
      : filters.customer,
    filters.destination === "ALL"
      ? "Todos los destinos"
      : filters.destination,
    filterLabel(
      filters.result,
      PERFORMANCE_RESULT_OPTIONS,
      "Todos los resultados"
    ),
  ].join(" · ");
}

export default function DeliveryPerformanceModal({
  reference = "F-1012",
  onOpenActualTruck,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const nextRows = await fetchDeliveryPerformanceData(
        supabase,
        { reference }
      );
      setRows(nextRows);
    } catch (loadError) {
      setError(
        loadError?.message ||
          "No se ha podido cargar el rendimiento de entregas."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(
        `delivery-performance-${String(reference).replaceAll(
          /[^a-zA-Z0-9]/g,
          "-"
        )}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_deliveries",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_delivery_incidents",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_departures",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_trucks",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .subscribe();
    const fallback = window.setInterval(
      () => loadData({ silent: true }),
      60_000
    );

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !exporting) onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [exporting, onClose]);

  const report = useMemo(
    () => buildDeliveryPerformanceReport(rows, filters),
    [rows, filters]
  );

  const setFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const exportExcel = async () => {
    if (!report.rows.length) {
      setError("No hay registros que exportar con estos filtros.");
      return;
    }

    setExporting("excel");
    setError("");

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const sheets = buildDeliveryExportSheets(report);

      Object.entries(sheets).forEach(([name, sheetRows]) => {
        const worksheet = XLSX.utils.json_to_sheet(sheetRows);
        const headers = Object.keys(sheetRows[0] || {});

        worksheet["!cols"] = headers.map((header) => ({
          wch: Math.min(
            34,
            Math.max(
              header.length + 2,
              ...sheetRows.map((row) =>
                String(row[header] ?? "").length
              )
            )
          ),
        }));
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          name.slice(0, 31)
        );
      });

      XLSX.writeFile(
        workbook,
        `${deliveryPerformanceFileBase(reference)}.xlsx`
      );
    } catch (exportError) {
      console.error(
        "Error exportando el rendimiento de entregas:",
        exportError
      );
      setError("No se ha podido generar el archivo Excel.");
    } finally {
      setExporting("");
    }
  };

  const exportPdf = () => {
    if (!report.rows.length) {
      setError("No hay registros que exportar con estos filtros.");
      return;
    }

    const popup = window.open("", "_blank");

    if (!popup) {
      setError(
        "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes e inténtalo de nuevo."
      );
      return;
    }

    popup.opener = null;

    setExporting("pdf");
    setError("");

    const title = deliveryPerformanceFileBase(reference);
    const carrierRows = report.carriers
      .map(
        (carrier) => `
          <tr>
            <td>${carrier.rank}</td>
            <td>${escapeHtml(carrier.carrier)}</td>
            <td>${carrier.final}</td>
            <td>${percentageText(carrier.onTimePercentage)}</td>
            <td>${formatPerformanceDuration(
              carrier.averageTransitMinutes
            )}</td>
            <td>${carrier.withIncident}</td>
            <td>${carrier.returned}</td>
            <td>${carrier.score ?? "-"}</td>
          </tr>`
      )
      .join("");
    const detailRows = report.rows
      .map(
        (row) => `
          <tr>
            <td>${row.truckNumber}</td>
            <td>${escapeHtml(row.carrier)}</td>
            <td>${escapeHtml(row.customer)}</td>
            <td>${escapeHtml(row.destination)}</td>
            <td>${escapeHtml(row.statusLabel)}</td>
            <td>${escapeHtml(
              formatPerformanceDateTime(row.departureAt)
            )}</td>
            <td>${escapeHtml(
              formatPerformanceDateTime(row.expectedAt)
            )}</td>
            <td>${escapeHtml(
              formatPerformanceDateTime(row.deliveredAt)
            )}</td>
            <td>${
              row.punctualityMinutes === null
                ? "-"
                : row.onTime
                  ? `${Math.abs(row.punctualityMinutes)} min antes`
                  : `${row.punctualityMinutes} min tarde`
            }</td>
            <td>${row.incidentCount}</td>
          </tr>`
      )
      .join("");

    popup.document.open();
    popup.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              font-family: Arial, sans-serif;
              font-size: 10px;
            }
            h1 { margin: 4px 0; font-size: 24px; }
            h2 { margin: 18px 0 8px; font-size: 15px; }
            .brand {
              color: #1d4ed8;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .muted { color: #64748b; font-weight: 600; }
            .filters {
              margin-top: 8px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: #f8fafc;
              padding: 8px;
            }
            .kpis {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 6px;
              margin-top: 12px;
            }
            .kpi {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 8px;
            }
            .kpi span {
              display: block;
              color: #64748b;
              font-size: 8px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .kpi strong {
              display: block;
              margin-top: 4px;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 5px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #e2e8f0;
              font-size: 8px;
              text-transform: uppercase;
            }
            tr { break-inside: avoid; }
            .page-break { break-before: page; }
            .footer {
              margin-top: 12px;
              color: #64748b;
              font-size: 8px;
            }
          </style>
        </head>
        <body>
          <div class="brand">FM Control · V2.36</div>
          <h1>Rendimiento de transportistas y entregas</h1>
          <div class="muted">${escapeHtml(reference)}</div>
          <div class="filters">${escapeHtml(
            filterDescription(filters)
          )}</div>
          <div class="kpis">
            <div class="kpi"><span>Entregas</span><strong>${
              report.summary.delivered
            }</strong></div>
            <div class="kpi"><span>Puntualidad</span><strong>${percentageText(
              report.summary.onTimePercentage
            )}</strong></div>
            <div class="kpi"><span>Retrasadas</span><strong>${
              report.summary.late
            }</strong></div>
            <div class="kpi"><span>Tránsito medio</span><strong>${formatPerformanceDuration(
              report.summary.averageTransitMinutes
            )}</strong></div>
            <div class="kpi"><span>Incidencias</span><strong>${
              report.summary.withIncident
            }</strong></div>
            <div class="kpi"><span>Devueltas</span><strong>${
              report.summary.returned
            }</strong></div>
          </div>
          <h2>Clasificación por transportista</h2>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Transportista</th><th>Entregas</th>
                <th>Puntualidad</th><th>Tránsito medio</th>
                <th>Incidencias</th><th>Devueltas</th><th>Puntuación</th>
              </tr>
            </thead>
            <tbody>${carrierRows}</tbody>
          </table>
          <h2 class="page-break">Detalle de entregas</h2>
          <table>
            <thead>
              <tr>
                <th>Camión</th><th>Transportista</th><th>Cliente</th>
                <th>Destino</th><th>Resultado</th><th>Salida</th>
                <th>Prevista</th><th>Real</th><th>Puntualidad</th>
                <th>Incidencias</th>
              </tr>
            </thead>
            <tbody>${detailRows}</tbody>
          </table>
          <div class="footer">
            Generado desde FM Control. La puntualidad se calcula entre
            la fecha prevista y la entrega real V2.35.
          </div>
          <script>
            window.addEventListener("load", () => {
              window.setTimeout(() => window.print(), 250);
            });
          </script>
        </body>
      </html>`);
    popup.document.close();
    setExporting("");
  };

  const maxMonthlyDeliveries = Math.max(
    1,
    ...report.months.map((month) => month.final)
  );
  const maxIncidentCount = Math.max(
    1,
    ...report.incidents.map((incident) => incident.count)
  );

  return createPortal(
    <div className="fixed inset-0 z-[10030] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div
        className="flex max-h-[calc(100vh-1rem)] w-full max-w-[98rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-performance-title"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.36
            </p>
            <h2
              id="delivery-performance-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Rendimiento de transportistas y entregas
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Puntualidad real desde la salida V2.34 hasta la
              confirmación de entrega V2.35.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportPdf}
              disabled={Boolean(exporting)}
              className="rounded-xl bg-red-600 px-4 py-3 font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {exporting === "pdf" ? "Preparando..." : "▣ PDF"}
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={Boolean(exporting)}
              className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {exporting === "excel" ? "Preparando..." : "▦ Excel"}
            </button>
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing || Boolean(exporting)}
              className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? "Actualizando..." : "↻ Actualizar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(exporting)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-2xl font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              aria-label="Cerrar rendimiento de entregas"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[12rem_12rem_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto]">
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Desde
                </span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    setFilter("dateFrom", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Hasta
                </span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    setFilter("dateTo", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Transportista
                </span>
                <select
                  value={filters.carrier}
                  onChange={(event) =>
                    setFilter("carrier", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                >
                  <option value="ALL">Todos</option>
                  {report.options.carriers.map((carrier) => (
                    <option key={carrier} value={carrier}>
                      {carrier}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Cliente
                </span>
                <select
                  value={filters.customer}
                  onChange={(event) =>
                    setFilter("customer", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                >
                  <option value="ALL">Todos</option>
                  {report.options.customers.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Destino
                </span>
                <select
                  value={filters.destination}
                  onChange={(event) =>
                    setFilter("destination", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                >
                  <option value="ALL">Todos</option>
                  {report.options.destinations.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Resultado
                </span>
                <select
                  value={filters.result}
                  onChange={(event) =>
                    setFilter("result", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                >
                  {PERFORMANCE_RESULT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={clearFilters}
                className="self-end rounded-xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800"
              >
                Limpiar
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              El periodo usa la entrega real en registros cerrados y la
              fecha prevista en expediciones en tránsito.
            </p>
          </section>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {kpiCard(
              "Entregas cerradas",
              report.summary.delivered,
              `${report.summary.final} cierres logísticos`,
              "blue"
            )}
            {kpiCard(
              "Puntualidad",
              percentageText(report.summary.onTimePercentage),
              `${report.summary.onTime} puntuales de ${report.summary.evaluated} evaluadas`,
              report.summary.onTimePercentage !== null &&
                report.summary.onTimePercentage >= 90
                ? "green"
                : "amber"
            )}
            {kpiCard(
              "Retrasadas",
              report.summary.late,
              `Retraso medio ${formatPerformanceDuration(
                report.summary.averageDelayMinutes
              )}`,
              report.summary.late ? "red" : "green"
            )}
            {kpiCard(
              "Tránsito medio",
              formatPerformanceDuration(
                report.summary.averageTransitMinutes
              ),
              "Salida hasta recepción",
              "slate"
            )}
            {kpiCard(
              "Con incidencia",
              report.summary.withIncident,
              `${percentageText(
                report.summary.incidentRate
              )} de los cierres`,
              report.summary.withIncident ? "amber" : "green"
            )}
            {kpiCard(
              "Devueltas",
              report.summary.returned,
              `${percentageText(
                report.summary.returnRate
              )} de los cierres`,
              report.summary.returned ? "red" : "green"
            )}
          </div>

          {loading ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-12 text-center font-black text-slate-500">
              Calculando el rendimiento de las entregas...
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
                <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                        Transportistas
                      </div>
                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        Clasificación de servicio
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {report.carriers.length} transportistas
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-200 text-left text-xs font-black uppercase text-slate-600">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Transportista</th>
                          <th className="px-4 py-3 text-right">Entregas</th>
                          <th className="px-4 py-3 text-right">Puntualidad</th>
                          <th className="px-4 py-3 text-right">Tránsito</th>
                          <th className="px-4 py-3 text-right">Incidencias</th>
                          <th className="px-4 py-3 text-right">Puntuación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {report.carriers.length ? (
                          report.carriers.map((carrier) => (
                            <tr
                              key={carrier.carrier}
                              className="hover:bg-blue-50"
                            >
                              <td className="px-4 py-3 font-black text-blue-700">
                                {carrier.rank}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilter(
                                      "carrier",
                                      carrier.carrier
                                    )
                                  }
                                  className="text-left font-black text-slate-900 hover:text-blue-700"
                                >
                                  {carrier.carrier}
                                </button>
                                <div className="mt-1 text-xs font-bold text-slate-500">
                                  {carrier.scoreLabel}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                {carrier.final}
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                {percentageText(
                                  carrier.onTimePercentage
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-bold">
                                {formatPerformanceDuration(
                                  carrier.averageTransitMinutes
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                {carrier.withIncident}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-black ${scoreTone(
                                    carrier.score
                                  )}`}
                                >
                                  {carrier.score ?? "-"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-10 text-center font-bold text-slate-500"
                            >
                              No hay entregas cerradas con estos filtros.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-slate-200 px-5 py-3 text-xs font-semibold text-slate-500">
                    Puntuación: 60% puntualidad, 25% entregas sin
                    incidencias y 15% entregas no devueltas.
                  </p>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
                    Calidad de entrega
                  </div>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Incidencias por tipo
                  </h3>

                  <div className="mt-5 space-y-4">
                    {report.incidents.length ? (
                      report.incidents.map((incident) => (
                        <div key={incident.type}>
                          <div className="flex items-center justify-between gap-3 text-sm font-black">
                            <span>{incident.label}</span>
                            <span>
                              {incident.count}
                              {incident.open
                                ? ` · ${incident.open} abiertas`
                                : ""}
                            </span>
                          </div>
                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{
                                width: `${Math.max(
                                  4,
                                  (incident.count /
                                    maxIncidentCount) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center font-bold text-slate-500">
                        Sin incidencias en el periodo.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                    Evolución
                  </div>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Entregas y puntualidad por mes
                  </h3>

                  <div className="mt-5 space-y-4">
                    {report.months.length ? (
                      report.months.map((month) => (
                        <div
                          key={month.month}
                          className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_7rem]"
                        >
                          <div className="font-black text-slate-700">
                            {month.month}
                          </div>
                          <div>
                            <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.max(
                                    3,
                                    (month.final /
                                      maxMonthlyDeliveries) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {month.final} entregas ·{" "}
                              {month.late} retrasadas
                            </div>
                          </div>
                          <div className="text-right font-black text-emerald-700">
                            {percentageText(
                              month.onTimePercentage
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center font-bold text-slate-500">
                        Sin entregas mensuales evaluables.
                      </div>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                  <div className="p-5">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                      Clientes y destinos
                    </div>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Nivel de servicio recibido
                    </h3>
                  </div>

                  <div className="max-h-[24rem] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-slate-200 text-left text-xs font-black uppercase text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Cliente / destino</th>
                          <th className="px-4 py-3 text-right">Entregas</th>
                          <th className="px-4 py-3 text-right">Puntualidad</th>
                          <th className="px-4 py-3 text-right">Incidencias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {report.customers.length ? (
                          report.customers.map((customer) => (
                            <tr
                              key={`${customer.customer}:${customer.destination}`}
                            >
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilters((previous) => ({
                                      ...previous,
                                      customer: customer.customer,
                                      destination:
                                        customer.destination,
                                    }));
                                  }}
                                  className="text-left"
                                >
                                  <div className="font-black text-slate-900 hover:text-blue-700">
                                    {customer.customer}
                                  </div>
                                  <div className="mt-1 text-xs font-bold text-slate-500">
                                    {customer.destination}
                                  </div>
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                {customer.final}
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                {percentageText(
                                  customer.onTimePercentage
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                {customer.withIncident}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-10 text-center font-bold text-slate-500"
                            >
                              Sin datos para el periodo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Trazabilidad
                    </div>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Detalle de los indicadores
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {report.rows.length} registros
                  </span>
                </div>

                <div className="max-h-[34rem] overflow-auto">
                  <table className="min-w-[80rem] w-full text-sm">
                    <thead className="sticky top-0 bg-slate-200 text-left text-xs font-black uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Camión</th>
                        <th className="px-4 py-3">Transportista</th>
                        <th className="px-4 py-3">Cliente / destino</th>
                        <th className="px-4 py-3">Resultado</th>
                        <th className="px-4 py-3">Salida</th>
                        <th className="px-4 py-3">Prevista</th>
                        <th className="px-4 py-3">Real</th>
                        <th className="px-4 py-3 text-right">Puntualidad</th>
                        <th className="px-4 py-3 text-right">Tránsito</th>
                        <th className="px-4 py-3 text-right">Incidencias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.rows.length ? (
                        report.rows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenActualTruck?.(row.truck)
                                }
                                className="font-black text-blue-700 hover:underline"
                              >
                                {row.truckNumber}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {row.carrier}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-black">
                                {row.customer}
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-500">
                                {row.destination}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${resultTone(
                                  row
                                )}`}
                              >
                                {row.statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {formatPerformanceDateTime(
                                row.departureAt
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {formatPerformanceDateTime(
                                row.expectedAt
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {formatPerformanceDateTime(
                                row.deliveredAt
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-black">
                              {row.punctualityMinutes === null
                                ? "-"
                                : row.onTime
                                  ? `${Math.abs(
                                      row.punctualityMinutes
                                    )} min antes`
                                  : `${row.punctualityMinutes} min tarde`}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {formatPerformanceDuration(
                                row.transitMinutes
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-black">
                              {row.incidentCount}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-4 py-12 text-center font-bold text-slate-500"
                          >
                            No hay registros con los filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
