Login añadido al sistema FabriMotor

Usuarios iniciales:
- admin / 1234      Rol: Administrador
- calidad / 1111    Rol: Calidad
- operario / 2222   Rol: Operario

Cambios incluidos:
- Pantalla de acceso con logo FabriMotor.
- Sesión guardada en localStorage.
- Tarjeta de usuario conectado en el menú lateral.
- Botón Cerrar sesión.
- El nombre del usuario se carga como operario por defecto.
- Cada registro guarda usuarioSistema y rolUsuarioSistema.
- Exportación Excel incluye Usuario sistema y Rol usuario.

Para cambiar usuarios o contraseñas:
Abre src/App.jsx y busca:
const USERS = [ ... ];
