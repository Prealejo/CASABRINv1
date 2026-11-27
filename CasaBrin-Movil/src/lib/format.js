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

// El backend guarda las fechas en UTC y las envía sin zona ("2026-11-20T14:05:00").
// Sin la "Z", el navegador las tomaría como hora local y mostraría la hora corrida.
export function parseFecha(iso) {
  if (!iso) return null
  if (iso instanceof Date) return iso
  const s = String(iso)
  const tieneZona = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
  return new Date(s.includes('T') && !tieneZona ? `${s}Z` : s)
}

// Convierte un rango de fechas locales (input type="date") a límites UTC de día completo.
export function rangoUtc(desde, hasta) {
  const inicio = desde ? new Date(`${desde}T00:00:00`).toISOString() : undefined
  const fin = hasta ? new Date(`${hasta}T23:59:59.999`).toISOString() : undefined
  return { desde: inicio, hasta: fin }
}

// Fecha y hora legible.
export function fmtFecha(iso) {
  if (!iso) return '—'
  const d = parseFecha(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Solo fecha.
export function fmtSoloFecha(iso) {
  if (!iso) return '—'
  const d = parseFecha(iso)
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

/** true si los metros van de medio en medio metro (0,5 · 1 · 1,5 …). */
export function esMedioMetro(m) {
  return Number.isFinite(m) && Math.abs(m * 2 - Math.round(m * 2)) < 1e-9
}
