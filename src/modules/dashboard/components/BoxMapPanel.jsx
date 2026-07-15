import TruckMap from "./TruckMap";
import { memo } from "react";

import FmButton from "../../../components/ui/FmButton";
import FmCard from "../../../components/ui/FmCard";
import FmEmptyState from "../../../components/ui/FmEmptyState";
import FmInput from "../../../components/ui/FmInput";
import FmSectionTitle from "../../../components/ui/FmSectionTitle";

function BoxMapPanel({
  filteredBoxes = [],
  targetBoxes,
  selectedBox,
  searchValue,
  setSearchValue,
  onSearchBox,
  setSelectedBoxNumber,
}) {
  return (
    <FmCard className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FmSectionTitle
          eyebrow="Producción"
          title="Cajas del camión"
          description="Pulsa una caja para consultar su trazabilidad."
        />
        <div className="flex gap-2">
          <FmInput
            className="w-56"
            placeholder="Buscar caja, FAB, COL..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FmButton
            variant="dark"
            onClick={() => onSearchBox?.(searchValue)}
          >
            Buscar
          </FmButton>
        </div>
      </div>

      {filteredBoxes.length === 0 ? (
        <FmEmptyState
          title="Sin resultados"
          description="No existe ninguna caja que coincida con el criterio de búsqueda."
        />
      ) : (
        <TruckMap
          boxes={filteredBoxes}
          capacity={targetBoxes}
          selectedBoxNumber={selectedBox?.numeroCaja || ""}
          searchValue={searchValue}
          onSelectBox={setSelectedBoxNumber}
        />
      )}
    </FmCard>
  );
}

export default memo(BoxMapPanel);