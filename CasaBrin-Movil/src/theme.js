// Tokens de diseño: los mismos de la web (rojo del logo, neutros y estados).
export const C = {
  brand500: '#e41b23',   // rojo del logo
  brand600: '#c8151c',   // acciones principales
  brand700: '#a51117',   // texto rojo sobre blanco
  brand800: '#7f0d12',
  brand50: '#fdf1f1',
  brand100: '#fbe3e4',
  brand200: '#f5c2c4',

  ink: '#1f2328',
  inkSoft: '#5b636d',
  inkFaint: '#747c86',
  gray50: '#f7f8f9',
  gray100: '#f1f3f5',
  gray200: '#e3e6ea',
  gray300: '#cfd4da',
  gray400: '#9aa1aa',
  gray500: '#747c86',
  gray600: '#5b636d',
  gray700: '#444b54',
  white: '#ffffff',
  bg: '#f5f6f8',

  ok700: '#1e7a46', ok50: '#e8f5ee', ok200: '#b9e0c9',
  warn700: '#9a5b00', warn50: '#fff5e0', warn200: '#f3d49a',
  info700: '#2f4a7a', info50: '#eef2f9', info200: '#c9d4ea',
}

export const R = { sm: 8, md: 10, lg: 14 }      // radios
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }  // espaciados
export const CONTROL_H = 48                      // alto táctil cómodo para campos y botones

export const T = {
  titulo: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  subtitulo: { fontSize: 14, color: C.inkSoft },
  seccion: { fontSize: 17, fontWeight: '700', color: C.ink },
  texto: { fontSize: 15, color: C.ink },
  chico: { fontSize: 13, color: C.inkSoft },
  mini: { fontSize: 12, color: C.inkFaint },
  etiqueta: { fontSize: 13, fontWeight: '600', color: C.gray700 },
  mono: { fontFamily: 'monospace' },
}

export const sombra = {
  shadowColor: '#1f2328', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
}
