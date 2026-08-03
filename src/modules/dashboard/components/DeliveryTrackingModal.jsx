import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  DELIVERY_DOCUMENT_OPTIONS,
  DELIVERY_INCIDENT_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  confirmTruckDelivery,
  createDeliveryIncident,
  deliveryDocumentLabel,
  deliveryIncidentLabel,
  deliveryStatusLabel,
  fetchDeliveryTrackingData,
  formatDeliveryDateTime,
  formatDeliveryDuration,
  localDateTimeInputValue,
  reopenTruckDelivery,
  resolveDeliveryIncident,
  updateExpectedDelivery,
} from "../../../services/deliveryTrackingService";
import {
  createTruckDocumentDownloadUrl,
  deleteTruckDocument,
  uploadTruckDocument,
} from "../../../services/truckDocumentService";
import {
  recordTruckAuditEventSafely,
} from "../../../services/truckAuditService";

function formatFileSize(value) {
  const bytes = Number(value || 0);

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024))
    .toFixed(1)
    .replace(".", ",")} MB`;
}

function currentActor(user) {
  if (typeof user === "string") return user;

  return (
    [
      user?.username || user?.code || user?.employee_code,
      user?.name || user?.full_name,
    ]
      .filter(Boolean)
      .join(" - ") || "Sistema"
  );
}

function currentRole(user) {
  return (
    user?.role ||
    user?.perfil ||
    user?.profile ||
    user?.user_role ||
    ""
  );
}

function statusClasses(row) {
  if (row?.isOverdue) {
    return "border-red-300 bg-red-50 text-red-800";
  }

  return (
    {
      IN_TRANSIT: "border-blue-300 bg-blue-50 text-blue-800",
      DELIVERED:
        "border-emerald-300 bg-emerald-50 text-emerald-800",
      DELIVERED_WITH_INCIDENT:
        "border-amber-300 bg-amber-50 text-amber-900",
      RETURNED: "border-red-300 bg-red-50 text-red-800",
    }[row?.status] ||
    "border-slate-300 bg-slate-50 text-slate-700"
  );
}

function summaryCard(label, value, tone = "slate", detail = "") {
  const toneClasses =
    {
      blue: "border-blue-200 bg-blue-50 text-blue-800",
      red: "border-red-200 bg-red-50 text-red-800",
      green:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
      amber: "border-amber-200 bg-amber-50 text-amber-900",
      slate: "border-slate-200 bg-white text-slate-800",
    }[tone] || "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="text-xs font-black uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      {detail && (
        <div className="mt-1 text-xs font-bold opacity-75">
          {detail}
        </div>
      )}
    </div>
  );
}

export default function DeliveryTrackingModal({
  reference = "F-1012",
  currentUser,
  isAdmin = false,
  onOpenActualTruck,
  onClose,
}) {
  const [overview, setOverview] = useState({
    rows: [],
    summary: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [view, setView] = useState("IN_TRANSIT");
  const [searchValue, setSearchValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [expectedDeliveryAt, setExpectedDeliveryAt] =
    useState("");
  const [deliveryStatus, setDeliveryStatus] =
    useState("DELIVERED");
  const [deliveredAt, setDeliveredAt] = useState(
    localDateTimeInputValue()
  );
  const [receiverName, setReceiverName] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [incidentType, setIncidentType] = useState("DELAY");
  const [incidentDescription, setIncidentDescription] =
    useState("");
  const [documentType, setDocumentType] = useState(
    "SIGNED_DELIVERY_NOTE"
  );
  const [documentFiles, setDocumentFiles] = useState([]);
  const [documentInputVersion, setDocumentInputVersion] =
    useState(0);
  const [reopenReason, setReopenReason] = useState("");

  const actor = currentActor(currentUser);

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const result = await fetchDeliveryTrackingData(supabase, {
        reference,
      });
      setOverview(result);
      setSelectedKey((previous) => {
        if (
          previous &&
          result.rows.some((row) => row.key === previous)
        ) {
          return previous;
        }

        return result.rows[0]?.key || "";
      });
    } catch (loadError) {
      setError(
        loadError?.message ||
          "No se ha podido cargar el seguimiento de entregas."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(
        `delivery-tracking-${String(reference).replaceAll(
          /[^a-zA-Z0-9]/g,
          "-"
        )}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_deliveries",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_delivery_incidents",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_documents",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .subscribe();
    const fallback = window.setInterval(
      () => loadData({ silent: true }),
      60_000
    );

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [reference]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  const filteredRows = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return overview.rows.filter((row) => {
      if (view === "IN_TRANSIT" && row.isFinal) return false;
      if (view === "FINAL" && !row.isFinal) return false;

      if (!search) return true;

      return [
        row.truck?.truck_number,
        row.truck?.customer_name,
        row.truck?.destination,
        row.truck?.carrier_name,
        row.truck?.tractor_plate,
        row.truck?.trailer_plate,
        row.departure?.driver_name,
        deliveryStatusLabel(row.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [overview.rows, searchValue, view]);

  const selectedRow =
    overview.rows.find((row) => row.key === selectedKey) || null;

  useEffect(() => {
    if (!selectedRow) return;

    setExpectedDeliveryAt(
      selectedRow.delivery?.expected_delivery_at
        ? localDateTimeInputValue(
            selectedRow.delivery.expected_delivery_at
          )
        : ""
    );
    setDeliveryStatus(
      selectedRow.isFinal ? selectedRow.status : "DELIVERED"
    );
    setDeliveredAt(
      selectedRow.delivery?.delivered_at
        ? localDateTimeInputValue(
            selectedRow.delivery.delivered_at
          )
        : localDateTimeInputValue()
    );
    setReceiverName(
      selectedRow.delivery?.receiver_name || ""
    );
    setDeliveryNotes(
      selectedRow.delivery?.delivery_notes || ""
    );
    setIncidentDescription("");
    setReopenReason("");
    setDocumentFiles([]);
    setDocumentInputVersion((value) => value + 1);
    setError("");
    setSuccess("");
  }, [selectedKey]);

  const executeAndRefresh = async (action, successMessage) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await action();
      await loadData({ silent: true });
      setSuccess(successMessage);
    } catch (actionError) {
      setError(
        actionError?.message ||
          "No se ha podido completar la operación."
      );
    } finally {
      setBusy(false);
    }
  };

  const saveExpectedDelivery = () => {
    if (!selectedRow || !expectedDeliveryAt) {
      setError("Indica la fecha y hora prevista de entrega.");
      return;
    }

    executeAndRefresh(
      () =>
        updateExpectedDelivery(supabase, {
          truckId: selectedRow.truck.id,
          expectedDeliveryAt,
          actor,
        }),
      "Fecha y hora prevista de entrega guardadas."
    );
  };

  const addIncident = () => {
    if (!selectedRow || !incidentDescription.trim()) {
      setError("Describe la incidencia de transporte o entrega.");
      return;
    }

    executeAndRefresh(
      async () => {
        await createDeliveryIncident(supabase, {
          truckId: selectedRow.truck.id,
          incidentType,
          description: incidentDescription,
          actor,
        });
        setIncidentDescription("");
      },
      "Incidencia registrada y añadida a la auditoría."
    );
  };

  const resolveIncident = (incident) => {
    const resolution = window.prompt(
      `Resolución para "${deliveryIncidentLabel(
        incident.incident_type
      )}":`
    );

    if (!resolution?.trim()) return;

    executeAndRefresh(
      () =>
        resolveDeliveryIncident(supabase, {
          incidentId: incident.id,
          resolution,
          actor,
        }),
      "Incidencia resuelta."
    );
  };

  const addDocuments = () => {
    if (!selectedRow || !documentFiles.length) {
      setError("Selecciona uno o varios documentos.");
      return;
    }

    executeAndRefresh(
      async () => {
        for (const file of documentFiles) {
          const document = await uploadTruckDocument(supabase, {
            reference:
              selectedRow.truck.reference || reference,
            truckNumber: selectedRow.truck.truck_number,
            truckId: selectedRow.truck.id,
            documentType,
            file,
            uploadedBy: actor,
          });

          await recordTruckAuditEventSafely(supabase, {
            truck: selectedRow.truck,
            truckId: selectedRow.truck.id,
            eventType: "DELIVERY_DOCUMENT_ADDED",
            eventLabel: "Documento de entrega añadido",
            actor,
            metadata: {
              document_id: document?.id,
              document_type: documentType,
              file_name: file.name,
            },
            source: "ACTIVE",
          });
        }

        setDocumentFiles([]);
        setDocumentInputVersion((value) => value + 1);
      },
      "Documentación de entrega añadida."
    );
  };

  const openDocument = async (document) => {
    setError("");

    try {
      const url = await createTruckDocumentDownloadUrl(
        supabase,
        document
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (documentError) {
      setError(
        documentError?.message ||
          "No se ha podido abrir el documento."
      );
    }
  };

  const removeDocument = (document) => {
    if (
      !selectedRow ||
      !window.confirm(
        `¿Eliminar "${document.file_name}" del camión ${selectedRow.truck.truck_number}?`
      )
    ) {
      return;
    }

    executeAndRefresh(
      async () => {
        await deleteTruckDocument(supabase, document);
        await recordTruckAuditEventSafely(supabase, {
          truck: selectedRow.truck,
          truckId: selectedRow.truck.id,
          eventType: "DELIVERY_DOCUMENT_DELETED",
          eventLabel: "Documento de entrega eliminado",
          actor,
          metadata: {
            document_id: document.id,
            document_type: document.document_type,
            file_name: document.file_name,
          },
          source: "ACTIVE",
        });
      },
      "Documento eliminado."
    );
  };

  const confirmDelivery = () => {
    if (!selectedRow) return;

    const actionLabel =
      deliveryStatus === "RETURNED"
        ? "registrar la devolución"
        : "confirmar la entrega";

    if (
      !window.confirm(
        `¿Quieres ${actionLabel} del camión ${selectedRow.truck.truck_number}?`
      )
    ) {
      return;
    }

    executeAndRefresh(
      () =>
        confirmTruckDelivery(supabase, {
          truckId: selectedRow.truck.id,
          deliveryStatus,
          deliveredAt,
          receiverName,
          deliveryNotes,
          actor,
        }),
      deliveryStatus === "RETURNED"
        ? "Devolución registrada y auditada."
        : "Entrega confirmada y cerrada logísticamente."
    );
  };

  const reopenDelivery = () => {
    if (!selectedRow || !reopenReason.trim()) {
      setError("Indica el motivo de la reapertura.");
      return;
    }

    if (
      !window.confirm(
        `¿Reabrir la entrega del camión ${selectedRow.truck.truck_number}?`
      )
    ) {
      return;
    }

    executeAndRefresh(
      () =>
        reopenTruckDelivery(supabase, {
          truckId: selectedRow.truck.id,
          actor,
          actorRole: currentRole(currentUser),
          reason: reopenReason,
        }),
      "Entrega reabierta para corrección."
    );
  };

  const deliveryRequirements = selectedRow
    ? [
        {
          label: "Fecha prevista",
          complete: Boolean(
            selectedRow.delivery?.expected_delivery_at
          ),
        },
        {
          label: "Fecha real",
          complete: Boolean(deliveredAt),
        },
        {
          label:
            deliveryStatus === "RETURNED"
              ? "Motivo registrado"
              : "Persona receptora",
          complete:
            deliveryStatus === "RETURNED"
              ? selectedRow.incidents.length > 0
              : Boolean(receiverName.trim()),
        },
        {
          label: "Justificante",
          complete: selectedRow.proofDocuments.length > 0,
        },
      ]
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div
        className="flex max-h-[calc(100vh-1rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-tracking-title"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.35
            </p>
            <h2
              id="delivery-tracking-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Seguimiento de transporte y entrega
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Control manual y documental desde la salida hasta la
              recepción final.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing || busy}
              className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? "Actualizando..." : "↻ Actualizar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl bg-slate-100 px-4 py-2 text-2xl font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              aria-label="Cerrar seguimiento de entregas"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {summaryCard(
              "En tránsito",
              overview.summary.inTransit || 0,
              "blue"
            )}
            {summaryCard(
              "Retrasadas",
              overview.summary.overdue || 0,
              overview.summary.overdue ? "red" : "green"
            )}
            {summaryCard(
              "Entregadas",
              overview.summary.delivered || 0,
              "green"
            )}
            {summaryCard(
              "Con incidencia",
              overview.summary.withIncident || 0,
              overview.summary.withIncident ? "amber" : "slate"
            )}
            {summaryCard(
              "Devueltas",
              overview.summary.returned || 0,
              overview.summary.returned ? "red" : "slate"
            )}
            {summaryCard(
              "Puntualidad",
              overview.summary.onTimePercentage === null ||
                overview.summary.onTimePercentage === undefined
                ? "-"
                : `${overview.summary.onTimePercentage}%`,
              "slate",
              overview.summary.averageTransitMinutes === null ||
                overview.summary.averageTransitMinutes === undefined
                ? "Sin muestra cerrada"
                : `Tránsito medio ${formatDeliveryDuration(
                    overview.summary.averageTransitMinutes
                  )}`
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
              {success}
            </div>
          )}

          <div className="mt-5 grid min-h-0 gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                    Cola logística
                  </div>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Expediciones
                  </h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {filteredRows.length}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-black">
                {[
                  ["IN_TRANSIT", "En tránsito"],
                  ["FINAL", "Finalizadas"],
                  ["ALL", "Todas"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setView(value)}
                    className={`rounded-lg px-2 py-2 ${
                      view === value
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(event.target.value)
                }
                placeholder="Buscar camión, cliente, destino..."
                className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-3 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <div className="mt-3 max-h-[38rem] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
                    Cargando expediciones...
                  </div>
                ) : filteredRows.length ? (
                  filteredRows.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setSelectedKey(row.key)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedKey === row.key
                          ? "ring-4 ring-blue-100"
                          : "hover:-translate-y-0.5"
                      } ${statusClasses(row)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-lg font-black">
                          Camión {row.truck.truck_number}
                        </div>
                        <span className="rounded-full bg-white/80 px-2 py-1 text-[0.65rem] font-black uppercase">
                          {row.isOverdue
                            ? "Retrasado"
                            : deliveryStatusLabel(row.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold opacity-80">
                        {row.truck.customer_name || "Sin cliente"}
                        {" · "}
                        {row.truck.destination || "Sin destino"}
                      </div>
                      <div className="mt-2 text-xs font-black">
                        Prevista:{" "}
                        {formatDeliveryDateTime(
                          row.delivery.expected_delivery_at
                        )}
                      </div>
                      {row.openIncidents.length > 0 && (
                        <div className="mt-2 text-xs font-black">
                          ⚠ {row.openIncidents.length} incidencia(s)
                          abierta(s)
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
                    No hay expediciones en esta vista.
                  </div>
                )}
              </div>
            </aside>

            <main className="min-w-0">
              {!selectedRow ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="text-xl font-black text-slate-800">
                    Sin expediciones expedidas
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-500">
                    Los camiones aparecerán aquí al confirmar su salida
                    en la V2.34.
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                          Transporte seleccionado
                        </div>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                          Camión {selectedRow.truck.truck_number}
                        </h3>
                        <div className="mt-1 text-sm font-bold text-slate-500">
                          {selectedRow.truck.customer_name || "Sin cliente"}
                          {" · "}
                          {selectedRow.truck.destination || "Sin destino"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-2 text-xs font-black uppercase ${statusClasses(
                            selectedRow
                          )}`}
                        >
                          {selectedRow.isOverdue
                            ? "Entrega retrasada"
                            : deliveryStatusLabel(selectedRow.status)}
                        </span>
                        {onOpenActualTruck && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenActualTruck(selectedRow.truck)
                            }
                            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                          >
                            Abrir camión
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        [
                          "Salida real",
                          formatDeliveryDateTime(
                            selectedRow.departure.departure_at
                          ),
                        ],
                        [
                          "Conductor",
                          selectedRow.departure.driver_name || "-",
                        ],
                        [
                          "Transportista",
                          selectedRow.truck.carrier_name || "-",
                        ],
                        [
                          "Matrículas",
                          [
                            selectedRow.truck.tractor_plate ||
                              selectedRow.truck.vehicle_plate,
                            selectedRow.truck.trailer_plate,
                          ]
                            .filter(Boolean)
                            .join(" / ") || "-",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl bg-slate-50 p-4"
                        >
                          <div className="text-xs font-black uppercase text-slate-500">
                            {label}
                          </div>
                          <div className="mt-1 font-black text-slate-900">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <label>
                        <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                          Fecha y hora prevista de entrega
                        </span>
                        <input
                          type="datetime-local"
                          value={expectedDeliveryAt}
                          onChange={(event) =>
                            setExpectedDeliveryAt(event.target.value)
                          }
                          disabled={selectedRow.isFinal || busy}
                          className="h-12 w-full rounded-xl border border-slate-300 px-3 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={saveExpectedDelivery}
                        disabled={
                          selectedRow.isFinal ||
                          !expectedDeliveryAt ||
                          busy
                        }
                        className="self-end rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
                      >
                        Guardar previsión
                      </button>
                    </div>

                    {selectedRow.isOverdue && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
                        ⚠ La entrega prevista está vencida. Registra la
                        entrega o una incidencia de retraso.
                      </div>
                    )}
                  </section>

                  <section className="rounded-[1.5rem] border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                          Incidencias
                        </div>
                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          Transporte y recepción
                        </h3>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                        {selectedRow.openIncidents.length} abiertas
                      </span>
                    </div>

                    {!selectedRow.isFinal && (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[14rem_minmax(0,1fr)_auto]">
                        <select
                          value={incidentType}
                          onChange={(event) =>
                            setIncidentType(event.target.value)
                          }
                          disabled={busy}
                          className="h-12 rounded-xl border border-slate-300 bg-white px-3 font-bold"
                        >
                          {DELIVERY_INCIDENT_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={incidentDescription}
                          onChange={(event) =>
                            setIncidentDescription(event.target.value)
                          }
                          placeholder="Describe la incidencia"
                          disabled={busy}
                          className="h-12 rounded-xl border border-slate-300 px-3 font-semibold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        />
                        <button
                          type="button"
                          onClick={addIncident}
                          disabled={
                            !incidentDescription.trim() || busy
                          }
                          className="rounded-xl bg-amber-500 px-5 py-3 font-black text-amber-950 hover:bg-amber-400 disabled:bg-slate-300"
                        >
                          Registrar
                        </button>
                      </div>
                    )}

                    <div className="mt-4 space-y-2">
                      {selectedRow.incidents.length ? (
                        selectedRow.incidents.map((incident) => {
                          const isOpen =
                            incident.status === "OPEN";

                          return (
                            <div
                              key={incident.id}
                              className={`rounded-2xl border p-4 ${
                                isOpen
                                  ? "border-amber-200 bg-amber-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="font-black text-slate-900">
                                    {deliveryIncidentLabel(
                                      incident.incident_type
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-600">
                                    {incident.description}
                                  </div>
                                  <div className="mt-2 text-xs font-bold text-slate-500">
                                    {incident.created_by || "Sistema"}
                                    {" · "}
                                    {formatDeliveryDateTime(
                                      incident.created_at
                                    )}
                                  </div>
                                  {!isOpen && (
                                    <div className="mt-2 text-xs font-bold text-emerald-700">
                                      Resuelta: {incident.resolution}
                                    </div>
                                  )}
                                </div>
                                {isOpen && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      resolveIncident(incident)
                                    }
                                    disabled={busy}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Resolver
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-bold text-slate-500">
                          No hay incidencias registradas.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-blue-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                          Prueba documental
                        </div>
                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          Documentos de entrega
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Para cerrar se exige albarán firmado, CMR
                          firmado o justificante POD.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {selectedRow.proofDocuments.length} justificantes
                      </span>
                    </div>

                    {!selectedRow.isFinal && (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)_auto]">
                        <select
                          value={documentType}
                          onChange={(event) =>
                            setDocumentType(event.target.value)
                          }
                          disabled={busy}
                          className="h-12 rounded-xl border border-slate-300 bg-white px-3 font-bold"
                        >
                          {DELIVERY_DOCUMENT_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          key={documentInputVersion}
                          type="file"
                          multiple
                          onChange={(event) =>
                            setDocumentFiles(
                              Array.from(event.target.files || [])
                            )
                          }
                          disabled={busy}
                          className="h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={addDocuments}
                          disabled={!documentFiles.length || busy}
                          className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:bg-slate-300"
                        >
                          Añadir
                        </button>
                      </div>
                    )}

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {selectedRow.documents.length ? (
                        selectedRow.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">
                                {document.file_name}
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-500">
                                {deliveryDocumentLabel(
                                  document.document_type
                                )}
                                {" · "}
                                {formatFileSize(document.file_size)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openDocument(document)
                                }
                                className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200"
                              >
                                Abrir
                              </button>
                              {!selectedRow.isFinal && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDocument(document)
                                  }
                                  disabled={busy}
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-bold text-slate-500 md:col-span-2">
                          Todavía no hay documentación de entrega.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                          Cierre logístico
                        </div>
                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          Confirmación de entrega
                        </h3>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                          selectedRow
                        )}`}
                      >
                        {deliveryStatusLabel(selectedRow.status)}
                      </span>
                    </div>

                    {selectedRow.isFinal ? (
                      <div className="mt-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {[
                            [
                              "Resultado",
                              deliveryStatusLabel(selectedRow.status),
                            ],
                            [
                              "Entrega real",
                              formatDeliveryDateTime(
                                selectedRow.delivery.delivered_at
                              ),
                            ],
                            [
                              "Recibe",
                              selectedRow.delivery.receiver_name || "-",
                            ],
                            [
                              "Tiempo de tránsito",
                              formatDeliveryDuration(
                                selectedRow.transitMinutes
                              ),
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-2xl bg-emerald-50 p-4"
                            >
                              <div className="text-xs font-black uppercase text-emerald-700">
                                {label}
                              </div>
                              <div className="mt-1 font-black text-emerald-950">
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div
                          className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-black ${
                            selectedRow.punctualityMinutes === null
                              ? "border-slate-200 bg-slate-50 text-slate-700"
                              : selectedRow.onTime
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-red-200 bg-red-50 text-red-800"
                          }`}
                        >
                          {selectedRow.punctualityMinutes === null
                            ? "Sin fecha prevista para calcular la puntualidad."
                            : selectedRow.onTime
                              ? `Entrega puntual · ${formatDeliveryDuration(
                                  Math.abs(
                                    selectedRow.punctualityMinutes
                                  )
                                )} antes de la previsión.`
                              : `Entrega con retraso · ${formatDeliveryDuration(
                                  selectedRow.punctualityMinutes
                                )} después de la previsión.`}
                        </div>

                        {isAdmin && (
                          <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <input
                              value={reopenReason}
                              onChange={(event) =>
                                setReopenReason(event.target.value)
                              }
                              placeholder="Motivo obligatorio de la reapertura"
                              disabled={busy}
                              className="h-11 min-w-[16rem] flex-1 rounded-xl border border-red-200 bg-white px-3 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={reopenDelivery}
                              disabled={!reopenReason.trim() || busy}
                              className="rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:bg-slate-300"
                            >
                              Reabrir entrega
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label>
                            <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                              Resultado
                            </span>
                            <select
                              value={deliveryStatus}
                              onChange={(event) =>
                                setDeliveryStatus(event.target.value)
                              }
                              disabled={busy}
                              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                            >
                              {DELIVERY_STATUS_OPTIONS.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                              Fecha y hora real
                            </span>
                            <input
                              type="datetime-local"
                              value={deliveredAt}
                              onChange={(event) =>
                                setDeliveredAt(event.target.value)
                              }
                              disabled={busy}
                              className="h-12 w-full rounded-xl border border-slate-300 px-3 font-bold"
                            />
                          </label>
                          <label className="md:col-span-2">
                            <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                              Persona receptora
                            </span>
                            <input
                              value={receiverName}
                              onChange={(event) =>
                                setReceiverName(event.target.value)
                              }
                              placeholder={
                                deliveryStatus === "RETURNED"
                                  ? "Opcional en una devolución"
                                  : "Nombre de quien recibe la mercancía"
                              }
                              disabled={busy}
                              className="h-12 w-full rounded-xl border border-slate-300 px-3 font-semibold"
                            />
                          </label>
                          <label className="md:col-span-2">
                            <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                              Observaciones de entrega
                            </span>
                            <textarea
                              value={deliveryNotes}
                              onChange={(event) =>
                                setDeliveryNotes(event.target.value)
                              }
                              rows={3}
                              placeholder="Observaciones de recepción, firma o devolución"
                              disabled={busy}
                              className="w-full rounded-xl border border-slate-300 p-3 font-semibold"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {deliveryRequirements.map((requirement) => (
                            <div
                              key={requirement.label}
                              className={`rounded-xl border px-3 py-3 text-sm font-black ${
                                requirement.complete
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-red-200 bg-red-50 text-red-800"
                              }`}
                            >
                              {requirement.complete ? "✓" : "!"}{" "}
                              {requirement.label}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={confirmDelivery}
                          disabled={busy}
                          className={`mt-4 w-full rounded-2xl px-6 py-4 text-lg font-black text-white shadow-sm disabled:bg-slate-300 ${
                            deliveryStatus === "RETURNED"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {busy
                            ? "Procesando..."
                            : deliveryStatus === "RETURNED"
                              ? "Registrar devolución"
                              : "Confirmar entrega y cerrar"}
                        </button>
                      </>
                    )}
                  </section>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
