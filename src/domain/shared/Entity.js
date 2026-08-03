/**
 * Entidad base del dominio de FM Control.
 * No depende de React, Supabase ni de ninguna capa de infraestructura.
 */
export class Entity {
  constructor(id = null) {
    this.id = id ?? null;
  }

  equals(other) {
    if (!other || !(other instanceof Entity)) return false;
    if (this === other) return true;
    return this.id !== null && this.id === other.id;
  }
}

export default Entity;
