export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function initialForm() {
  return {
    maquina: "Torno Hyundai",
    fecha: today(),
    turno: "M",
    operario: "",
    numeroPieza: "",
    rechazoTipo: "",
    observaciones: "",
  };
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function turnoLabel(turno) {
  const labels = {
    M: "M (Mañana)",
    T: "T (Tarde)",
    N: "N (Noche)",
  };

  return labels[turno] || turno || "";
}


export function buildReportSheetName(data) {
  if (!data?.fecha || !data?.turno || !data?.maquina) {
    return data?.hojaNombre || "";
  }

  return `${data.fecha} · ${turnoLabel(data.turno)} · ${data.maquina}`;
}

