import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Gauge,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchExpeditionCalendarData,
} from "../../../services/expeditionCapacity";
import {
  buildExpeditionForecast,
  fetchForecastTruckLabels,
} from "../../../services/expeditionForecast";
import {
  buildPlannedTruckUpdatePayload,
  buildSimulationComparison,
  createSimulationDrafts,
  moveSimulationDraft,
  suggestDatesFromCurrentRate,
  updateSimulationDraftDate,
} from "../../../services/expeditionSimulation";

const RISK_PRESENTATION = {
  ON_TRACK: {
    label: "En plazo",
    className: "bg-emerald-100 text-emerald-800",
  },
  AT_RISK: {
    label: "En riesgo",
    className: "bg-amber-100 text-amber-800",
  },
  DELAYED: {
    label: "Retraso previsto",
    className: "bg-red-100 text-red-800",
  },
  NO_DATA: {
    label: "Sin ritmo suficiente",
    className: "bg-slate-100 text-slate-600",
  },
  NO_DEADLINE: {
    label: "Sin fecha",
    className: "bg-amber-100 text-amber-800",
  },
};

const CAPACITY_PRESENTATION = {
  OVERLOAD: {
    label: "Sobrecarga",
    className: "bg-red-100 text-red-800",
  },
  TIGHT: {
    label: "Ajustada",
    className: "bg-amber-100 text-amber-800",
  },
  AVAILABLE: {
    label: "Disponible",
    className: "bg-emerald-100 text-emerald-800",
  },
  NO_DATA: {
    label: "Sin datos",
    className: "bg-blue-100 text-blue-800",
  },
  EMPTY: {
    label: "Sin carga",
    className: "bg-slate-100 text-slate-600",
  },
};

