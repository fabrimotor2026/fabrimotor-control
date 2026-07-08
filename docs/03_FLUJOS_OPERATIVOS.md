# FM Control RC1
# 03 - Flujos Operativos

---

## Objetivo

Este documento define los flujos operativos principales de FM Control.

No describe pantallas ni componentes técnicos. Describe cómo debe comportarse el sistema en el trabajo real de Fabrimotor.

Toda implementación futura deberá respetar estos flujos.

---

## Principios generales

1. El operario no debe introducir dos veces un dato que FM Control ya conoce.
2. Los flujos principales deben funcionar sin scroll vertical.
3. El sistema debe guiar al usuario al siguiente paso lógico.
4. Toda acción relevante debe quedar registrada para trazabilidad.
5. La interfaz debe adaptarse al rol del usuario.
6. Las acciones críticas deben ser claras, visibles y confirmadas cuando sea necesario.

---

# Flujo 1 — Acceso del operario

## Actor

Operario.

## Objetivo

Entrar directamente al Puesto de Trabajo.

## Flujo

1. El operario introduce sus credenciales.
2. FM Control identifica su rol.
3. Si el rol es `Operario`, se abre directamente el Puesto de Trabajo.
4. No se muestra Dashboard.
5. No se muestra Sidebar.
6. El foco queda preparado para iniciar el Control de Proceso.

## Resultado esperado

El operario puede empezar a trabajar sin navegar por menús.

---

# Flujo 2 — Acceso de responsable / oficina

## Actor

Responsable, administración, oficina o perfil superior.

## Objetivo

Acceder al Workspace Manager.

## Flujo

1. El usuario inicia sesión.
2. FM Control identifica su rol.
3. Se muestra el Workspace completo.
4. El usuario puede acceder a:
   - Dashboard
   - Producción
   - Camiones
   - Command Palette
   - Buscador
   - Configuración

## Resultado esperado

El responsable obtiene una visión global de producción y trazabilidad.

---

# Flujo 3 — Control de Proceso

## Actor

Operario.

## Objetivo

Registrar un control de proceso de una pieza.

## Flujo

1. El operario está en el Puesto de Trabajo.
2. Selecciona o confirma:
   - Máquina
   - Referencia
   - Operario
   - Fabricación
   - Colada
3. Introduce los datos de control requeridos.
4. Pulsa `Guardar Control de Proceso`.
5. FM Control valida los datos.
6. FM Control genera o actualiza el registro `production_control`.
7. FM Control asigna o mantiene el `piece_id`.
8. Se registra evento en `piece_history`.

## Resultado esperado

El control queda guardado y trazable.

---

# Flujo 4 — Resultado OK

## Actor

Operario.

## Condición

El control de proceso es correcto.

## Flujo

1. El operario guarda el control.
2. FM Control marca el resultado como `OK`.
3. El sistema permite continuar con la generación de etiqueta.
4. El operario imprime la etiqueta de caja.
5. El sistema registra:
   - Etiqueta creada
   - Fecha
   - Usuario
   - Caja
   - Relación con `piece_id`
6. El foco vuelve al punto inicial del Puesto de Trabajo.

## Resultado esperado

La pieza queda validada, etiquetada y lista para continuar el flujo de producción.

---

# Flujo 5 — Resultado NO OK / Rechazo

## Actor

Operario.

## Condición

El control de proceso detecta una pieza no conforme.

## Flujo

1. El operario guarda el control de proceso.
2. FM Control detecta resultado `NO OK`.
3. El sistema pregunta si desea registrar rechazo.
4. Si el operario acepta:
   - Se abre el flujo de rechazo.
   - FM Control muestra en modo lectura:
     - Etiqueta
     - Referencia
     - Fabricación
     - Colada
     - Operario
     - Fecha
     - Hora
5. El operario solo introduce:
   - Motivo del rechazo
   - Observaciones opcionales
6. FM Control crea un registro en `quality_rejections`.
7. FM Control registra evento en `piece_history`.
8. El flujo vuelve al Puesto de Trabajo.

## Datos que NO debe volver a pedir

- Número de pieza rechazada.
- Referencia.
- Fabricación.
- Colada.
- Operario.
- Fecha.
- Hora.

## Resultado esperado

El rechazo queda vinculado automáticamente al `piece_id` sin duplicar datos.

---

# Flujo 6 — Crear Etiqueta

## Actor

Operario.

## Objetivo

Generar etiqueta de caja.

## Flujo

1. El operario abre el Workspace de Etiqueta.
2. FM Control muestra:
   - Datos de caja
   - Datos de producción
   - Vista previa de etiqueta
