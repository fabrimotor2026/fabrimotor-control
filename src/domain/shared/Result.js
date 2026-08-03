/**
 * Resultado explícito para casos de uso y validaciones de dominio.
 */
export class Result {
  constructor({ ok, value = null, error = null, warnings = [] }) {
    this.ok = Boolean(ok);
    this.value = value;
    this.error = error;
    this.warnings = Array.isArray(warnings) ? warnings : [];
    Object.freeze(this.warnings);
    Object.freeze(this);
  }

  static success(value, warnings = []) {
    return new Result({ ok: true, value, warnings });
  }

  static failure(error, warnings = []) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error ?? "Error de dominio"));
    return new Result({ ok: false, error: normalizedError, warnings });
  }
}

export default Result;
