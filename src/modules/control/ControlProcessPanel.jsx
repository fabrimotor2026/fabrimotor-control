import { Save } from "lucide-react";

import FmButton from "../../components/ui/FmButton";
import FmCard from "../../components/ui/FmCard";
import FmSectionTitle from "../../components/ui/FmSectionTitle";
import FmTextarea from "../../components/ui/FmTextarea";

export default function ControlProcessPanel({
  form,
  setForm,
  overallOk,
  saveRecord,
  Field,
}) {
  return (
    <FmCard className="mt-4">
      <FmSectionTitle
        eyebrow="Finalización"
        title="Guardar control de proceso"
        description="Revisa el resultado, añade observaciones y guarda la verificación."
      />

      <div className="mt-5 grid gap-4">
        {overallOk === false && (
          <Field label="Resumen general del rechazo (opcional)">
            <FmTextarea
              rows={3}
              className="border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
              placeholder="Describe el defecto que ha generado el rechazo..."
              value={form.rechazoTipo}
              onChange={(e) =>
                setForm({
                  ...form,
                  rechazoTipo: e.target.value,
                })
              }
            />
          </Field>
        )}

        <Field label="Observaciones">
          <FmTextarea
            rows={4}
            placeholder="Añade cualquier observación relevante..."
            value={form.observaciones}
            onChange={(e) =>
              setForm({
                ...form,
                observaciones: e.target.value,
              })
            }
          />
        </Field>

        <FmButton
          onClick={saveRecord}
          className="w-full py-4 text-base"
        >
          <Save className="h-5 w-5" />
          Guardar control de proceso
        </FmButton>
      </div>
    </FmCard>
  );
}