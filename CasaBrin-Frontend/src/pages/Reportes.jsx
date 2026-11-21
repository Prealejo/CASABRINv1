import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import {
  TriangleAlert, CircleCheck, History, List, Calendar, Filter, RotateCcw, SearchX, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { fmtMetros, fmtNum, fmtFecha } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import { ICONO, TipoMovimiento, Vacio, Cargando, Mensaje } from '../components/ui.jsx'
import './pages.css'

const TIPOS = ['Ingreso', 'Salida', 'Traslado', 'Ajuste', 'Anulacion']
const PAGE_SIZE = 25

export default function Reportes() {
  const [alertas, setAlertas] = useState([])
  const [movs, setMovs] = useState({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE })
  const [filtros, setFiltros] = useState({ tipo: '', desde: '', hasta: '' })
  const [page, setPage] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/reportes/alertas')
        setAlertas(data)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [])

  async function cargarMovs(p = page, f = filtros) {
    setCargando(true)
    setError('')
    try {
      const params = {
        tipo: f.tipo || undefined,
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      }
      const { data } = await api.get('/reportes/movimientos', { params })
      setMovs(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarMovs(1); setPage(1) }, []) // carga inicial

  function aplicar() { setPage(1); cargarMovs(1) }
  function limpiar() {
    const vacios = { tipo: '', desde: '', hasta: '' }
    setFiltros(vacios)
    setPage(1)
    cargarMovs(1, vacios)   // usa los filtros vacíos, no el estado anterior
  }

  const totalPaginas = Math.max(1, Math.ceil(movs.total / PAGE_SIZE))

  function irA(p) {
    if (p < 1 || p > totalPaginas) return
    setPage(p)
    cargarMovs(p)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Reportes y movimientos</h1>
          <p>Historial de entradas, salidas, traslados y alertas de stock.</p>
        </div>
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      {/* -------- Alertas de stock bajo -------- */}
      <div className="seccion" style={{ marginTop: 0 }}>
        <div className="seccion-titulo">
          <span className="titulo-icono alerta"><TriangleAlert {...ICONO} aria-hidden="true" />Alertas de stock bajo</span>
          {alertas.length > 0 && <span className="badge badge-alerta">{alertas.length} tela{alertas.length !== 1 ? 's' : ''}</span>}
        </div>
        <div className="card card-flush">
          {alertas.length === 0 ? (
            <Vacio icon={CircleCheck} titulo="Sin alertas">Ninguna tela está por debajo de su stock mínimo.</Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tela</th>
                    <th>Tipo</th>
                    <th className="num">Stock mínimo</th>
                    <th className="num">Metros actuales</th>
                    <th className="num">Rollos</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a) => (
                    <tr key={a.idTela}>
                      <td className="mono">{a.codigo}</td>
                      <td>{a.nombre}</td>
                      <td>{a.tipoTela}</td>
                      <td className="mono num">{fmtMetros(a.stockMinimo)}</td>
                      <td className="mono num" style={{ color: 'var(--warn-700)', fontWeight: 700 }}>{fmtMetros(a.metrosTotales)}</td>
                      <td className="mono num">{fmtNum(a.rollosDisponibles)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* -------- Historial de movimientos -------- */}
      <div className="seccion">
        <div className="seccion-titulo">
          <span className="titulo-icono"><History {...ICONO} aria-hidden="true" />Historial de movimientos</span>
        </div>

        <div className="card mb">
          <div className="fila fila-fin">
            <Campo label="Tipo" icon={List}>
              <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
                <option value="">Todos</option>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label="Desde" icon={Calendar}>
              <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            </Campo>
            <Campo label="Hasta" icon={Calendar}>
              <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            </Campo>
            <button type="button" className="btn btn-primary" onClick={aplicar}>
              <Filter size={16} strokeWidth={1.75} aria-hidden="true" />Filtrar
            </button>
            <button type="button" className="btn btn-ghost" onClick={limpiar}>
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Limpiar
            </button>
          </div>
        </div>

        <div className="card card-flush">
          {cargando ? (
            <Cargando>Cargando movimientos…</Cargando>
          ) : movs.items.length === 0 ? (
            <Vacio icon={SearchX} titulo="Sin resultados">No hay movimientos con esos filtros.</Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Tela</th>
                    <th>Código</th>
                    <th className="num">Metros</th>
                    <th className="num">Antes → Después</th>
                    <th>Movimiento</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.items.map((m) => (
                    <tr key={m.idMovimiento}>
                      <td className="nowrap">{fmtFecha(m.fecha)}</td>
                      <td><TipoMovimiento tipo={m.tipo} /></td>
                      <td>{m.tela}</td>
                      <td className="mono">{m.codigoBarras}</td>
                      <td className="mono num"><strong>{fmtMetros(m.metros)}</strong></td>
                      <td className="mono num tenue nowrap">
                        {fmtMetros(m.metrosAntes)} → {fmtMetros(m.metrosDespues)}
                      </td>
                      <td className="tenue nowrap" style={{ fontSize: '0.82rem' }}>
                        {m.ubicacionOrigen && m.ubicacionDestino
                          ? `${m.ubicacionOrigen} → ${m.ubicacionDestino}`
                          : (m.ubicacionDestino || m.ubicacionOrigen || '—')}
                      </td>
                      <td>{m.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {movs.total > 0 && (
          <nav className="paginacion" aria-label="Paginación">
            <span className="paginacion-info">
              {fmtNum(movs.total)} movimientos · página {page} de {totalPaginas}
            </span>
            <div className="paginacion-botones">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => irA(page - 1)} disabled={page <= 1}>
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />Anterior
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => irA(page + 1)} disabled={page >= totalPaginas}>
                Siguiente<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
