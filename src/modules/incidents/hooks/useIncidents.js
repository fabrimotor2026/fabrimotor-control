import { useEffect, useState } from "react";

import {
  fetchSharedIncidents,
  upsertSharedIncident,
} from "../../../services/incidentService";

const INITIAL_INCIDENT_FORM = {
  codigoEtiqueta: "",
  numeroFabricacion: "",
  numeroColada: "",
  tipoFallo: "Mecanizado",
  descripcion: "",
  piezasAfectadas: "1",
  piezaAnterior: "",
  piezaPosterior: "",
  recuperable: "NO",
  chatarra: "SI",
  pesoKg: "",
  costeKg: "",
};

export default function useIncidents({
  supabase,
  isSupabaseConfigured,
  storageKey = "f1012-incidents",
} = {}) {
  const [incidents, setIncidents] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  const [incidentForm, setIncidentForm] = useState(
    INITIAL_INCIDENT_FORM
  );

  const [showIncidentModal, setShowIncidentModal] =
    useState(false);

  const [
    showIncidentsListModal,
    setShowIncidentsListModal,
  ] = useState(false);

  const [show8DModal, setShow8DModal] =
    useState(false);

  const [selected8D, setSelected8D] =
    useState(null);

  const persistIncidents = (nextIncidents) => {
    setIncidents(nextIncidents);

    localStorage.setItem(
      storageKey,
      JSON.stringify(nextIncidents)
    );
  };

  const resetIncidentForm = () => {
    setIncidentForm(INITIAL_INCIDENT_FORM);
  };

  const openIncidentModal = (initialValues = {}) => {
    setIncidentForm((previous) => ({
      ...previous,
      ...initialValues,
    }));

    setShowIncidentModal(true);
  };

  const closeIncidentModal = () => {
    setShowIncidentModal(false);
  };

  const openIncidentsListModal = () => {
    setShowIncidentsListModal(true);
  };

  const closeIncidentsListModal = () => {
    setShowIncidentsListModal(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadIncidents = async () => {
      if (
        !isSupabaseConfigured ||
        !supabase
      ) {
        return;
      }

      try {
        const sharedIncidents =
          await fetchSharedIncidents(supabase);

        if (
          cancelled ||
          !Array.isArray(sharedIncidents)
        ) {
          return;
        }

        persistIncidents(sharedIncidents);
      } catch (error) {
        console.error(
          "No se han podido cargar incidencias de Supabase:",
          error
        );
      }
    };

    loadIncidents();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    isSupabaseConfigured,
    storageKey,
  ]);

  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      !supabase
    ) {
      return undefined;
    }

    const channel = supabase
      .channel("fabr_motor_incidents_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fabr_motor_incidents",
        },
        async () => {
          console.log(
            "CAMBIO DETECTADO EN INCIDENTES"
          );

          try {
            const sharedIncidents =
              await fetchSharedIncidents(
                supabase
              );

            if (
              Array.isArray(sharedIncidents)
            ) {
              persistIncidents(
                sharedIncidents
              );
            }
          } catch (error) {
            console.error(
              "Error actualizando incidencias en tiempo real:",
              error
            );
          }
        }
      )
      .subscribe((status, error) => {
        console.log(
          "Realtime incidents status:",
          status
        );

        if (error) {
          console.error(
            "Realtime incidents error:",
            error
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    isSupabaseConfigured,
    storageKey,
  ]);

  const addIncident = async (incident) => {
    const nextIncidents = [
      incident,
      ...incidents,
    ];

    persistIncidents(nextIncidents);

    if (
      !isSupabaseConfigured ||
      !supabase
    ) {
      return {
        incident,
        shared: false,
      };
    }

    try {
      await upsertSharedIncident(
        supabase,
        incident
      );

      return {
        incident,
        shared: true,
      };
    } catch (error) {
      console.error(
        "Error guardando incidencia en Supabase:",
        error
      );

      throw error;
    }
  };

  const saveIncidentsUpdate = async (
    nextIncidents,
    updatedIncident = null
  ) => {
    persistIncidents(nextIncidents);

    if (
      !updatedIncident ||
      !isSupabaseConfigured ||
      !supabase
    ) {
      return;
    }

    await upsertSharedIncident(
      supabase,
      updatedIncident
    );
  };

  return {
    incidents,
    setIncidents,
    persistIncidents,

    incidentForm,
    setIncidentForm,
    resetIncidentForm,

    showIncidentModal,
    setShowIncidentModal,
    openIncidentModal,
    closeIncidentModal,

    showIncidentsListModal,
    setShowIncidentsListModal,
    openIncidentsListModal,
    closeIncidentsListModal,

    show8DModal,
    setShow8DModal,

    selected8D,
    setSelected8D,

    addIncident,
    saveIncidentsUpdate,
  };
}