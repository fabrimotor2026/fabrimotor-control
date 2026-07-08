import { useEffect, useMemo, useState } from "react";

export default function LabelModal({
  labelForm,
  setLabelForm,
  totalCaja,
  numeroSemana,
  numeroDia,
  printBoxLabel,
  appConfig,
  operatorUsers = [],
  currentUser,
  onClose,
}) {
  const [showSecondOperator, setShowSecondOperator] = useState(
    !!labelForm.operario2
  );

  useEffect(() => {
    if (currentUser?.role === "Operario" && !labelForm.operario1) {
      setLabelForm((prev) => ({
        ...prev,
        operario1: currentUser.username,
      }));
    }
  }, [currentUser, labelForm.operario1, setLabelForm]);

  const operatorUsers2 = useMemo(
    () => operatorUsers.filter((user) => user.username !== labelForm.operario1),
    [operatorUsers, labelForm.operario1]
  );

  const isValidTotal = totalCaja === appConfig.piecesPerBox;

  const update = (field, value) => {
    setLabelForm({
      ...labelForm,
      [field]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex h-[92vh] w-[94vw] max-w-none flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              RC1-001 · Workspace sin scroll
            </div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              🖨 Nueva etiqueta · {appConfig.reference}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-2xl px-4 py-2 text-sm font-black ${
                isValidTotal
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {totalCaja} / {appConfig.piecesPerBox} piezas
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 p-5 xl:grid-cols-[1fr_1fr_1.25fr]">
          <section className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-sm font-black uppercase text-slate-500">
                Datos de caja
              </div>
              <div className="text-xl font-black text-slate-950">
                Fabricaciones y cantidades
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-xs font-black uppercase text-slate-500">
                  Línea 1
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    className="input"
                    placeholder="FAB. 1"
                    value={labelForm.fab1}
                    onChange={(e) => update("fab1", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="COL. 1"
                    value={labelForm.col1}
                    onChange={(e) => update("col1", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="CANT. 1"
                    value={labelForm.cant1}
                    onChange={(e) => update("cant1", e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-xs font-black uppercase text-slate-500">
                  Línea 2 opcional
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    className="input"
                    placeholder="FAB. 2"
                    value={labelForm.fab2}
                    onChange={(e) => update("fab2", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="COL. 2"
                    value={labelForm.col2}
                    onChange={(e) => update("col2", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="CANT. 2"
                    value={labelForm.cant2}
                    onChange={(e) => update("cant2", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <div className="text-xs font-black uppercase text-slate-300">
                  Total piezas
                </div>
                <div className="mt-1 text-5xl font-black">{totalCaja}</div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="text-xs font-black uppercase text-slate-500">
                  Nº caja
                </div>
                <input
                  className="input mt-2 bg-white font-black text-slate-900"
                  placeholder="Automático al imprimir"
                  value={labelForm.numeroCaja}
                  maxLength={5}
                  readOnly
                />
              </div>
            </div>

            {!isValidTotal && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                La suma debe ser exactamente {appConfig.piecesPerBox} piezas.
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-sm font-black uppercase text-slate-500">
                Producción
              </div>
              <div className="text-xl font-black text-slate-950">
                Operarios, semana y día
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-4 text-center">
                <div className="text-xs font-black uppercase text-blue-700">
                  Semana
                </div>
                <div className="mt-1 text-4xl font-black text-blue-950">
                  {numeroSemana}
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-50 p-4 text-center">
                <div className="text-xs font-black uppercase text-indigo-700">
                  Día
                </div>
                <div className="mt-1 text-4xl font-black text-indigo-950">
                  {numeroDia}
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                👤 Operario 1
              </span>
              <select
                className="input"
                value={labelForm.operario1}
                onChange={(e) => {
                  const nuevoOperario1 = e.target.value;
                  setLabelForm({
                    ...labelForm,
                    operario1: nuevoOperario1,
                    operario2:
                      labelForm.operario2 === nuevoOperario1
                        ? ""
                        : labelForm.operario2,
                  });
                }}
              >
                <option value="">Seleccionar operario</option>
                {operatorUsers.map((user) => (
                  <option key={user.username} value={user.username}>
                    {user.username} · {user.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4">
              {showSecondOperator ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">
                    👥 Operario 2 opcional
                  </span>
                  <select
                    className="input"
                    value={labelForm.operario2}
                    onChange={(e) => update("operario2", e.target.value)}
                  >
                    <option value="">Sin segundo operario</option>
                    {operatorUsers2.map((user) => (
                      <option key={user.username} value={user.username}>
                        {user.username} · {user.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100"
                    onClick={() => {
                      setShowSecondOperator(false);
                      update("operario2", "");
                    }}
                  >
                    Quitar segundo operario
                  </button>
                </label>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 font-black text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600"
                  onClick={() => setShowSecondOperator(true)}
                >
                  ➕ Añadir segundo operario
                </button>
              )}
            </div>

            <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-black uppercase text-slate-500">
                Estado de impresión
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {isValidTotal
                  ? "Lista para generar la etiqueta"
                  : "Pendiente de cuadrar cantidades"}
              </div>
              <button
                onClick={printBoxLabel}
                disabled={!isValidTotal}
                className={`mt-4 w-full rounded-2xl px-5 py-5 text-xl font-black text-white transition ${
                  isValidTotal
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-400"
                }`}
              >
                🖨 Generar PDF etiqueta
              </button>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-black uppercase text-slate-500">
                  Vista previa
                </div>
                <div className="text-xl font-black text-slate-950">
                  Etiqueta siempre visible
                </div>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600">
                {appConfig.boxPrefix || "Caja"}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl bg-white p-4">
              <div className="w-full max-w-[640px] rounded-2xl border-4 border-black bg-white p-4 text-black shadow-lg">
                <div className="grid grid-cols-2 border-b-4 border-black pb-3">
                  <div className="text-4xl font-black">{appConfig.reference}</div>
                  <div className="text-right text-4xl font-black">
                    {appConfig.partCode} Ⓢ
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-2xl font-black">
                  <div>FAB. {labelForm.fab1 || "-"}</div>
                  <div>COL. {labelForm.col1 || "-"}</div>
                  <div>CANT. {labelForm.cant1 || "-"}</div>
                  <div>FAB. {labelForm.fab2 || "-"}</div>
                  <div>COL. {labelForm.col2 || "-"}</div>
                  <div>CANT. {labelForm.cant2 || "-"}</div>
                </div>

                <div className="mt-4 border-y-4 border-black py-3 text-center text-3xl font-black">
                  Nº DE PIEZAS TOTAL: {totalCaja}
                </div>

                <div className="mt-4 text-2xl font-black">
                  Nº OPERARIO: {labelForm.operario1 || "____"}
                  {labelForm.operario2 ? ` / ${labelForm.operario2}` : ""}
                </div>

                <div className="mt-4 grid grid-cols-2 text-center text-2xl font-black">
                  <div>SEMANA: {numeroSemana}</div>
                  <div>DIA: {numeroDia}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 border-y-4 border-black py-3 text-3xl font-black">
                  <div>Nº Caja {appConfig.boxPrefix}</div>
                  <div className="text-right">{labelForm.numeroCaja || "00000"}</div>
                </div>

                <div className="mt-5 text-center text-4xl font-black">
                  {appConfig.threadText}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
