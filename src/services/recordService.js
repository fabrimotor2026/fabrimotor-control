export async function fetchSharedRecords(supabase) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("fabrimotor_records")
    .select("data")
    .order("saved_at_ms", { ascending: false });

  if (error) throw error;

  return (data || [])
    .map((row) => row.data)
    .filter(Boolean);
}

export async function upsertSharedRecord(
  supabase,
  record
) {
  if (!supabase || !record?.id) {
    return null;
  }

  const payload = {
    id: record.id,
    reference:
      record.referencia || "F-1012",
    machine:
      record.maquina || "",
    operator_user:
      record.usuarioSistema || "",
    operator_name:
      record.operario || "",
    piece_number:
      String(record.numeroPieza || ""),
    work_order:
      record.ordenFabricacion || "",
    lot:
      record.lote || "",
    result:
      record.resultado || "",
    saved_at_ms:
      record.savedAtMs || Date.now(),
    data: record,
  };

  const { data, error } = await supabase
    .from("fabrimotor_records")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteSharedRecord(
  supabase,
  recordId
) {
  if (!supabase || !recordId) return;

  const { error } = await supabase
    .from("fabrimotor_records")
    .delete()
    .eq("id", recordId);

  if (error) throw error;
}