export const DOCK_SESSION_STATUSES = {
  LOADING: "LOADING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const LOADING_INCIDENT_TYPES = [
  { value: "DAMAGED_BOX", label: "Caja dañada" },
  { value: "MISSING_BOX", label: "Caja no localizada" },
  { value: "LABEL_ERROR", label: "Error de etiqueta" },
  { value: "DOCUMENTATION", label: "Documentación" },
  { value: "VEHICLE", label: "Vehículo / remolque" },
  { value: "OTHER", label: "Otra incidencia" },
];

function normalizeReference(value) {
  return String(value || "F-1012").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim();
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

function uniqueCount(rows = [], keyReader) {
  const values = new Set();

  rows.forEach((row) => {
    const value = normalizeText(keyReader(row));
    if (value) values.add(value);
  });

  return values.size;
}

function shipmentStatus(truck) {
  return String(truck?.shipment_status || "PENDING").toUpperCase();
}

function productionStatus(truck) {
  return String(truck?.status || "").toUpperCase();
}

function latestSessionByTruck(sessions = []) {
  const result = new Map();

  [...sessions]
    .sort((first, second) =>
      String(second?.created_at || "").localeCompare(
        String(first?.created_at || "")
      )
    )
    .forEach((session) => {
      const key = rowKey(
        session?.reference,
        session?.truck_number
      );

      if (!result.has(key)) result.set(key, session);
    });

  return result;
}

function startBlockers({ truck, plan, expectedBoxes, targetBoxes }) {
  const blockers = [];

  if (productionStatus(truck) !== "CLOSED") {
    blockers.push("La producción del camión todavía está abierta");
  }

  if (String(plan?.loading_status || "") !== "READY") {
    blockers.push(
      "El plan de preparación debe estar en «Lista para cargar»"
    );
  }

  if (expectedBoxes < targetBoxes) {
    blockers.push(
      `Faltan ${targetBoxes - expectedBoxes} cajas por fabricar`
    );
  }

  if (!normalizeText(truck?.tractor_plate || truck?.vehicle_plate)) {
    blockers.push("Matrícula tractora pendiente");
  }

  if (!normalizeText(truck?.trailer_plate)) {
    blockers.push("Matrícula remolque pendiente");
  }

  if (!normalizeText(truck?.seal_number)) {
    blockers.push("Brida / precinto pendiente");
  }

  return blockers;
}

export function normalizeScannedBoxNumber(value) {
  return normalizeText(value).toUpperCase().replaceAll(/\s+/g, "");
}

export function buildDockOverview({
  trucks = [],
  plans = [],
  sessions = [],
  sessionBoxes = [],
  incidents = [],
  labels = [],
  targetBoxes = 49,
} = {}) {
  const normalizedTarget = Math.max(
    1,
    Number(targetBoxes || 49)
  );
  const planByTruck = new Map(
    plans.map((plan) => [
      rowKey(plan?.reference, plan?.truck_number),
      plan,
    ])
  );
  const sessionByTruck = latestSessionByTruck(sessions);
  const labelsByTruckId = new Map();
  const boxesBySession = new Map();
  const incidentsBySession = new Map();

  labels.forEach((label) => {
    const truckId = normalizeText(label?.camion_id);
    const previous = labelsByTruckId.get(truckId) || [];
    previous.push(label);
    labelsByTruckId.set(truckId, previous);
  });

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

  const activeSession =
    sessions.find((session) =>
      ["LOADING", "PAUSED"].includes(
        String(session?.status || "").toUpperCase()
      )
    ) || null;
  const activeKey = activeSession
    ? rowKey(
        activeSession.reference,
        activeSession.truck_number
      )
    : "";

  const rows = trucks
    .filter((truck) => {
      const status = productionStatus(truck);
      const key = rowKey(truck?.reference, truck?.truck_number);
      const session = sessionByTruck.get(key);

      return (
        ["OPEN", "CLOSED"].includes(status) &&
        shipmentStatus(truck) !== "SHIPPED" &&
        (!session || session.status !== "COMPLETED")
      );
    })
    .map((truck) => {
      const key = rowKey(truck?.reference, truck?.truck_number);
      const plan = planByTruck.get(key) || null;
      const session = sessionByTruck.get(key) || null;
      const expectedLabels =
        labelsByTruckId.get(normalizeText(truck?.id)) || [];
      const loadedRows = session
        ? boxesBySession.get(normalizeText(session.id)) || []
        : [];
      const incidentRows = session
        ? incidentsBySession.get(normalizeText(session.id)) || []
        : [];
      const expectedBoxes = uniqueCount(
        expectedLabels,
        (label) => label?.numero_caja || label?.id
      );
      const loadedBoxes = uniqueCount(
        loadedRows,
        (box) => box?.box_number || box?.box_label_id
      );
      const blockers = startBlockers({
        truck,
        plan,
        expectedBoxes,
        targetBoxes: normalizedTarget,
      });
      const openIncidents = incidentRows.filter(
        (incident) => incident?.status !== "RESOLVED"
      );

      return {
        key,
        truck,
        reference: normalizeReference(truck?.reference),
        truckNumber: normalizeTruckNumber(truck?.truck_number),
        plan,
        session,
        expectedLabels,
        expectedBoxes,
        missingProductionBoxes: Math.max(
          0,
          normalizedTarget - expectedBoxes
        ),
        loadedRows: [...loadedRows].sort((first, second) =>
          String(second?.loaded_at || "").localeCompare(
            String(first?.loaded_at || "")
          )
        ),
        loadedBoxes,
        pendingLoadBoxes: Math.max(
          0,
          normalizedTarget - loadedBoxes
        ),
        incidents: [...incidentRows].sort((first, second) =>
          String(second?.created_at || "").localeCompare(
            String(first?.created_at || "")
          )
        ),
        openIncidents,
        startBlockers: blockers,
        canStart:
          blockers.length === 0 &&
          (!activeSession || key === activeKey),
        targetBoxes: normalizedTarget,
      };
    })
    .sort(
      (first, second) =>
        Number(first?.plan?.planning_priority || Number.MAX_SAFE_INTEGER) -
          Number(second?.plan?.planning_priority || Number.MAX_SAFE_INTEGER) ||
        String(
          first?.plan?.loading_date ||
            first?.truck?.planned_expedition_date ||
            "9999-12-31"
        ).localeCompare(
          String(
            second?.plan?.loading_date ||
              second?.truck?.planned_expedition_date ||
              "9999-12-31"
          )
        ) ||
        Number(first.truckNumber || 0) -
          Number(second.truckNumber || 0)
    );

  return {
    activeSession,
    activeRow:
      rows.find((row) => row.key === activeKey) || null,
    rows,
    summary: {
      dockStatus: activeSession?.status || "FREE",
      waiting: rows.filter((row) => !row.session).length,
      readyToStart: rows.filter((row) => row.canStart).length,
      loadedBoxes:
        rows.find((row) => row.key === activeKey)?.loadedBoxes || 0,
      pendingBoxes:
        rows.find((row) => row.key === activeKey)
          ?.pendingLoadBoxes || 0,
    },
  };
}

export function evaluateDockCompletion(row, confirmations = {}) {
  const blockers = [];

  if (!row?.session) {
    blockers.push("No existe una sesión de carga activa");
  } else if (row.session.status !== "LOADING") {
    blockers.push("La carga debe estar activa");
  }

  if (Number(row?.pendingLoadBoxes || 0) > 0) {
    blockers.push(
      `Faltan ${row.pendingLoadBoxes} cajas por cargar`
    );
  }

  if (row?.openIncidents?.length) {
    blockers.push(
      `Hay ${row.openIncidents.length} incidencias sin resolver`
    );
  }

  if (!confirmations.tractorConfirmed) {
    blockers.push("Falta confirmar la matrícula tractora");
  }

  if (!confirmations.trailerConfirmed) {
    blockers.push("Falta confirmar la matrícula del remolque");
  }

  if (!confirmations.sealConfirmed) {
    blockers.push("Falta confirmar la brida / precinto");
  }

  return {
    isComplete: blockers.length === 0,
    blockers,
  };
}

function missingTableError(error) {
  const text = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /f1012_loading_/i.test(text)
  );
}

