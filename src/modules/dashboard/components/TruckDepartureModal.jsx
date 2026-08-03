import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  LockKeyhole,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
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
  buildDepartureDossierHtml,
  buildDepartureOverview,
  calculateDepartureDurations,
  confirmTruckDeparture,
  departureDossierFileName,
  evaluateDepartureConfirmation,
  fetchTruckDepartureData,
  formatDepartureDate,
  formatDurationMinutes,
  localDateTimeInputValue,
  reopenTruckDeparture,
} from "../../../services/truckDepartureService";
import {
  normalizeAuditActor,
} from "../../../services/truckAuditService";

function actorFromUser(currentUser) {
  const actor = normalizeAuditActor(currentUser);

  return {
    ...actor,
    role: String(
      currentUser?.role ||
        currentUser?.user_role ||
        currentUser?.profile ||
        ""
    ).trim(),
  };
}

function draftFromRow(row) {
  const isReopened =
    String(row?.departure?.status || "").toUpperCase() ===
    "REOPENED";

  return {
    driverName: row?.departure?.driver_name || "",
    departureAt:
      row?.departure?.departure_at && !isReopened
      ? localDateTimeInputValue(row.departure.departure_at)
      : localDateTimeInputValue(),
    departureNotes: row?.departure?.departure_notes || "",
  };
}

function confirmationsFromRow(row) {
  const isShipped =
    String(row?.departure?.status || "").toUpperCase() ===
    "SHIPPED";

  return {
    tractorConfirmed: isShipped && Boolean(
      row?.departure?.tractor_confirmed
    ),
    trailerConfirmed: isShipped && Boolean(
      row?.departure?.trailer_confirmed
    ),
    sealConfirmed:
      isShipped && Boolean(row?.departure?.seal_confirmed),
    documentsConfirmed: isShipped && Boolean(
      row?.departure?.documents_confirmed
    ),
  };
}

