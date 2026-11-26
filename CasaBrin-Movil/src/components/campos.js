import { useState } from 'react'
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Eye, EyeOff, ChevronDown, Check, CircleAlert, Minus, Plus, X, Search, Calendar, Circle } from 'lucide-react-native'
import { C, R, S, CONTROL_H, T } from '../theme'
import { reglasContrasena } from '../lib/contrasena'

/* ------------------------------------------------------------------ Envoltura con etiqueta y error */
export function Campo({ etiqueta, requerido, error, ayuda, children, style }) {
  return (
    <View style={[{ marginBottom: S.lg }, style]}>
      {!!etiqueta && (
        <Text style={[T.etiqueta, { marginBottom: 6 }]}>
          {etiqueta}{requerido && <Text style={{ color: C.brand700 }}> *</Text>}
        </Text>
      )}
      {children}
      {error ? (
        <View style={[estilos.fila, { marginTop: 6 }]} accessibilityLiveRegion="polite">
          <CircleAlert size={14} color={C.brand700} strokeWidth={2} />
          <Text style={{ color: C.brand700, fontSize: 13, fontWeight: '500', flex: 1 }}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={[T.mini, { marginTop: 6 }]}>{ayuda}</Text>
      ) : null}
    </View>
  )
}

/* ------------------------------------------------------------------ Texto con icono */
export function Entrada({ icono: Icono, error, derecha, mono, style, ...props }) {
  const [foco, setFoco] = useState(false)
  return (
    <View style={[estilos.control, foco && estilos.controlFoco, error && estilos.controlError, props.editable === false && estilos.controlOff]}>
      {Icono && <Icono size={18} color={error ? C.brand600 : foco ? C.brand600 : C.gray500} strokeWidth={1.9} />}
      <TextInput
        placeholderTextColor={C.gray400}
        {...props}
        onFocus={(e) => { setFoco(true); props.onFocus?.(e) }}
        onBlur={(e) => { setFoco(false); props.onBlur?.(e) }}
        style={[estilos.input, mono && { fontFamily: 'monospace', letterSpacing: 0.5 }, style]}
      />
      {derecha}
    </View>
  )
}

/* ------------------------------------------------------------------ Contraseña con mostrar/ocultar */
export function EntradaClave(props) {
  const [visible, setVisible] = useState(false)
  return (
    <Entrada
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      derecha={(
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          accessibilityState={{ selected: visible }}
          style={{ padding: 4 }}
        >
          {visible ? <EyeOff size={20} color={C.brand700} strokeWidth={1.9} /> : <Eye size={20} color={C.gray500} strokeWidth={1.9} />}
        </Pressable>
      )}
    />
  )
}

