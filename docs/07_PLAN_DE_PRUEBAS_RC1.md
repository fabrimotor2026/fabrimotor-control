# FM Control RC1
# 07 - Plan de Pruebas y Homologación

## Objetivo

Validar que FM Control RC1 está preparado para trabajar en fábrica con estabilidad, claridad y trazabilidad.

---

## Matriz de homologación

| Módulo | Arquitectura | Datos | Flujos | IDS | Prueba fábrica | Estado |
|---|---|---|---|---|---|---|
| Login | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Control de Proceso | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Etiquetas | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Camiones | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Rechazos | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Dashboard | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Command Palette | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |
| Buscador | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pendiente |

---

# H1 - Auditoría de módulos

## Módulo 1: Control de Proceso

### Objetivo

Validar que el operario puede realizar su trabajo principal de forma rápida, clara y sin pasos innecesarios.

### Checklist

#### Arquitectura

- [ ] El módulo está separado del Workspace Manager.
- [ ] No depende directamente de pantallas de administración.
- [ ] La lógica está separada de la presentación cuando sea posible.

#### Modelo de datos

- [ ] El control genera o utiliza `production_control`.
- [ ] El control queda vinculado a `piece_id`.
- [ ] No se duplican datos innecesarios.
- [ ] El usuario queda registrado.
- [ ] Máquina, referencia, fabricación y colada quedan vinculadas.

#### Flujo operativo

- [ ] El operario entra directamente al Puesto de Trabajo.
- [ ] El foco queda en el campo principal.
- [ ] El botón Guardar Control de Proceso está visible.
- [ ] El flujo no requiere scroll vertical.
- [ ] Después de guardar, el sistema vuelve al punto lógico de trabajo.
- [ ] Si hay NO OK, se ofrece registrar rechazo.

#### IDS

- [ ] Botones grandes.
- [ ] Alto contraste.
- [ ] Información principal visible.
- [ ] Sin elementos innecesarios.
- [ ] Pantalla optimizada para 1920x1080.

#### Prueba en fábrica

- [ ] Probado por operario real.
- [ ] Sin incidencias críticas.
- [ ] Sin dudas durante el uso.
- [ ] Tiempo de uso aceptable.

### Resultado auditoría

Estado: Pendiente

Observaciones:

- 