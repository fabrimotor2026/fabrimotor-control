import AppButton from "./components/ui/AppButton";
import OperatorHeader from "./components/layout/OperatorHeader";
import TruckDashboardCard from "./components/common/TruckDashboardCard";
import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft } from "lucide-react";
import useRecordStats from "./modules/records/hooks/useRecordStats";
import useRecords from "./modules/records/hooks/useRecords";
import {
  deleteSharedRecord,
  fetchSharedRecords,
  upsertSharedRecord,
} from "./services/recordService";
import useIncidentStats from "./modules/incidents/hooks/useIncidentStats";
import useIncidents from "./modules/incidents/hooks/useIncidents";
import {
  deleteSharedIncident,
  fetchSharedIncidents,
  upsertSharedIncident,
} from "./services/incidentService";
import useUsers from "./modules/operators/hooks/useUsers";
import {
  deleteSharedUser,
  fetchSharedUsers,
  normalizeUser,
  upsertSharedUser,
} from "./services/userService";
import {
  fetchAppSetting,
  updateAppSetting,
} from "./services/settingsService";
import {
  createAndPrintBoxLabel,
  fetchLabelReprints,
  reprintExistingBoxLabel,
} from "./modules/labels/services/labelService";
import {
  fetchBoxLabels,
} from "./services/boxLabelService";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Info,
  LogOut,
  Pencil,
  Printer,
  Save,
  Settings,
  Trash2,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ControlStatusSummary from "./components/common/ControlStatusSummary";
import LastLabelCard from "./components/common/LastLabelCard";
import MeasurementCard from "./components/common/MeasurementCard";
import Notification from "./components/common/Notification";
import ReadOnlyField from "./components/common/ReadOnlyField";
import LabelModal from "./components/LabelModal";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { APP_VERSION } from "./config/constants";
import AppWorkspaceShell from "./layout/AppWorkspaceShell";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import { CommandPalette } from "./modules/command";
import ControlProcessPanel from "./modules/control/ControlProcessPanel";
import AdminPanel from "./modules/operators/components/AdminPanel";
import useLabels from "./modules/labels/hooks/useLabels";
import {
  copyPlannedTruckLogisticsToActiveTruck,
  createPlannedTruck,
  deletePlannedTruck,
  fetchNextPlannedTruck,
  fetchTruckSchedule,
  markTruckAsShipped,
  markTruckReadyForShipment,
  openPlannedTruck,
  updateActiveTruckLogistics,
  updatePlannedTruck,
} from "./services/truckScheduleService";
import {
  closeTruck as closeTruckFromService,
  fetchTrucks as fetchTrucksFromService,
  getActiveTruck as getActiveTruckFromService,
  updateTruckExpeditionDate as updateTruckExpeditionDateFromService,
} from "./services/truckService";
import {
  buildTruckAuditChanges,
  recordTruckAuditEventSafely,
} from "./services/truckAuditService";
import {
  fetchJointShipmentBoxes,
  fetchJointShipmentProgress,
  getActiveJointTruck,
  isJointShipmentReference,
} from "./services/jointShipmentService";
import {
  fetchReferenceBoxCounter,
  setReferenceBoxCounter,
} from "./services/referenceBoxCounterService";
import {
  SHIFT_START_CONTROL_IDS,
  getVerificationTimestamp,
  hasPreviousShiftVerification,
  isShiftStartValueOptional,
} from "./services/shiftStartControlService";


const SmartTruckDashboardModal = lazy(() =>
  import("./modules/dashboard").then((module) => ({
    default: module.SmartTruckDashboardModal,
  }))
);

const ProductionModal = lazy(() =>
  import("./modules/production").then((module) => ({
    default: module.ProductionModal,
  }))
);

const OperatorDashboardModal = lazy(() =>
  import("./modules/operators/components/OperatorDashboardModal")
);

const StatisticsDashboardModal = lazy(() =>
  import("./modules/statistics/components/StatisticsDashboardModal")
);

const ConfigModal = lazy(() =>
  import("./components/ConfigModal")
);

const QualityDailyControlsPanel = lazy(() =>
  import("./components/quality/QualityDailyControlsPanel")
);

const VerificationHistoryPanel = lazy(() =>
  import("./components/quality/VerificationHistoryPanel")
);

const VisualHelpModalComponent = lazy(() =>
  import("./components/modals/VisualHelpModal")
);

const PdfReportModal = lazy(() =>
  import("./components/modals/PdfReportModal")
);

const RejectsModalComponent = lazy(() =>
  import("./components/modals/RejectsModal")
);

const ACCESS_CODE = "1234";


const USER_ROLES = [
  "Administrador",
  "Encargado",
  "Responsable",
  "Calidad",
  "Mantenimiento",
  "Operario",
];

const REFERENCES = [
  {
    id: "F-1012",
    label: "F-1012 · Célula B",
    celula: "Célula B",
    partCode: "1025980",
    threadText: "ROSCA DERECHA",
    machines: {
      "Torno Hyundai": "Hyundai WIA HD 2600",
      "Centro NEWAY": "NEWAY VM-1150SR",
    },
  },
  {
    id: "F-1013",
    label: "F-1013 · Célula A",
    celula: "Célula A",
    partCode: "1025981",
    threadText: "ROSCA IZQUIERDA",
    machines: {
      "Torno Hyundai": "Hyundai L300C",
      "Centro NEWAY": "NEWAY VM1160H",
    },
  },
  { id: "F-1025", label: "F-1025"},
  { id: "F-1026", label: "F-1026"},
  { id: "F-1029", label: "F-1029"},
];


function getReferenceById(referenceId) {
  return REFERENCES.find((item) => item.id === referenceId) || REFERENCES[0];
}

function getReferenceLabelConfig(referenceId) {
  const reference = getReferenceById(referenceId);

  return {
    partCode: reference.partCode || REFERENCES[0].partCode,
    threadText: reference.threadText || REFERENCES[0].threadText,
  };
}

const CONFIGURABLE_REFERENCE_IDS = ["F-1012", "F-1013"];
const REFERENCE_CONFIG_STORAGE_KEY = "fmcontrol-reference-configs";

function getReferenceBoxPrefix(referenceId) {
  return referenceId === "F-1013" ? "FA-26" : "FB-26";
}

function getDefaultReferenceConfig(referenceId) {
  const reference = getReferenceById(referenceId);

  return {
    reference: reference.id,
    cell: reference.celula || "",
    boxPrefix: getReferenceBoxPrefix(reference.id),
    partCode: reference.partCode || "",
    piecesPerBox: 16,
    boxesPerTruck: 49,
    threadText: reference.threadText || "",
  };
}

function normalizeReferenceConfig(referenceId, value = {}) {
  const defaults = getDefaultReferenceConfig(referenceId);
  const normalizedReference = CONFIGURABLE_REFERENCE_IDS.includes(
    referenceId
  )
    ? referenceId
    : defaults.reference;
  const savedBoxPrefix = String(value?.boxPrefix || "").trim();
  const boxPrefix =
    normalizedReference === "F-1013" &&
    (!savedBoxPrefix || savedBoxPrefix.toUpperCase() === "FB-26")
      ? "FA-26"
      : savedBoxPrefix || defaults.boxPrefix;

  return {
    ...defaults,
    ...value,
    reference: normalizedReference,
    boxPrefix,
    piecesPerBox: Math.max(
      1,
      Number(value?.piecesPerBox || defaults.piecesPerBox)
    ),
    boxesPerTruck: Math.max(
      1,
      Number(value?.boxesPerTruck || defaults.boxesPerTruck)
    ),
  };
}

function loadStoredReferenceConfigs() {
  let stored = {};

  try {
    stored = JSON.parse(
      localStorage.getItem(REFERENCE_CONFIG_STORAGE_KEY) || "{}"
    );
  } catch {
    stored = {};
  }

  return Object.fromEntries(
    CONFIGURABLE_REFERENCE_IDS.map((referenceId) => [
      referenceId,
      normalizeReferenceConfig(referenceId, stored?.[referenceId]),
    ])
  );
}

function persistReferenceConfigs(configs) {
  localStorage.setItem(
    REFERENCE_CONFIG_STORAGE_KEY,
    JSON.stringify(configs)
  );
}

function referenceConfigSettingKey(referenceId) {
  return `fmcontrol_config_${String(referenceId)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()}`;
}

function comparatorOptions(min = 20, max = 80) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}
function rangeOptions(min, max, step = 0.01) {
  const values = [];

  for (
    let value = min;
    value <= max + 0.000001;
    value += step
  ) {
    values.push(Number(value.toFixed(2)));
  }

  return values;
}
const USERS = [
  {
    "username": "1001",
    "password": "2910",
    "name": "Javier Pérez Gargallo",
    "role": "Administrador"
  },
  {
    "username": "1002",
    "password": "1404",
    "name": "Esteban Pérez Gargallo",
    "role": "Encargado"
  },
  {
    "username": "1003",
    "password": "2112",
    "name": "Oscar Pérez Gargallo",
    "role": "Encargado"
  },
  {
    "username": "1004",
    "password": "2612",
    "name": "Carlos Pérez Gargallo",
    "role": "Encargado"
  },
  {
    "username": "1006",
    "password": "1006",
    "name": "Rubén Benitez Viñals",
    "role": "Operario"
  },
  {
    "username": "1008",
    "password": "1008",
    "name": "Fernando Padilla Jimenez",
    "role": "Operario"
  },
  {
    "username": "1009",
    "password": "1009",
    "name": "Esteban Cañadilla Serrano",
    "role": "Operario"
  },
  {
    "username": "2021",
    "password": "2021",
    "name": "Wahib Boumajdoul",
    "role": "Operario"
  },
  {
    "username": "2037",
    "password": "2037",
    "name": "Reda N'guiri",
    "role": "Operario"
  },
  {
    "username": "2044",
    "password": "2044",
    "name": "Ivan Valdivia Rodriguez",
    "role": "Operario"
  },
  {
    "username": "2065",
    "password": "2065",
    "name": "Adam Chakkour Afourid",
    "role": "Operario"
  },
  {
    "username": "2067",
    "password": "2067",
    "name": "Sergio Carrera Gomez",
    "role": "Operario"
  },
  {
    "username": "2073",
    "password": "2073",
    "name": "Aaron Gonzalez Escamilla",
    "role": "Operario"
  },
  {
    "username": "2086",
    "password": "2086",
    "name": "Jose Maria Gonzalez Martínez",
    "role": "Operario"
  },
  {
    "username": "2098",
    "password": "2098",
    "name": "Ahmed Rahhali",
    "role": "Operario"
  },
  {
    "username": "2099",
    "password": "2099",
    "name": "Salvador Bolance Abalos",
    "role": "Operario"
  },
  {
    "username": "2110",
    "password": "2110",
    "name": "Edison Gabriel Niko Romano",
    "role": "Operario"
  },
  {
    "username": "2113",
    "password": "2113",
    "name": "Manuel Pelegrin Gomez",
    "role": "Operario"
  },
  {
    "username": "2116",
    "password": "2116",
    "name": "Mauricio Loriente",
    "role": "Operario"
  },
  {
    "username": "2128",
    "password": "2128",
    "name": "Miguel Caputo",
    "role": "Operario"
  },
  {
    "username": "2129",
    "password": "2129",
    "name": "Raul Valenzuela Aguilar",
    "role": "Operario"
  },
  {
    "username": "2130",
    "password": "2130",
    "name": "Miguel Jesus Benito",
    "role": "Operario"
  }
];

function roleLabel(role) {
  const labels = {
    admin: "Administrador",
    calidad: "Calidad",
    operario: "Operario",
  };

  return labels[role] || role || "";
}




const REJECTION_REASONS = [
  "Fuera de tolerancia inferior",
  "Fuera de tolerancia superior",
  "Medida inestable",
  "Rosca NOK",
  "Calibre no entra",
  "Calibre pasa cuando no debe",
  "Rugosidad NOK",
  "Marca superficial",
  "Rebaba",
  "Golpe / deformación",
  "Falta de mecanizado",
  "Error Ecoroll / refrigerante",
  "Otro",
];

const MACHINES = {
  "Torno Hyundai": [
    {
      id: "c30",
      control: "Nº30 · Ø82 (A) · Valor comparador",
      comentario:
        "Horquilla Mitutoyo [CO001] (+38/+63) Comparador [CO007] Patrón [PT038]",
      min: 38,
      max: 63,
      type: "number",
      inputMode: "selectComparator",
      selectMin: 20,
      selectMax: 80,
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c40",
      control: "Nº40 · Ø82 (B) · Valor comparador",
      comentario:
        "Horquilla Mitutoyo [CO001] (+38/+63) Comparador [CO007] Patrón [PT038] · Introducir valor del comparador",
      comentarioExtra:
        "La lectura válida debe estar entre +38 y +63",

      min: 38,
      max: 63,
      type: "number",
      inputMode: "selectComparator",
      selectMin: 20,
      selectMax: 80,
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c50",
      control: "Nº50 · Ø82 · Valor comparador",
      comentario:
        "Horquilla Mitutoyo [CO004] (-2/-52) Comparador [CO007] Patrón [PT083]",
      comentarioExtra:
        "La lectura válida debe estar entre -2 y -52",
      min: -52,
      max: -2,
      displayMin: "-2",
      displayMax: "-52",
      type: "number",
      inputMode: "selectComparatorSigned",
      selectStart: 20,
      selectEnd: -80,
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c60",
      control: "Nº60 · Ø 82 -0,035 / -0,060 (A) (B) [F2] · Anillo comprobación [PT085]",
      comentario:
        "Anillo comprobación [PT085]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c160",
      control: "Nº160 · Ø60",
      etiqueta:
        "[S6]",
      comentario:
        "Calibre PNP [CA231]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c170",
      control: "Nº170 · Rosca M72x1,5 6g",
      etiqueta:
        "[F8]",
      comentario:
        "Calibre de rosca PNP [CR007] [CR008]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c200",
      control: "Nº200 · Cota 15 ±0,2",
      comentario:
        "Mirafondos [MF002] 13 +/-0.2 (12.80 - 13.20)",
      min: 14.8,
      max: 15.2,
      type: "number",

      inputMode: "selectFixed",
      fixedOptions: [
       "14.70",
       "14.80",
       "14.90",
       "15.00",
       "15.10",
       "15.20",
       "15.30",
     ],

      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c230",
      control: "Nº230 · Cota 32 ±0,2",
      comentario:
        "Galga PNP [PT084]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c240",
      control: "Nº240 · Cota 102 ±0,1",
      comentario:
        "Base [CO006] + Comparador [CO005] Patrón [PT082]",
      min: 101.9,
      max: 102.1,
      type: "number",

      inputMode: "selectRange",
      rangeMin: 101.80,
      rangeMax: 102.20,
      rangeStep: 0.01,

      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c70",
      control: "Nº70 · Ø69 ±0,3",
      comentario:
        "Palmer 50-75 [PA011]",
      min: 68.7,
      max: 69.3,
      type: "number",

      inputMode: "selectRange",
      rangeMin: 68.60,
      rangeMax: 69.40,
      rangeStep: 0.01,

      frecuencia:
        "Registrar únicamente la primera pieza del turno.",
    },
    {
      id: "c80",
      control: "Nº80 · Ø81.4 ±0,3",
      comentario:
        "Palmer 75-100 [PA012]",
      min: 81.1,
      max: 81.7,
      type: "number",

      inputMode: "selectRange",
      rangeMin: 81.00,
      rangeMax: 81.80,
      rangeStep: 0.01,

      frecuencia:
        "Registrar únicamente la primera pieza del turno.",
    },
    {
      id: "c90",
      control: "Nº90 · Ø125 ±0,1",
      comentario:
        "Palmer 100-125 [PA013]",
      min: 124.9,
      max: 125.1,
      type: "number",

      inputMode: "selectRange",
      rangeMin: 124.80,
      rangeMax: 125.20,
      rangeStep: 0.01,
      
      frecuencia:
        "Registrar únicamente la primera pieza del turno.",
    },
    {
      id: "c280",
      control: "Nº280 · Rz 6,3",
      comentario:
        "Rugosímetro [EQ1]",
      min: 0,
      max: 6.3,
      type: "number",
      frecuencia:
        "Registrar una pieza al día (cada 24 horas).",
    },
    {
      id: "c120",
      control: "Nº120 · Rz 1,2",
      comentario:
        "Rugosímetro [EQ1]",
      min: 0,
      max: 1.2,
      type: "number",
      frecuencia:
        "Registrar una pieza al día (cada 24 horas).",
    }
  ],
  "Centro NEWAY": [
    {
      id: "c320",
      control: "Nº320 · Ø17 +0,043/+0",
      comentario:
        "Calibre PNP [CA237]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c330",
      control: "Nº330 · 5x Ø16,5 +0,2/-0,1",
      comentario:
        "Calibre PNP [CA236]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c360",
      control: "Nº360 · 6x R13,8 min.",
      comentario:
        "Galga [CA238] [CA240]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c60neway",
      control: "Nº60 · Anillo comprobación",
      comentario:
        "Anillo comprobación [PT087]",
      type: "oknok",
      frecuencia:
        "Registrar la pieza número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    
    {
      id: "c370",
      control: "Nº370 · 19,1 +0/-1",
      comentario:
        "Pie de rey digital [PR05]",
      min: 19.00,
      max: 19.20,
      type: "number",

      inputMode: "selectRange",
      rangeMin: 18.90,
      rangeMax: 19.30,
      rangeStep: 0.10,
      
      frecuencia:
        "Registrar únicamente al inicio de turno.",
    },
    {
      id: "c340",
      control: "Nº340 · Chaflán 1x45º",
      comentario:
        "Perfilómetro [EQ1]",
      type: "oknok",
      frecuencia:
        "Registrar únicamente al inicio de turno.",
    },
  ],
};

const REFERENCE_MACHINE_OVERRIDES = {
  "F-1013": {
    "Torno Hyundai": {
      c30: {
        comentario:
          "Horquilla Mitutoyo [CO001] (+156/+181) Comparador [CO008] Patrón [PT002]",
        min: 156,
        max: 181,
        selectMin: 140,
        selectMax: 195,
      },
      c40: {
        comentario:
          "Horquilla Mitutoyo [CO001] (+156/+181) Comparador [CO008] Patrón [PT002] · Introducir valor del comparador",
        comentarioExtra:
          "La lectura válida debe estar entre +156 y +181",
        min: 156,
        max: 181,
        selectMin: 140,
        selectMax: 195,
      },
      c50: {
        comentario:
          "Horquilla Mitutoyo [CO001] (+66/+116) Comparador [CO008] Patrón [PT002]",
        comentarioExtra:
          "La lectura válida debe estar entre +66 y +116",
        min: 66,
        max: 116,
        displayMin: "+66",
        displayMax: "+116",
        inputMode: "selectComparator",
        selectMin: 50,
        selectMax: 130,
      },
      c60: {
        control:
          "Nº60 · Ø 82 -0,035 / -0,060 (A) (B) [F2] · Anillo comprobación [PT004]",
        comentario: "Anillo comprobación [PT004]",
      },
      c160: {
        comentario: "Calibre PNP [CA001]",
      },
      c170: {
        comentario: "Calibre de rosca PNP [CR001] [CR002]",
      },
      c200: {
        comentario: "Mirafondos [MF001]",
      },
      c230: {
        comentario: "Galga PNP [PT005]",
      },
      c240: {
        comentario:
          "Base [CO003] + Comparador [CO002] Patrón [PT003]",
      },
      c70: {
        comentario: "Palmer 50-75 [PA001]",
      },
      c80: {
        comentario: "Palmer 75-100 [PA002]",
      },
      c90: {
        comentario: "Palmer 100-125 [PA003]",
      },
    },
    "Centro NEWAY": {
      c320: {
        comentario: "Calibre PNP [CA003]",
      },
      c330: {
        comentario: "Calibre PNP [CA002]",
      },
      c360: {
        comentario: "Galga [CA166] [CA241]",
      },
      c60neway: {
        comentario: "Anillo comprobación [PT086]",
      },
      c370: {
        comentario: "Pie de rey digital [PR04]",
      },
    },
  },
};

function getMachineDisplayName(referenceId, machineName) {
  const reference = getReferenceById(referenceId);
  return reference.machines?.[machineName] || machineName;
}

function getMachineOptions(referenceId) {
  return Object.keys(MACHINES).map((value) => ({
    value,
    label: getMachineDisplayName(referenceId, value),
  }));
}

function getMachineChecks(referenceId, machineName) {
  const baseChecks = MACHINES[machineName] || [];
  const overrides =
    REFERENCE_MACHINE_OVERRIDES[referenceId]?.[machineName] || {};
  const machineDisplayName = getMachineDisplayName(
    referenceId,
    machineName
  );

  return baseChecks.map((check) => ({
    ...check,
    ...(overrides[check.id] || {}),
    maquina: machineDisplayName,
  }));
}


const MODAL_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  backgroundColor: "rgba(0, 0, 0, 0.65)",
};

const WORKSPACE_SYSTEM_MODAL_LAYER_STYLE = {
  position: "relative",
  zIndex: 10000,
};

const MODAL_PANEL_XL_STYLE = {
  width: "min(1280px, 96vw)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: "20px",
  backgroundColor: "#ffffff",
  boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
};

const MODAL_PANEL_LG_STYLE = {
  width: "min(1024px, 96vw)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: "20px",
  backgroundColor: "#ffffff",
  boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}


