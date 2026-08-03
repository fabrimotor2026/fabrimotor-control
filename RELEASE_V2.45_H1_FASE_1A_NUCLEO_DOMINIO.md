# V2.45 · Historia 1 · Fase 1A — Núcleo de dominio

## Objetivo

Introducir las capas `domain`, `application` e `infrastructure` para el expediente digital de trazabilidad sin modificar el comportamiento actual de FM Control.

## Archivos añadidos

- `src/domain/shared/Entity.js`
- `src/domain/shared/Result.js`
- `src/domain/traceability/TraceabilityDossier.js`
- `src/domain/traceability/TraceabilityRelations.js`
- `src/domain/traceability/TraceabilityTimeline.js`
- `src/domain/traceability/TraceabilityValidation.js`
- `src/domain/traceability/index.js`
- `src/application/traceability/BuildTraceabilityDossier.js`
- `src/application/traceability/index.js`
- `src/infrastructure/traceability/SupabaseTraceabilityRepository.js`
- `src/infrastructure/traceability/index.js`

## Garantías

- No modifica `App.jsx`, `LegacyApp.jsx`, Dashboard, Producción, Calidad, Etiquetas o Camiones.
- El dominio no importa React, JSX, Tailwind ni Supabase.
- La infraestructura es la única capa preparada para conocer Supabase.
- El repositorio de Supabase queda expresamente sin implementar hasta la Fase 1B.
