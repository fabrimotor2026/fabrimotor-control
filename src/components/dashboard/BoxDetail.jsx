function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}

export default function BoxDetail({
  selectedBox,
  currentTruck,
  newExpeditionDate,
  setNewExpeditionDate,
  handleSaveExpeditionDate,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">Detalle de caja</h3>
      {!selectedBox ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Selecciona una caja para ver el detalle.</div>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="rounded-3xl bg-slate-900 p-5 text-white">
            <div className="text-xs font-black uppercase tracking-wide text-slate-300">Caja</div>
            <div className="mt-1 text-4xl font-black">{selectedBox.numeroCaja}</div>
          </div>
          <div className="grid gap-3 text-sm">
            <InfoRow label="Camión" value={currentTruck?.truck_code || currentTruck?.truck_number || "-"} />
            <InfoRow label="Operario" value={selectedBox.operario || "-"} />
            <InfoRow label="Fecha" value={selectedBox.fecha || "-"} />
            <InfoRow label="Semana" value={selectedBox.semana || "-"} />
            <InfoRow label="Día" value={selectedBox.dia || "-"} />
            <InfoRow label="Piezas" value={selectedBox.totalPiezas || 0} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Fabricaciones / coladas</div>
            <div className="grid gap-2 text-sm font-semibold text-slate-700">
              {(selectedBox.combinaciones || []).map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-xl bg-white px-3 py-2 shadow-sm">{item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentTruck && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Fecha prevista expedición</div>
          <div className="flex gap-2">
            <input type="date" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={newExpeditionDate || ""} onChange={(e) => setNewExpeditionDate(e.target.value)} />
            <button type="button" onClick={handleSaveExpeditionDate} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
