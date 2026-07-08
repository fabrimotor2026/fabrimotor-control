import { Clock, Search, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { APP_VERSION } from "../config/constants";

export default function Header({
  activeModuleLabel = "Dashboard",
  currentUser,
  supabaseOnline = false,
  nowText = "",
  onOpenCommand,
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-[8700] border-b border-slate-200 bg-white/97 shadow-sm backdrop-blur lg:left-72">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 lg:px-7">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">FM Control v{APP_VERSION}</div>
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">{activeModuleLabel}</h1>
        </div>

        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden min-h-12 min-w-[360px] max-w-2xl flex-1 items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 px-4 text-left text-sm font-black text-slate-600 shadow-inner transition hover:border-blue-400 hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-100 md:flex"
          title="Abrir centro de comandos (Ctrl + K)"
        >
          <span className="flex items-center gap-3"><Search className="h-5 w-5 text-blue-600" /> Buscar cajas, camiones, operarios...</span>
          <span className="rounded-xl bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200">Ctrl K</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 xl:flex">
            <Clock className="h-4 w-4 text-slate-500" /> {nowText}
          </div>
          <div className={`hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 lg:flex ${supabaseOnline ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
            {supabaseOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {supabaseOnline ? "Online" : "Modo local"}
          </div>
          <button
            type="button"
            onClick={onOpenCommand}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 md:hidden"
          >
            🔍
          </button>
          <div className="hidden min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm lg:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-right">
              <div className="max-w-[190px] truncate text-sm font-black text-slate-950">{currentUser?.name || currentUser?.username || "Usuario"}</div>
              <div className="text-xs font-bold text-slate-500">{currentUser?.role || "Sin rol"}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
