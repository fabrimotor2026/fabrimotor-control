import { useEffect, useMemo, useState } from "react";
import { Database, Printer } from "lucide-react";
import FmButton from "../../components/ui/FmButton";
import FmCard from "../../components/ui/FmCard";
import FmEmptyState from "../../components/ui/FmEmptyState";
import FmSectionTitle from "../../components/ui/FmSectionTitle";
import TraceabilitySearch, {
  createEmptyTraceabilitySearch,
} from "./components/TraceabilitySearch";
import TraceabilityStatus from "./components/TraceabilityStatus";
import TraceabilityTimeline from "./components/TraceabilityTimeline";
import { getTraceability } from "./services/traceabilityService.js";
import { hasTraceabilityCriteria } from "./utils/traceabilityModel.js";

export default function TraceabilityPanel({
  supabase,
  initialCriteria,
  onOpenEntity,
}) {
  const [criteria, setCriteria] = useState(() => ({
    ...createEmptyTraceabilitySearch(),
    ...(initialCriteria || {}),
  }));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!initialCriteria) return;
    setCriteria((current) => ({ ...current, ...initialCriteria }));
  }, [initialCriteria]);

  const totalResults = useMemo(() => {
    const summary = result?.summary;
    if (!summary) return 0;
    return summary.records + summary.incidents + summary.labels + summary.trucks;
  }, [result]);

  const runSearch = async () => {
    setError("");
    setHasSearched(true);

    if (!hasTraceabilityCriteria(criteria)) {
      setResult(null);
      setError("Indica al menos un criterio de búsqueda.");
      return;
    }

    setLoading(true);
    try {
      const traceability = await getTraceability(supabase, criteria);
      setResult(traceability);
    } catch (searchError) {
      setResult(null);
      setError(searchError?.message || "No se pudo consultar la trazabilidad.");
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setCriteria(createEmptyTraceabilitySearch());
    setResult(null);
    setError("");
    setHasSearched(false);
  };

  return (
    <section className="grid gap-5 print:block">
      <FmCard className="print:shadow-none">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <FmSectionTitle
            eyebrow="V2.45"
            title="Trazabilidad completa"
            description="Consulta y relaciona los datos originales de verificaciones, incidencias, cajas y camiones sin duplicarlos."
          />

          <div className="flex gap-2 print:hidden">
            <FmButton
              variant="secondary"
              onClick={() => window.print()}
              disabled={!result || totalResults === 0}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </FmButton>
          </div>
        </div>

        <TraceabilitySearch
          value={criteria}
          onChange={setCriteria}
          onSubmit={runSearch}
          onReset={resetSearch}
          loading={loading}
        />
      </FmCard>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <FmCard className="flex min-h-40 items-center justify-center gap-3 text-slate-600">
          <Database className="h-5 w-5 animate-pulse" />
          <span className="font-black">Consultando datos originales...</span>
        </FmCard>
      )}

      {!loading && result && <TraceabilityStatus result={result} />}

      {!loading && result && totalResults > 0 && (
        <FmCard className="print:shadow-none">
          <FmSectionTitle
            eyebrow="Recorrido"
            title="Línea temporal"
            description="Los elementos se muestran por fecha. Las relaciones compatibles no se presentan como relaciones exactas."
          />
          <div className="mt-5">
            <TraceabilityTimeline
              timeline={result.timeline}
              onOpenEntity={onOpenEntity}
            />
          </div>
        </FmCard>
      )}

      {!loading && hasSearched && result && totalResults === 0 && (
        <FmEmptyState
          title="No se han encontrado registros"
          description="Revisa el criterio. La referencia por sí sola puede ser insuficiente para identificar una trazabilidad concreta."
        />
      )}

      {!loading && !hasSearched && (
        <FmEmptyState
          title="Busca una pieza, caja o camión"
          description="Puedes combinar varios campos para aumentar la precisión de la consulta."
        />
      )}
    </section>
  );
}
