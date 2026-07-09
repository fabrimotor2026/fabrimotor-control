export default function ControlStatusSummary({
  validation,
  overallOk,
}) {
  const okCount = validation.filter((item) => item.ok).length;

  const nokCount = validation.filter(
    (item) => item.value !== "" && item.value !== undefined && !item.ok
  ).length;

  const pendingCount = validation.filter(
    (item) => item.value === "" || item.value === undefined
  ).length;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        overallOk
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
        Estado del control
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs font-black uppercase text-emerald-700">
            OK
          </div>

          <div className="text-2xl font-black text-emerald-700">
            {okCount}
          </div>
        </div>

        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs font-black uppercase text-red-700">
            NO OK
          </div>

          <div className="text-2xl font-black text-red-700">
            {nokCount}
          </div>
        </div>

        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs font-black uppercase text-slate-500">
            Sin medir
          </div>

          <div className="text-2xl font-black text-slate-700">
            {pendingCount}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-white px-4 py-3 text-center text-lg font-black">
        Resultado previsto:{" "}
        <span className={overallOk ? "text-emerald-700" : "text-red-700"}>
          {overallOk ? "OK" : "NO OK"}
        </span>
      </div>
    </div>
  );
}