export async function fetchDockLoadingData(
  supabase,
  reference = "F-1012"
) {
  if (!supabase) {
    throw new Error("Supabase no está disponible.");
  }

  const normalized = normalizeReference(reference);
  const [trucksResult, plansResult, sessionsResult] =
    await Promise.all([
      supabase
        .from("f1012_trucks")
        .select("*")
        .eq("reference", normalized)
        .order("truck_number", { ascending: false })
        .limit(300),
      supabase
        .from("f1012_truck_loading_plan")
        .select("*")
        .eq("reference", normalized)
        .limit(300),
      supabase
        .from("f1012_loading_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

  const firstError =
    trucksResult.error ||
    plansResult.error ||
    sessionsResult.error;

  if (firstError) {
    if (missingTableError(firstError)) {
      throw new Error(
        "Falta instalar la V2.33 en Supabase. Ejecuta FMCONTROL_V2_33_CARGA_MUELLE.sql."
      );
    }
    throw firstError;
  }

  const truckIds = (trucksResult.data || [])
    .map((truck) => truck?.id)
    .filter(Boolean);
  const sessionIds = (sessionsResult.data || [])
    .map((session) => session?.id)
    .filter(Boolean);
  const labelsQuery = truckIds.length
    ? supabase
        .from("f1012_box_labels")
        .select("id, camion_id, numero_caja, created_at")
        .in("camion_id", truckIds)
        .limit(10000)
    : Promise.resolve({ data: [], error: null });
  const sessionBoxesQuery = sessionIds.length
    ? supabase
        .from("f1012_loading_session_boxes")
        .select("*")
        .in("session_id", sessionIds)
        .order("loaded_at", { ascending: false })
        .limit(10000)
    : Promise.resolve({ data: [], error: null });
  const incidentsQuery = sessionIds.length
    ? supabase
        .from("f1012_loading_incidents")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(2000)
    : Promise.resolve({ data: [], error: null });
  const [labelsResult, boxesResult, incidentsResult] =
    await Promise.all([
      labelsQuery,
      sessionBoxesQuery,
      incidentsQuery,
    ]);
  const secondError =
    labelsResult.error ||
    boxesResult.error ||
    incidentsResult.error;

  if (secondError) throw secondError;

  return {
    trucks: trucksResult.data || [],
    plans: plansResult.data || [],
    sessions: sessionsResult.data || [],
    labels: labelsResult.data || [],
    sessionBoxes: boxesResult.data || [],
    incidents: incidentsResult.data || [],
  };
}

export async function startDockLoadingSession(
  supabase,
  {
    reference = "F-1012",
    truck,
    operatorCode = "",
    operatorName = "",
    targetBoxes = 49,
  }
) {
  const truckNumber = normalizeTruckNumber(truck?.truck_number);
  const normalizedOperator =
    normalizeText(operatorCode) || normalizeText(operatorName);

  if (!truck?.id || !truckNumber) {
    throw new Error("El camión seleccionado no es válido.");
  }

  if (!normalizedOperator) {
    throw new Error(
      "Indica el operario responsable de la carga."
    );
  }

  const { data: activeSession, error: activeError } =
    await supabase
      .from("f1012_loading_sessions")
      .select("*")
      .in("status", ["LOADING", "PAUSED"])
      .limit(1)
      .maybeSingle();

  if (activeError) throw activeError;

  if (
    activeSession &&
    (normalizeReference(activeSession.reference) !==
      normalizeReference(reference) ||
      Number(activeSession.truck_number) !== truckNumber)
  ) {
    throw new Error(
      `El muelle está ocupado por el camión ${activeSession.truck_number}.`
    );
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("f1012_loading_sessions")
      .select("*")
      .eq("reference", normalizeReference(reference))
      .eq("truck_number", truckNumber)
      .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.status === "COMPLETED") {
    throw new Error("La carga de este camión ya está finalizada.");
  }

  const payload = {
    reference: normalizeReference(reference),
    truck_number: truckNumber,
    truck_id: truck.id,
    status: "LOADING",
    operator_code: normalizeText(operatorCode),
    operator_name: normalizeText(operatorName),
    target_boxes: Math.max(1, Number(targetBoxes || 49)),
    started_at: existing?.started_at || new Date().toISOString(),
    paused_at: null,
    updated_at: new Date().toISOString(),
  };
  const query = existing?.id
    ? supabase
        .from("f1012_loading_sessions")
        .update(payload)
        .eq("id", existing.id)
    : supabase.from("f1012_loading_sessions").insert(payload);
  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "El muelle ya está ocupado por otra carga."
      );
    }
    throw error;
  }

  return data;
}

