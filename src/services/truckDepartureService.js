const DOCUMENT_LABELS = {
  DELIVERY_NOTE: "Albarán",
  CMR: "CMR",
  PHOTO: "Fotografía de carga",
  SIGNED_DELIVERY_NOTE: "Albarán firmado",
  SIGNED_CMR: "CMR firmado",
  POD: "Justificante de entrega (POD)",
  DELIVERY_PHOTO: "Fotografía de entrega",
  OTHER: "Otro documento",
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeReference(value) {
  return normalizeText(value || "F-1012").toUpperCase();
}

function normalizeTruckNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function rowKey(reference, truckNumber) {
  return `${normalizeReference(reference)}:${normalizeTruckNumber(
    truckNumber
  )}`;
}

function toTimestamp(value) {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function latestBy(rows, keyReader, dateReader) {
  const result = new Map();

  [...rows]
    .sort(
      (first, second) =>
        (toTimestamp(dateReader(second)) || 0) -
        (toTimestamp(dateReader(first)) || 0)
    )
    .forEach((row) => {
      const key = normalizeText(keyReader(row));
      if (key && !result.has(key)) result.set(key, row);
    });

  return result;
}

function documentType(document) {
  return normalizeText(document?.document_type).toUpperCase();
}

function hasText(value) {
  return normalizeText(value).length > 0;
}

function durationMinutes(startValue, endValue) {
  const start = toTimestamp(startValue);
  const end = toTimestamp(endValue);

  if (start === null || end === null || end < start) return null;
  return Math.round((end - start) / 60_000);
}

function planDateTime(plan, field) {
  const date = normalizeText(plan?.loading_date);
  const time = normalizeText(plan?.[field]);

  if (!date || !time) return null;
  return `${date}T${time.slice(0, 8)}`;
}

function checklistItem(key, label, complete, detail = "") {
  return {
    key,
    label,
    complete: Boolean(complete),
    detail,
  };
}

function missingTableError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("f1012_truck_departures")
  );
}

export function localDateTimeInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return localTime.toISOString().slice(0, 16);
}

export function formatDurationMinutes(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes < 0) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return `${hours} h${remainder ? ` ${remainder} min` : ""}`;
}

export function formatDepartureDate(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function departureDossierFileName(
  reference,
  truckNumber,
  departureAt
) {
  const normalizedReference = normalizeReference(reference).replaceAll(
    /[^A-Z0-9]/g,
    ""
  );
  const date = new Date(departureAt || "");
  let dateText = "SIN-FECHA";

  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type) =>
      parts.find((item) => item.type === type)?.value || "";
    dateText = `${part("year")}-${part("month")}-${part("day")}`;
  }

  return `${normalizedReference}_Camion_${normalizeTruckNumber(
    truckNumber
  ) || "SIN-NUMERO"}_${dateText}_Dossier_Expedicion.pdf`;
}

export function calculateDepartureDurations(row, departureAt) {
  const planStart = planDateTime(
    row?.plan,
    "loading_start_time"
  );
  const planEnd = planDateTime(row?.plan, "loading_end_time");
  const loadingStart = row?.session?.started_at;
  const loadingEnd = row?.session?.completed_at;
  const actualDeparture =
    departureAt || row?.departure?.departure_at;

  return {
    preparationMinutes: durationMinutes(planStart, planEnd),
    loadingMinutes: durationMinutes(loadingStart, loadingEnd),
    waitingMinutes: durationMinutes(loadingEnd, actualDeparture),
    totalDockToDepartureMinutes: durationMinutes(
      loadingStart,
      actualDeparture
    ),
  };
}

