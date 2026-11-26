import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { api, setToken, almacenToken, cargarApiUrl, onSesionExpirada } from '../api/client'

const AuthContext = createContext(null)
const CLAVE_USUARIO = 'cb_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [cargando, setCargando] = useState(true)

  const logout = useCallback(async () => {
    setToken(null)
    setUser(null)
    try {
      await almacenToken.borrar()
      await SecureStore.deleteItemAsync(CLAVE_USUARIO)
    } catch { /* nada que limpiar */ }
  }, [])

  // Restaura la sesión guardada (token cifrado en el almacenamiento seguro del celular).
  useEffect(() => {
    onSesionExpirada(() => { logout() })
    ;(async () => {
      try {
        await cargarApiUrl()
        const [t, u] = await Promise.all([almacenToken.leer(), SecureStore.getItemAsync(CLAVE_USUARIO)])
        if (t && u) {
          setToken(t)
          setUser(JSON.parse(u))
        }
      } catch { /* sin sesión previa */ }
      setCargando(false)
    })()
  }, [logout])

  const login = useCallback(async (usuario, contrasena) => {
    const { data } = await api.post('/auth/login', { usuario, contrasena })
    setToken(data.token)
    await almacenToken.guardar(data.token)
    await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(data.usuario))
    setUser(data.usuario)
    return data.usuario
  }, [])

  // Actualiza los datos guardados (p. ej. tras cambiar una clave temporal).
  const actualizarUsuario = useCallback(async (datos) => {
    setUser((u) => {
      const nuevo = { ...u, ...datos }
      SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(nuevo)).catch(() => {})
      return nuevo
    })
  }, [])

  const valor = useMemo(() => ({
    user, cargando, login, logout, actualizarUsuario, esAdmin: user?.rol === 'Admin',
  }), [user, cargando, login, logout, actualizarUsuario])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
