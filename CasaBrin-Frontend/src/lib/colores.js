// Traduce el nombre de color registrado en la tela (texto libre, p. ej. "azul marino")
// a un tono para la muestra visual. El backend no guarda un color en formato hex,
// así que si el nombre no se reconoce se devuelve null y se muestra una muestra neutra.

const TONOS = {
  'azul marino': '#1e3a8a', marino: '#1e3a8a', 'azul rey': '#1d4ed8', 'azul cielo': '#7dd3fc',
  celeste: '#7dd3fc', turquesa: '#14b8a6', aqua: '#22d3ee', azul: '#2563eb', indigo: '#4338ca',
  'verde oliva': '#6b7c32', oliva: '#6b7c32', 'verde militar': '#4b5320', esmeralda: '#059669',
  menta: '#a7f3d0', verde: '#16a34a',
  vino: '#7f1d1d', guinda: '#7f1d1d', borgona: '#6d1a2c', granate: '#7b1e2b', rojo: '#dc2626',
  coral: '#fb7185', salmon: '#fa8072', terracota: '#c2410c',
  fucsia: '#d946ef', magenta: '#c026d3', rosado: '#f9a8d4', rosa: '#f9a8d4', palo: '#e8b4b8',
  lila: '#c4b5fd', lavanda: '#c4b5fd', violeta: '#7c3aed', morado: '#6b21a8', purpura: '#6b21a8',
  mostaza: '#ca8a04', amarillo: '#facc15', dorado: '#c9a227', oro: '#c9a227',
  naranja: '#f97316', anaranjado: '#f97316', durazno: '#fdba74',
  cafe: '#78350f', marron: '#78350f', chocolate: '#5b3a1e', camel: '#c19a6b', habano: '#a0784f',
  caqui: '#a89f6a', khaki: '#a89f6a', arena: '#d8c7a3', beige: '#e8d8b9', crudo: '#efe6d2',
  hueso: '#efe8da', marfil: '#f6f0e1', perla: '#ece9e2', blanco: '#ffffff',
  plateado: '#c0c0c8', plata: '#c0c0c8', plomo: '#6b7280', gris: '#9ca3af', grafito: '#3f3f46',
  negro: '#111111',
}

// Claves más largas primero para que "azul marino" gane sobre "azul".
const CLAVES = Object.keys(TONOS).sort((a, b) => b.length - a.length)

const normalizar = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function tonoDeColor(nombre) {
  const n = normalizar(nombre)
  if (!n) return null
  const clave = CLAVES.find((k) => n.includes(k))
  return clave ? TONOS[clave] : null
}

/** true si el tono es muy claro (necesita borde para verse sobre blanco). */
export function esTonoClaro(hex) {
  if (!hex) return false
  const v = parseInt(hex.slice(1), 16)
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 215
}
