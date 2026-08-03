const toTimestamp = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeEvent = (event, index) => ({
  id: event?.id ?? `traceability-event-${index}`,
  type: event?.type ?? "unknown",
  date: event?.date ?? null,
  user: event?.user ?? null,
  status: event?.status ?? "unknown",
  entityId: event?.entityId ?? null,
  source: event?.source ?? null,
  metadata: event?.metadata ?? {},
});

/** Construye una cronología inmutable y ordenada. */
export class TraceabilityTimeline {
  constructor(events = []) {
    this.events = [...events]
      .map(normalizeEvent)
      .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));
    Object.freeze(this.events);
    Object.freeze(this);
  }

  static from(events = []) {
    return new TraceabilityTimeline(events);
  }

  get first() {
    return this.events[0] ?? null;
  }

  get last() {
    return this.events[this.events.length - 1] ?? null;
  }

  get isEmpty() {
    return this.events.length === 0;
  }

  toJSON() {
    return [...this.events];
  }
}

export default TraceabilityTimeline;
