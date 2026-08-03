export default function ProductionOrderDetail({ order, onOpenBox }) {
  if (!order) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl font-black text-slate-900">Selecciona una fabricación</div>
        <p className="mt-2 text-sm font-semibold text-slate-500">Verás sus cajas, operarios, coladas y trazabilidad.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Orden de producción</div>
          <h3 className="mt-1 text-3xl font-black text-slate-900">{order.fabrication}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Referencia {order.reference || "-"} · Cliente {order.customer || "-"}</p>
        </div>
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">FM-017</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <InfoCard label="Piezas fabricadas" value={order.pieces || 0} />
        <InfoCard label="Cajas" value={order.boxNumbers?.length || 0} />
        <InfoCard label="Operarios" value={order.operators?.length || 0} />
        <InfoCard label="Coladas" value={order.heats?.length || 0} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ListBlock title="Operarios" items={order.operators} empty="Sin operarios" />
        <ListBlock title="Coladas" items={order.heats} empty="Sin coladas" />
        <ListBlock title="Camiones" items={order.trucks} empty="Sin camión" />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-black text-slate-900">Cajas asociadas</h4>
          <span className="text-xs font-black text-slate-400">{order.boxes?.length || 0} registros</span>
        </div>
        <div className="grid max-h-[330px] gap-2 overflow-y-auto pr-1">
          {(order.boxes || []).map((box, index) => (
            <button
              key={`${box.numeroCaja || index}-${index}`}
              type="button"
              onClick={() => onOpenBox?.(box)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50"
            >
              <div>
                <div className="font-black text-slate-900">Caja {box.numeroCaja || "-"}</div>
                <div className="text-xs font-semibold text-slate-500">{box.fecha || "Sin fecha"}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900">{box.piezas || 0}</div>
                <div className="text-xs font-semibold text-slate-500">piezas</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 text-center">
      <div className="text-2xl font-black text-slate-900">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function ListBlock({ title, items = [], empty }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-sm font-black text-slate-900">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span key={item} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">{item}</span>
        )) : <span className="text-sm font-semibold text-slate-400">{empty}</span>}
      </div>
    </div>
  );
}
