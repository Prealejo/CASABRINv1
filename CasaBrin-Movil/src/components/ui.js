import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useEffect, useState } from 'react'
import {
  CircleCheck, CircleMinus, Ban, Warehouse, Store, MapPin, TriangleAlert, PackagePlus, Scissors,
  ArrowLeftRight, SlidersHorizontal, CircleAlert, Info, SwatchBook, Truck, Inbox, PackageX,
} from 'lucide-react-native'
import { C, R, S, CONTROL_H, T } from '../theme'

/* ------------------------------------------------------------------ Botón */
const VARIANTES = {
  primario: { bg: C.brand600, borde: C.brand600, txt: C.white, bgP: C.brand700 },
  secundario: { bg: C.white, borde: C.gray300, txt: C.ink, bgP: C.gray100 },
  fantasma: { bg: 'transparent', borde: 'transparent', txt: C.gray700, bgP: C.gray100 },
  peligro: { bg: C.white, borde: C.brand200, txt: C.brand700, bgP: C.brand50 },
  info: { bg: C.info50, borde: C.info200, txt: C.info700, bgP: '#e2e9f6' },
}

export function Boton({
  titulo, onPress, icono: Icono, variante = 'primario', chico = false, bloque = false,
  cargando = false, deshabilitado = false, accessibilityLabel, style,
}) {
  const v = VARIANTES[variante]
  const off = deshabilitado || cargando
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || titulo}
      accessibilityState={{ disabled: off, busy: cargando }}
      hitSlop={chico ? 6 : 0}
      style={({ pressed }) => [
        st.boton,
        { backgroundColor: pressed ? v.bgP : v.bg, borderColor: v.borde, height: chico ? 38 : CONTROL_H },
        chico && { paddingHorizontal: 12 },
        bloque && { alignSelf: 'stretch' },
        !titulo && { width: chico ? 38 : CONTROL_H, paddingHorizontal: 0 },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {cargando
        ? <ActivityIndicator color={v.txt} size="small" />
        : Icono && <Icono size={chico ? 16 : 18} color={v.txt} strokeWidth={2} />}
      {!!titulo && <Text style={[st.botonTxt, { color: v.txt, fontSize: chico ? 14 : 15 }]} numberOfLines={1}>{titulo}</Text>}
    </Pressable>
  )
}

/* ------------------------------------------------------------------ Tarjeta */
export function Tarjeta({ children, style, borde }) {
  return <View style={[st.tarjeta, borde && { borderTopWidth: 3, borderTopColor: borde }, style]}>{children}</View>
}

export function Seccion({ titulo, icono: Icono, accion, children, style }) {
  return (
    <View style={[{ marginTop: S.xl }, style]}>
      <View style={st.seccionCab}>
        <View style={st.fila}>
          {Icono && <Icono size={18} color={C.brand600} strokeWidth={2} />}
          <Text style={T.seccion}>{titulo}</Text>
        </View>
        {accion}
      </View>
      {children}
    </View>
  )
}

/* ------------------------------------------------------------------ Mensajes */
const MSG = {
  error: { bg: C.brand50, borde: C.brand200, txt: C.brand700, Icono: CircleAlert },
  ok: { bg: C.ok50, borde: C.ok200, txt: C.ok700, Icono: CircleCheck },
  info: { bg: C.info50, borde: C.info200, txt: C.info700, Icono: Info },
  alerta: { bg: C.warn50, borde: C.warn200, txt: C.warn700, Icono: TriangleAlert },
}
export function Mensaje({ tipo = 'info', children, style }) {
  const m = MSG[tipo]
  return (
    <View
      style={[st.msg, { backgroundColor: m.bg, borderColor: m.borde }, style]}
      accessibilityRole={tipo === 'error' || tipo === 'alerta' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <m.Icono size={18} color={m.txt} strokeWidth={2} />
      <Text style={{ color: m.txt, flex: 1, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  )
}

export function Vacio({ icono: Icono = Inbox, titulo, children, accion }) {
  return (
    <View style={st.vacio}>
      <View style={st.vacioIcono}><Icono size={24} color={C.gray500} strokeWidth={1.75} /></View>
      {!!titulo && <Text style={{ fontWeight: '700', color: C.gray700, fontSize: 15 }}>{titulo}</Text>}
      {!!children && <Text style={{ color: C.inkFaint, textAlign: 'center', fontSize: 14 }}>{children}</Text>}
      {accion && <View style={{ marginTop: S.md }}>{accion}</View>}
    </View>
  )
}

/* ------------------------------------------------------------------ Esqueleto de carga */
export function Esqueleto({ alto = 16, ancho = '100%', radio = 6, style }) {
  const [op] = useState(() => new Animated.Value(0.5))
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.5, duration: 650, useNativeDriver: true }),
    ]))
    a.start()
    return () => a.stop()
  }, [op])
  return <Animated.View style={[{ height: alto, width: ancho, borderRadius: radio, backgroundColor: C.gray200, opacity: op }, style]} />
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <View style={st.vacio} accessibilityLiveRegion="polite">
      <ActivityIndicator color={C.brand600} />
      <Text style={{ color: C.inkFaint }}>{texto}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ Badges */