const RESULT_PRESENTATION = {
  IMPROVED: {
    label: "Escenario mejorado",
    detail:
      "La propuesta reduce el riesgo o la saturación respecto al plan actual.",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  WORSE: {
    label: "Escenario desfavorable",
    detail:
      "La propuesta aumenta el riesgo o la saturación respecto al plan actual.",
    className: "border-red-300 bg-red-50 text-red-900",
  },
  UNCHANGED: {
    label: "Impacto equivalente",
    detail:
      "La propuesta mantiene el nivel global de riesgo y capacidad.",
    className: "border-blue-200 bg-blue-50 text-blue-900",
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

function exportFileBase(reference) {
  const normalized = String(reference || "F-1012")
    .replaceAll(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();

  return `${normalized}_Simulacion_Replanificacion_${new Date()
    .toISOString()
    .slice(0, 10)}`;
}

function RiskBadge({ risk }) {
  const presentation =
    RISK_PRESENTATION[risk] ||
    RISK_PRESENTATION.NO_DATA;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

function ComparisonKpi({
  icon: Icon,
  label,
  current,
  simulated,
  detail,
  tone = "blue",
}) {
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
          <div className="mt-3 flex items-end gap-2">
            <span className="text-lg font-black text-slate-400 line-through decoration-2">
              {current}
            </span>
            <span className="text-3xl font-black text-slate-950">
              {simulated}
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {detail}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone] || tones.blue}`}>
          <Icon size={21} />
        </span>
      </div>
    </article>
  );
}

function CapacityComparisonTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
        No hay fechas planificadas que comparar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs font-black uppercase text-slate-600">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Plan actual</th>
            <th className="px-4 py-3 text-right">Simulación</th>
            <th className="px-4 py-3 text-right">Diferencia</th>
            <th className="px-4 py-3">Estado actual</th>
            <th className="px-4 py-3">Estado simulado</th>
            <th className="px-4 py-3">Camiones simulados</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => {
            const base =
              CAPACITY_PRESENTATION[row.baseStatus] ||
              CAPACITY_PRESENTATION.EMPTY;
            const scenario =
              CAPACITY_PRESENTATION[row.scenarioStatus] ||
              CAPACITY_PRESENTATION.EMPTY;

            return (
              <tr key={row.date}>
                <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">
                  {formatDate(row.date)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {row.baseDemand} cajas
                </td>
                <td className="px-4 py-3 text-right font-black">
                  {row.scenarioDemand} cajas
                </td>
                <td
                  className={`px-4 py-3 text-right font-black ${
                    row.demandDelta > 0
                      ? "text-red-700"
                      : row.demandDelta < 0
                        ? "text-emerald-700"
                        : "text-slate-500"
                  }`}
                >
                  {row.demandDelta > 0 ? "+" : ""}
                  {row.demandDelta}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${base.className}`}
                  >
                    {base.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${scenario.className}`}
                  >
                    {scenario.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-slate-600">
                  {row.scenarioTrucks.length
                    ? row.scenarioTrucks
                        .map((number) => `Camión ${number}`)
                        .join(", ")
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ExpeditionSimulationModal({
  reference = "F-1012",
  activeTruck = null,
  targetBoxes = 49,
  piecesPerBox = 16,
  onUpdatePlannedTruck,
  onOpenCalendar,
  onClose,
}) {
  const [actualTrucks, setActualTrucks] = useState([]);
  const [plannedTrucks, setPlannedTrucks] = useState([]);
  const [labels, setLabels] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({
    current: 0,
    total: 0,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const initializedRef = useRef(false);

  const loadData = useCallback(
    async ({
      silent = false,
      resetScenario = false,
    } = {}) => {
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

        if (resetScenario || !initializedRef.current) {
          setDrafts(
            createSimulationDrafts(
              calendarData.plannedTrucks
            )
          );
          initializedRef.current = true;
        }
      } catch (loadError) {
        setError(
          loadError?.message ||
            "No se ha podido cargar la planificación para simularla."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTruck?.id, reference]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel(`expedition-simulation-v231-${reference}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_trucks",
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_schedule",
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
        },
        () => loadData({ silent: true })
      )
      .subscribe();
    const fallbackTimer = window.setInterval(() => {
      loadData({ silent: true });
    }, 60_000);

    return () => {
      window.clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [loadData, reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

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

  const comparison = useMemo(
    () =>
      buildSimulationComparison({
        actualTrucks,
        plannedTrucks,
        activeTruck: currentActiveTruck,
        forecast,
        targetBoxes,
        piecesPerBox,
        drafts,
        nowMs,
      }),
    [
      actualTrucks,
      currentActiveTruck,
      drafts,
      forecast,
      nowMs,
      piecesPerBox,
      plannedTrucks,
      targetBoxes,
    ]
  );

  const plannedById = useMemo(
    () =>
      new Map(
        plannedTrucks.map((truck) => [
          String(truck.id),
          truck,
        ])
      ),
    [plannedTrucks]
  );

  const result =
    RESULT_PRESENTATION[comparison.result] ||
    RESULT_PRESENTATION.UNCHANGED;

  const resetScenario = () => {
    setDrafts(createSimulationDrafts(plannedTrucks));
    setMessage("Se ha recuperado la planificación actual.");
    setError("");
  };

  const suggestScenario = () => {
    const suggestion = suggestDatesFromCurrentRate({
      drafts,
      forecast,
      targetBoxes,
      nowMs,
    });

    setDrafts(suggestion.drafts);
    setMessage(suggestion.message);

    if (!suggestion.applied) {
      setError(suggestion.message);
    } else {
      setError("");
    }
  };

  const applyScenario = async () => {
    if (saving || !comparison.changedCount) return;

    if (comparison.validationErrors.length) {
      setError(comparison.validationErrors.join(" "));
      return;
    }

    if (!onUpdatePlannedTruck) {
      setError(
        "La actualización de camiones planificados no está disponible."
      );
      return;
    }

    const confirmed = window.confirm(
      `Se guardarán ${comparison.changedCount} camiones de la simulación. ¿Aplicar esta replanificación?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");
    setSaveProgress({
      current: 0,
      total: comparison.changedCount,
    });
    let saved = 0;

    try {
      for (const draft of comparison.changedDrafts) {
        const truck = plannedById.get(String(draft.id));

        if (!truck) {
          throw new Error(
            `No se encuentra el camión ${draft.truckNumber}.`
          );
        }

        const updated = await onUpdatePlannedTruck(
          truck,
          buildPlannedTruckUpdatePayload(truck, draft)
        );

        if (updated === false) {
          throw new Error(
            `No se ha podido actualizar el camión ${draft.truckNumber}.`
          );
        }

        saved += 1;
        setSaveProgress({
          current: saved,
          total: comparison.changedCount,
        });
      }

      initializedRef.current = false;
      await loadData({
        silent: true,
        resetScenario: true,
      });
      setMessage(
        `Replanificación aplicada correctamente a ${saved} camiones.`
      );
    } catch (saveError) {
      setError(
        `${
          saveError?.message ||
          "No se ha podido completar la replanificación."
        } ${saved ? `${saved} camiones ya se habían guardado.` : ""}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    setExportError("");
    const popup = window.open("", "_blank");

    if (!popup) {
      setExportError(
        "El navegador ha bloqueado la ventana del PDF."
      );
      return;
    }

    const changeRows = comparison.comparisons
      .map((draft) => {
        const truck = plannedById.get(String(draft.id));

        return `<tr>
          <td>${draft.priority}</td>
          <td>Camión ${escapeHtml(draft.truckNumber)}</td>
          <td>${escapeHtml(truck?.customer_name || "-")}</td>
          <td>${escapeHtml(formatDate(draft.originalDate))}</td>
          <td>${escapeHtml(formatDate(draft.date))}</td>
          <td>${escapeHtml(
            RISK_PRESENTATION[draft.originalRisk]?.label ||
            draft.originalRisk
          )}</td>
          <td>${escapeHtml(
            RISK_PRESENTATION[draft.scenarioRisk]?.label ||
            draft.scenarioRisk
          )}</td>
          <td>${escapeHtml(
            formatDateTime(draft.scenarioCompletionAt)
          )}</td>
        </tr>`;
      })
      .join("");
    const capacityRows = comparison.dayComparison
      .map((row) => `<tr>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${row.baseDemand}</td>
        <td>${row.scenarioDemand}</td>
        <td>${row.demandDelta > 0 ? "+" : ""}${row.demandDelta}</td>
        <td>${escapeHtml(
          CAPACITY_PRESENTATION[row.baseStatus]?.label ||
          row.baseStatus
        )}</td>
        <td>${escapeHtml(
          CAPACITY_PRESENTATION[row.scenarioStatus]?.label ||
          row.scenarioStatus
        )}</td>
      </tr>`)
      .join("");

    popup.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(exportFileBase(reference))}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            h2 { margin: 18px 0 7px; font-size: 15px; }
            .meta { color: #475569; font-size: 10px; margin-bottom: 12px; }
            .result { border: 1px solid #93c5fd; background: #eff6ff; border-radius: 8px; padding: 9px; margin-bottom: 12px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 7px; padding: 8px; font-size: 10px; }
            .kpi strong { display: block; font-size: 17px; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px; text-align: left; }
            th { background: #e2e8f0; text-transform: uppercase; }
            .note { margin-top: 10px; color: #475569; font-size: 8px; }
          </style>
        </head>
        <body>
          <h1>Simulación y replanificación de expediciones</h1>
          <div class="meta">${escapeHtml(reference)} · Generado ${escapeHtml(
            new Date().toLocaleString("es-ES")
          )} · Escenario todavía no guardado</div>
          <div class="result"><strong>${escapeHtml(
            result.label
          )}</strong> — ${escapeHtml(result.detail)}</div>
          <div class="kpis">
            <div class="kpi">Cambios<strong>${comparison.changedCount}</strong></div>
            <div class="kpi">Días sobrecargados<strong>${comparison.base.calendar.summary.overloadDays} → ${comparison.scenario.calendar.summary.overloadDays}</strong></div>
            <div class="kpi">Retrasos previstos<strong>${comparison.base.summary.delayed} → ${comparison.scenario.summary.delayed}</strong></div>
            <div class="kpi">Final estimado<strong>${escapeHtml(
              formatDateTime(
                comparison.scenario.summary.latestCompletionAt
              )
            )}</strong></div>
          </div>
          <h2>Prioridad y fechas</h2>
          <table>
            <thead><tr><th>Prioridad</th><th>Camión</th><th>Cliente</th><th>Fecha actual</th><th>Fecha simulada</th><th>Riesgo actual</th><th>Riesgo simulado</th><th>Fin estimado</th></tr></thead>
            <tbody>${changeRows || '<tr><td colspan="8">Sin camiones planificados</td></tr>'}</tbody>
          </table>
          <h2>Impacto diario</h2>
          <table>
            <thead><tr><th>Fecha</th><th>Demanda actual</th><th>Demanda simulada</th><th>Diferencia</th><th>Estado actual</th><th>Estado simulado</th></tr></thead>
            <tbody>${capacityRows || '<tr><td colspan="6">Sin demanda prevista</td></tr>'}</tbody>
          </table>
          <p class="note">Documento de simulación. La planificación real solo cambia al pulsar “Aplicar replanificación”. Las previsiones se calculan con el ritmo reciente del camión activo.</p>
          <script>window.onload = () => window.print();</script>
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
        ["FM Control", "V2.31"],
        ["Referencia", reference],
        ["Resultado", result.label],
        ["Cambios pendientes", comparison.changedCount],
        [
          "Días sobrecargados actuales",
          comparison.base.calendar.summary.overloadDays,
        ],
        [
          "Días sobrecargados simulados",
          comparison.scenario.calendar.summary.overloadDays,
        ],
        ["Retrasos actuales", comparison.base.summary.delayed],
        [
          "Retrasos simulados",
          comparison.scenario.summary.delayed,
        ],
        [
          "Final estimado simulado",
          formatDateTime(
            comparison.scenario.summary.latestCompletionAt
          ),
        ],
      ];
      const changeRows = comparison.comparisons.map(
        (draft) => {
          const truck = plannedById.get(String(draft.id));

          return {
            Prioridad: draft.priority,
            Camión: draft.truckNumber,
            Cliente: truck?.customer_name || "",
            Destino: truck?.destination || "",
            Transportista: truck?.carrier_name || "",
            "Fecha actual": formatDate(draft.originalDate),
            "Fecha simulada": formatDate(draft.date),
            "Prioridad modificada": draft.priorityChanged
              ? "Sí"
              : "No",
            "Fecha modificada": draft.dateChanged
              ? "Sí"
              : "No",
            "Riesgo actual":
              RISK_PRESENTATION[draft.originalRisk]?.label ||
              draft.originalRisk,
            "Riesgo simulado":
              RISK_PRESENTATION[draft.scenarioRisk]?.label ||
              draft.scenarioRisk,
            "Final estimado": formatDateTime(
              draft.scenarioCompletionAt
            ),
          };
        }
      );
      const capacityRows = comparison.dayComparison.map(
        (row) => ({
          Fecha: formatDate(row.date),
          "Demanda actual (cajas)": row.baseDemand,
          "Demanda simulada (cajas)": row.scenarioDemand,
          Diferencia: row.demandDelta,
          "Ocupación actual (%)": row.baseLoadPercent,
          "Ocupación simulada (%)":
            row.scenarioLoadPercent,
          "Estado actual":
            CAPACITY_PRESENTATION[row.baseStatus]?.label ||
            row.baseStatus,
          "Estado simulado":
            CAPACITY_PRESENTATION[row.scenarioStatus]
              ?.label || row.scenarioStatus,
          "Camiones simulados":
            row.scenarioTrucks.join(", "),
        })
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(summaryRows),
        "Resumen"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(changeRows),
        "Replanificación"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(capacityRows),
        "Impacto diario"
      );
      XLSX.writeFile(
        workbook,
        `${exportFileBase(reference)}.xlsx`
      );
    } catch (excelError) {
      setExportError(
        excelError?.message ||
          "No se ha podido generar el archivo Excel."
      );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10030] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div
        className="flex max-h-[calc(100vh-1rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expedition-simulation-title"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.31
            </p>
            <h2
              id="expedition-simulation-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Simulación y replanificación de expediciones
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Prueba fechas y prioridades antes de modificar el plan real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenCalendar}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              Calendario
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
              onClick={() =>
                loadData({
                  silent: true,
                  resetScenario: !comparison.changedCount,
                })
              }
              disabled={refreshing || saving}
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
              disabled={saving}
              className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              aria-label="Cerrar simulación"
            >
              <X size={23} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            Estás trabajando en un escenario provisional. Nada cambia en la planificación real hasta pulsar
            {" "}
            <strong>Aplicar replanificación</strong>.
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800">
              {message}
            </div>
          )}
          {exportError && (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">
              {exportError}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[28rem] items-center justify-center">
              <RefreshCw
                size={36}
                className="animate-spin text-blue-600"
              />
            </div>
          ) : (
            <>
              <section
                className={`rounded-[1.5rem] border p-5 shadow-sm ${result.className}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em]">
                      Evaluación del escenario
                    </p>
                    <h3 className="mt-1 text-2xl font-black">
                      {result.label}
                    </h3>
                    <p className="mt-1 text-sm font-bold opacity-80">
                      {result.detail}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-black shadow-sm">
                    {comparison.changedCount} camiones modificados
                  </span>
                </div>
              </section>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ComparisonKpi
                  icon={AlertTriangle}
                  label="Días sobrecargados"
                  current={
                    comparison.base.calendar.summary
                      .overloadDays
                  }
                  simulated={
                    comparison.scenario.calendar.summary
                      .overloadDays
                  }
                  detail={`${comparison.scenario.calendar.summary.tightDays} días ajustados en la simulación`}
                  tone={
                    comparison.scenario.calendar.summary
                      .overloadDays
                      ? "red"
                      : "emerald"
                  }
                />
                <ComparisonKpi
                  icon={CalendarClock}
                  label="Retrasos previstos"
                  current={comparison.base.summary.delayed}
                  simulated={
                    comparison.scenario.summary.delayed
                  }
                  detail={`${comparison.scenario.summary.atRisk} expediciones en riesgo`}
                  tone={
                    comparison.scenario.summary.delayed
                      ? "red"
                      : "emerald"
                  }
                />
                <ComparisonKpi
                  icon={Gauge}
                  label="Capacidad diaria"
                  current={
                    comparison.base.calendar.boxesPerDay
                      ? formatNumber(
                          comparison.base.calendar.boxesPerDay,
                          1
                        )
                      : "-"
                  }
                  simulated={
                    comparison.scenario.calendar.boxesPerDay
                      ? formatNumber(
                          comparison.scenario.calendar
                            .boxesPerDay,
                          1
                        )
                      : "-"
                  }
                  detail="cajas/día según el ritmo reciente"
                  tone="blue"
                />
                <ComparisonKpi
                  icon={CheckCircle2}
                  label="Final del plan"
                  current={formatDate(
                    comparison.base.summary
                      .latestCompletionAt
                  )}
                  simulated={formatDate(
                    comparison.scenario.summary
                      .latestCompletionAt
                  )}
                  detail={formatDateTime(
                    comparison.scenario.summary
                      .latestCompletionAt
                  )}
                  tone="slate"
                />
              </div>

              <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                      Escenario provisional
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Orden, prioridad y fechas
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Las flechas cambian la prioridad de carga. La fecha determina el compromiso previsto.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={suggestScenario}
                      disabled={!drafts.length || saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Sparkles size={18} />
                      Proponer según ritmo
                    </button>
                    <button
                      type="button"
                      onClick={resetScenario}
                      disabled={!drafts.length || saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RotateCcw size={18} />
                      Restablecer
                    </button>
                    <button
                      type="button"
                      onClick={applyScenario}
                      disabled={
                        !comparison.changedCount ||
                        comparison.validationErrors.length > 0 ||
                        saving
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {saving ? (
                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={18} />
                      )}
                      {saving
                        ? `Guardando ${saveProgress.current}/${saveProgress.total}`
                        : "Aplicar replanificación"}
                    </button>
                  </div>
                </div>

                {!drafts.length ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <Truck
                      size={34}
                      className="mx-auto text-slate-400"
                    />
                    <p className="mt-3 font-black text-slate-700">
                      No hay camiones planificados para simular.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comparison.comparisons.map(
                      (draft, index) => {
                        const truck = plannedById.get(
                          String(draft.id)
                        );

                        return (
                          <article
                            key={draft.id}
                            className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[auto_1.1fr_0.85fr_0.9fr_0.9fr] lg:items-center ${
                              draft.dateChanged ||
                              draft.priorityChanged
                                ? "border-blue-300 bg-blue-50/50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-white">
                                {draft.priority}
                              </span>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDrafts((current) =>
                                      moveSimulationDraft(
                                        current,
                                        draft.id,
                                        -1
                                      )
                                    )
                                  }
                                  disabled={index === 0 || saving}
                                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-25"
                                  aria-label={`Subir prioridad del camión ${draft.truckNumber}`}
                                >
                                  <ArrowUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDrafts((current) =>
                                      moveSimulationDraft(
                                        current,
                                        draft.id,
                                        1
                                      )
                                    )
                                  }
                                  disabled={
                                    index ===
                                      comparison.comparisons
                                        .length -
                                        1 || saving
                                  }
                                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-25"
                                  aria-label={`Bajar prioridad del camión ${draft.truckNumber}`}
                                >
                                  <ArrowDown size={15} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="text-lg font-black text-slate-950">
                                Camión {draft.truckNumber}
                              </p>
                              <p className="truncate text-sm font-bold text-slate-600">
                                {truck?.customer_name ||
                                  "Cliente pendiente"}
                                {truck?.destination
                                  ? ` · ${truck.destination}`
                                  : ""}
                              </p>
                              <p className="truncate text-xs font-semibold text-slate-500">
                                {truck?.carrier_name ||
                                  "Transportista pendiente"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase text-slate-500">
                                Fecha actual
                              </p>
                              <p className="mt-2 font-black text-slate-800">
                                {formatDate(draft.originalDate)}
                              </p>
                              <div className="mt-2">
                                <RiskBadge
                                  risk={draft.originalRisk}
                                />
                              </div>
                            </div>

                            <label>
                              <span className="text-[11px] font-black uppercase text-blue-700">
                                Fecha simulada
                              </span>
                              <input
                                type="date"
                                value={draft.date}
                                onChange={(event) =>
                                  setDrafts((current) =>
                                    updateSimulationDraftDate(
                                      current,
                                      draft.id,
                                      event.target.value
                                    )
                                  )
                                }
                                disabled={saving}
                                className="mt-1.5 w-full rounded-xl border border-blue-300 bg-white px-3 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                              />
                              <div className="mt-2">
                                <RiskBadge
                                  risk={draft.scenarioRisk}
                                />
                              </div>
                            </label>

                            <div>
                              <p className="text-[11px] font-black uppercase text-slate-500">
                                Final estimado
                              </p>
                              <p className="mt-2 text-sm font-black text-slate-900">
                                {formatDateTime(
                                  draft.scenarioCompletionAt
                                )}
                              </p>
                              {(draft.dateChanged ||
                                draft.priorityChanged) && (
                                <p className="mt-2 text-xs font-black text-blue-700">
                                  {[
                                    draft.priorityChanged &&
                                      "prioridad modificada",
                                    draft.dateChanged &&
                                      "fecha modificada",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                      Impacto de capacidad
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Comparación diaria
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    Capacidad estimada:{" "}
                    {comparison.scenario.calendar.boxesPerDay
                      ? `${formatNumber(
                          comparison.scenario.calendar
                            .boxesPerDay,
                          1
                        )} cajas/día`
                      : "sin ritmo suficiente"}
                  </p>
                </div>
                <CapacityComparisonTable
                  rows={comparison.dayComparison}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    window.document.body
  );
}