export function buildDepartureOverview({
  trucks = [],
  plans = [],
  sessions = [],
  sessionBoxes = [],
  incidents = [],
  documents = [],
  departures = [],
  targetBoxes = 49,
} = {}) {
  const normalizedTarget = Math.max(1, Number(targetBoxes || 49));
  const planByTruck = new Map(
    plans.map((plan) => [
      rowKey(plan?.reference, plan?.truck_number),
      plan,
    ])
  );
  const departureByTruck = new Map(
    departures.map((departure) => [
      rowKey(departure?.reference, departure?.truck_number),
      departure,
    ])
  );
  const completedSessionByTruckId = latestBy(
    sessions.filter(
      (session) =>
        normalizeText(session?.status).toUpperCase() === "COMPLETED"
    ),
    (session) => session?.truck_id,
    (session) => session?.completed_at || session?.created_at
  );
  const boxesBySession = new Map();
  const incidentsBySession = new Map();
  const documentsByTruck = new Map();

  sessionBoxes.forEach((box) => {
    const sessionId = normalizeText(box?.session_id);
    const previous = boxesBySession.get(sessionId) || [];
    previous.push(box);
    boxesBySession.set(sessionId, previous);
  });

  incidents.forEach((incident) => {
    const sessionId = normalizeText(incident?.session_id);
    const previous = incidentsBySession.get(sessionId) || [];
    previous.push(incident);
    incidentsBySession.set(sessionId, previous);
  });

  documents.forEach((document) => {
    const key = rowKey(
      document?.reference,
      document?.truck_number
    );
    const previous = documentsByTruck.get(key) || [];
    previous.push(document);
    documentsByTruck.set(key, previous);
  });

  const rows = trucks
    .map((truck) => {
      const key = rowKey(truck?.reference, truck?.truck_number);
      const session = completedSessionByTruckId.get(
        normalizeText(truck?.id)
      );
      const departure = departureByTruck.get(key) || null;

      if (!session && !departure) return null;

      const plan = planByTruck.get(key) || null;
      const loadedRows = session
        ? boxesBySession.get(normalizeText(session.id)) || []
        : [];
      const loadedBoxes = new Set(
        loadedRows
          .map((box) =>
            normalizeText(box?.box_label_id || box?.box_number)
          )
          .filter(Boolean)
      ).size;
      const sessionIncidents = session
        ? incidentsBySession.get(normalizeText(session.id)) || []
        : [];
      const openIncidents = sessionIncidents.filter(
        (incident) =>
          normalizeText(incident?.status).toUpperCase() === "OPEN"
      );
      const truckDocuments = documentsByTruck.get(key) || [];
      const hasDeliveryNote = truckDocuments.some(
        (document) => documentType(document) === "DELIVERY_NOTE"
      );
      const expectedBoxes = Math.max(
        normalizedTarget,
        Number(session?.target_boxes || 0)
      );
      const checklist = [
        checklistItem(
          "production_closed",
          "Producción cerrada",
          normalizeText(truck?.status).toUpperCase() === "CLOSED"
        ),
        checklistItem(
          "loading_plan",
          "Plan de carga finalizado",
          normalizeText(plan?.loading_status).toUpperCase() ===
            "LOADED"
        ),
        checklistItem(
          "loading_completed",
          "Carga V2.33 finalizada",
          Boolean(session?.completed_at)
        ),
        checklistItem(
          "boxes_complete",
          `${expectedBoxes} cajas cargadas`,
          loadedBoxes >= expectedBoxes,
          `${loadedBoxes}/${expectedBoxes}`
        ),
        checklistItem(
          "incidents_resolved",
          "Incidencias resueltas",
          openIncidents.length === 0,
          `${openIncidents.length} abiertas`
        ),
        checklistItem(
          "customer",
          "Cliente",
          hasText(truck?.customer_name)
        ),
        checklistItem(
          "destination",
          "Destino",
          hasText(truck?.destination)
        ),
        checklistItem(
          "carrier",
          "Transportista",
          hasText(truck?.carrier_name)
        ),
        checklistItem(
          "tractor",
          "Matrícula tractora",
          hasText(truck?.tractor_plate || truck?.vehicle_plate)
        ),
        checklistItem(
          "trailer",
          "Matrícula remolque",
          hasText(truck?.trailer_plate)
        ),
        checklistItem(
          "seal",
          "Brida / precinto",
          hasText(truck?.seal_number)
        ),
        checklistItem(
          "delivery_note_number",
          "Número de albarán",
          hasText(truck?.delivery_note_number)
        ),
        checklistItem(
          "delivery_note_document",
          "Albarán adjunto",
          hasDeliveryNote
        ),
      ];
      const blockers = checklist
        .filter((item) => !item.complete)
        .map((item) => item.label);
      const isShipped =
        normalizeText(truck?.shipment_status).toUpperCase() ===
          "SHIPPED" &&
        normalizeText(departure?.status).toUpperCase() ===
          "SHIPPED";

      return {
        key,
        reference: normalizeReference(truck?.reference),
        truckNumber: normalizeTruckNumber(truck?.truck_number),
        truck,
        plan,
        session,
        departure,
        loadedRows,
        loadedBoxes,
        expectedBoxes,
        incidents: sessionIncidents,
        openIncidents,
        documents: truckDocuments,
        checklist,
        blockers,
        isShipped,
        canConfirm: blockers.length === 0 && !isShipped,
      };
    })
    .filter(Boolean)
    .sort((first, second) => {
      if (first.isShipped !== second.isShipped) {
        return first.isShipped ? 1 : -1;
      }

      const firstDate =
        first.session?.completed_at ||
        first.departure?.departure_at ||
        "";
      const secondDate =
        second.session?.completed_at ||
        second.departure?.departure_at ||
        "";

      return (
        String(firstDate).localeCompare(String(secondDate)) ||
        Number(first.truckNumber) - Number(second.truckNumber)
      );
    });

  return {
    rows,
    summary: {
      total: rows.length,
      awaitingDeparture: rows.filter((row) => !row.isShipped).length,
      ready: rows.filter((row) => row.canConfirm).length,
      blocked: rows.filter(
        (row) => !row.isShipped && !row.canConfirm
      ).length,
      shipped: rows.filter((row) => row.isShipped).length,
    },
  };
}

