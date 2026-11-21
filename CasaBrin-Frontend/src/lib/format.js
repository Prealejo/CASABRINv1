// Utilidades de formato compartidas por toda la app.

const dinero = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Formatea un valor monetario. Cambia 'USD' arriba si tu negocio usa otra moneda.
export function fmtDinero(v) {
  const n = Number(v) || 0
  return dinero.format(n)
}

// Metros: hasta 2 decimales, sin ceros sobrantes.
export function fmtMetros(v) {
  const n = Number(v) || 0
  const s = n.toLocaleString('es-EC', { maximumFractionDigits: 2 })
  return `${s} m`
}

// Numero simple con separador de miles.
export function fmtNum(v) {
  return (Number(v) || 0).toLocaleString('es-EC')
}

// Fecha y hora legible.
export function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Solo fecha.
export function fmtSoloFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Clase de badge segun el estado del rollo.
export function badgeEstado(estado) {
  const e = (estado || '').toLowerCase()
  if (e === 'disponible') return 'badge badge-disponible'
  if (e === 'agotado') return 'badge badge-agotado'
  if (e === 'anulado') return 'badge badge-anulado'
  return 'badge'
}

// Clase de badge segun la ubicacion.
export function badgeUbicacion(nombre) {
  const n = (nombre || '').toLowerCase()
  if (n.includes('bodega')) return 'badge badge-bodega'
  if (n.includes('local')) return 'badge badge-local'
  return 'badge'
}
