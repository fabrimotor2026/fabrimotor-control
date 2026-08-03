import { AlertTriangle, Box, ClipboardCheck, Truck } from "lucide-react";
import FmEmptyState from "../../../components/ui/FmEmptyState";
import TraceabilityCard from "./TraceabilityCard";

const ICONS = {
  VERIFICATION: ClipboardCheck,
  INCIDENT: AlertTriangle,
  LABEL: Box,
  TRUCK: Truck,
};

export default function TraceabilityTimeline({ timeline = [], onOpenEntity }) {
  if (!timeline.length) {
    return (
      <FmEmptyState
        title="Sin recorrido disponible"
        description="Realiza una búsqueda para construir la línea temporal de la pieza, caja o camión."
      />
    );
  }

  return (
    <div className="relative grid gap-4 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-slate-200">
      {timeline.map((entry, index) => {
        const Icon = ICONS[entry.type] || ClipboardCheck;
        const key = `${entry.type}-${entry.at || 0}-${index}`;

        return (
          <div key={key} className="relative grid grid-cols-[42px_1fr] gap-3">
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-white shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <TraceabilityCard
              type={entry.type}
              item={entry.item}
              onOpenEntity={onOpenEntity}
            />
          </div>
        );
      })}
    </div>
  );
}
