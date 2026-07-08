import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { buildProductionOrders, getProductionSummary } from "../utils/productionModel";
import ProductionOrderCard from "./ProductionOrderCard";
import ProductionOrderDetail from "./ProductionOrderDetail";

export default function ProductionModal({
  open,
  onClose,
  boxLabels = [],
  boxLabelsSummary = [],
  activeTruck,
  displayTruck,
  appConfig = {},
  onOpenBox,
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const orders = useMemo(
    () => buildProductionOrders({ boxLabels, boxLabelsSummary, activeTruck, displayTruck, appConfig }),
    [boxLabels, boxLabelsSummary, activeTruck, displayTruck, appConfig]
  );

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => [
      order.fabrication,
      order.reference,
      order.customer,
      ...(order.boxNumbers || []),
      ...(order.heats || []),
      ...(order.operators || []),
    ].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [orders, query]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedId) || filteredOrders[0] || null;
  const summary = getProductionSummary(orders);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">FM Control · Producción</div>
            <h2 className="mt-1 text-3xl font-black text-slate-900">Órdenes de producción</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Fabricaciones agrupadas por cajas, coladas y operarios.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-3 text-slate-500 hover:bg-slate-100" aria-label="Cerrar producción">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-5">
            <SummaryCard label="Fabricaciones" value={summary.orders} />
            <SummaryCard label="Cajas" value={summary.boxes} />
            <SummaryCard label="Piezas" value={summary.pieces} />
            <SummaryCard label="Coladas" value={summary.heats} />
            <SummaryCard label="Operarios" value={summary.operators} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar fabricación, caja, colada u operario..."
                className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
              />
              <div className="grid max-h-[620px] gap-3 overflow-y-auto pr-1">
                {filteredOrders.length ? filteredOrders.map((order) => (
                  <ProductionOrderCard
                    key={order.id}
                    order={order}
                    selected={selectedOrder?.id === order.id}
                    onSelect={(item) => setSelectedId(item.id)}
                  />
                )) : (
                  <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">No hay fabricaciones localizadas.</div>
                )}
              </div>
            </div>

            <ProductionOrderDetail order={selectedOrder} onOpenBox={onOpenBox} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-3xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
