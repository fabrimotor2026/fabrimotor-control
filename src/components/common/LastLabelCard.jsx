import { memo } from "react";
function LastLabelCard({
  operatorLastBox,
  operatorShiftRecords,
  operatorShiftOk,
  operatorShiftNok,
  operatorLastRecord,
  lastVerificationElapsedLabel,
  controlStatusSummary
}) {
  return (
    <div className="rounded-3xl border-0 bg-white shadow-lg">
      <div className="space-y-4 p-6">

        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Actividad reciente
          </div>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Última etiqueta realizada
          </h2>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-4">

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                Caja
              </div>

              <div className="mt-1 text-3xl font-black leading-none text-blue-950">
                {operatorLastBox?.numeroCaja || "Sin etiqueta"}
              </div>
            </div>

            <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
              <div className="text-xs font-black uppercase text-blue-600">
                Piezas
              </div>

              <div className="text-2xl font-black text-blue-950">
                {operatorLastBox?.totalPiezas ?? "-"}
              </div>
            </div>

          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold text-blue-900">

            <div className="rounded-xl bg-white/70 px-3 py-2">
              <div className="text-xs font-black uppercase text-blue-600">
                Operario
              </div>

              <div className="truncate">
                {operatorLastBox?.operario || "-"}
              </div>
            </div>

            <div className="rounded-xl bg-white/70 px-3 py-2">
              <div className="text-xs font-black uppercase text-blue-600">
                Fecha
              </div>

              <div>
                {operatorLastBox?.fecha || "-"}
              </div>
            </div>

          </div>

        </div>

        <div className="grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl bg-slate-100 p-4">
            <div className="text-2xl font-black text-slate-950">
              {operatorShiftRecords.length}
            </div>

            <div className="text-xs font-black uppercase text-slate-500">
              Controles turno
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="text-2xl font-black text-emerald-700">
              {operatorShiftOk}
            </div>

            <div className="text-xs font-black uppercase text-emerald-700">
              OK
            </div>
          </div>

          <div className="rounded-2xl bg-red-50 p-4">
            <div className="text-2xl font-black text-red-700">
              {operatorShiftNok}
            </div>

            <div className="text-xs font-black uppercase text-red-700">
              NO OK
            </div>
          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">

          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Última verificación
          </div>

          <div className="mt-1 text-xl font-black text-slate-950">
            {lastVerificationElapsedLabel}
          </div>

          <div className="mt-1 text-sm font-bold text-slate-500">
            {operatorLastRecord?.horaGuardado ||
              operatorLastRecord?.hora ||
              "Sin registros"}
          </div>

        </div>

        {controlStatusSummary}

      </div>
    </div>
  );
}
export default memo(LastLabelCard);