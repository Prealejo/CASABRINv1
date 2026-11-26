import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Menu } from 'lucide-react-native'
import { useMenu } from './MenuLateral'
import { C, S, T } from '../theme'

/**
 * Marco común de las pantallas internas: cabecera con botón de menú, título y
 * subtítulo, acciones opcionales y contenido desplazable con «deslizar para actualizar».
 */
export default function Pantalla({ titulo, subtitulo, acciones, children, onRefrescar, refrescando = false, desplazable = true, pie }) {
  const { abrir } = useMenu()
  const insets = useSafeAreaInsets()

  const contenido = (
    <>
      <View style={st.cabTexto}>
        <Text style={T.titulo} accessibilityRole="header">{titulo}</Text>
        {!!subtitulo && <Text style={[T.subtitulo, { marginTop: 2 }]}>{subtitulo}</Text>}
      </View>
      {acciones && <View style={st.acciones}>{acciones}</View>}
      {children}
    </>
  )

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <View style={[st.barra, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={abrir} hitSlop={10} style={st.menuBtn} accessibilityRole="button" accessibilityLabel="Abrir menú">
          <Menu size={24} color={C.ink} strokeWidth={2} />
        </Pressable>
        <Text style={st.barraTitulo} numberOfLines={1}>Casa Brin</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {desplazable ? (
          <ScrollView
            contentContainerStyle={[st.cuerpo, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefrescar ? <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} colors={[C.brand600]} tintColor={C.brand600} /> : undefined}
          >
            {contenido}
          </ScrollView>
        ) : (
          <View style={[st.cuerpo, { flex: 1 }]}>{contenido}</View>
        )}
        {pie}
      </KeyboardAvoidingView>
    </View>
  )
}

const st = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.sm, paddingBottom: 6,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray200,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barraTitulo: { fontSize: 17, fontWeight: '800', color: C.brand600 },
  cuerpo: { padding: S.lg },
  cabTexto: { marginBottom: S.md },
  acciones: { flexDirection: 'row', gap: S.sm, flexWrap: 'wrap', marginBottom: S.lg },
})
