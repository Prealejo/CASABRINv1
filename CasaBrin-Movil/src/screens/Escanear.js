import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Cylinder, Barcode, MapPin, Ruler, Scissors, StickyNote, Route, SwatchBook } from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros } from '../lib/format'
import Pantalla from '../components/Pantalla'
import { CampoCodigo } from '../components/Escaner'
import { Campo, Entrada } from '../components/campos'
import {
  Boton, Cargando, CodigoColorBadge, Dato, EstadoBadge, Mensaje, ProveedorTexto, Seccion, Tarjeta, UbicacionBadge,
} from '../components/ui'
import { C, R, S, T } from '../theme'

const RAPIDOS = [0.5, 1, 2, 3, 5, 10]

export default function Escanear() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [rollo, setRollo] = useState(null)
  const [metros, setMetros] = useState('')
  const [observacion, setObservacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [cortando, setCortando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [telaStock, setTelaStock] = useState(null)

  async function cargarStockTela(idTela) {
    try {
      const { data } = await api.get(`/telas/${idTela}`)
      setTelaStock(data.tela)
    } catch { setTelaStock(null) }
  }

  async function buscar(codigo) {
    setError(''); setResultado(null); setMetros(''); setObservacion(''); setTelaStock(null)
    setBuscando(true)
    try {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(codigo)}`)
      setRollo(data)
      cargarStockTela(data.idTela)
      if (data.estado !== 'Disponible') setError(`Este rollo está ${data.estado.toLowerCase()} y no se le puede cortar.`)
    } catch (e) {
      setRollo(null)
      setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  // Desde Inventario: /escanear?codigo=CB… carga el rollo directamente.
  useEffect(() => {
    if (!params.codigo) return undefined
    const t = setTimeout(() => buscar(String(params.codigo)), 0)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.codigo])

  const metrosNum = parseFloat(String(metros).replace(',', '.')) || 0
  const disponibles = Number(rollo?.metrosActuales || 0)
  const excede = rollo && metrosNum > disponibles
  const puedeCortar = rollo && rollo.estado === 'Disponible' && metrosNum > 0 && !excede

  async function cortar() {
    if (!puedeCortar || cortando) return
    setError(''); setCortando(true)
    try {
      const { data } = await api.post(`/rollos/${rollo.idRollo}/cortar`, { metros: metrosNum, observacion: observacion.trim() || null })
      setResultado(data)
      setRollo((r) => ({ ...r, metrosActuales: data.metrosDespues, estado: data.estado }))
      cargarStockTela(rollo.idTela)
      setMetros(''); setObservacion('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCortando(false)
    }
  }

  return (
    <Pantalla titulo="Escanear y cortar" subtitulo="Escanea la etiqueta del rollo con la cámara o escribe el código.">
      <Tarjeta>
        <CampoCodigo onBuscar={buscar} cargando={buscando} />
      </Tarjeta>

      <View style={{ height: S.lg }} />
      {buscando && <Cargando texto="Buscando rollo…" />}
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}
      {telaStock?.bajoStock && (
        <Mensaje tipo="alerta">
          Stock bajo: a {telaStock.nombre} le quedan {fmtMetros(telaStock.metrosTotales)} en total (mínimo {fmtMetros(telaStock.stockMinimo)}).
        </Mensaje>
      )}
      {resultado && (
        <Mensaje tipo="ok">
          Corte registrado: se sacaron {fmtMetros(resultado.metrosAntes - resultado.metrosDespues)}. Quedan {fmtMetros(resultado.metrosDespues)}{resultado.estado === 'Agotado' ? ' (ahora AGOTADO)' : ''}.
        </Mensaje>
      )}

      {rollo && !buscando && (
        <>
          <Tarjeta borde={C.brand600}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Cylinder size={18} color={C.brand600} strokeWidth={2} />
                <Text style={T.seccion}>Rollo escaneado</Text>
              </View>
              <EstadoBadge estado={rollo.estado} />
            </View>
            <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink }}>{rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Barcode size={14} color={C.gray500} />
              <Text style={{ fontFamily: 'monospace', color: C.gray700 }}>{rollo.codigoBarras}</Text>
            </View>
            {(rollo.codigoColor || rollo.proveedor) && (
              <Dato icono={SwatchBook} etiqueta="Color · proveedor">
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <CodigoColorBadge codigo={rollo.codigoColor} />
                  <ProveedorTexto nombre={rollo.proveedor} />
                </View>
              </Dato>
            )}
            <Dato icono={MapPin} etiqueta="Ubicación"><UbicacionBadge nombre={rollo.ubicacion} /></Dato>
            <Dato icono={Ruler} etiqueta="Metros disponibles" grande>{fmtMetros(rollo.metrosActuales)}</Dato>
            <Dato icono={Ruler} etiqueta="Metros iniciales">{fmtMetros(rollo.metrosIniciales)}</Dato>
            <Boton
              chico variante="fantasma" icono={Route} titulo="Ver trazabilidad del rollo"
              onPress={() => router.push(`/reportes?rollo=${encodeURIComponent(rollo.codigoBarras)}`)}
              style={{ alignSelf: 'flex-start', marginTop: S.sm, paddingHorizontal: 0 }}
            />
          </Tarjeta>

          <Seccion titulo="Cortar metros" icono={Scissors}>
            <Tarjeta>
              <Campo etiqueta="Metros a cortar" error={excede ? `Solo hay ${fmtMetros(disponibles)} disponibles.` : undefined}>
                <Entrada
                  icono={Ruler}
                  value={String(metros)}
                  onChangeText={(t) => setMetros(t.replace(/[^0-9.,]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="Ej. 3.5"
                  editable={rollo.estado === 'Disponible'}
                  error={excede}
                />
              </Campo>
              {rollo.estado === 'Disponible' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: S.lg }} accessibilityLabel="Metros rápidos">
                  {[...RAPIDOS.filter((m) => m <= disponibles), disponibles].map((m, i, arr) => {
                    const esTodo = i === arr.length - 1
                    const activo = metrosNum === m
                    return (
                      <Pressable
                        key={`${m}-${i}`}
                        onPress={() => setMetros(String(m))}
                        style={[{ paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
                          activo ? { backgroundColor: C.brand600, borderColor: C.brand600 } : { backgroundColor: C.white, borderColor: C.gray300 }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activo }}
                      >
                        <Text style={{ fontWeight: '700', color: activo ? C.white : C.gray700 }}>{esTodo ? `Todo (${fmtMetros(m)})` : fmtMetros(m)}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
              <Campo etiqueta="Observación (opcional)">
                <Entrada icono={StickyNote} value={observacion} onChangeText={setObservacion} placeholder="Ej. Venta mostrador" editable={rollo.estado === 'Disponible'} />
              </Campo>
              {metrosNum > 0 && !excede && (
                <View style={{ padding: 10, borderRadius: R.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: C.gray300, backgroundColor: C.gray50, marginBottom: S.md }} accessibilityLiveRegion="polite">
                  <Text style={{ textAlign: 'center', color: C.ink }}>
                    {fmtMetros(disponibles)} − <Text style={{ fontWeight: '800' }}>{fmtMetros(metrosNum)}</Text> = quedan <Text style={{ fontWeight: '800' }}>{fmtMetros(disponibles - metrosNum)}</Text>
                  </Text>
                </View>
              )}
              <Boton
                titulo={cortando ? 'Registrando corte…' : metrosNum > 0 ? `Cortar ${fmtMetros(metrosNum)}` : 'Cortar'}
                icono={Scissors} onPress={cortar} cargando={cortando} deshabilitado={!puedeCortar} bloque
              />
            </Tarjeta>
          </Seccion>
        </>
      )}
    </Pantalla>
  )
}
