import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gauge,
  Info,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  buildExpeditionAlerts,
} from "../../../services/expeditionAlerts";
import {
  buildExpeditionForecast,
  fetchForecastTruckLabels,
} from "../../../services/expeditionForecast";

const SEVERITY_PRESENTATION = {
  CRITICAL: {
    label: "Crítica",
    singular: "crítica",
    icon: ShieldAlert,
    card: "border-red-300 bg-red-50",
    iconClass: "bg-red-100 text-red-700",
    badge: "bg-red-600 text-white",
    text: "text-red-800",
  },
  WARNING: {
    label: "Advertencia",
    singular: "advertencia",
    icon: AlertTriangle,
    card: "border-amber-300 bg-amber-50",
    iconClass: "bg-amber-100 text-amber-800",
    badge: "bg-amber-500 text-amber-950",
    text: "text-amber-900",
  },
  INFO: {
    label: "Información",
    singular: "informativa",
    icon: Info,
    card: "border-blue-200 bg-blue-50",
    iconClass: "bg-blue-100 text-blue-700",
    badge: "bg-blue-600 text-white",
    text: "text-blue-800",
  },
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "Todas" },
  { value: "CRITICAL", label: "Críticas" },
  { value: "WARNING", label: "Advertencias" },
  { value: "INFO", label: "Información" },
];

function formatDate(value) {
  if (!value) return "Sin fecha prevista";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : String(value);
}

function SummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
}) {
  const tones = {
    red: active
      ? "border-red-500 bg-red-600 text-white"
      : "border-red-200 bg-red-50 text-red-800",
    amber: active
      ? "border-amber-500 bg-amber-500 text-amber-950"
      : "border-amber-200 bg-amber-50 text-amber-900",
    blue: active
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tones[tone]}`}
    >
      <span className="block text-2xl font-black">{value}</span>
      <span className="mt-1 block text-xs font-black uppercase tracking-wide">
        {label}
      </span>
    </button>
  );
}

function AlertCard({ alert, onOpen }) {
  const presentation =
    SEVERITY_PRESENTATION[alert.severity] ||
    SEVERITY_PRESENTATION.INFO;
  const Icon = presentation.icon;

  return (
    <article
      className={`rounded-2xl border p-4 ${presentation.card}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 rounded-xl p-2.5 ${presentation.iconClass}`}
        >
          <Icon size={21} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="font-black text-slate-950">
              {alert.title}
            </h4>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${presentation.badge}`}
            >
              {presentation.label}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {alert.message}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-black ${presentation.text}`}
            >
              <Clock3 size={14} />
              {formatDate(alert.dueDate)}
            </span>
            <button
              type="button"
              onClick={() => onOpen(alert)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              <ExternalLink size={15} />
              {alert.actionLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ExpeditionAlertCenter({
  activeEntry,
  plannedEntries = [],
  currentTruck,
  activeTruck,
  nextPlannedTruck,
  targetBoxes = 49,
  piecesPerBox = 16,
  onOpenActualTruck,
  onOpenPlannedTruck,
  onOpenForecast,
  onSummaryChange,
}) {
  const [activeLabels, setActiveLabels] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  const loadActiveLabels = useCallback(async () => {
    if (!activeTruck?.id) {
      setActiveLabels([]);
      setLoading(false);
      setLoadError("");
      return;
    }

    setLoading(true);

    try {
      const labels = await fetchForecastTruckLabels(
        supabase,
        activeTruck.id
      );
      setActiveLabels(labels);
      setNowMs(Date.now());
      setLoadError("");
    } catch (error) {
      setActiveLabels([]);
      setLoadError(
        error?.message ||
          "No se ha podido actualizar el ritmo del camión activo."
      );
    } finally {
      setLoading(false);
    }
  }, [activeTruck?.id]);

  useEffect(() => {
    loadActiveLabels();
  }, [loadActiveLabels]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNowMs(Date.now()),
      60000
    );

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeTruck?.id) return undefined;

    const channel = supabase
      .channel(`expedition-alerts-${activeTruck.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
          filter: `camion_id=eq.${activeTruck.id}`,
        },
        () => loadActiveLabels()
      )
      .subscribe();
    const fallbackTimer = window.setInterval(
      loadActiveLabels,
      60000
    );

    return () => {
      window.clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [activeTruck?.id, loadActiveLabels]);

  const forecast = useMemo(
    () =>
      buildExpeditionForecast({
        activeTruck,
        labels: activeLabels,
        targetBoxes,
        piecesPerBox,
        nextPlannedTruck,
        nowMs,
      }),
    [
      activeLabels,
      activeTruck,
      nextPlannedTruck,
      nowMs,
      piecesPerBox,
      targetBoxes,
    ]
  );
  const alertResult = useMemo(
    () =>
      buildExpeditionAlerts({
        activeEntry,
        plannedEntries,
        currentTruck,
        forecast,
      }),
    [
      activeEntry,
      currentTruck,
      forecast,
      plannedEntries,
    ]
  );
  const visibleAlerts = useMemo(
    () =>
      filter === "ALL"
        ? alertResult.alerts
        : alertResult.alerts.filter(
            (alert) => alert.severity === filter
          ),
    [alertResult.alerts, filter]
  );

  useEffect(() => {
    onSummaryChange?.(alertResult.summary);
  }, [
    alertResult.summary.critical,
    alertResult.summary.info,
    alertResult.summary.total,
    alertResult.summary.warning,
    onSummaryChange,
  ]);

  const openAlert = (alert) => {
    if (alert.actionType === "FORECAST") {
      onOpenForecast?.();
      return;
    }

    if (alert.actionType === "PLANNED") {
      onOpenPlannedTruck?.(alert.truck);
      return;
    }

    onOpenActualTruck?.(alert.truck);
  };

  return (
    <section
      id="expedition-alert-center"
      className="mt-6 scroll-mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`rounded-2xl p-3 ${
              alertResult.summary.critical
                ? "bg-red-100 text-red-700"
                : alertResult.summary.warning
                  ? "bg-amber-100 text-amber-800"
                  : alertResult.summary.total
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {alertResult.summary.total ? (
              <BellRing size={27} />
            ) : (
              <CheckCircle2 size={27} />
            )}
          </span>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              Logística · V2.29
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Centro de alertas y prioridades
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Los avisos se ordenan por urgencia y desaparecen al corregir su causa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase ${
              alertResult.summary.critical
                ? "bg-red-600 text-white"
                : alertResult.summary.warning
                  ? "bg-amber-500 text-amber-950"
                  : alertResult.summary.total
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {alertResult.summary.total
              ? `${alertResult.summary.total} alerta${
                  alertResult.summary.total === 1 ? "" : "s"
                }`
              : "Sin alertas"}
          </span>
          <button
            type="button"
            onClick={loadActiveLabels}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Actualizar
          </button>
          <button
            type="button"
            onClick={onOpenForecast}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700"
          >
            <Gauge size={16} />
            Previsión
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {loadError}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Críticas"
          value={alertResult.summary.critical}
          tone="red"
          active={filter === "CRITICAL"}
          onClick={() =>
            setFilter((current) =>
              current === "CRITICAL" ? "ALL" : "CRITICAL"
            )
          }
        />
        <SummaryCard
          label="Advertencias"
          value={alertResult.summary.warning}
          tone="amber"
          active={filter === "WARNING"}
          onClick={() =>
            setFilter((current) =>
              current === "WARNING" ? "ALL" : "WARNING"
            )
          }
        />
        <SummaryCard
          label="Información"
          value={alertResult.summary.info}
          tone="blue"
          active={filter === "INFO"}
          onClick={() =>
            setFilter((current) =>
              current === "INFO" ? "ALL" : "INFO"
            )
          }
        />
      </div>

      {alertResult.summary.total > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                filter === option.value
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {visibleAlerts.length ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {visibleAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onOpen={openAlert}
            />
          ))}
        </div>
      ) : alertResult.summary.total ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <CircleAlert
            className="mx-auto text-slate-400"
            size={32}
          />
          <p className="mt-2 font-black text-slate-700">
            No hay alertas de esta prioridad.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2
            className="mx-auto text-emerald-600"
            size={34}
          />
          <p className="mt-2 text-lg font-black text-emerald-900">
            Expediciones sin incidencias pendientes
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            No se detectan retrasos, riesgos ni datos urgentes por completar.
          </p>
        </div>
      )}
    </section>
  );
}
