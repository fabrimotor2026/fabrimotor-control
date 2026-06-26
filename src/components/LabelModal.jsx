export default function LabelModal({
  labelForm,
  setLabelForm,
  totalCaja,
  numeroSemana,
  numeroDia,
  printBoxLabel,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">
            Etiqueta Caja F-1012
          </h2>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2"
          >
            Cerrar
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="input"
            placeholder="FAB. 1"
            value={labelForm.fab1}
            onChange={(e) =>
              setLabelForm({
                ...labelForm,
                fab1: e.target.value,
              })
            }
          />

          <input
            className="input"
            placeholder="COL. 1"
            value={labelForm.col1}
            onChange={(e) =>
              setLabelForm({
                ...labelForm,
                col1: e.target.value,
              })
            }
          />

          <input
            className="input"
            placeholder="CANT. 1"
            value={labelForm.cant1}
            onChange={(e) =>
              setLabelForm({
                ...labelForm,
                cant1: e.target.value,
              })
            }
          />

          <input
            className="input"
            placeholder="FAB. 2"
            value={labelForm.fab2}
            onChange={(e) =>
              setLabelForm({
                ...labelForm,
                fab2: e.target.value,
              })
            }
          />

          <input
            className="input"
            placeholder="COL. 2"
            value={labelForm.col2}
            onChange={(e) =>
              setLabelForm({
                ...labelForm,
                col2: e.target.value,
              })
            }
          />

          <input
            className="input"
            placeholder="CANT. 2"
            value={labelForm.cant2}
            onChange={(e) =>
              setLabelForm({
                ...labelForm,
                cant2: e.target.value,
              })
            }
          />
        </div>

        <div className="mt-6 rounded-2xl border p-4 text-center">
          <div className="text-sm font-bold">
            Nº PIEZAS TOTAL
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-100 p-4 text-center">
              <div className="text-sm font-bold">SEMANA</div>
              <div className="text-3xl font-black">{numeroSemana}</div>
            </div>

            <div className="rounded-xl bg-slate-100 p-4 text-center">
              <div className="text-sm font-bold">DÍA</div>
              <div className="text-3xl font-black">{numeroDia}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="input"
              placeholder="Operario 1 (4 cifras)"
              value={labelForm.operario1}
              maxLength={4}
              onChange={(e) =>
                setLabelForm({
                  ...labelForm,
                  operario1: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Operario 2 (opcional)"
              value={labelForm.operario2}
              maxLength={4}
              onChange={(e) =>
                setLabelForm({
                  ...labelForm,
                  operario2: e.target.value,
                })
              }
            />
          </div>

          <div className="mt-4">
            <input
              className="input bg-slate-100 font-black text-slate-900"
              placeholder="Número de caja (5 cifras)"
              value={labelForm.numeroCaja}
              maxLength={5}
              readOnly
            />
          </div>

          <div
            className={`text-4xl font-black ${
              totalCaja === 16
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {totalCaja}
          </div>

          {totalCaja !== 16 && (
            <div className="mt-2 text-red-600">
              La suma debe ser exactamente 16 piezas
            </div>
          )}

          <div className="mt-6 scale-75 origin-top rounded-2xl border-4 border-black bg-white p-4 text-black">
            <div className="grid grid-cols-2 border-b-4 border-black pb-3">
              <div className="text-5xl font-black">F-1012</div>
              <div className="text-right text-5xl font-black">1025980 Ⓢ</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-3xl font-black">
              <div>FAB. {labelForm.fab1 || "-"}</div>
              <div>COL. {labelForm.col1 || "-"}</div>
              <div>CANT. {labelForm.cant1 || "-"}</div>

              <div>FAB. {labelForm.fab2 || "-"}</div>
              <div>COL. {labelForm.col2 || "-"}</div>
              <div>CANT. {labelForm.cant2 || "-"}</div>
            </div>

            <div className="mt-4 border-y-4 border-black py-3 text-center text-4xl font-black">
              Nº DE PIEZAS TOTAL: {totalCaja}
            </div>

            <div className="mt-4 text-3xl font-black">
              Nº OPERARIO: {labelForm.operario1 || "____"}
              {labelForm.operario2 ? ` / ${labelForm.operario2}` : ""}
            </div>

            <div className="mt-4 grid grid-cols-2 text-center text-3xl font-black">
              <div>SEMANA: {numeroSemana}</div>
              <div>DIA: {numeroDia}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 border-y-4 border-black py-3 text-4xl font-black">
              <div>Nº Caja FB-26</div>
              <div className="text-right">{labelForm.numeroCaja || "00000"}</div>
            </div>

            <div className="mt-5 text-center text-5xl font-black">
              ROSCA DERECHA
            </div>
          </div>

          <button
            onClick={printBoxLabel}
            disabled={totalCaja !== 16}
            className={`mt-4 w-full rounded-2xl px-4 py-4 text-lg font-black text-white ${
              totalCaja === 16 ? "bg-green-600" : "bg-slate-400"
            }`}
          >
            Generar PDF etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}