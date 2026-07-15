import { MACHINES } from "../../data/constants";
import { turnoLabel } from "../../utils/helpers";

export default function PdfMachineReport({
  title,
  machineName,
  records,
  buildReportSheetName,
}) {
  const checks = MACHINES[machineName] || [];

  const getMeasurementStatus = (check, value) => {
    if (value === undefined || value === null || value === "") {
      return "empty";
    }

    if (check.type === "number") {
      const numeric = Number(value);

      if (Number.isNaN(numeric)) return "nok";

      if (numeric < check.min || numeric > check.max) {
        return "nok";
      }

      const range = check.max - check.min;
      const warningMargin = range * 0.1;

      const nearLowerLimit = numeric <= check.min + warningMargin;
      const nearUpperLimit = numeric >= check.max - warningMargin;

      if (nearLowerLimit || nearUpperLimit) {
        return "warning";
      }

      return "ok";
    }

    if (check.type === "oknok") {
      return value === "OK" ? "ok" : "nok";
    }

    return "empty";
  };

  return (
    <section className="mb-8 rounded-xl border border-black bg-white p-4 print:rounded-none print:border print:p-2">
      <div className="mb-3 border border-black text-center">
        <div className="bg-slate-700 px-3 py-2 text-2xl font-black tracking-wide print:text-xl">
          {title}
        </div>

        <div className="border-t border-black px-3 py-1 text-sm font-semibold">
          Control proceso F-1012 · Célula B · Mediciones registradas
        </div>
      </div>

      {records.length === 0 ? (
        <div className="border border-black p-4 text-center text-slate-500">
          Sin registros para esta máquina.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-xs print:min-w-0 print:text-[9px]">
            <thead>
              <tr className="bg-slate-700">
                <th className="border border-black px-2 py-1">Fecha</th>
                <th className="border border-black px-2 py-1">Hora</th>
                <th className="border border-black px-2 py-1">Hoja</th>
                <th className="border border-black px-2 py-1">Turno</th>
                <th className="border border-black px-2 py-1">Operario</th>
                <th className="border border-black px-2 py-1">Nº pieza</th>

                {machineName === "Torno Hyundai" && (
                  <th className="border border-black px-2 py-1">
                    Ecoroll / refrigerante
                  </th>
                )}

                {checks.map((check) => (
                  <th
                    key={check.id}
                    className="border border-black px-2 py-1"
                  >
                    {check.control}
                  </th>
                ))}

                <th className="border border-black px-2 py-1">Resultado</th>
                <th className="border border-black px-2 py-1">
                  Tipo error rechazo
                </th>
                <th className="border border-black px-2 py-1">
                  Observaciones
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="border border-black px-2 py-1">
                    {record.fecha}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {record.horaGuardado}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {buildReportSheetName(record)}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {turnoLabel(record.turno)}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {record.operario}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {record.numeroPieza}
                  </td>

                  {machineName === "Torno Hyundai" && (
                    <td className="border border-black px-2 py-1">
                      {record.mediciones?.controlTurno || ""}
                    </td>
                  )}

                  {checks.map((check) => {
                    const value = record.mediciones?.[check.id] ?? "";
                    const status = getMeasurementStatus(check, value);

                    return (
                      <td
                        key={check.id}
                        className={`border border-black px-2 py-1 text-center font-semibold ${
                          status === "nok"
                            ? "bg-red-100 text-red-700"
                            : status === "warning"
                            ? "bg-yellow-200 text-black"
                            : status === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : ""
                        }`}
                      >
                        {value}
                      </td>
                    );
                  })}

                  <td
                    className={`border border-black px-2 py-1 text-center font-bold ${
                      record.resultado === "OK"
                        ? "text-emerald-300"
                        : "text-red-600"
                    }`}
                  >
                    {record.resultado}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {record.rechazoTipo || ""}
                  </td>

                  <td className="border border-black px-2 py-1">
                    {record.observaciones}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}