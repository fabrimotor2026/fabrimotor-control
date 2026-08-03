import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  Flag,
  Link2,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  ScanLine,
  Truck,
  UserRound,
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
  buildDockOverview,
  completeDockLoadingSession,
  createLoadingIncident,
  evaluateDockCompletion,
  fetchDockLoadingData,
  LOADING_INCIDENT_TYPES,
  resolveLoadingIncident,
  scanDockBox,
  setDockSessionStatus,
  startDockLoadingSession,
} from "../../../services/dockLoadingService";
import {
  normalizeAuditActor,
  recordTruckAuditEventSafely,
} from "../../../services/truckAuditService";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function formatDuration(startedAt, nowMs) {
  const start = new Date(startedAt).getTime();

  if (!Number.isFinite(start)) return "-";

  const seconds = Math.max(
    0,
    Math.floor((nowMs - start) / 1000)
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    hours ? `${hours} h` : "",
    `${minutes} min`,
    `${remainingSeconds} s`,
  ]
    .filter(Boolean)
    .join(" ");
}

function operatorActor(user) {
  return normalizeAuditActor(user);
}

function incidentLabel(value) {
  return (
    LOADING_INCIDENT_TYPES.find(
      (incident) => incident.value === value
    )?.label || "Otra incidencia"
  );
}

