import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  Layers, Cylinder, Ruler, TriangleAlert, PackagePlus, Tag, ArrowLeftRight, Scissors, ClipboardList,
  History, Workflow, ChevronRight, Warehouse, Store,
} from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros, fmtNum, fmtFecha } from '../lib/format'
import Pantalla from '../components/Pantalla'
import { Boton, Esqueleto, Mensaje, Seccion, Tarjeta, TipoMovimiento, Vacio, Badge } from '../components/ui'
import { C, R, S, T } from '../theme'

const FLUJO = [
  { ruta: '/ingreso', titulo: 'Recibir', Icono: PackagePlus, desc: 'Registra la tela y sus rollos.' },
  { ruta: '/etiquetas', titulo: 'Etiquetar', Icono: Tag, desc: 'Imprime el código de cada rollo.' },
  { ruta: '/inventario', titulo: 'Trasladar', Icono: ArrowLeftRight, desc: 'Mueve a Local lo que sale a venta.' },
  { ruta: '/escanear', titulo: 'Cortar', Icono: Scissors, desc: 'Escanea y descuenta metros.' },
  { ruta: '/reportes', titulo: 'Revisar', Icono: ClipboardList, desc: 'Consulta y exporta el historial.' },
]

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

  const cargar = useCallback(() => api.get('/reportes/dashboard')
    .then(({ data }) => { setData(data); setError('') })
    .catch((e) => setError(e.message)), [])

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

      <Seccion titulo="Proceso de un rollo" icono={Workflow}>
        <Tarjeta style={{ padding: 0 }}>
          {FLUJO.map(({ ruta, titulo, Icono, desc }, i) => (
            <Pressable
              key={ruta}
              onPress={() => router.push(ruta)}
              style={({ pressed }) => [st.paso, i < FLUJO.length - 1 && st.pasoBorde, pressed && { backgroundColor: C.brand50 }]}
              accessibilityRole="button"
              accessibilityLabel={`Paso ${i + 1}: ${titulo}. ${desc}`}
            >
              <View style={st.pasoNum}><Text style={{ color: C.white, fontWeight: '800', fontSize: 12 }}>{i + 1}</Text></View>
              <Icono size={18} color={C.brand600} strokeWidth={1.9} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.ink }}>{titulo}</Text>
                <Text style={T.mini}>{desc}</Text>
              </View>
              <ChevronRight size={18} color={C.gray400} />
            </Pressable>
          ))}
        </Tarjeta>
      </Seccion>

      <Seccion
        titulo="Últimos movimientos"
        icono={History}
        accion={<Boton chico variante="fantasma" titulo="Ver todo" onPress={() => router.push('/reportes')} />}
      >
        <Tarjeta style={{ padding: 0 }}>
          {!data ? (
            <View style={{ padding: S.lg, gap: 10 }}>{[0, 1, 2].map((i) => <Esqueleto key={i} alto={44} />)}</View>
          ) : !data.ultimosMovimientos?.length ? (
            <Vacio icono={History}>Aún no hay movimientos registrados.</Vacio>
          ) : data.ultimosMovimientos.map((m, i) => (
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
      </Seccion>
    </Pantalla>
  )
}

const st = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  kpi: { width: '48.6%', backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200, padding: S.md, gap: 2 },
  kpiIcono: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  kpiValor: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: S.md },
  pasoBorde: { borderBottomWidth: 1, borderBottomColor: C.gray100 },
  pasoNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' },
  mov: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md },
  movBorde: { borderTopWidth: 1, borderTopColor: C.gray100 },
})
