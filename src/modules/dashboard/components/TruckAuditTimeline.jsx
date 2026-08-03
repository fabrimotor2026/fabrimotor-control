import {
  CalendarPlus,
  FilePlus2,
  FileX2,
  History,
  PackageCheck,
  Pencil,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchTruckAuditEvents,
} from "../../../services/truckAuditService";

const EVENT_STYLE = {
  PLANNING_CREATED: {
    icon: CalendarPlus,
    iconClass: "bg-blue-100 text-blue-700",
  },
  PLANNING_UPDATED: {
    icon: Pencil,
    iconClass: "bg-blue-100 text-blue-700",
  },
  PLANNING_DELETED: {
    icon: FileX2,
    iconClass: "bg-red-100 text-red-700",
  },
  TRUCK_OPENED: {
    icon: Truck,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  LOGISTICS_UPDATED: {
    icon: Pencil,
    iconClass: "bg-amber-100 text-amber-800",
  },
  DOCUMENT_ADDED: {
    icon: FilePlus2,
    iconClass: "bg-violet-100 text-violet-700",
  },
  DOCUMENT_DELETED: {
    icon: FileX2,
    iconClass: "bg-red-100 text-red-700",
  },
  PRODUCTION_CLOSED: {
    icon: PackageCheck,
    iconClass: "bg-slate-200 text-slate-800",
  },
  SHIPMENT_CONFIRMED: {
    icon: Truck,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  INITIAL_STATE: {
    icon: History,
    iconClass: "bg-slate-100 text-slate-600",
  },
};

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAuditValue(value, field) {
  if (value === null || value === undefined || value === "") {
    return "Sin dato";
  }

  if (
    field === "planned_expedition_date" ||
    field === "actual_expedition_date"
  ) {
    const [year, month, day] = String(value)
      .slice(0, 10)
      .split("-");

    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  const statusLabels = {
    PLANNED: "Planificado",
    OPEN: "Abierto",
    CLOSED: "Cerrado",
    PENDING: "Pendiente",
    READY: "Preparado",
    SHIPPED: "Expedido",
  };

  return statusLabels[value] || String(value);
}

function AuditEvent({ event }) {
  const style =
    EVENT_STYLE[event.event_type] ||
    EVENT_STYLE.INITIAL_STATE;
  const EventIcon = style.icon;
  const changes = Array.isArray(event.changes)
    ? event.changes
    : [];
  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? event.metadata
      : {};

  return (
    <article className="relative grid grid-cols-[2.75rem_1fr] gap-3 pb-5 last:pb-0">
      <div className="absolute bottom-0 left-[1.35rem] top-10 w-px bg-slate-200 last:hidden" />
      <div
        className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl ${style.iconClass}`}
      >
        <EventIcon size={20} strokeWidth={2.4} />
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h5 className="font-black text-slate-950">
              {event.event_label || "Actividad registrada"}
            </h5>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {event.actor_display || "Sistema"}
              {" · "}
              {formatDateTime(event.created_at)}
            </p>
          </div>

          {event.source && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-black uppercase text-slate-500">
              {event.source === "PLANNED"
                ? "Planificación"
                : event.source === "ACTIVE"
                  ? "Camión real"
                  : event.source}
            </span>
          )}
        </div>

        {metadata.file_name && (
          <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">
            {metadata.document_type_label
              ? `${metadata.document_type_label}: `
              : ""}
            {metadata.file_name}
          </div>
        )}

        {metadata.reason && (
          <div className="mt-3 text-xs font-bold text-slate-600">
            Motivo: {metadata.reason}
          </div>
        )}

        {changes.length > 0 && (
          <div className="mt-3 grid gap-2 xl:grid-cols-2">
            {changes.map((change, index) => (
              <div
                key={`${change.field || change.label}-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <div className="text-[0.68rem] font-black uppercase tracking-wide text-slate-500">
                  {change.label || change.field}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-slate-500 line-through">
                    {formatAuditValue(
                      change.before,
                      change.field
                    )}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-900">
                    {formatAuditValue(
                      change.after,
                      change.field
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function TruckAuditTimeline({
  truck,
  embedded = false,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reference = truck?.reference || "F-1012";
  const truckNumber = Number(truck?.truck_number);

  const loadEvents = useCallback(async () => {
    if (!truckNumber) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchTruckAuditEvents(supabase, {
        reference,
        truckNumber,
      });
      setEvents(data);
    } catch (loadError) {
      setEvents([]);
      setError(
        loadError?.message ||
          "No se ha podido cargar el historial del camión."
      );
    } finally {
      setLoading(false);
    }
  }, [reference, truckNumber]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!truckNumber || !supabase?.channel) return undefined;

    const channel = supabase
      .channel(`truck-audit-${reference}-${truckNumber}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "f1012_truck_audit_events",
          filter: `truck_number=eq.${truckNumber}`,
        },
        ({ new: newEvent }) => {
          if (newEvent?.reference !== reference) return;

          setEvents((previous) => [
            newEvent,
            ...previous.filter(
              (event) => event.id !== newEvent.id
            ),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reference, truckNumber]);

  return (
    <section
      className={
        embedded
          ? "border-t border-slate-200 bg-white p-4"
          : "mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Trazabilidad · V2.25
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Historial de la expedición
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Cambios, documentos, cierre y salida del camión {truckNumber}.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEvents}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 font-black text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Actualizando..." : "Actualizar historial"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
        Registro de solo lectura. Los acontecimientos no se pueden modificar ni eliminar desde la aplicación.
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {!error && events.length > 0 && (
        <div className="mt-5 max-h-[34rem] overflow-y-auto pr-1">
          {events.map((event) => (
            <AuditEvent key={event.id} event={event} />
          ))}
        </div>
      )}

      {!error && !loading && events.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <History
            size={28}
            className="mx-auto text-slate-400"
          />
          <div className="mt-2 font-black text-slate-700">
            Todavía no hay actividad registrada
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-500">
            El historial comenzará con el próximo cambio del camión.
          </div>
        </div>
      )}
    </section>
  );
}
