export default function Calidad({ onOpenCpk, onOpenPdf }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Calidad</h2>
      <p className="mt-2 text-slate-500">Consulta gráficos, CPK y exportaciones.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onOpenCpk} className="rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800">Abrir gráfico CPK</button>
        <button onClick={onOpenPdf} className="rounded-2xl bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-800">Ver PDF registros</button>
      </div>
    </section>
  );
}
