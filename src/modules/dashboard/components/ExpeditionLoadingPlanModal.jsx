import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Link2,
  LoaderCircle,
  Printer,
  RefreshCw,
  Save,
  Search,
  Truck,
  UserRound,
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
  buildLoadingPlanRows,
  evaluateLoadingReadiness,
  fetchExpeditionLoadingPlanData,
  LOADING_CHECKLIST_ITEMS,
  LOADING_STATUSES,
  loadingPlanFileBase,
  loadingStatusLabel,
  saveExpeditionLoadingPlan,
  summarizeLoadingPlan,
  validateLoadingStatus,
} from "../../../services/expeditionLoadingPlan";
import {
  normalizeAuditActor,
  recordTruckAuditEventSafely,
} from "../../../services/truckAuditService";

const STATUS_PRESENTATION = {
  PENDING: {
    className: "bg-slate-100 text-slate-700",
  },
  PREPARING: {
    className: "bg-blue-100 text-blue-800",
  },
  READY: {
    className: "bg-emerald-100 text-emerald-800",
  },
  LOADED: {
    className: "bg-violet-100 text-violet-800",
  },
};

function formatDate(value) {
  const [year, month, day] = String(value || "")
    .slice(0, 10)
    .split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : "Sin fecha";
}

function formatSource(row) {
  if (row.source === "PLANNED") return "Planificado";
  if (row.status === "OPEN") return "Activo";
  if (row.status === "CLOSED") return "Producción cerrada";
  return row.status || "Real";
}

