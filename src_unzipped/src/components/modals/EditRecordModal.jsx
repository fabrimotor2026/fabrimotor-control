import { X, Save } from "lucide-react";
import { Button } from "../ui/button";
import Field from "../common/Field";
import { MACHINES, MODAL_OVERLAY_STYLE, MODAL_PANEL_LG_STYLE } from "../../data/constants";

export default function EditRecordModal({
  editForm,
  setEditForm,
  editValues,
  setEditValues,
  onSave,
  onClose,
}) {
  const checks = MACHINES[editForm.maquina] || [];

  const isCheckOk = (check) => {
    const value = editValues[check.id];

    if (value === undefined || value === null || value === "") return false;

    if (check.type === "number") {
      const numeric = Number(value);
      return !Number.isNaN(numeric) && numeric >= check.min && numeric <= check.max;
    }

    if (check.type === "oknok") {
      return value === "OK";
    }

    return false;
  };

  const calculateEditedResult = () => {
    const checksOk = checks.every((check) => isCheckOk(check));
    const controlTurnoOk =
      editForm.maquina !== "Torno Hyundai" || editValues?.controlTurno === "OK";

    return checksOk && controlTurnoOk ? "OK" : "NO OK";
  };

  const editedResult = calculateEditedResult();

  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_LG_STYLE}>
        <div className="flex items-center justify-between border-b border-slate-300 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Editar verificación
            </h2>
            <p className="text-sm text-slate-500">
              Modifica los datos guardados y pulsa Guardar cambios.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Cerrar edición"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Máquina">
              <select
                className="input"
                value={editForm.maquina}
                onChange={(e) => {
                  setEditForm({ ...editForm, maquina: e.target.value });
                  setEditValues({});
                }}
              >
                {Object.keys(MACHINES).map((machine) => (
                  <option key={machine} value={machine}>
                    {machine}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha">
              <input
                type="date"
                className="input"
                value={editForm.fecha}
                onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
              />
            </Field>

            <Field label="Turno">
              <select
                className="input"
                value={editForm.turno}
                onChange={(e) => setEditForm({ ...editForm, turno: e.target.value })}
              >
                <option value="M">M (Mañana)</option>
                <option value="T">T (Tarde)</option>
                <option value="N">N (Noche)</option>
              </select>
            </Field>

            <Field label="Operario">
              <input
                className="input"
                value={editForm.operario || ""}
                onChange={(e) => setEditForm({ ...editForm, operario: e.target.value })}
              />
            </Field>

            <Field label="Número de pieza">
              <input
                className="input"
                value={editForm.numeroPieza || ""}
                onChange={(e) => setEditForm({ ...editForm, numeroPieza: e.target.value })}
              />
            </Field>

            {editForm.maquina === "Torno Hyundai" && (
              <Field label="Control Ecoroll / Refrigerante">
                <select
                  className="input"
                  value={editValues.controlTurno || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, controlTurno: e.target.value })
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="OK">OK</option>
                  <option value="NO OK">NO OK</option>
                </select>
              </Field>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((check) => {
              const ok = isCheckOk(check);
              const value = editValues[check.id] || "";

              return (
                <div
                  key={check.id}
                  className={`rounded-2xl border p-3 ${
                    value === ""
                      ? "border-slate-200 bg-white"
                      : ok
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="mb-2 font-semibold text-slate-900">
                    {check.control}
                  </div>

                  {check.type === "number" ? (
                    <input
                      type="number"
                      step="0.001"
                      className="input"
                      value={value}
                      onChange={(e) =>
                        setEditValues({ ...editValues, [check.id]: e.target.value })
                      }
                    />
                  ) : (
                    <select
                      className="input"
                      value={value}
                      onChange={(e) =>
                        setEditValues({ ...editValues, [check.id]: e.target.value })
                      }
                    >
                      <option value="">Seleccionar</option>
                      <option value="OK">OK</option>
                      <option value="NO OK">NO OK</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {editedResult === "NO OK" && (
            <div className="mt-5">
              <Field label="Resumen general del rechazo (opcional)">
                <textarea
                  className="input min-h-[80px] border-red-300 bg-red-50"
                  placeholder="Describe el defecto que ha generado el rechazo..."
                  value={editForm.rechazoTipo || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rechazoTipo: e.target.value })
                  }
                />
              </Field>
            </div>
          )}

          <div className="mt-5">
            <Field label="Observaciones">
              <textarea
                className="input min-h-[100px]"
                value={editForm.observaciones || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, observaciones: e.target.value })
                }
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-300 p-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={onSave} className="rounded-xl">
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
