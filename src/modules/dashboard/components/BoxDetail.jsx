import { memo } from "react";
import FmBadge from "../../../components/ui/FmBadge";
import FmButton from "../../../components/ui/FmButton";
import FmCard from "../../../components/ui/FmCard";
import FmEmptyState from "../../../components/ui/FmEmptyState";
import FmInput from "../../../components/ui/FmInput";
import FmSectionTitle from "../../../components/ui/FmSectionTitle";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <span className="text-right font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

function BoxDetail({
  selectedBox,
  currentTruck,
  newExpeditionDate,
  setNewExpeditionDate,
  handleSaveExpeditionDate,
  canEditExpeditionDate,
}) {
  const truckStatus =
    currentTruck?.status || currentTruck?.estado || "SIN ESTADO";

  return (
    <FmCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <FmSectionTitle
          eyebrow="Trazabilidad"
          title="Detalle de caja"
          description="Información de la caja seleccionada y del camión asociado."
        />

        {currentTruck && (
          <FmBadge
            color={
              truckStatus === "OPEN"
                ? "green"
                : truckStatus === "PLANNED"
                ? "blue"
                : "slate"
            }
          >
            {truckStatus}
          </FmBadge>
        )}
      </div>

      {!selectedBox ? (
        <div className="mt-4">
          <FmEmptyState
            title="Selecciona una caja"
            description="Pulsa una caja del mapa para consultar su trazabilidad."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="rounded-3xl bg-slate-900 p-5 text-white">
            <div className="text-xs font-black uppercase tracking-wide text-slate-300">
              Caja
            </div>

            <div className="mt-1 text-4xl font-black">
              {selectedBox.numeroCaja}
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <InfoRow
              label="Camión"
              value={
                currentTruck?.truck_code ||
                currentTruck?.truck_number ||
                "-"
              }
            />

            <InfoRow
              label="Operario"
              value={selectedBox.operario || "-"}
            />

            <InfoRow
              label="Fecha"
              value={selectedBox.fecha || "-"}
            />

            <InfoRow
              label="Semana"
              value={selectedBox.semana || "-"}
            />

            <InfoRow
              label="Día"
              value={selectedBox.dia || "-"}
            />

            <InfoRow
              label="Piezas"
              value={selectedBox.totalPiezas || 0}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Fabricaciones / coladas
            </div>

            {(selectedBox.combinaciones || []).length === 0 ? (
              <FmEmptyState
                title="Sin datos de fabricación"
                description="La caja no tiene combinaciones de fabricación y colada."
              />
            ) : (
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                {(selectedBox.combinaciones || []).map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-xl bg-white px-3 py-2 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTruck && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Fecha prevista expedición
          </div>

          {canEditExpeditionDate ? (
            <div className="flex gap-2">
              <FmInput
                type="date"
                className="min-w-0 flex-1 text-sm font-bold"
                value={newExpeditionDate || ""}
                onChange={(e) =>
                  setNewExpeditionDate(e.target.value)
                }
              />

              <FmButton
                variant="dark"
                className="min-h-0 px-3 py-2 text-xs"
                onClick={handleSaveExpeditionDate}
              >
                Guardar
              </FmButton>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-900">
              {currentTruck?.planned_expedition_date
                ? currentTruck.planned_expedition_date
                    .split("-")
                    .reverse()
                    .join("/")
                : "Sin fecha prevista"}
            </div>
          )}
        </div>
      )}
    </FmCard>
  );
}

export default memo(BoxDetail);