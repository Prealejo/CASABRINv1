import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { ArrowLeftRight, ArrowRight, Barcode, MapPin, MapPinned, Ruler, StickyNote, RefreshCw, Cylinder } from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros } from '../lib/format'
import Hoja from './Hoja'
import { CampoCodigo } from './Escaner'
import { Campo, Entrada, Selector } from './campos'
import {
  Boton, Cargando, CodigoColorBadge, Dato, EstadoBadge, Mensaje, ProveedorTexto, UbicacionBadge, iconoUbicacion,
} from './ui'
import { C, R, S, T } from '../theme'

/**
 * Traslado de un rollo entre Bodega y Local (ventana emergente de Inventario, como en la web).
 * Con `codigoInicial` carga ese rollo; sin él muestra el campo de escaneo.
 */
export default function TrasladoHoja({ visible, codigoInicial, ubicaciones, onCerrar, onTrasladado }) {
  const [rollo, setRollo] = useState(null)
  const [destino, setDestino] = useState('')
  const [observacion, setObservacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [trasladando, setTrasladando] = useState(false)
  const [error, setError] = useState('')

  // Cada vez que se abre (o cambia el rollo indicado) la hoja empieza limpia.
  const clave = visible ? `abierta|${codigoInicial || ''}` : 'cerrada'
  const [claveAnterior, setClaveAnterior] = useState(clave)
  if (clave !== claveAnterior) {
    setClaveAnterior(clave)
    setRollo(null); setDestino(''); setObservacion(''); setError('')
  }

  useEffect(() => {
    if (!visible || !codigoInicial) return undefined
    const t = setTimeout(() => buscar(codigoInicial), 0)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, codigoInicial])

  async function buscar(codigo) {
    setError(''); setDestino(''); setBuscando(true)
    try {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(codigo)}`)
      setRollo(data)
      if (data.estado === 'Anulado') setError('Este rollo está anulado y no se puede trasladar.')
      else {
        const otras = ubicaciones.filter((u) => u.idUbicacion !== data.idUbicacion)
        if (otras.length === 1) setDestino(String(otras[0].idUbicacion))
      }
    } catch (e) {
      setRollo(null); setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  async function confirmar() {
    if (!rollo || !destino || trasladando) return
    setError(''); setTrasladando(true)
    try {
      const { data } = await api.post(`/rollos/${rollo.idRollo}/trasladar`, {
        idUbicacionDestino: Number(destino), observacion: observacion.trim() || null,
      })
      const nombre = ubicaciones.find((u) => u.idUbicacion === Number(destino))?.nombre || ''
      onTrasladado?.(data, nombre)
    } catch (e) {
      setError(e.message)
    } finally {
      setTrasladando(false)
    }
  }

  const destinos = ubicaciones.filter((u) => !rollo || u.idUbicacion !== rollo.idUbicacion)
  const nombreDestino = ubicaciones.find((u) => String(u.idUbicacion) === String(destino))?.nombre
  const IconoDestino = nombreDestino ? iconoUbicacion(nombreDestino) : ArrowLeftRight
  const bloqueado = !rollo || rollo.estado === 'Anulado'

  return (
    <Hoja
      visible={visible}
      titulo="Trasladar rollo"
      icono={ArrowLeftRight}
      onCerrar={() => !trasladando && onCerrar()}
      pie={rollo ? (
        <>
          <Boton titulo="Cancelar" variante="secundario" onPress={onCerrar} deshabilitado={trasladando} />
          <Boton
            titulo={trasladando ? 'Trasladando…' : nombreDestino ? `Confirmar traslado a ${nombreDestino}` : 'Confirmar traslado'}
            icono={IconoDestino} onPress={confirmar} cargando={trasladando} deshabilitado={bloqueado || !destino} style={{ flex: 1 }}
          />
        </>
      ) : null}
    >
      {!rollo && !buscando && <CampoCodigo onBuscar={buscar} />}
      {buscando && <Cargando texto="Buscando rollo…" />}
      {!!error && <Mensaje tipo="error" style={{ marginTop: S.md }}>{error}</Mensaje>}

      {rollo && !buscando && (
        <>
          <View style={{ borderWidth: 1, borderColor: C.gray200, borderTopWidth: 3, borderTopColor: C.brand600, borderRadius: R.sm, padding: S.md, marginBottom: S.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Cylinder size={20} color={C.brand600} strokeWidth={1.9} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Barcode size={13} color={C.gray500} /><Text style={{ fontFamily: 'monospace', color: C.gray700 }}>{rollo.codigoBarras}</Text>
                  </View>
                  <CodigoColorBadge codigo={rollo.codigoColor} />
                  <ProveedorTexto nombre={rollo.proveedor} />
                </View>
              </View>
              <EstadoBadge estado={rollo.estado} />
            </View>
            <Dato icono={MapPin} etiqueta="Ubicación actual"><UbicacionBadge nombre={rollo.ubicacion} /></Dato>
            <Dato icono={Ruler} etiqueta="Metros disponibles" grande>{fmtMetros(rollo.metrosActuales)}</Dato>
            {!codigoInicial && (
              <Boton chico variante="fantasma" icono={RefreshCw} titulo="Escanear otro rollo" onPress={() => { setRollo(null); setError('') }} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
            )}
          </View>

          {/* Dirección real del movimiento */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: S.md, backgroundColor: C.gray50, borderRadius: R.sm, borderWidth: 1, borderColor: C.gray200, marginBottom: S.lg }}
            accessibilityLabel={`Ruta: de ${rollo.ubicacion} a ${nombreDestino || 'sin elegir'}`}>
            <View style={{ gap: 4 }}>
              <Text style={T.mini}>ORIGEN</Text>
              <UbicacionBadge nombre={rollo.ubicacion} />
            </View>
            <ArrowRight size={24} color={C.brand600} strokeWidth={2} />
            <View style={{ gap: 4, alignItems: 'flex-end' }}>
              <Text style={T.mini}>DESTINO</Text>
              {nombreDestino ? <UbicacionBadge nombre={nombreDestino} /> : <Text style={{ color: C.inkFaint, fontStyle: 'italic' }}>Sin elegir</Text>}
            </View>
          </View>

          <Campo etiqueta="Ubicación destino" requerido>
            <Selector
              valor={destino}
              onCambio={setDestino}
              icono={MapPinned}
              titulo="Ubicación destino"
              deshabilitado={bloqueado}
              opciones={destinos.map((u) => ({ valor: String(u.idUbicacion), texto: u.nombre }))}
            />
          </Campo>
          <Campo etiqueta="Observación (opcional)">
            <Entrada icono={StickyNote} value={observacion} onChangeText={setObservacion} placeholder="Ej. Reposición en local" editable={!bloqueado} />
          </Campo>
        </>
      )}
    </Hoja>
  )
}
