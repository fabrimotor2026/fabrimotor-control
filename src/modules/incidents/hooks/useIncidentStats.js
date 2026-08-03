import { useMemo } from "react";

export default function useIncidentStats({
  incidents = [],
  selectedDate = "",
} = {}) {
  return useMemo(() => {
    const currentDate = selectedDate || "";

    const currentMonthKey = currentDate
      ? currentDate.slice(0, 7)
      : "";

    const currentDateIncidents = incidents.filter(
      (incident) => incident.fecha === currentDate
    );

    const currentMonthIncidents = incidents.filter(
      (incident) =>
        currentMonthKey &&
        String(incident.fecha || "").startsWith(currentMonthKey)
    );

    const qualityCostToday = currentDateIncidents.reduce(
      (sum, incident) =>
        sum + Number(incident.costeTotal || 0),
      0
    );

    const qualityCostMonth = currentMonthIncidents.reduce(
      (sum, incident) =>
        sum + Number(incident.costeTotal || 0),
      0
    );

    const scrapPiecesMonth = currentMonthIncidents
      .filter((incident) => incident.chatarra === "SI")
      .reduce(
        (sum, incident) =>
          sum + Number(incident.piezasAfectadas || 0),
        0
      );

    const totalIncidencias = incidents.length;

    const accionesAbiertas = incidents.filter(
      (incident) => incident.estadoAccion === "Abierta"
    ).length;

    const accionesCerradas = incidents.filter(
      (incident) => incident.estadoAccion === "Cerrada"
    ).length;

    const costeTotalCalidad = incidents.reduce(
      (sum, incident) =>
        sum + Number(incident.costeTotal || 0),
      0
    );

    const pendingIncidents = incidents.filter(
      (incident) =>
        (incident.estadoCalidad || "Pendiente") === "Pendiente"
    ).length;

    return {
      currentDateIncidents,
      currentMonthIncidents,
      qualityCostToday,
      qualityCostMonth,
      scrapPiecesMonth,
      totalIncidencias,
      accionesAbiertas,
      accionesCerradas,
      costeTotalCalidad,
      pendingIncidents,
    };
  }, [incidents, selectedDate]);
}