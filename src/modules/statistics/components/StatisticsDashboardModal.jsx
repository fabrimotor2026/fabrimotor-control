import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FilterX,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function pad(value) {
  return String(value).padStart(2, "0");
}

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeDate(value) {
  if (!value) return "";

  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);

  if (match) return match[1];

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : localIsoDate(parsed);
}

function shortDate(value) {
  const date = normalizeDate(value);

  if (!date) return "-";

  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function fullDate(value) {
  const date = normalizeDate(value);

  if (!date) return "-";

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function rowTimestamp(row) {
  const direct = Number(row?.savedAtMs);

  if (Number.isFinite(direct) && direct > 0) return direct;

  const parsed = Date.parse(
    row?.created_at ||
    row?.createdAt ||
    row?.fecha ||
    ""
  );

  return Number.isNaN(parsed) ? 0 : parsed;
}

function operatorCodes(value) {
  return String(value || "")
    .split(/\s*\/\s*/)
    .map((part) => part.trim().split(/\s*-\s*/)[0])
    .filter(Boolean);
}

function recordMatchesOperator(record, username) {
  return operatorCodes(record?.operario).includes(String(username || ""));
}

function labelMatchesOperator(label, username) {
  const code = String(username || "");

  return (
    String(label?.operario1 || "") === code ||
    String(label?.operario2 || "") === code
  );
}

function labelOperatorCodes(label) {
  return [...new Set(
    [label?.operario1, label?.operario2]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function boxNumber(row) {
  return row?.numero_caja || row?.numeroCaja || "";
}

function groupBoxes(labels) {
  const grouped = new Map();

  labels.forEach((label) => {
    const number = boxNumber(label);

    if (!number) return;

    const current = grouped.get(number) || {
      numeroCaja: number,
      date: normalizeDate(label.fecha || label.created_at),
      pieces: 0,
      operators: new Set(),
    };

    current.pieces += Number(label.cantidad || 0);
    labelOperatorCodes(label).forEach((code) => current.operators.add(code));
    grouped.set(number, current);
  });

  return [...grouped.values()].map((box) => ({
    ...box,
    operators: [...box.operators],
  }));
}

function operatorAllocation(labels, username) {
  const code = String(username || "");
  const allocatedBoxes = groupBoxes(labels)
    .filter((box) => box.operators.includes(code))
    .map((box) => {
      const participants = Math.max(box.operators.length, 1);
      const share = 1 / participants;

      return {
        ...box,
        share,
        allocatedPieces: box.pieces * share,
      };
    });

  return {
    boxes: allocatedBoxes.reduce((total, box) => total + box.share, 0),
    pieces: allocatedBoxes.reduce(
      (total, box) => total + box.allocatedPieces,
      0
    ),
    allocatedBoxes,
  };
}

function formatAllocation(value) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function exportDate(date = new Date()) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function sanitizeFileName(value) {
  return String(value || "F1012")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "F1012";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printableTable(headers, rows) {
  const body = rows.length
    ? rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join("")}</tr>`
        )
        .join("")
    : `<tr><td colspan="${headers.length}" class="empty">Sin datos para los filtros seleccionados.</td></tr>`;

  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function KpiCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{detail}</div>
    </div>
  );
}

export default function StatisticsDashboardModal({
  users = [],
  records = [],
  boxLabels = [],
  loading = false,
  onRefresh,
  onClose,
  referenceCode = "F1012",
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [machine, setMachine] = useState("");
  const [shift, setShift] = useState("");
  const [operator, setOperator] = useState("");
  const [exporting, setExporting] = useState("");

  const operators = useMemo(
    () =>
      users
        .filter((user) => user?.role === "Operario")
        .sort((first, second) =>
          String(first.name || first.username).localeCompare(
            String(second.name || second.username),
            "es"
          )
        ),
    [users]
  );

  const machines = useMemo(
    () =>
      [...new Set(records.map((record) => record.maquina).filter(Boolean))]
        .sort((first, second) => first.localeCompare(second, "es")),
    [records]
  );

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        const date = normalizeDate(record.fecha || record.createdAt);

        return (
          (!dateFrom || date >= dateFrom) &&
          (!dateTo || date <= dateTo) &&
          (!machine || record.maquina === machine) &&
          (!shift || record.turno === shift) &&
          (!operator || recordMatchesOperator(record, operator))
        );
      })
      .sort((first, second) => rowTimestamp(second) - rowTimestamp(first));
  }, [records, dateFrom, dateTo, machine, shift, operator]);

  const filteredLabels = useMemo(() => {
    return boxLabels.filter((label) => {
      const date = normalizeDate(label.fecha || label.created_at);

      return (
        (!dateFrom || date >= dateFrom) &&
        (!dateTo || date <= dateTo) &&
        (!operator || labelMatchesOperator(label, operator))
      );
    });
  }, [boxLabels, dateFrom, dateTo, operator]);

  const boxes = useMemo(
    () => groupBoxes(filteredLabels),
    [filteredLabels]
  );

  const selectedOperatorAllocation = useMemo(
    () => operator ? operatorAllocation(filteredLabels, operator) : null,
    [filteredLabels, operator]
  );

  const statistics = useMemo(() => {
    const ok = filteredRecords.filter(
      (record) => record.resultado === "OK"
    ).length;
    const nok = filteredRecords.filter(
      (record) => record.resultado === "NO OK"
    ).length;
    const pieces = selectedOperatorAllocation
      ? selectedOperatorAllocation.pieces
      : filteredLabels.reduce(
          (total, label) => total + Number(label.cantidad || 0),
          0
        );

    return {
      controls: filteredRecords.length,
      ok,
      nok,
      okRate:
        filteredRecords.length > 0
          ? Math.round((ok / filteredRecords.length) * 100)
          : 0,
      boxes: selectedOperatorAllocation
        ? selectedOperatorAllocation.boxes
        : boxes.length,
      pieces,
    };
  }, [
    filteredRecords,
    filteredLabels,
    boxes,
    selectedOperatorAllocation,
  ]);

  const dailyData = useMemo(() => {
    const daily = new Map();

    const ensureDay = (date) => {
      if (!date) return null;

      if (!daily.has(date)) {
        daily.set(date, {
          date,
          label: shortDate(date),
          ok: 0,
          nok: 0,
          boxes: 0,
          pieces: 0,
        });
      }

      return daily.get(date);
    };

    filteredRecords.forEach((record) => {
      const day = ensureDay(
        normalizeDate(record.fecha || record.createdAt)
      );

      if (!day) return;

      if (record.resultado === "OK") day.ok += 1;
      if (record.resultado === "NO OK") day.nok += 1;
    });

    boxes.forEach((box) => {
      const day = ensureDay(box.date);

      if (!day) return;

      if (operator) {
        const participants = Math.max(box.operators.length, 1);
        day.boxes += 1 / participants;
        day.pieces += box.pieces / participants;
      } else {
        day.boxes += 1;
        day.pieces += box.pieces;
      }
    });

    return [...daily.values()]
      .sort((first, second) => first.date.localeCompare(second.date))
      .slice(-14);
  }, [filteredRecords, boxes, operator]);

  const machineStats = useMemo(() => {
    const grouped = new Map();

    filteredRecords.forEach((record) => {
      const name = record.maquina || "Sin máquina";
      const current = grouped.get(name) || {
        machine: name,
        total: 0,
        ok: 0,
        nok: 0,
      };

      current.total += 1;
      if (record.resultado === "OK") current.ok += 1;
      if (record.resultado === "NO OK") current.nok += 1;
      grouped.set(name, current);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        okRate:
          item.total > 0
            ? Math.round((item.ok / item.total) * 100)
            : 0,
      }))
      .sort((first, second) => second.total - first.total);
  }, [filteredRecords]);

  const operatorStats = useMemo(() => {
    return operators
      .filter((user) => !operator || user.username === operator)
      .map((user) => {
        const userRecords = filteredRecords.filter((record) =>
          recordMatchesOperator(record, user.username)
        );
        const allocation = operatorAllocation(
          filteredLabels,
          user.username
        );
        const userOk = userRecords.filter(
          (record) => record.resultado === "OK"
        ).length;

        return {
          username: user.username,
          name: user.name || user.username,
          controls: userRecords.length,
          boxes: allocation.boxes,
          pieces: allocation.pieces,
          okRate:
            userRecords.length > 0
              ? Math.round((userOk / userRecords.length) * 100)
              : 0,
        };
      })
      .filter((item) => item.controls > 0 || item.boxes > 0)
      .sort(
        (first, second) =>
          second.boxes - first.boxes ||
          second.controls - first.controls
      )
      .slice(0, 10);
  }, [operators, operator, filteredRecords, filteredLabels]);

  const recentNok = filteredRecords
    .filter((record) => record.resultado === "NO OK")
    .slice(0, 8);

  const selectedOperatorName =
    operators.find((user) => user.username === operator)?.name || "";

  const exportBaseName =
    `${sanitizeFileName(referenceCode)}_Estadisticas_${exportDate()}`;

  const exportFilters = [
    ["Desde", dateFrom ? fullDate(dateFrom) : "Sin límite"],
    ["Hasta", dateTo ? fullDate(dateTo) : "Sin límite"],
    ["Máquina", machine || "Todas"],
    ["Turno", shift || "Todos"],
    [
      "Operario",
      operator
        ? `${operator}${selectedOperatorName ? ` · ${selectedOperatorName}` : ""}`
        : "Todos",
    ],
  ];

  const boxesForExport = boxes.map((box) => {
    const share = operator
      ? 1 / Math.max(box.operators.length, 1)
      : 1;

    return {
      numeroCaja: box.numeroCaja,
      date: box.date,
      operators: box.operators.join(" / "),
      boxes: share,
      pieces: box.pieces * share,
    };
  });

  const handleExportExcel = async () => {
    setExporting("excel");

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const appendSheet = (name, rows, widths = []) => {
        const sheet = XLSX.utils.json_to_sheet(rows);

        if (widths.length) {
          sheet["!cols"] = widths.map((wch) => ({ wch }));
        }

        XLSX.utils.book_append_sheet(workbook, sheet, name);
      };

      appendSheet(
        "Resumen",
        [
          ...exportFilters.map(([filter, value]) => ({
            Sección: "Filtros aplicados",
            Concepto: filter,
            Valor: value,
          })),
          { Sección: "Resumen", Concepto: "Controles", Valor: statistics.controls },
          { Sección: "Resumen", Concepto: "OK", Valor: statistics.ok },
          { Sección: "Resumen", Concepto: "NO OK", Valor: statistics.nok },
          { Sección: "Resumen", Concepto: "% OK", Valor: statistics.okRate },
          { Sección: "Resumen", Concepto: "Cajas", Valor: statistics.boxes },
          { Sección: "Resumen", Concepto: "Piezas", Valor: statistics.pieces },
        ],
        [20, 22, 32]
      );

      appendSheet(
        "Evolución diaria",
        dailyData.map((item) => ({
          Fecha: fullDate(item.date),
          OK: item.ok,
          "NO OK": item.nok,
          Cajas: item.boxes,
          Piezas: item.pieces,
        })),
        [14, 10, 10, 12, 12]
      );

      appendSheet(
        "Máquinas",
        machineStats.map((item) => ({
          Máquina: item.machine,
          Controles: item.total,
          OK: item.ok,
          "NO OK": item.nok,
          "% OK": item.okRate,
        })),
        [28, 12, 10, 10, 10]
      );

      appendSheet(
        "Operarios",
        operatorStats.map((item) => ({
          Código: item.username,
          Operario: item.name,
          Controles: item.controls,
          "Cajas imputadas": item.boxes,
          "Piezas imputadas": item.pieces,
          "% OK": item.okRate,
        })),
        [12, 30, 12, 18, 20, 10]
      );

      appendSheet(
        "Controles",
        filteredRecords.map((record) => ({
          Fecha: fullDate(record.fecha || record.createdAt),
          Turno: record.turno || "",
          Máquina: record.maquina || "",
          Pieza: record.numeroPieza || "",
          Operario: record.operario || "",
          Resultado: record.resultado || "",
        })),
        [14, 10, 24, 12, 30, 12]
      );

      appendSheet(
        "Cajas",
        boxesForExport.map((box) => ({
          "Número de caja": box.numeroCaja,
          Fecha: fullDate(box.date),
          Operarios: box.operators,
          "Cajas imputadas": box.boxes,
          "Piezas imputadas": box.pieces,
        })),
        [22, 14, 24, 18, 20]
      );

      XLSX.writeFile(workbook, `${exportBaseName}.xlsx`);
    } catch (error) {
      console.error("Error exportando estadísticas a Excel:", error);
      alert("No se ha podido generar el archivo Excel.");
    } finally {
      setExporting("");
    }
  };

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(
        "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes e inténtalo de nuevo."
      );
      return;
    }

    setExporting("pdf");

    const allNok = filteredRecords.filter(
      (record) => record.resultado === "NO OK"
    );

    const summaryCards = [
      ["Controles", statistics.controls],
      ["Resultado OK", `${statistics.okRate}%`],
      ["NO OK", statistics.nok],
      ["Cajas", formatAllocation(statistics.boxes)],
      ["Piezas", formatAllocation(statistics.pieces)],
    ];

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(exportBaseName)}</title>
          <style>
            @page { size: A4 landscape; margin: 11mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              background: #fff;
            }
            header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 3px solid #1d4ed8;
              padding-bottom: 10px;
            }
            h1 { margin: 3px 0 0; font-size: 24px; }
            h2 {
              margin: 22px 0 8px;
              color: #1e3a8a;
              font-size: 15px;
            }
            .eyebrow {
              color: #1d4ed8;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .meta { color: #475569; font-weight: 700; text-align: right; }
            .filters {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 7px;
              margin-top: 12px;
            }
            .filter, .card {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 8px;
              background: #f8fafc;
            }
            .filter strong, .card span {
              display: block;
              margin-bottom: 4px;
              color: #64748b;
              font-size: 9px;
              text-transform: uppercase;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 8px;
              margin-top: 12px;
            }
            .card b { font-size: 20px; }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr { page-break-inside: avoid; }
            th {
              padding: 7px;
              color: #fff;
              text-align: left;
              background: #1e3a8a;
            }
            td {
              padding: 6px 7px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .two-columns {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              align-items: start;
            }
            .empty { padding: 18px; color: #64748b; text-align: center; }
            .note {
              margin-top: 12px;
              color: #475569;
              font-size: 9px;
              font-weight: 700;
            }
            footer {
              margin-top: 18px;
              border-top: 1px solid #cbd5e1;
              padding-top: 7px;
              color: #64748b;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="eyebrow">FM Control · ${escapeHtml(referenceCode)}</div>
              <h1>Estadísticas de producción</h1>
            </div>
            <div class="meta">
              Generado el ${escapeHtml(new Date().toLocaleString("es-ES"))}
            </div>
          </header>

          <div class="filters">
            ${exportFilters
              .map(
                ([label, value]) =>
                  `<div class="filter"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`
              )
              .join("")}
          </div>

          <div class="summary">
            ${summaryCards
              .map(
                ([label, value]) =>
                  `<div class="card"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`
              )
              .join("")}
          </div>

          <div class="two-columns">
            <section>
              <h2>Resultado por máquina</h2>
              ${printableTable(
                ["Máquina", "Controles", "NO OK", "% OK"],
                machineStats.map((item) => [
                  item.machine,
                  item.total,
                  item.nok,
                  `${item.okRate}%`,
                ])
              )}
            </section>
            <section>
              <h2>Actividad por operario</h2>
              ${printableTable(
                ["Operario", "Controles", "Cajas imputadas", "Piezas imputadas", "% OK"],
                operatorStats.map((item) => [
                  `${item.username} · ${item.name}`,
                  item.controls,
                  formatAllocation(item.boxes),
                  formatAllocation(item.pieces),
                  `${item.okRate}%`,
                ])
              )}
            </section>
          </div>

          <h2>Evolución diaria</h2>
          ${printableTable(
            ["Fecha", "OK", "NO OK", "Cajas", "Piezas"],
            dailyData.map((item) => [
              fullDate(item.date),
              item.ok,
              item.nok,
              formatAllocation(item.boxes),
              formatAllocation(item.pieces),
            ])
          )}

          <h2>Cajas registradas</h2>
          ${printableTable(
            ["Número de caja", "Fecha", "Operarios", "Cajas imputadas", "Piezas imputadas"],
            boxesForExport.map((box) => [
              box.numeroCaja,
              fullDate(box.date),
              box.operators || "-",
              formatAllocation(box.boxes),
              formatAllocation(box.pieces),
            ])
          )}

          <h2>Controles NO OK</h2>
          ${printableTable(
            ["Fecha", "Pieza", "Máquina", "Turno", "Operario"],
            allNok.map((record) => [
              fullDate(record.fecha || record.createdAt),
              record.numeroPieza || "-",
              record.maquina || "-",
              record.turno || "-",
              record.operario || "-",
            ])
          )}

          <p class="note">
            Las cajas compartidas se reparten proporcionalmente entre sus operarios y solo suman una vez en el total.
          </p>
          <footer>FM Control · Fabrimotor · Informe generado automáticamente</footer>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    let printStarted = false;
    const startPrint = () => {
      if (printStarted || printWindow.closed) return;

      printStarted = true;
      printWindow.focus();
      printWindow.print();
      setExporting("");
    };

    printWindow.onload = startPrint;
    window.setTimeout(startPrint, 500);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMachine("");
    setShift("");
    setOperator("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-2 sm:p-4 lg:pt-8">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">
              FM Control · Estadísticas
            </div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Estadísticas de producción
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Calidad, cajas y rendimiento con filtros combinados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={Boolean(exporting)}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              <FileText className="h-5 w-5" />
              {exporting === "pdf" ? "Preparando..." : "PDF"}
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={Boolean(exporting)}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              <FileSpreadsheet className="h-5 w-5" />
              {exporting === "excel" ? "Preparando..." : "Excel"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label="Cerrar estadísticas"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[190px_190px_1fr_150px_1fr_auto]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-500">
                  Desde
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-300 px-3 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-500">
                  Hasta
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-300 px-3 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-500">
                  Máquina
                </span>
                <select
                  value={machine}
                  onChange={(event) => setMachine(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  {machines.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-500">
                  Turno
                </span>
                <select
                  value={shift}
                  onChange={(event) => setShift(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="M">Mañana</option>
                  <option value="T">Tarde</option>
                  <option value="N">Noche</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-500">
                  Operario
                </span>
                <select
                  value={operator}
                  onChange={(event) => setOperator(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-bold outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {operators.map((user) => (
                    <option key={user.username} value={user.username}>
                      {user.username} · {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white"
              >
                <FilterX className="h-5 w-5" />
                Limpiar
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Los filtros de máquina y turno afectan a controles de calidad; fecha y operario también filtran la producción.
            </p>
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              icon={BarChart3}
              label="Controles"
              value={statistics.controls}
              detail={`${statistics.ok} OK · ${statistics.nok} NO OK`}
            />
            <KpiCard
              icon={CheckCircle2}
              label="Resultado OK"
              value={`${statistics.okRate}%`}
              detail="sobre controles filtrados"
              tone="green"
            />
            <KpiCard
              icon={ShieldAlert}
              label="No OK"
              value={statistics.nok}
              detail="controles fuera de especificación"
              tone="red"
            />
            <KpiCard
              icon={Boxes}
              label="Cajas"
              value={formatAllocation(statistics.boxes)}
              detail="cajas únicas registradas"
              tone="amber"
            />
            <KpiCard
              icon={Boxes}
              label="Piezas"
              value={formatAllocation(statistics.pieces)}
              detail="según etiquetas registradas"
              tone="slate"
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                Calidad
              </div>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                Evolución diaria de controles
              </h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ok" name="OK" stackId="controls" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="nok" name="NO OK" stackId="controls" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Producción
              </div>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                Cajas y piezas por día
              </h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="boxes" name="Cajas" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="pieces" name="Piezas" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black text-slate-950">
                Resultado por máquina
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                      <th className="px-3 py-3">Máquina</th>
                      <th className="px-3 py-3 text-right">Controles</th>
                      <th className="px-3 py-3 text-right">NO OK</th>
                      <th className="px-3 py-3 text-right">% OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machineStats.map((item) => (
                      <tr key={item.machine} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-black text-slate-900">{item.machine}</td>
                        <td className="px-3 py-3 text-right font-bold">{item.total}</td>
                        <td className="px-3 py-3 text-right font-black text-red-600">{item.nok}</td>
                        <td className="px-3 py-3 text-right font-black text-emerald-700">{item.okRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!machineStats.length && (
                  <div className="py-8 text-center text-sm font-bold text-slate-500">
                    Sin datos para los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black text-slate-950">
                Actividad por operario
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Las cajas compartidas se reparten entre sus operarios para que cada caja sume una sola vez.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                      <th className="px-3 py-3">Operario</th>
                      <th className="px-3 py-3 text-right">Controles</th>
                      <th className="px-3 py-3 text-right">Cajas imputadas</th>
                      <th className="px-3 py-3 text-right">Piezas imputadas</th>
                      <th className="px-3 py-3 text-right">% OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorStats.map((item) => (
                      <tr key={item.username} className="border-b border-slate-100">
                        <td className="px-3 py-3">
                          <div className="font-black text-slate-900">{item.username}</div>
                          <div className="text-xs font-bold text-slate-500">{item.name}</div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{item.controls}</td>
                        <td className="px-3 py-3 text-right font-bold">{formatAllocation(item.boxes)}</td>
                        <td className="px-3 py-3 text-right font-bold">{formatAllocation(item.pieces)}</td>
                        <td className="px-3 py-3 text-right font-black text-emerald-700">{item.okRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!operatorStats.length && (
                  <div className="py-8 text-center text-sm font-bold text-slate-500">
                    Sin actividad para los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                  Calidad
                </div>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Últimos controles NO OK
                </h3>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                {statistics.nok} encontrados
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {recentNok.map((record, index) => (
                <div
                  key={record.id || `${record.numeroPieza}-${index}`}
                  className="rounded-2xl border border-red-100 bg-red-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-950">
                        Pieza {record.numeroPieza || "-"} · {record.maquina || "-"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {fullDate(record.fecha || record.createdAt)} · Turno {record.turno || "-"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-600">
                        {record.operario || "Operario no indicado"}
                      </div>
                    </div>
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                      NO OK
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!recentNok.length && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm font-bold text-slate-500">
                No hay controles NO OK para los filtros seleccionados.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
