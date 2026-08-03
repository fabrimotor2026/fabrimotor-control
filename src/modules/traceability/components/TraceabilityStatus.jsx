import { AlertTriangle, CheckCircle2, Info, Link2 } from "lucide-react";
import FmBadge from "../../../components/ui/FmBadge";
import FmCard from "../../../components/ui/FmCard";
import FmStatCard from "../../../components/ui/FmStatCard";

function resolveStatus(result) {
  const summary = result?.summary || {};
  const total =
    (summary.records || 0) +
    (summary.incidents || 0) +
    (summary.labels || 0) +
    (summary.trucks || 0);

  if (!total) {
    return {
      title: "Sin resultados",
      description: "No se han localizado registros con los criterios indicados.",
      color: "slate",
      icon: Info,
    };
  }

  if ((summary.incidents || 0) > 0) {
    return {
      title: "Trazabilidad con incidencias",
      description: "El expediente contiene una o más incidencias relacionadas.",
      color: "red",
      icon: AlertTriangle,
    };
  }

  if (summary.hasExactTruckLink) {
    return {
      title: "Trazabilidad enlazada",
      description: "Existe una relación exacta entre caja y camión.",
      color: "green",
      icon: CheckCircle2,
    };
  }

  return {
    title: "Trazabilidad parcial",
    description: "Se han localizado datos, pero no todas las relaciones son exactas.",
    color: "orange",
    icon: Link2,
  };
}

export default function TraceabilityStatus({ result }) {
  const summary = result?.summary || {};
  const status = resolveStatus(result);
  const Icon = status.icon;

  return (
    <div className="grid gap-4">
      <FmCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-950">{status.title}</div>
              <div className="text-sm font-semibold text-slate-500">{status.description}</div>
            </div>
          </div>
          <FmBadge color={status.color}>{status.title}</FmBadge>
        </div>
      </FmCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FmStatCard title="Verificaciones" value={summary.records || 0} color="blue" />
        <FmStatCard title="Incidencias" value={summary.incidents || 0} color="red" />
        <FmStatCard title="Cajas / etiquetas" value={summary.labels || 0} color="green" />
        <FmStatCard title="Camiones" value={summary.trucks || 0} color="slate" />
      </div>

      <div className="flex flex-wrap gap-2">
        <FmBadge color="green">Exactas: {summary.exactRelations || 0}</FmBadge>
        <FmBadge color="blue">Fuertes: {summary.strongRelations || 0}</FmBadge>
        <FmBadge color="orange">Compatibles: {summary.compatibleRelations || 0}</FmBadge>
      </div>
    </div>
  );
}
