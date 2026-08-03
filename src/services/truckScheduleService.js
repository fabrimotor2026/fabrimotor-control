import { saveJointShipmentDetails } from "./jointShipmentService";

function normalizePlannedShipmentStatus(value) {
  return value === "READY" ? "READY" : "PENDING";
}

function normalizePlannedTruck(truck) {
  if (!truck || truck.status !== "PLANNED") {
    return truck;
  }

  return {
    ...truck,
    shipment_status: normalizePlannedShipmentStatus(
      truck.shipment_status
    ),
  };
}

export async function fetchTruckSchedule(supabase, reference = "F-1012") {
  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .select("*")
    .eq("reference", reference)
    .eq("status", "PLANNED")
    .order("planning_priority", {
      ascending: true,
      nullsFirst: false,
    })
    .order("planned_expedition_date", {
      ascending: true,
      nullsFirst: false,
    })
    .order("truck_number", { ascending: true });

  if (error) throw error;

  return (data || []).map(normalizePlannedTruck);
}

export async function createPlannedTruck(
  supabase,
  {
    reference = "F-1012",
    truckNumber,
    plannedExpeditionDate = null,
    actualExpeditionDate = null,
    customerName = "",
    destination = "",
    carrierName = "",
    tractorPlate = "",
    trailerPlate = "",
    sealNumber = "",
    vehiclePlate = "",
    deliveryNoteNumber = "",
    notes = "",
    createdBy = "",
    planningPriority = null,
  }
) {
  const normalizedTruckNumber = Number(truckNumber);
  const normalizedTractorPlate = String(
    tractorPlate || vehiclePlate || ""
  ).trim().toUpperCase();

  if (
    !Number.isInteger(normalizedTruckNumber) ||
    normalizedTruckNumber <= 0
  ) {
    throw new Error("El número del camión planificado no es válido.");
  }

  let normalizedPriority = Number(planningPriority);

  if (
    !Number.isInteger(normalizedPriority) ||
    normalizedPriority <= 0
  ) {
    const { data: lastPlanned, error: priorityError } =
      await supabase
        .from("f1012_truck_schedule")
        .select("planning_priority")
        .eq("reference", reference)
        .eq("status", "PLANNED")
        .order("planning_priority", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(1)
        .maybeSingle();

    if (priorityError) throw priorityError;

    normalizedPriority =
      Math.max(
        0,
        Number(lastPlanned?.planning_priority || 0)
      ) + 1;
  }

  const { data, error } = await supabase
    .from("f1012_truck_schedule")
    .insert({
      reference,
      truck_number: normalizedTruckNumber,
      planned_expedition_date: plannedExpeditionDate,
      actual_expedition_date: actualExpeditionDate || null,
      status: "PLANNED",
      shipment_status: "PENDING",
      customer_name: String(customerName || "").trim(),
      destination: String(destination || "").trim(),
      carrier_name: String(carrierName || "").trim(),
      tractor_plate: normalizedTractorPlate,
      trailer_plate: String(trailerPlate || "").trim().toUpperCase(),
      seal_number: String(sealNumber || "").trim(),
      vehicle_plate: normalizedTractorPlate,
      delivery_note_number: String(deliveryNoteNumber || "").trim(),
      notes: String(notes || "").trim(),
      created_by: createdBy,
      planning_priority: normalizedPriority,
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
    actualExpeditionDate = null,
    customerName = "",
    destination = "",
    carrierName = "",
    tractorPlate = "",
    trailerPlate = "",
    sealNumber = "",
    vehiclePlate = "",
    deliveryNoteNumber = "",
    shipmentStatus = "PENDING",
    notes = "",
    status,
    planningPriority = null,
  }
) {
  const normalizedTractorPlate = String(
    tractorPlate || vehiclePlate || ""
  ).trim().toUpperCase();
  const normalizedShipmentStatus =
    normalizePlannedShipmentStatus(shipmentStatus);

  const payload = {
    planned_expedition_date: plannedExpeditionDate || null,
    actual_expedition_date: actualExpeditionDate || null,
    shipment_status: normalizedShipmentStatus,
    customer_name: String(customerName || "").trim(),
    destination: String(destination || "").trim(),
    carrier_name: String(carrierName || "").trim(),
    tractor_plate: normalizedTractorPlate,
    trailer_plate: String(trailerPlate || "").trim().toUpperCase(),
    seal_number: String(sealNumber || "").trim(),
    vehicle_plate: normalizedTractorPlate,
    delivery_note_number: String(deliveryNoteNumber || "").trim(),
    notes: String(notes || "").trim(),
    updated_at: new Date().toISOString(),
  };

  if (status) {
    payload.status = status;
  }

  const normalizedPriority = Number(planningPriority);

  if (
    Number.isInteger(normalizedPriority) &&
    normalizedPriority > 0
  ) {
    payload.planning_priority = normalizedPriority;
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
    .order("planning_priority", {
      ascending: true,
      nullsFirst: false,
    })
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
      shipment_status: "PENDING",
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function copyPlannedTruckLogisticsToActiveTruck(
  supabase,
  activeTruckId,
  plannedTruck
) {
  if (!activeTruckId || !plannedTruck) return null;

  const payload = {
    planned_expedition_date:
      plannedTruck.planned_expedition_date || null,
    actual_expedition_date:
      plannedTruck.actual_expedition_date || null,
    shipment_status: "PENDING",
    customer_name:
      String(plannedTruck.customer_name || "").trim(),
    destination:
      String(plannedTruck.destination || "").trim(),
    carrier_name:
      String(plannedTruck.carrier_name || "").trim(),
    tractor_plate:
      String(
        plannedTruck.tractor_plate ||
        plannedTruck.vehicle_plate ||
        ""
      ).trim().toUpperCase(),
    trailer_plate:
      String(plannedTruck.trailer_plate || "").trim().toUpperCase(),
    seal_number:
      String(plannedTruck.seal_number || "").trim(),
    vehicle_plate:
      String(
        plannedTruck.tractor_plate ||
        plannedTruck.vehicle_plate ||
        ""
      ).trim().toUpperCase(),
    delivery_note_number:
      String(plannedTruck.delivery_note_number || "").trim(),
    notes:
      String(plannedTruck.notes || "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("f1012_trucks")
    .update(payload)
    .eq("id", activeTruckId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateActiveTruckLogistics(
  supabase,
  truckId,
  {
    plannedExpeditionDate = null,
    actualExpeditionDate = null,
    customerName = "",
    destination = "",
    carrierName = "",
    tractorPlate = "",
    trailerPlate = "",
    sealNumber = "",
    deliveryNoteNumber = "",
    notes = "",
  } = {}
) {
  if (!truckId) {
    throw new Error("No se ha podido identificar el camión.");
  }

  const normalizedTractorPlate = String(tractorPlate || "")
    .trim()
    .toUpperCase();

  const { data: currentTruck, error: currentTruckError } = await supabase
    .from("f1012_trucks")
    .select("id, joint_shipment_id")
    .eq("id", truckId)
    .single();

  if (currentTruckError) throw currentTruckError;

  if (currentTruck?.joint_shipment_id) {
    await saveJointShipmentDetails(
      supabase,
      currentTruck.joint_shipment_id,
      {
        plannedExpeditionDate,
        actualExpeditionDate,
        tractorPlate: normalizedTractorPlate,
        trailerPlate,
        sealNumber,
        notes,
      }
    );

    const { data: updatedTruck, error: updatedTruckError } = await supabase
      .from("f1012_trucks")
      .select("*")
      .eq("id", truckId)
      .single();

    if (updatedTruckError) throw updatedTruckError;

    return updatedTruck;
  }

  const { data, error } = await supabase
    .from("f1012_trucks")
    .update({
      planned_expedition_date: plannedExpeditionDate || null,
      actual_expedition_date: actualExpeditionDate || null,
      customer_name: String(customerName || "").trim(),
      destination: String(destination || "").trim(),
      carrier_name: String(carrierName || "").trim(),
      tractor_plate: normalizedTractorPlate,
      trailer_plate: String(trailerPlate || "").trim().toUpperCase(),
      seal_number: String(sealNumber || "").trim(),
      vehicle_plate: normalizedTractorPlate,
      delivery_note_number: String(deliveryNoteNumber || "").trim(),
      notes: String(notes || "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", truckId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function markTruckReadyForShipment(
  supabase,
  truckId
) {
  if (!truckId) return null;

  const { data, error } = await supabase
    .from("f1012_trucks")
    .update({
      shipment_status: "READY",
      updated_at: new Date().toISOString(),
    })
    .eq("id", truckId)
    .neq("shipment_status", "SHIPPED")
    .select()
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function markTruckAsShipped(
  supabase,
  truckId,
  {
    plannedExpeditionDate = null,
    actualExpeditionDate,
    customerName = "",
    destination = "",
    carrierName = "",
    tractorPlate,
    trailerPlate,
    sealNumber,
    deliveryNoteNumber = "",
    notes = "",
    shippedBy = "",
  } = {}
) {
  if (!truckId) {
    throw new Error("No se ha podido identificar el camión.");
  }

  const normalizedActualDate = String(actualExpeditionDate || "").trim();
  const normalizedTractorPlate = String(tractorPlate || "")
    .trim()
    .toUpperCase();
  const normalizedTrailerPlate = String(trailerPlate || "")
    .trim()
    .toUpperCase();
  const normalizedSealNumber = String(sealNumber || "").trim();

  if (
    !normalizedActualDate ||
    !normalizedTractorPlate ||
    !normalizedTrailerPlate ||
    !normalizedSealNumber
  ) {
    throw new Error(
      "Completa la fecha real, las dos matrículas y la brida antes de confirmar la expedición."
    );
  }

  const { data, error } = await supabase
    .from("f1012_trucks")
    .update({
      planned_expedition_date: plannedExpeditionDate || null,
      actual_expedition_date: normalizedActualDate,
      shipment_status: "SHIPPED",
      customer_name: String(customerName || "").trim(),
      destination: String(destination || "").trim(),
      carrier_name: String(carrierName || "").trim(),
      tractor_plate: normalizedTractorPlate,
      trailer_plate: normalizedTrailerPlate,
      seal_number: normalizedSealNumber,
      vehicle_plate: normalizedTractorPlate,
      delivery_note_number: String(deliveryNoteNumber || "").trim(),
      notes: String(notes || "").trim(),
      shipped_at: new Date().toISOString(),
      shipped_by: String(shippedBy || "Sistema").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", truckId)
    .eq("status", "CLOSED")
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "El camión debe estar cerrado en producción antes de marcarlo como expedido."
    );
  }

  return data;
}
