import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  TriangleAlert, CircleCheck, History, List, Calendar, Filter, RotateCcw, SearchX, ChevronLeft, ChevronRight,
  Cylinder, Barcode, Layers, Download, Printer, X, Route, Ruler, Scissors,
} from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros, fmtNum, fmtFecha, fmtSoloFecha, rangoUtc } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import {
  ICONO, ICONO_SM, TipoMovimiento, EstadoBadge, UbicacionBadge, CodigoColorBadge, ProveedorTexto, Vacio, Cargando, Mensaje,
} from '../components/ui.jsx'
import './pages.css'

const TIPOS = ['Ingreso', 'Traslado', 'Salida', 'Ajuste', 'Anulacion']
const PAGE_SIZE = 25
const FILTROS_VACIOS = { tipo: '', idTela: '', rollo: '', desde: '', hasta: '' }

// Lee los filtros desde la URL (?rollo=CB…&tela=3…) para que otros módulos enlacen aquí.
function filtrosDeUrl(sp) {
  return {
    tipo: sp.get('tipo') || '',
    idTela: sp.get('tela') || '',
    rollo: sp.get('rollo') || '',
    desde: sp.get('desde') || '',
    hasta: sp.get('hasta') || '',
  }
}
function urlDeFiltros(f) {
  const p = {}
  if (f.tipo) p.tipo = f.tipo
  if (f.idTela) p.tela = f.idTela
  if (f.rollo) p.rollo = f.rollo
  if (f.desde) p.desde = f.desde
  if (f.hasta) p.hasta = f.hasta
  return p
}

