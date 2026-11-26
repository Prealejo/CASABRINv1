import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as Clipboard from 'expo-clipboard'
import * as Print from 'expo-print'
import { KeyRound, Copy, Check, Printer, TriangleAlert } from 'lucide-react-native'
import { C, R, S } from '../theme'
import { Boton } from './ui'

/** Estructura de las pantallas de acceso: banda roja con el logo y panel blanco con el formulario. */
export function AccesoLayout({ children }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
          <View style={[st.banda, { paddingTop: insets.top + 28 }]}>
            {/* Trama textil sencilla: hilos horizontales y verticales en el rojo de la marca */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {Array.from({ length: 14 }).map((_, i) => (
                <View key={`h${i}`} style={[st.hilo, { top: i * 18, left: 0, right: 0, height: 6 }]} />
              ))}
              {Array.from({ length: 30 }).map((_, i) => (
                <View key={`v${i}`} style={[st.hiloV, { left: i * 18, top: 0, bottom: 0, width: 6 }]} />
              ))}
            </View>
            <View style={st.logoCaja}>
              <Image source={require('../../assets/logo-casabrin-h.png')} style={st.logo} resizeMode="contain" accessibilityLabel="Casa Brin, Telas y Telas" />
            </View>
          </View>
          <View style={st.panel}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

/** Muestra un código de recuperación recién generado (se ve una sola vez): copiar o imprimir. */
export function CodigoRecuperacion({ codigo, usuario }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await Clipboard.setStringAsync(codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function imprimir() {
    const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    await Print.printAsync({
      html: `<html><body style="font-family:sans-serif;padding:24px">
        <div style="border:2px dashed #c8151c;border-radius:12px;padding:20px;max-width:380px">
        <h3 style="margin:0 0 6px;color:#a51117">Casa Brin — Código de recuperación</h3>
        <p>Usuario: <b>${esc(usuario)}</b></p>
        <p style="font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:2px">${esc(codigo)}</p>
        <p style="font-size:13px">Úsalo en «¿Olvidaste tu contraseña?». Sirve una sola vez. Guárdalo en un lugar seguro.</p>
        </div></body></html>`,
    })
  }

  return (
    <View style={st.codigo}>
      <View style={st.fila}>
        <KeyRound size={16} color={C.gray700} strokeWidth={2} />
        <Text style={{ color: C.gray700 }}>Código de recuperación{usuario ? ` de ${usuario}` : ''}</Text>
      </View>
      <Text selectable style={st.codigoValor} accessibilityLabel={`Código ${codigo.split('').join(' ')}`}>{codigo}</Text>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Boton chico variante="secundario" icono={copiado ? Check : Copy} titulo={copiado ? 'Copiado' : 'Copiar'} onPress={copiar} style={{ flex: 1 }} />
        <Boton chico variante="secundario" icono={Printer} titulo="Imprimir" onPress={imprimir} style={{ flex: 1 }} />
      </View>
      <View style={[st.fila, { marginTop: S.md }]}>
        <TriangleAlert size={14} color={C.warn700} strokeWidth={2} />
        <Text style={{ fontSize: 12.5, color: C.warn700, flex: 1 }}>Solo se muestra ahora. Sirve una vez y reemplaza al código anterior.</Text>
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  banda: { backgroundColor: '#b3141a', paddingBottom: 36, alignItems: 'center', overflow: 'hidden' },
  hilo: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.08)' },
  hiloV: { position: 'absolute', backgroundColor: 'rgba(110,8,12,0.35)' },
  logoCaja: { backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, elevation: 6, shadowColor: '#300', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  logo: { width: 220, height: 104 },
  panel: { flex: 1, backgroundColor: C.white, marginTop: -18, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: S.xl, paddingTop: S.xl + 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codigo: { borderWidth: 2, borderStyle: 'dashed', borderColor: C.brand200, backgroundColor: C.brand50, borderRadius: R.lg, padding: S.lg, alignItems: 'center', gap: S.sm },
  codigoValor: { fontFamily: 'monospace', fontSize: 26, fontWeight: '800', letterSpacing: 2, color: C.brand800, marginVertical: 6 },
})
