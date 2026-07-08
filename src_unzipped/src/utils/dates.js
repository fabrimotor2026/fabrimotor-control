export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function turnoLabel(turno) {
  const labels = { M: "M (Mañana)", T: "T (Tarde)", N: "N (Noche)" };
  return labels[turno] || turno || "";
}
