import { Result } from "../../domain/shared/Result.js";
import { TraceabilityDossier } from "../../domain/traceability/TraceabilityDossier.js";

/** Caso de uso para construir un expediente desde un repositorio. */
export class BuildTraceabilityDossier {
  constructor(repository) {
    if (!repository || typeof repository.loadDossierData !== "function") {
      throw new TypeError("BuildTraceabilityDossier requiere un repositorio compatible.");
    }
    this.repository = repository;
  }

  async execute(criteria = {}) {
    try {
      const rawData = await this.repository.loadDossierData(criteria);
      const dossier = new TraceabilityDossier(rawData ?? {});

      if (!dossier.validation.valid) {
        return Result.failure(
          new Error("El expediente no cumple las reglas mínimas de consistencia."),
          dossier.validation.warnings,
        );
      }

      return Result.success(dossier, dossier.validation.warnings);
    } catch (error) {
      return Result.failure(error);
    }
  }
}

export default BuildTraceabilityDossier;
