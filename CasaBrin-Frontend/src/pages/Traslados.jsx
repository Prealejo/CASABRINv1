import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import BarcodeInput from '../components/BarcodeInput.jsx'
import {
  Cylinder, Barcode, MapPin, MapPinned, Ruler, ArrowLeftRight, ArrowRight, StickyNote,
} from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import { ICONO, ICONO_SM, EstadoBadge, UbicacionBadge, Mensaje } from '../components/ui.jsx'
import './pages.css'

export default function Traslados() {
  const [rollo, setRollo] = useState(null)
  const [ubicaciones, setUbicaciones] = useState([])
  const [destino, setDestino] = useState('')
  const [observacion, setObservacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [trasladando, setTrasladando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/catalogos/ubicaciones')
        setUbicaciones(data)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [])

  async function buscar(codigo) {
    setError('')
    setOk('')
    setDestino('')
    setObservacion('')
    setBuscando(true)
    try {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(codigo)}`)
      setRollo(data)
      if (data.estado === 'Anulado') setError('Este rollo está anulado y no se puede trasladar.')
    } catch (e) {
      setRollo(null)
      setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  async function trasladar() {
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
      setOk(`Rollo ${data.codigoBarras} trasladado a ${nombreDestino}.`)
      setRollo(data)
      setDestino('')
      setObservacion('')
    } catch (e) {
      setError(e.message)
    } finally {
      setTrasladando(false)
    }
  }

  const destinos = ubicaciones.filter((u) => !rollo || u.idUbicacion !== rollo.idUbicacion)
  const nombreDestinoSel = ubicaciones.find((u) => String(u.idUbicacion) === String(destino))?.nombre

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Traslados</h1>
          <p>Mueve un rollo entre bodega y local.</p>
        </div>
      </div>

      <div className="card mb">
        <BarcodeInput onScan={buscar} />
        {buscando && <Mensaje tipo="info" style={{ marginTop: '0.9rem', marginBottom: 0 }}>Buscando rollo…</Mensaje>}
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {ok && <Mensaje tipo="ok">{ok}</Mensaje>}

      {rollo && (
        <div className="escaner-grid">
          <div className="card rollo-detalle-card">
            <div className="seccion-titulo" style={{ marginBottom: '0.6rem' }}>
              <span className="titulo-icono"><Cylinder {...ICONO} aria-hidden="true" />Rollo</span>
              <EstadoBadge estado={rollo.estado} />
            </div>
            <div className="rollo-nombre">
              {rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}
            </div>
            <div className="rollo-codigo mono"><Barcode {...ICONO_SM} aria-hidden="true" />{rollo.codigoBarras}</div>
            <div className="dato-fila">
              <span className="dato-label"><MapPin {...ICONO_SM} aria-hidden="true" />Ubicación actual</span>
              <span className="dato-valor"><UbicacionBadge nombre={rollo.ubicacion} /></span>
            </div>
            <div className="dato-fila">
              <span className="dato-label"><Ruler {...ICONO_SM} aria-hidden="true" />Metros disponibles</span>
              <span className="dato-valor grande mono">{fmtMetros(rollo.metrosActuales)}</span>
            </div>
          </div>

          <div className="card">
            <div className="seccion-titulo" style={{ marginBottom: '0.8rem' }}>
              <span className="titulo-icono"><ArrowLeftRight {...ICONO} aria-hidden="true" />Trasladar a…</span>
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

            <Campo label="Ubicación destino" icon={MapPinned}>
              <select value={destino} onChange={(e) => setDestino(e.target.value)} disabled={rollo.estado === 'Anulado'}>
                <option value="">— Selecciona —</option>
                {destinos.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Observación (opcional)" icon={StickyNote}>
              <input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. Reposición en local" disabled={rollo.estado === 'Anulado'} />
            </Campo>
            <button type="button" className="btn btn-primary btn-block" onClick={trasladar} disabled={!destino || trasladando || rollo.estado === 'Anulado'}>
              <ArrowLeftRight {...ICONO} aria-hidden="true" />
              {trasladando ? 'Trasladando…' : 'Confirmar traslado'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
