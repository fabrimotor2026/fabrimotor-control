# FM Control RC1 — Arquitectura General

## 1. Objetivo

FM Control es un sistema MES ligero desarrollado para Fabrimotor, orientado al control de producción, trazabilidad, etiquetas, camiones, rechazos y gestión operativa en planta.

El objetivo de RC1 es consolidar una base estable, clara y preparada para crecer.

## 2. Filosofía

FM Control no tendrá una única interfaz para todos los usuarios.

Tendrá dos experiencias principales:

### FM Control Operator

Pensado para operarios.

Prioridad:
- Rapidez.
- Simplicidad.
- Sin scroll.
- Botones grandes.
- Control de proceso siempre visible.

### FM Control Manager

Pensado para responsables.

Prioridad:
- Visión global.
- Producción.
- Camiones.
- Dashboard.
- Trazabilidad.
- Estadísticas futuras.

## 3. Principio principal

La aplicación debe adaptarse a la forma real de trabajar de Fabrimotor, no al revés.

## 4. Dominios funcionales

FM Control se organiza en los siguientes dominios:

- Producción
- Control de proceso
- Etiquetas
- Cajas
- Camiones
- Rechazos
- Calidad
- Operarios
- Máquinas
- Estadísticas
- Configuración

## 5. Arquitectura de interfaz

### Operario

El operario entra directamente al Puesto de Trabajo.

No ve:
- Sidebar.
- Dashboard.
- Estadísticas.
- Menús complejos.

Ve:
- Control de proceso.
- Última etiqueta.
- Rechazo.
- Acciones principales.

### Responsable

El responsable accede al Workspace completo.

Ve:
- Sidebar.
- Header.
- Dashboard.
- Producción.
- Camiones.
- Command Palette.
- Buscador.

## 6. Arquitectura técnica

La aplicación se estructura en módulos:

- `modules/`
- `shared/`
- `layout/`
- `theme/`
- `config/`
- `services/`
- `docs/`

Cada módulo debe tener responsabilidad propia y no depender directamente de `App.jsx` salvo para integración general.

## 7. Regla de arquitectura

Ninguna funcionalidad nueva se añadirá directamente a `App.jsx`.

Toda nueva funcionalidad deberá vivir en un módulo propio o en un componente compartido reutilizable.

## 8. Principio de datos

El centro del sistema será la pieza.

Todo deberá poder trazarse a partir de un identificador único:

`piece_id`

La trazabilidad será:

Control de proceso  
→ Etiqueta  
→ Caja  
→ Camión  
→ Expedición  

Y si existe incidencia:

Control de proceso  
→ Rechazo  
→ Calidad  
→ Resolución  

## 9. Release Candidate 1

RC1 no tiene como objetivo añadir nuevas funcionalidades.

Tiene como objetivo:

- Estabilizar la aplicación.
- Eliminar scroll innecesario.
- Mejorar la experiencia del operario.
- Consolidar el modelo de datos.
- Documentar la arquitectura.
- Preparar FM Control 3.0.

## 10. Criterio de aceptación RC1

FM Control RC1 podrá considerarse validado cuando:

- Un operario pueda trabajar sin hacer scroll en los flujos principales.
- Un responsable pueda consultar producción y camiones rápidamente.
- La interfaz mantenga coherencia visual.
- La aplicación funcione varios días en fábrica sin incidencias críticas.
- La trazabilidad de pieza quede correctamente definida.