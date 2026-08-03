import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Printer,
  Settings,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Button } from "../ui/button";

export default function NavigationTabs({
  activeView,
  currentUser,
  isOperatorView,
  isVerificationUser,
  isAdminUser,
  onProduction,
  onHistory,
  onOpenLabel,
  onOpenBoxes,
  onOpenRejects,
  onOpenCpk,
  onOpenDashboard,
  onOpenConfig,
}) {
  const isAdmin = Boolean(isAdminUser?.(currentUser));
  const isVerification = Boolean(isVerificationUser?.(currentUser));

  const navigationItems = [
    {
      id: "production",
      label: "Producción",
      icon: ClipboardCheck,
      active: activeView === "nueva",
      onClick: onProduction,
      visible: true,
    },
    {
      id: "history",
      label: isOperatorView ? "Mi historial" : "Historial",
      icon: FileText,
      active: activeView === "historico",
      onClick: onHistory,
      visible: true,
    },
    {
      id: "labels",
      label: "Etiqueta",
      icon: Printer,
      active: false,
      onClick: onOpenLabel,
      visible: true,
    },
    {
      id: "boxes",
      label: "Camión",
      icon: Truck,
      active: false,
      onClick: onOpenBoxes,
      visible: true,
    },
    {
      id: "rejects",
      label: "Rechazos",
      icon: AlertTriangle,
      active: false,
      onClick: onOpenRejects,
      visible: !isOperatorView,
      danger: true,
    },
    {
      id: "cpk",
      label: "CPK",
      icon: TrendingUp,
      active: false,
      onClick: onOpenCpk,
      visible: !isOperatorView || isVerification,
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: false,
      onClick: onOpenDashboard,
      visible: isAdmin,
    },
    {
      id: "config",
      label: "Configuración",
      icon: Settings,
      active: false,
      onClick: onOpenConfig,
      visible: isAdmin,
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <nav
        className="flex gap-2 overflow-x-auto"
        aria-label="Navegación principal"
      >
        {navigationItems
          .filter((item) => item.visible && item.onClick)
          .map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={item.onClick}
                aria-current={item.active ? "page" : undefined}
                className={[
                  "shrink-0 rounded-2xl px-4 py-5 font-black transition",
                  item.active
                    ? "bg-[#1f6f73] text-white shadow-sm hover:bg-[#195e62] hover:text-white"
                    : item.danger
                      ? "text-red-700 hover:bg-red-50 hover:text-red-800"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
      </nav>
    </div>
  );
}