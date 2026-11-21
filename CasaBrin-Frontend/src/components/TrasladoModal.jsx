import { useEffect, useState } from 'react'
import {
  ArrowLeftRight, ArrowRight, Barcode, MapPin, MapPinned, Ruler, StickyNote, SwatchBook, RefreshCw, Cylinder,
} from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros } from '../lib/format.js'
import Modal from './Modal.jsx'
import Campo from './Campo.jsx'
import BarcodeInput from './BarcodeInput.jsx'
import {
  ICONO_SM, EstadoBadge, UbicacionBadge, CodigoColorBadge, ProveedorTexto, Mensaje, Cargando, iconoUbicacion,
} from './ui.jsx'

/**
 * Traslado de un rollo entre Bodega y Local, como ventana emergente de Inventario.
 * - Con `codigoInicial` carga ese rollo directamente (botón "Trasladar" de una fila).
 * - Sin código muestra el campo de escaneo (pistola lectora o teclado).
 * Al confirmar llama a `onTrasladado(rollo, nombreDestino)`.
 */
export default function TrasladoModal({ abierto, codigoInicial, ubicaciones, onCerrar, onTrasladado }) {
  const [rollo, setRollo] = useState(null)
  const [destino, setDestino] = useState('')
  const [observacion, setObservacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [trasladando, setTrasladando] = useState(false)
  const [error, setError] = useState('')

  // Reinicia el estado cada vez que se abre.
  useEffect(() => {
    if (!abierto) return
    setRollo(null)
    setDestino('')
    setObservacion('')
    setError('')
    if (codigoInicial) buscar(codigoInicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, codigoInicial])

  async function buscar(codigo) {
    setError('')
    setDestino('')
    setObservacion('')
    setBuscando(true)
    try {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(codigo)}`)
      setRollo(data)
      if (data.estado === 'Anulado') {
        setError('Este rollo está anulado y no se puede trasladar.')
      } else {
        // Con solo dos ubicaciones (Bodega/Local), el destino es obvio: se preselecciona.
        const opciones = ubicaciones.filter((u) => u.idUbicacion !== data.idUbicacion)
        if (opciones.length === 1) setDestino(String(opciones[0].idUbicacion))
      }
    } catch (e) {
      setRollo(null)
      setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  async function confirmar(e) {
    e?.preventDefault()
    if (!rollo || !destino) return
    if (Number(destino) === rollo.idUbicacion) {
      setError('El rollo ya está en esa ubicación.')
      return
    }
    setError('')
    setTrasladando(true)
    try {
      const { data } = await api.post(`/rollos/${rollo.idRollo}/trasladar`, {
        idUbicacionDestino: Number(destino),
        observacion: observacion.trim() || null,
      })
      const nombreDestino = ubicaciones.find((u) => u.idUbicacion === Number(destino))?.nombre || ''
      onTrasladado?.(data, nombreDestino)
    } catch (err) {
      setError(err.message)
    } finally {
      setTrasladando(false)
    }
  }

  function cerrar() {
    if (trasladando) return
    onCerrar?.()
  }

  const destinos = ubicaciones.filter((u) => !rollo || u.idUbicacion !== rollo.idUbicacion)
  const nombreDestinoSel = ubicaciones.find((u) => String(u.idUbicacion) === String(destino))?.nombre
  const bloqueado = !rollo || rollo.estado === 'Anulado'

  return (
    <Modal
      abierto={abierto}
      titulo="Trasladar rollo"
      icono={ArrowLeftRight}
      onCerrar={cerrar}
      ancho={600}
      pie={(
        <>
          <button type="button" className="btn btn-ghost" onClick={cerrar} disabled={trasladando}>Cancelar</button>
          <button
            type="submit"
            form="form-traslado"
            className="btn btn-primary"
            disabled={bloqueado || !destino || trasladando}
          >
            {nombreDestinoSel
              ? (() => { const I = iconoUbicacion(nombreDestinoSel); return <I size={16} strokeWidth={1.75} aria-hidden="true" /> })()
              : <ArrowLeftRight size={16} strokeWidth={1.75} aria-hidden="true" />}
            {trasladando ? 'Trasladando…' : (nombreDestinoSel ? `Confirmar traslado a ${nombreDestinoSel}` : 'Confirmar traslado')}
          </button>
        </>
      )}
    >
      {/* Paso 1: identificar el rollo (escaneo o código) */}
      {!rollo && !buscando && (
        <div className="mb">
          <BarcodeInput onScan={buscar} />
        </div>
      )}
      {buscando && <Cargando>Buscando rollo…</Cargando>}

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      {/* Paso 2: datos del rollo y destino */}
      {rollo && (
        <form id="form-traslado" onSubmit={confirmar} noValidate>
          <div className="traslado-rollo">
            <div className="traslado-rollo-cab">
              <span className="tela-elegida-icono"><Cylinder size={20} strokeWidth={1.75} aria-hidden="true" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rollo-nombre">{rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}</div>
                <div className="tela-meta">
                  <span className="mono"><Barcode {...ICONO_SM} aria-hidden="true" />{rollo.codigoBarras}</span>
                  <CodigoColorBadge codigo={rollo.codigoColor} />
                  <ProveedorTexto nombre={rollo.proveedor} />
                </div>
              </div>
              <EstadoBadge estado={rollo.estado} />
            </div>
            <div className="dato-fila">
              <span className="dato-label"><MapPin {...ICONO_SM} aria-hidden="true" />Ubicación actual</span>
              <span className="dato-valor"><UbicacionBadge nombre={rollo.ubicacion} /></span>
            </div>
            <div className="dato-fila">
              <span className="dato-label"><Ruler {...ICONO_SM} aria-hidden="true" />Metros disponibles</span>
              <span className="dato-valor grande mono">{fmtMetros(rollo.metrosActuales)}</span>
            </div>
            {!codigoInicial && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRollo(null); setError('') }} style={{ marginTop: '0.5rem' }}>
                <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />Escanear otro rollo
              </button>
            )}
          </div>

          <div className="ruta" aria-label="Ruta del traslado">
            <div className="ruta-punto">
              <span className="ruta-label"><MapPin size={12} strokeWidth={2} aria-hidden="true" />Origen</span>
              <UbicacionBadge nombre={rollo.ubicacion} />
            </div>
            <ArrowRight className="ruta-flecha" size={22} strokeWidth={1.75} aria-hidden="true" />
            <div className="ruta-punto">
              <span className="ruta-label"><MapPinned size={12} strokeWidth={2} aria-hidden="true" />Destino</span>
              {nombreDestinoSel
                ? <UbicacionBadge nombre={nombreDestinoSel} />
                : <span className="ruta-pendiente">Sin elegir</span>}
            </div>
          </div>

          <Campo label="Ubicación destino" icon={MapPinned} requerido>
            <select value={destino} onChange={(e) => setDestino(e.target.value)} disabled={bloqueado}>
              <option value="">— Selecciona —</option>
              {destinos.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Observación (opcional)" icon={StickyNote}>
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. Reposición en local"
              disabled={bloqueado}
            />
          </Campo>
        </form>
      )}

      {!rollo && !buscando && (
        <p className="texto-ayuda" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <SwatchBook {...ICONO_SM} aria-hidden="true" />
          También puedes usar el botón «Trasladar» de cada rollo en el inventario.
        </p>
      )}
    </Modal>
  )
}
