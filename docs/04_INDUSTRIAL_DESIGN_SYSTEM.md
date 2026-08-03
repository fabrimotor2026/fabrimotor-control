# FM Control RC1
# 04 - Industrial Design System (IDS)

---

# Objetivo

El Industrial Design System (IDS) define las normas visuales y de interacción de FM Control.

Su objetivo es garantizar una experiencia uniforme, rápida y adecuada para un entorno industrial.

El criterio principal no es la estética, sino la facilidad de uso en fábrica.

---

# Principios

1. Legibilidad antes que decoración.
2. La información crítica debe verse en menos de tres segundos.
3. Los botones principales siempre visibles.
4. Ningún flujo principal requerirá scroll vertical.
5. Alto contraste para monitores industriales.
6. Interfaz adaptada al rol del usuario.

---

# Usuarios

FM Control tiene dos experiencias diferenciadas.

## Operator

Pensado para operarios.

Características:

- Acceso directo al Puesto de Trabajo.
- Sin Dashboard.
- Sin Sidebar.
- Sin menús complejos.
- Botones grandes.
- Navegación mínima.
- Flujo continuo.

## Manager

Pensado para responsables.

Características:

- Dashboard.
- Sidebar.
- KPIs.
- Producción.
- Camiones.
- Calidad.
- Estadísticas.
- Command Palette.

---

# Paleta de colores

## Primario

Azul industrial.

Uso:

- Botones principales.
- Acciones positivas.
- Elementos activos.

## Éxito

Verde.

Uso:

- Producción correcta.
- OK.
- Confirmaciones.

## Aviso

Amarillo.

Uso:

- Advertencias.
- Atención.

## Error

Rojo.

Uso:

- Rechazos.
- Alarmas.
- Incidencias.

## Información

Gris / Azul suave.

Uso:

- Datos secundarios.
- Paneles.
- Etiquetas informativas.

---

# Tipografía

Fuente única para toda la aplicación.

Prioridades:

- Alta legibilidad.
- Tamaño mínimo adecuado.
- Contraste elevado.

No se utilizarán fuentes decorativas.

---

# Iconografía

Los iconos deben:

- Ser simples.
- Tener significado claro.
- Mantener estilo uniforme.
- Acompañar al texto cuando la acción sea importante.

Nunca depender únicamente del color.

---

# Botones

## Principal

Uso:

- Guardar.
- Imprimir.
- Registrar.

Características:

- Gran tamaño.
- Alto contraste.
- Fácil pulsación.

## Secundario

Uso:

- Cancelar.
- Volver.
- Limpiar.

## Destructivo

Uso:

- Eliminar.
- Anular.
- Cerrar definitivamente.

Siempre requerirá confirmación.

---

# Tarjetas

Toda la información se agrupará mediante Cards.

Cada Card tendrá:

- Título.
- Contenido.
- Espaciado uniforme.
- Bordes suaves.
- Contraste suficiente.

---

# Workspaces

Cada Workspace representa una tarea.

Ejemplos:

- Control de Proceso.
- Etiqueta.
- Camión.
- Calidad.

Reglas:

- Sin scroll vertical.
- Información principal visible.
- Paneles bien alineados.
- Márgenes uniformes.

---

# Distribución

Resoluciones objetivo:

- 1920 × 1080
- 2560 × 1440

El diseño se optimizará para pantallas de oficina de 24" y 27".

---

# Sidebar

Solo disponible para perfiles Manager.

Debe mostrar:

- Producción.
- Camiones.
- Calidad.
- Operarios.
- Configuración.

El Operario no utilizará Sidebar.

---

# Header

Siempre visible.

Debe incluir:

- Usuario conectado.
- Rol.
- Command Palette.
- Estado de conexión.
- Hora.

---

# Dashboard

Solo Manager.

Debe mostrar:

- Producción.
- Camiones abiertos.
- Últimos rechazos.
- KPIs.
- Alertas.

---

# Puesto de Trabajo

Solo Operator.

Debe mostrar siempre:

- Control de Proceso.
- Última etiqueta.
- Registrar rechazo.
- Guardar control.

Sin elementos innecesarios.

---

# Estados visuales

## OK

Verde.

## Atención

Amarillo.

## Error

Rojo.

## Información

Azul / Gris.

Todos los estados deberán representarse mediante:

- Color.
- Icono.
- Texto.

---

# Responsive

La prioridad es escritorio.

El sistema podrá adaptarse a resoluciones menores, pero no se optimizará para uso móvil.

---

# Accesibilidad

- Alto contraste.
- Texto legible.
- Botones grandes.
- Navegación mediante teclado cuando sea posible.
- No depender únicamente del color.

---

# Reglas de diseño

Toda nueva pantalla deberá cumplir:

- Coherencia con el IDS.
- Sin scroll innecesario.
- Información principal visible.
- Acciones principales accesibles.
- Espaciados uniformes.

---

# Componentes base

El proyecto utilizará componentes reutilizables:

- Button
- Card
- Badge
- Panel
- Modal
- Table
- KPI Card
- Status Badge

---

# Filosofía

Si una decisión mejora la estética pero dificulta el trabajo en fábrica, no se implementará.

La prioridad absoluta es la productividad del operario y la claridad para el responsable de producción.

---

# Estado

Documento aprobado para RC1.

Toda nueva interfaz deberá respetar este Industrial Design System.