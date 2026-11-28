import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TriangleAlert, Filter, SearchX, ChevronDown, Download, Printer, X,
} from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros, fmtNum, fmtFecha, fmtSoloFecha, rangoUtc } from '../lib/format.js'
import {
  Encabezado, TipoMovimiento, EstadoBadge, UbicacionBadge, CodigoColorBadge, Vacio, Mensaje, Paginacion,
} from '../components/ui.jsx'
import './pages.css'

const TIPOS = ['Ingreso', 'Traslado', 'Salida', 'Ajuste', 'Anulacion']
const PAGE_SIZE = 7   // registros por página
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
  const [verAlertas, setVerAlertas] = useState(null)   // null = automático (abiertas si son pocas)

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
  const alertasAbiertas = verAlertas ?? alertas.length <= 5
  // Fila de indicadores: los tres tipos principales y el total; los demás solo si aparecen.
  const INDICADORES = [
    { tipo: 'Ingreso', texto: 'Ingresos' },
    { tipo: 'Traslado', texto: 'Traslados' },
    { tipo: 'Salida', texto: 'Salidas' },
    ...(porTipo.Ajuste ? [{ tipo: 'Ajuste', texto: 'Ajustes' }] : []),
    ...(porTipo.Anulacion ? [{ tipo: 'Anulacion', texto: 'Anulaciones' }] : []),
  ]

  return (
    <div>
      <div className="no-print">
        <Encabezado titulo="Movimientos y reportes" subtitulo="Historial y control de operaciones">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()} disabled={!movs.total}>
            <Printer size={16} strokeWidth={1.9} aria-hidden="true" />Imprimir
          </button>
          <button type="button" className="btn btn-primary" onClick={exportar} disabled={!movs.total || exportando}>
            <Download size={16} strokeWidth={1.9} aria-hidden="true" />{exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </Encabezado>
      </div>

      {/* Encabezado solo para la versión impresa */}
      <div className="solo-print reporte-print-cab">
        <strong>Casa Brin — Reporte de movimientos</strong>
        <span>{descripcionFiltros}</span>
        <span>Generado: {fmtFecha(new Date().toISOString())}</span>
      </div>

      {error && <Mensaje tipo="error" className="no-print">{error}</Mensaje>}

      {/* -------- Alertas de stock bajo (compactas y plegables) -------- */}
      {!aplicados.rollo && (
        <section className={`panel alertas-panel no-print ${alertas.length ? 'con-alertas' : ''}`}>
          <button
            type="button"
            className="alertas-cab"
            onClick={() => setVerAlertas(!alertasAbiertas)}
            aria-expanded={alertasAbiertas}
            disabled={!alertas.length}
          >
            <TriangleAlert size={17} strokeWidth={1.9} aria-hidden="true" className={alertas.length ? 'icono-alerta' : 'icono-neutro'} />
            <span className="alertas-titulo">Alertas de stock bajo</span>
            <span className={`badge ${alertas.length ? 'badge-alerta' : 'badge-neutro'}`}>
              {alertas.length ? `${alertas.length} tela${alertas.length !== 1 ? 's' : ''}` : 'Sin alertas'}
            </span>
            {alertas.length > 0 && <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={`alertas-chevron ${alertasAbiertas ? 'abierto' : ''}`} />}
          </button>
          {alertas.length > 0 && alertasAbiertas && (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Código</th><th>Tela</th><th>Tipo</th>
                    <th className="num">Stock mínimo</th><th className="num">Metros actuales</th><th className="num">Rollos</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a) => (
                    <tr key={a.idTela}>
                      <td className="codigo">{a.codigo}</td>
                      <td>{a.nombre}</td>
                      <td>{a.tipoTela}</td>
                      <td className="num mono">{fmtMetros(a.stockMinimo)}</td>
                      <td className="num mono texto-alerta">{fmtMetros(a.metrosTotales)}</td>
                      <td className="num mono">{fmtNum(a.rollosDisponibles)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* -------- Filtros -------- */}
      <section className="bloque">
        <div className="bloque-cab no-print"><h2>Historial de movimientos</h2></div>
        <form
          className="panel filtros-linea no-print"
          onSubmit={(e) => { e.preventDefault(); aplicar() }}
          role="search"
          aria-label="Filtros del reporte"
        >
          <label className="filtro">
            <span>Código de rollo</span>
            <input
              className="mono"
              value={filtros.rollo}
              onChange={(e) => setFiltros({ ...filtros, rollo: e.target.value })}
              placeholder="Escanea o escribe"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="filtro ancho">
            <span>Tela</span>
            <select value={filtros.idTela} onChange={(e) => setFiltros({ ...filtros, idTela: e.target.value })}>
              <option value="">Todas</option>
              {telas.map((t) => <option key={t.idTela} value={t.idTela}>{t.codigo} · {t.nombre}{t.codigoColor ? ` · ${t.codigoColor}` : ''}</option>)}
            </select>
          </label>
          <label className="filtro">
            <span>Tipo</span>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t === 'Anulacion' ? 'Anulación' : t}</option>)}
            </select>
          </label>
          <label className="filtro">
            <span>Desde</span>
            <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
          </label>
          <label className="filtro">
            <span>Hasta</span>
            <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
          </label>
          <button type="submit" className="btn btn-primary">
            <Filter size={15} strokeWidth={1.9} aria-hidden="true" />Filtrar
          </button>
          <button type="button" className="btn btn-secondary" onClick={limpiar} disabled={!hayFiltros && !Object.values(filtros).some(Boolean)}>
            Limpiar
          </button>
        </form>

        {/* -------- Trazabilidad del rollo -------- */}
        {rollo && (
          <section className="panel traza-panel">
            <div className="panel-cab">
              <div>
                <h2>Trazabilidad · {rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}</h2>
                <p className="sub mono">{rollo.codigoBarras}</p>
              </div>
              <div className="chips">
                <CodigoColorBadge codigo={rollo.codigoColor} />
                <EstadoBadge estado={rollo.estado} />
                <UbicacionBadge nombre={rollo.ubicacion} />
                <button type="button" className="btn btn-ghost btn-sm no-print" onClick={limpiar}>
                  <X size={14} strokeWidth={2} aria-hidden="true" />Quitar filtro
                </button>
              </div>
            </div>
            <dl className="traza-datos">
              <div><dt>Ingreso</dt><dd>{fmtSoloFecha(rollo.fechaIngreso)}</dd></div>
              <div><dt>Metros iniciales</dt><dd>{fmtMetros(rollo.metrosIniciales)}</dd></div>
              <div><dt>Cortado / ajustado</dt><dd>{fmtMetros(cortado)}</dd></div>
              <div><dt>Saldo actual</dt><dd className="saldo">{fmtMetros(rollo.metrosActuales)}</dd></div>
              {rollo.proveedor && <div><dt>Proveedor</dt><dd>{rollo.proveedor}</dd></div>}
            </dl>
          </section>
        )}

        {/* -------- Indicadores de movimientos -------- */}
        {resumen && resumen.total > 0 && (
          <div className="indicadores-mov" aria-label="Resumen por tipo de movimiento">
            {INDICADORES.map(({ tipo, texto }) => (
              <div key={tipo} className="indicador-mov">
                <span className="indicador-mov-etq">{texto}</span>
                <span className="indicador-mov-valor">{fmtNum(porTipo[tipo]?.cantidad || 0)}</span>
                <span className="indicador-mov-sub">{fmtMetros(porTipo[tipo]?.metros || 0)}</span>
              </div>
            ))}
            <div className="indicador-mov total">
              <span className="indicador-mov-etq">Total de movimientos</span>
              <span className="indicador-mov-valor">{fmtNum(resumen.total)}</span>
              <span className="indicador-mov-sub">{descripcionFiltros === 'Todos los movimientos' ? 'Sin filtros' : 'Según los filtros'}</span>
            </div>
          </div>
        )}

        {/* -------- Tabla -------- */}
        <div className="panel">
          {cargando ? (
            <div className="filas-esqueleto" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="esq esq-linea" />)}</div>
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
                    <th className="num">Antes → después</th>
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
                          <button type="button" className="codigo enlace-discreto" onClick={() => verRollo(m.codigoBarras)} title="Ver trazabilidad del rollo">
                            {m.codigoBarras}
                          </button>
                        </td>
                      )}
                      <td className="num mono"><strong>{fmtMetros(m.metros)}</strong></td>
                      <td className="num mono nowrap tenue">{fmtMetros(m.metrosAntes)}<span className="flecha">→</span>{fmtMetros(m.metrosDespues)}</td>
                      <td className="nowrap">
                        {m.ubicacionOrigen && m.ubicacionDestino
                          ? <>{m.ubicacionOrigen}<span className="flecha">→</span>{m.ubicacionDestino}</>
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

        <Paginacion pagina={page} total={movs.total} porPagina={PAGE_SIZE} onCambiar={irA} unidad="movimientos" />
        {movs.total > PAGE_SIZE && (
          <p className="solo-print" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            Página {page} de {totalPaginas}. Para el reporte completo usa «Exportar CSV».
          </p>
        )}
      </section>
    </div>
  )
}
