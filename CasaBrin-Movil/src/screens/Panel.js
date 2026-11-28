import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Layers, Cylinder, Ruler, TriangleAlert, PackagePlus, History, Warehouse, Store } from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros, fmtNum, fmtFecha } from '../lib/format'
import Pantalla from '../components/Pantalla'
import { Boton, Esqueleto, Mensaje, Seccion, Tarjeta, TipoMovimiento, Vacio, Badge, Paginacion } from '../components/ui'
import { C, R, S, T } from '../theme'

const POR_PAGINA = 7   // movimientos por página

function Indicador({ icono: Icono, etiqueta, valor, alerta, children, onPress }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[st.kpi, alerta && { borderColor: C.warn200 }]} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={[st.kpiIcono, alerta && { backgroundColor: C.warn50 }]}>
        <Icono size={18} color={alerta ? C.warn700 : C.brand600} strokeWidth={1.9} />
      </View>
      <Text style={T.chico}>{etiqueta}</Text>
      <Text style={[st.kpiValor, alerta && { color: C.warn700 }]}>{valor}</Text>
      {children}
    </Pressable>
  )
}

export default function Panel() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [refrescando, setRefrescando] = useState(false)
  const [movs, setMovs] = useState(null)   // { items, total } de la página actual
  const [pagina, setPagina] = useState(1)

  const cargarMovs = useCallback((p) => api.get('/reportes/movimientos', { params: { page: p, pageSize: POR_PAGINA } })
    .then(({ data }) => setMovs(data))
    .catch((e) => setError(e.message)), [])

  const cargar = useCallback(() => Promise.all([
    api.get('/reportes/dashboard').then(({ data }) => { setData(data); setError('') }),
    cargarMovs(pagina),
  ]).catch((e) => setError(e.message)), [cargarMovs, pagina])

  useEffect(() => { cargar() }, [cargar])

  async function refrescar() {
    setRefrescando(true)
    await cargar()
    setRefrescando(false)
  }

  return (
    <Pantalla
      titulo="Panel general"
      subtitulo="Resumen del inventario textil de Casa Brin."
      onRefrescar={refrescar}
      refrescando={refrescando}
      acciones={<Boton titulo="Ingresar mercadería" icono={PackagePlus} onPress={() => router.push('/ingreso')} style={{ flex: 1 }} />}
    >
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}

      <View style={st.kpis}>
        {!data ? [0, 1, 2, 3].map((i) => <View key={i} style={st.kpi}><Esqueleto alto={64} /></View>) : (
          <>
            <Indicador icono={Layers} etiqueta="Telas registradas" valor={fmtNum(data.totalTelas)} />
            <Indicador icono={Cylinder} etiqueta="Rollos disponibles" valor={fmtNum(data.totalRollosDisponibles)} />
            <Indicador icono={Ruler} etiqueta="Metros en stock" valor={fmtMetros(data.metrosTotales)}>
              <View style={{ gap: 4, marginTop: 4 }}>
                <Badge texto={`Bodega ${fmtMetros(data.metrosBodega)}`} icono={Warehouse} bg={C.gray100} borde={C.gray300} color={C.ink} />
                <Badge texto={`Local ${fmtMetros(data.metrosLocal)}`} icono={Store} bg={C.brand50} borde={C.brand200} color={C.brand700} />
              </View>
            </Indicador>
            <Indicador
              icono={TriangleAlert}
              etiqueta="Alertas de stock"
              valor={fmtNum(data.alertasBajoStock)}
              alerta={data.alertasBajoStock > 0}
              onPress={data.alertasBajoStock > 0 ? () => router.push('/reportes') : undefined}
            >
              <Text style={[T.mini, data.alertasBajoStock > 0 && { color: C.brand700, fontWeight: '600' }]}>
                {data.alertasBajoStock > 0 ? 'Ver telas bajo mínimo ›' : 'Todo sobre el mínimo'}
              </Text>
            </Indicador>
          </>
        )}
      </View>

      <Seccion
        titulo="Últimos movimientos"
        icono={History}
        accion={<Boton chico variante="fantasma" titulo="Ver todo" onPress={() => router.push('/reportes')} />}
      >
        <Tarjeta style={{ padding: 0 }}>
          {!movs ? (
            <View style={{ padding: S.lg, gap: 10 }}>{[0, 1, 2].map((i) => <Esqueleto key={i} alto={44} />)}</View>
          ) : !movs.items.length ? (
            <Vacio icono={History}>Aún no hay movimientos registrados.</Vacio>
          ) : movs.items.map((m, i) => (
            <Pressable
              key={m.idMovimiento}
              onPress={() => router.push(`/reportes?rollo=${encodeURIComponent(m.codigoBarras)}`)}
              style={({ pressed }) => [st.mov, i > 0 && st.movBorde, pressed && { backgroundColor: C.gray50 }]}
              accessibilityRole="button"
              accessibilityLabel={`${m.tipo} de ${fmtMetros(m.metros)} en ${m.tela}, rollo ${m.codigoBarras}. Ver historial`}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TipoMovimiento tipo={m.tipo} />
                  <Text style={{ fontWeight: '600', color: C.ink, flexShrink: 1 }} numberOfLines={1}>{m.tela}</Text>
                </View>
                <Text style={T.mini}>{fmtFecha(m.fecha)} · <Text style={{ fontFamily: 'monospace', color: C.brand700 }}>{m.codigoBarras}</Text></Text>
              </View>
              <Text style={{ fontWeight: '800', color: C.ink, fontFamily: 'monospace' }}>{fmtMetros(m.metros)}</Text>
            </Pressable>
          ))}
        </Tarjeta>
        {movs && <Paginacion pagina={pagina} total={movs.total} porPagina={POR_PAGINA} onCambiar={setPagina} unidad="movimientos" />}
      </Seccion>
    </Pantalla>
  )
}

const st = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  kpi: { width: '48.6%', backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200, padding: S.md, gap: 2 },
  kpiIcono: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  kpiValor: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  mov: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md },
  movBorde: { borderTopWidth: 1, borderTopColor: C.gray100 },
})
