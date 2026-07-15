import { useMemo, useState } from "react";

const INITIAL_LABEL_FORM = {
  fab1: "",
  col1: "",
  cant1: "",
  fab2: "",
  col2: "",
  cant2: "",
  operario1: "",
  operario2: "",
  numeroCaja: "",
};

function getCurrentLabelDate() {
  const date = new Date();

  const startOfYear = new Date(date.getFullYear(), 0, 1);

  const numeroSemana = Math.ceil(
    ((date - startOfYear) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  );

  const numeroDia = date.getDay() === 0 ? 7 : date.getDay();

  return {
    numeroSemana,
    numeroDia,
  };
}

export default function useLabels({
  piecesPerBox = 16,
} = {}) {
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showBoxLabelsModal, setShowBoxLabelsModal] = useState(false);
  const [boxLabels, setBoxLabels] = useState([]);
  const [boxCounter, setBoxCounter] = useState("");

  const [labelForm, setLabelForm] = useState(INITIAL_LABEL_FORM);

  const totalCaja = useMemo(
    () =>
      Number(labelForm.cant1 || 0) +
      Number(labelForm.cant2 || 0),
    [labelForm.cant1, labelForm.cant2]
  );

  const isValidTotal = totalCaja === Number(piecesPerBox || 16);

  const { numeroSemana, numeroDia } = getCurrentLabelDate();

  const resetLabelForm = ({
    keepOperator1 = false,
  } = {}) => {
    setLabelForm((previous) => ({
      ...INITIAL_LABEL_FORM,
      operario1: keepOperator1
        ? previous.operario1
        : "",
    }));
  };

  const openLabelModal = ({
    reset = false,
    keepOperator1 = false,
  } = {}) => {
    if (reset) {
      resetLabelForm({ keepOperator1 });
    }

    setShowLabelModal(true);
  };

  const closeLabelModal = () => {
    setShowLabelModal(false);
  };

  const openBoxLabelsModalState = () => {
    setShowBoxLabelsModal(true);
  };

  const closeBoxLabelsModal = () => {
    setShowBoxLabelsModal(false);
  };

  return {
    showLabelModal,
    setShowLabelModal,
    openLabelModal,
    closeLabelModal,

    showBoxLabelsModal,
    setShowBoxLabelsModal,
    openBoxLabelsModalState,
    closeBoxLabelsModal,

    labelForm,
    setLabelForm,
    resetLabelForm,

    boxLabels,
    setBoxLabels,

    boxCounter,
    setBoxCounter,

    totalCaja,
    isValidTotal,
    numeroSemana,
    numeroDia,
  };
}