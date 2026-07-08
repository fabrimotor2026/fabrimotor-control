# FM Control RC1
# 02 - Modelo de Datos

---

# Objetivo

El modelo de datos define las entidades principales de FM Control y las relaciones entre ellas.

Toda la aplicación se construirá sobre este modelo.

Las pantallas, APIs, informes y futuras funcionalidades deberán respetar esta arquitectura.

---

# Principio fundamental

FM Control gira alrededor de un único concepto:

# PIEZA

Todo lo demás son relaciones.

Operario

↓

Control

↓

Etiqueta

↓

Caja

↓

Camión

↓

Expedición

↓

Cliente

Si existe incidencia:

↓

Rechazo

↓

Calidad

↓

Resolución

---

# Entidades principales

## USERS

Representa todas las personas que utilizan FM Control.

Campos principales

- id
- username
- nombre
- rol
- activo

Relaciones

1 usuario puede realizar muchos controles.

---

## MACHINES

Representa las máquinas de producción.

Campos

- id
- nombre
- tipo
- zona
- estado

Relaciones

Una máquina realiza muchos controles.

---

## REFERENCES

Representa cada referencia fabricada.

Campos

- id
- codigo
- descripcion
- cliente
- piezas_por_caja

Relaciones

Una referencia puede tener muchas fabricaciones.

---

## PRODUCTION_CONTROLS

Es la entidad principal del sistema.

Cada registro representa un control realizado por un operario.

Campos

- id
- piece_id
- reference_id
- machine_id
- user_id
- fecha
- hora
- turno
- fabricacion
- colada
- resultado
- observaciones

Relaciones

Pertenece a:

- Usuario
- Máquina
- Referencia

Genera posteriormente:

- Etiqueta

Puede generar:

- Rechazo

---

## BOX_LABELS

Representa cada etiqueta creada.

Campos

- id
- piece_id
- numero_etiqueta
- numero_caja
- cantidad
- operario1
- operario2
- semana
- dia
- truck_id

Relaciones

Una etiqueta pertenece a una caja.

Puede pertenecer a un camión.

---

## TRUCKS

Representa un camión de expedición.

Campos

- id
- truck_number
- reference_id
- estado
- planned_date
- closed_at

---

## TRUCK_BOXES

Relaciona cajas y camiones.

Campos

- truck_id
- box_label_id

---

## QUALITY_REJECTIONS

Representa una pieza NO OK.

Campos

- id
- piece_id
- production_control_id
- motivo
- observaciones
- created_by
- created_at

Importante:

No almacena:

- referencia
- operario
- fabricación
- colada

Toda esa información se obtiene mediante la relación con Production Control.

---

## PIECE_HISTORY

Registro cronológico de eventos.

Campos

- id
- piece_id
- evento
- usuario
- fecha
- detalle

Ejemplos

- Control realizado
- Etiqueta creada
- Caja asignada
- Camión asignado
- Rechazo registrado
- Camión cerrado
- Expedición realizada

---

# Relaciones

USERS

↓

PRODUCTION_CONTROLS

↓

BOX_LABELS

↓

TRUCK_BOXES

↓

TRUCKS

Y en paralelo

PRODUCTION_CONTROLS

↓

QUALITY_REJECTIONS

---

# piece_id

Toda la trazabilidad gira alrededor del campo

piece_id

Nunca alrededor de:

- etiqueta
- caja
- fabricación
- colada

piece_id será el identificador único del ciclo de vida de una pieza.

---

# Reglas del modelo

1.

Nunca duplicar información.

2.

Cada dato tendrá un único propietario.

3.

Toda entidad tendrá clave primaria.

4.

Las relaciones se realizarán mediante claves foráneas.

5.

Toda acción importante generará un evento en Piece History.

---

# Modelo futuro

Este modelo permitirá incorporar sin modificaciones importantes:

- Calidad
- Expediciones
- Estadísticas
- IA
- Mantenimiento
- ERP

---

# Estado

Documento aprobado para RC1.

Toda nueva funcionalidad deberá respetar este modelo.