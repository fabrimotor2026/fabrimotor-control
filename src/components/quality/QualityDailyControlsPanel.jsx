import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QUALITY_DAILY_CONTROL_DEFINITIONS,
  QUALITY_DAILY_CONTROL_TABLE,
  QUALITY_DAILY_MACHINE,
  QUALITY_DAILY_REFERENCES,
  calculateQualityDailyResult,
  fetchLatestQualityDailyControls,
  fetchQualityDailyControls,
  saveQualityDailyControl,
} from "../../services/qualityDailyControlService";

function localToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function displayDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  return year && month && day
    ? `${day}/${month}/${year}`
    : value;
}

function displayTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
}

function emptyDrafts() {
  return Object.fromEntries(
    QUALITY_DAILY_CONTROL_DEFINITIONS.map((control) => [
      control.id,
      { value: "", notes: "" },
    ])
  );
}

function statusClasses(result) {
  if (result === "OK") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-800",
      label: "OK",
    };
  }

  if (result === "NO OK") {
    return {
      card: "border-red-200 bg-red-50",
      badge: "bg-red-100 text-red-800",
      label: "NO OK",
    };
  }

  return {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-900",
    label: "PENDIENTE",
  };
}

export default function QualityDailyControlsPanel({
  currentUser,
  supabase,
  isSupabaseConfigured,
}) {
  const [reference, setReference] = useState("F-1013");
  const [measurementDate, setMeasurementDate] =
    useState(localToday);
  const [records, setRecords] = useState({});
  const [latestRecords, setLatestRecords] = useState({});
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = ["Calidad", "Administrador"].includes(
    currentUser?.role
  );

  const loadControls = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setLoading(true);
    setError("");

    try {
      const [dailyRows, latestByControl] = await Promise.all([
        fetchQualityDailyControls(supabase, {
          reference,
          machine: QUALITY_DAILY_MACHINE,
          measurementDate,
        }),
        fetchLatestQualityDailyControls(supabase, {
          reference,
          machine: QUALITY_DAILY_MACHINE,
        }),
      ]);

      const recordsByControl = Object.fromEntries(
        dailyRows.map((row) => [row.controlId, row])
      );

      setRecords(recordsByControl);
      setLatestRecords(latestByControl);
      setDrafts(
        Object.fromEntries(
          QUALITY_DAILY_CONTROL_DEFINITIONS.map((control) => {
            const row = recordsByControl[control.id];
            return [
              control.id,
              {
                value:
                  row?.value === undefined ||
                  row?.value === null
                    ? ""
                    : String(row.value),
                notes: row?.notes || "",
              },
            ];
          })
        )
      );
    } catch (loadError) {
      setError(
        loadError?.message ||
          "No se han podido cargar los controles diarios."
      );
    } finally {
      setLoading(false);
    }
  }, [
    isSupabaseConfigured,
    measurementDate,
    reference,
    supabase,
  ]);

  useEffect(() => {
    loadControls();
  }, [loadControls]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase?.channel) return undefined;

    const channel = supabase
      .channel(
        `quality-daily-${reference}-${measurementDate}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: QUALITY_DAILY_CONTROL_TABLE,
        },
        (payload) => {
          const row = payload?.new || payload?.old || {};
          if (
            row.reference === reference &&
            row.machine === QUALITY_DAILY_MACHINE
          ) {
            loadControls();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel?.(channel);
    };
  }, [
    isSupabaseConfigured,
    loadControls,
    measurementDate,
    reference,
    supabase,
  ]);

  const completedCount = useMemo(
    () =>
      QUALITY_DAILY_CONTROL_DEFINITIONS.filter(
        (control) => Boolean(records[control.id])
      ).length,
    [records]
  );

  const saveControl = async (controlId) => {
    if (!canEdit) {
      setError(
        "Solo Calidad o Administrador pueden registrar estos controles."
      );
      return;
    }

    setSavingId(controlId);
    setError("");
    setMessage("");

    try {
      const saved = await saveQualityDailyControl(supabase, {
        reference,
        machine: QUALITY_DAILY_MACHINE,
        controlId,
        measurementDate,
        value: drafts[controlId]?.value,
        notes: drafts[controlId]?.notes,
        currentUser,
      });

      setRecords((previous) => ({
        ...previous,
        [controlId]: saved,
      }));
      setLatestRecords((previous) => ({
        ...previous,
        [controlId]: saved,
      }));
      setMessage(
        `${saved.controlId.toUpperCase()} guardado: ${saved.result}.`
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
          "No se ha podido guardar el control diario."
      );
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-blue-200 bg-white shadow-lg">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-blue-950 px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Calidad · V2.43
            </div>
            <h2 className="mt-1 text-2xl font-black">
              Controles diarios de rugosidad
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              Área de registro exclusiva para Calidad: Nº120 y Nº280.
            </p>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
            {completedCount}/2 realizados
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 lg:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
              Referencia
            </span>
            <select
              className="input font-black"
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setMessage("");
              }}
            >
              {QUALITY_DAILY_REFERENCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
              Máquina
            </span>
            <input
              className="input bg-slate-100 font-bold text-slate-700"
              value={QUALITY_DAILY_MACHINE}
              readOnly
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
              Fecha del control
            </span>
            <input
              type="date"
              className="input font-bold"
              value={measurementDate}
              onChange={(event) => {
                setMeasurementDate(event.target.value);
                setMessage("");
              }}
            />
          </label>
        </div>

        {!isSupabaseConfigured && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            Supabase no está conectado. Conecta la aplicación para
            registrar los controles diarios.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-8 text-center font-bold text-slate-500">
            Cargando controles diarios…
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {QUALITY_DAILY_CONTROL_DEFINITIONS.map((control) => {
              const record = records[control.id];
              const draft = drafts[control.id] || {
                value: "",
                notes: "",
              };
              const preview = calculateQualityDailyResult(
                control.id,
                draft.value
              );
              const result = record
                ? record.result
                : preview.valid
                  ? preview.result
                  : "PENDING";
              const appearance = statusClasses(result);
              const latest = latestRecords[control.id];

              return (
                <article
                  key={control.id}
                  className={`rounded-3xl border p-5 ${appearance.card}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                        {control.number} · {control.id.toUpperCase()}
                      </div>
                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        {control.label}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        Valor válido: 0 a {String(control.maximum).replace(".", ",")} {control.unit}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${appearance.badge}`}
                    >
                      {appearance.label}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <label>
                      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
                        Lectura ({control.unit})
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="input text-lg font-black"
                        value={draft.value}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [control.id]: {
                              ...previous[control.id],
                              value: event.target.value,
                            },
                          }))
                        }
                        placeholder="0,00"
                        disabled={!canEdit}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => saveControl(control.id)}
                      disabled={
                        !canEdit ||
                        !isSupabaseConfigured ||
                        savingId === control.id
                      }
                      className="self-end rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {savingId === control.id
                        ? "Guardando…"
                        : record
                          ? "Actualizar"
                          : "Guardar"}
                    </button>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
                      Observaciones
                    </span>
                    <input
                      className="input"
                      value={draft.notes}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [control.id]: {
                            ...previous[control.id],
                            notes: event.target.value,
                          },
                        }))
                      }
                      placeholder="Opcional"
                      disabled={!canEdit}
                    />
                  </label>

                  <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 p-3 text-xs font-semibold text-slate-600">
                    {record ? (
                      <>
                        Registrado por{" "}
                        <strong className="text-slate-900">
                          {record.recordedByName ||
                            record.recordedBy}
                        </strong>{" "}
                        el {displayDate(record.measurementDate)}
                        {displayTime(record.recordedAt)
                          ? ` a las ${displayTime(record.recordedAt)}`
                          : ""}
                        .
                      </>
                    ) : latest ? (
                      <>
                        Último registro:{" "}
                        <strong className="text-slate-900">
                          {latest.result} · {latest.value} {control.unit}
                        </strong>{" "}
                        el {displayDate(latest.measurementDate)}.
                      </>
                    ) : (
                      "Todavía no existe ningún registro para este control y referencia."
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
