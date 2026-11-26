import { Stack } from 'expo-router'
import { MenuProvider } from '../../components/MenuLateral'

// Pantallas internas: se navega con el menú lateral (mismo orden por etapas que la web).
export default function AppLayout() {
  return (
    <MenuProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </MenuProvider>
  )
}
