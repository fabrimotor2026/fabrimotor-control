import { createAndPrintBoxLabel } from "./modules/labels/services/labelService";
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
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { printLabelDocument } from "./modules/labels/utils/labelPrinter";
import useLabels from "./modules/labels/hooks/useLabels";
import {
  createPlannedTruck,
  deletePlannedTruck,
  fetchNextPlannedTruck,
  fetchTruckSchedule,
  openPlannedTruck,
  updatePlannedTruck,
} from "./services/truckScheduleService";
import {
  closeTruck as closeTruckFromService,
  fetchTrucks as fetchTrucksFromService,
  getActiveTruck as getActiveTruckFromService,
  updateTruckExpeditionDate as updateTruckExpeditionDateFromService,
} from "./services/truckService";


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

const ConfigModal = lazy(() =>
  import("./components/ConfigModal")
);

const VisualHelpModalComponent = lazy(() =>
  import("./components/modals/VisualHelpModal")
);

const EditRecordModalComponent = lazy(() =>
  import("./components/modals/EditRecordModal")
);

const CpkModalComponent = lazy(() =>
  import("./components/modals/CpkModal")
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
  "Responsable",
  "Calidad",
  "Mantenimiento",
  "Operario",
];

const REFERENCES = [
  { id: "F-1012", label: "F-1012 · Célula B", celula: "Célula B" },
  { id: "F-1013", label: "F-1013 · Célula A", celula: "Célula A" },
  { id: "F-1025", label: "F-1025"},
  { id: "F-1026", label: "F-1026"},
  { id: "F-1029", label: "F-1029"},
];