export function evaluateDepartureConfirmation(
  row,
  draft = {},
  confirmations = {}
) {
  const blockers = [...(row?.blockers || [])];

  if (!row) blockers.push("Selecciona un camión");
  if (row?.isShipped) blockers.push("El camión ya está expedido");
  if (!hasText(draft.driverName)) {
    blockers.push("Nombre del conductor");
  }
  if (!hasText(draft.departureAt)) {
    blockers.push("Fecha y hora real de salida");
  }
  if (!confirmations.tractorConfirmed) {
    blockers.push("Confirmación de matrícula tractora");
  }
  if (!confirmations.trailerConfirmed) {
    blockers.push("Confirmación de matrícula remolque");
  }
  if (!confirmations.sealConfirmed) {
    blockers.push("Confirmación de brida / precinto");
  }
  if (!confirmations.documentsConfirmed) {
    blockers.push("Documentación contrastada");
  }

  return {
    isReady: blockers.length === 0,
    blockers: [...new Set(blockers)],
  };
}

export async function fetchTruckDepartureData(
  supabase,
  reference = "F-1012"
) {
  if (!supabase) {
    throw new Error("Supabase no está disponible.");
  }

  const normalizedReference = normalizeReference(reference);
  const [
    trucksResult,
    plansResult,
    sessionsResult,
    documentsResult,
    departuresResult,
  ] = await Promise.all([
    supabase
      .from("f1012_trucks")
      .select("*")
      .eq("reference", normalizedReference)
      .order("truck_number", { ascending: false })
      .limit(300),
    supabase
      .from("f1012_truck_loading_plan")
      .select("*")
      .eq("reference", normalizedReference)
      .limit(300),
    supabase
      .from("f1012_loading_sessions")
      .select("*")
      .eq("reference", normalizedReference)
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false })
      .limit(300),
    supabase
      .from("f1012_truck_documents")
      .select(
        "id, reference, truck_number, document_type, file_name, file_size, uploaded_by, created_at"
      )
      .eq("reference", normalizedReference)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("f1012_truck_departures")
      .select("*")
      .eq("reference", normalizedReference)
      .order("departure_at", { ascending: false })
      .limit(300),
  ]);
  const firstError =
    trucksResult.error ||
    plansResult.error ||
    sessionsResult.error ||
    documentsResult.error ||
    departuresResult.error;

  if (firstError) {
    if (missingTableError(firstError)) {
      throw new Error(
        "Falta instalar la V2.34 en Supabase. Ejecuta FMCONTROL_V2_34_CONTROL_SALIDA.sql."
      );
    }
    throw firstError;
  }

  const sessionIds = (sessionsResult.data || [])
    .map((session) => session?.id)
    .filter(Boolean);
  const boxesQuery = sessionIds.length
    ? supabase
        .from("f1012_loading_session_boxes")
        .select("*")
        .in("session_id", sessionIds)
        .limit(10000)
    : Promise.resolve({ data: [], error: null });
  const incidentsQuery = sessionIds.length
    ? supabase
        .from("f1012_loading_incidents")
        .select("*")
        .in("session_id", sessionIds)
        .limit(3000)
    : Promise.resolve({ data: [], error: null });
  const [boxesResult, incidentsResult] = await Promise.all([
    boxesQuery,
    incidentsQuery,
  ]);

  if (boxesResult.error) throw boxesResult.error;
  if (incidentsResult.error) throw incidentsResult.error;

  return {
    trucks: trucksResult.data || [],
    plans: plansResult.data || [],
    sessions: sessionsResult.data || [],
    documents: documentsResult.data || [],
    departures: departuresResult.data || [],
    sessionBoxes: boxesResult.data || [],
    incidents: incidentsResult.data || [],
  };
}

