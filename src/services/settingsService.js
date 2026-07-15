export async function fetchAppSetting(
  supabase,
  key
) {
  if (!supabase || !key) {
    return null;
  }

  const { data, error } = await supabase
    .from("fabrimotor_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error) {
    throw error;
  }

  return data?.value || null;
}

export async function updateAppSetting(
  supabase,
  key,
  value,
  updatedBy = ""
) {
  if (!supabase || !key) {
    return null;
  }

  const payload = {
    key,
    value,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("fabrimotor_settings")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}