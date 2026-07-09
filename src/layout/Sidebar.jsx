import {
  BarChart3,
  ClipboardList,
  Gauge,
  LogOut,
  PackagePlus,
  Settings,
  Truck,
  Users,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "Operación",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Gauge },
      { id: "production", label: "Producción", icon: ClipboardList },
      { id: "trucks", label: "Camiones", icon: Truck },
      { id: "operators", label: "Operarios", icon: Users, disabled: true },
    ],
  },
  {
    title: "Análisis",
    items: [{ id: "statistics", label: "Estadísticas", icon: BarChart3, disabled: true }],
  },
  {
    title: "Sistema",
    items: [
      { id: "labels", label: "Etiquetas", icon: PackagePlus },
      { id: "config", label: "Configuración", icon: Settings },
    ],
  },
];

export default function Sidebar({
  activeModule,
  onNavigate,
  currentUser,
  onLogout,
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-[8800] hidden w-72 flex-col border-r border-slate-800 bg-[#0f172a] text-slate-100 shadow-2xl lg:flex">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="text-[11px] font-black uppercase tracking-[0.38em] text-blue-300">FABRIMOTOR</div>
        <div className="mt-2 text-3xl font-black tracking-tight text-white">FM Control</div>
        <div className="mt-4 inline-flex items-center rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-100 ring-1 ring-blue-400/30">
          Industrial Workspace
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => onNavigate?.(item.id)}
                      className={`group flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-black transition focus:outline-none focus:ring-2 focus:ring-blue-300/70 ${
                        active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/50"
                          : item.disabled
                          ? "cursor-not-allowed text-slate-500"
                          : "text-slate-100 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-white/16" : "bg-white/6 group-hover:bg-white/10"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                      {item.disabled && <span className="ml-auto rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-black text-slate-400 ring-1 ring-white/10">Próx.</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-black text-red-300 transition hover:bg-red-600/10 hover:text-red-200"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 group-hover:bg-red-500/20">
            <LogOut className="h-5 w-5" />
          </span>
          
          <span className="flex-1">
            Cerrar sesión
          </span>
        </button>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Usuario conectado</div>
          <div className="mt-2 truncate text-base font-black text-white">
            {currentUser?.name || currentUser?.username || "Usuario"}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-300">{currentUser?.role || "Sin rol"}</div>
        </div>
      </div>
    </aside>
  );
}
