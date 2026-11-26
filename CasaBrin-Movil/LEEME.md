# Casa Brin — App móvil (React Native + Expo SDK 58)

Aplicación Android del sistema de inventario textil. Usa **la misma API** que el panel web
(RF-15), así que no requiere cambios en el backend ni en la base de datos.

## Pantallas

Las mismas de la web, con el mismo menú por etapas:

| Etapa | Pantallas |
|---|---|
| — | Panel |
| 1. Recepción | Ingreso de mercadería · Etiquetas (impresión con el diálogo del sistema o PDF) |
| 2. Operación | Inventario y traslados · Escanear / Cortar (con la **cámara** como lector) |
| 3. Control | Movimientos y reporte (exportar CSV con «Compartir», imprimir) |
| Administración | Usuarios (solo Admin) |
| Acceso | Iniciar sesión · Recuperar contraseña (código de un solo uso) · Cambio obligatorio de clave temporal |

## 1. Preparar el backend para el celular

El celular no puede usar `localhost`: el backend debe escuchar en la red local.

```bash
cd CasaBrin-Backend/src/CasaBrin.Api
dotnet run --urls "http://0.0.0.0:5080"
```

La primera vez, Windows pedirá permiso en el firewall: acepta para **redes privadas**.
El celular y la PC deben estar en la **misma red WiFi**.

## 2. Configurar la dirección del backend

En `.env` (copia de `.env.example`) pon la IP de tu PC:

```
EXPO_PUBLIC_API_URL=http://192.168.100.95:5080/api
```

También se puede cambiar dentro de la app: en **Iniciar sesión → icono de engranaje → Probar y guardar**.
Para ver tu IP: `ipconfig` → «Dirección IPv4» del adaptador WiFi.

## 3. Probar en el celular con Expo Go

1. Instala **Expo Go** desde Play Store.
2. En esta carpeta:
   ```bash
   npm install
   npx expo start --lan
   ```
3. Escanea el código QR con Expo Go.

## 4. Generar el APK instalable (EAS Build, en la nube)

Necesitas una cuenta gratuita en https://expo.dev.

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Al terminar, EAS muestra un enlace y un QR para **descargar el `.apk`** e instalarlo en cualquier
Android (activa «Instalar apps de origen desconocido» si el celular lo pide).
La primera vez EAS pregunta si crea el *keystore* de firma: responde que sí.

> El APK permite HTTP hacia la IP local (`usesCleartextTraffic`), necesario mientras el backend
> corra en tu PC. Si publicas el backend en internet con HTTPS, cambia la dirección en la app.

## Comprobaciones

```bash
npx expo lint      # estilo y reglas de React
npx expo-doctor    # configuración y versiones compatibles con el SDK
```

## Estructura

```
CasaBrin-Movil/
├── app.json, eas.json, .env.example
├── assets/                 # icono, splash y logo
└── src/
    ├── app/                # rutas (Expo Router): login, recuperar, cambiar-contrasena, (app)/…
    ├── screens/            # las pantallas
    ├── components/         # botones, campos, hoja inferior, escáner, menú lateral…
    ├── api/client.js       # cliente HTTP (token JWT, errores, URL del servidor)
    ├── auth/AuthContext.js # sesión guardada en el almacenamiento seguro del celular
    └── lib/                # formatos, contraseñas, colores y etiquetas (compartidos con la web)
```
