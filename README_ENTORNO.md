# Entorno React reorganizado

Esta version separa la aplicacion en carpetas mas comodas:

- `src/App.jsx`: pantalla principal y logica general.
- `src/data/constants.js`: maquinas, cotas, motivos de rechazo, imagenes y estilos de modales.
- `src/utils/helpers.js`: funciones auxiliares.
- `src/components/modals/`: ventanas emergentes.
- `src/components/common/`: componentes reutilizables pequenos.
- `src/components/ui/`: botones y tarjetas.
- `public/videos/ayuda-cota.mp4`: video de ayuda visual.

## Instalacion

```cmd
npm install
npm run dev
```

## Video

Copia tu video en:

```text
public/videos/ayuda-cota.mp4
```

Si cambias el nombre del video, modifica la ruta dentro de:

```text
src/components/modals/VisualHelpModal.jsx
```
