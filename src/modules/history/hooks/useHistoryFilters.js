import { useMemo, useState } from "react";

export default function useHistoryFilters({
  records,
  currentUser,
  isVerificationUser,
  buildSheetId,
  currentSheetId,
  currentSheetName,
  availableSheets,
}) {
  const [filterDate, setFilterDate] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterOperario, setFilterOperario] = useState("");
  const [filterPieza, setFilterPieza] = useState("");
  const [filterMaquina, setFilterMaquina] = useState("");

  const [showOnlyCurrentSheet, setShowOnlyCurrentSheet] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState("");

  const activeSheetId = showOnlyCurrentSheet
    ? currentSheetId
    : selectedSheetId;

  const activeSheetName = showOnlyCurrentSheet
    ? currentSheetName
    : availableSheets.find((sheet) => sheet.id === selectedSheetId)?.name || "";

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchCurrentOperator =
        !isVerificationUser(currentUser) ||
        String(record.operario || "").startsWith(
          String(currentUser?.username || "")
        );

      const matchDate = !filterDate || record.fecha === filterDate;
      const matchTurno = !filterTurno || record.turno === filterTurno;

      const matchOperario =
        !filterOperario ||
        String(record.operario || "")
          .toLowerCase()
          .includes(filterOperario.toLowerCase());

      const matchPieza =
        !filterPieza ||
        String(record.numeroPieza || "")
          .toLowerCase()
          .includes(filterPieza.toLowerCase());

      const matchMaquina =
        !filterMaquina || record.maquina === filterMaquina;

      const recordSheetId = buildSheetId(record);

      const matchSheet =
        !activeSheetId || recordSheetId === activeSheetId;

      return (
        matchCurrentOperator &&
        matchDate &&
        matchTurno &&
        matchOperario &&
        matchPieza &&
        matchMaquina &&
        matchSheet
      );
    });
  }, [
    records,
    currentUser,
    filterDate,
    filterTurno,
    filterOperario,
    filterPieza,
    filterMaquina,
    activeSheetId,
    isVerificationUser,
    buildSheetId,
  ]);

  return {
    filterDate,
    setFilterDate,

    filterTurno,
    setFilterTurno,

    filterOperario,
    setFilterOperario,

    filterPieza,
    setFilterPieza,

    filterMaquina,
    setFilterMaquina,

    showOnlyCurrentSheet,
    setShowOnlyCurrentSheet,

    selectedSheetId,
    setSelectedSheetId,

    activeSheetId,
    activeSheetName,

    filteredRecords,
  };
}