function actorName(currentUser) {
  return normalizeAuditActor(currentUser).display;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadRows(rows, drafts) {
  return rows.map((row) => {
    const draft = drafts[row.key] || row.draft;
    const readiness = evaluateLoadingReadiness(row, draft);

    return {
      Posición: row.queuePosition,
      Camión: row.truckNumber,
      Origen: formatSource(row),
      Prioridad:
        row.planningPriority === Number.MAX_SAFE_INTEGER
          ? ""
          : row.planningPriority,
      "Fecha prevista": row.calendarDate || "",
      "Fecha de carga": draft.loadingDate || "",
      "Hora inicio": draft.loadingStartTime || "",
      "Hora fin": draft.loadingEndTime || "",
      Responsable: draft.preparationResponsible || "",
      Estado: loadingStatusLabel(draft.loadingStatus),
      Cliente: row.customer || "",
      Destino: row.destination || "",
      Transportista: row.carrier || "",
      "Matrícula tractora": row.tractorPlate || "",
      "Matrícula remolque": row.trailerPlate || "",
      "Cajas disponibles": row.completedBoxes,
      "Cajas necesarias": row.targetBoxes,
      "Cajas pendientes": row.pendingBoxes,
      "Documentos adjuntos": row.documents.length,
      "Preparación completa": readiness.isReady ? "Sí" : "No",
      "Pendientes / alertas": [
        ...readiness.blockers,
        ...row.alerts.map((alert) => alert.message),
      ]
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(" | "),
      Notas: draft.notes || "",
    };
  });
}

function MetricCard({
  label,
  value,
  detail,
  tone = "slate",
  icon: Icon,
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-1 text-xs font-bold opacity-70">
            {detail}
          </p>
        </div>
        {Icon && (
          <span className="rounded-xl bg-white/80 p-2 shadow-sm">
            <Icon size={19} />
          </span>
        )}
      </div>
    </div>
  );
}

function LoadingStatusBadge({ value }) {
  const presentation =
    STATUS_PRESENTATION[value] ||
    STATUS_PRESENTATION.PENDING;

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${presentation.className}`}
    >
      {loadingStatusLabel(value)}
    </span>
  );
}

function LoadingPlanCard({
  row,
  draft,
  busy,
  saved,
  error,
  onChange,
  onSave,
  onOpen,
}) {
  const readiness = evaluateLoadingReadiness(row, draft);
  const boxPercent = Math.min(
    100,
    Math.round(
      (Number(row.completedBoxes || 0) /
        Number(row.targetBoxes || 1)) *
        100
    )
  );

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
            {row.queuePosition}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-slate-950">
                Camión {row.truckNumber}
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase text-slate-600 ring-1 ring-slate-200">
                {formatSource(row)}
              </span>
              <LoadingStatusBadge value={draft.loadingStatus} />
            </div>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {formatDate(row.calendarDate)} ·{" "}
              {row.customer || "Cliente pendiente"} ·{" "}
              {row.destination || "Destino pendiente"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(row)}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50"
        >
          <Link2 size={16} />
          Datos y documentos
        </button>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  Disponibilidad de cajas
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {row.completedBoxes} / {row.targetBoxes}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-2xl font-black ${
                    row.pendingBoxes
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {row.pendingBoxes}
                </p>
                <p className="text-xs font-black uppercase text-slate-500">
                  pendientes
                </p>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  row.pendingBoxes
                    ? "bg-blue-600"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${boxPercent}%` }}
              />
            </div>
            {row.source === "PLANNED" && (
              <p className="mt-3 text-xs font-bold text-slate-500">
                Las cajas se contabilizarán automáticamente cuando el
                camión pase a producción.
              </p>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-600">
                <UserRound size={14} />
                Responsable
              </span>
              <input
                value={draft.preparationResponsible}
                onChange={(event) =>
                  onChange(row.key, {
                    preparationResponsible: event.target.value,
                  })
                }
                placeholder="Nombre o código del responsable"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label>
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-600">
                <CalendarClock size={14} />
                Fecha de carga
              </span>
              <input
                type="date"
                value={draft.loadingDate}
                onChange={(event) =>
                  onChange(row.key, {
                    loadingDate: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                Hora de inicio
              </span>
              <input
                type="time"
                value={draft.loadingStartTime}
                onChange={(event) =>
                  onChange(row.key, {
                    loadingStartTime: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                Hora de fin
              </span>
              <input
                type="time"
                value={draft.loadingEndTime}
                onChange={(event) =>
                  onChange(row.key, {
                    loadingEndTime: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                Estado de preparación
              </span>
              <select
                value={draft.loadingStatus}
                onChange={(event) =>
                  onChange(row.key, {
                    loadingStatus: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {LOADING_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {
                  LOADING_STATUSES.find(
                    (status) =>
                      status.value === draft.loadingStatus
                  )?.description
                }
              </p>
            </label>

            <label className="sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                Notas de preparación
              </span>
              <textarea
                value={draft.notes}
                onChange={(event) =>
                  onChange(row.key, {
                    notes: event.target.value,
                  })
                }
                rows={3}
                maxLength={1000}
                placeholder="Indicaciones para el equipo de carga"
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  Checklist de carga
                </p>
                <h4 className="mt-1 text-lg font-black text-slate-950">
                  Preparación operativa
                </h4>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  readiness.isReady
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-white text-blue-800"
                }`}
              >
                {
                  LOADING_CHECKLIST_ITEMS.filter(
                    (item) => draft.checklist[item.key]
                  ).length
                }
                /{LOADING_CHECKLIST_ITEMS.length}
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {LOADING_CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    draft.checklist[item.key]
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-100 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={draft.checklist[item.key]}
                    onChange={(event) =>
                      onChange(row.key, {
                        checklist: {
                          ...draft.checklist,
                          [item.key]: event.target.checked,
                        },
                      })
                    }
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-800">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section
            className={`rounded-2xl border p-4 ${
              readiness.isReady
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {readiness.isReady ? (
                <CheckCircle2
                  className="text-emerald-600"
                  size={20}
                />
              ) : (
                <AlertTriangle
                  className="text-amber-600"
                  size={20}
                />
              )}
              <h4 className="font-black text-slate-950">
                {readiness.isReady
                  ? "Carga preparada"
                  : "Pendientes antes de cargar"}
              </h4>
            </div>

            {readiness.blockers.length ? (
              <ul className="mt-3 space-y-1 text-sm font-bold text-slate-700">
                {readiness.blockers.slice(0, 8).map((blocker) => (
                  <li key={blocker}>• {blocker}</li>
                ))}
                {readiness.blockers.length > 8 && (
                  <li>
                    • +{readiness.blockers.length - 8} controles
                    pendientes
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-2 text-sm font-bold text-emerald-800">
                Cajas, datos, documentos y controles completados.
              </p>
            )}
          </section>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}

          {saved && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              Plan de carga guardado correctamente.
            </p>
          )}

          <button
            type="button"
            onClick={() => onSave(row)}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {busy ? "Guardando..." : "Guardar plan de carga"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ExpeditionLoadingPlanModal({
  reference = "F-1012",
  targetBoxes = 49,
  currentUser = null,
  onOpenActualTruck,
  onOpenPlannedTruck,
  onOpenCalendar,
  onClose,
}) {
  const [data, setData] = useState({
    actualTrucks: [],
    plannedTrucks: [],
    labels: [],
    documents: [],
    plans: [],
  });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [rowErrors, setRowErrors] = useState({});
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nowMs, setNowMs] = useState(Date.now());

  const rows = useMemo(
    () =>
      buildLoadingPlanRows({
        ...data,
        targetBoxes,
        nowMs,
      }),
    [data, nowMs, targetBoxes]
  );

  useEffect(() => {
    setDrafts((previous) =>
      Object.fromEntries(
        rows.map((row) => [
          row.key,
          previous[row.key] || row.draft,
        ])
      )
    );
  }, [rows]);

  const loadPlan = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result =
          await fetchExpeditionLoadingPlanData(
            supabase,
            reference
          );
        setData(result);
        setNowMs(Date.now());
      } catch (loadError) {
        setError(
          loadError?.message ||
            "No se ha podido cargar el plan de preparación."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reference]
  );

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    const channel = supabase
      .channel(`expedition-loading-plan-v232-${reference}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_trucks",
        },
        () => loadPlan({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_schedule",
        },
        () => loadPlan({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
        },
        () => loadPlan({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_documents",
        },
        () => loadPlan({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_loading_plan",
        },
        () => loadPlan({ silent: true })
      )
      .subscribe();
    const fallbackTimer = window.setInterval(
      () => loadPlan({ silent: true }),
      60_000
    );

    return () => {
      window.clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [loadPlan, reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const draft = drafts[row.key] || row.draft;
      const text = [
        row.truckNumber,
        row.customer,
        row.destination,
        row.carrier,
        row.tractorPlate,
        row.trailerPlate,
        draft.preparationResponsible,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedSearch ||
          text.includes(normalizedSearch)) &&
        (!dateFilter ||
          draft.loadingDate === dateFilter ||
          (!draft.loadingDate &&
            row.calendarDate === dateFilter)) &&
        (statusFilter === "ALL" ||
          draft.loadingStatus === statusFilter)
      );
    });
  }, [dateFilter, drafts, rows, search, statusFilter]);

  const summary = useMemo(
    () =>
      summarizeLoadingPlan(
        rows.map((row) => ({
          ...row,
          draft: drafts[row.key] || row.draft,
        }))
      ),
    [drafts, rows]
  );

  const updateDraft = (key, patch) => {
    setDrafts((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        ...patch,
      },
    }));
    setSavedKey("");
    setRowErrors((previous) => ({
      ...previous,
      [key]: "",
    }));
  };

  const saveRow = async (row) => {
    const draft = drafts[row.key] || row.draft;
    const validation = validateLoadingStatus(row, draft);

    if (!validation.valid) {
      setRowErrors((previous) => ({
        ...previous,
        [row.key]: validation.message,
      }));
      return;
    }

    setBusyKey(row.key);
    setSavedKey("");
    setRowErrors((previous) => ({
      ...previous,
      [row.key]: "",
    }));

    try {
      const saved = await saveExpeditionLoadingPlan(supabase, {
        reference: row.reference || reference,
        truckNumber: row.truckNumber,
        draft,
        updatedBy: actorName(currentUser),
      });

      await recordTruckAuditEventSafely(supabase, {
        truck: row.raw,
        truckId: row.actualTruckId,
        scheduleId: row.scheduleId,
        reference: row.reference || reference,
        truckNumber: row.truckNumber,
        eventType: "LOADING_PLAN_UPDATED",
        eventLabel: "Plan de carga actualizado",
        actor: currentUser,
        source: row.source,
        metadata: {
          loading_status: draft.loadingStatus,
          preparation_responsible:
            draft.preparationResponsible,
          loading_date: draft.loadingDate || null,
          loading_start_time:
            draft.loadingStartTime || null,
          loading_end_time: draft.loadingEndTime || null,
          completed_boxes: row.completedBoxes,
          pending_boxes: row.pendingBoxes,
          checklist: draft.checklist,
        },
      });

      setData((previous) => ({
        ...previous,
        plans: [
          saved,
          ...previous.plans.filter(
            (plan) =>
              String(plan.reference) !==
                String(saved.reference) ||
              Number(plan.truck_number) !==
                Number(saved.truck_number)
          ),
        ],
      }));
      setSavedKey(row.key);
    } catch (saveError) {
      setRowErrors((previous) => ({
        ...previous,
        [row.key]:
          saveError?.message ||
          "No se ha podido guardar el plan de carga.",
      }));
    } finally {
      setBusyKey("");
    }
  };

  const openRow = (row) => {
    if (row.source === "ACTUAL") {
      onOpenActualTruck?.(row.raw);
    } else {
      onOpenPlannedTruck?.(row.raw);
    }
    onClose?.();
  };

  const printPlan = () => {
    setExportError("");
    const popup = window.open("", "_blank");

    if (!popup) {
      setExportError(
        "El navegador ha bloqueado la ventana del PDF."
      );
      return;
    }

    const exportRows = downloadRows(visibleRows, drafts);
    const exportSummary = summarizeLoadingPlan(
      visibleRows.map((row) => ({
        ...row,
        draft: drafts[row.key] || row.draft,
      }))
    );
    const titleDate = dateFilter
      ? formatDate(dateFilter)
      : "cola operativa completa";
    const tableRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.Posición)}</td>
            <td><strong>Camión ${escapeHtml(row.Camión)}</strong><br>${escapeHtml(row.Origen)}</td>
            <td>${escapeHtml(row["Fecha de carga"] || row["Fecha prevista"])}<br>${escapeHtml(row["Hora inicio"])} – ${escapeHtml(row["Hora fin"])}</td>
            <td>${escapeHtml(row.Responsable)}</td>
            <td>${escapeHtml(row.Estado)}</td>
            <td>${escapeHtml(row["Cajas disponibles"])} / ${escapeHtml(row["Cajas necesarias"])}<br>${escapeHtml(row["Cajas pendientes"])} pendientes</td>
            <td>${escapeHtml(row["Pendientes / alertas"])}</td>
          </tr>`
      )
      .join("");

    popup.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(
            loadingPlanFileBase(reference, dateFilter)
          )}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            p { margin: 0 0 14px; color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #0f172a; color: white; padding: 8px; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 7px; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .summary { display: flex; gap: 12px; margin-bottom: 14px; font-weight: bold; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>FM Control · Plan de carga</h1>
          <p>${escapeHtml(reference)} · ${escapeHtml(titleDate)} · Generado ${escapeHtml(new Date().toLocaleString("es-ES"))}</p>
          <div class="summary">
            <span>Expediciones: ${visibleRows.length}</span>
            <span>Preparando: ${exportSummary.preparing}</span>
            <span>Listas: ${exportSummary.ready}</span>
            <span>Cargadas: ${exportSummary.loaded}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Cola</th><th>Camión</th><th>Franja</th><th>Responsable</th>
                <th>Estado</th><th>Cajas</th><th>Pendientes / alertas</th>
              </tr>
            </thead>
            <tbody>${tableRows || '<tr><td colspan="7">Sin expediciones para los filtros seleccionados.</td></tr>'}</tbody>
          </table>
          <script>window.addEventListener("load", () => window.print());</script>
        </body>
      </html>`);
    popup.document.close();
  };

  const exportExcel = async () => {
    setExportError("");

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const planRows = downloadRows(visibleRows, drafts);
      const checklistRows = visibleRows.flatMap((row) => {
        const draft = drafts[row.key] || row.draft;

        return LOADING_CHECKLIST_ITEMS.map((item) => ({
          Camión: row.truckNumber,
          "Fecha de carga": draft.loadingDate || "",
          Responsable: draft.preparationResponsible || "",
          Control: item.label,
          Completado: draft.checklist[item.key] ? "Sí" : "No",
        }));
      });
      const alertRows = visibleRows.flatMap((row) =>
        row.alerts.map((alert) => ({
          Camión: row.truckNumber,
          Severidad: alert.severity,
          Aviso: alert.message,
        }))
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(planRows),
        "Plan de carga"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(checklistRows),
        "Checklist"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(alertRows),
        "Alertas"
      );
      XLSX.writeFile(
        workbook,
        `${loadingPlanFileBase(reference, dateFilter)}.xlsx`
      );
    } catch (excelError) {
      setExportError(
        excelError?.message ||
          "No se ha podido generar el archivo Excel."
      );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10040] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              FM Control · V2.32
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              Plan de carga y preparación
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cola operativa, cajas, responsables, horarios y
              controles de carga.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={printPlan}
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
            {onOpenCalendar && (
              <button
                type="button"
                onClick={() => {
                  onOpenCalendar();
                  onClose?.();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-800"
              >
                <CalendarClock size={18} />
                Calendario
              </button>
            )}
            <button
              type="button"
              onClick={() => loadPlan({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
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
              aria-label="Cerrar plan de carga"
            >
              <X size={22} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
              {error}
            </div>
          )}

          {exportError && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-800">
              {exportError}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Expediciones"
              value={summary.total}
              detail="en la cola operativa"
              tone="slate"
              icon={Truck}
            />
            <MetricCard
              label="En preparación"
              value={summary.preparing}
              detail={`${summary.pending} todavía pendientes`}
              tone="blue"
              icon={ClipboardCheck}
            />
            <MetricCard
              label="Listas / cargadas"
              value={`${summary.ready} / ${summary.loaded}`}
              detail="estado operativo"
              tone="emerald"
              icon={CheckCircle2}
            />
            <MetricCard
              label="Cajas disponibles"
              value={summary.boxesReady}
              detail={`${summary.boxesPending} pendientes`}
              tone="amber"
              icon={Boxes}
            />
            <MetricCard
              label="Alertas"
              value={
                summary.alertCounts.CRITICAL +
                summary.alertCounts.WARNING
              }
              detail={`${summary.alertCounts.CRITICAL} críticas · ${summary.alertCounts.WARNING} avisos`}
              tone={
                summary.alertCounts.CRITICAL ? "red" : "amber"
              }
              icon={AlertTriangle}
            />
          </section>

          <section className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_220px_auto]">
              <label className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Buscar camión, cliente, destino, matrícula o responsable..."
                  className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) =>
                  setDateFilter(event.target.value)
                }
                aria-label="Filtrar por fecha de carga"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filtrar por estado"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">Todos los estados</option>
                {LOADING_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDateFilter("");
                  setStatusFilter("ALL");
                }}
                className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white shadow-sm hover:bg-slate-800"
              >
                Limpiar
              </button>
            </div>
          </section>

          {loading ? (
            <div className="mt-5 flex min-h-64 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white">
              <LoaderCircle
                className="animate-spin text-blue-600"
                size={36}
              />
            </div>
          ) : visibleRows.length ? (
            <div className="mt-5 space-y-5">
              {visibleRows.map((row) => (
                <LoadingPlanCard
                  key={row.key}
                  row={row}
                  draft={drafts[row.key] || row.draft}
                  busy={busyKey === row.key}
                  saved={savedKey === row.key}
                  error={rowErrors[row.key]}
                  onChange={updateDraft}
                  onSave={saveRow}
                  onOpen={openRow}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-12 text-center">
              <Truck
                className="mx-auto text-slate-300"
                size={44}
              />
              <h3 className="mt-3 text-xl font-black text-slate-950">
                Sin expediciones para preparar
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Revisa los filtros o crea una nueva expedición
                planificada.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
