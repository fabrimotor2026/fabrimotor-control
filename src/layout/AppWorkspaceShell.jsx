import { useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import Workspace from "./Workspace";

const MODULE_LABELS = {
  dashboard: "Dashboard",
  production: "Producción",
  trucks: "Camiones",
  operators: "Operarios",
  statistics: "Estadísticas",
  labels: "Etiquetas",
  config: "Configuración",
};

export default function AppWorkspaceShell({
  activeModule = "dashboard",
  onNavigate,
  currentUser,
  supabaseOnline,
  now,
  onOpenCommand,
  onLogout,
  children,
}) {
  const nowText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now || new Date());
    } catch {
      return "";
    }
  }, [now]);

  const activeModuleLabel = MODULE_LABELS[activeModule] || "Workspace";

  return (
    <>
      <Sidebar
        activeModule={activeModule}
        onNavigate={onNavigate}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <Header
        activeModuleLabel={activeModuleLabel}
        currentUser={currentUser}
        supabaseOnline={supabaseOnline}
        nowText={nowText}
        onOpenCommand={onOpenCommand}
      />
      <Workspace>{children}</Workspace>
      <StatusBar activeModuleLabel={activeModuleLabel} supabaseOnline={supabaseOnline} nowText={nowText} />
    </>
  );
}
