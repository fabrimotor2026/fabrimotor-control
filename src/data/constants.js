export const ACCESS_CODE = "1234";





export const REJECTION_REASONS = [
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

export const MACHINES = {
  "Torno Hyundai": [
    {
      id: "c30",
      control: "Nº30 · Ø82 (A) · Valor comparador",
      comentario:
        "Horquilla Mitutoyo [CO001] (+38/+63) Comparador [CO007] Patrón [PT038]",
      min: 38,
      max: 63,
      type: "number",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
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
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
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
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c60",
      control: "Nº60 · Ø 82 -0,035 / -0,060 (A) (B) [F2] · Anillo comprobación [PT085]",
      comentario:
        "Anillo comprobación [PT085]",
      type: "oknok",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
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
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c200",
      control: "Nº200 · Cota 15 ±0,2",
      comentario:
        "Mirafondos [MF002] 13 +/-0.2 (12.80 - 13.20)",
      min: 14.8,
      max: 15.2,
      type: "number",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c230",
      control: "Nº230 · Cota 32 ±0,2",
      comentario:
        "Galga PNP [PT084]",
      type: "oknok",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c240",
      control: "Nº240 · Cota 102 ±0,1",
      comentario:
        "Base [CO006] + Comparador [CO005] Patrón [PT082]",
      min: 101.9,
      max: 102.1,
      type: "number",
      frecuencia:
        "Registrar la primera pieza del turno y después las piezas nº 16, 32, 48, 64, 80, 96 y 112.",
    },
    {
      id: "c70",
      control: "Nº70 · Ø69 ±0,3",
      comentario:
        "Palmer 50-75 [PA011]",
      min: 68.7,
      max: 69.3,
      type: "number",
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


export const MODAL_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  backgroundColor: "rgba(0, 0, 0, 0.65)",
};

export const MODAL_PANEL_XL_STYLE = {
  width: "min(1280px, 96vw)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: "20px",
  backgroundColor: "#ffffff",
  boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
};

export const MODAL_PANEL_LG_STYLE = {
  width: "min(1024px, 96vw)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: "20px",
  backgroundColor: "#ffffff",
  boxShadow: "0 25px 80px rgba(0, 0, 0, 0.45)",
};

