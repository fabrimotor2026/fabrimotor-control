import { useState } from "react";

function FieldLabel({ children }) {
  return (
    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
      {children}
    </span>
  );
}

function NumberField({ label, value, onChange, min = 1 }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default function ConfigModal({
  appConfig,
  configForm,
  setConfigForm,
  updateAppSetting,
  supabase,
  currentUser,
  setAppConfig,
  referenceOptions = [],
  onReferenceChange,
  onSaveReferenceConfig,
  referenceCounter = {},
  setReferenceCounter,
  referenceCounterLoading = false,
  referenceCounterError = "",
  onClose,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reference =
    configForm?.reference || appConfig?.reference || "F-1012";
  const defaultBoxPrefix =
    reference === "F-1013" ? "FA-26" : "FB-26";

  const updateField = (field, value) => {
    setConfigForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleReferenceChange = async (event) => {
    const nextReference = event.target.value;
    setError("");

    if (onReferenceChange) {
      await onReferenceChange(nextReference);
      return;
    }

    updateField("reference", nextReference);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const normalizedConfig = {
        ...configForm,
        reference,
        boxPrefix:
          reference === "F-1013" &&
          (!configForm?.boxPrefix ||
            String(configForm.boxPrefix).trim().toUpperCase() ===
              "FB-26")
            ? "FA-26"
            : String(
                configForm?.boxPrefix || defaultBoxPrefix
              ).trim(),
        piecesPerBox: Math.max(
          1,
          Number(configForm?.piecesPerBox || 1)
        ),
        boxesPerTruck: Math.max(
          1,
          Number(configForm?.boxesPerTruck || 1)
        ),
      };
      const nextBoxNumber = Number(referenceCounter?.nextNumber);

      if (!Number.isInteger(nextBoxNumber) || nextBoxNumber < 1) {
        throw new Error(
          "Indica un siguiente número de caja válido, mayor que cero."
        );
      }

      const counterChanged =
        Number(referenceCounter?.savedNextNumber) !== nextBoxNumber;

      if (
        counterChanged &&
        !window.confirm(
          `La próxima etiqueta de ${reference.replace("-", "")} será ` +
            `${normalizedConfig.boxPrefix}-${String(nextBoxNumber).padStart(5, "0")}.\n\n` +
            "¿Confirmas el cambio del contador?"
        )
      ) {
        return;
      }

      if (onSaveReferenceConfig) {
        await onSaveReferenceConfig(normalizedConfig, {
          nextBoxNumber,
          counterChanged,
        });
      } else {
        const actor = currentUser
          ? `${currentUser.username} - ${currentUser.name}`
          : "Sistema";

        await updateAppSetting(
          supabase,
          "f1012_config",
          normalizedConfig,
          actor
        );
        setAppConfig(normalizedConfig);
      }

      window.alert(
        `Configuración ${reference.replace("-", "")} guardada correctamente.`
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError?.message ||
          "No se ha podido guardar la configuración."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={handleSave}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              FM Control · Configuración
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Configuración {reference}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cada referencia conserva sus propios parámetros.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-lg font-black text-slate-800">General</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Referencia</FieldLabel>
              <select
                value={reference}
                onChange={handleReferenceChange}
                className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {(referenceOptions.length
                  ? referenceOptions
                  : [
                      { value: "F-1012", label: "F-1012" },
                      { value: "F-1013", label: "F-1013" },
                    ]
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <FieldLabel>Célula</FieldLabel>
              <input
                value={configForm?.cell || ""}
                onChange={(event) =>
                  updateField("cell", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <FieldLabel>Código de pieza</FieldLabel>
            <input
              value={configForm?.partCode || ""}
              onChange={(event) =>
                updateField("partCode", event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </section>

        <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-lg font-black text-blue-950">Etiqueta</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Prefijo de caja</FieldLabel>
              <input
                value={configForm?.boxPrefix || ""}
                onChange={(event) =>
                  updateField("boxPrefix", event.target.value)
                }
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <NumberField
              label="Piezas por caja"
              value={configForm?.piecesPerBox ?? 16}
              onChange={(value) => updateField("piecesPerBox", value)}
            />
          </div>

          <label className="mt-4 block">
            <FieldLabel>Descripción de rosca</FieldLabel>
            <input
              value={configForm?.threadText || ""}
              onChange={(event) =>
                updateField("threadText", event.target.value)
              }
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <p className="mt-3 text-xs font-bold text-blue-800">
            F1012 utiliza el prefijo FB-26 y F1013 utiliza FA-26.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-lg font-black text-emerald-950">
            Expedición
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Cajas de esta referencia por camión"
              value={configForm?.boxesPerTruck ?? 49}
              onChange={(value) => updateField("boxesPerTruck", value)}
            />

            <label className="block">
              <FieldLabel>Siguiente número de caja</FieldLabel>
              <input
                type="number"
                min="1"
                step="1"
                value={referenceCounter?.nextNumber ?? ""}
                disabled={referenceCounterLoading}
                onChange={(event) =>
                  setReferenceCounter?.((previous) => ({
                    ...previous,
                    reference,
                    nextNumber: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-base font-black text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-slate-100"
              />
              <span className="mt-2 block text-xs font-bold text-emerald-800">
                {referenceCounterLoading
                  ? "Consultando el contador…"
                  : referenceCounter?.nextNumber
                    ? `Próxima etiqueta: ${configForm?.boxPrefix || defaultBoxPrefix}-${String(
                        referenceCounter.nextNumber
                      ).padStart(5, "0")}`
                    : "Contador no disponible"}
              </span>
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
            El contador es independiente para F1012 y F1013. Modifícalo
            únicamente para corregir o adelantar la numeración; el valor
            indicado será el de la próxima etiqueta.
          </div>

          {referenceCounterError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {referenceCounterError}
            </div>
          )}
        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || referenceCounterLoading}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-base font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {referenceCounterLoading
            ? "Consultando contador…"
            : saving
            ? "Guardando…"
            : `Guardar configuración ${reference.replace("-", "")}`}
        </button>
      </form>
    </div>
  );
}
