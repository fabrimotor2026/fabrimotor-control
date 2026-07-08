import { useMemo, useState } from "react";

export function useTruckSelection({ boxLabelsSummary = [], highlightBoxNumber = "" }) {
  const [selectedBoxNumber, setSelectedBoxNumber] = useState(highlightBoxNumber || "");

  const selectedBox = useMemo(() => {
    return (
      boxLabelsSummary.find((box) => String(box.numeroCaja) === String(selectedBoxNumber)) ||
      boxLabelsSummary.find((box) => String(box.numeroCaja) === String(highlightBoxNumber)) ||
      boxLabelsSummary[boxLabelsSummary.length - 1] ||
      null
    );
  }, [boxLabelsSummary, selectedBoxNumber, highlightBoxNumber]);

  return { selectedBox, selectedBoxNumber, setSelectedBoxNumber };
}
