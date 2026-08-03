import { useMemo } from "react";

function statusClass(status) {
  if (status === "READY") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "SHIPPED") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-red-100 text-red-800";
}

function dateAlertClass(level) {
  if (level === "danger") {
    return "border-red-300 bg-red-50 text-red-800";
  }

  if (level === "warning") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  if (level === "info") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function priorityForEntry(entry) {
  const alertLevel = entry?.checklist?.dateAlert?.level;
  const alertPriority =
    alertLevel === "danger"
      ? 0
      : alertLevel === "warning"
        ? 1
        : alertLevel === "info"
          ? 2
          : 3;
  const statusPriority =
    entry?.checklist?.status === "INCOMPLETE"
      ? 0
      : entry?.checklist?.status === "READY"
        ? 1
        : 2;
  const plannedDate =
    entry?.truck?.planned_expedition_date || "9999-12-31";

  return {
    alertPriority,
    statusPriority,
    plannedDate,
    truckNumber: Number(entry?.truck?.truck_number || 0),
  };
}

function compareEntries(first, second) {
  const firstPriority = priorityForEntry(first);
  const secondPriority = priorityForEntry(second);

  return (
    firstPriority.alertPriority - secondPriority.alertPriority ||
    firstPriority.statusPriority - secondPriority.statusPriority ||
    firstPriority.plannedDate.localeCompare(secondPriority.plannedDate) ||
    firstPriority.truckNumber - secondPriority.truckNumber
  );
}

function formatDate(value) {
  if (!value) return "Sin fecha prevista";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : String(value);
}

function SummaryCard({ label, value, tone }) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

export default function ExpeditionTrackingPanel({
  activeEntry,
  plannedEntries = [],
  currentTruckId,
  onSelectTruck,
}) {
  const entries = useMemo(() => {
    return [activeEntry, ...plannedEntries]
      .filter(Boolean)
      .filter((entry) => entry?.checklist?.status !== "SHIPPED")
      .sort(compareEntries);
  }, [activeEntry, plannedEntries]);

  const summary = useMemo(() => {
    return entries.reduce(
      (totals, entry) => {
        const alert = entry?.checklist?.dateAlert;

        if (alert?.level === "danger") {
          totals.overdue += 1;
        }

        if (
          alert?.label === "Expedición prevista hoy" ||
          alert?.label === "Expedición prevista mañana"
        ) {
          totals.todayOrTomorrow += 1;
        }

        if (entry?.checklist?.status === "READY") {
          totals.ready += 1;
        }

        if (entry?.checklist?.status === "INCOMPLETE") {
          totals.incomplete += 1;
        }

        return totals;
      },
      {
        overdue: 0,
        todayOrTomorrow: 0,
        ready: 0,
        incomplete: 0,
      }
    );
  }, [entries]);

  const openEntry = (entry) => {
    const isActive = entry.kind === "active";
    const targetId = isActive
      ? "active-truck-logistics"
      : `expedition-truck-${entry.truck.id}`;

    if (
      isActive &&
      entry.truck?.id &&
      entry.truck.id !== currentTruckId &&
      onSelectTruck
    ) {
      onSelectTruck(entry.truck.id);
    }

    window.setTimeout(() => {
      window.document
        .getElementById(targetId)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, isActive ? 100 : 0);
  };

  return (
    <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Logística · V2.24
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Seguimiento de expediciones
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Prioridad, preparación y datos pendientes de los próximos camiones.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
          {entries.length} expediciones
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Retrasadas"
          value={summary.overdue}
          tone="danger"
        />
        <SummaryCard
          label="Hoy o mañana"
          value={summary.todayOrTomorrow}
          tone="warning"
        />
        <SummaryCard
          label="Preparadas"
          value={summary.ready}
          tone="success"
        />
        <SummaryCard
          label="Incompletas"
          value={summary.incomplete}
          tone="info"
        />
      </div>

      {entries.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {entries.map((entry) => {
            const checklist = entry.checklist;
            const missingItems = checklist.missingItems || [];
            const visibleMissingItems = missingItems.slice(0, 3);
            const hiddenMissingItems =
              missingItems.length - visibleMissingItems.length;

            return (
              <article
                key={`${entry.kind}-${entry.truck.id || entry.truck.truck_number}`}
                className={`rounded-2xl border p-4 ${dateAlertClass(
                  checklist.dateAlert?.level
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-slate-950">
                        Camión {entry.truck.truck_number}
                      </span>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                        {entry.kind === "active"
                          ? "Activo"
                          : "Planificado"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-600">
                      {formatDate(
                        entry.truck.planned_expedition_date
                      )}
                      {entry.truck.customer_name
                        ? ` · ${entry.truck.customer_name}`
                        : ""}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase ${statusClass(
                      checklist.status
                    )}`}
                  >
                    {checklist.statusLabel}
                  </span>
                </div>

                {checklist.dateAlert && (
                  <div className="mt-3 text-sm font-black">
                    {checklist.dateAlert.label}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black text-slate-600">
                  <span>
                    {checklist.completedRequired}/
                    {checklist.totalRequired} requisitos
                  </span>
                  <span>{checklist.percent}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      checklist.isReady
                        ? "bg-emerald-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${checklist.percent}%` }}
                  />
                </div>

                {missingItems.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {visibleMissingItems.map((item) => (
                      <span
                        key={item.key}
                        className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-200"
                      >
                        {item.label}
                      </span>
                    ))}
                    {hiddenMissingItems > 0 && (
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                        +{hiddenMissingItems} pendientes
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 text-xs font-black text-emerald-700">
                    Todos los requisitos están preparados.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openEntry(entry)}
                  className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
                >
                  Revisar camión
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
          No hay expediciones pendientes de seguimiento.
        </div>
      )}
    </section>
  );
}
