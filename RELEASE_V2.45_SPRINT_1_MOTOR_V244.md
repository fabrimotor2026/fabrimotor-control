# FM Control V2.45 — Sprint 1

## Motor de trazabilidad adaptado a la V2.44 recuperada

Este Sprint añade exclusivamente la capa de datos y relaciones del nuevo módulo de trazabilidad.

### Tablas consultadas

- `fabrimotor_records`: verificaciones realizadas por los operarios.
- `fabr_motor_incidents`: incidencias y rechazos.
- `f1012_box_labels`: etiquetas y líneas de caja de F-1012/F-1013.
- `f1012_trucks`: camiones de ambas referencias.

### Criterios de búsqueda admitidos

- Número de caja o código de etiqueta.
- Número de pieza.
- Fabricación u orden de fabricación.
- Colada o lote.
- Referencia F-1012/F-1013.
- Operario.
- Número de camión.

### Relaciones

- `EXACT`: vínculo real entre caja y camión mediante `camion_id`.
- `STRONG`: coincidencia de referencia y varios datos productivos.
- `COMPATIBLE`: coincidencia suficiente para mostrar un vínculo contextual.

La coincidencia por referencia, por sí sola, no relaciona registros.

### Seguridad del cambio

- No modifica `App.jsx`.
- No modifica `LegacyApp.jsx`.
- No modifica menús, pantallas ni servicios existentes.
- No requiere cambios SQL.
- No se conecta todavía a la interfaz.

Este Sprint debe guardarse en la rama `feature/v245-trazabilidad-v244` y validarse con `npm run build` antes de continuar.
