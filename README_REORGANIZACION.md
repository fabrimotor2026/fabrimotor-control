# Proyecto F-1012 reorganizado

## Como arrancar

```cmd
npm install
npm run dev
```

## Estructura principal

```text
src/
  App.jsx                         Aplicacion principal con la logica actual
  components/
    common/                       Componentes pequenos reutilizables
    layout/AppShell.jsx           Base para el entorno con menu lateral
    modals/                       Modales separados usados por App.jsx
    ui/                           Button y Card
  data/                           Constantes y datos de maquinas
  pages/                          Pantallas base para evolucion futura
  utils/                          Utilidades de fechas y helpers
public/
  videos/                         Videos de ayuda visual
```

## Cambios realizados

- Se anadio `index.html`, que faltaba para que Vite pueda compilar.
- Se dejo `postcss.config.js` preparado para Tailwind v4 con `@tailwindcss/postcss`.
- Se anadio `type: module` al `package.json`.
- Se centralizaron los modales en `src/components/modals/`.
- `App.jsx` ahora usa los modales separados:
  - `VisualHelpModal.jsx`
  - `EditRecordModal.jsx`
  - `CpkModal.jsx`
  - `RejectsModal.jsx`
- Se elimino la carpeta duplicada `src/modals/` para evitar confusion.
- Se creo `public/videos/` para guardar videos.

## Video de ayuda visual

Pon tu archivo aqui:

```text
public/videos/ayuda-cota.mp4
```

## Nota

He mantenido la logica principal dentro de `App.jsx` para no romper la aplicacion. El siguiente paso recomendado es mover poco a poco el formulario de nueva verificacion y el historico a componentes/paginas independientes.
