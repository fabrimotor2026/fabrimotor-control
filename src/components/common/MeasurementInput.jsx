import FmInput from "../../components/ui/FmInput";

export default function MeasurementInput({
  item,
  value,
  onChange,
  comparatorOptions,
  rangeOptions,
}) {
  if (item.type !== "number") {
    return (
      <select
        className="input font-bold text-slate-900"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar lectura</option>
        <option value="OK">OK</option>
        <option value="NO OK">NO OK</option>
      </select>
    );
  }

  if (item.inputMode === "selectComparator") {
    return (
      <select
        className="input text-base font-bold text-slate-900"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar lectura</option>

        {comparatorOptions(
          item.selectMin || 20,
          item.selectMax || 80
        ).map((reading) => (
          <option key={reading} value={reading}>
            +{reading}
          </option>
        ))}
      </select>
    );
  }

  if (item.inputMode === "selectComparatorSigned") {
    return (
      <select
        className="input font-bold text-slate-900"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar lectura</option>

        {Array.from(
          {
            length:
              (item.selectStart || 20) -
              (item.selectEnd ?? -80) +
              1,
          },
          (_, index) => (item.selectStart || 20) - index
        ).map((reading) => (
          <option key={reading} value={reading}>
            {reading > 0 ? `+${reading}` : reading}
          </option>
        ))}
      </select>
    );
  }

  if (item.inputMode === "selectFixed") {
    return (
      <select
        className="input font-bold text-slate-900"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar lectura</option>

        {(item.fixedOptions || []).map((reading) => (
          <option key={reading} value={reading}>
            {reading}
          </option>
        ))}
      </select>
    );
  }

  if (item.inputMode === "selectRange") {
    return (
      <select
        className="input font-bold text-slate-900"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar lectura</option>

        {rangeOptions(
          item.rangeMin,
          item.rangeMax,
          item.rangeStep || 0.01
        ).map((reading) => (
          <option key={reading} value={reading.toFixed(2)}>
            {reading.toFixed(2)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <FmInput
      type="number"
      step="0.001"
      className="text-center text-lg font-black"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}