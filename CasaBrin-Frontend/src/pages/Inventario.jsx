import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, MapPin, ChevronRight, Layers, Cylinder, PackagePlus, SearchX, History, Truck, Ruler,
  Pencil, Scissors, ArrowLeftRight, SwatchBook, Palette, Shapes, TriangleAlert, Save, X, Copy,
  Warehouse, Store, Gauge, ChevronLeft, ClipboardList,
} from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros, fmtNum, fmtSoloFecha } from '../lib/format.js'
import { tonoDeColor, esTonoClaro } from '../lib/colores.js'
import Campo from '../components/Campo.jsx'
import Modal from '../components/Modal.jsx'
import ProveedorCampo from '../components/ProveedorCampo.jsx'
import TrasladoModal from '../components/TrasladoModal.jsx'
import MenuAcciones from '../components/MenuAcciones.jsx'
import {
  ICONO, ICONO_SM, EstadoBadge, UbicacionBadge, CodigoColorBadge, iconoUbicacion, Vacio, Mensaje,
  Encabezado, Indicador, DistribucionStock,
} from '../components/ui.jsx'
import './pages.css'
import './inventario.css'

// ¿La tela tiene stock en la ubicación seleccionada? (para Bodega/Local del seed)
function telaEnUbicacion(t, nombreUbic) {
  if (!nombreUbic) return true
  const n = nombreUbic.toLowerCase()
  if (n.includes('bodega')) return Number(t.metrosBodega) > 0
  if (n.includes('local')) return Number(t.metrosLocal) > 0
  return true
}

// Estado del stock a partir de los datos reales: sin metros, bajo el mínimo (bandera del backend) o normal.
function estadoStock(t) {
  if (Number(t.metrosTotales) <= 0) return 'sin'
  if (t.bajoStock) return 'bajo'
  return 'normal'
}

const normalizar = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const SIN_PROVEEDOR = 'sin'
const POR_PAGINA = 20

function Muestra({ color }) {
  const tono = tonoDeColor(color)
  return (
    <span
      className={`inv-muestra ${!tono ? 'sin-tono' : ''} ${esTonoClaro(tono) ? 'clara' : ''}`}
      style={tono ? { background: tono } : undefined}
      title={color ? `Color: ${color}${tono ? '' : ' (sin muestra disponible)'}` : 'Sin color registrado'}
      aria-hidden="true"
    />
  )
}

function EstadoStockBadge({ estado }) {
  if (estado === 'sin') return <span className="badge inv-badge-sin">Sin stock</span>
  if (estado === 'bajo') return <span className="badge badge-alerta">Stock bajo</span>
  return null   // estado normal: sin etiqueta para no recargar la fila
}