function getReferenceById(referenceId) {
  return REFERENCES.find((item) => item.id === referenceId) || REFERENCES[0];
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

  return `${data.referenciaNombre || data.referencia || "F-1012"} · ${data.fecha} · ${turnoLabel(data.turno)} · ${data.maquina}`;
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


async function fetchSharedRecords() {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("fabrimotor_records")
    .select("data")
    .order("saved_at_ms", { ascending: false });

  if (error) throw error;
  
  return (data || []).map((row) => row.data).filter(Boolean);
}

async function upsertSharedRecord(record) {
  if (!isSupabaseConfigured || !supabase || !record?.id) return;
  
  const { error } = await supabase.from("fabrimotor_records").upsert({
    id: record.id,
    reference: record.referencia || "F-1012",
    machine: record.maquina || "",
    operator_user: record.usuarioSistema || "",
    operator_name: record.operario || "",
    piece_number: String(record.numeroPieza || ""),
    work_order: record.ordenFabricacion || "",
    lot: record.lote || "",
    result: record.resultado || "",
    saved_at_ms: record.savedAtMs || Date.now(),
    data: record,
  });

  if (error) throw error;
}

async function deleteSharedRecord(recordId) {
  if (!isSupabaseConfigured || !supabase || !recordId) return;

  const { error } = await supabase
    .from("fabrimotor_records")
    .delete()
    .eq("id", recordId);

  if (error) throw error;
}

async function fetchSharedIncidents() {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("fabr_motor_incidents")
    .select("data")
    .order("saved_at_ms", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => row.data).filter(Boolean);
}

async function upsertSharedIncident(incident) {
  if (!isSupabaseConfigured || !supabase || !incident?.id) return;

  const { error } = await supabase.from("fabr_motor_incidents").upsert({
    id: incident.id,
    reference: incident.referencia || "F-1012",
    machine: incident.maquina || "",
    operator_name: incident.operario || "",
    label_code: incident.codigoEtiqueta || incident.numeroPieza || "",
    result: incident.chatarra || "",
    saved_at_ms: Date.parse(incident.createdAt) || Date.now(),
    data: incident,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function fetchAppSetting(key) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("fabrimotor_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error) throw error;

  return data?.value || null;
}

async function updateAppSetting(key, value, updatedBy = "") {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from("fabrimotor_settings")
    .upsert({
      key,
      value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}







function normalizeSharedRole(role) {
  const value = String(role || "").trim();

  if (value === "Encargado") return "Responsable";
  if (value === "Administracion") return "Administrativo";

  return value || "Operario";
}

function normalizeUserForStorage(user) {
  const password = user?.password || user?.pin || "";

  return {
    username: String(user?.username || "").trim(),
    name: String(user?.name || "").trim(),
    password,
    role: normalizeSharedRole(user?.role),
    pin: user?.pin || password,
    active: user?.active !== false,
  };
}

async function fetchSharedUsers() {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("fabrimotor_users")
    .select("*")
    .order("username", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) =>
    normalizeUserForStorage({
      username: row.username,
      name: row.name,
      password: row.password || row.pin || "",
      role: row.role,
      pin: row.pin || row.password || "",
      active: row.active !== false,
    })
  );
}

async function upsertSharedUser(user) {
  if (!isSupabaseConfigured || !supabase || !user?.username) return;

  const normalizedUser = normalizeUserForStorage(user);

  const { error } = await supabase.from("fabrimotor_users").upsert({
    username: normalizedUser.username,
    name: normalizedUser.name,
    role: normalizedUser.role,
    password: normalizedUser.password,
    pin: normalizedUser.pin || normalizedUser.password,
    active: normalizedUser.active,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function deleteSharedUser(username) {
  if (!isSupabaseConfigured || !supabase || !username) return;

  const { error } = await supabase
    .from("fabrimotor_users")
    .delete()
    .eq("username", username);

  if (error) throw error;
}

async function replaceSharedUsers(users = []) {
  if (!isSupabaseConfigured || !supabase) return;

  const { error: deleteError } = await supabase
    .from("fabrimotor_users")
    .delete()
    .neq("username", "__never__");

  if (deleteError) throw deleteError;

  if (!users.length) return;

  const rows = users
    .map((user) => normalizeUserForStorage(user))
    .filter((user) => user.username)
    .map((user) => ({
      username: user.username,
      name: user.name,
      role: user.role,
      password: user.password,
      pin: user.pin || user.password,
      active: user.active,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await supabase.from("fabrimotor_users").upsert(rows);

  if (error) throw error;
}

function isAdminUser(user) {
  return user?.role === "Administrador";
}


function isVerificationUser(user) {
  return user?.role === "Operario";
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

function isQualityDailyCheckEmptyById(id, value) {
  return QUALITY_DAILY_CHECK_IDS.includes(id) && isEmptyValue(value);
}

function isQualityDailyValidationEmpty(check) {
  return isQualityDailyCheckEmptyById(check.id, check.value);
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
export default function App() {
  const [notification, setNotification] = useState(null);

  const numeroPiezaInputRef = useRef(null);

  const [activeTruck, setActiveTruck] = useState(null);

  const [trucks, setTrucks] = useState([]);
  const [truckSchedule, setTruckSchedule] = useState([]);
  const [displayTruck, setDisplayTruck] = useState(null);

  const [highlightBoxNumber, setHighlightBoxNumber] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [activeWorkspaceModule, setActiveWorkspaceModule] = useState("dashboard");

  const [appUsers, setAppUsers] = useState(() => getStoredUsers());

  const [adminSearch, setAdminSearch] = useState("");
  
  const [adminUserForm, setAdminUserForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "Operario",
  });
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [form, setForm] = useState(initialForm());
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
  const [records, setRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("f1012-zona-b") || "[]");
    } catch {
      return [];
    }
  });

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showIncidentsListModal, setShowIncidentsListModal] = useState(false);
  const [show8DModal, setShow8DModal] = useState(false);
  const [selected8D, setSelected8D] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const [configForm, setConfigForm] = useState({
  reference: "F-1012",
  cell: "Célula B",
  boxPrefix: "FB-26",
  partCode: "1025980",
  piecesPerBox: 16,
  boxesPerTruck: 49,
  threadText: "ROSCA DERECHA",
}); 

  const [appConfig, setAppConfig] = useState({
    reference: "F-1012",
    cell: "Célula B",
    boxPrefix: "FB-26",
    partCode: "1025980",
    piecesPerBox: 16,
    boxesPerTruck: 49,
    threadText: "ROSCA DERECHA",
  });

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

const operatorUsers = appUsers
  .filter((user) => user.role === "Operario")
  .sort((a, b) =>
    String(a.username).localeCompare(String(b.username))
  );

  async function getActiveTruck(reference, createdBy = "") {
  if (!isSupabaseConfigured || !supabase) return null;

  return await getActiveTruckFromService(supabase, reference, createdBy);
}

async function updateTruckExpeditionDate(truckId, newDate) {
  if (!isSupabaseConfigured || !supabase) return;

  const updatedTruck = await updateTruckExpeditionDateFromService(
    supabase,
    truckId,
    newDate
  );

  setActiveTruck(updatedTruck);

  return updatedTruck;
}

  async function closeActiveTruck() {
  if (!activeTruck) return;

  const confirmar = window.confirm(
    `¿Desea cerrar el camión ${activeTruck.truck_number}?\n\nNo podrán añadirse más cajas a este camión.`
  );

  if (!confirmar) return;

  await closeTruckFromService(supabase, activeTruck.id);

  const nextPlannedTruck = await fetchNextPlannedTruck(
    supabase,
    appConfig.reference
  );

  if (nextPlannedTruck) {
    await openPlannedTruck(supabase, nextPlannedTruck.id);

    const newTruck = await getActiveTruck(
      appConfig.reference,
      currentUser ? `${currentUser.username} - ${currentUser.name}` : ""
    );

    if (newTruck?.id) {
      await updateTruckExpeditionDate(
        newTruck.id,
        nextPlannedTruck.planned_expedition_date
      );
    }

    setActiveTruck(newTruck);
    setBoxLabels([]);
    await loadTrucksHistory();
    await loadTruckSchedule();
    setShowBoxLabelsModal(false);

    alert(
      `Camión ${activeTruck.truck_number} cerrado correctamente.\n\nNuevo camión activo: ${newTruck.truck_number}\nFecha prevista: ${
        nextPlannedTruck.planned_expedition_date
          ? nextPlannedTruck.planned_expedition_date.split("-").reverse().join("/")
          : "Sin fecha prevista"
      }`
    );

    return;
  }

  const newTruck = await getActiveTruck(
    appConfig.reference,
    currentUser ? `${currentUser.username} - ${currentUser.name}` : ""
  );

  setActiveTruck(newTruck);
  setBoxLabels([]);
  await loadTrucksHistory();
  await loadTruckSchedule();
  setShowBoxLabelsModal(false);

  alert(
    `Camión ${activeTruck.truck_number} cerrado correctamente.\n\nNuevo camión activo: ${newTruck.truck_number}`
  );
}
 
  const [incidents, setIncidents] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("f1012-incidents") || "[]");
  } catch {
    return [];
  }
});

useEffect(() => {
  let cancelled = false;

  const loadAppConfig = async () => {
    try {
      const config = await fetchAppSetting("f1012_config");

      if (cancelled || !config) return;

      setAppConfig((previous) => ({
        ...previous,
        ...config,
      }));
    } catch (error) {
      console.error("No se ha podido cargar configuración F-1012:", error);
    }
  };

  loadAppConfig();

  return () => {
    cancelled = true;
  };
}, []);

  useEffect(() => {
    setConfigForm(appConfig);
  }, [appConfig]);

useEffect(() => {
  let cancelled = false;

  const loadSharedIncidents = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const sharedIncidents = await fetchSharedIncidents();

      if (cancelled || !Array.isArray(sharedIncidents)) return;

      setIncidents(sharedIncidents);
      localStorage.setItem(
        "f1012-incidents",
        JSON.stringify(sharedIncidents)
      );
    } catch (error) {
      console.error("No se han podido cargar incidencias de Supabase:", error);
    }
  };

  loadSharedIncidents();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  if (!isSupabaseConfigured || !supabase) return;

  const channel = supabase
    .channel("fabr_motor_incidents_realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "fabr_motor_incidents",
      },
      async () => {
        console.log("CAMBIO DETECTADO EN INCIDENTES");

        try {
          const sharedIncidents = await fetchSharedIncidents();

          if (Array.isArray(sharedIncidents)) {
            setIncidents(sharedIncidents);
            localStorage.setItem(
              "f1012-incidents",
              JSON.stringify(sharedIncidents)
            );
          }
        } catch (error) {
          console.error("Error actualizando incidencias en tiempo real:", error);
        }
      }
    )
    .subscribe((status, error) => {
      console.log("Realtime incidents status:", status);

      if (error) {
        console.error("Realtime incidents error:", error);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

useEffect(() => {
  if (!isSupabaseConfigured || !supabase) return;

  const channel = supabase
    .channel("fabrimotor_records_realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "fabrimotor_records",
      },
      async () => {
        console.log("CAMBIO DETECTADO EN REGISTROS");

        try {
          const sharedRecords = await fetchSharedRecords();

          if (Array.isArray(sharedRecords)) {
            setRecords(sharedRecords);
            localStorage.setItem(
              "f1012-zona-b",
              JSON.stringify(sharedRecords)
            );
          }
        } catch (error) {
          console.error("Error actualizando registros en tiempo real:", error);
        }
      }
    )
    .subscribe((status, error) => {
      console.log("Realtime records status:", status);

      if (error) {
        console.error("Realtime records error:", error);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, []);



  const [incidentForm, setIncidentForm] = useState({
    codigoEtiqueta: "",
    numeroFabricacion: "",
    numeroColada: "",
    tipoFallo: "Mecanizado",
    descripcion: "",
    piezasAfectadas: "1",
    piezaAnterior: "",
    piezaPosterior: "",
    recuperable: "NO",
    chatarra: "SI",
    pesoKg: "",
    costeKg: "",
  });
  

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fabrimotor-current-user") || "null");
    } catch {
      return null;
    }
  });

  
  const [databaseMode, setDatabaseMode] = useState(isSupabaseConfigured ? "Conectando..." : "Local");
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [usersMode, setUsersMode] = useState(isSupabaseConfigured ? "Conectando..." : "Local");
  const [lastUsersSyncAt, setLastUsersSyncAt] = useState("");

  

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

      if (isVerificationUser(currentUser) && !savedStartupPiece) {
        setShowProductionStart(true);
      }

      if (!isVerificationUser(currentUser)) {
        setShowProductionStart(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    const loadSharedRecords = async () => {
      if (!isSupabaseConfigured) {
        setDatabaseMode("Local");
        return;
      }

      try {
        setDatabaseMode("Conectando...");
        const sharedRecords = await fetchSharedRecords();

        if (cancelled || !Array.isArray(sharedRecords)) return;

        setRecords(sharedRecords);
        localStorage.setItem("f1012-zona-b", JSON.stringify(sharedRecords));
        setDatabaseMode("Compartida");
        setLastSyncAt(new Date().toLocaleString("es-ES"));
      } catch (error) {
        console.error("No se ha podido cargar Supabase:", error);
        setDatabaseMode("Local sin conexión");
      }
    };

  
    loadSharedRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSharedRecords = async () => {
    if (!isSupabaseConfigured) {
      alert("La base de datos compartida no está configurada. La aplicación está trabajando en modo local.");
      return;
    }

    try {
      setDatabaseMode("Conectando...");
      const sharedRecords = await fetchSharedRecords();
      setRecords(sharedRecords || []);
      localStorage.setItem("f1012-zona-b", JSON.stringify(sharedRecords || []));
      setDatabaseMode("Compartida");
      setLastSyncAt(new Date().toLocaleString("es-ES"));
      alert("Datos actualizados desde la base compartida.");
    } catch (error) {
      console.error("Error actualizando base compartida:", error);
      setDatabaseMode("Local sin conexión");
      alert(`No se ha podido actualizar desde la base compartida:\n\n${error?.message || String(error)}`);
    }
  };



  useEffect(() => {
    let cancelled = false;

    const loadSharedUsers = async () => {
      if (!isSupabaseConfigured) {
        setUsersMode("Local");
        return;
      }

      try {
        setUsersMode("Conectando...");
        const sharedUsers = await fetchSharedUsers();

        if (cancelled || !Array.isArray(sharedUsers) || sharedUsers.length === 0) return;

        setAppUsers(sharedUsers);
        saveStoredUsers(sharedUsers);
        setUsersMode("Compartidos");
        setLastUsersSyncAt(new Date().toLocaleString("es-ES"));
      } catch (error) {
        console.error("No se han podido cargar usuarios de Supabase:", error);
        setUsersMode("Local sin conexión");
      }
    };

    loadSharedUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSharedUsers = async () => {
    if (!isSupabaseConfigured) {
      alert("Los usuarios compartidos no están configurados. La aplicación está trabajando con usuarios locales.");
      return;
    }

    try {
      setUsersMode("Conectando...");
      const sharedUsers = await fetchSharedUsers();
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
  }, [records, form.maquina, form.fecha, form.turno, nowMs]);

  const hyundaiWaitInfo = {
  blocked: false,
  remainingMinutes: 0,
};

  const checks = MACHINES[form.maquina];

  const hasPreviousShiftRecord = records.some(
  (record) =>
    record.maquina === form.maquina &&
    (record.referencia || "F-1012") === (form.referencia || "F-1012") &&
    record.fecha === form.fecha &&
    record.turno === form.turno &&
    record.operario === form.operario
);

const isShiftStartCheckOptionalNow = (id, value) =>
  hasPreviousShiftRecord &&
  ["controlTurno", "c70", "c80", "c90", "c340", "c370"].includes(id) &&
  isEmptyValue(value);

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

    return `${data.fecha} · ${turnoLabel(data.turno)} · ${data.maquina}`;
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

  const rejectedRecords = records.filter((record) => record.resultado === "NO OK");


  const getRejectedChecks = (record) => {
    const machineChecks = MACHINES[record.maquina] || [];

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

  const hasRequiredRejectReasons = (measurementValues, machineName) => {
    const machineChecks = MACHINES[machineName] || [];
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
    const code = window.prompt("Introduce el código de acceso:");

    if (code !== ACCESS_CODE) {
      alert("Código incorrecto. No tienes permiso para realizar esta acción.");
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
      await upsertSharedRecord(record);
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
      await upsertSharedUser(user);
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
      await deleteSharedUser(username);
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

    if (result.warnings?.length > 0) {
      alert(result.warnings.join("\n\n----------------\n\n"));
    }
  } catch (error) {
    console.error("Error generando etiqueta:", error);

    alert(
      error?.message ||
        "No se ha podido generar la etiqueta."
    );
  }
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
    
    const nextIncidents = [newIncident, ...incidents];
    setIncidents(nextIncidents);
      localStorage.setItem("f1012-incidents", 
      JSON.stringify(nextIncidents)
    );
    
    upsertSharedIncident(newIncident).catch((error) => {
      console.error("Error guardando incidencia en Supabase:", error);
      alert(
        `La incidencia se ha guardado en este dispositivo, pero NO se ha podido sincronizar con la base compartida.\n\n${error?.message || String(error)}`
      );
    });
    
    setIncidentForm({
      numeroPieza: "",
      tipoFallo: "Mecanizado",
      descripcion: "",
      piezasAfectadas: "1",
      piezaAnterior: "",
      piezaPosterior: "",
      recuperable: "NO",
      chatarra: "SI",
      pesoKg: "",
      costeKg: "",
    });
    
    setShowIncidentModal(false);
  };
  
      const saveIncidentsUpdate = (
        nextIncidents,
        updatedIncident
      ) => {
        setIncidents(nextIncidents);
        
        localStorage.setItem(
          "f1012-incidents",
          JSON.stringify(nextIncidents)
        );
        
        if (updatedIncident) {
          upsertSharedIncident(updatedIncident).catch((error) => {
            console.error(error);
            
            alert(
              `Error sincronizando incidencia:\n\n${
                error?.message || String(error)
              }`
            );
          }
        );
      }
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

    if (!overallOk && !hasRequiredRejectReasons(values, form.maquina)) {
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
    
    setTimeout(() => {
      numeroPiezaInputRef.current?.focus();
      
      setTimeout(() => {
        numeroPiezaInputRef.current?.focus({ preventScroll: true });
      }, 150);
    }, 150);
    
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

    deleteSharedRecord(id).catch((error) => {
      console.error("Error eliminando en base compartida:", error);
      alert(`Registro eliminado en este dispositivo, pero no se ha podido eliminar en la base compartida:\n\n${error?.message || String(error)}`);
    });
  };

  const getBoxLabelsSummary = () => {
  const grouped = {};

  boxLabels.forEach((row) => {
    const boxNumber = row.numero_caja || "SIN CAJA";

    if (!grouped[boxNumber]) {
      grouped[boxNumber] = {
        numeroCaja: boxNumber,
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

    grouped[boxNumber].totalPiezas += Number(row.cantidad || 0);

    grouped[boxNumber].combinaciones.push(
      `FAB ${row.fabricacion} · COL ${row.colada} · ${row.cantidad} uds`
    );
  });

  return Object.values(grouped).sort((a, b) =>
    String(a.numeroCaja).localeCompare(String(b.numeroCaja))
  );
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

  if (!summary.length) {
    alert("No hay cajas para generar el PDF.");
    return;
  }

  

  printWindow.document.write(`
    <html>
      <head>
        <title>Control cajas F-1012</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0; font-size: 26px; }
          .subtitle { margin-top: 6px; color: #475569; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th { background: #1f2937; color: white; text-align: left; padding: 8px; border: 1px solid #111827; }
          td { padding: 7px; border: 1px solid #cbd5e1; vertical-align: top; }
          .right { text-align: right; }
          .ok { color: #047857; font-weight: 900; }
          .nok { color: #dc2626; font-weight: 900; }
          .footer { margin-top: 18px; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>Control cajas expedición · F-1012</h1>
        <div class="subtitle">
          Cajas completadas: ${summary.length} / 49 · Generado: ${new Date().toLocaleString("es-ES")}
        </div>

        <table>
          <thead>
            <tr>
              <th>Nº Caja</th>
              <th>Fecha</th>
              <th>Operario</th>
              <th class="right">Piezas</th>
              <th>Combinaciones FAB/COL</th>
              <th class="right">Semana</th>
              <th class="right">Día</th>
            </tr>
          </thead>
          <tbody>
            ${summary
              .map(
                (box) => `
                  <tr>
                    <td><strong>${box.numeroCaja}</strong></td>
                    <td>${box.fecha || ""}</td>
                    <td>${box.operario || ""}</td>
                    <td class="right ${box.totalPiezas === 16 ? "ok" : "nok"}">${box.totalPiezas}</td>
                    <td>${box.combinaciones.join("<br>")}</td>
                    <td class="right">${box.semana || ""}</td>
                    <td class="right">${box.dia || ""}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          FABRIMOTOR · Control digital F-1012 · Documento generado automáticamente.
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
};

  const exportBoxLabelsExcel = async () => {
  const XLSX = await import("xlsx");

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
    "Control cajas F-1012"
  );

  XLSX.writeFile(
    workbook,
    "control_cajas_f1012.xlsx"
  );
};

  const exportExcel = () => {
    const rows = [];

    records.forEach((r) => {
      const row = {
        Referencia: r.referenciaNombre || r.referencia || "F-1012 · Célula B",
        Fecha: r.fecha,
        Máquina: r.maquina,
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

      const machineChecks = MACHINES[r.maquina] || [];

      machineChecks.forEach((check) => {
        row[check.control] = r.mediciones?.[check.id] ?? "";
      });

      rows.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Control F-1012");
    XLSX.writeFile(workbook, "control_proceso_f1012_zona_b.xlsx");
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

      return (
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
    records.filter((record) => record.maquina === machineName);

  const pdfRecordsByMachine = (machineName) =>
    pdfFilteredRecords.filter((record) => record.maquina === machineName);

  const cpkFilteredRecords = records
    .filter((record) => record.maquina === "Torno Hyundai")
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

  const calculateResult = (machineName, measurementValues) => {
    const machineChecks = MACHINES[machineName] || [];

    const checksOk = machineChecks.every((check) => {
      const value = measurementValues?.[check.id];

      if (check.type === "number") {
        const numeric = Number(value);
        return !Number.isNaN(numeric) && numeric >= check.min && numeric <= check.max;
      }

      if (check.type === "oknok") {
        return value === "OK";
      }

      return false;
    });

    const controlTurnoOk = machineName !== "Torno Hyundai" || measurementValues?.controlTurno === "OK";

    return checksOk && controlTurnoOk ? "OK" : "NO OK";
  };

  const openEditRecord = (record) => {
    setEditingRecord(record);
    setEditForm({
      maquina: record.maquina,
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
    const resultado = calculateResult(editForm.maquina, editValues);

    if (resultado === "NO OK" && !hasRequiredRejectReasons(editValues, editForm.maquina)) {
      alert("Debe indicar el motivo del rechazo en cada cota NOK antes de guardar.");
      return;
    }

    const updatedRecord = {
      ...editingRecord,
      ...editForm,
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
      record.id === editingRecord.id ? updatedRecord : record
    );

    saveLocal(next);
    closeEditRecord();
  };

  const currentDateRecords = records.filter((record) => record.fecha === form.fecha);
  const currentDateOk = currentDateRecords.filter((record) => record.resultado === "OK").length;
  const currentDateNok = currentDateRecords.filter((record) => record.resultado === "NO OK").length;
  const recentRecords = records.slice(0, 6);
  const currentMonthKey = form.fecha.slice(0, 7);

  const currentDateIncidents = incidents.filter(
    (incident) => incident.fecha === form.fecha
  );

  const currentMonthIncidents = incidents.filter((incident) =>
    String(incident.fecha || "").startsWith(currentMonthKey)
);

  const qualityCostToday = currentDateIncidents.reduce(
    (sum, incident) => sum + Number(incident.costeTotal || 0),
    0
  );

  const qualityCostMonth = currentMonthIncidents.reduce(
    (sum, incident) => sum + Number(incident.costeTotal || 0),
    0
  );

  const scrapPiecesMonth = currentMonthIncidents
    .filter((incident) => incident.chatarra === "SI")
    .reduce(
      (sum, incident) => sum + Number(incident.piezasAfectadas || 0),
      0
    );

  const totalIncidencias = incidents.length;
  
  const accionesAbiertas = incidents.filter(
    (i) => i.estadoAccion === "Abierta"
  ).length;
  
  const accionesCerradas = incidents.filter(
    (i) => i.estadoAccion === "Cerrada"
  ).length;
  
  const costeTotalCalidad = incidents.reduce(
    (sum, item) => sum + Number(item.costeTotal || 0),
    0
  );

  const pendingIncidents = incidents.filter(
    (incident) =>
      (incident.estadoCalidad || "Pendiente") === "Pendiente"
  ).length;

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

    const labels = await fetchBoxLabels(supabase, truck?.id);
    setBoxLabels(labels);

    await loadTrucksHistory();
    await loadTruckSchedule();

    setShowBoxLabelsModal(true);
  } catch (error) {
    console.error("Error cargando listado de cajas:", error);
    alert("No se ha podido cargar el listado de cajas.");
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

async function handleCreatePlannedTruck() {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const reference = appConfig.reference || "F-1012";

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from("f1012_truck_schedule")
      .select("truck_number")
      .eq("reference", reference);

    if (scheduleError) throw scheduleError;

    const { data: truckRows, error: trucksError } = await supabase
      .from("f1012_trucks")
      .select("truck_number")
      .eq("reference", reference);

    if (trucksError) throw trucksError;

    const allTruckNumbers = [
      ...(scheduleRows || []).map((truck) => Number(truck.truck_number || 0)),
      ...(truckRows || []).map((truck) => Number(truck.truck_number || 0)),
      Number(activeTruck?.truck_number || 0),
    ].filter((number) => number > 0);

    const nextTruckNumber =
      allTruckNumbers.length > 0
        ? Math.max(...allTruckNumbers) + 1
        : 1;

    await createPlannedTruck(supabase, {
      reference,
      truckNumber: nextTruckNumber,
      plannedExpeditionDate: null,
      notes: "",
      createdBy: currentUser
        ? `${currentUser.username} - ${currentUser.name}`
        : "",
    });

    await loadTruckSchedule();
  } catch (error) {
    console.error("Error creando camión planificado:", error);
    alert(
      `No se ha podido crear el camión planificado.\n\n${
        error?.message || String(error)
      }`
    );
  }
}

async function handleUpdatePlannedTruck(truck, updates) {
  if (!isSupabaseConfigured || !supabase || !truck?.id) return;

  await updatePlannedTruck(supabase, truck.id, updates);
  await loadTruckSchedule();
}

async function handleDeletePlannedTruck(truck) {
  if (!isSupabaseConfigured || !supabase || !truck?.id) return;

  if (!window.confirm(`¿Eliminar camión planificado ${truck.truck_number}?`)) {
    return;
  }

  await deletePlannedTruck(supabase, truck.id);
  await loadTruckSchedule();
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

  const { data, error } = await supabase
    .from("f1012_trucks")
    .select("truck_number")
    .eq("reference", reference)
    .order("truck_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return (data?.truck_number || 0) + 1;
}

async function getActiveTruck(reference, createdBy = "") {
  if (!isSupabaseConfigured || !supabase) return null;

  return await getActiveTruckFromService(supabase, reference, createdBy);
}

async function updateTruckExpeditionDate(truckId, newDate) {
  if (!isSupabaseConfigured || !supabase) return;

  const updatedTruck = await updateTruckExpeditionDateFromService(
    supabase,
    truckId,
    newDate
  );

  setActiveTruck(updatedTruck);

  return updatedTruck;
}

async function loadTrucksHistory() {
  if (!isSupabaseConfigured || !supabase) {
    console.log("No hay Supabase configurado");
    return [];
  }

  const data = await fetchTrucksFromService(
    supabase,
    appConfig.reference
  );

  console.log("HISTÓRICO CAMIONES DESDE SUPABASE:", data);

  setTrucks(data);

  return data;
}

async function loadTruckSchedule() {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const data = await fetchTruckSchedule(
    supabase,
    appConfig.reference
  );

  setTruckSchedule(data);

  return data;
}

async function refreshActiveTruck() {
  const truck = await fetchOpenTruck(appConfig.reference);
  setActiveTruck(truck);
  return truck;
}

async function handleSelectTruck(truck) {
  setDisplayTruck(truck);

  const labels = await fetchBoxLabels(supabase, truck.id);
  setBoxLabels(labels);
}

async function handleSearchBox(boxNumber) {
  const search = String(boxNumber || "").trim().toUpperCase();

  if (!search) {
    alert("Indica un número de caja.");
    return;
  }

  const { data: boxRows, error: boxError } = await supabase
    .from("f1012_box_labels")
    .select("*")
    .eq("numero_caja", search)
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

  const labels = await fetchBoxLabels(supabase, truck.id);
  setBoxLabels(labels);

  setHighlightBoxNumber(search);
}

  const confirmProductionStart = () => {
    const selectedReferenceData = getReferenceById(startupReference);
    const piece = startupPiece.trim();
    const of = startupOF.trim();

    

    localStorage.setItem("startupReference", selectedReferenceData.id);
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

  const adminFilteredUsers = appUsers.filter((user) => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) return true;

    return (
      String(user.username || "").toLowerCase().includes(query) ||
      String(user.name || "").toLowerCase().includes(query) ||
      String(user.role || "").toLowerCase().includes(query)
    );
  });

  const saveAdminUser = () => {
    const username = adminUserForm.username.trim();
    const name = adminUserForm.name.trim();
    const password = adminUserForm.password.trim();
    const role = adminUserForm.role || "Operario";

    if (!username || !name || !password) {
      alert("Debe indicar nº operario, nombre y contraseña.");
      return;
    }

    const userToSave = normalizeUserForStorage({ username, name, password, role });
    const exists = appUsers.some((user) => user.username === username);
    const nextUsers = exists
      ? appUsers.map((user) =>
          user.username === username ? userToSave : user
        )
      : [...appUsers, userToSave];

    setAppUsers(nextUsers);
    saveStoredUsers(nextUsers);
    saveUserToSharedDatabase(userToSave);
    setAdminUserForm({
      username: "",
      name: "",
      password: "",
      role: "Operario",
    });
  };

  const editAdminUser = (user) => {
    setAdminUserForm({
      username: user.username,
      name: user.name,
      password: user.password || user.pin || "",
      role: user.role,
    });
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

  const resetAdminUserForm = () => {
    setAdminUserForm({
      username: "",
      name: "",
      password: "",
      role: "Operario",
    });
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

  const openCommandBox = (box) => {
    const boxNumber = box?.numeroCaja || box?.numero_caja || "";
    if (boxNumber) {
      setShowBoxLabelsModal(true);
      handleSearchBox(boxNumber);
    }
  };

  const openCommandTruck = (truck) => {
    if (truck) {
      setActiveWorkspaceModule("trucks");
      setShowBoxLabelsModal(true);
      handleSelectTruck(truck);
    }
  };

  const handleWorkspaceNavigate = (moduleId) => {
    setActiveWorkspaceModule(moduleId);

    if (moduleId === "dashboard" || moduleId === "trucks") {
      setShowBoxLabelsModal(true);
      return;
    }

    if (moduleId === "production") {
      setShowProductionModal(true);
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


  const dashboardStats = {
    totalRegistros: records?.length || 0,
    rechazos: records?.filter?.((r) => Number(r?.rechazos || 0) > 0)?.length || 0,
    operariosActivos: new Set((records || []).map((r) => r.operario).filter(Boolean)).size,
    ultimaVerificacion:
      records && records.length
        ? records[records.length - 1]?.fecha || "-"
        : "-",
  };

  const operatorLastBox = truckProgress?.lastBox || null;
  const operatorLastRecord = getLastRecordForCurrentContext?.() || null;
  const operatorShiftRecords = records.filter(
    (record) =>
      record.fecha === form.fecha &&
      record.turno === form.turno &&
      record.operario === form.operario
  );
  const operatorShiftOk = operatorShiftRecords.filter((record) => record.resultado === "OK").length;
  const operatorShiftNok = operatorShiftRecords.filter((record) => record.resultado === "NO OK").length;

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={appUsers} />;
  }

  const isOperatorView = isVerificationUser(currentUser);

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
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Workspace activo</div>
              <h2 className="mt-1 text-3xl font-black text-slate-900">FM Control</h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">
                Panel central de producción. Usa la barra lateral para abrir Dashboard, Producción, Camiones, Etiquetas o Configuración.
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
        onOpenDashboard={() => { setActiveWorkspaceModule("dashboard"); setShowBoxLabelsModal(true); }}
        onOpenConfig={() => { setActiveWorkspaceModule("config"); setShowConfigModal(true); }}
        onOpenLabel={() => { setActiveWorkspaceModule("labels"); setShowLabelModal(true); }}
        onOpenProduction={() => { setActiveWorkspaceModule("production"); setShowProductionModal(true); }}
      />
      )}

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
              >
               {REFERENCES
  .filter((reference) => reference.id === "F-1012")
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
              className="w-full rounded-2xl bg-[#0f5c63] py-5 text-base font-black text-white shadow-lg"
            >
              Continuar
            </Button>
          </div>
        </div>
      )}
      {isOperatorView && (
        <div className="mx-auto mb-4 max-w-[1600px] px-3 pt-3 lg:px-4 lg:pt-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-stretch">
            <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-700">FM Control Operator · v{APP_VERSION}</div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-black leading-tight text-slate-950">Puesto de Trabajo</h1>
                  <p className="mt-1 text-lg font-black text-slate-800">Control de Proceso · F-1012 · Célula B</p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
                  <div className="text-sm font-black text-slate-950">{currentUser.name}</div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">{roleLabel(currentUser.role)} · Turno {form.turno}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => openLabelModal({ reset: true })}
                className="rounded-3xl bg-blue-600 px-5 py-5 text-base font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                🖨️<br />Etiqueta
              </button>
              <button
                type="button"
                onClick={openBoxLabelsModal}
                className="rounded-3xl border border-slate-300 bg-white px-5 py-5 text-base font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                🚚<br />Camión
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-3xl border border-red-200 bg-red-50 px-5 py-5 text-base font-black text-red-700 shadow-sm transition hover:bg-red-100"
              >
                🚪<br />Salir
              </button>
            </div>
          </div>
        </div>
      )}

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
    F-1012<br />
    Célula B
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
              <span>Máquina: <strong>{form.maquina}</strong></span>
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
                  {activeView === "nueva" ? "F-1012 · Control de proceso" : "F-1012 · Histórico y calidad"}
                </h2>
                <p className="mt-1 text-slate-600">
                  Célula B · {form.maquina} · Turno {turnoLabel(form.turno)} · {form.fecha}
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
                    {Object.keys(MACHINES).map((m) => (
                      <option key={m}>{m}</option>
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

                <Field label="form.numeroPieza">
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
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Control Ecoroll / Refrigerante
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
              <LastLabelCard
                operatorLastBox={operatorLastBox}
                operatorShiftRecords={operatorShiftRecords}
                operatorShiftOk={operatorShiftOk}
                operatorShiftNok={operatorShiftNok}
                operatorLastRecord={operatorLastRecord}
                lastVerificationElapsedLabel={lastVerificationElapsedLabel}
              />

              <Card className="rounded-3xl border-0 shadow-lg">
                <CardContent className="p-6">
                  <ControlStatusSummary
                  validation={validation}
                  overallOk={overallOk}
                />
              </CardContent>
            </Card>

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
                        numeroPieza: previous.numeroPieza || form.numeroPieza || "",
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
                      setForm({ ...form, numeroPieza: "" });
                      setValues({});
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
                            <div className="text-xs text-slate-500">{record.maquina} · {turnoLabel(record.turno)} · {record.horaGuardado}</div>
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
          <Card className="rounded-3xl border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{isOperatorView ? "Mi historial" : "Histórico"}</h2>

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

                  <Field label="pdfPieza">
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
                      {Object.keys(MACHINES).map((machine) => (
                        <option key={machine} value={machine}>
                          {machine}
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
                                    if (requestAccessCode()) {
                                      openEditRecord(r);
                                    }
                                  }}
                                  title="Editar registro"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (requestAccessCode()) {
                                      removeRecord(r.id);
                                    }
                                  }}
                                  title="Eliminar registro"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
          )}
        </div>
        </main>
      </div>

      {visualHelpItem && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <VisualHelpModalComponent
            item={visualHelpItem}
            onClose={() => setVisualHelpItem(null)}
          />
        </Suspense>
      )}

      {editingRecord && editForm && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <EditRecordModalComponent
            editForm={editForm}
            setEditForm={setEditForm}
            editValues={editValues}
            setEditValues={setEditValues}
            onSave={saveEditedRecord}
            onClose={closeEditRecord}
          />
        </Suspense>
      )}

      {showCpkModal && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <CpkModalComponent
            records={records}
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
        </Suspense>
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
                    <ReadOnlyField
                      label="Código etiqueta"
                      value={incidentForm.codigoEtiqueta}
                    />
                    
                    <ReadOnlyField
                      label="Nº fabricación"
                      value={incidentForm.numeroFabricacion}
                    />
                    
                    <ReadOnlyField
                      label="Nº colada"
                      value={incidentForm.numeroColada}
                    />
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
                          FABRIMOTOR · Informe generado desde control digital F-1012 · ${new Date().toLocaleString("es-ES")}
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
  <Suspense fallback={<ModuleLoadingFallback />}>
    <ConfigModal
      appConfig={appConfig}
      configForm={configForm}
      setConfigForm={setConfigForm}
      updateAppSetting={updateAppSetting}
      currentUser={currentUser}
      setAppConfig={setAppConfig}
      onClose={() => setShowConfigModal(false)}
    />
  </Suspense>
)}



{showLabelModal && ( 
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
      closeActiveTruck={closeActiveTruck}
      onSelectTruck={handleSelectTruck}
      onSearchBox={handleSearchBox}
      highlightBoxNumber={highlightBoxNumber}
      truckSchedule={truckSchedule}
      onCreatePlannedTruck={handleCreatePlannedTruck}
      onUpdatePlannedTruck={handleUpdatePlannedTruck}
      onDeletePlannedTruck={handleDeletePlannedTruck}
      currentUser={currentUser}
      isAdminUser={isAdminUser}
      onClose={() => {
        setShowBoxLabelsModal(false);
        setDisplayTruck(null);
      }}
    />
  </Suspense>
)}
      {showRejectsModal && (
        <Suspense fallback={<ModuleLoadingFallback />}>
          <RejectsModalComponent
            {...lasPropsQueYaTienes}
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
                      <td className="border border-red-100 px-3 py-2">{record.maquina}</td>
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
  const c30 = MACHINES["Torno Hyundai"].find((item) => item.id === "c30");
  const c40 = MACHINES["Torno Hyundai"].find((item) => item.id === "c40");

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
              Torno Hyundai · Lecturas de comparador entre +38 y +63
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
                  Líneas rojas: límites +38 y +63.
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
                    <YAxis domain={[30, 70]} label={{ value: "Valor comparador", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      formatter={(value, name) => [value, name === "c30" ? "Cota Nº30" : "Cota Nº40"]}
                      labelFormatter={(label) => {
                        const row = chartData[label - 1];
                        return row ? `Registro ${label} · Pieza ${row.pieza || ""} · ${row.fecha || ""} ${row.hora || ""}` : `Registro ${label}`;
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={38} stroke="red" strokeDasharray="5 5" label="LSL +38" />
                    <ReferenceLine y={63} stroke="red" strokeDasharray="5 5" label="USL +63" />
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
  onSave,
  onClose,
}) {
  const checks = MACHINES[editForm.maquina] || [];

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
                {Object.keys(MACHINES).map((machine) => (
                  <option key={machine}>{machine}</option>
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

          {calculateResult(editForm.maquina, editValues) === "NO OK" && (
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