3. La vista previa está siempre visible.
4. El operario revisa datos.
5. Pulsa `Imprimir`.
6. FM Control crea o actualiza el registro `box_label`.
7. FM Control vincula la etiqueta al `piece_id`.
8. FM Control registra evento en `piece_history`.
9. El sistema vuelve al Puesto de Trabajo.

## Reglas

- No debe haber scroll vertical global.
- La vista previa debe estar siempre visible.
- El botón de impresión debe estar siempre accesible.

---

# Flujo 7 — Reimprimir Etiqueta

## Actor

Operario o responsable autorizado.

## Objetivo

Reimprimir una etiqueta existente.

## Flujo

1. El usuario localiza la etiqueta.
2. FM Control muestra los datos asociados.
3. El usuario confirma la reimpresión.
4. FM Control imprime la etiqueta.
5. FM Control registra evento de reimpresión en `piece_history`.

## Resultado esperado

La etiqueta puede reimprimirse manteniendo trazabilidad del evento.

---

# Flujo 8 — Gestión de Camión

## Actor

Operario o responsable.

## Objetivo

Consultar y gestionar la carga del camión.

## Flujo

1. El usuario abre el Workspace de Camión.
2. FM Control muestra:
   - KPIs
   - Historial de cajas
   - Mapa visual
   - Detalle de caja seleccionada
3. El usuario puede seleccionar una caja.
4. El detalle se actualiza automáticamente.
5. El usuario puede consultar ocupación y estado.
6. Solo el historial podrá tener scroll interno.

## Reglas

- No debe haber scroll vertical global.
- KPIs, mapa y detalle deben ser visibles a la vez.
- El mapa del camión es el elemento principal.

---

# Flujo 9 — Cierre de Camión

## Actor

Responsable o usuario autorizado.

## Objetivo

Cerrar un camión terminado.

## Flujo

1. El usuario abre el Workspace de Camión.
2. Revisa el listado de cajas.
3. Revisa ocupación.
4. Pulsa `Cerrar Camión`.
5. FM Control solicita confirmación.
6. Si confirma:
   - Cambia estado del camión a `cerrado`.
   - Registra fecha y hora.
   - Registra usuario.
   - Registra evento en `piece_history` para las piezas afectadas.
7. El camión queda bloqueado para nuevas cajas salvo permiso especial.

## Resultado esperado

El camión queda cerrado con trazabilidad completa.

---

# Flujo 10 — Command Palette / Buscador

## Actor

Responsable, oficina o usuario autorizado.

## Objetivo

Localizar información rápidamente.

## Flujo

1. El usuario pulsa `Ctrl + K`.
2. FM Control abre Command Palette.
3. El usuario busca por:
   - Etiqueta
   - Caja
   - Camión
   - Fabricación
   - Colada
   - Operario
   - Referencia
4. El sistema muestra resultados.
5. El usuario selecciona resultado.
6. FM Control abre la ficha o workspace correspondiente.

## Resultado esperado

Cualquier elemento trazable puede localizarse en pocos segundos.

---

# Flujo 11 — Historial de Pieza

## Actor

Responsable, calidad o usuario autorizado.

## Objetivo

Consultar la vida completa de una pieza.

## Flujo

1. El usuario busca una etiqueta o `piece_id`.
2. FM Control localiza la pieza.
3. El sistema muestra:
   - Control de proceso
   - Etiqueta
   - Caja
   - Camión
   - Rechazo si existe
   - Eventos de historial
4. El usuario puede revisar trazabilidad completa.

## Resultado esperado

La vida completa de la pieza queda visible desde un único punto.

---

# Flujo 12 — Registro de eventos

## Actor

Sistema.

## Objetivo

Registrar trazabilidad automática.

## Flujo

Cada acción relevante genera un evento en `piece_history`.

Eventos principales:

- Control realizado
- Control modificado
- Etiqueta creada
- Etiqueta reimpresa
- Caja asignada
- Camión asignado
- Rechazo registrado
- Camión cerrado
- Expedición realizada

## Resultado esperado

FM Control puede reconstruir el historial completo de una pieza.

---

# Estados principales

## Control de proceso

- pendiente
- OK
- NO_OK
- anulado

## Etiqueta

- creada
- impresa
- reimpresa
- anulada

## Camión

- abierto
- en_carga
- cerrado
- expedido
- anulado

## Rechazo

- registrado
- pendiente_revision
- aceptado
- retrabajo
- desechado
- cerrado

---

# Criterios de aceptación RC1

Un flujo se considerará válido cuando:

- El usuario pueda completarlo sin información duplicada.
- No exista scroll vertical global en flujos principales.
- La acción principal sea visible.
- El sistema registre trazabilidad.
- El usuario vuelva al punto lógico de trabajo.
- La información importante sea visible sin buscarla.

---

# Estado

Documento aprobado para RC1.

Toda implementación deberá respetar estos flujos operativos.