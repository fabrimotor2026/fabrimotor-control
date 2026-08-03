import { useEffect, useRef, useState } from "react";
import FmButton from "../../../components/ui/FmButton";
import FmCard from "../../../components/ui/FmCard";
import FmSectionTitle from "../../../components/ui/FmSectionTitle";
import FmBadge from "../../../components/ui/FmBadge";
import FmInput from "../../../components/ui/FmInput";
import FmTextarea from "../../../components/ui/FmTextarea";
import FmEmptyState from "../../../components/ui/FmEmptyState";
import { supabase } from "../../../lib/supabaseClient";
import {
  createTruckDocumentDownloadUrl,
  deleteTruckDocument,
  fetchTruckDocuments,
  uploadTruckDocument,
} from "../../../services/truckDocumentService";
import {
  ensureLogisticsMasters,
  getCustomerDestinations,
} from "../../../services/logisticsMasterService";
import {
  buildExpeditionChecklist,
} from "../../../services/expeditionChecklist";

function formatDate(date) {
  if (!date) return "Sin fecha";
  return String(date).split("-").reverse().join("/");
}

function createEmptyTruckDraft() {
  return {
    plannedExpeditionDate: "",
    actualExpeditionDate: "",
    customerName: "",
    destination: "",
    carrierName: "",
    tractorPlate: "",
    trailerPlate: "",
    sealNumber: "",
    deliveryNoteNumber: "",
    shipmentStatus: "PENDING",
    notes: "",
  };
}

function draftFromTruck(truck) {
  return {
    plannedExpeditionDate: truck.planned_expedition_date || "",
    actualExpeditionDate: truck.actual_expedition_date || "",
    customerName: truck.customer_name || "",
    destination: truck.destination || "",
    carrierName: truck.carrier_name || "",
    tractorPlate: truck.tractor_plate || truck.vehicle_plate || "",
    trailerPlate: truck.trailer_plate || "",
    sealNumber: truck.seal_number || "",
    deliveryNoteNumber: truck.delivery_note_number || "",
    shipmentStatus: truck.shipment_status || "PENDING",
    notes: truck.notes || "",
    status: truck.status,
  };
}

const SHIPMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendiente" },
  { value: "READY", label: "Preparado" },
  { value: "SHIPPED", label: "Expedido" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "DELIVERY_NOTE", label: "Albarán" },
  { value: "CMR", label: "CMR" },
  { value: "PHOTO", label: "Fotografía de carga" },
  { value: "OTHER", label: "Otro documento" },
];

function shipmentStatusLabel(value) {
  return (
    SHIPMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label ||
    "Pendiente"
  );
}

function documentTypeLabel(value) {
  return (
    DOCUMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    "Otro documento"
  );
}

