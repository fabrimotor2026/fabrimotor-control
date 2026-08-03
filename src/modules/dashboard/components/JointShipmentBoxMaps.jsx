import { useEffect, useMemo, useState } from "react";

// Orden visual de las referencias en el camión:
// rosca izquierda (F1013) a la izquierda y rosca derecha (F1012) a la derecha.
const JOINT_REFERENCES = ["F-1013", "F-1012"];

function normalizeReference(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^F(\d)/, "F-$1");
}

function compactReference(value) {
  return normalizeReference(value).replace("-", "");
}

export function jointBoxKey(box) {
  return `${normalizeReference(box?.reference)}::${
    box?.numeroCaja || box?.numero_caja || ""
  }`;
}

function ReferenceMap({
  reference,
  boxes,
  targetBoxes,
  selectedBox,
  highlightBoxNumber,
  highlightBoxReference,
  onSelectBox,
}) {
  const completed = Math.min(boxes.length, targetBoxes);
  const pending = Math.max(targetBoxes - completed, 0);
  const percent = targetBoxes
    ? Math.min(100, Math.round((completed / targetBoxes) * 100))
    : 0;
  const selectedKey = selectedBox ? jointBoxKey(selectedBox) : "";
  const normalizedHighlightReference = normalizeReference(
    highlightBoxReference
  );

  return (
    <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Referencia
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            {compactReference(reference)}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-2xl font-black text-slate-950">
            {completed}
            <span className="text-base text-slate-500">
              {" "}
              / {targetBoxes}
            </span>
          </p>
          <p className="text-xs font-black uppercase text-blue-700">
            {pending} pendientes · {percent}%
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-slate-950 p-3">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {boxes.slice(0, targetBoxes).map((box) => {
            const key = jointBoxKey(box);
            const boxNumber =
              box.numeroCaja || box.numero_caja || "SIN CAJA";
            const isSelected = key === selectedKey;
            const isHighlighted =
              String(boxNumber).toUpperCase() ===
                String(highlightBoxNumber || "").toUpperCase() &&
              (!normalizedHighlightReference ||
                normalizedHighlightReference === reference);

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectBox(box)}
                className={`relative min-h-[76px] rounded-xl border-2 p-2 text-left transition ${
                  isSelected
                    ? "border-amber-400 bg-amber-100 text-amber-950 shadow-md"
                    : isHighlighted
                      ? "border-white bg-blue-600 text-white ring-2 ring-amber-400"
                      : "border-emerald-500 bg-emerald-500 text-white hover:border-white"
                }`}
                title={`${compactReference(reference)} · Caja ${boxNumber}`}
              >
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-100" />
                <span className="block pr-3 text-[11px] font-black uppercase opacity-80">
                  {compactReference(reference)}
                </span>
                <span className="mt-0.5 block break-words text-sm font-black leading-tight">
                  {boxNumber}
                </span>
                <span className="mt-2 block text-xs font-black">
                  {Number(box.totalPiezas || 0)} uds
                </span>
              </button>
            );
          })}

          {Array.from({ length: pending }, (_, index) => (
            <div
              key={`${reference}-free-${index}`}
              className="flex min-h-[76px] items-center justify-center rounded-xl border border-dashed border-slate-500 bg-slate-800 px-2 text-center text-xs font-black uppercase text-slate-400"
              title={`${compactReference(reference)} · Hueco libre`}
            >
              Libre
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function JointShipmentBoxMaps({
  boxes = [],
  targetBoxesPerReference = 49,
  selectedBox,
  searchValue,
  setSearchValue,
  onSearchBox,
  onSelectBox,
  highlightBoxNumber,
  highlightBoxReference,
}) {
  const initialReference =
    normalizeReference(highlightBoxReference) ||
    normalizeReference(selectedBox?.reference) ||
    "F-1013";
  const [activeReference, setActiveReference] = useState(
    JOINT_REFERENCES.includes(initialReference)
      ? initialReference
      : "F-1013"
  );
  const boxesByReference = useMemo(
    () =>
      Object.fromEntries(
        JOINT_REFERENCES.map((reference) => [
          reference,
          boxes
            .filter(
              (box) => normalizeReference(box?.reference) === reference
            )
            .sort((first, second) =>
              String(
                first?.numeroCaja || first?.numero_caja || ""
              ).localeCompare(
                String(
                  second?.numeroCaja || second?.numero_caja || ""
                )
              )
            ),
        ])
      ),
    [boxes]
  );

  useEffect(() => {
    const highlightedReference = normalizeReference(
      highlightBoxReference
    );

    if (JOINT_REFERENCES.includes(highlightedReference)) {
      setActiveReference(highlightedReference);
    }
  }, [highlightBoxReference]);

  const selectReference = (reference) => {
    const normalizedReference = normalizeReference(reference);

    if (!JOINT_REFERENCES.includes(normalizedReference)) return;

    setActiveReference(normalizedReference);
    setSearchValue("");

    const referenceBoxes =
      boxesByReference[normalizedReference] || [];
    const lastReferenceBox =
      referenceBoxes[referenceBoxes.length - 1] || null;

    onSelectBox(lastReferenceBox);
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    if (onSearchBox) {
      await onSearchBox(searchValue, activeReference);
    }
  };

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Producción conjunta
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Cajas del camión
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Un camión físico con dos mapas independientes de 49 cajas.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex w-full flex-wrap gap-2 lg:w-auto"
        >
          <select
            value={activeReference}
            onChange={(event) =>
              selectReference(event.target.value)
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-blue-600"
            aria-label="Mapa de referencia"
          >
            {JOINT_REFERENCES.map((reference) => (
              <option key={reference} value={reference}>
                {compactReference(reference)}
              </option>
            ))}
          </select>
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Buscar caja, FAB, COL…"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 lg:w-56"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {JOINT_REFERENCES.map((reference) => {
          const referenceBoxes = boxesByReference[reference] || [];
          const isActive = activeReference === reference;

          return (
            <button
              key={reference}
              type="button"
              onClick={() => selectReference(reference)}
              className={`rounded-2xl border p-3 text-left transition ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white shadow-md"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <span className="block text-xs font-black uppercase tracking-[0.18em] opacity-80">
                Mostrar mapa
              </span>
              <span className="mt-1 flex items-end justify-between gap-2">
                <strong className="text-lg">
                  {compactReference(reference)}
                </strong>
                <strong>
                  {referenceBoxes.length}/{targetBoxesPerReference}
                </strong>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <ReferenceMap
          key={activeReference}
          reference={activeReference}
          boxes={boxesByReference[activeReference] || []}
          targetBoxes={targetBoxesPerReference}
          selectedBox={selectedBox}
          highlightBoxNumber={highlightBoxNumber}
          highlightBoxReference={highlightBoxReference}
          onSelectBox={onSelectBox}
        />
      </div>
    </section>
  );
}
