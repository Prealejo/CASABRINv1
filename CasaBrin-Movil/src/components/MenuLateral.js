import { createContext, useContext, useEffect, useState } from 'react'
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname, useRouter } from 'expo-router'
import {
  LayoutDashboard, PackagePlus, Tag, Warehouse, ScanBarcode, ClipboardList, Users, LogOut, X,
} from 'lucide-react-native'
import { useAuth } from '../auth/AuthContext'
import { C, R, S } from '../theme'

// Mismo orden por etapas que la web: llega → se etiqueta → se mueve/corta → se controla.
export const GRUPOS = [
  { titulo: null, items: [{ ruta: '/', texto: 'Panel', Icono: LayoutDashboard }] },
  { titulo: '1. Recepción', items: [
    { ruta: '/ingreso', texto: 'Ingreso mercadería', Icono: PackagePlus },
    { ruta: '/etiquetas', texto: 'Etiquetas', Icono: Tag },
  ] },
  { titulo: '2. Operación', items: [
    { ruta: '/inventario', texto: 'Inventario y traslados', Icono: Warehouse },
    { ruta: '/escanear', texto: 'Escanear / Cortar', Icono: ScanBarcode },
  ] },
  { titulo: '3. Control', items: [{ ruta: '/reportes', texto: 'Movimientos y reporte', Icono: ClipboardList }] },
]
const ADMIN = { titulo: 'Administración', items: [{ ruta: '/usuarios', texto: 'Usuarios', Icono: Users }] }

const MenuContext = createContext({ abrir: () => {} })
export const useMenu = () => useContext(MenuContext)

export function MenuProvider({ children }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <MenuContext.Provider value={{ abrir: () => setAbierto(true) }}>
      {children}
      <MenuLateral abierto={abierto} onCerrar={() => setAbierto(false)} />
    </MenuContext.Provider>
  )
}

function MenuLateral({ abierto, onCerrar }) {
  const { user, esAdmin, logout } = useAuth()
  const router = useRouter()
  const ruta = usePathname()
  const insets = useSafeAreaInsets()
  const [x] = useState(() => new Animated.Value(-320))

  useEffect(() => {
    if (abierto) Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    else x.setValue(-320)
  }, [abierto, x])

  const grupos = esAdmin ? [...GRUPOS, ADMIN] : GRUPOS

  function ir(r) {
    onCerrar()
    if (r !== ruta) router.replace(r)
  }

  return (
    <Modal visible={abierto} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View
          style={[st.panel, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, transform: [{ translateX: x }] }]}
          accessibilityViewIsModal
        >
          <View style={st.marca}>
            <Image source={require('../../assets/logo-casabrin-h.png')} style={st.logo} resizeMode="contain" accessibilityLabel="Casa Brin, Telas y Telas" />
            <Pressable onPress={onCerrar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar menú">
              <X size={22} color={C.gray700} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: S.sm }}>
            {grupos.map((g, gi) => (
              <View key={g.titulo || gi} style={{ marginTop: gi ? 12 : 0 }}>
                {g.titulo && <Text style={st.grupo}>{g.titulo}</Text>}
                {g.items.map(({ ruta: r, texto, Icono }) => {
                  const activo = r === '/' ? ruta === '/' : ruta.startsWith(r)
                  return (
                    <Pressable
                      key={r}
                      onPress={() => ir(r)}
                      style={({ pressed }) => [st.item, (activo || pressed) && { backgroundColor: activo ? C.brand50 : C.gray100 }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                    >
                      {activo && <View style={st.barra} />}
                      <Icono size={20} color={activo ? C.brand600 : C.gray500} strokeWidth={1.9} />
                      <Text style={[st.itemTxt, activo && { color: C.brand700, fontWeight: '700' }]}>{texto}</Text>
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </ScrollView>

          <View style={st.pie}>
            <View style={st.usuario}>
              <View style={st.avatar}><Text style={st.avatarTxt}>{(user?.nombreCompleto || 'U')[0].toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.ink }} numberOfLines={1}>{user?.nombreCompleto}</Text>
                <Text style={{ fontSize: 12, color: C.inkFaint }}>{user?.rol}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => { onCerrar(); logout() }}
              style={({ pressed }) => [st.salir, pressed && { backgroundColor: C.gray100 }]}
              accessibilityRole="button"
            >
              <LogOut size={18} color={C.gray700} strokeWidth={1.9} />
              <Text style={{ fontWeight: '700', color: C.gray700 }}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </Animated.View>
        <Pressable style={st.fondo} onPress={onCerrar} accessibilityLabel="Cerrar menú" />
      </View>
    </Modal>
  )
}

const st = StyleSheet.create({
  panel: { width: 300, backgroundColor: C.white, paddingHorizontal: S.md, elevation: 8 },
  fondo: { flex: 1, backgroundColor: 'rgba(31,35,40,0.45)' },
  marca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  logo: { width: 170, height: 64 },
  grupo: { fontSize: 11, fontWeight: '800', color: C.gray500, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 12, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 12, borderRadius: R.sm },
  itemTxt: { fontSize: 15, color: C.gray700, fontWeight: '500' },
  barra: { position: 'absolute', left: -12, top: 10, bottom: 10, width: 3, borderRadius: 3, backgroundColor: C.brand600 },
  pie: { borderTopWidth: 1, borderTopColor: C.gray200, paddingTop: S.md, gap: S.md },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.white, fontWeight: '800' },
  salir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.gray300 },
})