function statusPresentation(row) {
  if (row?.isShipped) {
    return {
      label: "Expedido",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (row?.canConfirm) {
    return {
      label: "Listo para salir",
      className: "bg-blue-100 text-blue-800",
    };
  }

  return {
    label: "Bloqueado",
    className: "bg-red-100 text-red-800",
  };
}

function writeDossierToPopup(popup, row, departure) {
  if (!popup) return false;

  const html = buildDepartureDossierHtml({
    row,
    departure,
  });
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
  return true;
}

function openDossierPopup(row, departure) {
  const filename = departureDossierFileName(
    row?.reference,
    row?.truckNumber,
    departure?.departure_time ||
      departure?.departure_at ||
      row?.departure?.departure_at
  );
  const popup = window.open(
    "",
    "_blank",
    "width=1000,height=850"
  );

  if (!popup) {
    throw new Error(
      "El navegador ha bloqueado el dossier. Permite las ventanas emergentes y vuelve a intentarlo."
    );
  }

  popup.document.write(`<!doctype html>
    <html lang="es">
      <head><title>${filename}</title></head>
      <body style="font-family:Arial;padding:30px">
        Generando dossier de expedición...
      </body>
    </html>`);
  popup.document.close();
  return popup;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color = "slate",
}) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-950",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${styles[color]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-wide opacity-70">
          {label}
        </span>
        <Icon size={18} />
      </div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function QueuePanel({
  rows,
  selectedKey,
  onSelect,
  onOpenTruck,
}) {
  return (
    <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          Cola de salida
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          Camiones cargados
        </h3>
      </div>

      <div className="mt-4 max-h-[65vh] space-y-3 overflow-y-auto pr-1">
        {rows.map((row) => {
          const selected = selectedKey === row.key;
          const status = statusPresentation(row);

          return (
            <article
              key={row.key}
              className={`rounded-2xl border p-3 transition ${
                selected
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(row.key)}
                className="w-full text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-black text-slate-950">
                    Camión {row.truckNumber}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">
                  {row.truck?.customer_name || "Sin cliente"} ·{" "}
                  {row.truck?.destination || "Sin destino"}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs font-black text-slate-600">
                  <span>
                    {row.loadedBoxes}/{row.expectedBoxes} cajas
                  </span>
                  <span>
                    {row.isShipped
                      ? formatDepartureDate(
                          row.departure?.departure_at
                        )
                      : `${row.blockers.length} pendientes`}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onOpenTruck(row)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm ring-1 ring-blue-200"
              >
                <Link2 size={14} />
                Abrir camión
              </button>
            </article>
          );
        })}

        {!rows.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
            <Truck className="mx-auto text-slate-300" size={38} />
            <p className="mt-3 font-black text-slate-700">
              Sin camiones cargados
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Aparecerán después de finalizar la carga V2.33.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function TruckDepartureModal({
  reference = "F-1012",
  targetBoxes = 49,
  currentUser = null,
  isAdmin = false,
  onOpenActualTruck,
  onOpenDockLoading,
  onDepartureChanged,
  onClose,
}) {
  const actor = useMemo(
    () => actorFromUser(currentUser),
    [currentUser]
  );
  const [data, setData] = useState({
    trucks: [],
    plans: [],
    sessions: [],
    sessionBoxes: [],
    incidents: [],
    documents: [],
    departures: [],
  });
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState(() => draftFromRow(null));
  const [confirmations, setConfirmations] = useState(
    confirmationsFromRow(null)
  );
  const [reopenReason, setReopenReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const overview = useMemo(
    () =>
      buildDepartureOverview({
        ...data,
        targetBoxes,
      }),
    [data, targetBoxes]
  );
  const currentRow =
    overview.rows.find((row) => row.key === selectedKey) ||
    overview.rows[0] ||
    null;
  const validation = evaluateDepartureConfirmation(
    currentRow,
    draft,
    confirmations
  );
  const durations = calculateDepartureDurations(
    currentRow,
    draft.departureAt
  );

  const loadDepartures = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await fetchTruckDepartureData(
          supabase,
          reference
        );
        setData(result);
      } catch (loadError) {
        setError(
          loadError?.message ||
            "No se ha podido cargar el control de salida."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reference]
  );

  useEffect(() => {
    loadDepartures();
  }, [loadDepartures]);

  useEffect(() => {
    if (
      overview.rows[0] &&
      !overview.rows.some((row) => row.key === selectedKey)
    ) {
      setSelectedKey(overview.rows[0].key);
    }
  }, [overview.rows, selectedKey]);

  useEffect(() => {
    setDraft(draftFromRow(currentRow));
    setConfirmations(confirmationsFromRow(currentRow));
    setReopenReason("");
    setError("");
    setSuccess("");
  }, [
    currentRow?.key,
    currentRow?.departure?.updated_at,
    currentRow?.departure?.status,
  ]);

  useEffect(() => {
    const refresh = () => loadDepartures({ silent: true });
    const channel = supabase
      .channel(`truck-departure-v234-${reference}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_departures",
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_trucks",
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_loading_sessions",
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_loading_incidents",
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_documents",
        },
        refresh
      )
      .subscribe();
    const fallback = window.setInterval(refresh, 60_000);

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [loadDepartures, reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyAction) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [busyAction, onClose]);

  const updateDraft = (field, value) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  };

  const updateConfirmation = (field, value) => {
    setConfirmations((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  };

  const openTruck = (row) => {
    onOpenActualTruck?.(row.truck);
    onClose?.();
  };

  const confirmDeparture = async () => {
    if (!currentRow || busyAction) return;

    if (!validation.isReady) {
      setError(
        `Falta completar: ${validation.blockers.join(", ")}.`
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Confirmar la salida real del camión ${currentRow.truckNumber}?\n\nSe cerrará la expedición y se generará su dossier PDF.`
    );

    if (!confirmed) return;

    let popup = null;

    try {
      popup = openDossierPopup(currentRow, {
        departure_at: draft.departureAt,
      });
    } catch {
      popup = null;
    }

    setBusyAction("confirm");
    setError("");
    setSuccess("");

    try {
      const result = await confirmTruckDeparture(supabase, {
        truckId: currentRow.truck.id,
        driverName: draft.driverName,
        departureAt: draft.departureAt,
        departureNotes: draft.departureNotes,
        actor: actor.display,
        confirmations,
      });
      const dossierDeparture = {
        ...result,
        departure_at: result?.departure_time,
        driver_name: draft.driverName,
        departure_notes: draft.departureNotes,
        confirmed_by: result?.confirmed_by || actor.display,
      };

      if (popup) {
        writeDossierToPopup(
          popup,
          {
            ...currentRow,
            truck: {
              ...currentRow.truck,
              shipment_status: "SHIPPED",
              shipped_at: result?.departure_time,
              shipped_by: result?.confirmed_by,
            },
          },
          dossierDeparture
        );
      }

      setSuccess(
        popup
          ? `Camión ${currentRow.truckNumber} expedido. Dossier preparado para guardar como PDF.`
          : `Camión ${currentRow.truckNumber} expedido. El navegador bloqueó el dossier; puedes abrirlo con el botón PDF.`
      );
      await loadDepartures({ silent: true });
      await onDepartureChanged?.();
    } catch (confirmError) {
      popup?.close();
      setError(
        confirmError?.message ||
          "No se ha podido confirmar la salida."
      );
    } finally {
      setBusyAction("");
    }
  };

  const printDossier = () => {
    if (!currentRow?.isShipped) return;

    try {
      const popup = openDossierPopup(
        currentRow,
        currentRow.departure
      );
      writeDossierToPopup(
        popup,
        currentRow,
        currentRow.departure
      );
    } catch (printError) {
      setError(printError.message);
    }
  };

  const reopenDeparture = async () => {
    if (!currentRow?.isShipped || busyAction) return;

    if (!isAdmin) {
      setError(
        "Solo un Administrador puede reabrir una expedición."
      );
      return;
    }

    if (!reopenReason.trim()) {
      setError("Indica el motivo de la reapertura.");
      return;
    }

    const confirmed = window.confirm(
      `¿Reabrir la expedición del camión ${currentRow.truckNumber}?\n\nVolverá a quedar pendiente de confirmar su salida.`
    );

    if (!confirmed) return;

    setBusyAction("reopen");
    setError("");
    setSuccess("");

    try {
      const result = await reopenTruckDeparture(supabase, {
        truckId: currentRow.truck.id,
        actor: actor.display,
        actorRole: actor.role,
        reason: reopenReason,
      });

      setReopenReason("");
      setSuccess(
        `Expedición del camión ${currentRow.truckNumber} reabierta.`
      );
      await loadDepartures({ silent: true });
      await onDepartureChanged?.();
    } catch (reopenError) {
      setError(
        reopenError?.message ||
          "No se ha podido reabrir la expedición."
      );
    } finally {
      setBusyAction("");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10048] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-2 sm:p-4">
      <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              FM Control · V2.34
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              Control de salida y dossier final
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Validación final, salida auditada y cierre de la
              expedición.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onOpenDockLoading && (
              <button
                type="button"
                onClick={() => {
                  onOpenDockLoading();
                  onClose?.();
                }}
                className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-800"
              >
                Muelle
              </button>
            )}
            <button
              type="button"
              onClick={() => loadDepartures({ silent: true })}
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
              disabled={Boolean(busyAction)}
              className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              aria-label="Cerrar control de salida"
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Truck}
              label="Pendientes de salida"
              value={overview.summary.awaitingDeparture}
              color="blue"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Listos"
              value={overview.summary.ready}
              color="emerald"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Bloqueados"
              value={overview.summary.blocked}
              color="amber"
            />
            <SummaryCard
              icon={Send}
              label="Expedidos"
              value={overview.summary.shipped}
            />
          </div>

          {loading ? (
            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-12 text-center font-black text-slate-500">
              Cargando control de salida...
            </div>
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
              <QueuePanel
                rows={overview.rows}
                selectedKey={currentRow?.key || ""}
                onSelect={setSelectedKey}
                onOpenTruck={openTruck}
              />

              <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                {!currentRow ? (
                  <div className="py-14 text-center">
                    <ShieldCheck
                      className="mx-auto text-slate-300"
                      size={48}
                    />
                    <h3 className="mt-4 text-xl font-black text-slate-800">
                      No hay expediciones para revisar
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Finaliza primero una carga desde el muelle
                      V2.33.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                          Expedición seleccionada
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                          Camión {currentRow.truckNumber}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {currentRow.truck?.customer_name} ·{" "}
                          {currentRow.truck?.destination}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black uppercase ${
                          statusPresentation(currentRow).className
                        }`}
                      >
                        {statusPresentation(currentRow).label}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {currentRow.checklist.map((item) => (
                        <div
                          key={item.key}
                          className={`rounded-2xl border p-3 ${
                            item.complete
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-800">
                              {item.label}
                            </span>
                            <span
                              className={`font-black ${
                                item.complete
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {item.complete ? "✓" : "!"}
                            </span>
                          </div>
                          {item.detail && (
                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                              {item.detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-500">
                          Preparación
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-950">
                          {formatDurationMinutes(
                            durations.preparationMinutes
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-500">
                          Carga física
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-950">
                          {formatDurationMinutes(
                            durations.loadingMinutes
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-500">
                          Espera
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-950">
                          {formatDurationMinutes(
                            durations.waitingMinutes
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-500">
                          Documentos
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-950">
                          {currentRow.documents.length}
                        </p>
                      </div>
                    </div>

                    {currentRow.isShipped ? (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                              Expedición cerrada
                            </p>
                            <h4 className="mt-1 text-xl font-black text-emerald-950">
                              Salida confirmada
                            </h4>
                            <p className="mt-2 text-sm font-bold text-emerald-800">
                              {formatDepartureDate(
                                currentRow.departure?.departure_at
                              )}
                              {" · "}
                              {currentRow.departure?.driver_name ||
                                "Conductor no indicado"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-emerald-700">
                              {currentRow.departure?.confirmed_by ||
                                currentRow.truck?.shipped_by ||
                                "Sistema"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={printDossier}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white shadow-sm hover:bg-red-700"
                          >
                            <Printer size={18} />
                            Dossier PDF
                          </button>
                        </div>

                        {isAdmin && (
                          <div className="mt-5 border-t border-emerald-200 pt-4">
                            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
                              <LockKeyhole size={15} />
                              Reapertura administrativa
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                              <input
                                value={reopenReason}
                                onChange={(event) => {
                                  setReopenReason(event.target.value);
                                  setError("");
                                }}
                                placeholder="Motivo obligatorio de la reapertura"
                                className="h-12 rounded-xl border border-slate-300 bg-white px-4 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              />
                              <button
                                type="button"
                                onClick={reopenDeparture}
                                disabled={busyAction === "reopen"}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-black text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                <RotateCcw size={17} />
                                {busyAction === "reopen"
                                  ? "Reabriendo..."
                                  : "Reabrir expedición"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                              Conductor *
                            </span>
                            <input
                              value={draft.driverName}
                              onChange={(event) =>
                                updateDraft(
                                  "driverName",
                                  event.target.value
                                )
                              }
                              placeholder="Nombre y apellidos"
                              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                              Fecha y hora real de salida *
                            </span>
                            <input
                              type="datetime-local"
                              value={draft.departureAt}
                              onChange={(event) =>
                                updateDraft(
                                  "departureAt",
                                  event.target.value
                                )
                              }
                              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>
                        </div>

                        <label className="mt-4 block">
                          <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                            Observaciones de salida
                          </span>
                          <textarea
                            rows={2}
                            value={draft.departureNotes}
                            onChange={(event) =>
                              updateDraft(
                                "departureNotes",
                                event.target.value
                              )
                            }
                            placeholder="Incidencias, instrucciones o información del conductor"
                            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                              label: `Precinto: ${
                                currentRow.truck?.seal_number || "-"
                              }`,
                            },
                            {
                              key: "documentsConfirmed",
                              label: "Documentación contrastada",
                            },
                          ].map((item) => (
                            <label
                              key={item.key}
                              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 font-black text-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  confirmations[item.key]
                                )}
                                onChange={(event) =>
                                  updateConfirmation(
                                    item.key,
                                    event.target.checked
                                  )
                                }
                                className="h-5 w-5 accent-blue-600"
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>

                        {!validation.isReady && (
                          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                            <div className="flex items-center gap-2 font-black">
                              <AlertTriangle size={17} />
                              Pendientes antes de confirmar
                            </div>
                            <p className="mt-2 text-xs">
                              {validation.blockers.join(" · ")}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Clock3 size={15} />
                            La salida quedará registrada con usuario,
                            fecha y hora.
                          </div>
                          <button
                            type="button"
                            onClick={confirmDeparture}
                            disabled={
                              !validation.isReady ||
                              busyAction === "confirm"
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Send size={18} />
                            {busyAction === "confirm"
                              ? "Confirmando salida..."
                              : "Confirmar salida y generar dossier"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-700" />
                        <h4 className="font-black text-slate-950">
                          Documentación incluida en el dossier
                        </h4>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {currentRow.documents.map((document) => (
                          <div
                            key={document.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <p className="truncate text-sm font-black text-slate-800">
                              {document.file_name}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                              {document.document_type}
                            </p>
                          </div>
                        ))}
                        {!currentRow.documents.length && (
                          <p className="text-sm font-semibold text-slate-500">
                            Sin documentos asociados.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
