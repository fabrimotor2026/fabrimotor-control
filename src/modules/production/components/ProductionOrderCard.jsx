export default function ProductionOrderCard({ order, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(order)}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        selected ? "border-blue-400 bg-blue-50 shadow-lg" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Fabricación</div>
          <div className="mt-1 text-xl font-black text-slate-900">{order.fabrication}</div>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">En producción</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-2">
          <div className="text-lg font-black text-slate-900">{order.boxNumbers?.length || 0}</div>
          <div className="text-[11px] font-bold text-slate-500">cajas</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <div className="text-lg font-black text-slate-900">{order.pieces || 0}</div>
          <div className="text-[11px] font-bold text-slate-500">piezas</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <div className="text-lg font-black text-slate-900">{order.heats?.length || 0}</div>
          <div className="text-[11px] font-bold text-slate-500">coladas</div>
        </div>
      </div>

      <div className="mt-3 text-xs font-semibold text-slate-500">
        Última actividad: <span className="font-black text-slate-700">{order.lastDate || "-"}</span>
      </div>
    </button>
  );
}