function createRecordId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Algunos navegadores/tablets bloquean crypto en HTTP local.
  }

  return `registro_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function initialForm() {
  return {
    referencia: "F-1012",
    referenciaNombre: "F-1012 · Célula B",
    maquina: "Torno Hyundai",
    fecha: today(),
    turno: "M",
    operario: "",
    numeroPieza: "",
    rechazoTipo: "",
    observaciones: "",
  };
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function turnoLabel(turno) {
  const labels = {
    M: "M (Mañana)",
    T: "T (Tarde)",
    N: "N (Noche)",
  };

  return labels[turno] || turno || "";
}


function buildReportSheetName(data) {
  if (!data?.fecha || !data?.turno || !data?.maquina) {
    return data?.hojaNombre || "";
  }

  const referenceId = data.referencia || "F-1012";
  const machineName =
    data.maquinaNombre ||
    getMachineDisplayName(referenceId, data.maquina);

  return `${data.referenciaNombre || referenceId} · ${data.fecha} · ${turnoLabel(data.turno)} · ${machineName}`;
}



function getStoredUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem("fabrimotor-users") || "null");
    return Array.isArray(stored) && stored.length ? stored : USERS;
  } catch {
    return USERS;
  }
}

function saveStoredUsers(users) {
  localStorage.setItem("fabrimotor-users", JSON.stringify(users || []));
}

function isAdminUser(user) {
  return user?.role === "Administrador";
}

function isVerificationUser(user) {
  return user?.role === "Operario";
}

function isQualityUser(user) {
  return user?.role === "Calidad";
}

function LoginScreen({ onLogin, users = getStoredUsers() }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submitLogin = (event) => {
    event.preventDefault();

    const user = users.find(
      (item) =>
        item.username.toLowerCase() === username.trim().toLowerCase() &&
        item.password === password
    );

    if (!user) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    const safeUser = {
      username: user.username,
      name: user.name,
      role: user.role,
    };

    onLogin(safeUser);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
      <form
        onSubmit={submitLogin}
        className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl"
      >
        <img
          src="/logo-fabrimotor.png"
          alt="FabriMotor"
          className="mb-8 h-20 w-auto object-contain"
        />

        <div className="mb-6">
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            CONTROL DE PROCESO
          </h1>

        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-bold text-slate-700">Usuario</span>
          <input
            autoFocus
            className="input"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            placeholder="admin, calidad u operario"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-bold text-slate-700">Contraseña</span>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Contraseña"
          />
        </label>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <Button
  type="submit"
  className="w-full rounded-2xl py-5 text-base font-black shadow-lg"
  style={{
    backgroundColor: "#0F5C63",
    color: "#ffffff",
  }}
>
  Entrar
</Button>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <div className="font-black text-slate-800">Acceso</div>
          <div className="mt-2">
            Usa tu número de operario y la contraseña asignada.
          </div>
        </div>
      </form>
    </div>
  );
}
const QUALITY_DAILY_CHECK_IDS = ["c280", "c120"];

function isEmptyValue(value) {
  return value === undefined || value === null || value === "";
}

function hasMeaningfulInput(value) {
  if (Array.isArray(value)) {
    return value.some(hasMeaningfulInput);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulInput);
  }

  return !isEmptyValue(value);
}

function isQualityDailyCheckEmptyById(id, value) {
  return QUALITY_DAILY_CHECK_IDS.includes(id) && isEmptyValue(value);
}

function isQualityDailyValidationEmpty(check) {
  return isQualityDailyCheckEmptyById(check.id, check.value);
}

function getMissingShiftStartControls(
  machineName,
  machineChecks,
  measurementValues,
  hasPreviousVerification
) {
  if (hasPreviousVerification) return [];

  const missing = [];

  if (
    machineName === "Torno Hyundai" &&
    isEmptyValue(measurementValues?.controlTurno)
  ) {
    missing.push("Control Ecoroll / Refrigerante");
  }

  for (const check of machineChecks || []) {
    if (
      SHIFT_START_CONTROL_IDS.includes(check.id) &&
      isEmptyValue(measurementValues?.[check.id])
    ) {
      missing.push(check.control);
    }
  }

  return missing;
}

function ModuleLoadingFallback() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="rounded-3xl bg-white px-8 py-6 text-center shadow-2xl">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <div className="mt-4 text-base font-black text-slate-900">
          Cargando módulo…
        </div>
      </div>
    </div>
  );
}

export default function App({ initialWorkspaceModule = "dashboard" }) {
  const {
  incidents,
  setIncidents,

  incidentForm,
  setIncidentForm,
  resetIncidentForm,

  showIncidentModal,
  setShowIncidentModal,
  openIncidentModal,
  closeIncidentModal,

  showIncidentsListModal,
  setShowIncidentsListModal,
  openIncidentsListModal,
  closeIncidentsListModal,

  show8DModal,
  setShow8DModal,

  selected8D,
  setSelected8D,

  addIncident,
  saveIncidentsUpdate: saveIncidentsUpdateFromHook,
} = useIncidents({
  supabase,
  isSupabaseConfigured,
});

  const [notification, setNotification] = useState(null);

  const numeroPiezaInputRef = useRef(null);
  const closingTruckIdRef = useRef(null);
  const operationalReferenceLoadIdRef = useRef(0);
  const operationalReferenceCommittedRef = useRef("");

  const [activeTruck, setActiveTruck] = useState(null);

  const [trucks, setTrucks] = useState([]);
  const [truckSchedule, setTruckSchedule] = useState([]);
  const [displayTruck, setDisplayTruck] = useState(null);
  const [
    operationalReferenceLoading,
    setOperationalReferenceLoading,
  ] = useState(false);
  const [referenceSwitching, setReferenceSwitching] = useState(false);
  const [referenceSwitchTarget, setReferenceSwitchTarget] = useState("");
  const [referenceSwitchError, setReferenceSwitchError] = useState("");

  const [highlightBoxNumber, setHighlightBoxNumber] = useState("");
  const [highlightBoxReference, setHighlightBoxReference] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showOperatorDashboard, setShowOperatorDashboard] = useState(false);
  const [operatorBoxLabels, setOperatorBoxLabels] = useState([]);
  const [operatorDataLoading, setOperatorDataLoading] = useState(false);
  const [showStatisticsDashboard, setShowStatisticsDashboard] = useState(false);
  const [statisticsDataLoading, setStatisticsDataLoading] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(
    initialWorkspaceModule === "production"
  );
  const [activeWorkspaceModule, setActiveWorkspaceModule] = useState(
    initialWorkspaceModule
  );

  const [form, setForm] = useState(initialForm());

  const {
    records,
    setRecords,
    databaseMode,
    setDatabaseMode,
    lastSyncAt,
    setLastSyncAt,
    refreshSharedRecords: refreshSharedRecordsFromHook,
  } = useRecords({
    supabase,
    isSupabaseConfigured,
  });
  
  const {
    currentDateRecords,
    currentDateOk,
    currentDateNok,
    recentRecords,
    rejectedRecords,
    operatorShiftRecords,
    operatorShiftOk,
    operatorShiftNok,
    dashboardStats,
  } = useRecordStats({
    records,
    selectedDate: form.fecha,
    form,
  });
  
  const {
    currentDateIncidents,
    currentMonthIncidents,
    qualityCostToday,
    qualityCostMonth,
    scrapPiecesMonth,
    totalIncidencias,
    accionesAbiertas,
    accionesCerradas,
    costeTotalCalidad,
    pendingIncidents,
  } = useIncidentStats({
    incidents,
    selectedDate: form.fecha,
  });

  const [values, setValues] = useState({});
  const [timerStart, setTimerStart] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showImportantModal, setShowImportantModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showCpkModal, setShowCpkModal] = useState(false);
  const [showRejectsModal, setShowRejectsModal] = useState(false);
  const [activeView, setActiveView] = useState("nueva");

  const [visualHelpItem, setVisualHelpItem] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [nowMs, setNowMs] = useState(Date.now());
  const [filterDate, setFilterDate] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterOperario, setFilterOperario] = useState("");
  const [filterPieza, setFilterPieza] = useState("");
  const [filterMaquina, setFilterMaquina] = useState("");
  const [showOnlyCurrentSheet, setShowOnlyCurrentSheet] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [pdfDateFrom, setPdfDateFrom] = useState("");
  const [pdfDateTo, setPdfDateTo] = useState("");
  const [pdfTurno, setPdfTurno] = useState("");
  const [pdfOperario, setPdfOperario] = useState("");
  const [pdfPieza, setPdfPieza] = useState("");
  const [pdfMaquina, setPdfMaquina] = useState("");
  const [cpkDateFrom, setCpkDateFrom] = useState("");
  const [cpkDateTo, setCpkDateTo] = useState("");
  const [cpkTurno, setCpkTurno] = useState("");
  const [cpkOperario, setCpkOperario] = useState("");
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configReferenceCounter, setConfigReferenceCounter] =
    useState({
      reference: "F-1012",
      nextNumber: "",
      savedNextNumber: "",
      updatedBy: "",
      updatedAt: "",
    });
  const [
    configReferenceCounterLoading,
    setConfigReferenceCounterLoading,
  ] = useState(false);
  const [
    configReferenceCounterError,
    setConfigReferenceCounterError,
  ] = useState("");
  
  const [referenceConfigs, setReferenceConfigs] = useState(
    loadStoredReferenceConfigs
  );
  const [configForm, setConfigForm] = useState(
    () => loadStoredReferenceConfigs()["F-1012"]
  );
  const [appConfig, setAppConfig] = useState(
    () => loadStoredReferenceConfigs()["F-1012"]
  );

  const {
  showLabelModal,
  setShowLabelModal,
  openLabelModal,
  closeLabelModal,

  showBoxLabelsModal,
  setShowBoxLabelsModal,

  labelForm,
  setLabelForm,
  resetLabelForm,

  boxLabels,
  setBoxLabels,

  boxCounter,
  setBoxCounter,

  totalCaja,
  numeroSemana,
  numeroDia,
} = useLabels({
  piecesPerBox: appConfig.piecesPerBox,
});

useEffect(() => {
  if (showLabelModal) return;
  if (activeView !== "nueva") return;
  if (form.numeroPieza !== "") return;

  let focusTimer;

  const scrollTimer = window.setTimeout(() => {
    const input = numeroPiezaInputRef.current;

    if (!input) return;

    input.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    focusTimer = window.setTimeout(() => {
      input.focus({ preventScroll: true });
      input.select();
    }, 350);
  }, 100);

  return () => {
    window.clearTimeout(scrollTimer);

    if (focusTimer) {
      window.clearTimeout(focusTimer);
    }
  };
}, [
  showLabelModal,
  activeView,
  form.numeroPieza,
]);

async function updateTruckExpeditionDate(truckId, newDate) {
  if (!isSupabaseConfigured || !supabase) return;

  const previousTruck =
    activeTruck?.id === truckId
      ? activeTruck
      : displayTruck?.id === truckId
        ? displayTruck
        : trucks.find((truck) => truck.id === truckId);

  const updatedTruck = await updateTruckExpeditionDateFromService(
    supabase,
    truckId,
    newDate
  );

  setActiveTruck((previous) =>
    previous?.id === updatedTruck.id ? updatedTruck : previous
  );
  setDisplayTruck((previous) =>
    previous?.id === updatedTruck.id ? updatedTruck : previous
  );
  setTrucks((previous) =>
    previous.map((truck) =>
      truck.id === updatedTruck.id ? updatedTruck : truck
    )
  );

  const changes = buildTruckAuditChanges(
    previousTruck || {},
    updatedTruck
  );

  if (changes.length) {
    await recordTruckAuditEventSafely(supabase, {
      truck: updatedTruck,
      truckId: updatedTruck.id,
      eventType: "LOGISTICS_UPDATED",
      eventLabel: "Fecha de expedición actualizada",
      actor: currentUser,
      changes,
      source: "ACTIVE",
    });
  }

  return updatedTruck;
}

async function handleUpdateActiveTruck(truck, updates) {
  if (!isSupabaseConfigured || !supabase || !truck?.id) {
    return false;
  }

  const updatedTruck = await updateActiveTruckLogistics(
    supabase,
    truck.id,
    updates
  );

  setActiveTruck((previous) =>
    previous?.id === updatedTruck.id ? updatedTruck : previous
  );
  setDisplayTruck((previous) =>
    previous?.id === updatedTruck.id ? updatedTruck : previous
  );
  setTrucks((previous) =>
    previous.map((item) =>
      item.id === updatedTruck.id ? updatedTruck : item
    )
  );

  const changes = buildTruckAuditChanges(truck, updatedTruck);

  if (changes.length) {
    await recordTruckAuditEventSafely(supabase, {
      truck: updatedTruck,
      truckId: updatedTruck.id,
      eventType: "LOGISTICS_UPDATED",
      eventLabel: "Datos logísticos actualizados",
      actor: currentUser,
      changes,
      source: "ACTIVE",
    });
  }

  return updatedTruck;
}

async function handleMarkTruckShipped(truck, updates) {
  if (!isSupabaseConfigured || !supabase || !truck?.id) {
    return false;
  }

  const updatedTruck = await markTruckAsShipped(
    supabase,
    truck.id,
    {
      ...updates,
      shippedBy:
        currentUser?.username ||
        currentUser?.name ||
        "Sistema",
    }
  );

  setActiveTruck((previous) =>
    previous?.id === updatedTruck.id ? updatedTruck : previous
  );
  setDisplayTruck((previous) =>
    previous?.id === updatedTruck.id ? updatedTruck : previous
  );
  setTrucks((previous) =>
    previous.map((item) =>
      item.id === updatedTruck.id ? updatedTruck : item
    )
  );

  await recordTruckAuditEventSafely(supabase, {
    truck: updatedTruck,
    truckId: updatedTruck.id,
    eventType: "SHIPMENT_CONFIRMED",
    eventLabel: "Expedición confirmada",
    actor: currentUser,
    changes: buildTruckAuditChanges(truck, updatedTruck),
    metadata: {
      shipped_at: updatedTruck.shipped_at,
      shipped_by: updatedTruck.shipped_by,
    },
    source: "ACTIVE",
  });

  return updatedTruck;
}

  async function closeTruckAndActivateNext(
    truckToClose,
    { automatic = false, completedBoxes = null } = {}
  ) {
    if (!truckToClose?.id) return null;

    if (closingTruckIdRef.current === truckToClose.id) {
      return null;
    }

    closingTruckIdRef.current = truckToClose.id;

    try {
      await closeTruckFromService(
        supabase,
        truckToClose.id
      );
      const closedTruck = await markTruckReadyForShipment(
        supabase,
        truckToClose.id
      );

      await recordTruckAuditEventSafely(supabase, {
        truck: closedTruck || truckToClose,
        truckId: truckToClose.id,
        eventType: "PRODUCTION_CLOSED",
        eventLabel: automatic
          ? "Producción cerrada automáticamente"
          : "Producción cerrada",
        actor: currentUser,
        changes: buildTruckAuditChanges(
          truckToClose,
          closedTruck || {
            ...truckToClose,
            status: "CLOSED",
            shipment_status: "READY",
          }
        ),
        metadata: {
          automatic,
          completed_boxes: completedBoxes,
        },
        source: "ACTIVE",
      });

      const nextPlannedTruck =
        await fetchNextPlannedTruck(
          supabase,
          appConfig.reference
        );

      if (nextPlannedTruck) {
        await openPlannedTruck(
          supabase,
          nextPlannedTruck.id
        );
      }

      let newTruck = await getActiveTruck(
        appConfig.reference,
        currentUser
          ? `${currentUser.username} - ${currentUser.name}`
          : "Sistema automático"
      );

      if (
        nextPlannedTruck?.planned_expedition_date &&
        newTruck?.id
      ) {
        newTruck =
          (await updateTruckExpeditionDate(
            newTruck.id,
            nextPlannedTruck.planned_expedition_date
          )) || newTruck;
      }

      if (nextPlannedTruck && newTruck?.id) {
        newTruck =
          (await copyPlannedTruckLogisticsToActiveTruck(
            supabase,
            newTruck.id,
            nextPlannedTruck
          )) || newTruck;
      }

      if (newTruck?.id) {
        await recordTruckAuditEventSafely(supabase, {
          truck: newTruck,
          truckId: newTruck.id,
          scheduleId: nextPlannedTruck?.id || null,
          eventType: "TRUCK_OPENED",
          eventLabel: nextPlannedTruck
            ? "Camión planificado abierto en producción"
            : "Nuevo camión abierto automáticamente",
          actor: currentUser,
          changes: nextPlannedTruck
            ? buildTruckAuditChanges(
                nextPlannedTruck,
                newTruck
              )
            : [],
          metadata: {
            automatic_activation: automatic,
            planned_schedule:
              Boolean(nextPlannedTruck),
          },
          source: "ACTIVE",
        });
      }

      setActiveTruck(newTruck);
      setDisplayTruck(null);
      setBoxLabels([]);

      await loadTrucksHistory();
      await loadTruckSchedule();

      setShowBoxLabelsModal(false);

      const closeReason = automatic
        ? `Camión ${truckToClose.truck_number} completado con ${
            completedBoxes ||
            appConfig.boxesPerTruck ||
            49
          } cajas y cerrado automáticamente.\nEstado logístico: preparado para expedición.`
        : `Camión ${truckToClose.truck_number} cerrado correctamente.\nEstado logístico: preparado para expedición.`;

      const expeditionText =
        nextPlannedTruck?.planned_expedition_date
          ? `\nFecha prevista: ${nextPlannedTruck.planned_expedition_date
              .split("-")
              .reverse()
              .join("/")}`
          : "\nSin fecha de expedición programada.";

      const planningWarning = nextPlannedTruck
        ? ""
        : "\n\nNo había otro camión planificado. Se ha creado el siguiente camión abierto para no detener la producción.";

      alert(
        `${closeReason}\n\nNuevo camión activo: ${
          newTruck?.truck_number || "-"
        }${expeditionText}${planningWarning}`
      );

      return newTruck;
    } catch (error) {
      console.error(
        "Error cerrando o activando camión:",
        error
      );

      alert(
        "No se ha podido completar el cambio de camión.\n\n" +
          "La etiqueta ya generada conserva sus datos. " +
          "Revise el camión activo antes de generar otra etiqueta.\n\n" +
          (error?.message || String(error))
      );

      return null;
    } finally {
      closingTruckIdRef.current = null;
    }
  }

  async function closeActiveTruck() {
    if (!activeTruck) return;

    if (isJointShipmentReference(activeTruck.reference)) {
      try {
        const progress = await fetchJointShipmentProgress(supabase, {
          shipmentId: activeTruck.joint_shipment_id,
          truckNumber: activeTruck.truck_number,
        });

        if (!progress?.ready) {
          alert(
            `El camión conjunto ${activeTruck.truck_number} todavía no puede cerrarse.\n\n` +
              `F1012: ${progress?.f1012 || 0}/49 cajas\n` +
              `F1013: ${progress?.f1013 || 0}/49 cajas\n\n` +
              "Se cerrará automáticamente al completar las 98 cajas."
          );
          return;
        }

        await refreshActiveTruck();
        await loadTrucksHistory();
        alert(
          `La expedición conjunta ${activeTruck.truck_number} ya está completa: 49 cajas F1012 + 49 cajas F1013.`
        );
        return;
      } catch (error) {
        alert(
          error?.message ||
            "No se ha podido comprobar la expedición conjunta."
        );
        return;
      }
    }

    const confirmar = window.confirm(
      `¿Desea cerrar el camión ${activeTruck.truck_number}?\n\nNo podrán añadirse más cajas a este camión.`
    );

    if (!confirmar) return;

    await closeTruckAndActivateNext(activeTruck);
  }


  const {
    appUsers,
    setAppUsers,
    operatorUsers,
    adminFilteredUsers,
    adminSearch,
    setAdminSearch,
    adminUserForm,
    setAdminUserForm,
    showAdminPanel,
    setShowAdminPanel,
    usersMode,
    lastUsersSyncAt,
    saveAdminUser: saveAdminUserFromHook,
    editAdminUser,
    deleteAdminUser: deleteAdminUserFromHook,
    resetAdminUserForm,
    refreshSharedUsers: refreshSharedUsersFromHook,
  } = useUsers({
    supabase,
    isSupabaseConfigured,
    defaultUsers: USERS,
  });

  const [currentUser, setCurrentUser] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("fabrimotor-current-user") || "null"
    );
  } catch {
    return null;
  }
});
  
  const [showProductionStart, setShowProductionStart] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("fabrimotor-current-user") || "null");
      return isVerificationUser(storedUser) && !localStorage.getItem("startupPiece");
    } catch {
      return false;
    }
  });
  const [startupReference, setStartupReference] = useState(() => localStorage.getItem("startupReference") || "F-1012");
  const [startupPiece, setStartupPiece] = useState(() => localStorage.getItem("startupPiece") || "");
  const [startupOF, setStartupOF] = useState(() => localStorage.getItem("startupOF") || "");
  const [startupLot, setStartupLot] = useState(() => localStorage.getItem("startupLot") || "");

  async function fetchSavedReferenceConfig(referenceId) {
    const localConfig = normalizeReferenceConfig(
      referenceId,
      referenceConfigs[referenceId]
    );

    if (!isSupabaseConfigured || !supabase) {
      return localConfig;
    }

    const settingKeys = [referenceConfigSettingKey(referenceId)];

    if (referenceId === "F-1012") {
      settingKeys.push("f1012_config");
    }

    for (const settingKey of settingKeys) {
      const { data, error } = await supabase
        .from("fabrimotor_settings")
        .select("value")
        .eq("key", settingKey)
        .maybeSingle();

      if (error) {
        console.warn(
          `No se ha podido leer la configuración ${settingKey}:`,
          error
        );
        continue;
      }

      if (data?.value) {
        return normalizeReferenceConfig(referenceId, data.value);
      }
    }

    return localConfig;
  }

  async function loadReferenceConfig(referenceId) {
    const normalizedReference = CONFIGURABLE_REFERENCE_IDS.includes(
      referenceId
    )
      ? referenceId
      : "F-1012";
    const config = await fetchSavedReferenceConfig(
      normalizedReference
    );

    setReferenceConfigs((previous) => {
      const next = {
        ...previous,
        [normalizedReference]: config,
      };

      persistReferenceConfigs(next);
      return next;
    });

    return config;
  }

  async function loadConfigReferenceCounter(referenceId) {
    const normalizedReference = CONFIGURABLE_REFERENCE_IDS.includes(
      referenceId
    )
      ? referenceId
      : "F-1012";

    setConfigReferenceCounterLoading(true);
    setConfigReferenceCounterError("");

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          "Supabase no está configurado. No se puede consultar el contador."
        );
      }

      const counter = await fetchReferenceBoxCounter(
        supabase,
        normalizedReference
      );

      setConfigReferenceCounter({
        ...counter,
        savedNextNumber: counter.nextNumber,
      });
      setBoxCounter(counter.nextNumber);
      return counter;
    } catch (error) {
      setConfigReferenceCounter({
        reference: normalizedReference,
        nextNumber: "",
        savedNextNumber: "",
        updatedBy: "",
        updatedAt: "",
      });
      setConfigReferenceCounterError(
        error?.message ||
          `No se ha podido cargar el contador de ${normalizedReference}.`
      );
      throw error;
    } finally {
      setConfigReferenceCounterLoading(false);
    }
  }

  async function handleConfigReferenceChange(referenceId) {
    const cachedConfig = normalizeReferenceConfig(
      referenceId,
      referenceConfigs[referenceId]
    );

    setConfigForm(cachedConfig);

    try {
      const [savedConfig] = await Promise.all([
        loadReferenceConfig(referenceId),
        loadConfigReferenceCounter(referenceId),
      ]);
      setConfigForm(savedConfig);
    } catch (error) {
      console.error(
        "Error cargando la configuración o el contador de referencia:",
        error
      );
    }
  }

  async function handleSaveReferenceConfig(
    nextConfig,
    { nextBoxNumber, counterChanged = false } = {}
  ) {
    const referenceId = CONFIGURABLE_REFERENCE_IDS.includes(
      nextConfig?.reference
    )
      ? nextConfig.reference
      : "F-1012";
    const normalizedConfig = normalizeReferenceConfig(
      referenceId,
      nextConfig
    );
    const actor = currentUser
      ? `${currentUser.username} - ${currentUser.name}`
      : "Sistema";

    if (isSupabaseConfigured && supabase) {
      await updateAppSetting(
        supabase,
        referenceConfigSettingKey(referenceId),
        normalizedConfig,
        actor
      );

      if (referenceId === "F-1012") {
        await updateAppSetting(
          supabase,
          "f1012_config",
          normalizedConfig,
          actor
        );
      }

      if (counterChanged) {
        const savedCounter = await setReferenceBoxCounter(
          supabase,
          referenceId,
          nextBoxNumber,
          actor
        );
        setConfigReferenceCounter({
          ...savedCounter,
          savedNextNumber: savedCounter.nextNumber,
        });
        setBoxCounter(savedCounter.nextNumber);
      }
    } else if (counterChanged) {
      throw new Error(
        "No se puede modificar el contador porque Supabase no está configurado."
      );
    }

    setReferenceConfigs((previous) => {
      const next = {
        ...previous,
        [referenceId]: normalizedConfig,
      };

      persistReferenceConfigs(next);
      return next;
    });
    setConfigForm(normalizedConfig);

    if (appConfig.reference === referenceId) {
      setAppConfig(normalizedConfig);
    }

    return normalizedConfig;
  }

  useEffect(() => {
    if (!showConfigModal) return;

    loadConfigReferenceCounter(
      configForm?.reference || appConfig.reference || "F-1012"
    ).catch((error) => {
      console.error(
        "Error cargando el contador al abrir Configuración:",
        error
      );
    });
  }, [showConfigModal]);

  useEffect(() => {
    if (!currentUser) return undefined;

    let cancelled = false;

    const hydrateReferenceConfigs = async () => {
      const loadedEntries = await Promise.all(
        CONFIGURABLE_REFERENCE_IDS.map(async (referenceId) => [
          referenceId,
          await fetchSavedReferenceConfig(referenceId),
        ])
      );

      if (cancelled) return;

      const loadedConfigs = Object.fromEntries(loadedEntries);
      setReferenceConfigs(loadedConfigs);
      persistReferenceConfigs(loadedConfigs);

      const activeReference =
        localStorage.getItem("startupReference") || "F-1012";
      const activeConfig =
        loadedConfigs[activeReference] || loadedConfigs["F-1012"];

      if (activeConfig) {
        setAppConfig(activeConfig);
        setConfigForm(activeConfig);
      }
    };

    hydrateReferenceConfigs().catch((error) => {
      console.error(
        "Error sincronizando configuraciones de referencia:",
        error
      );
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.username]);

  useEffect(() => {
    if (currentUser) {
      const savedStartupReference = localStorage.getItem("startupReference") || "F-1012";
      const savedStartupReferenceData = getReferenceById(savedStartupReference);
      const savedStartupPiece = localStorage.getItem("startupPiece") || "";
      const savedStartupOF = localStorage.getItem("startupOF") || "";
      const savedStartupLot = localStorage.getItem("startupLot") || "";

      setForm((previous) => ({
        ...previous,
        operario: `${currentUser.username} - ${currentUser.name.trim()}`,
        referencia: savedStartupReference,
        referenciaNombre: savedStartupReferenceData.label,
        numeroPieza: savedStartupPiece || previous.numeroPieza,
        ordenFabricacion: savedStartupOF || previous.ordenFabricacion || "",
        lote: savedStartupLot || previous.lote || "",
      }));

      if (isJointShipmentReference(savedStartupReference)) {
        const savedReferenceConfig = normalizeReferenceConfig(
          savedStartupReference,
          referenceConfigs[savedStartupReference]
        );

        setAppConfig(savedReferenceConfig);
        setConfigForm(savedReferenceConfig);
      }

      if (isVerificationUser(currentUser) && !savedStartupPiece) {
        setShowProductionStart(true);
      }

      if (!isVerificationUser(currentUser)) {
        setShowProductionStart(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isVerificationUser(currentUser)) return;
    if (!isSupabaseConfigured || !supabase) return;
    if (!isJointShipmentReference(appConfig.reference)) return;

    if (
      operationalReferenceCommittedRef.current ===
      appConfig.reference
    ) {
      operationalReferenceCommittedRef.current = "";
      return;
    }

    loadOperationalReferenceData(appConfig.reference).catch(
      (error) => {
        console.error(
          "Error recuperando el progreso de la referencia:",
          error
        );
      }
    );
  }, [
    currentUser?.username,
    appConfig.reference,
    isSupabaseConfigured,
  ]);

  const refreshSharedRecords = async () => {
  try {
    await refreshSharedRecordsFromHook();
    alert("Datos actualizados desde la base compartida.");
  } catch (error) {
    console.error(
      "Error actualizando base compartida:",
      error
    );

    alert(
      `No se ha podido actualizar desde la base compartida:\n\n${
        error?.message || String(error)
      }`
    );
  }
};

  const refreshSharedUsers = async () => {
    if (!isSupabaseConfigured) {
      alert("Los usuarios compartidos no están configurados. La aplicación está trabajando con usuarios locales.");
      return;
    }

    try {
      setUsersMode("Conectando...");
      const sharedUsers = await fetchSharedUsers(supabase);
      const nextUsers = Array.isArray(sharedUsers) && sharedUsers.length > 0 ? sharedUsers : getStoredUsers();

      setAppUsers(nextUsers);
      saveStoredUsers(nextUsers);
      setUsersMode("Compartidos");
      setLastUsersSyncAt(new Date().toLocaleString("es-ES"));
      alert("Usuarios actualizados desde Supabase.");
    } catch (error) {
      console.error("Error actualizando usuarios:", error);
      setUsersMode("Local sin conexión");
      alert(`No se han podido actualizar los usuarios desde Supabase:\n\n${error?.message || String(error)}`);
    }
  };

  useEffect(() => {
    if (!timerStart) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStart]);

  useEffect(() => {
    const intervalNow = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(intervalNow);
  }, []);

  useEffect(() => {
    if (currentUser && !isVerificationUser(currentUser) && activeView === "nueva") {
      setActiveView("historico");
      setShowProductionStart(false);
    }
  }, [currentUser, activeView]);

  const startTimerIfNeeded = () => {
    if (!timerStart) {
      setTimerStart(Date.now());
      setElapsedSeconds(0);
    }
  };


  const getRecordTimeMs = (record) => {
    if (record.savedAtMs) return record.savedAtMs;

    const parsedCreatedAt = Date.parse(record.createdAt);
    if (!Number.isNaN(parsedCreatedAt)) return parsedCreatedAt;

    if (record.fecha && record.horaGuardado) {
      const parsedFechaHora = Date.parse(`${record.fecha}T${record.horaGuardado}`);
      if (!Number.isNaN(parsedFechaHora)) return parsedFechaHora;
    }

    return 0;
  };

  const getLastHyundaiRecord = () => {
    return records
      .filter(
        (record) =>
          record.maquina === "Torno Hyundai" &&
          (record.referencia || "F-1012") === (form.referencia || "F-1012") &&
          record.fecha === form.fecha &&
          record.turno === form.turno && record.operario === form.operario
      )
      .sort((a, b) => getRecordTimeMs(b) - getRecordTimeMs(a))[0];
  };

  const getLastRecordForCurrentContext = () => {
    return records
      .filter(
        (record) =>
          record.maquina === form.maquina &&
          (record.referencia || "F-1012") === (form.referencia || "F-1012") &&
          record.fecha === form.fecha &&
          record.turno === form.turno && record.operario === form.operario
      )
      .sort((a, b) => getRecordTimeMs(b) - getRecordTimeMs(a))[0];
  };

  const lastVerificationElapsedLabel = useMemo(() => {
    const lastRecord = getLastRecordForCurrentContext();

    if (!lastRecord) {
      return "Sin registros";
    }

    const lastTime = getRecordTimeMs(lastRecord);

    if (!lastTime) {
      return "Sin datos";
    }

    const seconds = Math.max(0, Math.floor((nowMs - lastTime) / 1000));
    return formatDuration(seconds);
  }, [
    records,
    form.referencia,
    form.maquina,
    form.fecha,
    form.turno,
    nowMs,
  ]);

  const hyundaiWaitInfo = {
  blocked: false,
  remainingMinutes: 0,
};

  const checks = getMachineChecks(
    form.referencia || appConfig.reference,
    form.maquina
  );

  const hasPreviousShiftRecord = useMemo(
    () =>
      hasPreviousShiftVerification(records, {
        referencia: form.referencia || "F-1012",
        maquina: form.maquina,
        fecha: form.fecha,
        turno: form.turno,
      }),
    [
      records,
      form.referencia,
      form.maquina,
      form.fecha,
      form.turno,
    ]
  );

const isShiftStartCheckOptionalNow = (id, value) =>
  isShiftStartValueOptional(id, value, hasPreviousShiftRecord);

const validation = useMemo(() => {
  return checks.map((item) => {
    const value = values[item.id];

    if (item.type === "number") {
      if (isQualityDailyCheckEmptyById(item.id, value)) {
        return {
          ...item,
          value,
          ok: true,
          pendingQuality: true,
        };
      }

      if (isShiftStartCheckOptionalNow(item.id, value)) {
        return {
          ...item,
          value,
          ok: true,
          pendingShiftStart: true,
        };
      }

      const numeric = Number(value);
      const ok =
        !Number.isNaN(numeric) &&
        numeric >= item.min &&
        numeric <= item.max;

      return {
        ...item,
        value,
        ok,
      };
    }

    if (item.type === "oknok") {
      if (isShiftStartCheckOptionalNow(item.id, value)) {
        return {
          ...item,
          value,
          ok: true,
          pendingShiftStart: true,
        };
      }

      return {
        ...item,
        value,
        ok: value === "OK",
      };
    }

    return {
      ...item,
      value,
      ok: false,
    };
  });
}, [checks, values, hasPreviousShiftRecord]);

  const controlTurnoOk =
  form.maquina !== "Torno Hyundai" ||
  values.controlTurno === "OK" ||
  isShiftStartCheckOptionalNow("controlTurno", values.controlTurno);
  const overallOk =
   validation.every((v) => isQualityDailyValidationEmpty(v) || v.ok) &&
   controlTurnoOk;

  const buildSheetId = (data) => {
    if (!data.fecha || !data.turno || !data.maquina) {
      return "";
    }

    return `${data.referencia || "F-1012"}__${data.fecha}__${data.turno}__${data.maquina}`;
  };

  const buildSheetName = (data) => {
    if (!data.fecha || !data.turno || !data.maquina) {
      return "";
    }

    const referenceId =
      data.referencia || form.referencia || appConfig.reference;
    const machineName =
      data.maquinaNombre ||
      getMachineDisplayName(referenceId, data.maquina);

    return `${data.fecha} · ${turnoLabel(data.turno)} · ${machineName}`;
  };

  const currentSheetId = buildSheetId(form);
  const currentSheetName = buildSheetName(form);

  const availableSheets = useMemo(() => {
    const sheetMap = new Map();

    records.forEach((record) => {
      const sheetId = record.hojaId || buildSheetId(record);

      if (!sheetId) return;

      sheetMap.set(sheetId, buildReportSheetName(record));
    });

    return Array.from(sheetMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => b.name.localeCompare(a.name));
  }, [records]);

  const activeSheetId = showOnlyCurrentSheet
    ? currentSheetId
    : selectedSheetId;

  const activeSheetName = showOnlyCurrentSheet
    ? currentSheetName
    : availableSheets.find((sheet) => sheet.id === selectedSheetId)?.name || "";

  const filteredRecords = records.filter((record) => {
    const matchCurrentOperator =
      !isVerificationUser(currentUser) ||
      String(record.operario || "").startsWith(String(currentUser?.username || ""));

    const matchDate = !filterDate || record.fecha === filterDate;
    const matchTurno = !filterTurno || record.turno === filterTurno;
    const matchOperario =
      !filterOperario ||
      String(record.operario || "")
        .toLowerCase()
        .includes(filterOperario.toLowerCase());
    const matchPieza =
      !filterPieza ||
      String(record.numeroPieza || "")
        .toLowerCase()
        .includes(filterPieza.toLowerCase());
    const matchMaquina = !filterMaquina || record.maquina === filterMaquina;
    const recordSheetId = buildSheetId(record);
    const matchSheet = !activeSheetId || recordSheetId === activeSheetId;

    

    return (
      matchCurrentOperator &&
      matchDate &&
      matchTurno &&
      matchOperario &&
      matchPieza &&
      matchMaquina &&
      matchSheet
    );
  });

  const getRejectedChecks = (record) => {
    const machineChecks = getMachineChecks(
      record.referencia || "F-1012",
      record.maquina
    );

    return machineChecks
      .filter((check) => {
        const value = record.mediciones?.[check.id];

        if (value === undefined || value === null || value === "") return false;

        if (check.type === "number") {
          const numeric = Number(value);
          return Number.isNaN(numeric) || numeric < check.min || numeric > check.max;
        }

        if (check.type === "oknok") {
          return value !== "OK";
        }

        return false;
      })
      .map((check) => {
        const reason = record.mediciones?.rechazoMotivos?.[check.id];

        return {
          control: check.control,
          value: record.mediciones?.[check.id] ?? "",
          reason:
            reason?.tipo === "Otro" && reason?.detalle
              ? `Otro - ${reason.detalle}`
              : reason?.tipo || "",
        };
      });
  };

  const getRejectionReasonsText = (reasons = {}) => {
    return Object.values(reasons)
      .filter((reason) => reason?.tipo)
      .map((reason) =>
        reason.tipo === "Otro" && reason.detalle
          ? `${reason.control}: Otro - ${reason.detalle}`
          : `${reason.control}: ${reason.tipo}`
      )
      .join(" | ");
  };

  const hasRequiredRejectReasons = (
    measurementValues,
    machineName,
    referenceId = form.referencia || appConfig.reference
  ) => {
    const machineChecks = getMachineChecks(referenceId, machineName);
    const reasons = measurementValues?.rechazoMotivos || {};

    return machineChecks.every((check) => {
      const value = measurementValues?.[check.id];
      let isNok = false;

      if (value === undefined || value === null || value === "") {
        return true;
      }

      if (check.type === "number") {
        const numeric = Number(value);
        isNok = Number.isNaN(numeric) || numeric < check.min || numeric > check.max;
      }

      if (check.type === "oknok") {
        isNok = value !== "OK";
      }

      if (!isNok) {
        return true;
      }

      const reason = reasons[check.id];
      return Boolean(reason?.tipo && (reason.tipo !== "Otro" || reason.detalle?.trim()));
    });
  };

  const requestAccessCode = () => {
  if (!isAdminUser(currentUser)) {
    alert("Solo los administradores pueden editar o eliminar registros.");
    return false;
  }

  return true;
};

  const saveLocal = (next) => {
    setRecords(next);
    localStorage.setItem("f1012-zona-b", JSON.stringify(next));
  };

  const saveRecordToSharedDatabase = async (record) => {
    if (!isSupabaseConfigured) return;

    try {
      await upsertSharedRecord(
        supabase,
        record
      )
      setDatabaseMode("Compartida");
      setLastSyncAt(new Date().toLocaleString("es-ES"));
    } catch (error) {
      console.error("Error guardando en base compartida:", error);
      setDatabaseMode("Local sin conexión");
      alert(
        `La verificación se ha guardado en este dispositivo, pero NO se ha podido sincronizar con la base compartida.\n\n${error?.message || String(error)}`
      );
    }
  };

  const saveUserToSharedDatabase = async (user) => {
    if (!isSupabaseConfigured) {
      alert("Usuario guardado solo localmente: Supabase no está configurado.");
      return false;
    }

    try {
      await upsertSharedUser(supabase, user);
      setUsersMode("Compartidos");
      setLastUsersSyncAt(new Date().toLocaleString("es-ES"));
      return true;
    } catch (error) {
      console.error("Error guardando usuario en Supabase:", error);
      setUsersMode("Local sin conexión");
      alert(`Usuario guardado localmente, pero NO se ha podido sincronizar con Supabase:

