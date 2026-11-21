import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import BarcodeLabel from '../components/BarcodeLabel.jsx'
import { Printer, Cylinder, MapPin, CircleDot, Filter, Tag, Barcode, ArrowLeftRight } from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import { ICONO, ICONO_SM, Vacio, Cargando, Mensaje } from '../components/ui.jsx'
import './pages.css'

export default function Etiquetas() {
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [rollos, setRollos] = useState([])
  const [filtros, setFiltros] = useState({ idTela: '', idUbicacion: '', estado: 'Disponible' })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [t, u] = await Promise.all([
          api.get('/telas'),
          api.get('/catalogos/ubicaciones'),
        ])
        setTelas(t.data)
        setUbicaciones(u.data)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [])

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const params = {
        idTela: filtros.idTela || undefined,
        idUbicacion: filtros.idUbicacion || undefined,
        estado: filtros.estado || undefined,
      }
      const { data } = await api.get('/rollos', { params })
      setRollos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, []) // carga inicial

  function imprimir() { window.print() }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Etiquetas</h1>
          <p>Genera e imprime los códigos de barras de los rollos.</p>
        </div>
        <button type="button" className="btn btn-primary no-print" onClick={imprimir} disabled={!rollos.length}>
          <Printer {...ICONO} aria-hidden="true" />
          Imprimir
        </button>
      </div>

      <div className="card no-print mb">
        <div className="fila fila-fin">
          <Campo label="Tela" icon={Cylinder}>
            <select value={filtros.idTela} onChange={(e) => setFiltros({ ...filtros, idTela: e.target.value })}>
              <option value="">Todas</option>
              {telas.map((t) => <option key={t.idTela} value={t.idTela}>{t.codigo} · {t.nombre}{t.codigoColor ? ` · ${t.codigoColor}` : ''}</option>)}
            </select>
          </Campo>
          <Campo label="Ubicación" icon={MapPin}>
            <select value={filtros.idUbicacion} onChange={(e) => setFiltros({ ...filtros, idUbicacion: e.target.value })}>
              <option value="">Todas</option>
              {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Estado" icon={CircleDot}>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="">Todos</option>
              <option value="Disponible">Disponible</option>
              <option value="Agotado">Agotado</option>
              <option value="Anulado">Anulado</option>
            </select>
          </Campo>
          <button type="button" className="btn btn-secondary" onClick={cargar}>
            <Filter size={16} strokeWidth={1.75} aria-hidden="true" />
            Aplicar filtros
          </button>
        </div>
      </div>

      {error && <Mensaje tipo="error" className="no-print">{error}</Mensaje>}

      {cargando ? (
        <Cargando>Cargando rollos…</Cargando>
      ) : rollos.length === 0 ? (
        <div className="card no-print">
          <Vacio icon={Tag} titulo="Sin etiquetas">No hay rollos con esos filtros.</Vacio>
        </div>
      ) : (
        <>
          <p className="contador no-print">
            <Barcode {...ICONO_SM} aria-hidden="true" />
            {rollos.length} etiqueta{rollos.length !== 1 ? 's' : ''} lista{rollos.length !== 1 ? 's' : ''} para imprimir.
          </p>
          <div className="siguiente-paso no-print mb" style={{ marginTop: 0 }}>
            <span className="siguiente-paso-texto"><ArrowLeftRight {...ICONO_SM} aria-hidden="true" />Con los rollos etiquetados, muévelos a donde se venden.</span>
            <div className="siguiente-paso-acciones">
              <Link to="/traslados" className="btn btn-secondary btn-sm"><ArrowLeftRight size={14} strokeWidth={2} aria-hidden="true" />Ir a Traslados</Link>
            </div>
          </div>
          <div className="etiquetas-grid">
            {rollos.map((r) => (
              <BarcodeLabel
                key={r.idRollo}
                codigo={r.codigoBarras}
                titulo={r.telaNombre}
                subtitulo={`${r.codigoColor ? `Color ${r.codigoColor} · ` : ''}${r.ubicacion} · ${fmtMetros(r.metrosActuales)}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
