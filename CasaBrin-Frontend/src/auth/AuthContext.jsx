import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('cb_user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch { /* ignora */ }
    }
    setCargando(false)
  }, [])

  async function login(usuario, contrasena) {
    const { data } = await api.post('/auth/login', { usuario, contrasena })
    localStorage.setItem('cb_token', data.token)
    localStorage.setItem('cb_user', JSON.stringify(data.usuario))
    setUser(data.usuario)
    return data.usuario
  }

  function logout() {
    localStorage.removeItem('cb_token')
    localStorage.removeItem('cb_user')
    setUser(null)
  }

  // Actualiza los datos guardados del usuario (p. ej. tras cambiar una clave temporal).
  function actualizarUsuario(datos) {
    setUser((u) => {
      const nuevo = { ...u, ...datos }
      localStorage.setItem('cb_user', JSON.stringify(nuevo))
      return nuevo
    })
  }

  const esAdmin = user?.rol === 'Admin'

  return (
    <AuthContext.Provider value={{ user, esAdmin, cargando, login, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
