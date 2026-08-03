import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Gauge,
  Printer,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  buildExpeditionForecast,
  fetchForecastTruckLabels,
} from "../../../services/expeditionForecast";
import {
  buildCalendarPeriod,
  buildCapacityCalendar,
  calendarExportFileBase,
  CALENDAR_VIEW_MODES,
  fetchExpeditionCalendarData,
  shiftCalendarAnchor,
  toLocalIsoDate,
} from "../../../services/expeditionCapacity";

const STATUS_PRESENTATION = {
  PLANNED: {
    label: "Planificado",
    className: "bg-blue-100 text-blue-800",
  },
  OPEN: {
    label: "Activo",
    className: "bg-emerald-100 text-emerald-800",
  },
  CLOSED: {
    label: "Cerrado",
    className: "bg-slate-200 text-slate-700",
  },
  SHIPPED: {
    label: "Expedido",
    className: "bg-teal-100 text-teal-800",
  },
};

const RISK_PRESENTATION = {
  ON_TRACK: {
    label: "En plazo",
    className: "text-emerald-700",
  },
  AT_RISK: {
    label: "En riesgo",
    className: "text-amber-700",
  },
  DELAYED: {
    label: "Retraso previsto",
    className: "text-red-700",
  },
  NO_DATA: {
    label: "Sin ritmo suficiente",
    className: "text-slate-500",
  },
  INSUFFICIENT_DATA: {
    label: "Datos insuficientes",
    className: "text-slate-500",
  },
  NO_DEADLINE: {
    label: "Sin fecha prevista",
    className: "text-amber-700",
  },
  COMPLETE: {
    label: "Completado",
    className: "text-emerald-700",
  },
};

const CAPACITY_PRESENTATION = {
  OVERLOAD: {
    label: "Sobrecarga",
    badge: "bg-red-100 text-red-800",
    border: "border-red-300 bg-red-50/50",
  },
  TIGHT: {
    label: "Capacidad ajustada",
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-300 bg-amber-50/50",
  },
  AVAILABLE: {
    label: "Disponible",
    badge: "bg-emerald-100 text-emerald-800",
    border: "border-slate-200 bg-white",
  },
  NO_DATA: {
    label: "Sin ritmo suficiente",
    badge: "bg-blue-100 text-blue-800",
    border: "border-blue-200 bg-blue-50/40",
  },
  EMPTY: {
    label: "Sin carga prevista",
    badge: "bg-slate-100 text-slate-600",
    border: "border-slate-200 bg-white",
  },
};

function formatDate(value) {
  if (!value) return "-";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : String(value);
}

function formatDateTime(value) {
  if (!value) return "Pendiente";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return "-";

  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function KpiCard({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {detail}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone] || tones.slate}`}>
          <Icon size={21} />
        </span>
      </div>
    </article>
  );
}

function TruckCard({ entry, onOpen }) {
  const status =
    STATUS_PRESENTATION[entry.status] ||
    STATUS_PRESENTATION.CLOSED;
  const risk =
    RISK_PRESENTATION[entry.risk] ||
    RISK_PRESENTATION.NO_DATA;

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
      title={`Abrir camión ${entry.truckNumber}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-slate-950">
          Camión {entry.truckNumber}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${status.className}`}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-1 truncate text-xs font-bold text-slate-600">
        {entry.customer || "Cliente pendiente"}
        {entry.destination ? ` · ${entry.destination}` : ""}
      </p>
      {(entry.status === "OPEN" ||
        entry.status === "PLANNED") && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, entry.progressPercent || 0)
                )}%`,
              }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-bold">
            <span className="text-slate-500">
              {entry.progressPercent || 0}% cargado
            </span>
            <span className={risk.className}>{risk.label}</span>
          </div>
          <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
            Prevista {formatDate(entry.plannedDate)}
            {" · "}
            Fin estimado {formatDateTime(entry.estimatedCompletionAt)}
          </p>
        </>
      )}
      {entry.carrier && (
        <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
          {entry.carrier}
        </p>
      )}
    </button>
  );
}

