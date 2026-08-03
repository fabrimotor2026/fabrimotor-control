import { Entity } from "../shared/Entity.js";
import { TraceabilityTimeline } from "./TraceabilityTimeline.js";
import { TraceabilityValidation } from "./TraceabilityValidation.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Entidad raíz del expediente digital de una pieza.
 * Contiene únicamente datos y reglas de negocio.
 */
export class TraceabilityDossier extends Entity {
  constructor(data = {}) {
    super(data.id ?? null);

    this.reference = data.reference ?? null;
    this.partCode = data.partCode ?? null;
    this.status = data.status ?? "unknown";
    this.production = asArray(data.production);
    this.quality = data.quality ?? {};
    this.verifications = asArray(data.verifications);
    this.label = data.label ?? null;
    this.box = data.box ?? null;
    this.boxes = asArray(data.boxes);
    this.truck = data.truck ?? null;
    this.incidents = asArray(data.incidents);
    this.documents = asArray(data.documents);
    this.relations = asArray(data.relations);
    this.timeline = TraceabilityTimeline.from(data.timeline ?? []);

    this.validation = TraceabilityValidation.validate(this);
  }

  get traceabilityScore() {
    const checks = [
      Boolean(this.reference),
      this.production.length > 0,
      this.verifications.length > 0,
      Boolean(this.label),
      Boolean(this.box || this.boxes.length),
      Boolean(this.truck),
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  get hasIncidents() {
    return this.incidents.length > 0;
  }

  get isComplete() {
    return this.validation.valid && this.traceabilityScore === 100;
  }

  toJSON() {
    return {
      id: this.id,
      reference: this.reference,
      partCode: this.partCode,
      status: this.status,
      traceabilityScore: this.traceabilityScore,
      production: this.production,
      quality: this.quality,
      verifications: this.verifications,
      label: this.label,
      box: this.box,
      boxes: this.boxes,
      truck: this.truck,
      incidents: this.incidents,
      documents: this.documents,
      relations: this.relations,
      timeline: this.timeline.toJSON(),
      validation: this.validation,
    };
  }
}

export default TraceabilityDossier;
