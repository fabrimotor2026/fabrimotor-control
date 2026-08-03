import { X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import Field from "../../../components/common/Field";

export default function AdminPanel({
  currentUser,
  onClose,
  printBoxLabelsReport,
  boxLabelsSummary,
  exportBoxLabelsExcel,
  boxLabels,
  adminUserForm,
  setAdminUserForm,
  userRoles,
  saveAdminUser,
  resetAdminUserForm,
  adminFilteredUsers,
  appUsers,
  adminSearch,
  setAdminSearch,
  editAdminUser,
  deleteAdminUser,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        padding: "20px",
      }}
    >
      <div className="flex max-h-[92vh] w-[min(1180px,96vw)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Panel Administrador
            </h2>

            <p className="text-sm text-slate-600">
              Alta, edición, cambio de contraseña y eliminación de usuarios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={printBoxLabelsReport}
              disabled={boxLabelsSummary.length === 0}
              className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:bg-slate-300"
            >
              Exportar PDF
            </button>

            <button
              type="button"
              onClick={exportBoxLabelsExcel}
              disabled={boxLabels.length === 0}
              className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white disabled:bg-slate-300"
            >
              Exportar Excel
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-700 hover:bg-slate-200"
              aria-label="Cerrar panel administrador"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="grid gap-5 overflow-auto p-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 text-lg font-black text-slate-900">
              Usuario
            </h3>

            <div className="grid gap-3">
              <Field label="Nº operario">
                <input
                  className="input"
                  value={adminUserForm.username}
                  onChange={(event) =>
                    setAdminUserForm({
                      ...adminUserForm,
                      username: event.target.value,
                    })
                  }
                  placeholder="Ejemplo: 2131"
                />
              </Field>

              <Field label="Nombre">
                <input
                  className="input"
                  value={adminUserForm.name}
                  onChange={(event) =>
                    setAdminUserForm({
                      ...adminUserForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="Nombre y apellidos"
                />
              </Field>

              <Field label="Contraseña">
                <input
                  className="input"
                  value={adminUserForm.password}
                  onChange={(event) =>
                    setAdminUserForm({
                      ...adminUserForm,
                      password: event.target.value,
                    })
                  }
                  placeholder="Contraseña"
                />
              </Field>

              <Field label="Rol">
                <select
                  className="input"
                  value={adminUserForm.role}
                  onChange={(event) =>
                    setAdminUserForm({
                      ...adminUserForm,
                      role: event.target.value,
                    })
                  }
                >
                  {userRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </Field>

              <Button
                type="button"
                onClick={saveAdminUser}
                className="rounded-2xl bg-[#1f6f73] font-bold text-white hover:bg-[#18595d]"
              >
                Guardar usuario
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={resetAdminUserForm}
                className="rounded-2xl"
              >
                Nuevo / limpiar
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Usuarios registrados
                </h3>

                <p className="text-sm text-slate-500">
                  {adminFilteredUsers.length} de {appUsers.length} usuarios.
                </p>
              </div>

              <input
                className="input sm:max-w-xs"
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
                placeholder="Buscar por nº, nombre o rol"
              />
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Rol</th>
                    <th className="px-3 py-2 text-left">Contraseña</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {adminFilteredUsers.map((user) => (
                    <tr
                      key={user.username}
                      className="border-t border-slate-200"
                    >
                      <td className="px-3 py-2 font-bold">
                        {user.username}
                      </td>

                      <td className="px-3 py-2">
                        {user.name}
                      </td>

                      <td className="px-3 py-2">
                        {user.role}
                      </td>

                      <td className="px-3 py-2">
                        {user.password || user.pin || ""}
                      </td>

                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => editAdminUser(user)}
                          className="mr-2 rounded-xl border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteAdminUser(user.username)}
                          disabled={user.username === currentUser?.username}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Los cambios se guardan localmente y se sincronizan con Supabase
              cuando hay conexión.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}