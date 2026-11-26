import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import BarcodeInput from '../components/BarcodeInput.jsx'
import { Barcode, Scissors, History } from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import { Encabezado, EstadoBadge, UbicacionBadge, CodigoColorBadge, Mensaje, Vacio, Cargando } from '../components/ui.jsx'
import './pages.css'

const CORTES_RAPIDOS = [0.5, 1, 2, 3, 5, 10]

export default function Escanear() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rollo, setRollo] = useState(null)
  const [metros, setMetros] = useState('')
  const [observacion, setObservacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [cortando, setCortando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [telaStock, setTelaStock] = useState(null)   // stock total de la tela del rollo
  const [focoSenal, setFocoSenal] = useState(0)      // tras un corte, el foco vuelve al lector

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

  // Si se llega desde Inventario (?codigo=CB…), se carga el rollo directamente.
  useEffect(() => {
    const cod = searchParams.get('codigo')
    if (cod) {
      buscar(cod)
      setSearchParams({}, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setFocoSenal((n) => n + 1)   // listo para escanear el siguiente rollo
    } catch (e) {
      setError(e.message)
    } finally {
      setCortando(false)
    }
  }

  return (
    <div>
      <Encabezado titulo="Escanear y cortar" subtitulo="Consulta un rollo y registra los metros vendidos" />

      <section className="panel panel-cuerpo escaner-panel">
        <BarcodeInput onScan={buscar} focoSenal={focoSenal} />
      </section>

      {error && <Mensaje tipo="error" style={{ marginTop: '1rem' }}>{error}</Mensaje>}
      {resultado && (
        <Mensaje tipo="ok" style={{ marginTop: '1rem' }}>
          Corte registrado: se sacaron <strong>{fmtMetros(resultado.metrosAntes - resultado.metrosDespues)}</strong>.
          Quedan {fmtMetros(resultado.metrosDespues)} en el rollo{resultado.estado === 'Agotado' ? ' (ahora AGOTADO)' : ''}. Puedes escanear el siguiente rollo.
        </Mensaje>
      )}
      {telaStock?.bajoStock && (
        <Mensaje tipo="alerta" style={{ marginTop: '1rem' }}>
          Stock bajo: a <strong>{telaStock.nombre}</strong> le quedan {fmtMetros(telaStock.metrosTotales)} en total (mínimo {fmtMetros(telaStock.stockMinimo)}).
        </Mensaje>
      )}

      {buscando ? (
        <div className="panel bloque"><Cargando>Buscando rollo…</Cargando></div>
      ) : !rollo ? (
        <div className="panel bloque">
          <Vacio icon={Barcode} titulo="Esperando código de rollo">Escanea un código para consultar su disponibilidad.</Vacio>
        </div>
      ) : (
        <div className="corte-grid bloque">
          {/* --------- Rollo encontrado --------- */}
          <section className="panel" aria-label="Rollo encontrado">
            <div className="panel-cab">
              <div>
                <h2>{rollo.telaNombre}</h2>
                <p className="sub mono">{rollo.codigoBarras}</p>
              </div>
              <EstadoBadge estado={rollo.estado} />
            </div>
            <div className="panel-cuerpo">
              <div className="metraje-destacado">
                <span className="metraje-destacado-etq">Metros disponibles</span>
                <span className="metraje-destacado-valor">{fmtMetros(rollo.metrosActuales)}</span>
                <span className="metraje-destacado-sub">de {fmtMetros(rollo.metrosIniciales)} iniciales</span>
              </div>
              <dl className="datos">
                <div><dt>Color</dt><dd>{rollo.color || '—'}{rollo.codigoColor && <> · <CodigoColorBadge codigo={rollo.codigoColor} /></>}</dd></div>
                <div><dt>Ubicación</dt><dd><UbicacionBadge nombre={rollo.ubicacion} /></dd></div>
                <div><dt>Proveedor</dt><dd>{rollo.proveedor || '—'}</dd></div>
              </dl>
              <Link to={`/reportes?rollo=${encodeURIComponent(rollo.codigoBarras)}`} className="btn btn-secondary btn-sm">
                <History size={15} strokeWidth={1.9} aria-hidden="true" />Ver historial del rollo
              </Link>
            </div>
          </section>

          {/* --------- Formulario de corte --------- */}
          <section className="panel" aria-label="Registrar corte">
            <div className="panel-cab"><h2>Registrar corte</h2></div>
            <div className="panel-cuerpo">
              <Campo label="Metros a cortar" error={excede ? `Solo hay ${fmtMetros(rollo.metrosActuales)} disponibles.` : undefined}>
                <input
                  type="number" min="0.01" step="0.01" value={metros}
                  onChange={(e) => setMetros(e.target.value)}
                  placeholder="Ej. 3.5"
                  disabled={rollo.estado !== 'Disponible'}
                  autoFocus
                  className="input-corte"
                />
              </Campo>
              {rollo.estado === 'Disponible' && (
                <div className="cortes-rapidos" role="group" aria-label="Metros rápidos">
                  {CORTES_RAPIDOS.filter((m) => m <= Number(rollo.metrosActuales)).map((m) => (
                    <button key={m} type="button" className={`chip-btn ${metrosNum === m ? 'activo' : ''}`} onClick={() => setMetros(String(m))} aria-pressed={metrosNum === m}>
                      {fmtMetros(m)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`chip-btn ${metrosNum === Number(rollo.metrosActuales) ? 'activo' : ''}`}
                    onClick={() => setMetros(String(Number(rollo.metrosActuales)))}
                    aria-pressed={metrosNum === Number(rollo.metrosActuales)}
                  >
                    Todo el rollo
                  </button>
                </div>
              )}
              <Campo label="Observación (opcional)">
                <input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. Venta mostrador" disabled={rollo.estado !== 'Disponible'} />
              </Campo>

              <div className="corte-resumen" aria-live="polite">
                <div><span>A cortar</span><strong>{fmtMetros(metrosNum)}</strong></div>
                <div><span>Quedarán</span><strong className={excede ? 'texto-error' : ''}>{excede ? '—' : fmtMetros(Number(rollo.metrosActuales) - metrosNum)}</strong></div>
              </div>

              <button type="button" className="btn btn-primary btn-block" onClick={cortar} disabled={!puedeCortar || cortando}>
                <Scissors size={17} strokeWidth={1.9} aria-hidden="true" />
                {cortando ? 'Registrando corte…' : (metrosNum > 0 ? `Cortar ${fmtMetros(metrosNum)}` : 'Cortar')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
