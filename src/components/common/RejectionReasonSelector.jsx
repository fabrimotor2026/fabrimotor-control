import { REJECTION_REASONS } from "../../data/constants";

export default function RejectionReasonSelector({ check, value, onChange }) {
  return (
    <div className="mt-3 rounded-2xl border border-red-300 bg-red-50 p-3">
      <div className="mb-2 text-sm font-bold text-red-800">
        Motivo del rechazo para esta cota *
      </div>

      <select
        className="input border-red-300 bg-white"
        value={value.tipo || ""}
        onChange={(e) =>
          onChange({
            ...value,
            control: check.control,
            tipo: e.target.value,
            detalle: e.target.value === "Otro" ? value.detalle || "" : "",
          })
        }
      >
        <option value="">Seleccionar motivo</option>
        {REJECTION_REASONS.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </select>

      {value.tipo === "Otro" && (
        <textarea
          className="input mt-2 min-h-[70px] border-red-300 bg-white"
          placeholder="Describe el motivo del rechazo..."
          value={value.detalle || ""}
          onChange={(e) =>
            onChange({
              ...value,
              control: check.control,
              detalle: e.target.value,
            })
          }
        />
      )}
    </div>
  );
}