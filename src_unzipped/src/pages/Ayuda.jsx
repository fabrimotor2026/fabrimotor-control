export default function Ayuda() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Ayuda visual</h2>
      <p className="mt-2 text-slate-500 text-white font-bold">Los vídeos deben guardarse en <strong>public/videos/</strong>.</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 font-bold text-slate-800">Vídeo principal</div>
        <video src="/videos/ayuda-cota.mp4" controls className="w-full rounded-xl bg-black" style={{ maxHeight: 420 }} />
      </div>
    </section>
  );
}
