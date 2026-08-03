function formatExpeditionDate(date) {
  if (!date) return "Sin fecha";

  return date.split("-").reverse().join("/");
}

function getExpeditionStatus(date) {
  if (!date) {
    return {
      label: "SIN FECHA",
      className: "text-slate-400",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expedition = new Date(`${date}T00:00:00`);
  const differenceMs = expedition.getTime() - today.getTime();
  const differenceDays = Math.round(
    differenceMs / (1000 * 60 * 60 * 24)
  );

  if (differenceDays < 0) {
    return {
      label: "⚠ VENCIDA",
      className: "text-red-400",
    };
  }

  if (differenceDays === 0) {
    return {
      label: "● EXPEDICIÓN HOY",
      className: "text-emerald-400",
    };
  }

  if (differenceDays === 1) {
    return {
      label: "MAÑANA",
      className: "text-amber-300",
    };
  }

  return {
    label: `EN ${differenceDays} DÍAS`,
    className: "text-blue-300",
  };
}

function DashboardMetric({
  icon,
  label,
  value,
  detail,
  footer,
  footerClassName = "text-slate-300",
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-inner">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-300">
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </div>

      <div className="mt-3 text-2xl font-black leading-none text-white">
        {value}
      </div>

      {detail && (
        <div className="mt-2 text-sm font-bold text-slate-300">
          {detail}
        </div>
      )}

      {footer && (
        <div
          className={`mt-3 text-xs font-black uppercase tracking-wide ${footerClassName}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export default function TruckDashboardCard({
  activeTruck,
  truckProgress,
  currentUser,
}) {
  const truckNumber = activeTruck?.truck_number ?? "—";
  const truckStatus = activeTruck?.status || "OPEN";

  const expeditionDate =
    activeTruck?.planned_expedition_date || "";

  const expeditionStatus =
    getExpeditionStatus(expeditionDate);

  const completedBoxes =
    truckProgress?.completedBoxes ?? 0;

  const targetBoxes =
    truckProgress?.targetBoxes ?? 49;

  const remainingBoxes =
    truckProgress?.remainingBoxes ?? targetBoxes;

  const percent = Math.round(
    truckProgress?.percent ?? 0
  );

  const piecesPerBox = 16;
  const completedPieces =
    completedBoxes * piecesPerBox;
  const targetPieces =
    targetBoxes * piecesPerBox;

  const lastBox =
    truckProgress?.lastBox?.numeroCaja ||
    "Sin cajas registradas";

  const lastBoxPieces =
    truckProgress?.lastBox?.totalPiezas ?? 0;

  const lastOperator =
    truckProgress?.lastBox?.operario ||
    currentUser?.username ||
    "—";

  const lastOperatorName =
    currentUser?.name || "";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-700 bg-gradient-to-br from-slate-950 via-[#07162f] to-[#0b2b53] text-white shadow-2xl">
      {/* CABECERA */}
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
            Camión activo
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-400/40 bg-blue-400/10 text-2xl">
              🚚
            </div>

            <div>
              <div className="text-sm font-bold text-slate-300">
                Camión
              </div>

              <div className="text-4xl font-black leading-none">
                {truckNumber}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-full border border-emerald-300/30 bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg">
          {truckStatus}
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-3 gap-3 px-5 pb-4">
        <DashboardMetric
          icon="🗓️"
          label="Expedición"
          value={formatExpeditionDate(expeditionDate)}
          footer={expeditionStatus.label}
          footerClassName={expeditionStatus.className}
        />

        <DashboardMetric
          icon="📦"
          label="Restantes"
          value={remainingBoxes}
          detail="cajas"
        />

        <DashboardMetric
          icon="🎯"
          label="Objetivo"
          value={targetBoxes}
          detail="cajas"
        />
      </div>

      {/* PROGRESO BLANCO */}
      <div className="mx-5 rounded-3xl bg-white p-5 text-slate-950 shadow-xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-4xl font-black leading-none">
              <span className="text-blue-700">
                {completedBoxes}
              </span>

              <span className="ml-2 text-xl text-slate-400">
                / {targetBoxes} cajas
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-4xl font-black leading-none text-blue-700">
              {percent}%
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Ocupación
            </div>
          </div>
        </div>

        <div className="mt-5 h-6 overflow-hidden rounded-full bg-slate-200 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(percent, 100)}%`,
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 text-sm font-black text-slate-600">
          <div>
            📦 {completedBoxes} cajas completadas
          </div>

          <div>
            ⚙️ {completedPieces} / {targetPieces} piezas
          </div>
        </div>
      </div>

      {/* ÚLTIMA CAJA */}
      <div className="m-5 rounded-3xl border border-blue-400/40 bg-white/[0.07] p-5 shadow-inner">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
              Última caja realizada
            </div>

            <div className="mt-2 text-3xl font-black tracking-tight text-white">
              {lastBox}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-300/40 bg-blue-500/10 px-4 py-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wide text-blue-300">
              Piezas
            </div>

            <div className="mt-1 text-2xl font-black text-white">
              {lastBoxPieces}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Operario
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {lastOperator}
              {lastOperatorName
                ? ` · ${lastOperatorName.toUpperCase()}`
                : ""}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Estado
            </div>

            <div className="mt-1 text-sm font-black text-emerald-300">
              ● Caja registrada
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}