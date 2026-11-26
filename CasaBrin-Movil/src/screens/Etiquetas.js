import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Printer, Cylinder, MapPin, CircleDot, Filter, Tag, Barcode, ArrowLeftRight } from 'lucide-react-native'
import { api } from '../api/client'
import CodigoBarras from '../components/CodigoBarras'
import { imprimirEtiquetas, subtituloEtiqueta } from '../lib/etiquetas'
import Pantalla from '../components/Pantalla'
import { Campo, Selector } from '../components/campos'
import { Boton, Cargando, Mensaje, Tarjeta, Vacio } from '../components/ui'
import { C, R, S, T } from '../theme'

export default function Etiquetas() {
  const router = useRouter()
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [rollos, setRollos] = useState([])
  const [filtros, setFiltros] = useState({ idTela: '', idUbicacion: '', estado: 'Disponible' })
  const [cargando, setCargando] = useState(true)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [t, u] = await Promise.all([api.get('/telas'), api.get('/catalogos/ubicaciones')])
        setTelas(t.data); setUbicaciones(u.data)
      } catch (e) { setError(e.message) }
    })()
  }, [])

  const obtener = useCallback((f) => api.get('/rollos', { params: {
    idTela: f.idTela || undefined, idUbicacion: f.idUbicacion || undefined, estado: f.estado || undefined,
  } })
    .then(({ data }) => { setRollos(data); setError('') })
    .catch((e) => setError(e.message))
    .finally(() => setCargando(false)), [])

  // Carga inicial con los filtros por defecto (rollos disponibles).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { obtener(filtros) }, [obtener])

  function cargar() {
    setCargando(true)
    obtener(filtros)
  }

  async function imprimir() {
    setImprimiendo(true); setError('')
    try { await imprimirEtiquetas(rollos) } catch (e) { setError(e.message) } finally { setImprimiendo(false) }
  }

  return (
    <Pantalla
      titulo="Etiquetas"
      subtitulo="Genera e imprime los códigos de barras de los rollos."
      acciones={<Boton titulo={imprimiendo ? 'Preparando…' : 'Imprimir'} icono={Printer} onPress={imprimir} cargando={imprimiendo} deshabilitado={!rollos.length} style={{ flex: 1 }} />}
    >
      <Tarjeta>
        <Campo etiqueta="Tela">
          <Selector valor={filtros.idTela} onCambio={(v) => setFiltros({ ...filtros, idTela: v })} icono={Cylinder} titulo="Tela" buscable
            opciones={[{ valor: '', texto: 'Todas' }, ...telas.map((t) => ({ valor: String(t.idTela), texto: `${t.codigo} · ${t.nombre}`, detalle: t.codigoColor ? `Color ${t.codigoColor}` : undefined }))]} />
        </Campo>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Campo etiqueta="Ubicación" style={{ flex: 1 }}>
            <Selector valor={filtros.idUbicacion} onCambio={(v) => setFiltros({ ...filtros, idUbicacion: v })} icono={MapPin} titulo="Ubicación"
              opciones={[{ valor: '', texto: 'Todas' }, ...ubicaciones.map((u) => ({ valor: String(u.idUbicacion), texto: u.nombre }))]} />
          </Campo>
          <Campo etiqueta="Estado" style={{ flex: 1 }}>
            <Selector valor={filtros.estado} onCambio={(v) => setFiltros({ ...filtros, estado: v })} icono={CircleDot} titulo="Estado"
              opciones={[{ valor: '', texto: 'Todos' }, { valor: 'Disponible', texto: 'Disponible' }, { valor: 'Agotado', texto: 'Agotado' }, { valor: 'Anulado', texto: 'Anulado' }]} />
          </Campo>
        </View>
        <Boton titulo="Aplicar filtros" icono={Filter} variante="secundario" onPress={() => cargar()} bloque />
      </Tarjeta>

      <View style={{ height: S.lg }} />
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}

      {cargando ? <Cargando texto="Cargando rollos…" /> : rollos.length === 0 ? (
        <Tarjeta><Vacio icono={Tag} titulo="Sin etiquetas">No hay rollos con esos filtros.</Vacio></Tarjeta>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.sm }}>
            <Barcode size={14} color={C.inkSoft} />
            <Text style={T.chico}>{rollos.length} etiqueta{rollos.length !== 1 ? 's' : ''} lista{rollos.length !== 1 ? 's' : ''} para imprimir.</Text>
          </View>
          <Boton chico variante="info" icono={ArrowLeftRight} titulo="Trasladar desde Inventario" onPress={() => router.push('/inventario')} style={{ alignSelf: 'flex-start', marginBottom: S.md }} />
          {rollos.map((r) => (
            <View key={r.idRollo} style={{ backgroundColor: C.white, borderWidth: 1, borderStyle: 'dashed', borderColor: C.gray300, borderRadius: R.sm, padding: S.md, marginBottom: S.sm, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: '#000' }}>{r.telaNombre}</Text>
              <Text style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>{subtituloEtiqueta(r)}</Text>
              <CodigoBarras idRollo={r.idRollo} codigo={r.codigoBarras} />
              <Text style={{ fontFamily: 'monospace', fontWeight: '700', marginTop: 4 }}>{r.codigoBarras}</Text>
            </View>
          ))}
        </>
      )}
    </Pantalla>
  )
}