${error?.message || String(error)}`);
      return false;
    }
  };

  const deleteUserFromSharedDatabase = async (username) => {
    if (!isSupabaseConfigured) return;

    try {
      await deleteSharedUser(supabase, username);
      setUsersMode("Compartidos");
      setLastUsersSyncAt(new Date().toLocaleString("es-ES"));
    } catch (error) {
      console.error("Error eliminando usuario en Supabase:", error);
      setUsersMode("Local sin conexión");
      alert(`Usuario eliminado localmente, pero no se ha podido eliminar en Supabase:\n\n${error?.message || String(error)}`);
    }    
  };

  const printBoxLabel = async () => {
  try {
    const result = await createAndPrintBoxLabel({
      supabase,
      appConfig,
      currentUser,
      labelForm,
      totalCaja,
      numeroSemana,
      numeroDia,
      resolveActiveTruck: getActiveTruck,
    });

    setActiveTruck(result.truck);

    if (Array.isArray(result.labels)) {
      setBoxLabels(result.labels);
    }

    const savedLabels = Array.isArray(
      result.labels
    )
      ? result.labels
      : [];

    const completedBoxes = new Set(
      savedLabels
        .map(
          (label) =>
            label.numero_caja ||
            label.numeroCaja
        )
        .filter(Boolean)
    ).size;

    const targetBoxes = Number(
      appConfig.boxesPerTruck || 49
    );

    if (result.warnings?.length > 0) {
      alert(
        result.warnings.join(
          "\n\n----------------\n\n"
        )
      );
    }

    closeLabelModal();

    setForm((previous) => ({
      ...previous,
      numeroPieza: "",
    }));

    if (result.truck?.id && isJointShipmentReference(result.truck.reference)) {
      const progress = await fetchJointShipmentProgress(supabase, {
        shipmentId: result.truck.joint_shipment_id,
        truckNumber: result.truck.truck_number,
      });

      if (progress?.ready) {
        const newTruck = await getActiveTruck(
          appConfig.reference,
          currentUser
            ? `${currentUser.username} - ${currentUser.name}`
            : "Sistema automático"
        );

        setActiveTruck(newTruck);
        setDisplayTruck(null);
        setBoxLabels([]);
        await loadTrucksHistory();
        await loadTruckSchedule();

        alert(
          `Expedición conjunta ${result.truck.truck_number} completada y cerrada automáticamente.\n\n` +
            "Carga final: 49 cajas F1012 + 49 cajas F1013 = 98 cajas.\n" +
            `Nuevo camión conjunto activo: ${newTruck?.truck_number || "-"}.`
        );
      } else if (
        completedBoxes >= targetBoxes &&
        (progress?.readyF1012 || progress?.readyF1013)
      ) {
        const pendingReference = progress.readyF1012 ? "F1013" : "F1012";
        const pendingBoxes = progress.readyF1012
          ? progress.pendingF1013
          : progress.pendingF1012;

        alert(
          `${appConfig.reference.replace("-", "")} ha completado sus 49 cajas.\n` +
            `La expedición conjunta continúa abierta: faltan ${pendingBoxes} cajas de ${pendingReference}.`
        );
      }
    } else if (
      completedBoxes >= targetBoxes &&
      result.truck?.id
    ) {
      await closeTruckAndActivateNext(result.truck, {
        automatic: true,
        completedBoxes,
      });
    }
    
  } catch (error) {
    console.error(
      "Error generando etiqueta:",
      error
    );

    alert(
      error?.message ||
        "No se ha podido generar la etiqueta."
    );
  }
};

  const getSelectedBoxNumber = (box) =>
    String(
      box?.numeroCaja ||
      box?.numero_caja ||
      ""
    ).trim();

  const loadBoxReprints = async (box) => {
    const numeroCaja = getSelectedBoxNumber(box);
    const reference =
      box?.reference ||
      displayTruck?.reference ||
      activeTruck?.reference ||
      appConfig.reference;

    if (!numeroCaja) return [];

    return fetchLabelReprints({
      supabase,
      numeroCaja,
      reference,
    });
  };

  const reprintBoxLabel = async (box, reason) => {
    const numeroCaja = getSelectedBoxNumber(box);
    const reference =
      box?.reference ||
      displayTruck?.reference ||
      activeTruck?.reference ||
      appConfig.reference;

    if (!numeroCaja) {
      throw new Error(
        "Selecciona una caja antes de reimprimir."
      );
    }

    const originalRows = boxLabels.filter(
      (row) =>
        String(
          row?.numero_caja ||
          row?.numeroCaja ||
          ""
        ).trim() === numeroCaja &&
        String(
          row?.reference ||
          displayTruck?.reference ||
          activeTruck?.reference ||
          appConfig.reference
        )
          .trim()
          .toUpperCase() ===
          String(reference).trim().toUpperCase()
    );
    const referenceData = getReferenceById(reference);
    const referenceConfig = normalizeReferenceConfig(
      referenceData.id,
      referenceConfigs[referenceData.id]
    );

    return reprintExistingBoxLabel({
      supabase,
      appConfig: referenceConfig,
      currentUser,
      boxRows: originalRows,
      reason,
    });
  };

  const saveIncident = () => {
    if (!incidentForm.codigoEtiqueta || !incidentForm.descripcion.trim()) {
      alert("Debe indicar código etiqueta y descripción de la incidencia.");
    
      return;
    }

    const newIncident = {
      id: crypto.randomUUID(),
      fecha: form.fecha,
      turno: form.turno,
      maquina: form.maquina,
      referencia: form.referencia,
      referenciaNombre: form.referenciaNombre,
      operario: form.operario,
      numeroFabricacion: incidentForm.numeroFabricacion,
      numeroColada: incidentForm.numeroColada,
      numeroPieza: incidentForm.codigoEtiqueta,
      codigoEtiqueta: incidentForm.codigoEtiqueta,
      tipoFallo: incidentForm.tipoFallo,
      descripcion: incidentForm.descripcion.trim(),
      piezasAfectadas: incidentForm.piezasAfectadas,
      piezaAnterior: incidentForm.piezaAnterior,
      piezaPosterior: incidentForm.piezaPosterior,
      recuperable: "Pendiente Calidad",
      chatarra: "Pendiente Calidad",
      estadoCalidad: "Pendiente",
      pesoKg: incidentForm.pesoKg,
      costeKg: incidentForm.costeKg,
      accionCorrectiva: "",
      responsableAccion: "",
      fechaCompromiso: "",
      estadoAccion: "Abierta",
      costeTotal:
      Number(incidentForm.pesoKg || 0) *
      Number(incidentForm.costeKg || 0) *
      Number(incidentForm.piezasAfectadas || 1),
      createdAt: new Date().toISOString(),
    };
    
    addIncident(newIncident).catch((error) => {
      console.error("Error guardando incidencia:", error);
      
      alert(
        `La incidencia se ha guardado en este dispositivo, pero NO se ha podido sincronizar con la base compartida.\n\n${
          error?.message || String(error)
        }`
      );
    });

    resetIncidentForm();
    closeIncidentModal();
  };
  
      const saveIncidentsUpdate = (
        nextIncidents,
        updatedIncident
      ) => {
        saveIncidentsUpdateFromHook(
          nextIncidents,
          updatedIncident
        ).catch((error) => {
          console.error(
            "Error sincronizando incidencia:",
            error
          );
          
          alert(
            `Error sincronizando incidencia:\n\n${
              error?.message || String(error)
            }`
          );
        });
      };
    
    const showNotification = (message, type = "success", duration = 2500) => {
      setNotification({ message, type });
      
      window.setTimeout(() => {
        setNotification(null);
      }, duration);
    };

    const saveRecord = () => {
    try {

    if (!isVerificationUser(currentUser)) {
      alert("Solo el rol Operario puede registrar verificaciones.");
      return;
    }
    const operarioRegistro = form.operario || (currentUser ? `${currentUser.username} - ${currentUser.name.trim()}` : "");

    if (!operarioRegistro || !form.numeroPieza) {
      alert("Debe indicar operario y número de pieza antes de guardar.");
      return;
    }

    const missingShiftStartControls =
      getMissingShiftStartControls(
        form.maquina,
        checks,
        values,
        hasPreviousShiftRecord
      );

    if (missingShiftStartControls.length > 0) {
      alert(
        `Primera verificación del turno. Debe completar:\n\n${missingShiftStartControls
          .map((label) => `• ${label}`)
          .join("\n")}`
      );
      return;
    }

    if (
      !overallOk &&
      !hasRequiredRejectReasons(
        values,
        form.maquina,
        form.referencia || appConfig.reference
      )
    ) {
      alert("Debe indicar el motivo del rechazo en cada cota NOK antes de guardar.");
      return;
    }

    if (form.maquina === "Torno Hyundai" && hyundaiWaitInfo.blocked) {
      alert(
        `No ha transcurrido el tiempo suficiente entre registros. Deben pasar al menos 25 minutos entre verificaciones del Torno Hyundai dentro del mismo turno.

