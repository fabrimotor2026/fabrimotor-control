export default function Incidencias({ records = [], onOpenRejects }) {
  const rejected = records.filter((record) => record.resultado === "NO OK");
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Incidencias y rechazos</h2>
      <p className="mt-2 text-slate-500">Rechazos registrados: {rejected.length}</p>
      <button onClick={onOpenRejects} className="mt-5 rounded-2xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800">Ver rechazos</button>
    </section>
  );
}