export async function setDockSessionStatus(
  supabase,
  sessionId,
  status
) {
  const normalizedStatus =
    status === "PAUSED" ? "PAUSED" : "LOADING";
  const { data, error } = await supabase
    .from("f1012_loading_sessions")
    .update({
      status: normalizedStatus,
      paused_at:
        normalizedStatus === "PAUSED"
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function scanDockBox(
  supabase,
  {
    sessionId,
    boxNumber,
    actor = "",
  }
) {
  const normalizedBox = normalizeScannedBoxNumber(boxNumber);

  if (!normalizedBox) {
    throw new Error("Introduce o escanea el número de caja.");
  }

  const { data, error } = await supabase.rpc(
    "fmcontrol_scan_loading_box",
    {
      p_session_id: sessionId,
      p_box_number: normalizedBox,
      p_actor: normalizeText(actor),
    }
  );

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `La caja ${normalizedBox} ya ha sido cargada.`
      );
    }
    throw new Error(
      error.message || "No se ha podido registrar la caja."
    );
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function createLoadingIncident(
  supabase,
  {
    session,
    incidentType = "OTHER",
    description,
    createdBy = "",
  }
) {
  const normalizedDescription = normalizeText(description);

  if (!session?.id || !normalizedDescription) {
    throw new Error("Describe la incidencia antes de guardarla.");
  }

  const allowedTypes = new Set(
    LOADING_INCIDENT_TYPES.map((item) => item.value)
  );
  const { data, error } = await supabase
    .from("f1012_loading_incidents")
    .insert({
      session_id: session.id,
      reference: session.reference,
      truck_number: session.truck_number,
      incident_type: allowedTypes.has(incidentType)
        ? incidentType
        : "OTHER",
      description: normalizedDescription,
      status: "OPEN",
      created_by: normalizeText(createdBy),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function resolveLoadingIncident(
  supabase,
  incidentId,
  {
    resolution = "",
    resolvedBy = "",
  } = {}
) {
  const { data, error } = await supabase
    .from("f1012_loading_incidents")
    .update({
      status: "RESOLVED",
      resolution: normalizeText(resolution),
      resolved_by: normalizeText(resolvedBy),
      resolved_at: new Date().toISOString(),
    })
    .eq("id", incidentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeDockLoadingSession(
  supabase,
  {
    sessionId,
    actor = "",
    confirmations,
  }
) {
  const { data, error } = await supabase.rpc(
    "fmcontrol_complete_loading_session",
    {
      p_session_id: sessionId,
      p_actor: normalizeText(actor),
      p_tractor_confirmed: Boolean(
        confirmations?.tractorConfirmed
      ),
      p_trailer_confirmed: Boolean(
        confirmations?.trailerConfirmed
      ),
      p_seal_confirmed: Boolean(
        confirmations?.sealConfirmed
      ),
    }
  );

  if (error) {
    throw new Error(
      error.message || "No se ha podido finalizar la carga."
    );
  }

  return Array.isArray(data) ? data[0] : data;
}