export default function Inventario() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [buscar, setBuscar] = useState('')
  const [filtroUbic, setFiltroUbic] = useState('')     // '' = todas
  const [filtroProv, setFiltroProv] = useState('')     // '' = todos, 'sin' = sin proveedor
  const [filtroEstado, setFiltroEstado] = useState(() => {   // '' | 'normal' | 'bajo' | 'sin'
    const e = searchParams.get('estado')
    return ['normal', 'bajo', 'sin'].includes(e) ? e : ''
  })
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})
  const refBuscar = useRef(null)

  // Edición de ficha
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const [errForm, setErrForm] = useState({})
  const [errModal, setErrModal] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Traslado (ventana emergente). codigo = null → se escanea dentro del modal.
  const [traslado, setTraslado] = useState({ abierto: false, codigo: null })

  // Carga el catálogo completo una vez: los indicadores y las pestañas se calculan
  // sobre todas las telas, y la búsqueda filtra en pantalla al instante.
  async function cargar({ silencioso = false } = {}) {
    if (!silencioso) setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/telas')
      setTelas(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    ;(async () => {
      try {
        const [u, p] = await Promise.all([api.get('/catalogos/ubicaciones'), api.get('/catalogos/proveedores')])
        setUbicaciones(u.data)
        setProveedores(p.data)
      } catch { /* no crítico: los filtros quedan con "Todas/Todos" */ }
    })()
  }, [])

  // Los mensajes de éxito se ocultan solos.
  useEffect(() => {
    if (!ok) return
    const t = setTimeout(() => setOk(''), 6000)
    return () => clearTimeout(t)
  }, [ok])

  // Al cambiar cualquier filtro se vuelve a la primera página.
  useEffect(() => { setPagina(1) }, [buscar, filtroUbic, filtroProv, filtroEstado])

  const nombreFiltro = useMemo(
    () => ubicaciones.find((u) => String(u.idUbicacion) === String(filtroUbic))?.nombre || '',
    [ubicaciones, filtroUbic],
  )

  // Filtros de búsqueda, proveedor y ubicación (sin el de estado, para contar las pestañas).
  const telasBase = useMemo(() => {
    const q = normalizar(buscar.trim())
    return telas
      .filter((t) => !q || [t.nombre, t.codigo, t.codigoColor, t.color, t.proveedor, t.diseno, t.tipoTela]
        .some((v) => normalizar(v).includes(q)))
      .filter((t) => telaEnUbicacion(t, nombreFiltro))
      .filter((t) => !filtroProv
        || (filtroProv === SIN_PROVEEDOR ? !t.idProveedor : String(t.idProveedor) === filtroProv))
  }, [telas, buscar, nombreFiltro, filtroProv])

  const conteo = useMemo(() => ({
    todas: telasBase.length,
    bajo: telasBase.filter((t) => estadoStock(t) === 'bajo').length,
    sin: telasBase.filter((t) => estadoStock(t) === 'sin').length,
  }), [telasBase])

  const telasFiltradas = useMemo(
    () => (filtroEstado ? telasBase.filter((t) => estadoStock(t) === filtroEstado) : telasBase),
    [telasBase, filtroEstado],
  )

  const totalPaginas = Math.max(1, Math.ceil(telasFiltradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = telasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  // Indicadores: siempre del inventario completo (datos reales del backend).
  const kpi = useMemo(() => ({
    telas: telas.length,
    rollos: telas.reduce((a, t) => a + Number(t.rollosDisponibles || 0), 0),
    metros: telas.reduce((a, t) => a + Number(t.metrosTotales || 0), 0),
    bodega: telas.reduce((a, t) => a + Number(t.metrosBodega || 0), 0),
    local: telas.reduce((a, t) => a + Number(t.metrosLocal || 0), 0),
    bajo: telas.filter((t) => t.bajoStock).length,
  }), [telas])

  async function cargarDetalle(idTela) {
    setDetalles((d) => ({ ...d, [idTela]: { cargando: true, rollos: d[idTela]?.rollos || [] } }))
    try {
      const { data } = await api.get(`/telas/${idTela}`)
      setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: data.rollos || [] } }))
    } catch (e) {
      setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: [], error: e.message } }))
    }
  }

  function toggle(idTela) {
    if (abierta === idTela) { setAbierta(null); return }
    setAbierta(idTela)
    if (!detalles[idTela]) cargarDetalle(idTela)
  }

  // Clic en cualquier parte de la fila la despliega, salvo en sus botones/enlaces.
  function clicFila(e, idTela) {
    if (e.target.closest('button, a, input, select')) return
    toggle(idTela)
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
      const id = editando.idTela
      setEditando(null)
      setOk(`Ficha de «${nombre}» actualizada.`)
      await cargar({ silencioso: true })
      if (detalles[id]) cargarDetalle(id)
    } catch (err) {
      setErrModal(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function alTrasladar(rollo, nombreDestino) {
    setTraslado({ abierto: false, codigo: null })
    setError('')
    setOk(`Rollo ${rollo.codigoBarras} (${rollo.telaNombre}) trasladado a ${nombreDestino}. Quedó registrado en su historial.`)
    await cargar({ silencioso: true })
    if (detalles[rollo.idTela]) cargarDetalle(rollo.idTela)
  }

  async function copiarCodigo(codigo) {
    try {
      await navigator.clipboard.writeText(codigo)
      setOk(`Código ${codigo} copiado.`)
    } catch {
      setError('El navegador no permitió copiar el código.')
    }
  }

  function limpiarFiltros() {
    setBuscar('')
    setFiltroUbic('')
    setFiltroProv('')
    setFiltroEstado('')
    refBuscar.current?.focus()
  }

  const hayFiltros = Boolean(buscar || filtroUbic || filtroProv || filtroEstado)
  const PESTANAS = [
    { id: '', texto: 'Todas las telas', n: conteo.todas },
    { id: 'bajo', texto: 'Stock bajo', n: conteo.bajo },
    { id: 'sin', texto: 'Sin stock', n: conteo.sin },
  ]

  return (
    <div className="inv-pagina">
      {/* 1. Encabezado */}
      <Encabezado titulo="Inventario de telas" subtitulo="Gestiona las existencias y movimientos de tus telas">
        <button type="button" className="btn btn-secondary" onClick={() => { setOk(''); setTraslado({ abierto: true, codigo: null }) }}>
          <ArrowLeftRight {...ICONO} aria-hidden="true" />Trasladar rollo
        </button>
        <Link to="/ingreso" className="btn btn-primary">
          <PackagePlus {...ICONO} aria-hidden="true" />Ingresar mercadería
        </Link>
      </Encabezado>

      {/* 2. Indicadores */}
      <section className="kpis inv-kpis" aria-label="Resumen del inventario">
        {cargando ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="kpi esq-kpi" aria-hidden="true" />)
        ) : (
          <>
            <Indicador icono={Layers} etiqueta="Telas registradas" valor={fmtNum(kpi.telas)} />
            <Indicador icono={Cylinder} etiqueta="Rollos disponibles" valor={fmtNum(kpi.rollos)} />
            <Indicador icono={Ruler} etiqueta="Metros en stock" valor={fmtMetros(kpi.metros)}>
              <DistribucionStock bodega={kpi.bodega} local={kpi.local} formato={fmtMetros} />
            </Indicador>
            <Indicador
              icono={TriangleAlert}
              etiqueta="Telas con stock bajo"
              valor={fmtNum(kpi.bajo)}
              alerta={kpi.bajo > 0}
              onClick={kpi.bajo > 0 ? () => setFiltroEstado('bajo') : undefined}
              titulo={kpi.bajo > 0 ? 'Mostrar solo las telas con stock bajo' : undefined}
            >
              {kpi.bajo > 0 ? 'Mostrar solo esas telas' : 'Sin telas bajo el mínimo'}
            </Indicador>
          </>
        )}
      </section>

      {/* 3 y 4. Pestañas rápidas + buscador y filtros */}
      <section className="inv-filtros" aria-label="Filtros del inventario">
        <div className="inv-pestanas" role="tablist" aria-label="Filtrar por estado del stock">
          {PESTANAS.map((p) => (
            <button
              key={p.id || 'todas'}
              type="button"
              role="tab"
              aria-selected={filtroEstado === p.id}
              className={`inv-pestana ${filtroEstado === p.id ? 'activa' : ''} ${p.id === 'bajo' ? 'ambar' : ''}`}
              onClick={() => setFiltroEstado(p.id)}
            >
              {p.texto}<span className="inv-pestana-n">{fmtNum(p.n)}</span>
            </button>
          ))}
        </div>

        <div className="inv-barra" role="search">
          <label className="inv-buscar">
            <span className="sr-only">Buscar telas</span>
            <Search size={17} strokeWidth={1.75} aria-hidden="true" />
            <input
              ref={refBuscar}
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, código, código de color, color o proveedor"
              autoComplete="off"
            />
          </label>
          <label className="inv-select">
            <span className="sr-only">Proveedor</span>
            <Truck size={16} strokeWidth={1.75} aria-hidden="true" />
            <select value={filtroProv} onChange={(e) => setFiltroProv(e.target.value)} aria-label="Filtrar por proveedor">
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>)}
              <option value={SIN_PROVEEDOR}>Sin proveedor</option>
            </select>
          </label>
          <label className="inv-select">
            <span className="sr-only">Ubicación</span>
            <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
            <select value={filtroUbic} onChange={(e) => setFiltroUbic(e.target.value)} aria-label="Filtrar por ubicación">
              <option value="">Todas las ubicaciones</option>
              {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
            </select>
          </label>
          <label className="inv-select">
            <span className="sr-only">Estado del stock</span>
            <Gauge size={16} strokeWidth={1.75} aria-hidden="true" />
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado del stock">
              <option value="">Cualquier estado</option>
              <option value="normal">Stock normal</option>
              <option value="bajo">Stock bajo</option>
              <option value="sin">Sin stock</option>
            </select>
          </label>
        </div>

        <div className="inv-resultados" aria-live="polite">
          {!cargando && (
            <span>
              <strong>{fmtNum(telasFiltradas.length)}</strong> {telasFiltradas.length === 1 ? 'tela encontrada' : 'telas encontradas'}
              {hayFiltros && telas.length > 0 && <span className="tenue"> de {fmtNum(telas.length)}</span>}
            </span>
          )}
          {hayFiltros && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={limpiarFiltros}>
              <X size={14} strokeWidth={2} aria-hidden="true" />Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {ok && <Mensaje tipo="ok">{ok}</Mensaje>}

      {/* 5. Listado */}
      <section className="inv-lista" aria-label="Telas" aria-busy={cargando}>
        <div className="inv-fila inv-encabezado" aria-hidden="true">
          <span /><span />
          <span>Tela</span>
          <span>Proveedor</span>
          <span className="num">Rollos</span>
          <span className="num">Bodega</span>
          <span className="num">Local</span>
          <span className="num">Total</span>
          <span>Estado</span>
          <span className="num">Acciones</span>
        </div>

        {cargando ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="inv-item" aria-hidden="true">
              <div className="inv-fila esqueleto-fila">
                <span /><span className="esq esq-circulo" />
                <span className="esq esq-texto" style={{ width: '70%' }} />
                <span className="esq esq-texto" style={{ width: '60%' }} />
                <span className="esq esq-texto corto" /><span className="esq esq-texto corto" />
                <span className="esq esq-texto corto" /><span className="esq esq-texto corto" />
                <span /><span />
              </div>
            </div>
          ))
        ) : telas.length === 0 && !error ? (
          <div className="inv-vacio">
            <Vacio icon={Layers} titulo="Aún no hay telas registradas">
              Registra tu primera tela y sus rollos para empezar a controlar el inventario.
            </Vacio>
            <Link to="/ingreso" className="btn btn-primary"><PackagePlus {...ICONO} aria-hidden="true" />Ingresar mercancía</Link>
          </div>
        ) : telasFiltradas.length === 0 ? (
          <div className="inv-vacio">
            <Vacio icon={SearchX} titulo="No se encontraron telas">
              {filtroEstado === 'sin' && !buscar && !filtroProv && !filtroUbic
                ? 'Todas las telas tienen existencias.'
                : filtroEstado === 'bajo' && !buscar && !filtroProv && !filtroUbic
                  ? 'Ninguna tela está por debajo de su stock mínimo.'
                  : 'Prueba con otra búsqueda o quita alguno de los filtros.'}
            </Vacio>
            {hayFiltros && (
              <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                <X size={16} strokeWidth={1.75} aria-hidden="true" />Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          visibles.map((t) => {
            const det = detalles[t.idTela]
            const open = abierta === t.idTela
            const estado = estadoStock(t)
            const rollos = det?.rollos || []
            const rollosMostrados = filtroUbic ? rollos.filter((r) => String(r.idUbicacion) === String(filtroUbic)) : rollos
            const idCuerpo = `tela-${t.idTela}-rollos`
            const bod = Number(t.metrosBodega) || 0
            const loc = Number(t.metrosLocal) || 0
            const tot = bod + loc
            const pBod = tot > 0 ? (bod / tot) * 100 : 0
            return (
              <article className={`inv-item ${open ? 'abierto' : ''} ${estado !== 'normal' ? `estado-${estado}` : ''}`} key={t.idTela}>
                <div className="inv-fila" onClick={(e) => clicFila(e, t.idTela)}>
                  <ChevronRight className="inv-chevron" size={18} strokeWidth={2} aria-hidden="true" />
                  <Muestra color={t.color} />
                  <div className="inv-celda-tela">
                    <button
                      type="button"
                      className="inv-nombre"
                      onClick={() => toggle(t.idTela)}
                      aria-expanded={open}
                      aria-controls={idCuerpo}
                    >
                      {t.nombre}
                      {t.color && <span className="inv-color-txt"> · {t.color}</span>}
                      <span className="sr-only">{open ? ', ocultar rollos' : ', ver rollos'}</span>
                    </button>
                    <div className="inv-sub">
                      <span className="mono" title="Código de la tela">{t.codigo}</span>
                      {t.codigoColor && <CodigoColorBadge codigo={t.codigoColor} />}
                    </div>
                  </div>
                  <div className="inv-celda-prov" data-label="Proveedor">
                    <span className={t.proveedor ? '' : 'tenue'}>{t.proveedor || 'Sin proveedor'}</span>
                    {t.diseno && <span className="inv-sub" title="Diseño"><Shapes size={12} strokeWidth={2} aria-hidden="true" />{t.diseno}</span>}
                  </div>
                  <div className="inv-cifras">
                    <div className="num inv-cifra" data-label="Rollos">{fmtNum(t.rollosDisponibles)}</div>
                    <div className="num inv-cifra" data-label="Bodega">{fmtMetros(bod)}</div>
                    <div className="num inv-cifra" data-label="Local">{fmtMetros(loc)}</div>
                    <div className="num inv-total" data-label="Total">{fmtMetros(t.metrosTotales)}</div>
                  </div>
                  <div className="inv-celda-estado"><EstadoStockBadge estado={estado} /></div>
                  <div className="inv-celda-acciones">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => abrirEdicion(t)}
                      aria-label={`Editar ficha de ${t.nombre}`}
                      data-tip="Editar ficha"
                    >
                      <Pencil size={15} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                    <MenuAcciones
                      etiqueta={`Más acciones de ${t.nombre}`}
                      items={[
                        { texto: open ? 'Ocultar rollos' : 'Ver rollos', icono: Cylinder, onClick: () => toggle(t.idTela) },
                        { texto: 'Ver movimientos de la tela', icono: ClipboardList, onClick: () => navigate(`/reportes?tela=${t.idTela}`) },
                        { texto: 'Editar ficha', icono: Pencil, onClick: () => abrirEdicion(t) },
                      ]}
                    />
                  </div>
                </div>

                {/* 6. Detalle desplegable */}
                {open && (
                  <div className="inv-detalle" id={idCuerpo}>
                    <div className="inv-distribucion">
                      <div className="inv-dist-dato">
                        <Warehouse size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>Bodega</span><strong>{fmtMetros(bod)}</strong>
                      </div>
                      <div
                        className="inv-dist-barra"
                        role="img"
                        aria-label={`Distribución: ${Math.round(pBod)}% en Bodega y ${Math.round(100 - pBod)}% en Local`}
                      >
                        {tot > 0
                          ? <><span className="bodega" style={{ width: `${pBod}%` }} /><span className="local" style={{ width: `${100 - pBod}%` }} /></>
                          : <span className="vacia" />}
                      </div>
                      <div className="inv-dist-dato local">
                        <Store size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>Local</span><strong>{fmtMetros(loc)}</strong>
                      </div>
                    </div>

                    {(!t.codigoColor || !t.proveedor) && (
                      <div className="aviso-ficha">
                        <TriangleAlert {...ICONO_SM} aria-hidden="true" />
                        Falta {[!t.codigoColor && 'el código de color', !t.proveedor && 'el proveedor'].filter(Boolean).join(' y ')}.
                        <button type="button" className="enlace-codigo" onClick={() => abrirEdicion(t)}>Completar ficha</button>
                      </div>
                    )}

                    {det?.cargando && !rollos.length ? (
                      <div className="inv-rollos-esqueleto" aria-hidden="true">
                        {[0, 1].map((i) => <span key={i} className="esq esq-linea" />)}
                      </div>
                    ) : det?.error ? (
                      <div style={{ padding: '0 1rem 1rem' }}><Mensaje tipo="error">{det.error}</Mensaje></div>
                    ) : rollosMostrados.length === 0 ? (
                      <Vacio icon={Cylinder}>
                        {filtroUbic ? `Sin rollos en ${nombreFiltro}.` : 'Esta tela no tiene rollos registrados.'}
                      </Vacio>
                    ) : (
                      <div className="tabla-scroll">
                        <table className="tabla tabla-rollos inv-tabla-rollos">
                          <caption className="sr-only">Rollos de {t.nombre}</caption>
                          <thead>
                            <tr>
                              <th>Código del rollo</th>
                              <th>Ubicación</th>
                              <th>Metros disponibles</th>
                              <th>Estado</th>
                              <th className="num">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rollosMostrados.map((r) => {
                              const otras = ubicaciones.filter((u) => u.idUbicacion !== r.idUbicacion)
                              const destino = otras.length === 1 ? otras[0].nombre : null
                              const IconoDestino = iconoUbicacion(destino)
                              const ini = Number(r.metrosIniciales) || 0
                              const pct = ini > 0 ? Math.max(0, Math.min(100, (Number(r.metrosActuales) / ini) * 100)) : 0
                              return (
                                <tr key={r.idRollo}>
                                  <td data-label="Código" className="celda-titulo">
                                    <span className="mono">{r.codigoBarras}</span>
                                    <span className="inv-sub">Ingreso {fmtSoloFecha(r.fechaIngreso)}</span>
                                  </td>
                                  <td data-label="Ubicación"><UbicacionBadge nombre={r.ubicacion} /></td>
                                  <td data-label="Metros">
                                    <div className="metraje" title={`Quedan ${fmtMetros(r.metrosActuales)} de ${fmtMetros(r.metrosIniciales)}`}>
                                      <span className="metraje-texto">
                                        <strong className="mono">{fmtMetros(r.metrosActuales)}</strong>
                                        <span className="tenue"> de {fmtMetros(r.metrosIniciales)}</span>
                                      </span>
                                      <span className="metraje-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                                    </div>
                                  </td>
                                  <td data-label="Estado"><EstadoBadge estado={r.estado} /></td>
                                  <td className="num celda-acciones">
                                    <div className="acciones-tabla">
                                      {r.estado === 'Disponible' && (
                                        <Link to={`/escanear?codigo=${encodeURIComponent(r.codigoBarras)}`} className="btn btn-primary btn-sm" aria-label={`Cortar el rollo ${r.codigoBarras}`}>
                                          <Scissors size={14} strokeWidth={2} aria-hidden="true" />Cortar
                                        </Link>
                                      )}
                                      {r.estado !== 'Anulado' && (
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => { setOk(''); setTraslado({ abierto: true, codigo: r.codigoBarras }) }}
                                          aria-label={destino ? `Trasladar el rollo ${r.codigoBarras} a ${destino}` : `Trasladar el rollo ${r.codigoBarras}`}
                                          title={destino ? `Trasladar de ${r.ubicacion} a ${destino}` : 'Trasladar a otra ubicación'}
                                        >
                                          {destino
                                            ? <><IconoDestino size={14} strokeWidth={2} aria-hidden="true" />Mover a {destino}</>
                                            : <><ArrowLeftRight size={14} strokeWidth={2} aria-hidden="true" />Trasladar</>}
                                        </button>
                                      )}
                                      <MenuAcciones
                                        etiqueta={`Más acciones del rollo ${r.codigoBarras}`}
                                        items={[
                                          { texto: 'Ver historial del rollo', icono: History, onClick: () => navigate(`/reportes?rollo=${encodeURIComponent(r.codigoBarras)}`) },
                                          { texto: 'Copiar código', icono: Copy, onClick: () => copiarCodigo(r.codigoBarras) },
                                        ]}
                                      />
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
              </article>
            )
          })
        )}
      </section>

      {/* 7. Paginación (en pantalla, sobre los datos ya cargados) */}
      {!cargando && totalPaginas > 1 && (
        <nav className="paginacion" aria-label="Paginación de telas">
          <span className="paginacion-info">
            {fmtNum((paginaActual - 1) * POR_PAGINA + 1)}–{fmtNum(Math.min(paginaActual * POR_PAGINA, telasFiltradas.length))} de {fmtNum(telasFiltradas.length)} telas
          </span>
          <div className="paginacion-botones">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual <= 1}>
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />Anterior
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= totalPaginas}>
              Siguiente<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      {/* -------- Modal: trasladar rollo -------- */}
      <TrasladoModal
        abierto={traslado.abierto}
        codigoInicial={traslado.codigo}
        ubicaciones={ubicaciones}
        onCerrar={() => setTraslado({ abierto: false, codigo: null })}
        onTrasladado={alTrasladar}
      />

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
