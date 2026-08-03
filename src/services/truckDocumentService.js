const TRUCK_DOCUMENTS_BUCKET = "fmcontrol-truck-documents";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "DELIVERY_NOTE",
  "CMR",
  "PHOTO",
  "OTHER",
]);

function safePathSegment(value, fallback = "documento") {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function uniqueId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDocumentType(value) {
  return ALLOWED_DOCUMENT_TYPES.has(value) ? value : "OTHER";
}

export async function fetchTruckDocuments(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
  }
) {
  const normalizedTruckNumber = Number(truckNumber);

  if (!Number.isInteger(normalizedTruckNumber)) return [];

  const { data, error } = await supabase
    .from("f1012_truck_documents")
    .select("*")
    .eq("reference", reference)
    .eq("truck_number", normalizedTruckNumber)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function uploadTruckDocument(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
    scheduleId = null,
    truckId = null,
    documentType = "OTHER",
    file,
    uploadedBy = "",
  }
) {
  const normalizedTruckNumber = Number(truckNumber);

  if (!Number.isInteger(normalizedTruckNumber) || normalizedTruckNumber <= 0) {
    throw new Error("El número de camión no es válido.");
  }

  if (!file) {
    throw new Error("Selecciona un archivo.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo supera el límite de 25 MB.");
  }

  const fileName = String(file.name || "documento");
  const filePath = [
    safePathSegment(reference, "F-1012"),
    `camion-${normalizedTruckNumber}`,
    `${Date.now()}-${uniqueId()}-${safePathSegment(fileName)}`,
  ].join("/");

  const { error: uploadError } = await supabase.storage
    .from(TRUCK_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("f1012_truck_documents")
    .insert({
      reference,
      truck_number: normalizedTruckNumber,
      schedule_id: scheduleId || null,
      truck_id: truckId || null,
      document_type: normalizeDocumentType(documentType),
      file_name: fileName,
      file_path: filePath,
      mime_type: file.type || null,
      file_size: Number(file.size || 0),
      uploaded_by: String(uploadedBy || "").trim(),
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage
      .from(TRUCK_DOCUMENTS_BUCKET)
      .remove([filePath]);

    throw insertError;
  }

  return data;
}

export async function createTruckDocumentDownloadUrl(
  supabase,
  document
) {
  if (!document?.file_path) {
    throw new Error("El documento no tiene una ruta válida.");
  }

  const { data, error } = await supabase.storage
    .from(TRUCK_DOCUMENTS_BUCKET)
    .createSignedUrl(document.file_path, 60, {
      download: document.file_name || true,
    });

  if (error) throw error;

  return data?.signedUrl || "";
}

export async function deleteTruckDocument(supabase, document) {
  if (!document?.id || !document?.file_path) {
    throw new Error("El documento no es válido.");
  }

  const { error: storageError } = await supabase.storage
    .from(TRUCK_DOCUMENTS_BUCKET)
    .remove([document.file_path]);

  if (storageError) throw storageError;

  const { error: deleteError } = await supabase
    .from("f1012_truck_documents")
    .delete()
    .eq("id", document.id);

  if (deleteError) throw deleteError;
}
