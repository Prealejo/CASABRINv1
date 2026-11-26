import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Filter, Barcode, ArrowLeftRight } from 'lucide-react'
import { api } from '../api/client.js'
import BarcodeLabel from '../components/BarcodeLabel.jsx'
import { fmtMetros } from '../lib/format.js'
import { Encabezado, Vacio, Cargando, Mensaje } from '../components/ui.jsx'
import './pages.css'

export default function Etiquetas() {
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [rollos, setRollos] = useState([])
  const [filtros, setFiltros] = useState({ idTela: '', idUbicacion: '', estado: 'Disponible' })
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [t, u] = await Promise.all([api.get('/telas'), api.get('/catalogos/ubicaciones')])
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
      setSeleccion(new Set(data.map((r) => r.idRollo)))   // por defecto se imprimen todas
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, []) // carga inicial

  const nSel = useMemo(() => rollos.filter((r) => seleccion.has(r.idRollo)).length, [rollos, seleccion])
  const todas = rollos.length > 0 && nSel === rollos.length

  function alternar(id) {
    setSeleccion((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function alternarTodas() {
    setSeleccion(todas ? new Set() : new Set(rollos.map((r) => r.idRollo)))
  }

  return (
    <div>
      <div className="no-print">
        <Encabezado titulo="Etiquetas" subtitulo="Generación e impresión de códigos de barras">
          <Link to="/inventario" className="btn btn-secondary">
            <ArrowLeftRight size={16} strokeWidth={1.9} aria-hidden="true" />Trasladar desde inventario
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!nSel}>
            <Printer size={17} strokeWidth={1.9} aria-hidden="true" />
            Imprimir etiquetas{nSel && nSel < rollos.length ? ` (${nSel})` : ''}
          </button>
        </Encabezado>
      </div>

      <form
        className="panel filtros-linea no-print"
        onSubmit={(e) => { e.preventDefault(); cargar() }}
        aria-label="Filtros de etiquetas"
      >
        <label className="filtro">
          <span>Tela</span>
          <select value={filtros.idTela} onChange={(e) => setFiltros({ ...filtros, idTela: e.target.value })}>
            <option value="">Todas</option>
            {telas.map((t) => <option key={t.idTela} value={t.idTela}>{t.codigo} · {t.nombre}{t.codigoColor ? ` · ${t.codigoColor}` : ''}</option>)}
          </select>
        </label>
        <label className="filtro">
          <span>Ubicación</span>
          <select value={filtros.idUbicacion} onChange={(e) => setFiltros({ ...filtros, idUbicacion: e.target.value })}>
            <option value="">Todas</option>
            {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
          </select>
        </label>
        <label className="filtro">
          <span>Estado</span>
          <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos</option>
            <option value="Disponible">Disponible</option>
            <option value="Agotado">Agotado</option>
            <option value="Anulado">Anulado</option>
          </select>
        </label>
        <button type="submit" className="btn btn-secondary">
          <Filter size={15} strokeWidth={1.9} aria-hidden="true" />Aplicar filtros
        </button>
      </form>

      {error && <Mensaje tipo="error" className="no-print">{error}</Mensaje>}

      {cargando ? (
        <Cargando>Cargando rollos…</Cargando>
      ) : rollos.length === 0 ? (
        <div className="panel no-print">
          <Vacio icon={Barcode} titulo="Sin etiquetas">No hay rollos con esos filtros.</Vacio>
        </div>
      ) : (
        <>
          <div className="etiquetas-barra no-print">
            <label className="check">
              <input type="checkbox" checked={todas} onChange={alternarTodas}
                ref={(el) => { if (el) el.indeterminate = nSel > 0 && !todas }} />
              Seleccionar todas
            </label>
            <span className="sub">
              {rollos.length} etiqueta{rollos.length !== 1 ? 's' : ''} encontrada{rollos.length !== 1 ? 's' : ''} · {nSel} seleccionada{nSel !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="etiquetas-grid">
            {rollos.map((r) => {
              const sel = seleccion.has(r.idRollo)
              return (
                <div key={r.idRollo} className={`etiqueta-item ${sel ? 'seleccionada' : 'no-imprimir'}`}>
                  <label className="etiqueta-check no-print">
                    <input type="checkbox" checked={sel} onChange={() => alternar(r.idRollo)} aria-label={`Imprimir etiqueta del rollo ${r.codigoBarras}`} />
                  </label>
                  <BarcodeLabel
                    codigo={r.codigoBarras}
                    titulo={r.telaNombre}
                    subtitulo={`${r.codigoColor ? `Color ${r.codigoColor} · ` : ''}${r.ubicacion} · ${fmtMetros(r.metrosActuales)}`}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