Tiempo restante aproximado: ${hyundaiWaitInfo.remainingMinutes} minutos.`
      );

      return;
    }

    const ahora = new Date();

    const row = {
      ...form,
      maquinaNombre: getMachineDisplayName(
        form.referencia || appConfig.reference,
        form.maquina
      ),
      operario: operarioRegistro,
      usuarioSistema: currentUser?.username || "",
      rolUsuarioSistema: currentUser?.role || "",
      hojaId: currentSheetId,
      hojaNombre: currentSheetName,
      horaGuardado: ahora.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      resultado: overallOk ? "OK" : "NO OK",
      rechazoTipo: overallOk
        ? ""
        : form.rechazoTipo?.trim() || getRejectionReasonsText(values.rechazoMotivos),
      mediciones: values,
      savedAtMs: ahora.getTime(),
      createdAt: ahora.toISOString(),
      id: createRecordId(),
    };

    const next = [row, ...records];
    saveLocal(next);
    saveRecordToSharedDatabase(row);
    setValues({});
    setTimerStart(null);
    setElapsedSeconds(0);
    setNowMs(Date.now());
    
    setForm((previous) => ({
      ...previous,
      numeroPieza: "",
      rechazoTipo: "",
      observaciones: "",
    }));

    showNotification(
      `Pieza ${row.numeroPieza} · ${row.resultado}`
    );

    } catch (error) {
      console.error("Error guardando verificación:", error);
      alert(`Error técnico al guardar la verificación:\n\n${error?.message || String(error)}`);
    }
  };

  const removeRecord = (id) => {
    const next = records.filter((r) => r.id !== id);
    saveLocal(next);

    deleteSharedRecord(supabase, id).catch((error) => {
      console.error("Error eliminando en base compartida:", error);
      alert(`Registro eliminado en este dispositivo, pero no se ha podido eliminar en la base compartida:\n\n${error?.message || String(error)}`);
    });
  };

  const getBoxLabelsSummary = () => {
  const grouped = {};

  boxLabels.forEach((row) => {
    const boxNumber = row.numero_caja || "SIN CAJA";
    const reference = String(
      row.reference || appConfig.reference || ""
    )
      .trim()
      .toUpperCase()
      .replace(/^F(\d)/, "F-$1");
    const groupKey = `${reference}::${boxNumber}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        numeroCaja: boxNumber,
        reference,
        fecha: row.fecha,
        operario: row.operario2
          ? `${row.operario1} / ${row.operario2}`
          : row.operario1,
        semana: row.semana,
        dia: row.dia,
        totalPiezas: 0,
        combinaciones: [],
      };
    }

    grouped[groupKey].totalPiezas += Number(row.cantidad || 0);

    grouped[groupKey].combinaciones.push(
      `FAB ${row.fabricacion} · COL ${row.colada} · ${row.cantidad} uds`
    );
  });

  return Object.values(grouped).sort((a, b) => {
    const referenceDifference = String(a.reference).localeCompare(
      String(b.reference)
    );

    return (
      referenceDifference ||
      String(a.numeroCaja).localeCompare(String(b.numeroCaja))
    );
  });
};

  const boxLabelsSummary = getBoxLabelsSummary();

  const truckProgress = useMemo(() => {
  const completedBoxes = boxLabelsSummary.length;
  const targetBoxes = appConfig.boxesPerTruck || 49;

  const lastBox =
    boxLabelsSummary.length > 0
      ? boxLabelsSummary[boxLabelsSummary.length - 1]
      : null;

  return {
    completedBoxes,
    targetBoxes,
    remainingBoxes: Math.max(targetBoxes - completedBoxes, 0),
    percent:
      targetBoxes > 0
        ? Math.min((completedBoxes / targetBoxes) * 100, 100)
        : 0,
    isComplete: completedBoxes >= targetBoxes,
    lastBox,
  };
}, [boxLabelsSummary, appConfig.boxesPerTruck]);

  const printBoxLabelsReport = () => {
    const summary = boxLabelsSummary;
    const currentTruck = displayTruck || activeTruck;

    if (!summary.length) {
      alert("No hay cajas para generar el Packing List.");
      return;
    }

    if (!currentTruck) {
      alert("No se ha podido identificar el camión del informe.");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(
        "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes e inténtalo de nuevo."
      );
      return;
    }

    const escapeReportHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const formatReportDate = (value) => {
      if (!value) return "-";

      const normalized = String(value).slice(0, 10);
      const parts = normalized.split("-");

      return parts.length === 3
        ? `${parts[2]}/${parts[1]}/${parts[0]}`
        : escapeReportHtml(value);
    };

    const formatReportDateTime = (value) => {
      if (!value) return "-";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return escapeReportHtml(value);
      }

      return date.toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });
    };

    const shipmentStatusLabels = {
      PENDING: "Pendiente",
      READY: "Preparado",
      SHIPPED: "Expedido",
    };

    const reference =
      currentTruck.reference ||
      appConfig.reference ||
      "F-1012";
    const referenceForFile = String(reference)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase() || "F1012";
    const truckNumber = currentTruck.truck_number || "-";
    const totalPieces = summary.reduce(
      (total, box) => total + Number(box.totalPiezas || 0),
      0
    );
    const targetBoxes = Number(appConfig.boxesPerTruck || 49);
    const tractorPlate =
      currentTruck.tractor_plate ||
      currentTruck.vehicle_plate ||
      "-";
    const trailerPlate =
      currentTruck.trailer_plate || "-";
    const shipmentStatus =
      shipmentStatusLabels[currentTruck.shipment_status] ||
      currentTruck.shipment_status ||
      "Pendiente";
    const actualExpeditionDateForFile = String(
      currentTruck.actual_expedition_date || ""
    ).slice(0, 10);
    const actualExpeditionDateParts =
      actualExpeditionDateForFile.split("-");
    const shipmentDateForFile =
      actualExpeditionDateParts.length === 3 &&
      actualExpeditionDateParts.every(Boolean)
        ? `${actualExpeditionDateParts[2]}-${actualExpeditionDateParts[1]}-${actualExpeditionDateParts[0]}`
        : "Fecha_envio_pendiente";
    const reportTitle =
      `${referenceForFile}_Camion_${shipmentDateForFile}_Packing_List`;

    const logisticFields = [
      ["Cliente", currentTruck.customer_name || "-"],
      ["Destino", currentTruck.destination || "-"],
      ["Transportista", currentTruck.carrier_name || "-"],
      ["Matrícula tractora", tractorPlate],
      ["Matrícula remolque", trailerPlate],
      ["Brida / precinto", currentTruck.seal_number || "-"],
      ["Número de albarán", currentTruck.delivery_note_number || "-"],
      ["Estado logístico", shipmentStatus],
      [
        "Fecha prevista",
        formatReportDate(currentTruck.planned_expedition_date),
      ],
      [
        "Fecha real",
        formatReportDate(currentTruck.actual_expedition_date),
      ],
      ["Expedición confirmada por", currentTruck.shipped_by || "-"],
      [
        "Confirmada el",
        formatReportDateTime(currentTruck.shipped_at),
      ],
    ];

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeReportHtml(reportTitle)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10px;
              background: #ffffff;
            }
            header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 3px solid #1d4ed8;
              padding-bottom: 10px;
            }
            .brand {
              color: #1d4ed8;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            h1 {
              margin: 4px 0 0;
              font-size: 25px;
              line-height: 1.05;
            }
            .header-reference {
              color: #475569;
              font-size: 12px;
              font-weight: 800;
              text-align: right;
            }
            .header-reference strong {
              display: block;
              margin-top: 3px;
              color: #0f172a;
              font-size: 20px;
            }
            .logistics {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 7px;
              margin-top: 11px;
            }
            .field {
              min-height: 48px;
              border: 1px solid #cbd5e1;
              border-radius: 7px;
              padding: 7px;
              background: #f8fafc;
            }
            .field span {
              display: block;
              margin-bottom: 4px;
              color: #64748b;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .field strong {
              font-size: 11px;
              overflow-wrap: anywhere;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-top: 10px;
            }
            .summary-card {
              border-radius: 7px;
              padding: 8px 10px;
              color: #ffffff;
              background: #0f172a;
            }
            .summary-card span {
              display: block;
              color: #bfdbfe;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .summary-card strong {
              display: block;
              margin-top: 2px;
              font-size: 18px;
            }
            h2 {
              margin: 14px 0 6px;
              color: #1e3a8a;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
            }
            th {
              border: 1px solid #0f172a;
              padding: 6px;
              color: #ffffff;
              text-align: left;
              background: #1e3a8a;
            }
            td {
              border: 1px solid #cbd5e1;
              padding: 5px 6px;
              vertical-align: top;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .right {
              text-align: right;
            }
            .box-number {
              font-weight: 900;
              white-space: nowrap;
            }
            .pieces-ok {
              color: #047857;
              font-weight: 900;
            }
            .pieces-warning {
              color: #dc2626;
              font-weight: 900;
            }
            .observations {
              min-height: 48px;
              margin-top: 10px;
              border: 1px solid #cbd5e1;
              border-radius: 7px;
              padding: 8px;
            }
            .observations span {
              display: block;
              margin-bottom: 4px;
              color: #64748b;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 25px;
            }
            .signature {
              border-top: 1px solid #64748b;
              padding-top: 5px;
              color: #64748b;
              font-size: 9px;
              font-weight: 700;
              text-align: center;
            }
            footer {
              margin-top: 15px;
              border-top: 1px solid #cbd5e1;
              padding-top: 6px;
              color: #64748b;
              font-size: 8px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="brand">Fabrimotor · FM Control</div>
              <h1>Packing List</h1>
            </div>
            <div class="header-reference">
              Referencia ${escapeReportHtml(reference)}
              <strong>Camión ${escapeReportHtml(truckNumber)}</strong>
              Generado: ${escapeReportHtml(
                new Date().toLocaleString("es-ES")
              )}
            </div>
          </header>

          <section class="logistics">
            ${logisticFields
              .map(
                ([label, value]) => `
                  <div class="field">
                    <span>${escapeReportHtml(label)}</span>
                    <strong>${escapeReportHtml(value)}</strong>
                  </div>
                `
              )
              .join("")}
          </section>

          <section class="summary">
            <div class="summary-card">
              <span>Cajas cargadas</span>
              <strong>${summary.length} / ${targetBoxes}</strong>
            </div>
            <div class="summary-card">
              <span>Total de piezas</span>
              <strong>${totalPieces}</strong>
            </div>
            <div class="summary-card">
              <span>Huecos libres</span>
              <strong>${Math.max(targetBoxes - summary.length, 0)}</strong>
            </div>
          </section>

          <h2>Detalle de la carga</h2>
          <table>
            <thead>
              <tr>
                <th>Nº Caja</th>
                <th>Fecha</th>
                <th>Operario</th>
                <th class="right">Piezas</th>
                <th>Fabricaciones / coladas</th>
                <th class="right">Semana</th>
                <th class="right">Día</th>
              </tr>
            </thead>
            <tbody>
              ${summary
                .map(
                  (box) => `
                    <tr>
                      <td class="box-number">${escapeReportHtml(
                        box.numeroCaja
                      )}</td>
                      <td>${formatReportDate(box.fecha)}</td>
                      <td>${escapeReportHtml(box.operario || "-")}</td>
                      <td class="right ${
                        Number(box.totalPiezas) ===
                        Number(appConfig.piecesPerBox || 16)
                          ? "pieces-ok"
                          : "pieces-warning"
                      }">${escapeReportHtml(box.totalPiezas)}</td>
                      <td>${(box.combinaciones || [])
                        .map((combination) =>
                          escapeReportHtml(combination)
                        )
                        .join("<br>")}</td>
                      <td class="right">${escapeReportHtml(
                        box.semana || "-"
                      )}</td>
                      <td class="right">${escapeReportHtml(
                        box.dia || "-"
                      )}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>

          <div class="observations">
            <span>Observaciones</span>
            ${escapeReportHtml(currentTruck.notes || "Sin observaciones")}
          </div>

          <div class="signatures">
            <div class="signature">Responsable de expedición</div>
            <div class="signature">Transportista / conductor</div>
          </div>

          <footer>
            FABRIMOTOR · Packing List generado automáticamente por FM Control
          </footer>
        </body>
      </html>
    `);
    printWindow.document.close();

    let printStarted = false;
    const startPrint = () => {
      if (printStarted || printWindow.closed) return;

      printStarted = true;
      printWindow.focus();
      printWindow.print();
    };

    printWindow.onload = startPrint;
    window.setTimeout(startPrint, 500);
  };

  const exportBoxLabelsExcel = async () => {
  const XLSX = await import("xlsx");
  const currentReference =
    form.referencia || appConfig.reference || "F-1012";
  const referenceForFile = currentReference
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  const rows = boxLabels.map((row) => ({
    Fecha: row.fecha,
    Operario: row.operario2
      ? `${row.operario1} / ${row.operario2}`
      : row.operario1,
    "Nº Caja": row.numero_caja,
    Línea: row.linea,
    Fabricación: row.fabricacion,
    Colada: row.colada,
    Cantidad: row.cantidad,
    Semana: row.semana,
    Día: row.dia,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    `Cajas ${currentReference.replace("-", "")}`
  );

  XLSX.writeFile(
    workbook,
    `control_cajas_${referenceForFile}.xlsx`
  );
};

  const exportExcel = () => {
    const rows = [];
    const currentReference =
      form.referencia || appConfig.reference || "F-1012";
    const currentReferenceData = getReferenceById(currentReference);

    records
      .filter(
        (record) =>
          (record.referencia || "F-1012") === currentReference
      )
      .forEach((r) => {
      const row = {
        Referencia: r.referenciaNombre || r.referencia || "F-1012 · Célula B",
        Fecha: r.fecha,
        Máquina:
          r.maquinaNombre ||
          getMachineDisplayName(
            r.referencia || "F-1012",
            r.maquina
          ),
        "Hoja verificación": buildSheetName(r) || r.hojaNombre,
        Turno: turnoLabel(r.turno),
        Operario: r.operario,
        "Usuario sistema": r.usuarioSistema || "",
        "Rol usuario": r.rolUsuarioSistema ? roleLabel(r.rolUsuarioSistema) : "",
        "Número pieza": r.numeroPieza,
        "Hora guardado": r.horaGuardado,
        "Control turno": r.mediciones?.controlTurno || "",
        Resultado: r.resultado,
        "Tipo error rechazo": r.rechazoTipo || "",
        Observaciones: r.observaciones,
      };

      const machineChecks = getMachineChecks(
        r.referencia || "F-1012",
        r.maquina
      );

      machineChecks.forEach((check) => {
        row[check.control] = r.mediciones?.[check.id] ?? "";
      });

        rows.push(row);
      });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    const referenceForFile = currentReference
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
    const cellForFile = (currentReferenceData.celula || appConfig.cell || "")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Control ${currentReference.replace("-", "")}`
    );
    XLSX.writeFile(
      workbook,
      `control_proceso_${referenceForFile}_${cellForFile}.xlsx`
    );
  };

  const getPdfFilteredRecords = () =>
    records.filter((record) => {
      const matchFrom = !pdfDateFrom || record.fecha >= pdfDateFrom;
      const matchTo = !pdfDateTo || record.fecha <= pdfDateTo;
      const matchTurno = !pdfTurno || record.turno === pdfTurno;
      const matchOperario =
        !pdfOperario ||
        String(record.operario || "")
          .toLowerCase()
          .includes(pdfOperario.toLowerCase());
      const matchPieza =
        !pdfPieza ||
        String(record.numeroPieza || "")
          .toLowerCase()
          .includes(pdfPieza.toLowerCase());
      const matchMaquina = !pdfMaquina || record.maquina === pdfMaquina;
      const matchReference =
        (record.referencia || "F-1012") ===
        (form.referencia || appConfig.reference);

      return (
        matchReference &&
        matchFrom &&
        matchTo &&
        matchTurno &&
        matchOperario &&
        matchPieza &&
        matchMaquina
      );
    });

  const pdfFilteredRecords = getPdfFilteredRecords();

  const recordsByMachine = (machineName) =>
    records.filter(
      (record) =>
        record.maquina === machineName &&
        (record.referencia || "F-1012") ===
          (form.referencia || appConfig.reference)
    );

  const pdfRecordsByMachine = (machineName) =>
    pdfFilteredRecords.filter(
      (record) =>
        record.maquina === machineName &&
        (record.referencia || "F-1012") ===
          (form.referencia || appConfig.reference)
    );

  const cpkFilteredRecords = records
    .filter((record) => record.maquina === "Torno Hyundai")
    .filter(
      (record) =>
        (record.referencia || "F-1012") ===
        (form.referencia || appConfig.reference)
    )
    .filter((record) => {
      const matchFrom = !cpkDateFrom || record.fecha >= cpkDateFrom;
      const matchTo = !cpkDateTo || record.fecha <= cpkDateTo;
      const matchTurno = !cpkTurno || record.turno === cpkTurno;
      const matchOperario =
        !cpkOperario ||
        String(record.operario || "")
          .toLowerCase()
          .includes(cpkOperario.toLowerCase());

      return matchFrom && matchTo && matchTurno && matchOperario;
    });

  const printPdfReport = () => {
    window.print();
  };

  const calculateResult = (
    machineName,
    measurementValues,
    referenceId = form.referencia || appConfig.reference
  ) => {
    const machineChecks = getMachineChecks(referenceId, machineName);
    const editedRecordTimestamp =
      getVerificationTimestamp(editingRecord);
    const hasEarlierShiftRecord =
      hasPreviousShiftVerification(
        records,
        {
          referencia: referenceId,
          maquina: machineName,
          fecha: editForm?.fecha,
          turno: editForm?.turno,
        },
        {
          excludeRecordId: editingRecord?.id || "",
          beforeMs: editedRecordTimestamp || null,
        }
      );

    const checksOk = machineChecks.every((check) => {
      const value = measurementValues?.[check.id];

      if (isQualityDailyCheckEmptyById(check.id, value)) {
        return true;
      }

      if (
        isShiftStartValueOptional(
          check.id,
          value,
          hasEarlierShiftRecord
        )
      ) {
        return true;
      }

      if (check.type === "number") {
        const numeric = Number(value);
        return !Number.isNaN(numeric) && numeric >= check.min && numeric <= check.max;
      }

      if (check.type === "oknok") {
        return value === "OK";
      }

      return false;
    });

    const controlTurnoOk =
      machineName !== "Torno Hyundai" ||
      measurementValues?.controlTurno === "OK" ||
      isShiftStartValueOptional(
        "controlTurno",
        measurementValues?.controlTurno,
        hasEarlierShiftRecord
      );

    return checksOk && controlTurnoOk ? "OK" : "NO OK";
  };

  const openEditRecord = (record) => {
    setEditingRecord(record);
    setEditForm({
      referencia: record.referencia || "F-1012",
      referenciaNombre:
        record.referenciaNombre ||
        getReferenceById(record.referencia || "F-1012").label,
      maquina: record.maquina,
      maquinaNombre:
        record.maquinaNombre ||
        getMachineDisplayName(
          record.referencia || "F-1012",
          record.maquina
        ),
      fecha: record.fecha,
      turno: record.turno,
      operario: record.operario,
      numeroPieza: record.numeroPieza,
      rechazoTipo: record.rechazoTipo || "",
      observaciones: record.observaciones || "",
    });
    setEditValues({ ...(record.mediciones || {}) });
  };

  const closeEditRecord = () => {
    setEditingRecord(null);
    setEditForm(null);
    setEditValues({});
  };

  const saveEditedRecord = () => {
    if (!editingRecord || !editForm) return;

    const ahora = new Date();
    const editedRecordTimestamp =
      getVerificationTimestamp(editingRecord);
    const hasEarlierShiftRecord =
      hasPreviousShiftVerification(
        records,
        {
          referencia:
            editForm.referencia ||
            editingRecord.referencia ||
            "F-1012",
          maquina: editForm.maquina,
          fecha: editForm.fecha,
          turno: editForm.turno,
        },
        {
          excludeRecordId: editingRecord.id,
          beforeMs: editedRecordTimestamp || null,
        }
      );
    const editChecks = getMachineChecks(
      editForm.referencia ||
        editingRecord.referencia ||
        "F-1012",
      editForm.maquina
    );
    const missingShiftStartControls =
      getMissingShiftStartControls(
        editForm.maquina,
        editChecks,
        editValues,
        hasEarlierShiftRecord
      );

    if (missingShiftStartControls.length > 0) {
      alert(
        `Esta es la primera verificación del turno. Debe completar:\n\n${missingShiftStartControls
          .map((label) => `• ${label}`)
          .join("\n")}`
      );
      return;
    }

    const resultado = calculateResult(
      editForm.maquina,
      editValues,
      editForm.referencia || editingRecord.referencia || "F-1012"
    );

    if (
      resultado === "NO OK" &&
      !hasRequiredRejectReasons(
        editValues,
        editForm.maquina,
        editForm.referencia || editingRecord.referencia || "F-1012"
      )
    ) {
      alert("Debe indicar el motivo del rechazo en cada cota NOK antes de guardar.");
      return;
    }

    const updatedRecord = {
      ...editingRecord,
      ...editForm,
      maquinaNombre: getMachineDisplayName(
        editForm.referencia || editingRecord.referencia || "F-1012",
        editForm.maquina
      ),
      hojaId: buildSheetId(editForm),
      hojaNombre: buildSheetName(editForm),
      rechazoTipo: resultado === "NO OK"
        ? editForm.rechazoTipo?.trim() || getRejectionReasonsText(editValues.rechazoMotivos)
        : "",
      mediciones: editValues,
      resultado,
      modifiedAt: ahora.toLocaleString(),
      horaModificacion: ahora.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    const next = records.map((record) =>
      record.id === editingRecord.id
        ? updatedRecord
        : record
    );
    
    saveLocal(next);
    
    upsertSharedRecord(
      supabase,
      updatedRecord
    ).catch((error) => {
      console.error(
        "Error actualizando registro compartido:",
        error
      );
      
      alert(
        `El registro se ha actualizado en este dispositivo, pero no se ha podido sincronizar con la base compartida.\n\n${
          error?.message || String(error)
        }`
      );
    });

    closeEditRecord();
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("fabrimotor-current-user", JSON.stringify(user));

    if (isVerificationUser(user)) {
      localStorage.removeItem("startupReference");
      localStorage.removeItem("startupPiece");
      localStorage.removeItem("startupOF");
      setStartupReference("F-1012");
      setStartupPiece("");
      setStartupOF("");
      setShowProductionStart(true);
      setActiveView("nueva");
    } else {
      setShowProductionStart(false);
      setActiveView("historico");
    }

    setForm((previous) => ({
      ...previous,
      operario: `${user.username} - ${user.name.trim()}`,
      referencia: "F-1012",
      referenciaNombre: "F-1012 · Célula B",
      numeroPieza: "",
      ordenFabricacion: "",
    }));
  };

  const openBoxLabelsModal = async () => {
  try {
    const truck = await refreshActiveTruck();

    const labels = await fetchDashboardBoxesForTruck(truck);
    setBoxLabels(labels);

    await loadTrucksHistory();
    await loadTruckSchedule();

    setShowBoxLabelsModal(true);
  } catch (error) {
    console.error("Error cargando listado de cajas:", error);
    alert("No se ha podido cargar el listado de cajas.");
  }
};

const openOperatorDashboard = async () => {
  setShowOperatorDashboard(true);
  setOperatorDataLoading(true);

  try {
    if (!isSupabaseConfigured || !supabase) {
      setOperatorBoxLabels(boxLabels || []);
      return;
    }

    const { data, error } = await supabase
      .from("f1012_box_labels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) {
      throw error;
    }

    setOperatorBoxLabels(data || []);
  } catch (error) {
    console.error(
      "Error cargando datos de operarios:",
      error
    );

    setOperatorBoxLabels(boxLabels || []);

    alert(
      `No se han podido cargar todas las etiquetas de los operarios.\n\n${
        error?.message || String(error)
      }`
    );
  } finally {
    setOperatorDataLoading(false);
  }
};

const openStatisticsDashboard = async () => {
  setShowStatisticsDashboard(true);
  setStatisticsDataLoading(true);

  try {
    if (!isSupabaseConfigured || !supabase) {
      setOperatorBoxLabels(boxLabels || []);
      return;
    }

    const { data, error } = await supabase
      .from("f1012_box_labels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) {
      throw error;
    }

    setOperatorBoxLabels(data || []);
  } catch (error) {
    console.error(
      "Error cargando datos estadísticos:",
      error
    );

    setOperatorBoxLabels(boxLabels || []);

    alert(
      `No se han podido cargar todas las etiquetas para las estadísticas.\n\n${
        error?.message || String(error)
      }`
    );
  } finally {
    setStatisticsDataLoading(false);
  }
};

const handleLogout = () => {
  localStorage.removeItem("fabrimotor-current-user");
  localStorage.removeItem("startupReference");
  localStorage.removeItem("startupPiece");
  localStorage.removeItem("startupOF");
  setStartupReference("F-1012");
  setStartupPiece("");
  setStartupOF("");
  setShowProductionStart(false);
  setCurrentUser(null);
};


const handleCreatePlannedTruck = async (plannedTruck) => {
  try {
    const reference =
      plannedTruck?.reference ||
      appConfig.reference ||
      "F-1012";

    const providedTruckNumber = Number(
      plannedTruck?.truckNumber ??
      plannedTruck?.truck_number
    );

    const truckNumber =
      Number.isInteger(providedTruckNumber) && providedTruckNumber > 0
        ? providedTruckNumber
        : await fetchNextTruckNumber(reference);

    const createdTruck = await createPlannedTruck(supabase, {
      reference,
      truckNumber,
      plannedExpeditionDate:
        plannedTruck?.plannedExpeditionDate ||
        plannedTruck?.planned_expedition_date ||
        null,
      actualExpeditionDate:
        plannedTruck?.actualExpeditionDate ||
        plannedTruck?.actual_expedition_date ||
        null,
      customerName:
        plannedTruck?.customerName ||
        plannedTruck?.customer_name ||
        "",
      destination:
        plannedTruck?.destination || "",
      carrierName:
        plannedTruck?.carrierName ||
        plannedTruck?.carrier_name ||
        "",
      tractorPlate:
        plannedTruck?.tractorPlate ||
        plannedTruck?.tractor_plate ||
        plannedTruck?.vehiclePlate ||
        plannedTruck?.vehicle_plate ||
        "",
      trailerPlate:
        plannedTruck?.trailerPlate ||
        plannedTruck?.trailer_plate ||
        "",
      sealNumber:
        plannedTruck?.sealNumber ||
        plannedTruck?.seal_number ||
        "",
      deliveryNoteNumber:
        plannedTruck?.deliveryNoteNumber ||
        plannedTruck?.delivery_note_number ||
        "",
      shipmentStatus:
        plannedTruck?.shipmentStatus ||
        plannedTruck?.shipment_status ||
        "PENDING",
      notes: plannedTruck?.notes?.trim() || null,
      createdBy: currentUser?.username || "Sistema",
    });

    await recordTruckAuditEventSafely(supabase, {
      truck: createdTruck,
      scheduleId: createdTruck.id,
      eventType: "PLANNING_CREATED",
      eventLabel: "Expedición planificada",
      actor: currentUser,
      changes: buildTruckAuditChanges({}, createdTruck),
      metadata: {
        planned_expedition_date:
          createdTruck.planned_expedition_date,
      },
      source: "PLANNED",
    });

    await loadTruckSchedule();
    return createdTruck;
  } catch (error) {
    console.error("Error creando camión planificado:", error);
    alert(
      `No se ha podido crear el camión planificado: ${
        error?.message || "Error desconocido"
      }`
    );
    return false;
  }
};

async function handleUpdatePlannedTruck(truck, updates) {
  if (!isSupabaseConfigured || !supabase || !truck?.id) return;

  const updatedTruck = await updatePlannedTruck(
    supabase,
    truck.id,
    updates
  );
  const changes = buildTruckAuditChanges(truck, updatedTruck);

  if (changes.length) {
    await recordTruckAuditEventSafely(supabase, {
      truck: updatedTruck,
      scheduleId: updatedTruck.id,
      eventType: "PLANNING_UPDATED",
      eventLabel: "Planificación actualizada",
      actor: currentUser,
      changes,
      source: "PLANNED",
    });
  }

  await loadTruckSchedule();
  return updatedTruck;
}

async function handleDeletePlannedTruck(truck) {
  if (!isSupabaseConfigured || !supabase || !truck?.id) return;

  if (!window.confirm(`¿Eliminar camión planificado ${truck.truck_number}?`)) {
    return;
  }

  await deletePlannedTruck(supabase, truck.id);

  await recordTruckAuditEventSafely(supabase, {
    truck,
    scheduleId: truck.id,
    eventType: "PLANNING_DELETED",
    eventLabel: "Planificación eliminada",
    actor: currentUser,
    metadata: {
      planned_expedition_date:
        truck.planned_expedition_date,
    },
    source: "PLANNED",
  });

  await loadTruckSchedule();
  return true;
}

async function fetchOpenTruck(reference) {
  if (!isSupabaseConfigured || !supabase) return null;
  
  const { data, error } = await supabase
    .from("f1012_trucks")
    .select("*")
    .eq("reference", reference)
    .eq("status", "OPEN")
    .order("truck_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function fetchNextTruckNumber(reference) {
  if (!isSupabaseConfigured || !supabase) return 1;

  const [truckResult, scheduleResult] = await Promise.all([
    supabase
      .from("f1012_trucks")
      .select("truck_number")
      .eq("reference", reference)
      .order("truck_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("f1012_truck_schedule")
      .select("truck_number")
      .eq("reference", reference)
      .eq("status", "PLANNED")
      .order("truck_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (truckResult.error) throw truckResult.error;
  if (scheduleResult.error) throw scheduleResult.error;

  const lastTruckNumber = Number(
    truckResult.data?.truck_number || 0
  );
  const lastScheduledNumber = Number(
    scheduleResult.data?.truck_number || 0
  );

  return Math.max(
    lastTruckNumber,
    lastScheduledNumber
  ) + 1;
}

async function getActiveTruck(reference, createdBy = "") {
  if (!isSupabaseConfigured || !supabase) return null;

  if (isJointShipmentReference(reference)) {
    return await getActiveJointTruck(
      supabase,
      reference,
      createdBy
    );
  }

  return await getActiveTruckFromService(supabase, reference, createdBy);
}

async function loadOperationalReferenceData(
  referenceId,
  { commit = true } = {}
) {
  const selectedReferenceData = getReferenceById(referenceId);

  if (!isJointShipmentReference(selectedReferenceData.id)) {
    return null;
  }

  const loadId = operationalReferenceLoadIdRef.current + 1;
  operationalReferenceLoadIdRef.current = loadId;
  setOperationalReferenceLoading(true);

  try {
    const actor = currentUser
      ? `${currentUser.username} - ${currentUser.name}`
      : "Sistema";
    const truck = await getActiveTruck(
      selectedReferenceData.id,
      actor
    );
    const [labels, history, schedule] = await Promise.all([
      truck?.id ? fetchBoxLabels(supabase, truck.id) : [],
      fetchTrucksFromService(
        supabase,
        selectedReferenceData.id
      ),
      fetchTruckSchedule(
        supabase,
        selectedReferenceData.id
      ),
    ]);

    if (operationalReferenceLoadIdRef.current !== loadId) {
      return null;
    }

    const referenceLabels = (labels || []).filter((row) => {
      const rowReference = String(row?.reference || "")
        .trim()
        .toUpperCase()
        .replace(/^F(\d)/, "F-$1");

      return (
        !rowReference ||
        rowReference === selectedReferenceData.id
      );
    });

    if (commit) {
      setActiveTruck(truck);
      setDisplayTruck(null);
      setBoxLabels(referenceLabels);
      setTrucks(history || []);
      setTruckSchedule(schedule || []);
      setHighlightBoxNumber("");
      setHighlightBoxReference("");
    }

    return {
      truck,
      labels: referenceLabels,
      history: history || [],
      schedule: schedule || [],
    };
  } finally {
    if (operationalReferenceLoadIdRef.current === loadId) {
      setOperationalReferenceLoading(false);
    }
  }
}

async function loadTrucksHistory(
  reference = appConfig.reference
) {
  if (!isSupabaseConfigured || !supabase) {
    console.log("No hay Supabase configurado");
    return [];
  }

  const data = await fetchTrucksFromService(
    supabase,
    reference
  );

  console.log("HISTÓRICO CAMIONES DESDE SUPABASE:", data);

  setTrucks(data);

  return data;
}

async function loadTruckSchedule(
  reference = appConfig.reference
) {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const data = await fetchTruckSchedule(
    supabase,
    reference
  );

  setTruckSchedule(data);

  return data;
}

async function refreshActiveTruck() {
  const truck = await getActiveTruck(
    appConfig.reference,
    currentUser
      ? `${currentUser.username} - ${currentUser.name}`
      : "Sistema"
  );
  setActiveTruck(truck);
  return truck;
}

async function fetchDashboardBoxesForTruck(truck) {
  if (!truck?.id) return [];

  if (truck.joint_shipment_id) {
    return await fetchJointShipmentBoxes(
      supabase,
      truck.joint_shipment_id
    );
  }

  return await fetchBoxLabels(supabase, truck.id);
}

async function handleSelectTruck(truck) {
  setDisplayTruck(truck);

  const labels = await fetchDashboardBoxesForTruck(truck);
  setBoxLabels(labels);
  setHighlightBoxNumber("");
  setHighlightBoxReference("");
}

async function handleSearchBox(boxNumber, referenceOverride = "") {
  const search = String(boxNumber || "").trim().toUpperCase();
  const searchReference = String(
    referenceOverride || appConfig.reference || ""
  )
    .trim()
    .toUpperCase()
    .replace(/^F(\d)/, "F-$1");

  if (!search) {
    alert("Indica un número de caja.");
    return;
  }

  const { data: boxRows, error: boxError } = await supabase
    .from("f1012_box_labels")
    .select("*")
    .eq("numero_caja", search)
    .eq("reference", searchReference)
    .limit(1);

  if (boxError) {
    console.error("Error buscando caja:", boxError);
    alert("No se ha podido buscar la caja.");
    return;
  }

  if (!boxRows || boxRows.length === 0) {
    alert(`No se ha encontrado la caja ${search}.`);
    return;
  }

  const box = boxRows[0];

  if (!box.camion_id) {
    alert("La caja existe, pero no tiene camión asociado.");
    return;
  }

  const { data: truck, error: truckError } = await supabase
    .from("f1012_trucks")
    .select("*")
    .eq("id", box.camion_id)
    .single();

  if (truckError) {
    console.error("Error buscando camión:", truckError);
    alert("No se ha podido localizar el camión de esta caja.");
    return;
  }

  setDisplayTruck(truck);

  const labels = await fetchDashboardBoxesForTruck(truck);
  setBoxLabels(labels);

  setHighlightBoxNumber(search);
  setHighlightBoxReference(
    String(box.reference || searchReference)
      .trim()
      .toUpperCase()
      .replace(/^F(\d)/, "F-$1")
  );
}

  const hasPendingVerificationData =
    Boolean(String(form.numeroPieza || "").trim()) ||
    Boolean(String(form.rechazoTipo || "").trim()) ||
    Boolean(String(form.observaciones || "").trim()) ||
    Object.values(values || {}).some(hasMeaningfulInput);

  const applyOperationalReference = async (
    referenceId,
    { clearVerificationDraft = true } = {}
  ) => {
    const selectedReferenceData = getReferenceById(referenceId);

    if (!isJointShipmentReference(selectedReferenceData.id)) {
      setReferenceSwitchError(
        "La referencia seleccionada no está disponible para producción conjunta."
      );
      return false;
    }

    setReferenceSwitching(true);
    setReferenceSwitchTarget(selectedReferenceData.id);
    setReferenceSwitchError("");

    try {
      const configPromise = loadReferenceConfig(
        selectedReferenceData.id
      );
      const counterPromise =
        isSupabaseConfigured && supabase
          ? fetchReferenceBoxCounter(
              supabase,
              selectedReferenceData.id
            ).catch((error) => {
              console.warn(
                `No se ha podido actualizar el contador de ${selectedReferenceData.id}:`,
                error
              );
              return null;
            })
          : Promise.resolve(null);
      const operationalDataPromise =
        isSupabaseConfigured && supabase
          ? loadOperationalReferenceData(
              selectedReferenceData.id,
              { commit: false }
            )
          : Promise.resolve({
              truck: null,
              labels: [],
              history: [],
              schedule: [],
            });

      const [
        selectedReferenceConfig,
        selectedReferenceCounter,
        operationalData,
      ] = await Promise.all([
        configPromise,
        counterPromise,
        operationalDataPromise,
      ]);

      localStorage.setItem(
        "startupReference",
        selectedReferenceData.id
      );
      setStartupReference(selectedReferenceData.id);

      if (selectedReferenceCounter?.nextNumber) {
        setBoxCounter(selectedReferenceCounter.nextNumber);
      }

      setActiveTruck(operationalData?.truck || null);
      setDisplayTruck(null);
      setBoxLabels(operationalData?.labels || []);
      setTrucks(operationalData?.history || []);
      setTruckSchedule(operationalData?.schedule || []);
      setHighlightBoxNumber("");
      setHighlightBoxReference("");

      if (clearVerificationDraft) {
        setValues({});
        setTimerStart(null);
        setElapsedSeconds(0);
        setVisualHelpItem(null);
        resetLabelForm();
      }

      setForm((previous) => ({
        ...previous,
        referencia: selectedReferenceData.id,
        referenciaNombre: selectedReferenceData.label,
        maquinaNombre: getMachineDisplayName(
          selectedReferenceData.id,
          previous.maquina
        ),
        ...(clearVerificationDraft
          ? {
              numeroPieza: "",
              rechazoTipo: "",
              observaciones: "",
            }
          : {}),
      }));

      operationalReferenceCommittedRef.current =
        selectedReferenceData.id;
      setAppConfig(selectedReferenceConfig);
      setConfigForm(selectedReferenceConfig);
      setNowMs(Date.now());

      return true;
    } catch (error) {
      console.error(
        "Error cambiando la referencia operativa:",
        error
      );
      setReferenceSwitchError(
        `No se ha podido cambiar a ${selectedReferenceData.id}. ` +
          "La referencia anterior continúa activa."
      );
      return false;
    } finally {
      setReferenceSwitching(false);
      setReferenceSwitchTarget("");
    }
  };

  const requestOperationalReferenceChange = async (referenceId) => {
    const selectedReferenceData = getReferenceById(referenceId);
    const currentReference =
      form.referencia || appConfig.reference || "F-1012";

    if (selectedReferenceData.id === currentReference) {
      return;
    }

    if (hasPendingVerificationData) {
      const confirmed = window.confirm(
        `Hay datos de una verificación sin guardar en ${currentReference}.\n\n` +
          `Al cambiar a ${selectedReferenceData.id} se limpiarán el número de pieza y las lecturas introducidas.\n\n` +
          "¿Desea continuar?"
      );

      if (!confirmed) {
        return;
      }
    }

    const changed = await applyOperationalReference(
      selectedReferenceData.id
    );

    if (changed) {
      showNotification(
        `Referencia activa: ${selectedReferenceData.id}`
      );
    }
  };

  const confirmProductionStart = async () => {
    const selectedReferenceData = getReferenceById(
      startupReference
    );
    const piece = startupPiece.trim();
    const of = startupOF.trim();

    const changed = await applyOperationalReference(
      selectedReferenceData.id
    );

    if (!changed) {
      return;
    }

    localStorage.setItem("startupPiece", piece);
    localStorage.setItem("startupOF", of);

    setForm((previous) => ({
      ...previous,
      referencia: selectedReferenceData.id,
      referenciaNombre: selectedReferenceData.label,
      numeroPieza: piece,
      ordenFabricacion: of,
    }));

    setShowProductionStart(false);
  };

  const saveAdminUser = async () => {
  try {
    const result = await saveAdminUserFromHook();

    if (!result?.shared) {
      alert("Usuario guardado localmente.");
    }
  } catch (error) {
    console.error("Error guardando usuario:", error);

    alert(
      error?.message ||
        "No se ha podido guardar el usuario."
    );
  }
};

  
  const deleteAdminUser = (username) => {
    if (username === currentUser?.username) {
      alert("No puedes eliminar el usuario con la sesión abierta.");
      return;
    }

    if (!window.confirm("¿Eliminar este usuario?")) return;

    const nextUsers = appUsers.filter((user) => user.username !== username);
    setAppUsers(nextUsers);
    saveStoredUsers(nextUsers);
    deleteUserFromSharedDatabase(username);
  };
  useEffect(() => {
    const handleCommandShortcut = (event) => {
      const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isCommandShortcut) return;
      event.preventDefault();
      setShowCommandPalette((value) => !value);
    };

    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  const openCommandBox = async (box) => {
    const boxNumber = box?.numeroCaja || box?.numero_caja || "";
    if (boxNumber) {
      await openBoxLabelsModal();
      await handleSearchBox(boxNumber);
    }
  };

  const openCommandTruck = async (truck) => {
    if (truck) {
      setActiveWorkspaceModule("trucks");
      await loadTrucksHistory();
      await loadTruckSchedule();
      await handleSelectTruck(truck);
      setShowBoxLabelsModal(true);
    }
  };

  const handleWorkspaceNavigate = async (moduleId) => {
    setActiveWorkspaceModule(moduleId);

    if (
      !isVerificationUser(currentUser) &&
      (moduleId === "dashboard" || moduleId === "production")
    ) {
      setShowProductionModal(false);
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    if (moduleId === "trucks") {
      await openBoxLabelsModal();
      return;
    }

    if (moduleId === "production") {
      setShowProductionModal(true);
      return;
    }

    if (moduleId === "operators") {
      await openOperatorDashboard();
      return;
    }

    if (moduleId === "statistics") {
      await openStatisticsDashboard();
      return;
    }

    if (moduleId === "labels") {
      setShowLabelModal(true);
      return;
    }

    if (moduleId === "config") {
      setShowConfigModal(true);
    }
  };

  const operatorLastBox = (() => {
    const activeReference = String(
      form.referencia || appConfig.reference || "F-1012"
    )
      .trim()
      .toUpperCase()
      .replace(/^F(\d)/, "F-$1");
    const lastReferenceBox =
      [...boxLabelsSummary]
        .reverse()
        .find(
          (box) =>
            String(box?.reference || activeReference)
              .trim()
              .toUpperCase()
              .replace(/^F(\d)/, "F-$1") === activeReference
        ) || null;

    if (!lastReferenceBox) return null;

    const storedBoxNumber = String(
      lastReferenceBox.numeroCaja ||
        lastReferenceBox.numero_caja ||
        ""
    );
    const displayedBoxNumber =
      activeReference === "F-1013"
        ? storedBoxNumber.replace(/^FB-26-/i, "FA-26-")
        : storedBoxNumber;

    return {
      ...lastReferenceBox,
      numeroCaja: displayedBoxNumber,
      numero_caja: displayedBoxNumber,
    };
  })();
  const operatorLastRecord = getLastRecordForCurrentContext?.() || null;
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={appUsers} />;
  }

  const isOperatorView = isVerificationUser(currentUser);
  const isQualityView = isQualityUser(currentUser);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {!isOperatorView && (
      <AppWorkspaceShell
        activeModule={activeWorkspaceModule}
        onNavigate={handleWorkspaceNavigate}
        currentUser={currentUser}
        supabaseOnline={isSupabaseConfigured}
        now={new Date(nowMs)}
        onOpenCommand={() => setShowCommandPalette(true)}
        onLogout={handleLogout}
      >
        <div className="space-y-4">
          {isQualityView ? (
            <>
            <div className="rounded-[2rem] border border-blue-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                    Área exclusiva de Calidad
                  </div>
                  <h2 className="mt-1 text-3xl font-black text-slate-950">
                    Controles diarios
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Registra únicamente las cotas asignadas a Calidad.
                    Las verificaciones de proceso corresponden al operario.
                  </p>
                </div>
                <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                  Nº120 · Nº280
                </div>
              </div>
            </div>

            <Suspense fallback={<ModuleLoadingFallback />}>
              <QualityDailyControlsPanel
                currentUser={currentUser}
                supabase={supabase}
                isSupabaseConfigured={isSupabaseConfigured}
              />
            </Suspense>
            </>
          ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Workspace de gestión</div>
                <h2 className="mt-1 text-3xl font-black text-slate-900">FM Control</h2>
                <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">
                  Consulta la actividad de producción y abre desde la barra lateral Camiones, Operarios, Estadísticas, Etiquetas o Configuración.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCommandPalette(true)}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg"
              >
                🔍 Buscar · Ctrl K
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-2xl font-black text-slate-900">{dashboardStats.totalRegistros}</div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Registros</div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-2xl font-black text-slate-900">{boxLabelsSummary?.length || 0}</div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Cajas</div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-2xl font-black text-slate-900">{trucks?.length || 0}</div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Camiones</div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-2xl font-black text-slate-900">{dashboardStats.operariosActivos}</div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Operarios activos</div>
              </div>
            </div>
          </div>
          )}

          <Suspense fallback={<ModuleLoadingFallback />}>
            <VerificationHistoryPanel
              records={records}
              getMachineChecks={getMachineChecks}
            />
          </Suspense>
        </div>
      </AppWorkspaceShell>
      )}

      {!isOperatorView && (
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        boxes={boxLabelsSummary}
        rawBoxRows={boxLabels}
        trucks={trucks}
        users={appUsers}
        productionRecords={records}
        appConfig={appConfig}
        onOpenBox={openCommandBox}
        onOpenTruck={openCommandTruck}
        onOpenDashboard={() => {
          setActiveWorkspaceModule("dashboard");
          setShowProductionModal(false);
          window.scrollTo?.({ top: 0, behavior: "smooth" });
        }}
        onOpenConfig={() => { setActiveWorkspaceModule("config"); setShowConfigModal(true); }}
        onOpenLabel={() => { setActiveWorkspaceModule("labels"); setShowLabelModal(true); }}
        onOpenProduction={() => {
          setActiveWorkspaceModule("production");
          setShowProductionModal(false);
          window.scrollTo?.({ top: 0, behavior: "smooth" });
        }}
      />
      )}

      {isOperatorView && (
      <Suspense fallback={<ModuleLoadingFallback />}>
  <ProductionModal
    open={showProductionModal}
    onClose={() => setShowProductionModal(false)}
    boxLabels={boxLabels}
    boxLabelsSummary={boxLabelsSummary}
    activeTruck={activeTruck}
    displayTruck={displayTruck}
    appConfig={appConfig}
    onOpenBox={(box) => {
      setShowProductionModal(false);
      openCommandBox(box);
    }}
  />
</Suspense>
      )}
      {showOperatorDashboard && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <OperatorDashboardModal
            users={operatorUsers}
            records={records}
            boxLabels={operatorBoxLabels}
            loading={operatorDataLoading}
            onRefresh={openOperatorDashboard}
            onManageOperators={() => {
              setShowOperatorDashboard(false);
              setShowAdminPanel(true);
            }}
            onClose={() => setShowOperatorDashboard(false)}
          />
        </Suspense>
      )}
      {showStatisticsDashboard && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <StatisticsDashboardModal
            users={operatorUsers}
            records={records}
            boxLabels={operatorBoxLabels}
            loading={statisticsDataLoading}
            onRefresh={openStatisticsDashboard}
            onClose={() => setShowStatisticsDashboard(false)}
          />
        </Suspense>
      )}
      {showAdminPanel && isAdminUser(currentUser) && (
  <AdminPanel
    currentUser={currentUser}
    onClose={() => setShowAdminPanel(false)}
    printBoxLabelsReport={printBoxLabelsReport}
    boxLabelsSummary={boxLabelsSummary}
    exportBoxLabelsExcel={exportBoxLabelsExcel}
    boxLabels={boxLabels}
    adminUserForm={adminUserForm}
    setAdminUserForm={setAdminUserForm}
    userRoles={USER_ROLES}
    saveAdminUser={saveAdminUser}
    resetAdminUserForm={resetAdminUserForm}
    adminFilteredUsers={adminFilteredUsers}
    appUsers={appUsers}
    adminSearch={adminSearch}
    setAdminSearch={setAdminSearch}
    editAdminUser={editAdminUser}
    deleteAdminUser={deleteAdminUser}
  />
)}
      {showProductionStart && isVerificationUser(currentUser) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            padding: "20px",
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div className="inline-flex rounded-full bg-[#e6f4f4] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#1f6f73] ring-1 ring-[#b8dada]">
                Inicio de producción
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-900">
                Introduce la pieza a registrar
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Estos datos se cargarán automáticamente en la verificación.
              </p>
            </div>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Referencia
              </span>
              <select
                className="input"
                value={startupReference}
                onChange={(event) => setStartupReference(event.target.value)}
                disabled={referenceSwitching}
              >
               {REFERENCES
  .filter((reference) =>
    ["F-1012", "F-1013"].includes(reference.id)
  )
  .map((reference) => (
    <option key={reference.id} value={reference.id}>
      {reference.label}
    </option>
  ))}
              </select>
            </label>

            

            <label className="mb-5 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Orden de fabricación
              </span>
              <input
                className="input"
                value={startupOF}
                onChange={(event) => setStartupOF(event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <Button
              type="button"
              onClick={confirmProductionStart}
              disabled={referenceSwitching}
              className="w-full rounded-2xl bg-[#0f5c63] py-5 text-base font-black text-white shadow-lg"
            >
              {referenceSwitching
                ? `Cargando ${referenceSwitchTarget || startupReference}…`
                : "Continuar"}
            </Button>

            {referenceSwitchError && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {referenceSwitchError}
              </div>
            )}
          </div>
        </div>
      )}
      {isOperatorView && (
        <OperatorHeader
          currentUser={currentUser}
          form={form}
          openLabelModal={openLabelModal}
          openBoxLabelsModal={openBoxLabelsModal}
          handleLogout={handleLogout}
        />
      )}

      {isOperatorView && (
      <div className={isOperatorView ? "mx-auto min-h-screen max-w-[1600px] px-3 pb-4 lg:px-4" : "mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 p-4 lg:flex-row lg:p-6"}>
        <aside className={`${isOperatorView ? "hidden" : ""} max-h-[calc(100vh-24px)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-xl lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:w-72 lg:shrink-0`}>
          <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
             style={{
  background: "linear-gradient(135deg,#BDECB6 0%,#A8E09F 100%)",
}}
            >
              <div
  style={{
    background: "#BDECB6",
    padding: "22px",
    minHeight: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  }}
>
  <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
    {form.referencia || appConfig.reference}<br />
    {getReferenceById(
      form.referencia || appConfig.reference
    ).celula || appConfig.cell}
  </h1>
</div>
            </div>

            <div className="p-4">
              <img
                src="/logo-fabrimotor.png"
                alt="FabriMotor"
                className="mb-5 h-16 w-auto object-contain"
              />

              <div className="inline-flex items-center gap-2 rounded-full bg-[#e6f4f4] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1f6f73] ring-1 ring-[#b8dada]">
                <ClipboardCheck className="h-4 w-4" />
                Control digital
              </div>

              <p className="mt-4 text-sm font-medium text-[#0F172A]">
                Control de proceso · Producción
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <SidebarButton
              active={activeView === "nueva"}
              onClick={() => setActiveView("nueva")}
              icon={<ClipboardCheck className="h-4 w-4" />}
              label="Nueva verificación"
            />
            
            <SidebarButton
              onClick={() => openLabelModal()}
              icon={<Printer className="h-4 w-4" />}
              label="Etiqueta caja"
            />

            <SidebarButton
              onClick={openBoxLabelsModal}
              icon={<Printer className="h-4 w-4" />}
              label="Listado cajas camión"
              badge={boxLabels.length}
            />
            
            {isOperatorView ? (
              <SidebarButton
                active={activeView === "historico"}
                onClick={() => setActiveView("historico")}
                icon={<FileText className="h-4 w-4" />}
                label="Mi historial"
                badge={filteredRecords.length}
              />
            ) : (
              <>
                <SidebarButton
                  active={activeView === "historico"}
                  onClick={() => setActiveView("historico")}
                  icon={<FileText className="h-4 w-4" />}
                  label="Histórico"
                  badge={filteredRecords.length}
                />
                <SidebarButton
                  onClick={() => setShowRejectsModal(true)}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Rechazos"
                  badge={rejectedRecords.length}
                  danger
                />
                <SidebarButton
                  onClick={() => setShowPdfModal(true)}
                  icon={<Printer className="h-4 w-4" />}
                  label="PDF registros"
                />
                <SidebarButton
                  onClick={() => setShowCpkModal(true)}
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Gráfico CPK 30/40"
                />
              </>
            )}

            {isAdminUser(currentUser) && (
              <SidebarButton
                onClick={() => setShowAdminPanel(true)}
                icon={<Users className="h-4 w-4" />}
                label="Panel Administrador"
              />
            )}

            {isAdminUser(currentUser) && (
              <SidebarButton
                onClick={() => setShowConfigModal(true)}
                icon={<Settings className="h-4 w-4" />}
                label="Configuración"
              />
            )}
          </nav>

          {!isOperatorView && (
            <>
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="font-bold">Estado actual</div>
            <div className="mt-2 grid gap-1 text-xs">
              <span>
                Máquina:{" "}
                <strong>
                  {getMachineDisplayName(
                    form.referencia || appConfig.reference,
                    form.maquina
                  )}
                </strong>
              </span>
              <span>Turno: <strong>{turnoLabel(form.turno)}</strong></span>
              <span>Fecha: <strong>{form.fecha}</strong></span>
              <span>Registros: <strong>{records.length}</strong></span>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
            <div className="font-bold">Base de datos</div>
            <div className="mt-2 grid gap-1 text-xs">
              <span>Registros: <strong>{databaseMode}</strong></span>
              <span>Última sinc. registros: <strong>{lastSyncAt || "-"}</strong></span>
              <span>Usuarios: <strong>{usersMode}</strong></span>
              <span>Última sinc. usuarios: <strong>{lastUsersSyncAt || "-"}</strong></span>
            </div>
            <div className="mt-3 grid gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={refreshSharedRecords}
                className="w-full rounded-2xl border-purple-300 bg-white text-purple-900 hover:bg-purple-100"
              >
                Actualizar registros
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={refreshSharedUsers}
                className="w-full rounded-2xl border-purple-300 bg-white text-purple-900 hover:bg-purple-100"
              >
                Actualizar usuarios
              </Button>
            </div>
          </div>

            </>
          )}

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Usuario conectado</div>
            <div className="mt-2 font-black text-slate-900">{currentUser.name}</div>
            <div className="text-xs text-slate-600">Rol: {roleLabel(currentUser.role)}</div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="mt-3 w-full rounded-2xl border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            >
              Cerrar sesión
            </Button>
          </div>

          {!isOperatorView && (
            <Button onClick={exportExcel} className="mt-3 w-full rounded-2xl bg-[#1f6f73] text-white shadow-sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          )}
        </aside>

        <main className={isOperatorView ? "space-y-4" : "flex-1 space-y-6"}>
          {isOperatorView && (
            <section className="rounded-3xl border border-blue-200 bg-white p-4 shadow-lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="block flex-1">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    Referencia activa para etiquetas
                  </span>
                  <select
                    className="input"
                    value={form.referencia || appConfig.reference}
                    onChange={(event) =>
                      requestOperationalReferenceChange(
                        event.target.value
                      )
                    }
                    disabled={referenceSwitching}
                  >
                    {REFERENCES
                      .filter((reference) =>
                        ["F-1012", "F-1013"].includes(
                          reference.id
                        )
                      )
                      .map((reference) => (
                        <option
                          key={reference.id}
                          value={reference.id}
                        >
                          {reference.label}
                        </option>
                      ))}
                  </select>
                </label>

                <Button
                  type="button"
                  onClick={() => openLabelModal()}
                  disabled={
                    referenceSwitching ||
                    operationalReferenceLoading
                  }
                  className="rounded-2xl bg-blue-600 px-6 py-5 font-black text-white shadow-lg hover:bg-blue-700"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {referenceSwitching
                    ? `Cambiando a ${referenceSwitchTarget}…`
                    : `Crear etiqueta ${appConfig.reference}`}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                  Referencia activa
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white">
                  {form.referencia || appConfig.reference}
                </span>
                <span className="text-sm font-black text-slate-800">
                  {appConfig.boxPrefix} · {appConfig.partCode} ·{" "}
                  {appConfig.threadText}
                </span>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-600">
                F-1012 y F-1013 tienen contadores independientes. Cada
                etiqueta se asigna únicamente a su referencia dentro del
                mismo camión conjunto.
              </p>
              <p className="mt-1 text-xs font-black text-blue-800">
                {operationalReferenceLoading
                  ? `Recuperando cajas de ${
                      referenceSwitchTarget || appConfig.reference
                    }…`
                  : `Progreso recuperado: ${truckProgress.completedBoxes}/${truckProgress.targetBoxes} cajas`}
                {" · "}
                {appConfig.boxPrefix} · {appConfig.partCode} · {appConfig.threadText}
              </p>

              {referenceSwitchError && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                  {referenceSwitchError}
                </div>
              )}
            </section>
          )}

          {!isOperatorView && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#e6f4f4] px-4 py-2 text-sm font-bold text-[#1f6f73] ring-1 ring-[#b8dada]">
                    FABRIMOTOR · {activeView === "nueva" ? "Nueva verificación" : "Histórico de registros"}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    className="rounded-2xl border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Salir
                  </Button>
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                  {form.referencia || appConfig.reference} ·{" "}
                  {activeView === "nueva"
                    ? "Control de proceso"
                    : "Histórico y calidad"}
                </h2>
                <p className="mt-1 text-slate-600">
                  {getReferenceById(
                    form.referencia || appConfig.reference
                  ).celula || appConfig.cell} ·{" "}
                  {getMachineDisplayName(
                    form.referencia || appConfig.reference,
                    form.maquina
                  )}{" "}
                  · Turno{" "}
                  {turnoLabel(form.turno)} · {form.fecha}
                </p>
              </div>

              
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatusPill label="Resultado" value={overallOk ? "OK" : "Revisar"} ok={overallOk} />
                <StatusPill label="Registros" value={String(currentDateRecords.length)} />
                <StatusPill label="Rechazos" value={String(currentDateNok)} ok={currentDateNok === 0} />
                <StatusPill label="Última verif." value={lastVerificationElapsedLabel} />
              </div>
            </div>
          </motion.div>
          )}

          

          <div className={activeView === "nueva" ? (isOperatorView ? "grid gap-4 xl:grid-cols-[minmax(560px,0.95fr)_minmax(420px,0.75fr)]" : "grid gap-6 xl:grid-cols-[460px_1fr]") : "grid gap-6"}>
          {activeView === "nueva" && (
          <>
          <Card className="rounded-3xl border-0 shadow-lg">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Control de proceso</h2>

                {overallOk ? (
                  <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> OK
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Revisar
                  </div>
                )}
              </div>

              {hyundaiWaitInfo.blocked && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  No ha transcurrido el tiempo suficiente entre registros del Torno Hyundai.
                  Deben pasar al menos 25 minutos entre verificaciones del mismo turno.
                  Tiempo restante aproximado: {hyundaiWaitInfo.remainingMinutes} minutos.
                </div>
              )}

              <div className="grid gap-4">
                <Field label="Máquina">
                  <select
                    value={form.maquina}
                    onChange={(e) => {
                      setForm({ ...form, maquina: e.target.value });
                      setValues({});
                    }}
                    className="input"
                  >
                    {getMachineOptions(
                      form.referencia || appConfig.reference
                    ).map((machine) => (
                      <option
                        key={machine.value}
                        value={machine.value}
                      >
                        {machine.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha">
                    <input
                      type="date"
                      className="input"
                      value={form.fecha}
                      onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    />
                  </Field>

                  <Field label="Turno">
                    <select
                      className="input"
                      value={form.turno}
                      onChange={(e) => setForm({ ...form, turno: e.target.value })}
                    >
                      <option>M</option>
                      <option>T</option>
                      <option>N</option>
                    </select>
                  </Field>
                </div>

                <Field label="Referencia">
                  <input
                    className="input bg-slate-100 font-semibold text-slate-700"
                    value={form.referenciaNombre || getReferenceById(form.referencia).label}
                    readOnly
                  />
                </Field>

                
                <Field label="Operario">
                  <input
                    className="input bg-slate-100 font-semibold text-slate-700"
                    value={form.operario}
                    placeholder={currentUser ? `${currentUser.username} - ${currentUser.name.trim()}` : "Operario"}
                    readOnly
                  />
                </Field>

                <Field label="Número de pieza">
                  <input
                    ref={numeroPiezaInputRef}
                    className="input text-lg font-black"
                    value={form.numeroPieza}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        numeroPieza: e.target.value,
                      })
                    }
                    placeholder="Introduce número de pieza"
                  />
                </Field>

                                
                               
                </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="font-bold">Hoja de verificación actual</div>
                <div className="mt-1">
                  {currentSheetId
                    ? currentSheetName
                    : "Selecciona fecha, turno y máquina para crear/acceder a la hoja de verificación."}
                </div>
                <div className="mt-2 text-xs">
                  Cada fecha, turno y máquina generan una hoja independiente.
                </div>
                {currentSheetId && (
                  <div
                    className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                      hasPreviousShiftRecord
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {hasPreviousShiftRecord
                      ? "Inicio de turno ya registrado: Ecoroll/Refrigerante y las cotas Nº70, Nº80 y Nº90 pueden dejarse en blanco."
                      : "Primera verificación del turno: Ecoroll/Refrigerante y las cotas Nº70, Nº80 y Nº90 son obligatorios."}
                  </div>
                )}
              </div>

              {form.maquina === "Torno Hyundai" && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 shadow-sm space-y-4">
                <div>
                  <div className="font-bold text-base mb-1">
                    Aviso importante de control
                  </div>

                  <div>
                    Control Ecoroll manómetro <strong>[300 bar]</strong> y presencia de flujo en la línea de refrigerante.
                    Se realiza una vez al turno, según especificaciones.
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-300 bg-white p-4">
                  
                  <label className="block">
                    <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-slate-700">
                      <span>Control Ecoroll / Refrigerante</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                          hasPreviousShiftRecord
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {hasPreviousShiftRecord
                          ? "Opcional en esta pieza"
                          : "Obligatorio"}
                      </span>
                    </span>

                    <select
                      className="input text-base text-slate-900 font-bold"
                            value={values.controlTurno || ""}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          controlTurno: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar lectura</option>
                      <option value="OK">OK</option>
                      <option value="NO OK">NO OK</option>
                    </select>
                    {hasPreviousShiftRecord && (
                      <p className="mt-2 text-xs font-semibold text-blue-700">
                        El control de inicio ya fue registrado por este turno y referencia.
                      </p>
                    )}
                  </label>
                </div>
              </div>
            )}

              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">Controles</h3>

                {validation.map((item) => (
                  <MeasurementCard
                    key={item.id}
                    item={item}
                    values={values}
                    setValues={setValues}
                    form={form}
                    setVisualHelpItem={setVisualHelpItem}
                    comparatorOptions={comparatorOptions}
                    rangeOptions={rangeOptions}
                    RejectionReasonSelector={RejectionReasonSelector}
                  />
                ))}
              </div>

              <ControlProcessPanel
                form={form}
                setForm={setForm}
                overallOk={overallOk}
                saveRecord={saveRecord}
                Field={Field}
              />


              
              
                            
            </CardContent>
          </Card>
         

          {isOperatorView && (
            <div className="space-y-4">
              
              <TruckDashboardCard
                activeTruck={activeTruck}
                truckProgress={truckProgress}
                currentUser={currentUser}
              />
              
              <LastLabelCard
                operatorLastBox={operatorLastBox}
                operatorShiftRecords={operatorShiftRecords}
                operatorShiftOk={operatorShiftOk}
                operatorShiftNok={operatorShiftNok}
                operatorLastRecord={operatorLastRecord}
                lastVerificationElapsedLabel={lastVerificationElapsedLabel}
              />

            <Card className="rounded-3xl border-0 shadow-lg">
              <CardContent className="space-y-4 p-6">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-red-600">Rechazos</div>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Entrada pieza de rechazo</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">Registro rápido de una pieza NO OK durante el turno.</p>
                </div>



                  <button
                    type="button"
                    onClick={() => {
                      setIncidentForm((previous) => ({
                        ...previous,
                        codigoEtiqueta:
                        previous.codigoEtiqueta || form.numeroPieza || "",
                      }));
                      setShowIncidentModal(true);
                    }}
                    className="w-full rounded-3xl bg-red-600 px-5 py-5 text-lg font-black text-white shadow-md transition hover:bg-red-700"
                  >
                    ⚠️ Registrar rechazo
                  </button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-0 shadow-lg">
                <CardContent className="p-6">
                  <ControlStatusSummary
                    validation={validation}
                    overallOk={overallOk}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-0 shadow-lg">
                <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setActiveView("historico")}
                    className="rounded-3xl border border-slate-300 bg-white px-5 py-5 text-base font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
                  >
                    📋 Mi historial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        numeroPieza: "",
                      }));
                      
                      setValues({});
                      
                      setTimeout(() => {
                        const input = numeroPiezaInputRef.current;

                        input?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });

                        setTimeout(() => {
                          input?.focus({ preventScroll: true });
                          input?.select();
                        }, 350);
                      }, 100);
                    }}
                    className="rounded-3xl border border-blue-200 bg-blue-50 px-5 py-5 text-base font-black text-blue-800 shadow-sm transition hover:bg-blue-100"
                  >
                    🔄 Nueva pieza
                  </button>
                </CardContent>
              </Card>
            </div>
          )}

          {!isOperatorView && (
          <Card className="rounded-3xl border-0 shadow-lg">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Panel de control</h2>
                  <p className="mt-1 text-sm text-slate-600">Resumen rápido de la jornada seleccionada.</p>
                </div>
                <div className="rounded-full bg-[#e6f4f4] px-3 py-1 text-xs font-bold text-[#1f6f73] ring-1 ring-[#b8dada]">
                  {form.fecha}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DashboardKpi label="Registros día" value={currentDateRecords.length} tone="blue" />
                <DashboardKpi label="OK día" value={currentDateOk} tone="green" />
                <DashboardKpi label="NOK día" value={currentDateNok} tone="red" />
                <DashboardKpi label="Total histórico" value={records.length} tone="slate" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DashboardKpi
                label="Coste calidad hoy"
                value={`${qualityCostToday.toFixed(2)} €`}
                tone="red"
              />
              <DashboardKpi
                label="Coste calidad mes"
                value={`${qualityCostMonth.toFixed(2)} €`}
                tone="red"
              />
              <DashboardKpi
                label="Chatarra mes"
                value={scrapPiecesMonth}
                tone="slate"
              />
              <DashboardKpi
                label="Incidencias pendientes"
                value={pendingIncidents}
                tone="blue"
              />
            </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Accesos rápidos</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button onClick={() => setActiveView("historico")} className="rounded-2xl bg-slate-900 text-white">
                      <FileText className="mr-2 h-4 w-4" /> Histórico
                    </Button>
                    <Button onClick={() => setShowRejectsModal(true)} className="rounded-2xl bg-red-600 text-white">
                      <AlertTriangle className="mr-2 h-4 w-4" /> Rechazos
                    </Button>
                    <Button onClick={() => setShowPdfModal(true)} className="rounded-2xl bg-blue-700 text-white">
                      <Printer className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button onClick={() => setShowCpkModal(true)} className="rounded-2xl bg-[#1f6f73] text-white">
                      <TrendingUp className="mr-2 h-4 w-4" /> CPK
                    </Button>
                    <Button
                      onClick={() => setShowIncidentsListModal(true)}
                      className="rounded-2xl bg-orange-600 text-white"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" /> 
                      Incidencias
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Últimas verificaciones</div>
                  <div className="space-y-2">
                    {recentRecords.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Aún no hay registros guardados.</div>
                    ) : (
                      recentRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                          <div>
                            <div className="font-bold text-slate-900">Pieza {record.numeroPieza}</div>
                            <div className="text-xs text-slate-500">
                              {record.maquinaNombre ||
                                getMachineDisplayName(
                                  record.referencia || "F-1012",
                                  record.maquina
                                )}{" "}
                              · {turnoLabel(record.turno)} ·{" "}
                              {record.horaGuardado}
                            </div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${record.resultado === "OK" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {record.resultado}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
          </>

          )}

          {activeView === "historico" && (
          <>
          <Card className="rounded-3xl border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveView("nueva");
                      
                      setTimeout(() => {
                        numeroPiezaInputRef.current?.focus();
                        numeroPiezaInputRef.current?.select();
                      }, 50);
                    }}
                    className="rounded-2xl"
                  >
                    
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                  
                  <h2 className="text-xl font-semibold">
                    {isOperatorView ? "Mi historial" : "Histórico"}
                  </h2>

                  <Button
                    size="sm"
                    onClick={() => setShowImportantModal(true)}
                    className="rounded-2xl border-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-5 py-5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-red-300"
                  >
                    <Info className="mr-2 h-5 w-5" />
                    ⚠ IMPORTANTE
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setShowRejectsModal(true)}
                    className="rounded-2xl border-0 bg-gradient-to-r from-red-900 via-red-700 to-rose-600 px-5 py-5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-red-300"
                  >
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Rechazos ({rejectedRecords.length})
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setShowPdfModal(true)}
                    className="rounded-2xl border-0 bg-gradient-to-r from-slate-800 via-slate-700 to-blue-700 px-5 py-5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-blue-300"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Ver PDF registros
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setShowCpkModal(true)}
                    className="rounded-2xl border-0 bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 px-5 py-5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-emerald-300"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Gráfico CPK 30/40
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setShowIncidentsListModal(true)}
                    className="rounded-2xl border-0 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 px-5 py-5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-orange-300"
                  >
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Incidencias
                  </Button>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  {filteredRecords.length} registros
                </div>
              </div>
              
              <div className="mb-4 grid gap-4 md:grid-cols-4">
                <DashboardKpi
                  label="Incidencias"
                  value={totalIncidencias}
                  tone="blue"
                />
                
                <DashboardKpi
                  label="Acciones abiertas"
                  value={accionesAbiertas}
                  tone="amber"
                />
                
                <DashboardKpi
                  label="Acciones cerradas"
                  value={accionesCerradas}
                  tone="emerald"
                />
                
                <DashboardKpi
                  label="Coste acumulado"
                  value={`${costeTotalCalidad.toFixed(2)} €`}
                  tone="red"
                />
              </div>

              <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                
                <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <DashboardKpi
                    label="Coste calidad hoy"
                    value={`${qualityCostToday.toFixed(2)} €`}
                    tone="red"
                  />
                  <DashboardKpi
                    label="Coste calidad mes"
                    value={`${qualityCostMonth.toFixed(2)} €`}
                    tone="red"
                  />
                  <DashboardKpi
                    label="Chatarra mes"
                    value={scrapPiecesMonth}
                    tone="slate"
                  />
                  <DashboardKpi
                    label="Incidencias pendientes"
                    value={pendingIncidents}
                    tone="blue"
                  />
                </div>
                
                <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">               
                                
                  <div className="font-bold">
                    {activeSheetName ? "Hoja seleccionada" : "Histórico general"}
                  </div>
                  
                  <div>
                    {activeSheetName || "Mostrando registros según filtros seleccionados."}
                  </div>
                  
                  <div className="mt-1 text-xs">
                    {filteredRecords.length} registros encontrados.
                  </div>

                </div>               
                
                <div className="grid gap-3 md:grid-cols-6">
                  <Field label="Filtrar por fecha">
                    <input
                      type="date"
                      className="input"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </Field>

                  <Field label="Filtrar por turno">
                    <select
                      className="input"
                      value={filterTurno}
                      onChange={(e) => setFilterTurno(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="M">M (Mañana)</option>
                      <option value="T">T (Tarde)</option>
                      <option value="N">N (Noche)</option>
                    </select>
                  </Field>

                  <Field label="Nº Operario">
                    <input
                      className="input"
                      placeholder="Ej. 105"
                      value={filterOperario}
                      onChange={(e) => setFilterOperario(e.target.value)}
                    />
                  </Field>

                  <Field label="Nº pieza">
                    <input
                      className="input"
                      placeholder="Ej. 64"
                      value={filterPieza}
                      onChange={(e) => setFilterPieza(e.target.value)}
                    />
                  </Field>

                  <Field label="Máquina">
                    <select
                      className="input"
                      value={filterMaquina}
                      onChange={(e) => setFilterMaquina(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {getMachineOptions(
                        form.referencia || appConfig.reference
                      ).map((machine) => (
                        <option
                          key={machine.value}
                          value={machine.value}
                        >
                          {machine.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Hoja anterior">
                    <select
                      className="input"
                      value={selectedSheetId}
                      onChange={(e) => {
                        setSelectedSheetId(e.target.value);
                        setShowOnlyCurrentSheet(false);
                      }}
                    >
                      <option value="">Todas</option>
                      {availableSheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="flex items-end">
                    <Button className="w-full rounded-2xl" onClick={() => {}}>
                      Filtrar histórico
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant={showOnlyCurrentSheet ? "default" : "outline"}
                      className="w-full rounded-2xl"
                      onClick={() => {
                        setShowOnlyCurrentSheet(!showOnlyCurrentSheet);
                        setSelectedSheetId("");
                      }}
                      disabled={!currentSheetId}
                    >
                      {showOnlyCurrentSheet ? "Viendo hoja actual" : "Ver hoja actual"}
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      onClick={() => {
                        setFilterDate("");
                        setFilterTurno("");
                        setFilterOperario("");
                        setFilterPieza("");
                        setFilterMaquina("");
                        setSelectedSheetId("");
                        setShowOnlyCurrentSheet(false);
                      }}
                    >
                      Limpiar filtro
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="max-h-[760px] overflow-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-700 text-white">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Máquina</th>
                        <th className="px-4 py-3">Hoja</th>
                        <th className="px-4 py-3">Operario</th>
                        <th className="px-4 py-3">Turno</th>
                        <th className="px-4 py-3">Número pieza</th>
                        <th className="px-4 py-3">Hora</th>
                        <th className="px-4 py-3">Resultado</th>
                        <th className="px-4 py-3">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan="9"
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            Todavía no hay registros guardados.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r) => (
                          <tr key={r.id} className="border-t border-slate-800">
                            <td className="px-4 py-3">{r.fecha}</td>
                            <td className="px-4 py-3">{r.maquina}</td>
                            <td className="px-4 py-3 text-xs">{buildSheetName(r) || r.hojaNombre}</td>
                            <td className="px-4 py-3">{r.operario}</td>
                            <td className="px-4 py-3">{turnoLabel(r.turno)}</td>
                            <td className="px-4 py-3">{r.numeroPieza}</td>
                            <td className="px-4 py-3">{r.horaGuardado}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  r.resultado === "OK"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {r.resultado}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (
                                      currentUser?.role !== "Administrador" &&
                                      currentUser?.role !== "Calidad"
                                    ) {
                                      alert(
                                        "Solo los usuarios con rol Administrador o Calidad pueden editar registros."
                                      );
                                      return;
                                    }
                                    
                                    openEditRecord(r);
                                  }}
                                  title="Editar registro"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                {isAdminUser(currentUser) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeRecord(r.id)}
                                    title="Eliminar registro"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </div>
        </main>
      </div>
      )}

      {visualHelpItem && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <VisualHelpModalComponent
            item={visualHelpItem}
            onClose={() => setVisualHelpItem(null)}
          />
        </Suspense>
      )}

      {editingRecord && editForm && (
        <EditRecordModal
          editForm={editForm}
          setEditForm={setEditForm}
          editValues={editValues}
          setEditValues={setEditValues}
          calculateResult={calculateResult}
          onSave={saveEditedRecord}
          onClose={closeEditRecord}
        />
      )}

      {showCpkModal && (
        <CpkModal
          records={cpkFilteredRecords}
          referenceId={form.referencia || appConfig.reference}
          onClose={() => setShowCpkModal(false)}
          dateFrom={cpkDateFrom}
          setDateFrom={setCpkDateFrom}
          dateTo={cpkDateTo}
          setDateTo={setCpkDateTo}
          turno={cpkTurno}
          setTurno={setCpkTurno}
          operario={cpkOperario}
          setOperario={setCpkOperario}
        />
      )}

      {showPdfModal && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <PdfReportModal
            onClose={() => setShowPdfModal(false)}
            printPdfReport={printPdfReport}
            pdfFilteredRecords={pdfFilteredRecords}
            pdfDateFrom={pdfDateFrom}
            setPdfDateFrom={setPdfDateFrom}
            pdfDateTo={pdfDateTo}
            setPdfDateTo={setPdfDateTo}
            pdfTurno={pdfTurno}
            setPdfTurno={setPdfTurno}
            pdfOperario={pdfOperario}
            setPdfOperario={setPdfOperario}
            pdfPieza={pdfPieza}
            setPdfPieza={setPdfPieza}
            pdfMaquina={pdfMaquina}
            setPdfMaquina={setPdfMaquina}
            numeroPiezaInputRef={numeroPiezaInputRef}
            form={form}
            setForm={setForm}
            pdfRecordsByMachine={pdfRecordsByMachine}
            buildReportSheetName={buildReportSheetName}
          />
        </Suspense>
      )}

     {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">
                Registrar pieza NO OK
                </h2>
                
                
                <button
                 onClick={() => setShowIncidentModal(false)}
                 className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-700"
                >
                  Cerrar
                </button>
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                    Información de la pieza
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Código etiqueta">
                      <input
                        className="input text-base font-bold text-slate-900"
                        value={incidentForm.codigoEtiqueta || ""}
                        onChange={(e) =>
                          setIncidentForm({
                            ...incidentForm,
                            codigoEtiqueta: e.target.value,
                          })
                        }
                      />
                    </Field>
                    
                    <Field label="Nº fabricación">
                      <input
                        className="input text-base font-bold text-slate-900"
                        value={incidentForm.numeroFabricacion || ""}
                        onChange={(e) =>
                          setIncidentForm({
                            ...incidentForm,
                            numeroFabricacion: e.target.value,
                          })
                        }
                      />
                    </Field>
                    
                    <Field label="Nº colada">
                      <input
                        className="input text-base font-bold text-slate-900"
                        value={incidentForm.numeroColada || ""}
                        onChange={(e) =>
                          setIncidentForm({
                            ...incidentForm,
                            numeroColada: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              
                
                  <Field label="Tipo de fallo">
                    <select
                    className="input text-base font-bold text-slate-900"
                    value={incidentForm.tipoFallo}
                    onChange={(e) =>
                      setIncidentForm({
                        ...incidentForm,
                        tipoFallo: e.target.value,
                      })
                    }
                  >
                    <option>Mecanizado</option>
                    <option>Forja</option>
                    <option>Golpe / manipulación</option>
                  </select>
                </Field>
                
                <Field label="Descripción de la incidencia">
                
                
                  <textarea
                   className="input min-h-[100px] text-base font-bold text-slate-900"
                   value={incidentForm.descripcion}
                   onChange={(e) =>
                    setIncidentForm({
                      ...incidentForm,
                      descripcion: e.target.value,
              })
            }
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nº piezas afectadas">
            <input
              className="input text-base font-bold text-slate-900"
              value={incidentForm.piezasAfectadas}
              onChange={(e) =>
                setIncidentForm({
                  ...incidentForm,
                  piezasAfectadas: e.target.value,
                })
              }
            />
          </Field>

          <Field label="Pieza anterior">
            <input
              className="input text-base font-bold text-slate-900"
              value={incidentForm.piezaAnterior}
              onChange={(e) =>
                setIncidentForm({
                  ...incidentForm,
                  piezaAnterior: e.target.value,
                })
              }
            />
          </Field>

          <Field label="Pieza posterior">
            <input
              className="input text-base font-bold text-slate-900"
              value={incidentForm.piezaPosterior}
              onChange={(e) =>
                setIncidentForm({
                  ...incidentForm,
                  piezaPosterior: e.target.value,
                })
              }
            />
          </Field>
          </div>
        
        <Button
          onClick={saveIncident}
          className="rounded-2xl bg-red-600 py-5 text-base text-white"
        >
          Guardar incidencia
        </Button> 
      </div>
      </div>
      )} 

     {showIncidentsListModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">
          Incidencias / Chatarra
        </h2>

        <button
          onClick={() => setShowIncidentsListModal(false)}
          className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-700"
        >
          Cerrar
        </button>
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          No hay incidencias registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-900">
                  Código etiqueta {incident.codigoEtiqueta || incident.numeroPieza}
                </div>

                <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                  {incident.chatarra === "SI" ? "CHATARRA" : "NO OK"}
                </div>
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <div><strong>Fecha:</strong> {incident.fecha}</div>
                <div><strong>Turno:</strong> {incident.turno}</div>
                <div><strong>Máquina:</strong> {incident.maquina}</div>
                <div><strong>Operario:</strong> {incident.operario}</div>
                <div><strong>Tipo fallo:</strong> {incident.tipoFallo}</div>
                <div><strong>Piezas afectadas:</strong> {incident.piezasAfectadas}</div>
                <div><strong>Nº fabricación:</strong> {incident.numeroFabricacion || "-"}</div>
                <div><strong>Nº colada:</strong> {incident.numeroColada || "-"}</div>           
                <div><strong>Pieza anterior:</strong> {incident.piezaAnterior || "-"}</div>
                <div><strong>Pieza posterior:</strong> {incident.piezaPosterior || "-"}</div>
                <div><strong>Recuperable:</strong> {incident.recuperable}</div>           
              </div>

              <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-800">
                <strong>Descripción:</strong> {incident.descripcion}
              </div>

              {!isOperatorView && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <div className="mb-2 text-sm font-black text-blue-900">
                    Gestión Calidad
                  </div>                  

                  <textarea
                    className="input min-h-[80px] text-sm"
                    placeholder="Comentario de Calidad..."
                    value={incident.comentarioCalidad || ""}
                    onChange={(e) => {
                      const nextIncidents = incidents.map((item) =>
                        item.id === incident.id
                          ? {
                              ...item,
                              comentarioCalidad: e.target.value,
                              revisadoPor: currentUser
                                ? `${currentUser.username} - ${currentUser.name}`
                                : "",
                              fechaRevision: new Date().toLocaleString("es-ES"),
                            }
                          : item
                      );

                      const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                    }}
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="Recuperable">
                      <select
                        className="input text-base font-bold text-slate-900"
                        value={incident.recuperable || "Pendiente Calidad"}
                        onChange={(e) => {
                          const nextIncidents = incidents.map((item) =>
                            item.id === incident.id
                              ? {
                                  ...item,
                                  recuperable: e.target.value,
                                  revisadoPor: currentUser
                                  ? `${currentUser.username} - ${currentUser.name}`
                                  : "",
                                fechaRevision: new Date().toLocaleString("es-ES"),
                              }
                              : item
                          );
                          
                          const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                        }}
                      >
                        <option>Pendiente Calidad</option>
                        <option>SI</option>
                        <option>NO</option>
                      </select>
                    </Field>
                    
                    <Field label="Chatarra">
                      <select
                        className="input text-base font-bold text-slate-900"
                        value={incident.chatarra || "Pendiente Calidad"}
                        onChange={(e) => {
                          const nextIncidents = incidents.map((item) =>
                            item.id === incident.id
                              ? {
                                  ...item,
                                  chatarra: e.target.value,
                                  revisadoPor: currentUser
                                    ? `${currentUser.username} - ${currentUser.name}`
                                    : "",
                                  fechaRevision: new Date().toLocaleString("es-ES"),
                                }
                              : item
                          );
                          
                          const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                        }}
                      >
                        <option>Pendiente Calidad</option>
                        <option>SI</option>
                        <option>NO</option>
                      </select>
                    </Field>
                  </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                
                <Field label="Coste €/unidad">
                  <input
                    className="input text-base font-bold text-slate-900"
                    type="number"
                    step="0.01"
                    value={incident.costeUnidad || ""}
                    onChange={(e) => {
                      const nextIncidents = incidents.map((item) =>
                        item.id === incident.id
                          ? {
                              ...item,
                              costeUnidad: e.target.value,
                              costeTotal:
                                Number(item.piezasAfectadas || 0) *
                                Number(e.target.value || 0),
                            }
                          : item
                      );
                      
                      const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                    }}
                  />
                </Field>  

                <Field label="Coste total">
                  <input
                    className="input bg-slate-100 text-lg font-black text-slate-900"
                    value={`${Number(incident.costeTotal || 0).toFixed(2)} €`}
                    readOnly
                  />
                </Field>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-3 font-black text-amber-900">
                    Acción Correctiva
                  </div>
                  
                  <Field label="Nº Acción Correctiva">
                    <input
                      className="input"
                      value={incident.accionCorrectiva || ""}
                      onChange={(e) => {
                        const nextIncidents = incidents.map((item) =>
                          item.id === incident.id
                            ? { ...item, accionCorrectiva: e.target.value }
                            : item
                        );
                        
                        const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                      }}
                    />
                  </Field>
                  
                  <Field label="Responsable">
                    <input
                      className="input"
                      value={incident.responsableAccion || ""}
                      onChange={(e) => {
                        const nextIncidents = incidents.map((item) =>
                          item.id === incident.id
                            ? { ...item, responsableAccion: e.target.value }
                            : item
                        );
                        
                        const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                      }}
                    />
                  </Field>
                  
                  <Field label="Fecha compromiso">
                    <input
                      type="date"
                      className="input"
                      value={incident.fechaCompromiso || ""}
                      onChange={(e) => {
                        const nextIncidents = incidents.map((item) =>
                          item.id === incident.id
                            ? { ...item, fechaCompromiso: e.target.value }
                            : item
                        );
                        
                        const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                      }}
                    />
                  </Field>
                  
                  <Field label="Estado">
                    <select
                      className="input"
                      value={incident.estadoAccion || "Abierta"}
                      onChange={(e) => {
                        const nextIncidents = incidents.map((item) =>
                          item.id === incident.id
                            ? { ...item, estadoAccion: e.target.value }
                            : item
                          );
                          
                          const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                        }}
                      >
                        <option>Abierta</option>
                        <option>En curso</option>
                        <option>Cerrada</option>
                      </select>
                    </Field>
                    
                    <Field label="Descripción acción correctiva">                
                      <textarea
                        className="input min-h-[80px]"
                        value={incident.accionDescripcion || ""}
                        onChange={(e) => {
                          const nextIncidents = incidents.map((item) =>
                            item.id === incident.id
                              ? { ...item, accionDescripcion: e.target.value }
                              : item
                          );
                          
                          const updatedIncident = nextIncidents.find(
  (item) => item.id === incident.id
);

saveIncidentsUpdate(
  nextIncidents,
  updatedIncident
);
                        }}
                      />
                    </Field>
                    
                  </div>


                
              </div>
              
              </div>
              )}
              
              {!isOperatorView && (
                <Button
                  size="sm"
                  className="mt-3 rounded-2xl bg-indigo-600 text-white"
                  onClick={() => {
                    setSelected8D(incident);
                    setShow8DModal(true);
                  }}
                >
                  Informe 8D
                </Button>
              )}

              {incident.revisadoPor && (
                <div className="mt-2 text-xs text-slate-500">
                  Revisado por: {incident.revisadoPor} · {incident.fechaRevision}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

      {show8DModal && selected8D && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Informe 8D simplificado
                </h2>
                <p className="text-sm text-slate-500">
                  Código etiqueta: {selected8D.codigoEtiqueta || selected8D.numeroPieza || "-"}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Informe 8D</title>
                          <style>
                            body {
                              font-family: Arial, sans-serif;
                              padding: 24px;
                              color: #111827;
                            }
                              
                            h1 {
                              margin: 0 0 6px 0;
                              font-size: 26px;
                              color: #0f172a;
                            }
                              
                            h2 {
                              margin: 0 0 8px 0;
                              font-size: 18px;
                              color: #1f2937;
                            }
                              
                            .header {
                              border-bottom: 3px solid #1f6f73;
                              padding-bottom: 12px;
                              margin-bottom: 18px;
                            }
                              
                            .subtitle {
                              font-size: 13px;
                              color: #475569;
                            }
                              
                            .section {
                              border: 1px solid #cbd5e1;
                              border-radius: 10px;
                              padding: 12px;
                              margin-bottom: 12px;
                            }
                              
                            .grid {
                              display: grid;
                              grid-template-columns: 1fr 1fr;
                              gap: 8px 18px;
                              font-size: 13px;
                            }
                              
                            .text {
                              font-size: 13px;
                              background: #f8fafc;
                              padding: 10px;
                              border-radius: 8px;
                              margin-top: 8px;
                              white-space: pre-wrap;
                            }
                              
                            .footer {
                              margin-top: 24px;
                              font-size: 11px;
                              color: #64748b;
                              border-top: 1px solid #cbd5e1;
                              padding-top: 8px;
                            }
                              
                            @media print {
                              button {
                                display: none;
                              }
                            }
                          </style>
                        </head>
                        
                        <body>
                          <div class="header">
                          <h1>Informe 8D simplificado</h1>
                          <div class="subtitle">
                            Código etiqueta: ${selected8D.codigoEtiqueta || selected8D.numeroPieza || "-"}
                          </div>
                        </div>
                        
                        <div class="section">
                          <h2>D1 · Equipo</h2>
                          <div class="grid">
                            <div><strong>Responsable:</strong> ${selected8D.responsableAccion || "-"}</div>
                            <div><strong>Fecha:</strong> ${selected8D.fecha || "-"}</div>
                            <div><strong>Revisado por:</strong> ${selected8D.revisadoPor || "-"}</div>
                            <div><strong>Fecha revisión:</strong> ${selected8D.fechaRevision || "-"}</div>
                          </div>
                        </div>
                        
                        <div class="section">
                          <h2>D2 · Descripción del problema</h2>
                          <div class="grid">
                            <div><strong>Código etiqueta:</strong> ${selected8D.codigoEtiqueta || selected8D.numeroPieza || "-"}</div>
                            <div><strong>Nº fabricación:</strong> ${selected8D.numeroFabricacion || "-"}</div>
                            <div><strong>Nº colada:</strong> ${selected8D.numeroColada || "-"}</div>
                            <div><strong>Tipo fallo:</strong> ${selected8D.tipoFallo || "-"}</div>
                            <div><strong>Máquina:</strong> ${selected8D.maquina || "-"}</div>
                            <div><strong>Operario:</strong> ${selected8D.operario || "-"}</div>
                          </div>
                          <div class="text"><strong>Descripción:</strong><br>${selected8D.descripcion || "-"}</div>
                        </div>
                        
                        <div class="section">
                          <h2>D3 · Acción inmediata</h2>
                          <div class="grid">
                            <div><strong>Recuperable:</strong> ${selected8D.recuperable || "-"}</div>
                            <div><strong>Chatarra:</strong> ${selected8D.chatarra || "-"}</div>
                            <div><strong>Piezas afectadas:</strong> ${selected8D.piezasAfectadas || "-"}</div>
                            <div><strong>Coste total:</strong> ${Number(selected8D.costeTotal || 0).toFixed(2)} €</div>
                          </div>
                        </div>
                        
                        <div class="section">
                          <h2>D4 · Análisis causa raíz</h2>
                          <div class="text">${selected8D.causaRaiz || "-"}</div>
                        </div>
                        
                        <div class="section">
                          <h2>D5 · Acción correctiva</h2>
                           <div class="grid">
                            <div><strong>Nº Acción:</strong> ${selected8D.accionCorrectiva || "-"}</div>
                            <div><strong>Responsable:</strong> ${selected8D.responsableAccion || "-"}</div>
                            <div><strong>Fecha compromiso:</strong> ${selected8D.fechaCompromiso || "-"}</div>
                            <div><strong>Estado:</strong> ${selected8D.estadoAccion || "-"}</div>
                          </div>
                          <div class="text"><strong>Descripción acción:</strong><br>${selected8D.accionDescripcion || "-"}</div>
                        </div>
                        
                        <div class="section">
                          <h2>D6 · Verificación eficacia</h2>
                          <div class="text">${selected8D.verificacionEficacia || "-"}</div>
                        </div>
                        
                        <div class="section">
                          <h2>D7 · Estandarización</h2>
                          <div class="text">${selected8D.estandarizacion || "-"}</div>
                        </div>
                        
                        <div class="section">
                          <h2>D8 · Cierre</h2>
                          <div class="text">${selected8D.cierre8D || "-"}</div>
                        </div>
                        
                        <div class="footer">
                          FABRIMOTOR · Informe generado desde control digital ${selected8D.referencia || form.referencia || appConfig.reference} · ${new Date().toLocaleString("es-ES")}
                        </div>
                        
                        <script>
                          window.onload = function() {
                            window.print();
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  
                  printWindow.document.close();
                }}
                className="rounded-xl bg-green-600 px-3 py-2 font-bold text-white"
              >
                Exportar PDF
              </button>

              <button
                onClick={() => {
                  setShow8DModal(false);
                  setSelected8D(null);
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-700"
              >
                Cerrar
              </button>
             </div>
             
             
            </div>
            
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 font-black text-slate-900">D1 · Equipo</h3>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div><strong>Responsable:</strong> {selected8D.responsableAccion || "-"}</div>
                  <div><strong>Fecha:</strong> {selected8D.fecha || "-"}</div>
                  <div><strong>Revisado por:</strong> {selected8D.revisadoPor || "-"}</div>
                  <div><strong>Fecha revisión:</strong> {selected8D.fechaRevision || "-"}</div>
                </div>
              </div>
              
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 font-black text-slate-900">D2 · Descripción del problema</h3>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div><strong>Código etiqueta:</strong> {selected8D.codigoEtiqueta || selected8D.numeroPieza || "-"}</div>
                  <div><strong>Nº fabricación:</strong> {selected8D.numeroFabricacion || "-"}</div>
                  <div><strong>Nº colada:</strong> {selected8D.numeroColada || "-"}</div>
                  <div><strong>Tipo fallo:</strong> {selected8D.tipoFallo || "-"}</div>
                  <div><strong>Máquina:</strong> {selected8D.maquina || "-"}</div>
                  <div><strong>Operario:</strong> {selected8D.operario || "-"}</div>
                </div>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <strong>Descripción:</strong> {selected8D.descripcion || "-"}
                </div>
              </div>
              
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 font-black text-slate-900">D3 · Acción inmediata</h3>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div><strong>Recuperable:</strong> {selected8D.recuperable || "-"}</div>
                  <div><strong>Chatarra:</strong> {selected8D.chatarra || "-"}</div>
                  <div><strong>Piezas afectadas:</strong> {selected8D.piezasAfectadas || "-"}</div>
                  <div><strong>Coste total:</strong> {Number(selected8D.costeTotal || 0).toFixed(2)} €</div>
                </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
  <h3 className="mb-2 font-black text-amber-900">D4 · Análisis causa raíz</h3>
  <textarea
    className="input min-h-[90px]"
    value={selected8D.causaRaiz || ""}
    onChange={(e) => {
      const nextIncidents = incidents.map((item) =>
        item.id === selected8D.id
          ? { ...item, causaRaiz: e.target.value }
          : item
      );

      const updatedIncident = nextIncidents.find(
        (item) => item.id === selected8D.id
      );

      saveIncidentsUpdate(nextIncidents, updatedIncident);

      setSelected8D({
        ...selected8D,
        causaRaiz: e.target.value,
      });
    }}
    placeholder="Describe la causa raíz..."
  />
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-4">
  <h3 className="mb-2 font-black text-slate-900">D5 · Acción correctiva</h3>
  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
    <div><strong>Nº Acción:</strong> {selected8D.accionCorrectiva || "-"}</div>
    <div><strong>Responsable:</strong> {selected8D.responsableAccion || "-"}</div>
    <div><strong>Fecha compromiso:</strong> {selected8D.fechaCompromiso || "-"}</div>
    <div><strong>Estado:</strong> {selected8D.estadoAccion || "-"}</div>
  </div>
  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
    <strong>Descripción acción:</strong> {selected8D.accionDescripcion || "-"}
  </div>
</div>

<div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
  <h3 className="mb-2 font-black text-blue-900">D6 · Verificación eficacia</h3>
  <textarea
    className="input min-h-[90px]"
    value={selected8D.verificacionEficacia || ""}
    onChange={(e) => {
      const nextIncidents = incidents.map((item) =>
        item.id === selected8D.id
          ? { ...item, verificacionEficacia: e.target.value }
          : item
      );

      const updatedIncident = nextIncidents.find(
        (item) => item.id === selected8D.id
      );

      saveIncidentsUpdate(nextIncidents, updatedIncident);

      setSelected8D({
        ...selected8D,
        verificacionEficacia: e.target.value,
      });
    }}
    placeholder="Describe cómo se verifica la eficacia..."
  />
</div>

<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
  <h3 className="mb-2 font-black text-emerald-900">D7 · Estandarización</h3>
  <textarea
    className="input min-h-[90px]"
    value={selected8D.estandarizacion || ""}
    onChange={(e) => {
      const nextIncidents = incidents.map((item) =>
        item.id === selected8D.id
          ? { ...item, estandarizacion: e.target.value }
          : item
      );

      const updatedIncident = nextIncidents.find(
        (item) => item.id === selected8D.id
      );

      saveIncidentsUpdate(nextIncidents, updatedIncident);

      setSelected8D({
        ...selected8D,
        estandarizacion: e.target.value,
      });
    }}
    placeholder="Describe cambios en instrucciones, formación, controles..."
  />
</div>

<div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
  <h3 className="mb-2 font-black text-slate-900">D8 · Cierre</h3>
  <textarea
    className="input min-h-[90px]"
    value={selected8D.cierre8D || ""}
    onChange={(e) => {
      const nextIncidents = incidents.map((item) =>
        item.id === selected8D.id
          ? { ...item, cierre8D: e.target.value }
          : item
      );

      const updatedIncident = nextIncidents.find(
        (item) => item.id === selected8D.id
      );

      saveIncidentsUpdate(nextIncidents, updatedIncident);

      setSelected8D({
        ...selected8D,
        cierre8D: e.target.value,
      });
    }}
    placeholder="Observaciones de cierre..."
  />

</div>

</div>
</div>
</div>
)}


{showConfigModal && (
  <div style={WORKSPACE_SYSTEM_MODAL_LAYER_STYLE}>
    <Suspense fallback={<ModuleLoadingFallback />}>
      <ConfigModal
        appConfig={appConfig}
        configForm={configForm}
        setConfigForm={setConfigForm}
        updateAppSetting={updateAppSetting}
        supabase={supabase}
        currentUser={currentUser}
        setAppConfig={setAppConfig}
        referenceOptions={CONFIGURABLE_REFERENCE_IDS.map(
          (referenceId) => ({
            value: referenceId,
            label: getReferenceById(referenceId).label,
          })
        )}
        onReferenceChange={handleConfigReferenceChange}
        onSaveReferenceConfig={handleSaveReferenceConfig}
        referenceCounter={configReferenceCounter}
        setReferenceCounter={setConfigReferenceCounter}
        referenceCounterLoading={configReferenceCounterLoading}
        referenceCounterError={configReferenceCounterError}
        onClose={() => setShowConfigModal(false)}
      />
    </Suspense>
  </div>
)}



{showLabelModal && ( 
  <div style={WORKSPACE_SYSTEM_MODAL_LAYER_STYLE}>
    <LabelModal
      labelForm={labelForm}
      setLabelForm={setLabelForm}
      totalCaja={totalCaja}
      numeroSemana={numeroSemana}
      numeroDia={numeroDia}
      printBoxLabel={printBoxLabel}
      appConfig={appConfig}
      operatorUsers={operatorUsers}
      currentUser={currentUser}
      onClose={closeLabelModal}
    />
  </div>
)}

{showBoxLabelsModal && (
  <Suspense fallback={<ModuleLoadingFallback />}>
    <SmartTruckDashboardModal
      boxLabels={boxLabels}
      boxLabelsSummary={boxLabelsSummary}
      exportBoxLabelsExcel={exportBoxLabelsExcel}
      printBoxLabelsReport={printBoxLabelsReport}
      activeTruck={activeTruck}
      displayTruck={displayTruck}
      selectedTruckId={displayTruck?.id || activeTruck?.id}
      trucks={trucks}
      appConfig={appConfig}
      truckProgress={truckProgress}
      updateTruckExpeditionDate={updateTruckExpeditionDate}
      onUpdateActiveTruck={handleUpdateActiveTruck}
      onMarkTruckShipped={handleMarkTruckShipped}
      closeActiveTruck={closeActiveTruck}
      onSelectTruck={handleSelectTruck}
      onSearchBox={handleSearchBox}
      onLoadBoxReprints={loadBoxReprints}
      onReprintBoxLabel={reprintBoxLabel}
      highlightBoxNumber={highlightBoxNumber}
      highlightBoxReference={highlightBoxReference}
      truckSchedule={truckSchedule}
      onCreatePlannedTruck={handleCreatePlannedTruck}
      onUpdatePlannedTruck={handleUpdatePlannedTruck}
      onDeletePlannedTruck={handleDeletePlannedTruck}
      currentUser={currentUser}
      isAdminUser={isAdminUser}
      onClose={() => {
        setShowBoxLabelsModal(false);
        setDisplayTruck(null);
        setHighlightBoxNumber("");
        setHighlightBoxReference("");
      }}
    />
  </Suspense>
)}
      {showRejectsModal && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <RejectsModalComponent
            records={records}
            getRejectedChecks={getRejectedChecks}
            buildSheetName={buildReportSheetName}
            onClose={() => setShowRejectsModal(false)}
          />
        </Suspense>
      )}
      
      {showImportantModal && (
        <div style={MODAL_OVERLAY_STYLE}>
          <div style={MODAL_PANEL_LG_STYLE}>
            <div className="flex items-center justify-between border-b border-black px-5 py-3">
              <h2 className="flex-1 text-center text-4xl font-black tracking-wide text-red-600">
                IMPORTANTE
              </h2>

              <button
                onClick={() => setShowImportantModal(false)}
                className="rounded-full p-2 hover:bg-slate-100"
                aria-label="Cerrar aviso importante"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="divide-y divide-black text-xl leading-relaxed text-black">
              <div className="px-5 py-2">
                - Comprobar que las herramientas y los útiles de control se encuentran limpios y en condiciones.
              </div>

              <div className="px-5 py-2 font-bold">
                - En caso de pieza <span className="text-red-600 underline">NOK</span> pintarla de color rojo con spray y ubicar en contenedor de chatarra.
              </div>

              <div className="px-5 py-2 font-bold">
                - En caso de pieza <span className="text-red-600">recuperable</span> identificarla y colocarla en contenedor de recuperables.
              </div>

              <div className="px-5 py-2">
                - En caso de detectar cualquier anomalía con la pieza/máquina, avisar al encargado.
              </div>

              <div className="px-5 py-2">
                - En caso de <strong>cambio de herramienta</strong> hay que registrarlo en Doc.074_001.
              </div>

              <div className="px-5 py-2 font-bold text-red-600">
                - Apuntar piezas NOK y recuperables (con su identificación) en registro de incidencias Doc.053_001.
              </div>
            </div>

            <div className="flex justify-end border-t border-black p-4">
              <Button onClick={() => setShowImportantModal(false)} className="rounded-xl">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Notification notification={notification} />

      <style>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #cbd5e1;
          background: white;
          padding: 0.75rem 1rem;
          outline: none;
          transition: all 0.2s;
        }

        .input:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }

        .input:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }


        body {
          background: #eef3f8;
          color: #0f172a;
        }

        .input {
          color: #0f172a;
          background: #ffffff;
          border-color: #cbd5e1;
        }

        .input::placeholder {
          color: #64748b;
        }

        select.input option {
          background: #ffffff;
          color: #0f172a;
        }

        table {
          color: #0f172a;
        }

        button[class*="bg-blue"],
        button[class*="from-slate"],
        button[class*="from-emerald"],
        button[class*="from-red"],
        button[class*="bg-[#1f6f73]"] {
          color: #ffffff !important;
        }

        button[class*="bg-blue"] *,
        button[class*="from-slate"] *,
        button[class*="from-emerald"] *,
        button[class*="from-red"] *,
        button[class*="bg-[#1f6f73]"] * {
          color: #ffffff !important;
        }

        tbody tr {
          background: #ffffff;
        }

        tbody td {
          color: #0f172a;
        }

        aside {
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          #pdf-report,
          #pdf-report * {
            visibility: visible;
          }

          #pdf-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
function SidebarButton({ active, onClick, icon, label, badge, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
        active
          ? "bg-blue-700 text-white shadow-lg shadow-blue-200"
          : danger
          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          : "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {badge !== undefined && (
        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-white text-slate-700"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatusPill({ label, value, ok }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 max-w-[240px] truncate text-sm font-black ${ok === true ? "text-emerald-700" : ok === false ? "text-red-700" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}

function DashboardKpi({ label, value, tone = "slate" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
    </div>
  );
}

function VisualHelpModal({ item, onClose }) {
  const toleranceText =
    item.type === "number"
      ? item.id === "c30" || item.id === "c40"
        ? `+${item.min} → +${item.max}`
        : item.displayMin && item.displayMax
        ? `${item.displayMin} → ${item.displayMax}`
        : `${item.min} → ${item.max}`
      : "Verificación OK / NO OK";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ayuda visual de la cota"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "24px",
          backgroundColor: "#ffffff",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            borderBottom: "1px solid #bfdbfe",
            backgroundColor: "#eff6ff",
            padding: "18px 22px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 900,
                color: "#1e3a8a",
              }}
            >
              Ayuda visual de la cota
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "14px",
                color: "#1d4ed8",
              }}
            >
              {item.maquina} · {item.control}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar ayuda visual"
            style={{
              border: 0,
              borderRadius: "999px",
              backgroundColor: "transparent",
              cursor: "pointer",
              padding: "8px",
              color: "#0f172a",
            }}
          >
            <X style={{ width: "26px", height: "26px" }} />
          </button>
        </div>

        <div
          style={{
            overflow: "auto",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 340px)",
              gap: "20px",
            }}
          >
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                backgroundColor: "#f8fafc",
                padding: "20px",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {item.control}
              </div>

              <div style={{ display: "grid", gap: "12px", fontSize: "14px", color: "#334155" }}>
                <div style={{ borderRadius: "12px", backgroundColor: "white", padding: "12px" }}>
                  <strong>Tipo de registro: </strong>
                  {item.type === "number" ? "Valor numérico" : "OK / NO OK"}
                </div>

                <div style={{ borderRadius: "12px", backgroundColor: "white", padding: "12px" }}>
                  <strong>Tolerancia / criterio: </strong>
                  {toleranceText}
                </div>

                {item.comentario && (
                  <div style={{ borderRadius: "12px", backgroundColor: "white", padding: "12px" }}>
                    <strong>Útil / comentario: </strong>
                    {item.comentario}
                  </div>
                )}

                {item.frecuencia && (
                  <div style={{ borderRadius: "12px", backgroundColor: "#dbeafe", padding: "12px", color: "#1e3a8a" }}>
                    <strong>Frecuencia: </strong>
                    {item.frecuencia}
                  </div>
                )}

                <div
                  style={{
                    border: "1px solid #fcd34d",
                    borderRadius: "12px",
                    backgroundColor: "#fffbeb",
                    padding: "12px",
                    color: "#92400e",
                  }}
                >
                  Verifica que la pieza corresponde a esta cota antes de introducir el dato.
                  En caso de duda, avisar al encargado.
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "18px",
                backgroundColor: "white",
                padding: "16px",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                Esquema orientativo
              </div>

              <div
                style={{
                  height: "290px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "18px",
                  backgroundColor: "#f1f5f9",
                  padding: "12px",
                }}
              >
                {VISUAL_HELP_IMAGES[item.id] ? (
                  <img
                    src={VISUAL_HELP_IMAGES[item.id]}
                    alt={`Ayuda visual ${item.control}`}
                    style={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                      borderRadius: "12px",
                    }}
                  />
                ) : (
                  <svg viewBox="0 0 320 260" style={{ height: "100%", width: "100%" }}>
                    <rect x="45" y="75" width="230" height="110" rx="20" fill="#e2e8f0" stroke="#334155" strokeWidth="3" />
                    <circle cx="110" cy="130" r="36" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
                    <circle cx="210" cy="130" r="36" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
                    <line x1="110" y1="48" x2="110" y2="90" stroke="#dc2626" strokeWidth="4" markerEnd="url(#arrow)" />
                    <line x1="210" y1="48" x2="210" y2="90" stroke="#dc2626" strokeWidth="4" markerEnd="url(#arrow)" />
                    <line x1="70" y1="210" x2="250" y2="210" stroke="#2563eb" strokeWidth="4" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
                    <text x="160" y="35" textAnchor="middle" fontSize="18" fontWeight="700" fill="#dc2626">
                      Punto de control
                    </text>
                    <text x="160" y="238" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2563eb">
                      Localizar zona indicada en plano
                    </text>
                    <defs>
                      <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 Z" fill="#dc2626" />
                      </marker>
                      <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 Z" fill="#2563eb" />
                      </marker>
                    </defs>
                  </svg>
                )}
              </div>

              <div
                style={{
                  marginTop: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  padding: "12px",
                  fontSize: "12px",
                  color: "#475569",
                }}
              >
                Este esquema es orientativo. Puede sustituirse por una imagen real del plano o fotografía de la zona de medición.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid #e2e8f0",
            padding: "16px",
          }}
        >
          <Button onClick={onClose} className="rounded-xl text-white font-bold">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function RejectionReasonSelector({ check, value, onChange }) {
  return (
    <div className="mt-3 rounded-2xl border border-red-300 bg-red-50 p-3">
      <div className="mb-2 text-sm font-bold text-red-800">
        Motivo del rechazo para esta cota *
      </div>

      <select
        className="input border-red-300 bg-red-50"
        value={value.tipo || ""}
        onChange={(e) =>
          onChange({
            ...value,
            control: check.control,
            tipo: e.target.value,
            detalle: e.target.value === "Otro" ? value.detalle || "" : "",
          })
        }
      >
        <option value="">Seleccionar motivo</option>
        {REJECTION_REASONS.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </select>

      {value.tipo === "Otro" && (
        <textarea
          className="input mt-2 min-h-[70px] border-red-300 bg-red-50"
          placeholder="Describe el motivo del rechazo..."
          value={value.detalle || ""}
          onChange={(e) =>
            onChange({
              ...value,
              control: check.control,
              detalle: e.target.value,
            })
          }
        />
      )}
    </div>
  );
}

function RejectsModal({ records, getRejectedChecks, buildSheetName, onClose }) {
  const [rejectDateFrom, setRejectDateFrom] = useState("");
  const [rejectDateTo, setRejectDateTo] = useState("");
  const [rejectTurno, setRejectTurno] = useState("");
  const [rejectOperario, setRejectOperario] = useState("");
  const [rejectPieza, setRejectPieza] = useState("");
  const [rejectMaquina, setRejectMaquina] = useState("");
  const [showIncidentsListModal, setShowIncidentsListModal] = useState(false);
  const [show8DModal, setShow8DModal] = useState(false);
  const [selected8D, setSelected8D] = useState(null);

  
  const filteredRejects = records.filter((record) => {
    const matchFrom = !rejectDateFrom || record.fecha >= rejectDateFrom;
    const matchTo = !rejectDateTo || record.fecha <= rejectDateTo;
    const matchTurno = !rejectTurno || record.turno === rejectTurno;
    const matchOperario =
      !rejectOperario ||
      String(record.operario || "")
        .toLowerCase()
        .includes(rejectOperario.toLowerCase());
    const matchPieza =
      !rejectPieza ||
      String(record.numeroPieza || "")
        .toLowerCase()
        .includes(rejectPieza.toLowerCase());
    const matchMaquina = !rejectMaquina || record.maquina === rejectMaquina;

    const operatorUsers = users
      .filter((user) => user.role === "Operario")
      .sort((a, b) => String(a.username).localeCompare(String(b.username)));

    return (
      matchFrom &&
      matchTo &&
      matchTurno &&
      matchOperario &&
      matchPieza &&
      matchMaquina
    );
  });
  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_XL_STYLE}>
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-red-700">
              Listado de piezas de rechazo
            </h2>
            <p className="text-sm text-red-600">
              Registros enviados automáticamente cuando alguna verificación es NO OK.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-red-900/60"
            aria-label="Cerrar listado de rechazo"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-red-800">
                  Filtro de rechazos
                </div>
                <div className="text-xs text-red-700">
                  {filteredRejects.length} piezas encontradas.
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setRejectDateFrom("");
                  setRejectDateTo("");
                  setRejectTurno("");
                  setRejectOperario("");
                  setRejectPieza("");
                  setRejectMaquina("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-6">
              <Field label="Desde fecha">
                <input
                  type="date"
                  className="input"
                  value={rejectDateFrom}
                  onChange={(e) => setRejectDateFrom(e.target.value)}
                />
              </Field>

              <Field label="Hasta fecha">
                <input
                  type="date"
                  className="input"
                  value={rejectDateTo}
                  onChange={(e) => setRejectDateTo(e.target.value)}
                />
              </Field>

              <Field label="Turno">
                <select
                  className="input"
                  value={rejectTurno}
                  onChange={(e) => setRejectTurno(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="M">M (Mañana)</option>
                  <option value="T">T (Tarde)</option>
                  <option value="N">N (Noche)</option>
                </select>
              </Field>

              <Field label="Nº Operario">
                <input
                  className="input"
                  placeholder="Ej. 105"
                  value={rejectOperario}
                  onChange={(e) => setRejectOperario(e.target.value)}
                />
              </Field>

              <Field label="Nº Pieza">
                <input
                  className="input"
                  placeholder="Ej. 64"
                  value={rejectPieza}
                  onChange={(e) => setRejectPieza(e.target.value)}
                />
              </Field>

              <Field label="Máquina">
                <select
                  className="input"
                  value={rejectMaquina}
                  onChange={(e) => setRejectMaquina(e.target.value)}
                >
                  <option value="">Todas</option>
                  {Object.keys(MACHINES).map((machine) => (
                    <option key={machine} value={machine}>
                      {machine}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {filteredRejects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 p-10 text-center text-slate-500">
              No hay piezas en rechazo para el filtro seleccionado.
            </div>
          ) : (
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="bg-red-900/60 text-red-900">
                  <th className="border border-red-200 px-3 py-2 text-left">Fecha</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Hora</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Máquina</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Hoja</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Turno</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Operario</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Nº pieza</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Cotas NO OK</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Tipo de error</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredRejects.map((record) => {
                  const rejectedChecks = getRejectedChecks(record);

                  return (
                    <tr key={record.id} className="border-t border-red-100">
                      <td className="border border-red-100 px-3 py-2">{record.fecha}</td>
                      <td className="border border-red-100 px-3 py-2">{record.horaGuardado}</td>
                      <td className="border border-red-100 px-3 py-2">
                        {record.maquinaNombre ||
                          getMachineDisplayName(
                            record.referencia || "F-1012",
                            record.maquina
                          )}
                      </td>
                      <td className="border border-red-100 px-3 py-2 text-xs">
                        {buildReportSheetName(record)}
                      </td>
                      <td className="border border-red-100 px-3 py-2">{turnoLabel(record.turno)}</td>
                      <td className="border border-red-100 px-3 py-2">{record.operario}</td>
                      <td className="border border-red-100 px-3 py-2 font-bold">
                        {record.numeroPieza}
                      </td>
                      <td className="border border-red-100 px-3 py-2">
                        {rejectedChecks.length === 0 ? (
                          <span className="font-semibold text-red-700">Resultado NO OK</span>
                        ) : (
                          <div className="space-y-1">
                            {rejectedChecks.map((item, index) => (
                              <div
                                key={`${record.id}-${index}`}
                                className="rounded-lg bg-red-50 px-2 py-1 text-red-800"
                              >
                                <strong>{item.control}</strong>: {item.value}
                                {item.reason && (
                                  <span className="ml-2 font-semibold">
                                    · Motivo: {item.reason}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border border-red-100 px-3 py-2 font-semibold text-red-800">
                        {record.rechazoTipo || "Sin describir"}
                      </td>
                      <td className="border border-red-100 px-3 py-2">{record.observaciones}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-700 p-4">
          <Button onClick={onClose} className="rounded-xl">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function calculateCpk(values, lsl, usl) {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  if (numericValues.length < 2) {
    return null;
  }

  const mean =
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;

  const variance =
    numericValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    (numericValues.length - 1);

  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return null;
  }

  const cpu = (usl - mean) / (3 * stdDev);
  const cpl = (mean - lsl) / (3 * stdDev);

  return {
    cpk: Math.min(cpu, cpl),
    cpu,
    cpl,
    mean,
    stdDev,
    count: numericValues.length,
  };
}

function CpkModal({
  records,
  referenceId,
  onClose,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  turno,
  setTurno,
  operario,
  setOperario,
}) {
  const referenceMachineChecks = getMachineChecks(
    referenceId || "F-1012",
    "Torno Hyundai"
  );
  const c30 = referenceMachineChecks.find(
    (item) => item.id === "c30"
  );
  const c40 = referenceMachineChecks.find(
    (item) => item.id === "c40"
  );
  const yMin = Math.min(c30.min, c40.min) - 10;
  const yMax = Math.max(c30.max, c40.max) + 10;
  const machineName = getMachineDisplayName(
    referenceId || "F-1012",
    "Torno Hyundai"
  );

  const orderedRecords = [...records]
    .filter((record) => record.mediciones?.c30 || record.mediciones?.c40)
    .reverse();

  const chartData = orderedRecords.map((record, index) => ({
    registro: index + 1,
    fecha: record.fecha,
    hora: record.horaGuardado,
    pieza: record.numeroPieza,
    c30: record.mediciones?.c30 === undefined || record.mediciones?.c30 === "" ? null : Number(record.mediciones.c30),
    c40: record.mediciones?.c40 === undefined || record.mediciones?.c40 === "" ? null : Number(record.mediciones.c40),
  }));

  const c30Stats = calculateCpk(
    orderedRecords.map((record) => record.mediciones?.c30),
    c30.min,
    c30.max
  );

  const c40Stats = calculateCpk(
    orderedRecords.map((record) => record.mediciones?.c40),
    c40.min,
    c40.max
  );

  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_XL_STYLE}>
        <div className="flex items-center justify-between border-b border-slate-600 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Evolución y CPK · Cotas Nº30 y Nº40
            </h2>
            <p className="text-sm text-slate-500">
              {referenceId || "F-1012"} · {machineName} · Lecturas de
              comparador entre +{c30.min} y +{c30.max}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Cerrar gráfico CPK"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto p-6">
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 text-sm font-bold text-emerald-800">
              Filtros CPK · {records.length} registros encontrados
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <Field label="Desde fecha">
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Field>

              <Field label="Hasta fecha">
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Field>

              <Field label="Turno">
                <select
                  className="input"
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="M">M (Mañana)</option>
                  <option value="T">T (Tarde)</option>
                  <option value="N">N (Noche)</option>
                </select>
              </Field>

              <Field label="Nº Operario">
                <input
                  className="input"
                  placeholder="Ej. 105"
                  value={operario}
                  onChange={(e) => setOperario(e.target.value)}
                />
              </Field>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setTurno("");
                    setOperario("");
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CpkCard title="Cota Nº30" stats={c30Stats} lsl={c30.min} usl={c30.max} />
            <CpkCard title="Cota Nº40" stats={c40Stats} lsl={c40.min} usl={c40.max} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Gráfico de evolución
                </h3>
                <p className="text-sm text-slate-500">
                  Líneas rojas: límites +{c30.min} y +{c30.max}.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {chartData.length} registros
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center text-slate-500">
                No hay registros de las cotas Nº30 y Nº40 para calcular el CPK.
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="registro" label={{ value: "Registro", position: "insideBottom", offset: -10 }} />
                    <YAxis domain={[yMin, yMax]} label={{ value: "Valor comparador", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      formatter={(value, name) => [value, name === "c30" ? "Cota Nº30" : "Cota Nº40"]}
                      labelFormatter={(label) => {
                        const row = chartData[label - 1];
                        return row ? `Registro ${label} · Pieza ${row.pieza || ""} · ${row.fecha || ""} ${row.hora || ""}` : `Registro ${label}`;
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={c30.min} stroke="red" strokeDasharray="5 5" label={`LSL +${c30.min}`} />
                    <ReferenceLine y={c30.max} stroke="red" strokeDasharray="5 5" label={`USL +${c30.max}`} />
                    <Line type="monotone" dataKey="c30" name="Cota Nº30" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="c40" name="Cota Nº40" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CpkCard({ title, stats, lsl, usl }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-50 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          Límites: +{lsl} / +{usl}
        </span>
      </div>

      {!stats ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          No hay datos suficientes para calcular CPK. Se necesitan al menos 2 registros con variación.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="CPK" value={stats.cpk.toFixed(3)} highlight />
          <Metric label="Registros" value={stats.count} />
          <Metric label="Media" value={stats.mean.toFixed(3)} />
          <Metric label="Desv. típica" value={stats.stdDev.toFixed(3)} />
          <Metric label="CPU" value={stats.cpu.toFixed(3)} />
          <Metric label="CPL" value={stats.cpl.toFixed(3)} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-emerald-100" : "bg-white"}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function SafetyBadge() {
  return (
    <div className="fixed right-6 top-6 z-[70] hidden h-16 w-16 items-center justify-center rounded-full border-4 border-yellow-700 bg-yellow-300 text-4xl font-black text-black shadow-xl ring-4 ring-white lg:flex">
      S
    </div>
  );
}

function EditRecordModal({
  editForm,
  setEditForm,
  editValues,
  setEditValues,
  calculateResult,
  onSave,
  onClose,
}) {
  const referenceId = editForm.referencia || "F-1012";
  const checks = getMachineChecks(referenceId, editForm.maquina);

  const isCheckOk = (check) => {
    const value = editValues[check.id];

    if (value === undefined || value === "") return false;

    if (check.type === "number") {
      const numeric = Number(value);
      return !Number.isNaN(numeric) && numeric >= check.min && numeric <= check.max;
    }

    if (check.type === "oknok") {
      return value === "OK";
    }

    return false;
  };

  return (
    <div style={MODAL_OVERLAY_STYLE}>
      <div style={MODAL_PANEL_LG_STYLE}>
        <div className="flex items-center justify-between border-b border-slate-600 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Editar verificación
            </h2>
            <p className="text-sm text-slate-500">
              Modifica los datos guardados y pulsa Guardar cambios.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Cerrar edición"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Máquina">
              <select
                className="input"
                value={editForm.maquina}
                onChange={(e) => {
                  setEditForm({ ...editForm, maquina: e.target.value });
                  setEditValues({});
                }}
              >
                {getMachineOptions(referenceId).map((machine) => (
                  <option
                    key={machine.value}
                    value={machine.value}
                  >
                    {machine.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha">
              <input
                type="date"
                className="input"
                value={editForm.fecha}
                onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
              />
            </Field>

            <Field label="Turno">
              <select
                className="input"
                value={editForm.turno}
                onChange={(e) => setEditForm({ ...editForm, turno: e.target.value })}
              >
                <option value="M">M (Mañana)</option>
                <option value="T">T (Tarde)</option>
                <option value="N">N (Noche)</option>
              </select>
            </Field>

            <Field label="Operario">
              <input
                className="input"
                value={editForm.operario}
                onChange={(e) => setEditForm({ ...editForm, operario: e.target.value })}
              />
            </Field>

            

            

            {editForm.maquina === "Torno Hyundai" && (
              <Field label="Control Ecoroll / Refrigerante">
                <select
                  className="input text-slate-900 font-bold"
                  value={editValues.controlTurno || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, controlTurno: e.target.value })
                  }
                >
                  <option value="">Seleccionar lectura</option>
                  <option value="OK">OK</option>
                  <option value="NO OK">NO OK</option>
                </select>
              </Field>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((check) => {
              const ok = isCheckOk(check);
              const value = editValues[check.id] || "";

              return (
                <div
                  key={check.id}
                  className={`rounded-2xl border p-3 ${
                    value === ""
                      ? "border-slate-200 bg-white"
                      : ok
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="mb-2 font-semibold text-slate-900">
                    {check.control}
                  </div>

                  {check.type === "number" ? (
                    <input
                      type="number"
                      step="0.001"
                      className="input"
                      value={value}
                      onChange={(e) =>
                        setEditValues({ ...editValues, [check.id]: e.target.value })
                      }
                    />
                  ) : (
                    <select
                      className="input text-slate-900 font-bold"
                      value={value}
                      onChange={(e) =>
                        setEditValues({ ...editValues, [check.id]: e.target.value })
                      }
                    >
                      <option value="">Seleccionar lectura</option>
                      <option value="OK">OK</option>
                      <option value="NO OK">NO OK</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {calculateResult(
            editForm.maquina,
            editValues,
            referenceId
          ) === "NO OK" && (
            <div className="mt-5">
              <Field label="Resumen general del rechazo (opcional)">
                <textarea
                  className="input min-h-[80px] border-red-300 bg-red-50"
                  placeholder="Describe el defecto que ha generado el rechazo..."
                  value={editForm.rechazoTipo || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rechazoTipo: e.target.value })
                  }
                />
              </Field>
            </div>
          )}

          <div className="mt-5">
            <Field label="Observaciones">
              <textarea
                className="input min-h-[100px]"
                value={editForm.observaciones}
                onChange={(e) =>
                  setEditForm({ ...editForm, observaciones: e.target.value })
                }
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-600 p-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={onSave} className="rounded-xl">
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserSessionBadge({ user, onLogout }) {
  if (!user) return null;

  const number = user.username || user.numero || user.id || "-";
  const name = user.name || user.nombre || "Usuario conectado";
  const role = user.role || user.rol || "-";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f4f4] text-xs font-black text-[#1f6f73] ring-1 ring-[#b8dada]">
        {number}
      </div>

      <div className="min-w-0">
        <div className="font-black text-slate-900">
          {name}
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Nº {number} · {role}
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="ml-2 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100"
        title="Cerrar sesión"
      >
        <LogOut className="h-4 w-4" />
        Salir
      </button>
    </div>
  );
}


function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
