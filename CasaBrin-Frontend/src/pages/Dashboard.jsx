import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, Cylinder, Ruler, TriangleAlert, PackagePlus, History, Warehouse, Store, ArrowRight, ClipboardList,
  Tag, ArrowLeftRight, Scissors, Workflow,
} from 'lucide-react'
import { api } from '../api/client.js'
import { fmtMetros, fmtNum, fmtFecha } from '../lib/format.js'
import { ICONO, ICONO_SM, TipoMovimiento, Vacio, Cargando, Mensaje } from '../components/ui.jsx'
import './pages.css'

// Orden recomendado del proceso: cada paso deja registro y alimenta al siguiente.
const FLUJO = [
  { to: '/ingreso', titulo: 'Recibir', Icon: PackagePlus, desc: 'Registra la tela y los rollos que llegan.' },
  { to: '/etiquetas', titulo: 'Etiquetar', Icon: Tag, desc: 'Imprime y pega el código en cada rollo.' },
  { to: '/inventario', titulo: 'Trasladar', Icon: ArrowLeftRight, desc: 'Desde Inventario, mueve a Local los rollos que salen a venta.' },
  { to: '/escanear', titulo: 'Cortar', Icon: Scissors, desc: 'Escanea el rollo y descuenta los metros vendidos.' },
  { to: '/reportes', titulo: 'Revisar', Icon: ClipboardList, desc: 'Consulta el historial y exporta el reporte.' },
]

function Stat({ label, valor, Icon, className = '', children }) {
  return (
    <div className={`stat ${className}`}>
      <div className="stat-cab">
        <span className="stat-label">{label}</span>
        <span className="stat-icono"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
      </div>
      <div className="stat-valor">{valor}</div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

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

  if (cargando) return <Cargando>Cargando panel…</Cargando>
  if (error) return <Mensaje tipo="error">{error}</Mensaje>
  if (!data) return null

  const hayAlertas = data.alertasBajoStock > 0

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Panel general</h1>
          <p>Resumen del inventario textil de Casa Brin.</p>
        </div>
        <Link to="/ingreso" className="btn btn-primary">
          <PackagePlus {...ICONO} aria-hidden="true" />
          Ingresar mercadería
        </Link>
      </div>

      <div className="grid-cards">
        <Stat label="Telas registradas" valor={fmtNum(data.totalTelas)} Icon={Layers}>
          <div className="stat-detalle">Tipos de tela en catálogo</div>
        </Stat>
        <Stat label="Rollos disponibles" valor={fmtNum(data.totalRollosDisponibles)} Icon={Cylinder}>
          <div className="stat-detalle">Piezas con metros por vender</div>
        </Stat>
        <Stat label="Metros en stock" valor={fmtMetros(data.metrosTotales)} Icon={Ruler}>
          <div className="stat-desglose">
            <span className="badge badge-bodega"><Warehouse {...ICONO_SM} aria-hidden="true" />Bodega {fmtMetros(data.metrosBodega)}</span>
            <span className="badge badge-local"><Store {...ICONO_SM} aria-hidden="true" />Local {fmtMetros(data.metrosLocal)}</span>
          </div>
        </Stat>
        <Stat
          label="Alertas de stock"
          valor={fmtNum(data.alertasBajoStock)}
          Icon={TriangleAlert}
          className={`alerta ${hayAlertas ? 'activa' : ''}`}
        >
          <div className="stat-detalle">
            {hayAlertas
              ? <Link to="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Ver telas bajo mínimo <ArrowRight {...ICONO_SM} aria-hidden="true" /></Link>
              : 'Todo por encima del mínimo'}
          </div>
        </Stat>
      </div>

      <div className="seccion">
        <div className="seccion-titulo">
          <span className="titulo-icono"><Workflow {...ICONO} aria-hidden="true" />Proceso de un rollo</span>
        </div>
        <ol className="flujo" style={{ listStyle: 'none' }}>
          {FLUJO.map(({ to, titulo, Icon, desc }, i) => (
            <li key={to} style={{ display: 'contents' }}>
              <Link to={to} className="flujo-paso">
                <span className="flujo-num" aria-hidden="true">{i + 1}</span>
                <span className="flujo-titulo"><Icon size={16} strokeWidth={1.75} aria-hidden="true" />{titulo}</span>
                <span className="flujo-desc">{desc}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="seccion">
        <div className="seccion-titulo">
          <span className="titulo-icono"><History {...ICONO} aria-hidden="true" />Últimos movimientos</span>
          <Link to="/reportes" className="btn btn-ghost btn-sm">
            <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" />
            Ver historial completo
          </Link>
        </div>
        <div className="card card-flush">
          {(!data.ultimosMovimientos || data.ultimosMovimientos.length === 0) ? (
            <Vacio icon={History}>Aún no hay movimientos registrados.</Vacio>
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
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimosMovimientos.map((m) => (
                    <tr key={m.idMovimiento}>
                      <td className="nowrap">{fmtFecha(m.fecha)}</td>
                      <td><TipoMovimiento tipo={m.tipo} /></td>
                      <td>{m.tela}</td>
                      <td>
                        <Link
                          to={`/reportes?rollo=${encodeURIComponent(m.codigoBarras)}`}
                          className="mono"
                          title="Ver trazabilidad del rollo"
                        >
                          {m.codigoBarras}
                        </Link>
                      </td>
                      <td className="mono num">{fmtMetros(m.metros)}</td>
                      <td>{m.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
