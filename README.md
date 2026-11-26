# Casa Brin — Sistema de inventario textil

Sistema de control de inventario por rollos y metros, con código de barras.

| Carpeta | Contenido |
|---|---|
| [`CasaBrin-Backend/`](CasaBrin-Backend/) | API en .NET 8 + Entity Framework Core (SQL Server) |
| [`CasaBrin-Frontend/`](CasaBrin-Frontend/) | Panel web en React + Vite |
| [`CasaBrin-Movil/`](CasaBrin-Movil/) | App Android en React Native + Expo (mismas pantallas, misma API) |

## Puesta en marcha

### 1. Backend
Las credenciales **no** están en el repositorio. Configúralas con User Secrets (se guardan solo en tu equipo):

```bash
cd CasaBrin-Backend/src/CasaBrin.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Key" "una-clave-larga-y-secreta-de-al-menos-32-caracteres"
dotnet run
```

Queda en http://localhost:5080 (Swagger en `/swagger`).

**Migraciones de base de datos:** después del script inicial, ejecuta en orden los archivos de
[`CasaBrin-Backend/database/`](CasaBrin-Backend/database/) (por ejemplo `001_codigo_color.sql`).
Son idempotentes: se pueden ejecutar más de una vez sin problema.

### 2. Frontend
```bash
cd CasaBrin-Frontend
npm install
npm run dev
```

Abre http://localhost:5173. El proxy de Vite envía `/api` al backend.

Más detalles en el `LEEME.md` de cada carpeta.

### 3. App móvil
Ver [`CasaBrin-Movil/LEEME.md`](CasaBrin-Movil/LEEME.md): backend con `--urls "http://0.0.0.0:5080"`,
`npx expo start --lan` para probar con Expo Go y `npx eas-cli@latest build -p android --profile preview` para el APK.
