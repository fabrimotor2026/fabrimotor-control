function requireSupabase(supabase) {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `box_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchBoxCounter(supabase) {
  if (!supabase) return 1;

  const { data, error } = await supabase
    .from("f1012_box_counter")
    .select("current_number")
    .eq("id", "main")
    .single();

  if (error) throw error;

  return Number(data?.current_number || 1);
}

export async function updateBoxCounter(
  supabase,
  nextNumber,
  updatedBy = ""
) {
  requireSupabase(supabase);

  const numericNextNumber = Number(nextNumber);

  if (!Number.isFinite(numericNextNumber) || numericNextNumber < 1) {
    throw new Error("El siguiente número de caja no es válido.");
  }

  const { error } = await supabase
    .from("f1012_box_counter")
    .update({
      current_number: numericNextNumber,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "main");

  if (error) throw error;
}

export async function boxLabelExists(supabase, numeroCaja) {
  if (!supabase || !numeroCaja) return false;

  const { data, error } = await supabase
    .from("f1012_box_labels")
    .select("id")
    .eq("numero_caja", numeroCaja)
    .limit(1);

  if (error) {
    console.error("Error comprobando si la caja existe:", error);
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function fetchActiveTruck(supabase, reference = null) {
  if (!supabase) return null;

  let query = supabase
    .from("f1012_trucks")
    .select("*")
    .eq("status", "OPEN")
    .order("truck_number", { ascending: false })
    .limit(1);

  if (reference) {
    query = query.eq("reference", reference);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function fetchBoxLabels(supabase, truckId) {
  if (!supabase || !truckId) return [];

  const { data, error } = await supabase
    .from("f1012_box_labels")
    .select("*")
    .eq("camion_id", truckId)
    .order("numero_caja", { ascending: true })
    .order("linea", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveBoxLabel(supabase, labelData) {
  requireSupabase(supabase);

  if (!labelData?.numeroCaja) {
    throw new Error("La etiqueta no tiene número de caja.");
  }

  const truckId = labelData.camionId;

  if (!truckId) {
    throw new Error("No hay ningún camión activo asociado a la etiqueta.");
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const totalCaja = Number(labelData.totalCaja || 0);
  const rows = [];

  const addRow = (linea, fabricacion, colada, cantidad) => {
    const numericQuantity = Number(cantidad || 0);

    if (!fabricacion || !colada || numericQuantity <= 0) return;

    rows.push({
      id: createId(),
      label_id: labelData.numeroCaja,
      fecha,
      semana: labelData.semana,
      dia: labelData.dia,
      operario1: labelData.operario1,
      operario2: labelData.operario2 || "",
      numero_caja: labelData.numeroCaja,
      camion_id: truckId,
      linea,
      fabricacion,
      colada,
      cantidad: numericQuantity,
      total_caja: totalCaja,
      data: labelData,
    });
  };

  addRow(1, labelData.fab1, labelData.col1, labelData.cant1);
  addRow(2, labelData.fab2, labelData.col2, labelData.cant2);

  if (rows.length === 0) {
    throw new Error("La etiqueta no contiene ninguna línea válida para guardar.");
  }

  const { error } = await supabase
    .from("f1012_box_labels")
    .insert(rows);

  if (error) throw error;

  return rows;
}
