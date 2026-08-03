# FM Control V2.45 - Sprint 2

## Pantalla de trazabilidad sobre V2.44 recuperada

Este Sprint incorpora la interfaz de consulta de trazabilidad sin conectarla todavía a `App.jsx`, `LegacyApp.jsx`, el menú lateral ni el workspace.

### Archivos añadidos

- `src/modules/traceability/TraceabilityPanel.jsx`
- `src/modules/traceability/components/TraceabilitySearch.jsx`
- `src/modules/traceability/components/TraceabilityStatus.jsx`
- `src/modules/traceability/components/TraceabilityTimeline.jsx`
- `src/modules/traceability/components/TraceabilityCard.jsx`

### Archivo actualizado

- `src/modules/traceability/index.js`

### Funciones incluidas

- Búsqueda combinable por caja/etiqueta, pieza, fabricación/OF, colada/lote, referencia, operario y camión.
- Consulta del motor creado en el Sprint 1.
- Resumen de verificaciones, incidencias, cajas/etiquetas y camiones.
- Identificación de relaciones exactas, fuertes y compatibles.
- Línea temporal ordenada por fecha.
- Estado de trazabilidad enlazada, parcial o con incidencias.
- Preparación para abrir posteriormente el registro original.
- Impresión desde el navegador.

### Aislamiento

Este Sprint no modifica:

- `src/App.jsx`
- `src/LegacyApp.jsx`
- `src/layout/`
- Producción
- Calidad
- Etiquetas
- Camiones
- Dashboard

La pantalla se exporta desde el módulo, pero permanece sin integrar en la navegación general hasta un Sprint posterior.
