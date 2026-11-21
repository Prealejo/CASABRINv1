# Casa Brin — Frontend Web (React + Vite)

Interfaz web del sistema de inventario textil. Ábrela en **otra ventana de Visual Studio Code** (aparte de la del backend).

## Requisitos
- Node 18 o superior
- El **backend corriendo primero** en el puerto 5080 (ver el paquete del backend).

## Pasos
1. Abre esta carpeta (`CasaBrin-Frontend`) en una ventana nueva de VS Code.
2. En la terminal integrada:
   ```bash
   npm install
   npm run dev
   ```
3. Abre **http://localhost:5173** en el navegador.

> El proxy de Vite manda todo lo que empieza con `/api` al backend en `http://localhost:5080`. Por eso **el backend debe estar arriba antes**. Si no, verás errores de conexión al iniciar sesión.

## Credenciales iniciales
`admin` / `Admin123*`

## Pantallas
- **Panel:** totales, valor del inventario y alertas.
- **Inventario:** telas en acordeón; expande para ver sus rollos.
- **Ingreso de mercadería:** registra tela + N rollos por ubicación y genera etiquetas.
- **Escanear y cortar:** escanea el rollo, corta metros y ve el valor calculado en vivo.
- **Traslados:** mueve un rollo entre Bodega y Local.
- **Etiquetas:** códigos de barras imprimibles (`Ctrl+P`).
- **Reportes:** historial de movimientos con filtros y stock bajo.
- **Usuarios:** alta/baja y roles (solo Admin).

## Producción
```bash
npm run build
```
Genera `dist/`. Si el backend queda en otra URL, define `VITE_API_URL` (ver `.env.example`).

## Estructura
```
CasaBrin-Frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── pages/        # las 8 pantallas
    ├── components/   # Layout, BarcodeInput, BarcodeLabel
    ├── api/          # cliente axios
    ├── auth/         # contexto de sesión (JWT)
    ├── lib/          # formato de dinero/metros/fechas
    └── styles/       # sistema de diseño
```
