import { Save, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import ControlStatusSummary from "../../components/common/ControlStatusSummary";

export default function ControlProcessPanel({
  children,
  form,
  setForm,
  validation,
  overallOk,
  saveRecord,
  setIncidentForm,
  setShowIncidentModal,
  operatorLastBox,
  numeroPiezaInputRef,
}) {
  return (
    <>
      {children}

      <ControlStatusSummary
        validation={validation}
        overallOk={overallOk}
      />

      <Button
        onClick={saveRecord}
        className="w-full rounded-2xl py-6 text-base shadow-md"
      >
        <Save className="mr-2 h-5 w-5" />
        Guardar control de proceso
      </Button>

      <Button
        onClick={() => {
          setIncidentForm((previous) => ({
            ...previous,
            numeroPieza: operatorLastBox?.lastPiece || "",
          }));
          setShowIncidentModal(true);
        }}
        className="w-full rounded-2xl bg-red-600 py-6 text-base text-white shadow-md"
      >
        <AlertTriangle className="mr-2 h-5 w-5" />
        Registrar pieza NO OK
      </Button>
    </>
  );
}