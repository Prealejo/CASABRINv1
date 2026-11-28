import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers, Cylinder, Ruler, TriangleAlert, PackagePlus, History } from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros, fmtNum, fmtFecha } from '../lib/format.js'
import {
  ICONO, Encabezado, Indicador, DistribucionStock, TipoMovimiento, Vacio, Mensaje, Paginacion,
} from '../components/ui.jsx'
import './pages.css'

const POR_PAGINA = 7

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [movs, setMovs] = useState({ items: [], total: 0 })
  const [pagina, setPagina] = useState(1)
  const [cargandoMovs, setCargandoMovs] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data } = await api.get('/reportes/dashboard')
        if (vivo) setData(data)
      } catch (e) {
        if (vivo) setError(e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  // Movimientos paginados de 7 en 7 (los más recientes primero).
  useEffect(() => {
    let vivo = true
    setCargandoMovs(true)
    api.get('/reportes/movimientos', { params: { page: pagina, pageSize: POR_PAGINA } })
      .then(({ data }) => { if (vivo) setMovs(data) })
      .catch((e) => { if (vivo) setError(e.message) })
      .finally(() => { if (vivo) setCargandoMovs(false) })
    return () => { vivo = false }
  }, [pagina])

  const movimientos = movs.items

  return (
    <div>
      <Encabezado titulo="Panel general" subtitulo="Resumen del inventario">
        <Link to="/ingreso" className="btn btn-primary">
          <PackagePlus {...ICONO} aria-hidden="true" />Ingresar mercadería
        </Link>
      </Encabezado>

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <section className="kpis" aria-label="Indicadores del inventario" aria-busy={cargando}>
        {cargando || !data ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="kpi esq-kpi" aria-hidden="true" />)
        ) : (
          <>
            <Indicador icono={Layers} etiqueta="Telas registradas" valor={fmtNum(data.totalTelas)} />
            <Indicador icono={Cylinder} etiqueta="Rollos disponibles" valor={fmtNum(data.totalRollosDisponibles)} />
            <Indicador icono={Ruler} etiqueta="Metros en stock" valor={fmtMetros(data.metrosTotales)}>
              <DistribucionStock bodega={data.metrosBodega} local={data.metrosLocal} formato={fmtMetros} />
            </Indicador>
            <Indicador
              icono={TriangleAlert}
              etiqueta="Alertas de stock"
              valor={fmtNum(data.alertasBajoStock)}
              alerta={data.alertasBajoStock > 0}
              onClick={data.alertasBajoStock > 0 ? () => navigate('/inventario?estado=bajo') : undefined}
              titulo={data.alertasBajoStock > 0 ? 'Ver telas con stock bajo en Inventario' : undefined}
            >
              {data.alertasBajoStock > 0 ? 'Ver telas con stock bajo' : 'Sin telas bajo el mínimo'}
            </Indicador>
          </>
        )}
      </section>

      <section className="bloque">
        <div className="bloque-cab">
          <h2>Últimos movimientos</h2>
          <Link to="/reportes" className="btn btn-secondary btn-sm">
            <History size={15} strokeWidth={1.9} aria-hidden="true" />Ver historial completo
          </Link>
        </div>
        <div className="panel">
          {cargandoMovs && !movimientos.length ? (
            <div className="filas-esqueleto" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className="esq esq-linea" />)}</div>
          ) : movimientos.length === 0 ? (
            <Vacio icon={History} titulo="Sin movimientos">Aún no se ha registrado ningún movimiento.</Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Tela</th>
                    <th>Código del rollo</th>
                    <th className="num">Metros</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.idMovimiento}>
                      <td className="nowrap">{fmtFecha(m.fecha)}</td>
                      <td><TipoMovimiento tipo={m.tipo} /></td>
                      <td>{m.tela}</td>
                      <td>
                        <Link
                          to={`/reportes?rollo=${encodeURIComponent(m.codigoBarras)}`}
                          className="codigo enlace-discreto"
                          title="Ver trazabilidad del rollo"
                        >
                          {m.codigoBarras}
                        </Link>
                      </td>
                      <td className="num mono">{fmtMetros(m.metros)}</td>
                      <td>{m.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <Paginacion pagina={pagina} total={movs.total} porPagina={POR_PAGINA} onCambiar={setPagina} unidad="movimientos" />
      </section>
    </div>
  )
}
