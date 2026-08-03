/**
 * Adaptador de infraestructura para Supabase.
 * En la Fase 1A define el contrato sin ejecutar consultas reales.
 */
export class SupabaseTraceabilityRepository {
  constructor(supabaseClient) {
    if (!supabaseClient) {
      throw new TypeError("SupabaseTraceabilityRepository requiere un cliente Supabase.");
    }
    this.supabase = supabaseClient;
  }

  async loadDossierData() {
    throw new Error("SupabaseTraceabilityRepository.loadDossierData no implementado en Fase 1A.");
  }
}

export default SupabaseTraceabilityRepository;
