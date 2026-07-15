export async function fetchSharedIncidents(supabase) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("fabr_motor_incidents")
    .select("data")
    .order("saved_at_ms", { ascending: false });

  if (error) throw error;

  return (data || [])
    .map((row) => row.data)
    .filter(Boolean);
}

export async function upsertSharedIncident(
  supabase,
  incident
) {
  if (!supabase || !incident?.id) {
    return null;
  }

  const payload = {
    id: incident.id,
    reference: incident.referencia || "F-1012",
    machine: incident.maquina || "",
    operator_name: incident.operario || "",
    label_code:
      incident.codigoEtiqueta ||
      incident.numeroPieza ||
      "",
    result: incident.chatarra || "",
    saved_at_ms:
      Date.parse(incident.createdAt) ||
      Date.now(),
    data: incident,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("fabr_motor_incidents")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteSharedIncident(
  supabase,
  incidentId
) {
  if (!supabase || !incidentId) return;

  const { error } = await supabase
    .from("fabr_motor_incidents")
    .delete()
    .eq("id", incidentId);

  if (error) throw error;
}