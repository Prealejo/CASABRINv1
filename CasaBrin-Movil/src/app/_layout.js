import { ActivityIndicator, View } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../auth/AuthContext'
import { C } from '../theme'

// Rutas protegidas (Expo Router SDK 58): cada grupo solo es accesible si su condición se cumple.
function Navegacion() {
  const { user, cargando } = useAuth()
  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
        <ActivityIndicator size="large" color={C.brand600} />
      </View>
    )
  }
  const conSesion = !!user
  const claveTemporal = conSesion && !!user.debeCambiarContrasena
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Protected guard={!conSesion}>
        <Stack.Screen name="login" />
        <Stack.Screen name="recuperar" />
      </Stack.Protected>
      <Stack.Protected guard={claveTemporal}>
        <Stack.Screen name="cambiar-contrasena" />
      </Stack.Protected>
      <Stack.Protected guard={conSesion && !claveTemporal}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Navegacion />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
