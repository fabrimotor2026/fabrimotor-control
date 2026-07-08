import { APP_ENVIRONMENT, APP_VERSION } from "../config/constants";

export default function StatusBar({ activeModuleLabel = "Dashboard", supabaseOnline = false, nowText = "" }) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[8600] border-t border-slate-200 bg-white/97 px-4 py-2 text-xs font-black text-slate-600 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur lg:left-72">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-900">FM CONTROL v{APP_VERSION}</span>
        <span>{activeModuleLabel}</span>
        <span>{APP_ENVIRONMENT}</span>
        <span className={supabaseOnline ? "text-emerald-700" : "text-amber-700"}>{supabaseOnline ? "Online" : "Modo local"}</span>
        <span>{nowText}</span>
      </div>
    </footer>
  );
}
