import { useMemo } from "react";

export default function useRecordStats({
  records = [],
  selectedDate = "",
  form = {},
} = {}) {
  return useMemo(() => {
    const currentDateRecords = records.filter(
      (record) => record.fecha === selectedDate
    );

    const currentDateOk = currentDateRecords.filter(
      (record) => record.resultado === "OK"
    ).length;

    const currentDateNok = currentDateRecords.filter(
      (record) => record.resultado === "NO OK"
    ).length;

    const recentRecords = records.slice(0, 6);

    const rejectedRecords = records.filter(
      (record) => record.resultado === "NO OK"
    );

    const operatorShiftRecords = records.filter(
      (record) =>
        record.fecha === form.fecha &&
        record.turno === form.turno &&
        record.operario === form.operario
    );

    const operatorShiftOk = operatorShiftRecords.filter(
      (record) => record.resultado === "OK"
    ).length;

    const operatorShiftNok = operatorShiftRecords.filter(
      (record) => record.resultado === "NO OK"
    ).length;

    const dashboardStats = {
      totalRegistros: records.length,
      rechazos: rejectedRecords.length,
      operariosActivos: new Set(
        records
          .map((record) => record.operario)
          .filter(Boolean)
      ).size,
      ultimaVerificacion:
        records.length > 0
          ? records[0]?.fecha || "-"
          : "-",
    };

    return {
      currentDateRecords,
      currentDateOk,
      currentDateNok,
      recentRecords,
      rejectedRecords,
      operatorShiftRecords,
      operatorShiftOk,
      operatorShiftNok,
      dashboardStats,
    };
  }, [
    records,
    selectedDate,
    form.fecha,
    form.turno,
    form.operario,
  ]);
}