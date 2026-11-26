import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { C, S, T } from '../theme'

/**
 * Hoja inferior (bottom sheet) para formularios y detalles: equivale a los modales de la web.
 * Cierra con el botón X, tocando el fondo o con el botón «atrás» de Android.
 */
export default function Hoja({ visible, titulo, icono: Icono, onCerrar, children, pie, alto = '90%' }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={st.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
        <View style={[st.hoja, { maxHeight: alto, paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
          <View style={st.asa} />
          <View style={st.cab}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {Icono && <Icono size={20} color={C.brand600} strokeWidth={2} />}
              <Text style={[T.seccion, { flex: 1 }]} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
            </View>
            <Pressable onPress={onCerrar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={22} color={C.gray700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {pie && <View style={st.pie}>{pie}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const st = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(31,35,40,0.5)' },
  hoja: { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 4, backgroundColor: C.gray300, marginTop: 8 },
  cab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: S.lg, paddingVertical: S.md },
  pie: { flexDirection: 'row', gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.gray200 },
})
