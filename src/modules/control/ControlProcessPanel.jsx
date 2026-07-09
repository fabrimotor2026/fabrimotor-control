import { Save } from "lucide-react";
import { Button } from "../../components/ui/button";

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
  Field,
}) {
  return (
    <>
          
      {overallOk === false && (
  <Field label="Resumen general del rechazo (opcional)">
    <textarea
      className="input min-h-[80px] border-red-300 bg-red-50"
      placeholder="Describe el defecto que ha generado el rechazo..."
      value={form.rechazoTipo}
      onChange={(e) =>
        setForm({ ...form, rechazoTipo: e.target.value })
      }
    />
  </Field>
)}

<Field label="Observaciones">
  <textarea
    className="input min-h-[100px]"
    value={form.observaciones}
    onChange={(e) =>
      setForm({ ...form, observaciones: e.target.value })
    }
  />
</Field>

      <Button
        onClick={saveRecord}
        className="w-full rounded-2xl py-6 text-base shadow-md"
      >
        <Save className="mr-2 h-5 w-5" />
        Guardar control de proceso
      </Button>      
    </>
  );
}