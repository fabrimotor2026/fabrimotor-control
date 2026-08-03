import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  COST_RESULT_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  buildLogisticsCostExportSheets,
  buildLogisticsCostReport,
  calculateDraftActualTotal,
  costDraftFromRow,
  fetchLogisticsCostData,
  formatCostCurrency,
  formatCostDate,
  logisticsCostFileBase,
  saveTruckLogisticsCost,
} from "../../../services/logisticsCostService";

const EMPTY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  carrier: "ALL",
  customer: "ALL",
  destination: "ALL",
  invoiceStatus: "ALL",
  result: "ALL",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actorLabel(user) {
  return (
    [user?.username, user?.name].filter(Boolean).join(" - ") ||
    "Sistema"
  );
}

function varianceTone(row) {
  if (row.actualTotal <= 0) {
    return "bg-slate-100 text-slate-600";
  }
  if (row.isOverBudget) return "bg-red-100 text-red-800";
  return "bg-emerald-100 text-emerald-800";
}

function invoiceTone(status) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-800";
  if (status === "VERIFIED") return "bg-blue-100 text-blue-800";
  if (status === "RECEIVED") return "bg-violet-100 text-violet-800";
  if (status === "NOT_REQUIRED") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-amber-100 text-amber-900";
}

function alertTone(severity) {
  if (severity === "CRITICAL") {
    return "border-red-200 bg-red-50 text-red-900";
  }
  if (severity === "WARNING") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function Kpi({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    green: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        tones[tone] || tones.slate
      }`}
    >
      <div className="text-xs font-black uppercase tracking-wide text-slate-600">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-slate-500">
        {detail}
      </div>
    </div>
  );
}

function MoneyInput({ label, value, onChange, highlight = false }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`h-11 w-full rounded-xl border px-3 pr-10 font-bold ${
            highlight
              ? "border-blue-300 bg-blue-50"
              : "border-slate-300 bg-white"
          }`}
          placeholder="0,00"
        />
        <span className="pointer-events-none absolute right-3 top-2.5 font-black text-slate-400">
          €
        </span>
      </div>
    </label>
  );
}

function filterDescription(filters) {
  const parts = [
    filters.dateFrom ? `Desde ${filters.dateFrom}` : "Desde: inicio",
    filters.dateTo ? `Hasta ${filters.dateTo}` : "Hasta: hoy",
    filters.carrier === "ALL"
      ? "Todos los transportistas"
      : filters.carrier,
    filters.customer === "ALL"
      ? "Todos los clientes"
      : filters.customer,
    filters.destination === "ALL"
      ? "Todos los destinos"
      : filters.destination,
  ];
  const invoice = INVOICE_STATUS_OPTIONS.find(
    (option) => option.value === filters.invoiceStatus
  );
  const result = COST_RESULT_OPTIONS.find(
    (option) => option.value === filters.result
  );

  parts.push(invoice?.label || "Todos los estados");
  parts.push(result?.label || "Todos los resultados");
  return parts.join(" · ");
}

export default function LogisticsCostModal({
  reference = "F-1012",
  piecesPerBox = 16,
  currentUser,
  onOpenActualTruck,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedTruckNumber, setSelectedTruckNumber] =
    useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const nextRows = await fetchLogisticsCostData(supabase, {
        reference,
        piecesPerBox,
      });
      setRows(nextRows);
    } catch (loadError) {
      setError(
        loadError?.message ||
          "No se han podido cargar los costes logísticos."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(
        `logistics-costs-${String(reference).replaceAll(
          /[^a-zA-Z0-9]/g,
          "-"
        )}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_logistics_costs",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_trucks",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_schedule",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_truck_deliveries",
          filter: `reference=eq.${reference}`,
        },
        () => loadData({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
        },
        () => loadData({ silent: true })
      )
      .subscribe();
    const fallback = window.setInterval(
      () => loadData({ silent: true }),
      60_000
    );

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [reference, piecesPerBox]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !saving &&
        !exporting
      ) {
        if (selectedTruckNumber) {
          setSelectedTruckNumber(null);
          setDraft(null);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [exporting, onClose, saving, selectedTruckNumber]);

  const report = useMemo(
    () => buildLogisticsCostReport(rows, filters),
    [filters, rows]
  );
  const selectedRow = useMemo(
    () =>
      rows.find(
        (row) => row.truckNumber === selectedTruckNumber
      ) || null,
    [rows, selectedTruckNumber]
  );
  const draftActualTotal = draft
    ? calculateDraftActualTotal(draft)
    : 0;
  const draftEstimated = Number(draft?.estimatedCost || 0);
  const draftVariance =
    Math.round(
      (draftActualTotal - draftEstimated + Number.EPSILON) * 100
    ) / 100;

  const setFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const setDraftField = (field, value) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    setSuccess("");
  };

  const openEditor = (row) => {
    setSelectedTruckNumber(row.truckNumber);
    setDraft(costDraftFromRow(row));
    setError("");
    setSuccess("");
    window.setTimeout(() => {
      window.document
        .getElementById("logistics-cost-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const saveCost = async (event) => {
    event.preventDefault();
    if (!selectedRow || !draft) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const savedCost = await saveTruckLogisticsCost(supabase, {
        reference,
        truckNumber: selectedRow.truckNumber,
        draft,
        actor: actorLabel(currentUser),
      });
      await loadData({ silent: true });
      setDraft(
        costDraftFromRow({
          ...selectedRow,
          cost: savedCost,
        })
      );
      setSuccess(
        `Costes del camión ${selectedRow.truckNumber} guardados y verificados correctamente.`
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
          "No se han podido guardar los costes."
      );
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (!report.rows.length) {
      setError("No hay registros que exportar con estos filtros.");
      return;
    }

    setExporting("excel");
    setError("");

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const sheets = buildLogisticsCostExportSheets(report);

      Object.entries(sheets).forEach(([name, sheetRows]) => {
        const worksheet = XLSX.utils.json_to_sheet(sheetRows);
        const headers = Object.keys(sheetRows[0] || {});
        worksheet["!cols"] = headers.map((header) => ({
          wch: Math.min(
            34,
            Math.max(
              header.length + 2,
              ...sheetRows.map((row) =>
                String(row[header] ?? "").length
              )
            )
          ),
        }));
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          name.slice(0, 31)
        );
      });

      XLSX.writeFile(
        workbook,
        `${logisticsCostFileBase(reference)}.xlsx`
      );
    } catch (exportError) {
      console.error("Error exportando costes:", exportError);
      setError("No se ha podido generar el archivo Excel.");
    } finally {
      setExporting("");
    }
  };

  const exportPdf = () => {
    if (!report.rows.length) {
      setError("No hay registros que exportar con estos filtros.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      setError(
        "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes."
      );
      return;
    }

    popup.opener = null;
    setExporting("pdf");
    setError("");

    const title = logisticsCostFileBase(reference);
    const detailRows = report.rows
      .map(
        (row) => `
          <tr>
            <td>${row.truckNumber}</td>
            <td>${escapeHtml(formatCostDate(row.performanceDate))}</td>
            <td>${escapeHtml(row.carrier)}</td>
            <td>${escapeHtml(row.customer)}</td>
            <td>${escapeHtml(row.destination)}</td>
            <td>${row.boxCount}</td>
            <td>${escapeHtml(formatCostCurrency(row.estimatedCost))}</td>
            <td>${escapeHtml(formatCostCurrency(row.actualTotal))}</td>
            <td>${escapeHtml(formatCostCurrency(row.variance))}</td>
            <td>${escapeHtml(row.invoiceNumber || "-")}</td>
            <td>${escapeHtml(row.invoiceStatusLabel)}</td>
          </tr>`
      )
      .join("");
    const carrierRows = report.carriers
      .map(
        (carrier) => `
          <tr>
            <td>${escapeHtml(carrier.carrier)}</td>
            <td>${carrier.total}</td>
            <td>${escapeHtml(
              formatCostCurrency(carrier.estimatedTotal)
            )}</td>
            <td>${escapeHtml(
              formatCostCurrency(carrier.actualTotal)
            )}</td>
            <td>${escapeHtml(
              formatCostCurrency(carrier.varianceTotal)
            )}</td>
            <td>${escapeHtml(
              formatCostCurrency(carrier.costPerBox)
            )}</td>
            <td>${carrier.invoicePending}</td>
          </tr>`
      )
      .join("");

    popup.document.open();
    popup.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; font-size: 10px; }
            h1 { margin: 4px 0; font-size: 24px; }
            h2 { margin: 16px 0 8px; font-size: 15px; }
            .brand { color: #1d4ed8; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
            .muted { color: #64748b; font-weight: 600; }
            .filters { margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 8px; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 12px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
            .kpi span { display: block; color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; }
            .kpi strong { display: block; margin-top: 4px; font-size: 17px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; vertical-align: top; }
            th { background: #e2e8f0; font-size: 8px; text-transform: uppercase; }
            tr { break-inside: avoid; }
            .page-break { break-before: page; }
          </style>
        </head>
        <body>
          <div class="brand">FM Control · V2.37.1</div>
          <h1>Costes logísticos y control de transporte</h1>
          <div class="muted">${escapeHtml(reference)}</div>
          <div class="filters">${escapeHtml(
            filterDescription(filters)
          )}</div>
          <div class="kpis">
            <div class="kpi"><span>Previsto</span><strong>${escapeHtml(
              formatCostCurrency(report.summary.estimatedTotal)
            )}</strong></div>
            <div class="kpi"><span>Real</span><strong>${escapeHtml(
              formatCostCurrency(report.summary.actualTotal)
            )}</strong></div>
            <div class="kpi"><span>Desviación</span><strong>${escapeHtml(
              formatCostCurrency(report.summary.varianceTotal)
            )}</strong></div>
            <div class="kpi"><span>Coste/caja</span><strong>${escapeHtml(
              formatCostCurrency(report.summary.costPerBox)
            )}</strong></div>
            <div class="kpi"><span>Facturas pendientes</span><strong>${
              report.summary.invoicePending
            }</strong></div>
          </div>
          <h2>Resumen por transportista</h2>
          <table>
            <thead><tr>
              <th>Transportista</th><th>Expediciones</th><th>Previsto</th>
              <th>Real</th><th>Desviación</th><th>Coste/caja</th>
              <th>Facturas pendientes</th>
            </tr></thead>
            <tbody>${carrierRows}</tbody>
          </table>
          <h2 class="page-break">Detalle de expediciones</h2>
          <table>
            <thead><tr>
              <th>Camión</th><th>Fecha</th><th>Transportista</th>
              <th>Cliente</th><th>Destino</th><th>Cajas</th>
              <th>Previsto</th><th>Real</th><th>Desviación</th>
              <th>Factura</th><th>Estado</th>
            </tr></thead>
            <tbody>${detailRows}</tbody>
          </table>
          <script>
            window.addEventListener("load", () => {
              window.setTimeout(() => window.print(), 250);
            });
          </script>
        </body>
      </html>`);
    popup.document.close();
    setExporting("");
  };

  const maxMonthlyCost = Math.max(
    1,
    ...report.months.map((month) =>
      Math.max(month.actualTotal, month.estimatedTotal)
    )
  );

  return createPortal(
    <div className="fixed inset-0 z-[10040] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4">
      <div
        className="flex max-h-[calc(100vh-1rem)] w-full max-w-[98rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl sm:max-h-[calc(100vh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logistics-cost-title"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              FM Control · V2.37.1
            </p>
            <h2
              id="logistics-cost-title"
              className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl"
            >
              Costes logísticos y control de transporte
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Previsión, coste real, recargos, facturas y coste
              unitario de cada expedición.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportPdf}
              disabled={Boolean(exporting)}
              className="rounded-xl bg-red-600 px-4 py-3 font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {exporting === "pdf" ? "Preparando..." : "▣ PDF"}
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={Boolean(exporting)}
              className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {exporting === "excel" ? "Preparando..." : "▦ Excel"}
            </button>
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing || Boolean(exporting)}
              className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? "Actualizando..." : "↻ Actualizar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || Boolean(exporting)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-2xl font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              aria-label="Cerrar costes logísticos"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Desde
                </span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    setFilter("dateFrom", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Hasta
                </span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    setFilter("dateTo", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                />
              </label>
              {[
                ["carrier", "Transportista", report.options.carriers],
                ["customer", "Cliente", report.options.customers],
                ["destination", "Destino", report.options.destinations],
              ].map(([field, label, options]) => (
                <label key={field}>
                  <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                    {label}
                  </span>
                  <select
                    value={filters[field]}
                    onChange={(event) =>
                      setFilter(field, event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                  >
                    <option value="ALL">Todos</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Factura
                </span>
                <select
                  value={filters.invoiceStatus}
                  onChange={(event) =>
                    setFilter("invoiceStatus", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                >
                  {INVOICE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                  Resultado
                </span>
                <select
                  value={filters.result}
                  onChange={(event) =>
                    setFilter("result", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                >
                  {COST_RESULT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="self-end rounded-xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800"
              >
                Limpiar
              </button>
            </div>
          </section>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
              {success}
            </div>
          )}

          {selectedRow && draft && (
            <form
              id="logistics-cost-editor"
              onSubmit={saveCost}
              className="mt-5 rounded-[1.5rem] border border-blue-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                    Edición económica
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Camión {selectedRow.truckNumber}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {selectedRow.carrier} · {selectedRow.customer} ·{" "}
                    {selectedRow.destination}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTruckNumber(null);
                    setDraft(null);
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-black text-slate-700 hover:bg-slate-200"
                >
                  Cerrar edición
                </button>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MoneyInput
                      label="Coste previsto"
                      value={draft.estimatedCost}
                      onChange={(value) =>
                        setDraftField("estimatedCost", value)
                      }
                      highlight
                    />
                    <MoneyInput
                      label="Transporte base real"
                      value={draft.actualBaseCost}
                      onChange={(value) =>
                        setDraftField("actualBaseCost", value)
                      }
                      highlight
                    />
                    <MoneyInput
                      label="Recargo combustible"
                      value={draft.fuelSurcharge}
                      onChange={(value) =>
                        setDraftField("fuelSurcharge", value)
                      }
                    />
                    <MoneyInput
                      label="Peajes"
                      value={draft.tollsCost}
                      onChange={(value) =>
                        setDraftField("tollsCost", value)
                      }
                    />
                    <MoneyInput
                      label="Esperas"
                      value={draft.waitingCost}
                      onChange={(value) =>
                        setDraftField("waitingCost", value)
                      }
                    />
                    <MoneyInput
                      label="Devolución"
                      value={draft.returnCost}
                      onChange={(value) =>
                        setDraftField("returnCost", value)
                      }
                    />
                    <MoneyInput
                      label="Otros costes"
                      value={draft.otherCost}
                      onChange={(value) =>
                        setDraftField("otherCost", value)
                      }
                    />
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                        Concepto otros
                      </span>
                      <input
                        value={draft.otherCostDescription}
                        onChange={(event) =>
                          setDraftField(
                            "otherCostDescription",
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                        placeholder="Descripción"
                      />
                    </label>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                        Número de factura
                      </span>
                      <input
                        value={draft.invoiceNumber}
                        onChange={(event) =>
                          setDraftField(
                            "invoiceNumber",
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                        placeholder="Factura del transportista"
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                        Fecha de factura
                      </span>
                      <input
                        type="date"
                        value={draft.invoiceDate}
                        onChange={(event) =>
                          setDraftField(
                            "invoiceDate",
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 font-bold"
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                        Estado de factura
                      </span>
                      <select
                        value={draft.invoiceStatus}
                        onChange={(event) =>
                          setDraftField(
                            "invoiceStatus",
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold"
                      >
                        {INVOICE_STATUS_OPTIONS.filter(
                          (option) => option.value !== "ALL"
                        ).map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-xs font-black uppercase text-slate-600">
                      Observaciones económicas
                    </span>
                    <textarea
                      value={draft.notes}
                      onChange={(event) =>
                        setDraftField("notes", event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 p-3 font-semibold"
                      placeholder="Aclaraciones sobre tarifas, recargos o factura"
                    />
                  </label>
                </div>

                <aside className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                    Resumen del coste
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-300">
                        Previsto
                      </span>
                      <strong>
                        {formatCostCurrency(draftEstimated)}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-300">
                        Coste real
                      </span>
                      <strong>
                        {formatCostCurrency(draftActualTotal)}
                      </strong>
                    </div>
                    <div className="border-t border-slate-700 pt-3">
                      <div className="flex justify-between gap-3">
                        <span className="font-bold text-slate-300">
                          Desviación
                        </span>
                        <strong
                          className={
                            draftVariance > 0
                              ? "text-red-300"
                              : "text-emerald-300"
                          }
                        >
                          {formatCostCurrency(draftVariance)}
                        </strong>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="rounded-xl bg-white/10 p-3">
                        <div className="text-xs font-bold text-slate-300">
                          Coste/caja
                        </div>
                        <div className="mt-1 font-black">
                          {selectedRow.boxCount
                            ? formatCostCurrency(
                                draftActualTotal /
                                  selectedRow.boxCount
                              )
                            : "-"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/10 p-3">
                        <div className="text-xs font-bold text-slate-300">
                          Coste/pieza
                        </div>
                        <div className="mt-1 font-black">
                          {selectedRow.pieceCount
                            ? formatCostCurrency(
                                draftActualTotal /
                                  selectedRow.pieceCount
                              )
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar costes"}
                  </button>
                </aside>
              </div>
            </form>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Kpi
              label="Coste previsto"
              value={formatCostCurrency(report.summary.estimatedTotal)}
              detail={`${report.summary.withEstimate} expediciones con previsión`}
              tone="blue"
            />
            <Kpi
              label="Coste real"
              value={formatCostCurrency(report.summary.actualTotal)}
              detail={`${report.summary.withActual} expediciones con coste real`}
              tone="slate"
            />
            <Kpi
              label="Desviación"
              value={formatCostCurrency(report.summary.varianceTotal)}
              detail={
                report.summary.variancePercentage === null
                  ? "Sin base prevista"
                  : `${report.summary.variancePercentage}% sobre la previsión`
              }
              tone={
                report.summary.varianceTotal > 0 ? "red" : "green"
              }
            />
            <Kpi
              label="Coste por caja"
              value={formatCostCurrency(report.summary.costPerBox)}
              detail={`${report.summary.boxes} cajas contabilizadas`}
              tone="green"
            />
            <Kpi
              label="Coste por pieza"
              value={formatCostCurrency(report.summary.costPerPiece)}
              detail={`${report.summary.pieces} piezas contabilizadas`}
              tone="green"
            />
            <Kpi
              label="Facturas pendientes"
              value={report.summary.invoicePending}
              detail={`${report.summary.overBudget} expediciones con sobrecoste`}
              tone={
                report.summary.invoicePending ? "amber" : "green"
              }
            />
          </div>

          {loading ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-12 text-center font-black text-slate-500">
              Calculando los costes logísticos...
            </div>
          ) : (
            <>
              {report.alerts.length > 0 && (
                <section className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
                        Control económico
                      </p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        Alertas de costes y facturas
                      </h3>
                    </div>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                      {report.alerts.length} alertas
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {report.alerts.slice(0, 9).map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => {
                          const row = rows.find(
                            (item) =>
                              item.truckNumber === alert.truckNumber
                          );
                          if (row) openEditor(row);
                        }}
                        className={`rounded-2xl border p-4 text-left ${alertTone(
                          alert.severity
                        )}`}
                      >
                        <div className="text-sm font-black">
                          {alert.title}
                        </div>
                        <div className="mt-1 text-xs font-bold opacity-80">
                          {alert.message}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Transportistas
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Comparativa económica
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-sm">
                      <thead className="bg-slate-200 text-left text-xs uppercase text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Transportista</th>
                          <th className="px-4 py-3 text-right">
                            Expediciones
                          </th>
                          <th className="px-4 py-3 text-right">
                            Previsto
                          </th>
                          <th className="px-4 py-3 text-right">Real</th>
                          <th className="px-4 py-3 text-right">
                            Desviación
                          </th>
                          <th className="px-4 py-3 text-right">
                            Coste/caja
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.carriers.map((carrier) => (
                          <tr
                            key={carrier.carrier}
                            className="border-t border-slate-200"
                          >
                            <td className="px-4 py-3 font-black">
                              {carrier.carrier}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {carrier.total}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {formatCostCurrency(
                                carrier.estimatedTotal
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-black">
                              {formatCostCurrency(carrier.actualTotal)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-black ${
                                carrier.varianceTotal > 0
                                  ? "text-red-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {formatCostCurrency(
                                carrier.varianceTotal
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {formatCostCurrency(carrier.costPerBox)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                    Evolución
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Costes mensuales
                  </h3>
                  <div className="mt-5 space-y-4">
                    {report.months.length ? (
                      report.months.map((month) => (
                        <div key={month.month}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <strong>{month.month}</strong>
                            <span className="font-black">
                              {formatCostCurrency(month.actualTotal)}
                            </span>
                          </div>
                          <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-violet-600"
                              style={{
                                width: `${Math.max(
                                  2,
                                  (month.actualTotal /
                                    maxMonthlyCost) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-xs font-bold text-slate-500">
                            <span>
                              Previsto{" "}
                              {formatCostCurrency(
                                month.estimatedTotal
                              )}
                            </span>
                            <span>
                              Desviación{" "}
                              {formatCostCurrency(
                                month.varianceTotal
                              )}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center font-bold text-slate-500">
                        Sin datos mensuales.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                    Clientes y destinos
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Distribución del coste logístico
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead className="bg-slate-200 text-left text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Destino</th>
                        <th className="px-4 py-3 text-right">
                          Expediciones
                        </th>
                        <th className="px-4 py-3 text-right">Real</th>
                        <th className="px-4 py-3 text-right">
                          Coste/caja
                        </th>
                        <th className="px-4 py-3 text-right">
                          Coste/pieza
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.customers.map((customer) => (
                        <tr
                          key={`${customer.customer}-${customer.destination}`}
                          className="border-t border-slate-200"
                        >
                          <td className="px-4 py-3 font-black">
                            {customer.customer}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {customer.destination}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {customer.total}
                          </td>
                          <td className="px-4 py-3 text-right font-black">
                            {formatCostCurrency(customer.actualTotal)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatCostCurrency(customer.costPerBox)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatCostCurrency(customer.costPerPiece)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Detalle
                    </p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Expediciones y facturas
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {report.rows.length} registros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[78rem] text-sm">
                    <thead className="bg-slate-200 text-left text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Camión</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">
                          Transportista
                        </th>
                        <th className="px-4 py-3">
                          Cliente / destino
                        </th>
                        <th className="px-4 py-3 text-right">
                          Cajas
                        </th>
                        <th className="px-4 py-3 text-right">
                          Previsto
                        </th>
                        <th className="px-4 py-3 text-right">Real</th>
                        <th className="px-4 py-3 text-right">
                          Desviación
                        </th>
                        <th className="px-4 py-3">Factura</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.length ? (
                        report.rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-slate-200"
                          >
                            <td className="px-4 py-3">
                              {row.kind === "ACTUAL" &&
                              onOpenActualTruck ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenActualTruck(row.truck)
                                  }
                                  className="font-black text-blue-700 hover:underline"
                                >
                                  {row.truckNumber}
                                </button>
                              ) : (
                                <span className="font-black">
                                  {row.truckNumber}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {formatCostDate(row.performanceDate)}
                            </td>
                            <td className="px-4 py-3 font-black">
                              {row.carrier}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-black">
                                {row.customer}
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-500">
                                {row.destination}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {row.boxCount}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {formatCostCurrency(row.estimatedCost)}
                            </td>
                            <td className="px-4 py-3 text-right font-black">
                              {formatCostCurrency(row.actualTotal)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${varianceTone(
                                  row
                                )}`}
                              >
                                {formatCostCurrency(row.variance)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {row.invoiceNumber || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${invoiceTone(
                                  row.invoiceStatus
                                )}`}
                              >
                                {row.invoiceStatusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => openEditor(row)}
                                className="rounded-xl bg-slate-950 px-4 py-2 font-black text-white hover:bg-slate-800"
                              >
                                Editar costes
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-12 text-center font-bold text-slate-500"
                          >
                            No hay expediciones con los filtros
                            seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
