import { ExternalLink } from "lucide-react";
import FmBadge from "../../../components/ui/FmBadge";
import FmButton from "../../../components/ui/FmButton";
import FmCard from "../../../components/ui/FmCard";
import {
  getIncidentFields,
  getLabelFields,
  getRecordFields,
  getTruckFields,
} from "../utils/traceabilityModel.js";

function display(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function dateText(timestamp) {
  if (!timestamp) return "Sin fecha";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function detailRows(type, item) {
  if (type === "VERIFICATION") {
    const fields = getRecordFields(item);
    return [
      ["Referencia", fields.reference],
      ["Pieza", fields.pieceNumber],
      ["Fabricación", fields.workOrder],
      ["Colada", fields.lot],
      ["Operario", fields.operator],
      ["Fecha", dateText(fields.savedAtMs)],
    ];
  }

  if (type === "INCIDENT") {
    const fields = getIncidentFields(item);
    return [
      ["Referencia", fields.reference],
      ["Pieza / etiqueta", fields.pieceNumber],
      ["Fabricación", fields.workOrder],
      ["Colada", fields.lot],
      ["Operario", fields.operator],
      ["Fecha", dateText(fields.savedAtMs)],
    ];
  }

  if (type === "LABEL") {
    const fields = getLabelFields(item);
    return [
      ["Caja", fields.boxNumber || fields.labelId],
      ["Referencia", fields.reference],
      ["Fabricación", fields.workOrder],
      ["Colada", fields.lot],
      ["Operario", fields.operator],
      ["Fecha", dateText(fields.savedAtMs)],
    ];
  }

  const fields = getTruckFields(item);
  return [
    ["Camión", fields.truckNumber],
    ["Referencia", fields.reference],
    ["Identificador", fields.id],
    ["Fecha", dateText(fields.savedAtMs)],
  ];
}

const TYPE_META = {
  VERIFICATION: { title: "Verificación", badge: "blue" },
  INCIDENT: { title: "Incidencia", badge: "red" },
  LABEL: { title: "Caja / etiqueta", badge: "green" },
  TRUCK: { title: "Camión", badge: "slate" },
};

export default function TraceabilityCard({ type, item, onOpenEntity }) {
  const meta = TYPE_META[type] || TYPE_META.VERIFICATION;
  const rows = detailRows(type, item);

  return (
    <FmCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <FmBadge color={meta.badge}>{meta.title}</FmBadge>
        {onOpenEntity && (
          <FmButton
            variant="secondary"
            className="min-h-9 px-3 py-2"
            onClick={() => onOpenEntity({ type, item })}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir origen
          </FmButton>
        )}
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-black text-slate-900">{display(value)}</dd>
          </div>
        ))}
      </dl>
    </FmCard>
  );
}
