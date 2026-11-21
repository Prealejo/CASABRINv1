import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import {
  Search, MapPin, ChevronRight, Layers, Cylinder, Barcode, PackagePlus, SearchX,
} from 'lucide-react'
import { fmtMetros, fmtNum, fmtSoloFecha } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import {
  ICONO, ICONO_SM, EstadoBadge, UbicacionBadge, StockBajoBadge, Vacio, Cargando, Mensaje,
} from '../components/ui.jsx'
import './pages.css'

// ¿La tela tiene stock en la ubicación seleccionada? (para Bodega/Local del seed)
function telaEnUbicacion(t, nombreUbic) {
  if (!nombreUbic) return true
  const n = nombreUbic.toLowerCase()
  if (n.includes('bodega')) return Number(t.metrosBodega) > 0
  if (n.includes('local')) return Number(t.metrosLocal) > 0
  return true
}

export default function Inventario() {
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [buscar, setBuscar] = useState('')
  const [filtroUbic, setFiltroUbic] = useState('')   // '' = todas
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})
  const debounce = useRef(null)

  async function cargar(texto) {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/telas', { params: { buscar: texto || undefined } })
      setTelas(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/catalogos/ubicaciones')
        setUbicaciones(data)
      } catch { /* no crítico */ }
    })()
    cargar('')
  }, [])

  // Búsqueda con debounce (RF-10: nombre, código, tipo, color).
  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => cargar(buscar.trim()), 300)
    return () => clearTimeout(debounce.current)
  }, [buscar])

  const nombreFiltro = useMemo(
    () => ubicaciones.find((u) => String(u.idUbicacion) === String(filtroUbic))?.nombre || '',
    [ubicaciones, filtroUbic],
  )

  const telasFiltradas = useMemo(
    () => telas.filter((t) => telaEnUbicacion(t, nombreFiltro)),
    [telas, nombreFiltro],
  )

  async function toggle(idTela) {
    if (abierta === idTela) { setAbierta(null); return }
    setAbierta(idTela)
    if (!detalles[idTela]) {
      setDetalles((d) => ({ ...d, [idTela]: { cargando: true, rollos: [] } }))
      try {
        const { data } = await api.get(`/telas/${idTela}`)
        setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: data.rollos || [] } }))
      } catch (e) {
        setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: [], error: e.message } }))
      }
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Inventario</h1>
          <p>Telas agrupadas. Expande una para ver sus rollos y ubicaciones.</p>
        </div>
        <Link to="/ingreso" className="btn btn-primary">
          <PackagePlus {...ICONO} aria-hidden="true" />
          Ingresar mercadería
        </Link>
      </div>

      <div className="card mb">
        <div className="fila fila-fin" role="search">
          <Campo label="Buscar por nombre, código, tipo o color" icon={Search} style={{ flex: 3 }}>
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Ej. lino, TEL000001, algodón, azul…"
              autoComplete="off"
            />
          </Campo>
          <Campo label="Ubicación" icon={MapPin} style={{ flex: 1 }}>
            <select value={filtroUbic} onChange={(e) => setFiltroUbic(e.target.value)}>
              <option value="">Todas</option>
              {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
            </select>
          </Campo>
        </div>
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      {cargando ? (
        <Cargando>Cargando inventario…</Cargando>
      ) : telasFiltradas.length === 0 ? (
        <div className="card">
          <Vacio icon={SearchX} titulo="Sin resultados">
            {filtroUbic ? `No hay telas con stock en ${nombreFiltro}.` : 'No se encontraron telas con ese criterio.'}
          </Vacio>
        </div>
      ) : (
        telasFiltradas.map((t) => {
          const det = detalles[t.idTela]
          const open = abierta === t.idTela
          const rollos = det?.rollos || []
          const rollosMostrados = filtroUbic
            ? rollos.filter((r) => String(r.idUbicacion) === String(filtroUbic))
            : rollos
          const idCuerpo = `tela-${t.idTela}-rollos`
          return (
            <div className="acordeon-item" key={t.idTela}>
              <button
                type="button"
                className="acordeon-cab"
                onClick={() => toggle(t.idTela)}
                aria-expanded={open}
                aria-controls={idCuerpo}
              >
                <ChevronRight className="acordeon-flecha" {...ICONO} aria-hidden="true" />
                <span className="acordeon-tela"><Layers size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                <span className="acordeon-info">
                  <span className="acordeon-nombre">
                    {t.nombre} {t.bajoStock && <StockBajoBadge />}
                  </span>
                  <span className="acordeon-meta">
                    <span className="mono"><Barcode {...ICONO_SM} aria-hidden="true" />{t.codigo}</span>
                    {t.color && <span>Color: {t.color}</span>}
                    {t.diseno && <span>{t.diseno}</span>}
                    <span><Cylinder {...ICONO_SM} aria-hidden="true" />{fmtNum(t.rollosDisponibles)} rollos</span>
                  </span>
                </span>
                <span className="acordeon-metros">
                  <span className="acordeon-metros-valor">{fmtMetros(t.metrosTotales)}</span>
                  <span className="acordeon-metros-label">
                    Bodega {fmtMetros(t.metrosBodega)} · Local {fmtMetros(t.metrosLocal)}
                  </span>
                </span>
              </button>

              {open && (
                <div className="acordeon-cuerpo" id={idCuerpo}>
                  {det?.cargando ? (
                    <Cargando>Cargando rollos…</Cargando>
                  ) : det?.error ? (
                    <div style={{ padding: '1rem' }}><Mensaje tipo="error">{det.error}</Mensaje></div>
                  ) : rollosMostrados.length === 0 ? (
                    <Vacio icon={Cylinder}>
                      {filtroUbic ? `Sin rollos en ${nombreFiltro}.` : 'Esta tela no tiene rollos registrados.'}
                    </Vacio>
                  ) : (
                    <div className="tabla-scroll">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Código de barras</th>
                            <th>Ubicación</th>
                            <th className="num">Metros actuales</th>
                            <th className="num">Metros iniciales</th>
                            <th>Estado</th>
                            <th>Ingreso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rollosMostrados.map((r) => (
                            <tr key={r.idRollo}>
                              <td className="mono">{r.codigoBarras}</td>
                              <td><UbicacionBadge nombre={r.ubicacion} /></td>
                              <td className="mono num"><strong>{fmtMetros(r.metrosActuales)}</strong></td>
                              <td className="mono num tenue">{fmtMetros(r.metrosIniciales)}</td>
                              <td><EstadoBadge estado={r.estado} /></td>
                              <td className="nowrap">{fmtSoloFecha(r.fechaIngreso)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
