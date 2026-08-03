import { Search, RotateCcw } from "lucide-react";
import FmButton from "../../../components/ui/FmButton";
import FmInput from "../../../components/ui/FmInput";

const EMPTY_FORM = {
  boxNumber: "",
  pieceNumber: "",
  workOrder: "",
  lot: "",
  reference: "",
  operator: "",
  truckNumber: "",
};

export function createEmptyTraceabilitySearch() {
  return { ...EMPTY_FORM };
}

export default function TraceabilitySearch({
  value,
  onChange,
  onSubmit,
  onReset,
  loading = false,
}) {
  const setField = (field, fieldValue) => {
    onChange?.({ ...value, [field]: fieldValue });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm font-black text-slate-700">
          Caja o etiqueta
          <FmInput
            value={value.boxNumber}
            onChange={(event) => setField("boxNumber", event.target.value)}
            placeholder="FB-26-02031"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-1 text-sm font-black text-slate-700">
          Número de pieza
          <FmInput
            value={value.pieceNumber}
            onChange={(event) => setField("pieceNumber", event.target.value)}
            placeholder="Nº de pieza"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-1 text-sm font-black text-slate-700">
          Fabricación / OF
          <FmInput
            value={value.workOrder}
            onChange={(event) => setField("workOrder", event.target.value)}
            placeholder="Fabricación"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-1 text-sm font-black text-slate-700">
          Colada / lote
          <FmInput
            value={value.lot}
            onChange={(event) => setField("lot", event.target.value)}
            placeholder="Colada"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-1 text-sm font-black text-slate-700">
          Referencia
          <select
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={value.reference}
            onChange={(event) => setField("reference", event.target.value)}
          >
            <option value="">Todas</option>
            <option value="F-1012">F-1012</option>
            <option value="F-1013">F-1013</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-black text-slate-700">
          Operario
          <FmInput
            value={value.operator}
            onChange={(event) => setField("operator", event.target.value)}
            placeholder="Código o nombre"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-1 text-sm font-black text-slate-700">
          Camión
          <FmInput
            value={value.truckNumber}
            onChange={(event) => setField("truckNumber", event.target.value)}
            placeholder="Número de camión"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <FmButton
          type="button"
          variant="secondary"
          onClick={onReset}
          disabled={loading}
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </FmButton>

        <FmButton type="submit" variant="dark" disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? "Buscando..." : "Buscar trazabilidad"}
        </FmButton>
      </div>
    </form>
  );
}
