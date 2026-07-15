import { memo } from "react";
import FmCard from "../../../components/ui/FmCard";

function KPICard({
  icon,
  label,
  value,
  detail,
  tone = "slate",
}) {
  const tones = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    red: "bg-red-600 text-white",
    amber: "bg-amber-500 text-white",
    slate: "bg-slate-900 text-white",
  };

  return (
    <FmCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            tones[tone] || tones.slate
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="text-3xl font-black text-slate-950">
        {value}
      </div>

      {detail && (
        <div className="mt-1 text-xs font-semibold text-slate-500">
          {detail}
        </div>
      )}
    </FmCard>
  );
}

export default memo(KPICard);