import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// URL del backend: la que el usuario configuró en la app, o la de .env (EXPO_PUBLIC_API_URL).
const URL_POR_DEFECTO = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.95:5080/api'
const CLAVE_URL = 'cb_api_url'
const CLAVE_TOKEN = 'cb_token'

export const api = axios.create({ baseURL: URL_POR_DEFECTO, timeout: 15000 })

let token = null
let alExpirar = null   // callback de AuthContext para cerrar sesión si el token ya no sirve

export function setToken(t) { token = t }
export function onSesionExpirada(fn) { alExpirar = fn }
export function getToken() { return token }
export function getApiUrl() { return api.defaults.baseURL }

/** Normaliza lo que escribe el usuario: "192.168.1.5:5080" → "http://192.168.1.5:5080/api". */
export function normalizarUrl(valor) {
  let u = (valor || '').trim().replace(/\/+$/, '')
  if (!u) return URL_POR_DEFECTO
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`
  if (!/\/api$/i.test(u)) u = `${u}/api`
  return u
}

export async function cargarApiUrl() {
  try {
    const guardada = await SecureStore.getItemAsync(CLAVE_URL)
    if (guardada) api.defaults.baseURL = guardada
  } catch { /* se usa la URL por defecto */ }
  return api.defaults.baseURL
}

export async function guardarApiUrl(valor) {
  const u = normalizarUrl(valor)
  api.defaults.baseURL = u
  await SecureStore.setItemAsync(CLAVE_URL, u)
  return u
}

/** Prueba si el backend responde en la URL indicada (endpoint raíz público). */
export async function probarConexion(valor) {
  const u = normalizarUrl(valor).replace(/\/api$/i, '')
  const r = await axios.get(`${u}/`, { timeout: 6000 })
  return r.status === 200
}

export const almacenToken = {
  leer: () => SecureStore.getItemAsync(CLAVE_TOKEN),
  guardar: (t) => SecureStore.setItemAsync(CLAVE_TOKEN, t),
  borrar: () => SecureStore.deleteItemAsync(CLAVE_TOKEN),
}

// Adjunta el token JWT a cada petición.
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normaliza los mensajes de error del backend (ProblemDetails) y maneja el 401.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      alExpirar?.()
    }
    let detalle = error.response?.data?.detail || error.response?.data?.title
    if (!detalle) {
      detalle = error.response
        ? `Error ${error.response.status} del servidor.`
        : 'No se pudo conectar con el servidor. Revisa que el backend esté encendido y que el celular esté en la misma red WiFi.'
    }
    return Promise.reject(new Error(detalle))
  },
)

/** Descarga el PNG del código de barras de un rollo como data URI (para imprimir etiquetas). */
export async function barcodeDataUri(idRollo) {
  const res = await fetch(`${api.defaults.baseURL}/rollos/${idRollo}/barcode.png`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('No se pudo generar el código de barras.')
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onloadend = () => resolve(lector.result)
    lector.onerror = reject
    lector.readAsDataURL(blob)
  })
}