function formatFileSize(value) {
  const bytes = Number(value || 0);

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function shipmentBadgeColor(value) {
  if (value === "SHIPPED") return "green";
  if (value === "READY") return "blue";
  return "slate";
}

function checklistStatusClass(status) {
  if (status === "SHIPPED") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "READY") {
    return "bg-blue-100 text-blue-800";
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

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function FieldLabel({ children, required = false }) {
  return (
    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
      {children}
      {required ? " *" : ""}
    </span>
  );
}

export default function ExpeditionPlanner({
  truckSchedule = [],
  onCreatePlannedTruck,
  onUpdatePlannedTruck,
  onDeletePlannedTruck,
  currentUser,
  logisticsMasters = {
    customers: [],
    destinations: [],
    carriers: [],
  },
  logisticsMastersLoading = false,
  logisticsMastersError = "",
  onLogisticsMastersChanged,
}) {
  const [draftRows, setDraftRows] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingNewTruck, setIsSavingNewTruck] = useState(false);
  const [savingTruckId, setSavingTruckId] = useState("");
  const [newTruckDraft, setNewTruckDraft] = useState(createEmptyTruckDraft);
  const [createError, setCreateError] = useState("");
  const [rowErrors, setRowErrors] = useState({});
  const [documentsByTruck, setDocumentsByTruck] = useState({});
  const [documentDrafts, setDocumentDrafts] = useState({});
  const [documentBusyTruckId, setDocumentBusyTruckId] = useState("");
  const [documentErrors, setDocumentErrors] = useState({});
  const [logisticsMasterWarning, setLogisticsMasterWarning] =
    useState("");
  const creatingTruckRef = useRef(false);

  useEffect(() => {
    const nextDraftRows = {};

    truckSchedule.forEach((truck) => {
      nextDraftRows[truck.id] = draftFromTruck(truck);
    });

    setDraftRows(nextDraftRows);
  }, [truckSchedule]);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      const entries = await Promise.all(
        truckSchedule.map(async (truck) => {
          try {
            const documents = await fetchTruckDocuments(supabase, {
              reference: truck.reference || "F-1012",
              truckNumber: truck.truck_number,
            });

            return [truck.id, documents, ""];
          } catch (error) {
            return [
              truck.id,
              [],
              error?.message || "No se han podido cargar los documentos.",
            ];
          }
        })
      );

      if (cancelled) return;

      setDocumentsByTruck(
        Object.fromEntries(
          entries.map(([truckId, documents]) => [truckId, documents])
        )
      );
      setDocumentErrors(
        Object.fromEntries(
          entries
            .filter(([, , error]) => error)
            .map(([truckId, , error]) => [truckId, error])
        )
      );
    };

    if (truckSchedule.length) {
      loadDocuments();
    } else {
      setDocumentsByTruck({});
      setDocumentErrors({});
    }

    return () => {
      cancelled = true;
    };
  }, [truckSchedule]);

  const updateDraft = (truckId, field, value) => {
    setDraftRows((previous) => ({
      ...previous,
      [truckId]: {
        ...(previous[truckId] || {}),
        [field]: value,
      },
    }));
  };

  const updateNewTruckDraft = (field, value) => {
    setNewTruckDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const rememberLogisticsDraft = async (draft) => {
    try {
      await ensureLogisticsMasters(supabase, {
        customerName: draft?.customerName,
        destination: draft?.destination,
        carrierName: draft?.carrierName,
        updatedBy:
          currentUser?.username ||
          currentUser?.name ||
          "Sistema",
      });

      setLogisticsMasterWarning("");

      if (onLogisticsMastersChanged) {
        await onLogisticsMastersChanged();
      }
    } catch (error) {
      setLogisticsMasterWarning(
        error?.message ||
        "El camión se ha guardado, pero no se han actualizado los maestros logísticos."
      );
    }
  };

  const updateDocumentDraft = (truckId, field, value) => {
    setDocumentDrafts((previous) => ({
      ...previous,
      [truckId]: {
        documentType:
          previous[truckId]?.documentType || "DELIVERY_NOTE",
        files: previous[truckId]?.files || [],
        inputVersion: previous[truckId]?.inputVersion || 0,
        [field]: value,
      },
    }));
  };

  const refreshTruckDocuments = async (truck) => {
    const documents = await fetchTruckDocuments(supabase, {
      reference: truck.reference || "F-1012",
      truckNumber: truck.truck_number,
    });

    setDocumentsByTruck((previous) => ({
      ...previous,
      [truck.id]: documents,
    }));
  };

  const addDocuments = async (truck) => {
    const documentDraft = documentDrafts[truck.id] || {
      documentType: "DELIVERY_NOTE",
      files: [],
      inputVersion: 0,
    };
    const files = Array.from(documentDraft.files || []);

    if (!files.length || documentBusyTruckId === truck.id) {
      setDocumentErrors((previous) => ({
        ...previous,
        [truck.id]: "Selecciona al menos un archivo.",
      }));
      return;
    }

    setDocumentBusyTruckId(truck.id);
    setDocumentErrors((previous) => ({ ...previous, [truck.id]: "" }));

    try {
      for (const file of files) {
        await uploadTruckDocument(supabase, {
          reference: truck.reference || "F-1012",
          truckNumber: truck.truck_number,
          scheduleId: truck.id,
          documentType: documentDraft.documentType,
          file,
          uploadedBy:
            currentUser?.username ||
            currentUser?.name ||
            "Sistema",
        });
      }

      await refreshTruckDocuments(truck);
      setDocumentDrafts((previous) => ({
        ...previous,
        [truck.id]: {
          documentType: documentDraft.documentType,
          files: [],
          inputVersion: documentDraft.inputVersion + 1,
        },
      }));
    } catch (error) {
      setDocumentErrors((previous) => ({
        ...previous,
        [truck.id]:
          error?.message || "No se han podido añadir los documentos.",
      }));
    } finally {
      setDocumentBusyTruckId("");
    }
  };

  const openDocument = async (truck, document) => {
    setDocumentErrors((previous) => ({ ...previous, [truck.id]: "" }));

    try {
      const signedUrl = await createTruckDocumentDownloadUrl(
        supabase,
        document
      );

      if (!signedUrl) {
        throw new Error("No se ha podido obtener el enlace del documento.");
      }

      const link = window.document.createElement("a");
      link.href = signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setDocumentErrors((previous) => ({
        ...previous,
        [truck.id]:
          error?.message || "No se ha podido abrir el documento.",
      }));
    }
  };

  const removeDocument = async (truck, document) => {
    if (
      !window.confirm(
        `¿Eliminar el documento "${document.file_name}" del camión ${truck.truck_number}?`
      )
    ) {
      return;
    }

    setDocumentBusyTruckId(truck.id);
    setDocumentErrors((previous) => ({ ...previous, [truck.id]: "" }));

    try {
      await deleteTruckDocument(supabase, document);
      await refreshTruckDocuments(truck);
    } catch (error) {
      setDocumentErrors((previous) => ({
        ...previous,
        [truck.id]:
          error?.message || "No se ha podido eliminar el documento.",
      }));
    } finally {
      setDocumentBusyTruckId("");
    }
  };

  const saveTruck = async (truck) => {
    const draft = draftRows[truck.id];

    if (!draft || !onUpdatePlannedTruck || savingTruckId === truck.id) {
      return;
    }

    if (!draft.plannedExpeditionDate) {
      setRowErrors((previous) => ({
        ...previous,
        [truck.id]: "Indica la fecha prevista de expedición.",
      }));
      return;
    }

    setSavingTruckId(truck.id);
    setRowErrors((previous) => ({ ...previous, [truck.id]: "" }));

    try {
      const updated = await onUpdatePlannedTruck(truck, {
        plannedExpeditionDate: draft.plannedExpeditionDate,
        actualExpeditionDate: draft.actualExpeditionDate,
        customerName: draft.customerName,
        destination: draft.destination,
        carrierName: draft.carrierName,
        tractorPlate: draft.tractorPlate,
        trailerPlate: draft.trailerPlate,
        sealNumber: draft.sealNumber,
        deliveryNoteNumber: draft.deliveryNoteNumber,
        shipmentStatus: draft.shipmentStatus,
        notes: draft.notes,
        status: draft.status,
      });

      if (updated === false) {
        throw new Error("No se ha podido actualizar la planificación.");
      }

      await rememberLogisticsDraft(draft);
    } catch (error) {
      setRowErrors((previous) => ({
        ...previous,
        [truck.id]:
          error?.message || "No se han podido guardar los datos logísticos.",
      }));
    } finally {
      setSavingTruckId("");
    }
  };

  const openCreateForm = () => {
    setCreateError("");
    setNewTruckDraft(createEmptyTruckDraft());
    setIsCreating(true);
  };

  const cancelCreate = () => {
    if (isSavingNewTruck) return;

    setCreateError("");
    setNewTruckDraft(createEmptyTruckDraft());
    setIsCreating(false);
  };

  const createTruck = async (event) => {
    event.preventDefault();

    if (creatingTruckRef.current) return;

    if (!newTruckDraft.plannedExpeditionDate) {
      setCreateError("Indica la fecha prevista de expedición.");
      return;
    }

    if (!onCreatePlannedTruck) {
      setCreateError("La creación de camiones no está disponible.");
      return;
    }

    setCreateError("");
    setIsSavingNewTruck(true);
    creatingTruckRef.current = true;

    try {
      const created = await onCreatePlannedTruck({
        ...newTruckDraft,
        tractorPlate: newTruckDraft.tractorPlate.trim().toUpperCase(),
        trailerPlate: newTruckDraft.trailerPlate.trim().toUpperCase(),
        status: "PLANNED",
      });

      if (created === false) {
        setCreateError("No se ha podido guardar. Revisa el aviso mostrado.");
        return;
      }

      await rememberLogisticsDraft(newTruckDraft);
      setNewTruckDraft(createEmptyTruckDraft());
      setIsCreating(false);
    } catch (error) {
      setCreateError(
        error?.message || "No se ha podido crear el camión planificado."
      );
    } finally {
      creatingTruckRef.current = false;
      setIsSavingNewTruck(false);
    }
  };

  const orderedSchedule = [...truckSchedule].sort((first, second) => {
    if (!first.planned_expedition_date) return 1;
    if (!second.planned_expedition_date) return -1;

    return first.planned_expedition_date.localeCompare(
      second.planned_expedition_date
    );
  });

  const today = new Date().toISOString().split("T")[0];
  const newTruckDestinations = getCustomerDestinations(
    logisticsMasters,
    newTruckDraft.customerName
  );

  return (
    <FmCard>
      <datalist id="planner-customer-options">
        {logisticsMasters.customers.map((customer) => (
          <option key={customer.id} value={customer.name} />
        ))}
      </datalist>

      <datalist id="planner-carrier-options">
        {logisticsMasters.carriers.map((carrier) => (
          <option key={carrier.id} value={carrier.name} />
        ))}
      </datalist>

      <datalist id="planner-new-destination-options">
        {newTruckDestinations.map((destination) => (
          <option key={destination.id} value={destination.name} />
        ))}
      </datalist>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <FmSectionTitle
          eyebrow="Logística · V2.23"
          title="Planificador de Expediciones"
          description="Fechas, cliente, destino, transporte y documentación de los próximos camiones."
        />

        <FmButton
          type="button"
          onClick={openCreateForm}
          disabled={isCreating}
        >
          + Nuevo camión
        </FmButton>
      </div>

      {(logisticsMastersError || logisticsMasterWarning) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {logisticsMasterWarning || logisticsMastersError}
        </div>
      )}

      <p className="mb-4 text-xs font-semibold text-slate-500">
        {logisticsMastersLoading
          ? "Cargando clientes, destinos y transportistas..."
          : "Selecciona un dato habitual o escribe uno nuevo. Los nuevos valores se recordarán al guardar."}
      </p>

      {isCreating && (
        <form
          onSubmit={createTruck}
          className="mb-5 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                Nueva planificación
              </div>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                Programar nuevo camión
              </h3>
            </div>

            <div className="flex gap-2">
              <FmBadge color="blue">PLANNED</FmBadge>
              <FmBadge color={shipmentBadgeColor(newTruckDraft.shipmentStatus)}>
                {shipmentStatusLabel(newTruckDraft.shipmentStatus)}
              </FmBadge>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Número del camión
              </div>
              <div className="mt-1 text-base font-black text-slate-900">
                Asignación automática
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Se utilizará el siguiente número disponible.
              </div>
            </div>

            <label className="block">
              <FieldLabel required>Fecha prevista</FieldLabel>
              <FmInput
                type="date"
                min={today}
                value={newTruckDraft.plannedExpeditionDate}
                onChange={(event) =>
                  updateNewTruckDraft(
                    "plannedExpeditionDate",
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label className="block">
              <FieldLabel>Cliente</FieldLabel>
              <FmInput
                list="planner-customer-options"
                value={newTruckDraft.customerName}
                onChange={(event) =>
                  updateNewTruckDraft("customerName", event.target.value)
                }
                placeholder="Nombre del cliente"
              />
            </label>

            <label className="block">
              <FieldLabel>Destino</FieldLabel>
              <FmInput
                list="planner-new-destination-options"
                value={newTruckDraft.destination}
                onChange={(event) =>
                  updateNewTruckDraft("destination", event.target.value)
                }
                placeholder="Población o dirección de entrega"
              />
            </label>

            <label className="block">
              <FieldLabel>Transportista</FieldLabel>
              <FmInput
                list="planner-carrier-options"
                value={newTruckDraft.carrierName}
                onChange={(event) =>
                  updateNewTruckDraft("carrierName", event.target.value)
                }
                placeholder="Empresa de transporte"
              />
            </label>

            <label className="block">
              <FieldLabel>Matrícula tractora</FieldLabel>
              <FmInput
                value={newTruckDraft.tractorPlate}
                onChange={(event) =>
                  updateNewTruckDraft(
                    "tractorPlate",
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="0000 ABC"
              />
            </label>

            <label className="block">
              <FieldLabel>Matrícula remolque</FieldLabel>
              <FmInput
                value={newTruckDraft.trailerPlate}
                onChange={(event) =>
                  updateNewTruckDraft(
                    "trailerPlate",
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="R-0000-ABC"
              />
            </label>

            <label className="block">
              <FieldLabel>Brida / precinto</FieldLabel>
              <FmInput
                value={newTruckDraft.sealNumber}
                onChange={(event) =>
                  updateNewTruckDraft("sealNumber", event.target.value)
                }
                placeholder="Número de brida o precinto"
              />
            </label>

            <label className="block">
              <FieldLabel>Número de albarán</FieldLabel>
              <FmInput
                value={newTruckDraft.deliveryNoteNumber}
                onChange={(event) =>
                  updateNewTruckDraft(
                    "deliveryNoteNumber",
                    event.target.value
                  )
                }
                placeholder="Pendiente de asignar"
              />
            </label>

            <label className="block">
              <FieldLabel>Estado logístico</FieldLabel>
              <select
                value={newTruckDraft.shipmentStatus}
                onChange={(event) =>
                  updateNewTruckDraft("shipmentStatus", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {SHIPMENT_STATUS_OPTIONS
                  .filter((option) => option.value !== "SHIPPED")
                  .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <FieldLabel>Fecha real de expedición</FieldLabel>
              <FmInput
                type="date"
                value={newTruckDraft.actualExpeditionDate}
                onChange={(event) =>
                  updateNewTruckDraft(
                    "actualExpeditionDate",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="block md:col-span-2 xl:col-span-2 2xl:col-span-3">
              <FieldLabel>Observaciones</FieldLabel>
              <FmTextarea
                rows={2}
                value={newTruckDraft.notes}
                onChange={(event) =>
                  updateNewTruckDraft("notes", event.target.value)
                }
                placeholder="Información opcional de la expedición"
              />
            </label>
          </div>

          {createError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {createError}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <FmButton
              type="button"
              variant="light"
              onClick={cancelCreate}
              disabled={isSavingNewTruck}
            >
              Cancelar
            </FmButton>
            <FmButton type="submit" disabled={isSavingNewTruck}>
              {isSavingNewTruck ? "Guardando..." : "Guardar planificación"}
            </FmButton>
          </div>
        </form>
      )}

      {truckSchedule.length === 0 && !isCreating ? (
        <FmEmptyState
          title="No hay expediciones planificadas"
          description="Añade un nuevo camión para comenzar la planificación."
        />
      ) : truckSchedule.length > 0 ? (
        <div className="space-y-4">
          {orderedSchedule.map((truck) => {
            const draft = draftRows[truck.id] || draftFromTruck(truck);
            const isSaving = savingTruckId === truck.id;
            const documents = documentsByTruck[truck.id] || [];
            const documentDraft = documentDrafts[truck.id] || {
              documentType: "DELIVERY_NOTE",
              files: [],
              inputVersion: 0,
            };
            const isDocumentBusy = documentBusyTruckId === truck.id;
            const truckDestinations = getCustomerDestinations(
              logisticsMasters,
              draft.customerName
            );
            const checklist = buildExpeditionChecklist({
              truck,
              draft,
              documents,
              requireProductionClosed: false,
            });

            return (
              <section
                key={truck.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Expedición planificada
                    </div>
                    <div className="mt-1 text-xl font-black text-slate-950">
                      Camión {truck.truck_number}
                      <span className="ml-3 text-sm text-slate-500">
                        {formatDate(draft.plannedExpeditionDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FmBadge
                      color={truck.status === "OPEN" ? "green" : "blue"}
                    >
                      {truck.status}
                    </FmBadge>
                    <FmBadge
                      color={shipmentBadgeColor(draft.shipmentStatus)}
                    >
                      {shipmentStatusLabel(draft.shipmentStatus)}
                    </FmBadge>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${checklistStatusClass(
                        checklist.status
                      )}`}
                    >
                      {checklist.statusLabel}
                    </span>
                  </div>
                </div>

                {checklist.dateAlert && (
                  <div
                    className={`mx-4 mt-4 rounded-2xl border px-4 py-3 ${dateAlertClass(
                      checklist.dateAlert.level
                    )}`}
                  >
                    <div className="text-sm font-black">
                      {checklist.dateAlert.label}
                    </div>
                    <div className="mt-1 text-xs font-bold">
                      {checklist.dateAlert.message}
                    </div>
                  </div>
                )}

                <datalist id={`planner-destination-${truck.id}`}>
                  {truckDestinations.map((destination) => (
                    <option
                      key={destination.id}
                      value={destination.name}
                    />
                  ))}
                </datalist>

                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <label className="block">
                    <FieldLabel required>Fecha prevista</FieldLabel>
                    <FmInput
                      type="date"
                      min={today}
                      value={draft.plannedExpeditionDate}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "plannedExpeditionDate",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Cliente</FieldLabel>
                    <FmInput
                      list="planner-customer-options"
                      value={draft.customerName}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "customerName",
                          event.target.value
                        )
                      }
                      placeholder="Nombre del cliente"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Destino</FieldLabel>
                    <FmInput
                      list={`planner-destination-${truck.id}`}
                      value={draft.destination}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "destination",
                          event.target.value
                        )
                      }
                      placeholder="Población o dirección"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Transportista</FieldLabel>
                    <FmInput
                      list="planner-carrier-options"
                      value={draft.carrierName}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "carrierName",
                          event.target.value
                        )
                      }
                      placeholder="Empresa de transporte"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Matrícula tractora</FieldLabel>
                    <FmInput
                      value={draft.tractorPlate}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "tractorPlate",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="0000 ABC"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Matrícula remolque</FieldLabel>
                    <FmInput
                      value={draft.trailerPlate}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "trailerPlate",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="R-0000-ABC"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Brida / precinto</FieldLabel>
                    <FmInput
                      value={draft.sealNumber}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "sealNumber",
                          event.target.value
                        )
                      }
                      placeholder="Número de brida o precinto"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Número de albarán</FieldLabel>
                    <FmInput
                      value={draft.deliveryNoteNumber}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "deliveryNoteNumber",
                          event.target.value
                        )
                      }
                      placeholder="Pendiente de asignar"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Estado logístico</FieldLabel>
                    <select
                      value={draft.shipmentStatus}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "shipmentStatus",
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {SHIPMENT_STATUS_OPTIONS
                        .filter(
                          (option) => option.value !== "SHIPPED"
                        )
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block">
                    <FieldLabel>Fecha real de expedición</FieldLabel>
                    <FmInput
                      type="date"
                      value={draft.actualExpeditionDate}
                      onChange={(event) =>
                        updateDraft(
                          truck.id,
                          "actualExpeditionDate",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="block md:col-span-2 xl:col-span-2 2xl:col-span-4">
                    <FieldLabel>Observaciones</FieldLabel>
                    <FmTextarea
                      rows={2}
                      value={draft.notes}
                      onChange={(event) =>
                        updateDraft(truck.id, "notes", event.target.value)
                      }
                      placeholder="Información opcional de la expedición"
                    />
                  </label>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                        Checklist de expedición
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-600">
                        {checklist.completedRequired}/
                        {checklist.totalRequired} requisitos obligatorios
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${checklistStatusClass(
                        checklist.status
                      )}`}
                    >
                      {checklist.statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        checklist.isReady
                          ? "bg-emerald-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${checklist.percent}%` }}
                    />
                  </div>

                  {checklist.missingItems.length ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      Falta completar:{" "}
                      {checklist.missingItems
                        .map((item) => item.label)
                        .join(", ")}.
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                      Datos obligatorios y albarán preparados.
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {checklist.optionalItems.map((item) => (
                      <span
                        key={item.key}
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.complete
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-white text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        {item.label}:{" "}
                        {item.complete ? "Adjunto" : "Opcional"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                        Documentos del camión
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-500">
                        Albaranes, CMR, fotografías de carga y otros archivos.
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {documents.length} documentos
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                    <select
                      value={documentDraft.documentType}
                      onChange={(event) =>
                        updateDocumentDraft(
                          truck.id,
                          "documentType",
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {DOCUMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <input
                      key={documentDraft.inputVersion}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,image/*"
                      onChange={(event) =>
                        updateDocumentDraft(
                          truck.id,
                          "files",
                          Array.from(event.target.files || [])
                        )
                      }
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-black file:text-blue-700"
                    />

                    <FmButton
                      type="button"
                      onClick={() => addDocuments(truck)}
                      disabled={
                        isDocumentBusy ||
                        !documentDraft.files?.length
                      }
                    >
                      {isDocumentBusy ? "Procesando..." : "Añadir"}
                    </FmButton>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Puedes seleccionar varios archivos. Tamaño máximo: 25 MB por archivo.
                  </div>

                  {documentErrors[truck.id] && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      {documentErrors[truck.id]}
                    </div>
                  )}

                  {documents.length ? (
                    <div className="mt-4 grid gap-2 lg:grid-cols-2">
                      {documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black uppercase text-blue-700">
                              {documentTypeLabel(document.document_type)}
                            </div>
                            <div className="mt-1 truncate text-sm font-black text-slate-900">
                              {document.file_name}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {formatFileSize(document.file_size)}
                              {document.uploaded_by
                                ? ` · ${document.uploaded_by}`
                                : ""}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <FmButton
                              type="button"
                              variant="light"
                              className="min-h-0 px-3 py-2 text-xs"
                              onClick={() =>
                                openDocument(truck, document)
                              }
                              disabled={isDocumentBusy}
                            >
                              Abrir
                            </FmButton>
                            <FmButton
                              type="button"
                              variant="danger"
                              className="min-h-0 px-3 py-2 text-xs"
                              onClick={() =>
                                removeDocument(truck, document)
                              }
                              disabled={isDocumentBusy}
                            >
                              Eliminar
                            </FmButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-500">
                      Todavía no hay documentos asociados a este camión.
                    </div>
                  )}
                </div>

                {rowErrors[truck.id] && (
                  <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {rowErrors[truck.id]}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-500">
                    Los datos se copiarán al camión real cuando pase a estado abierto.
                  </div>
                  <div className="flex gap-2">
                    <FmButton
                      type="button"
                      variant="dark"
                      className="min-h-0 px-4 py-2 text-xs"
                      onClick={() => saveTruck(truck)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </FmButton>

                    {truck.status === "PLANNED" && (
                      <FmButton
                        type="button"
                        variant="danger"
                        className="min-h-0 px-4 py-2 text-xs"
                        onClick={() => onDeletePlannedTruck(truck)}
                        disabled={isSaving}
                      >
                        Eliminar
                      </FmButton>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 text-xs font-semibold text-slate-400">
        Usuario: {currentUser?.name || currentUser?.username || "-"}
      </div>
    </FmCard>
  );
}
