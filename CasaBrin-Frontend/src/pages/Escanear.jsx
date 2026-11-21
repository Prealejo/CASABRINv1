import { useState } from 'react'
import { api } from '../api/client.js'
import BarcodeInput from '../components/BarcodeInput.jsx'
import { Cylinder, Barcode, MapPin, Ruler, Scissors, StickyNote } from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import { ICONO, ICONO_SM, EstadoBadge, UbicacionBadge, Mensaje } from '../components/ui.jsx'
import './pages.css'

export default function Escanear() {
  const [rollo, setRollo] = useState(null)
  const [metros, setMetros] = useState('')
  const [observacion, setObservacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [cortando, setCortando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [telaStock, setTelaStock] = useState(null)   // stock total de la tela del rollo

  // Consulta el stock total de la tela para avisar si está en alerta.
  async function cargarStockTela(idTela) {
    try {
      const { data } = await api.get(`/telas/${idTela}`)
      setTelaStock(data.tela)
    } catch {
      setTelaStock(null)
    }
  }

  async function buscar(codigo) {
    setError('')
    setResultado(null)
    setMetros('')
    setObservacion('')
    setTelaStock(null)
    setBuscando(true)
    try {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(codigo)}`)
      setRollo(data)
      cargarStockTela(data.idTela)
      if (data.estado !== 'Disponible') {
        setError(`Este rollo está ${data.estado.toLowerCase()} y no se le puede cortar.`)
      }
    } catch (e) {
      setRollo(null)
      setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  const metrosNum = parseFloat(metros) || 0
  const excede = rollo && metrosNum > Number(rollo.metrosActuales)
  const puedeCortar = rollo && rollo.estado === 'Disponible' && metrosNum > 0 && !excede

  async function cortar() {
    if (!puedeCortar) return
    setError('')
    setCortando(true)
    try {
      const { data } = await api.post(`/rollos/${rollo.idRollo}/cortar`, {
        metros: metrosNum,
        observacion: observacion.trim() || null,
      })
      setResultado(data)
      // Actualiza el rollo en pantalla con los metros nuevos.
      setRollo((r) => ({ ...r, metrosActuales: data.metrosDespues, estado: data.estado }))
      cargarStockTela(rollo.idTela)   // re-evalúa la alerta de stock de la tela
      setMetros('')
      setObservacion('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCortando(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Escanear y cortar</h1>
          <p>Escanea el código del rollo con la pistola lectora o escríbelo a mano.</p>
        </div>
      </div>

      <div className="card mb">
        <BarcodeInput onScan={buscar} />
        {buscando && <Mensaje tipo="info" style={{ marginTop: '0.9rem', marginBottom: 0 }}>Buscando rollo…</Mensaje>}
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      {telaStock?.bajoStock && (
        <Mensaje tipo="alerta" className="mb">
          <strong>Stock bajo:</strong> a <strong>{telaStock.nombre}</strong> le quedan solo{' '}
          <strong>{fmtMetros(telaStock.metrosTotales)}</strong> en total (mínimo configurado: {fmtMetros(telaStock.stockMinimo)}).
          Considera reabastecer antes de que llegue a 0.
        </Mensaje>
      )}

      {rollo && (
        <div className="escaner-grid">
          {/* --------- Detalle del rollo --------- */}
          <div className="card rollo-detalle-card">
            <div className="seccion-titulo" style={{ marginBottom: '0.6rem' }}>
              <span className="titulo-icono"><Cylinder {...ICONO} aria-hidden="true" />Rollo escaneado</span>
              <EstadoBadge estado={rollo.estado} />
            </div>
            <div className="rollo-nombre">
              {rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}
            </div>
            <div className="rollo-codigo mono"><Barcode {...ICONO_SM} aria-hidden="true" />{rollo.codigoBarras}</div>

            <div className="dato-fila">
              <span className="dato-label"><MapPin {...ICONO_SM} aria-hidden="true" />Ubicación</span>
              <span className="dato-valor"><UbicacionBadge nombre={rollo.ubicacion} /></span>
            </div>
            <div className="dato-fila">
              <span className="dato-label"><Ruler {...ICONO_SM} aria-hidden="true" />Metros disponibles</span>
              <span className="dato-valor grande mono">{fmtMetros(rollo.metrosActuales)}</span>
            </div>
            <div className="dato-fila">
              <span className="dato-label"><Ruler {...ICONO_SM} aria-hidden="true" />Metros iniciales</span>
              <span className="dato-valor mono">{fmtMetros(rollo.metrosIniciales)}</span>
            </div>
          </div>

          {/* --------- Panel de corte --------- */}
          <div className="card">
            <div className="seccion-titulo" style={{ marginBottom: '0.8rem' }}>
              <span className="titulo-icono"><Scissors {...ICONO} aria-hidden="true" />Cortar metros</span>
            </div>

            <Campo
              label="Metros a cortar"
              icon={Ruler}
              error={excede ? `Solo hay ${fmtMetros(rollo.metrosActuales)} disponibles.` : undefined}
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={metros}
                onChange={(e) => setMetros(e.target.value)}
                placeholder="Ej. 3.5"
                disabled={rollo.estado !== 'Disponible'}
                autoFocus
              />
            </Campo>

            <Campo label="Observación (opcional)" icon={StickyNote}>
              <input
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Ej. Venta mostrador, cliente X…"
                disabled={rollo.estado !== 'Disponible'}
              />
            </Campo>

            <button type="button" className="btn btn-primary btn-block" onClick={cortar} disabled={!puedeCortar || cortando}>
              <Scissors {...ICONO} aria-hidden="true" />
              {cortando ? 'Registrando corte…' : (metrosNum > 0 ? `Cortar ${fmtMetros(metrosNum)}` : 'Cortar')}
            </button>
          </div>
        </div>
      )}

      {resultado && (
        <Mensaje tipo="ok" style={{ marginTop: '1.25rem' }}>
          Corte registrado: se sacaron <strong>{fmtMetros(resultado.metrosAntes - resultado.metrosDespues)}</strong>.
          Quedan {fmtMetros(resultado.metrosDespues)} en el rollo{resultado.estado === 'Agotado' ? ' (ahora AGOTADO)' : ''}.
        </Mensaje>
      )}
    </div>
  )
}
