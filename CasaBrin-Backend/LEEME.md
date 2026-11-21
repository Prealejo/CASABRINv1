# Casa Brin — Backend (.NET 8)

API del sistema de inventario textil. Ábrela en **Visual Studio Code** (recomendado instalar la extensión **C# Dev Kit**).

## Requisitos
- .NET 8 SDK
- SQL Server ya con la base creada (ejecuta primero el script `CasaBrin_SqlServer.sql` que te pasé por separado).

## Pasos
1. Abre esta carpeta (`CasaBrin-Backend`) en VS Code.
2. Revisa la cadena de conexión en `src/CasaBrin.Api/appsettings.json`. Por defecto apunta a `localhost` / `CasaBrinDB` con seguridad integrada. Si usas Express, cámbiala a algo como:
   ```
   "Server=localhost\\SQLEXPRESS;Database=CasaBrinDB;Trusted_Connection=True;TrustServerCertificate=True;"
   ```
3. En la terminal integrada:
   ```bash
   cd src/CasaBrin.Api
   dotnet restore
   dotnet run
   ```
4. Queda arriba en **http://localhost:5080** y Swagger en **http://localhost:5080/swagger**.

> El puerto **5080** está fijo a propósito (en `Properties/launchSettings.json`) porque el frontend lo busca ahí.

## Credenciales iniciales
`admin` / `Admin123*`  (rol Admin)

## Pruebas
```bash
cd tests/CasaBrin.Api.Tests
dotnet test
```
Usan SQLite en memoria, **no tocan tu SQL Server**. Cubren cortes, ingresos, traslados, ajustes y anulaciones.

## Estructura
```
CasaBrin-Backend/
├── CasaBrin.sln
├── src/CasaBrin.Api/       # API: Controllers, Services, Entities, Dtos, Data, Auth
└── tests/CasaBrin.Api.Tests/
```

## Conexión desde la app móvil (opcional)
Si vas a usar el celular físico, corre el backend escuchando en toda la red y abre el puerto 5080 en el firewall:
```bash
dotnet run --urls "http://0.0.0.0:5080"
```
