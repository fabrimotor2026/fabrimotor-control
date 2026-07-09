export async function fetchTruckSchedule(supabase, reference = "F-1012") {
  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .select("*")
    .eq("reference", reference)
    .order("truck_number", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function createPlannedTruck(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
    plannedExpeditionDate = null,
    notes = "",
    createdBy = "",
  }
) {
  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .insert({
      reference,
      truck_number: truckNumber,
      planned_expedition_date: plannedExpeditionDate,
      status: "PLANNED",
      notes,
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updatePlannedTruck(
  supabase,
  truckId,
  {
    plannedExpeditionDate,
    notes = "",
    status,
  }
) {
  const payload = {
    planned_expedition_date: plannedExpeditionDate || null,
    notes,
    updated_at: new Date().toISOString(),
  };

  if (status) {
    payload.status = status;
  }

  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .update(payload)
    .eq("id", truckId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deletePlannedTruck(supabase, truckId) {
  const { error } = await supabase
    .from("f1012_truck_schedule")
    .delete()
    .eq("id", truckId)
    .eq("status", "PLANNED");

  if (error) throw error;
}

export async function fetchNextPlannedTruck(supabase, reference = "F-1012") {
  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .select("*")
    .eq("reference", reference)
    .eq("status", "PLANNED")
    .order("planned_expedition_date", { ascending: true, nullsFirst: false })
    .order("truck_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function openPlannedTruck(supabase, scheduleId) {
  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .update({
      status: "OPEN",
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) throw error;

  return data;
}