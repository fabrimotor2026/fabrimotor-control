import {
  Activity,
  AlertTriangle,
  Archive,
  Boxes,
  Clock3,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
  PackageCheck,
  Printer,
  RefreshCw,
  TrendingUp,
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
  FORECAST_MINIMUM_SAMPLE,
  FORECAST_SAMPLE_SIZE,
} from "../../../services/expeditionForecast";

const RISK_PRESENTATION = {
  ON_TRACK: {
    label: "En plazo",
    description:
      "El ritmo reciente permite terminar la carga antes de la expedición prevista.",
    panel: "border-emerald-200 bg-emerald-50 text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800",
    accent: "bg-emerald-500",
  },
  AT_RISK: {
    label: "En riesgo",
    description:
      "La previsión conserva poco margen. Conviene vigilar el ritmo de carga.",
    panel: "border-amber-300 bg-amber-50 text-amber-950",
    badge: "bg-amber-100 text-amber-800",
    accent: "bg-amber-500",
  },
  DELAYED: {
    label: "Retraso previsto",
    description:
      "Con el ritmo actual, la carga terminaría después de la fecha prevista.",
    panel: "border-red-300 bg-red-50 text-red-950",
    badge: "bg-red-100 text-red-800",
    accent: "bg-red-500",
  },
  INSUFFICIENT_DATA: {
    label: "Datos insuficientes",
    description: `Se necesitan al menos ${FORECAST_MINIMUM_SAMPLE} cajas con horas válidas para calcular una previsión.`,
    panel: "border-blue-200 bg-blue-50 text-blue-950",
    badge: "bg-blue-100 text-blue-800",
    accent: "bg-blue-500",
  },
  NO_DEADLINE: {
    label: "Sin fecha prevista",
    description:
      "Añade la fecha prevista de expedición para poder evaluar el riesgo.",
    panel: "border-amber-300 bg-amber-50 text-amber-950",
    badge: "bg-amber-100 text-amber-800",
    accent: "bg-amber-500",
  },
  COMPLETE: {
    label: "Carga completa",
    description:
      "El camión ha alcanzado el objetivo de cajas configurado.",
    panel: "border-emerald-200 bg-emerald-50 text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800",
    accent: "bg-emerald-500",
  },
  NO_ACTIVE_TRUCK: {
    label: "Sin camión activo",
    description:
      "Abre un camión de producción para calcular su previsión de carga.",
    panel: "border-slate-200 bg-slate-50 text-slate-900",
    badge: "bg-slate-200 text-slate-700",
    accent: "bg-slate-400",
  },
};

const RELIABILITY_LABELS = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Pendiente",
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

