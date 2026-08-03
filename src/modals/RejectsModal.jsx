export default function RejectsModal({ records = [], onClose }) {
  const rejected = records.filter((record) => record.resultado === "NO OK");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,.65)" }}>
      <div className="max-h-[92vh] w-[min(1100px,96vw)] overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">Rechazos</h2><button onClick={onClose}>Cerrar</button></div>
        {rejected.length === 0 ? <p className="text-slate-500">No hay rechazos registrados.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3">Fecha</th><th className="p-3">Máquina</th><th className="p-3">Pieza</th><th className="p-3">Motivo</th></tr></thead>
            <tbody>{rejected.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{r.fecha}</td><td className="p-3">{r.maquina}</td><td className="p-3">{r.numeroPieza}</td><td className="p-3">{r.rechazoTipo}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
