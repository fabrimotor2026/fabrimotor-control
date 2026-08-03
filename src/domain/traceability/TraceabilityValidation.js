const issue = (code, message, path = null, severity = "warning") => ({
  code,
  message,
  path,
  severity,
});

/** Reglas de consistencia del expediente digital. */
export class TraceabilityValidation {
  static validate(data = {}) {
    const errors = [];
    const warnings = [];

    if (!data.reference) {
      errors.push(issue("REFERENCE_REQUIRED", "El expediente no tiene referencia.", "reference", "error"));
    }

    if (data.box && !data.label) {
      warnings.push(issue("BOX_WITHOUT_LABEL", "La caja no tiene una etiqueta relacionada.", "label"));
    }

    if (data.verifications?.length && !data.production?.length) {
      warnings.push(
        issue(
          "VERIFICATION_WITHOUT_PRODUCTION",
          "Existen verificaciones sin registros de producción relacionados.",
          "production",
        ),
      );
    }

    if (data.truck && !data.boxes?.length && !data.box) {
      warnings.push(issue("TRUCK_WITHOUT_BOXES", "El camión no tiene cajas relacionadas.", "truck"));
    }

    const productionWithoutOperator = (data.production ?? []).some(
      (record) => !record?.operator && !record?.operario,
    );
    if (productionWithoutOperator) {
      warnings.push(
        issue(
          "PRODUCTION_WITHOUT_OPERATOR",
          "Hay registros de producción sin operario identificado.",
          "production",
        ),
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export default TraceabilityValidation;