function DockStatus({ overview }) {
  const status = overview.summary.dockStatus;
  const presentation = {
    FREE: {
      label: "Muelle libre",
      detail: "Disponible para iniciar una nueva carga.",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    LOADING: {
      label: "Carga en curso",
      detail: `Camión ${
        overview.activeSession?.truck_number || "-"
      } ocupando el muelle.`,
      className: "border-blue-200 bg-blue-50 text-blue-950",
    },
    PAUSED: {
      label: "Carga pausada",
      detail: `El muelle sigue reservado para el camión ${
        overview.activeSession?.truck_number || "-"
      }.`,
      className: "border-amber-200 bg-amber-50 text-amber-950",
    },
  }[status] || {
    label: status,
    detail: "",
    className: "border-slate-200 bg-white text-slate-950",
  };

  return (
    <section
      className={`rounded-[1.5rem] border p-5 shadow-sm ${presentation.className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Truck size={24} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
              Muelle único Fabrimotor
            </p>
            <h3 className="mt-1 text-2xl font-black">
              {presentation.label}
            </h3>
            <p className="mt-1 text-sm font-bold opacity-75">
              {presentation.detail}
            </p>
          </div>
        </div>

        <div className="flex gap-3 text-center">
          <div className="rounded-xl bg-white/80 px-4 py-2 shadow-sm">
            <p className="text-2xl font-black">
              {overview.summary.readyToStart}
            </p>
            <p className="text-[10px] font-black uppercase opacity-70">
              listas
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-4 py-2 shadow-sm">
            <p className="text-2xl font-black">
              {overview.summary.waiting}
            </p>
            <p className="text-[10px] font-black uppercase opacity-70">
              en espera
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TruckSelection({
  rows,
  selectedKey,
  onSelect,
  onOpenTruck,
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center">
        <Truck className="mx-auto text-slate-300" size={42} />
        <h3 className="mt-3 text-xl font-black text-slate-950">
          No hay camiones pendientes de carga
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Los camiones aparecerán cuando estén abiertos o cerrados
          en producción.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
          Cola del muelle
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          Seleccionar camión
        </h3>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const selected = selectedKey === row.key;
          const isClosed = row.truck?.status === "CLOSED";

          return (
            <article
              key={row.key}
              className={`rounded-2xl border p-4 transition ${
                selected
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(row.key)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-slate-950">
                      Camión {row.truckNumber}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        isClosed
                          ? "bg-slate-200 text-slate-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isClosed
                        ? "Producción cerrada"
                        : "Producción abierta"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-500">
                    {row.truck?.customer_name || "Sin cliente"} ·{" "}
                    {row.truck?.destination || "Sin destino"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700">
                      {row.expectedBoxes}/{row.targetBoxes} cajas
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        row.plan?.loading_status === "READY"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.plan?.loading_status === "READY"
                        ? "Preparación lista"
                        : "Preparación pendiente"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTruck(row)}
                  className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50"
                  aria-label={`Abrir camión ${row.truckNumber}`}
                >
                  <Link2 size={17} />
                </button>
              </div>

              {selected && row.startBlockers.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-black uppercase text-amber-800">
                    Antes de iniciar
                  </p>
                  <ul className="mt-2 space-y-1 text-xs font-bold text-amber-900">
                    {row.startBlockers.map((blocker) => (
                      <li key={blocker}>• {blocker}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function DockLoadingModal({
  reference = "F-1012",
  targetBoxes = 49,
  currentUser = null,
  onOpenActualTruck,
  onOpenLoadingPlan,
  onClose,
}) {
  const actor = useMemo(
    () => operatorActor(currentUser),
    [currentUser]
  );
  const [data, setData] = useState({
    trucks: [],
    plans: [],
    sessions: [],
    labels: [],
    sessionBoxes: [],
    incidents: [],
  });
  const [selectedKey, setSelectedKey] = useState("");
  const [operatorCode, setOperatorCode] = useState(
    actor.username || ""
  );
  const [operatorName, setOperatorName] = useState(
    actor.name || ""
  );
  const [boxNumber, setBoxNumber] = useState("");
  const [incidentType, setIncidentType] =
    useState("DAMAGED_BOX");
  const [incidentDescription, setIncidentDescription] =
    useState("");
  const [confirmations, setConfirmations] = useState({
    tractorConfirmed: false,
    trailerConfirmed: false,
    sealConfirmed: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const scanInputRef = useRef(null);

  const overview = useMemo(
    () =>
      buildDockOverview({
        ...data,
        targetBoxes,
      }),
    [data, targetBoxes]
  );
  const currentRow = overview.activeSession
    ? overview.activeRow
    : overview.rows.find((row) => row.key === selectedKey) ||
      overview.rows[0] ||
      null;

  const loadDock = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await fetchDockLoadingData(
          supabase,
          reference
        );
        setData(result);
      } catch (loadError) {
        setError(
          loadError?.message ||
            "No se ha podido cargar el estado del muelle."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reference]
  );

  useEffect(() => {
    loadDock();
  }, [loadDock]);

  useEffect(() => {
    if (
      overview.rows[0] &&
      !overview.rows.some((row) => row.key === selectedKey)
    ) {
      setSelectedKey(overview.rows[0].key);
    }
  }, [overview.rows, selectedKey]);

  useEffect(() => {
    const activeSession = overview.activeSession;

    if (!activeSession) return;

    setOperatorCode(
      activeSession.operator_code || actor.username || ""
    );
    setOperatorName(
      activeSession.operator_name || actor.name || ""
    );
    setConfirmations({
      tractorConfirmed: Boolean(
        activeSession.tractor_confirmed
      ),
      trailerConfirmed: Boolean(
        activeSession.trailer_confirmed
      ),
      sealConfirmed: Boolean(activeSession.seal_confirmed),
    });
  }, [actor.name, actor.username, overview.activeSession]);

  useEffect(() => {
    if (overview.activeSession?.status !== "LOADING") return;

    const focusTimer = window.setTimeout(
      () => scanInputRef.current?.focus(),
      100
    );

    return () => window.clearTimeout(focusTimer);
  }, [
    overview.activeSession?.id,
    overview.activeSession?.status,
  ]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNowMs(Date.now()),
      1000
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`dock-loading-v233-${reference}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_loading_sessions",
        },
        () => loadDock({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_loading_session_boxes",
        },
        () => loadDock({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_loading_incidents",
        },
        () => loadDock({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
        },
        () => loadDock({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_loading_plan",
        },
        () => loadDock({ silent: true })
      )
      .subscribe();
    const fallbackTimer = window.setInterval(
      () => loadDock({ silent: true }),
      60_000
    );

    return () => {
      window.clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [loadDock, reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const runAction = async (name, action) => {
    setBusyAction(name);
    setError("");
    setSuccess("");

    try {
      await action();
    } catch (actionError) {
      setError(
        actionError?.message ||
          "No se ha podido completar la operación."
      );
    } finally {
      setBusyAction("");
    }
  };

  const startLoading = () =>
    runAction("start", async () => {
      if (!currentRow) {
        throw new Error("Selecciona un camión.");
      }

      if (!currentRow.canStart) {
        throw new Error(
          currentRow.startBlockers.join(". ") ||
            "El camión todavía no está preparado."
        );
      }

      const session = await startDockLoadingSession(supabase, {
        reference,
        truck: currentRow.truck,
        operatorCode,
        operatorName,
        targetBoxes,
      });

      await recordTruckAuditEventSafely(supabase, {
        truck: currentRow.truck,
        truckId: currentRow.truck.id,
        reference,
        truckNumber: currentRow.truckNumber,
        eventType: "DOCK_LOADING_STARTED",
        eventLabel: "Carga iniciada en muelle",
        actor: currentUser,
        source: "ACTUAL",
        metadata: {
          session_id: session.id,
          operator_code: operatorCode,
          operator_name: operatorName,
          target_boxes: targetBoxes,
        },
      });

      setSuccess(
        `Carga del camión ${currentRow.truckNumber} iniciada.`
      );
      await loadDock({ silent: true });
    });

  const togglePause = () =>
    runAction("pause", async () => {
      if (!overview.activeSession) return;
      const nextStatus =
        overview.activeSession.status === "PAUSED"
          ? "LOADING"
          : "PAUSED";
      await setDockSessionStatus(
        supabase,
        overview.activeSession.id,
        nextStatus
      );
      setSuccess(
        nextStatus === "PAUSED"
          ? "Carga pausada. El muelle continúa reservado."
          : "Carga reanudada."
      );
      await loadDock({ silent: true });
    });

  const registerBox = (event) => {
    event?.preventDefault();

    return runAction("scan", async () => {
      if (
        !overview.activeSession ||
        overview.activeSession.status !== "LOADING"
      ) {
        throw new Error("La carga no está activa.");
      }

      const scanned = await scanDockBox(supabase, {
        sessionId: overview.activeSession.id,
        boxNumber,
        actor: actor.display,
      });
      setSuccess(`Caja ${scanned?.box_number || boxNumber} cargada.`);
      setBoxNumber("");
      await loadDock({ silent: true });
      window.setTimeout(
        () => scanInputRef.current?.focus(),
        50
      );
    });
  };

  const addIncident = () =>
    runAction("incident", async () => {
      if (!overview.activeSession) {
        throw new Error("No existe una carga activa.");
      }

      await createLoadingIncident(supabase, {
        session: overview.activeSession,
        incidentType,
        description: incidentDescription,
        createdBy: actor.display,
      });
      setIncidentDescription("");
      setSuccess("Incidencia registrada.");
      await loadDock({ silent: true });
    });

  const resolveIncident = (incident) =>
    runAction(`resolve-${incident.id}`, async () => {
      await resolveLoadingIncident(supabase, incident.id, {
        resolution: "Resuelta durante la carga",
        resolvedBy: actor.display,
      });
      setSuccess("Incidencia resuelta.");
      await loadDock({ silent: true });
    });

  const finishLoading = () =>
    runAction("finish", async () => {
      if (!currentRow?.session) {
        throw new Error("No existe una carga activa.");
      }

      const validation = evaluateDockCompletion(
        currentRow,
        confirmations
      );

      if (!validation.isComplete) {
        throw new Error(validation.blockers.join(". "));
      }

      await completeDockLoadingSession(supabase, {
        sessionId: currentRow.session.id,
        actor: actor.display,
        confirmations,
      });

      await recordTruckAuditEventSafely(supabase, {
        truck: currentRow.truck,
        truckId: currentRow.truck.id,
        reference,
        truckNumber: currentRow.truckNumber,
        eventType: "DOCK_LOADING_COMPLETED",
        eventLabel: "Carga finalizada en muelle",
        actor: currentUser,
        source: "ACTUAL",
        metadata: {
          session_id: currentRow.session.id,
          loaded_boxes: currentRow.loadedBoxes,
          tractor_confirmed: true,
          trailer_confirmed: true,
          seal_confirmed: true,
        },
      });

      setConfirmations({
        tractorConfirmed: false,
        trailerConfirmed: false,
        sealConfirmed: false,
      });
      setSuccess(
        `Camión ${currentRow.truckNumber} cargado. El muelle vuelve a estar libre.`
      );
      await loadDock({ silent: true });
    });

  const openTruck = (row) => {
    onOpenActualTruck?.(row.truck);
    onClose?.();
  };

  const completion = currentRow?.session
    ? evaluateDockCompletion(currentRow, confirmations)
    : null;
  const progressPercent = currentRow
    ? Math.min(
        100,
        Math.round(
          (currentRow.loadedBoxes /
            Math.max(1, currentRow.targetBoxes)) *
            100
        )
      )
    : 0;

  return createPortal(
    <div className="fixed inset-0 z-[10045] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              FM Control · V2.33
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              Carga asistida · Muelle único
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Control caja por caja, incidencias y validación final
              de la carga.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onOpenLoadingPlan && (
              <button
                type="button"
                onClick={() => {
                  onOpenLoadingPlan();
                  onClose?.();
                }}
                className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-800"
              >
                Plan de carga
              </button>
            )}
            <button
              type="button"
              onClick={() => loadDock({ silent: true })}
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
              aria-label="Cerrar control del muelle"
            >
              <X size={22} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
              {success}
            </div>
          )}

          <DockStatus overview={overview} />

          {loading ? (
            <div className="mt-5 flex min-h-64 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white">
              <LoaderCircle
                className="animate-spin text-blue-600"
                size={38}
              />
            </div>
          ) : !overview.activeSession ? (
            <div className="mt-5 space-y-5">
              <TruckSelection
                rows={overview.rows}
                selectedKey={currentRow?.key || ""}
                onSelect={setSelectedKey}
                onOpenTruck={openTruck}
              />

              {currentRow && (
                <section className="rounded-[1.5rem] border border-blue-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                        Inicio de carga
                      </p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        Camión {currentRow.truckNumber}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                        currentRow.canStart
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {currentRow.canStart
                        ? "Listo para iniciar"
                        : "Preparación pendiente"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-600">
                        <UserRound size={15} />
                        Código del operario
                      </span>
                      <input
                        value={operatorCode}
                        onChange={(event) =>
                          setOperatorCode(event.target.value)
                        }
                        placeholder="Ej. 2116"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                        Nombre
                      </span>
                      <input
                        value={operatorName}
                        onChange={(event) =>
                          setOperatorName(event.target.value)
                        }
                        placeholder="Responsable de la carga"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    {onOpenLoadingPlan &&
                      !currentRow.canStart && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenLoadingPlan();
                            onClose?.();
                          }}
                          className="rounded-xl bg-white px-5 py-3 font-black text-blue-700 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50"
                        >
                          Completar preparación
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={startLoading}
                      disabled={
                        !currentRow.canStart ||
                        busyAction === "start"
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === "start" ? (
                        <LoaderCircle
                          className="animate-spin"
                          size={18}
                        />
                      ) : (
                        <Play size={18} />
                      )}
                      Iniciar carga en el muelle
                    </button>
                  </div>
                </section>
              )}
            </div>
          ) : currentRow ? (
            <div className="mt-5 space-y-5">
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-950">
                        Camión {currentRow.truckNumber}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          overview.activeSession.status === "PAUSED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {overview.activeSession.status === "PAUSED"
                          ? "Carga pausada"
                          : "Cargando"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {currentRow.truck?.customer_name || "Sin cliente"} ·{" "}
                      {currentRow.truck?.destination || "Sin destino"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openTruck(currentRow)}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-black text-blue-700 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50"
                    >
                      <Link2 size={17} />
                      Ver camión
                    </button>
                    <button
                      type="button"
                      onClick={togglePause}
                      disabled={busyAction === "pause"}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 font-black shadow-sm disabled:opacity-50 ${
                        overview.activeSession.status === "PAUSED"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-amber-500 text-amber-950 hover:bg-amber-400"
                      }`}
                    >
                      {overview.activeSession.status === "PAUSED" ? (
                        <Play size={18} />
                      ) : (
                        <Pause size={18} />
                      )}
                      {overview.activeSession.status === "PAUSED"
                        ? "Reanudar"
                        : "Pausar"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl bg-slate-950 p-4 text-white">
                    <p className="text-xs font-black uppercase opacity-70">
                      Cajas cargadas
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {currentRow.loadedBoxes} /{" "}
                      {currentRow.targetBoxes}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                    <p className="text-xs font-black uppercase opacity-70">
                      Pendientes
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {currentRow.pendingLoadBoxes}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4 text-blue-950 ring-1 ring-blue-200">
                    <p className="text-xs font-black uppercase opacity-70">
                      Responsable
                    </p>
                    <p className="mt-2 truncate text-lg font-black">
                      {[
                        overview.activeSession.operator_code,
                        overview.activeSession.operator_name,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-slate-950 ring-1 ring-slate-200">
                    <p className="flex items-center gap-2 text-xs font-black uppercase opacity-70">
                      <Clock size={14} />
                      Tiempo de carga
                    </p>
                    <p className="mt-2 text-lg font-black">
                      {formatDuration(
                        overview.activeSession.started_at,
                        nowMs
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <div className="space-y-5">
                  <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="rounded-2xl bg-blue-600 p-3 text-white">
                        <ScanLine size={24} />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                          Lectura de cajas
                        </p>
                        <h3 className="text-xl font-black text-slate-950">
                          Escanear siguiente caja
                        </h3>
                      </div>
                    </div>

                    <form
                      onSubmit={registerBox}
                      className="mt-4 flex flex-col gap-3 sm:flex-row"
                    >
                      <input
                        ref={scanInputRef}
                        value={boxNumber}
                        onChange={(event) => {
                          setBoxNumber(event.target.value);
                          setError("");
                          setSuccess("");
                        }}
                        placeholder="Ej. FB-26-02059"
                        autoComplete="off"
                        disabled={
                          overview.activeSession.status !==
                            "LOADING" ||
                          busyAction === "scan"
                        }
                        className="min-w-0 flex-1 rounded-xl border border-blue-300 bg-white px-5 py-4 text-xl font-black uppercase tracking-wide text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={
                          !boxNumber.trim() ||
                          overview.activeSession.status !==
                            "LOADING" ||
                          busyAction === "scan"
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {busyAction === "scan" ? (
                          <LoaderCircle
                            className="animate-spin"
                            size={19}
                          />
                        ) : (
                          <Boxes size={19} />
                        )}
                        Registrar caja
                      </button>
                    </form>

                    <p className="mt-3 text-xs font-bold text-blue-800">
                      Pulsa Intro después de leer la etiqueta. Se
                      rechazará cualquier caja duplicada o asignada a
                      otro camión.
                    </p>
                  </section>

                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                          Trazabilidad
                        </p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          Últimas cajas cargadas
                        </h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {currentRow.loadedRows.length}
                      </span>
                    </div>

                    {currentRow.loadedRows.length ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {currentRow.loadedRows
                          .slice(0, 12)
                          .map((box, index) => (
                            <div
                              key={box.id}
                              className={`rounded-xl border p-3 ${
                                index === 0
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <p className="font-black text-slate-950">
                                {box.box_number}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {formatDateTime(box.loaded_at)}
                              </p>
                              <p className="mt-1 truncate text-xs font-bold text-slate-600">
                                {box.loaded_by || "Sin identificar"}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                        Todavía no se ha cargado ninguna caja.
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-[1.5rem] border border-red-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                          Incidencias
                        </p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          Problemas durante la carga
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          currentRow.openIncidents.length
                            ? "bg-red-100 text-red-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {currentRow.openIncidents.length} abiertas
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <select
                        value={incidentType}
                        onChange={(event) =>
                          setIncidentType(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      >
                        {LOADING_INCIDENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={incidentDescription}
                        onChange={(event) =>
                          setIncidentDescription(
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Describe qué ha ocurrido"
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                      <button
                        type="button"
                        onClick={addIncident}
                        disabled={
                          !incidentDescription.trim() ||
                          busyAction === "incident"
                        }
                        className="w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        Registrar incidencia
                      </button>
                    </div>

                    {currentRow.incidents.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {currentRow.incidents
                          .slice(0, 8)
                          .map((incident) => (
                            <div
                              key={incident.id}
                              className={`rounded-xl border p-3 ${
                                incident.status === "RESOLVED"
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-red-200 bg-red-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-950">
                                    {incidentLabel(
                                      incident.incident_type
                                    )}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {incident.description}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-slate-500">
                                    {formatDateTime(
                                      incident.created_at
                                    )}
                                  </p>
                                </div>
                                {incident.status !== "RESOLVED" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      resolveIncident(incident)
                                    }
                                    disabled={
                                      busyAction ===
                                      `resolve-${incident.id}`
                                    }
                                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Resolver
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-[1.5rem] border border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <Flag size={22} />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                          Cierre de carga
                        </p>
                        <h3 className="text-xl font-black text-slate-950">
                          Confirmación final
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        {
                          key: "tractorConfirmed",
                          label: `Tractora: ${
                            currentRow.truck?.tractor_plate ||
                            currentRow.truck?.vehicle_plate ||
                            "-"
                          }`,
                        },
                        {
                          key: "trailerConfirmed",
                          label: `Remolque: ${
                            currentRow.truck?.trailer_plate || "-"
                          }`,
                        },
                        {
                          key: "sealConfirmed",
                          label: `Brida / precinto: ${
                            currentRow.truck?.seal_number || "-"
                          }`,
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                            confirmations[item.key]
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={confirmations[item.key]}
                            onChange={(event) =>
                              setConfirmations((previous) => ({
                                ...previous,
                                [item.key]: event.target.checked,
                              }))
                            }
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-bold text-slate-800">
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    {completion?.blockers.length > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 font-black text-amber-900">
                          <AlertTriangle size={17} />
                          No se puede finalizar
                        </div>
                        <ul className="mt-2 space-y-1 text-xs font-bold text-amber-900">
                          {completion.blockers.map((blocker) => (
                            <li key={blocker}>• {blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={finishLoading}
                      disabled={
                        !completion?.isComplete ||
                        busyAction === "finish"
                      }
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === "finish" ? (
                        <LoaderCircle
                          className="animate-spin"
                          size={18}
                        />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      Finalizar carga y liberar muelle
                    </button>
                  </section>
                </div>
              </div>
            </div>
          ) : (
            <section className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
              <AlertTriangle
                className="mx-auto text-amber-600"
                size={38}
              />
              <h3 className="mt-3 text-xl font-black text-amber-950">
                Muelle ocupado por otra referencia
              </h3>
              <p className="mt-1 text-sm font-bold text-amber-800">
                Camión {overview.activeSession.truck_number} ·{" "}
                {overview.activeSession.reference}. Debe finalizarse
                desde su referencia antes de iniciar otra carga.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
