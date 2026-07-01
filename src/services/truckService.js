export async function fetchOpenTruck(supabase, reference) {
  const { data, error } = await supabase
    .from("f1012_trucks")
    .select("*")
    .eq("reference", reference)
    .eq("status", "OPEN")
    .order("truck_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function fetchNextTruckNumber(supabase, reference) {
  const { data, error } = await supabase
    .from("f1012_trucks")
    .select("truck_number")
    .eq("reference", reference)
    .order("truck_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data?.truck_number ? Number(data.truck_number) + 1 : 1;
}

export async function createTruck(supabase, reference, createdBy = "", plannedDate = null) {
  const truckNumber = await fetchNextTruckNumber(supabase, reference);
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("f1012_trucks")
    .insert({
      reference,
      truck_number: truckNumber,
      planned_expedition_date: plannedDate || today,
      status: "OPEN",
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getActiveTruck(supabase, reference, createdBy = "") {
  let truck = await fetchOpenTruck(supabase, reference);

  if (!truck) {
    truck = await createTruck(supabase, reference, createdBy);
  }

  return truck;
}

export async function updateTruckExpeditionDate(supabase, truckId, newDate) {
  const { data, error } = await supabase
    .from("f1012_trucks")
    .update({
      planned_expedition_date: newDate,
    })
    .eq("id", truckId)
    .select()
    .single();

  if (error) throw error;

  return data;
}
export async function closeTruck(supabase, truckId) {
  const { data, error } = await supabase
    .from("f1012_trucks")
    .update({
      status: "CLOSED",
    })
    .eq("id", truckId)
    .select()
    .single();

  if (error) throw error;

  return data;
}