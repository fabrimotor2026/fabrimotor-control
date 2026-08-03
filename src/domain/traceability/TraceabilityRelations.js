const normalizeText = (value) => String(value ?? "").trim().toUpperCase();

/**
 * Reglas puras para relacionar registros de trazabilidad.
 * No conoce nombres de tablas ni consultas de Supabase.
 */
export class TraceabilityRelations {
  static normalizeReference(value) {
    return normalizeText(value).replace(/[^A-Z0-9]/g, "");
  }

  static normalizeBoxCode(value) {
    return normalizeText(value).replace(/\s+/g, "");
  }

  static normalizeIdentifier(value) {
    return normalizeText(value);
  }

  static sameReference(left, right) {
    const a = this.normalizeReference(left);
    const b = this.normalizeReference(right);
    return Boolean(a && b && a === b);
  }

  static sameBox(left, right) {
    const a = this.normalizeBoxCode(left);
    const b = this.normalizeBoxCode(right);
    return Boolean(a && b && a === b);
  }

  static sameIdentifier(left, right) {
    const a = this.normalizeIdentifier(left);
    const b = this.normalizeIdentifier(right);
    return Boolean(a && b && a === b);
  }

  static relationStrength(criteria = {}) {
    const matches = Object.values(criteria).filter(Boolean).length;
    if (matches >= 3) return "exact";
    if (matches === 2) return "strong";
    if (matches === 1) return "compatible";
    return "none";
  }
}

export default TraceabilityRelations;
