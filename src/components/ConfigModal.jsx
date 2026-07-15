export default function ConfigModal({
  appConfig,
  configForm,
  setConfigForm,
  updateAppSetting,
  supabase,
  currentUser,
  setAppConfig,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">
            Configuración {appConfig.reference}
          </h2>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
          >
            Cerrar
          </button>
        </div>

        <div className="grid gap-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-lg font-black text-slate-800">General</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="Referencia"
                value={configForm.reference}
                onChange={(e) =>
                  setConfigForm({ ...configForm, reference: e.target.value })
                }
              />

              <input
                className="input"
                placeholder="Célula"
                value={configForm.cell}
                onChange={(e) =>
                  setConfigForm({ ...configForm, cell: e.target.value })
                }
              />

              <input
                className="input md:col-span-2"
                placeholder="Código pieza / plano"
                value={configForm.partCode}
                onChange={(e) =>
                  setConfigForm({ ...configForm, partCode: e.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-3 text-lg font-black text-blue-900">Etiqueta</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="Prefijo cajas"
                value={configForm.boxPrefix}
                onChange={(e) =>
                  setConfigForm({ ...configForm, boxPrefix: e.target.value })
                }
              />

              <input
                className="input"
                type="number"
                placeholder="Piezas por caja"
                value={configForm.piecesPerBox}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    piecesPerBox: Number(e.target.value || 0),
                  })
                }
              />

              <input
                className="input md:col-span-2"
                placeholder="Texto etiqueta"
                value={configForm.threadText}
                onChange={(e) =>
                  setConfigForm({ ...configForm, threadText: e.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="mb-3 text-lg font-black text-emerald-900">
              Expedición
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="input"
                type="number"
                placeholder="Cajas por camión"
                value={configForm.boxesPerTruck}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    boxesPerTruck: Number(e.target.value || 0),
                  })
                }
              />
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            const confirmed = window.confirm(
              "¿Guardar cambios de configuración?\n\nEstos cambios afectarán a la aplicación."
            );

            if (!confirmed) return;

            try {
              await updateAppSetting(
                supabase,
                "f1012_config",
                configForm,
                currentUser
                  ? `${currentUser.username} - ${currentUser.name}`
                  : ""
              );

              setAppConfig(configForm);
              onClose();
              alert("Configuración guardada correctamente.");
            } catch (error) {
              console.error("Error guardando configuración:", error);
              alert("No se ha podido guardar la configuración.");
            }
          }}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 font-black text-white"
        >
          Guardar configuración
        </button>
      </div>
    </div>
  );
}