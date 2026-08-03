import {
  AlarmClock,
  Archive,
  CalendarCheck,
  Clock3,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
  Printer,
  RefreshCw,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchExpeditionArchive,
} from "../../../services/expeditionArchiveService";
import {
  buildExpeditionPerformance,
  buildPerformanceFilterOptions,
} from "../../../services/expeditionPerformance";

function formatDate(value) {
  if (!value) return "-";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : String(value);
}

function formatDays(value, singular = "día") {
  const numericValue = Number(value || 0);
  const label = Math.abs(numericValue) === 1
    ? singular
    : `${singular}s`;

  return `${String(numericValue).replace(".", ",")} ${label}`;
}

function punctualityLabel(entry) {
  if (entry?.punctuality === "EARLY") {
    return `Adelantado ${formatDays(Math.abs(entry.deviation_days))}`;
  }

  if (entry?.punctuality === "DELAYED") {
    return `Retrasado ${formatDays(entry.deviation_days)}`;
  }

  return "Puntual";
}

function punctualityClass(entry) {
  if (entry?.punctuality === "EARLY") {
    return "bg-blue-100 text-blue-800";
  }

  if (entry?.punctuality === "DELAYED") {
    return "bg-red-100 text-red-800";
  }

  return "bg-emerald-100 text-emerald-800";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportFileBase(reference) {
  const normalizedReference = String(reference || "F-1012")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  return `${normalizedReference}_Rendimiento_Expediciones_${today}`;
}

function buildExpeditionRows(entries) {
  return entries.map((entry) => ({
    Referencia: entry.reference || "F-1012",
    Camión: Number(entry.truck_number || 0),
    "Fecha prevista": formatDate(entry.planned_expedition_date),
    "Fecha real": formatDate(entry.actual_expedition_date),
    Resultado:
      entry.punctuality === "EARLY"
        ? "Adelantado"
        : entry.punctuality === "DELAYED"
          ? "Retrasado"
          : "Puntual",
    "Desviación (días)": entry.deviation_days,
    Cliente: entry.customer_name || "",
    Destino: entry.destination || "",
    Transportista: entry.carrier_name || "",
    "Matrícula tractora":
      entry.tractor_plate || entry.vehicle_plate || "",
    "Matrícula remolque": entry.trailer_plate || "",
    "Brida / precinto": entry.seal_number || "",
    "Número de albarán": entry.delivery_note_number || "",
    Cajas: Number(entry.box_count || 0),
  }));
}

function buildGroupRows(groups, groupLabel) {
  return groups.map((group) => ({
    [groupLabel]: group.name,
    Expediciones: group.total,
    "En plazo": group.onSchedule,
    Puntuales: group.punctual,
    Adelantadas: group.early,
    Retrasadas: group.delayed,
    "Cumplimiento (%)": group.compliancePercent,
    "Retraso medio (días)": group.averageDelayDays,
    "Retraso máximo (días)": group.maxDelayDays,
  }));
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  className,
  iconClassName,
}) {
  return (
    <div className={`rounded-[1.35rem] border p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wide">
            {label}
          </div>
          <div className="mt-3 text-3xl font-black">{value}</div>
          <div className="mt-1 text-xs font-bold opacity-75">
            {detail}
          </div>
        </div>
        <div className={`rounded-xl p-2.5 ${iconClassName}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function MonthlyEvolution({ months }) {
  if (!months.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">
        No hay datos mensuales con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {months.map((month) => {
        const onScheduleWidth = month.total
          ? (month.onSchedule / month.total) * 100
          : 0;
        const delayedWidth = 100 - onScheduleWidth;

        return (
          <div key={month.key}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="font-black capitalize text-slate-950">
                {month.label}
              </div>
              <div className="text-xs font-black text-slate-600">
                {month.compliancePercent}% en plazo · {month.total} expediciones
              </div>
            </div>
            <div className="flex h-5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="bg-emerald-500"
                style={{ width: `${onScheduleWidth}%` }}
                title={`${month.onSchedule} en plazo`}
              />
              <div
                className="bg-red-500"
                style={{ width: `${delayedWidth}%` }}
                title={`${month.delayed} retrasadas`}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
              <span>{month.punctual} puntuales</span>
              <span>{month.early} adelantadas</span>
              <span>{month.delayed} retrasadas</span>
              <span>
                Retraso medio: {formatDays(month.averageDelayDays)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PerformanceTable({
  title,
  subtitle,
  rows,
  firstColumnLabel,
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="text-xl font-black text-slate-950">
          {title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {subtitle}
        </p>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-100 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">{firstColumnLabel}</th>
                <th className="px-4 py-3 text-right">Exp.</th>
                <th className="px-4 py-3 text-right">En plazo</th>
                <th className="px-4 py-3 text-right">Retrasadas</th>
                <th className="px-4 py-3 text-right">% cumplimiento</th>
                <th className="px-5 py-3 text-right">Retraso medio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.slice(0, 12).map((row) => (
                <tr key={row.name}>
                  <td className="px-5 py-3 font-black text-slate-950">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">
                    {row.total}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {row.onSchedule}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">
                    {row.delayed}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        row.compliancePercent >= 90
                          ? "bg-emerald-100 text-emerald-800"
                          : row.compliancePercent >= 75
                            ? "bg-amber-100 text-amber-900"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.compliancePercent}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-700">
                    {formatDays(row.averageDelayDays)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-sm font-bold text-slate-500">
          No hay datos para mostrar.
        </div>
      )}
    </section>
  );
}

export default function ExpeditionPerformanceModal({
  reference = "F-1012",
  onOpenTruck,
  onOpenArchive,
  onOpenForecast,
  onClose,
}) {
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState("ALL");
  const [carrier, setCarrier] = useState("ALL");
  const [destination, setDestination] = useState("ALL");

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchExpeditionArchive(
        supabase,
        reference
      );
      setArchiveEntries(result.entries);
      setWarnings(result.warnings);
    } catch (loadError) {
      setArchiveEntries([]);
      setWarnings([]);
      setError(
        loadError?.message ||
          "No se han podido cargar los datos de expediciones."
      );
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filterOptions = useMemo(
    () => buildPerformanceFilterOptions(archiveEntries),
    [archiveEntries]
  );
  const analysis = useMemo(
    () =>
      buildExpeditionPerformance(archiveEntries, {
        from: dateFrom,
        to: dateTo,
        customer,
        carrier,
        destination,
      }),
    [
      archiveEntries,
      carrier,
      customer,
      dateFrom,
      dateTo,
      destination,
    ]
  );

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCustomer("ALL");
    setCarrier("ALL");
    setDestination("ALL");
  };

  const openArchive = () => {
    onClose?.();
    window.setTimeout(() => onOpenArchive?.(), 50);
  };

  const openForecast = () => {
    onClose?.();
    window.setTimeout(() => onOpenForecast?.(), 50);
  };

  const openTruck = (entry) => {
    onClose?.();
    window.setTimeout(() => onOpenTruck?.(entry), 50);
  };

  const exportExcel = async () => {
    setExportError("");

    if (!analysis.entries.length) {
      setExportError(
        "No hay expediciones evaluadas que exportar."
      );
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summaryRows = [
        {
          Indicador: "Expediciones evaluadas",
          Valor: analysis.summary.evaluated,
        },
        {
          Indicador: "Cumplimiento del plazo",
          Valor: `${analysis.summary.compliancePercent}%`,
        },
        {
          Indicador: "Puntuales",
          Valor: analysis.summary.punctual,
        },
        {
          Indicador: "Adelantadas",
          Valor: analysis.summary.early,
        },
        {
          Indicador: "Retrasadas",
          Valor: analysis.summary.delayed,
        },
        {
          Indicador: "Retraso medio",
          Valor: formatDays(
            analysis.summary.averageDelayDays
          ),
        },
        {
          Indicador: "Retraso máximo",
          Valor: formatDays(
            analysis.summary.maximumDelayDays
          ),
        },
        {
          Indicador: "Sin fechas suficientes",
          Valor: analysis.summary.unevaluated,
        },
      ];
      const monthlyRows = analysis.monthly.map((month) => ({
        Mes: month.label,
        Expediciones: month.total,
        "En plazo": month.onSchedule,
        Puntuales: month.punctual,
        Adelantadas: month.early,
        Retrasadas: month.delayed,
        "Cumplimiento (%)": month.compliancePercent,
        "Retraso medio (días)": month.averageDelayDays,
      }));
      const sheets = [
        ["Resumen", summaryRows],
        ["Expediciones", buildExpeditionRows(analysis.entries)],
        ["Evolución mensual", monthlyRows],
        [
          "Transportistas",
          buildGroupRows(
            analysis.byCarrier,
            "Transportista"
          ),
        ],
        [
          "Clientes",
          buildGroupRows(analysis.byCustomer, "Cliente"),
        ],
        [
          "Destinos",
          buildGroupRows(analysis.byDestination, "Destino"),
        ],
      ];

      sheets.forEach(([sheetName, rows]) => {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = Object.keys(rows[0] || {}).map(
          (column) => ({
            wch: Math.min(
              40,
              Math.max(
                column.length + 2,
                ...rows.map((row) =>
                  String(row[column] ?? "").length + 2
                )
              )
            ),
          })
        );
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sheetName.slice(0, 31)
        );
      });

      XLSX.writeFile(
        workbook,
        `${exportFileBase(reference)}.xlsx`
      );
    } catch (exportFailure) {
      console.error(
        "Error exportando el rendimiento:",
        exportFailure
      );
      setExportError(
        "No se ha podido generar el archivo Excel."
      );
    }
  };

  const exportPdf = () => {
    setExportError("");

    if (!analysis.entries.length) {
      setExportError(
        "No hay expediciones evaluadas que exportar."
      );
      return;
    }

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
      setExportError(
        "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes e inténtalo de nuevo."
      );
      return;
    }

    reportWindow.opener = null;

    const delayedRows = analysis.delayedEntries
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.truck_number)}</td>
            <td>${escapeHtml(formatDate(entry.planned_expedition_date))}</td>
            <td>${escapeHtml(formatDate(entry.actual_expedition_date))}</td>
            <td>${escapeHtml(entry.customer_name || "-")}</td>
            <td>${escapeHtml(entry.carrier_name || "-")}</td>
            <td>${escapeHtml(formatDays(entry.deviation_days))}</td>
          </tr>
        `
      )
      .join("");
    const monthlyRows = analysis.monthly
      .map(
        (month) => `
          <tr>
            <td>${escapeHtml(month.label)}</td>
            <td>${escapeHtml(month.total)}</td>
            <td>${escapeHtml(month.onSchedule)}</td>
            <td>${escapeHtml(month.delayed)}</td>
            <td>${escapeHtml(`${month.compliancePercent}%`)}</td>
            <td>${escapeHtml(formatDays(month.averageDelayDays))}</td>
          </tr>
        `
      )
      .join("");
    const carrierRows = analysis.byCarrier
      .slice(0, 12)
      .map(
        (group) => `
          <tr>
            <td>${escapeHtml(group.name)}</td>
            <td>${escapeHtml(group.total)}</td>
            <td>${escapeHtml(group.onSchedule)}</td>
            <td>${escapeHtml(group.delayed)}</td>
            <td>${escapeHtml(`${group.compliancePercent}%`)}</td>
            <td>${escapeHtml(formatDays(group.averageDelayDays))}</td>
          </tr>
        `
      )
      .join("");
    const reportTitle = exportFileBase(reference);

    reportWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(reportTitle)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
            h1 { margin: 0; font-size: 22px; }
            h2 { margin: 20px 0 8px; font-size: 15px; }
            .meta { margin: 5px 0 14px; color: #475569; font-size: 10px; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
            .kpi strong { display: block; margin-top: 5px; font-size: 19px; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; }
            th { background: #0f172a; color: white; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 5px; }
            tbody tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Rendimiento y puntualidad de expediciones</h1>
          <div class="meta">
            ${escapeHtml(reference)} · Generado ${escapeHtml(new Date().toLocaleString("es-ES"))}
          </div>
          <div class="kpis">
            <div class="kpi">Evaluadas<strong>${analysis.summary.evaluated}</strong></div>
            <div class="kpi">Cumplimiento<strong>${analysis.summary.compliancePercent}%</strong></div>
            <div class="kpi">Puntuales<strong>${analysis.summary.punctual}</strong></div>
            <div class="kpi">Adelantadas<strong>${analysis.summary.early}</strong></div>
            <div class="kpi">Retrasadas<strong>${analysis.summary.delayed}</strong></div>
          </div>
          <h2>Evolución mensual</h2>
          <table>
            <thead>
              <tr><th>Mes</th><th>Exp.</th><th>En plazo</th><th>Retrasadas</th><th>Cumplimiento</th><th>Retraso medio</th></tr>
            </thead>
            <tbody>${monthlyRows}</tbody>
          </table>
          <h2>Rendimiento por transportista</h2>
          <table>
            <thead>
              <tr><th>Transportista</th><th>Exp.</th><th>En plazo</th><th>Retrasadas</th><th>Cumplimiento</th><th>Retraso medio</th></tr>
            </thead>
            <tbody>${carrierRows}</tbody>
          </table>
          <h2>Expediciones retrasadas</h2>
          <table>
            <thead>
              <tr><th>Camión</th><th>Prevista</th><th>Real</th><th>Cliente</th><th>Transportista</th><th>Retraso</th></tr>
            </thead>
            <tbody>${delayedRows || '<tr><td colspan="6">No hay expediciones retrasadas.</td></tr>'}</tbody>
          </table>
          <script>
            window.addEventListener("load", () => {
              window.setTimeout(() => window.print(), 250);
            });
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10200] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expedition-performance-title"
    >
      <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-[104rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.27
            </p>
            <h2
              id="expedition-performance-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Rendimiento y puntualidad de expediciones
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cumplimiento de fechas por cliente, destino y transportista.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenForecast && (
              <button
                type="button"
                onClick={openForecast}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700"
              >
                <Gauge size={18} />
                Previsión
              </button>
            )}
            <button
              type="button"
              onClick={openArchive}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-800"
            >
              <Archive size={18} />
              Archivo
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-black text-white shadow-sm hover:bg-red-700"
            >
              <Printer size={18} />
              PDF
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm hover:bg-emerald-700"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>
            <button
              type="button"
              onClick={loadPerformance}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
              Actualizar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-slate-200"
              aria-label="Cerrar rendimiento"
            >
              <X size={23} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Desde (fecha real)
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Hasta (fecha real)
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Cliente
                </span>
                <select
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">Todos los clientes</option>
                  {filterOptions.customers.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Transportista
                </span>
                <select
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">Todos los transportistas</option>
                  {filterOptions.carriers.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Destino
                </span>
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">Todos los destinos</option>
                  {filterOptions.destinations.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">
                En plazo = fecha real igual o anterior a la prevista.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Limpiar filtros
              </button>
            </div>
          </section>

          {loading ? (
            <div className="mt-4 flex min-h-72 items-center justify-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm font-black text-slate-600">
              <RefreshCw size={22} className="animate-spin text-blue-600" />
              Calculando rendimiento...
            </div>
          ) : error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : (
            <>
              {warnings.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                  {warnings.join(" ")} Los cálculos de fechas siguen disponibles.
                </div>
              )}

              {exportError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {exportError}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  icon={Gauge}
                  label="Cumplimiento"
                  value={`${analysis.summary.compliancePercent}%`}
                  detail={`${analysis.summary.onSchedule}/${analysis.summary.evaluated} expediciones en plazo`}
                  className="border-emerald-200 bg-emerald-50 text-emerald-900"
                  iconClassName="bg-emerald-100 text-emerald-700"
                />
                <KpiCard
                  icon={CalendarCheck}
                  label="Puntuales"
                  value={analysis.summary.punctual}
                  detail="Enviadas en la fecha prevista"
                  className="border-slate-200 bg-white text-slate-950"
                  iconClassName="bg-slate-100 text-slate-700"
                />
                <KpiCard
                  icon={TrendingUp}
                  label="Adelantadas"
                  value={analysis.summary.early}
                  detail="Enviadas antes de la fecha"
                  className="border-blue-200 bg-blue-50 text-blue-900"
                  iconClassName="bg-blue-100 text-blue-700"
                />
                <KpiCard
                  icon={AlarmClock}
                  label="Retrasadas"
                  value={analysis.summary.delayed}
                  detail={`Máximo: ${formatDays(analysis.summary.maximumDelayDays)}`}
                  className="border-red-200 bg-red-50 text-red-900"
                  iconClassName="bg-red-100 text-red-700"
                />
                <KpiCard
                  icon={Clock3}
                  label="Retraso medio"
                  value={formatDays(
                    analysis.summary.averageDelayDays
                  )}
                  detail={`${analysis.summary.unevaluated} cerradas sin fechas suficientes`}
                  className="border-amber-200 bg-amber-50 text-amber-950"
                  iconClassName="bg-amber-100 text-amber-800"
                />
              </div>

              <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Evolución
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Cumplimiento mensual
                    </h3>
                  </div>
                  <div className="flex gap-3 text-xs font-black">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      En plazo
                    </span>
                    <span className="flex items-center gap-1.5 text-red-700">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      Retrasadas
                    </span>
                  </div>
                </div>
                <div className="mt-5">
                  <MonthlyEvolution months={analysis.monthly} />
                </div>
              </section>

              <div className="mt-4 grid gap-4 2xl:grid-cols-2">
                <PerformanceTable
                  title="Rendimiento por transportista"
                  subtitle="Comparativa de cumplimiento de las fechas previstas."
                  rows={analysis.byCarrier}
                  firstColumnLabel="Transportista"
                />
                <PerformanceTable
                  title="Rendimiento por cliente"
                  subtitle="Expediciones y puntualidad para cada cliente."
                  rows={analysis.byCustomer}
                  firstColumnLabel="Cliente"
                />
              </div>

              <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-red-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-red-100 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
                      Seguimiento
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Expediciones retrasadas
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Ordenadas de mayor a menor retraso.
                    </p>
                  </div>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-800">
                    {analysis.delayedEntries.length} retrasadas
                  </span>
                </div>

                {analysis.delayedEntries.length ? (
                  <div className="divide-y divide-slate-200">
                    {analysis.delayedEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className="grid gap-3 p-4 sm:p-5 xl:grid-cols-[110px_170px_170px_minmax(180px,1fr)_minmax(180px,1fr)_150px] xl:items-center"
                      >
                        <div>
                          <div className="text-xs font-black uppercase text-slate-500">
                            Camión
                          </div>
                          <div className="mt-1 text-2xl font-black text-slate-950">
                            {entry.truck_number}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase text-slate-500">
                            Prevista / real
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-900">
                            {formatDate(entry.planned_expedition_date)}
                          </div>
                          <div className="mt-1 text-xs font-bold text-red-700">
                            {formatDate(entry.actual_expedition_date)}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${punctualityClass(entry)}`}
                          >
                            {punctualityLabel(entry)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase text-slate-500">
                            Cliente / destino
                          </div>
                          <div className="mt-1 truncate font-black text-slate-900">
                            {entry.customer_name || "-"}
                          </div>
                          <div className="mt-1 truncate text-xs font-bold text-slate-500">
                            {entry.destination || "-"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase text-slate-500">
                            Transportista
                          </div>
                          <div className="mt-1 truncate font-bold text-slate-900">
                            {entry.carrier_name || "-"}
                          </div>
                        </div>
                        <div className="xl:text-right">
                          <button
                            type="button"
                            onClick={() => openTruck(entry)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                          >
                            <ExternalLink size={17} />
                            Abrir camión
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-40 items-center justify-center gap-3 p-6 text-sm font-black text-emerald-700">
                    <Truck size={23} />
                    No hay expediciones retrasadas con estos filtros.
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
