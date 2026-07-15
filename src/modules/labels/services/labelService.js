import {
  fetchBoxCounter,
  fetchBoxLabels,
  saveBoxLabel,
  updateBoxCounter,
} from "../../../services/boxLabelService";

import { printLabelDocument } from "../utils/labelPrinter";

function validateLabel({
  labelForm,
  totalCaja,
  piecesPerBox,
}) {
  if (totalCaja !== piecesPerBox) {
    throw new Error(
      `La suma de piezas debe ser exactamente ${piecesPerBox}.`
    );
  }

  if (
    !labelForm.operario1 ||
    String(labelForm.operario1).length !== 4
  ) {
    throw new Error(
      "El Operario 1 debe tener exactamente 4 cifras."
    );
  }

  if (
    labelForm.operario2 &&
    String(labelForm.operario2).length !== 4
  ) {
    throw new Error(
      "El Operario 2 debe tener exactamente 4 cifras."
    );
  }
}

function getUpdatedBy(currentUser) {
  if (!currentUser) return "";

  return `${currentUser.username} - ${currentUser.name}`;
}

export async function createAndPrintBoxLabel({
  supabase,
  appConfig,
  currentUser,
  labelForm,
  totalCaja,
  numeroSemana,
  numeroDia,
  resolveActiveTruck,
}) {
  const piecesPerBox = Number(appConfig.piecesPerBox || 16);

  validateLabel({
    labelForm,
    totalCaja,
    piecesPerBox,
  });

  /*
   * Debe abrirse antes del primer await para evitar que
   * el navegador bloquee la ventana emergente.
   */
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error(
      "El navegador ha bloqueado la ventana de impresión. " +
        "Permite ventanas emergentes para esta página."
    );
  }

  try {
    const counter = await fetchBoxCounter(supabase);

    const numeroCajaAsignado = String(counter).padStart(5, "0");

    const numeroCajaCompleto =
      `${appConfig.boxPrefix}-${numeroCajaAsignado}`;

    const updatedBy = getUpdatedBy(currentUser);

    const truck = await resolveActiveTruck(
      appConfig.reference,
      updatedBy
    );

    if (!truck) {
      printWindow.close();

      throw new Error("No existe ningún camión abierto.");
    }

    const labelData = {
      fab1: labelForm.fab1,
      col1: labelForm.col1,
      cant1: labelForm.cant1,

      fab2: labelForm.fab2,
      col2: labelForm.col2,
      cant2: labelForm.cant2,

      operario1: labelForm.operario1,
      operario2: labelForm.operario2,

      numeroCaja: numeroCajaCompleto,

      camionId: truck.id,
      truckNumber: truck.truck_number,
      plannedExpeditionDate:
        truck.planned_expedition_date,

      semana: numeroSemana,
      dia: numeroDia,
      totalCaja,
    };

    const warnings = [];
    let labels = [];

    try {
      await saveBoxLabel(
        supabase,
        labelData
      );

      labels = await fetchBoxLabels(
        supabase,
        truck.id
      );
    } catch (error) {
      console.error(
        "Error guardando etiqueta de caja:",
        error
      );

      warnings.push(
        "La etiqueta se ha generado, pero no se ha podido " +
          `guardar en el listado de cajas.\n\n${
            error?.message || String(error)
          }`
      );
    }

    const nextCounter = Number(counter) + 1;

    try {
      await updateBoxCounter(
        supabase,
        nextCounter,
        updatedBy
      );
    } catch (error) {
      console.error(
        "Error actualizando contador de caja:",
        error
      );

      warnings.push(
        "La etiqueta se ha generado, pero no se ha podido " +
          `actualizar el contador.\n\n${
            error?.message || String(error)
          }`
      );
    }

    printLabelDocument({
      printWindow,
      appConfig,
      labelForm,
      totalCaja,
      numeroSemana,
      numeroDia,
      numeroCajaAsignado,
      numeroCajaCompleto,
    });

    return {
      truck,
      labels,
      labelData,
      numeroCajaCompleto,
      nextCounter,
      warnings,
    };
  } catch (error) {
    if (
      printWindow &&
      !printWindow.closed
    ) {
      printWindow.close();
    }

    throw error;
  }
}