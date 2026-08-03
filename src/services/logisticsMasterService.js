function cleanDisplayName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeLogisticsName(value) {
  return cleanDisplayName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
}

function missingMastersTableError(error) {
  const message = String(error?.message || "");

  if (
    error?.code === "42P01" ||
    message.includes("f1012_logistics_customers") ||
    message.includes("f1012_logistics_destinations") ||
    message.includes("f1012_logistics_carriers")
  ) {
    return new Error(
      "Falta crear los maestros logísticos en Supabase. " +
      "Ejecuta el archivo FMCONTROL_V2_22_MAESTROS_LOGISTICOS.sql."
    );
  }

  return new Error(
    error?.message ||
    "No se han podido actualizar los maestros logísticos."
  );
}

async function upsertByNormalizedName(
  supabase,
  table,
  name,
  updatedBy
) {
  const displayName = cleanDisplayName(name);
  const normalizedName = normalizeLogisticsName(displayName);

  if (!normalizedName) return null;

  const { data, error } = await supabase
    .from(table)
    .upsert(
      {
        name: displayName,
        normalized_name: normalizedName,
        active: true,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "normalized_name",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw missingMastersTableError(error);
  }

  return data;
}

async function upsertDestination(
  supabase,
  customerId,
  destination,
  updatedBy
) {
  const displayName = cleanDisplayName(destination);
  const normalizedName = normalizeLogisticsName(displayName);

  if (!customerId || !normalizedName) return null;

  const { data, error } = await supabase
    .from("f1012_logistics_destinations")
    .upsert(
      {
        customer_id: customerId,
        name: displayName,
        normalized_name: normalizedName,
        active: true,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "customer_id,normalized_name",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw missingMastersTableError(error);
  }

  return data;
}

export async function fetchLogisticsMasters(supabase) {
  const [
    customersResult,
    destinationsResult,
    carriersResult,
  ] = await Promise.all([
    supabase
      .from("f1012_logistics_customers")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("f1012_logistics_destinations")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("f1012_logistics_carriers")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const firstError =
    customersResult.error ||
    destinationsResult.error ||
    carriersResult.error;

  if (firstError) {
    throw missingMastersTableError(firstError);
  }

  return {
    customers: customersResult.data || [],
    destinations: destinationsResult.data || [],
    carriers: carriersResult.data || [],
  };
}

export async function ensureLogisticsMasters(
  supabase,
  {
    customerName,
    destination,
    carrierName,
    updatedBy,
  }
) {
  const cleanUpdatedBy =
    cleanDisplayName(updatedBy) || "Sistema";

  let customer = null;
  let savedDestination = null;
  let carrier = null;

  if (cleanDisplayName(customerName)) {
    customer = await upsertByNormalizedName(
      supabase,
      "f1012_logistics_customers",
      customerName,
      cleanUpdatedBy
    );

    if (cleanDisplayName(destination)) {
      savedDestination = await upsertDestination(
        supabase,
        customer?.id,
        destination,
        cleanUpdatedBy
      );
    }
  }

  if (cleanDisplayName(carrierName)) {
    carrier = await upsertByNormalizedName(
      supabase,
      "f1012_logistics_carriers",
      carrierName,
      cleanUpdatedBy
    );
  }

  return {
    customer,
    destination: savedDestination,
    carrier,
  };
}

export function getCustomerDestinations(
  logisticsMasters,
  customerName
) {
  const customers = logisticsMasters?.customers || [];
  const destinations = logisticsMasters?.destinations || [];
  const normalizedCustomer = normalizeLogisticsName(customerName);
  const customer = customers.find(
    (item) =>
      normalizeLogisticsName(item?.name) === normalizedCustomer
  );

  if (!customer) {
    return destinations;
  }

  return destinations.filter(
    (destination) =>
      destination?.customer_id === customer.id
  );
}