export async function confirmTruckDeparture(
  supabase,
  {
    truckId,
    driverName,
    departureAt,
    departureNotes = "",
    actor = "",
    confirmations = {},
  }
) {
  const timestamp = new Date(departureAt || "");

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("La fecha y hora real de salida no es válida.");
  }

  const { data, error } = await supabase.rpc(
    "fmcontrol_confirm_truck_departure",
    {
      p_truck_id: truckId,
      p_driver_name: normalizeText(driverName),
      p_departure_at: timestamp.toISOString(),
      p_departure_notes: normalizeText(departureNotes),
      p_actor: normalizeText(actor),
      p_tractor_confirmed: Boolean(
        confirmations.tractorConfirmed
      ),
      p_trailer_confirmed: Boolean(
        confirmations.trailerConfirmed
      ),
      p_seal_confirmed: Boolean(confirmations.sealConfirmed),
      p_documents_confirmed: Boolean(
        confirmations.documentsConfirmed
      ),
    }
  );

  if (error) {
    throw new Error(
      error.message || "No se ha podido confirmar la salida."
    );
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function reopenTruckDeparture(
  supabase,
  {
    truckId,
    actor = "",
    actorRole = "",
    reason,
  }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_reopen_truck_departure",
    {
      p_truck_id: truckId,
      p_actor: normalizeText(actor),
      p_actor_role: normalizeText(actorRole),
      p_reason: normalizeText(reason),
    }
  );

  if (error) {
    throw new Error(
      error.message || "No se ha podido reabrir la expedición."
    );
  }

  return Array.isArray(data) ? data[0] : data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildDepartureDossierHtml({
  row,
  departure,
  generatedAt = new Date(),
}) {
  const actualDeparture =
    departure?.departure_time ||
    departure?.departure_at ||
    row?.departure?.departure_at;
  const durations = calculateDepartureDurations(
    row,
    actualDeparture
  );
  const truck = row?.truck || {};
  const documents = row?.documents || [];
  const filename = departureDossierFileName(
    row?.reference,
    row?.truckNumber,
    actualDeparture
  );
  const documentRows = documents.length
    ? documents
        .map(
          (document) => `
            <tr>
              <td>${escapeHtml(
                DOCUMENT_LABELS[documentType(document)] ||
                  documentType(document) ||
                  "Documento"
              )}</td>
              <td>${escapeHtml(document?.file_name || "-")}</td>
              <td>${escapeHtml(
                formatDepartureDate(document?.created_at)
              )}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="3">Sin documentos relacionados.</td></tr>`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(filename)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #0f172a;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
      }
      header {
        border-radius: 14px;
        background: #071226;
        color: white;
        padding: 18px 20px;
      }
      .eyebrow {
        color: #60a5fa;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      h1 { margin: 6px 0 0; font-size: 24px; }
      h2 { margin: 0 0 10px; font-size: 16px; }
      .subtitle { margin-top: 6px; color: #cbd5e1; font-weight: 700; }
      .status {
        margin-top: 14px;
        border: 1px solid #86efac;
        border-radius: 12px;
        background: #ecfdf5;
        color: #047857;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 800;
      }
      section {
        margin-top: 14px;
        break-inside: avoid;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .card {
        min-height: 56px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 9px 10px;
      }
      .label {
        color: #64748b;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .7px;
        text-transform: uppercase;
      }
      .value { margin-top: 5px; font-size: 12px; font-weight: 800; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 7px 8px;
        text-align: left;
      }
      th { background: #e2e8f0; font-size: 9px; text-transform: uppercase; }
      .signature {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-top: 34px;
      }
      .signature div {
        border-top: 1px solid #64748b;
        padding-top: 6px;
        color: #64748b;
        font-weight: 700;
      }
      footer {
        margin-top: 18px;
        color: #64748b;
        font-size: 9px;
        text-align: right;
      }
      @media print {
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="eyebrow">FM Control · Fabrimotor</div>
      <h1>Dossier final de expedición</h1>
      <div class="subtitle">
        ${escapeHtml(row?.reference)} · Camión ${escapeHtml(
          row?.truckNumber
        )}
      </div>
    </header>

    <div class="status">
      EXPEDICIÓN CONFIRMADA · ${escapeHtml(
        formatDepartureDate(actualDeparture)
      )}
    </div>

    <section>
      <h2>Datos de la expedición</h2>
      <div class="grid">
        <div class="card"><div class="label">Cliente</div><div class="value">${escapeHtml(
          truck.customer_name || "-"
        )}</div></div>
        <div class="card"><div class="label">Destino</div><div class="value">${escapeHtml(
          truck.destination || "-"
        )}</div></div>
        <div class="card"><div class="label">Transportista</div><div class="value">${escapeHtml(
          truck.carrier_name || "-"
        )}</div></div>
        <div class="card"><div class="label">Conductor</div><div class="value">${escapeHtml(
          departure?.driver_name ||
            row?.departure?.driver_name ||
            "-"
        )}</div></div>
        <div class="card"><div class="label">Matrícula tractora</div><div class="value">${escapeHtml(
          truck.tractor_plate || truck.vehicle_plate || "-"
        )}</div></div>
        <div class="card"><div class="label">Matrícula remolque</div><div class="value">${escapeHtml(
          truck.trailer_plate || "-"
        )}</div></div>
        <div class="card"><div class="label">Brida / precinto</div><div class="value">${escapeHtml(
          truck.seal_number || "-"
        )}</div></div>
        <div class="card"><div class="label">Número de albarán</div><div class="value">${escapeHtml(
          truck.delivery_note_number || "-"
        )}</div></div>
        <div class="card"><div class="label">Cajas expedidas</div><div class="value">${escapeHtml(
          `${row?.loadedBoxes || 0}/${row?.expectedBoxes || 0}`
        )}</div></div>
      </div>
    </section>

    <section>
      <h2>Tiempos del proceso</h2>
      <div class="grid">
        <div class="card"><div class="label">Preparación</div><div class="value">${escapeHtml(
          formatDurationMinutes(durations.preparationMinutes)
        )}</div></div>
        <div class="card"><div class="label">Carga física</div><div class="value">${escapeHtml(
          formatDurationMinutes(durations.loadingMinutes)
        )}</div></div>
        <div class="card"><div class="label">Espera hasta salida</div><div class="value">${escapeHtml(
          formatDurationMinutes(durations.waitingMinutes)
        )}</div></div>
      </div>
    </section>

    <section>
      <h2>Documentación relacionada</h2>
      <table>
        <thead>
          <tr><th>Tipo</th><th>Archivo</th><th>Fecha</th></tr>
        </thead>
        <tbody>${documentRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Confirmación y observaciones</h2>
      <div class="grid">
        <div class="card"><div class="label">Confirmado por</div><div class="value">${escapeHtml(
          departure?.confirmed_by ||
            row?.departure?.confirmed_by ||
            "-"
        )}</div></div>
        <div class="card"><div class="label">Carga finalizada</div><div class="value">${escapeHtml(
          formatDepartureDate(row?.session?.completed_at)
        )}</div></div>
        <div class="card"><div class="label">Incidencias abiertas</div><div class="value">${escapeHtml(
          row?.openIncidents?.length || 0
        )}</div></div>
      </div>
      <div class="card" style="margin-top:8px">
        <div class="label">Observaciones de salida</div>
        <div class="value">${escapeHtml(
          departure?.departure_notes ||
            row?.departure?.departure_notes ||
            "Sin observaciones"
        )}</div>
      </div>
    </section>

    <div class="signature">
      <div>Responsable de expedición</div>
      <div>Conductor / transportista</div>
    </div>

    <footer>
      Generado el ${escapeHtml(formatDepartureDate(generatedAt))}
    </footer>
  </body>
</html>`;
}