function formatDuration(value) {
  if (value === null || value === undefined) return "-";

  const totalMinutes = Math.max(0, Math.round(Number(value) * 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (!days && minutes) parts.push(`${minutes} min`);

  return parts.join(" ") || "0 min";
}

function formatRate(value) {
  return value === null || value === undefined
    ? "-"
    : `${Number(value).toLocaleString("es-ES", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })} cajas/h`;
}

function formatMargin(value) {
  if (value === null || value === undefined) return "-";

  if (value < 0) {
    return `${formatDuration(Math.abs(value))} de retraso`;
  }

  return `${formatDuration(value)} de margen`;
}

function inactivityPresentation(inactivity) {
  if (inactivity?.status === "STOPPED") {
    return {
      label: "Posible parada",
      detail: `${formatDuration(inactivity.hours)} sin cajas`,
      className: "border-red-300 bg-red-50 text-red-900",
    };
  }

  if (inactivity?.status === "WARNING") {
    return {
      label: "Ritmo detenido",
      detail: `${formatDuration(inactivity.hours)} sin cajas`,
      className: "border-amber-300 bg-amber-50 text-amber-900",
    };
  }

  if (inactivity?.status === "ACTIVE") {
    return {
      label: "Producción reciente",
      detail: `${formatDuration(inactivity.hours)} desde la última caja`,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  return {
    label: "Sin actividad registrada",
    detail: "Todavía no hay cajas con hora válida",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileBase(reference, truckNumber) {
  const normalizedReference = String(reference || "F-1012")
    .replaceAll(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  return `${normalizedReference}_Prevision_Carga_Camion_${truckNumber || "Activo"}_${today}`;
}

function KpiCard({ icon: Icon, label, value, detail, tone = "slate" }) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-800",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {detail}
          </p>
        </div>
        <span
          className={`rounded-xl p-2.5 ${toneClasses[tone] || toneClasses.slate}`}
        >
          <Icon size={21} />
        </span>
      </div>
    </article>
  );
}

function RiskBadge({ risk }) {
  const presentation =
    RISK_PRESENTATION[risk] ||
    RISK_PRESENTATION.INSUFFICIENT_DATA;

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${presentation.badge}`}
    >
      {presentation.label}
    </span>
  );
}

export default function ExpeditionForecastModal({
  reference = "F-1012",
  activeTruck,
  nextPlannedTruck,
  targetBoxes = 49,
  piecesPerBox = 16,
  onOpenTruck,
  onOpenPlannedTruck,
  onOpenArchive,
  onOpenPerformance,
  onClose,
}) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchForecastTruckLabels(
        supabase,
        activeTruck?.id
      );
      setLabels(result);
      setNowMs(Date.now());
    } catch (loadError) {
      setLabels([]);
      setError(
        loadError?.message ||
          "No se han podido cargar las horas de las cajas."
      );
    } finally {
      setLoading(false);
    }
  }, [activeTruck?.id]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeTruck?.id) return undefined;

    const channel = supabase
      .channel(`forecast-boxes-${activeTruck.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
          filter: `camion_id=eq.${activeTruck.id}`,
        },
        () => loadForecast()
      )
      .subscribe();
    const fallbackTimer = window.setInterval(
      () => loadForecast(),
      60000
    );

    return () => {
      window.clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [activeTruck?.id, loadForecast]);

  const forecast = useMemo(
    () =>
      buildExpeditionForecast({
        activeTruck,
        labels,
        targetBoxes,
        piecesPerBox,
        nextPlannedTruck,
        nowMs,
      }),
    [
      activeTruck,
      labels,
      nextPlannedTruck,
      nowMs,
      piecesPerBox,
      targetBoxes,
    ]
  );
  const riskPresentation =
    RISK_PRESENTATION[forecast.risk] ||
    RISK_PRESENTATION.INSUFFICIENT_DATA;
  const inactivity = inactivityPresentation(
    forecast.inactivity
  );
  const maximumHourlyBoxes = Math.max(
    1,
    ...(forecast.hourly || []).map((hour) => hour.boxes)
  );

  const openArchive = () => {
    onClose?.();
    window.setTimeout(() => onOpenArchive?.(), 50);
  };

  const openPerformance = () => {
    onClose?.();
    window.setTimeout(() => onOpenPerformance?.(), 50);
  };

  const openTruck = () => {
    onClose?.();
    window.setTimeout(() => onOpenTruck?.(activeTruck), 50);
  };

  const openNextTruck = () => {
    if (!nextPlannedTruck) return;

    onClose?.();
    window.setTimeout(
      () => onOpenPlannedTruck?.(nextPlannedTruck),
      50
    );
  };

  const exportExcel = async () => {
    setExportError("");

    if (!forecast.hasActiveTruck) {
      setExportError("No hay un camión activo que exportar.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summaryRows = [
        {
          Indicador: "Camión",
          Valor: forecast.truck?.truck_number || "-",
        },
        {
          Indicador: "Estado de previsión",
          Valor: riskPresentation.label,
        },
        {
          Indicador: "Fecha prevista",
          Valor: formatDate(
            forecast.truck?.planned_expedition_date
          ),
        },
        {
          Indicador: "Cajas completadas",
          Valor: forecast.completedBoxes,
        },
        {
          Indicador: "Objetivo",
          Valor: forecast.targetBoxes,
        },
        {
          Indicador: "Cajas restantes",
          Valor: forecast.remainingBoxes,
        },
        {
          Indicador: "Piezas restantes",
          Valor: forecast.remainingPieces,
        },
        {
          Indicador: "Ritmo actual (cajas/h)",
          Valor: forecast.currentRate ?? "",
        },
        {
          Indicador: "Ritmo mínimo (cajas/h)",
          Valor: forecast.requiredRate ?? "",
        },
        {
          Indicador: "Finalización estimada",
          Valor: formatDateTime(
            forecast.estimatedCompletionAt
          ),
        },
        {
          Indicador: "Margen horario",
          Valor: forecast.marginHours ?? "",
        },
        {
          Indicador: "Fiabilidad",
          Valor:
            RELIABILITY_LABELS[forecast.reliability] || "-",
        },
        {
          Indicador: "Última caja",
          Valor: formatDateTime(forecast.lastBoxAt),
        },
      ];
      const hourlyRows = (forecast.hourly || []).map((hour) => ({
        Hora: hour.label,
        "Inicio del periodo": formatDateTime(hour.start_at),
        Cajas: hour.boxes,
      }));
      const labelRows = (forecast.labels || []).map((label) => ({
        Caja: label.numero_caja || "-",
        "Fecha y hora": formatDateTime(label.created_at),
      }));

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        "Resumen"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(hourlyRows),
        "Ritmo por hora"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(labelRows),
        "Cajas utilizadas"
      );
      XLSX.writeFile(
        workbook,
        `${fileBase(
          reference,
          forecast.truck?.truck_number
        )}.xlsx`
      );
    } catch (exportFailure) {
      setExportError(
        exportFailure?.message ||
          "No se ha podido generar el archivo Excel."
      );
    }
  };

  const exportPdf = () => {
    setExportError("");

    if (!forecast.hasActiveTruck) {
      setExportError("No hay un camión activo que exportar.");
      return;
    }

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
      setExportError(
        "El navegador ha bloqueado la ventana del PDF."
      );
      return;
    }

    const hourlyRows = (forecast.hourly || [])
      .map(
        (hour) =>
          `<tr><td>${escapeHtml(hour.label)}</td><td>${hour.boxes}</td></tr>`
      )
      .join("");
    const nextTruckRows = forecast.nextTruck
      ? `
        <tr><td>Camión</td><td>${escapeHtml(
          forecast.nextTruck.truck?.truck_number || "-"
        )}</td></tr>
        <tr><td>Fecha prevista</td><td>${escapeHtml(
          formatDate(
            forecast.nextTruck.truck?.planned_expedition_date
          )
        )}</td></tr>
        <tr><td>Inicio estimado</td><td>${escapeHtml(
          formatDateTime(forecast.nextTruck.estimatedStartAt)
        )}</td></tr>
        <tr><td>Finalización estimada</td><td>${escapeHtml(
          formatDateTime(
            forecast.nextTruck.estimatedCompletionAt
          )
        )}</td></tr>
      `
      : '<tr><td colspan="2">No hay otro camión planificado.</td></tr>';

    reportWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(
            fileBase(reference, forecast.truck?.truck_number)
          )}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
            h1 { margin: 0; font-size: 23px; }
            h2 { margin: 20px 0 8px; font-size: 15px; }
            .meta { margin: 5px 0 14px; color: #475569; font-size: 10px; }
            .risk { border: 2px solid #2563eb; border-radius: 10px; padding: 12px; }
            .risk strong { display: block; font-size: 20px; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 10px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px; font-size: 9px; }
            .kpi strong { display: block; margin-top: 5px; font-size: 17px; }
            .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th { background: #0f172a; color: white; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; }
          </style>
        </head>
        <body>
          <h1>Previsión de carga y riesgo de expedición</h1>
          <div class="meta">
            ${escapeHtml(reference)} · Camión ${escapeHtml(
              forecast.truck?.truck_number || "-"
            )} · Generado ${escapeHtml(
              new Date().toLocaleString("es-ES")
            )}
          </div>
          <div class="risk">
            <strong>${escapeHtml(riskPresentation.label)}</strong>
            ${escapeHtml(riskPresentation.description)}
          </div>
          <div class="kpis">
            <div class="kpi">Carga<strong>${forecast.completedBoxes}/${forecast.targetBoxes}</strong></div>
            <div class="kpi">Restantes<strong>${forecast.remainingBoxes} cajas</strong></div>
            <div class="kpi">Ritmo actual<strong>${escapeHtml(formatRate(forecast.currentRate))}</strong></div>
            <div class="kpi">Ritmo mínimo<strong>${escapeHtml(formatRate(forecast.requiredRate))}</strong></div>
            <div class="kpi">Final estimado<strong>${escapeHtml(formatDateTime(forecast.estimatedCompletionAt))}</strong></div>
          </div>
          <div class="columns">
            <div>
              <h2>Ritmo de las últimas 12 horas</h2>
              <table>
                <thead><tr><th>Hora</th><th>Cajas</th></tr></thead>
                <tbody>${hourlyRows}</tbody>
              </table>
            </div>
            <div>
              <h2>Siguiente camión planificado</h2>
              <table><tbody>${nextTruckRows}</tbody></table>
              <h2>Datos de control</h2>
              <table>
                <tbody>
                  <tr><td>Fecha prevista</td><td>${escapeHtml(formatDate(forecast.truck?.planned_expedition_date))}</td></tr>
                  <tr><td>Margen</td><td>${escapeHtml(formatMargin(forecast.marginHours))}</td></tr>
                  <tr><td>Última caja</td><td>${escapeHtml(formatDateTime(forecast.lastBoxAt))}</td></tr>
                  <tr><td>Fiabilidad</td><td>${escapeHtml(RELIABILITY_LABELS[forecast.reliability] || "-")}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
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
      className="fixed inset-0 z-[10300] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expedition-forecast-title"
    >
      <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-[104rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.28
            </p>
            <h2
              id="expedition-forecast-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Previsión de carga y riesgo de expedición
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Ritmo real, finalización estimada y margen de los próximos camiones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenArchive && (
              <button
                type="button"
                onClick={openArchive}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-800"
              >
                <Archive size={18} />
                Archivo
              </button>
            )}
            {onOpenPerformance && (
              <button
                type="button"
                onClick={openPerformance}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-600"
              >
                <TrendingUp size={18} />
                Rendimiento
              </button>
            )}
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
              onClick={loadForecast}
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
              aria-label="Cerrar previsión"
            >
              <X size={23} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
              {error}
            </div>
          )}

          {exportError && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">
              {exportError}
            </div>
          )}

          <section
            className={`rounded-[1.5rem] border p-5 shadow-sm ${riskPresentation.panel}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="rounded-2xl bg-white/80 p-3">
                  {forecast.risk === "DELAYED" ||
                  forecast.risk === "AT_RISK" ? (
                    <AlertTriangle size={28} />
                  ) : (
                    <Gauge size={28} />
                  )}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">
                    Camión{" "}
                    {forecast.truck?.truck_number || "activo"}
                  </p>
                  <h3 className="mt-1 text-3xl font-black">
                    {riskPresentation.label}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm font-bold">
                    {riskPresentation.description}
                  </p>
                </div>
              </div>
              <RiskBadge risk={forecast.risk} />
            </div>
          </section>

          {!forecast.hasActiveTruck ? (
            <section className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center">
              <Truck className="mx-auto text-slate-400" size={40} />
              <h3 className="mt-3 text-xl font-black text-slate-900">
                No hay un camión activo
              </h3>
              <p className="mt-1 font-semibold text-slate-500">
                La previsión aparecerá cuando se abra el siguiente camión.
              </p>
            </section>
          ) : (
            <>
              <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <KpiCard
                  icon={PackageCheck}
                  label="Carga actual"
                  value={`${forecast.completedBoxes}/${forecast.targetBoxes}`}
                  detail={`${forecast.progressPercent}% completado`}
                  tone="emerald"
                />
                <KpiCard
                  icon={Boxes}
                  label="Restantes"
                  value={forecast.remainingBoxes}
                  detail={`${forecast.remainingPieces} piezas`}
                  tone="blue"
                />
                <KpiCard
                  icon={Activity}
                  label="Ritmo actual"
                  value={formatRate(forecast.currentRate)}
                  detail={`${forecast.sampleSize}/${FORECAST_SAMPLE_SIZE} cajas · fiabilidad ${
                    RELIABILITY_LABELS[forecast.reliability] || "-"
                  }`}
                  tone="blue"
                />
                <KpiCard
                  icon={Gauge}
                  label="Ritmo mínimo"
                  value={formatRate(forecast.requiredRate)}
                  detail="para cumplir la fecha"
                  tone={
                    forecast.risk === "DELAYED" ? "red" : "amber"
                  }
                />
                <KpiCard
                  icon={Clock3}
                  label="Final estimado"
                  value={formatDateTime(
                    forecast.estimatedCompletionAt
                  )}
                  detail={formatMargin(forecast.marginHours)}
                  tone={
                    forecast.risk === "ON_TRACK"
                      ? "emerald"
                      : forecast.risk === "DELAYED"
                        ? "red"
                        : "amber"
                  }
                />
                <KpiCard
                  icon={Truck}
                  label="Expedición prevista"
                  value={formatDate(
                    forecast.truck?.planned_expedition_date
                  )}
                  detail={`${formatDuration(
                    forecast.hoursToDeadline
                  )} disponibles`}
                  tone="slate"
                />
              </section>

              <section className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      Progreso de carga
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">
                      Quedan {forecast.remainingBoxes} cajas para completar el camión.
                    </p>
                  </div>
                  <span className="text-xl font-black text-blue-700">
                    {forecast.progressPercent}%
                  </span>
                </div>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${riskPresentation.accent}`}
                    style={{
                      width: `${Math.min(
                        100,
                        forecast.progressPercent
                      )}%`,
                    }}
                  />
                </div>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                        Ritmo reciente
                      </p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        Cajas por hora
                      </h3>
                    </div>
                    <span
                      className={`rounded-xl border px-3 py-2 text-xs font-black ${inactivity.className}`}
                    >
                      {inactivity.label} · {inactivity.detail}
                    </span>
                  </div>

                  <div className="mt-6 flex h-48 items-end gap-2 border-b border-l border-slate-300 px-2 pt-4">
                    {(forecast.hourly || []).map((hour) => (
                      <div
                        key={hour.start_at}
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                        title={`${hour.label}: ${hour.boxes} cajas`}
                      >
                        <span className="text-xs font-black text-slate-700">
                          {hour.boxes || ""}
                        </span>
                        <div
                          className={`w-full min-w-[10px] rounded-t-md ${
                            hour.boxes
                              ? "bg-blue-600"
                              : "bg-slate-200"
                          }`}
                          style={{
                            height: `${Math.max(
                              4,
                              (hour.boxes /
                                maximumHourlyBoxes) *
                                130
                            )}px`,
                          }}
                        />
                        <span className="hidden text-[10px] font-bold text-slate-500 sm:block">
                          {hour.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    El ritmo se calcula con las últimas{" "}
                    {FORECAST_SAMPLE_SIZE} cajas. La gráfica muestra las
                    últimas 12 horas naturales.
                  </p>
                </article>

                <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                    Datos de previsión
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Lectura operativa
                  </h3>

                  <dl className="mt-5 space-y-3">
                    {[
                      [
                        "Última caja",
                        formatDateTime(forecast.lastBoxAt),
                      ],
                      [
                        "Tiempo restante",
                        formatDuration(
                          forecast.estimatedHoursRemaining
                        ),
                      ],
                      [
                        "Fecha límite",
                        formatDateTime(forecast.deadlineAt),
                      ],
                      [
                        "Margen previsto",
                        formatMargin(forecast.marginHours),
                      ],
                      [
                        "Muestra utilizada",
                        `${forecast.sampleSize} cajas en ${formatDuration(
                          forecast.sampleElapsedHours
                        )}`,
                      ],
                    ].map(([term, value]) => (
                      <div
                        key={term}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <dt className="text-sm font-black text-slate-600">
                          {term}
                        </dt>
                        <dd className="text-right text-sm font-black text-slate-950">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <button
                    type="button"
                    onClick={openTruck}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800"
                  >
                    <ExternalLink size={18} />
                    Abrir camión activo
                  </button>
                </article>
              </section>

              <section className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                      Siguiente expedición
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      {forecast.nextTruck
                        ? `Camión ${forecast.nextTruck.truck?.truck_number}`
                        : "No hay otro camión planificado"}
                    </h3>
                  </div>
                  {forecast.nextTruck && (
                    <RiskBadge risk={forecast.nextTruck.risk} />
                  )}
                </div>

                {forecast.nextTruck ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase text-slate-500">
                        Expedición prevista
                      </p>
                      <p className="mt-2 font-black text-slate-950">
                        {formatDate(
                          forecast.nextTruck.truck
                            ?.planned_expedition_date
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase text-slate-500">
                        Inicio estimado
                      </p>
                      <p className="mt-2 font-black text-slate-950">
                        {formatDateTime(
                          forecast.nextTruck.estimatedStartAt
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase text-slate-500">
                        Final estimado
                      </p>
                      <p className="mt-2 font-black text-slate-950">
                        {formatDateTime(
                          forecast.nextTruck
                            .estimatedCompletionAt
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNextTruck}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 font-black text-white hover:bg-blue-700"
                    >
                      <ExternalLink size={18} />
                      Revisar planificación
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center font-semibold text-slate-500">
                    La proyección del siguiente camión aparecerá cuando exista una expedición planificada.
                  </p>
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
