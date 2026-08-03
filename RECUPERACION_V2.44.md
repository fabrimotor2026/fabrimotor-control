# FM Control V2.44 recuperada

Fuente principal: copia `mi-app(5).zip`.

Verificaciones realizadas:

- `src/config/constants.js` declara `APP_VERSION = "2.44"`.
- Los seis archivos funcionales del paquete incremental oficial V2.44 coinciden byte a byte con esta copia.
- Se han excluido `.env`, `.vercel`, `node_modules`, `dist`, archivos ZIP internos y restos temporales.
- No contiene los cambios de V2.45 de trazabilidad añadidos posteriormente.

Antes de usarla en Windows:

1. Copiar `.env.example` a `.env` y añadir las credenciales existentes de Supabase.
2. Ejecutar `npm install`.
3. Ejecutar `npm run build`.
4. Ejecutar `npm run dev` y comprobar visualmente la interfaz V2.44.
