import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteSharedUser,
  fetchSharedUsers,
  normalizeUser,
  upsertSharedUser,
} from "../../../services/userService";

const DEFAULT_USER_FORM = {
  username: "",
  name: "",
  password: "",
  role: "Operario",
};

export default function useUsers({
  supabase,
  isSupabaseConfigured,
  defaultUsers = [],
  storageKey = "fabrimotor-users",
} = {}) {
  const getStoredUsers = () => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(storageKey) || "null"
      );

      return Array.isArray(stored) && stored.length
        ? stored
        : defaultUsers;
    } catch {
      return defaultUsers;
    }
  };

  const [appUsers, setAppUsers] = useState(
    getStoredUsers
  );

  const [adminSearch, setAdminSearch] =
    useState("");

  const [adminUserForm, setAdminUserForm] =
    useState(DEFAULT_USER_FORM);

  const [showAdminPanel, setShowAdminPanel] =
    useState(false);

  const [usersMode, setUsersMode] = useState(
    isSupabaseConfigured
      ? "Conectando..."
      : "Local"
  );

  const [
    lastUsersSyncAt,
    setLastUsersSyncAt,
  ] = useState("");

  const saveStoredUsers = (users) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify(users || [])
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadSharedUsers = async () => {
      if (
        !isSupabaseConfigured ||
        !supabase
      ) {
        setUsersMode("Local");
        return;
      }

      try {
        setUsersMode("Conectando...");

        const sharedUsers =
          await fetchSharedUsers(supabase);

        if (
          cancelled ||
          !Array.isArray(sharedUsers) ||
          sharedUsers.length === 0
        ) {
          return;
        }

        setAppUsers(sharedUsers);
        saveStoredUsers(sharedUsers);
        setUsersMode("Compartidos");
        setLastUsersSyncAt(
          new Date().toLocaleString("es-ES")
        );
      } catch (error) {
        console.error(
          "No se han podido cargar usuarios de Supabase:",
          error
        );

        if (!cancelled) {
          setUsersMode("Local sin conexión");
        }
      }
    };

    loadSharedUsers();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    isSupabaseConfigured,
  ]);

  const adminFilteredUsers = useMemo(() => {
    const query = adminSearch
      .trim()
      .toLowerCase();

    if (!query) return appUsers;

    return appUsers.filter((user) =>
      String(user.username || "")
        .toLowerCase()
        .includes(query) ||
      String(user.name || "")
        .toLowerCase()
        .includes(query) ||
      String(user.role || "")
        .toLowerCase()
        .includes(query)
    );
  }, [appUsers, adminSearch]);

  const operatorUsers = useMemo(
    () =>
      appUsers
        .filter(
          (user) =>
            user.role === "Operario" &&
            user.active !== false
        )
        .sort((a, b) =>
          String(a.username).localeCompare(
            String(b.username)
          )
        ),
    [appUsers]
  );

  const resetAdminUserForm = () => {
    setAdminUserForm(DEFAULT_USER_FORM);
  };

  const editAdminUser = (user) => {
    setAdminUserForm({
      username: user.username,
      name: user.name,
      password:
        user.password || user.pin || "",
      role: user.role,
    });
  };

  const saveAdminUser = async () => {
    const username =
      adminUserForm.username.trim();

    const name =
      adminUserForm.name.trim();

    const password =
      adminUserForm.password.trim();

    const role =
      adminUserForm.role || "Operario";

    if (!username || !name || !password) {
      throw new Error(
        "Debe indicar nº operario, nombre y contraseña."
      );
    }

    const userToSave = normalizeUser({
      username,
      name,
      password,
      role,
    });

    const exists = appUsers.some(
      (user) =>
        user.username === username
    );

    const nextUsers = exists
      ? appUsers.map((user) =>
          user.username === username
            ? userToSave
            : user
        )
      : [...appUsers, userToSave];

    setAppUsers(nextUsers);
    saveStoredUsers(nextUsers);
    resetAdminUserForm();

    if (
      !isSupabaseConfigured ||
      !supabase
    ) {
      setUsersMode("Local");
      return {
        user: userToSave,
        shared: false,
      };
    }

    try {
      await upsertSharedUser(
        supabase,
        userToSave
      );

      setUsersMode("Compartidos");
      setLastUsersSyncAt(
        new Date().toLocaleString("es-ES")
      );

      return {
        user: userToSave,
        shared: true,
      };
    } catch (error) {
      console.error(
        "Error guardando usuario en Supabase:",
        error
      );

      setUsersMode("Local sin conexión");
      throw error;
    }
  };

  const deleteAdminUser = async (
    username,
    currentUsername = ""
  ) => {
    if (username === currentUsername) {
      throw new Error(
        "No puedes eliminar el usuario con la sesión abierta."
      );
    }

    const nextUsers = appUsers.filter(
      (user) =>
        user.username !== username
    );

    setAppUsers(nextUsers);
    saveStoredUsers(nextUsers);

    if (
      !isSupabaseConfigured ||
      !supabase
    ) {
      setUsersMode("Local");
      return;
    }

    try {
      await deleteSharedUser(
        supabase,
        username
      );

      setUsersMode("Compartidos");
      setLastUsersSyncAt(
        new Date().toLocaleString("es-ES")
      );
    } catch (error) {
      console.error(
        "Error eliminando usuario en Supabase:",
        error
      );

      setUsersMode("Local sin conexión");
      throw error;
    }
  };

  const refreshSharedUsers = async () => {
    if (
      !isSupabaseConfigured ||
      !supabase
    ) {
      throw new Error(
        "Los usuarios compartidos no están configurados."
      );
    }

    setUsersMode("Conectando...");

    try {
      const sharedUsers =
        await fetchSharedUsers(supabase);

      const nextUsers =
        Array.isArray(sharedUsers) &&
        sharedUsers.length > 0
          ? sharedUsers
          : getStoredUsers();

      setAppUsers(nextUsers);
      saveStoredUsers(nextUsers);
      setUsersMode("Compartidos");
      setLastUsersSyncAt(
        new Date().toLocaleString("es-ES")
      );

      return nextUsers;
    } catch (error) {
      setUsersMode("Local sin conexión");
      throw error;
    }
  };

  return {
    appUsers,
    setAppUsers,

    operatorUsers,
    adminFilteredUsers,

    adminSearch,
    setAdminSearch,

    adminUserForm,
    setAdminUserForm,

    showAdminPanel,
    setShowAdminPanel,

    usersMode,
    lastUsersSyncAt,

    saveAdminUser,
    editAdminUser,
    deleteAdminUser,
    resetAdminUserForm,
    refreshSharedUsers,
  };
}