export function Badge({ texto, icono: Icono, bg, borde, color }) {
  return (
    <View style={[st.badge, { backgroundColor: bg, borderColor: borde }]}>
      {Icono && <Icono size={12} color={color} strokeWidth={2.2} />}
      <Text style={[st.badgeTxt, { color }]} numberOfLines={1}>{texto}</Text>
    </View>
  )
}

const ESTADOS = {
  disponible: { bg: C.ok50, borde: C.ok200, color: C.ok700, icono: CircleCheck },
  agotado: { bg: C.gray100, borde: C.gray200, color: C.gray700, icono: CircleMinus },
  anulado: { bg: C.brand50, borde: C.brand200, color: C.brand700, icono: Ban },
}
export function EstadoBadge({ estado }) {
  const e = ESTADOS[(estado || '').toLowerCase()] || ESTADOS.agotado
  return <Badge texto={estado} {...e} />
}

export function iconoUbicacion(nombre) {
  const n = (nombre || '').toLowerCase()
  if (n.includes('bodega')) return Warehouse
  if (n.includes('local')) return Store
  return MapPin
}
export function UbicacionBadge({ nombre }) {
  const n = (nombre || '').toLowerCase()
  const esLocal = n.includes('local')
  return (
    <Badge
      texto={nombre}
      icono={iconoUbicacion(nombre)}
      bg={esLocal ? C.brand50 : C.gray100}
      borde={esLocal ? C.brand200 : C.gray300}
      color={esLocal ? C.brand700 : C.ink}
    />
  )
}

export function CodigoColorBadge({ codigo }) {
  if (!codigo) return null
  return <Badge texto={codigo} icono={SwatchBook} bg={C.info50} borde={C.info200} color={C.info700} />
}

export function ProveedorTexto({ nombre }) {
  if (!nombre) return null
  return (
    <View style={st.fila} accessibilityLabel={`Proveedor ${nombre}`}>
      <Truck size={13} color={C.gray500} strokeWidth={2} />
      <Text style={{ fontSize: 13, color: C.gray700 }}>{nombre}</Text>
    </View>
  )
}

export function StockBadge({ estado }) {
  if (estado === 'sin') return <Badge texto="Sin stock" icono={PackageX} bg={C.gray100} borde={C.gray300} color={C.gray700} />
  if (estado === 'bajo') return <Badge texto="Stock bajo" icono={TriangleAlert} bg={C.warn50} borde={C.warn200} color={C.warn700} />
  return null
}

const TIPOS = {
  Ingreso: { icono: PackagePlus, bg: C.ok50, borde: C.ok200, color: C.ok700 },
  Salida: { icono: Scissors, bg: C.brand50, borde: C.brand200, color: C.brand700 },
  Traslado: { icono: ArrowLeftRight, bg: C.info50, borde: C.info200, color: C.info700 },
  Ajuste: { icono: SlidersHorizontal, bg: C.warn50, borde: C.warn200, color: C.warn700 },
  Anulacion: { icono: Ban, bg: C.gray100, borde: C.gray200, color: C.gray700 },
}
export function TipoMovimiento({ tipo }) {
  const t = TIPOS[tipo] || TIPOS.Anulacion
  return <Badge texto={tipo} {...t} />
}

/* ------------------------------------------------------------------ Dato (etiqueta + valor) */
export function Dato({ icono: Icono, etiqueta, children, grande }) {
  return (
    <View style={st.dato}>
      <View style={st.fila}>
        {Icono && <Icono size={15} color={C.gray500} strokeWidth={2} />}
        <Text style={{ color: C.inkSoft, fontSize: 14 }}>{etiqueta}</Text>
      </View>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
        {typeof children === 'string' || typeof children === 'number'
          ? <Text style={{ fontWeight: grande ? '800' : '600', fontSize: grande ? 18 : 15, color: C.ink }}>{children}</Text>
          : children}
      </View>
    </View>
  )
}

export const st = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: R.sm, borderWidth: 1, paddingHorizontal: 16,
  },
  botonTxt: { fontWeight: '700' },
  tarjeta: { backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200, padding: S.lg },
  seccionCab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md, gap: S.sm },
  msg: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: R.sm, borderWidth: 1, marginBottom: S.md, alignItems: 'flex-start' },
  vacio: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 16 },
  vacioIcono: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.gray100, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  badgeTxt: { fontSize: 12, fontWeight: '700' },
  dato: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
})
