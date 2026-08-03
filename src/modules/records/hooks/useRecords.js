import { useEffect, useState } from "react";

import {
  fetchSharedRecords,
} from "../../../services/recordService";

export default function useRecords({
  supabase,
  isSupabaseConfigured,
  storageKey = "f1012-zona-b",
}) {
  const [records, setRecords] = useState(() => {
    try {
      const storedRecords = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      return Array.isArray(storedRecords)
        ? storedRecords
        : [];
    } catch {
      return [];
    }
  });

  const [databaseMode, setDatabaseMode] = useState(
    isSupabaseConfigured
      ? "Conectando..."
      : "Local"
  );

  const [lastSyncAt, setLastSyncAt] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSharedRecords = async () => {
      if (
        !isSupabaseConfigured ||
        !supabase
      ) {
        setDatabaseMode("Local");
        return;
      }

      try {
        setDatabaseMode("Conectando...");

        const sharedRecords =
          await fetchSharedRecords(
            supabase
          );

        if (
          cancelled ||
          !Array.isArray(sharedRecords)
        ) {
          return;
        }

        setRecords(sharedRecords);

        localStorage.setItem(
          storageKey,
          JSON.stringify(sharedRecords)
        );

        setDatabaseMode("Compartida");

        setLastSyncAt(
          new Date().toLocaleString("es-ES")
        );
      } catch (error) {
        console.error(
          "No se han podido cargar los registros de Supabase:",
          error
        );

        setDatabaseMode("Local sin conexión");
      }
    };

    loadSharedRecords();

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
      .channel("fabrimotor_records_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fabrimotor_records",
        },
        async () => {
          console.log(
            "CAMBIO DETECTADO EN REGISTROS"
          );

          try {
            const sharedRecords =
              await fetchSharedRecords(
                supabase
              );

            if (
              Array.isArray(sharedRecords)
            ) {
              setRecords(sharedRecords);

              localStorage.setItem(
                storageKey,
                JSON.stringify(sharedRecords)
              );

              setDatabaseMode("Compartida");

              setLastSyncAt(
                new Date().toLocaleString("es-ES")
              );
            }
          } catch (error) {
            console.error(
              "Error actualizando registros en tiempo real:",
              error
            );

            setDatabaseMode(
              "Local sin conexión"
            );
          }
        }
      )
      .subscribe((status, error) => {
        console.log(
          "Realtime records status:",
          status
        );

        if (error) {
          console.error(
            "Realtime records error:",
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

  const refreshSharedRecords = async () => {
    if (
      !isSupabaseConfigured ||
      !supabase
    ) {
      throw new Error(
        "La base de datos compartida no está configurada."
      );
    }

    try {
      setDatabaseMode("Conectando...");

      const sharedRecords =
        await fetchSharedRecords(
          supabase
        );

      const nextRecords = Array.isArray(
        sharedRecords
      )
        ? sharedRecords
        : [];

      setRecords(nextRecords);

      localStorage.setItem(
        storageKey,
        JSON.stringify(nextRecords)
      );

      setDatabaseMode("Compartida");

      setLastSyncAt(
        new Date().toLocaleString("es-ES")
      );

      return nextRecords;
    } catch (error) {
      setDatabaseMode(
        "Local sin conexión"
      );

      throw error;
    }
  };

  return {
    records,
    setRecords,

    databaseMode,
    setDatabaseMode,

    lastSyncAt,
    setLastSyncAt,

    refreshSharedRecords,
  };
}