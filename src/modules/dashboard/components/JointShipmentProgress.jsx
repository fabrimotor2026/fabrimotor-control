import { useCallback, useEffect, useState } from "react";
import {
  buildJointShipmentProgress,
  fetchJointShipmentBoxes,
  fetchJointShipmentProgress,
} from "../../../services/jointShipmentService";

function normalizeReference(value) {
  return String(value || "")
    .toUpperCase()
    .replace("-", "");
}

function buildPackingRows(labels) {
  const boxes = new Map();

  for (const label of labels || []) {
    const reference = normalizeReference(label.reference);
    const boxNumber = String(
      label.numero_caja || label.numeroCaja || ""
    ).trim();

    if (!["F1012", "F1013"].includes(reference) || !boxNumber) {
      continue;
    }

    const key = `${reference}|${boxNumber}`;
    const previous = boxes.get(key) || {
      Referencia: reference,
      Caja: boxNumber,
      Piezas: 0,
      Fabricaciones: new Set(),
      Coladas: new Set(),
      Fecha: label.fecha || "",
      Operarios: new Set(),
    };

    previous.Piezas += Number(
      label.cantidad || label.piezas || 0
    );
    if (label.fabricacion) previous.Fabricaciones.add(label.fabricacion);
    if (label.colada) previous.Coladas.add(label.colada);
    if (label.operario1) previous.Operarios.add(label.operario1);
    if (label.operario2) previous.Operarios.add(label.operario2);
    boxes.set(key, previous);
  }

  return [...boxes.values()]
    .map((box) => ({
      Referencia: box.Referencia,
      Caja: box.Caja,
      Piezas: box.Piezas,
      Fabricaciones: [...box.Fabricaciones].join(", "),
      Coladas: [...box.Coladas].join(", "),
      Fecha: box.Fecha,
      Operarios: [...box.Operarios].join(" / "),
    }))
    .sort(
      (first, second) =>
        first.Referencia.localeCompare(second.Referencia) ||
        first.Caja.localeCompare(second.Caja, undefined, {
          numeric: true,
        })
    );
}

function safeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function packingFileBase(truck, progress) {
  const date =
    safeFilePart(progress?.actualExpeditionDate) ||
    `Camion_${safeFilePart(truck?.truck_number || "SinNumero")}`;

  return `F1012_F1013_${date}_Packing_List`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ReferenceProgress({
  reference,
  completed,
  target,
  percent,
  ready,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        ready
          ? "border-emerald-200 bg-emerald-50"
          : "border-blue-200 bg-blue-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Referencia
          </div>
          <div className="mt-1 text-2xl font-black text-slate-950">
            {reference}
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
            ready
              ? "bg-emerald-200 text-emerald-800"
              : "bg-white text-blue-800"
          }`}
        >
          {ready ? "Completa" : `${target - completed} pendientes`}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="text-3xl font-black text-slate-950">
          {completed}
          <span className="text-lg text-slate-500"> / {target}</span>
        </span>
        <span className="text-sm font-black text-slate-600">
          {percent}%
        </span>
      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full transition-all ${
            ready ? "bg-emerald-500" : "bg-blue-600"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function JointShipmentProgress({
  supabase,
  truck,
  onProgress,
}) {
  const [progress, setProgress] = useState(() =>
    buildJointShipmentProgress({
      truck_number: truck?.truck_number,
    })
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const loadProgress = useCallback(async () => {
    if (!truck?.truck_number) return null;

    setLoading(true);
    setError("");

    try {
      const result = await fetchJointShipmentProgress(supabase, {
        shipmentId: truck?.joint_shipment_id,
        truckNumber: truck?.truck_number,
      });
      const normalized =
        result ||
        buildJointShipmentProgress({
          truck_number: truck.truck_number,
        });

      setProgress(normalized);
      onProgress?.(normalized);
      return normalized;
    } catch (loadError) {
      setError(
        loadError?.message ||
          "No se ha podido cargar la expedición conjunta."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    onProgress,
    supabase,
    truck?.joint_shipment_id,
    truck?.truck_number,
  ]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (!truck?.joint_shipment_id) return undefined;

    const channel = supabase
      .channel(`joint-shipment-v238-${truck.joint_shipment_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "f1012_box_labels",
          filter: `joint_shipment_id=eq.${truck.joint_shipment_id}`,
        },
        loadProgress
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fmcontrol_joint_shipments",
          filter: `id=eq.${truck.joint_shipment_id}`,
        },
        loadProgress
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProgress, supabase, truck?.joint_shipment_id]);

  const loadPackingRows = async () => {
    if (!truck?.joint_shipment_id) {
      throw new Error(
        "Este camión todavía no está enlazado con la expedición conjunta."
      );
    }

    const labels = await fetchJointShipmentBoxes(
      supabase,
      truck.joint_shipment_id
    );

    return buildPackingRows(labels);
  };

  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setError("");

    try {
      const rows = await loadPackingRows();
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summaryRows = [
        ["EXPEDICIÓN CONJUNTA", `Camión ${truck.truck_number}`],
        ["Referencia F1013", `${progress.f1013} / 49 cajas`],
        ["Referencia F1012", `${progress.f1012} / 49 cajas`],
        ["TOTAL", `${progress.total} / 98 cajas`],
        ["Fecha real de expedición", progress.actualExpeditionDate || ""],
        ["Matrícula tractora", progress.tractorPlate || ""],
        ["Matrícula remolque", progress.trailerPlate || ""],
        ["Brida / precinto", progress.sealNumber || ""],
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(summaryRows),
        "Resumen"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          rows.filter((row) => row.Referencia === "F1013")
        ),
        "F1013"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          rows.filter((row) => row.Referencia === "F1012")
        ),
        "F1012"
      );
      XLSX.writeFile(
        workbook,
        `${packingFileBase(truck, progress)}.xlsx`
      );
    } catch (exportError) {
      setError(
        exportError?.message ||
          "No se ha podido generar el Excel conjunto."
      );
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    setError("");

    try {
      const rows = await loadPackingRows();
      const popup = window.open("", "_blank");

      if (!popup) {
        throw new Error(
          "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes."
        );
      }

      const section = (reference) => {
        const referenceRows = rows.filter(
          (row) => row.Referencia === reference
        );

        return `
          <h2>${reference} · ${referenceRows.length}/49 cajas</h2>
          <table>
            <thead><tr><th>Caja</th><th>Piezas</th><th>Fabricaciones</th><th>Coladas</th><th>Fecha</th><th>Operarios</th></tr></thead>
            <tbody>${referenceRows
              .map(
                (row) => `<tr>
                  <td>${escapeHtml(row.Caja)}</td>
                  <td>${escapeHtml(row.Piezas)}</td>
                  <td>${escapeHtml(row.Fabricaciones)}</td>
                  <td>${escapeHtml(row.Coladas)}</td>
                  <td>${escapeHtml(row.Fecha)}</td>
                  <td>${escapeHtml(row.Operarios)}</td>
                </tr>`
              )
              .join("")}</tbody>
          </table>`;
      };

      popup.document.write(`<!doctype html>
        <html lang="es"><head><meta charset="utf-8">
        <title>${escapeHtml(packingFileBase(truck, progress))}</title>
        <style>
          @page{size:A4 landscape;margin:12mm}
          body{font-family:Arial,sans-serif;color:#0f172a}
          h1{margin:0 0 4px} h2{margin:18px 0 8px}
          .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}
          .meta div{border:1px solid #cbd5e1;border-radius:8px;padding:8px}
          table{width:100%;border-collapse:collapse;font-size:10px}
          th,td{border:1px solid #cbd5e1;padding:5px;text-align:left}
          th{background:#e2e8f0}
        </style></head><body>
        <h1>Packing List conjunto · Camión ${escapeHtml(truck.truck_number)}</h1>
        <p>F1013 + F1012 · ${progress.total}/98 cajas</p>
        <div class="meta">
          <div><b>Fecha expedición</b><br>${escapeHtml(progress.actualExpeditionDate || "-")}</div>
          <div><b>Tractora</b><br>${escapeHtml(progress.tractorPlate || "-")}</div>
          <div><b>Remolque</b><br>${escapeHtml(progress.trailerPlate || "-")}</div>
          <div><b>Brida / precinto</b><br>${escapeHtml(progress.sealNumber || "-")}</div>
        </div>
        ${section("F1013")}
        ${section("F1012")}
        <script>window.addEventListener("load",()=>window.print())<\/script>
        </body></html>`);
      popup.document.close();
    } catch (exportError) {
      setError(
        exportError?.message ||
          "No se ha podido generar el PDF conjunto."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="mt-6 rounded-[1.5rem] border border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Expedición conjunta · V2.38
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Camión {truck?.truck_number || "-"} · F1013 + F1012
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            El camión se completa con 49 cajas de cada referencia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            PDF conjunto
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            Excel conjunto
          </button>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
              progress.ready
                ? "bg-emerald-100 text-emerald-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {loading
              ? "Actualizando"
              : progress.ready
                ? "Carga completa"
                : `${progress.pendingTotal} cajas pendientes`}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ReferenceProgress
          reference="F1013"
          completed={progress.f1013}
          target={progress.targetF1013}
          percent={progress.percentF1013}
          ready={progress.readyF1013}
        />
        <ReferenceProgress
          reference="F1012"
          completed={progress.f1012}
          target={progress.targetF1012}
          percent={progress.percentF1012}
          ready={progress.readyF1012}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Total del camión
            </div>
            <div className="mt-1 text-3xl font-black">
              {progress.total}
              <span className="text-lg text-slate-400">
                {" "}
                / {progress.targetTotal} cajas
              </span>
            </div>
          </div>
          <div className="text-2xl font-black">
            {progress.percentTotal}%
          </div>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${
              progress.ready ? "bg-emerald-400" : "bg-blue-500"
            }`}
            style={{ width: `${progress.percentTotal}%` }}
          />
        </div>
      </div>
    </section>
  );
}