/* ------------------------------------------------------------------ Selector (lista en hoja inferior) */
export function Selector({
  valor, opciones, onCambio, placeholder = 'Selecciona…', icono: Icono, titulo, error, buscable = false, deshabilitado,
}) {
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const sel = opciones.find((o) => String(o.valor) === String(valor))
  const lista = buscable && q.trim()
    ? opciones.filter((o) => `${o.texto} ${o.detalle || ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    : opciones

  return (
    <>
      <Pressable
        onPress={() => !deshabilitado && setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${titulo || placeholder}: ${sel ? sel.texto : 'sin seleccionar'}`}
        style={[estilos.control, error && estilos.controlError, deshabilitado && estilos.controlOff]}
      >
        {Icono && <Icono size={18} color={C.gray500} strokeWidth={1.9} />}
        <Text style={[estilos.input, { paddingVertical: 0 }, !sel && { color: C.gray400 }]} numberOfLines={1}>
          {sel ? sel.texto : placeholder}
        </Text>
        <ChevronDown size={18} color={C.gray500} strokeWidth={2} />
      </Pressable>

      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilos.fondo} onPress={() => setAbierto(false)} accessibilityLabel="Cerrar" />
        <View style={estilos.hoja}>
          <View style={estilos.hojaCab}>
            <Text style={T.seccion}>{titulo || placeholder}</Text>
            <Pressable onPress={() => setAbierto(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={22} color={C.gray700} />
            </Pressable>
          </View>
          {buscable && (
            <View style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}>
              <Entrada icono={Search} value={q} onChangeText={setQ} placeholder="Buscar…" autoFocus autoCorrect={false} />
            </View>
          )}
          <FlatList
            data={lista}
            keyExtractor={(o) => String(o.valor)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={{ padding: S.lg, color: C.inkFaint }}>Sin opciones.</Text>}
            renderItem={({ item }) => {
              const activo = String(item.valor) === String(valor)
              return (
                <Pressable
                  onPress={() => { onCambio(item.valor); setAbierto(false); setQ('') }}
                  style={({ pressed }) => [estilos.opcion, (pressed || activo) && { backgroundColor: C.brand50 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: C.ink, fontWeight: activo ? '700' : '500' }}>{item.texto}</Text>
                    {!!item.detalle && <Text style={T.mini}>{item.detalle}</Text>}
                  </View>
                  {activo && <Check size={18} color={C.brand600} strokeWidth={2.4} />}
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ Fecha (yyyy-mm-dd) */
const aIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

export function SelectorFecha({ valor, onCambio, placeholder = 'Elegir fecha', minimo }) {
  const [abierto, setAbierto] = useState(false)
  const texto = valor ? deIso(valor).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${placeholder}: ${texto || 'sin fecha'}`}
        style={estilos.control}
      >
        <Calendar size={18} color={C.gray500} strokeWidth={1.9} />
        <Text style={[estilos.input, { paddingVertical: 0 }, !valor && { color: C.gray400 }]}>{texto || placeholder}</Text>
        {!!valor && (
          <Pressable onPress={() => onCambio('')} hitSlop={10} accessibilityLabel="Quitar fecha">
            <X size={16} color={C.gray500} />
          </Pressable>
        )}
      </Pressable>
      {abierto && (
        <DateTimePicker
          value={valor ? deIso(valor) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimo ? deIso(minimo) : undefined}
          maximumDate={new Date()}
          onChange={(evento, fecha) => {
            setAbierto(Platform.OS === 'ios')
            if (evento.type === 'set' && fecha) onCambio(aIso(fecha))
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ Contador − / + */
export function Stepper({ valor, onCambio, min = 1, max = 999, etiqueta = 'cantidad' }) {
  const n = parseInt(valor, 10)
  const actual = Number.isFinite(n) ? n : min
  const cambiar = (d) => onCambio(String(Math.min(max, Math.max(min, actual + d))))
  return (
    <View style={[estilos.control, { paddingHorizontal: 0, overflow: 'hidden' }]}>
      <Pressable onPress={() => cambiar(-1)} disabled={actual <= min} style={[estilos.stepBtn, actual <= min && { opacity: 0.4 }]}
        accessibilityRole="button" accessibilityLabel={`Restar ${etiqueta}`}>
        <Minus size={18} color={C.gray700} strokeWidth={2.2} />
      </Pressable>
      <TextInput
        value={String(valor)}
        onChangeText={(t) => onCambio(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        style={[estilos.input, { textAlign: 'center', fontWeight: '700' }]}
        accessibilityLabel={etiqueta}
      />
      <Pressable onPress={() => cambiar(1)} disabled={actual >= max} style={[estilos.stepBtn, actual >= max && { opacity: 0.4 }]}
        accessibilityRole="button" accessibilityLabel={`Sumar ${etiqueta}`}>
        <Plus size={18} color={C.gray700} strokeWidth={2.2} />
      </Pressable>
    </View>
  )
}

/* ------------------------------------------------------------------ Requisitos de contraseña */
export function FuerzaContrasena({ clave, usuario }) {
  const reglas = reglasContrasena(clave, usuario).map((r) => ({ ...r, ok: Boolean(clave) && r.ok }))
  const cumplidas = reglas.filter((r) => r.ok).length
  const nivel = !clave ? 0 : cumplidas <= 2 ? 1 : cumplidas === 3 ? 2 : 3
  const colores = [C.gray200, C.brand600, C.warn700, C.ok700]
  return (
    <View style={{ marginTop: -8, marginBottom: S.lg }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: nivel >= i ? colores[nivel] : C.gray200 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 }}>
        {reglas.map((r) => (
          <View key={r.id} style={[estilos.fila, { width: '50%' }]}>
            {r.ok ? <Check size={14} color={C.ok700} strokeWidth={2.6} /> : <Circle size={10} color={C.gray400} strokeWidth={2} />}
            <Text style={{ fontSize: 12.5, color: r.ok ? C.ok700 : C.inkFaint, fontWeight: r.ok ? '600' : '400' }}>{r.texto}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/* ------------------------------------------------------------------ Selector segmentado */
export function Segmento({ opciones, valor, onCambio }) {
  return (
    <View style={estilos.segmento} accessibilityRole="tablist">
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambio(o.valor)}
            style={[estilos.segBtn, activo && estilos.segBtnActivo]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
          >
            {o.icono && <o.icono size={16} color={activo ? C.brand700 : C.gray600} strokeWidth={2} />}
            <Text style={{ fontWeight: '700', color: activo ? C.brand700 : C.gray600, fontSize: 14 }}>{o.texto}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  control: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: CONTROL_H,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray300, borderRadius: R.sm, paddingHorizontal: 12,
  },
  controlFoco: { borderColor: C.brand600, borderWidth: 1.5 },
  controlError: { borderColor: C.brand600 },
  controlOff: { backgroundColor: C.gray100 },
  input: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 10 },
  fondo: { flex: 1, backgroundColor: 'rgba(31,35,40,0.45)' },
  hoja: {
    backgroundColor: C.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '75%', paddingBottom: 24,
  },
  hojaCab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.lg },
  opcion: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  stepBtn: { width: CONTROL_H, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: C.gray50 },
  segmento: { flexDirection: 'row', backgroundColor: C.gray100, borderRadius: R.sm + 2, padding: 3, gap: 3, marginBottom: S.lg },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: R.sm },
  segBtnActivo: { backgroundColor: C.white, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
})
