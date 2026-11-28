import { Warehouse, Store, MapPin, Inbox, CircleAlert, CircleCheck, Info, TriangleAlert, ChevronLeft, ChevronRight } from 'lucide-react'

// Tamaño y grosor únicos para toda la familia de iconos (16–20 px, trazo uniforme).
export const ICONO = { size: 18, strokeWidth: 1.75 }
export const ICONO_SM = { size: 14, strokeWidth: 2 }

/* =====================================================================
   Encabezado de página: título, subtítulo breve y acciones a la derecha.
   ===================================================================== */
export function Encabezado({ titulo, subtitulo, children }) {
  return (
    <header className="encabezado">
      <div className="encabezado-texto">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children && <div className="encabezado-acciones">{children}</div>}
    </header>
  )
}

/* =====================================================================
   Indicador numérico (Panel, Inventario, Movimientos).
   ===================================================================== */
export function Indicador({ icono: Icono, etiqueta, valor, alerta = false, children, onClick, titulo }) {
  const Etiqueta = onClick ? 'button' : 'div'
  return (
    <Etiqueta
      type={onClick ? 'button' : undefined}
      className={`kpi ${alerta ? 'alerta' : ''} ${onClick ? 'clicable' : ''}`}
      onClick={onClick}
      title={titulo}
    >
      <span className="kpi-cab">
        <span className="kpi-etiqueta">{etiqueta}</span>
        {Icono && <Icono className="kpi-icono" size={16} strokeWidth={1.9} aria-hidden="true" />}
      </span>
      <span className="kpi-valor">{valor}</span>
      {children && <span className="kpi-detalle">{children}</span>}
    </Etiqueta>
  )
}

/** Barra compacta de distribución Bodega / Local con sus dos valores. */
export function DistribucionStock({ bodega, local, formato }) {
  const b = Number(bodega) || 0
  const l = Number(local) || 0
  const tot = b + l
  const pB = tot > 0 ? (b / tot) * 100 : 0
  return (
    <span className="distribucion">
      <span
        className="distribucion-barra"
        role="img"
        aria-label={`Bodega ${formato(b)}, Local ${formato(l)}`}
      >
        {tot > 0 && <><span className="bodega" style={{ width: `${pB}%` }} /><span className="local" style={{ width: `${100 - pB}%` }} /></>}
      </span>
      <span className="distribucion-valores">
        <span><i className="punto bodega" aria-hidden="true" />Bodega <strong>{formato(b)}</strong></span>
        <span><i className="punto local" aria-hidden="true" />Local <strong>{formato(l)}</strong></span>
      </span>
    </span>
  )
}

/* =====================================================================
   Etiquetas de estado: color semántico + texto (sin iconos decorativos).
   ===================================================================== */
const ESTADOS = { disponible: 'badge-ok', agotado: 'badge-neutro', anulado: 'badge-error' }
export function EstadoBadge({ estado }) {
  return <span className={`badge ${ESTADOS[(estado || '').toLowerCase()] || 'badge-neutro'}`}>{estado}</span>
}

// Bodega = almacén, Local = tienda; cualquier otra ubicación = marcador.
export function iconoUbicacion(nombre) {
  const n = (nombre || '').toLowerCase()
  if (n.includes('bodega')) return Warehouse
  if (n.includes('local')) return Store
  return MapPin
}

export function UbicacionBadge({ nombre }) {
  const n = (nombre || '').toLowerCase()
  const cls = n.includes('bodega') ? 'badge-bodega' : n.includes('local') ? 'badge-local' : 'badge-neutro'
  const Icon = iconoUbicacion(nombre)
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" />{nombre}
    </span>
  )
}

export function CodigoColorBadge({ codigo }) {
  if (!codigo) return null
  return (
    <span className="badge badge-color" title="Código de color">
      <span className="sr-only">Código de color </span>
      <span className="mono">{codigo}</span>
    </span>
  )
}

export function ProveedorTexto({ nombre }) {
  if (!nombre) return null
  return <span className="proveedor-texto" title="Proveedor"><span className="sr-only">Proveedor </span>{nombre}</span>
}

export function StockBajoBadge() {
  return <span className="badge badge-alerta">Stock bajo</span>
}

const TIPOS = {
  Ingreso: 'badge-ok', Salida: 'badge-marca', Traslado: 'badge-info', Ajuste: 'badge-alerta', Anulacion: 'badge-neutro',
}
export function TipoMovimiento({ tipo }) {
  return <span className={`badge ${TIPOS[tipo] || 'badge-neutro'}`}>{tipo === 'Anulacion' ? 'Anulación' : tipo}</span>
}

/* =====================================================================
   Estados vacíos, carga y mensajes.
   ===================================================================== */
export function Vacio({ icon: Icon = Inbox, titulo, children, accion }) {
  return (
    <div className="vacio" role="status">
      {Icon && <Icon className="vacio-icono" size={28} strokeWidth={1.5} aria-hidden="true" />}
      {titulo && <div className="vacio-titulo">{titulo}</div>}
      {children && <div className="vacio-texto">{children}</div>}
      {accion && <div className="vacio-accion">{accion}</div>}
    </div>
  )
}

export function Cargando({ children = 'Cargando…' }) {
  return <div className="vacio" role="status" aria-live="polite">{children}</div>
}

const MSG_ICONO = { error: CircleAlert, ok: CircleCheck, info: Info, alerta: TriangleAlert }
export function Mensaje({ tipo = 'info', className = '', style, children }) {
  const Icon = MSG_ICONO[tipo]
  return (
    <div className={`msg msg-${tipo} ${className}`} style={style} role={tipo === 'error' || tipo === 'alerta' ? 'alert' : 'status'}>
      <Icon {...ICONO} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

/** Paginación «Anterior / Siguiente» con el total de registros. */
export function Paginacion({ pagina, total, porPagina, onCambiar, unidad = 'registros', className = '' }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (total <= 0) return null
  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)
  return (
    <nav className={`paginacion no-print ${className}`} aria-label="Paginación">
      <span className="paginacion-info">{desde}–{hasta} de {total.toLocaleString('es-EC')} {unidad} · página {pagina} de {paginas}</span>
      <div className="paginacion-botones">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 1}>
          <ChevronLeft size={16} strokeWidth={1.9} aria-hidden="true" />Anterior
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCambiar(pagina + 1)} disabled={pagina >= paginas}>
          Siguiente<ChevronRight size={16} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
