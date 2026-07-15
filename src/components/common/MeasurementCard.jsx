import { memo } from "react";
import FmBadge from "../../components/ui/FmBadge";
import FmButton from "../../components/ui/FmButton";
import FmCard from "../../components/ui/FmCard";
import MeasurementInput from "./MeasurementInput";

function getMeasurementTitle(item) {
  const titles = {
    c30: (
      <>
        Nº30 · Ø82 (A) · Valor comparador{" "}
        <span className="font-bold text-red-600">[F2]</span>
      </>
    ),
    c40: (
      <>
        Nº40 · Ø82 (B) · Valor comparador{" "}
        <span className="font-bold text-red-600">[F2]</span>
      </>
    ),
    c50: (
      <>
        Nº50 · Ø82 · Valor comparador{" "}
        <span className="font-bold text-red-600">[F1]</span>
      </>
    ),
    c170: (
      <>
        Nº170 · Rosca M72x1,5 6g{" "}
        <span className="font-bold text-red-600">[F8]</span>
      </>
    ),
    c160: (
      <>
        Nº160 · Ø60{" "}
        <span className="font-bold text-red-600">[S6]</span>
      </>
    ),
    c320: (
      <>
        Nº320 · Ø17 +0,043/+0{" "}
        <span className="font-bold text-red-600">[F5]</span>
      </>
    ),
    c60neway: (
      <>
        Nº60 · Anillo comprobación{" "}
        <span className="font-bold text-red-600">[F2]</span>
      </>
    ),
    c60: (
      <>
        Nº60 · Ø 82 -0,035 / -0,060 (A) (B){" "}
        <span className="font-bold text-red-600">[F2]</span>
        {" · Anillo comprobación [PT085]"}
      </>
    ),
  };

  return titles[item.id] || item.control;
}

function MeasurementCard({
  item,
  values,
  setValues,
  form,
  setVisualHelpItem,
  comparatorOptions,
  rangeOptions,
  RejectionReasonSelector,
}) {

  const updateValue = (value) => {
  setValues({
    ...values,
    [item.id]: value,
  });
};

const hasValue =
  item.value !== undefined &&
  item.value !== "";

const cardTone = !hasValue
  ? "border-l-slate-300 bg-white"
  : item.ok
  ? "border-l-emerald-500 bg-emerald-50"
  : "border-l-red-500 bg-red-50";

  return (
    <FmCard
      className={`border-l-4 p-4 ${cardTone}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900">
            {getMeasurementTitle(item)}
          </div>

          {item.frecuencia && (
            <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-base font-bold leading-relaxed text-blue-900">
              <div className="mb-1 text-xs font-black uppercase tracking-wide text-blue-700">
                Frecuencia de control
              </div>

              <div>{item.frecuencia}</div>
            </div>
          )}
        </div>

        {hasValue && (
          <FmBadge color={item.ok ? "green" : "red"}>
            {item.ok ? "OK" : "NO OK"}
          </FmBadge>
        )}
      </div>

      <div className="mb-3">
        <FmButton
          variant="secondary"
          onClick={() =>
            setVisualHelpItem({
              ...item,
              maquina: form.maquina,
            })
          }
        >
          Ayuda visual
        </FmButton>
      </div>

      <MeasurementInput
        item={item}
        value={values[item.id] || ""}
        onChange={updateValue}
        comparatorOptions={comparatorOptions}
        rangeOptions={rangeOptions}
      />

      {!item.ok && hasValue && (
          <RejectionReasonSelector
            check={item}
            value={values.rechazoMotivos?.[item.id] || {}}
            onChange={(reason) =>
              setValues({
                ...values,
                rechazoMotivos: {
                  ...(values.rechazoMotivos || {}),
                  [item.id]: {
                    control: item.control,
                    ...reason,
                  },
                },
              })
            }
          />
        )}
    </FmCard>
  );
}

export default memo(MeasurementCard);