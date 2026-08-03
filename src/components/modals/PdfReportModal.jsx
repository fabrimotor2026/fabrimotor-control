import { Printer, X } from "lucide-react";
import { Button } from "../ui/button";
import Field from "../common/Field";
import PdfMachineReport from "./PdfMachineReport";
import {
  MACHINES,
  MODAL_OVERLAY_STYLE,
  MODAL_PANEL_XL_STYLE,
} from "../../data/constants";

export default function PdfReportModal({
  onClose,
  printPdfReport,
  pdfFilteredRecords,
  pdfDateFrom,
  setPdfDateFrom,
  pdfDateTo,
  setPdfDateTo,
  pdfTurno,
  setPdfTurno,
  pdfOperario,
  setPdfOperario,
  pdfPieza,
  setPdfPieza,
  pdfMaquina,
  setPdfMaquina,
  numeroPiezaInputRef,
  form,
  setForm,
  pdfRecordsByMachine,
  buildReportSheetName,
}) {
  const clearFilters = () => {
    setPdfDateFrom("");
    setPdfDateTo("");
    setPdfTurno("");
    setPdfOperario("");
    setPdfPieza("");
    setPdfMaquina("");
  };

  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_XL_STYLE}>
        <div className="no-print flex items-center justify-between border-b border-slate-600 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Informe de mediciones registradas
            </h2>

            <p className="text-sm text-slate-500">
              Registros separados por máquina · F-1012 Célula B
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={printPdfReport} className="rounded-xl">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir / Guardar PDF
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-100"
              aria-label="Cerrar informe PDF"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="no-print border-b border-slate-200 bg-slate-50 p-5">
          <div className="mb-3 text-sm font-bold text-slate-700">
            Filtros para PDF registros · {pdfFilteredRecords.length} registros
            encontrados
          </div>

          <div className="grid gap-3 md:grid-cols-6">
            <Field label="Desde fecha">
              <input
                type="date"
                className="input"
                value={pdfDateFrom}
                onChange={(event) => setPdfDateFrom(event.target.value)}
              />
            </Field>

            <Field label="Hasta fecha">
              <input
                type="date"
                className="input"
                value={pdfDateTo}
                onChange={(event) => setPdfDateTo(event.target.value)}
              />
            </Field>

            <Field label="Turno">
              <select
                className="input"
                value={pdfTurno}
                onChange={(event) => setPdfTurno(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="M">M (Mañana)</option>
                <option value="T">T (Tarde)</option>
                <option value="N">N (Noche)</option>
              </select>
            </Field>

            <Field label="Nº Operario">
              <input
                className="input"
                placeholder="Ej. 105"
                value={pdfOperario}
                onChange={(event) => setPdfOperario(event.target.value)}
              />
            </Field>

            <Field label="Número de pieza">
              <input
                ref={numeroPiezaInputRef}
                className="input text-lg font-black"
                value={form.numeroPieza}
                onChange={(event) =>
                  setForm({
                    ...form,
                    numeroPieza: event.target.value,
                  })
                }
                placeholder="Introduce número de pieza"
              />
            </Field>

            <Field label="Nº Pieza">
              <input
                className="input"
                placeholder="Ej. 64"
                value={pdfPieza}
                onChange={(event) => setPdfPieza(event.target.value)}
              />
            </Field>

            <Field label="Máquina">
              <select
                className="input"
                value={pdfMaquina}
                onChange={(event) => setPdfMaquina(event.target.value)}
              >
                <option value="">Todas</option>

                {Object.keys(MACHINES).map((machine) => (
                  <option key={machine} value={machine}>
                    {machine}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={clearFilters}
            >
              Limpiar filtros PDF
            </Button>
          </div>
        </div>

        <div
          id="pdf-report"
          className="overflow-auto p-6 text-slate-900 print:p-0"
        >
          <PdfMachineReport
            title="TORNO HYUNDAI"
            machineName="Torno Hyundai"
            records={pdfRecordsByMachine("Torno Hyundai")}
            buildReportSheetName={buildReportSheetName}
          />
          
          <div className="my-8 print:my-4 print:break-after-page" />
          
          <PdfMachineReport
            title="CENTRO NEWAY"
            machineName="Centro NEWAY"
            records={pdfRecordsByMachine("Centro NEWAY")}
            buildReportSheetName={buildReportSheetName}
          />
        </div>
      </div>
    </div>
  );
}