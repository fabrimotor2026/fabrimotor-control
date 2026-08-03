export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          FM Control
        </p>
        <h1 className="mt-3 text-3xl font-bold">Página no encontrada</h1>
        <p className="mt-3 text-slate-600">
          La dirección solicitada no corresponde a ningún módulo disponible.
        </p>
        <a
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
          href="/"
        >
          Volver a FM Control
        </a>
      </section>
    </main>
  );
}
