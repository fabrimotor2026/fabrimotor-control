import { memo } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
} from "lucide-react";

import FmBadge from "../../components/ui/FmBadge";
import FmCard from "../../components/ui/FmCard";
import FmSectionTitle from "../../components/ui/FmSectionTitle";

function CounterCard({ icon, title, value, color }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-wide">
          {title}
        </div>
        {icon}
      </div>

      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function ControlStatusSummary({ validation, overallOk }) {
  const isEmpty = (item) =>
    item.value === "" ||
    item.value === undefined ||
    item.value === null;

  const optionalShiftStartCount = validation.filter(
    (item) => item.pendingShiftStart && isEmpty(item)
  ).length;

  const okCount = validation.filter(
    (item) => item.ok && !isEmpty(item)
  ).length;

  const nokCount = validation.filter(
    (item) => !isEmpty(item) && !item.ok
  ).length;

  const pendingCount = validation.filter(
    (item) => isEmpty(item) && !item.pendingShiftStart
  ).length;

  return (
    <FmCard>
      <div className="flex items-start justify-between gap-3">
        <FmSectionTitle
          eyebrow="Producción"
          title="Estado del control"
          description="Resumen de la verificación actual."
        />

        <FmBadge color={overallOk ? "green" : "red"}>
          {overallOk ? "CONTROL OK" : "CONTROL NO OK"}
        </FmBadge>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <CounterCard
          title="OK"
          value={okCount}
          color="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <CounterCard
          title="NO OK"
          value={nokCount}
          color="red"
          icon={<CircleAlert className="h-5 w-5" />}
        />

        <CounterCard
          title="Pendientes"
          value={pendingCount}
          color="slate"
          icon={<Clock3 className="h-5 w-5" />}
        />
      </div>

      {optionalShiftStartCount > 0 && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {optionalShiftStartCount} controles de inicio de turno ya
          realizados; no es necesario repetirlos en esta pieza.
        </div>
      )}

      <div
        className={`mt-5 rounded-3xl border-2 p-5 text-center ${
          overallOk
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Resultado previsto
        </div>

        <div
          className={`mt-2 text-4xl font-black ${
            overallOk
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {overallOk ? "✔ OK" : "✖ NO OK"}
        </div>
      </div>
    </FmCard>
  );
}

export default memo(ControlStatusSummary);
