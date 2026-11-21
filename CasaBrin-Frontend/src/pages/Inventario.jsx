import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, MapPin, ChevronRight, Layers, Cylinder, Barcode, PackagePlus, SearchX, Route, Truck,
  Pencil, Scissors, ArrowLeftRight, SwatchBook, Palette, Shapes, TriangleAlert, Save, X,
} from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros, fmtNum, fmtSoloFecha } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import Modal from '../components/Modal.jsx'
import ProveedorCampo from '../components/ProveedorCampo.jsx'
import {
  ICONO, ICONO_SM, EstadoBadge, UbicacionBadge, StockBajoBadge, CodigoColorBadge, ProveedorTexto,
  Vacio, Cargando, Mensaje,
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

const SIN_PROVEEDOR = 'sin'

export default function Inventario() {
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [buscar, setBuscar] = useState('')
  const [filtroUbic, setFiltroUbic] = useState('')   // '' = todas
  const [filtroProv, setFiltroProv] = useState('')   // '' = todos, 'sin' = sin proveedor
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})
  const debounce = useRef(null)

  // Edición de ficha
  const [editando, setEditando] = useState(null)      // tela en edición
  const [form, setForm] = useState(null)
  const [errForm, setErrForm] = useState({})
  const [errModal, setErrModal] = useState('')
  const [guardando, setGuardando] = useState(false)

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
        const [u, p] = await Promise.all([api.get('/catalogos/ubicaciones'), api.get('/catalogos/proveedores')])
        setUbicaciones(u.data)
        setProveedores(p.data)
      } catch { /* no crítico */ }
    })()
  }, [])

  // Búsqueda con debounce: nombre, código, código de color, color o proveedor.
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
    () => telas
      .filter((t) => telaEnUbicacion(t, nombreFiltro))
      .filter((t) => !filtroProv
        || (filtroProv === SIN_PROVEEDOR ? !t.idProveedor : String(t.idProveedor) === filtroProv)),
    [telas, nombreFiltro, filtroProv],
  )

  const totales = useMemo(() => ({
    metros: telasFiltradas.reduce((a, t) => a + Number(t.metrosTotales || 0), 0),
    rollos: telasFiltradas.reduce((a, t) => a + Number(t.rollosDisponibles || 0), 0),
  }), [telasFiltradas])

  async function cargarDetalle(idTela) {
    setDetalles((d) => ({ ...d, [idTela]: { cargando: true, rollos: [] } }))
    try {
      const { data } = await api.get(`/telas/${idTela}`)
      setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: data.rollos || [] } }))
    } catch (e) {
      setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: [], error: e.message } }))
    }
  }

  async function toggle(idTela) {
    if (abierta === idTela) { setAbierta(null); return }
    setAbierta(idTela)
    if (!detalles[idTela]) cargarDetalle(idTela)
  }

  // ---------- Edición de ficha ----------
  function abrirEdicion(t) {
    setEditando(t)
    setForm({
      nombre: t.nombre || '',
      codigoColor: t.codigoColor || '',
      color: t.color || '',
      diseno: t.diseno || '',
      idProveedor: t.idProveedor ? String(t.idProveedor) : '',
      stockMinimo: String(Number(t.stockMinimo) || 1),
    })
    setErrForm({})
    setErrModal('')
    setOk('')
  }
  function cerrarEdicion() {
    if (guardando) return
    setEditando(null)
  }

  async function guardarFicha(e) {
    e?.preventDefault()
    const errs = {}
    if (form.nombre.trim().length < 2) errs.nombre = 'El nombre es obligatorio.'
    if (form.codigoColor.trim().length > 30) errs.codigoColor = 'Máximo 30 caracteres.'
    const sm = parseInt(form.stockMinimo, 10)
    if (!(sm >= 1)) errs.stockMinimo = 'Debe ser 1 o mayor.'
    setErrForm(errs)
    if (Object.keys(errs).length) return

    setGuardando(true)
    setErrModal('')
    try {
      await api.put(`/telas/${editando.idTela}/ficha`, {
        nombre: form.nombre.trim(),
        color: form.color.trim() || null,
        codigoColor: form.codigoColor.trim() || null,
        diseno: form.diseno.trim() || null,
        idProveedor: form.idProveedor ? Number(form.idProveedor) : null,
        stockMinimo: sm,
      })
      const nombre = form.nombre.trim()
      setEditando(null)
      setOk(`Ficha de «${nombre}» actualizada.`)
      await cargar(buscar.trim())
      if (detalles[editando.idTela]) cargarDetalle(editando.idTela)   // rollos muestran el nuevo código
    } catch (err) {
      setErrModal(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const hayFiltros = buscar || filtroUbic || filtroProv

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Inventario</h1>
          <p>Cada tela con su código, código de color y proveedor. Expande una para ver sus rollos.</p>
        </div>
        <Link to="/ingreso" className="btn btn-primary">
          <PackagePlus {...ICONO} aria-hidden="true" />
          Ingresar mercadería
        </Link>
      </div>

      <div className="card mb">
        <div className="fila fila-fin" role="search">
          <Campo label="Buscar" icon={Search} style={{ flex: 3 }}>
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Nombre, código, código de color, color o proveedor…"
              autoComplete="off"
            />
          </Campo>
          <Campo label="Proveedor" icon={Truck} style={{ flex: 1.4 }}>
            <select value={filtroProv} onChange={(e) => setFiltroProv(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((p) => <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>)}
              <option value={SIN_PROVEEDOR}>Sin proveedor</option>
            </select>
          </Campo>
          <Campo label="Ubicación" icon={MapPin} style={{ flex: 1 }}>
            <select value={filtroUbic} onChange={(e) => setFiltroUbic(e.target.value)}>
              <option value="">Todas</option>
              {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
            </select>
          </Campo>
        </div>
        {!cargando && (
          <div className="inventario-resumen" aria-live="polite">
            <span><Layers {...ICONO_SM} aria-hidden="true" /><strong>{fmtNum(telasFiltradas.length)}</strong> tela{telasFiltradas.length !== 1 ? 's' : ''}</span>
            <span><Cylinder {...ICONO_SM} aria-hidden="true" /><strong>{fmtNum(totales.rollos)}</strong> rollos disponibles</span>
            <span><strong>{fmtMetros(totales.metros)}</strong> en stock</span>
            {hayFiltros && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setBuscar(''); setFiltroUbic(''); setFiltroProv('') }}>
                <X size={14} strokeWidth={2} aria-hidden="true" />Quitar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {ok && <Mensaje tipo="ok">{ok}</Mensaje>}

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
            <div className={`acordeon-item ${open ? 'abierto' : ''}`} key={t.idTela}>
              <div className="acordeon-fila">
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
                      {t.nombre}
                      {t.color && <span className="acordeon-color">· {t.color}</span>}
                      {t.bajoStock && <StockBajoBadge />}
                    </span>
                    <span className="acordeon-meta">
                      <span className="mono"><Barcode {...ICONO_SM} aria-hidden="true" />{t.codigo}</span>
                      <CodigoColorBadge codigo={t.codigoColor} />
                      <ProveedorTexto nombre={t.proveedor} />
                      {t.diseno && <span><Shapes {...ICONO_SM} aria-hidden="true" />{t.diseno}</span>}
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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm acordeon-editar"
                  onClick={() => abrirEdicion(t)}
                  aria-label={`Editar ficha de ${t.nombre}`}
                  title="Editar ficha"
                >
                  <Pencil size={14} strokeWidth={2} aria-hidden="true" /><span className="texto-editar">Editar</span>
                </button>
              </div>

              {open && (
                <div className="acordeon-cuerpo" id={idCuerpo}>
                  {(!t.codigoColor || !t.proveedor) && (
                    <div className="aviso-ficha">
                      <TriangleAlert {...ICONO_SM} aria-hidden="true" />
                      Falta {[!t.codigoColor && 'el código de color', !t.proveedor && 'el proveedor'].filter(Boolean).join(' y ')}.
                      <button type="button" className="enlace-codigo" onClick={() => abrirEdicion(t)}>Completar ficha</button>
                    </div>
                  )}
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
                      <table className="tabla tabla-rollos">
                        <thead>
                          <tr>
                            <th>Código de barras</th>
                            <th>Ubicación</th>
                            <th className="num">Metros actuales</th>
                            <th className="num">Metros iniciales</th>
                            <th>Estado</th>
                            <th>Ingreso</th>
                            <th className="num">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rollosMostrados.map((r) => {
                            const cod = encodeURIComponent(r.codigoBarras)
                            return (
                              <tr key={r.idRollo}>
                                <td data-label="Código" className="mono celda-titulo">{r.codigoBarras}</td>
                                <td data-label="Ubicación"><UbicacionBadge nombre={r.ubicacion} /></td>
                                <td data-label="Metros actuales" className="mono num"><strong>{fmtMetros(r.metrosActuales)}</strong></td>
                                <td data-label="Metros iniciales" className="mono num tenue">{fmtMetros(r.metrosIniciales)}</td>
                                <td data-label="Estado"><EstadoBadge estado={r.estado} /></td>
                                <td data-label="Ingreso" className="nowrap">{fmtSoloFecha(r.fechaIngreso)}</td>
                                <td className="num celda-acciones">
                                  <div className="acciones-tabla">
                                    {r.estado === 'Disponible' && (
                                      <Link to={`/escanear?codigo=${cod}`} className="btn btn-primary btn-sm" aria-label={`Cortar el rollo ${r.codigoBarras}`}>
                                        <Scissors size={14} strokeWidth={2} aria-hidden="true" />Cortar
                                      </Link>
                                    )}
                                    {r.estado !== 'Anulado' && (
                                      <Link to={`/traslados?codigo=${cod}`} className="btn btn-ghost btn-sm accion-secundaria" aria-label={`Trasladar el rollo ${r.codigoBarras}`} title="Trasladar">
                                        <ArrowLeftRight size={14} strokeWidth={2} aria-hidden="true" /><span className="solo-movil">Trasladar</span>
                                      </Link>
                                    )}
                                    <Link to={`/reportes?rollo=${cod}`} className="btn btn-ghost btn-sm accion-secundaria" aria-label={`Ver historial del rollo ${r.codigoBarras}`} title="Historial">
                                      <Route size={14} strokeWidth={2} aria-hidden="true" /><span className="solo-movil">Historial</span>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
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

      {/* -------- Modal: editar ficha de la tela -------- */}
      <Modal
        abierto={!!editando}
        titulo={editando ? `Ficha de ${editando.codigo}` : ''}
        icono={Pencil}
        onCerrar={cerrarEdicion}
        pie={(
          <>
            <button type="button" className="btn btn-ghost" onClick={cerrarEdicion} disabled={guardando}>Cancelar</button>
            <button type="submit" form="form-ficha" className="btn btn-primary" disabled={guardando}>
              <Save size={16} strokeWidth={1.75} aria-hidden="true" />{guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        )}
      >
        {form && (
          <form id="form-ficha" onSubmit={guardarFicha} noValidate>
            {errModal && <Mensaje tipo="error">{errModal}</Mensaje>}
            <div className="fila">
              <Campo label="Nombre de la tela" icon={Layers} requerido error={errForm.nombre} style={{ flex: 2 }}>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </Campo>
              <Campo label="Código de color" icon={SwatchBook} error={errForm.codigoColor}>
                <input
                  className="mono"
                  value={form.codigoColor}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, codigoColor: e.target.value.toUpperCase() })}
                  placeholder="Ej. AZ-210"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Campo>
            </div>
            <div className="fila">
              <Campo label="Color" icon={Palette}>
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Ej. Azul marino" />
              </Campo>
              <Campo label="Diseño" icon={Shapes}>
                <input value={form.diseno} onChange={(e) => setForm({ ...form, diseno: e.target.value })} placeholder="Ej. Liso" />
              </Campo>
            </div>
            <div className="fila" style={{ alignItems: 'flex-start' }}>
              <ProveedorCampo
                style={{ flex: 2 }}
                proveedores={proveedores}
                value={form.idProveedor}
                onChange={(v) => setForm((f) => ({ ...f, idProveedor: v }))}
                onCreado={(p) => setProveedores((ps) => [...ps, p].sort((x, y) => x.nombre.localeCompare(y.nombre)))}
              />
              <Campo label="Stock mínimo (m)" icon={TriangleAlert} requerido error={errForm.stockMinimo}>
                <input type="number" min="1" step="1" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} />
              </Campo>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
