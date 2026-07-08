import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import CommandItem from "./CommandItem";
import { buildCommandResults } from "../utils/searchEngine";

export default function CommandPalette({
  open,
  onClose,
  boxes = [],
  rawBoxRows = [],
  trucks = [],
  users = [],
  productionRecords = [],
  appConfig = {},
  onOpenBox,
  onOpenTruck,
  onOpenDashboard,
  onOpenConfig,
  onOpenLabel,
  onOpenProduction,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(
    () => buildCommandResults({ query, boxes, rawBoxRows, trucks, users, productionRecords, appConfig }),
    [query, boxes, rawBoxRows, trucks, users, productionRecords, appConfig]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [query, open]);

  const execute = (item) => {
    if (!item) return;

    if (item.type === "box") onOpenBox?.(item.payload);
    if (item.type === "truck") onOpenTruck?.(item.payload);
    if (item.type === "operator") {
      alert("Operario localizado correctamente. La ficha completa se implementará en la v2.15.");
    }
    if (item.type === "fabrication") {
      alert(`Fabricación ${item.payload?.fabricacion || ""} localizada. La ficha de fabricación se implementará en una próxima versión.`);
    }
    if (item.type === "heat") {
      alert(`Colada ${item.payload?.colada || ""} localizada. La ficha de colada se implementará en una próxima versión.`);
    }
    if (item.type === "verification") {
      alert("Verificación localizada correctamente. La apertura directa se integrará cuando se complete el módulo de calidad.");
    }
    if (item.type === "action") {
      if (item.action === "openDashboard") onOpenDashboard?.();
      if (item.action === "openConfig") onOpenConfig?.();
      if (item.action === "openLabel") onOpenLabel?.();
      if (item.action === "openProduction") onOpenProduction?.();
    }

    onClose?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      execute(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-slate-950/55 px-4 pt-[9vh] backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <Search className="h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cajas, camiones, operarios o acciones..."
            className="min-w-0 flex-1 bg-transparent text-lg font-black text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-200" aria-label="Cerrar buscador">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto bg-white p-3">
          {!query ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="text-2xl font-black text-slate-900">Centro de comandos FM Control</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Escribe una caja, camión, operario o acción. También puedes abrirlo con Ctrl + K.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-black text-slate-600">
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">62054</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">Reda</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">FAB 228</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">COL 215</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">dashboard</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              No hay resultados para <span className="font-black text-slate-800">{query}</span>.
            </div>
          ) : (
            <div className="grid gap-2">
              {results.map((item, index) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  active={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => execute(item)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-slate-500">
          <span>↑ ↓ navegar · Enter abrir · Esc cerrar</span>
          <span>FM Control Search Engine · Sprint 3</span>
        </div>
      </div>
    </div>
  );
}
