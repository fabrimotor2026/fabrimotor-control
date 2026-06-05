import { X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "../ui/button";
import Field from "../common/Field";
import { MACHINES, MODAL_OVERLAY_STYLE, MODAL_PANEL_XL_STYLE } from "../../data/constants";

function calculateCpk(values, lsl, usl) {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  if (numericValues.length < 2) {
    return null;
  }

  const mean =
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;

  const variance =
    numericValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    (numericValues.length - 1);

  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return null;
  }

  const cpu = (usl - mean) / (3 * stdDev);
  const cpl = (mean - lsl) / (3 * stdDev);

  return {
    cpk: Math.min(cpu, cpl),
    cpu,
    cpl,
    mean,
    stdDev,
    count: numericValues.length,
  };
}

export default function CpkModal({
  records,
  onClose,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  turno,
  setTurno,
  operario,
  setOperario,
}) {
  const c30 = MACHINES["Torno Hyundai"].find((item) => item.id === "c30");
  const c40 = MACHINES["Torno Hyundai"].find((item) => item.id === "c40");

  const orderedRecords = [...records]
    .filter((record) => record.mediciones?.c30 || record.mediciones?.c40)
    .reverse();

  const chartData = orderedRecords.map((record, index) => ({
    registro: index + 1,
    fecha: record.fecha,
    hora: record.horaGuardado,
    pieza: record.numeroPieza,
    c30: record.mediciones?.c30 === undefined || record.mediciones?.c30 === "" ? null : Number(record.mediciones.c30),
    c40: record.mediciones?.c40 === undefined || record.mediciones?.c40 === "" ? null : Number(record.mediciones.c40),
  }));

  const c30Stats = calculateCpk(
    orderedRecords.map((record) => record.mediciones?.c30),
    c30.min,
    c30.max
  );

  const c40Stats = calculateCpk(
    orderedRecords.map((record) => record.mediciones?.c40),
    c40.min,
    c40.max
  );

  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_XL_STYLE}>
        <div className="flex items-center justify-between border-b border-slate-300 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Evolución y CPK · Cotas Nº30 y Nº40
            </h2>
            <p className="text-sm text-slate-500">
              Torno Hyundai · Lecturas de comparador entre +38 y +63
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Cerrar gráfico CPK"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto p-6">
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 text-sm font-bold text-emerald-800">
              Filtros CPK · {records.length} registros encontrados
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <Field label="Desde fecha">
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Field>

              <Field label="Hasta fecha">
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Field>

              <Field label="Turno">
                <select
                  className="input"
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
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
                  value={operario}
                  onChange={(e) => setOperario(e.target.value)}
                />
              </Field>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setTurno("");
                    setOperario("");
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CpkCard title="Cota Nº30" stats={c30Stats} lsl={c30.min} usl={c30.max} />
            <CpkCard title="Cota Nº40" stats={c40Stats} lsl={c40.min} usl={c40.max} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Gráfico de evolución
                </h3>
                <p className="text-sm text-slate-500">
                  Líneas rojas: límites +38 y +63.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {chartData.length} registros
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No hay registros de las cotas Nº30 y Nº40 para calcular el CPK.
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="registro" label={{ value: "Registro", position: "insideBottom", offset: -10 }} />
                    <YAxis domain={[30, 70]} label={{ value: "Valor comparador", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      formatter={(value, name) => [value, name === "c30" ? "Cota Nº30" : "Cota Nº40"]}
                      labelFormatter={(label) => {
                        const row = chartData[label - 1];
                        return row ? `Registro ${label} · Pieza ${row.pieza || ""} · ${row.fecha || ""} ${row.hora || ""}` : `Registro ${label}`;
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={38} stroke="red" strokeDasharray="5 5" label="LSL +38" />
                    <ReferenceLine y={63} stroke="red" strokeDasharray="5 5" label="USL +63" />
                    <Line type="monotone" dataKey="c30" name="Cota Nº30" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="c40" name="Cota Nº40" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CpkCard({ title, stats, lsl, usl }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          Límites: +{lsl} / +{usl}
        </span>
      </div>

      {!stats ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          No hay datos suficientes para calcular CPK. Se necesitan al menos 2 registros con variación.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="CPK" value={stats.cpk.toFixed(3)} highlight />
          <Metric label="Registros" value={stats.count} />
          <Metric label="Media" value={stats.mean.toFixed(3)} />
          <Metric label="Desv. típica" value={stats.stdDev.toFixed(3)} />
          <Metric label="CPU" value={stats.cpu.toFixed(3)} />
          <Metric label="CPL" value={stats.cpl.toFixed(3)} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-emerald-100" : "bg-white"}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

