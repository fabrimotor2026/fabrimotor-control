import {
  Archive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Gauge,
  History,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
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

const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos los estados" },
  { value: "PLANNED", label: "Planificado" },
  { value: "OPEN", label: "Abierto" },
  { value: "CLOSED", label: "Cerrado" },
  { value: "SHIPPED", label: "Expedido" },
];

const LOGISTICS_OPTIONS = [
  { value: "ALL", label: "Toda la logística" },
  { value: "PENDING", label: "Pendiente" },
  { value: "READY", label: "Preparado" },
  { value: "SHIPPED", label: "Expedido" },
];

const STATUS_LABELS = {
  PLANNED: "Planificado",
  OPEN: "Abierto",
  CLOSED: "Cerrado",
  SHIPPED: "Expedido",
};

const LOGISTICS_LABELS = {
  PENDING: "Pendiente",
  READY: "Preparado",
  SHIPPED: "Expedido",
};

const DOCUMENT_LABELS = {
  DELIVERY_NOTE: "Albarán",
  CMR: "CMR",
  PHOTO: "Fotografía de carga",
  OTHER: "Otro documento",
};

function formatDate(value) {
  if (!value) return "-";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : String(value);
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function entrySearchText(entry) {
  return normalizeText(
    [
      entry.reference,
      entry.truck_number,
      `camion ${entry.truck_number}`,
      entry.customer_name,
      entry.destination,
      entry.carrier_name,
      entry.tractor_plate,
      entry.vehicle_plate,
      entry.trailer_plate,
      entry.seal_number,
      entry.delivery_note_number,
      entry.notes,
      ...(entry.documents || []).map((document) => document.file_name),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function statusClasses(status) {
  if (status === "SHIPPED") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "OPEN") {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "PLANNED") {
    return "bg-violet-100 text-violet-800";
  }

  return "bg-slate-200 text-slate-700";
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

  return `${normalizedReference}_Archivo_Expediciones_${today}`;
}

function buildExportRows(entries) {
  return entries.map((entry) => ({
    Referencia: entry.reference || "F-1012",
    Camión: Number(entry.truck_number || 0),
    Estado: STATUS_LABELS[entry.archive_status] || entry.archive_status,
    "Estado logístico":
      LOGISTICS_LABELS[entry.shipment_status || "PENDING"] ||
      entry.shipment_status ||
      "Pendiente",
    "Fecha prevista": formatDate(entry.planned_expedition_date),
    "Fecha real": formatDate(entry.actual_expedition_date),
    Cliente: entry.customer_name || "",
    Destino: entry.destination || "",
    Transportista: entry.carrier_name || "",
    "Matrícula tractora":
      entry.tractor_plate || entry.vehicle_plate || "",
    "Matrícula remolque": entry.trailer_plate || "",
    "Brida / precinto": entry.seal_number || "",
    "Número de albarán": entry.delivery_note_number || "",
    Cajas: Number(entry.box_count || 0),
    Documentos: entry.documents?.length || 0,
    "Eventos de auditoría": entry.audit_events?.length || 0,
    Observaciones: entry.notes || "",
  }));
}

function ArchiveSummary({ entries }) {
  const totals = entries.reduce(
    (summary, entry) => {
      summary.total += 1;
      summary[entry.archive_status] =
        (summary[entry.archive_status] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      PLANNED: 0,
      OPEN: 0,
      CLOSED: 0,
      SHIPPED: 0,
    }
  );

  const items = [
    {
      label: "Resultados",
      value: totals.total,
      className: "border-slate-200 bg-white text-slate-950",
    },
    {
      label: "Planificados",
      value: totals.PLANNED,
      className: "border-violet-200 bg-violet-50 text-violet-800",
    },
    {
      label: "Abiertos",
      value: totals.OPEN,
      className: "border-blue-200 bg-blue-50 text-blue-800",
    },
    {
      label: "Cerrados",
      value: totals.CLOSED,
      className: "border-slate-300 bg-slate-100 text-slate-700",
    },
    {
      label: "Expedidos",
      value: totals.SHIPPED,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl border px-4 py-3 ${item.className}`}
        >
          <div className="text-2xl font-black">{item.value}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-wide">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[0.68rem] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function ExpeditionDetails({ entry }) {
  return (
    <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <section>
          <h4 className="flex items-center gap-2 font-black text-slate-950">
            <Truck size={17} />
            Datos logísticos
          </h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <DetailField
              label="Cliente"
              value={entry.customer_name}
            />
            <DetailField
              label="Destino"
              value={entry.destination}
            />
            <DetailField
              label="Transportista"
              value={entry.carrier_name}
            />
            <DetailField
              label="Tractora / remolque"
              value={[
                entry.tractor_plate || entry.vehicle_plate,
                entry.trailer_plate,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <DetailField
              label="Brida / albarán"
              value={[
                entry.seal_number,
                entry.delivery_note_number,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </div>
        </section>

        <section>
          <h4 className="flex items-center gap-2 font-black text-slate-950">
            <FileText size={17} />
            Documentación
          </h4>
          <div className="mt-3 space-y-2">
            {entry.documents?.length ? (
              entry.documents.slice(0, 8).map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="truncate text-sm font-black text-slate-900">
                    {document.file_name || "Documento"}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {DOCUMENT_LABELS[document.document_type] ||
                      document.document_type ||
                      "Documento"}
                    {" · "}
                    {formatDateTime(document.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-500">
                Sin documentos asociados.
              </div>
            )}
          </div>
        </section>

        <section>
          <h4 className="flex items-center gap-2 font-black text-slate-950">
            <History size={17} />
            Última actividad
          </h4>
          <div className="mt-3 space-y-2">
            {entry.audit_events?.length ? (
              entry.audit_events.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="text-sm font-black text-slate-900">
                    {event.event_label || "Actividad registrada"}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {event.actor_display || "Sistema"}
                    {" · "}
                    {formatDateTime(event.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-500">
                Sin eventos de auditoría.
              </div>
            )}
          </div>
        </section>
      </div>

      {entry.notes && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          <span className="font-black">Observaciones: </span>
          {entry.notes}
        </div>
      )}
    </div>
  );
}

export default function ExpeditionArchiveModal({
  reference = "F-1012",
  onOpenActualTruck,
  onOpenPlannedTruck,
  onOpenPerformance,
  onOpenForecast,
  onClose,
}) {
  const [entries, setEntries] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [logisticsFilter, setLogisticsFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedEntryKey, setExpandedEntryKey] = useState("");

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchExpeditionArchive(
        supabase,
        reference
      );
      setEntries(result.entries);
      setWarnings(result.warnings);
    } catch (loadError) {
      setEntries([]);
      setWarnings([]);
      setError(
        loadError?.message ||
          "No se ha podido cargar el archivo de expediciones."
      );
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = normalizeText(searchValue.trim());

    return entries.filter((entry) => {
      const archiveDate = entry.archive_date || "";

      if (
        normalizedSearch &&
        !entrySearchText(entry).includes(normalizedSearch)
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        entry.archive_status !== statusFilter
      ) {
        return false;
      }

      if (
        logisticsFilter !== "ALL" &&
        (entry.shipment_status || "PENDING") !== logisticsFilter
      ) {
        return false;
      }

      if (dateFrom && (!archiveDate || archiveDate < dateFrom)) {
        return false;
      }

      if (dateTo && (!archiveDate || archiveDate > dateTo)) {
        return false;
      }

      return true;
    });
  }, [
    dateFrom,
    dateTo,
    entries,
    logisticsFilter,
    searchValue,
    statusFilter,
  ]);

  const clearFilters = () => {
    setSearchValue("");
    setStatusFilter("ALL");
    setLogisticsFilter("ALL");
    setDateFrom("");
    setDateTo("");
  };

  const exportExcel = async () => {
    setExportError("");

    if (!filteredEntries.length) {
      setExportError("No hay expediciones que exportar.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(
        buildExportRows(filteredEntries)
      );

      worksheet["!cols"] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 24 },
        { wch: 24 },
        { wch: 24 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 40 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Expediciones"
      );
      XLSX.writeFile(
        workbook,
        `${exportFileBase(reference)}.xlsx`
      );
    } catch (exportFailure) {
      console.error("Error exportando el archivo Excel:", exportFailure);
      setExportError(
        "No se ha podido generar el archivo Excel."
      );
    }
  };

  const exportPdf = () => {
    setExportError("");

    if (!filteredEntries.length) {
      setExportError("No hay expediciones que exportar.");
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

    const rows = buildExportRows(filteredEntries)
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.Camión)}</td>
            <td>${escapeHtml(row.Estado)}</td>
            <td>${escapeHtml(row["Estado logístico"])}</td>
            <td>${escapeHtml(row["Fecha prevista"])}</td>
            <td>${escapeHtml(row["Fecha real"])}</td>
            <td>${escapeHtml(row.Cliente)}</td>
            <td>${escapeHtml(row.Destino)}</td>
            <td>${escapeHtml(row.Transportista)}</td>
            <td>${escapeHtml(row["Matrícula tractora"])}</td>
            <td>${escapeHtml(row["Matrícula remolque"])}</td>
            <td>${escapeHtml(row["Brida / precinto"])}</td>
            <td>${escapeHtml(row["Número de albarán"])}</td>
            <td>${escapeHtml(row.Cajas)}</td>
            <td>${escapeHtml(row.Documentos)}</td>
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
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 6px 0 16px; color: #475569; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; }
            th { background: #0f172a; color: white; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 5px; vertical-align: top; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .meta { display: flex; justify-content: space-between; gap: 20px; }
          </style>
        </head>
        <body>
          <div class="meta">
            <div>
              <h1>Archivo histórico de expediciones</h1>
              <p>${escapeHtml(reference)} · ${filteredEntries.length} resultados · Generado ${escapeHtml(new Date().toLocaleString("es-ES"))}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Camión</th>
                <th>Estado</th>
                <th>Logística</th>
                <th>Prevista</th>
                <th>Real</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Transportista</th>
                <th>Tractora</th>
                <th>Remolque</th>
                <th>Brida</th>
                <th>Albarán</th>
                <th>Cajas</th>
                <th>Docs.</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
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

  const openEntry = async (entry) => {
    if (entry.archive_kind === "PLANNED") {
      onClose?.();
      window.setTimeout(
        () => onOpenPlannedTruck?.(entry),
        50
      );
      return;
    }

    onClose?.();
    window.setTimeout(
      () => onOpenActualTruck?.(entry),
      50
    );
  };

  const openPerformance = () => {
    onClose?.();
    window.setTimeout(() => onOpenPerformance?.(), 50);
  };

  const openForecast = () => {
    onClose?.();
    window.setTimeout(() => onOpenForecast?.(), 50);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10100] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expedition-archive-title"
    >
      <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-[104rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.26
            </p>
            <h2
              id="expedition-archive-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Archivo histórico de expediciones
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Consulta global de camiones, cajas, documentos y auditoría.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenForecast && (
              <button
                type="button"
                onClick={openForecast}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                <Gauge size={18} />
                Previsión
              </button>
            )}
            {onOpenPerformance && (
              <button
                type="button"
                onClick={openPerformance}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm transition hover:bg-slate-800"
              >
                <TrendingUp size={18} />
                Rendimiento
              </button>
            )}
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-black text-white shadow-sm transition hover:bg-red-700"
            >
              <Printer size={18} />
              PDF
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>
            <button
              type="button"
              onClick={loadArchive}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
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
              className="rounded-xl bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200"
              aria-label="Cerrar archivo histórico"
            >
              <X size={23} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.6fr)_repeat(4,minmax(150px,1fr))]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Buscar
                </span>
                <Search
                  size={18}
                  className="absolute bottom-3.5 left-4 text-blue-600"
                />
                <input
                  value={searchValue}
                  onChange={(event) =>
                    setSearchValue(event.target.value)
                  }
                  placeholder="Camión, cliente, matrícula, brida, albarán..."
                  className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Estado
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Logística
                </span>
                <select
                  value={logisticsFilter}
                  onChange={(event) =>
                    setLogisticsFilter(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {LOGISTICS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Desde
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
                  Hasta
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">
                La fecha filtra por fecha real; si no existe, utiliza la prevista.
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

          <div className="mt-4">
            <ArchiveSummary entries={filteredEntries} />
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              {warnings.join(" ")} El listado principal sigue disponible.
            </div>
          )}

          {exportError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {exportError}
            </div>
          )}

          <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Expediciones
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {filteredEntries.length} resultados
                </h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                Solo consulta
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-black text-slate-600">
                <RefreshCw size={22} className="animate-spin text-blue-600" />
                Cargando archivo histórico...
              </div>
            ) : error ? (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : filteredEntries.length ? (
              <div className="divide-y divide-slate-200">
                {filteredEntries.map((entry) => {
                  const entryKey = `${entry.archive_kind}-${entry.id}`;
                  const isExpanded =
                    expandedEntryKey === entryKey;

                  return (
                    <article key={entryKey}>
                      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[120px_150px_170px_minmax(160px,1fr)_minmax(160px,1fr)_150px_210px] xl:items-center">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Camión
                          </div>
                          <div className="mt-1 text-2xl font-black text-slate-950">
                            {entry.truck_number}
                          </div>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${statusClasses(entry.archive_status)}`}
                          >
                            {STATUS_LABELS[entry.archive_status] ||
                              entry.archive_status}
                          </span>
                          <div className="mt-2 text-xs font-bold text-slate-500">
                            {LOGISTICS_LABELS[
                              entry.shipment_status || "PENDING"
                            ] || "Pendiente"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Expedición
                          </div>
                          <div className="mt-1 font-black text-slate-900">
                            {formatDate(entry.archive_date)}
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            {entry.actual_expedition_date
                              ? "Fecha real"
                              : "Fecha prevista"}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
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
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Transportista
                          </div>
                          <div className="mt-1 truncate font-bold text-slate-900">
                            {entry.carrier_name || "-"}
                          </div>
                          <div className="mt-1 truncate text-xs font-bold text-slate-500">
                            {entry.tractor_plate ||
                              entry.vehicle_plate ||
                              "Sin matrícula"}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:block">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                            <PackageCheck size={14} />
                            {entry.box_count || 0} cajas
                          </div>
                          <div className="mt-0 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-800 xl:mt-2">
                            <FileText size={14} />
                            {entry.documents?.length || 0} docs.
                          </div>
                          <div className="mt-0 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 xl:mt-2">
                            <History size={14} />
                            {entry.audit_events?.length || 0} eventos
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEntryKey(
                                isExpanded ? "" : entryKey
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                          >
                            {isExpanded ? (
                              <ChevronUp size={17} />
                            ) : (
                              <ChevronDown size={17} />
                            )}
                            Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => openEntry(entry)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800"
                          >
                            <ExternalLink size={17} />
                            {entry.archive_kind === "PLANNED"
                              ? "Planificación"
                              : "Abrir camión"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <ExpeditionDetails entry={entry} />
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <Archive size={42} className="text-slate-300" />
                <h4 className="mt-3 text-lg font-black text-slate-800">
                  No hay expediciones con estos filtros
                </h4>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>,
    document.body
  );
}