function csvCelda(v) {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const num = (v) => (Number(v) || 0).toLocaleString('es-EC', { maximumFractionDigits: 2, useGrouping: false })

export default function Reportes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [alertas, setAlertas] = useState([])
  const [telas, setTelas] = useState([])
  const [filtros, setFiltros] = useState(() => filtrosDeUrl(searchParams))
  const [aplicados, setAplicados] = useState(() => filtrosDeUrl(searchParams))
  const [rollo, setRollo] = useState(null)              // rollo resuelto (trazabilidad)
  const [movs, setMovs] = useState({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE })
  const [resumen, setResumen] = useState(null)
  const [page, setPage] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [a, t] = await Promise.all([api.get('/reportes/alertas'), api.get('/telas')])
        setAlertas(a.data)
        setTelas(t.data)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [])

  // Si la URL cambia desde otro módulo (enlace "Ver trazabilidad"), se aplican esos filtros.
  useEffect(() => {
    const f = filtrosDeUrl(searchParams)
    setFiltros(f)
    setAplicados(f)
    setPage(1)
  }, [searchParams])

  // Parámetros para la API a partir de los filtros aplicados.
  async function paramsApi(f) {
    let idRollo
    let info = null
    if (f.rollo) {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(f.rollo.trim())}`)
      info = data
      idRollo = data.idRollo
    }
    const { desde, hasta } = rangoUtc(f.desde, f.hasta)
    return {
      info,
      params: {
        tipo: f.tipo || undefined,
        idTela: f.idTela || undefined,
        idRollo,
        desde,
        hasta,
        // Un rollo se lee de principio a fin (orden cronológico); el historial general, lo último primero.
        orden: idRollo ? 'asc' : undefined,
      },
    }
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setCargando(true)
      setError('')
      try {
        const { info, params } = await paramsApi(aplicados)
        const [lista, res] = await Promise.all([
          api.get('/reportes/movimientos', { params: { ...params, page, pageSize: PAGE_SIZE } }),
          api.get('/reportes/movimientos/resumen', { params: { ...params, orden: undefined } }),
        ])
        if (!vivo) return
        setRollo(info)
        setMovs(lista.data)
        setResumen(res.data)
      } catch (e) {
        if (!vivo) return
        setRollo(null)
        setMovs({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE })
        setResumen(null)
        setError(aplicados.rollo ? `No se encontró el rollo «${aplicados.rollo}». ${e.message}` : e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => { vivo = false }
  }, [aplicados, page])

  function aplicar(f = filtros) {
    setSearchParams(urlDeFiltros(f))   // el efecto de la URL aplica los filtros
  }
  function limpiar() {
    setFiltros(FILTROS_VACIOS)
    setSearchParams({})
  }
  function verRollo(codigo) {
    aplicar({ ...FILTROS_VACIOS, rollo: codigo })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPaginas = Math.max(1, Math.ceil(movs.total / PAGE_SIZE))
  function irA(p) {
    if (p < 1 || p > totalPaginas) return
    setPage(p)
  }

  const nombreTela = useMemo(
    () => telas.find((t) => String(t.idTela) === String(aplicados.idTela)),
    [telas, aplicados.idTela],
  )
  const hayFiltros = Object.values(aplicados).some(Boolean)
  const descripcionFiltros = [
    aplicados.rollo && `Rollo ${aplicados.rollo}`,
    nombreTela && `Tela ${nombreTela.codigo} · ${nombreTela.nombre}`,
    aplicados.tipo && `Tipo ${aplicados.tipo}`,
    aplicados.desde && `Desde ${fmtSoloFecha(`${aplicados.desde}T12:00:00Z`)}`,
    aplicados.hasta && `Hasta ${fmtSoloFecha(`${aplicados.hasta}T12:00:00Z`)}`,
  ].filter(Boolean).join(' · ') || 'Todos los movimientos'

  const porTipo = useMemo(() => {
    const m = {}
    for (const r of resumen?.porTipo || []) m[r.tipo] = r
    return m
  }, [resumen])

  // Exporta TODOS los movimientos del filtro (no solo la página visible) a CSV para Excel.
  async function exportar() {
    setExportando(true)
    setError('')
    try {
      const { params } = await paramsApi(aplicados)
      const filas = []
      let p = 1
      let total = 0
      do {
        const { data } = await api.get('/reportes/movimientos', { params: { ...params, page: p, pageSize: 200 } })
        filas.push(...data.items)
        total = data.total
        p++
      } while (filas.length < total && p < 500)

      const cab = ['Fecha', 'Tipo', 'Código tela', 'Tela', 'Código rollo', 'Metros', 'Metros antes', 'Metros después',
        'Origen', 'Destino', 'Usuario', 'Observación']
      const lineas = filas.map((m) => [
        fmtFecha(m.fecha), m.tipo, m.codigoTela, m.tela, m.codigoBarras, num(m.metros), num(m.metrosAntes),
        num(m.metrosDespues), m.ubicacionOrigen || '', m.ubicacionDestino || '', m.usuario, m.observacion || '',
      ].map(csvCelda).join(';'))
      const contenido = '﻿' + [`Reporte de movimientos Casa Brin;${csvCelda(descripcionFiltros)}`, cab.join(';'), ...lineas].join('\r\n')
      const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const hoy = new Date()
      const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
      const sufijo = aplicados.rollo ? `rollo-${aplicados.rollo}` : fechaLocal
      a.href = url
      a.download = `movimientos-casabrin-${sufijo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setExportando(false)
    }
  }

  const cortado = rollo ? Math.max(0, Number(rollo.metrosIniciales) - Number(rollo.metrosActuales)) : 0

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Movimientos y reporte</h1>
          <p>Trazabilidad de cada rollo: ingreso, traslados, cortes, ajustes y anulaciones.</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()} disabled={!movs.total}>
            <Printer size={16} strokeWidth={1.75} aria-hidden="true" />Imprimir
          </button>
          <button type="button" className="btn btn-primary" onClick={exportar} disabled={!movs.total || exportando}>
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            {exportando ? 'Exportando…' : 'Exportar a Excel (CSV)'}
          </button>
        </div>
      </div>

      {/* Encabezado solo para la versión impresa */}
      <div className="solo-print reporte-print-cab">
        <strong>Casa Brin — Reporte de movimientos</strong>
        <span>{descripcionFiltros}</span>
        <span>Generado: {fmtFecha(new Date().toISOString())}</span>
      </div>

      {error && <Mensaje tipo="error" className="no-print">{error}</Mensaje>}

      {/* -------- Alertas de stock bajo -------- */}
      {!aplicados.rollo && (
        <div className="seccion no-print" style={{ marginTop: 0 }}>
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
      )}

      {/* -------- Filtros -------- */}
      <div className="seccion" style={aplicados.rollo ? { marginTop: 0 } : undefined}>
        <div className="seccion-titulo no-print">
          <span className="titulo-icono"><History {...ICONO} aria-hidden="true" />Historial de movimientos</span>
        </div>

        <form
          className="card mb no-print"
          onSubmit={(e) => { e.preventDefault(); aplicar() }}
          role="search"
          aria-label="Filtros del reporte"
        >
          <div className="fila fila-fin">
            <Campo label="Código de rollo" icon={Barcode} style={{ flex: 1.3 }}>
              <input
                className="mono"
                value={filtros.rollo}
                onChange={(e) => setFiltros({ ...filtros, rollo: e.target.value })}
                placeholder="Escanea o escribe"
                autoComplete="off"
                spellCheck={false}
              />
            </Campo>
            <Campo label="Tela" icon={Layers} style={{ flex: 1.5 }}>
              <select value={filtros.idTela} onChange={(e) => setFiltros({ ...filtros, idTela: e.target.value })}>
                <option value="">Todas</option>
                {telas.map((t) => <option key={t.idTela} value={t.idTela}>{t.codigo} · {t.nombre}{t.codigoColor ? ` · ${t.codigoColor}` : ''}</option>)}
              </select>
            </Campo>
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
              <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            </Campo>
          </div>
          <div className="filtros-acciones">
            <button type="submit" className="btn btn-primary">
              <Filter size={16} strokeWidth={1.75} aria-hidden="true" />Filtrar
            </button>
            <button type="button" className="btn btn-ghost" onClick={limpiar} disabled={!hayFiltros && !Object.values(filtros).some(Boolean)}>
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Limpiar
            </button>
          </div>
        </form>

        {/* -------- Trazabilidad del rollo -------- */}
        {rollo && (
          <div className="card mb traza-card">
            <div className="seccion-titulo" style={{ marginBottom: '0.75rem' }}>
              <span className="titulo-icono"><Route {...ICONO} aria-hidden="true" />Trazabilidad del rollo</span>
              <button type="button" className="btn btn-ghost btn-sm no-print" onClick={limpiar}>
                <X size={14} strokeWidth={2} aria-hidden="true" />Quitar filtro
              </button>
            </div>
            <div className="traza-cab">
              <div>
                <div className="rollo-nombre">{rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}</div>
                <div className="rollo-codigo mono" style={{ marginBottom: 0 }}><Barcode {...ICONO_SM} aria-hidden="true" />{rollo.codigoBarras}</div>
              </div>
              <div className="chips">
                <CodigoColorBadge codigo={rollo.codigoColor} />
                <ProveedorTexto nombre={rollo.proveedor} />
                <EstadoBadge estado={rollo.estado} />
                <UbicacionBadge nombre={rollo.ubicacion} />
              </div>
            </div>
            <div className="traza-cifras">
              <div><span><Calendar {...ICONO_SM} aria-hidden="true" />Ingreso</span><strong>{fmtSoloFecha(rollo.fechaIngreso)}</strong></div>
              <div><span><Ruler {...ICONO_SM} aria-hidden="true" />Metros iniciales</span><strong>{fmtMetros(rollo.metrosIniciales)}</strong></div>
              <div><span><Scissors {...ICONO_SM} aria-hidden="true" />Cortado / ajustado</span><strong>{fmtMetros(cortado)}</strong></div>
              <div><span><Cylinder {...ICONO_SM} aria-hidden="true" />Saldo actual</span><strong className="traza-saldo">{fmtMetros(rollo.metrosActuales)}</strong></div>
            </div>
          </div>
        )}

        {/* -------- Resumen del reporte -------- */}
        {resumen && resumen.total > 0 && (
          <div className="resumen-tipos" aria-label="Resumen por tipo de movimiento">
            {TIPOS.filter((t) => porTipo[t]).map((t) => (
              <div className="resumen-tipo" key={t}>
                <TipoMovimiento tipo={t} />
                <div className="resumen-tipo-cifra">{fmtNum(porTipo[t].cantidad)}</div>
                <div className="resumen-tipo-sub">{fmtMetros(porTipo[t].metros)}</div>
              </div>
            ))}
            <div className="resumen-tipo total">
              <span className="badge badge-neutro">Total</span>
              <div className="resumen-tipo-cifra">{fmtNum(resumen.total)}</div>
              <div className="resumen-tipo-sub">movimientos</div>
            </div>
          </div>
        )}

        {/* -------- Tabla -------- */}
        <div className="card card-flush">
          {cargando ? (
            <Cargando>Cargando movimientos…</Cargando>
          ) : movs.items.length === 0 ? (
            <Vacio icon={SearchX} titulo="Sin resultados">
              {hayFiltros ? 'No hay movimientos con esos filtros.' : 'Aún no hay movimientos registrados.'}
            </Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla tabla-reporte">
                <thead>
                  <tr>
                    {rollo && <th className="num">#</th>}
                    <th>Fecha</th>
                    <th>Tipo</th>
                    {!rollo && <th>Tela</th>}
                    {!rollo && <th>Rollo</th>}
                    <th className="num">Metros</th>
                    <th className="num">Antes → Después</th>
                    <th>Ubicación</th>
                    <th>Usuario</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.items.map((m, i) => (
                    <tr key={m.idMovimiento}>
                      {rollo && <td className="num tenue">{(page - 1) * PAGE_SIZE + i + 1}</td>}
                      <td className="nowrap">{fmtFecha(m.fecha)}</td>
                      <td><TipoMovimiento tipo={m.tipo} /></td>
                      {!rollo && <td>{m.tela}</td>}
                      {!rollo && (
                        <td>
                          <button
                            type="button"
                            className="enlace-codigo mono"
                            onClick={() => verRollo(m.codigoBarras)}
                            title="Ver trazabilidad de este rollo"
                            aria-label={`Ver trazabilidad del rollo ${m.codigoBarras}`}
                          >
                            {m.codigoBarras}
                          </button>
                        </td>
                      )}
                      <td className="mono num"><strong>{fmtMetros(m.metros)}</strong></td>
                      <td className="mono num tenue nowrap">
                        {fmtMetros(m.metrosAntes)} → {fmtMetros(m.metrosDespues)}
                      </td>
                      <td className="nowrap" style={{ fontSize: '0.82rem' }}>
                        {m.ubicacionOrigen && m.ubicacionDestino
                          ? <>{m.ubicacionOrigen} <span className="tenue">→</span> {m.ubicacionDestino}</>
                          : (m.ubicacionDestino || m.ubicacionOrigen || '—')}
                      </td>
                      <td>{m.usuario}</td>
                      <td className="tenue celda-obs">{m.observacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {movs.total > 0 && (
          <nav className="paginacion no-print" aria-label="Paginación">
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
        {movs.total > PAGE_SIZE && (
          <p className="solo-print" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            Página {page} de {totalPaginas}. Para el reporte completo usa «Exportar a Excel (CSV)».
          </p>
        )}
      </div>

      {aplicados.rollo && rollo && (
        <p className="no-print texto-ayuda" style={{ marginTop: '1rem' }}>
          <Link to={`/escanear`}>Ir a Escanear / Cortar</Link> · <Link to="/traslados">Ir a Traslados</Link>
        </p>
      )}
    </div>
  )
}
