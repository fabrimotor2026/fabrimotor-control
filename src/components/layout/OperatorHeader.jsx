import AppButton from "../ui/AppButton";
import { APP_VERSION } from "../../config/constants";

function roleLabel(role) {
  const labels = {
    admin: "Administrador",
    calidad: "Calidad",
    operario: "Operario",
    Administrador: "Administrador",
    Calidad: "Calidad",
    Operario: "Operario",
  };

  return labels[role] || role || "";
}

export default function OperatorHeader({
  currentUser,
  form,
  openLabelModal,
  openBoxLabelsModal,
  handleLogout,
}) {
  return (
        <div className="mx-auto mb-4 max-w-[1600px] px-3 pt-3 lg:px-4 lg:pt-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-stretch">
            <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-700">FM Control Operator · v{APP_VERSION}</div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-black leading-tight text-slate-950">Puesto de Trabajo</h1>
                  <p className="mt-1 text-lg font-black text-slate-800">Control de Proceso · F-1012 · Célula B</p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
                  <div className="text-sm font-black text-slate-950">{currentUser.name}</div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">{roleLabel(currentUser.role)} · Turno {form.turno}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <AppButton
                variant="primary"
                size="touch"
                onClick={() =>
                  openLabelModal({ reset: true })
                }
                className="flex-col"
              >
                <span className="text-2xl">🖨️</span>
                <span>Etiqueta</span>
              </AppButton>
              
              <AppButton
                variant="secondary"
                size="touch"
                onClick={openBoxLabelsModal}
                className="flex-col"
              >
                <span className="text-2xl">🚚</span>
                <span>Camión</span>
              </AppButton>
              
              <AppButton
                variant="dangerSoft"
                size="touch"
                onClick={handleLogout}
                className="flex-col"
              >
                <span className="text-2xl">🚪</span>
                <span>Salir</span>
              </AppButton>
            </div>
          </div>
        </div>
  );
}
