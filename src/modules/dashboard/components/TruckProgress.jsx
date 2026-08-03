import { memo } from "react";

function TruckProgress({ percent }) {
  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
        <span>Progreso de carga</span>
        <span>{percent}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${percent >= 95 ? "bg-red-500" : percent >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default memo(TruckProgress);
