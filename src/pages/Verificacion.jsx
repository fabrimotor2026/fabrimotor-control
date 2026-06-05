export default function Verificacion({ children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-slate-900">Nueva verificación</h2>
      {children || <p className="text-slate-500">Aquí va el formulario de verificación.</p>}
    </section>
  );
}
