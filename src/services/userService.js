export function normalizeUserRole(role) {
  const value = String(role || "").trim();

  if (value === "Encargado") return "Responsable";
  if (value === "Administracion") return "Administrativo";

  return value || "Operario";
}

export function normalizeUser(user) {
  const password = user?.password || user?.pin || "";

  return {
    username: String(user?.username || "").trim(),
    name: String(user?.name || "").trim(),
    password,
    role: normalizeUserRole(user?.role),
    pin: user?.pin || password,
    active: user?.active !== false,
  };
}

export async function fetchSharedUsers(supabase) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("fabrimotor_users")
    .select("*")
    .order("username", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) =>
    normalizeUser({
      username: row.username,
      name: row.name,
      password: row.password || row.pin || "",
      role: row.role,
      pin: row.pin || row.password || "",
      active: row.active !== false,
    })
  );
}

export async function upsertSharedUser(supabase, user) {
  if (!supabase || !user?.username) return null;

  const normalizedUser = normalizeUser(user);

  const { data, error } = await supabase
    .from("fabrimotor_users")
    .upsert({
      username: normalizedUser.username,
      name: normalizedUser.name,
      role: normalizedUser.role,
      password: normalizedUser.password,
      pin: normalizedUser.pin || normalizedUser.password,
      active: normalizedUser.active,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteSharedUser(supabase, username) {
  if (!supabase || !username) return;

  const { error } = await supabase
    .from("fabrimotor_users")
    .delete()
    .eq("username", username);

  if (error) throw error;
}

export async function replaceSharedUsers(
  supabase,
  users = []
) {
  if (!supabase) return;

  const { error: deleteError } = await supabase
    .from("fabrimotor_users")
    .delete()
    .neq("username", "__never__");

  if (deleteError) throw deleteError;

  if (!users.length) return;

  const rows = users
    .map(normalizeUser)
    .filter((user) => user.username)
    .map((user) => ({
      username: user.username,
      name: user.name,
      role: user.role,
      password: user.password,
      pin: user.pin || user.password,
      active: user.active,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("fabrimotor_users")
    .upsert(rows);

  if (error) throw error;
}