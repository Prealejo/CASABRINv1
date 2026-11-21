import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({ baseURL })

// Adjunta el token JWT a cada peticion.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cb_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normaliza los mensajes de error del backend (ProblemDetails) y maneja el 401.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('cb_token')
      localStorage.removeItem('cb_user')
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    const detail = error.response?.data?.detail
      || error.response?.data?.title
      || error.message
      || 'Error de conexion con el servidor.'
    return Promise.reject(new Error(detail))
  }
)

// URL absoluta para imagenes (codigos de barras) usando el token via query no aplica;
// se usa fetch con Authorization en el componente. Exponemos la base para armar rutas.
export const apiBase = baseURL
