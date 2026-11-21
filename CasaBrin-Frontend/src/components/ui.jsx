import {
  CircleCheck, CircleMinus, Ban, Warehouse, Store, MapPin, TriangleAlert, Inbox,
  PackagePlus, Scissors, ArrowLeftRight, SlidersHorizontal, CircleAlert, Info, SwatchBook, Truck,
} from 'lucide-react'

// Tamaño y grosor únicos para toda la familia de iconos.
export const ICONO = { size: 18, strokeWidth: 1.75 }
export const ICONO_SM = { size: 14, strokeWidth: 2 }

/* ---------- Estado del rollo: color + icono + texto visible ---------- */
const ESTADOS = {
  disponible: { cls: 'badge-ok', Icon: CircleCheck },
  agotado: { cls: 'badge-neutro', Icon: CircleMinus },
  anulado: { cls: 'badge-error', Icon: Ban },
}
export function EstadoBadge({ estado }) {
  const cfg = ESTADOS[(estado || '').toLowerCase()] || { cls: 'badge-neutro', Icon: null }
  const { Icon } = cfg
  return (
    <span className={`badge ${cfg.cls}`}>
      {Icon && <Icon {...ICONO_SM} aria-hidden="true" />}{estado}
    </span>
  )
}

/* ---------- Ubicación: Bodega / Local ---------- */
export function UbicacionBadge({ nombre }) {
  const n = (nombre || '').toLowerCase()
  const esBodega = n.includes('bodega')
  const esLocal = n.includes('local')
  const Icon = esBodega ? Warehouse : esLocal ? Store : MapPin
  const cls = esBodega ? 'badge-bodega' : esLocal ? 'badge-local' : 'badge-neutro'
  return (
    <span className={`badge ${cls}`}>
      <Icon {...ICONO_SM} aria-hidden="true" />{nombre}
    </span>
  )
}

/* ---------- Código de color de la tela ---------- */
export function CodigoColorBadge({ codigo, grande = false }) {
  if (!codigo) return null
  return (
    <span className={`badge badge-color ${grande ? 'badge-grande' : ''}`} title="Código de color">
      <SwatchBook {...ICONO_SM} aria-hidden="true" />
      <span className="sr-only">Código de color </span>
      <span className="mono">{codigo}</span>
    </span>
  )
}

/* ---------- Proveedor ---------- */
export function ProveedorTexto({ nombre }) {
  if (!nombre) return null
  return (
    <span className="proveedor-texto" title="Proveedor">
      <Truck {...ICONO_SM} aria-hidden="true" />
      <span className="sr-only">Proveedor </span>{nombre}
    </span>
  )
}

export function StockBajoBadge() {
  return (
    <span className="badge badge-alerta">
      <TriangleAlert {...ICONO_SM} aria-hidden="true" />Stock bajo
    </span>
  )
}

/* ---------- Tipo de movimiento ---------- */
const TIPOS = {
  Ingreso: { Icon: PackagePlus, cls: 'badge-ok' },
  Salida: { Icon: Scissors, cls: 'badge-marca' },
  Traslado: { Icon: ArrowLeftRight, cls: 'badge-info' },
  Ajuste: { Icon: SlidersHorizontal, cls: 'badge-alerta' },
  Anulacion: { Icon: Ban, cls: 'badge-neutro' },
}
export function TipoMovimiento({ tipo }) {
  const cfg = TIPOS[tipo] || { Icon: null, cls: 'badge-neutro' }
  const { Icon } = cfg
  return (
    <span className={`badge ${cfg.cls}`}>
      {Icon && <Icon {...ICONO_SM} aria-hidden="true" />}{tipo}
    </span>
  )
}

/* ---------- Estado vacío / carga ---------- */
export function Vacio({ icon: Icon = Inbox, titulo, children }) {
  return (
    <div className="vacio" role="status">
      {Icon && <span className="vacio-icono"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>}
      {titulo && <div className="vacio-titulo">{titulo}</div>}
      {children && <div>{children}</div>}
    </div>
  )
}

export function Cargando({ children = 'Cargando…' }) {
  return <div className="vacio" role="status" aria-live="polite">{children}</div>
}

/* ---------- Mensajes ---------- */
const MSG_ICONO = { error: CircleAlert, ok: CircleCheck, info: Info, alerta: TriangleAlert }
export function Mensaje({ tipo = 'info', className = '', style, children }) {
  const Icon = MSG_ICONO[tipo]
  return (
    <div
      className={`msg msg-${tipo} ${className}`}
      style={style}
      role={tipo === 'error' || tipo === 'alerta' ? 'alert' : 'status'}
    >
      <Icon {...ICONO} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
