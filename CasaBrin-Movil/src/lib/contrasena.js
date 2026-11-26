// Reglas de contraseña: deben coincidir con PoliticaContrasena del backend.
export const LONGITUD_MINIMA = 8

export function reglasContrasena(clave = '', usuario = '') {
  const u = (usuario || '').trim().toLowerCase()
  return [
    { id: 'largo', texto: `Al menos ${LONGITUD_MINIMA} caracteres`, ok: clave.length >= LONGITUD_MINIMA },
    { id: 'letra', texto: 'Una letra', ok: /\p{L}/u.test(clave) },
    { id: 'numero', texto: 'Un número', ok: /\d/.test(clave) },
    { id: 'usuario', texto: 'No contiene tu usuario', ok: !u || !clave.toLowerCase().includes(u) },
  ]
}

/** Devuelve el primer problema de la contraseña o '' si cumple todas las reglas. */
export function errorContrasena(clave, usuario) {
  if (!clave) return 'Escribe la nueva contraseña.'
  const falla = reglasContrasena(clave, usuario).find((r) => !r.ok)
  if (!falla) return ''
  if (falla.id === 'largo') return `Debe tener al menos ${LONGITUD_MINIMA} caracteres.`
  if (falla.id === 'usuario') return 'No puede contener el nombre de usuario.'
  return 'Debe combinar letras y números.'
}

/** Normaliza un código de recuperación para mostrarlo: K7QM-3HZP-W9TX. */
export function formatearCodigo(valor = '') {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  return limpio.match(/.{1,4}/g)?.join('-') || ''
}
