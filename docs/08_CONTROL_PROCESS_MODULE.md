# FM Control RC2
# 08 - Arquitectura del módulo Control de Proceso

## Objetivo

Definir la arquitectura del módulo Control de Proceso antes de continuar con la refactorización de `App.jsx`.

El objetivo no es cambiar el comportamiento actual, sino reorganizar el código para que FM Control sea más mantenible, modular y escalable.

---

## Principio rector

Durante RC2, el módulo Control de Proceso debe conservar exactamente el comportamiento validado en RC1.

No se añadirán nuevas funcionalidades dentro de esta fase.

---

## Responsabilidad del módulo

El módulo Control de Proceso será responsable de:

- Mostrar el puesto de trabajo del operario.
- Gestionar el formulario de verificación.
- Mostrar las cotas de control.
- Registrar mediciones.
- Mostrar el estado del control.
- Ejecutar el guardado del control.
- Iniciar el flujo de registro de pieza NO OK.
- Preparar el siguiente control tras guardar.

---

## Lo que NO debe gestionar

El módulo Control de Proceso no debe ser responsable de:

- Login de usuarios.
- Gestión de usuarios.
- Configuración general.
- Camiones.
- Etiquetas de expedición.
- Dashboard general.
- Administración.
- Sincronización global.
- Gestión completa de incidencias de calidad.

---

## Estructura objetivo

```text
src/
└── modules/
    └── control/
        ├── ControlProcessPanel.jsx
        ├── PieceHeader.jsx
        ├── MeasurementTable.jsx
        ├── MeasurementRow.jsx
        ├── ObservationPanel.jsx
        ├── ControlActions.jsx
        ├── VisualHelpButton.jsx
        ├── controlHelpers.js
        └── useControlProcess.js