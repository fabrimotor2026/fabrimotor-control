import { ClipboardCheck, Home, BarChart3, AlertTriangle, HelpCircle, FileText } from "lucide-react";

const menu = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "verificacion", label: "Verificación", icon: ClipboardCheck },
  { id: "calidad", label: "Calidad", icon: BarChart3 },
  { id: "incidencias", label: "Incidencias", icon: AlertTriangle },
  { id: "ayuda", label: "Ayuda", icon: HelpCircle },
];

export default function AppShell({ activeView, setActiveView, form = {}, children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-blue-900 bg-blue-800 px-6 py-4 text-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7" />
            <div>
              <div className="text-xl font-black tracking-wide">FABRIMOTOR · CONTROL F-1012</div>
              <div className="text-sm text-blue-100">Zona B · Entorno de control de proceso</div>
            </div>
          </div>
          <div className="rounded-2xl bg-blue-950/40 px-4 py-2 text-sm">
            Máquina: <strong>{form.maquina || "-"}</strong> · Turno: <strong>{form.turno || "-"}</strong>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-76px)] md:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-300 bg-slate-700 p-4 text-white">
          <nav className="space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition ${active ? "bg-white text-slate-900 shadow" : "text-slate-100 hover:bg-slate-600"}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
