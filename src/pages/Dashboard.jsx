import { CheckCircle2, AlertTriangle, ClipboardCheck, Clock } from "lucide-react";

export default function Dashboard({ records = [], form = {}, onNavigate }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((record) => record.fecha === today);
  const okToday = todayRecords.filter((record) => record.resultado === "OK").length;
  const nokToday = todayRecords.filter((record) => record.resultado === "NO OK").length;
  const lastRecords = records.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="OK hoy" value={okToday} icon={<CheckCircle2 />} tone="ok" />
        <StatCard title="NOK hoy" value={nokToday} icon={<AlertTriangle />} tone="nok" />
        <StatCard title="Registros hoy" value={todayRecords.length} icon={<ClipboardCheck />} />
        <StatCard title="Turno" value={form.turno || "-"} icon={<Clock />} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Acciones rápidas</h2>
            <p className="text-sm text-slate-500">Accede a las funciones principales del control F-1012.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <QuickButton onClick={() => onNavigate?.("verificacion")}>Nueva verificación</QuickButton>
          <QuickButton onClick={() => onNavigate?.("calidad")}>Gráfico CPK</QuickButton>
          <QuickButton onClick={() => onNavigate?.("incidencias")}>Rechazos</QuickButton>
          <QuickButton onClick={() => onNavigate?.("ayuda")}>Ayuda visual</QuickButton>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-white font-bold">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Últimas verificaciones</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Máquina</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Pieza</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {lastRecords.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Todavía no hay registros.</td></tr>
              ) : lastRecords.map((record) => (
                <tr key={record.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{record.fecha}</td>
                  <td className="px-4 py-3">{record.maquina}</td>
                  <td className="px-4 py-3">{record.turno}</td>
                  <td className="px-4 py-3">{record.numeroPieza}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.resultado === "OK" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {record.resultado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, tone }) {
  const toneClass = tone === "ok" ? "text-emerald-700 bg-emerald-50" : tone === "nok" ? "text-red-700 bg-red-50" : "text-white bg-blue-50";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClass}`}>{icon}</div>
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function QuickButton({ children, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-blue-700 px-5 py-4 text-left font-bold text-white shadow-sm transition hover:bg-blue-800">
      {children}
    </button>
  );
}
