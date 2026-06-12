import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  Pencil,
  Timer,
  Info,
  FileText,
  Printer,
  TrendingUp,
  X,
  LogOut,
  Users,
} from "lucide-react";
import { Card, CardContent } from "./components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "./components/ui/button";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";

import VisualHelpModalComponent from "./components/modals/VisualHelpModal";
import EditRecordModalComponent from "./components/modals/EditRecordModal";
import CpkModalComponent from "./components/modals/CpkModal";
import RejectsModalComponent from "./components/modals/RejectsModal";

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
  for (let value = min; value <= max + 0.000001; value += step) {
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

const HYUNDAI_MICROMETER_IMAGE = "data:image/jpeg;base64,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";

const VISUAL_HELP_IMAGES = {
  c30: HYUNDAI_MICROMETER_IMAGE,
  c40: HYUNDAI_MICROMETER_IMAGE,
  c50: HYUNDAI_MICROMETER_IMAGE,
};



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
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
      inputMode: "selectComparatorNegative",
      selectMin: 80,
      selectMax: 20,
      frecuencia:
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c60",
      control: "Nº60 · Ø 82 -0,035 / -0,060 (A) (B) [F2] · Anillo comprobación [PT085]",
      comentario:
        "Anillo comprobación [PT085]",
      type: "oknok",
      frecuencia:
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
      fixedOptions: ["14.70", "14.80", "14.90", "15.00", "15.10", "15.20", "15.30"],
      frecuencia:
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c230",
      control: "Nº230 · Cota 32 ±0,2",
      comentario:
        "Galga PNP [PT084]",
      type: "oknok",
      frecuencia:
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar las piezas número 1, 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar la pieza número 1.",
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
        "Registrar la pieza número 1.",
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
        "Registrar la pieza número 1.",
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
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c330",
      control: "Nº330 · 5x Ø16,5 +0,2/-0,1",
      comentario:
        "Calibre PNP [CA236]",
      type: "oknok",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c360",
      control: "Nº360 · 6x R13,8 min.",
      comentario:
        "Galga [CA238] [CA240]",
      type: "oknok",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c60neway",
      control: "Nº60 · Anillo comprobación",
      comentario:
        "Anillo comprobación [PT087]",
      type: "oknok",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    
    {
      id: "c370",
      control: "Nº370 · 19,1 +0/-1",
      comentario:
        "Pie de rey digital [PR05]",
      min: 18.1,
      max: 19.1,
      type: "number",
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

export default function App() {
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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fabrimotor-current-user") || "null");
    } catch {
      return null;
    }
  });

  const [appUsers, setAppUsers] = useState(() => getStoredUsers());
  const [databaseMode, setDatabaseMode] = useState(isSupabaseConfigured ? "Conectando..." : "Local");
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [usersMode, setUsersMode] = useState(isSupabaseConfigured ? "Conectando..." : "Local");
  const [lastUsersSyncAt, setLastUsersSyncAt] = useState("");

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminUserForm, setAdminUserForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "Operario",
  });
  const [adminSearch, setAdminSearch] = useState("");

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

  const validation = useMemo(() => {
    return checks.map((item) => {
      const value = values[item.id];

      if (item.type === "number") {
        const numeric = Number(value);
        const ok = !Number.isNaN(numeric) && numeric >= item.min && numeric <= item.max;
        return {
          ...item,
          value,
          ok,
        };
      }

      if (item.type === "oknok") {
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
  }, [checks, values]);

  const controlTurnoOk = form.maquina !== "Torno Hyundai" || values.controlTurno === "OK";
  const overallOk = validation.every((v) => v.ok) && controlTurnoOk;

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

    alert(`Verificación guardada correctamente.\n\nPieza: ${row.numeroPieza}\nResultado: ${row.resultado}\nBase de datos: ${isSupabaseConfigured ? "compartida" : "local"}`);
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

  const confirmProductionStart = () => {
    const selectedReferenceData = getReferenceById(startupReference);
    const piece = startupPiece.trim();
    const of = startupOF.trim();

    if (!piece) {
      alert("Debe introducir el número de pieza.");
      return;
    }

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


  const dashboardStats = {
    totalRegistros: records?.length || 0,
    rechazos: records?.filter?.((r) => Number(r?.rechazos || 0) > 0)?.length || 0,
    operariosActivos: new Set((records || []).map((r) => r.operario).filter(Boolean)).size,
    ultimaVerificacion:
      records && records.length
        ? records[records.length - 1]?.fecha || "-"
        : "-",
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={appUsers} />;
  }

  const isOperatorView = isVerificationUser(currentUser);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {showAdminPanel && isAdminUser(currentUser) && (
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
          <div className="flex max-h-[92vh] w-[min(1180px,96vw)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Panel Administrador
                </h2>
                <p className="text-sm text-slate-600">
                  Alta, edición, cambio de contraseña y eliminación de usuarios.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminPanel(false)}
                className="rounded-full p-2 text-slate-700 hover:bg-slate-200"
                aria-label="Cerrar panel administrador"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid gap-5 overflow-auto p-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-4 text-lg font-black text-slate-900">
                  Usuario
                </h3>

                <div className="grid gap-3">
                  <Field label="Nº operario">
                    <input
                      className="input"
                      value={adminUserForm.username}
                      onChange={(event) =>
                        setAdminUserForm({ ...adminUserForm, username: event.target.value })
                      }
                      placeholder="Ejemplo: 2131"
                    />
                  </Field>

                  <Field label="Nombre">
                    <input
                      className="input"
                      value={adminUserForm.name}
                      onChange={(event) =>
                        setAdminUserForm({ ...adminUserForm, name: event.target.value })
                      }
                      placeholder="Nombre y apellidos"
                    />
                  </Field>

                  <Field label="Contraseña">
                    <input
                      className="input"
                      value={adminUserForm.password}
                      onChange={(event) =>
                        setAdminUserForm({ ...adminUserForm, password: event.target.value })
                      }
                      placeholder="Contraseña"
                    />
                  </Field>

                  <Field label="Rol">
                    <select
                      className="input"
                      value={adminUserForm.role}
                      onChange={(event) =>
                        setAdminUserForm({ ...adminUserForm, role: event.target.value })
                      }
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Button
                    type="button"
                    onClick={saveAdminUser}
                    className="rounded-2xl bg-[#1f6f73] text-white font-bold hover:bg-[#18595d]"
                  >
                    Guardar usuario
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAdminUserForm}
                    className="rounded-2xl"
                  >
                    Nuevo / limpiar
                  </Button>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Usuarios registrados
                    </h3>
                    <p className="text-sm text-slate-500">
                      {adminFilteredUsers.length} de {appUsers.length} usuarios.
                    </p>
                  </div>

                  <input
                    className="input sm:max-w-xs"
                    value={adminSearch}
                    onChange={(event) => setAdminSearch(event.target.value)}
                    placeholder="Buscar por nº, nombre o rol"
                  />
                </div>

                <div className="overflow-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Nº</th>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Rol</th>
                        <th className="px-3 py-2 text-left">Contraseña</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {adminFilteredUsers.map((user) => (
                        <tr key={user.username} className="border-t border-slate-200">
                          <td className="px-3 py-2 font-bold">{user.username}</td>
                          <td className="px-3 py-2">{user.name}</td>
                          <td className="px-3 py-2">{user.role}</td>
                          <td className="px-3 py-2">{user.password || user.pin || ""}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => editAdminUser(user)}
                              className="mr-2 rounded-xl border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteAdminUser(user.username)}
                              disabled={user.username === currentUser?.username}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Los cambios se guardan localmente y se sincronizan con Supabase cuando hay conexión.
                </div>
              </div>
            </div>
          </div>
        </div>
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

            <label className="mb-3 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Número de pieza
              </span>
              <input
                autoFocus
                className="input"
                value={startupPiece}
                onChange={(event) => setStartupPiece(event.target.value)}
                placeholder="Ejemplo: 123456"
              />
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
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <aside className="max-h-[calc(100vh-24px)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-xl lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:w-72 lg:shrink-0">
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

        <main className="flex-1 space-y-6">
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

          <div className={activeView === "nueva" ? "grid gap-6 xl:grid-cols-[460px_1fr]" : "grid gap-6"}>
          {activeView === "nueva" && (
          <>
          <Card className="rounded-3xl border-0 shadow-lg">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Nueva verificación</h2>

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

                <Field label="Número de pieza">
                  <input
                    className="input bg-slate-100 font-semibold text-slate-700"
                    value={form.numeroPieza}
                    readOnly
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
                  <div className="font-semibold text-slate-900 mb-2">
                    Verificación obligatoria por turno
                  </div>

                  <div className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Turnos:
                    <br />
                    • 06:00 → 14:00
                    <br />
                    • 14:00 → 22:00
                    <br />
                    • 22:00 → 06:00
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Control Ecoroll / Refrigerante
                    </span>

                    <select
                      className="input"
                            value={values.controlTurno || ""}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          controlTurno: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar</option>
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
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3 ${
                      item.value === undefined || item.value === ""
                        ? "border-slate-200 bg-white"
                        : item.ok
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-red-300 bg-red-50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-900">
                          {item.id === "c30" ? (
                            <>
                              Nº30 · Ø82 (A) · Valor comparador{" "}
                              <span className="font-bold text-red-600">[F2]</span>
                            </>
                          ) : item.id === "c40" ? (
                            <>
                              Nº40 · Ø82 (B) · Valor comparador{" "}
                              <span className="font-bold text-red-600">[F2]</span>
                            </>
                          ) : item.id === "c50" ? (
                            <>
                              Nº50 · Ø82 · Valor comparador{" "}
                              <span className="font-bold text-red-600">[F1]</span>
                            </>
                          ) : item.id === "c170" ? (
                            <>
                              Nº170 · Rosca M72x1,5 6g{" "}
                              <span className="font-bold text-red-600">[F8]</span>
                            </>
                          ) : item.id === "c160" ? (
                            <>
                              Nº160 · Ø60{" "}
                              <span className="font-bold text-red-600">[S6]</span>
                            </>
                          ) : item.id === "c320" ? (
                            <>
                              Nº320 · Ø17 +0,043/+0{" "}
                              <span className="font-bold text-red-600">[F5]</span>
                            </>
                          ) : item.id === "c60neway" ? (
                            <>
                              Nº60 · Anillo comprobación{" "}
                              <span className="font-bold text-red-600">[F2]</span>
                            </>
                          ) : item.id === "c60" ? (
                            <>
                              Nº60 · Ø 82 -0,035 / -0,060 (A) (B){" "}
                              <span className="font-bold text-red-600">[F2]</span>
                              {" · Anillo comprobación [PT085]"}
                            </>
                          ) : (
                            item.control
                          )}
                        </div>

                        {(item.type === "number" || item.comentario) && (
                          <div className="space-y-1 text-xs text-slate-500">
                            {item.type === "number" && (
                              <div>
                                Tolerancia: {item.id === "c30" || item.id === "c40" ? `+${item.min} → +${item.max}` : item.displayMin && item.displayMax ? `${item.displayMin} → ${item.displayMax}` : `${item.min} → ${item.max}`}
                              </div>
                            )}

                            {item.frecuencia && (
                              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-base font-bold leading-relaxed text-blue-900">
                                <div className="mb-1 text-xs font-black uppercase tracking-wide text-blue-700">
                                  Frecuencia de control
                                </div>
                                <div>{item.frecuencia}</div>
                              </div>
                            )}

                            {item.comentario && (
                              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                                {item.comentario}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {item.value !== undefined && item.value !== "" && (
                        <div
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.ok
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.ok ? "OK" : "NO OK"}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setVisualHelpItem({
                            ...item,
                            maquina: form.maquina,
                          })
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "40px",
                          padding: "10px 16px",
                          borderRadius: "14px",
                          border: "1px solid #1f6f73",
                          backgroundColor: "#1f6f73",
                          color: "#ffffff",
                          fontWeight: 900,
                          fontSize: "14px",
                          cursor: "pointer",
                          boxShadow: "0 4px 10px rgba(31, 111, 115, 0.25)",
                        }}
                      >
                        Ayuda visual
                      </button>
                    </div>

                    {item.type === "number" ? (
                      item.inputMode === "selectComparator" ? (
                        <select
                          className="input text-slate-900 font-bold"
                          value={values[item.id] || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [item.id]: e.target.value,
                            })
                          }
                        >
                          <option value="">Seleccionar lectura</option>
                          {Array.from({ length: 101 }, (_, i) => 20 - i).map((reading) => (
                            <option key={reading} value={reading}>
                              +{reading}
                            </option>
                          ))}
                        </select>
                      ) : item.inputMode === "selectComparatorNegative" ? (
                        <select
                          className="input text-slate-900 font-bold"
                          value={values[item.id] || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [item.id]: e.target.value,
                            })
                          }
                        >
                          <option value="">Seleccionar lectura</option>
                          {comparatorOptions(item.selectMin || 20, item.selectMax || 80).map((reading) => (
                            <option key={reading} value={reading}>
                              `+${reading}`
                            </option>
                          ))}
                        </select>
                      ) : item.inputMode === "selectFixed" ? (
                        <select
                          className="input text-slate-900 font-bold"
                          value={values[item.id] || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [item.id]: e.target.value,
                            })
                          }
                        >
                          <option value="">Seleccionar lectura</option>
                          {(item.fixedOptions || []).map((reading) => (
                            <option key={reading} value={reading}>
                              {reading}
                            </option>
                          ))}
                        </select>
                      ) : item.inputMode === "selectRange" ? (
                        <select
                          className="input text-slate-900 font-bold"
                          value={values[item.id] || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [item.id]: e.target.value,
                            })
                          }
                        >
                          <option value="">Seleccionar lectura</option>
                          {rangeOptions(item.rangeMin, item.rangeMax, item.rangeStep || 0.01).map((reading) => (
                            <option key={reading} value={reading.toFixed(2)}>
                              {reading.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          step="0.001"
                          className="input text-slate-900 font-bold"
                          value={values[item.id] || ""}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              [item.id]: e.target.value,
                            })
                          }
                        />
                      )
                    ) : (
                      <select
                        className="input"
                                value={values[item.id] || ""}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            [item.id]: e.target.value,
                          })
                        }
                      >
                        <option value="">Seleccionar</option>
                        <option value="OK">OK</option>
                        <option value="NO OK">NO OK</option>
                      </select>
                    )}

                    {!item.ok && item.value !== undefined && item.value !== "" && (
                      <RejectionReasonSelector
                        check={item}
                        value={values.rechazoMotivos?.[item.id] || {}}
                        onChange={(reason) =>
                          setValues({
                            ...values,
                            rechazoMotivos: {
                              ...(values.rechazoMotivos || {}),
                              [item.id]: {
                                control: item.control,
                                ...reason,
                              },
                            },
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              {overallOk === false && (
                <Field label="Resumen general del rechazo (opcional)">
                  <textarea
                    className="input min-h-[80px] border-red-300 bg-red-50"
                    placeholder="Describe el defecto que ha generado el rechazo..."
                    value={form.rechazoTipo}
                    onChange={(e) =>
                      setForm({ ...form, rechazoTipo: e.target.value })
                    }
                  />
                </Field>
              )}

              <Field label="Observaciones">
                <textarea
                  className="input min-h-[100px]"
                  value={form.observaciones}
                  onChange={(e) =>
                    setForm({ ...form, observaciones: e.target.value })
                  }
                />
              </Field>

              <Button
                onClick={saveRecord}
                className="w-full rounded-2xl py-6 text-base shadow-md"
              >
                <Save className="mr-2 h-5 w-5" />
                Guardar verificación
              </Button>
            </CardContent>
          </Card>

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
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  {filteredRecords.length} registros
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-slate-50 p-4">
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

                  <Field label="Nº Pieza">
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
        <VisualHelpModalComponent
          item={visualHelpItem}
          onClose={() => setVisualHelpItem(null)}
        />
      )}

      {editingRecord && editForm && (
        <EditRecordModalComponent
          editForm={editForm}
          setEditForm={setEditForm}
          editValues={editValues}
          setEditValues={setEditValues}
          onSave={saveEditedRecord}
          onClose={closeEditRecord}
        />
      )}

      {showCpkModal && (
        <CpkModalComponent
          records={cpkFilteredRecords}
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
        <div style={MODAL_OVERLAY_STYLE}>
          <div style={MODAL_PANEL_XL_STYLE}>
            <div className="no-print flex items-center justify-between border-b border-slate-600 px-5 py-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Informe de mediciones registradas
                </h2>
                <p className="text-sm text-slate-500">
                  Registros separados por máquina · F-1012 Célula B
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={printPdfReport} className="rounded-xl">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir / Guardar PDF
                </Button>

                <button
                  onClick={() => setShowPdfModal(false)}
                  className="rounded-full p-2 hover:bg-slate-100"
                  aria-label="Cerrar informe PDF"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="no-print border-b border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 text-sm font-bold text-slate-700">
                Filtros para PDF registros · {pdfFilteredRecords.length} registros encontrados
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <Field label="Desde fecha">
                  <input
                    type="date"
                    className="input"
                    value={pdfDateFrom}
                    onChange={(e) => setPdfDateFrom(e.target.value)}
                  />
                </Field>

                <Field label="Hasta fecha">
                  <input
                    type="date"
                    className="input"
                    value={pdfDateTo}
                    onChange={(e) => setPdfDateTo(e.target.value)}
                  />
                </Field>

                <Field label="Turno">
                  <select
                    className="input"
                    value={pdfTurno}
                    onChange={(e) => setPdfTurno(e.target.value)}
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
                    value={pdfOperario}
                    onChange={(e) => setPdfOperario(e.target.value)}
                  />
                </Field>

                <Field label="Nº Pieza">
                  <input
                    className="input"
                    placeholder="Ej. 64"
                    value={pdfPieza}
                    onChange={(e) => setPdfPieza(e.target.value)}
                  />
                </Field>

                <Field label="Máquina">
                  <select
                    className="input"
                    value={pdfMaquina}
                    onChange={(e) => setPdfMaquina(e.target.value)}
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

              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setPdfDateFrom("");
                    setPdfDateTo("");
                    setPdfTurno("");
                    setPdfOperario("");
                    setPdfPieza("");
                    setPdfMaquina("");
                  }}
                >
                  Limpiar filtros PDF
                </Button>
              </div>
            </div>

            <div id="pdf-report" className="overflow-auto p-6 text-slate-900 print:p-0">
              <PdfMachineReport
                title="TORNO HYUNDAI"
                machineName="Torno Hyundai"
                records={pdfRecordsByMachine("Torno Hyundai")}
              />

              <div className="my-8 print:my-4 print:break-after-page" />

              <PdfMachineReport
                title="CENTRO NEWAY"
                machineName="Centro NEWAY"
                records={pdfRecordsByMachine("Centro NEWAY")}
              />
            </div>
          </div>
        </div>
      )}

      {showRejectsModal && (
        <RejectsModalComponent
          records={rejectedRecords}
          getRejectedChecks={getRejectedChecks}
          buildSheetName={buildSheetName}
          onClose={() => setShowRejectsModal(false)}
        />
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

            <Field label="Número de pieza">
              <input
                className="input"
                value={editForm.numeroPieza}
                onChange={(e) => setEditForm({ ...editForm, numeroPieza: e.target.value })}
              />
            </Field>

            {editForm.maquina === "Torno Hyundai" && (
              <Field label="Control Ecoroll / Refrigerante">
                <select
                  className="input"
                  value={editValues.controlTurno || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, controlTurno: e.target.value })
                  }
                >
                  <option value="">Seleccionar</option>
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
                      className="input"
                      value={value}
                      onChange={(e) =>
                        setEditValues({ ...editValues, [check.id]: e.target.value })
                      }
                    >
                      <option value="">Seleccionar</option>
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

function PdfMachineReport({ title, machineName, records }) {
  const checks = MACHINES[machineName] || [];

  const getMeasurementStatus = (check, value) => {
    if (value === undefined || value === null || value === "") return "empty";

    if (check.type === "number") {
      const numeric = Number(value);

      if (Number.isNaN(numeric)) return "nok";

      if (numeric < check.min || numeric > check.max) {
        return "nok";
      }

      const range = check.max - check.min;
      const warningMargin = range * 0.1;

      const nearLowerLimit = numeric <= check.min + warningMargin;
      const nearUpperLimit = numeric >= check.max - warningMargin;

      if (nearLowerLimit || nearUpperLimit) {
        return "warning";
      }

      return "ok";
    }

    if (check.type === "oknok") {
      return value === "OK" ? "ok" : "nok";
    }

    return "empty";
  };

  return (
    <section className="mb-8 rounded-xl border border-black bg-white p-4 print:rounded-none print:border print:p-2">
      <div className="mb-3 border border-black text-center">
        <div className="bg-slate-700 px-3 py-2 text-2xl font-black tracking-wide print:text-xl">
          {title}
        </div>
        <div className="border-t border-black px-3 py-1 text-sm font-semibold">
          Control proceso F-1012 · Célula B · Mediciones registradas
        </div>
      </div>

      {records.length === 0 ? (
        <div className="border border-black p-4 text-center text-slate-500">
          Sin registros para esta máquina.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-xs print:min-w-0 print:text-[9px]">
            <thead>
              <tr className="bg-slate-700">
                <th className="border border-black px-2 py-1">Fecha</th>
                <th className="border border-black px-2 py-1">Hora</th>
                <th className="border border-black px-2 py-1">Hoja</th>
                <th className="border border-black px-2 py-1">Turno</th>
                <th className="border border-black px-2 py-1">Operario</th>
                <th className="border border-black px-2 py-1">Nº pieza</th>
                {machineName === "Torno Hyundai" && (
                  <th className="border border-black px-2 py-1">Ecoroll / refrigerante</th>
                )}
                {checks.map((check) => (
                  <th key={check.id} className="border border-black px-2 py-1">
                    {check.control}
                  </th>
                ))}
                <th className="border border-black px-2 py-1">Resultado</th>
                <th className="border border-black px-2 py-1">Tipo error rechazo</th>
                <th className="border border-black px-2 py-1">Observaciones</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="border border-black px-2 py-1">{record.fecha}</td>
                  <td className="border border-black px-2 py-1">{record.horaGuardado}</td>
                  <td className="border border-black px-2 py-1">{buildReportSheetName(record)}</td>
                  <td className="border border-black px-2 py-1">{turnoLabel(record.turno)}</td>
                  <td className="border border-black px-2 py-1">{record.operario}</td>
                  <td className="border border-black px-2 py-1">{record.numeroPieza}</td>
                  {machineName === "Torno Hyundai" && (
                    <td className="border border-black px-2 py-1">{record.mediciones?.controlTurno || ""}</td>
                  )}
                  {checks.map((check) => {
                    const value = record.mediciones?.[check.id] ?? "";
                    const status = getMeasurementStatus(check, value);

                    return (
                      <td
                        key={check.id}
                        className={`border border-black px-2 py-1 text-center font-semibold ${
                          status === "nok"
                            ? "bg-red-100 text-red-700"
                            : status === "warning"
                            ? "bg-yellow-200 text-black"
                            : status === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : ""
                        }`}
                      >
                        {value}
                      </td>
                    );
                  })}
                  <td className={`border border-black px-2 py-1 text-center font-bold ${record.resultado === "OK" ? "text-emerald-300" : "text-red-600"}`}>
                    {record.resultado}
                  </td>
                  <td className="border border-black px-2 py-1">{record.rechazoTipo || ""}</td>
                  <td className="border border-black px-2 py-1">{record.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