function DailyCapacityTable({ days }) {
  const rows = days.filter(
    (day) => day.entries.length || day.demandBoxes
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
        No hay expediciones en el periodo seleccionado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs font-black uppercase text-slate-600">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Camiones</th>
            <th className="px-4 py-3 text-right">Necesidad</th>
            <th className="px-4 py-3 text-right">Capacidad/día</th>
            <th className="px-4 py-3 text-right">Ocupación</th>
            <th className="px-4 py-3">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((day) => {
            const presentation =
              CAPACITY_PRESENTATION[day.capacityStatus] ||
              CAPACITY_PRESENTATION.NO_DATA;

            return (
              <tr key={day.date}>
                <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">
                  {formatDate(day.date)}
                </td>
                <td className="px-4 py-3 font-bold text-slate-600">
                  {day.entries
                    .map((entry) => entry.truckNumber)
                    .join(", ") || "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-black">
                  {day.demandBoxes} cajas
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-600">
                  {day.boxesPerDay
                    ? `${formatNumber(day.boxesPerDay, 1)} cajas`
                    : "Sin datos"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-black">
                  {day.loadPercent === null
                    ? "-"
                    : `${day.loadPercent}%`}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase ${presentation.badge}`}
                  >
                    {presentation.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ExpeditionCalendarModal({
  reference = "F-1012",
  activeTruck = null,
  targetBoxes = 49,
  piecesPerBox = 16,
  onOpenActualTruck,
  onOpenPlannedTruck,
  onOpenForecast,
  onOpenSimulation,
  onClose,
}) {
  const [actualTrucks, setActualTrucks] = useState([]);
  const [plannedTrucks, setPlannedTrucks] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [viewMode, setViewMode] = useState(
    CALENDAR_VIEW_MODES.MONTH
  );
  const [anchorDate, setAnchorDate] = useState(
    toLocalIsoDate(new Date())
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [carrierFilter, setCarrierFilter] = useState("ALL");
  const [nowMs, setNowMs] = useState(Date.now());

  const loadCalendar = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [calendarData, activeLabels] = await Promise.all([
          fetchExpeditionCalendarData(supabase, reference),
          activeTruck?.id
            ? fetchForecastTruckLabels(supabase, activeTruck.id)
            : Promise.resolve([]),
        ]);

        setActualTrucks(calendarData.actualTrucks);
        setPlannedTrucks(calendarData.plannedTrucks);
        setLabels(activeLabels);
        setNowMs(Date.now());
      } catch (loadError) {
        setError(
          loadError?.message ||
            "No se ha podido cargar el calendario de expediciones."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTruck?.id, reference]
  );

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    const channel = supabase
      .channel(`expedition-calendar-v230-${reference}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_trucks",
        },
        () => loadCalendar({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_schedule",
        },
        () => loadCalendar({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
        },
        () => loadCalendar({ silent: true })
      )
      .subscribe();
    const fallbackTimer = window.setInterval(() => {
      loadCalendar({ silent: true });
    }, 60_000);

    return () => {
      window.clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [loadCalendar, reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const period = useMemo(
    () =>
      buildCalendarPeriod({
        anchorDate,
        viewMode,
      }),
    [anchorDate, viewMode]
  );

  const currentActiveTruck = useMemo(
    () =>
      actualTrucks.find(
        (truck) =>
          String(truck?.id || "") ===
          String(activeTruck?.id || "")
      ) ||
      activeTruck ||
      null,
    [activeTruck, actualTrucks]
  );

  const forecast = useMemo(
    () =>
      buildExpeditionForecast({
        activeTruck: currentActiveTruck,
        labels,
        targetBoxes,
        piecesPerBox,
        nowMs,
      }),
    [
      currentActiveTruck,
      labels,
      nowMs,
      piecesPerBox,
      targetBoxes,
    ]
  );

  const calendar = useMemo(
    () =>
      buildCapacityCalendar({
        actualTrucks,
        plannedTrucks,
        activeTruck: currentActiveTruck,
        forecast,
        targetBoxes,
        piecesPerBox,
        period,
        nowMs,
      }),
    [
      actualTrucks,
      currentActiveTruck,
      forecast,
      nowMs,
      period,
      piecesPerBox,
      plannedTrucks,
      targetBoxes,
    ]
  );

  const customers = useMemo(
    () =>
      [
        ...new Set(
          calendar.entries
            .map((entry) => entry.customer)
            .filter(Boolean)
        ),
      ].sort((first, second) =>
        first.localeCompare(second, "es")
      ),
    [calendar.entries]
  );

  const carriers = useMemo(
    () =>
      [
        ...new Set(
          calendar.entries
            .map((entry) => entry.carrier)
            .filter(Boolean)
        ),
      ].sort((first, second) =>
        first.localeCompare(second, "es")
      ),
    [calendar.entries]
  );

  const matchesFilters = useCallback(
    (entry) => {
      const normalizedSearch = search.trim().toLowerCase();
      const searchText = [
        entry.truckNumber,
        entry.customer,
        entry.destination,
        entry.carrier,
        entry.tractorPlate,
        entry.trailerPlate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedSearch ||
          searchText.includes(normalizedSearch)) &&
        (statusFilter === "ALL" ||
          entry.status === statusFilter) &&
        (customerFilter === "ALL" ||
          entry.customer === customerFilter) &&
        (carrierFilter === "ALL" ||
          entry.carrier === carrierFilter)
      );
    },
    [carrierFilter, customerFilter, search, statusFilter]
  );

  const visibleFilteredEntries = useMemo(
    () => calendar.visibleEntries.filter(matchesFilters),
    [calendar.visibleEntries, matchesFilters]
  );

  const filteredEntryKeys = useMemo(
    () =>
      new Set(
        visibleFilteredEntries.map((entry) => entry.key)
      ),
    [visibleFilteredEntries]
  );

  const calendarDays = useMemo(
    () =>
      calendar.days.map((day) => ({
        ...day,
        filteredEntries: day.entries.filter((entry) =>
          filteredEntryKeys.has(entry.key)
        ),
      })),
    [calendar.days, filteredEntryKeys]
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCustomerFilter("ALL");
    setCarrierFilter("ALL");
  };

  const handleOpenEntry = (entry) => {
    onClose?.();

    window.setTimeout(() => {
      if (entry.source === "ACTUAL") {
        onOpenActualTruck?.(entry.raw);
      } else {
        onOpenPlannedTruck?.(entry.raw);
      }
    }, 80);
  };

  const handlePrint = () => {
    setExportError("");
    const popup = window.open("", "_blank");

    if (!popup) {
      setExportError(
        "El navegador ha bloqueado la ventana del PDF. Permite ventanas emergentes y vuelve a intentarlo."
      );
      return;
    }

    const entryRows = visibleFilteredEntries
      .map((entry) => {
        const status =
          STATUS_PRESENTATION[entry.status]?.label ||
          entry.status;
        const risk =
          RISK_PRESENTATION[entry.risk]?.label ||
          entry.risk;

        return `<tr>
          <td>${escapeHtml(formatDate(entry.calendarDate))}</td>
          <td>Camión ${escapeHtml(entry.truckNumber)}</td>
          <td>${escapeHtml(status)}</td>
          <td>${escapeHtml(entry.customer || "-")}</td>
          <td>${escapeHtml(entry.destination || "-")}</td>
          <td>${escapeHtml(entry.carrier || "-")}</td>
          <td>${escapeHtml(`${entry.progressPercent || 0}%`)}</td>
          <td>${escapeHtml(risk)}</td>
          <td>${escapeHtml(formatDateTime(entry.estimatedCompletionAt))}</td>
        </tr>`;
      })
      .join("");
    const capacityRows = calendar.days
      .filter((day) => day.entries.length || day.demandBoxes)
      .map((day) => {
        const presentation =
          CAPACITY_PRESENTATION[day.capacityStatus] ||
          CAPACITY_PRESENTATION.NO_DATA;

        return `<tr>
          <td>${escapeHtml(formatDate(day.date))}</td>
          <td>${escapeHtml(
            day.entries
              .map((entry) => `Camión ${entry.truckNumber}`)
              .join(", ") || "-"
          )}</td>
          <td>${day.demandBoxes}</td>
          <td>${escapeHtml(
            day.boxesPerDay
              ? formatNumber(day.boxesPerDay, 1)
              : "Sin datos"
          )}</td>
          <td>${escapeHtml(
            day.loadPercent === null ? "-" : `${day.loadPercent}%`
          )}</td>
          <td>${escapeHtml(presentation.label)}</td>
        </tr>`;
      })
      .join("");
    const fileName = calendarExportFileBase({
      reference,
      period,
    });

    popup.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(fileName)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            h2 { margin: 20px 0 8px; font-size: 16px; }
            .meta { color: #475569; font-size: 11px; margin-bottom: 14px; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px; }
            .kpi strong { display: block; margin-top: 4px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; }
            th { background: #e2e8f0; text-transform: uppercase; }
            .note { margin-top: 12px; color: #475569; font-size: 9px; }
          </style>
        </head>
        <body>
          <h1>Calendario y capacidad de expediciones</h1>
          <div class="meta">${escapeHtml(reference)} · ${escapeHtml(
            period.title
          )} · Generado ${escapeHtml(
            new Date().toLocaleString("es-ES")
          )}</div>
          <div class="kpis">
            <div class="kpi">Expediciones<strong>${visibleFilteredEntries.length}</strong></div>
            <div class="kpi">Capacidad diaria<strong>${
              calendar.boxesPerDay
                ? `${formatNumber(calendar.boxesPerDay, 1)} cajas`
                : "Sin datos"
            }</strong></div>
            <div class="kpi">Piezas/día<strong>${
              calendar.piecesPerDay
                ? formatNumber(calendar.piecesPerDay)
                : "-"
            }</strong></div>
            <div class="kpi">Días sobrecargados<strong>${
              calendar.summary.overloadDays
            }</strong></div>
            <div class="kpi">En riesgo/retraso<strong>${
              calendar.summary.atRisk
            }</strong></div>
          </div>
          <h2>Expediciones del periodo</h2>
          <table>
            <thead><tr><th>Fecha</th><th>Camión</th><th>Estado</th><th>Cliente</th><th>Destino</th><th>Transportista</th><th>Carga</th><th>Riesgo</th><th>Fin estimado</th></tr></thead>
            <tbody>${entryRows || '<tr><td colspan="9">Sin expediciones</td></tr>'}</tbody>
          </table>
          <h2>Capacidad diaria</h2>
          <table>
            <thead><tr><th>Fecha</th><th>Camiones</th><th>Cajas necesarias</th><th>Capacidad</th><th>Ocupación</th><th>Resultado</th></tr></thead>
            <tbody>${capacityRows || '<tr><td colspan="6">Sin demanda prevista</td></tr>'}</tbody>
          </table>
          <p class="note">Capacidad calculada a 24 horas con el ritmo reciente de las últimas cajas del camión activo. Los camiones cerrados o expedidos se muestran, pero no consumen capacidad futura.</p>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>`);
    popup.document.close();
  };

  const handleExcel = async () => {
    setExportError("");

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summaryRows = [
        ["FM Control", "V2.30"],
        ["Referencia", reference],
        ["Periodo", period.title],
        ["Expediciones visibles", visibleFilteredEntries.length],
        ["Capacidad estimada (cajas/día)", calendar.boxesPerDay || ""],
        ["Capacidad estimada (piezas/día)", calendar.piecesPerDay || ""],
        ["Días sobrecargados", calendar.summary.overloadDays],
        ["Días ajustados", calendar.summary.tightDays],
        ["Expediciones en riesgo/retraso", calendar.summary.atRisk],
        ["Ritmo reciente (cajas/h)", calendar.rate || ""],
      ];
      const expeditionRows = visibleFilteredEntries.map((entry) => ({
        Fecha: formatDate(entry.calendarDate),
        Camión: entry.truckNumber,
        Estado:
          STATUS_PRESENTATION[entry.status]?.label ||
          entry.status,
        Cliente: entry.customer,
        Destino: entry.destination,
        Transportista: entry.carrier,
        "Matrícula tractora": entry.tractorPlate,
        "Matrícula remolque": entry.trailerPlate,
        "Carga (%)": entry.progressPercent,
        "Cajas completadas": entry.completedBoxes,
        "Cajas pendientes": entry.remainingBoxes,
        Riesgo:
          RISK_PRESENTATION[entry.risk]?.label ||
          entry.risk,
        "Final estimado": formatDateTime(
          entry.estimatedCompletionAt
        ),
      }));
      const capacityRows = calendar.days
        .filter((day) => day.entries.length || day.demandBoxes)
        .map((day) => ({
          Fecha: formatDate(day.date),
          Camiones: day.entries
            .map((entry) => entry.truckNumber)
            .join(", "),
          "Camiones pendientes": day.pendingTrucks,
          "Cajas necesarias": day.demandBoxes,
          "Piezas necesarias": day.demandPieces,
          "Capacidad cajas/día": day.boxesPerDay || "",
          "Capacidad piezas/día": day.piecesPerDay || "",
          "Ocupación (%)":
            day.loadPercent === null ? "" : day.loadPercent,
          Resultado:
            CAPACITY_PRESENTATION[day.capacityStatus]?.label ||
            day.capacityStatus,
        }));

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(summaryRows),
        "Resumen"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(expeditionRows),
        "Calendario"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(capacityRows),
        "Capacidad diaria"
      );
      XLSX.writeFile(
        workbook,
        `${calendarExportFileBase({ reference, period })}.xlsx`
      );
    } catch (excelError) {
      setExportError(
        excelError?.message ||
          "No se ha podido generar el archivo Excel."
      );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div
        className="flex max-h-[calc(100vh-1rem)] w-full max-w-[98rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expedition-calendar-title"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.30
            </p>
            <h2
              id="expedition-calendar-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Calendario y capacidad de expediciones
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Planificación, carga estimada y riesgo diario de {reference}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenSimulation}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-violet-700"
            >
              Simular plan
            </button>
            <button
              type="button"
              onClick={onOpenForecast}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              Previsión
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-red-700"
            >
              <Printer size={18} />
              PDF
            </button>
            <button
              type="button"
              onClick={handleExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>
            <button
              type="button"
              onClick={() => loadCalendar({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              Actualizar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-slate-200"
              aria-label="Cerrar calendario"
            >
              <X size={23} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
              {error}
            </div>
          )}
          {exportError && (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">
              {exportError}
            </div>
          )}

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAnchorDate(
                      shiftCalendarAnchor(
                        anchorDate,
                        viewMode,
                        -1
                      )
                    )
                  }
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50"
                  aria-label="Periodo anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAnchorDate(toLocalIsoDate(new Date()))
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAnchorDate(
                      shiftCalendarAnchor(
                        anchorDate,
                        viewMode,
                        1
                      )
                    )
                  }
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50"
                  aria-label="Periodo siguiente"
                >
                  <ChevronRight size={20} />
                </button>
                <h3 className="ml-2 text-xl font-black capitalize text-slate-950">
                  {period.title}
                </h3>
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1">
                {[
                  [CALENDAR_VIEW_MODES.MONTH, "Mes"],
                  [CALENDAR_VIEW_MODES.WEEK, "Semana"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value)}
                    className={`rounded-lg px-4 py-2 text-sm font-black ${
                      viewMode === value
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_repeat(3,minmax(0,0.75fr))_auto]">
              <label className="relative">
                <span className="sr-only">Buscar expedición</span>
                <Search
                  size={18}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar camión, cliente, destino o matrícula..."
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PLANNED">Planificados</option>
                <option value="OPEN">Activos</option>
                <option value="CLOSED">Cerrados</option>
                <option value="SHIPPED">Expedidos</option>
              </select>
              <select
                value={customerFilter}
                onChange={(event) =>
                  setCustomerFilter(event.target.value)
                }
                className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos los clientes</option>
                {customers.map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
              <select
                value={carrierFilter}
                onChange={(event) =>
                  setCarrierFilter(event.target.value)
                }
                className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
              >
                <option value="ALL">Transportistas</option>
                {carriers.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800"
              >
                Limpiar
              </button>
            </div>
          </section>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              icon={Truck}
              label="Expediciones"
              value={visibleFilteredEntries.length}
              detail={`${calendar.summary.planned} planificadas · ${calendar.summary.active} activas`}
              tone="blue"
            />
            <KpiCard
              icon={Gauge}
              label="Capacidad diaria"
              value={
                calendar.boxesPerDay
                  ? `${formatNumber(calendar.boxesPerDay, 1)} cajas`
                  : "Sin datos"
              }
              detail={
                calendar.rate
                  ? `${formatNumber(calendar.rate, 2)} cajas/h · jornada 24 h`
                  : "Se necesitan 3 cajas recientes"
              }
              tone="emerald"
            />
            <KpiCard
              icon={Boxes}
              label="Piezas/día"
              value={
                calendar.piecesPerDay
                  ? formatNumber(calendar.piecesPerDay)
                  : "-"
              }
              detail={`${piecesPerBox} piezas por caja`}
              tone="slate"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Días sobrecargados"
              value={calendar.summary.overloadDays}
              detail={`${calendar.summary.tightDays} días con capacidad ajustada`}
              tone={
                calendar.summary.overloadDays ? "red" : "emerald"
              }
            />
            <KpiCard
              icon={CalendarDays}
              label="En riesgo"
              value={calendar.summary.atRisk}
              detail="Expediciones en riesgo o retraso previsto"
              tone={calendar.summary.atRisk ? "amber" : "emerald"}
            />
          </div>

          <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex flex-wrap gap-2 text-xs font-black">
                {Object.entries(STATUS_PRESENTATION).map(
                  ([value, presentation]) => (
                    <span
                      key={value}
                      className={`rounded-full px-3 py-1 ${presentation.className}`}
                    >
                      {presentation.label}
                    </span>
                  )
                )}
              </div>
              <p className="text-xs font-bold text-slate-500">
                La capacidad utiliza el ritmo reciente durante una jornada de 24 horas.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[28rem] items-center justify-center">
                <RefreshCw
                  size={34}
                  className="animate-spin text-blue-600"
                />
              </div>
            ) : (
              <div className="overflow-x-auto p-3">
                <div className="min-w-[76rem]">
                  <div className="grid grid-cols-7 border-b border-slate-200">
                    {[
                      "Lunes",
                      "Martes",
                      "Miércoles",
                      "Jueves",
                      "Viernes",
                      "Sábado",
                      "Domingo",
                    ].map((dayName) => (
                      <div
                        key={dayName}
                        className="px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-500"
                      >
                        {dayName}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day) => {
                      const capacity =
                        CAPACITY_PRESENTATION[
                          day.capacityStatus
                        ] || CAPACITY_PRESENTATION.NO_DATA;
                      const extraEntries = Math.max(
                        0,
                        day.filteredEntries.length - 3
                      );

                      return (
                        <article
                          key={day.date}
                          className={`min-h-[13.5rem] border-b border-r p-2.5 ${
                            capacity.border
                          } ${
                            !day.isCurrentMonth &&
                            viewMode === CALENDAR_VIEW_MODES.MONTH
                              ? "opacity-45"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black ${
                                  day.isToday
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-700"
                                }`}
                              >
                                {day.dateObject.getDate()}
                              </span>
                              {day.demandBoxes > 0 && (
                                <p className="mt-1 text-[11px] font-black text-slate-600">
                                  {day.demandBoxes}
                                  {day.boxesPerDay
                                    ? ` / ${formatNumber(
                                        day.boxesPerDay,
                                        1
                                      )}`
                                    : ""}{" "}
                                  cajas
                                </p>
                              )}
                            </div>
                            <span
                              className={`max-w-[8rem] rounded-full px-2 py-1 text-right text-[9px] font-black uppercase ${capacity.badge}`}
                            >
                              {capacity.label}
                            </span>
                          </div>

                          <div className="mt-2 space-y-2">
                            {day.filteredEntries
                              .slice(0, 3)
                              .map((entry) => (
                                <TruckCard
                                  key={entry.key}
                                  entry={entry}
                                  onOpen={handleOpenEntry}
                                />
                              ))}
                            {extraEntries > 0 && (
                              <p className="rounded-lg bg-slate-100 px-2 py-1 text-center text-xs font-black text-slate-600">
                                +{extraEntries} expediciones
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                  Capacidad diaria
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Demanda frente al ritmo de producción
                </h3>
              </div>
              <p className="text-xs font-bold text-slate-500">
                Los camiones cerrados o expedidos no consumen capacidad futura.
              </p>
            </div>
            <DailyCapacityTable days={calendar.days} />
          </section>
        </div>
      </div>
    </div>,
    window.document.body
  );
}
