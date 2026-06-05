import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import Field from "../common/Field";
import { MACHINES, MODAL_OVERLAY_STYLE, MODAL_PANEL_XL_STYLE } from "../../data/constants";
import { turnoLabel } from "../../utils/helpers";

export default function RejectsModal({ records, getRejectedChecks, buildSheetName, onClose }) {
  const [rejectDateFrom, setRejectDateFrom] = useState("");
  const [rejectDateTo, setRejectDateTo] = useState("");
  const [rejectTurno, setRejectTurno] = useState("");
  const [rejectOperario, setRejectOperario] = useState("");
  const [rejectPieza, setRejectPieza] = useState("");
  const [rejectMaquina, setRejectMaquina] = useState("");

  const filteredRejects = records.filter((record) => {
    const matchFrom = !rejectDateFrom || record.fecha >= rejectDateFrom;
    const matchTo = !rejectDateTo || record.fecha <= rejectDateTo;
    const matchTurno = !rejectTurno || record.turno === rejectTurno;
    const matchOperario =
      !rejectOperario ||
      String(record.operario || "")
        .toLowerCase()
        .includes(rejectOperario.toLowerCase());
    const matchPieza =
      !rejectPieza ||
      String(record.numeroPieza || "")
        .toLowerCase()
        .includes(rejectPieza.toLowerCase());
    const matchMaquina = !rejectMaquina || record.maquina === rejectMaquina;

    return (
      matchFrom &&
      matchTo &&
      matchTurno &&
      matchOperario &&
      matchPieza &&
      matchMaquina
    );
  });
  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_XL_STYLE}>
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-red-700">
              Listado de piezas de rechazo
            </h2>
            <p className="text-sm text-red-600">
              Registros enviados automáticamente cuando alguna verificación es NO OK.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-red-100"
            aria-label="Cerrar listado de rechazo"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-red-800">
                  Filtro de rechazos
                </div>
                <div className="text-xs text-red-700">
                  {filteredRejects.length} piezas encontradas.
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setRejectDateFrom("");
                  setRejectDateTo("");
                  setRejectTurno("");
                  setRejectOperario("");
                  setRejectPieza("");
                  setRejectMaquina("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-6">
              <Field label="Desde fecha">
                <input
                  type="date"
                  className="input"
                  value={rejectDateFrom}
                  onChange={(e) => setRejectDateFrom(e.target.value)}
                />
              </Field>

              <Field label="Hasta fecha">
                <input
                  type="date"
                  className="input"
                  value={rejectDateTo}
                  onChange={(e) => setRejectDateTo(e.target.value)}
                />
              </Field>

              <Field label="Turno">
                <select
                  className="input"
                  value={rejectTurno}
                  onChange={(e) => setRejectTurno(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="M">M (Mañana)</option>
                  <option value="T">T (Tarde)</option>
                  <option value="N">N (Noche)</option>
                </select>
              </Field>

              <Field label="Nº Operario">
                <input
                  className="input"
                  placeholder="Ej. 105"
                  value={rejectOperario}
                  onChange={(e) => setRejectOperario(e.target.value)}
                />
              </Field>

              <Field label="Nº Pieza">
                <input
                  className="input"
                  placeholder="Ej. 64"
                  value={rejectPieza}
                  onChange={(e) => setRejectPieza(e.target.value)}
                />
              </Field>

              <Field label="Máquina">
                <select
                  className="input"
                  value={rejectMaquina}
                  onChange={(e) => setRejectMaquina(e.target.value)}
                >
                  <option value="">Todas</option>
                  {Object.keys(MACHINES).map((machine) => (
                    <option key={machine} value={machine}>
                      {machine}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {filteredRejects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              No hay piezas en rechazo para el filtro seleccionado.
            </div>
          ) : (
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="bg-red-100 text-red-900">
                  <th className="border border-red-200 px-3 py-2 text-left">Fecha</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Hora</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Máquina</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Hoja</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Turno</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Operario</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Nº pieza</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Cotas NO OK</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Tipo de error</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredRejects.map((record) => {
                  const rejectedChecks = typeof getRejectedChecks === "function" ? getRejectedChecks(record) : [];

                  return (
                    <tr key={record.id} className="border-t border-red-100">
                      <td className="border border-red-100 px-3 py-2">{record.fecha}</td>
                      <td className="border border-red-100 px-3 py-2">{record.horaGuardado}</td>
                      <td className="border border-red-100 px-3 py-2">{record.maquina}</td>
                      <td className="border border-red-100 px-3 py-2 text-xs">
                        {buildSheetName?.(record) || record.hojaNombre || ''}
                      </td>
                      <td className="border border-red-100 px-3 py-2">{turnoLabel(record.turno)}</td>
                      <td className="border border-red-100 px-3 py-2">{record.operario}</td>
                      <td className="border border-red-100 px-3 py-2 font-bold">
                        {record.numeroPieza}
                      </td>
                      <td className="border border-red-100 px-3 py-2">
                        {rejectedChecks.length === 0 ? (
                          <span className="font-semibold text-red-700">Resultado NO OK</span>
                        ) : (
                          <div className="space-y-1">
                            {rejectedChecks.map((item, index) => (
                              <div
                                key={`${record.id}-${index}`}
                                className="rounded-lg bg-red-50 px-2 py-1 text-red-800"
                              >
                                <strong>{item.control}</strong>: {item.value}
                                {item.reason && (
                                  <span className="ml-2 font-semibold">
                                    · Motivo: {item.reason}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border border-red-100 px-3 py-2 font-semibold text-red-800">
                        {record.rechazoTipo || "Sin describir"}
                      </td>
                      <td className="border border-red-100 px-3 py-2">{record.observaciones}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 p-4">
          <Button onClick={onClose} className="rounded-xl">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

